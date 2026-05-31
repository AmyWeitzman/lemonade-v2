# Requirements Document

## Introduction

This feature replaces the slider-based manual adjustment step in the profile setup workflow with a two-part personality quiz. Players answer Likert-scale questions about their skills and traits; their answers are mapped to internal deltas that are applied on top of randomly rolled base values to produce the player's starting stats. The quiz is presented in two sequential parts — Skills first, then Traits — each with a live budget indicator. After both parts are complete the player sees a read-only summary of their final profile before proceeding to the game.

## Glossary

- **Quiz**: The two-part personality questionnaire that replaces the slider-based profile adjustment step.
- **Skills_Quiz**: Part 1 of the Quiz; one question per skill using the prompt "I enjoy [skill name]".
- **Traits_Quiz**: Part 2 of the Quiz; one question per trait using the prompt "I am [trait name]".
- **Likert_Scale**: A 5-point response scale presented to the player as 1–5 with labels: 1 = Strongly Disagree, 2 = Disagree, 3 = Neutral, 4 = Agree, 5 = Strongly Agree.
- **Skill_Delta**: The internal numeric adjustment applied to a skill's base value. Mapping: 1 → −2, 2 → −1, 3 → 0, 4 → +1, 5 → +2.
- **Trait_Delta**: The internal numeric adjustment applied to a trait's base value. Mapping: 1 → −10, 2 → −5, 3 → 0, 4 → +5, 5 → +10.
- **Skills_Budget**: The total allowed sum of all Skill_Deltas; fixed at 34 points.
- **Traits_Budget**: The total allowed sum of all Trait_Deltas; fixed at 89 points.
- **Budget_Indicator**: A visible UI element showing the player how many budget points they have spent and how many remain.
- **Base_Values**: The randomly rolled trait and skill values returned by `POST /players/:id/initialize`.
- **Final_Stats**: The player's starting stats after Skill_Deltas and Trait_Deltas are applied to Base_Values, clamped to valid ranges.
- **Profile_Summary**: A read-only display of the player's Final_Stats shown after quiz completion.
- **Quiz_Page**: The React page component that hosts the two-part quiz flow.
- **ProfileSetupPage**: The existing React page that currently hosts the slider-based adjustment UI; this feature replaces its adjustment step.
- **Confirm_Endpoint**: `POST /players/:id/initialize/confirm` — the backend endpoint that accepts `traitAdjustments` and `skillAdjustments`, applies them, and marks the player as initialized.
- **Skill**: One of the eight player skills: math, science, art, music, writing, analysis, homeRepair, technology.
- **Trait**: One of the thirteen player traits: bravery, perseverance, charisma, compassion, creativity, organization, patience, caution, sociability, stressTolerance, goodWithKids, physicalAbility, communication.

---

## Requirements

### Requirement 1: Skills Quiz Presentation

**User Story:** As a player, I want to answer one question per skill about my enjoyment of that activity, so that my starting skill values reflect my personality.

#### Acceptance Criteria

1. THE Quiz_Page SHALL display one question per Skill in the format "I enjoy [skill name]" for each of the eight Skills.
2. THE Quiz_Page SHALL present each question with a Likert_Scale rendered as five selectable options labelled 1 (Strongly Disagree), 2 (Disagree), 3 (Neutral), 4 (Agree), and 5 (Strongly Agree).
3. WHEN the Skills_Quiz is first displayed for a new session, THE Quiz_Page SHALL show no option selected for any skill question.
4. WHERE a player returns to the Skills_Quiz within the same session after partially completing it, THE Quiz_Page SHALL restore the previously selected answers.
5. THE Budget_Indicator for the Skills_Budget SHALL show spent = 0, total = 34, and remaining = 34 when no answers have been selected.
6. WHEN a player selects a Likert_Scale option for a skill question, THE Quiz_Page SHALL update the Budget_Indicator to reflect the new Skills_Budget state within 100ms.
7. WHEN a player re-selects a different Likert_Scale option for a skill question that already has an answer, THE Quiz_Page SHALL update the Budget_Indicator to reflect the replaced delta within 100ms.
8. THE Quiz_Page SHALL map each Likert_Scale selection to its corresponding Skill_Delta without displaying the numeric delta to the player.

---

### Requirement 2: Traits Quiz Presentation

**User Story:** As a player, I want to answer one question per trait about how well it describes me, so that my starting trait values reflect my personality.

#### Acceptance Criteria

