/**
 * Employment System — Core Logic
 *
 * Pure/deterministic functions for job eligibility checking and income calculation.
 * No DB calls — callers persist changes.
 *
 * Requirements: Req 11, Req 44, Req 45, Req 46
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JobRequirements {
  education?: string;           // 'none' or description
  educationIds?: string[];      // specific program IDs
  educationAlternative?: { yearsExperience: number; jobTitle: string };
  skills?: Record<string, number | number[]>;
  traits?: Record<string, number | number[]>;
  minHealth?: number;
  certifications?: string[];
  location?: 'city' | 'suburb' | 'both';
  minAge?: number;
  other?: string;
}

export interface JobRow {
  id: string;
  title: string;
  requirements: JobRequirements;
  baseSalary: number;
  raiseSchedule: Array<{ years: number; percentage: number }> | Record<string, unknown>;
  timeBlocks: number;
  stressLevel: number;
  ptoTimeBlocks: number;
  unpaidTimeOff: number | null;
  fullTime: boolean;
  partTime: boolean;
  seasonal: boolean;
  benefits: unknown;
  annualGains: Record<string, unknown>;
  location: string;
  hasPension: boolean;
  pensionPercentage: number | null;
  easeOfGetting: number;
}

export interface PlayerForJobEligibility {
  age: number;
  health: number;
  skills: Record<string, number>;
  traits: Record<string, number>;
  certifications: unknown; // string[] stored as JSON
  location: string;
  educations: Array<{
    programId: string;
    isActive: boolean;
    graduated: boolean;
  }>;
  employments: Array<{
    isActive: boolean;
    yearsOfService: number;
    job: { title: string };
  }>;
}

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Get the minimum required value for a skill/trait requirement.
 * Requirements can be a single number or an array of thresholds by degree level.
 * We use the lowest threshold (index 0) for basic eligibility.
 */
function getMinRequired(req: number | number[]): number {
  if (Array.isArray(req)) return req[0] ?? 0;
  return req;
}

// ─── checkJobEligibility ──────────────────────────────────────────────────────

/**
 * Check whether a player meets all requirements for a job.
 * Returns eligible=true/false plus human-readable reasons for failures.
 */
export function checkJobEligibility(
  job: JobRow,
  player: PlayerForJobEligibility,
): EligibilityResult {
  const reasons: string[] = [];
  const reqs = job.requirements;

  // Age requirement
  if (reqs.minAge !== undefined && player.age < reqs.minAge) {
    reasons.push(`Minimum age ${reqs.minAge} required (you are ${player.age})`);
  }

  // Health requirement
  if (reqs.minHealth !== undefined && player.health < reqs.minHealth) {
    reasons.push(`Minimum health ${reqs.minHealth}% required (you have ${player.health.toFixed(0)}%)`);
  }

  // Location requirement
  if (reqs.location && reqs.location !== 'both' && reqs.location !== player.location) {
    reasons.push(`Job is only available in ${reqs.location} (you are in ${player.location})`);
  }

  // Certification requirements
  if (reqs.certifications && reqs.certifications.length > 0) {
    const playerCerts = (player.certifications as string[]) ?? [];
    for (const cert of reqs.certifications) {
      if (!playerCerts.includes(cert)) {
        reasons.push(`Certification required: ${cert}`);
      }
    }
  }

  // Skill requirements
  if (reqs.skills) {
    for (const [skill, req] of Object.entries(reqs.skills)) {
      const minVal = getMinRequired(req);
      const playerVal = player.skills[skill] ?? 0;
      if (playerVal < minVal) {
        reasons.push(`${skill} skill must be >= ${minVal}% (you have ${playerVal.toFixed(0)}%)`);
      }
    }
  }

  // Trait requirements
  if (reqs.traits) {
    for (const [trait, req] of Object.entries(reqs.traits)) {
      const minVal = getMinRequired(req);
      const playerVal = player.traits[trait] ?? 0;
      if (playerVal < minVal) {
        reasons.push(`${trait} trait must be >= ${minVal}% (you have ${playerVal.toFixed(0)}%)`);
      }
    }
  }

  // Education requirements
  if (reqs.education !== 'none' && reqs.educationIds && reqs.educationIds.length > 0) {
    const playerGraduatedIds = player.educations
      .filter((e) => e.graduated)
      .map((e) => e.programId);

    const hasRequiredDegree = reqs.educationIds.some((id) => playerGraduatedIds.includes(id));

    // Check alternative (experience-based) path
    let meetsAlternative = false;
    if (reqs.educationAlternative) {
      const { yearsExperience, jobTitle } = reqs.educationAlternative;
      const relevantJob = player.employments.find(
        (e) => e.job.title === jobTitle,
      );
      if (relevantJob && relevantJob.yearsOfService >= yearsExperience) {
        meetsAlternative = true;
      }
    }

    if (!hasRequiredDegree && !meetsAlternative) {
      if (reqs.educationAlternative) {
        reasons.push(
          `Requires specific degree OR ${reqs.educationAlternative.yearsExperience} years as ${reqs.educationAlternative.jobTitle}`,
        );
      } else {
        reasons.push('Required degree not completed');
      }
    }
  }

  return { eligible: reasons.length === 0, reasons };
}

