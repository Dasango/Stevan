import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateToolCall,
  OPENAI_ACTION_TOOLS,
  ACTION_SCHEMAS,
} from '../src/schemas/actions.js';

describe('LLM Controller Action Schemas & Validation', () => {
  test('should have all 7 approved tools in registry and OpenAI format', () => {
    const approved = ['moveTo', 'mineBlock', 'placeBlock', 'craftItem', 'equipItem', 'lookAt', 'chat'];
    assert.deepEqual(Object.keys(ACTION_SCHEMAS).sort(), approved.sort());
    assert.equal(OPENAI_ACTION_TOOLS.length, 7);

    const toolNames = OPENAI_ACTION_TOOLS.map((t) => t.function.name);
    assert.deepEqual(toolNames.sort(), approved.sort());
  });

  test('should validate valid moveTo parameters', () => {
    const valid = validateToolCall('moveTo', {
      target: { x: 10, y: 64, z: -50 },
      tolerance: 1.5,
      timeoutSeconds: 45,
    });
    assert.equal(valid.success, true);
    assert.equal(valid.data.target.x, 10);
    assert.equal(valid.data.target.y, 64);
    assert.equal(valid.data.tolerance, 1.5);
  });

  test('should reject moveTo with out-of-bounds coordinates', () => {
    const invalidY = validateToolCall('moveTo', {
      target: { x: 10, y: 500, z: -50 }, // Exceeds Minecraft Java max height 320
    });
    assert.equal(invalidY.success, false);
    assert.match(invalidY.error, /Validation error for tool "moveTo"/);
  });

  test('should validate valid mineBlock parameters', () => {
    const valid = validateToolCall('mineBlock', {
      position: { x: 12, y: 65, z: -4 },
      blockType: 'oak_log',
    });
    assert.equal(valid.success, true);
    assert.equal(valid.data.blockType, 'oak_log');
  });

  test('should validate valid placeBlock parameters', () => {
    const valid = validateToolCall('placeBlock', {
      blockType: 'dirt',
      position: { x: 12, y: 64, z: -5 },
      face: 'top',
    });
    assert.equal(valid.success, true);
    assert.equal(valid.data.face, 'top');
  });

  test('should reject placeBlock with invalid face', () => {
    const invalid = validateToolCall('placeBlock', {
      blockType: 'dirt',
      position: { x: 12, y: 64, z: -5 },
      face: 'diagonal',
    });
    assert.equal(invalid.success, false);
    assert.match(invalid.error, /Invalid enum value/);
  });

  test('should validate craftItem within bounds [1, 64]', () => {
    const valid = validateToolCall('craftItem', {
      itemName: 'oak_planks',
      count: 4,
    });
    assert.equal(valid.success, true);

    const invalidCount = validateToolCall('craftItem', {
      itemName: 'oak_planks',
      count: 100, // Exceeds stack size
    });
    assert.equal(invalidCount.success, false);
  });

  test('should reject unknown tool name', () => {
    const invalidTool = validateToolCall('destroyEverything', {});
    assert.equal(invalidTool.success, false);
    assert.match(invalidTool.error, /Unknown tool name: "destroyEverything"/);
  });
});
