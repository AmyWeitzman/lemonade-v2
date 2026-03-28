/**
 * Health and Stress Calculation Engines
 *
 * Pure/deterministic functions — no DB writes. Callers are responsible for persisting changes.
 *
 * Requirements: Req 5 (health/stress), Req 16 (aging health loss), Req 39/40 (debt + expense forecast stress)
 */

// ─── Input Types ──────────────────────────────────────────────────────────────

export interface StressPlayerInput {
  stress: number; // current stress (will be reset to 0 before calculation by caller)
  health: number;
  maxHealth: number;
  age: number;
  money: number;
  projectedIncome: number; // next year's salary
  chronicConditions: string[]; // from JSONB
  traits: Record<string, number>; // { stressTolerance, ... }

  // Relations
  employments: Array<{
    isActive: boolean;
    yearsOfService: number;
    job: { stressLevel: number };
  }>;
  educations: Array<{
    isActive: boolean;
    graduated: boolean;
    program: { stressLevel?: number; isStem: boolean };
  }>;
  loans: Array<{ currentBalance: number; owner: string }>;
  children: Array<{ age: number }>;
  pets: Array<{ isAlive: boolean }>;

  // Housing — optional; overcrowding stress only applies when housing is known
  housing?: {
    recommendedOccupancy: number;
  } | null;

  // Accumulated card stress for this year (set by card engine)
  cardStressThisYear?: number;

  // Spouse info for debt and occupancy
  spouse?: {
    loans?: Array<{ currentBalance: number }>;
  } | null;

  // Expense forecast — caller can pre-compute or pass null to skip forecast stress
  expenseForecast?: {
    remainingFunds: number;
  } | null;
}

export interface HealthPlayerInput {
  health: number;
  maxHealth: number;
  age: number;
  stress: number; // already-calculated stress for this year
  chronicConditions: string[];
}

export interface MutableHealthState {
  health: number;
  maxHealth: number;
  /**
   * Accumulated temporary health debt for this year.
   * At the start of the next year, this amount is added back to health
   * (capped at maxHealth). The caller is responsible for resetting it to 0
   * after restoring health.
   */
  temporaryHealthDebt: number;
}

// ─── Stress Calculation ───────────────────────────────────────────────────────

/**
 * Aggregate all stress sources for a player at the beginning of a year.
 * Stress starts at 0 (caller resets it); this function builds it up from scratch.
 *
 * Sources (in order):
 *  1. Job stress (each active employment; +5% first year)
 *  2. Education stress (each active, non-graduated enrollment; STEM ×1.2)
 *  3. Debt stress (1% per $20k total loan balance, including spouse loans)
 *  4. Children stress (1% per child under 18)
 *  5. Pet stress (1% per living pet)
 *  6. Housing overcrowding stress (+2% per person over recommended occupancy)
 *  7. Card stress (accumulated from card effects during the year)
 *  8. Expense forecast stress (based on projected remaining funds)
 *  9. Stress tolerance modifier (±15% / +10%)
 *
 * Returns the final stress value capped at 100.
 */
