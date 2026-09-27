# Requirements Document

## Introduction

The Profile Setup Workflow Redesign replaces the existing single-page `PlayerInitPage` with a guided, multi-step workflow that reuses the game's existing Jobs ("Seeds to Trees") and Education ("Zest for Learning") pages. Instead of presenting job and education information as a static reference panel inside the init page, players are guided to navigate those pages themselves — bookmarking jobs and education programs they are interested in — before arriving at a redesigned profile setup page to generate and fine-tune their starting traits and skills. The workflow is triggered automatically when a player clicks into a game session whose profile has not yet been initialized, and concludes when the player submits their finalized profile on a review page.

## Glossary

- **Player**: A human user participating in a game session
- **Game_System**: The core game engine managing state, rules, and progression
- **Profile_Setup_Workflow**: The multi-step guided flow a player completes before gameplay begins, replacing the old `PlayerInitPage`
- **Setup_Shell**: The restricted application shell rendered during the Profile_Setup_Workflow, showing only the three setup nav items and hiding all normal gameplay navigation
- **Setup_Jobs_Page**: The Jobs ("Seeds to Trees") page as rendered during the Profile_Setup_Workflow, with the eligible-only filter off by default and apply buttons hidden
- **Setup_Education_Page**: The Education ("Zest for Learning") page as rendered during the Profile_Setup_Workflow, with enroll/drop/change-major actions hidden
- **Profile_Setup_Page**: The third step of the Profile_Setup_Workflow where the player generates their initial traits and skills, views bookmarks, and makes adjustments
- **Review_Page**: The final step of the Profile_Setup_Workflow where the player reviews their finalized profile and submits it to begin gameplay
- **Bookmark**: A player's saved interest in a specific job or education program during the Profile_Setup_Workflow; stored per-player and per-session, not a real application or enrollment
- **Trait**: A character attribute on a 0–100 scale (e.g., Bravery, Charisma) that affects job eligibility and gameplay outcomes
- **Skill**: A character attribute on a 0–10 scale (e.g., Math, Art) that affects education eligibility and gameplay outcomes
- **Trait_Budget**: The pool of percentage points available to redistribute across traits during adjustment (base 50%, expandable by lowering traits)
- **Skill_Budget**: The pool of percentage points available to redistribute across skills during adjustment (base 10%, expandable by lowering skills)

## Requirements

### Requirement 1: Workflow Entry Point

**User Story:** As a player, I want to be automatically guided into the profile setup workflow when I join a game that I haven't initialized yet, so that I know exactly what to do before gameplay begins.

#### Acceptance Criteria

1. WHEN a player who has `isInitialized = false` navigates to any route within a game session, THE Game_System SHALL redirect the player to the Setup_Shell at the Jobs step.
2. WHEN a player who has `isInitialized = true` attempts to access any Profile_Setup_Workflow route, THE Game_System SHALL redirect the player to the normal game home page.
3. THE Setup_Shell SHALL display a persistent progress indicator showing the three workflow steps: Jobs, Education, and Profile Setup.
4. THE Setup_Shell SHALL indicate which step the player is currently on within the progress indicator.
5. WHEN a player is in the Profile_Setup_Workflow, THE Setup_Shell SHALL hide all primary navigation items except Seeds to Trees (Jobs), Zest for Learning (Education), and Profile Setup.
6. WHEN a player is in the Profile_Setup_Workflow, THE Setup_Shell SHALL hide all secondary navigation items (profile drawer, chat, notifications, settings).


### Requirement 2: Setup Jobs Page

**User Story:** As a player setting up my profile, I want to browse all jobs without being filtered to only eligible ones, so that I can explore the full job catalog and bookmark roles I aspire to.

#### Acceptance Criteria

