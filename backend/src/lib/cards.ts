/**
 * Card System — Random Event Drawing & Effect Application
 *
 * Implements weighted card selection, the 20%-chance-per-action draw mechanic,
 * card effect application, and good deed multiplier logic.
 *
 * Requirements: Req 9 (Card System), Req 19 (Good Deed System), Req 55 (probability)
 */

import type { Server } from 'socket.io';
import type { PrismaClient } from '@prisma/client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '../socket/events';

type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

// ─── Types ────────────────────────────────────────────────────────────────────

/** Minimal player shape needed for card eligibility checks */
export interface CardEligibilityPlayer {
  id: string;
  age: number;
  location: string;
  cardsReceivedThisYear: number;
  vehicleOwnerships: Array<{ endAge: number | null; vehicle: { type: string } }>;
  housingOwnerships: Array<{ endAge: number | null; housing: { type: string } }>;
  children: Array<{ age: number }>;
  pets: Array<{ isAlive: boolean }>;
}

/** Card requirements shape stored as JSONB */
interface CardRequirements {
  minAge?: number;
  maxAge?: number;
  hasVehicle?: boolean;
  hasHome?: boolean;
  hasChildren?: boolean;
  hasPets?: boolean;
  location?: string;
  [key: string]: unknown;
}

/** Minimal card shape returned from Prisma */
interface CardRow {
  id: string;
  name: string;
  description: string;
  type: string;
  frequency: number;
  requirements: unknown;
  effects: unknown;
  isGoodDeedOpportunity: boolean;
  goodDeedOptions: unknown;
}

// ─── Eligibility Check ────────────────────────────────────────────────────────

/**
 * Returns true if the player meets all requirements on the card.
 * Req 9.3 — only draw eligible cards.
 */
export function checkCardEligibility(card: CardRow, player: CardEligibilityPlayer): boolean {
  const req = (card.requirements ?? {}) as CardRequirements;

  if (req.minAge !== undefined && player.age < req.minAge) return false;
  if (req.maxAge !== undefined && player.age > req.maxAge) return false;

  if (req.hasVehicle) {
    const hasActiveVehicle = player.vehicleOwnerships.some((v) => v.endAge === null);
    if (!hasActiveVehicle) return false;
  }

  if (req.hasHome) {
    const hasOwnedHome = player.housingOwnerships.some(
      (h) => h.endAge === null && h.housing.type !== 'parent' && h.housing.type !== 'dorm',
    );
    if (!hasOwnedHome) return false;
  }

  if (req.hasChildren) {
    const hasChildUnder18 = player.children.some((c) => c.age < 18);
    if (!hasChildUnder18) return false;
  }

  if (req.hasPets) {
    const hasLivingPet = player.pets.some((p) => p.isAlive);
    if (!hasLivingPet) return false;
  }

  if (req.location && req.location !== 'both' && player.location !== req.location) return false;

  return true;
}

// ─── drawCard ─────────────────────────────────────────────────────────────────

/**
 * Filter eligible cards for the player, then do weighted random selection
 * based on each card's `frequency` value.
 *
 * Req 9.1 — draw random cards; Req 9.2 — weight by frequency; Req 9.3 — eligibility.
 */
export async function drawCard(
  player: CardEligibilityPlayer,
  prisma: PrismaClient,
): Promise<CardRow | null> {
  const allCards = await prisma.card.findMany();

  const eligibleCards = allCards.filter((card) => checkCardEligibility(card as CardRow, player));

  if (eligibleCards.length === 0) return null;

  // Build weighted pool: repeat each card `frequency` times
  const weightedPool: CardRow[] = [];
  for (const card of eligibleCards) {
    for (let i = 0; i < (card as CardRow).frequency; i++) {
      weightedPool.push(card as CardRow);
    }
  }

  const idx = Math.floor(Math.random() * weightedPool.length);
  return weightedPool[idx] ?? null;
}

// ─── attemptCardDraw ──────────────────────────────────────────────────────────

/**
 * Called after each player action. 20% chance to draw a card, max 3 per year.
 * On success: increments `cardsReceivedThisYear`, saves a CardEvent, broadcasts
 * `cardDrawn` to the game session room.
 *
 * Req 9.1 — 20% chance per action; max 3 cards/year.
 */
