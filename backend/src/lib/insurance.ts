/**
 * Insurance System — Core Logic
 *
 * Pure/deterministic functions — no DB writes. Callers persist changes.
 *
 * Covers:
 *  - Health insurance (single, family, parent plan, employer contributions)
 *  - Home insurance (cost lookup from housing seed)
 *  - Auto insurance (factor-based calculation with green vehicle discount)
 *  - Insurance reductions on card costs
 *
 * Requirements: Req 29
 */

import { getVehicleAgeYears } from './vehicles';

// ─── Health Insurance Types ───────────────────────────────────────────────────

/**
 * The source/provider of the health insurance plan.
 *
 * - 'none'           — no insurance
 * - 'parent'         — on parent's plan (free, player age < 26)
 * - 'player_ft'      — through player's full-time employer (75% covered)
 * - 'player_pt'      — through player's part-time employer (25% covered)
 * - 'spouse_ft'      — through spouse's full-time employer (75% covered)
 * - 'spouse_pt'      — through spouse's part-time employer (25% covered)
 * - 'self_pay'       — no employer, player pays full premium out of pocket
 */
export type HealthInsuranceSource =
  | 'none'
  | 'parent'
  | 'player_ft'
  | 'player_pt'
  | 'spouse_ft'
  | 'spouse_pt'
  | 'self_pay';

/** Plan tier — single or family (family required when children under 18 exist) */
export type HealthInsuranceTier = 'single' | 'family';

export interface HealthInsuranceInput {
  age: number;
  maritalStatus: string;
  /** Number of children currently under 18 (must be on family plan) */
  childrenUnder18Count: number;
  /** The chosen plan source */
  source: HealthInsuranceSource;
  /** The chosen plan tier (single or family) */
  tier: HealthInsuranceTier;
}

export interface HealthInsuranceCost {
  source: HealthInsuranceSource;
  tier: HealthInsuranceTier;
  /** Annual premium before employer contribution */
  grossCost: number;
  /** Amount employer pays */
  employerContribution: number;
  /** What the player actually pays out of pocket */
  playerCost: number;
  /** True when player is on a parent's plan (free, age < 26) */
  isOnParentPlan: boolean;
  /** True when player has children under 18 (family plan required) */
  requiresFamilyPlan: boolean;
}

/**
 * Context describing the household's employment situation, used to derive
 * which insurance plan sources are available.
 */
export interface HouseholdEmploymentContext {
  playerAge: number;
  maritalStatus: string;
  childrenUnder18Count: number;
  /** True if player has an active full-time job */
  playerHasFTJob: boolean;
  /** True if player has an active part-time job (and no FT job) */
  playerHasPTJob: boolean;
  /** True if spouse has an active full-time job */
  spouseHasFTJob: boolean;
  /** True if spouse has an active part-time job (and no FT job) */
  spouseHasPTJob: boolean;
}

/**
 * Count the number of people who would be covered under the player's health plan:
 * player (1) + spouse if married + children under 18.
 */
export function countInsuredHouseholdMembers(
  maritalStatus: string,
  childrenUnder18Count: number,
): number {
  const spouseCount = maritalStatus === 'married' ? 1 : 0;
  return 1 + spouseCount + childrenUnder18Count;
}

// ─── Home Insurance Types ─────────────────────────────────────────────────────

export interface HomeInsuranceCost {
  /** Annual cost as stored in housing.insurancePerYear (inflation already applied by caller) */
  annualCost: number;
}

// ─── Auto Insurance Types ─────────────────────────────────────────────────────

export interface AutoInsuranceInput {
  /** 'bike' | 'public_transit' | 'car' | 'motorcycle' */
  vehicleType: string;
  /** 'none' | 'gas' | 'electric' | 'hybrid' */
  fuelType: string;
  /** 'new' | 'used_5yr' | 'used_10yr' */
  ageVariant: string;
  purchasePrice: number;
  /** Additional years owned beyond the ageVariant baseline */
  yearsOwned: number;
  driverAge: number;
  /**
   * Accident surcharge rate from player.autoInsuranceRate.
   * 0 = no surcharge, 0.5 = +50% (at-fault), 0.2 = +20% (not-at-fault).
   */
  insuranceSurcharge: number;
  /**
   * From vehicle seed. Non-zero only for motorcycle (flat $1,000/yr).
   * When non-zero, skip the factor calculation and use this as the base.
   */
  insuranceBase: number;
}

