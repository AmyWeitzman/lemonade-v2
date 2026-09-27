import { describe, it, expect } from 'vitest';
import {
  shiftTaxBrackets,
  calculateTaxes,
  DEFAULT_TAX_BRACKETS,
  type TaxBracket,
} from '../financials';

describe('financials', () => {
  describe('shiftTaxBrackets', () => {
    it('should shift single filer brackets up by $15,000 (except first)', () => {
      const shifted = shiftTaxBrackets(DEFAULT_TAX_BRACKETS);

      // Find single filer brackets
      const singleBrackets = shifted.filter((b) => b.filingStatus === 'single');

      // First single bracket should stay at 0
      expect(singleBrackets[0]?.minIncome).toBe(0);

      // Second bracket should be shifted from 11,600 to 26,600
      expect(singleBrackets[1]?.minIncome).toBe(11600 + 15000);
      expect(singleBrackets[1]?.maxIncome).toBe(47150 + 15000);

      // Third bracket should be shifted from 47,150 to 62,150
      expect(singleBrackets[2]?.minIncome).toBe(47150 + 15000);
      expect(singleBrackets[2]?.maxIncome).toBe(100525 + 15000);
    });

    it('should shift married filer brackets up by $15,000 (except first)', () => {
      const shifted = shiftTaxBrackets(DEFAULT_TAX_BRACKETS);

      // Find married filer brackets
      const marriedBrackets = shifted.filter((b) => b.filingStatus === 'married');

      // First married bracket should stay at 0
      expect(marriedBrackets[0]?.minIncome).toBe(0);

      // Second bracket should be shifted from 23,200 to 38,200
      expect(marriedBrackets[1]?.minIncome).toBe(23200 + 15000);
      expect(marriedBrackets[1]?.maxIncome).toBe(94300 + 15000);

      // Third bracket should be shifted from 94,300 to 109,300
      expect(marriedBrackets[2]?.minIncome).toBe(94300 + 15000);
      expect(marriedBrackets[2]?.maxIncome).toBe(201050 + 15000);
    });

    it('should preserve tax rates during shift', () => {
      const shifted = shiftTaxBrackets(DEFAULT_TAX_BRACKETS);

      // Verify rates are unchanged
      const originalRates = DEFAULT_TAX_BRACKETS.map((b) => b.rate);
      const shiftedRates = shifted.map((b) => b.rate);

      expect(shiftedRates).toEqual(originalRates);
    });

    it('should preserve filing status during shift', () => {
      const shifted = shiftTaxBrackets(DEFAULT_TAX_BRACKETS);

      const originalStatuses = DEFAULT_TAX_BRACKETS.map((b) => b.filingStatus);
      const shiftedStatuses = shifted.map((b) => b.filingStatus);

      expect(shiftedStatuses).toEqual(originalStatuses);
    });

    it('should handle null maxIncome (top bracket)', () => {
      const shifted = shiftTaxBrackets(DEFAULT_TAX_BRACKETS);

      // Top brackets should still have null maxIncome
      const topSingleBracket = shifted.find(
        (b) => b.filingStatus === 'single' && b.maxIncome === null,
      );
      const topMarriedBracket = shifted.find(
        (b) => b.filingStatus === 'married' && b.maxIncome === null,
      );

      expect(topSingleBracket).toBeDefined();
      expect(topMarriedBracket).toBeDefined();
    });

    it('should apply multiple shifts correctly', () => {
      let brackets = DEFAULT_TAX_BRACKETS;

      // Apply shift 3 times (simulating year 5, 10, 15)
      brackets = shiftTaxBrackets(brackets);
      brackets = shiftTaxBrackets(brackets);
      brackets = shiftTaxBrackets(brackets);

      const singleBrackets = brackets.filter((b) => b.filingStatus === 'single');

      // After 3 shifts, second bracket should be shifted by 45,000 total
      expect(singleBrackets[1]?.minIncome).toBe(11600 + 45000);
      expect(singleBrackets[1]?.maxIncome).toBe(47150 + 45000);
    });
  });

  describe('calculateTaxes', () => {
    it('should calculate taxes correctly with initial brackets (single filer)', () => {
      const result = calculateTaxes({
        income: 50000,
        filingStatus: 'single',
        taxBrackets: DEFAULT_TAX_BRACKETS,
      });

      // $50,000 single filer:
      // $0-$11,600 @ 10% = $1,160
      // $11,600-$47,150 @ 12% = $4,266
      // $47,150-$50,000 @ 22% = $627
      // Total = $6,053
      expect(result.taxableIncome).toBe(50000);
      expect(result.baseTax).toBeCloseTo(6053, 0);
      expect(result.earlyWithdrawalPenalty).toBe(0);
      expect(result.totalTax).toBeCloseTo(6053, 0);
    });

    it('should calculate taxes correctly with initial brackets (married filer)', () => {
      const result = calculateTaxes({
        income: 100000,
        filingStatus: 'married',
        taxBrackets: DEFAULT_TAX_BRACKETS,
      });

      // $100,000 married filing jointly:
      // $0-$23,200 @ 10% = $2,320
      // $23,200-$94,300 @ 12% = $8,532
      // $94,300-$100,000 @ 22% = $1,254
      // Total = $12,106
      expect(result.taxableIncome).toBe(100000);
      expect(result.baseTax).toBeCloseTo(12106, 0);
      expect(result.totalTax).toBeCloseTo(12106, 0);
    });

    it('should apply 10% penalty on early retirement withdrawal', () => {
      const result = calculateTaxes({
        income: 50000,
        filingStatus: 'single',
        earlyRetirementWithdrawal: 10000,
        taxBrackets: DEFAULT_TAX_BRACKETS,
      });

      // 10% penalty on $10,000 = $1,000
      expect(result.earlyWithdrawalPenalty).toBe(1000);
      expect(result.totalTax).toBe(result.baseTax + 1000);
    });

    it('should calculate effective tax rate correctly', () => {
      const result = calculateTaxes({
        income: 50000,
        filingStatus: 'single',
        taxBrackets: DEFAULT_TAX_BRACKETS,
      });

      const expectedRate = result.totalTax / 50000;
      expect(result.effectiveRate).toBeCloseTo(expectedRate, 4);
    });

    it('should handle zero income', () => {
      const result = calculateTaxes({
        income: 0,
        filingStatus: 'single',
        taxBrackets: DEFAULT_TAX_BRACKETS,
      });

      expect(result.taxableIncome).toBe(0);
      expect(result.baseTax).toBe(0);
      expect(result.totalTax).toBe(0);
      expect(result.effectiveRate).toBe(0);
    });

    it('should handle negative income (clamped to 0)', () => {
      const result = calculateTaxes({
        income: -5000,
        filingStatus: 'single',
        taxBrackets: DEFAULT_TAX_BRACKETS,
      });

      expect(result.taxableIncome).toBe(0);
      expect(result.baseTax).toBe(0);
      expect(result.totalTax).toBe(0);
    });

    it('should calculate taxes correctly after one bracket shift', () => {
      const shiftedBrackets = shiftTaxBrackets(DEFAULT_TAX_BRACKETS);

      // Same income ($50,000) should result in lower taxes after shift
      // because brackets are higher
      const resultBefore = calculateTaxes({
        income: 50000,
        filingStatus: 'single',
        taxBrackets: DEFAULT_TAX_BRACKETS,
      });

      const resultAfter = calculateTaxes({
        income: 50000,
        filingStatus: 'single',
        taxBrackets: shiftedBrackets,
      });

      // After shift, more income falls in lower brackets
      expect(resultAfter.baseTax).toBeLessThan(resultBefore.baseTax);
    });

    it('should calculate taxes correctly after multiple bracket shifts', () => {
      let brackets = DEFAULT_TAX_BRACKETS;
      brackets = shiftTaxBrackets(brackets);
      brackets = shiftTaxBrackets(brackets);

      const result = calculateTaxes({
        income: 50000,
        filingStatus: 'single',
        taxBrackets: brackets,
      });

      // After 2 shifts ($30,000 total), $50,000 income should be in lower brackets
      expect(result.baseTax).toBeGreaterThan(0);
      expect(result.taxableIncome).toBe(50000);
    });

    it('should provide bracket breakdown', () => {
      const result = calculateTaxes({
        income: 50000,
        filingStatus: 'single',
        taxBrackets: DEFAULT_TAX_BRACKETS,
      });

      expect(result.bracketBreakdown.length).toBeGreaterThan(0);
      expect(result.bracketBreakdown[0]).toHaveProperty('rate');
      expect(result.bracketBreakdown[0]).toHaveProperty('incomeInBracket');
      expect(result.bracketBreakdown[0]).toHaveProperty('taxInBracket');

      // Sum of taxes in breakdown should equal baseTax
      const totalFromBreakdown = result.bracketBreakdown.reduce(
        (sum, b) => sum + b.taxInBracket,
        0,
      );
      expect(totalFromBreakdown).toBeCloseTo(result.baseTax, 2);
    });

    it('should handle high income correctly', () => {
      const result = calculateTaxes({
        income: 1000000,
        filingStatus: 'married',
        taxBrackets: DEFAULT_TAX_BRACKETS,
      });

      expect(result.taxableIncome).toBe(1000000);
      expect(result.baseTax).toBeGreaterThan(0);
      expect(result.effectiveRate).toBeGreaterThan(0.3); // Should be in high brackets
      expect(result.effectiveRate).toBeLessThan(0.4); // But not unreasonable
    });

    it('should handle edge case at bracket boundary', () => {
      // Test income exactly at a bracket boundary
      const result = calculateTaxes({
        income: 11600, // Exactly at first bracket boundary for single
        filingStatus: 'single',
        taxBrackets: DEFAULT_TAX_BRACKETS,
      });

      // $0-$11,600 @ 10% = $1,160
      expect(result.baseTax).toBeCloseTo(1160, 0);
    });

    it('should handle edge case just above bracket boundary', () => {
      const result = calculateTaxes({
        income: 11601, // Just above first bracket boundary
        filingStatus: 'single',
        taxBrackets: DEFAULT_TAX_BRACKETS,
      });

      // $0-$11,600 @ 10% = $1,160
      // $11,600-$11,601 @ 12% = $0.12
      expect(result.baseTax).toBeCloseTo(1160.12, 1);
    });

    it('should combine early withdrawal penalty with bracket calculations', () => {
      const resultWithoutWithdrawal = calculateTaxes({
        income: 50000,
        filingStatus: 'single',
        earlyRetirementWithdrawal: 0,
        taxBrackets: DEFAULT_TAX_BRACKETS,
      });

      const resultWithWithdrawal = calculateTaxes({
        income: 50000,
        filingStatus: 'single',
        earlyRetirementWithdrawal: 5000,
        taxBrackets: DEFAULT_TAX_BRACKETS,
      });

      // Penalty should be exactly 10% of withdrawal
      const expectedPenalty = 5000 * 0.1;
      expect(resultWithWithdrawal.earlyWithdrawalPenalty).toBe(expectedPenalty);

      // Base tax should be the same
      expect(resultWithWithdrawal.baseTax).toBeCloseTo(resultWithoutWithdrawal.baseTax, 2);

      // Total tax should be base + penalty
      expect(resultWithWithdrawal.totalTax).toBeCloseTo(
        resultWithoutWithdrawal.totalTax + expectedPenalty,
        2,
      );
    });
  });

  describe('tax bracket shifts over time', () => {
    it('should show progressive tax relief over 15 years', () => {
      const income = 60000;
      const filingStatus = 'single';

      // Year 0 (initial)
      const year0 = calculateTaxes({
        income,
        filingStatus,
        taxBrackets: DEFAULT_TAX_BRACKETS,
      });

      // Year 5 (1 shift)
      let brackets = shiftTaxBrackets(DEFAULT_TAX_BRACKETS);
      const year5 = calculateTaxes({
        income,
        filingStatus,
        taxBrackets: brackets,
      });

      // Year 10 (2 shifts)
      brackets = shiftTaxBrackets(brackets);
      const year10 = calculateTaxes({
        income,
        filingStatus,
        taxBrackets: brackets,
      });

      // Year 15 (3 shifts)
      brackets = shiftTaxBrackets(brackets);
      const year15 = calculateTaxes({
        income,
        filingStatus,
        taxBrackets: brackets,
      });

      // Taxes should decrease over time due to bracket creep adjustment
      expect(year0.baseTax).toBeGreaterThan(year5.baseTax);
      expect(year5.baseTax).toBeGreaterThan(year10.baseTax);
      expect(year10.baseTax).toBeGreaterThan(year15.baseTax);

      // Effective rates should also decrease
      expect(year0.effectiveRate).toBeGreaterThan(year5.effectiveRate);
      expect(year5.effectiveRate).toBeGreaterThan(year10.effectiveRate);
      expect(year10.effectiveRate).toBeGreaterThan(year15.effectiveRate);
    });
  });
});