1. WHEN the Setup_Jobs_Page is rendered during the Profile_Setup_Workflow, THE Setup_Jobs_Page SHALL default the eligible-only filter to off.
2. WHEN the Setup_Jobs_Page is rendered during the Profile_Setup_Workflow, THE Setup_Jobs_Page SHALL hide all Apply and Quit action buttons on job cards.
3. THE Setup_Jobs_Page SHALL display a bookmark toggle on each job card so the player can mark jobs they are interested in.
4. WHEN a player activates a bookmark toggle on a job card, THE Game_System SHALL persist the bookmark associated with that player and game session.
5. WHEN a player deactivates a bookmark toggle on a job card, THE Game_System SHALL remove the bookmark for that job associated with that player and game session.
6. THE Setup_Jobs_Page SHALL visually distinguish bookmarked job cards from non-bookmarked job cards.
7. THE Setup_Jobs_Page SHALL display a count of currently bookmarked jobs so the player can track their selections.
8. WHEN the player navigates away from the Setup_Jobs_Page and returns during the same workflow session, THE Setup_Jobs_Page SHALL restore the previously saved bookmark state.
9. THE Setup_Jobs_Page SHALL display an informational banner explaining that bookmarks are for planning purposes and do not constitute a job application.


### Requirement 3: Setup Education Page

**User Story:** As a player setting up my profile, I want to browse education programs and bookmark ones I'm interested in, so that I can plan my education path before the game starts.

#### Acceptance Criteria

1. WHEN the Setup_Education_Page is rendered during the Profile_Setup_Workflow, THE Setup_Education_Page SHALL hide all Enroll, Drop Out, and Change Major action buttons on program cards.
2. THE Setup_Education_Page SHALL display a bookmark toggle on each education program card so the player can mark programs they are interested in.
3. WHEN a player activates a bookmark toggle on an education program card, THE Game_System SHALL persist the bookmark associated with that player and game session.
4. WHEN a player deactivates a bookmark toggle on an education program card, THE Game_System SHALL remove the bookmark for that program associated with that player and game session.
5. THE Setup_Education_Page SHALL visually distinguish bookmarked program cards from non-bookmarked program cards.
6. THE Setup_Education_Page SHALL display a count of currently bookmarked programs so the player can track their selections.
7. WHEN the player navigates away from the Setup_Education_Page and returns during the same workflow session, THE Setup_Education_Page SHALL restore the previously saved bookmark state.
8. THE Setup_Education_Page SHALL display an informational banner explaining that bookmarks are for planning purposes and do not constitute enrollment.


### Requirement 4: Bookmark Persistence

**User Story:** As a player, I want my bookmarks to be saved server-side so that they survive page refreshes, are available on the Profile Setup page, and remain useful during normal gameplay.

#### Acceptance Criteria

1. THE Game_System SHALL store job bookmarks as a collection of job IDs associated with a player and game session.
2. THE Game_System SHALL store education program bookmarks as a collection of program IDs associated with a player and game session.
3. WHEN a player refreshes the browser during the Profile_Setup_Workflow, THE Game_System SHALL restore all previously saved bookmarks on the relevant setup pages.
4. THE Game_System SHALL expose an API endpoint to retrieve all bookmarks (job and education) for a given player and game session.
5. THE Game_System SHALL expose an API endpoint to add or remove a single job bookmark for a given player and game session.
6. THE Game_System SHALL expose an API endpoint to add or remove a single education program bookmark for a given player and game session.
7. WHEN a player completes the Profile_Setup_Workflow and their profile is confirmed, THE Game_System SHALL retain the bookmarks so they remain accessible and manageable during normal gameplay.
8. WHILE a player is in normal gameplay, THE Game_System SHALL allow the player to add or remove job bookmarks from the Jobs page.
9. WHILE a player is in normal gameplay, THE Game_System SHALL allow the player to add or remove education program bookmarks from the Education page.


### Requirement 5: Profile Setup Page — Trait and Skill Generation

**User Story:** As a player, I want to randomly generate my starting traits and skills on the Profile Setup page and then fine-tune them, so that I have a unique character that I've had a hand in shaping.

#### Acceptance Criteria

