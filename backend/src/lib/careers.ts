/**
 * Career Progression Systems — Core Logic
 *
 * Pure/deterministic functions for writing, acting, and music career progression.
 * No DB calls — callers persist changes.
 *
 * Requirements: Req 26
 */

import { rightSkewed, leftSkewed } from './probability';

/** Simple uniform random between min and max */
function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/** Alias for probability helpers */
const randomSkewedRight = rightSkewed;
const randomSkewedLeft = leftSkewed;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WritingProgress {
  playerId: string;
  currentBook?: {
    timeBlocksCompleted: number;
  };
  publishedBooks: {
    year: number;
    selfPublished: boolean;
    income: number;
  }[];
}

export interface ActingRole {
  type: 'commercial' | 'tv_show' | 'movie';
  year: number;
  payment: number;
  /** For TV shows: how many seasons completed */
  seasonsCompleted?: number;
  /** For TV shows: is the show still running */
  isActive?: boolean;
  /** For movies: sequel eligible next year */
  sequelEligible?: boolean;
}

export interface ActingProgress {
  playerId: string;
  hasAgent: boolean;
  rolesCompleted: ActingRole[];
}

export type MusicPerformanceType =
  | 'bar'
  | 'school-dance'
  | 'fair'
  | 'tour-opening'
  | 'national-tour'
  | 'international-tour';

export interface MusicPerformance {
  type: MusicPerformanceType;
  year: number;
  payment: number;
}

export interface MusicProgress {
  playerId: string;
  epsReleased: number;
  albumsReleased: number;
  performances: MusicPerformance[];
}

// ─── Writing Career ───────────────────────────────────────────────────────────

export const BOOK_TIME_BLOCKS_REQUIRED = 20;

/**
 * Accumulate time blocks toward the current book.
 * Returns updated progress and whether the book is now complete.
 */
export function progressWritingCareer(
  progress: WritingProgress,
  timeBlocksUsed: number,
): { progress: WritingProgress; bookComplete: boolean } {
  const current = progress.currentBook ?? { timeBlocksCompleted: 0 };
  const newTotal = current.timeBlocksCompleted + timeBlocksUsed;

  if (newTotal >= BOOK_TIME_BLOCKS_REQUIRED) {
    return {
      progress: {
        ...progress,
        currentBook: { timeBlocksCompleted: newTotal },
      },
      bookComplete: true,
    };
  }

  return {
    progress: {
      ...progress,
      currentBook: { timeBlocksCompleted: newTotal },
    },
    bookComplete: false,
  };
}

/**
 * Self-publish a completed book.
 * Calculates income based on writing + creativity skill sum.
 * Returns updated progress and income earned.
 */
export function selfPublishBook(
  progress: WritingProgress,
  writingSkill: number,
  creativitySkill: number,
  year: number,
): { progress: WritingProgress; income: number; error?: string } {
  if (!progress.currentBook || progress.currentBook.timeBlocksCompleted < BOOK_TIME_BLOCKS_REQUIRED) {
    return { progress, income: 0, error: 'Book is not complete yet (need 20 time blocks)' };
  }

  const income = calculateSelfPublishIncome(writingSkill, creativitySkill);

  const updatedProgress: WritingProgress = {
    ...progress,
    currentBook: undefined,
    publishedBooks: [
      ...progress.publishedBooks,
      { year, selfPublished: true, income },
    ],
  };

  return { progress: updatedProgress, income };
}

/**
 * Submit a completed book to a publisher.
 * Checks writing + creativity thresholds. Returns success/failure.
 * On success: income is $100k–$1M random.
 * On failure: book is not published (player keeps it to try again or self-publish).
 */
export function submitToPublisher(
  progress: WritingProgress,
  writingSkill: number,
  creativitySkill: number,
  year: number,
): { progress: WritingProgress; income: number; accepted: boolean; error?: string } {
  if (!progress.currentBook || progress.currentBook.timeBlocksCompleted < BOOK_TIME_BLOCKS_REQUIRED) {
    return { progress, income: 0, accepted: false, error: 'Book is not complete yet (need 20 time blocks)' };
  }

  const accepted = checkPublisherRequirements(writingSkill, creativitySkill);

  if (!accepted) {
    return { progress, income: 0, accepted: false };
  }

  const income = randomBetween(100_000, 1_000_000);

  const updatedProgress: WritingProgress = {
    ...progress,
    currentBook: undefined,
    publishedBooks: [
      ...progress.publishedBooks,
      { year, selfPublished: false, income },
    ],
  };

  return { progress: updatedProgress, income, accepted: true };
}