1. THE Quiz_Page SHALL display one question per Trait in the format "I am [trait name]" for each of the thirteen Traits.
2. THE Quiz_Page SHALL present each question with a Likert_Scale rendered as five selectable options labelled 1 (Strongly Disagree), 2 (Disagree), 3 (Neutral), 4 (Agree), and 5 (Strongly Agree).
3. WHEN the Traits_Quiz is first displayed for a new session, THE Quiz_Page SHALL show no option selected for any trait question.
4. WHERE a player returns to the Traits_Quiz within the same session after partially completing it, THE Quiz_Page SHALL restore the previously selected answers.
5. THE Budget_Indicator for the Traits_Budget SHALL show spent = sum of all selected Trait_Deltas, total = 89, and remaining = 89 minus that sum; WHEN no answers have been selected, remaining SHALL be 89.
6. WHEN a player selects a Likert_Scale option for a trait question, THE Quiz_Page SHALL update the Budget_Indicator to reflect the new Traits_Budget state within one rendering cycle.
7. WHEN the running total of selected Trait_Deltas exceeds 89, THE Budget_Indicator SHALL display the remaining value as a negative number and enter a visual warning state.

---

### Requirement 3: Quiz Navigation and Sequencing

**User Story:** As a player, I want to move through the quiz in a clear sequence — Skills first, then Traits — so that I always know where I am in the process.

#### Acceptance Criteria

1. THE Quiz_Page SHALL present the Skills_Quiz before the Traits_Quiz.
2. WHEN a player has answered all eight skill questions, THE Quiz_Page SHALL enable a "Next" control to advance to the Traits_Quiz; THE Quiz_Page SHALL determine completeness by verifying that all eight skill questions have an actual answer selected.
3. IF a player attempts to advance from the Skills_Quiz before all eight skill questions have an actual answer selected, THEN THE Quiz_Page SHALL prevent navigation and visually mark each unanswered skill question.
4. WHEN a player has answered all thirteen trait questions, THE Quiz_Page SHALL enable a "Submit" control to complete the quiz; THE Quiz_Page SHALL determine completeness by verifying that all thirteen trait questions have an actual answer selected.
5. IF a player attempts to submit the Traits_Quiz before all thirteen trait questions have an actual answer selected, THEN THE Quiz_Page SHALL prevent submission and visually mark each unanswered trait question.
6. THE Quiz_Page SHALL allow a player to navigate back from the Traits_Quiz to the Skills_Quiz; WHEN a player navigates back, THE Quiz_Page SHALL preserve all previously selected skill and trait answers.

---

### Requirement 4: Budget Enforcement

**User Story:** As a player, I want to freely select any quiz answers but be clearly told when I've gone over budget, so that I can adjust my answers before submitting.

#### Acceptance Criteria

1. THE Quiz_Page SHALL allow a player to select any Likert_Scale option for any question regardless of whether doing so causes the Skills_Budget or Traits_Budget to be exceeded.
2. WHEN the sum of all selected Skill_Deltas exceeds the Skills_Budget of 34, THE Budget_Indicator SHALL enter a visible over-budget error state that clearly distinguishes it from the normal state (e.g. red color, error icon, or "Over budget" label).
3. WHEN the sum of all selected Trait_Deltas exceeds the Traits_Budget of 89, THE Budget_Indicator SHALL enter a visible over-budget error state that clearly distinguishes it from the normal state.
4. WHEN the sum of selected Skill_Deltas is reduced back to 34 or below, THE Budget_Indicator SHALL exit the over-budget error state and return to its normal state.
5. WHEN the sum of selected Trait_Deltas is reduced back to 89 or below, THE Budget_Indicator SHALL exit the over-budget error state and return to its normal state.
6. IF the Skills_Budget is exceeded, THEN THE Quiz_Page SHALL disable the "Next" control and SHALL NOT allow the player to advance to the Traits_Quiz.
7. IF the Traits_Budget is exceeded, THEN THE Quiz_Page SHALL disable the "Submit" control and SHALL NOT allow the player to submit the quiz.
8. THE Budget_Indicator SHALL display the remaining budget as a negative number WHEN the total exceeds the budget, so the player can see exactly how much they need to reduce.

---

### Requirement 5: Base Value Generation

**User Story:** As a player, I want my base stats to be randomly generated before my quiz answers are applied, so that every playthrough starts with a unique foundation.

#### Acceptance Criteria

