import { describe, expect, it } from 'vitest';
import { getRequiredActions } from '../actionRequirements';
import { canStartWithParents } from '../housingRules';
import { calculateTimeBlocks, type PlayerTimeBlockInput } from '../timeBlocks';

describe('starting housing', () => {
  it.each([22, -1])('starts with parents when the roll allows housing through age %s', (maxParentAge) => {
    const startsWithParents = canStartWithParents(0, 18, maxParentAge);
    expect(startsWithParents).toBe(true);
    expect(getRequiredActions({
      currentYear: 0, age: 18, parentMaxAge: maxParentAge,
      activeHousingType: startsWithParents ? 'parent' : null, couchSurfYearsUsed: 0, hasVehicle: false,
    }).map((action) => action.actionName)).toEqual(['Get Transportation']);
  });

  it('does not assign parents’ housing without permission or outside the first year', () => {
    expect(canStartWithParents(0, 18, null)).toBe(false);
    expect(canStartWithParents(0, 18, undefined)).toBe(false);
    expect(canStartWithParents(0, 23, 22)).toBe(false);
    expect(canStartWithParents(1, 19, -1)).toBe(false);
  });
});

it('uses one activity block for Moving while couch-surfing without growing the annual budget', () => {
  const player: PlayerTimeBlockInput = {
    employments: [], educations: [], children: [], pets: [],
    playerHousingLocation: 'city', spouse: null, childcarePlan: 'none',
  };
  const atParents = calculateTimeBlocks({ ...player, playerHousingType: 'parent' });
  const onCouch = calculateTimeBlocks({ ...player, playerHousingType: 'couch' });
  expect(atParents.moving).toBe(0);
  expect(onCouch.moving).toBe(1);
  expect(onCouch.activities).toBe(atParents.activities - 1);
  expect(onCouch.total).toBe(60);
  expect(onCouch).not.toHaveProperty('chores');
});
