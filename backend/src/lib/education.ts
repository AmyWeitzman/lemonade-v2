/**
 * Education System — Core Logic
 *
 * Pure/deterministic functions for education eligibility, progress, and graduation.
 * No DB calls — callers persist changes.
 *
 * Requirements: Req 10, Req 33
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EduRequirements {
  skills?: Record<string, number>;
  traits?: Record<string, number>;
  certifications?: string[];
  educationIds?: string[];           // prerequisite program IDs
  workExperienceAlternative?: { years: number; type?: string; jobTitle?: string };
  educationOptions?: Array<{
    programId: string;
    workExperienceRequired?: { years: number; jobTitle: string };
  }>;
  skillsOr?: Array<Record<string, number>>;
}

export interface EduGraduationRequirements {
  skills?: Record<string, number>;
}

export interface EduProgramRow {
  id: string;
  name: string;
  type: string;
  field: string;
  requirements: EduRequirements;
  graduationRequirements: EduGraduationRequirements;
  tuitionFullTime: number;
  tuitionPartTime: number | null;
  totalCredits: { generalEducation: number; field: number; major: number };
  skillGains: { automatic: Record<string, number>; major: Record<string, number> };
  isStem: boolean;
  partTimeAllowed: boolean;
  grantsOnGraduation: string[];
}

export interface CreditsCompleted {
  generalEducation: number;
  field: number;
  major: number;
}

export interface PlayerForEduEligibility {
  age: number;
  health: number;
  skills: Record<string, number>;
  traits: Record<string, number>;
  certifications: unknown; // string[] stored as JSON
  educations: Array<{
    programId: string;
    isActive: boolean;
    graduated: boolean;
    program: { field: string; type: string };
  }>;
  employments: Array<{
    isActive: boolean;
    yearsOfService: number;
    isPartTime: boolean;
    job: { title: string };
  }>;
}

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMinRequired(req: number | number[]): number {
  if (Array.isArray(req)) return req[0] ?? 0;
  return req;
}

// ─── checkEduEligibility ──────────────────────────────────────────────────────

/**
 * Check whether a player meets all requirements to enroll in an education program.
 */