export interface AutoInsuranceResult {
  /** Base cost before any discounts or surcharges */
  baseCost: number;
  /** After green vehicle discount (hybrid −5%, electric −10%) */
  afterDiscount: number;
  /** Final cost after accident surcharge */
  afterSurcharge: number;
  /** Averaged factor score (1–5) used to look up base cost */
  factorScore: number;
}

// ─── Card Insurance Reduction Types ──────────────────────────────────────────

export interface PlayerInsuranceState {
  hasHealthInsurance: boolean;
  hasHomeInsurance: boolean;
  /** player.autoInsuranceRate — used for surcharge, not for coverage check */
  autoInsuranceSurcharge: number;
}

// ─── Health Insurance Constants ───────────────────────────────────────────────

/** Base annual premium for a single plan (Req 29) */
export const HEALTH_SINGLE_BASE = 6000;
/** Annual age-based increase per year above 18 for single plan */
export const HEALTH_SINGLE_AGE_INCREASE = 300;

/** Base annual premium for a family plan (Req 29) */
export const HEALTH_FAMILY_BASE = 12000;
/** Additional annual cost per child under 18 on family plan */
export const HEALTH_FAMILY_PER_CHILD = 1000;
/** Annual age-based increase per year above 18 for family plan */
export const HEALTH_FAMILY_AGE_INCREASE = 450;

/** Chronic health condition annual cost WITH insurance */
export const CHRONIC_CONDITION_COST_WITH_INSURANCE = 3000;
/** Chronic health condition annual cost WITHOUT insurance */
export const CHRONIC_CONDITION_COST_WITHOUT_INSURANCE = 5000;

/** Employer contribution rate for full-time employees */
export const EMPLOYER_CONTRIBUTION_FT = 0.75;
/** Employer contribution rate for part-time employees */
export const EMPLOYER_CONTRIBUTION_PT = 0.25;

// ─── Auto Insurance Constants ─────────────────────────────────────────────────

/**
 * Driver age factor (inverted bell curve).
 * Req 29 — younger and older drivers pay more.
 */
export const DRIVER_AGE_FACTORS: Array<{ minAge: number; maxAge: number; factor: number }> = [
  { minAge: 18, maxAge: 20, factor: 5 },
  { minAge: 21, maxAge: 25, factor: 4 },
  { minAge: 26, maxAge: 35, factor: 3 },
  { minAge: 36, maxAge: 45, factor: 2 },
  { minAge: 46, maxAge: 55, factor: 1 },
  { minAge: 56, maxAge: 60, factor: 2 },
  { minAge: 61, maxAge: 65, factor: 3 },
  { minAge: 66, maxAge: 70, factor: 4 },
  { minAge: 71, maxAge: Infinity, factor: 5 },
];

/**
 * Car age factor.
 * Req 29 — newer cars cost more to insure.
 */
export const CAR_AGE_FACTORS: Array<{ maxAge: number; factor: number }> = [
  { maxAge: 2,        factor: 5 },
  { maxAge: 4,        factor: 4 },
  { maxAge: 7,        factor: 3 },
  { maxAge: 10,       factor: 2 },
  { maxAge: Infinity, factor: 1 },
];

/**
 * Vehicle purchase price factor.
 * Req 29 — more expensive vehicles cost more to insure.
 */
export const VEHICLE_COST_FACTORS: Array<{ maxPrice: number; factor: number }> = [
  { maxPrice: 19999,   factor: 1 },
  { maxPrice: 39999,   factor: 2 },
  { maxPrice: 59999,   factor: 3 },
  { maxPrice: 79999,   factor: 4 },
  { maxPrice: 100000,  factor: 5 },
];

/**
 * Factor score → annual insurance cost lookup.
 * Req 29 — 1=$800, 2=$1200, 3=$1500, 4=$2200, 5=$3000.
 */
export const FACTOR_SCORE_TO_COST: Record<number, number> = {
  1: 800,
  2: 1200,
  3: 1500,
  4: 2200,
  5: 3000,
};

