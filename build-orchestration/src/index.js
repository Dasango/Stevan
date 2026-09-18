import { SchematicParser } from './schematic/parser.js';
import { FeasibilityChecker, BIOME_RESOURCE_MAP } from './feasibility/checker.js';
import { AutonomousBuilder } from './builder/builder.js';

export {
  SchematicParser,
  FeasibilityChecker,
  AutonomousBuilder,
  BIOME_RESOURCE_MAP,
};

if (process.argv[1] && process.argv[1].endsWith('index.js')) {
  console.log('====================================================');
  console.log(' Stevan Build Orchestration — Autonomous Building');
  console.log('====================================================');
  const blueprint = SchematicParser.createBoxBlueprint(3, 3, 3, 'oak_planks');
  console.log('Sample Blueprint (3x3 Box):');
  console.log(` - Total Blocks: ${blueprint.totalBlocks}`);
  console.log(' - BOM:', JSON.stringify(blueprint.bom));
  console.log('====================================================');
}