export function checkEduEligibility(
  program: EduProgramRow,
  player: PlayerForEduEligibility,
): EligibilityResult {
  const reasons: string[] = [];
  const reqs = program.requirements;

  // Already enrolled in this program?
  const alreadyEnrolled = player.educations.some(
    (e) => e.programId === program.id && e.isActive,
  );
  if (alreadyEnrolled) {
    reasons.push('You are already enrolled in this program');
    return { eligible: false, reasons };
  }

  // Already graduated from this program?
  const alreadyGraduated = player.educations.some(
    (e) => e.programId === program.id && e.graduated,
  );
  if (alreadyGraduated) {
    reasons.push('You have already graduated from this program');
    return { eligible: false, reasons };
  }

  // Part-time check
  // (caller passes isPartTime; we just validate partTimeAllowed)

  // Skill requirements
  if (reqs.skills) {
    for (const [skill, req] of Object.entries(reqs.skills)) {
      const minVal = getMinRequired(req);
      const playerVal = player.skills[skill] ?? player.traits[skill] ?? 0;
      if (playerVal < minVal) {
        reasons.push(`${skill} must be >= ${minVal}% (you have ${playerVal.toFixed(0)}%)`);
      }
    }
  }

  // Trait requirements (some programs store traits under skills key)
  if (reqs.traits) {
    for (const [trait, req] of Object.entries(reqs.traits)) {
      const minVal = getMinRequired(req);
      const playerVal = player.traits[trait] ?? 0;
      if (playerVal < minVal) {
        reasons.push(`${trait} must be >= ${minVal}% (you have ${playerVal.toFixed(0)}%)`);
      }
    }
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

  // Prerequisite degree requirements (simple list)
  if (reqs.educationIds && reqs.educationIds.length > 0) {
    const graduatedIds = player.educations.filter((e) => e.graduated).map((e) => e.programId);
    const hasPrereq = reqs.educationIds.some((id) => graduatedIds.includes(id));

    // Work experience alternative
    let meetsWorkAlt = false;
    if (reqs.workExperienceAlternative) {
      const { years, type } = reqs.workExperienceAlternative;
      const totalYears = player.employments
        .filter((e) => type === 'fullTime' ? !e.isPartTime : true)
        .reduce((sum, e) => sum + e.yearsOfService, 0);
      if (totalYears >= years) meetsWorkAlt = true;
    }

    if (!hasPrereq && !meetsWorkAlt) {
      if (reqs.workExperienceAlternative) {
        reasons.push(
          `Requires prerequisite degree OR ${reqs.workExperienceAlternative.years} years of full-time work experience`,
        );
      } else {
        reasons.push('Required prerequisite degree not completed');
      }
    }
  }

  // Complex education options (e.g. Astronaut Academy)
  if (reqs.educationOptions && reqs.educationOptions.length > 0) {
    const graduatedIds = player.educations.filter((e) => e.graduated).map((e) => e.programId);
    const meetsOption = reqs.educationOptions.some((opt) => {
      if (!graduatedIds.includes(opt.programId)) return false;
      if (opt.workExperienceRequired) {
        const { years, jobTitle } = opt.workExperienceRequired;
        const job = player.employments.find((e) => e.job.title === jobTitle);
        return job && job.yearsOfService >= years;
      }
      return true;
    });

    // Work experience alternative for skillsOr
    let meetsWorkAlt = false;
    if (reqs.workExperienceAlternative) {
      const { years, jobTitle } = reqs.workExperienceAlternative;
      if (jobTitle) {
        const job = player.employments.find((e) => e.job.title === jobTitle);
        if (job && job.yearsOfService >= years) meetsWorkAlt = true;
      }
    }

    if (!meetsOption && !meetsWorkAlt) {
      reasons.push('Required prerequisite degree/experience not met');
    }
  }

  // skillsOr — player must meet at least one option
  if (reqs.skillsOr && reqs.skillsOr.length > 0) {
    const meetsAny = reqs.skillsOr.some((option) =>
      Object.entries(option).every(([skill, min]) => (player.skills[skill] ?? 0) >= min),
    );
    if (!meetsAny) {
      const descriptions = reqs.skillsOr.map((o) =>
        Object.entries(o)
          .map(([s, v]) => `${s} >= ${v}%`)
          .join(' and '),
      );
      reasons.push(`Must meet one of: ${descriptions.join(' OR ')}`);
    }
  }

  return { eligible: reasons.length === 0, reasons };
}

// ─── calculateAnnualSkillGains ────────────────────────────────────────────────

/**
 * Calculate skill gains for one year of enrollment.
 * Full-time: full gains. Part-time: half gains (rounded to 2 decimal places).
 * Returns combined automatic + major gains.
 */
export function calculateAnnualSkillGains(
  program: EduProgramRow,
  isPartTime: boolean,
): Record<string, number> {
  const gains: Record<string, number> = {};
  const multiplier = isPartTime ? 0.5 : 1;

  const allGains = {
    ...program.skillGains.automatic,
    ...program.skillGains.major,
  };

  for (const [skill, amount] of Object.entries(allGains)) {
    const raw = amount * multiplier;
    gains[skill] = Math.round(raw * 100) / 100; // round to 2 decimal places
  }

  return gains;
}

// ─── checkGraduationRequirements ─────────────────────────────────────────────

/**
 * Check if a player meets graduation requirements for a program.
 * Returns eligible=true if all credit and skill requirements are met.
 */
export function checkGraduationRequirements(
  program: EduProgramRow,
  credits: CreditsCompleted,
  playerSkills: Record<string, number>,
  playerTraits: Record<string, number>,
): { canGraduate: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const required = program.totalCredits;

  if (credits.generalEducation < required.generalEducation) {
    reasons.push(
      `Need ${required.generalEducation} general education credits (have ${credits.generalEducation})`,
    );
  }
  if (credits.field < required.field) {
    reasons.push(`Need ${required.field} field credits (have ${credits.field})`);
  }
  if (credits.major < required.major) {
    reasons.push(`Need ${required.major} major credits (have ${credits.major})`);
  }

  // Skill-based graduation requirements
  const gradReqs = program.graduationRequirements?.skills ?? {};
  for (const [skill, minVal] of Object.entries(gradReqs)) {
    const playerVal = playerSkills[skill] ?? playerTraits[skill] ?? 0;
    if (playerVal < minVal) {
      reasons.push(
        `${skill} must be >= ${minVal}% to graduate (you have ${playerVal.toFixed(0)}%)`,
      );
    }
  }

  return { canGraduate: reasons.length === 0, reasons };
}

// ─── calculateEducationStress ─────────────────────────────────────────────────

/**
 * Education stress is NOT a fixed annual amount — it comes from the schoolwork
 * actions players perform (Attend Classes, Study, Research, etc.).
 * Each action has its own stress value that varies by degree level and STEM vs Humanities.
 *
 * This function returns the stress value for a given schoolwork action,
 * degree type, and whether the program is STEM.
 *
 * Stress values per action (H = Humanities/Fine Arts, S = STEM):
 *
 * Attend Classes:
 *   vocational: 10, associates: H=12/S=16, bachelors: H=16/S=20,
 *   masters: H=5/S=6, police/teaching/firefighter/flight: 20, law: 24, astronaut: 0
 *
 * Study:
 *   associates: H=6/S=8, bachelors: H=8/S=10, masters: H=5/S=6,
 *   police/firefighter/flight: 10, law: 24
 *
 * Complete Coursework:
 *   vocational: 10, associates: H=12/S=16, bachelors: H=16/S=20,
 *   police/firefighter/flight: 20, teaching: 10, law: 12
 *
 * Research:
 *   associates: H=6/S=8, bachelors: H=8/S=10,
 *   masters: H=20/S=22, phd: H=25/S=27
 *
 * Go to Office Hours:
 *   associates: H=3/S=4, bachelors: H=4/S=5, masters: H=10/S=12, law: 12
 *
 * Go to Review Session:
 *   associates: H=3/S=4, bachelors: H=4/S=5, police/firefighter/flight: 10
 *
 * Work on Thesis:
 *   masters: H=20/S=22, law: 12
 *
 * Work on Dissertation / Publish a Paper / Speak at Conference:
 *   phd: dissertation H=25/S=27, paper H=15/S=17, conference H=5/S=7
 *
 * Student Teach:
 *   teaching credential: 30
 *
 * Part-time enrollment halves all stress values (round up).
 */
export type SchoolworkAction =
  | 'attend_classes'
  | 'study'
  | 'complete_coursework'
  | 'student_teach'
  | 'research'
  | 'office_hours'
  | 'review_session'
  | 'work_on_thesis'
  | 'work_on_dissertation'
  | 'publish_paper'
  | 'speak_at_conference';

export function getSchoolworkActionStress(
  action: SchoolworkAction,
  programType: string,
  programField: string,
  isStem: boolean,
  isPartTime: boolean,
): number {
  const H = !isStem; // Humanities / Fine Arts
  let stress = 0;

  const type = programType.toLowerCase();
  const field = programField.toLowerCase();

  // Classify certificate/professional programs by field for stress lookup
  const isLaw = field === 'law';
  const isPolice = field === 'law enforcement';
  const isTeaching = field === 'education' && type === 'certificate';
  const isFirefighter = field === 'fire science';
  const isFlight = field === 'aviation';
  const isAstronaut = field === 'aerospace';
  const isVocational = type === 'vocational';
  const isAssociates = type === 'associates';
  const isBachelors = type === 'bachelors';
  const isMasters = type === 'masters';
  const isPhD = type === 'doctorate';

  switch (action) {
    case 'attend_classes':
      if (isVocational) stress = 10;
      else if (isAssociates) stress = H ? 12 : 16;
      else if (isBachelors) stress = H ? 16 : 20;
      else if (isMasters) stress = H ? 5 : 6;
      else if (isPolice || isTeaching || isFirefighter || isFlight) stress = 20;
      else if (isLaw) stress = 24;
      else if (isAstronaut) stress = 0;
      break;

    case 'study':
      if (isAssociates) stress = H ? 6 : 8;
      else if (isBachelors) stress = H ? 8 : 10;
      else if (isMasters) stress = H ? 5 : 6;
      else if (isPolice || isFirefighter || isFlight) stress = 10;
      else if (isLaw) stress = 24;
      break;

    case 'complete_coursework':
      if (isVocational) stress = 10;
      else if (isAssociates) stress = H ? 12 : 16;
      else if (isBachelors) stress = H ? 16 : 20;
      else if (isPolice || isFirefighter || isFlight) stress = 20;
      else if (isTeaching) stress = 10;
      else if (isLaw) stress = 12;
      break;

    case 'student_teach':
      if (isTeaching) stress = 30;
      break;

    case 'research':
      if (isAssociates) stress = H ? 6 : 8;
      else if (isBachelors) stress = H ? 8 : 10;
      else if (isMasters) stress = H ? 20 : 22;
      else if (isPhD) stress = H ? 25 : 27;
      break;

    case 'office_hours':
      if (isAssociates) stress = H ? 3 : 4;
      else if (isBachelors) stress = H ? 4 : 5;
      else if (isMasters) stress = H ? 10 : 12;
      else if (isLaw) stress = 12;
      break;

    case 'review_session':
      if (isAssociates) stress = H ? 3 : 4;
      else if (isBachelors) stress = H ? 4 : 5;
      else if (isPolice || isFirefighter || isFlight) stress = 10;
      break;

    case 'work_on_thesis':
      if (isMasters) stress = H ? 20 : 22;
      else if (isLaw) stress = 12;
      break;

    case 'work_on_dissertation':
      if (isPhD) stress = H ? 25 : 27;
      break;

    case 'publish_paper':
      if (isPhD) stress = H ? 15 : 17;
      break;

    case 'speak_at_conference':
      if (isPhD) stress = H ? 5 : 7;
      break;
  }

  // Part-time halves stress (round up)
  if (isPartTime && stress > 0) {
    stress = Math.ceil(stress / 2);
  }

  return stress;
}

// ─── isCCToBachelorsSameMajor ─────────────────────────────────────────────────

/**
 * Check if a player qualifies for the CC→Bachelors same-major shortcut.
 * Conditions: player has an associates degree in the same field as the bachelors program.
 * Result: 2-year program (half credits needed), half skill gains.
 */
export function isCCToBachelorsSameMajor(
  bachelorProgram: EduProgramRow,
  playerEducations: Array<{ graduated: boolean; program: { field: string; type: string } }>,
): boolean {
  if (bachelorProgram.type !== 'bachelors') return false;
  return playerEducations.some(
    (e) =>
      e.graduated &&
      e.program.type === 'associates' &&
      e.program.field.toLowerCase() === bachelorProgram.field.toLowerCase(),
  );
}

// ─── getCCShortcutCredits ─────────────────────────────────────────────────────

/**
 * For CC→Bachelors same-major shortcut:
 * Gen Ed and Field credits are already completed (from associates).
 * Only need 2 major credits (half of normal 4-year bachelors).
 */
export function getCCShortcutCredits(program: EduProgramRow): CreditsCompleted {
  return {
    generalEducation: program.totalCredits.generalEducation, // already done
    field: program.totalCredits.field,                       // already done
    major: 0,                                                // still need major credits
  };
}

// ─── checkScholarshipEligibility ─────────────────────────────────────────────

/**
 * Scholarship eligibility and award calculation.
 *
 * Hidden criteria (player is not told what they are):
 *   - perseverance >= 60%
 *   - writing >= 8%
 *   - communication >= 55%
 *
 * If ALL criteria are met, roll a 6-sided die:
 *   1      → $5,000
 *   2 or 3 → $10,000
 *   4 or 5 → $15,000
 *   6      → $20,000
 *
 * Returns 0 if criteria not met.
 */
export function checkScholarshipEligibility(
  playerSkills: Record<string, number>,
  playerTraits: Record<string, number>,
): number {
  const perseverance = playerTraits.perseverance ?? 0;
  const writing = playerSkills.writing ?? 0;
  const communication = playerTraits.communication ?? 0;

  if (perseverance < 60 || writing < 8 || communication < 55) return 0;

  const roll = Math.floor(Math.random() * 6) + 1; // 1–6
  if (roll === 1) return 5000;
  if (roll <= 3) return 10000;
  if (roll <= 5) return 15000;
  return 20000;
}
