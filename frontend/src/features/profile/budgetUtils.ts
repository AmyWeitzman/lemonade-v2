/**
 * Pure budget calculation functions for the profile setup workflow.
 * Extracted so they can be shared between ProfileSetupPage and property-based tests.
 *
 * Feature: profile-setup-workflow-redesign
 */
import { TRAIT_BASE_BUDGET, SKILL_BASE_BUDGET, TRAIT_MAX_DELTA, SKILL_MAX_DELTA } from './constants';

// ─── Budget computation ───────────────────────────────────────────────────────

/**
 * Compute the effective trait budget given the current set of deltas.
 * Budget = base (50) + sum of all decreases (negative deltas).
 */
export function computeTraitBudget(deltas: Record<string, number>): {
  budget: number;
  used: number;
  remaining: number;
} {
  const decreases = Object.values(deltas).reduce((s, v) => s + Math.max(0, -v), 0);
  const increases = Object.values(deltas).reduce((s, v) => s + Math.max(0, v), 0);
  const budget = TRAIT_BASE_BUDGET + decreases;
  return { budget, used: increases, remaining: budget - increases };
}

/**
 * Compute the effective skill budget given the current set of deltas.
 * Budget = base (10) + sum of all decreases (negative deltas).
 */
export function computeSkillBudget(deltas: Record<string, number>): {
  budget: number;
  used: number;
  remaining: number;
} {
  const decreases = Object.values(deltas).reduce((s, v) => s + Math.max(0, -v), 0);
  const increases = Object.values(deltas).reduce((s, v) => s + Math.max(0, v), 0);
  const budget = SKILL_BASE_BUDGET + decreases;
  return { budget, used: increases, remaining: budget - increases };
}

// ─── Delta clamping ───────────────────────────────────────────────────────────

/**
 * Clamp a proposed trait delta for a single trait key, respecting:
 * - Per-trait cap: ±TRAIT_MAX_DELTA (±10)
 * - Budget constraint: total increases ≤ budget
 *
 * @param key        The trait key being changed
 * @param newDelta   The proposed new delta for this trait
 * @param allDeltas  The current delta map (used to compute budget from other traits)
 * @returns The clamped delta value
 *
 * // Feature: profile-setup-workflow-redesign, Property 12: per-trait delta cap
 * // Feature: profile-setup-workflow-redesign, Property 10: trait budget invariant
 */
export function clampTraitDelta(
  key: string,
  newDelta: number,
  allDeltas: Record<string, number>,
): number {
  const otherDecreases = Object.entries(allDeltas)
    .filter(([k]) => k !== key)
    .reduce((s, [, v]) => s + Math.max(0, -v), 0);
  const otherIncreases = Object.entries(allDeltas)
    .filter(([k]) => k !== key)
    .reduce((s, [, v]) => s + Math.max(0, v), 0);
  const effectiveBudget = TRAIT_BASE_BUDGET + otherDecreases + Math.max(0, -newDelta);
  const maxUp = Math.min(TRAIT_MAX_DELTA, effectiveBudget - otherIncreases);
  return Math.max(-TRAIT_MAX_DELTA, Math.min(maxUp, newDelta));
}

/**
 * Clamp a proposed skill delta for a single skill key, respecting:
 * - Per-skill cap: ±SKILL_MAX_DELTA (±2)
 * - Budget constraint: total increases ≤ budget
 *
 * @param key        The skill key being changed
 * @param newDelta   The proposed new delta for this skill
 * @param allDeltas  The current delta map (used to compute budget from other skills)
 * @returns The clamped delta value
 *
 * // Feature: profile-setup-workflow-redesign, Property 13: per-skill delta cap
 * // Feature: profile-setup-workflow-redesign, Property 11: skill budget invariant
 */
export function clampSkillDelta(
  key: string,
  newDelta: number,
  allDeltas: Record<string, number>,
): number {
  const otherDecreases = Object.entries(allDeltas)
    .filter(([k]) => k !== key)
    .reduce((s, [, v]) => s + Math.max(0, -v), 0);
  const otherIncreases = Object.entries(allDeltas)
    .filter(([k]) => k !== key)
    .reduce((s, [, v]) => s + Math.max(0, v), 0);
  const effectiveBudget = SKILL_BASE_BUDGET + otherDecreases + Math.max(0, -newDelta);
  const maxUp = Math.min(SKILL_MAX_DELTA, effectiveBudget - otherIncreases);
  return Math.max(-SKILL_MAX_DELTA, Math.min(maxUp, newDelta));
}