export function calculateStress(player: StressPlayerInput): number {
  let stress = 0;

  // 1. Job stress
  for (const employment of player.employments) {
    if (!employment.isActive) continue;
    let jobStress = employment.job.stressLevel;
    // First year at a new job adds 5%
    if (employment.yearsOfService === 0) {
      jobStress = Math.floor(jobStress * 1.05);
    }
    stress += jobStress;
  }

  // 2. Education stress
  for (const education of player.educations) {
    if (!education.isActive || education.graduated) continue;
    let programStress = education.program.stressLevel ?? 10; // default 10 if not set
    if (education.program.isStem) {
      programStress = Math.floor(programStress * 1.2);
    }
    stress += programStress;
  }

  // 3. Debt stress — 1% per $20k (Req 39)
  let totalDebt = player.loans.reduce((sum, loan) => sum + loan.currentBalance, 0);
  if (player.spouse?.loans) {
    totalDebt += player.spouse.loans.reduce((sum, loan) => sum + loan.currentBalance, 0);
  }
  stress += Math.floor(totalDebt / 20000);

  // 4. Children stress — 1% per child under 18
  const childrenUnder18 = player.children.filter((c) => c.age < 18).length;
  stress += childrenUnder18;

  // 5. Pet stress — 1% per living pet
  const alivePets = player.pets.filter((p) => p.isAlive).length;
  stress += alivePets;

  // 6. Housing overcrowding stress — +2% per person over recommended occupancy
  if (player.housing) {
    const occupants = calculateOccupants(player);
    if (occupants > player.housing.recommendedOccupancy) {
      const extraPeople = occupants - player.housing.recommendedOccupancy;
      stress += extraPeople * 2;
    }
  }

  // 7. Card stress — accumulated from card effects this year
  stress += player.cardStressThisYear ?? 0;

  // 8. Expense forecast stress (Req 40)
  if (player.expenseForecast != null) {
    const { remainingFunds } = player.expenseForecast;
    if (remainingFunds <= 1000) stress += 5;
    else if (remainingFunds <= 5000) stress += 3;
    else if (remainingFunds <= 10000) stress += 1;
  }

  // 9. Stress tolerance modifier (Req 5.4 / 5.5)
  const stressTolerance = (player.traits.stressTolerance ?? 0);
  if (stressTolerance >= 67) {
    stress = Math.floor(stress * 0.85); // high tolerance: -15%
  } else if (stressTolerance < 34) {
    stress = Math.floor(stress * 1.1); // low tolerance: +10%
  }

  return Math.min(stress, 100);
}

// ─── Health Calculation ───────────────────────────────────────────────────────

/**
 * Apply stress-based health loss, aging health loss, and chronic condition max health cap.
 * Returns updated { health, maxHealth } — does NOT mutate the input.
 *
 * Note: aging health loss is permanent (reduces maxHealth). This mirrors the
 * existing yearCycle.ts behaviour where healthLoss reduces both health and maxHealth.
 *
 * Req 5.6–5.11  — stress thresholds
 * Req 5.12      — chronic condition max health cap
 * Req 16.1–16.5 — aging health loss by decade
 */
export function calculateHealth(player: HealthPlayerInput): MutableHealthState {
  let { health, maxHealth } = player;
  const { stress, age, chronicConditions } = player;

  // 1. Stress-based health loss (Req 5.6–5.11)
  if (health >= 70) {
    if (stress > 90) health -= 2;
    else if (stress > 80) health -= 1;
  } else if (health >= 50) {
    if (stress > 85) health -= 3;
    else if (stress > 75) health -= 2;
  } else {
    // health < 50
    if (stress > 80) health -= 4;
    else if (stress > 70) health -= 3;
  }

  // 2. Aging health loss — semi-permanent (Req 16.1–16.5)
  //    Reduces current health only; maxHealth is untouched so the player can
  //    earn health back through actions. Does NOT auto-restore next year.
  const agingLoss = agingHealthLossPct(age);
  if (agingLoss > 0) {
    health = Math.max(0, health - agingLoss);
  }

  // 3. Chronic condition max health cap (Req 5.12)
  //    100% - 15% per condition; this is a hard ceiling regardless of other changes
  if (chronicConditions.length > 0) {
    const chronicCap = 100 - chronicConditions.length * 15;
    maxHealth = Math.min(maxHealth, Math.max(0, chronicCap));
  }

  // 4. Cap current health at maxHealth, floor at 0
  health = Math.min(health, maxHealth);
  health = Math.max(health, 0);

  return { health, maxHealth, temporaryHealthDebt: 0 };
}

// ─── Health Effects ───────────────────────────────────────────────────────────

