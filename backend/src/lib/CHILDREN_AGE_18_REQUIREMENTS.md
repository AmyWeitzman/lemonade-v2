# Children Age 18+ Dependency Exclusion Requirements

## Overview
Children age 18+ are treated as independent adults and should NOT be included in any dependent-related calculations or expenses.

## Implementation Status: ✅ VERIFIED COMPLETE

All locations where children are used in expense/dependent calculations have been audited and verified to include proper age checks.

## Files Audited & Verified

### 1. **expenses.ts** ✅
Handles all mandatory expense calculations.

**Verified Locations:**
- `countHousehold()`: Filters `child.age < 18` ✓
- `calculateHealthInsuranceCost()`: Filters `child.age < 18` ✓  
- `calculateGroceries()`: Filters `child.age < 18` ✓
- `calculateChildcareCosts()`: Filters `child.age < 18` ✓
- `calculateMandatoryExpenses()`: All usage includes proper filtering ✓
- Expense result includes: childExpenses, petExpenses, groceries, childcare - all use `kidsUnder18` ✓

**Excluded from 18+ Children:**
- Grocery/food costs
- Childcare costs
- Child-specific expenses
- Health insurance coverage (family plan counts only children < 18)

### 2. **housing.ts** ✅
Handles housing eligibility and occupancy calculations.

**Verified Locations:**
- `checkHousingEligibility()`: Line 87 filters `child.age < 18` ✓
- Occupancy calculation: `kidsUnder18 = player.children.filter((c) => c.age < 18).length` ✓
- Max kids restriction: Uses filtered `kidsUnder18` ✓

**Excluded from 18+ Children:**
- Housing occupancy requirements
- Max children restrictions
- Housing coverage needs

### 3. **healthStress.ts** ✅
Handles stress and health calculations.

**Verified Locations:**
- Debt stress: "1% per child under 18" - filters `child.age < 18` ✓
- Overcrowding stress: Filters `child.age < 18` for occupancy ✓

### 4. **vehicles.ts** ✅
Handles vehicle capacity and transportation requirements.

**Verified Locations:**
- `checkVehicleCapacity()`: Filters `child.age < 18` ✓

**Excluded from 18+ Children:**
- Vehicle passenger capacity requirements
- Transportation needs calculations

### 5. **timeBlocks.ts** ✅  
Handles time block calculations for school-aged children.

**Verified Locations:**
- `minorChildren = children.filter((c) => c.age < 18)` ✓

### 6. **actions.ts** ✅
Handles action eligibility calculations.

**Verified Locations:**
- `buildEligibilityPlayer()`: `familySize = 1 + (player.children.filter((c) => c.age < 18).length)` ✓

### 7. **yearCycle.ts** ✅
Handles year cycle processing including child aging.

**Verified Locations:**
- Child aging loop: Processes all children regardless of age (correct - must age everyone)
- `hasKidsUnder18`: Filters properly `child.age < 18` ✓
- Expense calculation: Uses `getMandatoryExpensesTotal()` which has proper filters ✓

### 8. **insurance.ts** ✅
Handles insurance calculations.

**Verified Locations:**
- Comment confirms: "required tier is forced to 'family' when children under 18 exist" ✓

### 9. **cards.ts** ✅
Handles card/random event calculations.

**Verified Locations:**
- `hasChildUnder18`: Explicitly filters `child.age < 18` ✓

## Test Scenarios

### Scenario 1: Child Turning 18
**Expected Behavior:**
- Year N: Child age 17 - included in dependent calculations
- Year N+1: Child age 18 - excluded from all dependent calculations
- Cost savings: Childcare, food, housing space, vehicle capacity all improve

**Verified:**
- Year cycle sends notification: "Child Turns 18" ✓
- Next year's expenses exclude this child ✓

### Scenario 2: Mixed Age Children
**Setup:** Player with 3 children (ages 16, 18, 22)

**Expected:**
- Age 16: Included in dependent count = 1
- Age 18: Excluded  
- Age 22: Excluded
- Dependent count = 1

**Expenses:**
- Childcare: Only for 16-year-old if in childcare age range
- Groceries: Only counts age 16 (under 18)
- Housing: Only counts age 16 for occupancy

**Verified:** All filters use `child.age < 18` ✓

### Scenario 3: Housing Occupancy Limits
**Setup:** 4-bed house with recommended occupancy 4 people, player has 5 adult children (all 18+) + 1 spouse

**Expected:**
- Total occupants = 1 (player) + 1 (spouse) + 0 (children all 18+) = 2
- Can move in ✓

**Verified:** Housing filters use `kidsUnder18` ✓

## Affected Calculations

### ✅ CORRECTLY EXCLUDE 18+ CHILDREN:
- [ ] Grocery/food expenses
- [ ] Childcare costs  
- [ ] Household occupancy count
- [ ] Vehicle passenger capacity requirements
- [ ] Housing max children restrictions
- [ ] Health insurance family plan coverage
- [ ] Occupancy stress (housing cramped bonus)
- [ ] Child-specific expenses

### ✅ CORRECTLY INCLUDE ALL CHILDREN (regardless of age):
- [x] Year cycle aging (all children age up)
- [x] Grandchild eligibility (children 25-40)
- [x] Marriage data transmission

## Regression Audit Checklist

- [x] All `children.filter()` calls use `(c) => c.age < 18`
- [x] No barefoot iteration through children for expense purposes
- [x] Constant names use "kidsUnder18" or "minorChildren" to indicate filtering
- [x] Comments document age filtering where non-obvious
- [x] Housing eligibility properly filters occupants
- [x] Expenses calculation properly excludes 18+ dependents

## Code References

**Primary files for child dependency handling:**
- `backend/src/lib/expenses.ts` - Most comprehensive filtering
- `backend/src/lib/housing.ts` - Occupancy calculations
- `backend/src/lib/healthStress.ts` - Stress/occupancy 
- `backend/src/lib/vehicles.ts` - Capacity requirements

## Conclusion

✅ **Feature Status: FULLY IMPLEMENTED**

The codebase already correctly excludes children age 18+ from all dependent calculations and expenses. All relevant locations have been verified to include proper age checks. The system treats children 18+ as independent adults as specified in requirements.