/** Green vehicle discounts (Req 29) */
export const GREEN_VEHICLE_DISCOUNTS: Record<string, number> = {
  hybrid:   0.05,
  electric: 0.10,
};

// ─── Health Insurance Calculation ─────────────────────────────────────────────

/**
 * Determine whether the player needs a family plan.
 * Required when 2+ people are covered: player + spouse and/or any children under 18.
 * (e.g. married with no kids still requires family plan — Req 29)
 */
export function requiresFamilyPlan(maritalStatus: string, childrenUnder18Count: number): boolean {
  return countInsuredHouseholdMembers(maritalStatus, childrenUnder18Count) >= 2;
}

/**
 * Determine whether the player can switch from family to single plan.
 * Allowed once divorced AND no children under 18 remain on the plan (Req 29).
 */
export function canSwitchToSinglePlan(
  childrenUnder18Count: number,
  maritalStatus: string,
): boolean {
  return childrenUnder18Count === 0 && maritalStatus === 'divorced';
}

/**
 * Calculate the gross annual health insurance premium (before employer contribution).
 *
 * - Parent plan / none: $0
 * - Single: $6,000 + $300 × (age − 18)
 * - Family: $12,000 + $1,000 × childrenUnder18 + $450 × (age − 18)
 *
 * Note: "Shouldn't have to pay dental fees while on parents' insurance" (Game_Instructions.md).
 *
 * Req 29
 */
export function calculateGrossHealthPremium(
  tier: HealthInsuranceTier | 'none' | 'parent',
  age: number,
  childrenUnder18Count: number,
): number {
  if (tier === 'none' || tier === 'parent') return 0;

  const ageIncrease = Math.max(0, age - 18);

  if (tier === 'single') {
    return HEALTH_SINGLE_BASE + HEALTH_SINGLE_AGE_INCREASE * ageIncrease;
  }

  // family
  return (
    HEALTH_FAMILY_BASE +
    HEALTH_FAMILY_PER_CHILD * childrenUnder18Count +
    HEALTH_FAMILY_AGE_INCREASE * ageIncrease
  );
}

/**
 * Return the employer contribution rate for a given plan source.
 *
 * - FT employer (player or spouse): 75%
 * - PT employer (player or spouse): 25%
 * - All other sources: 0%
 */
export function getEmployerContributionRate(source: HealthInsuranceSource): number {
  if (source === 'player_ft' || source === 'spouse_ft') return EMPLOYER_CONTRIBUTION_FT;
  if (source === 'player_pt' || source === 'spouse_pt') return EMPLOYER_CONTRIBUTION_PT;
  return 0;
}

/**
 * Calculate the full health insurance cost for a chosen source + tier.
 *
 * Req 29
 */
export function calculateHealthInsuranceCost(input: HealthInsuranceInput): HealthInsuranceCost {
  const isOnParentPlan = input.source === 'parent';
  const needsFamilyPlan = requiresFamilyPlan(input.maritalStatus, input.childrenUnder18Count);

  // Parent plan and none both cost $0
  const premiumTier: HealthInsuranceTier | 'none' | 'parent' =
    input.source === 'none' || input.source === 'parent' ? input.source : input.tier;

  const grossCost = calculateGrossHealthPremium(
    premiumTier,
    input.age,
    input.childrenUnder18Count,
  );

  const contributionRate = getEmployerContributionRate(input.source);
  const employerContribution = grossCost * contributionRate;
  const playerCost = Math.max(0, grossCost - employerContribution);

  return {
    source: input.source,
    tier: input.tier,
    grossCost,
    employerContribution,
    playerCost,
    isOnParentPlan,
    requiresFamilyPlan: needsFamilyPlan,
  };
}

/**
 * Generate all available health insurance plan options for the household,
 * each with its calculated cost. The UI should present all options and
 * pre-select the one with the lowest `playerCost`.
 *
 * Available sources depend on:
 *  - Player age < 26 → parent plan available
 *  - Player has FT job → player_ft available
 *  - Player has PT job → player_pt available
 *  - Spouse has FT job → spouse_ft available (married only)
 *  - Spouse has PT job → spouse_pt available (married only)
 *  - Always: self_pay and none
 *
 * The required tier is forced to 'family' when children under 18 exist.
 *
 * Req 29
 */
