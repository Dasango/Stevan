import EventEmitter from 'events';
import OpenAI from 'openai';
import { loadLLMConfig } from '../config.js';

/**
 * ModelManager manages model selection, dynamic free model discovery,
 * and automatic fallback chains across OpenAI-compatible providers.
 */
export class ModelManager extends EventEmitter {
  /**
   * @param {Record<string, any>} [options={}]
   * @param {OpenAI} [customClient] - Optional injected client for testing.
   */
  constructor(options = {}, customClient = null) {
    super();
    this.config = loadLLMConfig(options);
    this.client =
      customClient ||
      new OpenAI({
        apiKey: this.config.apiKey || 'dummy-key-for-local-or-free',
        baseURL: this.config.baseURL,
      });

    this.primaryModel = this.config.primaryModel;
    this.fallbackModels = [...this.config.fallbackModels];
  }

  /**
   * Dynamically fetches free models from the provider's /models endpoint.
   * @returns {Promise<Array<{ id: string, name: string, contextLength?: number }>>}
   */
  async getAvailableFreeModels() {
    try {
      const response = await this.client.models.list();
      const models = [];

      for await (const model of response) {
        const id = model.id;
        const isFreeById = id.endsWith(':free') || id.includes('free');
        const isFreeByPricing =
          model.pricing &&
          (model.pricing.prompt === '0' || model.pricing.prompt === 0) &&
          (model.pricing.completion === '0' || model.pricing.completion === 0);

        if (isFreeById || isFreeByPricing) {
          models.push({
            id: model.id,
            name: model.name || model.id,
            contextLength: model.context_length,
          });
        }
      }

      return models;
    } catch (err) {
      this.emit('models:error', err);
      return [];
    }
  }

  /**
   * Executes a chat completion request with automatic model fallback on failure.
   * @param {Object} params - Request parameters (messages, tools, temperature).
   * @returns {Promise<{ completion: OpenAI.Chat.Completions.ChatCompletion, usedModel: string, attempts: string[] }>}
   */
  async chatCompletionWithFallback(params) {
    const candidateModels = [this.primaryModel, ...this.fallbackModels.filter((m) => m !== this.primaryModel)];
    const attempts = [];
    let lastError = null;

    for (const model of candidateModels) {
      attempts.push(model);
      try {
        this.emit('llm:request', { model, messagesCount: params.messages?.length });

        const completion = await this.client.chat.completions.create({
          model,
          messages: params.messages,
          tools: params.tools,
          tool_choice: params.tool_choice ?? 'auto',
          temperature: params.temperature ?? this.config.temperature,
        });

        this.emit('llm:response', {
          model,
          usage: completion.usage,
          finishReason: completion.choices?.[0]?.finish_reason,
        });

        return {
          completion,
          usedModel: model,
          attempts,
        };
      } catch (err) {
        lastError = err;
        this.emit('llm:fallback', {
          failedModel: model,
          error: err.message || err,
          nextModel: candidateModels[candidateModels.indexOf(model) + 1] || null,
        });
      }
    }

    throw new Error(
      `All models in fallback chain failed (${attempts.join(' -> ')}). Last error: ${lastError?.message || 'Unknown error'}`
    );
  }
}

export default ModelManager;
