import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getDivorceQuote, quoteDivorceAction } from '../lib/divorce';
import type { ActionRow } from '../lib/actions';

const married = {
  id: 'player', maritalStatus: 'married', spouse: { salary: 50_000 },
  divorceEffectiveYear: null, divorceKeepSpouseVehicle: false, childcarePlan: 'none',
  employments: [], educations: [], children: [],
  vehicleOwnerships: [{ endAge: null, isSpouseVehicle: false }, { endAge: null, isSpouseVehicle: true }],
};

test('divorce uses the recorded compatibility tier and quotes next-year effects', async () => {
  let score = 0;
  let yearlyScores: Record<string, number> = {};
  const loadScore = async () => ({ currentScore: score, yearlyScores });
  assert.match((await getDivorceQuote(married, 4, loadScore)).reason ?? '', /not available/);

  for (const [value, blocks, cost] of [[0, 3, 100_000], [1, 2, 20_000], [2, 1, 10_000], [3, 1, 500]]) {
    score = value;
    yearlyScores = { '3': value };
    const quote = await getDivorceQuote(married, 4, loadScore);
    if ('reason' in quote) assert.fail(quote.reason);
    assert.equal(quote.blocks, blocks);
    assert.equal(quote.cost, cost);
    assert.equal(quote.effectiveYear, 5);
    assert.equal(quote.spouseIncomeRemoved, 50_000);
    assert.equal(quote.canChooseVehicle, true);
    const action = quoteDivorceAction({ name: 'Get Divorced', effects: { stress: 10 } } as ActionRow, quote);
    assert.equal(action.minTimeBlocks, blocks);
    assert.equal(action.maxTimeBlocks, blocks);
    assert.equal(action.frequency, 'once_per_year');
    assert.deepEqual(action.effects, {});
  }

  score = 4;
  assert.match((await getDivorceQuote(married, 4, loadScore)).reason ?? '', /3 or lower/);
  assert.match((await getDivorceQuote({ ...married, divorceEffectiveYear: 5 }, 4, loadScore)).reason ?? '', /already scheduled/);
});

test('childcare projections compare the same child ages with and without the spouse', async () => {
  const quote = await getDivorceQuote({
    ...married, spouse: { salary: 50_000, jobId: 'job', isJobPartTime: false }, children: [{ age: 6 }],
  }, 4, async () => ({ currentScore: 3, yearlyScores: { '3': 3 } }));
  if ('reason' in quote) assert.fail(quote.reason);
  assert.ok(quote.afterCareBlocks > quote.beforeCareBlocks);
  assert.equal(quote.annualChildcareAtCurrentPlan, 0);
  assert.ok(quote.annualChildcareToKeepCareTime === null || quote.annualChildcareToKeepCareTime > 0);
});
