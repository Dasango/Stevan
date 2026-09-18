import { StevanOrchestrator } from './orchestrator.js';
import { Option, MineflayerOption, VPTSkillOption } from './options/option.js';
import { VPTClient } from './clients/vpt-client.js';

export {
  StevanOrchestrator,
  Option,
  MineflayerOption,
  VPTSkillOption,
  VPTClient,
};

if (process.argv[1] && process.argv[1].endsWith('index.js')) {
  console.log('====================================================');
  console.log(' Stevan Orchestrator — Hierarchical Options Engine');
  console.log('====================================================');
  console.log('Framework: Hierarchical Reinforcement Learning Options <I, pi, beta>');
  console.log('Modules linked: /bridge, /llm-controller, /vpt-bridge');
  console.log('====================================================');

  const orchestrator = new StevanOrchestrator({ dryRun: true });
  console.log('Orchestrator ready. Running self-test chain...');

  const testChain = [
    new MineflayerOption('nav_1', 'moveTo', { target: { x: 10, y: 64, z: 10 }, tolerance: 1.0 }),
    new VPTSkillOption('vpt_chop', 'chop tree', { maxTicks: 20 }),
    new MineflayerOption('craft_planks', 'craftItem', { itemName: 'oak_planks', count: 4 }),
  ];

  orchestrator
    .executeGoalChain(testChain)
    .then((result) => {
      console.log('Self-test chain completed:', JSON.stringify(result, null, 2));
    })
    .catch((err) => {
      console.error('Self-test chain error:', err);
    });
}
