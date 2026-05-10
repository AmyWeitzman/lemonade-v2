/**
 * Shared types for the Actions feature.
 */

export interface ActionItem {
  id: string;
  name: string;
  category: string[];
  description: string;
  requirements: Record<string, unknown>;
  cost: number;
  costFormula: string;
  baseCost: number | null;
  seniorDiscount: boolean;
  minTimeBlocks: number;
  maxTimeBlocks: number | null;
  timeBlockIncrement: number | null;
  requiresPTO: boolean;
  userInput: unknown;
  effects: Record<string, unknown>;
  executionType: string;
  frequency: string;
  discounts: Record<string, unknown>;
  // Annotated by backend
  eligible: boolean;
  eligibilityReasons: string[];
  calculatedCost: number;
  calculatedLemons: number;
}

export interface TimeBlockBreakdown {
  total: number;
  sleep: number;
  work: number;
  ptoUsed: number;
  childcare: number;
  commute: number;
  pets: number;
  activities: number;
}

export interface CheckoutResult {
  totalLemonsEarned: number;
  healthDelta: number;
  stressDelta: number;
  skillGains: Record<string, number>;
  traitGains: Record<string, number>;
  newHealth: number;
  newStress: number;
  newMoney: number;
}
