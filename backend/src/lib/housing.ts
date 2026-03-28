/**
 * Housing System — Core Logic
 *
 * Pure/deterministic functions for housing eligibility, market value, and improvements.
 * No DB calls — callers persist changes.
 *
 * Requirements: Req 12, Req 42
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HomeImprovement {
  type: 'remodel' | 'pool' | 'solar_panels';
  cost: number;
  valueIncrease: number;
  annualMaintenanceCost?: number; // pool only
  appliedAge: number;
}

export interface HousingRow {
  id: string;
  name: string;
  type: string; // 'parent' | 'dorm' | 'apartment' | 'house'
  location: string; // 'city' | 'suburb' | 'both'
  isRental: boolean;
  rentPerYear: number | null;
  purchasePrice: number | null;
  utilitiesBase: number;
  utilitiesPerPerson: number;
  insurancePerYear: number | null;
  recommendedOccupancy: number;
  maxOccupancy: number;
  maxKids: number; // -1 = no restriction, 0 = no children allowed
  petLimitLarge: number;
  petLimitSmall: number;
  ageLimit: number | null; // parent housing age limit
  requiresEnrollment: boolean; // dorm
  allowsRemodeling: boolean;
  allowsPool: boolean;
  allowsSolarPanels: boolean;
}

export interface PlayerForHousingEligibility {
  age: number;
  maritalStatus: string;
  children: Array<{ age: number }>;
  pets: Array<{ type: string; isAlive: boolean }>;
  educations: Array<{ isActive: boolean; programType?: string }>;
}

export interface HousingEligibilityResult {
  eligible: boolean;
  reasons: string[];
  warnings: string[]; // soft warnings (e.g. over recommended occupancy)
}

// ─── checkHousingEligibility ──────────────────────────────────────────────────

/**
 * Check whether a player can select a given housing option.
 * Returns eligible=true/false, hard reasons (blockers), and soft warnings.
 */
export function checkHousingEligibility(
  housing: HousingRow,
  player: PlayerForHousingEligibility,
): HousingEligibilityResult {
  const reasons: string[] = [];
  const warnings: string[] = [];

  // Count occupants: player + spouse (if married) + living children under 18
  const kidsUnder18 = player.children.filter((c) => c.age < 18).length;
  const spouseCount = player.maritalStatus === 'married' ? 1 : 0;
  const totalOccupants = 1 + spouseCount + kidsUnder18;

  // Legal max occupancy (hard limit)
  if (totalOccupants > housing.maxOccupancy) {
    reasons.push(
      `Too many occupants: ${totalOccupants} people but max occupancy is ${housing.maxOccupancy}`,
    );
  }

  // Recommended occupancy (soft warning)
  if (totalOccupants > housing.recommendedOccupancy) {
    warnings.push(
      `${totalOccupants} occupants exceeds recommended occupancy of ${housing.recommendedOccupancy}`,
    );
  }

  // Kids restriction
  if (housing.maxKids === 0 && kidsUnder18 > 0) {
    reasons.push('This housing does not allow children');
  } else if (housing.maxKids > 0 && kidsUnder18 > housing.maxKids) {
    reasons.push(
      `Too many children: you have ${kidsUnder18} kids under 18 but max is ${housing.maxKids}`,
    );
  }

  // Pet limits
  const alivePets = player.pets.filter((p) => p.isAlive);
  const largePets = alivePets.filter((p) => p.type === 'large').length;
  const smallPets = alivePets.filter((p) => p.type === 'small').length;

  if (largePets > housing.petLimitLarge) {
    reasons.push(
      `Too many large pets: you have ${largePets} but this housing allows ${housing.petLimitLarge}`,
    );
  }
  if (smallPets > housing.petLimitSmall) {
    reasons.push(
      `Too many small pets: you have ${smallPets} but this housing allows ${housing.petLimitSmall}`,
    );
  }

  // Age restriction (parent housing)
  if (housing.ageLimit !== null && player.age > housing.ageLimit) {
    reasons.push(
      `You have reached the maximum age your parents will let you live with them. You need to move out.`,
    );
  }

  // Enrollment requirement (dorm) — PhD students are NOT eligible for dorm housing
  if (housing.requiresEnrollment) {
    const isEnrolled = player.educations.some((e) => e.isActive);
    const isPhd = player.educations.some(
      (e) => e.isActive && e.programType === 'doctorate',
    );
    if (!isEnrolled) {
      reasons.push('Dorm housing requires active college enrollment');
    } else if (isPhd) {
      reasons.push('PhD students are not eligible for dorm housing');
    }
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    warnings,
  };
}

// ─── calculateMarketValue ─────────────────────────────────────────────────────

