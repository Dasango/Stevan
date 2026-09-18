import EventEmitter from 'events';
import { ModelManager } from './models/model-manager.js';
import { ActionExecutor } from './executor/action-executor.js';
import { OPENAI_ACTION_TOOLS, validateToolCall } from './schemas/actions.js';

/**
 * System prompt instructing the LLM to behave as the Minecraft bot controller.
 */
const SYSTEM_PROMPT = `You are the high-level brain of Stevan, an autonomous Minecraft Java bot.
You receive the bot's current world state (position, health, inventory, nearby blocks) and user instructions.
To interact with the Minecraft world, you MUST call one of the provided tools (moveTo, mineBlock, placeBlock, craftItem, equipItem, lookAt, chat).
Always choose the most appropriate tool call with exact numerical coordinates based on the world state.
Never invent block names or coordinates not aligned with the current world state.`;

/**
 * LLMController translates natural language goals into validated Mineflayer actions.
 */
export class LLMController extends EventEmitter {
  /**
   * @param {Record<string, any>} [options={}]
   * @param {any} [bot] - Mineflayer bot instance or mock
   * @param {any} [customClient] - Injected OpenAI client for testing
   */
  constructor(options = {}, bot = null, customClient = null) {
    super();
    this.modelManager = new ModelManager(options, customClient);
    this.executor = new ActionExecutor(bot);

    // Forward model manager events
    this.modelManager.on('llm:request', (e) => this.emit('llm:request', e));
    this.modelManager.on('llm:response', (e) => this.emit('llm:response', e));
    this.modelManager.on('llm:fallback', (e) => this.emit('llm:fallback', e));
  }

  setBot(bot) {
    this.executor.setBot(bot);
  }

  /**
   * Builds the prompt messages array including the latest world snapshot.
   * @param {string} instruction
   * @param {Record<string, any>} worldSnapshot
   * @returns {Array<Object>}
   */
  buildMessages(instruction, worldSnapshot = {}) {
    const formattedSnapshot = JSON.stringify(
      {
        botPosition: worldSnapshot.position ?? { x: 0, y: 64, z: 0 },
        health: worldSnapshot.health ?? 20,
        food: worldSnapshot.food ?? 20,
        inventory: worldSnapshot.inventory ?? [],
        nearbyBlocks: worldSnapshot.nearbyBlocks ?? [],
        nearbyEntities: worldSnapshot.nearbyEntities ?? [],
      },
      null,
      2
    );

    return [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Current World State:\n\`\`\`json\n${formattedSnapshot}\n\`\`\`\n\nInstruction: "${instruction}"`,
      },
    ];
  }

  /**
   * Processes a natural language instruction and executes the resulting validated tool.
   * @param {string} instruction
   * @param {Record<string, any>} [worldSnapshot={}]
   * @returns {Promise<Object>}
   */
  async processInstruction(instruction, worldSnapshot = {}) {
    this.emit('instruction:received', { instruction, worldSnapshot });

    const messages = this.buildMessages(instruction, worldSnapshot);

    const { completion, usedModel, attempts } = await this.modelManager.chatCompletionWithFallback({
      messages,
      tools: OPENAI_ACTION_TOOLS,
      tool_choice: 'auto',
    });

    const choice = completion.choices?.[0];
    const message = choice?.message;

    // Check if the LLM generated a tool call
    if (message?.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      const toolName = toolCall.function.name;
      let rawArgs = {};

      try {
        rawArgs = typeof toolCall.function.arguments === 'string'
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;
      } catch (err) {
        const errorMsg = `Failed to parse tool call JSON arguments: ${err.message}`;
        this.emit('llm:validation_error', { tool: toolName, rawArgs, error: errorMsg });
        return {
          success: false,
          status: 'validation_error',
          error: errorMsg,
          usedModel,
          attempts,
        };
      }

      // Validate strictly with Zod schema
      const validation = validateToolCall(toolName, rawArgs);
      if (!validation.success) {
        this.emit('llm:validation_error', { tool: toolName, rawArgs, error: validation.error });
        return {
          success: false,
          status: 'validation_error',
          error: validation.error,
          usedModel,
          attempts,
        };
      }

      this.emit('llm:tool_called', { tool: toolName, params: validation.data, usedModel });

      // Execute action
      const executionResult = await this.executor.execute(toolName, validation.data);

      const result = {
        success: executionResult.success,
        status: 'action_executed',
        tool: toolName,
        parameters: validation.data,
        executionResult,
        usedModel,
        attempts,
      };

      this.emit('instruction:completed', result);
      return result;
    }

    // Pure conversational text response
    const result = {
      success: true,
      status: 'text_response',
      content: message?.content || '',
      usedModel,
      attempts,
    };

    this.emit('instruction:completed', result);
    return result;
  }
}

export default LLMController;
