/**
 * Relationship & Family Business Logic
 *
 * Pure/deterministic functions — no DB writes. Callers persist changes.
 *
 * Requirements: Req 14, Req 14A, Req 14B, Req 14C
 */

import { leftSkewed, rollDie } from './probability';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SpouseData {
  age: number;
  jobId?: string | null;
  salary: number;
  isJobPartTime: boolean;
  educationProgramId?: string | null;
  isEduPartTime: boolean;
  vehicleId?: string | null;
  housingId?: string | null;
  loans: SpouseLoan[];
  money: number;
  retirementSavings: number;
  isRetired: boolean;
  certifications: string[];
  hasAccountingExperience: boolean;
  // Tracked at marriage for divorce calculations
  originalMoney: number;
  originalSavings: number;
  originalLoans: number;
}

export interface SpouseLoan {
  principal: number;
  currentBalance: number;
  interestRate: number;
  minimumPayment: number;
  originAge: number;
}

export interface MarriageCompatibilityRecord {
  currentScore: number;
  yearlyScores: Record<number, number>;
  debtStressHistory: boolean[];
  familyActionHistory: number[];
  totalYearsMarried: number;
  communicationGained: number;
  compassionGained: number;
  patienceGained: number;
}

// ─── Marriage ─────────────────────────────────────────────────────────────────

export interface MarriageInput {
  playerMoney: number;
  playerRetirementSavings: number;
  spouseData: SpouseData;
  isFirstMarriage: boolean;
  parentWeddingContribution: number;
}

export interface MarriageResult {
  combinedMoney: number;
  combinedRetirementSavings: number;
  weddingCost: number;
  spouseLoansToAdd: SpouseLoan[];
  playerOriginalMoney: number;
  playerOriginalSavings: number;
  spouseOriginalMoney: number;
  spouseOriginalSavings: number;
  spouseOriginalLoans: number;
}

/**
 * Execute marriage: combine finances, calculate wedding cost.
 * Req 14A.23-26
 */
export function executeMarriage(input: MarriageInput): MarriageResult {
  const { playerMoney, playerRetirementSavings, spouseData, isFirstMarriage, parentWeddingContribution } = input;

  // Wedding cost: first marriage = $15k minus parent contribution; remarriage = $7.5k, no parent contribution
  const baseWeddingCost = isFirstMarriage ? 15000 : 7500;
  const contribution = isFirstMarriage ? parentWeddingContribution : 0;
  const weddingCost = Math.max(0, baseWeddingCost - contribution);

  // Track originals at time of marriage (for divorce calculations)
  const playerOriginalMoney = playerMoney;
  const playerOriginalSavings = playerRetirementSavings;
  const spouseOriginalMoney = spouseData.money;
  const spouseOriginalSavings = spouseData.retirementSavings;
  const spouseOriginalLoans = spouseData.loans.reduce((sum, l) => sum + l.currentBalance, 0);

  // Combine finances
  const combinedMoney = playerMoney + spouseData.money - weddingCost;
  const combinedRetirementSavings = playerRetirementSavings + spouseData.retirementSavings;

  return {
    combinedMoney,
    combinedRetirementSavings,
    weddingCost,
    spouseLoansToAdd: spouseData.loans,
    playerOriginalMoney,
    playerOriginalSavings,
    spouseOriginalMoney,
    spouseOriginalSavings,
    spouseOriginalLoans,
  };
}

// ─── Marriage Compatibility ───────────────────────────────────────────────────

export interface CompatibilityInput {
  year: number;
  debtStressHistory: boolean[]; // last 2 years: true = had debt stress
  familyActionHistory: number[]; // last 2 years: count of family actions
  hasKidsUnder18: boolean;
  currentStress: number; // 0-100
  compassion: number; // 0-100
  patience: number; // 0-100
  stressTolerance: number; // 0-100
  communication: number; // 0-100
}

/**
 * Calculate annual marriage compatibility score.
 * Req 14B.1-9
 */
