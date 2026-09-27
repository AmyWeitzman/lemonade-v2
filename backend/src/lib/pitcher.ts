/**
 * Lemonade Pitcher System
 *
 * Core logic for pitcher capacity, lemon contributions, grace year, and game-end.
 * Requirements: Req 7
 */

import { prisma } from './prisma';
import { getIO } from '../socket';
import { emitToGame } from '../socket/events';

// ─── Age bracket → lemons per player ─────────────────────────────────────────

export function lemonsRequiredForAge(age: number): number {
  if (age < 20) return 0;
  if (age <= 22) return 10;
  if (age <= 30) return 20;
  if (age <= 50) return 40;
  if (age <= 65) return 60;
  return 80; // 66+
}

// ─── calculateYearlyGoal ──────────────────────────────────────────────────────

/**
 * Sum lemons required for all living players based on their age bracket.
 */
export function calculateYearlyGoal(players: Array<{ age: number }>): number {
  return players.reduce((sum, p) => sum + lemonsRequiredForAge(p.age), 0);
}

// ─── calculateRecommendedPerPlayer ───────────────────────────────────────────

/**
 * Recommended lemons per player = yearlyGoal / livingPlayerCount.
 * Returns 0 if no living players.
 */
export function calculateRecommendedPerPlayer(
  yearlyGoal: number,
  livingPlayerCount: number,
): number {
  if (livingPlayerCount === 0) return 0;
  return Math.ceil(yearlyGoal / livingPlayerCount);
}

// ─── addLemons ────────────────────────────────────────────────────────────────

/**
 * Add lemons to the pitcher for a player.
 * Updates DB only — no broadcast on every lemon change to avoid spamming players.
 * The frontend pitcher icon shows a notification badge; full state is fetched
 * via GET /api/pitcher/:sessionId when the player opens the pitcher page.
 * pitcherUpdated is only broadcast for meaningful state changes (goal recalc, grace year, game end).
 */
export async function addLemons(
  sessionId: string,
  playerId: string,
  amount: number,
): Promise<void> {
  if (amount <= 0) return;

  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    select: { pitcherContributionsByPlayer: true },
  });
  if (!session) throw new Error(`Session ${sessionId} not found`);

  const contributions = (session.pitcherContributionsByPlayer ?? {}) as Record<string, number>;
  contributions[playerId] = (contributions[playerId] ?? 0) + amount;

  await prisma.$transaction([
    prisma.player.update({
      where: { id: playerId },
      data: { totalLemonsEarned: { increment: amount } },
    }),
    prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        pitcherCurrentLemons: { increment: amount },
        pitcherContributionsByPlayer: contributions,
      },
    }),
  ]);
}

// ─── recalculatePitcherGoal ───────────────────────────────────────────────────

/**
 * Recalculate the yearly goal after a player death or departure.
 * Preserves existing lemons — only the goal changes.
 * Broadcasts pitcherUpdated.
 */
export async function recalculatePitcherGoal(sessionId: string): Promise<void> {
  const livingPlayers = await prisma.player.findMany({
    where: { gameSessionId: sessionId, isAlive: true },
    select: { id: true, age: true },
  });

  const newGoal = calculateYearlyGoal(livingPlayers);

  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: { pitcherYearlyGoal: newGoal },
    select: {
      pitcherCurrentLemons: true,
      pitcherYearlyGoal: true,
      pitcherInGraceYear: true,
      pitcherContributionsByPlayer: true,
    },
  });

  try {
    const io = getIO();
    emitToGame(io, sessionId, 'pitcherUpdated', {
      currentLemons: updated.pitcherCurrentLemons,
      yearlyGoal: updated.pitcherYearlyGoal,
      graceYearUsed: updated.pitcherInGraceYear,
      contributionsByPlayer: (updated.pitcherContributionsByPlayer ?? {}) as Record<string, number>,
      recommendedPerPlayer: calculateRecommendedPerPlayer(newGoal, livingPlayers.length),
    });
  } catch {
    // Socket.IO not yet initialized (e.g. session in waiting phase) — skip broadcast
  }
}

// ─── checkYearEndPitcher ──────────────────────────────────────────────────────

/**
 * Check if the yearly pitcher goal was met at year end.
 *
 * Grace year logic (resets each time goal is met):
 * - Goal met:  reset currentLemons to 0, clear pitcherInGraceYear → 'met'
 * - Goal missed + NOT currently in grace year: enter grace year → 'grace'
 * - Goal missed + already in grace year (consecutive miss): end game → 'ended'
 *
 * Players can earn a new grace year every time they recover and then miss again.
 *
 * Returns 'met' | 'grace' | 'ended'.
 */
export async function checkYearEndPitcher(
  sessionId: string,
): Promise<'met' | 'grace' | 'ended'> {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    select: {
      pitcherCurrentLemons: true,
      pitcherYearlyGoal: true,
      pitcherInGraceYear: true,
      pitcherContributionsByPlayer: true,
      currentYear: true,
    },
  });
  if (!session) throw new Error(`Session ${sessionId} not found`);

  const goalMet = session.pitcherCurrentLemons >= session.pitcherYearlyGoal;

  if (goalMet) {
    // Reset lemons and clear grace year status for the new year
    await prisma.gameSession.update({
      where: { id: sessionId },
      data: { pitcherCurrentLemons: 0, pitcherInGraceYear: false },
    });
    return 'met';
  }

  // Goal missed — consecutive miss while already in grace year → game over
  if (session.pitcherInGraceYear) {
    await prisma.gameSession.update({
      where: { id: sessionId },
      data: { status: 'ended', endReason: 'pitcher_failed' },
    });

    const io = getIO();
    emitToGame(io, sessionId, 'gameEnded', {
      reason: 'pitcher_failed',
      finalStats: {
        currentLemons: session.pitcherCurrentLemons,
        yearlyGoal: session.pitcherYearlyGoal,
        year: session.currentYear,
      },
    });

    return 'ended';
  }

  // First miss — enter grace year
  await prisma.gameSession.update({
    where: { id: sessionId },
    data: { pitcherInGraceYear: true },
  });

  const livingPlayers = await prisma.player.findMany({
    where: { gameSessionId: sessionId, isAlive: true },
    select: { id: true },
  });

  const io = getIO();
  emitToGame(io, sessionId, 'pitcherUpdated', {
    currentLemons: session.pitcherCurrentLemons,
    yearlyGoal: session.pitcherYearlyGoal,
    graceYearUsed: true,
    contributionsByPlayer: (session.pitcherContributionsByPlayer ?? {}) as Record<string, number>,
    recommendedPerPlayer: calculateRecommendedPerPlayer(
      session.pitcherYearlyGoal,
      livingPlayers.length,
    ),
  });

  return 'grace';
}
