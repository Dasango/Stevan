import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { StevanOrchestrator } from '../src/orchestrator.js';
import { MineflayerOption, VPTSkillOption } from '../src/options/option.js';
import { VPTClient } from '../src/clients/vpt-client.js';

/**
 * Creates a mock ActionExecutor simulating Mineflayer world mutations.
 */
function createMockExecutor() {
  const log = [];
  return {
    log,
    execute: async (action, params) => {
      log.push({ action, params });
      return {
        success: true,
        action,
        data: { executed: true, params },
      };
    },
  };
}

/**
 * Creates a mock VPTClient simulating neural vision-action runs.
 */
function createMockVPTClient() {
  const log = [];
  return new VPTClient({}, async ({ instruction, maxTicks }) => {
    log.push({ instruction, maxTicks });
    return {
      status: 'SUCCESS',
      instruction,
      ticksExecuted: maxTicks,
      durationSeconds: maxTicks * 0.05,
      avgFps: 119.5,
      terminationReason: 'TARGET_COLLECTED',
    };
  });
}

describe('Stevan Orchestrator — Hierarchical Options Goal Chains', () => {
  test('Goal Chain 1: Lumberjack Mission (Nav -> VPT Chop Tree -> Nav Base -> Craft Planks)', async () => {
    const executor = createMockExecutor();
    const vptClient = createMockVPTClient();
    const orchestrator = new StevanOrchestrator({ executor, vptClient, dryRun: true });

    const lumberjackChain = [
      new MineflayerOption('nav_forest', 'moveTo', { target: { x: 20, y: 64, z: -10 }, tolerance: 1.0 }),
      new VPTSkillOption('vpt_chop', 'chop tree', { maxTicks: 25 }),
      new MineflayerOption('nav_base', 'moveTo', { target: { x: 0, y: 64, z: 0 }, tolerance: 1.0 }),
      new MineflayerOption('craft_planks', 'craftItem', { itemName: 'oak_planks', count: 4 }),
    ];

    const result = await orchestrator.executeGoalChain(lumberjackChain);

    assert.equal(result.status, 'SUCCESS');
    assert.equal(result.optionsExecuted, 4);
    assert.equal(result.trace[0].action, 'moveTo');
    assert.equal(result.trace[1].instruction, 'chop tree');
    assert.equal(result.trace[1].type, 'continuous_vpt');
    assert.equal(result.trace[1].status, 'SUCCESS');
    assert.equal(result.trace[2].action, 'moveTo');
    assert.equal(result.trace[3].action, 'craftItem');
    assert.equal(result.trace[3].data.params.count, 4);
  });

  test('Goal Chain 2: Desert Sand Gathering (Equip Shovel -> Nav Desert -> VPT Get Sand -> Chat)', async () => {
    const executor = createMockExecutor();
    const vptClient = createMockVPTClient();
    const orchestrator = new StevanOrchestrator({ executor, vptClient, dryRun: true });

    const sandChain = [
      new MineflayerOption('equip_shovel', 'equipItem', { itemName: 'iron_shovel', destination: 'hand' }),
      new MineflayerOption('nav_desert', 'moveTo', { target: { x: -45, y: 63, z: 30 } }),
      new VPTSkillOption('vpt_sand', 'get sand', { maxTicks: 20 }),
      new MineflayerOption('report_chat', 'chat', { message: 'Collected sand successfully with VPT.' }),
    ];

    const result = await orchestrator.executeGoalChain(sandChain);

    assert.equal(result.status, 'SUCCESS');
    assert.equal(result.optionsExecuted, 4);
    assert.equal(result.trace[0].action, 'equipItem');
    assert.equal(result.trace[1].action, 'moveTo');
    assert.equal(result.trace[2].instruction, 'get sand');
    assert.equal(result.trace[2].type, 'continuous_vpt');
    assert.equal(result.trace[3].action, 'chat');
  });

  test('Goal Chain 3: Combat Patrol & Fortification (Equip Weapon -> Nav Patrol -> VPT Kill Mob -> Place Wall)', async () => {
    const executor = createMockExecutor();
    const vptClient = createMockVPTClient();
    const orchestrator = new StevanOrchestrator({ executor, vptClient, dryRun: true });

    const combatChain = [
      new MineflayerOption('equip_sword', 'equipItem', { itemName: 'iron_sword', destination: 'hand' }),
      new MineflayerOption('nav_perimeter', 'moveTo', { target: { x: 5, y: 64, z: -35 } }),
      new VPTSkillOption('vpt_combat', 'kill mob', { maxTicks: 20 }),
      new MineflayerOption('place_wall', 'placeBlock', {
        blockType: 'cobblestone',
        position: { x: 5, y: 65, z: -35 },
        face: 'top',
      }),
    ];

    const result = await orchestrator.executeGoalChain(combatChain);

    assert.equal(result.status, 'SUCCESS');
    assert.equal(result.optionsExecuted, 4);
    assert.equal(result.trace[0].action, 'equipItem');
    assert.equal(result.trace[1].action, 'moveTo');
    assert.equal(result.trace[2].instruction, 'kill mob');
    assert.equal(result.trace[2].type, 'continuous_vpt');
    assert.equal(result.trace[3].action, 'placeBlock');
  });

  test('Failure Boundary: Chain halts when an option fails and returns diagnostic trace', async () => {
    const failingExecutor = {
      execute: async (action) => {
        if (action === 'dig') {
          return { success: false, error: 'Target block obstructed' };
        }
        return { success: true, data: {} };
      },
    };
    const vptClient = createMockVPTClient();
    const orchestrator = new StevanOrchestrator({ executor: failingExecutor, vptClient });

    const chain = [
      new MineflayerOption('opt_1', 'moveTo', { target: { x: 0, y: 64, z: 0 } }),
      new MineflayerOption('opt_2', 'dig', { position: { x: 1, y: 64, z: 1 } }),
      new VPTSkillOption('opt_3', 'chop tree'),
    ];

    const result = await orchestrator.executeGoalChain(chain);

    assert.equal(result.status, 'FAILED');
    assert.equal(result.optionsExecuted, 2); // Aborted after option 2 failed
    assert.equal(result.trace[1].status, 'FAILURE');
    assert.equal(result.trace[1].error, 'Target block obstructed');
  });
});
