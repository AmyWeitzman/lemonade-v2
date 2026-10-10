# Temporary Health Debt Restoration Verification Report

## Summary
⚠️ **ISSUE FOUND** - Temporary health debt is NOT being properly restored and reset at year boundaries.

## Verification Results

### 1. Schema Field ✅
**File:** `backend/prisma/schema.prisma:85`
- **Status:** ✅ Field exists correctly
- **Definition:** `temporaryHealthDebt Float @default(0)`
- **Type:** Correct (Float to match health values)

### 2. Health Modification Functions ✅
**File:** `backend/src/lib/healthStress.ts`

**Found Functions:**
- `applyHealthEffects()` (lines 240-293): Properly accumulates `temporaryHealthDebt` when temporary health changes occur
- `restoreTemporaryHealth()` (lines 303-309): Properly restores and resets the debt

**Key Logic in `applyHealthEffects()`:**
```typescript
// When temporary health loss occurs:
state.temporaryHealthDebt += actualLoss;  // Line 262
```

**Key Logic in `restoreTemporaryHealth()`:**
```typescript
if (state.temporaryHealthDebt > 0) {
  state.health = Math.min(state.health + state.temporaryHealthDebt, state.maxHealth);
  state.temporaryHealthDebt = 0;  // RESET
}
```

### 3. Year Cycle Integration ❌ **MISSING**
**File:** `backend/src/lib/yearCycle.ts`

**Issue Found:**
- `restoreTemporaryHealth()` function is NOT imported
- `restoreTemporaryHealth()` is NOT called during year cycle processing
- At year end (line 1017-1045), player update includes `health` and `maxHealth` but NOT `temporaryHealthDebt`

**Current Flow (INCORRECT):**
1. During year: temporary health changes accumulate in `temporaryHealthDebt`
2. Year end: Player object is updated with new `health`, `maxHealth`, but `temporaryHealthDebt` is NOT reset
3. Next year: Temporary debt from previous year is NOT restored

**Expected Flow:**
1. During year: temporary health changes accumulate in `temporaryHealthDebt`
2. Year end: 
   - Call `restoreTemporaryHealth()` to add back temporary debt to health
   - Reset `temporaryHealthDebt` to 0
   - Update player with new `health` and `temporaryHealthDebt: 0`

### 4. Impact Assessment

**Current Broken Behavior:**
- Temporary health debt persists across years
- Temporary health effects don't restore at year boundary
- Player health totals incorrect after year-end reset
- Double-counting: temporary health changes might affect next year's calculations

**Expected Correct Behavior:**
- Temporary health is restored at year start
- After restoration, `temporaryHealthDebt` resets to 0
- Permanent health changes remain (aging health loss, etc.)
- Only new year's temporary changes should affect next year

## Files Affected

### Primary Issue Location
**File:** `backend/src/lib/yearCycle.ts`
- **Lines:** 1-40 (imports), 310-320 (health calculation), 1017-1045 (player update)
- **Action Required:** Import `restoreTemporaryHealth` and call it before year-end player update

### Supporting Files (Correct Implementation)
- `backend/src/lib/healthStress.ts` - Functions are correctly implemented ✅
- `backend/prisma/schema.prisma` - Schema field is correct ✅

## Example Scenario (Demonstrating Bug)

**Year 1:**
- Player starts with health: 80, temporaryHealthDebt: 0
- Card event causes -10 temporary health damage
- Result: health: 70, temporaryHealthDebt: 10
- Year end: health: 70, temporaryHealthDebt: 10 (NOT RESET!)

**Year 2 (Start of Year):**
- Player should have health: 80 (70 + 10 restored)
- But currently: health: 70, temporaryHealthDebt: 10 (still there!)
- If aging health loss is -3, player gets health: 67 instead of 77

## Recommended Fix

### Step 1: Import Function
```typescript
import {
  checkCertificationExpiry,
  revokeCertification,
  grantCertification,
  hasCertification,
  type CertificationEntry,
+  restoreTemporaryHealth,
+  type MutableHealthState,
} from './healthStress';
```

### Step 2: Call at Year Start
In `startNewYear()` function, before calculating new stress/health:
```typescript
// At beginning of year-end processing, restore temporary health
const healthState: MutableHealthState = {
  health: player.health,
  maxHealth: player.maxHealth,
  temporaryHealthDebt: player.temporaryHealthDebt,
};

// Restore temporary health debt to health total
restoreTemporaryHealth(healthState);

// Use restored health for further calculations
const newHealth = healthState.health;  // Will include restored debt
const newMaxHealth = healthState.maxHealth;
const newTemporaryHealthDebt = healthState.temporaryHealthDebt;  // Will be 0
```

### Step 3: Persist Reset
Update player data to include:
```typescript
temporaryHealthDebt: 0,  // Add this line in player.update()
```

## Test Cases Needed

### Test 1: Temporary Debt Restoration
- Create player with health: 70, temporaryHealthDebt: 10
- Complete year
- Verify next year starts with health: 80 (70+10), temporaryHealthDebt: 0

### Test 2: Temporary Debt + Aging Loss
- Create player age 69, health: 80, temporaryHealthDebt: 5
- Complete year
- Verify next year: health: 82 (80+5-3 for aging), temporaryHealthDebt: 0

### Test 3: Temporary Debt Capped at MaxHealth
- Create player health: 95, maxHealth: 100, temporaryHealthDebt: 10
- Complete year
- Verify next year: health: 100 (capped), temporaryHealthDebt: 0

## Acceptance Criteria Review

- [ ] ✅ Schema field exists and has correct type
- [ ] ❌ Temporary debt is applied during year (works, but not reset)
- [ ] ❌ Temporary debt is reset at year boundary (MISSING)
- [ ] ❌ Health restoration logic is integrated (MISSING)

## Conclusion

**Verification Status: INCOMPLETE INTEGRATION**

The infrastructure for temporary health debt exists and is correctly implemented in `healthStress.ts`, but the year cycle integration is missing. The `restoreTemporaryHealth()` function needs to be called at the start of year processing, and `temporaryHealthDebt` needs to be reset to 0 in the player update.

**Severity:** High - Affects health calculations across year boundaries
**Effort to Fix:** Low - One import, one function call, one field update

