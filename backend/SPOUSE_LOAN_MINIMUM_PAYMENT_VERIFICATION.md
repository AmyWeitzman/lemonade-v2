# Spouse Loan Minimum Payment Deduction Verification Report

## Summary
⚠️ **FEATURE NOT IMPLEMENTED** - Spouse loan minimum payments are not being calculated or deducted from mandatory expenses.

## Documentation Requirement
**File:** `game-plan/Game_Instructions.md` Line 22
**Requirement:** "Min payment for spouse loans automatically paid each year; you can choose if you want to additionally pay off your own loans, joint loans, or more of spouse loans"

**Interpretation:**
- Spouse loans have a minimum payment (5% per loan balance, matching player loan rules)
- These minimum payments are automatically paid each year
- This is mandatory - happens before player discretionary choices
- Player can then choose to pay additional amounts on any loans

## Current Implementation Analysis

### Schema & Data Structure ✅
**File:** `backend/prisma/schema.prisma`
- Player model has `loans` relationship: tracks player's own loans ✓
- Spouse object (denormalized JSON): includes `loans?` field for spouse loans ✓

**File:** `backend/src/lib/expenses.ts`
- `SpouseExpenseData` interface includes `loans` field (line 34) ✓
- Data structure exists to support spouse loans ✓

### Loan Calculation Logic ✅ (for player only)
**File:** `backend/src/lib/financials.ts`
- `applyLoanInterest()` function (lines 222-234): Correctly calculates minimum payment as 5% of balance ✓

**File:** `backend/src/lib/expenses.ts`
- Lines 301-310: Player loan minimum payments ARE calculated and included in expenses ✓
- Example: `const loanMinPayments = loanResults.reduce((sum, l) => sum + l.minimumPayment, 0);` ✓

### Spouse Loan Calculation ❌ **MISSING**
**File:** `backend/src/lib/expenses.ts`
- **Issue:** Spouse loans are NOT processed in `calculateMandatoryExpenses()`
- **Location:** Function only processes `player.loans` (line 301-310)
- **Missing:** No calculation for `spouse?.loans` minimum payments
- **Result:** Spouse loan minimum payments are not deducted from expenses

### Missing Implementation Details

#### 1. Spouse Loan Minimum Payment Calculation
Currently at line 301-310:
```typescript
const loanResults = applyLoanInterest(
  player.loans.map((l) => ({
    id: l.id,
    currentBalance: l.currentBalance,
    interestRate: l.interestRate,
    owner: l.owner,
    isJoint: l.isJoint,
  })),
);
const loanMinPayments = loanResults.reduce((sum, l) => sum + l.minimumPayment, 0);
```

**Missing spouse loan processing:**
```typescript
// MISSING: Calculate spouse loan minimum payments
let spouseLoanMinPayments = 0;
if (player.maritalStatus === 'married') {
  const spouse = player.spouse as SpouseExpenseData | null;
  if (spouse?.loans && spouse.loans.length > 0) {
    const spouseLoanResults = applyLoanInterest(spouse.loans);
    spouseLoanMinPayments = spouseLoanResults.reduce((sum, l) => sum + l.minimumPayment, 0);
  }
}
```

#### 2. Inclusion in Mandatory Expenses
**Current:** Line 329 adds only `loanMinPayments` to total
**Missing:** Addition of `spouseLoanMinPayments` to total

#### 3. Result Reporting
**Current:** Returns `loanMinPayments` in result (line 199)
**Missing:** Should return `spouseLoanMinPayments` separately so it's tracked

## Affected Files

### Primary Issue Location
**File:** `backend/src/lib/expenses.ts`
- **Lines 301-310:** Player loan calculation (exists)
- **Lines 311-329:** Total expenses assembly (missing spouse loans)
- **Lines 171-201:** MandatoryExpensesResult interface (missing field for spouse loans)

### Related Files
**File:** `backend/src/lib/financials.ts`
- `applyLoanInterest()` function is correct and can be reused ✓
- Minimum payment formula: `newBalance * 0.05` (5% per year) ✓

## Impact Assessment

### Current Behavior (BROKEN)
- Spouse loans exist in data but are ignored in expense calculations
- Player gets incorrect expense totals
- Spouse loan minimum payments are never deducted
- Spouse can accumulate massive debt without mandatory payments

### Expected Behavior
- Each spouse loan's minimum payment (5% of balance) is calculated
- All spouse loan minimums are summed and added to mandatory expenses
- Player cannot avoid paying spouse loan minimums
- Spouse loan minimums are deducted first (before player discretionary payments)

