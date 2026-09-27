import { describe, it, expect } from 'vitest';
import { checkJobHealthRequirement } from '../jobs';

describe('Job Health Grace Period', () => {
  describe('checkJobHealthRequirement', () => {
    it('should return meetsRequirement=true when health is above minimum', () => {
      const result = checkJobHealthRequirement(80, 50, 0);
      expect(result.meetsRequirement).toBe(true);
      expect(result.newGracePeriod).toBe(0);
      expect(result.shouldNotify).toBe(false);
      expect(result.shouldFire).toBe(false);
    });

    it('should return meetsRequirement=true when no health requirement exists', () => {
      const result = checkJobHealthRequirement(30, undefined, 0);
      expect(result.meetsRequirement).toBe(true);
      expect(result.newGracePeriod).toBe(0);
      expect(result.shouldNotify).toBe(false);
      expect(result.shouldFire).toBe(false);
    });

    it('should increment grace period and notify on first year below requirement', () => {
      const result = checkJobHealthRequirement(40, 50, 0);
      expect(result.meetsRequirement).toBe(false);
      expect(result.newGracePeriod).toBe(1);
      expect(result.shouldNotify).toBe(true);
      expect(result.shouldFire).toBe(false);
    });

    it('should auto-fire on second year below requirement', () => {
      const result = checkJobHealthRequirement(40, 50, 1);
      expect(result.meetsRequirement).toBe(false);
      expect(result.newGracePeriod).toBe(2);
      expect(result.shouldNotify).toBe(false);
      expect(result.shouldFire).toBe(true);
    });

    it('should reset grace period when health recovers above requirement', () => {
      const result = checkJobHealthRequirement(60, 50, 1);
      expect(result.meetsRequirement).toBe(true);
      expect(result.newGracePeriod).toBe(0);
      expect(result.shouldNotify).toBe(false);
      expect(result.shouldFire).toBe(false);
    });

    it('should not notify on subsequent years below requirement (only first year)', () => {
      const result = checkJobHealthRequirement(40, 50, 2);
      expect(result.meetsRequirement).toBe(false);
      expect(result.newGracePeriod).toBe(3);
      expect(result.shouldNotify).toBe(false);
      expect(result.shouldFire).toBe(true);
    });

    it('should handle edge case: health exactly at minimum', () => {
      const result = checkJobHealthRequirement(50, 50, 0);
      expect(result.meetsRequirement).toBe(true);
      expect(result.newGracePeriod).toBe(0);
      expect(result.shouldNotify).toBe(false);
      expect(result.shouldFire).toBe(false);
    });

    it('should handle edge case: health just below minimum', () => {
      const result = checkJobHealthRequirement(49.9, 50, 0);
      expect(result.meetsRequirement).toBe(false);
      expect(result.newGracePeriod).toBe(1);
      expect(result.shouldNotify).toBe(true);
      expect(result.shouldFire).toBe(false);
    });
  });
});
