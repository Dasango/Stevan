import fs from 'fs';
import { Schematic } from 'prismarine-schematic';

/**
 * Parses and processes Minecraft schematics, extracting Bill of Materials (BOM)
 * and topologically ordered placement instructions (bottom-up support).
 */
export class SchematicParser {
  /**
   * Generates a programmatic box schematic (e.g. 3x3 shelter) for tests and blueprint tasks.
   * @param {number} width - X dimension
   * @param {number} height - Y dimension
   * @param {number} length - Z dimension
   * @param {string} blockName - Material (e.g. 'oak_planks', 'cobblestone')
   * @param {boolean} [hollow=true] - Whether interior is empty
   * @returns {Object}
   */
  static createBoxBlueprint(width = 3, height = 3, length = 3, blockName = 'oak_planks', hollow = true) {
    const blocks = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        for (let z = 0; z < length; z++) {
          const isWall = x === 0 || x === width - 1 || z === 0 || z === length - 1;
          const isFloor = y === 0;
          const isRoof = y === height - 1;

          if (!hollow || isFloor || isRoof || isWall) {
            blocks.push({ x, y, z, name: blockName });
          }
        }
      }
    }

    return SchematicParser.processBlockList(blocks, { width, height, length });
  }

  /**
   * Sorts blocks topologically (Y ascending: floor -> walls -> ceiling)
   * and computes Bill of Materials.
   * @param {Array<{ x: number, y: number, z: number, name: string }>} rawBlocks
   * @param {Object} [dimensions={}]
   * @returns {Object}
   */
  static processBlockList(rawBlocks, dimensions = {}) {
    // Filter non-air blocks
    const solidBlocks = rawBlocks.filter((b) => b.name && b.name !== 'air');

    // Topological Sort: Ascending by Y (support foundation first), then X, then Z
    const sorted = [...solidBlocks].sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      if (a.x !== b.x) return a.x - b.x;
      return a.z - b.z;
    });

    // Compute Bill of Materials (BOM)
    const bom = {};
    for (const b of sorted) {
      bom[b.name] = (bom[b.name] || 0) + 1;
    }

    return {
      dimensions: {
        width: dimensions.width ?? (Math.max(...sorted.map((b) => b.x), 0) + 1),
        height: dimensions.height ?? (Math.max(...sorted.map((b) => b.y), 0) + 1),
        length: dimensions.length ?? (Math.max(...sorted.map((b) => b.z), 0) + 1),
      },
      totalBlocks: sorted.length,
      bom,
      topologicalBlocks: sorted,
    };
  }

  /**
   * Reads and parses a standard .schem file from disk using prismarine-schematic.
   * @param {string} filePath
   * @returns {Promise<Object>}
   */
  static async loadSchematicFile(filePath) {
    const buffer = await fs.promises.readFile(filePath);
    const schem = await Schematic.read(buffer);

    const blocks = [];
    const size = schem.size;

    for (let y = 0; y < size.y; y++) {
      for (let x = 0; x < size.x; x++) {
        for (let z = 0; z < size.z; z++) {
          const block = schem.getBlock({ x, y, z });
          if (block && block.name !== 'air') {
            blocks.push({ x, y, z, name: block.name });
          }
        }
      }
    }

    return SchematicParser.processBlockList(blocks, {
      width: size.x,
      height: size.y,
      length: size.z,
    });
  }
}

export default SchematicParser;
