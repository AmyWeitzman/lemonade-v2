import { Prisma } from '@prisma/client';
import type { ActionRow } from './actions';
import { prisma } from './prisma';
import { calculateDivorceSettlement, type SpouseData } from './relationships';
import { calculateChildcareTimeBlocks, CHILDCARE_COSTS, type ChildcarePlan } from './timeBlocks';

export const DIVORCE_ACTION = 'Get Divorced';
const tiers = [
  { blocks: 3, cost: 100_000 }, { blocks: 2, cost: 20_000 },
  { blocks: 1, cost: 10_000 }, { blocks: 1, cost: 500 },
];

export function divorceTerms(score: number | undefined) {
  return score !== undefined && Number.isInteger(score) && score >= 0 && score <= 3 ? tiers[score] : null;
}

type DivorcePlayer = {
  id: string;
  maritalStatus: string;
  spouse: unknown;
  divorceEffectiveYear: number | null;
  divorceKeepSpouseVehicle: boolean;
  vehicleOwnerships?: { endAge: number | null; isSpouseVehicle: boolean }[];
  children: { age: number }[];
  employments: { isActive: boolean; isPartTime: boolean }[];
  educations: { isActive: boolean; isPartTime: boolean; graduated: boolean }[];
  childcarePlan: string;
};

function childcareImpact(player: DivorcePlayer, ages: { age: number }[]) {
  const spouse = player.spouse as SpouseData;
  const plan = player.childcarePlan as ChildcarePlan;
  const input = {
    children: ages,
    childcarePlan: plan,
    playerJobs: player.employments.filter((e) => e.isActive),
    playerEducations: player.educations.filter((e) => e.isActive && !e.graduated),
    spouseJobIsPartTime: spouse.isJobPartTime,
    spouseEduIsPartTime: spouse.isEduPartTime,
  };
  const singleParent = { ...input, spouseJobId: null, spouseEducationProgramId: null };
  const beforeCareBlocks = calculateChildcareTimeBlocks({ ...input, spouseJobId: spouse.jobId, spouseEducationProgramId: spouse.educationProgramId });
  const afterCareBlocks = calculateChildcareTimeBlocks(singleParent);
  const minorCount = ages.filter((c) => c.age < 18).length;
  const equivalentPlan = afterCareBlocks > beforeCareBlocks
    ? (Object.keys(CHILDCARE_COSTS) as ChildcarePlan[])
      .filter((candidate) => calculateChildcareTimeBlocks({ ...singleParent, childcarePlan: candidate }) <= beforeCareBlocks)
      .sort((a, b) => CHILDCARE_COSTS[a] - CHILDCARE_COSTS[b])[0]
    : undefined;
  return {
    beforeCareBlocks,
    afterCareBlocks,
    annualChildcareAtCurrentPlan: (CHILDCARE_COSTS[plan] ?? 0) * minorCount,
    annualChildcareToKeepCareTime: equivalentPlan === undefined ? null : CHILDCARE_COSTS[equivalentPlan] * minorCount,
    spouseIncomeRemoved: spouse.salary,
  };
}

export async function getDivorceQuote(
  player: DivorcePlayer,
  year: number,
  loadScore: (id: string) => Promise<{ yearlyScores: unknown; currentScore: number } | null> =
    (id) => prisma.marriageCompatibility.findUnique({ where: { playerId: id } }),
) {
  if (player.maritalStatus !== 'married' || !player.spouse) return { reason: 'You must be married.' } as const;
  if (player.divorceEffectiveYear !== null) return { reason: `Your divorce is already scheduled for year ${player.divorceEffectiveYear + 1}.` } as const;
  const record = await loadScore(player.id);
  if (!record || !Object.keys((record.yearlyScores ?? {}) as object).length) {
    return { reason: 'A yearly marriage compatibility score is not available yet.' } as const;
  }
  const terms = divorceTerms(record.currentScore);
  if (!terms) return { reason: 'Requires a marriage compatibility score of 3 or lower.' } as const;
  return { ...terms, score: record.currentScore, effectiveYear: year + 1,
    canChooseVehicle: !!player.vehicleOwnerships?.some((v) => v.endAge === null && v.isSpouseVehicle)
      && player.vehicleOwnerships.some((v) => v.endAge === null && !v.isSpouseVehicle),
    ...childcareImpact(player, player.children.map(({ age }) => ({ age: age + 1 }))) };
}

export type DivorceQuote = Awaited<ReturnType<typeof getDivorceQuote>>;

