import { PrismaClient } from '@prisma/client';

export async function seedEducationPrograms(prisma: PrismaClient) {
  // Tuition constants (FT per year; PT = FT / 2)
  const T = {
    vocational: 7500,
    associates: 5000,
    bachelors: 15000,
    masters: 30000,
    doctorate: 10000,
  };

  // ── Auto-gains helpers ────────────────────────────────────────────────────
  // Associates & Bachelors: all static per-year values
  const autoCC = { perseverance: 5, organization: 5, math: 1, science: 1, analysis: 3, writing: 6 };
  const autoB  = { perseverance: 5, organization: 5, math: 1, science: 1, analysis: 3, writing: 6 };

  // Masters auto-gains: perseverance is static 5/yr; the rest are totals divided by degree years
  //   Totals: organization=20, analysis=30, writing=20, communication=15
  const autoM = (yrs: number) => ({
    perseverance: 5,
    organization: Math.round(20 / yrs),
    analysis:     Math.round(30 / yrs),
    writing:      Math.round(20 / yrs),
    communication:Math.round(15 / yrs),
  });

  // PhD auto-gains: perseverance=1/yr, organization=1/yr (both static);
  //   communication, analysis, writing are totals divided by degree years (total=50 each)
  const autoPhD = (yrs: number) => ({
    perseverance:  1,
    organization:  1,
    communication: Math.round(50 / yrs),
    analysis:      Math.round(50 / yrs),
    writing:       Math.round(50 / yrs),
  });

  // ── Admission requirements shared by degree level ─────────────────────────
  const reqCC  = { skills: { perseverance: 10, organization: 10, math: 3, science: 3, writing: 3 } };
  const reqB   = { skills: { perseverance: 30, organization: 30, math: 5, science: 5, writing: 5 } };
  const reqM   = { skills: { perseverance: 50, organization: 50, analysis: 20, writing: 30 } };
  const reqPhD = { skills: { perseverance: 70, organization: 70, communication: 50, analysis: 50, writing: 50 } };

  // ── Credits helpers ───────────────────────────────────────────────────────
  // Associates: 1 gen ed + 1 field + 0 major
  // Bachelors:  1 gen ed + 1 field + 2 major
  // Masters:    all major credits (varies by program)
  // PhD:        all major credits (varies by program)
  // Vocational/Certificate: field credits only

  const programs: Array<{
    name: string; type: string; field: string;
    requirements: Record<string, unknown>;
    graduationRequirements: Record<string, unknown>;
    tuitionFullTime: number;
    totalCredits: { generalEducation: number; field: number; major: number };
    skillGains: { automatic: Record<string, number>; major: Record<string, number> };
    isStem: boolean; partTimeAllowed: boolean; grantsOnGraduation: string[];
  }> = [
    // ════════════════════════════════════════════════════════════════════════
    // VOCATIONAL
    // ════════════════════════════════════════════════════════════════════════
    { name: 'Beauty School',                type: 'vocational', field: 'cosmetology',
      requirements: {}, graduationRequirements: {},
      tuitionFullTime: T.vocational, totalCredits: { generalEducation: 0, field: 1, major: 0 },
      skillGains: { automatic: {}, major: { caution: 40, organization: 20 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Automotive Technician School', type: 'vocational', field: 'automotive',
      requirements: {}, graduationRequirements: {},
      tuitionFullTime: T.vocational, totalCredits: { generalEducation: 0, field: 2, major: 0 },
      skillGains: { automatic: {}, major: { organization: 20, caution: 40, homeRepair: 60 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Plumbing Trade School',        type: 'vocational', field: 'plumbing',
      requirements: {}, graduationRequirements: {},
      tuitionFullTime: T.vocational, totalCredits: { generalEducation: 0, field: 2, major: 0 },
      skillGains: { automatic: {}, major: { organization: 20, caution: 30, homeRepair: 60 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Electrician Trade School',     type: 'vocational', field: 'electrical',
      requirements: {}, graduationRequirements: {},
      tuitionFullTime: T.vocational, totalCredits: { generalEducation: 0, field: 1, major: 0 },
      skillGains: { automatic: {}, major: { caution: 50, organization: 20, homeRepair: 60 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Carpentry Trade School',       type: 'vocational', field: 'carpentry',
      requirements: {}, graduationRequirements: {},
      tuitionFullTime: T.vocational, totalCredits: { generalEducation: 0, field: 1, major: 0 },
      skillGains: { automatic: {}, major: { organization: 20, caution: 40, homeRepair: 60 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Culinary School',              type: 'vocational', field: 'culinary',
      requirements: {}, graduationRequirements: {},
      tuitionFullTime: T.vocational, totalCredits: { generalEducation: 0, field: 2, major: 0 },
      skillGains: { automatic: {}, major: { organization: 30, caution: 30 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Firefighter Academy',          type: 'vocational', field: 'fire science',
      requirements: { skills: { physicalAbility: 60, health: 90, communication: 45 } },
      graduationRequirements: {},
      tuitionFullTime: 5000, totalCredits: { generalEducation: 0, field: 1, major: 0 },
      skillGains: { automatic: {}, major: { physicalAbility: 20, bravery: 10, caution: 60, organization: 50, stressTolerance: 20, communication: 35 } },
      isStem: false, partTimeAllowed: false, grantsOnGraduation: ['CPR'] },

    // ════════════════════════════════════════════════════════════════════════
    // CERTIFICATE / PROFESSIONAL SCHOOLS
    // ════════════════════════════════════════════════════════════════════════
    // Police Academy: requires (any associates OR any degree) OR 2 yrs FT work experience
    { name: 'Police Academy',               type: 'certificate', field: 'law enforcement',
      requirements: {
        educationIds: [],           // filled at runtime: all associates
        workExperienceAlternative: { years: 2, type: 'fullTime' }, // alt to education req
        skills: { caution: 50, physicalAbility: 55 },
      },
      graduationRequirements: {},
      tuitionFullTime: 5000, totalCredits: { generalEducation: 0, field: 1, major: 0 },
      skillGains: { automatic: {}, major: { caution: 20, stressTolerance: 30, physicalAbility: 15, communication: 20, analysis: 15 } },
      isStem: false, partTimeAllowed: false, grantsOnGraduation: [] },

    { name: 'Flight School',                type: 'certificate', field: 'aviation',
      requirements: { educationIds: [] }, // filled at runtime: any bachelors
      graduationRequirements: {},
      tuitionFullTime: 80000, totalCredits: { generalEducation: 0, field: 1, major: 0 },
      skillGains: { automatic: {}, major: { bravery: 10, caution: 35, technology: 15 } },
      isStem: false, partTimeAllowed: false, grantsOnGraduation: [] },

    { name: 'Law School',                   type: 'certificate', field: 'law',
      requirements: { educationIds: [], skills: { organization: 50, analysis: 20, communication: 60 } },
      graduationRequirements: {},
      tuitionFullTime: 30000, totalCredits: { generalEducation: 0, field: 3, major: 0 },
      skillGains: { automatic: {}, major: { perseverance: 10, organization: 20, analysis: 45, communication: 30 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Teaching Credential',          type: 'certificate', field: 'education',
      requirements: { educationIds: [], skills: { organization: 50, communication: 45 }, certifications: ['CPR'] },
      graduationRequirements: {},
      tuitionFullTime: 15000, totalCredits: { generalEducation: 0, field: 1, major: 0 },
      skillGains: { automatic: {}, major: { creativity: 10, organization: 25, patience: 20, goodWithKids: 20, communication: 25, technology: 10 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    // Astronaut Academy:
    //   educationOptions: list of qualifying prior degrees (each may carry a workExperience requirement)
    //   skillsOr: player needs math>=60 OR science>=60 (OR 2 yrs as pilot, covered by workExperienceAlternative)
    { name: 'Astronaut Academy',            type: 'certificate', field: 'aerospace',
      requirements: {
        educationOptions: [], // filled at runtime — structured objects with optional workExperienceRequired
        skills: { stressTolerance: 50, health: 90 },
        skillsOr: [{ math: 60 }, { science: 60 }],  // player must meet at least one
        workExperienceAlternative: { years: 2, jobTitle: 'Pilot' }, // alt to skillsOr
      },
      graduationRequirements: {},
      tuitionFullTime: 0, totalCredits: { generalEducation: 0, field: 2, major: 0 },
      skillGains: { automatic: {}, major: { caution: 40, stressTolerance: 30, communication: 15, math: 15, science: 15, homeRepair: 45, technology: 35 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Medical School',               type: 'certificate', field: 'medicine',
      requirements: { educationIds: [], skills: { science: 40 } },
      graduationRequirements: { skills: { analysis: 65, technology: 25, science: 100 } },
      tuitionFullTime: 50000, totalCredits: { generalEducation: 0, field: 4, major: 0 },
      skillGains: { automatic: {}, major: { caution: 10, analysis: 15, technology: 20, science: 70 } },
      isStem: true, partTimeAllowed: false, grantsOnGraduation: [] },

    { name: 'Chiropractic School',          type: 'certificate', field: 'medicine',
      requirements: { educationIds: [] },
      graduationRequirements: { skills: { technology: 15, science: 50 } },
      tuitionFullTime: 20000, totalCredits: { generalEducation: 0, field: 4, major: 0 },
      skillGains: { automatic: {}, major: { caution: 35, technology: 13, science: 20 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Dental School',                type: 'certificate', field: 'medicine',
      requirements: { educationIds: [] },
      graduationRequirements: { skills: { technology: 15, science: 50 } },
      tuitionFullTime: 45000, totalCredits: { generalEducation: 0, field: 4, major: 0 },
      skillGains: { automatic: {}, major: { caution: 20, goodWithKids: 15, technology: 13, science: 20 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Optometry School',             type: 'certificate', field: 'medicine',
      requirements: { educationIds: [] },
      graduationRequirements: { skills: { technology: 15, science: 50 } },
      tuitionFullTime: 35000, totalCredits: { generalEducation: 0, field: 4, major: 0 },
      skillGains: { automatic: {}, major: { caution: 20, technology: 13, science: 20 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Physical Therapy School',      type: 'certificate', field: 'medicine',
      requirements: { educationIds: [] },
      graduationRequirements: { skills: { caution: 70, science: 50 } },
      tuitionFullTime: 30000, totalCredits: { generalEducation: 0, field: 3, major: 0 },
      skillGains: { automatic: {}, major: { patience: 10, caution: 20, communication: 10, science: 20 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Pharmacy School',              type: 'certificate', field: 'pharmacy',
      requirements: { educationIds: [] },
      graduationRequirements: { skills: { organization: 85, caution: 75, science: 50 } },
      tuitionFullTime: 15000, totalCredits: { generalEducation: 0, field: 4, major: 0 },
      skillGains: { automatic: {}, major: { organization: 10, caution: 10, science: 20 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'General Medical Residency',    type: 'certificate', field: 'medicine',
      requirements: { educationIds: [] },
      graduationRequirements: {},
      tuitionFullTime: 0, totalCredits: { generalEducation: 0, field: 3, major: 0 },
      skillGains: { automatic: {}, major: { caution: 25, analysis: 10, communication: 15 } },
      isStem: true, partTimeAllowed: false, grantsOnGraduation: [] },

    { name: 'Surgical Residency',           type: 'certificate', field: 'medicine',
      requirements: { educationIds: [] },
      graduationRequirements: {},
      tuitionFullTime: 0, totalCredits: { generalEducation: 0, field: 5, major: 0 },
      skillGains: { automatic: {}, major: { caution: 30, stressTolerance: 20, technology: 5 } },
      isStem: true, partTimeAllowed: false, grantsOnGraduation: [] },

    // ════════════════════════════════════════════════════════════════════════
    // ASSOCIATES  (2 yrs FT; credits: 1 gen ed + 1 field + 0 major)
    // ════════════════════════════════════════════════════════════════════════

    // ── Fine Arts ────────────────────────────────────────────────────────────
    { name: 'Drama',                    type: 'associates', field: 'Fine Arts',
      requirements: reqCC, graduationRequirements: { skills: { bravery: 20, charisma: 20, creativity: 20 } },
      tuitionFullTime: T.associates, totalCredits: { generalEducation: 1, field: 1, major: 0 },
      skillGains: { automatic: autoCC, major: { bravery: 10, charisma: 10, creativity: 5 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Vocal Performance',        type: 'associates', field: 'Fine Arts',
      requirements: reqCC, graduationRequirements: { skills: { charisma: 20, music: 13, creativity: 20 } },
      tuitionFullTime: T.associates, totalCredits: { generalEducation: 1, field: 1, major: 0 },
      skillGains: { automatic: autoCC, major: { charisma: 10, music: 10, creativity: 5 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Instrumental Performance', type: 'associates', field: 'Fine Arts',
      requirements: reqCC, graduationRequirements: { skills: { music: 26, creativity: 20 } },
      tuitionFullTime: T.associates, totalCredits: { generalEducation: 1, field: 1, major: 0 },
      skillGains: { automatic: autoCC, major: { music: 20, creativity: 5 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Photography',              type: 'associates', field: 'Fine Arts',
      requirements: reqCC, graduationRequirements: { skills: { creativity: 60, technology: 15 } },
      tuitionFullTime: T.associates, totalCredits: { generalEducation: 1, field: 1, major: 0 },
      skillGains: { automatic: autoCC, major: { creativity: 7, technology: 13 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Art',                      type: 'associates', field: 'Fine Arts',
      requirements: reqCC, graduationRequirements: { skills: { creativity: 40, art: 15, technology: 15 } },
      tuitionFullTime: T.associates, totalCredits: { generalEducation: 1, field: 1, major: 0 },
      skillGains: { automatic: autoCC, major: { creativity: 10, art: 13, technology: 15 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Dance',                    type: 'associates', field: 'Fine Arts',
      requirements: reqCC, graduationRequirements: { skills: { creativity: 15, physicalAbility: 40 } },
      tuitionFullTime: T.associates, totalCredits: { generalEducation: 1, field: 1, major: 0 },
      skillGains: { automatic: autoCC, major: { creativity: 3, physicalAbility: 8 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Graphic Design',           type: 'associates', field: 'Fine Arts',
      requirements: reqCC, graduationRequirements: { skills: { creativity: 40, technology: 17 } },
      tuitionFullTime: T.associates, totalCredits: { generalEducation: 1, field: 1, major: 0 },
      skillGains: { automatic: autoCC, major: { creativity: 10, technology: 15 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    // ── Humanities ───────────────────────────────────────────────────────────
    { name: 'English',                  type: 'associates', field: 'Humanities',
      requirements: reqCC, graduationRequirements: { skills: { writing: 20, analysis: 15 } },
      tuitionFullTime: T.associates, totalCredits: { generalEducation: 1, field: 1, major: 0 },
      skillGains: { automatic: autoCC, major: { writing: 12, analysis: 12, creativity: 5, communication: 10 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Psychology',               type: 'associates', field: 'Humanities',
      requirements: reqCC, graduationRequirements: { skills: { science: 10 } },
      tuitionFullTime: T.associates, totalCredits: { generalEducation: 1, field: 1, major: 0 },
      skillGains: { automatic: autoCC, major: { science: 10, communication: 5 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Education',                type: 'associates', field: 'Humanities',
      requirements: reqCC, graduationRequirements: { skills: { organization: 30, communication: 15 } },
      tuitionFullTime: T.associates, totalCredits: { generalEducation: 1, field: 1, major: 0 },
      skillGains: { automatic: autoCC, major: { compassion: 5, communication: 5 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Sociology',                type: 'associates', field: 'Humanities',
      requirements: reqCC, graduationRequirements: { skills: { writing: 20, analysis: 15 } },
      tuitionFullTime: T.associates, totalCredits: { generalEducation: 1, field: 1, major: 0 },
      skillGains: { automatic: autoCC, major: { writing: 12, analysis: 12, communication: 10 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Architecture',             type: 'associates', field: 'Humanities',
      requirements: reqCC, graduationRequirements: { skills: { creativity: 40, homeRepair: 7 } },
      tuitionFullTime: T.associates, totalCredits: { generalEducation: 1, field: 1, major: 0 },
      skillGains: { automatic: autoCC, major: { creativity: 5, homeRepair: 7 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Linguistics',              type: 'associates', field: 'Humanities',
      requirements: reqCC, graduationRequirements: { skills: { analysis: 14, writing: 18 } },
      tuitionFullTime: T.associates, totalCredits: { generalEducation: 1, field: 1, major: 0 },
      skillGains: { automatic: autoCC, major: { analysis: 4, communication: 5 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Archaeology',              type: 'associates', field: 'Humanities',
      requirements: reqCC, graduationRequirements: { skills: { analysis: 14, writing: 18 } },
      tuitionFullTime: T.associates, totalCredits: { generalEducation: 1, field: 1, major: 0 },
      skillGains: { automatic: autoCC, major: { caution: 5, analysis: 4, communication: 5, technology: 5 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Anthropology',             type: 'associates', field: 'Humanities',
      requirements: reqCC, graduationRequirements: { skills: { writing: 20, analysis: 15, science: 15 } },
      tuitionFullTime: T.associates, totalCredits: { generalEducation: 1, field: 1, major: 0 },
      skillGains: { automatic: autoCC, major: { writing: 12, analysis: 12, communication: 10, science: 10 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Criminology',              type: 'associates', field: 'Humanities',
      requirements: reqCC, graduationRequirements: { skills: { writing: 20, analysis: 15, science: 15 } },
      tuitionFullTime: T.associates, totalCredits: { generalEducation: 1, field: 1, major: 0 },
      skillGains: { automatic: autoCC, major: { writing: 12, analysis: 12, communication: 10, science: 10 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    // ── Math ─────────────────────────────────────────────────────────────────
    { name: 'Economics',                type: 'associates', field: 'Math',
      requirements: reqCC, graduationRequirements: { skills: { caution: 24, analysis: 20, math: 20, technology: 11 } },
      tuitionFullTime: T.associates, totalCredits: { generalEducation: 1, field: 1, major: 0 },
      skillGains: { automatic: autoCC, major: { caution: 6, analysis: 5, math: 10, technology: 5, communication: 5 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Statistics',               type: 'associates', field: 'Math',
      requirements: reqCC, graduationRequirements: { skills: { caution: 24, analysis: 25, math: 25, technology: 11 } },
      tuitionFullTime: T.associates, totalCredits: { generalEducation: 1, field: 1, major: 0 },
      skillGains: { automatic: autoCC, major: { caution: 6, analysis: 10, math: 15, technology: 5, communication: 5 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Finance',                  type: 'associates', field: 'Math',
      requirements: reqCC, graduationRequirements: { skills: { organization: 40, caution: 25, analysis: 16, math: 20, technology: 11 } },
      tuitionFullTime: T.associates, totalCredits: { generalEducation: 1, field: 1, major: 0 },
      skillGains: { automatic: autoCC, major: { organization: 7, caution: 7, analysis: 4, math: 10, technology: 5 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Computer Science',         type: 'associates', field: 'Math',
      requirements: reqCC, graduationRequirements: { skills: { math: 19, analysis: 19, technology: 20, creativity: 50 } },
      tuitionFullTime: T.associates, totalCredits: { generalEducation: 1, field: 1, major: 0 },
      skillGains: { automatic: autoCC, major: { math: 12, analysis: 10, technology: 15, perseverance: 5, creativity: 8 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Data Science',             type: 'associates', field: 'Math',
      requirements: reqCC, graduationRequirements: { skills: { analysis: 27, math: 25, technology: 16 } },
      tuitionFullTime: T.associates, totalCredits: { generalEducation: 1, field: 1, major: 0 },
      skillGains: { automatic: autoCC, major: { analysis: 12, math: 15, technology: 10, communication: 12 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Business',                 type: 'associates', field: 'Math',
      requirements: reqCC, graduationRequirements: { skills: { math: 20, technology: 10, analysis: 20 } },
      tuitionFullTime: T.associates, totalCredits: { generalEducation: 1, field: 1, major: 0 },
      skillGains: { automatic: autoCC, major: { organization: 20, communication: 10, technology: 5, math: 10, analysis: 5 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    // ── Physical Sciences ────────────────────────────────────────────────────
    { name: 'Chemistry',                type: 'associates', field: 'Physical Sciences',
      requirements: reqCC, graduationRequirements: { skills: { science: 20, analysis: 14, technology: 11 } },
      tuitionFullTime: T.associates, totalCredits: { generalEducation: 1, field: 1, major: 0 },
      skillGains: { automatic: autoCC, major: { organization: 7, caution: 15, science: 12, analysis: 6, technology: 9 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Earth Science',            type: 'associates', field: 'Physical Sciences',
      requirements: reqCC, graduationRequirements: { skills: { science: 18, analysis: 18 } },
      tuitionFullTime: T.associates, totalCredits: { generalEducation: 1, field: 1, major: 0 },
      skillGains: { automatic: autoCC, major: { science: 10, analysis: 6 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Physics',                  type: 'associates', field: 'Physical Sciences',
      requirements: reqCC, graduationRequirements: { skills: { math: 15, science: 15, technology: 5 } },
      tuitionFullTime: T.associates, totalCredits: { generalEducation: 1, field: 1, major: 0 },
      skillGains: { automatic: autoCC, major: { math: 10, science: 10, technology: 2 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    // ── Biological Sciences ──────────────────────────────────────────────────
    { name: 'Environmental Science',    type: 'associates', field: 'Biological Sciences',
      requirements: reqCC, graduationRequirements: { skills: { science: 18, analysis: 18, caution: 35 } },
      tuitionFullTime: T.associates, totalCredits: { generalEducation: 1, field: 1, major: 0 },
      skillGains: { automatic: autoCC, major: { science: 12, analysis: 12, caution: 5 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Animal Science',           type: 'associates', field: 'Biological Sciences',
      requirements: reqCC, graduationRequirements: { skills: { science: 18, analysis: 18 } },
      tuitionFullTime: T.associates, totalCredits: { generalEducation: 1, field: 1, major: 0 },
      skillGains: { automatic: autoCC, major: { caution: 5, science: 10, analysis: 6 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Nursing',                  type: 'associates', field: 'Biological Sciences',
      requirements: reqCC, graduationRequirements: { skills: { organization: 50, communication: 50, technology: 11, science: 18 } },
      tuitionFullTime: T.associates, totalCredits: { generalEducation: 1, field: 1, major: 0 },
      skillGains: { automatic: autoCC, major: { organization: 5, caution: 10, communication: 8, technology: 9, science: 10 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Biology',                  type: 'associates', field: 'Biological Sciences',
      requirements: reqCC, graduationRequirements: { skills: { science: 15 } },
      tuitionFullTime: T.associates, totalCredits: { generalEducation: 1, field: 1, major: 0 },
      skillGains: { automatic: autoCC, major: { organization: 15, science: 10 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    // ════════════════════════════════════════════════════════════════════════
    // BACHELORS  (4 yrs FT; credits: 1 gen ed + 1 field + 2 major)
    // ════════════════════════════════════════════════════════════════════════

    // ── Fine Arts ────────────────────────────────────────────────────────────
    { name: 'Drama',                    type: 'bachelors', field: 'Fine Arts',
      requirements: reqB, graduationRequirements: { skills: { bravery: 30, charisma: 30, creativity: 30 } },
      tuitionFullTime: T.bachelors, totalCredits: { generalEducation: 1, field: 1, major: 2 },
      skillGains: { automatic: autoB, major: { bravery: 20, charisma: 20, creativity: 10 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Vocal Performance',        type: 'bachelors', field: 'Fine Arts',
      requirements: reqB, graduationRequirements: { skills: { charisma: 30, music: 23, creativity: 30 } },
      tuitionFullTime: T.bachelors, totalCredits: { generalEducation: 1, field: 1, major: 2 },
      skillGains: { automatic: autoB, major: { charisma: 20, music: 20, creativity: 10 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Instrumental Performance', type: 'bachelors', field: 'Fine Arts',
      requirements: reqB, graduationRequirements: { skills: { music: 46, creativity: 30 } },
      tuitionFullTime: T.bachelors, totalCredits: { generalEducation: 1, field: 1, major: 2 },
      skillGains: { automatic: autoB, major: { music: 40, creativity: 10 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Photography',              type: 'bachelors', field: 'Fine Arts',
      requirements: reqB, graduationRequirements: { skills: { creativity: 65, technology: 30 } },
      tuitionFullTime: T.bachelors, totalCredits: { generalEducation: 1, field: 1, major: 2 },
      skillGains: { automatic: autoB, major: { creativity: 14, technology: 26 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Art',                      type: 'bachelors', field: 'Fine Arts',
      requirements: reqB, graduationRequirements: { skills: { creativity: 50, art: 30, technology: 30 } },
      tuitionFullTime: T.bachelors, totalCredits: { generalEducation: 1, field: 1, major: 2 },
      skillGains: { automatic: autoB, major: { creativity: 20, art: 26, technology: 30 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Dance',                    type: 'bachelors', field: 'Fine Arts',
      requirements: reqB, graduationRequirements: { skills: { creativity: 18, physicalAbility: 50 } },
      tuitionFullTime: T.bachelors, totalCredits: { generalEducation: 1, field: 1, major: 2 },
      skillGains: { automatic: autoB, major: { creativity: 6, physicalAbility: 16 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Graphic Design',           type: 'bachelors', field: 'Fine Arts',
      requirements: reqB, graduationRequirements: { skills: { creativity: 60, technology: 32 } },
      tuitionFullTime: T.bachelors, totalCredits: { generalEducation: 1, field: 1, major: 2 },
      skillGains: { automatic: autoB, major: { creativity: 20, technology: 30 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    // ── Humanities ───────────────────────────────────────────────────────────
    { name: 'English',                  type: 'bachelors', field: 'Humanities',
      requirements: reqB, graduationRequirements: { skills: { writing: 30, analysis: 27, communication: 20 } },
      tuitionFullTime: T.bachelors, totalCredits: { generalEducation: 1, field: 1, major: 2 },
      skillGains: { automatic: autoB, major: { writing: 24, analysis: 24, creativity: 10, communication: 20 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Psychology',               type: 'bachelors', field: 'Humanities',
      requirements: reqB, graduationRequirements: { skills: { science: 20 } },
      tuitionFullTime: T.bachelors, totalCredits: { generalEducation: 1, field: 1, major: 2 },
      skillGains: { automatic: autoB, major: { science: 20, communication: 10 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Education',                type: 'bachelors', field: 'Humanities',
      requirements: reqB, graduationRequirements: { skills: { organization: 40, communication: 20 } },
      tuitionFullTime: T.bachelors, totalCredits: { generalEducation: 1, field: 1, major: 2 },
      skillGains: { automatic: autoB, major: { compassion: 10, communication: 10 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Sociology',                type: 'bachelors', field: 'Humanities',
      requirements: reqB, graduationRequirements: { skills: { writing: 30, analysis: 27, communication: 20 } },
      tuitionFullTime: T.bachelors, totalCredits: { generalEducation: 1, field: 1, major: 2 },
      skillGains: { automatic: autoB, major: { writing: 24, analysis: 24, communication: 20 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Architecture',             type: 'bachelors', field: 'Humanities',
      requirements: reqB, graduationRequirements: { skills: { creativity: 45, homeRepair: 14 } },
      tuitionFullTime: T.bachelors, totalCredits: { generalEducation: 1, field: 1, major: 2 },
      skillGains: { automatic: autoB, major: { creativity: 10, homeRepair: 14 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Linguistics',              type: 'bachelors', field: 'Humanities',
      requirements: reqB, graduationRequirements: { skills: { analysis: 26, writing: 30 } },
      tuitionFullTime: T.bachelors, totalCredits: { generalEducation: 1, field: 1, major: 2 },
      skillGains: { automatic: autoB, major: { analysis: 8, communication: 10 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Archaeology',              type: 'bachelors', field: 'Humanities',
      requirements: reqB, graduationRequirements: { skills: { analysis: 26, writing: 30 } },
      tuitionFullTime: T.bachelors, totalCredits: { generalEducation: 1, field: 1, major: 2 },
      skillGains: { automatic: autoB, major: { caution: 10, analysis: 8, communication: 10, technology: 10 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Anthropology',             type: 'bachelors', field: 'Humanities',
      requirements: reqB, graduationRequirements: { skills: { writing: 30, analysis: 27, communication: 20, science: 30 } },
      tuitionFullTime: T.bachelors, totalCredits: { generalEducation: 1, field: 1, major: 2 },
      skillGains: { automatic: autoB, major: { writing: 24, analysis: 24, communication: 20, science: 25 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Criminology',              type: 'bachelors', field: 'Humanities',
      requirements: reqB, graduationRequirements: { skills: { writing: 30, analysis: 27, communication: 20, science: 30 } },
      tuitionFullTime: T.bachelors, totalCredits: { generalEducation: 1, field: 1, major: 2 },
      skillGains: { automatic: autoB, major: { writing: 24, analysis: 24, communication: 20, science: 25 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    // ── Math ─────────────────────────────────────────────────────────────────
    { name: 'Economics',                type: 'bachelors', field: 'Math',
      requirements: reqB, graduationRequirements: { skills: { caution: 30, analysis: 25, math: 30, technology: 16 } },
      tuitionFullTime: T.bachelors, totalCredits: { generalEducation: 1, field: 1, major: 2 },
      skillGains: { automatic: autoB, major: { caution: 12, analysis: 10, math: 20, technology: 10, communication: 10 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Statistics',               type: 'bachelors', field: 'Math',
      requirements: reqB, graduationRequirements: { skills: { caution: 30, analysis: 35, math: 40, technology: 16 } },
      tuitionFullTime: T.bachelors, totalCredits: { generalEducation: 1, field: 1, major: 2 },
      skillGains: { automatic: autoB, major: { caution: 12, analysis: 20, math: 30, technology: 10, communication: 10 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Finance',                  type: 'bachelors', field: 'Math',
      requirements: reqB, graduationRequirements: { skills: { organization: 65, caution: 35, analysis: 26, math: 30, technology: 16 } },
      tuitionFullTime: T.bachelors, totalCredits: { generalEducation: 1, field: 1, major: 2 },
      skillGains: { automatic: autoB, major: { organization: 14, caution: 14, analysis: 8, math: 20, technology: 10 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Computer Science',         type: 'bachelors', field: 'Math',
      requirements: reqB, graduationRequirements: { skills: { math: 33, analysis: 35, technology: 35, creativity: 70 } },
      tuitionFullTime: T.bachelors, totalCredits: { generalEducation: 1, field: 1, major: 2 },
      skillGains: { automatic: autoB, major: { math: 24, analysis: 20, technology: 30, perseverance: 10, creativity: 16 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Data Science',             type: 'bachelors', field: 'Math',
      requirements: reqB, graduationRequirements: { skills: { analysis: 39, math: 40, technology: 26 } },
      tuitionFullTime: T.bachelors, totalCredits: { generalEducation: 1, field: 1, major: 2 },
      skillGains: { automatic: autoB, major: { analysis: 24, math: 30, technology: 20, communication: 24 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Business',                 type: 'bachelors', field: 'Math',
      requirements: reqB, graduationRequirements: { skills: { math: 30, technology: 15, analysis: 20 } },
      tuitionFullTime: T.bachelors, totalCredits: { generalEducation: 1, field: 1, major: 2 },
      skillGains: { automatic: autoB, major: { organization: 20, caution: 8, analysis: 10, math: 20, technology: 10, communication: 20, creativity: 10 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    // ── Physical Sciences ────────────────────────────────────────────────────
    { name: 'Chemistry',                type: 'bachelors', field: 'Physical Sciences',
      requirements: reqB, graduationRequirements: { skills: { science: 34, analysis: 30, technology: 20 } },
      tuitionFullTime: T.bachelors, totalCredits: { generalEducation: 1, field: 1, major: 2 },
      skillGains: { automatic: autoB, major: { organization: 14, caution: 30, science: 24, analysis: 12, technology: 18 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Earth Science',            type: 'bachelors', field: 'Physical Sciences',
      requirements: reqB, graduationRequirements: { skills: { science: 30, analysis: 30 } },
      tuitionFullTime: T.bachelors, totalCredits: { generalEducation: 1, field: 1, major: 2 },
      skillGains: { automatic: autoB, major: { science: 20, analysis: 12 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    // Physics CC → Astronomy bachelors (per CSV: physics CC, astronomy bachelors)
    { name: 'Astronomy',                type: 'bachelors', field: 'Physical Sciences',
      requirements: reqB, graduationRequirements: { skills: { math: 30, science: 30, technology: 7 } },
      tuitionFullTime: T.bachelors, totalCredits: { generalEducation: 1, field: 1, major: 2 },
      skillGains: { automatic: autoB, major: { math: 20, science: 20, technology: 4 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    // ── Biological Sciences ──────────────────────────────────────────────────
    { name: 'Environmental Science',    type: 'bachelors', field: 'Biological Sciences',
      requirements: reqB, graduationRequirements: { skills: { science: 30, analysis: 30, caution: 40 } },
      tuitionFullTime: T.bachelors, totalCredits: { generalEducation: 1, field: 1, major: 2 },
      skillGains: { automatic: autoB, major: { science: 24, analysis: 24, caution: 10 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Animal Science',           type: 'bachelors', field: 'Biological Sciences',
      requirements: reqB, graduationRequirements: { skills: { science: 30, analysis: 30 } },
      tuitionFullTime: T.bachelors, totalCredits: { generalEducation: 1, field: 1, major: 2 },
      skillGains: { automatic: autoB, major: { caution: 10, science: 20, analysis: 12 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Nursing',                  type: 'bachelors', field: 'Biological Sciences',
      requirements: reqB, graduationRequirements: { skills: { organization: 60, communication: 60, technology: 20, science: 30 } },
      tuitionFullTime: T.bachelors, totalCredits: { generalEducation: 1, field: 1, major: 2 },
      skillGains: { automatic: autoB, major: { organization: 10, caution: 20, communication: 16, technology: 18, science: 20 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Biology',                  type: 'bachelors', field: 'Biological Sciences',
      requirements: reqB, graduationRequirements: { skills: { science: 30 } },
      tuitionFullTime: T.bachelors, totalCredits: { generalEducation: 1, field: 1, major: 2 },
      skillGains: { automatic: autoB, major: { organization: 30, science: 20 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    // ════════════════════════════════════════════════════════════════════════
    // MASTERS  (years vary per program; credits: all major)
    // ════════════════════════════════════════════════════════════════════════

    // ── Fine Arts ────────────────────────────────────────────────────────────
    { name: 'Drama',                    type: 'masters', field: 'Fine Arts',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Drama
      graduationRequirements: { skills: { bravery: 40, charisma: 40, creativity: 40 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 1 },
      skillGains: { automatic: autoM(1), major: { bravery: 10, charisma: 10, creativity: 10 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Vocal Performance',        type: 'masters', field: 'Fine Arts',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Vocal Performance
      graduationRequirements: { skills: { charisma: 40, music: 43, creativity: 40 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 1 },
      skillGains: { automatic: autoM(1), major: { charisma: 10, music: 20, creativity: 10 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Instrumental Performance', type: 'masters', field: 'Fine Arts',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Instrumental Performance
      graduationRequirements: { skills: { music: 76, creativity: 40 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 1 },
      skillGains: { automatic: autoM(1), major: { music: 30, creativity: 10 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Photography',              type: 'masters', field: 'Fine Arts',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Photography
      graduationRequirements: { skills: { creativity: 75, technology: 50 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 1 },
      skillGains: { automatic: autoM(1), major: { creativity: 10, charisma: 10, technology: 20 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Material Art',             type: 'masters', field: 'Fine Arts',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Art
      graduationRequirements: { skills: { creativity: 80, art: 50 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 1 },
      skillGains: { automatic: autoM(1), major: { creativity: 30, art: 20 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Digital Art',              type: 'masters', field: 'Fine Arts',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Art
      graduationRequirements: { skills: { creativity: 80, technology: 55 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 1 },
      skillGains: { automatic: autoM(1), major: { creativity: 30, technology: 25 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Dance',                    type: 'masters', field: 'Fine Arts',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Dance
      graduationRequirements: { skills: { creativity: 60 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 1 },
      skillGains: { automatic: autoM(1), major: { creativity: 10 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Graphic Design',           type: 'masters', field: 'Fine Arts',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Graphic Design
      graduationRequirements: { skills: { creativity: 80, technology: 52 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 1 },
      skillGains: { automatic: autoM(1), major: { creativity: 20, technology: 20 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    // ── Humanities ───────────────────────────────────────────────────────────
    { name: 'English',                  type: 'masters', field: 'Humanities',
      requirements: { ...reqM, educationIds: [] }, // → bachelors English
      graduationRequirements: { skills: { writing: 50, analysis: 57, communication: 35 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 2 },
      skillGains: { automatic: autoM(2), major: { creativity: 10 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Psychology',               type: 'masters', field: 'Humanities',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Psychology
      graduationRequirements: { skills: { analysis: 75, science: 50 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 2 },
      skillGains: { automatic: autoM(2), major: { analysis: 25, science: 30 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Education',                type: 'masters', field: 'Humanities',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Education
      graduationRequirements: { skills: { organization: 60, communication: 35 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 2 },
      skillGains: { automatic: autoM(2), major: { compassion: 10 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Sociology',                type: 'masters', field: 'Humanities',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Sociology
      graduationRequirements: { skills: { writing: 50, analysis: 57, communication: 35 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 2 },
      skillGains: { automatic: autoM(2), major: { writing: 10 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Architecture',             type: 'masters', field: 'Humanities',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Architecture
      graduationRequirements: { skills: { creativity: 55, homeRepair: 30 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 2 },
      skillGains: { automatic: autoM(2), major: { creativity: 10, homeRepair: 16 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Linguistics',              type: 'masters', field: 'Humanities',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Linguistics
      graduationRequirements: { skills: { analysis: 50, writing: 50 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 1 },
      skillGains: { automatic: autoM(1), major: {} },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Archaeology',              type: 'masters', field: 'Humanities',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Archaeology
      graduationRequirements: { skills: { analysis: 50, writing: 50 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 1 },
      skillGains: { automatic: autoM(1), major: { patience: 20, caution: 20, technology: 10 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Anthropology',             type: 'masters', field: 'Humanities',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Anthropology
      graduationRequirements: { skills: { writing: 50, analysis: 57, communication: 35, science: 50 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 2 },
      skillGains: { automatic: autoM(2), major: { writing: 10, science: 25 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Criminology',              type: 'masters', field: 'Humanities',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Criminology
      graduationRequirements: { skills: { writing: 50, analysis: 57, communication: 35, science: 50 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 2 },
      skillGains: { automatic: autoM(2), major: { writing: 10, science: 25 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    // ── Math ─────────────────────────────────────────────────────────────────
    { name: 'Economics',                type: 'masters', field: 'Math',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Economics
      graduationRequirements: { skills: { caution: 40, analysis: 70, math: 50, technology: 18, communication: 75 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 2 },
      skillGains: { automatic: autoM(2), major: { caution: 10, analysis: 15, math: 20, technology: 2, communication: 15 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Statistics',               type: 'masters', field: 'Math',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Statistics
      graduationRequirements: { skills: { caution: 40, analysis: 70, math: 60, technology: 18, communication: 75 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 2 },
      skillGains: { automatic: autoM(2), major: { caution: 10, analysis: 15, math: 20, technology: 2, communication: 15 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Finance',                  type: 'masters', field: 'Math',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Finance
      graduationRequirements: { skills: { organization: 85, caution: 55, analysis: 55, math: 50, technology: 18 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 2 },
      skillGains: { automatic: autoM(2), major: { caution: 20, math: 20, technology: 2 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Computer Science',         type: 'masters', field: 'Math',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Computer Science
      graduationRequirements: { skills: { math: 53, technology: 55, creativity: 80 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 2 },
      skillGains: { automatic: autoM(2), major: { math: 20, technology: 20, creativity: 10 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Cybersecurity',            type: 'masters', field: 'Math',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Computer Science
      graduationRequirements: { skills: { technology: 55, analysis: 55 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 2 },
      skillGains: { automatic: autoM(2), major: { caution: 25, technology: 20, analysis: 5 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Artificial Intelligence',  type: 'masters', field: 'Math',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Computer Science
      graduationRequirements: { skills: { creativity: 80, math: 100, writing: 100, technology: 100 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 8 },
      skillGains: { automatic: autoM(8), major: { creativity: 10, math: 67, technology: 65 } },
      isStem: true, partTimeAllowed: false, grantsOnGraduation: [] },

    { name: 'Computer Engineering',     type: 'masters', field: 'Math',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Computer Science
      graduationRequirements: { skills: { organization: 80, math: 30, science: 30, homeRepair: 10, technology: 30 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 2 },
      skillGains: { automatic: autoM(2), major: { organization: 10, math: 10, science: 20, homeRepair: 10, technology: 15 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Data Science',             type: 'masters', field: 'Math',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Data Science
      graduationRequirements: { skills: { analysis: 70, math: 60, technology: 56, communication: 75 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 2 },
      skillGains: { automatic: autoM(2), major: { analysis: 15, math: 20, technology: 30, communication: 15 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Business',                 type: 'masters', field: 'Math',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Business
      graduationRequirements: { skills: { math: 50, technology: 20, analysis: 70 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 2 },
      skillGains: { automatic: autoM(2), major: { organization: 10, analysis: 20, math: 20, technology: 5, communication: 20 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    // ── Physical Sciences ────────────────────────────────────────────────────
    { name: 'Chemistry',                type: 'masters', field: 'Physical Sciences',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Chemistry
      graduationRequirements: { skills: { science: 64, analysis: 60, technology: 25 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 2 },
      skillGains: { automatic: autoM(2), major: { caution: 20, science: 30, technology: 5 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Geology',                  type: 'masters', field: 'Physical Sciences',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Earth Science
      graduationRequirements: { skills: { science: 60, analysis: 60 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 2 },
      skillGains: { automatic: autoM(2), major: { caution: 20, science: 30 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Paleontology',             type: 'masters', field: 'Physical Sciences',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Earth Science
      graduationRequirements: { skills: { analysis: 60, technology: 15 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 2 },
      skillGains: { automatic: autoM(2), major: { patience: 25, caution: 25, technology: 13 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Climatology',              type: 'masters', field: 'Physical Sciences',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Earth Science
      graduationRequirements: { skills: { science: 50, analysis: 60 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 2 },
      skillGains: { automatic: autoM(2), major: { science: 20 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Astrophysics',             type: 'masters', field: 'Physical Sciences',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Astronomy
      graduationRequirements: { skills: { math: 65, science: 65, analysis: 60, technology: 30 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 2 },
      skillGains: { automatic: autoM(2), major: { organization: 15, caution: 20, math: 30, science: 30, analysis: 40, technology: 23 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    // ── Biological Sciences ──────────────────────────────────────────────────
    { name: 'Ecology',                  type: 'masters', field: 'Biological Sciences',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Environmental Science
      graduationRequirements: { skills: { science: 50, analysis: 50, caution: 60 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 2 },
      skillGains: { automatic: autoM(2), major: { science: 20, caution: 20 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Botany',                   type: 'masters', field: 'Biological Sciences',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Environmental Science
      graduationRequirements: { skills: { science: 50, analysis: 50, caution: 60 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 2 },
      skillGains: { automatic: autoM(2), major: { science: 20, caution: 20 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Nature Conservation',      type: 'masters', field: 'Biological Sciences',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Environmental Science
      graduationRequirements: { skills: { science: 50 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 2 },
      skillGains: { automatic: autoM(2), major: { science: 20, communication: 25 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Veterinary Studies',       type: 'masters', field: 'Biological Sciences',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Animal Science
      graduationRequirements: { skills: { science: 50, analysis: 60, technology: 15 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 4 },
      skillGains: { automatic: autoM(4), major: { compassion: 10, caution: 15, patience: 10, science: 20, technology: 13 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Zoology',                  type: 'masters', field: 'Biological Sciences',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Animal Science
      graduationRequirements: { skills: { science: 50, analysis: 60 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 2 },
      skillGains: { automatic: autoM(2), major: { caution: 10, science: 20 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Marine Biology',           type: 'masters', field: 'Biological Sciences',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Animal Science
      graduationRequirements: { skills: { science: 50, analysis: 60, technology: 15 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 2 },
      skillGains: { automatic: autoM(2), major: { caution: 15, science: 20, technology: 13 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Nursing',                  type: 'masters', field: 'Biological Sciences',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Nursing
      graduationRequirements: { skills: { communication: 75, science: 60 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 2 },
      skillGains: { automatic: autoM(2), major: { compassion: 10, patience: 20, caution: 15, science: 30 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Biology',                  type: 'masters', field: 'Biological Sciences',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Biology
      graduationRequirements: { skills: { science: 60 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 2 },
      skillGains: { automatic: autoM(2), major: { science: 30 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Genetics',                 type: 'masters', field: 'Biological Sciences',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Biology
      graduationRequirements: { skills: { science: 50, analysis: 40, technology: 20 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 3 },
      skillGains: { automatic: autoM(3), major: { caution: 15, science: 20, technology: 18 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Epidemiology',             type: 'masters', field: 'Biological Sciences',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Biology
      graduationRequirements: { skills: { science: 50, analysis: 50 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 2 },
      skillGains: { automatic: autoM(2), major: { caution: 20, science: 20 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Neurobiology',             type: 'masters', field: 'Biological Sciences',
      requirements: { ...reqM, educationIds: [] }, // → bachelors Biology
      graduationRequirements: { skills: { science: 50, analysis: 50, technology: 20 } },
      tuitionFullTime: T.masters, totalCredits: { generalEducation: 0, field: 0, major: 2 },
      skillGains: { automatic: autoM(2), major: { caution: 5, science: 20, technology: 20 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    // ════════════════════════════════════════════════════════════════════════
    // DOCTORATES  (years vary per program; credits: all major)
    // ════════════════════════════════════════════════════════════════════════

    // ── Fine Arts ────────────────────────────────────────────────────────────
    { name: 'Drama',                    type: 'doctorate', field: 'Fine Arts',
      requirements: { ...reqPhD, educationIds: [] }, // → masters Drama
      graduationRequirements: { skills: { bravery: 50, charisma: 50, creativity: 50 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 3 },
      skillGains: { automatic: autoPhD(3), major: { bravery: 10, charisma: 10, creativity: 10 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Vocal Performance',        type: 'doctorate', field: 'Fine Arts',
      requirements: { ...reqPhD, educationIds: [] }, // → masters Vocal Performance
      graduationRequirements: { skills: { charisma: 50, music: 93, creativity: 50 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 3 },
      skillGains: { automatic: autoPhD(3), major: { charisma: 10, music: 50, creativity: 10 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Instrumental Performance', type: 'doctorate', field: 'Fine Arts',
      requirements: { ...reqPhD, educationIds: [] }, // → masters Instrumental Performance
      graduationRequirements: { skills: { music: 100, creativity: 50 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 3 },
      skillGains: { automatic: autoPhD(3), major: { music: 24, creativity: 10 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Photography',              type: 'doctorate', field: 'Fine Arts',
      requirements: { ...reqPhD, educationIds: [] }, // → masters Photography
      graduationRequirements: { skills: { creativity: 85, technology: 100 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 3 },
      skillGains: { automatic: autoPhD(3), major: { creativity: 10, charisma: 10, technology: 50 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Material Art',             type: 'doctorate', field: 'Fine Arts',
      requirements: { ...reqPhD, educationIds: [] }, // → masters Material Art
      graduationRequirements: { skills: { creativity: 95, art: 100 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 3 },
      skillGains: { automatic: autoPhD(3), major: { creativity: 15, art: 50 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Digital Art',              type: 'doctorate', field: 'Fine Arts',
      requirements: { ...reqPhD, educationIds: [] }, // → masters Digital Art
      graduationRequirements: { skills: { creativity: 95, technology: 100 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 3 },
      skillGains: { automatic: autoPhD(3), major: { creativity: 15, technology: 50 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Dance',                    type: 'doctorate', field: 'Fine Arts',
      requirements: { ...reqPhD, educationIds: [] }, // → masters Dance
      graduationRequirements: { skills: { creativity: 80 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 3 },
      skillGains: { automatic: autoPhD(3), major: { creativity: 20 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Graphic Design',           type: 'doctorate', field: 'Fine Arts',
      requirements: { ...reqPhD, educationIds: [] }, // → masters Graphic Design
      graduationRequirements: { skills: { creativity: 95, technology: 52 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 3 },
      skillGains: { automatic: autoPhD(3), major: { creativity: 15, technology: 50 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    // ── Humanities ───────────────────────────────────────────────────────────
    { name: 'English',                  type: 'doctorate', field: 'Humanities',
      requirements: { ...reqPhD, educationIds: [] }, // → masters English
      graduationRequirements: { skills: { writing: 100, analysis: 100, communication: 85 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 4 },
      skillGains: { automatic: autoPhD(4), major: { creativity: 15 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Psychology',               type: 'doctorate', field: 'Humanities',
      requirements: { ...reqPhD, educationIds: [] }, // → masters Psychology
      graduationRequirements: { skills: { analysis: 100, science: 100 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 5 },
      skillGains: { automatic: autoPhD(5), major: { science: 50 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Education',                type: 'doctorate', field: 'Humanities',
      requirements: { ...reqPhD, educationIds: [] }, // → masters Education
      graduationRequirements: { skills: { organization: 65, communication: 85 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 4 },
      skillGains: { automatic: autoPhD(4), major: {} },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Sociology',                type: 'doctorate', field: 'Humanities',
      requirements: { ...reqPhD, educationIds: [] }, // → masters Sociology
      graduationRequirements: { skills: { writing: 100, analysis: 100, communication: 85 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 5 },
      skillGains: { automatic: autoPhD(5), major: {} },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Architecture',             type: 'doctorate', field: 'Humanities',
      requirements: { ...reqPhD, educationIds: [] }, // → masters Architecture
      graduationRequirements: { skills: { creativity: 65, homeRepair: 40 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 4 },
      skillGains: { automatic: autoPhD(4), major: { creativity: 10, homeRepair: 10 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Linguistics',              type: 'doctorate', field: 'Humanities',
      requirements: { ...reqPhD, educationIds: [] }, // → masters Linguistics
      graduationRequirements: { skills: { analysis: 100, writing: 100 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 4 },
      skillGains: { automatic: autoPhD(4), major: { organization: 10 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Archaeology',              type: 'doctorate', field: 'Humanities',
      requirements: { ...reqPhD, educationIds: [] }, // → masters Archaeology
      graduationRequirements: { skills: { analysis: 100, writing: 100 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 4 },
      skillGains: { automatic: autoPhD(4), major: { organization: 10, technology: 10 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Anthropology',             type: 'doctorate', field: 'Humanities',
      requirements: { ...reqPhD, educationIds: [] }, // → masters Anthropology
      graduationRequirements: { skills: { writing: 100, analysis: 100, communication: 85, science: 100 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 6 },
      skillGains: { automatic: autoPhD(6), major: { science: 50 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Criminology',              type: 'doctorate', field: 'Humanities',
      requirements: { ...reqPhD, educationIds: [] }, // → masters Criminology
      graduationRequirements: { skills: { writing: 100, analysis: 100, communication: 85, science: 100 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 4 },
      skillGains: { automatic: autoPhD(4), major: { science: 50 } },
      isStem: false, partTimeAllowed: true, grantsOnGraduation: [] },

    // ── Math ─────────────────────────────────────────────────────────────────
    { name: 'Economics',                type: 'doctorate', field: 'Math',
      requirements: { ...reqPhD, educationIds: [] }, // → masters Economics
      graduationRequirements: { skills: { math: 100, analysis: 100, technology: 28, communication: 100 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 5 },
      skillGains: { automatic: autoPhD(5), major: { math: 50, technology: 10 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Statistics',               type: 'doctorate', field: 'Math',
      requirements: { ...reqPhD, educationIds: [] }, // → masters Statistics
      graduationRequirements: { skills: { math: 100, analysis: 100, technology: 28, communication: 100 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 4 },
      skillGains: { automatic: autoPhD(4), major: { math: 40, technology: 10 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Finance',                  type: 'doctorate', field: 'Math',
      requirements: { ...reqPhD, educationIds: [] }, // → masters Finance
      graduationRequirements: { skills: { analysis: 100, math: 100, technology: 28 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 5 },
      skillGains: { automatic: autoPhD(5), major: { math: 50, technology: 10 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Computer Science',         type: 'doctorate', field: 'Math',
      requirements: { ...reqPhD, educationIds: [] }, // → masters Computer Science
      graduationRequirements: { skills: { math: 100, technology: 100, creativity: 95 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 4 },
      skillGains: { automatic: autoPhD(4), major: { math: 47, technology: 45, creativity: 15 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Cybersecurity',            type: 'doctorate', field: 'Math',
      requirements: { ...reqPhD, educationIds: [] }, // → masters Cybersecurity
      graduationRequirements: { skills: { technology: 100, analysis: 100 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 4 },
      skillGains: { automatic: autoPhD(4), major: { technology: 45 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Computer Engineering',     type: 'doctorate', field: 'Math',
      requirements: { ...reqPhD, educationIds: [] }, // → masters Computer Engineering
      graduationRequirements: { skills: { math: 50, science: 50, technology: 40 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 4 },
      skillGains: { automatic: autoPhD(4), major: { math: 20, science: 20, technology: 10 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Data Science',             type: 'doctorate', field: 'Math',
      requirements: { ...reqPhD, educationIds: [] }, // → masters Data Science
      graduationRequirements: { skills: { math: 100, analysis: 100, technology: 100, communication: 100 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 4 },
      skillGains: { automatic: autoPhD(4), major: { math: 40, technology: 44 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Business',                 type: 'doctorate', field: 'Math',
      requirements: { ...reqPhD, educationIds: [] }, // → masters Business
      graduationRequirements: { skills: { math: 100, analysis: 100, technology: 30, communication: 100 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 5 },
      skillGains: { automatic: autoPhD(5), major: { math: 50, technology: 10 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    // ── Physical Sciences ────────────────────────────────────────────────────
    { name: 'Chemistry',                type: 'doctorate', field: 'Physical Sciences',
      requirements: { ...reqPhD, educationIds: [] }, // → masters Chemistry
      graduationRequirements: { skills: { science: 100, analysis: 100 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 5 },
      skillGains: { automatic: autoPhD(5), major: { science: 36 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Geology',                  type: 'doctorate', field: 'Physical Sciences',
      requirements: { ...reqPhD, educationIds: [] }, // → masters Geology
      graduationRequirements: { skills: { science: 100, analysis: 100 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 6 },
      skillGains: { automatic: autoPhD(6), major: { science: 40 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Paleontology',             type: 'doctorate', field: 'Physical Sciences',
      requirements: { ...reqPhD, educationIds: [] }, // → masters Paleontology
      graduationRequirements: { skills: { analysis: 100, writing: 100 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 4 },
      skillGains: { automatic: autoPhD(4), major: { organization: 15 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Climatology',              type: 'doctorate', field: 'Physical Sciences',
      requirements: { ...reqPhD, educationIds: [] }, // → masters Climatology
      graduationRequirements: { skills: { science: 100, writing: 100, analysis: 100 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 6 },
      skillGains: { automatic: autoPhD(6), major: { organization: 15, science: 50 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Astrophysics',             type: 'doctorate', field: 'Physical Sciences',
      requirements: { ...reqPhD, educationIds: [] }, // → masters Astrophysics
      graduationRequirements: { skills: { math: 100, science: 100, analysis: 100 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 6 },
      skillGains: { automatic: autoPhD(6), major: { caution: 20, math: 35, science: 35 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    // ── Biological Sciences ──────────────────────────────────────────────────
    { name: 'Ecology',                  type: 'doctorate', field: 'Biological Sciences',
      requirements: { ...reqPhD, educationIds: [] }, // → masters Ecology
      graduationRequirements: { skills: { science: 100, analysis: 100 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 6 },
      skillGains: { automatic: autoPhD(6), major: { science: 50 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Botany',                   type: 'doctorate', field: 'Biological Sciences',
      requirements: { ...reqPhD, educationIds: [] }, // → masters Botany
      graduationRequirements: { skills: { science: 100, analysis: 100 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 6 },
      skillGains: { automatic: autoPhD(6), major: { science: 50 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Nature Conservation',      type: 'doctorate', field: 'Biological Sciences',
      requirements: { ...reqPhD, educationIds: [] }, // → masters Nature Conservation
      graduationRequirements: { skills: { science: 100 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 4 },
      skillGains: { automatic: autoPhD(4), major: { science: 50 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Veterinary Studies',       type: 'doctorate', field: 'Biological Sciences',
      requirements: { ...reqPhD, educationIds: [] }, // → masters Veterinary Studies
      graduationRequirements: { skills: { science: 100, analysis: 100 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 4 },
      skillGains: { automatic: autoPhD(4), major: { science: 50 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Zoology',                  type: 'doctorate', field: 'Biological Sciences',
      requirements: { ...reqPhD, educationIds: [] }, // → masters Zoology
      graduationRequirements: { skills: { science: 100, analysis: 100 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 6 },
      skillGains: { automatic: autoPhD(6), major: { science: 50, organization: 10 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Marine Biology',           type: 'doctorate', field: 'Biological Sciences',
      requirements: { ...reqPhD, educationIds: [] }, // → masters Marine Biology
      graduationRequirements: { skills: { science: 100, analysis: 100 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 6 },
      skillGains: { automatic: autoPhD(6), major: { science: 50, organization: 10 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Nursing',                  type: 'doctorate', field: 'Biological Sciences',
      requirements: { ...reqPhD, educationIds: [] }, // → masters Nursing
      graduationRequirements: { skills: { communication: 100 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 3 },
      skillGains: { automatic: autoPhD(3), major: { organization: 15 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Biology',                  type: 'doctorate', field: 'Biological Sciences',
      requirements: { ...reqPhD, educationIds: [] }, // → masters Biology
      graduationRequirements: { skills: { science: 100 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 5 },
      skillGains: { automatic: autoPhD(5), major: { science: 40 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Genetics',                 type: 'doctorate', field: 'Biological Sciences',
      requirements: { ...reqPhD, educationIds: [] }, // → masters Genetics
      graduationRequirements: { skills: { science: 100, analysis: 100 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 4 },
      skillGains: { automatic: autoPhD(4), major: { science: 50, analysis: 10 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Epidemiology',             type: 'doctorate', field: 'Biological Sciences',
      requirements: { ...reqPhD, educationIds: [] }, // → masters Epidemiology
      graduationRequirements: { skills: { science: 100, analysis: 100 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 5 },
      skillGains: { automatic: autoPhD(5), major: { science: 50 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },

    { name: 'Neurobiology',             type: 'doctorate', field: 'Biological Sciences',
      requirements: { ...reqPhD, educationIds: [] }, // → masters Neurobiology
      graduationRequirements: { skills: { science: 100, analysis: 100, technology: 30 } },
      tuitionFullTime: T.doctorate, totalCredits: { generalEducation: 0, field: 0, major: 5 },
      skillGains: { automatic: autoPhD(5), major: { science: 50, technology: 10 } },
      isStem: true, partTimeAllowed: true, grantsOnGraduation: [] },
  ];

  // ── Pass 1: upsert all programs (educationIds arrays are empty placeholders) ──
  for (const p of programs) {
    await prisma.educationProgram.upsert({
      where: { name_type: { name: p.name, type: p.type } },
      update: {
        field: p.field,
        requirements: p.requirements,
        graduationRequirements: p.graduationRequirements,
        tuitionFullTime: p.tuitionFullTime,
        tuitionPartTime: p.partTimeAllowed ? Math.round(p.tuitionFullTime / 2) : null,
        totalCredits: p.totalCredits,
        skillGains: p.skillGains,
        isStem: p.isStem,
        partTimeAllowed: p.partTimeAllowed,
        grantsOnGraduation: p.grantsOnGraduation,
      },
      create: {
        name: p.name,
        type: p.type,
        field: p.field,
        requirements: p.requirements,
        graduationRequirements: p.graduationRequirements,
        tuitionFullTime: p.tuitionFullTime,
        tuitionPartTime: p.partTimeAllowed ? Math.round(p.tuitionFullTime / 2) : null,
        totalCredits: p.totalCredits,
        skillGains: p.skillGains,
        isStem: p.isStem,
        partTimeAllowed: p.partTimeAllowed,
        grantsOnGraduation: p.grantsOnGraduation,
      },
    });
  }

  // ── Helper: look up a program's DB id by name + type ─────────────────────
  const getId = async (name: string, type: string): Promise<string> => {
    const rec = await prisma.educationProgram.findUniqueOrThrow({
      where: { name_type: { name, type } },
      select: { id: true },
    });
    return rec.id;
  };

  const getIds = async (pairs: { name: string; type: string }[]): Promise<string[]> =>
    Promise.all(pairs.map(p => getId(p.name, p.type)));

  // ── Pass 2: resolve educationIds for programs that require prior degrees ──

  // Collect all associates IDs (for Police Academy)
  const allAssociatesIds = await getIds(
    programs.filter(p => p.type === 'associates').map(p => ({ name: p.name, type: 'associates' }))
  );

  // Collect all bachelors IDs (for Flight School, Law School, Teaching Credential)
  const allBachelorsIds = await getIds(
    programs.filter(p => p.type === 'bachelors').map(p => ({ name: p.name, type: 'bachelors' }))
  );

  // ── Certificate prereqs ───────────────────────────────────────────────────
  const certUpdates: Array<{ name: string; educationIds?: string[]; educationOptions?: object[] }> = [
    // Police Academy: any associates OR 2 yrs FT work (workExperienceAlternative already set)
    { name: 'Police Academy', educationIds: allAssociatesIds },

    // Flight School: any bachelors
    { name: 'Flight School', educationIds: allBachelorsIds },

    // Law School: any bachelors
    { name: 'Law School', educationIds: allBachelorsIds },

    // Teaching Credential: any bachelors
    { name: 'Teaching Credential', educationIds: allBachelorsIds },

    // Medical School: bachelors Biology
    { name: 'Medical School', educationIds: [await getId('Biology', 'bachelors')] },

    // Chiropractic School: bachelors Biology
    { name: 'Chiropractic School', educationIds: [await getId('Biology', 'bachelors')] },

    // Dental School: bachelors Biology
    { name: 'Dental School', educationIds: [await getId('Biology', 'bachelors')] },

    // Optometry School: bachelors Biology
    { name: 'Optometry School', educationIds: [await getId('Biology', 'bachelors')] },

    // Physical Therapy School: bachelors Biology
    { name: 'Physical Therapy School', educationIds: [await getId('Biology', 'bachelors')] },

    // Pharmacy School: bachelors Chemistry
    { name: 'Pharmacy School', educationIds: [await getId('Chemistry', 'bachelors')] },

    // General Medical Residency: Medical School certificate
    { name: 'General Medical Residency', educationIds: [await getId('Medical School', 'certificate')] },

    // Surgical Residency: Medical School certificate
    { name: 'Surgical Residency', educationIds: [await getId('Medical School', 'certificate')] },
  ];

  // Astronaut Academy: structured educationOptions (each qualifying degree, some with work req)
  const astronautOptions = [
    { educationId: await getId('Computer Science',    'bachelors') },
    { educationId: await getId('Computer Engineering','masters')   },
    { educationId: await getId('Astrophysics',        'masters')   },
    { educationId: await getId('Botany',              'masters')   },
    { educationId: await getId('Nursing',             'bachelors') },
    { educationId: await getId('Medical School',      'certificate') },
    { educationId: await getId('Chiropractic School', 'certificate') },
    { educationId: await getId('Dental School',       'certificate') },
    { educationId: await getId('Optometry School',    'certificate') },
    { educationId: await getId('Physical Therapy School', 'certificate') },
    { educationId: await getId('Flight School',       'certificate'), workExperienceRequired: { years: 2, jobTitle: 'Pilot' } },
  ];

  // Apply certificate updates
  for (const u of certUpdates) {
    const existing = await prisma.educationProgram.findUniqueOrThrow({
      where: { name_type: { name: u.name, type: 'certificate' } },
      select: { requirements: true },
    });
    const req = existing.requirements as Record<string, unknown>;
    await prisma.educationProgram.update({
      where: { name_type: { name: u.name, type: 'certificate' } },
      data: { requirements: { ...req, educationIds: u.educationIds } },
    });
  }

  // Astronaut Academy: set educationOptions
  {
    const existing = await prisma.educationProgram.findUniqueOrThrow({
      where: { name_type: { name: 'Astronaut Academy', type: 'certificate' } },
      select: { requirements: true },
    });
    const req = existing.requirements as Record<string, unknown>;
    await prisma.educationProgram.update({
      where: { name_type: { name: 'Astronaut Academy', type: 'certificate' } },
      data: { requirements: { ...req, educationOptions: astronautOptions } },
    });
  }

  // ── Masters prereqs: each masters requires its corresponding bachelors ────
  const mastersPrereqs: Array<{ name: string; bachelorName: string }> = [
    // Fine Arts
    { name: 'Drama',                    bachelorName: 'Drama' },
    { name: 'Vocal Performance',        bachelorName: 'Vocal Performance' },
    { name: 'Instrumental Performance', bachelorName: 'Instrumental Performance' },
    { name: 'Photography',              bachelorName: 'Photography' },
    { name: 'Material Art',             bachelorName: 'Art' },
    { name: 'Digital Art',              bachelorName: 'Art' },
    { name: 'Dance',                    bachelorName: 'Dance' },
    { name: 'Graphic Design',           bachelorName: 'Graphic Design' },
    // Humanities
    { name: 'English',                  bachelorName: 'English' },
    { name: 'Psychology',               bachelorName: 'Psychology' },
    { name: 'Education',                bachelorName: 'Education' },
    { name: 'Sociology',                bachelorName: 'Sociology' },
    { name: 'Architecture',             bachelorName: 'Architecture' },
    { name: 'Linguistics',              bachelorName: 'Linguistics' },
    { name: 'Archaeology',              bachelorName: 'Archaeology' },
    { name: 'Anthropology',             bachelorName: 'Anthropology' },
    { name: 'Criminology',              bachelorName: 'Criminology' },
    // Math
    { name: 'Economics',                bachelorName: 'Economics' },
    { name: 'Statistics',               bachelorName: 'Statistics' },
    { name: 'Finance',                  bachelorName: 'Finance' },
    { name: 'Computer Science',         bachelorName: 'Computer Science' },
    { name: 'Cybersecurity',            bachelorName: 'Computer Science' },
    { name: 'Artificial Intelligence',  bachelorName: 'Computer Science' },
    { name: 'Computer Engineering',     bachelorName: 'Computer Science' },
    { name: 'Data Science',             bachelorName: 'Data Science' },
    { name: 'Business',                 bachelorName: 'Business' },
    // Physical Sciences
    { name: 'Chemistry',                bachelorName: 'Chemistry' },
    { name: 'Geology',                  bachelorName: 'Earth Science' },
    { name: 'Paleontology',             bachelorName: 'Earth Science' },
    { name: 'Climatology',              bachelorName: 'Earth Science' },
    { name: 'Astrophysics',             bachelorName: 'Astronomy' },
    // Biological Sciences
    { name: 'Ecology',                  bachelorName: 'Environmental Science' },
    { name: 'Botany',                   bachelorName: 'Environmental Science' },
    { name: 'Nature Conservation',      bachelorName: 'Environmental Science' },
    { name: 'Veterinary Studies',       bachelorName: 'Animal Science' },
    { name: 'Zoology',                  bachelorName: 'Animal Science' },
    { name: 'Marine Biology',           bachelorName: 'Animal Science' },
    { name: 'Nursing',                  bachelorName: 'Nursing' },
    { name: 'Biology',                  bachelorName: 'Biology' },
    { name: 'Genetics',                 bachelorName: 'Biology' },
    { name: 'Epidemiology',             bachelorName: 'Biology' },
    { name: 'Neurobiology',             bachelorName: 'Biology' },
  ];

  for (const { name, bachelorName } of mastersPrereqs) {
    const bId = await getId(bachelorName, 'bachelors');
    const existing = await prisma.educationProgram.findUniqueOrThrow({
      where: { name_type: { name, type: 'masters' } },
      select: { requirements: true },
    });
    const req = existing.requirements as Record<string, unknown>;
    await prisma.educationProgram.update({
      where: { name_type: { name, type: 'masters' } },
      data: { requirements: { ...req, educationIds: [bId] } },
    });
  }

  // ── Doctorate prereqs: each PhD requires its corresponding masters ────────
  const phdPrereqs: Array<{ name: string; mastersName: string }> = [
    // Fine Arts
    { name: 'Drama',                    mastersName: 'Drama' },
    { name: 'Vocal Performance',        mastersName: 'Vocal Performance' },
    { name: 'Instrumental Performance', mastersName: 'Instrumental Performance' },
    { name: 'Photography',              mastersName: 'Photography' },
    { name: 'Material Art',             mastersName: 'Material Art' },
    { name: 'Digital Art',              mastersName: 'Digital Art' },
    { name: 'Dance',                    mastersName: 'Dance' },
    { name: 'Graphic Design',           mastersName: 'Graphic Design' },
    // Humanities
    { name: 'English',                  mastersName: 'English' },
    { name: 'Psychology',               mastersName: 'Psychology' },
    { name: 'Education',                mastersName: 'Education' },
    { name: 'Sociology',                mastersName: 'Sociology' },
    { name: 'Architecture',             mastersName: 'Architecture' },
    { name: 'Linguistics',              mastersName: 'Linguistics' },
    { name: 'Archaeology',              mastersName: 'Archaeology' },
    { name: 'Anthropology',             mastersName: 'Anthropology' },
    { name: 'Criminology',              mastersName: 'Criminology' },
    // Math
    { name: 'Economics',                mastersName: 'Economics' },
    { name: 'Statistics',               mastersName: 'Statistics' },
    { name: 'Finance',                  mastersName: 'Finance' },
    { name: 'Computer Science',         mastersName: 'Computer Science' },
    { name: 'Cybersecurity',            mastersName: 'Cybersecurity' },
    { name: 'Computer Engineering',     mastersName: 'Computer Engineering' },
    { name: 'Data Science',             mastersName: 'Data Science' },
    { name: 'Business',                 mastersName: 'Business' },
    // Physical Sciences
    { name: 'Chemistry',                mastersName: 'Chemistry' },
    { name: 'Geology',                  mastersName: 'Geology' },
    { name: 'Paleontology',             mastersName: 'Paleontology' },
    { name: 'Climatology',              mastersName: 'Climatology' },
    { name: 'Astrophysics',             mastersName: 'Astrophysics' },
    // Biological Sciences
    { name: 'Ecology',                  mastersName: 'Ecology' },
    { name: 'Botany',                   mastersName: 'Botany' },
    { name: 'Nature Conservation',      mastersName: 'Nature Conservation' },
    { name: 'Veterinary Studies',       mastersName: 'Veterinary Studies' },
    { name: 'Zoology',                  mastersName: 'Zoology' },
    { name: 'Marine Biology',           mastersName: 'Marine Biology' },
    { name: 'Nursing',                  mastersName: 'Nursing' },
    { name: 'Biology',                  mastersName: 'Biology' },
    { name: 'Genetics',                 mastersName: 'Genetics' },
    { name: 'Epidemiology',             mastersName: 'Epidemiology' },
    { name: 'Neurobiology',             mastersName: 'Neurobiology' },
  ];

  for (const { name, mastersName } of phdPrereqs) {
    const mId = await getId(mastersName, 'masters');
    const existing = await prisma.educationProgram.findUniqueOrThrow({
      where: { name_type: { name, type: 'doctorate' } },
      select: { requirements: true },
    });
    const req = existing.requirements as Record<string, unknown>;
    await prisma.educationProgram.update({
      where: { name_type: { name, type: 'doctorate' } },
      data: { requirements: { ...req, educationIds: [mId] } },
    });
  }

  console.log('✅ Education programs seeded');
}