/**
 * Calculate self-publish income based on writing + creativity sum.
 * writing + creativity < 150: $25,000
 * writing + creativity >= 150: $50,000
 */
export function calculateSelfPublishIncome(writingSkill: number, creativitySkill: number): number {
  const sum = writingSkill + creativitySkill;
  return sum >= 150 ? 50_000 : 25_000;
}

/**
 * Check if a player meets publisher requirements.
 * Based on writing + creativity thresholds (>= 150 combined for acceptance).
 */
export function checkPublisherRequirements(writingSkill: number, creativitySkill: number): boolean {
  const sum = writingSkill + creativitySkill;
  return sum >= 150;
}

/**
 * Author income is earned at the time of publishing only (no ongoing royalties).
 * This function is kept for reference but returns 0.
 */
export function calculateAuthorIncome(
  _progress: WritingProgress,
  _writingSkill: number,
): number {
  return 0;
}

// ─── Acting Career ────────────────────────────────────────────────────────────

/**
 * Audition roll thresholds based on bravery + charisma + creativity sum.
 * 220-247 (beginner): 20% base chance
 * 248-273 (intermediate): 35% base chance
 * 274-300 (advanced): 50% base chance
 * Agent bonus: +20% to success chance
 */
export function calculateAuditionSuccessChance(
  bravery: number,
  charisma: number,
  creativity: number,
  hasAgent: boolean,
): number {
  const sum = bravery + charisma + creativity;
  let baseChance: number;

  if (sum >= 274) {
    baseChance = 0.5;
  } else if (sum >= 248) {
    baseChance = 0.35;
  } else {
    baseChance = 0.2;
  }

  return hasAgent ? Math.min(1, baseChance + 0.2) : baseChance;
}

/**
 * Calculate acting role payment based on bravery + charisma + creativity.
 * Lower bound: y = 0.78 * 1.048^x (where x = sum of traits)
 * Upper bound: y = 0.1 * 1.0725^x
 * Returns a random value in that range.
 */
export function calculateActingPayment(
  bravery: number,
  charisma: number,
  creativity: number,
): number {
  const x = bravery + charisma + creativity;
  const lower = 0.78 * Math.pow(1.048, x);
  const upper = 0.1 * Math.pow(1.0725, x);
  // Ensure lower <= upper (formulas cross at some point)
  const min = Math.min(lower, upper);
  const max = Math.max(lower, upper);
  return Math.round(randomBetween(min, max));
}

export interface AuditionResult {
  success: boolean;
  payment: number;
  agentFee: number;
  netPayment: number;
  consolationSkillGains: Record<string, number>;
  progress: ActingProgress;
}

/**
 * Execute an acting audition.
 * On success: grant role and payment (minus 15% agent fee if applicable).
 * On failure: grant consolation skill gains (bravery +1%, perseverance +1%).
 */
export function executeAudition(
  progress: ActingProgress,
  roleType: 'commercial' | 'tv_show' | 'movie',
  bravery: number,
  charisma: number,
  creativity: number,
  year: number,
): AuditionResult {
  const successChance = calculateAuditionSuccessChance(bravery, charisma, creativity, progress.hasAgent);
  const roll = Math.random();
  const success = roll < successChance;

  if (success) {
    const grossPayment = calculateActingPayment(bravery, charisma, creativity);
    const agentFee = progress.hasAgent ? Math.round(grossPayment * 0.15) : 0;
    const netPayment = grossPayment - agentFee;

    const newRole: ActingRole = {
      type: roleType,
      year,
      payment: netPayment,
      ...(roleType === 'tv_show' ? { seasonsCompleted: 1, isActive: true } : {}),
      ...(roleType === 'movie' ? { sequelEligible: false } : {}),
    };

    return {
      success: true,
      payment: grossPayment,
      agentFee,
      netPayment,
      consolationSkillGains: {},
      progress: {
        ...progress,
        rolesCompleted: [...progress.rolesCompleted, newRole],
      },
    };
  }

  // Failure: consolation skill gains
  const consolationSkillGains = {
    bravery: 1,
    perseverance: 1,
  };

  return {
    success: false,
    payment: 0,
    agentFee: 0,
    netPayment: 0,
    consolationSkillGains,
    progress,
  };
}

// ─── Music Career ─────────────────────────────────────────────────────────────

/**
 * Check tour eligibility by type.
 * National tour: requires >= 1 EP or >= 1 album released.
 * International tour: requires >= 1 album released.
 */
