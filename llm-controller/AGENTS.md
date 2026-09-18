# /llm-controller — Agent Guidelines

## 1. Scope & Responsibility
The `/llm-controller` module handles:
- Exposing a standard, cross-provider tool/function-calling interface to the LLM.
- Translating high-level natural language instructions into discrete Mineflayer actions (`moveTo`, `mineBlock`, `placeBlock`, `craftItem`, `lookAt`, etc.).
- Dynamically listing, selecting, and rotating through available free models (e.g. OpenRouter free tier, local Ollama, Groq) with fallback chains.
- Strict schema validation of LLM outputs using Zod before any action is executed.

## 2. Approved Stack & Prohibited Code
- **Runtime**: Node.js (>= 18.0.0, `"type": "module"` in `package.json`).
- **Approved Packages**:
  - `openai`: Unified client using OpenAI-compatible endpoints (works with OpenRouter, Groq, vLLM, Ollama, Together).
  - `zod`: Schema definition and parameter validation.
  - `dotenv`: Secrets and API key loading.
- **Prohibited**:
  - DO NOT write provider-specific SDK wrappers (e.g., separate un-unified clients) when the standard OpenAI-compatible API interface can be used.
  - DO NOT hardcode a static list of free models that goes stale; query the provider models API or allow dynamic configuration with fallbacks.
  - DO NOT execute raw unvalidated LLM output or execute dynamic string code (`eval`) on the bot.

## 3. Configuration & Secrets
Environment variables (via `.env`):
- `OPENROUTER_API_KEY`: API key for OpenRouter or alternative provider.
- `LLM_BASE_URL`: Base URL (default: `https://openrouter.ai/api/v1`).
- `LLM_PRIMARY_MODEL`: Primary model identifier (e.g., `google/gemini-2.0-flash-exp:free` or `meta-llama/llama-3.3-70b-instruct:free`).
- `LLM_FALLBACK_MODELS`: Comma-separated list of fallback models.
- `LLM_TEMPERATURE`: Default sampling temperature (default: `0.1` for deterministic function calls).

## 4. Interface Contract
- **Inputs**:
  - User instruction string (e.g., "mine 3 oak logs nearby").
  - Bot world snapshot (bot coordinates, nearby blocks, inventory counts).
- **Outputs**:
  - Structured action object:
    ```json
    {
      "tool": "mineBlock",
      "parameters": {
        "blockType": "oak_log",
        "target": { "x": 12, "y": 64, "z": -4 }
      },
      "rationale": "Located nearest oak log within reach."
    }
    ```
- **Events Emitted**:
  - `llm:request`: Prompt dispatched to LLM.
  - `llm:response`: Response received with token usage and latency.
  - `llm:fallback`: Primary model failed; switched to fallback model.
  - `llm:validation_error`: Output failed Zod schema validation.

## 5. Testing & Verification
- Unit tests must mock the OpenAI client to test tool schema generation, Zod validation, and fallback mechanisms deterministically without consuming API credits.
- Integration tests run against the provider free tier with a mock world state.
- Test command:
  ```bash
  npm test
  ```
