/**
 * Financial Calculation Engine
 *
 * Pure/deterministic functions — no DB writes. Callers persist changes.
 *
 * Requirements: Req 6 (financial system), Req 37 (taxes), Req 39 (debt stress),
 *               Req 40 (expense forecast)
 */

import type { RetirementTransaction } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TaxBracket {
  minIncome: number;
  maxIncome: number | null;
  rate: number;
  filingStatus: 'single' | 'married';
}

export interface LoanInput {
  id: string;
  currentBalance: number;
  interestRate: number; // decimal, e.g. 0.08
  owner: string; // 'player' | 'spouse'
  isJoint: boolean;
}

export interface LoanResult {
  id: string;
  newBalance: number;
  interestCharged: number;
  minimumPayment: number; // 5% of new balance
}

export interface TaxInput {
  /** Combined taxable income (salary + any other income) */
  income: number;
  filingStatus: 'single' | 'married';
  /** Early retirement withdrawal amount taken this year (if any) */
  earlyRetirementWithdrawal?: number;
  taxBrackets: TaxBracket[];
}

export interface TaxResult {
  taxableIncome: number;
  baseTax: number;
  earlyWithdrawalPenalty: number;
  totalTax: number;
  effectiveRate: number;
  bracketBreakdown: Array<{
    rate: number;
    incomeInBracket: number;
    taxInBracket: number;
  }>;
}

export interface TaxPrepFeeInput {
  age: number;
  filingStatus: 'single' | 'married';
  income: number;
  hasLoans: boolean;
  jobCount: number;
  /** True if player or spouse has accounting experience */
  hasAccountingExperience: boolean;
}

export interface RetirementInterestInput {
  playerId: string;
  currentBalance: number;
  year: number;
  age: number;
}

export interface RetirementInterestResult {
  newBalance: number;
  interestEarned: number;
  transaction: Omit<RetirementTransaction, 'id' | 'createdAt'>;
}

export interface ExpenseForecastInput {
  currentMoney: number;
  projectedIncome: number;
  retirementSavings: number;
  /** All mandatory expenses for next year (pre-calculated by caller) */
  mandatoryExpenses: number;
  /** Early retirement withdrawal penalty owed next year (if any) */
  pendingRetirementPenalty?: number;
}

export interface ExpenseForecastResult {
  availableFunds: number;
  totalExpenses: number;
  remainingFunds: number;
  stressImpact: number; // 0, 1, 3, or 5
  canAfford: boolean;
}

// ─── Tax Calculation ──────────────────────────────────────────────────────────

/**
 * Calculate progressive income taxes.
 * Married players file jointly (combined income, married brackets).
 * Early retirement withdrawal before age 65 incurs 10% additional penalty (Req 37.8).
 */
export function calculateTaxes(input: TaxInput): TaxResult {
  const { income, filingStatus, earlyRetirementWithdrawal = 0, taxBrackets } = input;

  const brackets = taxBrackets
    .filter((b) => b.filingStatus === filingStatus)
    .sort((a, b) => a.minIncome - b.minIncome);

  const taxableIncome = Math.max(0, income);
  let baseTax = 0;
  const bracketBreakdown: TaxResult['bracketBreakdown'] = [];

  for (let i = 0; i < brackets.length; i++) {
    const bracket = brackets[i];
    if (!bracket || taxableIncome <= bracket.minIncome) break;

    const bracketMax = bracket.maxIncome ?? Infinity;
    const incomeInBracket = Math.min(taxableIncome, bracketMax) - bracket.minIncome;
    if (incomeInBracket <= 0) continue;

    const taxInBracket = incomeInBracket * bracket.rate;
    baseTax += taxInBracket;
    bracketBreakdown.push({ rate: bracket.rate, incomeInBracket, taxInBracket });
  }

  // 10% penalty on early retirement withdrawal (Req 37.8)
  const earlyWithdrawalPenalty = earlyRetirementWithdrawal * 0.1;
  const totalTax = baseTax + earlyWithdrawalPenalty;
  const effectiveRate = taxableIncome > 0 ? totalTax / taxableIncome : 0;

  return {
    taxableIncome,
    baseTax,
    earlyWithdrawalPenalty,
    totalTax,
    effectiveRate,
    bracketBreakdown,
  };
}

// ─── Default Tax Brackets ─────────────────────────────────────────────────────

/**
 * US 2024-style progressive tax brackets (starting values before inflation adjustments).
 * Brackets shift up $15,000 every 5 years (Req 37.4).
 */
