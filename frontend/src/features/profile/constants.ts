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

/** Adjective form of each trait — used in quiz questions ("I am brave") */
export const TRAIT_ADJECTIVES: Record<string, string> = {
  bravery: 'brave',
  perseverance: 'perseverant',
  charisma: 'charismatic',
  compassion: 'compassionate',
  creativity: 'creative',
  organization: 'organized',
  patience: 'patient',
  caution: 'cautious',
  sociability: 'sociable',
  stressTolerance: 'stress-tolerant',
  goodWithKids: 'good with kids',
  physicalAbility: 'physically able',
  communication: 'a good communicator',
};

/** Emoji icons for each trait */
export const TRAIT_ICONS: Record<string, string> = {
  bravery: '🦁',
  perseverance: '🏔️',
  charisma: '✨',
  compassion: '❤️',
  creativity: '🎨',
  organization: '📋',
  patience: '⏳',
  caution: '🛡️',
  sociability: '🤝',
  stressTolerance: '🧘',
  goodWithKids: '👶',
  physicalAbility: '💪',
  communication: '💬',
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

/** Emoji icons for each skill */
export const SKILL_ICONS: Record<string, string> = {
  math: '🔢',
  science: '🔬',
  art: '🖌️',
  music: '🎵',
  writing: '✍️',
  analysis: '📊',
  homeRepair: '🔧',
  technology: '💻',
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

// Quiz constants (personality quiz replaces slider-based adjustment)
export const QUIZ_SKILLS_BUDGET = 34;
export const QUIZ_TRAITS_BUDGET = 49;
export const SKILL_DELTA_MAP: Record<number, number> = { 1: -2, 2: -1, 3: 0, 4: 1, 5: 2 };
export const TRAIT_DELTA_MAP: Record<number, number> = { 1: -10, 2: -5, 3: 0, 4: 5, 5: 10 };
