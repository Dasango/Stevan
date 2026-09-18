import path from 'path';
import { fileURLToPath } from 'url';
import { StevanBridge } from '../../bridge/src/bot.js';
import { LLMController } from './controller.js';
import { loadLLMConfig } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const llmConfig = loadLLMConfig();
const bridge = new StevanBridge();

console.log('====================================================');
console.log(' Stevan — Live In-Game Chat Controller (Step 2)');
console.log('====================================================');
console.log(`Minecraft Servidor: ${bridge.config.host}:${bridge.config.port}`);
console.log(`Bot Username:       ${bridge.config.username}`);
console.log(`Modelo LLM:         ${llmConfig.primaryModel}`);
console.log(`Visor Web:          http://localhost:${bridge.config.viewerPort}`);
console.log('====================================================\n');

const bot = bridge.connect();
const controller = new LLMController(llmConfig, bot);

bridge.on('bot:spawn', () => {
  console.log('Bot ha aparecido en el mundo de Minecraft.');
  bridge.startViewer();
  bot.chat('¡Hola! Soy Stevan. Escríbeme en el chat lo que quieres que haga.');
});

// Listen to in-game chat events from players
bot.on('chat', async (username, message) => {
  // Ignore bot's own messages
  if (username === bot.username) return;

  console.log(`\n[CHAT RECIBIDO de ${username}]: "${message}"`);
  console.log('Consultando al LLM...');

  const status = bridge.getStatus();
  const worldSnapshot = {
    position: status.position,
    health: status.health,
    food: status.food,
    inventory: bot.inventory ? bot.inventory.items().map((i) => ({ name: i.name, count: i.count })) : [],
  };

  try {
    const result = await controller.processInstruction(message, worldSnapshot);

    if (result.status === 'action_executed') {
      console.log(`[ACCIÓN EJECUTADA]: ${result.tool}`);
      bot.chat(`Ejecutando orden: ${result.tool}`);
    } else if (result.status === 'text_response') {
      console.log(`[RESPUESTA]: "${result.content}"`);
      bot.chat(result.content);
    } else if (result.status === 'validation_error') {
      console.error(`[ERROR VALIDACIÓN]: ${result.error}`);
      bot.chat(`No pude entender bien los parámetros: ${result.error}`);
    }
  } catch (err) {
    console.error(`[ERROR LLM]: ${err.message}`);
    bot.chat(`Ocurrió un error al procesar la orden: ${err.message}`);
  }
});
