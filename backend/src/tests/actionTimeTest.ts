import assert from 'node:assert/strict';
import { annualEmploymentPay, remainingActionTime, schoolBreakAllowance, unpaidLeavePay, validateTimeOff } from '../lib/actionTime';
import type { ActionRow } from '../lib/actions';

const schoolYear = { title: 'Retail Worker', isSeasonal: false };
const summer = { title: 'Camp Counselor', isSeasonal: true };
assert.equal(schoolBreakAllowance([], true), 6);
assert.equal(schoolBreakAllowance([schoolYear], true), 4);
assert.equal(schoolBreakAllowance([summer], true), 2);
assert.equal(schoolBreakAllowance([schoolYear, summer], true), 0);
assert.equal(schoolBreakAllowance([{ title: 'Teacher', isSeasonal: false }], false), 6);
assert.deepEqual(remainingActionTime(14, 6, 3, 2), { activityBlocks: 5, schoolBreakBlocks: 4 });
assert.deepEqual(remainingActionTime(4, 6, 0, 4), { activityBlocks: 0, schoolBreakBlocks: 0 });
assert.equal(annualEmploymentPay(80_000, false, true), 20_000);
assert.equal(unpaidLeavePay(60_000, 20, false, 2), 6_000);

const student = { isRetired: false, employments: [], educations: [{ isActive: true, graduated: false, programType: 'bachelors', programId: 'program' }] };
const retired = { ...student, isRetired: true, educations: [] };
const trip = { name: 'Travel Internationally', allowsPTO: true, minTimeBlocks: 2, maxTimeBlocks: 2,
  requirements: { ptoOrUnpaidTimeBlocks: 2 } } as ActionRow;
const mental = { ...trip, name: 'Take a Mental Health Day', minTimeBlocks: 1, maxTimeBlocks: 1,
  requirements: { hasPTOOrUnpaidTimeBlocks: true } };
const music = { ...mental, name: 'Perform at Bar', allowsPTO: false, requirements: {} };
const blocks = { activityBlocks: 0, ptoBlocks: 0, unpaidBlocks: 0, schoolBreakBlocks: 0 };
assert.deepEqual(validateTimeOff(trip, student, { ...blocks, ptoBlocks: 1, schoolBreakBlocks: 1 }), []);
assert.notEqual(validateTimeOff(trip, student, { ...blocks, activityBlocks: 1, schoolBreakBlocks: 1 }).length, 0);
assert.deepEqual(validateTimeOff(mental, student, { ...blocks, unpaidBlocks: 1 }), []);
assert.notEqual(validateTimeOff(mental, retired, { ...blocks, schoolBreakBlocks: 1 }).length, 0);
assert.deepEqual(validateTimeOff(music, student, { ...blocks, schoolBreakBlocks: 1 }), []);
assert.notEqual(validateTimeOff(music, student, { ...blocks, unpaidBlocks: 1 }).length, 0);
console.log('Action time rules passed.');
