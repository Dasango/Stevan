import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Loads and validates configuration for LLM controller.
 * @param {Record<string, any>} [overrides={}]
 */
export function loadLLMConfig(overrides = {}) {
  const apiKey = overrides.apiKey ?? process.env.OPENROUTER_API_KEY ?? '';
  const baseURL = overrides.baseURL ?? process.env.LLM_BASE_URL ?? 'https://openrouter.ai/api/v1';
  const primaryModel = overrides.primaryModel ?? process.env.LLM_PRIMARY_MODEL ?? 'google/gemini-2.0-flash-exp:free';

  const rawFallbacks = overrides.fallbackModels ?? process.env.LLM_FALLBACK_MODELS ?? 'meta-llama/llama-3.3-70b-instruct:free,openrouter/free';
  const fallbackModels = Array.isArray(rawFallbacks)
    ? rawFallbacks
    : rawFallbacks.split(',').map((s) => s.trim()).filter(Boolean);

  const temperature = parseFloat(overrides.temperature ?? process.env.LLM_TEMPERATURE ?? '0.1');

  return {
    apiKey,
    baseURL,
    primaryModel,
    fallbackModels,
    temperature: isNaN(temperature) ? 0.1 : Math.max(0, Math.min(2, temperature)),
  };
}

export default loadLLMConfig;
