import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { LLMController } from '../src/controller.js';

/**
 * Creates a simulated Minecraft world state with programmatically verifiable mutators.
 */
function createSimulatedWorld() {
  const state = {
    botPosition: { x: 0, y: 64, z: 0 },
    blocks: new Map([
      ['14,65,-20', { name: 'oak_log' }],
      ['14,64,-21', { name: 'air' }],
      ['14,63,-21', { name: 'dirt' }], // support block
    ]),
    inventory: [
      { name: 'cobblestone', count: 16 },
      { name: 'iron_pickaxe', count: 1 },
      { name: 'oak_log', count: 4 },
    ],
    equipped: { hand: null },
    crafted: [],
  };

  const mockBot = {
    entity: {
      position: state.botPosition,
    },
    pathfinder: {
      goto: async (goal) => {
        state.botPosition = { x: goal.x, y: goal.y, z: goal.z };
      },
    },
    blockAt: (pos) => {
      const key = `${pos.x},${pos.y},${pos.z}`;
      return state.blocks.get(key) || { name: 'air' };
    },
    dig: async (block) => {
      for (const [key, val] of state.blocks.entries()) {
        if (val === block) {
          state.blocks.set(key, { name: 'air' });
          break;
        }
      }
    },
    inventory: {
      items: () => state.inventory,
    },
    equip: async (item, destination) => {
      state.equipped[destination] = item.name;
    },
    placeBlock: async (refBlock, faceVec) => {
      const targetKey = '14,64,-21';
      state.blocks.set(targetKey, { name: 'cobblestone' });
      const item = state.inventory.find((i) => i.name === 'cobblestone');
      if (item) item.count -= 1;
    },
    lookAt: async (target) => {},
    chat: (msg) => {},
  };

  return { state, mockBot };
}

/**
 * Mock completion generator simulating responses from different LLM models.
 * @param {string} modelId
 */
function createMockModelClient(modelId) {
  return {
    chat: {
      completions: {
        create: async ({ model, messages }) => {
          const userPrompt = messages[messages.length - 1].content;

          let toolCall = null;
          if (userPrompt.includes('Walk over to coordinates')) {
            toolCall = {
              id: 'call_move_1',
              type: 'function',
              function: {
                name: 'moveTo',
                arguments: JSON.stringify({
                  target: { x: 15, y: 64, z: -20 },
                  tolerance: 1.0,
                }),
              },
            };
          } else if (userPrompt.includes('Break the oak log')) {
            toolCall = {
              id: 'call_mine_1',
              type: 'function',
              function: {
                name: 'mineBlock',
                arguments: JSON.stringify({
                  position: { x: 14, y: 65, z: -20 },
                  blockType: 'oak_log',
                }),
              },
            };
          } else if (userPrompt.includes('Place a cobblestone block')) {
            toolCall = {
              id: 'call_place_1',
              type: 'function',
              function: {
                name: 'placeBlock',
                arguments: JSON.stringify({
                  blockType: 'cobblestone',
                  position: { x: 14, y: 64, z: -21 },
                  face: 'top',
                }),
              },
            };
          } else if (userPrompt.includes('Equip your iron pickaxe')) {
            toolCall = {
              id: 'call_equip_1',
              type: 'function',
              function: {
                name: 'equipItem',
                arguments: JSON.stringify({
                  itemName: 'iron_pickaxe',
                  destination: 'hand',
                }),
              },
            };
          } else if (userPrompt.includes('Craft 4 oak planks')) {
            toolCall = {
              id: 'call_craft_1',
              type: 'function',
              function: {
                name: 'craftItem',
                arguments: JSON.stringify({
                  itemName: 'oak_planks',
                  count: 4,
                }),
              },
            };
          }

          return {
            choices: [
              {
                message: {
                  content: null,
                  tool_calls: toolCall ? [toolCall] : [],
                },
                finish_reason: toolCall ? 'tool_calls' : 'stop',
              },
            ],
            usage: { total_tokens: 85 },
          };
        },
      },
    },
  };
}

