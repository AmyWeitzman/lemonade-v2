# Implementation Plan: Profile Setup Workflow Redesign

## Overview

Replace the single-page `PlayerInitPage` with a guided multi-step setup flow. The implementation proceeds in seven phases: backend data layer, frontend state management, shell and routing, bookmark UI components, setup-mode modifications to existing pages, the new profile setup and review pages, and finally property-based tests for the correctness properties defined in the design.

All code is TypeScript. Use `fast-check` for property-based tests (add as a dev dependency if not already present).

## Tasks

- [x] 1. Backend Foundation — Database migration and bookmark API
  - [x] 1.1 Add bookmark fields to the Player schema and generate a migration
    - In `backend/prisma/schema.prisma`, add `jobBookmarks String[] @default([])` and `educationBookmarks String[] @default([])` to the `Player` model
    - Run `docker compose exec backend npm run prisma:migrate` (or create the migration SQL manually under `backend/prisma/migrations/`) to apply the change
    - Verify the migration file is created and the schema compiles without errors
    - _Requirements: 4.1, 4.2_

  - [x] 1.2 Implement `GET /api/players/:id/bookmarks` endpoint
    - Add the route to `backend/src/routes/players.ts` (or a new `backend/src/routes/bookmarks.ts` registered in `backend/src/index.ts`)
    - Use the existing `authorize` middleware to guard the route
    - Query `prisma.player.findUnique` selecting only `jobBookmarks` and `educationBookmarks`
    - Return `{ jobIds: string[], programIds: string[] }`
    - _Requirements: 4.4_

  - [x] 1.3 Implement `POST /api/players/:id/bookmarks/jobs/:jobId` toggle endpoint
    - Add the route with `authorize` middleware
    - Read current `jobBookmarks`, toggle the given `jobId` (add if absent, remove if present)
    - Persist via `prisma.player.update`
    - Return `{ bookmarked: boolean, jobIds: string[] }`
    - Return `404` if the job ID does not exist in the jobs table; `403` if the player does not own the record
    - _Requirements: 4.5_

  - [x] 1.4 Implement `POST /api/players/:id/bookmarks/education/:programId` toggle endpoint
    - Mirror of task 1.3 for education program bookmarks
    - Return `{ bookmarked: boolean, programIds: string[] }`
    - _Requirements: 4.6_

  - [x] 1.5 Checkpoint — Ensure all backend tests pass
    - Ensure all tests pass, ask the user if questions arise.

- [x] 2. Frontend State — Redux slices and context
  - [x] 2.1 Add `hasRolledProfile` field to `authSlice`
    - In `frontend/src/features/auth/authSlice.ts`, add `hasRolledProfile: boolean` (default `false`) to `AuthState` and `initialState`
    - Add a `setHasRolledProfile` reducer action that sets the field to `true`
    - Update the `setAuth` action to accept and set an optional `hasRolledProfile` field from the session join response
    - Export `setHasRolledProfile` from the slice
    - _Requirements: 5.7, 5.8_

  - [x] 2.2 Create `bookmarksSlice`
    - Create `frontend/src/features/bookmarks/bookmarksSlice.ts`
    - Define `BookmarksState` with `jobIds: string[]`, `programIds: string[]`, `loading: boolean`, `error: string | null`
    - Implement reducers: `setBookmarks`, `addJobBookmark`, `removeJobBookmark`, `addProgramBookmark`, `removeProgramBookmark`
    - Export selector helpers `selectIsJobBookmarked(jobId)` and `selectIsProgramBookmarked(programId)`
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 2.3 Register `bookmarksReducer` in the Redux store
    - In `frontend/src/store.ts`, import `bookmarksReducer` from the new slice and add it under the key `bookmarks`
    - Update the `RootState` type accordingly (automatic via `ReturnType<typeof store.getState>`)
    - _Requirements: 4.1, 4.2_

  - [x] 2.4 Create `SetupModeContext`
    - Create `frontend/src/contexts/SetupModeContext.tsx`
    - Define `SetupModeContextValue { isSetupMode: boolean }` and export `SetupModeContext` with default `{ isSetupMode: false }`
    - Export a `useSetupMode()` convenience hook
    - _Requirements: 1.5, 2.2, 3.1_