export function checkTourEligibility(
  progress: MusicProgress,
  tourType: 'national-tour' | 'international-tour' = 'national-tour',
): { eligible: boolean; reason?: string } {
  if (tourType === 'international-tour') {
    if (progress.albumsReleased >= 1) return { eligible: true };
    return {
      eligible: false,
      reason: `International tour requires at least 1 album released (you have ${progress.albumsReleased})`,
    };
  }

  // national-tour
  if (progress.epsReleased >= 1 || progress.albumsReleased >= 1) return { eligible: true };
  return {
    eligible: false,
    reason: 'National tour requires at least 1 EP or album released',
  };
}

/**
 * Calculate music performance income based on performance type and skill.
 *
 * EP/Album income based on music + creativity sum:
 *   100-133 (beginner): $0-$10,000 skewed right
 *   134-167 (intermediate): $9,000-$100,000 normal
 *   168-200 (advanced): $50,000-$10,000,000 skewed left
 *
 * Opening tour (bar/school-dance/fair/tour-opening):
 *   charisma <= 80: $40,000
 *   charisma <= 90: $60,000
 *   charisma > 90: $80,000
 *
 * National/International tour:
 *   $75M-$300M (double for international)
 */
export function calculateMusicPerformanceIncome(
  performanceType: MusicPerformanceType,
  _musicSkill: number,
  _creativitySkill: number,
  charismaSkill: number,
): number {
  switch (performanceType) {
    case 'bar':
    case 'school-dance':
    case 'fair':
      // Small venue performances — use opening tour scale
      if (charismaSkill > 90) return 80_000;
      if (charismaSkill > 80) return 60_000;
      return 40_000;

    case 'tour-opening':
      if (charismaSkill > 90) return 80_000;
      if (charismaSkill > 80) return 60_000;
      return 40_000;

    case 'national-tour':
      return Math.round(randomBetween(75_000_000, 300_000_000));

    case 'international-tour':
      return Math.round(randomBetween(75_000_000, 300_000_000) * 2);

    default:
      return 0;
  }
}

/**
 * Calculate EP or album release income based on music + creativity sum.
 */
export function calculateEpAlbumIncome(musicSkill: number, creativitySkill: number): number {
  const sum = musicSkill + creativitySkill;

  if (sum >= 168) {
    // Advanced: $50,000-$10,000,000 skewed left (most toward high end)
    return Math.round(randomSkewedLeft(50_000, 10_000_000));
  } else if (sum >= 134) {
    // Intermediate: $9,000-$100,000 normal distribution
    return Math.round(randomBetween(9_000, 100_000));
  } else {
    // Beginner: $0-$10,000 skewed right (most toward low end)
    return Math.round(randomSkewedRight(0, 10_000));
  }
}

/**
 * Record an EP release and calculate income.
 */
export function releaseEP(
  progress: MusicProgress,
  musicSkill: number,
  creativitySkill: number,
  year: number,
): { progress: MusicProgress; income: number } {
  const income = calculateEpAlbumIncome(musicSkill, creativitySkill);
  return {
    progress: {
      ...progress,
      epsReleased: progress.epsReleased + 1,
      performances: [
        ...progress.performances,
        { type: 'bar', year, payment: income },
      ],
    },
    income,
  };
}

/**
 * Record an album release and calculate income.
 */
export function releaseAlbum(
  progress: MusicProgress,
  musicSkill: number,
  creativitySkill: number,
  year: number,
): { progress: MusicProgress; income: number } {
  const income = calculateEpAlbumIncome(musicSkill, creativitySkill);
  return {
    progress: {
      ...progress,
      albumsReleased: progress.albumsReleased + 1,
      performances: [
        ...progress.performances,
        { type: 'bar', year, payment: income },
      ],
    },
    income,
  };
}

/**
 * Record a live performance and calculate income.
 */
export function recordPerformance(
  progress: MusicProgress,
  performanceType: MusicPerformanceType,
  musicSkill: number,
  creativitySkill: number,
  charismaSkill: number,
  year: number,
): { progress: MusicProgress; income: number; error?: string } {
  // Check tour eligibility for national/international tours
  if (performanceType === 'national-tour' || performanceType === 'international-tour') {
    const eligibility = checkTourEligibility(progress, performanceType);
    if (!eligibility.eligible) {
      return { progress, income: 0, error: eligibility.reason };
    }
  }

  const income = calculateMusicPerformanceIncome(
    performanceType,
    musicSkill,
    creativitySkill,
    charismaSkill,
  );

  return {
    progress: {
      ...progress,
      performances: [
        ...progress.performances,
        { type: performanceType, year, payment: income },
      ],
    },
    income,
  };
}
