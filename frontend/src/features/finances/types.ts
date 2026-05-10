/**
 * Shared TypeScript types for the Finances (Harvest) feature.
 * Requirements: Req 6, Req 18, Req 37
 */

export interface LoanDetail {
  id: string;
  principal: number;
  currentBalance: number;
  interestRate: number;
  minimumPayment: number;
  originAge: number;
  isJoint: boolean;
  owner: 'player' | 'spouse';
  projectedBalance: number;
  interestThisYear: number;
}

export interface RetirementTransaction {
  id: string;
  year: number;
  age: number;
  type: 'contribution' | 'withdrawal' | 'interest' | 'penalty';
  amount: number;
  balanceAfter: number;
  reason: string | null;
  createdAt: string;
}

export interface ExpenseBreakdown {
  housing: number;
  transportation: number;
  spouseVehicleCosts: number;
  healthInsurance: number;
  childcare: number;
  childExpenses: number;
  petExpenses: number;
  groceries: number;
  miscellaneous: number;
  chronicConditions: number;
  tuition: number;
  spouseTuition: number;
  spouseCprRenewal: number;
  taxPrepFee: number;
  taxes: number;
  loanMinPayments: number;
}

export interface FinancialSummaryData {
  money: number;
  projectedIncome: number;
  retirementSavings: number;
  collegeFund: number;
  loans: LoanDetail[];
  retirementHistory: RetirementTransaction[];
  mandatoryExpenses: {
    breakdown: ExpenseBreakdown;
    total: number;
  };
  availableFunds: number;
  yearComplete: boolean;
}

export interface ExpensesData {
  expenses: ExpenseBreakdown;
  total: number;
  pendingPenalties: number;
  grandTotal: number;
  availableFunds: number;
  retirementSavings: number;
  canAfford: boolean;
  yearComplete: boolean;
}

export interface TaxBracketInfo {
  rate: number;
  incomeInBracket: number;
  taxInBracket: number;
}

export interface ForecastData {
  currentMoney: number;
  projectedIncome: number;
  projectedRetirementBalance: number;
  retirementInterestNextYear: number;
  estimatedExpenses: ExpenseBreakdown;
  estimatedTotal: number;
  pendingPenalties: number;
  forecast: {
    availableFunds: number;
    totalExpenses: number;
    remainingFunds: number;
    stressImpact: number;
    canAfford: boolean;
  };
}
