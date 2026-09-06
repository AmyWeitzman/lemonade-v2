/**
 * Mandatory annual expenses — the deterministic "what this player owes at year
 * end" calculation. Extracted from routes/finances.ts so the Actions page
 * (recommendations) and the year cycle can forecast a player's finances without
 * duplicating the formula.
 *
 * Requirements: Req 6, Req 12, Req 37, Req 40
 */
import { prisma } from './prisma';
import {
  calculateTaxes,
  calculateTaxPreparationFee,
  applyLoanInterest,
  type TaxBracket,
} from './financials';
import { calculateAnnualVehicleCosts, type VehicleRow } from './vehicles';
import { calculateAnnualHousingCosts, type HousingRow, type HomeImprovement } from './housing';
import { CHILDCARE_COSTS } from './timeBlocks';
import { getJobBenefits } from './jobs';
import { getAccumulatedMultiplier, type InflationRates } from './inflation';

const CPR_RENEWAL_COST = 75;
const CPR_RENEWAL_INTERVAL_YEARS = 2;

export interface SpouseExpenseData {
  jobId?: string | null;
  isJobPartTime?: boolean;
  hasAccountingExperience?: boolean;
  salary?: number;
  educationProgramId?: string | null;
  isEduPartTime?: boolean;
  certifications?: string[];
  spouseCprYear?: number;
  loans?: Array<{ id: string; currentBalance: number; interestRate: number; owner: string; isJoint: boolean }>;
}

/** Minimal player shape the expense engine needs (structurally compatible with the route FullPlayer). */
export interface PlayerForExpenses {
  age: number;
  projectedIncome: number;
  maritalStatus: string;
  spouse: unknown;
  hasHealthInsurance: boolean;
  healthInsuranceType: string;
  hasHomeInsurance: boolean;
  chronicConditions: unknown;
  children: Array<{ age: number }>;
  pets: Array<{ type: string }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  employments: Array<{ job: any }>;
  educations: Array<{
    isPartTime: boolean;
    program: { tuitionFullTime: number; tuitionPartTime: number | null };
  }>;
  housingOwnerships: Array<{
    housing: unknown;
    improvements: unknown;
    isRental: boolean;
  }>;
  vehicleOwnerships: Array<{ vehicle: unknown; yearsOwned: number; isSpouseVehicle: boolean }>;
  loans: Array<{ id: string; currentBalance: number; interestRate: number; owner: string; isJoint: boolean }>;
  childcarePlan?: string;
}

export interface ExpenseSession {
  taxBrackets: unknown;
  currentYear: number;
  inflationRates?: unknown;
}

// ─── Component helpers ───────────────────────────────────────────────────────

function countHousehold(player: PlayerForExpenses): number {
  const kidsUnder18 = player.children.filter((c) => c.age < 18).length;
  const spouseCount = player.maritalStatus === 'married' ? 1 : 0;
  return 1 + spouseCount + kidsUnder18;
}

/** Check if player or spouse has accounting experience (waives tax prep fee). */
function hasAccountingExperience(player: PlayerForExpenses): boolean {
  const playerHas = player.employments.some((e) => {
    const benefits = getJobBenefits(e.job.benefits, e.job);
    return benefits.waivesTaxPrepFee;
  });
  if (playerHas) return true;
  const spouse = player.spouse as SpouseExpenseData | null;
  return spouse?.hasAccountingExperience ?? false;
}

/** Total taxable income: player salary + spouse salary (if married). */
function getTaxableIncome(player: PlayerForExpenses): number {
  const spouse = player.spouse as SpouseExpenseData | null;
  const spouseSalary = player.maritalStatus === 'married' ? (spouse?.salary ?? 0) : 0;
  return player.projectedIncome + spouseSalary;
}

function calculateHealthInsuranceCost(player: PlayerForExpenses, healthcareMult = 1): number {
  if (!player.hasHealthInsurance) return 0;
  if (player.age < 26) return 0; // free on parents' insurance until 26
  const kidsUnder18 = player.children.filter((c) => c.age < 18).length;
  if (player.healthInsuranceType === 'family') {
    return (12000 + kidsUnder18 * 1000 + player.age * 450) * healthcareMult;
  }
  return (6000 + player.age * 300) * healthcareMult;
}

function calculatePetExpenses(player: PlayerForExpenses, generalMult = 1): number {
  const hasVetWaiver = player.employments.some((e) => {
    const benefits = getJobBenefits(e.job.benefits, e.job);
    return benefits.vetFeeWaiver;
  });
  let total = 0;
  for (const pet of player.pets) {
    if (pet.type === 'small') {
      total += 300;
      if (!hasVetWaiver) total += 75;
    } else {
      total += 500;
      if (!hasVetWaiver) total += 1000;
    }
  }
  return total * generalMult;
}