- [x] 3. Setup Shell and Navigation
  - [x] 3.1 Export `SETUP_NAV_ITEMS` from `NavItems.tsx`
    - In `frontend/src/components/layout/NavItems.tsx`, add and export a `SETUP_NAV_ITEMS: NavItem[]` array with three entries: Seeds to Trees (`/setup/jobs`), Zest for Learning (`/setup/education`), Profile Setup (`/setup/profile`)
    - _Requirements: 1.5_

  - [x] 3.2 Create `SetupProgressStepper` component
    - Create `frontend/src/components/layout/SetupProgressStepper.tsx`
    - Render a horizontal MUI `Stepper` with steps: "Browse Jobs", "Browse Education", "Profile Setup"
    - Accept props `activeStep: number`, `visitedSteps: Set<number>`, `onStepClick: (step: number) => void`
    - Show a checkmark icon on visited steps; make each step clickable
    - _Requirements: 1.3, 1.4_

  - [x] 3.3 Create `SetupShell` component
    - Create `frontend/src/components/layout/SetupShell.tsx`
    - Render a simplified top bar showing only `SETUP_NAV_ITEMS` (no profile drawer, chat, notifications, settings)
    - Render `SetupProgressStepper` below the top bar, deriving `activeStep` from the current route path
    - Track `visitedSteps` in local state; update on route change
    - Wrap children with `<SetupModeContext.Provider value={{ isSetupMode: true }}>` and `<BookmarksContext.Provider>` (or dispatch bookmark fetch on mount)
    - On mount, dispatch `GET /api/players/:id/bookmarks` and call `dispatch(setBookmarks(...))` to hydrate the Redux slice
    - On mobile, render a bottom nav with the 3 setup items only
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 4.3, 10.2_

  - [x] 3.4 Update `App.tsx` routing
    - Replace the `!isInitialized` branch (which rendered `<PlayerInitPage />`) with `<SetupShell>` wrapping four sub-routes: `/setup/jobs`, `/setup/education`, `/setup/profile`, `/setup/review`, and a catch-all redirect to `/setup/jobs`
    - In the `isInitialized=true` branch, add `<Route path="/setup/*" element={<Navigate to="/" replace />} />`
    - Remove the `PlayerInitPage` import
    - _Requirements: 1.1, 1.2_

- [x] 4. Bookmark Components
  - [x] 4.1 Create `BookmarkToggle` component
    - Create `frontend/src/features/bookmarks/BookmarkToggle.tsx`
    - Render an MUI `IconButton` with `BookmarkBorderIcon` (not bookmarked) or `BookmarkIcon` (bookmarked)
    - Accept props: `itemId`, `itemName`, `type: 'job' | 'education'`, `isBookmarked`, `onToggle`, `loading?`
    - Show a `CircularProgress` overlay when `loading` is true
    - Set `aria-label="Bookmark [itemName]"` or `aria-label="Remove bookmark for [itemName]"` based on state
    - _Requirements: 2.3, 2.6, 3.2, 3.5_

  - [x] 4.2 Create `BookmarkedJobsPanel` component
    - Create `frontend/src/features/bookmarks/BookmarkedJobsPanel.tsx`
    - Read bookmarked job IDs from `bookmarksSlice`; fetch job details from the jobs catalog
    - For each bookmarked job, show title, base salary, requirements, and a live eligibility indicator computed from `currentTraits` and `currentSkills` props
    - Show an empty state with a link to `/setup/jobs` when no bookmarks exist
    - Accept props `currentTraits: Record<string, number>` and `currentSkills: Record<string, number>`
    - _Requirements: 7.1, 7.3, 7.5_

  - [x] 4.3 Create `BookmarkedProgramsPanel` component
    - Create `frontend/src/features/bookmarks/BookmarkedProgramsPanel.tsx`
    - Mirror of `BookmarkedJobsPanel` for education programs
    - Show program name, type, tuition, requirements, and live eligibility
    - Show an empty state with a link to `/setup/education` when no bookmarks exist
    - Accept props `currentTraits: Record<string, number>` and `currentSkills: Record<string, number>`
    - _Requirements: 7.2, 7.4, 7.6_

