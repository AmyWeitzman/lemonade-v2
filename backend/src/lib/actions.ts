/**
 * Action System — Eligibility Checker and Cost Calculator
 *
 * Pure helper functions used by the actions route.
 * Requirements: Req 8, Req 22, Req 34
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActionRequirements {
  skills?: Record<string, number>;
  traits?: Record<string, number>;
  health?: number;
  certifications?: string[];
  minAge?: number;
  maxAge?: number;
  enrolled?: boolean;
  hasPool?: boolean;
  location?: string;
  other?: string[];
  // Special flags used by specific actions
  hasCPRCert?: boolean;
  hasGrandkids?: boolean;
  inSchool?: boolean;
  job?: string[];
  physicalAbility?: number;
  compassion?: number;
  caution?: number;
  goodWithKids?: number;
  patience?: number;
  stressTolerance?: number;
  minSkill?: number;
  hasPTOOrUnpaidTimeBlocks?: boolean;
  hasPTODaysAvailable?: boolean;
  minCarSeatsForFamily?: boolean;
  ptoOrUnpaidTimeBlocks?: number;
  retiredExempt?: boolean;
}

export interface ActionDiscounts {
  hasInsurance?: { cost: number };
  seniorCost?: number;
  freeForJobs?: string[];
  hasBike?: { cost: number };
  jobDiscounts?: Record<string, number>;
}

export interface ActionEffects {
  lemons?: number;
  lemonsPerBlock?: number;
  health?: number;
  healthPerBlock?: number;
  stress?: number;
  stressPerBlock?: number;
  stressPerPTOBlock?: number;
  [key: string]: unknown;
}

export interface ActionRow {
  id: string;
  name: string;
  category: unknown; // string[]
  description: string;
  requirements: unknown;
  cost: number;
  costFormula: string;
  baseCost: number | null;
  seniorDiscount: boolean;
  minTimeBlocks: number;
  maxTimeBlocks: number | null;
  timeBlockIncrement: number | null;
  requiresPTO: boolean;
  userInput: unknown;
  effects: unknown;
  executionType: string;
  frequency: string;
  discounts: unknown;
}

export interface PlayerForEligibility {
  age: number;
  health: number;
  skills: Record<string, number>;
  traits: Record<string, number>;
  certifications: unknown; // string[] stored as JSON
  isRetired: boolean;
  location: string;
  // Relations
  educations: Array<{ isActive: boolean; graduated: boolean }>;
  housingOwnerships: Array<{
    endAge: number | null;
    improvements: unknown; // HomeImprovement[]
  }>;
  employments: Array<{
    isActive: boolean;
    job: { title: string };
    ptoRemaining: number;
    unpaidTimeOffRemaining: number;
  }>;
  children: Array<{ age: number; hasChildren: boolean }>;
  vehicleOwnerships: Array<{
    endAge: number | null;
    vehicle: { type: string; passengerCapacity: number };
  }>;
  // Flags set by caller
  playerFlags?: Record<string, boolean>;
}

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
}

// ─── checkActionEligibility ───────────────────────────────────────────────────

/**
 * Check whether a player meets all requirements for an action.
 */
