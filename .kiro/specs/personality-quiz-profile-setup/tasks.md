# Implementation Plan: Personality Quiz Profile Setup

## Overview

Replace the slider-based manual adjustment step in `ProfileSetupPage` with a two-part personality quiz (Skills → Traits → Summary). The implementation proceeds in three phases: constants and utility functions, new quiz components, and integration into `ProfileSetupPage` (removing slider components).

All code is TypeScript/React. No backend changes are required — the same API endpoints and request/response shapes are used.

## Tasks

- [x] 1. Constants and Utility Module
  - [x] 1.1 Add quiz constants to `constants.ts`
    - In `frontend/src/features/profile/constants.ts`, add the following exports:
      - `export const QUIZ_SKILLS_BUDGET = 34;`
      - `export const QUIZ_TRAITS_BUDGET = 89;`
      - `export const SKILL_DELTA_MAP: Record<number, number> = { 1: -2, 2: -1, 3: 0, 4: 1, 5: 2 };`
      - `export const TRAIT_DELTA_MAP: Record<number, number> = { 1: -10, 2: -5, 3: 0, 4: 5, 5: 10 };`
    - Do not remove or modify any existing constants (old slider constants remain for backward compatibility until slider components are deleted)
    - _Requirements: 1.8, 2.5, 4.1, 4.2_

  - [x] 1.2 Create `quizUtils.ts` with pure delta-mapping and budget functions
    - Create `frontend/src/features/profile/quiz/quizUtils.ts`
    - Implement and export `likertToSkillDelta(likert: number): number` — maps Likert 1–5 to Skill_Delta using `SKILL_DELTA_MAP`
    - Implement and export `likertToTraitDelta(likert: number): number` — maps Likert 1–5 to Trait_Delta using `TRAIT_DELTA_MAP`
    - Implement and export `computeQuizSkillDeltas(answers: Record<string, number>): Record<string, number>` — converts a full skill answers map to a deltas map
    - Implement and export `computeQuizTraitDeltas(answers: Record<string, number>): Record<string, number>` — converts a full trait answers map to a deltas map
    - Implement and export `computeQuizBudgetSpent(deltas: Record<string, number>): number` — sums all delta values
    - Implement and export `getDisabledSkillOptions(questionKey: string, currentAnswers: Record<string, number>): Set<number>` — returns the set of Likert values (1–5) that would push the skills budget over `QUIZ_SKILLS_BUDGET` if selected, excluding the current question's own answer from `spentOthers`
    - Implement and export `getDisabledTraitOptions(questionKey: string, currentAnswers: Record<string, number>): Set<number>` — same logic for traits with `QUIZ_TRAITS_BUDGET`
    - Implement and export `computeFinalTraits(baseTraits: Record<string, number>, traitDeltas: Record<string, number>): Record<string, number>` — base + delta clamped to [0, 100]
    - Implement and export `computeFinalSkills(baseSkills: Record<string, number>, skillDeltas: Record<string, number>): Record<string, number>` — base + delta clamped to [0, 10]
    - _Requirements: 1.8, 2.5, 4.3, 4.4, 6.1, 6.2, 6.3_


