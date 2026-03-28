/**
 * Card System — Random Event Drawing
 *
 * Implements weighted card selection and the 20%-chance-per-action draw mechanic.
 *
 * Requirements: Req 9 (Card System), Req 55 (probability)
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
