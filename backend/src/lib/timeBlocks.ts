// ─── Time Block Calculator ────────────────────────────────────────────────────
// Pure, synchronous functions — no database calls.

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChildcarePlan =
  | 'year_ft'
  | 'year_pt'
  | 'year_pt_summer_ft'
  | 'summer_ft'
  | 'summer_pt'
  | 'none';

export interface TimeBlockBreakdown {
  total: number;       // always 60
  sleep: number;       // always 20
  work: number;        // sum of active job time blocks (after PTO reduction)
  ptoUsed: number;     // time blocks converted from work → activity via PTO
  childcare: number;   // calculated childcare blocks
  commute: number;     // placeholder — 0 until jobs have commute field
  pets: number;        // 2 blocks if any living pets, else 0
  activities: number;  // remainder = 60 - sleep - work - childcare - commute - pets
}

export interface ChildcareInput {
  children: Array<{ age: number }>;
  // Player's active jobs and active (non-graduated) education enrollments
  playerJobs: Array<{ isPartTime: boolean }>;
  playerEducations: Array<{ isPartTime: boolean }>;
  // Spouse job and education
  spouseJobId: string | null | undefined;
  spouseJobIsPartTime: boolean;
  spouseEducationProgramId: string | null | undefined;
  spouseEduIsPartTime: boolean;
  childcarePlan: ChildcarePlan | null;
}