export function calculateMarriageCompatibility(input: CompatibilityInput): number {
  let score = 0;

  // +2 if no debt stress for past 2 years
  const last2DebtStress = input.debtStressHistory.slice(-2);
  if (last2DebtStress.length >= 2 && last2DebtStress.every((s) => !s)) {
    score += 2;
  }

  // +1 if stress < 90%
  if (input.currentStress < 90) {
    score += 1;
  }

  // Family actions
  const last2FamilyActions = input.familyActionHistory.slice(-2);
  const totalFamilyActions = last2FamilyActions.reduce((sum, n) => sum + n, 0);

  if (input.hasKidsUnder18) {
    // +2 if at least 1 family action in past 2 years
    if (totalFamilyActions >= 1) score += 2;
  } else {
    // +2 if at least 2 family actions in past 2 years
    if (totalFamilyActions >= 2) score += 2;
  }

  // Trait bonuses
  if (input.compassion >= 80) score += 1;
  if (input.patience >= 80) score += 1;
  if (input.stressTolerance >= 60) score += 1;
  if (input.communication >= 80) score += 2;

  return score;
}

/**
 * Apply annual marriage trait gains (1%/yr to communication, compassion, patience; max 20% total).
 * Req 14A.29-30
 */
export function applyMarriageTraitGains(
  traits: { communication: number; compassion: number; patience: number },
  compat: MarriageCompatibilityRecord,
): {
  communication: number;
  compassion: number;
  patience: number;
  updatedCompat: MarriageCompatibilityRecord;
} {
  const MAX_GAIN_PER_TRAIT = 20;

  // Each trait has its own independent 20% cap
  const commGain = compat.communicationGained < MAX_GAIN_PER_TRAIT ? 1 : 0;
  const compGain = compat.compassionGained < MAX_GAIN_PER_TRAIT ? 1 : 0;
  const patGain = compat.patienceGained < MAX_GAIN_PER_TRAIT ? 1 : 0;

  return {
    communication: Math.min(100, traits.communication + commGain),
    compassion: Math.min(100, traits.compassion + compGain),
    patience: Math.min(100, traits.patience + patGain),
    updatedCompat: {
      ...compat,
      totalYearsMarried: compat.totalYearsMarried + 1,
      communicationGained: compat.communicationGained + commGain,
      compassionGained: compat.compassionGained + compGain,
      patienceGained: compat.patienceGained + patGain,
    },
  };
}

// ─── Divorce ──────────────────────────────────────────────────────────────────

export interface DivorceSettlementInput {
  currentMoney: number;
  currentRetirementSavings: number;
  currentLoanBalance: number; // total current loan balance
  playerOriginalMoney: number;
  spouseOriginalMoney: number;
  playerOriginalSavings: number;
  spouseOriginalSavings: number;
  playerOriginalLoans: number;
  spouseOriginalLoans: number;
}

export interface DivorceSettlementResult {
  playerMoney: number;
  playerRetirementSavings: number;
  playerLoanBalance: number;
  stressAdded: number;
}

/**
 * Calculate divorce settlement.
 * Formula: (current - playerOriginal - spouseOriginal) / 2 + playerOriginal
 * Req 14B.16-19
 */
export function calculateDivorceSettlement(input: DivorceSettlementInput): DivorceSettlementResult {
  const {
    currentMoney,
    currentRetirementSavings,
    currentLoanBalance,
    playerOriginalMoney,
    spouseOriginalMoney,
    playerOriginalSavings,
    spouseOriginalSavings,
    playerOriginalLoans,
    spouseOriginalLoans,
  } = input;

  const playerMoney =
    (currentMoney - playerOriginalMoney - spouseOriginalMoney) / 2 + playerOriginalMoney;

  const playerRetirementSavings =
    (currentRetirementSavings - playerOriginalSavings - spouseOriginalSavings) / 2 + playerOriginalSavings;

  const playerLoanBalance =
    (currentLoanBalance - playerOriginalLoans - spouseOriginalLoans) / 2 + playerOriginalLoans;

  return {
    playerMoney: Math.max(0, playerMoney),
    playerRetirementSavings: Math.max(0, playerRetirementSavings),
    playerLoanBalance: Math.max(0, playerLoanBalance),
    stressAdded: 10,
  };
}

// ─── Try for Child ────────────────────────────────────────────────────────────

