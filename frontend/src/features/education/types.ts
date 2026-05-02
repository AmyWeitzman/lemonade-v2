/**
 * Education-related types for the frontend.
 * Requirements: Req 10
 */

export interface EducationProgram {
  id: string;
  name: string;
  type: 'associates' | 'bachelors' | 'masters' | 'doctorate' | 'certificate' | 'vocational' | 'professional';
  field: string;
  isStem: boolean;
  partTimeAllowed: boolean;

  // Costs
  tuitionFullTime: number;
  tuitionPartTime: number | null;

  // Curriculum
  totalCredits: {
    generalEducation: number;
    field: number;
    major: number;
  };

  // Skill gains per year
  skillGains: {
    automatic: Record<string, number>;
    major: Record<string, number>;
  };

  // Stress
  stressLevel: number;

  // Annotated by backend
  eligible: boolean;
  eligibilityReasons: string[];
  durationFT: number;
  durationPT: number | null;
  isShortcut: boolean;
  shortcutDuration: number | null;
  alreadyEnrolled: boolean;
  alreadyGraduated: boolean;
}

export interface ActiveEducation {
  id: string;
  programId: string;
  programName: string;
  programType: string;
  programField: string;
  isPartTime: boolean;
  startAge: number;
  creditsCompleted: {
    generalEducation: number;
    field: number;
    major: number;
  };
  scholarships: Array<{ year: number; amount: number }>;
  parentContributionUsed: number;
  graduated: boolean;
  graduationAge?: number;
  totalCredits: {
    generalEducation: number;
    field: number;
    major: number;
  };
}

export interface EduFilters {
  search: string;
  type: string;
  field: string;
  isStem: boolean | null;
  partTimeOnly: boolean;
  maxTuition: number | null;
  eligibleOnly: boolean;
  sort: 'tuition_asc' | 'tuition_desc' | 'name_asc' | 'duration_asc' | '';
}
