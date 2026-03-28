/**
 * Transportation System — Core Logic
 *
 * Pure/deterministic functions for vehicle eligibility, annual costs,
 * depreciation, and bike area restrictions.
 * No DB calls — callers persist changes.
 *
 * Requirements: Req 13
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VehicleRow {
  id: string;
  name: string;
  type: string; // 'bike' | 'public_transit' | 'car' | 'motorcycle'
  fuelType: string; // 'none' | 'gas' | 'electric' | 'hybrid'
  ageVariant: string; // 'new' | 'used_5yr' | 'used_10yr'
  purchasePrice: number | null;
  annualCost: number | null; // public transit only
  insuranceBase: number;
  gasPerYear: number;
  maintenanceBase: number;
  passengerCapacity: number;
  restrictedToArea: boolean;
  canBeParentGift: boolean;
}

export interface VehicleOwnershipRow {
  id: string;
  vehicleId: string;
  startAge: number;
  endAge: number | null;
  purchasePrice: number | null;
  salePrice: number | null;
  wasParentGift: boolean;
  isSpouseVehicle: boolean;
  totalMaintenancePaid: number;
  totalInsurancePaid: number;
  yearsOwned: number;
}

export interface PlayerForVehicle {
  age: number;
  location: string;
  maritalStatus: string;
  children: Array<{ age: number }>;
  spouse: unknown | null;
  employments: Array<{
    isActive: boolean;
    job: { title: string; benefits: unknown };
  }>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maintenance cost by vehicle age bracket */
export const MAINTENANCE_BY_AGE: Array<{ maxAge: number; cost: number }> = [
  { maxAge: 2,  cost: 1100 },
  { maxAge: 4,  cost: 1200 },
  { maxAge: 7,  cost: 1300 },
  { maxAge: 10, cost: 1400 },
  { maxAge: Infinity, cost: 1500 },
];

/** Mechanic job benefit: 80% maintenance discount */
export const MECHANIC_MAINTENANCE_DISCOUNT = 0.8;

/** Bike depreciation: loses $100/yr, worth $0 in final year */
export const BIKE_DEPRECIATION_PER_YEAR = 100;

/** Motorcycle depreciation rates */
export const MOTORCYCLE_DEPRECIATION_EARLY = 0.15; // 0-5 yrs
export const MOTORCYCLE_DEPRECIATION_LATE  = 0.05; // 6+ yrs

/** Car depreciation rate (14%/yr, A = P * (1 - 0.14)^n) */
export const CAR_DEPRECIATION_RATE = 0.14;

/** Stress added when changing vehicles */
export const VEHICLE_CHANGE_STRESS = 5;

// ─── getVehicleAgeYears ───────────────────────────────────────────────────────

/**
 * Estimate the vehicle's age in years based on its ageVariant.
 * 'new' = 0, 'used_5yr' = 5, 'used_10yr' = 10
 */
export function getVehicleAgeYears(ageVariant: string): number {
  switch (ageVariant) {
    case 'used_5yr':  return 5;
    case 'used_10yr': return 10;
    default:          return 0; // 'new'
  }
}

// ─── getMaintenanceCost ───────────────────────────────────────────────────────

/**
 * Calculate annual maintenance cost based on vehicle age.
 * Bikes and public transit have no maintenance cost.
 */
export function getMaintenanceCost(vehicle: VehicleRow, yearsOwned: number): number {
  if (vehicle.type === 'bike' || vehicle.type === 'public_transit') return 0;

  const vehicleAge = getVehicleAgeYears(vehicle.ageVariant) + yearsOwned;

  for (const bracket of MAINTENANCE_BY_AGE) {
    if (vehicleAge <= bracket.maxAge) return bracket.cost;
  }
  return 1500;
}

// ─── hasMechanicBenefit ───────────────────────────────────────────────────────

/**
 * Check if the player (or spouse) has mechanic job benefit for maintenance discount.
 */
export function hasMechanicBenefit(player: PlayerForVehicle): boolean {
  return player.employments.some((e) => {
    if (!e.isActive) return false;
    const benefits = (e.job.benefits ?? {}) as Record<string, unknown>;
    return Boolean(benefits.autoMaintenanceDiscountPct);
  });
}

// ─── calculateAnnualVehicleCosts ──────────────────────────────────────────────

