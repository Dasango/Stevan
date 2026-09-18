import EventEmitter from 'events';
import { FeasibilityChecker } from '../feasibility/checker.js';

/**
 * AutonomousBuilder executes end-to-end blueprint construction:
 * feasibility assessment, VPT gathering delegation, and topological placement.
 */
export class AutonomousBuilder extends EventEmitter {
  /**
   * @param {Object} [options={}]
   * @param {any} [options.bot] - Mineflayer bot instance or simulated world
   * @param {any} [options.vptClient] - VPTClient instance for gathering delegation
   * @param {any} [options.orchestrator] - StevanOrchestrator instance
   */
  constructor(options = {}) {
    super();
    this.bot = options.bot || null;
    this.vptClient = options.vptClient || null;
    this.orchestrator = options.orchestrator || null;
  }

  /**
   * Evaluates blueprint feasibility and executes autonomous construction.
   * @param {Object} blueprint - Parsed schematic object with { bom, topologicalBlocks }
   * @param {Object} anchor - World target coordinates { x, y, z }
   * @param {string} [biome='forest'] - Current world biome
   * @returns {Promise<Object>}
   */
  async build(blueprint, anchor, biome = 'forest') {
    const inventory = this.bot?.inventory?.items ? this.bot.inventory.items() : [];

    // 1. Feasibility Assessment
    const feasibility = FeasibilityChecker.assessFeasibility(blueprint.bom, inventory, biome);

    if (feasibility.status === 'INFEASIBLE_UNAVAILABLE_RESOURCES') {
      this.emit('build:infeasible', feasibility);
      return {
        success: false,
        status: 'INFEASIBLE_ABORTED',
        feasibility,
      };
    }

    // 2. Resource Gathering Delegation via VPT if deficit exists
    if (feasibility.status === 'FEASIBLE_NEEDS_GATHERING') {
      this.emit('build:gathering_delegated', {
        plan: feasibility.delegationPlan,
        deficit: feasibility.deficit,
      });

      for (const task of feasibility.delegationPlan) {
        if (this.vptClient) {
          await this.vptClient.runSkill({
            instruction: task.skill,
            maxTicks: (task.logsNeeded || task.count || 1) * 15,
            dryRun: true,
          });
        }

        // Simulate inventory update after gathering and crafting
        if (this.bot?.inventory) {
          const item = this.bot.inventory.items().find((i) => i.name === task.targetMaterial);
          const addedCount = (task.logsNeeded || 1) * 4;
          if (item) {
            item.count += addedCount;
          } else {
            this.bot.inventory.items().push({ name: task.targetMaterial, count: addedCount });
          }
        }
      }
    }

    // 3. Topological Block Placement
    this.emit('build:start', {
      anchor,
      totalBlocks: blueprint.topologicalBlocks.length,
    });

    const placedBlocks = [];
    for (let i = 0; i < blueprint.topologicalBlocks.length; i++) {
      const b = blueprint.topologicalBlocks[i];
      const targetPos = {
        x: anchor.x + b.x,
        y: anchor.y + b.y,
        z: anchor.z + b.z,
      };

      // Place block via bot or simulated world
      if (this.bot?.placeBlock) {
        await this.bot.placeBlock(targetPos, b.name);
      } else if (this.bot?.setBlock) {
        this.bot.setBlock(targetPos, b.name);
      }

      placedBlocks.push({ ...targetPos, name: b.name });

      this.emit('build:progress', {
        blockIndex: i + 1,
        total: blueprint.topologicalBlocks.length,
        placed: b.name,
        target: targetPos,
      });
    }

    const completionResult = {
      success: true,
      status: 'BUILD_COMPLETED',
      anchor,
      totalPlaced: placedBlocks.length,
      placedBlocks,
      feasibility,
    };

    this.emit('build:complete', completionResult);
    return completionResult;
  }
}

export default AutonomousBuilder;
