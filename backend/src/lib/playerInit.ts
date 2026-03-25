import { bellCurve, rightSkewed, rollDie, rightSkewedMoney } from './probability';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParentContributions {
  car: string | null;
  collegeFund: number;
  maxParentAge: number | null; // -1 = can always live with parents
  weddingContribution: number;
}

// ─── Trait Ranges ─────────────────────────────────────────────────────────────

const TRAIT_RANGES: Record<string, [number, number]> = {
  bravery: [0, 80],
  perseverance: [0, 80],
  charisma: [0, 100],
  compassion: [10, 100],
  creativity: [10, 100],
  organization: [0, 90],
  patience: [0, 100],
  caution: [0, 100],
  sociability: [20, 100],
  stressTolerance: [0, 100],
  goodWithKids: [0, 80],
  physicalAbility: [0, 100],
  communication: [10, 80],
};

// ─── Skill Ranges and Distributions ──────────────────────────────────────────

type SkillDist = 'bell' | 'right';

const SKILL_CONFIG: Record<string, { range: [number, number]; dist: SkillDist }> = {
  math: { range: [2, 10], dist: 'bell' },
  science: { range: [2, 10], dist: 'bell' },
  art: { range: [0, 10], dist: 'right' },
  music: { range: [0, 10], dist: 'right' },
  writing: { range: [2, 10], dist: 'bell' },
  analysis: { range: [2, 10], dist: 'bell' },
  homeRepair: { range: [0, 10], dist: 'right' },
  technology: { range: [2, 10], dist: 'bell' },
};

// ─── Parent Contribution Table ────────────────────────────────────────────────

const PARENT_CONTRIBUTION_TABLE: Record<number, ParentContributions> = {
  1: { car: null, collegeFund: 0, maxParentAge: null, weddingContribution: 0 },
  2: { car: null, collegeFund: 5000, maxParentAge: null, weddingContribution: 5000 },
  3: { car: null, collegeFund: 15000, maxParentAge: 22, weddingContribution: 7500 },
  4: { car: 'affordable_5seat_gas_10yr', collegeFund: 30000, maxParentAge: 22, weddingContribution: 10000 },
  5: { car: 'affordable_5seat_gas_5yr', collegeFund: 45000, maxParentAge: 26, weddingContribution: 12500 },
  6: { car: 'affordable_5seat_gas_new', collegeFund: 60000, maxParentAge: 30, weddingContribution: 15000 },
  7: { car: null, collegeFund: 60000, maxParentAge: 22, weddingContribution: 0 },
  8: { car: null, collegeFund: 0, maxParentAge: null, weddingContribution: 15000 },
  9: { car: 'bike', collegeFund: 0, maxParentAge: -1, weddingContribution: 0 },
  10: { car: 'luxury_2seat_electric_new', collegeFund: 100000, maxParentAge: null, weddingContribution: 15000 },
};

// ─── Parent Wealth Table ──────────────────────────────────────────────────────

const PARENT_WEALTH_TABLE: Record<number, number> = {
  1: 0,
  2: 100,
  3: 1000,
  4: 5000,
  5: 1000,
  6: 10000,
  7: 100,
  8: 0,
  9: 100,
  10: 25000,
};

// ─── Vehicle name → DB lookup key mapping ─────────────────────────────────────

/**
 * Maps the car key from parent contributions to a DB-searchable name + ageVariant.
 */
export const CAR_KEY_TO_VEHICLE: Record<string, { name: string; ageVariant: string }> = {
  affordable_5seat_gas_10yr: { name: 'Affordable 5-Seater (Gas)', ageVariant: 'used_10yr' },
  affordable_5seat_gas_5yr: { name: 'Affordable 5-Seater (Gas)', ageVariant: 'used_5yr' },
  affordable_5seat_gas_new: { name: 'Affordable 5-Seater (Gas)', ageVariant: 'new' },
  bike: { name: 'Bike', ageVariant: 'new' },
  luxury_2seat_electric_new: { name: 'Luxury 2-Seater (Electric)', ageVariant: 'new' },
};

// ─── Roll Functions ───────────────────────────────────────────────────────────

/** Roll all traits using bell curve distribution. Returns values as percentages (0-100 scale). */
export function rollTraits(): Record<string, number> {
  const traits: Record<string, number> = {};
  for (const [trait, [min, max]] of Object.entries(TRAIT_RANGES)) {
    traits[trait] = Math.round(bellCurve(min, max));
  }
  return traits;
}

/**
 * Roll all skills. Starting ranges are 0-10 scale; stored as percentages (0-100).
 * Multiply by 10 to convert to percentage scale.
 */
export function rollSkills(): Record<string, number> {
  const skills: Record<string, number> = {};
  for (const [skill, { range, dist }] of Object.entries(SKILL_CONFIG)) {
    const [min, max] = range;
    const raw = dist === 'bell' ? bellCurve(min, max) : rightSkewed(min, max);
    // Convert from 0-10 scale to 0-100 percentage scale
    skills[skill] = Math.round(raw * 10);
  }
  return skills;
}

/** Roll a d10 to determine parent contributions. */
export function rollParentContributions(): ParentContributions {
  const roll = rollDie(10);
  return PARENT_CONTRIBUTION_TABLE[roll];
}

/**
 * Calculate starting money.
 * 1. Personal savings: rightSkewedMoney(5000)
 * 2. Add parent wealth from table
 * 3. Apply organization modifier
 */
export function calculateStartingMoney(parentRoll: number, organization: number): number {
  const savings = rightSkewedMoney(5000);
  const parentWealth = PARENT_WEALTH_TABLE[parentRoll] ?? 0;
  let total = savings + parentWealth;

  if (organization <= 45) {
    total = Math.max(0, total * 0.8);
  } else {
    // organization 46-90
    total = total * 1.2;
  }

  return Math.round(total);
}

/** Roll for chronic conditions: 20% chance of one condition. */
export function rollChronicConditions(): string[] {
  if (Math.random() < 0.2) {
    return ['chronic_condition_1'];
  }
  return [];
}

/**
 * Helper: get the parent roll number from a ParentContributions object.
 * Used to look up parent wealth when we only have the contributions object.
 */
export function getParentRollFromContributions(contributions: ParentContributions): number {
  for (const [roll, contrib] of Object.entries(PARENT_CONTRIBUTION_TABLE)) {
    if (
      contrib.car === contributions.car &&
      contrib.collegeFund === contributions.collegeFund &&
      contrib.maxParentAge === contributions.maxParentAge &&
      contrib.weddingContribution === contributions.weddingContribution
    ) {
      return Number(roll);
    }
  }
  return 1; // fallback
}
