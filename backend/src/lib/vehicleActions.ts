/**
 * Vehicle acquisition — the shared side-effecting flow for buying a vehicle.
 *
 * Used by both `POST /api/vehicles/:id/purchase` and the "Get Transportation"
 * cart action. Eligibility / capacity / affordability must be checked by the
 * caller BEFORE calling this. Runs inside a caller-provided transaction.
 */
import { Prisma } from '@prisma/client';
import { VEHICLE_CHANGE_STRESS } from './vehicles';

type Tx = Prisma.TransactionClient;

export interface AcquireVehicleArgs {
  player: { id: string; age: number };
  vehicleId: string;
  vehicleType: string;
  purchasePrice: number;
  forSpouse: boolean;
  /** Id of the active ownership record being replaced, if any. */
  currentOwnershipId: string | null;
  /**
   * Apply the vehicle-change stress bump. True for the standalone transportation
   * page; false for the "Get Transportation" cart action (stress already in the
   * action effects).
   */
  applyChangeStress?: boolean;
}

export interface AcquireVehicleResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ownership: any;
  stressAdded: number;
}

export async function acquireVehicle(
  tx: Tx,
  args: AcquireVehicleArgs,
): Promise<AcquireVehicleResult> {
  const { player, vehicleId, vehicleType, purchasePrice, forSpouse, currentOwnershipId } = args;
  const applyChangeStress = args.applyChangeStress ?? true;

  if (currentOwnershipId) {
    await tx.vehicleOwnership.update({
      where: { id: currentOwnershipId },
      data: { endAge: player.age },
    });
  }

  const created = await tx.vehicleOwnership.create({
    data: {
      playerId: player.id,
      vehicleId,
      startAge: player.age,
      purchasePrice,
      wasParentGift: false,
      isSpouseVehicle: forSpouse,
      totalMaintenancePaid: 0,
      totalInsurancePaid: 0,
      yearsOwned: 0,
    },
  });

  // No moving-in stress when the previous vehicle was swapped for public transit
  const stressAdded =
    applyChangeStress && currentOwnershipId && vehicleType !== 'public_transit'
      ? VEHICLE_CHANGE_STRESS
      : 0;

  await tx.player.update({
    where: { id: player.id },
    data: {
      ...(purchasePrice > 0 ? { money: { decrement: purchasePrice } } : {}),
      ...(stressAdded > 0 ? { stress: { increment: stressAdded } } : {}),
    },
  });

  return { ownership: created, stressAdded };
}