export async function attemptCardDraw(
  player: CardEligibilityPlayer & { gameSessionId: string },
  prisma: PrismaClient,
  io: IO,
  sessionId: string,
): Promise<CardRow | null> {
  // Max 3 cards per year (Req 9)
  if (player.cardsReceivedThisYear >= 3) return null;

  // 20% chance
  if (Math.random() > 0.2) return null;

  const card = await drawCard(player, prisma);
  if (!card) return null;

  // Persist card event and increment counter atomically
  await prisma.$transaction(async (tx) => {
    await tx.cardEvent.create({
      data: {
        playerId: player.id,
        cardId: card.id,
        year: 0, // caller should pass current year; defaulting to 0 as placeholder
        effectsApplied: card.effects as object,
      },
    });

    await tx.player.update({
      where: { id: player.id },
      data: { cardsReceivedThisYear: { increment: 1 } },
    });
  });

  // Broadcast cardDrawn to the game session room (Req 9)
  io.to(`game:${sessionId}`).emit('cardDrawn', {
    playerId: player.id,
    card: {
      id: card.id,
      name: card.name,
      description: card.description,
      type: card.type as 'good' | 'bad',
      effects: card.effects as Record<string, unknown>,
    },
  });

  return card;
}

/**
 * Variant of `attemptCardDraw` that accepts the current game year explicitly.
 * Prefer this overload when the caller knows the session year.
 */
export async function attemptCardDrawForYear(
  player: CardEligibilityPlayer & { gameSessionId: string },
  prisma: PrismaClient,
  io: IO,
  sessionId: string,
  currentYear: number,
): Promise<CardRow | null> {
  if (player.cardsReceivedThisYear >= 3) return null;
  if (Math.random() > 0.2) return null;

  const card = await drawCard(player, prisma);
  if (!card) return null;

  await prisma.$transaction(async (tx) => {
    await tx.cardEvent.create({
      data: {
        playerId: player.id,
        cardId: card.id,
        year: currentYear,
        effectsApplied: card.effects as object,
      },
    });

    await tx.player.update({
      where: { id: player.id },
      data: { cardsReceivedThisYear: { increment: 1 } },
    });
  });

  io.to(`game:${sessionId}`).emit('cardDrawn', {
    playerId: player.id,
    card: {
      id: card.id,
      name: card.name,
      description: card.description,
      type: card.type as 'good' | 'bad',
      effects: card.effects as Record<string, unknown>,
    },
  });

  return card;
}

// ─── Good Deed Multipliers ────────────────────────────────────────────────────

/**
 * Good_Deed_Multiplier = 1 + floor(goodDeedCount / 5)
 * Req 19.3 — every 5 good deeds adds +1 to the multiplier.
 */
export function getGoodDeedMultiplier(goodDeedCount: number): number {
  return 1 + Math.floor(goodDeedCount / 5);
}

/**
 * Bad_Deed_Multiplier = 1 + floor(badDeedCount / 5)
 * Req 19.4 — every 5 bad deeds adds +1 to the penalty multiplier.
 */
export function getBadDeedMultiplier(badDeedCount: number): number {
  return 1 + Math.floor(badDeedCount / 5);
}

// ─── Card Effects ─────────────────────────────────────────────────────────────

/** Shape of the effects JSONB column on a Card */
export interface CardEffects {
  cost?: number;
  healthTemporary?: number;
  healthPermanent?: number;
  stress?: number;
  /**
   * Insurance surcharge multiplier for the current year (e.g. 0.5 = +50% for at-fault accident).
   * Per game rules: at-fault accident = +50%, not-at-fault = +20%.
   */
  insuranceSurcharge?: number;
  insuranceAffected?: 'health' | 'auto' | 'home';
  skills?: Record<string, number>;
  traits?: Record<string, number>;
  other?: string[];
}

/** Player state fields that card effects can mutate */
export interface CardEffectTarget {
  money: number;
  health: number;
  maxHealth: number;
  temporaryHealthDebt: number;
  stress: number;
  autoInsuranceRate: number;
  skills: Record<string, number>;
  traits: Record<string, number>;
  chronicConditionCount: number;
}

/**
 * Apply a card's effects to a mutable player state snapshot.
 * Returns the mutated snapshot — does NOT write to the DB.
 *
 * Req 9.4 — apply costs, health, stress, skills, traits, insurance changes.
 * Req 9.8 — track temporary vs permanent health changes.
 */