/**
 * Calculate total annual costs for a vehicle.
 *
 * Includes:
 *  - Insurance (insuranceBase; for cars: based on type/age)
 *  - Gas (gasPerYear; 0 for electric/none)
 *  - Maintenance (by vehicle age; 0 for bike/transit; 80% discount for mechanic)
 *  - Public transit: flat annualCost
 */
export function calculateAnnualVehicleCosts(
  vehicle: VehicleRow,
  yearsOwned: number,
  isMechanic: boolean,
): {
  insurance: number;
  gas: number;
  maintenance: number;
  total: number;
} {
  // Public transit: flat annual cost only
  if (vehicle.type === 'public_transit') {
    const annualCost = vehicle.annualCost ?? 1000;
    return { insurance: 0, gas: 0, maintenance: 0, total: annualCost };
  }

  // Bike: no costs
  if (vehicle.type === 'bike') {
    return { insurance: 0, gas: 0, maintenance: 0, total: 0 };
  }

  const insurance = vehicle.insuranceBase;
  const gas = vehicle.gasPerYear;

  let maintenance = getMaintenanceCost(vehicle, yearsOwned);
  if (isMechanic) {
    maintenance = maintenance * (1 - MECHANIC_MAINTENANCE_DISCOUNT);
  }

  const total = insurance + gas + maintenance;
  return { insurance, gas, maintenance, total };
}

// ─── calculateDepreciatedValue ────────────────────────────────────────────────

/**
 * Calculate the depreciated sale value of a vehicle by type.
 *
 * Bike:       loses $100/yr; worth $0 in the last year (purchasePrice / 100 years)
 * Motorcycle: 15%/yr for years 0-5, then 5%/yr for year 6+
 * Car:        A = P * (1 - 0.14)^n  (14% per annum)
 * Other:      treated as car
 */
export function calculateDepreciatedValue(
  vehicle: VehicleRow,
  purchasePrice: number,
  yearsOwned: number,
): number {
  if (vehicle.type === 'bike') {
    // $100/yr depreciation, floor at $0
    return Math.max(0, purchasePrice - BIKE_DEPRECIATION_PER_YEAR * yearsOwned);
  }

  if (vehicle.type === 'motorcycle') {
    // 15%/yr for first 5 years, 5%/yr thereafter
    let value = purchasePrice;
    const earlyYears = Math.min(yearsOwned, 5);
    value *= Math.pow(1 - MOTORCYCLE_DEPRECIATION_EARLY, earlyYears);
    const lateYears = Math.max(0, yearsOwned - 5);
    if (lateYears > 0) {
      value *= Math.pow(1 - MOTORCYCLE_DEPRECIATION_LATE, lateYears);
    }
    return Math.max(0, value);
  }

  // Car (and anything else): A = P * (1 - 0.14)^n
  return Math.max(0, purchasePrice * Math.pow(1 - CAR_DEPRECIATION_RATE, yearsOwned));
}

// ─── isBikeValidForTravel ─────────────────────────────────────────────────────

/**
 * Check if a bike is valid for the player's travel needs.
 * Bikes cannot travel between city and suburb (restrictedToArea = true).
 * If the player's housing location differs from their current location, bike is invalid.
 */
export function isBikeValidForTravel(
  vehicle: VehicleRow,
  playerLocation: string,
  housingLocation: string,
): boolean {
  if (!vehicle.restrictedToArea) return true;
  // Bike is only valid if player's housing and current location are the same
  return playerLocation === housingLocation;
}

// ─── countHouseholdMembers ────────────────────────────────────────────────────

/**
 * Count total household members: player (1) + spouse (if married) + children under 18.
 */
export function countHouseholdMembers(player: PlayerForVehicle): number {
  const kidsUnder18 = player.children.filter((c) => c.age < 18).length;
  const spouseCount = player.maritalStatus === 'married' ? 1 : 0;
  return 1 + spouseCount + kidsUnder18;
}

// ─── checkVehicleCapacity ─────────────────────────────────────────────────────

/**
 * Check if a vehicle has sufficient capacity for the household.
 * Returns eligible=true/false and a reason if not eligible.
 */
export function checkVehicleCapacity(
  vehicle: VehicleRow,
  player: PlayerForVehicle,
): { eligible: boolean; reason?: string } {
  const householdSize = countHouseholdMembers(player);
  if (vehicle.passengerCapacity < householdSize) {
    return {
      eligible: false,
      reason: `Vehicle capacity (${vehicle.passengerCapacity}) is less than household size (${householdSize})`,
    };
  }
  return { eligible: true };
}