export interface PlayerTimeBlockInput {
  employments: Array<{
    isActive: boolean;
    isPartTime: boolean;
    ptoUsed?: number;
    chosenLocation: string; // 'city' | 'suburb'
    job: { timeBlocks: number };
  }>;
  educations: Array<{
    isActive: boolean;
    isPartTime: boolean;
    graduated: boolean;
  }>;
  children: Array<{ age: number }>;
  pets: Array<{ isAlive: boolean }>;
  playerHousingLocation: string; // 'city' | 'suburb' — from active HousingOwnership.chosenLocation
  spouse: {
    jobId?: string | null;
    isJobPartTime: boolean;
    educationProgramId?: string | null;
    isEduPartTime: boolean;
  } | null;
  childcarePlan: ChildcarePlan | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Cost per child per year for each childcare plan (used by financial engine). */
export const CHILDCARE_COSTS: Record<ChildcarePlan, number> = {
  year_ft: 12000,
  year_pt: 6000,
  year_pt_summer_ft: 7500,
  summer_ft: 3000,
  summer_pt: 1500,
  none: 0,
};

/**
 * Flat block reduction from childcare plan, keyed by child's age bracket.
 * null = N/A (plan not valid for that age — should not be selected).
 * Source: Lemonade - Childcare.csv
 */
const CHILDCARE_PLAN_FLAT_REDUCTIONS: Record<ChildcarePlan, Record<string, number | null>> = {
  //                         0-2    3-5    6-9    10-12  13-17
  year_ft:              { '0-2': 20,   '3-5': null, '6-9': null, '10-12': null, '13-17': null },
  year_pt:              { '0-2': 10,   '3-5': null, '6-9': null, '10-12': null, '13-17': null },
  year_pt_summer_ft:    { '0-2': null, '3-5': 12,   '6-9': null, '10-12': null, '13-17': null },
  summer_ft:            { '0-2': null, '3-5': null, '6-9': 4,    '10-12': null, '13-17': null },
  summer_pt:            { '0-2': null, '3-5': 2,    '6-9': 2,    '10-12': null, '13-17': null },
  none:                 { '0-2': 0,    '3-5': 0,    '6-9': 0,    '10-12': 0,    '13-17': 0    },
};

/**
 * Section-based reductions per age bracket.
 * "Only spouse" = player has 0 sections, spouse has sections.
 * "Both" = both player and spouse have sections.
 * Source: Lemonade - Childcare.csv
 */
const SECTION_REDUCTIONS: Record<string, { onlySpouse: number; both: number }> = {
  '0-2':   { onlySpouse: 10, both: 4 },
  '3-5':   { onlySpouse: 8,  both: 2 },
  '6-9':   { onlySpouse: 6,  both: 2 },
  '10-12': { onlySpouse: 4,  both: 2 },
  '13-17': { onlySpouse: 2,  both: 2 },
};

function getAgeBracket(age: number): string {
  if (age <= 2)  return '0-2';
  if (age <= 5)  return '3-5';
  if (age <= 9)  return '6-9';
  if (age <= 12) return '10-12';
  return '13-17';
}

// ─── calculateChildcareTimeBlocks ─────────────────────────────────────────────

/**
 * Calculate childcare time blocks per design.md spec.
 *
 * "Sections" represent how much of the day each adult is occupied:
 *   full-time job or school = 2 sections, part-time = 1 section
 *
 * Adjustment logic:
 *   - If player has 0 sections (not working/studying) but spouse has sections:
 *       adjustment = -(baseBlocks / 3) * spouseSections
 *   - Otherwise:
 *       adjustment = -(perSectionReduction) * min(playerSections, spouseSections)
 *       where perSectionReduction = 4 if youngest <= 2, else 2
 *
 * Childcare plan applies a % reduction to the final total.
 */
export function calculateChildcareTimeBlocks(input: ChildcareInput): number {
  const {
    children,
    playerJobs,
    playerEducations,
    spouseJobId,
    spouseJobIsPartTime,
    spouseEducationProgramId,
    spouseEduIsPartTime,
    childcarePlan,
  } = input;

  const minorChildren = children.filter((c) => c.age < 18);
  if (minorChildren.length === 0) return 0;

  // Count sections for player (active jobs + active non-graduated education)
  let numSectionsPlayer = 0;
  for (const job of playerJobs) {
    numSectionsPlayer += job.isPartTime ? 1 : 2;
  }
  for (const edu of playerEducations) {
    numSectionsPlayer += edu.isPartTime ? 1 : 2;
  }

  // Count sections for spouse
  let numSectionsSpouse = 0;
  if (spouseJobId) {
    numSectionsSpouse += spouseJobIsPartTime ? 1 : 2;
  }
  if (spouseEducationProgramId) {
    numSectionsSpouse += spouseEduIsPartTime ? 1 : 2;
  }

  // Base blocks by youngest child's age
  const youngestAge = Math.min(...minorChildren.map((c) => c.age));
  const youngestBracket = getAgeBracket(youngestAge);
  let baseBlocks: number;
  if (youngestAge <= 2) baseBlocks = 30;
  else if (youngestAge <= 5) baseBlocks = 24;
  else if (youngestAge <= 9) baseBlocks = 18;
  else if (youngestAge <= 12) baseBlocks = 12;
  else baseBlocks = 6;

  // Additional blocks for each extra child (skip one instance of the youngest age)
  let additionalBlocks = 0;
  const sorted = [...minorChildren].sort((a, b) => a.age - b.age);
  let skippedYoungest = false;
  for (const child of sorted) {
    if (!skippedYoungest && child.age === youngestAge) {
      skippedYoungest = true;
      continue;
    }
    if (child.age <= 5) additionalBlocks += 4;
    else additionalBlocks += 2;
  }

  // Section-based adjustment using age-bracket-specific rates from CSV
  let sectionAdjustment = 0;
  const rates = SECTION_REDUCTIONS[youngestBracket];
  if (numSectionsPlayer === 0 && numSectionsSpouse > 0) {
    // Player is home — only spouse has sections
    sectionAdjustment -= rates.onlySpouse * numSectionsSpouse;
  } else if (numSectionsPlayer > 0 && numSectionsSpouse > 0) {
    // Both occupied — reduction capped by the less-occupied parent
    sectionAdjustment -= rates.both * Math.min(numSectionsPlayer, numSectionsSpouse);
  }
  // Single parent or stay-at-home spouse (only player has sections): no reduction

  const baseTotal = baseBlocks + additionalBlocks + sectionAdjustment;

  // Childcare plan: find the highest flat reduction across all children's age brackets.
  // N/A combinations (null) are skipped — the plan doesn't apply to that child's age.
  // The UI should prevent invalid plan selections, but we guard here too.
  const plan = childcarePlan ?? 'none';
  const planReductionsByBracket = CHILDCARE_PLAN_FLAT_REDUCTIONS[plan];
  let maxPlanReduction = 0;
  for (const child of minorChildren) {
    const bracket = getAgeBracket(child.age);
    const reduction = planReductionsByBracket[bracket];
    if (reduction !== null && reduction > maxPlanReduction) {
      maxPlanReduction = reduction;
    }
  }

  return Math.max(0, Math.round(baseTotal - maxPlanReduction));
}

// ─── calculateWorkTimeBlocks ──────────────────────────────────────────────────

/**
 * Sum time blocks for all active employments.
 * Part-time jobs use half their listed time blocks (rounded up).
 * Subtract ptoUsed to convert work → activity blocks.
 */
export function calculateWorkTimeBlocks(
  employments: Array<{
    timeBlocks: number;
    isPartTime: boolean;
    isActive: boolean;
    ptoUsed?: number;
  }>,
): { work: number; ptoUsed: number } {
  let totalWork = 0;
  let totalPtoUsed = 0;

  for (const emp of employments) {
    if (!emp.isActive) continue;
    const rawBlocks = emp.isPartTime ? Math.ceil(emp.timeBlocks / 2) : emp.timeBlocks;
    const pto = emp.ptoUsed ?? 0;
    totalWork += rawBlocks;
    totalPtoUsed += pto;
  }

  const workAfterPto = Math.max(0, totalWork - totalPtoUsed);
  return { work: workAfterPto, ptoUsed: totalPtoUsed };
}

// ─── calculateTimeBlocks ──────────────────────────────────────────────────────

/**
 * Full time block breakdown for a player. Total always sums to 60.
 */
export function calculateTimeBlocks(playerData: PlayerTimeBlockInput): TimeBlockBreakdown {
  const TOTAL = 60;
  const SLEEP = 20;

  // 1. Work + PTO
  const empInputs = playerData.employments.map((e) => ({
    timeBlocks: e.job.timeBlocks,
    isPartTime: e.isPartTime,
    isActive: e.isActive,
    ptoUsed: e.ptoUsed,
  }));
  const { work, ptoUsed } = calculateWorkTimeBlocks(empInputs);

  // 2. Childcare
  const activeJobs = playerData.employments
    .filter((e) => e.isActive)
    .map((e) => ({ isPartTime: e.isPartTime }));

  const activeEdus = playerData.educations
    .filter((e) => e.isActive && !e.graduated)
    .map((e) => ({ isPartTime: e.isPartTime }));

  const childcareInput: ChildcareInput = {
    children: playerData.children,
    playerJobs: activeJobs,
    playerEducations: activeEdus,
    spouseJobId: playerData.spouse?.jobId ?? null,
    spouseJobIsPartTime: playerData.spouse?.isJobPartTime ?? false,
    spouseEducationProgramId: playerData.spouse?.educationProgramId ?? null,
    spouseEduIsPartTime: playerData.spouse?.isEduPartTime ?? false,
    childcarePlan: playerData.childcarePlan,
  };
  const childcare = calculateChildcareTimeBlocks(childcareInput);

  // 3. Commute — 1 block if any active job is in a different area than player's housing
  // Capped at 1 regardless of how many cross-area jobs exist
  const hasCommute = playerData.employments
    .filter((e) => e.isActive)
    .some((e) => e.chosenLocation !== playerData.playerHousingLocation);
  const commute = hasCommute ? 1 : 0;

  // 4. Pets — 2 blocks if any living pets
  const livingPets = playerData.pets.filter((p) => p.isAlive).length;
  const pets = livingPets > 0 ? 2 : 0;

  // 5. Activities — remainder
  const activities = Math.max(0, TOTAL - SLEEP - work - childcare - commute - pets);

  return { total: TOTAL, sleep: SLEEP, work, ptoUsed, childcare, commute, pets, activities };
}

// ─── getAvailableActivityBlocks ───────────────────────────────────────────────

/** Returns the number of activity time blocks available to the player. */
export function getAvailableActivityBlocks(breakdown: TimeBlockBreakdown): number {
  return breakdown.activities;
}
