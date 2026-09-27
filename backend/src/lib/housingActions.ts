/**
 * Housing acquisition — the shared side-effecting flow for moving into a home.
 *
 * Used by both `POST /api/housing/:id/select` and the "Get Housing" cart action
 * so the two paths stay in sync. Eligibility / affordability must be checked by
 * the caller BEFORE calling this. Runs inside a caller-provided transaction.
 */
import { Prisma } from '@prisma/client';
import {
  calculateMarketValue,
  HOUSING_CHANGE_STRESS,
  type HousingRow,
  type HomeImprovement,
} from './housing';
import type { InflationRates } from './inflation';

type Tx = Prisma.TransactionClient;

export interface CurrentHousingOwnership {
  id: string;
  housingId: string;
  isRental: boolean;
  purchasePrice: number | null;
  yearsLived: number;
  improvements: unknown;
}

export interface AcquireHousingArgs {
  player: { id: string; age: number; stress: number; location: string };
  housing: HousingRow;
  housingId: string;
  resolvedLocation: string;
  currentOwnership: CurrentHousingOwnership | null;
  inflationRates: InflationRates[];
  currentYear: number;
  /**
   * Apply the moving-stress bump. True for the standalone housing page; false for
   * the "Get Housing" cart action, whose stress is already in the action effects.
   */
  applyMoveStress?: boolean;
}

export interface AcquireHousingResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ownership: any;
  saleProceeds: number;
  purchasePrice: number;
  stressAdded: number;
  locationChanged: boolean;
}

export async function acquireHousing(
  tx: Tx,
  args: AcquireHousingArgs,
): Promise<AcquireHousingResult> {
  const { player, housing, housingId, resolvedLocation, currentOwnership, inflationRates, currentYear } = args;
  const applyMoveStress = args.applyMoveStress ?? true;

  // Sale proceeds from an owned home being left behind
  let saleProceeds = 0;
  if (currentOwnership && !currentOwnership.isRental) {
    const improvements = (currentOwnership.improvements as HomeImprovement[] | null) ?? [];
    const purchaseYear = currentYear - currentOwnership.yearsLived;
    saleProceeds = calculateMarketValue(
      currentOwnership.purchasePrice ?? 0,
      inflationRates as unknown as Array<{ year: number; housing: number }>,
      purchaseYear,
      currentYear,
      improvements,
    );
  }

  const stressAdded = applyMoveStress && currentOwnership ? HOUSING_CHANGE_STRESS : 0;

  // Buying a home is paid in full from cash (there are no mortgages). The caller
  // must ensure the player can cover `purchasePrice − saleProceeds` first.
  const purchasePrice = housing.isRental ? 0 : housing.purchasePrice ?? 0;
  const moneyDelta = saleProceeds - purchasePrice;

  if (currentOwnership) {
    await tx.housingOwnership.update({
      where: { id: currentOwnership.id },
      data: {
        endAge: player.age,
        ...(!currentOwnership.isRental ? { salePrice: saleProceeds } : {}),
      },
    });
  }

  const created = await tx.housingOwnership.create({
    data: {
      playerId: player.id,
      housingId,
      startAge: player.age,
      isRental: housing.isRental,
      purchasePrice: housing.isRental ? null : housing.purchasePrice,
      totalRentPaid: 0,
      yearsLived: 0,
      chosenLocation: resolvedLocation,
      improvements: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  });

  await tx.player.update({
    where: { id: player.id },
    data: {
      location: resolvedLocation,
      // Relative updates so this composes with any other player update in the
      // same transaction (the "Get Housing" cart action already wrote stress).
      ...(stressAdded > 0 ? { stress: { increment: stressAdded } } : {}),
      ...(moneyDelta !== 0 ? { money: { increment: moneyDelta } } : {}),
    },
  });

  return {
    ownership: created,
    saleProceeds,
    purchasePrice,
    stressAdded,
    locationChanged: resolvedLocation !== player.location,
  };
}
