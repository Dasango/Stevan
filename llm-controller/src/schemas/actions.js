import { z } from 'zod';

/**
 * Coordinate schema with Minecraft Java world height limits [-64, 320].
 */
export const CoordinateSchema = z.object({
  x: z.number().describe('Target X coordinate in world space'),
  y: z.number().min(-64).max(320).describe('Target Y coordinate in world space (height)'),
  z: z.number().describe('Target Z coordinate in world space'),
});

/**
 * Schema for moveTo tool.
 */
export const MoveToSchema = z.object({
  target: CoordinateSchema.describe('Destination coordinates to navigate towards'),
  tolerance: z.number().min(0.1).max(10).default(1.0).describe('Arrival tolerance radius in blocks (default: 1.0)'),
  timeoutSeconds: z.number().min(1).max(120).default(30).describe('Maximum navigation timeout in seconds (default: 30)'),
});

/**
 * Schema for mineBlock tool.
 */
export const MineBlockSchema = z.object({
  position: CoordinateSchema.describe('Coordinates of the block to mine'),
  blockType: z.string().optional().describe('Expected block type name (e.g., "oak_log", "dirt", "iron_ore")'),
});

/**
 * Schema for placeBlock tool.
 */
export const PlaceBlockSchema = z.object({
  blockType: z.string().describe('Item/block name to place from inventory (e.g., "cobblestone", "oak_planks")'),
  position: CoordinateSchema.describe('Target coordinates where the new block should be placed'),
  face: z.enum(['top', 'bottom', 'north', 'south', 'east', 'west']).default('top').describe('Face of the reference block to attach to'),
});

/**
 * Schema for craftItem tool.
 */
export const CraftItemSchema = z.object({
  itemName: z.string().describe('Name of the item to craft (e.g., "oak_planks", "crafting_table", "wooden_pickaxe")'),
  count: z.number().int().min(1).max(64).default(1).describe('Quantity of items to craft (1 to 64)'),
});

/**
 * Schema for equipItem tool.
 */
export const EquipItemSchema = z.object({
  itemName: z.string().describe('Name of item to equip from inventory (e.g., "iron_sword", "diamond_chestplate")'),
  destination: z.enum(['hand', 'off-hand', 'head', 'torso', 'legs', 'feet']).default('hand').describe('Equipment slot destination'),
});

/**
 * Schema for lookAt tool.
 */
export const LookAtSchema = z.object({
  target: CoordinateSchema.describe('Coordinates in world space to aim bot gaze towards'),
  forcePitch: z.boolean().default(true).describe('Whether to update vertical gaze pitch'),
});

/**
 * Schema for chat tool.
 */
export const ChatSchema = z.object({
  message: z.string().min(1).max(256).describe('Chat message text to send in-game or report to player'),
});

/**
 * Registry mapping tool name to its Zod validation schema.
 */
export const ACTION_SCHEMAS = {
  moveTo: MoveToSchema,
  mineBlock: MineBlockSchema,
  placeBlock: PlaceBlockSchema,
  craftItem: CraftItemSchema,
  equipItem: EquipItemSchema,
  lookAt: LookAtSchema,
  chat: ChatSchema,
};

/**
 * Validates raw parameters against the registered Zod tool schema.
 * @param {string} toolName
 * @param {Record<string, any>} rawParams
 * @returns {{ success: boolean, data?: any, error?: string }}
 */
export function validateToolCall(toolName, rawParams) {
  const schema = ACTION_SCHEMAS[toolName];
  if (!schema) {
    return {
      success: false,
      error: `Unknown tool name: "${toolName}". Approved tools are: ${Object.keys(ACTION_SCHEMAS).join(', ')}.`,
    };
  }

  const result = schema.safeParse(rawParams);
  if (!result.success) {
    return {
      success: false,
      error: `Validation error for tool "${toolName}": ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

/**
 * OpenAI Tool Specification array for LLM function calling.
 */
export const OPENAI_ACTION_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'moveTo',
      description: 'Navigate the bot to target (x, y, z) coordinates using pathfinding.',
      parameters: {
        type: 'object',
        properties: {
          target: {
            type: 'object',
            properties: {
              x: { type: 'number', description: 'Target X coordinate' },
              y: { type: 'number', description: 'Target Y coordinate (-64 to 320)' },
              z: { type: 'number', description: 'Target Z coordinate' },
            },
            required: ['x', 'y', 'z'],
          },
          tolerance: { type: 'number', description: 'Arrival radius tolerance in blocks (default: 1.0)' },
          timeoutSeconds: { type: 'number', description: 'Maximum pathfinding time in seconds (default: 30)' },
        },
        required: ['target'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'mineBlock',
      description: 'Mine and break a specific block at coordinates (x, y, z) using appropriate equipped tool.',
      parameters: {
        type: 'object',
        properties: {
          position: {
            type: 'object',
            properties: {
              x: { type: 'number', description: 'Block X coordinate' },
              y: { type: 'number', description: 'Block Y coordinate' },
              z: { type: 'number', description: 'Block Z coordinate' },
            },
            required: ['x', 'y', 'z'],
          },
          blockType: { type: 'string', description: 'Expected block name (e.g. "oak_log", "stone")' },
        },
        required: ['position'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'placeBlock',
      description: 'Place a block from bot inventory at specified coordinates against a reference face.',
      parameters: {
        type: 'object',
        properties: {
          blockType: { type: 'string', description: 'Name of block in inventory to place (e.g. "dirt", "cobblestone")' },
          position: {
            type: 'object',
            properties: {
              x: { type: 'number', description: 'Target X coordinate' },
              y: { type: 'number', description: 'Target Y coordinate' },
              z: { type: 'number', description: 'Target Z coordinate' },
            },
            required: ['x', 'y', 'z'],
          },
          face: {
            type: 'string',
            enum: ['top', 'bottom', 'north', 'south', 'east', 'west'],
            description: 'Face of the adjacent block to attach to (default: top)',
          },
        },
        required: ['blockType', 'position'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'craftItem',
      description: 'Craft an item recipe using inventory resources and nearby crafting table if needed.',
      parameters: {
        type: 'object',
        properties: {
          itemName: { type: 'string', description: 'Name of item to craft (e.g. "oak_planks", "torch")' },
          count: { type: 'integer', minimum: 1, maximum: 64, description: 'Number of items to craft (default: 1)' },
        },
        required: ['itemName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'equipItem',
      description: 'Equip an item from bot inventory into hand or armor slot.',
      parameters: {
        type: 'object',
        properties: {
          itemName: { type: 'string', description: 'Name of item to equip (e.g. "iron_pickaxe")' },
          destination: {
            type: 'string',
            enum: ['hand', 'off-hand', 'head', 'torso', 'legs', 'feet'],
            description: 'Equipment slot (default: hand)',
          },
        },
        required: ['itemName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'lookAt',
      description: 'Rotate bot head orientation to look directly at given world coordinates.',
      parameters: {
        type: 'object',
        properties: {
          target: {
            type: 'object',
            properties: {
              x: { type: 'number', description: 'Target X coordinate' },
              y: { type: 'number', description: 'Target Y coordinate' },
              z: { type: 'number', description: 'Target Z coordinate' },
            },
            required: ['x', 'y', 'z'],
          },
          forcePitch: { type: 'boolean', description: 'Whether to adjust vertical pitch angle' },
        },
        required: ['target'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'chat',
      description: 'Broadcast a message to in-game chat or notify human operator of status.',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string', maxLength: 256, description: 'Message content' },
        },
        required: ['message'],
      },
    },
  },
];