### Financial Impact
- **Severity:** HIGH - Spouse loans compound without minimum payments
- **Game Balance:** BROKEN - Spouse debt could grow unbounded
- **Example:** Spouse $50k loan → $2,500 minimum payment currently NOT deducted

## Acceptance Criteria Review

- [ ] ❌ Spouse loan minimum payments calculated annually
- [ ] ❌ Deductions occur before player fund allocation
- [ ] ❌ Minimum payment calculation matches loan terms (5% of balance)
- [ ] ❌ Spouse cannot have negative available funds (need to verify behavior)
- [ ] ❌ Test coverage for spouse loan scenarios

## Required Implementation

### Step 1: Update MandatoryExpensesResult Interface (line 171-201)
```typescript
export interface MandatoryExpensesResult {
  // ... existing fields ...
  spouseLoanMinPayments: number;  // ADD THIS
  // ... existing fields ...
}
```

### Step 2: Calculate Spouse Loan Minimums (after line 310)
```typescript
// Calculate spouse loan minimum payments (Req 6.4-6.5 for spouse)
let spouseLoanMinPayments = 0;
if (player.maritalStatus === 'married') {
  const spouse = player.spouse as SpouseExpenseData | null;
  if (spouse?.loans && spouse.loans.length > 0) {
    const spouseLoanResults = applyLoanInterest(spouse.loans);
    spouseLoanMinPayments = spouseLoanResults.reduce((sum, l) => sum + l.minimumPayment, 0);
  }
}
```

### Step 3: Add to Total Expenses (line 329)
```typescript
const total =
  housingCost +
  transportationCost +
  spouseVehicleCosts +
  healthInsurance +
  childcare +
  childExpenses +
  petExpenses +
  groceries +
  miscellaneous +
  chronicConditions +
  tuition +
  spouseTuition +
  spouseCprRenewal +
  taxPrepFee +
  taxes +
  retirementWithdrawalPenalty +
  loanMinPayments +
  spouseLoanMinPayments;  // ADD THIS
```

### Step 4: Return in Result (line 351-369)
```typescript
return {
  housing: housingCost,
  transportation: transportationCost,
  healthInsurance,
  childcare,
  childExpenses,
  petExpenses,
  groceries,
  miscellaneous,
  chronicConditions,
  tuition,
  spouseTuition,
  spouseVehicleCosts,
  spouseCprRenewal,
  taxPrepFee,
  taxes,
  retirementWithdrawalPenalty,
  loanMinPayments,
  spouseLoanMinPayments,  // ADD THIS
  total,
  breakdown,
};
```

## Test Scenarios Needed

### Test 1: Single Spouse Loan
- Spouse has 1 loan: $10,000 balance
- Expected minimum payment: $500 (5%)
- Verify expense includes $500

### Test 2: Multiple Spouse Loans
- Spouse has 2 loans: $10,000 and $5,000
- Expected minimum payments: $500 + $250 = $750
- Verify expense includes $750

### Test 3: No Spouse Loans
- Spouse married but no loans
- Expected minimum payment: $0
- Verify expense includes $0 (not errored)

### Test 4: Insufficient Spouse Funds
- Spouse has $20k debt, minimum payment $1,000
- Spouse available funds: $500
- **Question:** What should happen?
  - Option A: Take $500 available + $500 new loan (keeps balance growing)?
  - Option B: Take $500, defer $500 to next year?
  - Option C: Force spouse to get auto-loan for $500 (like player)?

## Edge Cases to Define

### Edge Case 1: Spouse Fund Depletion
When spouse minimum payments exceed available funds, what is the behavior?
- **Current:** Unknown/undefined
- **Should be:** Explicitly defined in requirements

### Edge Case 2: Spouse Marriage/Divorce
When spouse acquires loans, are they included?
When divorce happens, how are loans split?
- **Current:** Unknown
- **Should be:** Explicitly defined

### Edge Case 3: Joint vs. Own Loans
The documentation mentions "own loans" vs "joint loans"
- Own loans: Spouse's original loans (in orig_loans field)
- Joint loans: Acquired during marriage
- **Question:** Do both require minimum payments?
- **Current:** Spouse.loans field type is unclear on distinction

## Conclusion

**Verification Status: FEATURE NOT IMPLEMENTED**

The data structures exist to support spouse loan minimum payments, but the calculation logic is completely missing from the expense calculation system. This is a significant bug as spouse loans can accumulate unbounded debt without any mandatory payment requirement.

**Severity:** HIGH - Game mechanic is broken
**Scope:** Affects spouse finances, loan management, game balance
**Effort to Implement:** Medium - Requires calculation logic, edge case handling, and testing

**Blocking:** Should be fixed before any spouse loan gameplay is allowed.