export function checkActionEligibility(
  action: ActionRow,
  player: PlayerForEligibility,
): EligibilityResult {
  const reqs = (action.requirements ?? {}) as ActionRequirements;
  const reasons: string[] = [];

  // Skills
  if (reqs.skills) {
    for (const [skill, minVal] of Object.entries(reqs.skills)) {
      if ((player.skills[skill] ?? 0) < minVal) {
        reasons.push(`Requires ${skill} >= ${minVal} (you have ${player.skills[skill] ?? 0})`);
      }
    }
  }

  // Traits
  if (reqs.traits) {
    for (const [trait, minVal] of Object.entries(reqs.traits)) {
      if ((player.traits[trait] ?? 0) < minVal) {
        reasons.push(`Requires ${trait} >= ${minVal} (you have ${player.traits[trait] ?? 0})`);
      }
    }
  }

  // Individual trait shortcuts used in some actions
  if (reqs.physicalAbility !== undefined && (player.traits.physicalAbility ?? 0) < reqs.physicalAbility) {
    reasons.push(`Requires physicalAbility >= ${reqs.physicalAbility}`);
  }
  if (reqs.compassion !== undefined && (player.traits.compassion ?? 0) < reqs.compassion) {
    reasons.push(`Requires compassion >= ${reqs.compassion}`);
  }
  if (reqs.caution !== undefined && (player.traits.caution ?? 0) < reqs.caution) {
    reasons.push(`Requires caution >= ${reqs.caution}`);
  }
  if (reqs.goodWithKids !== undefined && (player.traits.goodWithKids ?? 0) < reqs.goodWithKids) {
    reasons.push(`Requires goodWithKids >= ${reqs.goodWithKids}`);
  }
  if (reqs.patience !== undefined && (player.traits.patience ?? 0) < reqs.patience) {
    reasons.push(`Requires patience >= ${reqs.patience}`);
  }
  if (reqs.stressTolerance !== undefined && (player.traits.stressTolerance ?? 0) < reqs.stressTolerance) {
    reasons.push(`Requires stressTolerance >= ${reqs.stressTolerance}`);
  }

  // Min skill (any skill >= threshold)
  if (reqs.minSkill !== undefined) {
    const maxSkill = Math.max(...Object.values(player.skills));
    if (maxSkill < reqs.minSkill) {
      reasons.push(`Requires at least one skill >= ${reqs.minSkill}`);
    }
  }

  // Health
  if (reqs.health !== undefined && player.health < reqs.health) {
    reasons.push(`Requires health >= ${reqs.health} (you have ${player.health})`);
  }

  // Certifications
  const playerCerts = (player.certifications as string[]) ?? [];
  if (reqs.certifications && reqs.certifications.length > 0) {
    for (const cert of reqs.certifications) {
      if (!playerCerts.includes(cert)) {
        reasons.push(`Requires certification: ${cert}`);
      }
    }
  }

  // CPR cert shortcut
  if (reqs.hasCPRCert === true && !playerCerts.includes('CPR')) {
    reasons.push('Requires CPR certification');
  }
  if (reqs.hasCPRCert === false && playerCerts.includes('CPR')) {
    reasons.push('Cannot already have CPR certification');
  }

  // Age
  if (reqs.minAge !== undefined && player.age < reqs.minAge) {
    reasons.push(`Requires age >= ${reqs.minAge}`);
  }
  if (reqs.maxAge !== undefined && player.age > reqs.maxAge) {
    reasons.push(`Requires age <= ${reqs.maxAge}`);
  }

  // Enrolled in education
  const isEnrolled = player.educations.some((e) => e.isActive && !e.graduated);
  if (reqs.enrolled === true && !isEnrolled) {
    reasons.push('Must be enrolled in education');
  }
  if (reqs.inSchool === true && !isEnrolled) {
    reasons.push('Must be enrolled in school');
  }
  if (reqs.inSchool === false && isEnrolled) {
    reasons.push('Must not be enrolled in school');
  }

  // Has pool (home improvement)
  if (reqs.hasPool === true) {
    const hasPool = player.housingOwnerships.some((h) => {
      if (h.endAge !== null) return false;
      const improvements = (h.improvements as Array<{ type: string }>) ?? [];
      return improvements.some((imp) => imp.type === 'pool');
    });
    if (!hasPool) {
      reasons.push('Requires a pool home improvement');
    }
  }

  // Location
  if (reqs.location && reqs.location !== 'both' && player.location !== reqs.location) {
    reasons.push(`Requires location: ${reqs.location}`);
  }

  // Grandkids
  if (reqs.hasGrandkids === true) {
    const hasGrandkids = player.children.some((c) => c.hasChildren);
    if (!hasGrandkids) {
      reasons.push('Requires grandchildren');
    }
  }

  // Job requirement
  if (reqs.job && reqs.job.length > 0) {
    const activeJobTitles = player.employments
      .filter((e) => e.isActive)
      .map((e) => e.job.title);
    const hasRequiredJob = reqs.job.some((j) => activeJobTitles.includes(j));
    if (!hasRequiredJob) {
      reasons.push(`Requires one of these jobs: ${reqs.job.join(', ')}`);
    }
  }

  // PTO / unpaid time blocks available
  if (reqs.hasPTOOrUnpaidTimeBlocks === true && !player.isRetired) {
    const hasPTO = player.employments.some(
      (e) => e.isActive && (e.ptoRemaining > 0 || e.unpaidTimeOffRemaining > 0),
    );
    if (!hasPTO) {
      reasons.push('Requires available PTO or unpaid time off');
    }
  }

  if (reqs.hasPTODaysAvailable === true) {
    const hasPTO = player.employments.some((e) => e.isActive && e.ptoRemaining > 0);
    if (!hasPTO) {
      reasons.push('Requires available PTO days');
    }
  }

  // Min car seats for family (camping)
  if (reqs.minCarSeatsForFamily === true) {
    const familySize = 1 + (player.children.filter((c) => c.age < 18).length);
    const maxSeats = player.vehicleOwnerships
      .filter((v) => v.endAge === null)
      .reduce((max, v) => Math.max(max, v.vehicle.passengerCapacity), 0);
    if (maxSeats < familySize) {
      reasons.push(`Requires vehicle with at least ${familySize} seats for your family`);
    }
  }

  // Other custom flags
  if (reqs.other && reqs.other.length > 0) {
    const flags = player.playerFlags ?? {};
    for (const flag of reqs.other) {
      if (!flags[flag]) {
        reasons.push(`Requires: ${flag}`);
      }
    }
  }

  return { eligible: reasons.length === 0, reasons };
}

