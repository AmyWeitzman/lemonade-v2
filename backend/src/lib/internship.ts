/**
 * Internship System — Core Logic
 *
 * Pure functions for internship eligibility and pay reduction.
 * Requirements: Req 31
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlayerForInternshipEligibility {
  educations: Array<{
    isActive: boolean;
    graduated: boolean;
  }>;
  didInternshipThisYear: boolean;
}

export interface InternshipEligibilityResult {
  eligible: boolean;
  reason?: string;
}

// ─── checkInternshipEligibility ───────────────────────────────────────────────

/**
 * Check if a player is eligible for an internship.
 * Requirements: must be enrolled in active education, once per year.
 */
export function checkInternshipEligibility(
  player: PlayerForInternshipEligibility,
): InternshipEligibilityResult {
  const isEnrolled = player.educations.some((e) => e.isActive && !e.graduated);
  if (!isEnrolled) {
    return { eligible: false, reason: 'Must be enrolled in an active education program' };
  }

  if (player.didInternshipThisYear) {
    return { eligible: false, reason: 'Internship can only be done once per year' };
  }

  return { eligible: true };
}

// ─── calculateInternshipJobPayReduction ──────────────────────────────────────

/**
 * Calculate job pay when internship was done the same year.
 * Returns 75% of normal salary (25% reduction).
 * Requirements: Req 31
 */
export function calculateInternshipJobPayReduction(normalSalary: number): number {
  return normalSalary * 0.75;
}
