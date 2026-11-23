import assert from 'node:assert/strict';
import { test } from 'node:test';
import { expandCheckoutBlocks } from '../lib/checkoutBlocks';
import { prepareEducationChange } from '../lib/educationCheckout';
import type { EduProgramRow } from '../lib/education';

test('one total PTO block stays one block as the quantity of a two-block action increases', () => {
  for (const quantity of [2, 3]) {
    const items = expandCheckoutBlocks({ quantity, timeBlocks: 2 * quantity - 1, ptoBlocks: 1 });
    assert.ok(items);
    assert.equal(items.length, quantity);
    assert.equal(items.reduce((sum, item) => sum + item.ptoBlocks, 0), 1);
    assert.ok(items.every((item) => item.timeBlocks + item.ptoBlocks === 2));
  }
});

test('mixed time off covers both trips rather than overfunding one', () => {
  const items = expandCheckoutBlocks({ quantity: 2, timeBlocks: 0, ptoBlocks: 1, unpaidBlocks: 1, schoolBreakBlocks: 2 });
  assert.ok(items);
  assert.ok(items.every((item) => item.timeBlocks === 0 && item.ptoBlocks + item.unpaidBlocks + item.schoolBreakBlocks === 2));
  assert.equal(expandCheckoutBlocks({ quantity: 2, timeBlocks: 2, ptoBlocks: 1 }), null);
});

const player: Parameters<typeof prepareEducationChange>[0] = {
  id: 'player', age: 22, health: 100, skills: {}, traits: {}, certifications: [], employments: [], educations: [],
};
const program: EduProgramRow = {
  id: 'two', name: 'New major', type: 'associates', field: 'Science', requirements: {}, graduationRequirements: {},
  tuitionFullTime: 0, tuitionPartTime: 0, totalCredits: { generalEducation: 10, field: 10, major: 10 },
  skillGains: { automatic: {}, major: {} }, isStem: true, partTimeAllowed: true, grantsOnGraduation: [],
};

test('major changes keep general and matching field credits, but reject a new degree type', () => {
  const enrolled = { ...player, educations: [{
    id: 'education', programId: 'one', isActive: true, graduated: false, isPartTime: true,
    program: { type: 'associates', field: 'Science' }, creditsCompleted: { generalEducation: 5, field: 4, major: 6 },
  }] };
  const prepared = prepareEducationChange(enrolled, program, true);
  assert.ok(prepared.apply);
  assert.equal(prepared.isPartTime, true);
  assert.deepEqual(prepared.credits, { generalEducation: 5, field: 4, major: 0 });
  assert.ok(prepareEducationChange(enrolled, { ...program, type: 'bachelors' }, true).error);
  assert.ok(prepareEducationChange(enrolled, program, false).error);
});
