# /llm-controller — Agent Guidelines

## 1. Scope & Overall Purpose
The `/llm-controller` module serves as Stevan's cognitive reasoning brain and natural language interface. It accomplishes:
- Translating free-form human instructions into validated, executable Minecraft action tools (`moveTo`, `mineBlock`, `placeBlock`, `craftItem`, `equipItem`, `chat`).
- Dynamic LLM provider integration using OpenAI-compatible endpoints (OpenRouter, Groq, vLLM, Ollama).
- Automated model rotation and fallback chains through free models (e.g. Gemini 2.0 Flash, Llama 3.3 70B) to guarantee zero downtime even during rate limits.
- Strict schema validation using Zod so that hallucinatory or malformed LLM responses are trapped before executing in the game.

## 2. Modularity & Connections with Other Modules
- **Modularity**: Completely decoupled. It can run in standalone CLI mode (`npm run chat`) for testing conversational logic without Minecraft, or connected in live mode (`npm run live`).
- **Inbound Connections**:
  - Receives player chat messages and sensory world snapshots (bot position, nearby blocks, inventory counts) from `/bridge`.
  - Receives high-level planning requests from `/orchestrator`.
- **Outbound Connections**:
  - Sends validated action tool calls (`mineBlock`, `moveTo`, etc.) to `/bridge` for physical execution in the world.
  - Returns structured task decompositions and subgoals to `/orchestrator`.

## 3. Configuration & Secrets
Managed via `.env` in `/llm-controller` (see `.env.example`):
- `OPENROUTER_API_KEY`: API key for OpenRouter (free tier available at openrouter.ai).
- `LLM_BASE_URL`: OpenAI-compatible endpoint URL (default: `https://openrouter.ai/api/v1`).
- `LLM_PRIMARY_MODEL`: Primary model (e.g., `google/gemini-2.0-flash-exp:free`).
- `LLM_FALLBACK_MODELS`: Comma-separated list of fallback models.
- `LLM_TEMPERATURE`: Sampling temperature (default: `0.1` for precise function calling).

## 4. In-Game Minecraft Testing & Visual Verification

### How to Test in Minecraft:
1. **Configure API Key**:
   - Ensure `OPENROUTER_API_KEY` is set in `llm-controller/.env`.
2. **Prepare Minecraft**:
   - Launch Minecraft Java Edition and open your world to LAN on port `25565` (Cheats ON).
3. **Launch the Live Controller**:
   - In terminal, navigate to `/llm-controller` and run:
     ```bash
     npm run live
     ```

### What You See In-Game (Visual Results):
- **Bot Welcomes You in Chat**: Stevan spawns in the world and announces in Minecraft chat:
  `[StevanBot] ¡Hola! Estoy conectado y listo para recibir instrucciones.`
- **Conversational Responses**: Type in Minecraft chat:
  `Hola Stevan, ¿dónde estás?`
  Stevan calculates his coordinates and responds in chat with his exact location and surroundings.
- **Physical Action Execution**:
  - Type: `Stevan ven aquí` $\rightarrow$ Stevan uses pathfinding to navigate around terrain obstacles and stops in front of you.
  - Type: `Stevan mina ese bloque de madera` $\rightarrow$ Stevan walks over to the nearest wood block, swings his arm, breaks the block, and picks up the dropped item.