1. THE Profile_Setup_Page SHALL display a "Generate My Profile" button that triggers the random trait and skill roll when clicked.
2. WHEN the player clicks "Generate My Profile", THE Game_System SHALL randomly assign trait values using bell curve distribution within the defined trait ranges.
3. WHEN the player clicks "Generate My Profile", THE Game_System SHALL randomly assign skill values using the defined per-skill distributions (bell curve or right-skewed) within the defined skill ranges.
4. WHEN the player clicks "Generate My Profile", THE Game_System SHALL roll a 10-sided die to determine parent contributions (vehicle, college fund, housing age limit, wedding contribution).
5. WHEN the player clicks "Generate My Profile", THE Game_System SHALL calculate starting money from personal savings, parent wealth, and organization skill modifier.
6. WHEN the player clicks "Generate My Profile", THE Game_System SHALL assign chronic health conditions with 20% probability.
7. WHEN the player has already generated a profile and refreshes the browser, THE Profile_Setup_Page SHALL restore the previously rolled values without re-rolling.
8. WHEN the player has already generated a profile, THE Profile_Setup_Page SHALL disable or hide the "Generate My Profile" button so that rolled values cannot be replaced.
9. THE Profile_Setup_Page SHALL display a "Reset to Rolled Values" button that resets all trait and skill adjustments back to the original rolled values without generating new rolled values.
10. WHEN the player clicks "Reset to Rolled Values", THE Profile_Setup_Page SHALL restore all trait and skill values to their original rolled values and reset the Trait_Budget and Skill_Budget to their starting amounts.
11. WHEN rolled values are displayed, THE Profile_Setup_Page SHALL show trait values as percentages and skill values on their 0–10 scale.


### Requirement 6: Profile Setup Page — Trait and Skill Adjustment

**User Story:** As a player, I want to adjust my rolled traits and skills within defined limits, so that I can tailor my character to the jobs and education programs I bookmarked.

#### Acceptance Criteria

1. THE Profile_Setup_Page SHALL allow the player to adjust each trait by a maximum of ±10 percentage points from its rolled value.
2. THE Profile_Setup_Page SHALL enforce a Trait_Budget of 50 percentage points for total increases across all traits.
3. WHEN a player decreases a trait below its rolled value, THE Profile_Setup_Page SHALL add the decreased amount to the available Trait_Budget.
4. THE Profile_Setup_Page SHALL allow the player to adjust each skill by a maximum of ±2 points from its rolled value.
5. THE Profile_Setup_Page SHALL enforce a Skill_Budget of 10 points for total increases across all skills.
6. WHEN a player decreases a skill below its rolled value, THE Profile_Setup_Page SHALL add the decreased amount to the available Skill_Budget.
7. THE Profile_Setup_Page SHALL display a live budget meter for both traits and skills showing total budget, amount used, and amount remaining.
8. WHEN the Trait_Budget or Skill_Budget remaining is negative, THE Profile_Setup_Page SHALL disable the "Proceed to Review" button.
9. THE Profile_Setup_Page SHALL display the rolled base value and the current adjusted value for each trait and skill simultaneously so the player can see the delta.


### Requirement 7: Profile Setup Page — Bookmarked Jobs and Education Display

**User Story:** As a player on the Profile Setup page, I want to see the jobs and education programs I bookmarked, so that I can make informed trait and skill adjustments.

#### Acceptance Criteria

1. THE Profile_Setup_Page SHALL display a panel listing all jobs the player has bookmarked, showing each job's title, base salary, and skill/trait requirements.
2. THE Profile_Setup_Page SHALL display a panel listing all education programs the player has bookmarked, showing each program's name, type, and skill/trait requirements.
3. WHEN the player has no bookmarked jobs, THE Profile_Setup_Page SHALL display a message indicating no jobs have been bookmarked and provide an optional link to the Setup_Jobs_Page to add bookmarks.
4. WHEN the player has no bookmarked education programs, THE Profile_Setup_Page SHALL display a message indicating no programs have been bookmarked and provide an optional link to the Setup_Education_Page to add bookmarks.
5. THE Profile_Setup_Page SHALL indicate for each bookmarked job whether the player currently qualifies based on their adjusted traits and skills, updating live as adjustments are made.
6. THE Profile_Setup_Page SHALL indicate for each bookmarked education program whether the player currently qualifies based on their adjusted traits and skills, updating live as adjustments are made.