function calculateGroceries(player: PlayerForExpenses, groceriesMult = 1): number {
  const kidsUnder18 = player.children.filter((c) => c.age < 18).length;
  const spouseCount = player.maritalStatus === 'married' ? 1 : 0;
  const householdSize = 1 + spouseCount + kidsUnder18;
  const ratePerPerson = householdSize >= 3 ? 2400 : 3000;
  return ratePerPerson * householdSize * groceriesMult;
}

function calculateChronicConditionCosts(player: PlayerForExpenses, healthcareMult = 1): number {
  const conditions = (player.chronicConditions as string[]) ?? [];
  if (conditions.length === 0) return 0;
  const costPerCondition = player.hasHealthInsurance ? 3000 : 5000;
  return conditions.length * costPerCondition * healthcareMult;
}

function calculateTuition(player: PlayerForExpenses): number {
  let total = 0;
  for (const edu of player.educations) {
    const program = edu.program;
    total += edu.isPartTime
      ? (program.tuitionPartTime ?? program.tuitionFullTime * 0.5)
      : program.tuitionFullTime;
  }
  return total;
}

async function calculateSpouseTuition(spouse: SpouseExpenseData): Promise<number> {
  if (!spouse.educationProgramId) return 0;
  const program = await prisma.educationProgram.findUnique({
    where: { id: spouse.educationProgramId },
  });
  if (!program) return 0;
  return spouse.isEduPartTime
    ? (program.tuitionPartTime ?? program.tuitionFullTime * 0.5)
    : program.tuitionFullTime;
}

function calculateChildcareCosts(player: PlayerForExpenses): number {
  const plan = player.childcarePlan as keyof typeof CHILDCARE_COSTS | undefined;
  if (!plan || plan === ('none' as keyof typeof CHILDCARE_COSTS)) return 0;
  const kidsUnder18 = player.children.filter((c) => c.age < 18).length;
  return CHILDCARE_COSTS[plan] * kidsUnder18;
}

// ─── calculateMandatoryExpenses ──────────────────────────────────────────────

export interface MandatoryExpensesResult {
  housing: number;
  transportation: number;
  healthInsurance: number;
  childcare: number;
  childExpenses: number;
  petExpenses: number;
  groceries: number;
  miscellaneous: number;
  chronicConditions: number;
  tuition: number;
  spouseTuition: number;
  spouseVehicleCosts: number;
  spouseCprRenewal: number;
  taxPrepFee: number;
  taxes: number;
  loanMinPayments: number;
  total: number;
  breakdown: Record<string, number>;
}