export interface TryForChildInput {
  playerAge: number;
}

export interface TryForChildResult {
  success: boolean;
  stressAdded: number;
}

/**
 * Attempt to have a child. Player must be <= 45.
 * Probability-based success using a 5-sided die (roll 1-3 = success, 4-5 = fail).
 * Req 14.5-6
 */
export function tryForChild(input: TryForChildInput): TryForChildResult {
  if (input.playerAge > 45) {
    return { success: false, stressAdded: 0 };
  }

  // Probability: roll 5-sided die, success on 1-3 (60% chance)
  const roll = rollDie(5);
  const success = roll <= 3;

  return {
    success,
    stressAdded: success ? 0 : 2,
  };
}

// ─── Adoption ─────────────────────────────────────────────────────────────────

export type AdoptionAgeGroup = '0-2' | '3-9' | '10-17';

export interface AdoptionEligibilityInput {
  ageGroup: AdoptionAgeGroup;
  playerAge: number;
  playerStress: number; // 0-100
}

export interface AdoptionEligibilityResult {
  eligible: boolean;
  reasons: string[];
}

/**
 * Check adoption eligibility requirements.
 * Req 14C.6-9, 14-15, 18-19
 */
export function checkAdoptionEligibility(input: AdoptionEligibilityInput): AdoptionEligibilityResult {
  const { ageGroup, playerAge, playerStress } = input;
  const reasons: string[] = [];

  if (ageGroup === '0-2') {
    if (playerStress > 50) reasons.push('Stress must be <= 50% to adopt age 0-2');
    if (playerAge > 42) reasons.push('Player age must be <= 42 to adopt age 0-2');
  } else if (ageGroup === '3-9') {
    if (playerStress > 60) reasons.push('Stress must be <= 60% to adopt age 3-9');
    if (playerAge > 50) reasons.push('Player age must be <= 50 to adopt age 3-9');
  } else if (ageGroup === '10-17') {
    if (playerStress > 60) reasons.push('Stress must be <= 60% to adopt age 10-17');
    if (playerAge > 55) reasons.push('Player age must be <= 55 to adopt age 10-17');
  }

  return { eligible: reasons.length === 0, reasons };
}

/**
 * Calculate the year a child becomes available for adoption.
 * Age 0-2: left-skewed 1-5 years from current year.
 * Age 3-9 and 10-17: same year (current year).
 * Req 14C.8-10, 16, 20
 */
export function calculateAdoptionAvailableYear(
  ageGroup: AdoptionAgeGroup,
  currentYear: number,
): number {
  if (ageGroup === '0-2') {
    // Left-skewed 1-5 years (values cluster near 5)
    const yearsAway = Math.round(leftSkewed(1, 5));
    return currentYear + Math.max(1, Math.min(5, yearsAway));
  }
  // Age 3-9 and 10-17: available same year
  return currentYear;
}

/**
 * Generate a random child age within the given age group.
 */
export function generateChildAge(ageGroup: AdoptionAgeGroup): number {
  if (ageGroup === '0-2') return rollDie(3) - 1; // 0, 1, or 2
  if (ageGroup === '3-9') return 3 + rollDie(7) - 1; // 3-9
  return 10 + rollDie(8) - 1; // 10-17
}

// ─── Find Love / Dating App ───────────────────────────────────────────────────

export interface FindLovePreferences {
  minMoney?: number;
  minSalary?: number;
  vehicleId?: string;   // DB id of the preferred vehicle
  housingId?: string;   // DB id of the preferred housing (never 'parent' or 'dorm')
  educationInterest?: string; // major
}

export interface DatingCandidate {
  index: number;
  age: number;
  jobId?: string;
  salary?: number;
  isRetired: boolean;
  educationLevel: 'none' | 'high_school' | 'associates' | 'bachelors' | 'masters' | 'phd';
  educationInterest?: string;
  money: number;
  retirementSavings: number;
  loans: number; // total debt amount
  vehicleId?: string;
  housingId?: string;
  initialCompatibilityScore: number;
  matchesCriteria: string[];
}