### Requirement 8: Review Page

**User Story:** As a player, I want to review my finalized profile before submitting it, so that I can confirm my choices before the game locks them in.

#### Acceptance Criteria

1. THE Review_Page SHALL display the player's finalized trait values (rolled base plus applied adjustments) for all traits.
2. THE Review_Page SHALL display the player's finalized skill values (rolled base plus applied adjustments) for all skills.
3. THE Review_Page SHALL display the player's starting money, college fund, and parent contributions (vehicle, housing age limit, wedding contribution).
4. THE Review_Page SHALL display the player's chronic conditions if any were assigned.
5. THE Review_Page SHALL display the list of bookmarked jobs and education programs as a summary reference.
6. THE Review_Page SHALL display a "Confirm Profile" button that submits the finalized trait and skill adjustments to the server.
7. WHEN the player clicks "Confirm Profile", THE Game_System SHALL apply the trait and skill adjustments to the player record and mark the player as initialized (`isInitialized = true`).
8. WHEN the player's profile is confirmed, THE Game_System SHALL transition the player out of the Setup_Shell and into the normal game AppShell, redirecting to the home page.
9. THE Review_Page SHALL display a "Back" button that returns the player to the Profile_Setup_Page without losing their adjustment values.
10. IF the player attempts to access the Review_Page without having generated a profile, THEN THE Game_System SHALL redirect the player to the Profile_Setup_Page.


### Requirement 9: Bookmark Filtering During Normal Gameplay

**User Story:** As a player in normal gameplay, I want to filter jobs and education programs to only show my bookmarked items, so that I can quickly find the opportunities I planned for during profile setup.

#### Acceptance Criteria

1. WHILE a player is in normal gameplay, THE Jobs_Page SHALL display a "Bookmarked Only" filter toggle that, when active, shows only jobs the player has bookmarked.
2. WHILE a player is in normal gameplay, THE Education_Page SHALL display a "Bookmarked Only" filter toggle that, when active, shows only education programs the player has bookmarked.
3. WHEN the "Bookmarked Only" filter is active and the player has no bookmarked jobs, THE Jobs_Page SHALL display a message indicating no jobs have been bookmarked.
4. WHEN the "Bookmarked Only" filter is active and the player has no bookmarked education programs, THE Education_Page SHALL display a message indicating no programs have been bookmarked.
5. WHILE a player is in normal gameplay, THE Jobs_Page SHALL display a bookmark toggle on each job card so the player can add or remove bookmarks.
6. WHILE a player is in normal gameplay, THE Education_Page SHALL display a bookmark toggle on each education program card so the player can add or remove bookmarks.


### Requirement 10: Workflow State Persistence and Resumption

**User Story:** As a player, I want to be able to leave and return to the profile setup workflow without losing my progress, so that I don't have to start over if I close the browser.

#### Acceptance Criteria

1. WHEN a player who has started but not completed the Profile_Setup_Workflow re-enters the game session, THE Game_System SHALL return the player to the Setup_Shell.
2. WHEN a player returns to the Setup_Shell after a browser refresh, THE Game_System SHALL restore their bookmarks on the Setup_Jobs_Page and Setup_Education_Page.
3. WHEN a player returns to the Setup_Shell after a browser refresh and has already rolled their profile, THE Game_System SHALL restore the rolled trait and skill values on the Profile_Setup_Page without re-rolling.
4. WHEN a player returns to the Setup_Shell after a browser refresh and has already applied adjustments, THE Game_System SHALL restore those adjustment deltas on the Profile_Setup_Page.
5. THE Game_System SHALL not reset a player's rolled profile values when the player navigates between steps of the Profile_Setup_Workflow.