export function getAvailableHealthInsuranceOptions(
  ctx: HouseholdEmploymentContext,
): HealthInsuranceCost[] {
  const tier: HealthInsuranceTier = requiresFamilyPlan(ctx.maritalStatus, ctx.childrenUnder18Count)
    ? 'family'
    : 'single';

  const sources: HealthInsuranceSource[] = [];

  // Parent plan — free, available until age 26
  if (ctx.playerAge < 26) sources.push('parent');

  // Through player's own employer
  if (ctx.playerHasFTJob) sources.push('player_ft');
  if (ctx.playerHasPTJob) sources.push('player_pt');

  // Through spouse's employer (married only)
  if (ctx.maritalStatus === 'married') {
    if (ctx.spouseHasFTJob) sources.push('spouse_ft');
    if (ctx.spouseHasPTJob) sources.push('spouse_pt');
  }

  // Self-pay (no employer subsidy) and no insurance always available
  sources.push('self_pay');
  sources.push('none');

  return sources.map((source) =>
    calculateHealthInsuranceCost({
      age: ctx.playerAge,
      maritalStatus: ctx.maritalStatus,
      childrenUnder18Count: ctx.childrenUnder18Count,
      source,
      tier,
    }),
  );
}

/**
 * Return the recommended (lowest out-of-pocket cost) health insurance option.
 * Excludes 'none' from the recommendation — only suggests actual coverage.
 *
 * Req 29
 */
export function getRecommendedHealthInsuranceOption(
  ctx: HouseholdEmploymentContext,
): HealthInsuranceCost {
  const options = getAvailableHealthInsuranceOptions(ctx);
  const withCoverage = options.filter((o) => o.source !== 'none');
  return withCoverage.reduce((best, opt) =>
    opt.playerCost < best.playerCost ? opt : best,
  );
}

/**
 * Calculate the annual cost of a chronic health condition.
 *
 * $3,000/yr with insurance, $5,000/yr without (Req 29).
 */
export function calculateChronicConditionCost(
  hasInsurance: boolean,
  conditionCount: number,
): number {
  const perCondition = hasInsurance
    ? CHRONIC_CONDITION_COST_WITH_INSURANCE
    : CHRONIC_CONDITION_COST_WITHOUT_INSURANCE;
  return perCondition * conditionCount;
}

// ─── Home Insurance Calculation ───────────────────────────────────────────────

/**
 * Return the annual home insurance cost for an owned home.
 *
 * The cost is stored in `housing.insurancePerYear` in the DB and inflated
 * by the caller (7–9%/yr per session inflation rates). This function simply
 * validates and returns the value so callers have a consistent entry point.
 *
 * Req 29
 */
export function calculateHomeInsuranceCost(insurancePerYear: number): HomeInsuranceCost {
  return { annualCost: Math.max(0, insurancePerYear) };
}

// ─── Auto Insurance Helpers ───────────────────────────────────────────────────

/**
 * Look up the driver age factor (1–5) based on the inverted bell curve.
 * Req 29
 */
export function getDriverAgeFactor(age: number): number {
  for (const bracket of DRIVER_AGE_FACTORS) {
    if (age >= bracket.minAge && age <= bracket.maxAge) return bracket.factor;
  }
  return 5; // default to highest risk for ages outside defined range
}

/**
 * Look up the car age factor (1–5).
 * Car age = ageVariant baseline + additional yearsOwned.
 * Req 29
 */
export function getCarAgeFactor(ageVariant: string, yearsOwned: number): number {
  const totalAge = getVehicleAgeYears(ageVariant) + yearsOwned;
  for (const bracket of CAR_AGE_FACTORS) {
    if (totalAge <= bracket.maxAge) return bracket.factor;
  }
  return 1;
}

/**
 * Look up the vehicle cost factor (1–5) based on original purchase price.
 * Req 29
 */
export function getVehicleCostFactor(purchasePrice: number): number {
  for (const bracket of VEHICLE_COST_FACTORS) {
    if (purchasePrice <= bracket.maxPrice) return bracket.factor;
  }
  return 5; // above $100k
}

/**
 * Average three factors and round to nearest integer, clamped to 1–5.
 * Req 29
 */