/**
 * Apply health changes to a mutable health state. Three change types:
 *
 * - **temporary**: health drops this year and auto-restores next year.
 *   The lost amount is accumulated in `state.temporaryHealthDebt`. At the
 *   start of the next year the caller adds `temporaryHealthDebt` back to
 *   health (capped at maxHealth) and resets the debt to 0.
 *   Example: card one-time injury that heals by next birthday.
 *
 * - **semiPermanent**: health drops and does NOT auto-restore, but maxHealth
 *   is untouched so the player can earn health back through actions.
 *   Example: aging health loss each decade.
 *
 * - **permanent**: both health AND maxHealth change. No auto-restore.
 *   Example: permanent injury or surgery that fixes an underlying condition.
 *
 * Chronic condition rule (Req 5.13): health GAINS (positive values) are
 * reduced to 80%, rounded up, for all three change types.
 * Permanent health loss decreases maxHealth (Req 5.15).
 *
 * Mutates the passed-in state object and returns it for convenience.
 */
export function applyHealthEffects(
  state: MutableHealthState,
  chronicConditionCount: number,
  {
    temporary = 0,
    semiPermanent = 0,
    permanent = 0,
  }: { temporary?: number; semiPermanent?: number; permanent?: number } = {},
): MutableHealthState {
  const hasChronicConditions = chronicConditionCount > 0;

  // ── Temporary change — auto-restores next year ────────────────────────────
  if (temporary !== 0) {
    if (temporary > 0) {
      const effectiveGain = hasChronicConditions ? Math.ceil(temporary * 0.8) : temporary;
      state.health = Math.min(state.health + effectiveGain, state.maxHealth);
      // Gains don't create debt (nothing to undo)
    } else {
      // Loss: reduce health and record debt so it can be restored next year
      const actualLoss = Math.min(-temporary, state.health); // can't lose more than current health
      state.health = Math.max(0, state.health + temporary);
      state.temporaryHealthDebt += actualLoss;
    }
  }

  // ── Semi-permanent change — no auto-restore, maxHealth unaffected ─────────
  if (semiPermanent !== 0) {
    if (semiPermanent > 0) {
      const effectiveGain = hasChronicConditions
        ? Math.ceil(semiPermanent * 0.8)
        : semiPermanent;
      state.health = Math.min(state.health + effectiveGain, state.maxHealth);
    } else {
      state.health = Math.max(0, state.health + semiPermanent);
    }
  }

  // ── Permanent change — health AND maxHealth, no auto-restore ─────────────
  if (permanent !== 0) {
    if (permanent > 0) {
      // Gain: raise maxHealth ceiling first, then raise current health
      state.maxHealth = Math.min(100, state.maxHealth + permanent);
      const effectiveGain = hasChronicConditions ? Math.ceil(permanent * 0.8) : permanent;
      state.health = Math.min(state.health + effectiveGain, state.maxHealth);
    } else {
      // Loss: lower maxHealth and current health (Req 5.15)
      state.maxHealth = Math.max(0, state.maxHealth + permanent);
      state.health = Math.max(0, state.health + permanent);
      state.health = Math.min(state.health, state.maxHealth);
    }
  }

  return state;
}

/**
 * Restore temporary health at the start of a new year.
 * Adds back the accumulated `temporaryHealthDebt`, capped at maxHealth,
 * then resets the debt to 0.
 *
 * Call this during year-start processing before any new effects are applied.
 */
export function restoreTemporaryHealth(state: MutableHealthState): MutableHealthState {
  if (state.temporaryHealthDebt > 0) {
    state.health = Math.min(state.health + state.temporaryHealthDebt, state.maxHealth);
    state.temporaryHealthDebt = 0;
  }
  return state;
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Flat percentage-point health loss per year based on age decade (Req 16.1–16.5).
 */
function agingHealthLossPct(age: number): number {
  if (age >= 80) return 5;
  if (age >= 70) return 4;
  if (age >= 60) return 3;
  if (age >= 50) return 2;
  if (age >= 40) return 1;
  return 0;
}

/**
 * Count total occupants in the player's household for overcrowding stress.
 * Includes player, spouse (if any), and children under 18.
 */
function calculateOccupants(
  player: Pick<StressPlayerInput, 'spouse' | 'children'>,
): number {
  let occupants = 1; // the player
  if (player.spouse) occupants += 1;
  occupants += player.children.filter((c) => c.age < 18).length;
  return occupants;
}
