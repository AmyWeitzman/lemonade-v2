/**
 * PTO System — Core Logic
 *
 * Pure functions for PTO calculation, accrual, and validation.
 * Requirements: Req 35
 */

// ─── calculateMaxPTO ──────────────────────────────────────────────────────────

/**
 * Calculate the maximum PTO blocks a player can request for a job.
 * Max PTO = half of the job's time blocks (rounded down).
 * Part-time jobs get no PTO.
 */
export function calculateMaxPTO(jobTimeBlocks: number, isPartTime: boolean): number {
  if (isPartTime) return 0;
  return Math.floor(jobTimeBlocks / 2);
}

// ─── calculatePTOAccrual ──────────────────────────────────────────────────────

/**
 * Calculate PTO accrual increase based on years of service.
 * Every 10 years of service, PTO increases by 5 days (1 day = 1 time block).
 * Returns the total PTO time blocks to add this year (base + milestone bonus).
 */
export function calculatePTOAccrual(yearsOfService: number, basePTOTimeBlocks: number): number {
  if (basePTOTimeBlocks <= 0) return 0;

  // Every 10 years of service, add 5 bonus blocks
  const milestoneBonus = yearsOfService > 0 && yearsOfService % 10 === 0 ? 5 : 0;
  return basePTOTimeBlocks + milestoneBonus;
}

// ─── hasSufficientPTO ─────────────────────────────────────────────────────────

/**
 * Check if a player has enough PTO remaining for a given number of blocks.
 */
export function hasSufficientPTO(ptoRemaining: number, blocksNeeded: number): boolean {
  return ptoRemaining >= blocksNeeded;
}

// ─── resetPTOOnJobChange ──────────────────────────────────────────────────────

/**
 * Reset PTO when leaving a job (job change or FT→PT switch).
 * Returns 0 — PTO is forfeited on job change.
 */
export function resetPTOOnJobChange(): number {
  return 0;
}