export function applyCardEffects(
  state: CardEffectTarget,
  effects: CardEffects,
): CardEffectTarget {
  const result = { ...state };

  // ── Cost ──────────────────────────────────────────────────────────────────
  if (effects.cost) {
    result.money = result.money - effects.cost;
  }

  // ── Temporary health (auto-restores next year) ────────────────────────────
  if (effects.healthTemporary) {
    const delta = effects.healthTemporary;
    if (delta > 0) {
      const gain =
        result.chronicConditionCount > 0 ? Math.ceil(delta * 0.8) : delta;
      result.health = Math.min(result.health + gain, result.maxHealth);
    } else {
      const actualLoss = Math.min(-delta, result.health);
      result.health = Math.max(0, result.health + delta);
      result.temporaryHealthDebt += actualLoss;
    }
  }

  // ── Permanent health (affects both health and maxHealth) ──────────────────
  if (effects.healthPermanent) {
    const delta = effects.healthPermanent;
    if (delta > 0) {
      result.maxHealth = Math.min(100, result.maxHealth + delta);
      const gain =
        result.chronicConditionCount > 0 ? Math.ceil(delta * 0.8) : delta;
      result.health = Math.min(result.health + gain, result.maxHealth);
    } else {
      result.maxHealth = Math.max(0, result.maxHealth + delta);
      result.health = Math.max(0, result.health + delta);
      result.health = Math.min(result.health, result.maxHealth);
    }
  }

  // ── Stress ────────────────────────────────────────────────────────────────
  if (effects.stress) {
    result.stress = Math.min(100, Math.max(0, result.stress + effects.stress));
  }

  // ── Insurance surcharge (accident penalty) ───────────────────────────────
  // Req 9.9 — apply insurance rate increase for the current year.
  // At-fault accident = +50% (insuranceSurcharge: 0.5), not-at-fault = +20% (0.2).
  if (effects.insuranceSurcharge && effects.insuranceAffected === 'auto') {
    result.autoInsuranceRate = result.autoInsuranceRate * (1 + effects.insuranceSurcharge);
  }

  // ── Skills ────────────────────────────────────────────────────────────────
  if (effects.skills) {
    result.skills = { ...result.skills };
    for (const [key, val] of Object.entries(effects.skills)) {
      result.skills[key] = Math.min(100, Math.max(0, (result.skills[key] ?? 0) + val));
    }
  }

  // ── Traits ────────────────────────────────────────────────────────────────
  if (effects.traits) {
    result.traits = { ...result.traits };
    for (const [key, val] of Object.entries(effects.traits)) {
      result.traits[key] = Math.min(100, Math.max(0, (result.traits[key] ?? 0) + val));
    }
  }

  return result;
}

// ─── Annual Good Deed Options ─────────────────────────────────────────────────

/** The fixed pool of annual good deed options (Req 19.9) */
export const ANNUAL_GOOD_DEED_OPTIONS = [
  'Help an old lady cross the street',
  'Open the door for someone',
  'Read to kids at public library',
  'Pick up trash at park',
  'Let someone go ahead of you in line',
  'Give a compliment',
  'Walk dogs at the animal shelter',
  'Send a card to a service member',
  'Tell someone why they are special to you',
  'Do yard work for a neighbor',
  'Volunteer at a soup kitchen',
  'Spend quality time with a loved one',
  'Volunteer at community garden',
] as const;

/**
 * Pick 3 random options from the annual good deed pool.
 * All players in a session see the same 3 options for a given year
 * (seed by sessionId + year for determinism).
 *
 * Req 19.9 — present 3 identical options to all players each year.
 */
export function pickAnnualGoodDeedOptions(sessionId: string, year: number): string[] {
  // Simple deterministic shuffle seeded by sessionId + year
  const seed = [...sessionId].reduce((acc, c) => acc + c.charCodeAt(0), year * 31);
  const pool = [...ANNUAL_GOOD_DEED_OPTIONS];

  // Fisher-Yates with a simple LCG seeded by `seed`
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0x100000000;
  };

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }

  return pool.slice(0, 3);
}

// ─── broadcastGoodDeedOpportunity ─────────────────────────────────────────────

/**
 * Notify all OTHER players in the session about a good deed opportunity
 * triggered by a card drawn for `sourcePlayerId`.
 *
 * No expiration — players can respond any time before their year ends.
 * Req 9.5 / Req 19.5 — broadcast goodDeedOpportunity to all other players.
 */
export function broadcastGoodDeedOpportunity(
  io: IO,
  sessionId: string,
  sourcePlayerId: string,
  cardEventId: string,
  lemonReward: number,
): void {
  io.to(`game:${sessionId}`).emit('goodDeedOpportunity', {
    fromPlayerId: sourcePlayerId,
    cardId: cardEventId,
    lemonReward,
  });
}
