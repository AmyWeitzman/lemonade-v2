# Action Catalog Audit

_Snapshot of which of the 111 catalog actions actually do what they're supposed
to when executed through the Actions page (`POST /api/actions/execute` or express
checkout). Written 2026-09-06._

## TL;DR

`/actions/execute` only interprets **generic** effect keys (health, stress,
lemons, skills, traits, per-block variants) plus three special cases:
`Get CPR Certification`, `Get Housing`, `Get Transportation`. **Every other action
that is supposed to change another system is currently a no-op** — it burns the
time blocks and applies any generic stress/lemons, but does not enrol you in
school, get you a job, pay you career income, roll for a baby, etc.

The functional flows for jobs / education / housing / vehicles / relationships /
pets live on their **dedicated pages**, which mostly work but (a) don't cost time
blocks and (b) aren't linked to the catalog actions.

## Fixed in this pass

| Action | What was wrong | Now |
|---|---|---|
| **Get Housing** | inert; no picker; multi-quantity; homes were free | Cart action with a home picker; charges the full purchase price from cash (credits the sale of your current home); blocks with a "take a loan" prompt if short; `once_per_year`; no ×N. Standalone `/housing` page charges + blocks the same way. |
| **Get Transportation** | inert; no picker; multi-quantity | Cart action with a vehicle picker; charges purchase price; `once_per_year`; no ×N. |
| **Earmark** | — | Time blocks for a required Get Housing / Get Transportation are reserved so the player can't get soft-locked. |

## Still broken — grouped by system, roughly in priority order

### 1. Education (high — needed for the whole career path)
- **Pursue Education** — should open a picker: degree level, field/major, FT vs PT,
  eligible programs. Enrol via the existing `/education/enroll` logic. Cost the 1 tb.
- **Change Major** (`changeMajor`), **Drop Out of School** (`dropOut`),
  **Change School Full-Time/Part-Time** (`toggleFTPT`) — map to
  `/education/change-major`, `/education/drop`. Need small pickers / confirmations.
- **Apply for Scholarships** (`scholarshipRoll`) — maps to `/education/scholarships`;
  probably just needs wiring, no picker.
- **Schoolwork actions** (Attend Classes, Study, Complete Coursework, Research,
  Office Hours, Review Session, Work on Thesis/Dissertation, Student Teach) —
  `stressByProgram` / `timeBlocksByProgram`. These drive the "spend X blocks on
  academic actions for full skill gain" rule (design ~line 1058). Execute must
  read the player's active program and apply per-program stress/blocks + track
  academic-block total for the year-end graduation calc.

### 2. Jobs (high)
- **Find a Job** — should open a searchable job picker (hide-ineligible toggle),
  apply via existing `/jobs/:id/apply` logic, cost the 2 tb, take effect
  immediately (design ~line 1042).
- **Do Continuing Education** — regains eligibility for a previously-held job that
  now needs a refresh. "2 tb per 2 yrs since last held, max 20." Needs a
  job/certification picker + the cost formula + a re-eligibility flag.

### 3. Careers — writing / acting / music (medium; entirely unreachable today)
- `/api/careers/{writing,acting,music}/action` endpoints exist and work, but
  **nothing in the frontend calls them.** Write a Book, Self-Publish / Submit
  Book, all the Perform / Release / Tour / Audition actions need to route to
  those endpoints (with `salaryFormula`, `successChance`, `bookPublished`,
  `publishCriteria`) instead of `/actions/execute`.

### 4. Family (medium)
- **Find Love** (`noMatch` / `matched`) — dating-app flow; may lead to marriage
  next year at $15k to the player (design ~line 985). Needs the roll + the
  "married next year" pending state + wedding cost.
- **Get Divorced** (`splitMoneyAndSavings`) — maps to `/relationships` divorce.
- **Get Childcare** (`childcareOptions`) — picker for the childcare plan
  (`year_ft` / `year_pt` / …); maps to `PATCH /players/:id/childcare-plan`.
  0 tb, `once_per_year`.
- **Try to Have Child** (`pregnancyChanceByAge`, `multiplesBirthChance`,
  `birthSuccessRateByAge`, `birthCosts`) — conception roll → pregnancy → birth
  next year with the age-based success tables.
- **Apply to Adopt Child** (`lemonsByChildAge`) — age-group picker; the multi-year
  adoption pipeline exists (`AdoptionApplication`); wire the action to it.

### 5. Pets (low)
- **Adopt a Pet** (`largePetCost` / `smallPetCost`) — size picker; maps to `/pets`.
- **Put Pet Up for Adoption** (`removePets`) — which-pet picker.

### 6. Home improvements (low)
- **Remodel Home** (`homeValueIncreasePctMin/Max`) — investment-amount input;
  maps to `/housing/improvements` type `remodel`.
- **Install a Pool** (`costBasePercent`, `annualMaintenance`) / **Install Solar
  Panels** (`utilitiesDiscountPct`) — map to `/housing/improvements`.

### 7. Community gig income (low)
- **Tutor**, **Babysit** (`incomePerBlock`), **Be a Lifeguard**,
  **Teach Summer Courses** (`teacherIncome` / `professorIncome`) — should pay
  income per block / per trip. Execute needs to add the money.

### 8. Misc
- **Stay Up Late** (`gainTimeBlock`) — should reduce Sleep and add an Activity
  block for the year (design ~line 440). Execute must adjust the time-block
  breakdown, not just apply generic effects.

## Suggested approach

Build one **action-effect dispatcher** in `lib/` that `/actions/execute` (and the
express path) call: `applySpecialActionEffect(tx, action, item, player, session)`.
It switches on action name / effect keys and calls the already-built
lib functions (`acquireHousing`, education enrol, `/jobs` apply logic, career
endpoints' internals, pet/relationship helpers). Pair each "needs a choice"
action with a small modal on the Actions page (the `GetHousingTransportPicker`
pattern) that writes its selection onto the cart line, mirroring
`selectedHousingId` / `selectedVehicleId`.

Roughly: Education + Jobs first (unblocks progression), then Careers, then
Family, then the rest.
