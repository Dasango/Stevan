import readline from 'readline';
import { LLMController } from './controller.js';
import { loadLLMConfig } from './config.js';

const config = loadLLMConfig();

console.log('====================================================');
console.log(' Stevan — Terminal Interactive Chat (Step 2 Tester)');
console.log('====================================================');
console.log(`Modelo Primario: ${config.primaryModel}`);
console.log(`Endpoint:        ${config.baseURL}`);
console.log('Escribe una orden o pregunta en lenguaje natural.');
console.log('Ejemplos:');
console.log(' - "Camina hacia la coordenada x: 15, y: 64, z: -20"');
console.log(' - "Pica el tronco de roble que tienes en (14, 65, -20)"');
console.log(' - "Pon un bloque de adoquín en (14, 64, -21)"');
console.log(' - "Craftea 4 tablones de madera"');
console.log(' - "Escribe salir para terminar"');
console.log('====================================================\n');

// Mock world state for terminal test
const mockWorld = {
  position: { x: 0, y: 64, z: 0 },
  health: 20,
  food: 20,
  inventory: [
    { name: 'oak_log', count: 4 },
    { name: 'cobblestone', count: 16 },
    { name: 'iron_pickaxe', count: 1 },
  ],
  nearbyBlocks: [
    { name: 'oak_log', position: { x: 14, y: 65, z: -20 } },
    { name: 'dirt', position: { x: 0, y: 63, z: 0 } },
  ],
  nearbyEntities: [],
};

const controller = new LLMController(config);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'Tú > ',
});

rl.prompt();

rl.on('line', async (line) => {
  const input = line.trim();
  if (!input) {
    rl.prompt();
    return;
  }

  if (input.toLowerCase() === 'salir' || input.toLowerCase() === 'exit') {
    console.log('Cerrando sesión de prueba.');
    process.exit(0);
  }

  console.log('[Pensando con LLM...]');
  try {
    const result = await controller.processInstruction(input, mockWorld);

    if (result.status === 'action_executed') {
      console.log(`\n🤖 Stevan ejecutó la herramienta: [${result.tool}]`);
      console.log('Parámetros validados por Zod:', JSON.stringify(result.parameters, null, 2));
      console.log(`Modelo utilizado: ${result.usedModel}\n`);
    } else if (result.status === 'text_response') {
      console.log(`\n💬 Stevan dice: "${result.content}"`);
      console.log(`Modelo utilizado: ${result.usedModel}\n`);
    } else if (result.status === 'validation_error') {
      console.error(`\n❌ Error de validación Zod: ${result.error}\n`);
    }
  } catch (err) {
    console.error(`\n❌ Error en la llamada al modelo: ${err.message}`);
    console.log('Tip: Verifica que tu OPENROUTER_API_KEY esté configurada en llm-controller/.env si estás usando una API remota.\n');
  }

  rl.prompt();
});
