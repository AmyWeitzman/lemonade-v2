import { prisma } from './prisma';
import { remainingActionTime, schoolBreakAllowance } from './actionTime';
import { calculateTimeBlocks, type ChildcarePlan, type PlayerTimeBlockInput } from './timeBlocks';

type Employment = Omit<PlayerTimeBlockInput['employments'][number], 'chosenLocation'> & {
  chosenLocation?: string;
  isSeasonal: boolean;
  ptoRemaining: number;
  unpaidTimeOffRemaining: number;
  job: { title: string; timeBlocks: number };
};

export interface BudgetPlayer {
  id: string;
  location: string;
  childcarePlan: string;
  spouse: unknown;
  housingOwnerships: { endAge: number | null; housing: { type: string } }[];
  employments: Employment[];
  educations: PlayerTimeBlockInput['educations'];
  children: PlayerTimeBlockInput['children'];
  pets: PlayerTimeBlockInput['pets'];
}

export async function getActionTimeBudget(player: BudgetPlayer, year: number) {
  const { _sum } = await prisma.actionHistory.aggregate({
    where: { playerId: player.id, year },
    _sum: { activityBlocks: true, schoolBreakBlocks: true, ptoBlocks: true, unpaidBlocks: true },
  });
  const active = player.employments.filter((e) => e.isActive);
  const paidUsed = _sum.ptoBlocks ?? 0;
  const unpaidUsed = _sum.unpaidBlocks ?? 0;
  const usedActivity = _sum.activityBlocks ?? 0;
  const usedBreak = _sum.schoolBreakBlocks ?? 0;
  const base = calculateTimeBlocks({
    ...player,
    playerHousingLocation: player.location,
    playerHousingType: player.housingOwnerships.find((h) => h.endAge === null)?.housing.type,
    childcarePlan: player.childcarePlan as ChildcarePlan,
    spouse: player.spouse as PlayerTimeBlockInput['spouse'],
    employments: active.map((e) => ({
      ...e,
      chosenLocation: e.chosenLocation ?? player.location,
      job: { timeBlocks: e.isSeasonal ? Math.ceil(e.job.timeBlocks / 4) : e.job.timeBlocks },
    })),
  });
  // Direct action PTO is already spent. Standalone PTO converted to activity by
  // the PTO route remains in the general activity budget until used.
  const capacity = Math.max(0, base.activities - Math.min(base.ptoUsed, paidUsed));
  const allowance = schoolBreakAllowance(
    active.map((e) => ({ title: e.job.title, isSeasonal: e.isSeasonal })),
    player.educations.some((e) => e.isActive && !e.graduated),
  );
  return {
    ...remainingActionTime(capacity, allowance, usedActivity, usedBreak),
    ptoBlocks: active.reduce((sum, e) => sum + e.ptoRemaining, 0),
    unpaidBlocks: active.reduce((sum, e) => sum + (e.isSeasonal ? 0 : e.unpaidTimeOffRemaining), 0),
    usedActivity, usedBreak, paidUsed, unpaidUsed,
    breakdown: { ...base, work: Math.max(0, base.work - unpaidUsed), activities: base.activities + Math.min(base.work, unpaidUsed) },
  };
}