// ─── calculateActionCost ──────────────────────────────────────────────────────

export interface CostInput {
  action: ActionRow;
  timeBlocks: number;
  familySize: number; // player + spouse + children under 18
  playerAge: number;
  playerJobTitles: string[];
  hasInsurance: boolean;
  hasBike: boolean;
}

/**
 * Calculate the final cost of an action after applying discounts and cost formula.
 */
export function calculateActionCost(input: CostInput): number {
  const { action, timeBlocks, familySize, playerAge, playerJobTitles, hasInsurance, hasBike } =
    input;

  const discounts = (action.discounts ?? {}) as ActionDiscounts;

  // Senior discount (age >= 65)
  const isSenior = playerAge >= 65;
  let baseCostPerUnit = action.cost;

  if (isSenior && action.seniorDiscount && discounts.seniorCost !== undefined) {
    baseCostPerUnit = discounts.seniorCost;
  }

  // Job-specific free discount
  if (discounts.freeForJobs && discounts.freeForJobs.some((j) => playerJobTitles.includes(j))) {
    baseCostPerUnit = 0;
  }

  // Bike discount
  if (hasBike && discounts.hasBike !== undefined) {
    baseCostPerUnit = discounts.hasBike.cost;
  }

  // Insurance discount
  if (hasInsurance && discounts.hasInsurance !== undefined) {
    baseCostPerUnit = discounts.hasInsurance.cost;
  }

  // Job discounts map
  if (discounts.jobDiscounts) {
    for (const [jobTitle, discountedCost] of Object.entries(discounts.jobDiscounts)) {
      if (playerJobTitles.includes(jobTitle)) {
        baseCostPerUnit = discountedCost;
        break;
      }
    }
  }

  // Apply cost formula
  let totalCost = 0;
  switch (action.costFormula) {
    case 'none':
      totalCost = baseCostPerUnit;
      break;
    case 'per_person':
      totalCost = baseCostPerUnit * familySize;
      break;
    case 'per_time_block':
      totalCost = baseCostPerUnit * timeBlocks;
      break;
    case 'per_person_per_time_block':
      totalCost = baseCostPerUnit * familySize * timeBlocks;
      break;
    case 'base_plus_per_person_per_time_block': {
      const base = action.baseCost ?? 0;
      totalCost = base + baseCostPerUnit * familySize * timeBlocks;
      break;
    }
    default:
      totalCost = baseCostPerUnit;
  }

  return Math.max(0, totalCost);
}

// ─── ActionHistory helpers ────────────────────────────────────────────────────

export interface ActionHistoryRecord {
  actionId: string;
  year: number;
  count: number;
  totalCost: number;
  totalTimeBlocks: number;
  lemonsEarned: number;
}

/**
 * Check if a frequency limit blocks execution.
 * Returns an error string if blocked, null if allowed.
 */
export function checkFrequencyLimit(
  action: ActionRow,
  existingHistory: ActionHistoryRecord | null,
): string | null {
  if (!existingHistory) return null;

  switch (action.frequency) {
    case 'once_per_year':
      if (existingHistory.count >= 1) {
        return `${action.name} can only be done once per year`;
      }
      break;
    case 'once_per_two_years':
      // Caller must check across two years; here we just check current year
      if (existingHistory.count >= 1) {
        return `${action.name} can only be done once every two years`;
      }
      break;
    case 'twice_per_year':
      if (existingHistory.count >= 2) {
        return `${action.name} can only be done twice per year`;
      }
      break;
    case 'multiple':
      // Limited but no hard cap defined — allow
      break;
    case 'unlimited':
    default:
      break;
  }

  return null;
}
