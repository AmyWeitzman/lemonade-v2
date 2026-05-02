/**
 * Job-related types for the frontend.
 * Requirements: Req 11
 */

export interface JobBenefits {
  canBeSecondJob?: boolean;
  freeGymMembership?: boolean;
  waivesTaxPrepFee?: boolean;
  autoMaintenanceDiscountPct?: number;
  shoppingDiscountPct?: number;
  travelTickets?: { count: number; discountPct: number };
  incomePerTimeBlock?: number;
  baseTips?: number;
  tipsPerSkillAvg5pct?: number;
  pestDiscountPct?: number;
  plumbingDiscountPct?: number;
  electricalDiscountPct?: number;
  housingRepairDiscountPct?: number;
  ptoAfterYr1?: number;
  ptoAfterYr3?: number;
  ptoAfterYr16?: number;
  ptoIncreasePer10yrs?: number;
  eveningShift?: boolean;
  rollsOverYrToYr?: boolean;
  [key: string]: unknown;
}

export interface JobItem {
  id: string;
  title: string;
  requirements: Record<string, unknown>;
  baseSalary: number;
  raiseSchedule: Record<string, unknown>;
  timeBlocks: number;
  stressLevel: number;
  ptoTimeBlocks: number;
  unpaidTimeOff?: number;
  fullTime: boolean;
  partTime: boolean;
  seasonal: boolean;
  benefits: JobBenefits;
  annualGains: Record<string, number>;
  location: 'city' | 'suburb' | 'both';
  hasPension: boolean;
  easeOfGetting: number;
  // Annotated by backend
  eligible: boolean;
  eligibilityReasons: string[];
  alreadyEmployed: boolean;
  bikeBlocked: boolean;
}

export interface ActiveEmployment {
  id: string;
  jobId: string;
  jobTitle: string;
  currentSalary: number;
  yearsOfService: number;
  ptoRemaining: number;
  isPartTime: boolean;
  isSeasonal: boolean;
  startAge: number;
}

export interface JobFilters {
  search: string;
  minSalary: number | null;
  maxSalary: number | null;
  minPto: number | null;
  maxTimeBlocks: number | null;
  maxStress: number | null;
  location: 'city' | 'suburb' | 'both' | '';
  partTimeOnly: boolean;
  fullTimeOnly: boolean;
  seasonal: boolean | null;
  hasPension: boolean;
  eligibleOnly: boolean;
  showAll: boolean;
  sort: 'salary_asc' | 'salary_desc' | 'stress_asc' | 'time_blocks_asc' | 'pto_desc' | '';
}
