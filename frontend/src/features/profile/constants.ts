/**
 * Shared constants for the profile setup workflow.
 * Used by ProfileSetupPage, ProfileReviewPage, and property-based tests.
 */

export const TRAIT_LABELS: Record<string, string> = {
  bravery: 'Bravery',
  perseverance: 'Perseverance',
  charisma: 'Charisma',
  compassion: 'Compassion',
  creativity: 'Creativity',
  organization: 'Organization',
  patience: 'Patience',
  caution: 'Caution',
  sociability: 'Sociability',
  stressTolerance: 'Stress Tolerance',
  goodWithKids: 'Good With Kids',
  physicalAbility: 'Physical Ability',
  communication: 'Communication',
};

export const SKILL_LABELS: Record<string, string> = {
  math: 'Math',
  science: 'Science',
  art: 'Art',
  music: 'Music',
  writing: 'Writing',
  analysis: 'Analysis',
  homeRepair: 'Home Repair',
  technology: 'Technology',
};

export const CAR_LABELS: Record<string, string> = {
  affordable_5seat_gas_10yr: 'Affordable 5-Seater (10yr gas)',
  affordable_5seat_gas_5yr: 'Affordable 5-Seater (5yr gas)',
  affordable_5seat_gas_new: 'Affordable 5-Seater (new gas)',
  bike: 'Bike',
  luxury_2seat_electric_new: 'Luxury 2-Seater (new electric)',
};

export const TRAIT_BASE_BUDGET = 50;
export const SKILL_BASE_BUDGET = 10;
export const TRAIT_MAX_DELTA = 10;
export const SKILL_MAX_DELTA = 2;