export function averageFactors(f1: number, f2: number, f3: number): number {
  const avg = (f1 + f2 + f3) / 3;
  return Math.min(5, Math.max(1, Math.round(avg)));
}

/**
 * Look up the base insurance cost from the factor score.
 * Req 29
 */
export function factorScoreToCost(score: number): number {
  return FACTOR_SCORE_TO_COST[score] ?? 1500;
}

// ─── Auto Insurance Calculation ───────────────────────────────────────────────

/**
 * Calculate annual auto insurance cost for a vehicle.
 *
 * Rules (Req 29):
 *  - Bike / public transit: no insurance ($0)
 *  - Motorcycle: flat rate from insuranceBase (seed value = $1,000)
 *  - Car: average (driver age factor, car age factor, vehicle cost factor) → round → cost lookup
 *  - Green discount: hybrid −5%, electric −10%
 *  - Accident surcharge: multiply afterDiscount by (1 + insuranceSurcharge)
 */
export function calculateAutoInsurance(input: AutoInsuranceInput): AutoInsuranceResult {
  // No insurance for non-motorized / transit
  if (input.vehicleType === 'bike' || input.vehicleType === 'public_transit') {
    return { baseCost: 0, afterDiscount: 0, afterSurcharge: 0, factorScore: 0 };
  }

  // Motorcycle: flat rate from seed (insuranceBase)
  if (input.vehicleType === 'motorcycle') {
    const base = input.insuranceBase > 0 ? input.insuranceBase : 1000;
    const afterSurcharge = base * (1 + input.insuranceSurcharge);
    return {
      baseCost: base,
      afterDiscount: base, // no green discount for motorcycles
      afterSurcharge,
      factorScore: 0, // flat rate, no factor calculation
    };
  }

  // Car: factor-based calculation
  const driverFactor = getDriverAgeFactor(input.driverAge);
  const carAgeFactor = getCarAgeFactor(input.ageVariant, input.yearsOwned);
  const costFactor = getVehicleCostFactor(input.purchasePrice);

  const score = averageFactors(driverFactor, carAgeFactor, costFactor);
  const baseCost = factorScoreToCost(score);

  // Green vehicle discount
  const discountRate = GREEN_VEHICLE_DISCOUNTS[input.fuelType] ?? 0;
  const afterDiscount = baseCost * (1 - discountRate);

  // Accident surcharge
  const afterSurcharge = afterDiscount * (1 + input.insuranceSurcharge);

  return {
    baseCost,
    afterDiscount,
    afterSurcharge,
    factorScore: score,
  };
}

// ─── Card Cost Insurance Reduction ───────────────────────────────────────────

/**
 * Apply insurance reduction to a card's cost.
 *
 * When the player HAS the relevant insurance, reduce the card cost by the
 * `insuranceReduction` percentage. When the player LACKS insurance, charge
 * the full cost.
 *
 * Req 29 AC 10–11
 *
 * @param cost               - Original card cost
 * @param insuranceReduction - Reduction percentage (e.g. 0.3 = 30% off)
 * @param insuranceAffected  - Which insurance type applies ('health' | 'auto' | 'home')
 * @param playerInsurance    - Current player insurance state
 * @returns Effective cost after applying (or not applying) the reduction
 */
export function applyInsuranceToCardCost(
  cost: number,
  insuranceReduction: number,
  insuranceAffected: 'health' | 'auto' | 'home',
  playerInsurance: PlayerInsuranceState,
): number {
  let hasRelevantInsurance = false;

  switch (insuranceAffected) {
    case 'health':
      hasRelevantInsurance = playerInsurance.hasHealthInsurance;
      break;
    case 'home':
      hasRelevantInsurance = playerInsurance.hasHomeInsurance;
      break;
    case 'auto':
      // Player has auto insurance if they have a vehicle (surcharge field exists on player)
      // A surcharge of 0 means no accident, but they still have coverage.
      // Callers should pass hasAutoInsurance explicitly; we treat any non-negative surcharge
      // as having coverage. For simplicity, auto insurance is always present when a car is owned —
      // the caller is responsible for only passing this for players with active vehicles.
      hasRelevantInsurance = true;
      break;
  }

  if (!hasRelevantInsurance) return cost;

  return cost * (1 - insuranceReduction);
}
