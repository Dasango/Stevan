import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { VPTClient } from '../src/clients/vpt-client.js';

describe('Orchestrator to Python VPT Bridge Cross-Process Integration', () => {
  test('should invoke Python VPT CLI subprocess and receive structured JSON telemetry', async () => {
    const client = new VPTClient();

    const result = await client.runSkill({
      instruction: 'chop tree',
      maxTicks: 5,
      dryRun: true,
    });

    assert.equal(result.status, 'SUCCESS');
    assert.equal(result.instruction, 'chop tree');
    assert.equal(result.ticksExecuted, 5);
    assert.ok(result.durationSeconds > 0);
    assert.ok(result.avgFps > 0);
    assert.equal(result.terminationReason, 'MAX_TICKS_REACHED');
  });
});
