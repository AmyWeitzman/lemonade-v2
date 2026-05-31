import {
  SKILL_DELTA_MAP,
  TRAIT_DELTA_MAP,
  QUIZ_SKILLS_BUDGET,
  QUIZ_TRAITS_BUDGET,
} from '../constants';

/**
 * Maps a Likert value (1–5) to a Skill_Delta using SKILL_DELTA_MAP.
 * 1→−2, 2→−1, 3→0, 4→+1, 5→+2
 */
export function likertToSkillDelta(likert: number): number {
  return SKILL_DELTA_MAP[likert];
}

/**
 * Maps a Likert value (1–5) to a Trait_Delta using TRAIT_DELTA_MAP.
 * 1→−10, 2→−5, 3→0, 4→+5, 5→+10
 */
export function likertToTraitDelta(likert: number): number {
  return TRAIT_DELTA_MAP[likert];
}

/**
 * Converts a full skill answers map (questionKey → Likert 1–5) to a deltas map
 * (questionKey → Skill_Delta).
 */
export function computeQuizSkillDeltas(
  answers: Record<string, number>,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(answers).map(([key, likert]) => [key, likertToSkillDelta(likert)]),
  );
}

/**
 * Converts a full trait answers map (questionKey → Likert 1–5) to a deltas map
 * (questionKey → Trait_Delta).
 */
export function computeQuizTraitDeltas(
  answers: Record<string, number>,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(answers).map(([key, likert]) => [key, likertToTraitDelta(likert)]),
  );
}

/**
 * Sums all delta values in a deltas map to produce the total budget spent.
 */
export function computeQuizBudgetSpent(deltas: Record<string, number>): number {
  return Object.values(deltas).reduce((sum, delta) => sum + delta, 0);
}

/**
 * Returns the set of Likert values (1–5) that would push the skills budget over
 * QUIZ_SKILLS_BUDGET if selected for the given question key.
 *
 * The current question's own answer is excluded from spentOthers so that changing
 * an existing answer is always evaluated as if the question were unanswered.
 */
export function getDisabledSkillOptions(
  questionKey: string,
  currentAnswers: Record<string, number>,
): Set<number> {
  const deltas = computeQuizSkillDeltas(currentAnswers);
  const spentOthers = Object.entries(deltas)
    .filter(([key]) => key !== questionKey)
    .reduce((sum, [, delta]) => sum + delta, 0);

  const disabled = new Set<number>();
  for (const v of [1, 2, 3, 4, 5]) {
    if (spentOthers + likertToSkillDelta(v) > QUIZ_SKILLS_BUDGET) {
      disabled.add(v);
    }
  }
  return disabled;
}

/**
 * Returns the set of Likert values (1–5) that would push the traits budget over
 * QUIZ_TRAITS_BUDGET if selected for the given question key.
 *
 * The current question's own answer is excluded from spentOthers so that changing
 * an existing answer is always evaluated as if the question were unanswered.
 */
export function getDisabledTraitOptions(
  questionKey: string,
  currentAnswers: Record<string, number>,
): Set<number> {
  const deltas = computeQuizTraitDeltas(currentAnswers);
  const spentOthers = Object.entries(deltas)
    .filter(([key]) => key !== questionKey)
    .reduce((sum, [, delta]) => sum + delta, 0);

  const disabled = new Set<number>();
  for (const v of [1, 2, 3, 4, 5]) {
    if (spentOthers + likertToTraitDelta(v) > QUIZ_TRAITS_BUDGET) {
      disabled.add(v);
    }
  }
  return disabled;
}

/**
 * Computes final trait values by adding deltas to base values, clamped to [0, 100].
 * Missing delta keys default to 0.
 */
export function computeFinalTraits(
  baseTraits: Record<string, number>,
  traitDeltas: Record<string, number>,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(baseTraits).map(([key, base]) => [
      key,
      Math.max(0, Math.min(100, base + (traitDeltas[key] ?? 0))),
    ]),
  );
}

/**
 * Computes final skill values by adding deltas to base values, clamped to [0, 10].
 * Missing delta keys default to 0.
 */
export function computeFinalSkills(
  baseSkills: Record<string, number>,
  skillDeltas: Record<string, number>,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(baseSkills).map(([key, base]) => [
      key,
      Math.max(0, Math.min(10, base + (skillDeltas[key] ?? 0))),
    ]),
  );
}
