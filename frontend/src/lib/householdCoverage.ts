/**
 * Client-side mirror of the backend's `evaluateHouseholdCoverage`
 * (backend/src/lib/vehicles.ts) — used to preview whether a prospective
 * vehicle purchase would leave the household without a shared way to get
 * around, or would newly put everyone on public transit, WITHOUT a server
 * round trip. The backend re-validates authoritatively on purchase.
 */

export interface HouseholdVehicleInfo {
  type: string;
  passengerCapacity: number;
}

export interface HouseholdCoverageInput {
  isMarried: boolean;
  childrenAges: number[];
  playerVehicle: HouseholdVehicleInfo | null;
  spouseVehicle: HouseholdVehicleInfo | null;
}

export interface HouseholdCoverageResult {
  householdSize: number;
  covered: boolean;
  allOnTransit: boolean;
  addedKidsCost: number;
}

const TRANSIT_FARE_PER_ADULT = 1000;

/** Mirrors calculateTransitAnnualCost's `family` coverage math (kids 5–18 half fare, <5 free). */
function familyTransitAnnualCost(isMarried: boolean, childrenAges: number[]): number {
  let total = TRANSIT_FARE_PER_ADULT * (isMarried ? 2 : 1);
  for (const age of childrenAges) {
    if (age < 5) continue;
    total += age <= 18 ? TRANSIT_FARE_PER_ADULT * 0.5 : TRANSIT_FARE_PER_ADULT;
  }
  return total;
}

export function evaluateHouseholdCoverage(input: HouseholdCoverageInput): HouseholdCoverageResult {
  const householdSize = 1 + (input.isMarried ? 1 : 0) + input.childrenAges.length;

  const isTransit = (v: HouseholdVehicleInfo | null) => v?.type === 'public_transit';
  const coversEveryone = (v: HouseholdVehicleInfo | null) =>
    !!v && !isTransit(v) && v.passengerCapacity >= householdSize;

  const playerCoversAll = coversEveryone(input.playerVehicle);
  const spouseCoversAll = input.isMarried && coversEveryone(input.spouseVehicle);
  const allOnTransit = isTransit(input.playerVehicle) && (!input.isMarried || isTransit(input.spouseVehicle));

  const covered = playerCoversAll || spouseCoversAll || allOnTransit;

  let addedKidsCost = 0;
  if (allOnTransit && input.childrenAges.length > 0) {
    const adultsOnlyCost = TRANSIT_FARE_PER_ADULT * (input.isMarried ? 2 : 1);
    const totalCost = familyTransitAnnualCost(input.isMarried, input.childrenAges);
    addedKidsCost = Math.max(0, totalCost - adultsOnlyCost);
  }

  return { householdSize, covered, allOnTransit, addedKidsCost };
}
