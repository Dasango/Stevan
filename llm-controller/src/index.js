import { LLMController } from './controller.js';
import { ModelManager } from './models/model-manager.js';
import { ActionExecutor } from './executor/action-executor.js';
import { OPENAI_ACTION_TOOLS, validateToolCall, ACTION_SCHEMAS } from './schemas/actions.js';
import { loadLLMConfig } from './config.js';

export {
  LLMController,
  ModelManager,
  ActionExecutor,
  OPENAI_ACTION_TOOLS,
  validateToolCall,
  ACTION_SCHEMAS,
  loadLLMConfig,
};

// Standalone inspection runner
if (process.argv[1] && process.argv[1].endsWith('index.js')) {
  console.log('====================================================');
  console.log(' Stevan LLM Controller — Action Schema & Model Hub');
  console.log('====================================================');
  const config = loadLLMConfig();
  console.log(`Base URL:       ${config.baseURL}`);
  console.log(`Primary Model:  ${config.primaryModel}`);
  console.log(`Fallback Chain: ${config.fallbackModels.join(' -> ')}`);
  console.log(`Registered Tools: ${Object.keys(ACTION_SCHEMAS).join(', ')}`);
  console.log('====================================================');

  const manager = new ModelManager();
  console.log('\nQuerying available free models from provider...');
  manager
    .getAvailableFreeModels()
    .then((freeModels) => {
      console.log(`Found ${freeModels.length} free models on provider:`);
      freeModels.slice(0, 5).forEach((m) => console.log(` - ${m.id} (${m.name})`));
      if (freeModels.length > 5) {
        console.log(` ... and ${freeModels.length - 5} more.`);
      }
    })
    .catch((err) => {
      console.log('Could not reach remote provider models listing (offline/mock environment):', err.message);
    });
}