export interface FindLoveResult {
  eligible: boolean;
  reasons: string[];
  candidates?: DatingCandidate[];
}

export interface FindLoveNoSelectResult {
  timeBlocksUsed: number;
  lemonsEarned: number;
}

export interface FindLoveMarryResult {
  timeBlocksUsed: number;
  lemonsEarned: number;
  marriageResult: MarriageResult;
  spouseData: SpouseData;
}

/**
 * Validate that a player meets the Find Love eligibility requirements.
 * Req 14A.2-3
 */
export function validateFindLoveEligibility(traits: {
  communication: number;
  compassion: number;
}): { eligible: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const lowSkills: string[] = [];

  if (traits.communication < 50) {
    lowSkills.push('communication');
  }
  if (traits.compassion < 50) {
    lowSkills.push('compassion');
  }

  const lowSkillsMessage: string = lowSkills.length > 1 ? lowSkills.join(' and ') : lowSkills.length > 0 ? lowSkills[0] : '';
  if(lowSkills.length > 0) {
     reasons.push(`You didn't quite make a connection this time, but improving your ${lowSkillsMessage} skills will open up more matches.`)
  }
 
  return { eligible: reasons.length === 0, reasons };
}

/**
 * Calculate the player's portion of the initial compatibility score.
 * Player portion: stress < 90 = +1, compassion >= 80 = +1, patience >= 80 = +1,
 * stressTolerance >= 60 = +1, communication >= 80 = +2 (max 6)
 * Then adds random 0-2 for the candidate's portion.
 * Req 14A.12
 */
export function calculateCandidateCompatibilityScore(
  playerTraits: {
    compassion: number;
    patience: number;
    stressTolerance: number;
    communication: number;
  },
  playerStress: number,
): number {
  let score = 0;
  if (playerStress < 90) score += 1;
  if (playerTraits.compassion >= 80) score += 1;
  if (playerTraits.patience >= 80) score += 1;
  if (playerTraits.stressTolerance >= 60) score += 1;
  if (playerTraits.communication >= 80) score += 2;
  // Candidate random portion: 0-2
  const candidateRandom = Math.floor(Math.random() * 3); // 0, 1, or 2
  return score + candidateRandom;
}

/**
 * Convert a DatingCandidate into a SpouseData object for marriage.
 *
 * - certifications: derived from the job's requirements (e.g. CPR) so the
 *   spouse arrives with whatever certs their job already requires.
 * - hasAccountingExperience: derived from job title so tax-prep fee waiver
 *   applies correctly if the spouse is an accountant.
 * - loanOriginAge: approximated as age 18 (when most people start borrowing),
 *   capped so it's never greater than the candidate's current age.
 *
 * Req 14A.16
 */
export function buildSpouseFromCandidate(
  candidate: DatingCandidate,
  jobCertifications: string[] = [],
  jobTitle?: string,
): SpouseData {
  // Loan origin: approximate start of borrowing (college start ~18), never > current age
  const loanOriginAge = Math.min(18, candidate.age);

  const loans: SpouseLoan[] =
    candidate.loans > 0
      ? [
          {
            principal: candidate.loans,
            currentBalance: candidate.loans,
            interestRate: 0.08,
            minimumPayment: Math.ceil(candidate.loans * 0.05),
            originAge: loanOriginAge,
          },
        ]
      : [];

  // Spouse already holds whatever certs their job requires
  const certifications = [...jobCertifications];

  // Accounting experience waives tax-prep fee (Req 6.11)
  const hasAccountingExperience = !!jobTitle && /account/i.test(jobTitle);

  return {
    age: candidate.age,
    jobId: candidate.jobId ?? null,
    salary: candidate.salary ?? 0,
    isJobPartTime: false,
    educationProgramId: null,
    isEduPartTime: false,
    vehicleId: candidate.vehicleId ?? null,
    housingId: candidate.housingId ?? null,
    loans,
    money: candidate.money,
    retirementSavings: candidate.retirementSavings,
    isRetired: candidate.isRetired,
    certifications,
    hasAccountingExperience,
    originalMoney: candidate.money,
    originalSavings: candidate.retirementSavings,
    originalLoans: candidate.loans,
  };
}
