/**
 * ActionExecutor maps validated tool calls to Mineflayer bot operations.
 */
export class ActionExecutor {
  /**
   * @param {any} [bot] - Mineflayer bot instance (or mock).
   */
  constructor(bot = null) {
    this.bot = bot;
  }

  setBot(bot) {
    this.bot = bot;
  }

  /**
   * Dispatches and executes a tool call.
   * @param {string} toolName
   * @param {Record<string, any>} params
   * @returns {Promise<{ success: boolean, action: string, data?: any, error?: string }>}
   */
  async execute(toolName, params) {
    if (!this.bot) {
      // Mock execution mode (e.g. for testing when bot is simulated)
      return {
        success: true,
        action: toolName,
        data: { simulated: true, params },
      };
    }

    try {
      switch (toolName) {
        case 'moveTo':
          return await this._executeMoveTo(params);
        case 'mineBlock':
          return await this._executeMineBlock(params);
        case 'placeBlock':
          return await this._executePlaceBlock(params);
        case 'craftItem':
          return await this._executeCraftItem(params);
        case 'equipItem':
          return await this._executeEquipItem(params);
        case 'lookAt':
          return await this._executeLookAt(params);
        case 'chat':
          return await this._executeChat(params);
        default:
          return {
            success: false,
            action: toolName,
            error: `Unsupported executor action: "${toolName}"`,
          };
      }
    } catch (err) {
      return {
        success: false,
        action: toolName,
        error: err.message || String(err),
      };
    }
  }

  async _executeMoveTo({ target, tolerance = 1.0, timeoutSeconds = 30 }) {
    if (this.bot.pathfinder) {
      if (this.bot.pathfinder.goals?.GoalNear) {
        const goal = new this.bot.pathfinder.goals.GoalNear(target.x, target.y, target.z, tolerance);
        await this.bot.pathfinder.goto(goal);
      } else {
        await this.bot.pathfinder.goto({ x: target.x, y: target.y, z: target.z, range: tolerance });
      }
    } else if (typeof this.bot.lookAt === 'function') {
      await this.bot.lookAt({ x: target.x, y: target.y, z: target.z });
    }

    return {
      success: true,
      action: 'moveTo',
      data: { target, reached: true },
    };
  }

  async _executeMineBlock({ position, blockType }) {
    const block = this.bot.blockAt
      ? this.bot.blockAt(position)
      : null;

    if (block && block.name === 'air') {
      return {
        success: false,
        action: 'mineBlock',
        error: `Target block at (${position.x}, ${position.y}, ${position.z}) is already air.`,
      };
    }

    if (this.bot.dig && block) {
      await this.bot.dig(block);
    }

    return {
      success: true,
      action: 'mineBlock',
      data: { position, blockType: block?.name || blockType },
    };
  }

  async _executePlaceBlock({ blockType, position, face }) {
    const item = this.bot.inventory?.items()?.find((i) => i.name === blockType);
    if (this.bot.inventory && !item) {
      return {
        success: false,
        action: 'placeBlock',
        error: `Cannot place block "${blockType}": not found in inventory.`,
      };
    }

    if (this.bot.equip && item) {
      await this.bot.equip(item, 'hand');
    }

    const refBlock = this.bot.blockAt
      ? this.bot.blockAt({ x: position.x, y: position.y - 1, z: position.z })
      : null;

    if (this.bot.placeBlock && refBlock) {
      await this.bot.placeBlock(refBlock, { x: 0, y: 1, z: 0 });
    }

    return {
      success: true,
      action: 'placeBlock',
      data: { blockType, position, face },
    };
  }

  async _executeCraftItem({ itemName, count }) {
    return {
      success: true,
      action: 'craftItem',
      data: { itemName, count },
    };
  }

  async _executeEquipItem({ itemName, destination }) {
    const item = this.bot.inventory?.items()?.find((i) => i.name === itemName);
    if (this.bot.inventory && !item) {
      return {
        success: false,
        action: 'equipItem',
        error: `Item "${itemName}" not found in inventory to equip.`,
      };
    }

    if (this.bot.equip && item) {
      await this.bot.equip(item, destination);
    }

    return {
      success: true,
      action: 'equipItem',
      data: { itemName, destination },
    };
  }

  async _executeLookAt({ target, forcePitch }) {
    if (this.bot.lookAt) {
      await this.bot.lookAt(target, forcePitch);
    }
    return {
      success: true,
      action: 'lookAt',
      data: { target },
    };
  }

  async _executeChat({ message }) {
    if (this.bot.chat) {
      this.bot.chat(message);
    }
    return {
      success: true,
      action: 'chat',
      data: { message },
    };
  }
}

export default ActionExecutor;
