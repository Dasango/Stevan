# Stevan — Agent Guidelines (AGENTS.md)

Welcome to the **Stevan** project. This file is the operational source of truth for coding agents and contributors. Read it completely before performing any tasks or generating code.

---

## 1. Core Principles (Non-Negotiable)

1. **Never Reinvent the Wheel**:
   - Before writing any custom code for an already-solved problem (authentication, world viewer, tool/function calling, model rotation, screen capture, input injection, RL loops, schematic parsing, pathfinding), research and adopt existing, proven libraries or reference implementations (e.g., Mineflayer plugins, OpenAI VPT, STEVE-1, Voyager, Mindcraft, Stable-Baselines3).
   - Write custom code **only** as glue logic between proven components.
2. **Strict Modularity**:
   - Each capability lives in its own isolated module directory.
   - Every module must have a documented interface contract (**Inputs**, **Outputs**, **Emitted Events**).
   - Every module must be testable in complete isolation from the rest of the monorepo.
3. **Approval Per Step**:
   - Work is organized in sequential Steps (0 through 7).
   - No step is considered complete until the user has reviewed and explicitly approved the test definitions and results for that step.
4. **Pre-defined Thresholds**:
   - Acceptance criteria, numeric performance thresholds, and latency targets are determined *before* implementation, never adjusted post-hoc to fit empirical results.
5. **Proximity Rule**:
   - Module-specific instructions in `<module>/AGENTS.md` override or extend this root file for their respective scopes.

---

## 2. Monorepo Directory Structure

```text
stevan/
├── AGENTS.md                  # Root agent instructions (this file)
├── README.md                  # Project overview
├── .gitignore                 # Monorepo git ignore rules
├── bridge/                    # Step 1: Mineflayer bot connection, auth & Prismarine-viewer
├── llm-controller/            # Step 2: LLM function-calling & cross-provider action schema
├── vpt-bridge/                # Step 3: STEVE-1 / VPT vision capture & continuous action injection
├── orchestrator/              # Step 4: Hierarchical orchestrator (LLM high-level + VPT motor skills)
├── rl-training/               # Step 5: Headless simulated RL fine-tuning pipeline
├── event-triggers/            # Step 6: Pure event-driven reactive failure detection (no polling)
├── build-orchestration/       # Step 7: Schematic parsing (.schem/.litematic) & autonomous building
└── docs/                      # Architectural specs, Step acceptance logs & interface contracts
```

---

## 3. Approved Libraries & Runtime Matrix

Do not introduce new dependencies outside this approved list without prior review:

| Module | Runtime | Approved Libraries / Tools | Prohibited Patterns |
| :--- | :--- | :--- | :--- |
| **`/bridge`** | Node.js (v18+ / v20+) | `mineflayer`, `prismarine-viewer`, `canvas`, `dotenv`, `mineflayer-pathfinder` | Custom packet-level auth, custom renderers |
| **`/llm-controller`** | Node.js (ESM) | `openai` (for OpenRouter/OpenAI/vLLM/Ollama), `zod`, `dotenv` | Vendor-locked proprietary SDKs without OpenAI fallback |
| **`/vpt-bridge`** | Python 3.10 | `torch`, `torchvision`, `numpy`, `opencv-python`, `mss` or `bettercam`, `pydirectinput`, official STEVE-1 / VPT code | Custom neural architectures for vision/action |
| **`/orchestrator`** | Node.js or Python | Hierarchical Options framework, async queues, WebSockets / IPC | Tightly coupling LLM prompting directly into VPT loops |
| **`/rl-training`** | Python 3.10 | `gymnasium`, `stable-baselines3`, `mineclip`, `minerl` or `minedojo`, `tensorboard` | Manual RL loops (e.g. hand-written PPO), training on live servers |
| **`/event-triggers`** | Node.js | Native Mineflayer EventEmitter, `eventemitter2` | Periodic state polling loops (`setInterval` checking health) |
| **`/build-orchestration`**| Node.js | `prismarine-schematic`, `prismarine-world`, `mineflayer-builder` | Hand-rolled custom block formats, unverified placements |

---

## 4. Module Interfaces Overview

Each module interacts across well-defined boundaries:

- **`/bridge`**:
  - *Input*: Connection config (`host`, `port`, `username`, `auth`), discrete action commands.
  - *Output*: Bot telemetry (position, health, inventory), Viewer Web interface (port 3000 default).
  - *Events Emitted*: `bot:spawn`, `bot:death`, `bot:health`, `bot:entityHurt`, `bot:entitySpawn`, `bot:physicsTick`, `bot:error`, `bot:end`.
- **`/llm-controller`**:
  - *Input*: Natural language instruction + world state JSON snapshot.
  - *Output*: Validated tool call (`moveTo(x,y,z)`, `mineBlock(type)`, `placeBlock(type,x,y,z)`).
- **`/vpt-bridge`**:
  - *Input*: Video frame (RGB) + textual prompt / MineCLIP goal embedding.
  - *Output*: Direct motor execution (mouse movement `dx, dy`, key presses) + latency/FPS telemetry.
- **`/orchestrator`**:
  - *Input*: High-level compound goal.
  - *Output*: Option termination signals, state machine transitions, dispatch to `/bridge` vs `/vpt-bridge`.
- **`/event-triggers`**:
  - *Input*: Native Mineflayer event stream from `/bridge`.
  - *Output*: Immediate interrupt signals (`tripwire:triggered`) with state snapshot to `/orchestrator`.
- **`/rl-training`**:
  - *Input*: Base weights, task reward specification, simulation seeds.
  - *Output*: Evaluated policy checkpoint, Tensorboard logs, holdout performance score.
- **`/build-orchestration`**:
  - *Input*: Schematic file (.schem / .litematic) + world target coordinates.
  - *Output*: Feasibility assessment, Bill of Materials, step-by-step placement plan.

---

## 5. Testing Protocols & Commands

Always run isolated unit and integration tests before presenting a step for user approval.

### Node.js Modules (`/bridge`, `/llm-controller`, `/event-triggers`, `/build-orchestration`)
- **Framework**: `node:test` or Vitest / Jest.
- **Command**:
  ```bash
  npm test
  ```
- **Rule**: Network calls to live LLMs or Minecraft servers must be mockable in unit tests via mock sockets or recorded responses.

### Python Modules (`/vpt-bridge`, `/rl-training`)
- **Framework**: `pytest`.
- **Command**:
  ```bash
  pytest -v
  ```
- **Rule**: Heavy GPU inference must have CPU/mock tensor fixtures for CI/local verification.

---

## 6. Code Style & Conventions

- **JavaScript / TypeScript**:
  - Use Modern ES Modules (`"type": "module"` in `package.json`).
  - Strict async/await; unhandled promise rejections must be trapped.
  - Clean error boundaries: wrap external bridge calls in informative exceptions.
- **Python**:
  - Python 3.10+ standard.
  - Strict type hints (`from typing import Optional, Dict, Any, List`).
  - PEP 8 naming and formatting conventions.
  - Virtual environments (`.venv`) for package isolation.
- **Secrets & Credentials**:
  - Never commit credentials, passwords, or API keys.
  - Always commit a sanitized `.env.example` alongside the module.
  - Load environment variables using `dotenv` (Node) or `python-dotenv` (Python).
- **Git Commits**:
  - Follow Conventional Commits: `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`.
