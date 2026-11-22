import type { ActionRequirements, ActionRow, PlayerForEligibility } from './actions';

export const MENTAL_HEALTH_DAY = 'Take a Mental Health Day';
export const SCHOOL_YEAR_JOBS = new Set(['Teacher', 'Professor', 'Principal', 'Dean', 'School Counselor']);

export interface ActionBlockSplit {
  activityBlocks: number;
  ptoBlocks: number;
  unpaidBlocks: number;
  schoolBreakBlocks: number;
}

export function schoolBreakAllowance(jobs: { title: string; isSeasonal: boolean }[], isStudent: boolean): number {
  const worksSummer = jobs.some((job) => job.isSeasonal);
  const worksSchoolYear = jobs.some((job) => !job.isSeasonal);
  const studentAllowance = isStudent ? 6 - (worksSummer ? 4 : 0) - (worksSchoolYear ? 2 : 0) : 0;
  const teachingAllowance = jobs.some((job) => !job.isSeasonal && SCHOOL_YEAR_JOBS.has(job.title)) ? 6 : 0;
  return Math.max(studentAllowance, teachingAllowance);
}

export function remainingActionTime(capacity: number, breakAllowance: number, activityUsed: number, breakUsed: number) {
  // Breaks are carved out of free time, not added to it. If a schedule changes
  // midyear, already-spent regular blocks can never be reclaimed as breaks.
  const remaining = Math.max(0, capacity - activityUsed - breakUsed);
  const schoolBreakBlocks = Math.min(remaining, Math.max(0, breakAllowance - breakUsed));
  return { activityBlocks: remaining - schoolBreakBlocks, schoolBreakBlocks };
}

export function validateTimeOff(action: ActionRow, player: Pick<PlayerForEligibility, 'isRetired' | 'employments' | 'educations'>, split: ActionBlockSplit): string[] {
  const { activityBlocks, ptoBlocks, unpaidBlocks, schoolBreakBlocks } = split;
  const total = activityBlocks + ptoBlocks + unpaidBlocks + schoolBreakBlocks;
  const errors: string[] = [];
  const mentalHealthDay = action.name === MENTAL_HEALTH_DAY;
  if (!action.allowsPTO && (ptoBlocks || unpaidBlocks)) errors.push(`${action.name}: cannot use paid or unpaid leave`);
  if (mentalHealthDay && (schoolBreakBlocks || activityBlocks)) errors.push(`${action.name}: use paid PTO or unpaid leave`);
  const reqs = (action.requirements ?? {}) as ActionRequirements;
  const exempt = player.isRetired || (!player.employments.some((e) => e.isActive) &&
    !player.educations.some((e) => e.isActive && !e.graduated));
  const required = reqs.ptoOrUnpaidTimeBlocks ?? (mentalHealthDay || reqs.hasPTOOrUnpaidTimeBlocks || reqs.hasPTODaysAvailable || action.requiresPTO ? action.minTimeBlocks : 0);
  const qualifying = reqs.hasPTODaysAvailable ? ptoBlocks : ptoBlocks + unpaidBlocks + (mentalHealthDay ? 0 : schoolBreakBlocks);
  if ((!exempt || mentalHealthDay) && qualifying < required) {
    errors.push(`${action.name}: requires ${required} time-off block${required === 1 ? '' : 's'}`);
  }
  if (total < action.minTimeBlocks || (action.maxTimeBlocks !== null && total > action.maxTimeBlocks)) {
    errors.push(`${action.name}: invalid number of time blocks`);
  }
  return errors;
}

export function unpaidLeavePay(salary: number, fullTimeBlocks: number, isPartTime: boolean, unpaidBlocks: number): number {
  const scheduled = isPartTime ? Math.ceil(fullTimeBlocks / 2) : fullTimeBlocks;
  return scheduled > 0 ? (salary * (isPartTime ? 0.5 : 1) / scheduled) * unpaidBlocks : 0;
}

export function annualEmploymentPay(salary: number, isPartTime: boolean, isSeasonal: boolean): number {
  return salary * (isPartTime ? 0.5 : 1) * (isSeasonal ? 0.25 : 1);
}
