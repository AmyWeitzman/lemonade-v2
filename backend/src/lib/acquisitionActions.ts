/**
 * "Get Housing" / "Get Transportation" cart actions.
 *
 * These two catalog actions cost time blocks like any other, but on checkout
 * they actually acquire the chosen home / vehicle (via the shared
 * acquireHousing / acquireVehicle flows). This module validates the player's
 * selection for both the cart-validate and execute endpoints.
 */
import { checkHousingEligibility, calculateMarketValue, type HousingRow, type HomeImprovement } from './housing';
import { checkVehicleCapacity, type VehicleRow, type PlayerForVehicle } from './vehicles';
import type { CurrentHousingOwnership } from './housingActions';
import type { ParentContributions } from './playerInit';
import type { InflationRates } from './inflation';

export const GET_HOUSING_ACTION = 'Get Housing';
export const GET_TRANSPORT_ACTION = 'Get Transportation';

export function isAcquisitionAction(name: string): boolean {
  return name === GET_HOUSING_ACTION || name === GET_TRANSPORT_ACTION;
}

function money(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US');
}

// ─── Shapes (structurally compatible with the route FullPlayer types) ─────────

export interface HousingActionPlayer {
  age: number;
  maritalStatus: string;
  money: number;
  location: string;
  stress: number;
  parentContributions: unknown;
  children: Array<{ age: number }>;
  pets: Array<{ type: string; isAlive: boolean }>;
  educations: Array<{ isActive: boolean; program?: { type?: string } | null }>;
  housingOwnerships: Array<{
    id: string;
    housingId: string;
    endAge: number | null;
    isRental: boolean;
    purchasePrice: number | null;
    yearsLived: number;
    improvements: unknown;
    housing?: { name?: string } | null;
  }>;
  couchSurfYearsUsed?: number;
}

export interface VehicleActionPlayer extends PlayerForVehicle {
  money: number;
  vehicleOwnerships: Array<{ id: string; endAge: number | null; isSpouseVehicle: boolean }>;
}

// ─── Get Housing ─────────────────────────────────────────────────────────────

export type ResolveHousingResult =
  | { error: string }
  | {
      housing: HousingRow;
      resolvedLocation: string;
      currentOwnership: CurrentHousingOwnership | null;
      /** Purchase price charged (0 for a rental). */
      purchasePrice: number;
      /** Cash the player gets back from selling their current owned home (0 otherwise). */
      saleProceeds: number;
    };

export function resolveGetHousing(params: {
  housing: HousingRow | null;
  player: HousingActionPlayer;
  cheapestRentAnnual: number;
  projectedIncome: number;
  requestedLocation?: string;
  inflationRates: InflationRates[];
  currentYear: number;
}): ResolveHousingResult {
  const { housing, player, cheapestRentAnnual, projectedIncome, requestedLocation, inflationRates, currentYear } = params;

  if (!housing) return { error: 'Choose a home for "Get Housing" before checking out.' };

  const activeOwnership = player.housingOwnerships.find((h) => h.endAge === null) ?? null;
  if (activeOwnership?.housingId === housing.id) {
    return { error: `You already live in ${housing.name}.` };
  }

  const parentContributions = player.parentContributions as ParentContributions | null;
  const eligResult = checkHousingEligibility(housing, {
    age: player.age,
    maritalStatus: player.maritalStatus,
    children: player.children.map((c) => ({ age: c.age })),
    pets: player.pets.map((p) => ({ type: p.type, isAlive: p.isAlive })),
    educations: player.educations.map((e) => ({
      isActive: e.isActive,
      programType: e.program?.type,
    })),
    parentMaxAge: parentContributions ? parentContributions.maxParentAge : undefined,
    couchSurfYearsUsed: player.couchSurfYearsUsed ?? 0,
    money: player.money,
    projectedIncome,
    cheapestRentAnnual,
  });
  if (!eligResult.eligible) {
    return { error: `${housing.name}: ${eligResult.reasons[0]}` };
  }

  if (housing.location === 'both' && !requestedLocation) {
    return { error: `Pick a location (city or suburb) for ${housing.name}.` };
  }
  const resolvedLocation = housing.location === 'both' ? requestedLocation! : housing.location;

  const currentOwnership: CurrentHousingOwnership | null = activeOwnership
    ? {
        id: activeOwnership.id,
        housingId: activeOwnership.housingId,
        isRental: activeOwnership.isRental,
        purchasePrice: activeOwnership.purchasePrice,
        yearsLived: activeOwnership.yearsLived,
        improvements: activeOwnership.improvements,
      }
    : null;

  // Selling a currently-owned home pays out its market value in cash.
  let saleProceeds = 0;
  if (currentOwnership && !currentOwnership.isRental) {
    saleProceeds = calculateMarketValue(
      currentOwnership.purchasePrice ?? 0,
      inflationRates as unknown as Array<{ year: number; housing: number }>,
      currentYear - currentOwnership.yearsLived,
      currentYear,
      (currentOwnership.improvements as HomeImprovement[]) ?? [],
    );
  }

  // Buying a non-rental home is paid in full from cash (no mortgages). If the
  // player can't cover it even after selling their current home, they must take
  // a loan first (design: "can't go negative — get a loan").
  const purchasePrice = housing.isRental ? 0 : housing.purchasePrice ?? 0;
  if (purchasePrice > 0 && player.money + saleProceeds < purchasePrice) {
    const shortfall = purchasePrice - saleProceeds - player.money;
    return {
      error: `${housing.name} costs ${money(purchasePrice)}${saleProceeds > 0 ? ` and selling your current home brings in ${money(saleProceeds)}` : ''}, leaving you ${money(shortfall)} short. Take a loan on the Finances page, then add this again.`,
    };
  }

  return { housing, resolvedLocation, currentOwnership, purchasePrice, saleProceeds };
}

// ─── Get Transportation ──────────────────────────────────────────────────────

export type ResolveVehicleResult =
  | { error: string }
  | { vehicle: VehicleRow; purchasePrice: number; currentOwnershipId: string | null };

export function resolveGetTransportation(params: {
  vehicle: VehicleRow | null;
  player: VehicleActionPlayer;
}): ResolveVehicleResult {
  const { vehicle, player } = params;

  if (!vehicle) return { error: 'Choose a vehicle for "Get Transportation" before checking out.' };

  const activeOwnership = player.vehicleOwnerships.find((o) => o.endAge === null && !o.isSpouseVehicle) ?? null;

  const capacity = checkVehicleCapacity(vehicle, player);
  if (!capacity.eligible) return { error: `${vehicle.name}: ${capacity.reason}` };

  // Public transit is billed annually, not purchased
  const purchasePrice =
    vehicle.type === 'public_transit' ? 0 : vehicle.purchasePrice ?? 0;
  if (purchasePrice > 0 && player.money < purchasePrice) {
    return {
      error: `You can't afford ${vehicle.name} — it costs ${money(purchasePrice)} and you have ${money(player.money)}.`,
    };
  }

  return {
    vehicle,
    purchasePrice,
    currentOwnershipId: activeOwnership?.id ?? null,
  };
}
