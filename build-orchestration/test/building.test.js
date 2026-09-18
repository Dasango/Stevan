import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { SchematicParser } from '../src/schematic/parser.js';
import { FeasibilityChecker } from '../src/feasibility/checker.js';
import { AutonomousBuilder } from '../src/builder/builder.js';

/**
 * Creates a simulated world grid for building verification.
 */
function createMockWorld() {
  const blocks = new Map();
  const inventory = [];

  const mockBot = {
    inventory: {
      items: () => inventory,
    },
    placeBlock: async (pos, blockName) => {
      const key = `${pos.x},${pos.y},${pos.z}`;
      blocks.set(key, blockName);
    },
    getBlock: (pos) => {
      const key = `${pos.x},${pos.y},${pos.z}`;
      return blocks.get(key) || 'air';
    },
  };

  return { blocks, inventory, mockBot };
}

describe('Build Orchestration — Autonomous Building & Context Feasibility', () => {
  const blueprint = SchematicParser.createBoxBlueprint(3, 3, 3, 'oak_planks', true);

  test('Schematic Parser: extracts BOM and enforces topological bottom-up order', () => {
    assert.ok(blueprint.totalBlocks > 0);
    assert.ok(blueprint.bom['oak_planks'] > 0);

    // Verify topological ordering: Y must be non-decreasing
    for (let i = 1; i < blueprint.topologicalBlocks.length; i++) {
      const prev = blueprint.topologicalBlocks[i - 1];
      const curr = blueprint.topologicalBlocks[i];
      assert.ok(curr.y >= prev.y, `Block at index ${i} (Y=${curr.y}) placed before Y=${prev.y}`);
    }
  });

  test('Scenario 1: Complete Materials in Inventory -> Immediate Build Completion', async () => {
    const { blocks, inventory, mockBot } = createMockWorld();
    inventory.push({ name: 'oak_planks', count: 32 });

    const builder = new AutonomousBuilder({ bot: mockBot });
    const anchor = { x: 100, y: 64, z: 200 };

    const result = await builder.build(blueprint, anchor, 'plains');

    assert.equal(result.success, true);
    assert.equal(result.status, 'BUILD_COMPLETED');
    assert.equal(result.totalPlaced, blueprint.totalBlocks);
    assert.equal(result.feasibility.status, 'FEASIBLE_READY');

    // Verify blocks exist in simulated world grid
    const sampleFloor = mockBot.getBlock({ x: 100, y: 64, z: 200 });
    assert.equal(sampleFloor, 'oak_planks');
  });

  test('Scenario 2: Missing Materials, Favorable Biome (Forest) -> Delegates VPT Gathering and Builds', async () => {
    const { blocks, inventory, mockBot } = createMockWorld();
    // Only 2 planks in inventory (deficit exists)
    inventory.push({ name: 'oak_planks', count: 2 });

    let vptGatheringCalled = false;
    const mockVptClient = {
      runSkill: async ({ instruction }) => {
        if (instruction === 'chop tree') {
          vptGatheringCalled = true;
          return { status: 'SUCCESS' };
        }
      },
    };

    const builder = new AutonomousBuilder({ bot: mockBot, vptClient: mockVptClient });
    const anchor = { x: 50, y: 64, z: 50 };

    const result = await builder.build(blueprint, anchor, 'forest');

    assert.equal(result.success, true);
    assert.equal(result.status, 'BUILD_COMPLETED');
    assert.equal(vptGatheringCalled, true);
    assert.equal(result.feasibility.status, 'FEASIBLE_NEEDS_GATHERING');
    assert.equal(result.totalPlaced, blueprint.totalBlocks);
  });

  test('Scenario 3: Missing Materials, Unfavorable Biome (Desert) -> Explicit Infeasible Rejection', async () => {
    const { blocks, inventory, mockBot } = createMockWorld();
    // Zero planks in inventory
    const builder = new AutonomousBuilder({ bot: mockBot });
    const anchor = { x: -200, y: 64, z: -200 };

    const result = await builder.build(blueprint, anchor, 'desert');

    // Must not fail silently; must report structured infeasibility
    assert.equal(result.success, false);
    assert.equal(result.status, 'INFEASIBLE_ABORTED');
    assert.equal(result.feasibility.status, 'INFEASIBLE_UNAVAILABLE_RESOURCES');
    assert.ok(result.feasibility.reasons.length > 0);
    assert.match(result.feasibility.reasons[0], /cannot be gathered in biome "desert"/);
    assert.equal(blocks.size, 0); // No blocks placed
  });
});