- [x] 2. Quiz UI Components
  - [x] 2.1 Create `LikertQuestion` component
    - Create `frontend/src/features/profile/quiz/LikertQuestion.tsx`
    - Accept props: `questionKey: string`, `prompt: string`, `selectedValue: number | undefined`, `onSelect: (key: string, value: number) => void`, `disabledOptions: Set<number>`, `hasError: boolean`
    - Render the prompt text followed by five MUI `Button` components for Likert values 1–5
    - Highlight the currently selected option (e.g. `variant="contained"` vs `variant="outlined"`)
    - Disable individual buttons whose value is in `disabledOptions`
    - When `hasError` is true and no option is selected, apply an error border/highlight to the question row
    - Each button must have `aria-label` including the numeric value and its label (e.g. `"1 - Strongly Disagree"`)
    - Define `LIKERT_LABELS: Record<number, string>` locally: `{ 1: 'Strongly Disagree', 2: 'Disagree', 3: 'Neutral', 4: 'Agree', 5: 'Strongly Agree' }`
    - _Requirements: 1.2, 1.3, 2.2, 2.3_

  - [x] 2.2 Create `QuizBudgetIndicator` component
    - Create `frontend/src/features/profile/quiz/QuizBudgetIndicator.tsx`
    - Accept props: `label: string`, `total: number`, `spent: number`, `remaining: number`
    - Display spent, total, and remaining values as text
    - Render an MUI `LinearProgress` bar showing `(spent / total) * 100` percent, capped at 100 for display
    - When `remaining <= 0`: set progress bar color to `error.main`, show remaining as a negative number in red, display a warning icon
    - When `remaining > 0`: render in normal (non-warning) state
    - This component is distinct from the old `BudgetMeter` — it does not show "%" units (quiz budget is in delta points)
    - _Requirements: 1.5, 1.6, 1.7, 2.5, 2.6, 2.7, 4.2, 4.3, 4.5, 4.6, 4.7, 4.8_

  - [x] 2.3 Create `SkillsQuiz` component
    - Create `frontend/src/features/profile/quiz/SkillsQuiz.tsx`
    - Accept props: `answers: Record<string, number>`, `onAnswerChange: (key: string, value: number) => void`, `onNext: () => void`, `showUnanswered: boolean`
    - Import `SKILL_LABELS` from `../constants` and render one `LikertQuestion` per skill key (8 total) with prompt `"I enjoy [label]"`
    - Do NOT render a question for `health`
    - Render `QuizBudgetIndicator` with `label="Skills Budget"`, `total={QUIZ_SKILLS_BUDGET}`, and `spent`/`remaining` computed via `computeQuizSkillDeltas` + `computeQuizBudgetSpent`
    - Pass `disabledOptions={getDisabledSkillOptions(key, answers)}` to each `LikertQuestion`
    - Pass `hasError={showUnanswered && answers[key] === undefined}` to each `LikertQuestion`
    - Render a "Next" button; enable it only when all 8 skill keys have an answer AND `remaining >= 0`; call `onNext` on click
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 3.1, 3.2, 3.3, 4.1, 4.3, 4.6, 8.5, 8.6_

  - [x] 2.4 Create `TraitsQuiz` component
    - Create `frontend/src/features/profile/quiz/TraitsQuiz.tsx`
    - Accept props: `answers: Record<string, number>`, `onAnswerChange: (key: string, value: number) => void`, `onBack: () => void`, `onSubmit: () => void`, `showUnanswered: boolean`, `submitError: string | null`, `isSubmitting: boolean`
    - Import `TRAIT_LABELS` from `../constants` and render one `LikertQuestion` per trait key (13 total) with prompt `"I am [label]"`
    - Render `QuizBudgetIndicator` with `label="Traits Budget"`, `total={QUIZ_TRAITS_BUDGET}`, and `spent`/`remaining` computed via `computeQuizTraitDeltas` + `computeQuizBudgetSpent`
    - Pass `disabledOptions={getDisabledTraitOptions(key, answers)}` to each `LikertQuestion`
    - Pass `hasError={showUnanswered && answers[key] === undefined}` to each `LikertQuestion`
    - Render a "Back" button that calls `onBack`
    - Render a "Submit" button; enable it only when all 13 trait keys have an answer AND `remaining >= 0`; show `CircularProgress` when `isSubmitting`; call `onSubmit` on click
    - When `submitError` is non-null, render an MUI `Alert` with `severity="error"` above the Submit button
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.4, 3.5, 3.6, 4.2, 4.4, 4.7, 6.5_

  - [x] 2.5 Create `ProfileSummary` component
    - Create `frontend/src/features/profile/quiz/ProfileSummary.tsx`
    - Accept props: `rolledPlayer: RolledPlayerData`, `skillDeltas: Record<string, number>`, `traitDeltas: Record<string, number>`, `onProceed: () => void`
    - Compute `finalTraits` using `computeFinalTraits(rolledPlayer.traits, traitDeltas)` and `finalSkills` using `computeFinalSkills(rolledPlayer.skills, skillDeltas)`
    - Display all 13 trait names alongside their final stat values (from `TRAIT_LABELS`)
    - Display all 8 skill names alongside their final stat values (from `SKILL_LABELS`)
    - This component is read-only — do NOT render any `<input>`, `<select>`, MUI `Slider`, or other interactive form element
    - Render a "Proceed to Review" button that calls `onProceed`
    - Import `RolledPlayerData` type from `../../../pages/ProfileSetupPage`
    - _Requirements: 6.6, 7.1, 7.2, 7.3, 7.4_

  - [x] 2.6 Create `QuizPage` component
    - Create `frontend/src/features/profile/quiz/QuizPage.tsx`
    - Accept props: `rolledPlayer: RolledPlayerData`, `playerId: string`, `onConfirmSuccess: () => void`, `onStatsChange: (traits: Record<string, number>, skills: Record<string, number>) => void`
    - Define `type QuizStep = 'skills' | 'traits' | 'summary'`
    - Own all quiz state: `skillAnswers`, `traitAnswers`, `quizStep`, `showUnanswered`, `submitError`, `isSubmitting`
    - Render `SkillsQuiz` when `quizStep === 'skills'`, `TraitsQuiz` when `quizStep === 'traits'`, `ProfileSummary` when `quizStep === 'summary'`
    - "Next" handler: if any of the 8 skill keys are missing from `skillAnswers`, set `showUnanswered = true` and block navigation; otherwise advance to `'traits'` and reset `showUnanswered`
    - "Back" handler: return to `'skills'` step, preserve all answers, reset `showUnanswered`
    - "Submit" handler: if any of the 13 trait keys are missing from `traitAnswers`, set `showUnanswered = true` and block; otherwise call `POST /players/:id/initialize/confirm` with `{ traitAdjustments: traitDeltas, skillAdjustments: skillDeltas }`; on success advance to `'summary'`; on error set `submitError`
    - Use `useMutation` from `@tanstack/react-query` for the confirm call; import `api` from `../../../lib/api`
    - After each answer change, call `onStatsChange` with updated `computeFinalTraits` / `computeFinalSkills` values
    - "Proceed to Review" (from `ProfileSummary`): call `onConfirmSuccess()`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 6.4, 6.5, 6.6, 8.1, 8.2, 8.3, 8.4_


