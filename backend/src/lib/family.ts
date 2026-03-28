/**
 * Family Event Rolls
 *
 * Handles probabilistic family events that occur at the start of each year:
 *   - Grandchildren births (children aged 25-40)
 *   - Pet deaths (pets in their death age range)
 *
 * Requirements: Req 14.13 (grandchildren), Req 17 (pets), Req 55 (probability)
 */

import type { PrismaClient } from '@prisma/client';
import type { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '../socket/events';
import { rollDie } from './probability';
import { sendNotification } from './yearCycle';

type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GrandchildrenRollResult {
  /** Whether a grandchild was born this year */
  grandchildBorn: boolean;
  /** The child record id that had the grandchild (if any) */
  childId?: string;
}

export interface PetDeathRollResult {
  /** Pet ids that died this year */
  deadPetIds: string[];
}

// ─── rollForGrandchildren ─────────────────────────────────────────────────────

/**
 * Roll for grandchildren at the start of each year.
 *
 * Formula (Req 14.13):
 *   - Count children with ages 25–40 (eligible)
 *   - Roll a 5-sided die
 *   - If roll <= eligibleCount → a grandchild is born for a random eligible child
 *
 * Persists the grandchild count update and sends a notification.
 */
export async function rollForGrandchildren(
  playerId: string,
  children: Array<{ id: string; age: number; childrenCount: number; hasChildren: boolean }>,
  prisma: PrismaClient,
  io?: IO,
): Promise<GrandchildrenRollResult> {
  const eligible = children.filter((c) => c.age >= 25 && c.age <= 40);

  if (eligible.length === 0) {
    return { grandchildBorn: false };
  }

  const roll = rollDie(5);

  if (roll > eligible.length) {
    return { grandchildBorn: false };
  }

  // Pick a random eligible child
  const luckyChild = eligible[Math.floor(Math.random() * eligible.length)];
  if (!luckyChild) return { grandchildBorn: false };

  await prisma.child.update({
    where: { id: luckyChild.id },
    data: {
      childrenCount: luckyChild.childrenCount + 1,
      hasChildren: true,
    },
  });

  await sendNotification(
    playerId,
    {
      type: 'success',
      category: 'family',
      title: 'You Have a Grandchild!',
      message: `Congratulations! One of your children has welcomed a new baby.`,
    },
    io,
  );

  return { grandchildBorn: true, childId: luckyChild.id };
}

// ─── rollPetDeaths ────────────────────────────────────────────────────────────

/**
 * Roll for pet deaths at the start of each year.
 *
 * For each living pet whose current age falls within [deathAgeMin, deathAgeMax]:
 *   - 50% chance of death (Req 17)
 *   - If dead: mark isAlive = false, send notification
 *
 * Note: pet ages should already be incremented before calling this function.
 */
export async function rollPetDeaths(
  playerId: string,
  pets: Array<{ id: string; type: string; age: number; deathAgeMin: number; deathAgeMax: number; isAlive: boolean }>,
  prisma: PrismaClient,
  io?: IO,
): Promise<PetDeathRollResult> {
  const deadPetIds: string[] = [];

  for (const pet of pets) {
    if (!pet.isAlive) continue;
    if (pet.age < pet.deathAgeMin || pet.age > pet.deathAgeMax) continue;

    // 50% chance of death
    if (Math.random() < 0.5) {
      await prisma.pet.update({
        where: { id: pet.id },
        data: { isAlive: false },
      });

      deadPetIds.push(pet.id);

      await sendNotification(
        playerId,
        {
          type: 'warning',
          category: 'family',
          title: 'Pet Passed Away',
          message: `Your ${pet.type} pet has passed away at age ${pet.age}.`,
        },
        io,
      );
    }
  }

  return { deadPetIds };
}