describe('LLM Controller Battery Tests & Model-Swap Verification', () => {
  const testModels = [
    'google/gemini-2.0-flash-exp:free',
    'meta-llama/llama-3.3-70b-instruct:free',
  ];

  for (const modelId of testModels) {
    describe(`Test Battery with Model: ${modelId}`, () => {
      test('Scenario 1 (Navigation): "Walk over to coordinates (15, 64, -20)"', async () => {
        const { state, mockBot } = createSimulatedWorld();
        const client = createMockModelClient(modelId);
        const controller = new LLMController({ primaryModel: modelId }, mockBot, client);

        const result = await controller.processInstruction('Walk over to coordinates (15, 64, -20)', {
          position: state.botPosition,
        });

        assert.equal(result.success, true);
        assert.equal(result.tool, 'moveTo');
        assert.equal(result.usedModel, modelId);
        // Programmatic end-state verification:
        assert.deepEqual(state.botPosition, { x: 15, y: 64, z: -20 });
      });

      test('Scenario 2 (Mining): "Break the oak log at (14, 65, -20)"', async () => {
        const { state, mockBot } = createSimulatedWorld();
        const client = createMockModelClient(modelId);
        const controller = new LLMController({ primaryModel: modelId }, mockBot, client);

        // Pre-condition check:
        assert.equal(state.blocks.get('14,65,-20').name, 'oak_log');

        const result = await controller.processInstruction('Break the oak log at (14, 65, -20)', {
          position: state.botPosition,
        });

        assert.equal(result.success, true);
        assert.equal(result.tool, 'mineBlock');
        // Programmatic end-state verification: block is broken (converted to air)
        assert.equal(state.blocks.get('14,65,-20').name, 'air');
      });

      test('Scenario 3 (Placement): "Place a cobblestone block at (14, 64, -21)"', async () => {
        const { state, mockBot } = createSimulatedWorld();
        const client = createMockModelClient(modelId);
        const controller = new LLMController({ primaryModel: modelId }, mockBot, client);

        // Pre-condition: target position is air, inventory has 16 cobblestone
        assert.equal(state.blocks.get('14,64,-21').name, 'air');
        const cobblePre = state.inventory.find((i) => i.name === 'cobblestone').count;

        const result = await controller.processInstruction('Place a cobblestone block at (14, 64, -21)', {
          position: state.botPosition,
        });

        assert.equal(result.success, true);
        assert.equal(result.tool, 'placeBlock');
        // Programmatic end-state verification:
        assert.equal(state.blocks.get('14,64,-21').name, 'cobblestone');
        const cobblePost = state.inventory.find((i) => i.name === 'cobblestone').count;
        assert.equal(cobblePost, cobblePre - 1);
      });

      test('Scenario 4 (Equipment): "Equip your iron pickaxe in your hand"', async () => {
        const { state, mockBot } = createSimulatedWorld();
        const client = createMockModelClient(modelId);
        const controller = new LLMController({ primaryModel: modelId }, mockBot, client);

        assert.equal(state.equipped.hand, null);

        const result = await controller.processInstruction('Equip your iron pickaxe in your hand', {
          position: state.botPosition,
          inventory: state.inventory,
        });

        assert.equal(result.success, true);
        assert.equal(result.tool, 'equipItem');
        // Programmatic end-state verification:
        assert.equal(state.equipped.hand, 'iron_pickaxe');
      });

      test('Scenario 5 (Crafting): "Craft 4 oak planks"', async () => {
        const { state, mockBot } = createSimulatedWorld();
        const client = createMockModelClient(modelId);
        const controller = new LLMController({ primaryModel: modelId }, mockBot, client);

        const result = await controller.processInstruction('Craft 4 oak planks', {
          position: state.botPosition,
          inventory: state.inventory,
        });

        assert.equal(result.success, true);
        assert.equal(result.tool, 'craftItem');
        assert.equal(result.parameters.itemName, 'oak_planks');
        assert.equal(result.parameters.count, 4);
      });
    });
  }
});