// ─── calculateProjectedIncome ─────────────────────────────────────────────────

/**
 * Calculate projected income for a player after applying for a new job mid-year.
 *
 * Per Req 11.6: when switching jobs mid-year, the player earns only half of the
 * previous job's salary for the year, plus a prorated portion of the new job's
 * salary based on remaining time blocks.
 *
 * For simplicity we model "mid-year switch" as:
 *   - Previous job: half salary
 *   - New job: half salary (joined mid-year)
 */
export function calculateProjectedIncomeAfterJobChange(
  previousSalary: number,
  newSalary: number,
  isPartTime: boolean,
): number {
  const effectiveNewSalary = isPartTime ? newSalary * 0.5 : newSalary;
  return previousSalary * 0.5 + effectiveNewSalary * 0.5;
}

// ─── getJobBenefits ───────────────────────────────────────────────────────────

export interface JobBenefits {
  // Health / fitness
  freeGymMembership: boolean;

  // Travel
  travelDiscountPct: number;
  travelTickets?: { count: number; discountPct: number };

  // Pets / animals
  vetFeeWaiver: boolean;
  /** Zoologist: discounted/free zoo admission */
  zooDiscountPct: number;
  zooFreeTickets: number;
  /** Marine biologist: discounted/free aquarium admission */
  aquariumDiscountPct: number;
  aquariumFreeTickets: number;

  // Vehicles / home
  autoMaintenanceDiscountPct: number;
  plumbingDiscountPct: number;
  electricalDiscountPct: number;
  housingRepairDiscountPct: number;
  pestDiscountPct: number;

  // Shopping / tech
  shoppingDiscountPct: number;
  /** Software dev / computer engineer: discount on tech purchases/repairs */
  techDiscountPct: number;

  // Finance
  /** Accountant: waives tax prep fee */
  waivesTaxPrepFee: boolean;
  hasPension: boolean;
  pensionPercentage: number;

  // Income structure
  /**
   * Tips income (waiter, bartender) — NOT included in taxable salary.
   * Add to take-home pay without running through tax brackets.
   */
  baseTips: number;
  /** Extra tips per 5% average skill above threshold */
  tipsPerSkillAvg5pct: number;
  /** Rideshare / gig: income earned per time block worked */
  incomePerTimeBlock?: number;

  // Scheduling
  /**
   * Evening-shift job (bartender): player works nights (evening section),
   * meaning they are home during the day (morning + afternoon sections).
   *
   * Childcare logic — three sections of the day: morning, afternoon, evening.
   * Most jobs occupy morning + afternoon. Childcare is needed for whichever
   * sections the player (and spouse, if any) are both unavailable.
   *
   * With an evening-shift player:
   *   - Married, spouse has a day job:
   *       Player covers morning/afternoon → no daytime childcare needed.
   *       Spouse covers evening → no evening childcare needed either.
   *       Result: childcare blocks ≈ 0 (same as one stay-at-home parent).
   *   - Married, spouse also works evenings:
   *       Both unavailable in the evening → need evening childcare only.
   *       Result: reduced blocks vs. two day-job parents.
   *   - Single parent:
   *       Available during the day but unavailable in the evening →
   *       need evening childcare instead of daytime.
   *       Result: similar block count to a single day-job parent
   *       (just shifted to evening coverage).
   *
   * The childcare calculator should treat an evening-shift parent as having
   * 0 daytime sections but 1 evening section occupied, rather than the
   * default 2 daytime sections for a full-time day job.
   */
  eveningShift: boolean;

  canBeSecondJob: boolean;
}

