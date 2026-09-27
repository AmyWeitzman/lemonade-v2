/**
 * Shared types for the Actions feature.
 */

export interface ActionUserInputOption {
  value: string;
  label: string;
  /** Overrides the action's flat cost when this option is selected. */
  cost?: number;
  /** Overrides the activity time blocks consumed when this option is selected. */
  timeBlocks?: number;
  /** Merged on top of the action's base effects when this option is selected. */
  effects?: Record<string, unknown>;
}

export interface ActionUserInput {
  /** 'duration_sightseeing' renders two toggles that combine into an option value; 'dropdown' renders a single select. */
  type: 'duration_sightseeing' | 'dropdown' | string;
  label?: string;
  options: ActionUserInputOption[];
}

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
  allowsPTO: boolean;
  userInput: ActionUserInput | null;
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
  chores: number;
  activities: number;
}

export interface PTOInfo {
  ptoRemaining: number;
  ptoTotal: number;
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
