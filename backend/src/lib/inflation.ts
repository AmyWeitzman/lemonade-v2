/**
 * Inflation Engine
 *
 * Generates random inflation rates and applies them to player assets each year.
 *
 * Requirements: Req 20
 */

import { prisma } from './prisma';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InflationRates {
  year: number;
  housing: number;       // 4–7%
  salary: number;        // 2–5%
  autoInsurance: number; // 2–5%
  homeInsurance: number; // 7–9%
  other: number;         // 0.1–0.3%
}

// ─── generateInflationRates ───────────────────────────────────────────────────

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Generate random inflation rates within the specified ranges for a given year.
 * One set of rates is generated per year and shared across all players (Req 20).
 */
export function generateInflationRates(year: number): InflationRates {
  return {
    year,
    housing: randomInRange(0.04, 0.07),
    salary: randomInRange(0.02, 0.05),
    autoInsurance: randomInRange(0.02, 0.05),
    homeInsurance: randomInRange(0.07, 0.09),
    other: randomInRange(0.001, 0.003),
  };
}

// ─── applyInflation ───────────────────────────────────────────────────────────

/**
 * Apply inflation to a player's assets for the new year (Req 20.1–20.5).
 *
 * Applies to:
 *  - Housing: rent and purchase price on active HousingOwnership records
 *  - Salaries: currentSalary on active Employment records
 *  - Vehicle insurance: autoInsuranceRate on the Player record
 *  - Action costs: inflated via the `other` rate on all Action records (session-wide, called once)
 *
 * NOTE: Action cost inflation is applied globally (not per-player) and should only
 * be called once per year cycle, not once per player. The caller (startNewYear) is
 * responsible for calling applyActionCostInflation separately.
 */
/**
 * Apply housing and vehicle catalog inflation globally (Req 20.1, 20.3, 20.4).
 * Called once per year cycle — updates every housing and vehicle option so all
 * players see current prices regardless of what they currently own.
 */
/**
 * Apply catalog-wide inflation once per year cycle (Req 20).
 * Updates every catalog entry so all players see current prices.
 *
 * Rates applied:
 *  - housing rate  → Housing rent, purchase price
 *  - homeInsurance → Housing insurance
 *  - salary rate   → Job base salaries
 *  - autoInsurance → Vehicle insurance base
 *  - other rate    → Vehicle purchase/running costs, Action costs,
 *                    EducationProgram tuition, Card effect costs
 */
export async function applyGlobalCatalogInflation(rates: InflationRates): Promise<void> {
  // ── Housing ──────────────────────────────────────────────────────────────
  const allHousing = await prisma.housing.findMany();
  for (const housing of allHousing) {
    await prisma.housing.update({
      where: { id: housing.id },
      data: {
        rentPerYear: housing.rentPerYear !== null
          ? housing.rentPerYear * (1 + rates.housing)
          : undefined,
        purchasePrice: housing.purchasePrice !== null
          ? housing.purchasePrice * (1 + rates.housing)
          : undefined,
        utilitiesBase: housing.utilitiesBase * (1 + rates.other),
        utilitiesPerPerson: housing.utilitiesPerPerson * (1 + rates.other),
        insurancePerYear: housing.insurancePerYear !== null
          ? housing.insurancePerYear * (1 + rates.homeInsurance)
          : undefined,
      },
    });
  }

  // ── Jobs ─────────────────────────────────────────────────────────────────
  const allJobs = await prisma.job.findMany({ select: { id: true, baseSalary: true } });
  for (const job of allJobs) {
    await prisma.job.update({
      where: { id: job.id },
      data: { baseSalary: job.baseSalary * (1 + rates.salary) },
    });
  }

  // ── Vehicles ─────────────────────────────────────────────────────────────
  const allVehicles = await prisma.vehicle.findMany();
  for (const vehicle of allVehicles) {
    await prisma.vehicle.update({
      where: { id: vehicle.id },
      data: {
        purchasePrice: vehicle.purchasePrice !== null
          ? vehicle.purchasePrice * (1 + rates.other)
          : undefined,
        annualCost: vehicle.annualCost !== null
          ? vehicle.annualCost * (1 + rates.other)
          : undefined,
        insuranceBase: vehicle.insuranceBase * (1 + rates.autoInsurance),
        gasPerYear: vehicle.gasPerYear * (1 + rates.other),
        maintenanceBase: vehicle.maintenanceBase * (1 + rates.other),
      },
    });
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  const allActions = await prisma.action.findMany({
    where: { cost: { gt: 0 } },
    select: { id: true, cost: true, baseCost: true },
  });
  for (const action of allActions) {
    await prisma.action.update({
      where: { id: action.id },
      data: {
        cost: action.cost * (1 + rates.other),
        baseCost: action.baseCost !== null
          ? action.baseCost * (1 + rates.other)
          : undefined,
      },
    });
  }

  // ── Education Programs ────────────────────────────────────────────────────
  const allPrograms = await prisma.educationProgram.findMany({
    select: { id: true, tuitionFullTime: true, tuitionPartTime: true },
  });
  for (const program of allPrograms) {
    await prisma.educationProgram.update({
      where: { id: program.id },
      data: {
        tuitionFullTime: program.tuitionFullTime * (1 + rates.other),
        tuitionPartTime: program.tuitionPartTime !== null
          ? program.tuitionPartTime * (1 + rates.other)
          : undefined,
      },
    });
  }

  // ── Cards (cost inside effects JSONB) ─────────────────────────────────────
  const allCards = await prisma.card.findMany({ select: { id: true, effects: true } });
  for (const card of allCards) {
    const effects = card.effects as Record<string, unknown>;
    if (typeof effects.cost === 'number' && effects.cost > 0) {
      await prisma.card.update({
        where: { id: card.id },
        data: {
          effects: { ...effects, cost: effects.cost * (1 + rates.other) } as any,
        },
      });
    }
  }
}

/**
 * Apply per-player inflation: salary on active employments (Req 20.2).
 * Housing and vehicle costs are handled globally via applyGlobalCatalogInflation.
 */
export async function applyInflation(
  playerId: string,
  rates: InflationRates,
): Promise<void> {
  // Apply salary inflation to all active employments (Req 20.2)
  const activeEmployments = await prisma.employment.findMany({
    where: { playerId, isActive: true },
  });

  for (const employment of activeEmployments) {
    await prisma.employment.update({
      where: { id: employment.id },
      data: {
        currentSalary: employment.currentSalary * (1 + rates.salary),
      },
    });
  }
}

// ─── applyActionCostInflation is now handled inside applyGlobalCatalogInflation ─