export function quoteDivorceAction(action: ActionRow, quote: DivorceQuote): ActionRow {
  if (action.name !== DIVORCE_ACTION) return action;
  return 'reason' in quote ? action : {
    ...action, minTimeBlocks: quote.blocks, maxTimeBlocks: quote.blocks, cost: quote.cost, costFormula: 'none',
    frequency: 'once_per_year', effects: {},
    ...(quote.canChooseVehicle ? { userInput: { type: 'dropdown', label: 'Which vehicle will you keep?', options: [
      { value: 'keep_yours', label: 'Keep my vehicle' },
      { value: 'keep_spouse', label: 'Keep my spouse’s vehicle' },
    ] } } : {}),
  };
}

export async function finalizeScheduledDivorce(player: DivorcePlayer & { age: number }, newYear: number) {
  if (player.divorceEffectiveYear === null || player.divorceEffectiveYear > newYear || !player.spouse) return null;
  const spouse = player.spouse as SpouseData;
  const impact = childcareImpact(player, player.children.map(({ age }) => ({ age: age + 1 })));
  return prisma.$transaction(async (tx) => {
    const claim = await tx.player.updateMany({
      where: { id: player.id, divorceEffectiveYear: player.divorceEffectiveYear, maritalStatus: 'married' },
      data: { divorceEffectiveYear: null, divorceKeepSpouseVehicle: false, maritalStatus: 'divorced', spouse: Prisma.JsonNull },
    });
    if (!claim.count) return null;
    const current = await tx.player.findUniqueOrThrow({ where: { id: player.id } });
    const loans = await tx.loan.findMany({ where: { playerId: player.id, currentBalance: { gt: 0 } } });
    const retained = loans.filter((loan) => loan.owner !== 'spouse' || loan.isJoint);
    const loanBalance = loans.reduce((sum, loan) => sum + loan.currentBalance, 0);
    const retainedBalance = retained.reduce((sum, loan) => sum + loan.currentBalance, 0);
    const settlement = calculateDivorceSettlement({
      currentMoney: current.money, currentRetirementSavings: current.retirementSavings,
      currentLoanBalance: loanBalance,
      playerOriginalMoney: spouse.playerOriginalMoney ?? 0, spouseOriginalMoney: spouse.originalMoney ?? 0,
      playerOriginalSavings: spouse.playerOriginalSavings ?? 0, spouseOriginalSavings: spouse.originalSavings ?? 0,
      playerOriginalLoans: spouse.playerOriginalLoans ?? retained.filter((l) => !l.isJoint).reduce((sum, l) => sum + l.currentBalance, 0),
      spouseOriginalLoans: spouse.originalLoans ?? 0,
    });
    const playerShare = retainedBalance ? retained : loans.slice(0, 1);
    if (!playerShare.length) settlement.playerLoanBalance = 0;
    const shareIds = playerShare.map((l) => l.id);
    await tx.loan.deleteMany({ where: { playerId: player.id, OR: [{ owner: 'spouse' }, { isJoint: true }], id: { notIn: shareIds } } });
    for (const loan of playerShare) {
      const balance = settlement.playerLoanBalance * (retainedBalance ? loan.currentBalance / retainedBalance : 1);
      await tx.loan.update({ where: { id: loan.id }, data: { owner: 'player', isJoint: false, currentBalance: balance, minimumPayment: balance * 0.05 } });
    }
    const vehicles = await tx.vehicleOwnership.findMany({ where: { playerId: player.id, endAge: null }, include: { vehicle: true }, orderBy: { createdAt: 'asc' } });
    const keep = vehicles.find((v) => v.isSpouseVehicle === player.divorceKeepSpouseVehicle) ?? vehicles[0];
    if (keep?.isSpouseVehicle && player.divorceKeepSpouseVehicle) {
      await tx.vehicleOwnership.updateMany({ where: { playerId: player.id, endAge: null, isSpouseVehicle: false }, data: { endAge: player.age + 1 } });
    }
    if (keep?.isSpouseVehicle) await tx.vehicleOwnership.update({ where: { id: keep.id }, data: { isSpouseVehicle: false } });
    await tx.vehicleOwnership.updateMany({ where: { playerId: player.id, endAge: null, isSpouseVehicle: true }, data: { endAge: player.age + 1 } });
    const state = await tx.player.update({ where: { id: player.id }, data: {
      money: settlement.playerMoney, retirementSavings: settlement.playerRetirementSavings,
    } });
    const familySize = 1 + player.children.filter((c) => c.age + 1 < 18).length;
    const vehicleReview = !keep || (keep.vehicle.passengerCapacity > 0 && keep.vehicle.passengerCapacity < familySize);
    return { state, settlement, impact, vehicleReview };
  });
}