- [x] 5. Setup-Mode Modifications to Existing Pages
  - [x] 5.1 Modify `JobCard` to support setup mode and bookmarks

    - In `frontend/src/features/jobs/JobCard.tsx`, call `useSetupMode()` inside the component
    - When `isSetupMode` is true, do not render the `<CardActions>` section (Apply/Quit buttons)
    - Accept new optional props: `isBookmarked?: boolean`, `onBookmarkToggle?: (jobId: string) => void`, `bookmarkLoading?: boolean`
    - When `onBookmarkToggle` is provided, render `<BookmarkToggle>` in the badge area (top-right, alongside existing chips)
    - _Requirements: 2.2, 2.3, 2.6, 9.5_

  - [x] 5.2 Modify `JobFilters` to support bookmarked-only toggle and setup mode
    - In `frontend/src/features/jobs/JobFilters.tsx`, call `useSetupMode()` inside the component
    - Accept new optional props: `showBookmarkedOnly?: boolean`, `onBookmarkedOnlyChange?: (value: boolean) => void`
    - When these props are provided, render a "Bookmarked Only" `Switch` toggle in the filter panel
    - When `isSetupMode` is true, hide the `eligibleOnly` switch and treat its value as `false`
    - _Requirements: 2.1, 9.1_

  - [x] 5.3 Modify `ProgramCard` to support setup mode and bookmarks
    - In `frontend/src/features/education/ProgramCard.tsx`, call `useSetupMode()` inside the component
    - When `isSetupMode` is true, do not render the `<CardActions>` section (Enroll/Drop Out/Change Major buttons)
    - Accept new optional props: `isBookmarked?: boolean`, `onBookmarkToggle?: (programId: string) => void`, `bookmarkLoading?: boolean`
    - When `onBookmarkToggle` is provided, render `<BookmarkToggle>` in the badge area
    - _Requirements: 3.1, 3.2, 3.5, 9.6_

  - [x] 5.4 Modify `ProgramFilters` to support bookmarked-only toggle and setup mode
    - In `frontend/src/features/education/ProgramFilters.tsx`, call `useSetupMode()` inside the component
    - Accept new optional props: `showBookmarkedOnly?: boolean`, `onBookmarkedOnlyChange?: (value: boolean) => void`
    - When these props are provided, render a "Bookmarked Only" `Switch` toggle
    - When `isSetupMode` is true, hide the `eligibleOnly` switch and treat its value as `false`
    - _Requirements: 3.1, 9.2_

  - [x] 5.5 Modify `JobsPage` to support setup mode and bookmarks
    - In `frontend/src/pages/JobsPage.tsx`, call `useSetupMode()` and read `bookmarksSlice` state from Redux
    - In setup mode: override `eligibleOnly` to `false` on mount (do not persist to localStorage); hide `CurrentEmploymentPanel`; show an informational `Alert` banner ("Bookmarks are for planning only — they don't apply for jobs"); show a bookmark count chip in the header
    - In both modes: pass `isBookmarked`, `onBookmarkToggle`, and `bookmarkLoading` to each `JobCard`; pass `showBookmarkedOnly` and `onBookmarkedOnlyChange` to `JobFilters`
    - Implement the bookmark toggle handler: dispatch optimistic `addJobBookmark`/`removeJobBookmark`, call `POST /api/players/:id/bookmarks/jobs/:jobId`, reconcile with `setBookmarks` on success or roll back on error
    - Apply client-side `showBookmarkedOnly` filter: when active, only show jobs whose IDs are in the bookmark set
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7, 2.8, 2.9, 4.8, 9.1, 9.3, 9.5_

  - [x] 5.6 Modify `EducationPage` to support setup mode and bookmarks
    - Mirror of task 5.5 for education programs
    - In setup mode: hide `AcademicProgressPanel`; show informational banner ("Bookmarks are for planning only — they don't constitute enrollment"); show bookmark count chip
    - Pass bookmark props to each `ProgramCard` and to `ProgramFilters`
    - Implement the bookmark toggle handler with optimistic updates and rollback
    - Apply client-side `showBookmarkedOnly` filter
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 4.9, 9.2, 9.4, 9.6_

  - [x] 5.7 Checkpoint — Ensure all tests pass
    - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Profile Setup and Review Pages
  - [x] 6.1 Extract shared sub-components from `PlayerInitPage` into standalone files
    - Create `frontend/src/features/profile/TraitSliderRow.tsx` — extract the `TraitSliderRow` memo component from `PlayerInitPage.tsx`
    - Create `frontend/src/features/profile/SkillSliderRow.tsx` — extract the `SkillSliderRow` memo component
    - Create `frontend/src/features/profile/BudgetMeter.tsx` — extract the `BudgetMeter` component
    - Create `frontend/src/features/profile/budgetUtils.ts` — extract the pure budget calculation functions (`computeTraitBudget`, `computeSkillBudget`, `clampTraitDelta`, `clampSkillDelta`) so they can be imported by both `ProfileSetupPage` and the property tests
    - Export `TRAIT_LABELS`, `SKILL_LABELS`, and `CAR_LABELS` constants from a shared `frontend/src/features/profile/constants.ts`
    - _Requirements: 5.1, 5.9, 6.1, 6.2, 6.4, 6.5, 6.7_

  - [x] 6.2 Create `ProfileSetupPage`
    - Create `frontend/src/pages/ProfileSetupPage.tsx`
    - On mount, call `POST /players/:id/initialize` (idempotent); populate `rolledPlayer` state and dispatch `setHasRolledProfile()`
    - Render "Generate My Profile" button — disabled when `hasRolledProfile` is true in Redux
    - Render "Reset to Rolled Values" button — resets `traitDeltas` and `skillDeltas` to `{}`
    - Render `TraitSliderRow` and `SkillSliderRow` for each trait/skill using extracted components
    - Render `BudgetMeter` for traits and skills
    - Render `BookmarkedJobsPanel` and `BookmarkedProgramsPanel` passing current adjusted values
    - "Proceed to Review" button: disabled when `traitRemaining < 0 || skillRemaining < 0`; navigates to `/setup/review` with `{ state: { traitDeltas, skillDeltas, rolledPlayer } }`
    - Show error `Alert` if the initialize call fails; re-enable the button on failure
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 10.3, 10.4, 10.5_

  - [x] 6.3 Create `ProfileReviewPage`
    - Create `frontend/src/pages/ProfileReviewPage.tsx`
    - Read `traitDeltas`, `skillDeltas`, and `rolledPlayer` from React Router `location.state`
    - If location state is missing (direct navigation), redirect to `/setup/profile`
    - Display finalized trait values (base + delta) and skill values for all traits/skills
    - Display starting money, college fund, parent contributions (vehicle, housing age limit, wedding contribution), and chronic conditions
    - Display bookmarked jobs and education programs as a summary list (read from `bookmarksSlice`)
    - "Confirm Profile" button: calls `POST /players/:id/initialize/confirm` with `{ traitAdjustments: traitDeltas, skillAdjustments: skillDeltas }`; on success dispatches `setPlayerStats({ money })` and `setPlayerInitialized()`
    - "Back" button: returns to `/setup/profile` with state preserved via `navigate(-1)` or explicit state pass
    - Show error `Alert` if confirm fails
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10_

  - [x] 6.4 Checkpoint — Ensure all tests pass
    - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Property-Based Tests
  - [x] 7.1 Set up fast-check as a dev dependency
    - In `frontend/`, run `npm install --save-dev fast-check` (or verify it is already present in `package.json`)
    - Confirm the test runner (Vitest) can import `fast-check` without configuration changes
    - Create `frontend/src/features/profile/__tests__/` directory for the PBT files
    - _Requirements: (infrastructure for all PBT tasks below)_

  - [ ]* 7.2 Write property tests for routing guards (Properties 1 & 2)
    - Create `frontend/src/features/profile/__tests__/routing.pbt.test.ts`
    - **Property 1: Uninitialized players always land in setup**
    - **Validates: Requirements 1.1**
    - **Property 2: Initialized players cannot access setup routes**
    - **Validates: Requirements 1.2**
    - Generate arbitrary route paths and `{ isInitialized, isInGame, token }` states using `fc.record`; assert the routing decision function returns the correct redirect target

  - [ ]* 7.3 Write property tests for setup mode hiding action buttons (Properties 3 & 4)
    - Create `frontend/src/features/profile/__tests__/setupMode.pbt.test.tsx`
    - **Property 3: Setup mode hides action buttons on job cards**
    - **Validates: Requirements 2.2**
    - **Property 4: Setup mode hides action buttons on program cards**
    - **Validates: Requirements 3.1**
    - Generate arbitrary `JobItem` and `EducationProgram` objects; render inside `SetupModeContext` with `isSetupMode=true`; assert no Apply/Quit/Enroll/Drop/ChangeMajor buttons are present in the output

  - [ ]* 7.4 Write property tests for bookmark toggle round-trips (Properties 5 & 6)
    - Create `frontend/src/features/bookmarks/__tests__/bookmarks.pbt.test.ts`
    - **Property 5: Bookmark toggle round-trip (jobs)**
    - **Validates: Requirements 2.4, 2.5, 4.1**
    - **Property 6: Bookmark toggle round-trip (education)**
    - **Validates: Requirements 3.3, 3.4, 4.2**
    - Generate arbitrary initial `jobIds`/`programIds` arrays and a random item ID; apply `addJobBookmark` then `removeJobBookmark` (and the education equivalent) to the Redux reducer; assert the resulting array equals the initial array

  - [ ]* 7.5 Write property test for bookmarked-only filter (Property 8)
    - Create `frontend/src/features/bookmarks/__tests__/filter.pbt.test.ts`
    - **Property 8: Bookmarked-only filter returns exactly the bookmarked subset**
    - **Validates: Requirements 9.1**
    - Generate arbitrary arrays of job objects (with unique IDs) and a random subset of those IDs as the bookmark set; apply the bookmarked-only filter function; assert the result contains exactly the jobs whose IDs are in the bookmark set — no more, no fewer

  - [ ]* 7.6 Write property tests for trait and skill budget invariants (Properties 10 & 11)
    - Create `frontend/src/features/profile/__tests__/budget.pbt.test.ts`
    - **Property 10: Trait budget invariant**
    - **Validates: Requirements 6.2, 6.3**
    - **Property 11: Skill budget invariant**
    - **Validates: Requirements 6.5, 6.6**
    - Generate arbitrary `Record<string, number>` delta maps produced by the `clampTraitDelta`/`clampSkillDelta` functions from `budgetUtils.ts`; assert the budget invariant formula holds for both traits (budget constant 50) and skills (budget constant 10)

  - [ ]* 7.7 Write property tests for per-stat delta caps (Properties 12 & 13)
    - Add to `frontend/src/features/profile/__tests__/budget.pbt.test.ts`
    - **Property 12: Per-trait delta cap**
    - **Validates: Requirements 6.1**
    - **Property 13: Per-skill delta cap**
    - **Validates: Requirements 6.4**
    - Generate arbitrary proposed delta values; pass through `clampTraitDelta` and `clampSkillDelta`; assert `|result| ≤ 10` for traits and `|result| ≤ 2` for skills

  - [ ]* 7.8 Write property test for generate button disabled after roll (Property 14)
    - Add to `frontend/src/features/profile/__tests__/setupMode.pbt.test.tsx`
    - **Property 14: Generate button disabled after roll**
    - **Validates: Requirements 5.7, 5.8**
    - Generate arbitrary UI states with `hasRolledProfile=true` in the Redux store; render `ProfileSetupPage` with a mocked API; assert the "Generate My Profile" button has the `disabled` attribute

  - [ ]* 7.9 Write property test for reset clearing all deltas (Property 15)
    - Add to `frontend/src/features/profile/__tests__/budget.pbt.test.ts`
    - **Property 15: Reset to rolled values clears all deltas**
    - **Validates: Requirements 5.9, 5.10**
    - Generate arbitrary non-empty `traitDeltas` and `skillDeltas` maps; simulate clicking "Reset to Rolled Values" (i.e., set both maps to `{}`); assert every value in both maps is `0` and the budget meters show `remaining === budget`

  - [x] 7.10 Final checkpoint — Ensure all tests pass
    - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- The `budgetUtils.ts` extraction in task 6.1 is critical — it enables both the UI and the property tests to share the same clamping logic, ensuring the tests actually validate the production code path
- Bookmark optimistic updates (tasks 5.5, 5.6) follow the pattern in the design: dispatch Redux action immediately, call API, reconcile on success, roll back on error with a Snackbar toast
- The `PlayerInitPage` can be deleted once tasks 3.4, 6.2, and 6.3 are complete and verified
- Property tests use the tag format `// Feature: profile-setup-workflow-redesign, Property N: <text>` as specified in the design