/**
 * Calculate the current market value of an owned home.
 *
 * Formula: purchasePrice * (1 + cumulativeInflation) + sum(improvement.valueIncrease)
 *
 * cumulativeInflation is derived from the stored inflationRates array on the session.
 * We compound housing inflation rates from the year the home was purchased.
 */
export function calculateMarketValue(
  purchasePrice: number,
  inflationRates: Array<{ year: number; housing: number }>,
  purchaseYear: number,
  currentYear: number,
  improvements: HomeImprovement[],
): number {
  // Compound housing inflation from purchase year to current year
  let cumulativeMultiplier = 1;
  for (const rate of inflationRates) {
    if (rate.year > purchaseYear && rate.year <= currentYear) {
      cumulativeMultiplier *= 1 + rate.housing;
    }
  }

  const appreciatedValue = purchasePrice * cumulativeMultiplier;
  const improvementValue = improvements.reduce((sum, imp) => sum + imp.valueIncrease, 0);

  return appreciatedValue + improvementValue;
}

// ─── calculatePoolCost ────────────────────────────────────────────────────────

/**
 * Pool installation cost = (10 + 2 * yearsOwned)% of original purchase price.
 * Annual maintenance = $2,000/yr.
 * Value increase = 15% of original purchase price.
 */
export function calculatePoolCost(
  originalPurchasePrice: number,
  yearsOwned: number,
): { installCost: number; annualMaintenance: number; valueIncrease: number } {
  const pct = (10 + 2 * yearsOwned) / 100;
  const installCost = originalPurchasePrice * pct;
  const annualMaintenance = 2000;
  const valueIncrease = originalPurchasePrice * 0.15;
  return { installCost, annualMaintenance, valueIncrease };
}

// ─── calculateRemodelValueIncrease ────────────────────────────────────────────

/**
 * Remodel increases home value by 50–80% of the investment (random).
 */
export function calculateRemodelValueIncrease(investmentAmount: number): number {
  const pct = 0.5 + Math.random() * 0.3; // 50–80%
  return investmentAmount * pct;
}

// ─── SOLAR_PANELS_COST ────────────────────────────────────────────────────────

export const SOLAR_PANELS_VALUE_INCREASE = 15000;
export const SOLAR_PANELS_UTILITY_REDUCTION = 0.6; // 60% reduction
export const SOLAR_PANELS_LEMONS_PER_YEAR = 2;

/**
 * Solar panels installation cost = (5 + 2 * yearsOwned)% of original purchase price.
 */
export function calculateSolarPanelsCost(
  originalPurchasePrice: number,
  yearsOwned: number,
): number {
  const pct = (5 + 2 * yearsOwned) / 100;
  return originalPurchasePrice * pct;
}

// ─── HOUSING_CHANGE_STRESS ────────────────────────────────────────────────────

/** Stress added when a player changes housing (Req 12 AC 13) */
export const HOUSING_CHANGE_STRESS = 10;

// ─── calculateAnnualHousingCosts ──────────────────────────────────────────────

/**
 * Calculate total annual housing costs for a player.
 *
 * Includes:
 *  - Rent (for rentals)
 *  - Utilities: base + per-person amount
 *  - Home insurance (for owned homes, if player has insurance enabled)
 *  - Pool maintenance (if pool improvement exists)
 *  - Solar panel utility reduction (if solar panels installed)
 */
export function calculateAnnualHousingCosts(params: {
  housing: HousingRow;
  occupants: number; // total people (player + spouse + kids under 18)
  isRental: boolean;
  hasHomeInsurance: boolean;
  improvements: HomeImprovement[];
}): {
  rent: number;
  utilities: number;
  insurance: number;
  poolMaintenance: number;
  total: number;
} {
  const { housing, occupants, isRental, hasHomeInsurance, improvements } = params;

  const rent = isRental && housing.rentPerYear ? housing.rentPerYear : 0;

  // Utilities: base + per-person; reduced 60% if solar panels installed
  const hasSolar = improvements.some((i) => i.type === 'solar_panels');
  const rawUtilities = housing.utilitiesBase + housing.utilitiesPerPerson * occupants;
  const utilities = hasSolar ? rawUtilities * (1 - SOLAR_PANELS_UTILITY_REDUCTION) : rawUtilities;

  // Insurance: only for owned homes when player has home insurance enabled
  const insurance = !isRental && hasHomeInsurance && housing.insurancePerYear
    ? housing.insurancePerYear
    : 0;

  // Pool maintenance
  const hasPool = improvements.some((i) => i.type === 'pool');
  const poolMaintenance = hasPool
    ? (improvements.find((i) => i.type === 'pool')?.annualMaintenanceCost ?? 2000)
    : 0;

  const total = rent + utilities + insurance + poolMaintenance;

  return { rent, utilities, insurance, poolMaintenance, total };
}