export async function calculateMandatoryExpenses(
  player: PlayerForExpenses,
  session: ExpenseSession,
): Promise<MandatoryExpensesResult> {
  const inflationRates = (session.inflationRates as InflationRates[] | undefined) ?? [];
  const generalMult = getAccumulatedMultiplier(inflationRates, 'general');
  const healthcareMult = getAccumulatedMultiplier(inflationRates, 'healthcare');
  const groceriesMult = getAccumulatedMultiplier(inflationRates, 'groceries');

  // Housing
  let housingCost = 0;
  const currentOwnership = player.housingOwnerships[0];
  if (currentOwnership) {
    const housing = currentOwnership.housing as HousingRow;
    const improvements = (currentOwnership.improvements as HomeImprovement[]) ?? [];
    const housingResult = calculateAnnualHousingCosts({
      housing,
      occupants: countHousehold(player),
      isRental: currentOwnership.isRental,
      hasHomeInsurance: player.hasHomeInsurance,
      improvements,
    });
    housingCost = housingResult.total;
  }

  // Transportation — player vehicles only
  let transportationCost = 0;
  for (const vo of player.vehicleOwnerships) {
    if (vo.isSpouseVehicle) continue;
    const isMechanic = player.employments.some((e) => {
      const b = getJobBenefits(e.job.benefits, e.job);
      return b.autoMaintenanceDiscountPct > 0;
    });
    transportationCost += calculateAnnualVehicleCosts(vo.vehicle as VehicleRow, vo.yearsOwned, isMechanic).total;
  }

  // Spouse vehicle costs (tracked separately)
  let spouseVehicleCosts = 0;
  if (player.maritalStatus === 'married') {
    for (const vo of player.vehicleOwnerships) {
      if (!vo.isSpouseVehicle) continue;
      spouseVehicleCosts += calculateAnnualVehicleCosts(vo.vehicle as VehicleRow, vo.yearsOwned, false).total;
    }
  }

  const healthInsurance = calculateHealthInsuranceCost(player, healthcareMult);
  const childcare = calculateChildcareCosts(player);

  const kidsUnder18 = player.children.filter((c) => c.age < 18).length;
  const childExpenses = kidsUnder18 * 11000 * generalMult;
  const petExpenses = calculatePetExpenses(player, generalMult);
  const groceries = calculateGroceries(player, groceriesMult);

  const spouseCount = player.maritalStatus === 'married' ? 1 : 0;
  const miscellaneous = (1 + spouseCount) * 1200 * generalMult;
  const chronicConditions = calculateChronicConditionCosts(player, healthcareMult);
  const tuition = calculateTuition(player);

  let spouseTuition = 0;
  if (player.maritalStatus === 'married') {
    const spouse = player.spouse as SpouseExpenseData | null;
    if (spouse) spouseTuition = await calculateSpouseTuition(spouse);
  }

  let spouseCprRenewal = 0;
  if (player.maritalStatus === 'married') {
    const spouse = player.spouse as SpouseExpenseData | null;
    if (spouse?.certifications?.includes('CPR')) {
      const spouseCprYear = spouse.spouseCprYear;
      if (spouseCprYear !== undefined && session.currentYear - spouseCprYear >= CPR_RENEWAL_INTERVAL_YEARS) {
        spouseCprRenewal = CPR_RENEWAL_COST * generalMult;
      }
    }
  }

  const taxBrackets = (session.taxBrackets as TaxBracket[]) ?? [];
  const income = getTaxableIncome(player);
  const filingStatus = player.maritalStatus === 'married' ? 'married' : 'single';
  const taxes = calculateTaxes({ income, filingStatus, taxBrackets }).totalTax;

  const taxPrepFee =
    calculateTaxPreparationFee({
      age: player.age,
      filingStatus,
      income,
      hasLoans: player.loans.length > 0,
      jobCount: player.employments.length,
      hasAccountingExperience: hasAccountingExperience(player),
    }) * generalMult;

  const loanResults = applyLoanInterest(
    player.loans.map((l) => ({
      id: l.id,
      currentBalance: l.currentBalance,
      interestRate: l.interestRate,
      owner: l.owner,
      isJoint: l.isJoint,
    })),
  );
  const loanMinPayments = loanResults.reduce((sum, l) => sum + l.minimumPayment, 0);

  const total =
    housingCost +
    transportationCost +
    spouseVehicleCosts +
    healthInsurance +
    childcare +
    childExpenses +
    petExpenses +
    groceries +
    miscellaneous +
    chronicConditions +
    tuition +
    spouseTuition +
    spouseCprRenewal +
    taxPrepFee +
    taxes +
    loanMinPayments;

  const breakdown = {
    housing: housingCost,
    transportation: transportationCost,
    spouseVehicleCosts,
    healthInsurance,
    childcare,
    childExpenses,
    petExpenses,
    groceries,
    miscellaneous,
    chronicConditions,
    tuition,
    spouseTuition,
    spouseCprRenewal,
    taxPrepFee,
    taxes,
    loanMinPayments,
  };

  return {
    housing: housingCost,
    transportation: transportationCost,
    healthInsurance,
    childcare,
    childExpenses,
    petExpenses,
    groceries,
    miscellaneous,
    chronicConditions,
    tuition,
    spouseTuition,
    spouseVehicleCosts,
    spouseCprRenewal,
    taxPrepFee,
    taxes,
    loanMinPayments,
    total,
    breakdown,
  };
}

/**
 * Convenience wrapper: fetch a player + their session and return the total
 * mandatory expenses. Used by the Actions-page recommendations and the year
 * cycle, which don't otherwise load the full financial picture.
 */
export async function getMandatoryExpensesTotal(playerId: string): Promise<number> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: {
      loans: true,
      children: true,
      pets: { where: { isAlive: true } },
      employments: { where: { isActive: true }, include: { job: true } },
      educations: { where: { isActive: true }, include: { program: true } },
      housingOwnerships: { where: { endAge: null }, include: { housing: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      vehicleOwnerships: { where: { endAge: null }, include: { vehicle: true } },
    },
  });
  if (!player) return 0;
  const session = await prisma.gameSession.findUnique({
    where: { id: player.gameSessionId },
    select: { taxBrackets: true, currentYear: true, inflationRates: true },
  });
  if (!session) return 0;
  const expenses = await calculateMandatoryExpenses(
    {
      ...(player as unknown as PlayerForExpenses),
      childcarePlan: (player as unknown as { childcarePlan?: string }).childcarePlan,
    },
    session,
  );
  return expenses.total;
}