/**
 * Extract normalized benefits from a job's benefits JSON.
 * Tips (baseTips, tipsPerSkillAvg5pct) are returned separately from salary
 * so callers can keep them out of taxable income.
 */
export function getJobBenefits(benefitsJson: unknown, jobRow?: Pick<JobRow, 'hasPension' | 'pensionPercentage'>): JobBenefits {
  const b = (benefitsJson ?? {}) as Record<string, unknown>;

  return {
    freeGymMembership: Boolean(b.freeGymMembership),

    travelDiscountPct: typeof b.travelDiscountPct === 'number' ? b.travelDiscountPct : 0,
    travelTickets:
      b.travelTickets &&
      typeof (b.travelTickets as Record<string, unknown>).count === 'number'
        ? (b.travelTickets as { count: number; discountPct: number })
        : undefined,

    vetFeeWaiver: Boolean(b.vetFeeWaiver),
    zooDiscountPct: typeof b.zooDiscountPct === 'number' ? b.zooDiscountPct : 0,
    zooFreeTickets: typeof b.zooFreeTickets === 'number' ? b.zooFreeTickets : 0,
    aquariumDiscountPct: typeof b.aquariumDiscountPct === 'number' ? b.aquariumDiscountPct : 0,
    aquariumFreeTickets: typeof b.aquariumFreeTickets === 'number' ? b.aquariumFreeTickets : 0,

    autoMaintenanceDiscountPct:
      typeof b.autoMaintenanceDiscountPct === 'number' ? b.autoMaintenanceDiscountPct : 0,
    plumbingDiscountPct: typeof b.plumbingDiscountPct === 'number' ? b.plumbingDiscountPct : 0,
    electricalDiscountPct: typeof b.electricalDiscountPct === 'number' ? b.electricalDiscountPct : 0,
    housingRepairDiscountPct:
      typeof b.housingRepairDiscountPct === 'number' ? b.housingRepairDiscountPct : 0,
    pestDiscountPct: typeof b.pestDiscountPct === 'number' ? b.pestDiscountPct : 0,

    shoppingDiscountPct:
      typeof b.shoppingDiscountPct === 'number' ? b.shoppingDiscountPct : 0,
    techDiscountPct: typeof b.techDiscountPct === 'number' ? b.techDiscountPct : 0,

    waivesTaxPrepFee: Boolean(b.waivesTaxPrepFee),
    hasPension: jobRow?.hasPension ?? false,
    pensionPercentage: jobRow?.pensionPercentage ?? 0,

    // Tips — intentionally NOT part of taxable salary
    baseTips: typeof b.baseTips === 'number' ? b.baseTips : 0,
    tipsPerSkillAvg5pct: typeof b.tipsPerSkillAvg5pct === 'number' ? b.tipsPerSkillAvg5pct : 0,
    incomePerTimeBlock:
      typeof b.incomePerTimeBlock === 'number' ? b.incomePerTimeBlock : undefined,

    eveningShift: Boolean(b.eveningShift),

    canBeSecondJob: Boolean(b.canBeSecondJob),
  };
}

// ─── checkBikeRestriction ─────────────────────────────────────────────────────

/**
 * Req 47.6 — Bikes cannot travel between city and suburb.
 * If the player's only vehicle is a bike AND the job is in a different location
 * than the player's housing, the player cannot take that job.
 *
 * Returns a reason string if blocked, null if allowed.
 */
export function checkBikeRestriction(
  jobLocation: string, // 'city' | 'suburb' | 'both'
  playerHousingLocation: string, // 'city' | 'suburb'
  vehicleOwnerships: Array<{ endAge: number | null; vehicle: { type: string; restrictedToArea: boolean } }>,
): string | null {
  if (jobLocation === 'both') return null; // job is available everywhere

  // Check if player has only a bike (no car/motorcycle/transit)
  const activeVehicles = vehicleOwnerships.filter((v) => v.endAge === null);
  if (activeVehicles.length === 0) return null; // no vehicle — no bike restriction

  const hasBikeOnly =
    activeVehicles.every((v) => v.vehicle.type === 'bike' && v.vehicle.restrictedToArea);

  if (!hasBikeOnly) return null; // has a non-bike vehicle — can travel freely

  // Bike is restricted to area — job must be in same location as housing
  if (jobLocation !== playerHousingLocation) {
    return `Bike cannot travel between city and suburb. Job is in ${jobLocation} but your housing is in ${playerHousingLocation}.`;
  }

  return null;
}