1. WHEN a player reaches the Quiz_Page, THE Quiz_Page SHALL call `POST /players/:id/initialize` to obtain Base_Values.
2. WHEN `POST /players/:id/initialize` succeeds, THE Quiz_Page SHALL store the returned Base_Values as the foundation for Final_Stats calculation.
3. IF `POST /players/:id/initialize` indicates the player has already been initialized, THEN THE Quiz_Page SHALL use the existing Base_Values without re-rolling.
4. IF `POST /players/:id/initialize` returns an error and no Base_Values have been previously stored, THEN THE Quiz_Page SHALL display an error message and provide a retry control that re-calls `POST /players/:id/initialize`.

---

### Requirement 6: Final Stats Calculation and Submission

**User Story:** As a player, I want my quiz answers to be applied to my base stats and saved, so that my final profile reflects both luck and personality.

#### Acceptance Criteria

1. WHEN a player submits the completed quiz, THE Quiz_Page SHALL compute Final_Stats by adding each Skill_Delta to the corresponding Base_Value skill and each Trait_Delta to the corresponding Base_Value trait.
2. THE Quiz_Page SHALL clamp each Final_Stats trait value to the range [0, 100].
3. THE Quiz_Page SHALL clamp each Final_Stats skill value to the range [0, 10].
4. WHEN a player submits the completed quiz, THE Quiz_Page SHALL call the Confirm_Endpoint with `traitAdjustments` equal to the Trait_Deltas and `skillAdjustments` equal to the Skill_Deltas.
5. IF the Confirm_Endpoint returns an error, THEN THE Quiz_Page SHALL display an error message and retain the player's Trait_Deltas and Skill_Deltas in the form so the player can retry submission without re-entering answers.
6. WHEN the Confirm_Endpoint succeeds, THE Quiz_Page SHALL transition the player to the Profile_Summary view.

---

### Requirement 7: Profile Summary Display

**User Story:** As a player, I want to see my final stats after the quiz, so that I know what I'm starting with before the game begins.

#### Acceptance Criteria

1. THE Profile_Summary SHALL display all thirteen Trait Final_Stats values for the player, each alongside its trait name.
2. THE Profile_Summary SHALL display all eight Skill Final_Stats values for the player, each alongside its skill name.
3. THE Profile_Summary SHALL be read-only; THE Profile_Summary SHALL NOT render any input, slider, or control that allows the player to modify a stat value.
4. WHEN the Profile_Summary is displayed, THE Quiz_Page SHALL provide a "Proceed to Review" control that navigates to the existing review/game-start step.

---

### Requirement 8: Replacement of Slider-Based Adjustment

**User Story:** As a developer, I want the quiz to fully replace the slider-based adjustment UI, so that the codebase does not maintain two parallel adjustment flows.

#### Acceptance Criteria

1. THE ProfileSetupPage SHALL no longer render the `TraitSliderRow`, `SkillSliderRow`, or `BudgetMeter` components.
2. THE ProfileSetupPage SHALL render the Quiz_Page flow in place of the slider-based adjustment step.
3. THE Quiz_Page and the slider-based adjustment UI SHALL NOT both be rendered in the DOM at the same time.
4. THE Quiz_Page SHALL call `POST /players/:id/initialize` and the Confirm_Endpoint with the same request and response shapes as the existing implementation, without modifying those endpoints' observable behavior.
5. THE Quiz_Page SHALL present questions for the eight Skills (math, science, art, music, writing, analysis, homeRepair, technology).
6. THE Quiz_Page SHALL NOT present a question for `health`; health SHALL NOT appear in the Skills_Quiz.

---

### Requirement 9: Persistence and Idempotency

**User Story:** As a player, I want my progress to be safe if I accidentally refresh the page mid-quiz, so that I don't lose my rolled base values.

#### Acceptance Criteria

1. WHILE Base_Values have been rolled and the quiz has not yet been submitted, WHEN a player reloads the Quiz_Page, THE Quiz_Page SHALL retrieve the existing Base_Values via `POST /players/:id/initialize` rather than generating new ones.
2. THE Quiz_Page SHALL store in-progress quiz answers in component state only and SHALL NOT persist partial quiz answers to the backend.
3. IF a player reloads the Quiz_Page before submitting, THEN THE Quiz_Page SHALL restart the quiz from the first quiz part with no answers pre-selected, using the previously retrieved Base_Values.
4. IF Base_Values retrieval fails on reload, THEN THE Quiz_Page SHALL display an error message and provide a retry control.
