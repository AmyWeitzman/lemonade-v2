/**
 * Pet System — Core Logic
 *
 * Pure/deterministic functions — no DB writes. Callers persist changes.
 *
 * Requirements: Req 17
 */

// ─── Constants ────────────────────────────────────────────────────────────────

export const PET_ADOPTION_FEES = {
  small: 20,
  large: 100,
} as const;

export const PET_FOOD_COSTS = {
  small: 300,
  large: 500,
} as const;

export const PET_VET_COSTS = {
  small: 75,
  large: 1000,
} as const;

/** Death age range: pet can die when its age is within [min, max] */
export const PET_DEATH_AGE_RANGE = {
  small: { min: 4, max: 6 },
  large: { min: 9, max: 11 },
} as const;

/** Lemons granted per pet per year */
export const PET_LEMONS_PER_YEAR = 2;

// ─── Types ────────────────────────────────────────────────────────────────────

export type PetSize = 'small' | 'large';

export interface PetHousingLimits {
  petLimitSmall: number;
  petLimitLarge: number;
}

export interface AdoptPetInput {
  size: PetSize;
  playerMoney: number;
  currentSmallPets: number;
  currentLargePets: number;
  housingLimits: PetHousingLimits;
}

export interface AdoptPetResult {
  canAdopt: boolean;
  reason?: string;
  adoptionFee: number;
  newMoney: number;
  deathAgeMin: number;
  deathAgeMax: number;
}

// ─── adoptPet ─────────────────────────────────────────────────────────────────

/**
 * Validate and calculate pet adoption.
 * Checks housing limits and deducts adoption fee.
 * Req 17.1-2
 */
export function adoptPet(input: AdoptPetInput): AdoptPetResult {
  const { size, playerMoney, currentSmallPets, currentLargePets, housingLimits } = input;

  // Check housing pet limits
  if (size === 'small' && currentSmallPets >= housingLimits.petLimitSmall) {
    return {
      canAdopt: false,
      reason: `Housing only allows ${housingLimits.petLimitSmall} small pet(s). You already have ${currentSmallPets}.`,
      adoptionFee: 0,
      newMoney: playerMoney,
      deathAgeMin: PET_DEATH_AGE_RANGE.small.min,
      deathAgeMax: PET_DEATH_AGE_RANGE.small.max,
    };
  }

  if (size === 'large' && currentLargePets >= housingLimits.petLimitLarge) {
    return {
      canAdopt: false,
      reason: `Housing only allows ${housingLimits.petLimitLarge} large pet(s). You already have ${currentLargePets}.`,
      adoptionFee: 0,
      newMoney: playerMoney,
      deathAgeMin: PET_DEATH_AGE_RANGE.large.min,
      deathAgeMax: PET_DEATH_AGE_RANGE.large.max,
    };
  }

  const adoptionFee = PET_ADOPTION_FEES[size];

  if (playerMoney < adoptionFee) {
    return {
      canAdopt: false,
      reason: `Insufficient funds. Adoption fee is $${adoptionFee}, you have $${playerMoney.toLocaleString()}.`,
      adoptionFee,
      newMoney: playerMoney,
      deathAgeMin: PET_DEATH_AGE_RANGE[size].min,
      deathAgeMax: PET_DEATH_AGE_RANGE[size].max,
    };
  }

  return {
    canAdopt: true,
    adoptionFee,
    newMoney: playerMoney - adoptionFee,
    deathAgeMin: PET_DEATH_AGE_RANGE[size].min,
    deathAgeMax: PET_DEATH_AGE_RANGE[size].max,
  };
}

// ─── calculateAnnualPetExpenses ───────────────────────────────────────────────

export interface PetExpenseInput {
  type: PetSize;
}

/**
 * Calculate annual expenses for a single pet.
 * Vet fees are waived if player has veterinarian job benefit.
 * Req 17.3-5
 */
export function calculateAnnualPetExpenses(
  pets: PetExpenseInput[],
  hasVetWaiver: boolean,
): { food: number; vet: number; total: number } {
  let food = 0;
  let vet = 0;

  for (const pet of pets) {
    food += PET_FOOD_COSTS[pet.type];
    if (!hasVetWaiver) {
      vet += PET_VET_COSTS[pet.type];
    }
  }

  return { food, vet, total: food + vet };
}

// ─── rollPetDeath ─────────────────────────────────────────────────────────────

export interface PetDeathRollInput {
  petId: string;
  type: PetSize;
  age: number; // age AFTER incrementing this year
}

export interface PetDeathRollResult {
  petId: string;
  inDeathRange: boolean;
  died: boolean;
}

/**
 * Roll for pet death. 50% chance if pet is in its death age range.
 * Req 17.7
 */
export function rollPetDeath(input: PetDeathRollInput): PetDeathRollResult {
  const range = PET_DEATH_AGE_RANGE[input.type];
  const inDeathRange = input.age >= range.min && input.age <= range.max;

  if (!inDeathRange) {
    return { petId: input.petId, inDeathRange: false, died: false };
  }

  const died = Math.random() < 0.5;
  return { petId: input.petId, inDeathRange: true, died };
}

// ─── calculatePetLemons ───────────────────────────────────────────────────────

/**
 * Calculate annual lemons earned from pet ownership.
 * 2 lemons per pet per year.
 * Req 17.8
 */
export function calculatePetLemons(alivePetCount: number): number {
  return alivePetCount * PET_LEMONS_PER_YEAR;
}
