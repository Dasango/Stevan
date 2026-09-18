import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ModelManager } from '../src/models/model-manager.js';

describe('ModelManager & Dynamic Fallback', () => {
  test('should fallback to second model when primary model fails', async () => {
    let callIndex = 0;
    const mockClient = {
      chat: {
        completions: {
          create: async ({ model }) => {
            callIndex++;
            if (model === 'primary-model') {
              throw new Error('Rate limit exceeded (429)');
            }
            return {
              choices: [
                {
                  message: {
                    content: 'Success from fallback',
                    tool_calls: [],
                  },
                  finish_reason: 'stop',
                },
              ],
              usage: { total_tokens: 50 },
            };
          },
        },
      },
    };

    const manager = new ModelManager(
      {
        primaryModel: 'primary-model',
        fallbackModels: ['fallback-model-1', 'fallback-model-2'],
      },
      mockClient
    );

    const fallbacksRecorded = [];
    manager.on('llm:fallback', (e) => fallbacksRecorded.push(e));

    const result = await manager.chatCompletionWithFallback({
      messages: [{ role: 'user', content: 'hello' }],
    });

    assert.equal(result.usedModel, 'fallback-model-1');
    assert.deepEqual(result.attempts, ['primary-model', 'fallback-model-1']);
    assert.equal(fallbacksRecorded.length, 1);
    assert.equal(fallbacksRecorded[0].failedModel, 'primary-model');
  });

  test('should throw error when all models in the fallback chain fail', async () => {
    const mockClient = {
      chat: {
        completions: {
          create: async ({ model }) => {
            throw new Error(`Model ${model} is unavailable`);
          },
        },
      },
    };

    const manager = new ModelManager(
      {
        primaryModel: 'model-a',
        fallbackModels: ['model-b'],
      },
      mockClient
    );

    await assert.rejects(
      async () => {
        await manager.chatCompletionWithFallback({
          messages: [{ role: 'user', content: 'test' }],
        });
      },
      /All models in fallback chain failed \(model-a -> model-b\)/
    );
  });

  test('should correctly identify and filter free models from provider list', async () => {
    const mockModels = [
      { id: 'openai/gpt-4o', pricing: { prompt: '0.005', completion: '0.015' } },
      { id: 'google/gemini-2.0-flash-exp:free', pricing: { prompt: '0', completion: '0' } },
      { id: 'meta-llama/llama-3.3-70b-instruct:free', pricing: { prompt: '0', completion: '0' } },
      { id: 'custom/free-router', pricing: { prompt: '0', completion: '0' } },
    ];

    const mockClient = {
      models: {
        list: async () => mockModels,
      },
    };

    const manager = new ModelManager({}, mockClient);
    const freeModels = await manager.getAvailableFreeModels();

    assert.equal(freeModels.length, 3);
    const ids = freeModels.map((m) => m.id);
    assert.ok(ids.includes('google/gemini-2.0-flash-exp:free'));
    assert.ok(ids.includes('meta-llama/llama-3.3-70b-instruct:free'));
    assert.ok(ids.includes('custom/free-router'));
    assert.ok(!ids.includes('openai/gpt-4o'));
  });
});