- [x] 3. Integrate Quiz into `ProfileSetupPage` and Remove Sliders
  - [x] 3.1 Update `ProfileSetupPage` to use `QuizPage` and remove slider components
    - In `frontend/src/pages/ProfileSetupPage.tsx`:
      - Remove imports: `TraitSliderRow`, `SkillSliderRow`, `BudgetMeter`, `clampTraitDelta`, `clampSkillDelta`, `computeTraitBudget`, `computeSkillBudget`
      - Remove state: `traitDeltas`, `skillDeltas`, `sliderResetKey`
      - Remove handlers: `handleTraitChange`, `handleSkillChange`, `handleReset`
      - Remove the budget computation block (`computeTraitBudget`, `computeSkillBudget` calls)
      - Add state: `currentTraits: Record<string, number>` and `currentSkills: Record<string, number>` (initialized to `{}`)
      - Add `handleConfirmSuccess` callback: navigates to `/setup/review` with `{ state: { rolledPlayer } }` (deltas are already applied server-side at this point)
      - Replace the entire "Adjust state" JSX section with a 2-column grid layout:
        - Left column (2/3 width): `<QuizPage rolledPlayer={rolledPlayer} playerId={playerId} onConfirmSuccess={handleConfirmSuccess} onStatsChange={(traits, skills) => { setCurrentTraits(traits); setCurrentSkills(skills); }} />`
        - Right column (1/3 width): "Your Bookmarks" heading + `<BookmarkedJobsPanel>` + `<Divider>` + `<BookmarkedProgramsPanel>` (passing `currentTraits` and `currentSkills`)
      - Remove the "Reset to Rolled Values" button and the "Proceed to Review" button from `ProfileSetupPage` (these are now inside `QuizPage` / `ProfileSummary`)
      - Remove the `canProceed` variable
      - Keep the pre-roll state, loading state, error handling, `rollMutation`, and `dispatch(setHasRolledProfile())` logic unchanged
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 5.1, 5.2, 5.3_

  - [x] 3.2 Delete obsolete slider component files
    - Delete `frontend/src/features/profile/TraitSliderRow.tsx`
    - Delete `frontend/src/features/profile/SkillSliderRow.tsx`
    - Delete `frontend/src/features/profile/BudgetMeter.tsx`
    - Verify no remaining imports of these files exist in the codebase before deleting
    - _Requirements: 8.1_

  - [x] 3.3 Checkpoint — Build and smoke-test the quiz flow
    - Run `cd frontend && npm run build` (or `tsc --noEmit`) and confirm zero TypeScript errors
    - Verify the quiz renders at `/setup/profile` after rolling a profile: Skills step shows 8 questions, Traits step shows 13 questions, Summary step shows all stats, "Proceed to Review" navigates to `/setup/review`
    - Verify `BookmarkedJobsPanel` and `BookmarkedProgramsPanel` still render in the right column
    - _Requirements: 8.1, 8.2, 8.3, 8.4_


## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1.1"] },
    { "wave": 2, "tasks": ["1.2"] },
    { "wave": 3, "tasks": ["2.1", "2.2"] },
    { "wave": 4, "tasks": ["2.3", "2.4", "2.5"] },
    { "wave": 5, "tasks": ["2.6"] },
    { "wave": 6, "tasks": ["3.1"] },
    { "wave": 7, "tasks": ["3.2"] },
    { "wave": 8, "tasks": ["3.3"] }
  ]
}
```

## Notes

- Tests (unit and property-based) are deferred for MVP; add them back when ready to harden the implementation
- The `quizUtils.ts` extraction in task 1.2 is critical — it keeps all delta/budget logic in one place and makes it easy to add tests later
- The `getDisabledSkillOptions` / `getDisabledTraitOptions` functions exclude the current question's own answer from `spentOthers` so that changing an existing answer is always evaluated against the budget as if the question were unanswered — this prevents a player from being locked into their current answer
- The quiz budget constants (`QUIZ_SKILLS_BUDGET=34`, `QUIZ_TRAITS_BUDGET=89`) are different from the old slider budgets (10 and 50); both sets of constants coexist in `constants.ts` until the slider components are deleted in task 3.2
- The confirm endpoint (`POST /players/:id/initialize/confirm`) receives `traitAdjustments` and `skillAdjustments` as delta values (not Likert values) — identical to what the slider implementation sent, so no backend changes are needed
- `ProfileSummary` is shown after the confirm endpoint succeeds (step `'summary'`); the "Proceed to Review" button in `ProfileSummary` calls `onConfirmSuccess()` which triggers navigation to `/setup/review`
