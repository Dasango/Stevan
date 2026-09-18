/**
 * Biome capability map: indicates which resources can be naturally gathered in the biome.
 */
export const BIOME_RESOURCE_MAP = {
  wood: new Set(['forest', 'plains', 'taiga', 'jungle', 'swamp', 'savanna', 'birch_forest', 'dark_forest']),
  sand: new Set(['desert', 'beach', 'river', 'warm_ocean']),
  stone: new Set(['forest', 'plains', 'taiga', 'mountains', 'desert', 'badlands', 'savanna', 'swamp']),
};

export class FeasibilityChecker {
  /**
   * Assesses build feasibility against bot inventory and current biome.
   * @param {Record<string, number>} bom - Required Bill of Materials
   * @param {Array<{ name: string, count: number }>} inventory - Current inventory items
   * @param {string} [biome='forest'] - Current Minecraft biome identifier
   * @returns {Object}
   */
  static assessFeasibility(bom, inventory = [], biome = 'forest') {
    const normBiome = (biome || 'forest').toLowerCase();

    // Map inventory counts
    const invCounts = {};
    for (const item of inventory) {
      invCounts[item.name] = (invCounts[item.name] || 0) + (item.count || 1);
    }

    const deficit = [];
    for (const [material, needed] of Object.entries(bom)) {
      const available = invCounts[material] || 0;
      if (available < needed) {
        deficit.push({
          material,
          needed,
          available,
          deficit: needed - available,
        });
      }
    }

    // 1. All materials present in inventory
    if (deficit.length === 0) {
      return {
        status: 'FEASIBLE_READY',
        canBuildImmediately: true,
        bom,
        deficit: [],
        biome: normBiome,
      };
    }

    // 2. Missing materials exist -> Check biome feasibility
    const infeasibleReasons = [];
    const gatherableTasks = [];

    for (const item of deficit) {
      const isWood = item.material.includes('plank') || item.material.includes('log') || item.material.includes('wood');
      const isSand = item.material.includes('sand');

      if (isWood) {
        if (BIOME_RESOURCE_MAP.wood.has(normBiome)) {
          gatherableTasks.push({
            skill: 'chop tree',
            targetMaterial: item.material,
            logsNeeded: Math.ceil(item.deficit / 4), // 1 log = 4 planks
          });
        } else {
          infeasibleReasons.push(
            `Resource "${item.material}" (deficit: ${item.deficit}) cannot be gathered in biome "${normBiome}". Trees do not naturally generate.`
          );
        }
      } else if (isSand) {
        if (BIOME_RESOURCE_MAP.sand.has(normBiome)) {
          gatherableTasks.push({
            skill: 'get sand',
            targetMaterial: item.material,
            count: item.deficit,
          });
        } else {
          infeasibleReasons.push(
            `Resource "${item.material}" (deficit: ${item.deficit}) is unavailable in biome "${normBiome}".`
          );
        }
      } else {
        // Fallback generic check (assume stone/dirt is gatherable)
        gatherableTasks.push({
          skill: 'mineBlock',
          targetMaterial: item.material,
          count: item.deficit,
        });
      }
    }

    // If any required resource is impossible to gather in the biome -> Infeasible
    if (infeasibleReasons.length > 0) {
      return {
        status: 'INFEASIBLE_UNAVAILABLE_RESOURCES',
        canBuildImmediately: false,
        bom,
        deficit,
        biome: normBiome,
        reasons: infeasibleReasons,
      };
    }

    // Feasible via VPT gathering delegation
    return {
      status: 'FEASIBLE_NEEDS_GATHERING',
      canBuildImmediately: false,
      bom,
      deficit,
      biome: normBiome,
      delegationPlan: gatherableTasks,
    };
  }
}

export default FeasibilityChecker;