export const DEFAULT_TAX_BRACKETS: TaxBracket[] = [
  // Single filers
  { minIncome: 0, maxIncome: 11600, rate: 0.10, filingStatus: 'single' },
  { minIncome: 11600, maxIncome: 47150, rate: 0.12, filingStatus: 'single' },
  { minIncome: 47150, maxIncome: 100525, rate: 0.22, filingStatus: 'single' },
  { minIncome: 100525, maxIncome: 191950, rate: 0.24, filingStatus: 'single' },
  { minIncome: 191950, maxIncome: 243725, rate: 0.32, filingStatus: 'single' },
  { minIncome: 243725, maxIncome: 609350, rate: 0.35, filingStatus: 'single' },
  { minIncome: 609350, maxIncome: null, rate: 0.37, filingStatus: 'single' },
  // Married filing jointly
  { minIncome: 0, maxIncome: 23200, rate: 0.10, filingStatus: 'married' },
  { minIncome: 23200, maxIncome: 94300, rate: 0.12, filingStatus: 'married' },
  { minIncome: 94300, maxIncome: 201050, rate: 0.22, filingStatus: 'married' },
  { minIncome: 201050, maxIncome: 383900, rate: 0.24, filingStatus: 'married' },
  { minIncome: 383900, maxIncome: 487450, rate: 0.32, filingStatus: 'married' },
  { minIncome: 487450, maxIncome: 731200, rate: 0.35, filingStatus: 'married' },
  { minIncome: 731200, maxIncome: null, rate: 0.37, filingStatus: 'married' },
];

/**
 * Shift all tax bracket thresholds up by $15,000 (keeping lowest bracket at $0).
 * Called every 5 years (Req 37.4 / Req 37.5).
 */
export function shiftTaxBrackets(brackets: TaxBracket[]): TaxBracket[] {
  return brackets.map((bracket, index) => {
    // Group brackets by filingStatus; first bracket of each group stays at $0
    const isFirstInGroup =
      index === 0 || brackets[index - 1]?.filingStatus !== bracket.filingStatus;
    return {
      ...bracket,
      minIncome: isFirstInGroup ? 0 : bracket.minIncome + 15000,
      maxIncome: bracket.maxIncome !== null ? bracket.maxIncome + 15000 : null,
    };
  });
}

// ─── Tax Preparation Fee ──────────────────────────────────────────────────────

/**
 * Calculate tax preparation fee (Req 6.9–6.11).
 *
 * Free ("simple return") when ALL of:
 *   - exactly 1 job
 *   - age < 65
 *   - income < $100k (single) or < $200k (married)
 *   - no loans
 *
 * Also free if player or spouse has accounting experience.
 * Otherwise $1,600.
 */
export function calculateTaxPreparationFee(input: TaxPrepFeeInput): number {
  if (input.hasAccountingExperience) return 0;
  if (input.jobCount === 0) return 0; // no job = no fee

  const incomeThreshold = input.filingStatus === 'married' ? 200000 : 100000;
  const isSimpleReturn =
    input.jobCount === 1 &&
    input.age < 65 &&
    input.income < incomeThreshold &&
    !input.hasLoans;

  return isSimpleReturn ? 0 : 1600;
}

// ─── Loan Interest ────────────────────────────────────────────────────────────

/**
 * Apply 8% annual interest to each loan and calculate the 5% minimum payment (Req 6.4–6.5).
 * Returns updated balances — does NOT mutate inputs.
 */
export function applyLoanInterest(loans: LoanInput[]): LoanResult[] {
  return loans.map((loan) => {
    const interestCharged = loan.currentBalance * loan.interestRate;
    const newBalance = loan.currentBalance + interestCharged;
    const minimumPayment = newBalance * 0.05;
    return {
      id: loan.id,
      newBalance,
      interestCharged,
      minimumPayment,
    };
  });
}

// ─── Retirement Interest ──────────────────────────────────────────────────────

/**
 * Apply 5% annual interest to retirement savings and record the transaction (Req 15.3).
 * Returns the new balance and a transaction record ready to be inserted.
 */
export function applyRetirementInterest(input: RetirementInterestInput): RetirementInterestResult {
  const interestEarned = input.currentBalance * 0.05;
  const newBalance = input.currentBalance + interestEarned;

  const transaction: Omit<RetirementTransaction, 'id' | 'createdAt'> = {
    playerId: input.playerId,
    year: input.year,
    age: input.age,
    type: 'interest',
    amount: interestEarned,
    balanceAfter: newBalance,
    reason: 'Annual 5% retirement interest',
  };

  return { newBalance, interestEarned, transaction };
}

// ─── Expense Forecast ─────────────────────────────────────────────────────────

/**
 * Project whether the player can afford next year's mandatory expenses (Req 40).
 *
 * Available funds = current money + projected income (+ retirement savings if retired).
 * Stress impact thresholds:
 *   remaining <= $1,000  → +5% stress
 *   remaining <= $5,000  → +3% stress
 *   remaining <= $10,000 → +1% stress
 */
export function calculateExpenseForecast(input: ExpenseForecastInput): ExpenseForecastResult {
  const availableFunds = input.currentMoney + input.projectedIncome;
  const totalExpenses = input.mandatoryExpenses + (input.pendingRetirementPenalty ?? 0);
  const remainingFunds = availableFunds - totalExpenses;

  let stressImpact = 0;
  if (remainingFunds <= 1000) stressImpact = 5;
  else if (remainingFunds <= 5000) stressImpact = 3;
  else if (remainingFunds <= 10000) stressImpact = 1;

  return {
    availableFunds,
    totalExpenses,
    remainingFunds,
    stressImpact,
    canAfford: remainingFunds >= 0,
  };
}
