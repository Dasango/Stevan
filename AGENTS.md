# Stevan — Agent Guidelines (AGENTS.md)

Welcome to the **Stevan** project. This file is the operational source of truth for coding agents and contributors. Read it completely before performing any tasks or generating code.

---

## 1. Core Principles (Non-Negotiable)

1. **Never Reinvent the Wheel**:
   - Before writing any custom code for an already-solved problem (authentication, world viewer, tool/function calling, model rotation, screen capture, input injection, RL loops, schematic parsing, pathfinding), research and adopt existing, proven libraries or reference implementations (e.g., Mineflayer plugins, OpenAI VPT, STEVE-1, Voyager, Mindcraft, Stable-Baselines3).
   - Write custom code **only** as glue logic between proven components.
2. **Strict Modularity**:
   - Each capability lives in its own isolated module directory.
   - Every module has a distinct, single responsibility and clean boundaries.
   - Modules interact solely through documented interfaces, events, and data structures.
3. **Proximity Rule**:
   - Module-specific instructions in `<module>/AGENTS.md` override or extend this root file for their respective scopes.

---

## 2. Monorepo Directory Structure & Module Purposes

```text
stevan/
├── AGENTS.md                  # Root agent instructions (this file)
├── README.md                  # Project overview
├── .gitignore                 # Monorepo git ignore rules
├── mindcraft/                 # Core: Mindcraft LLM-Mineflayer autonomous agent framework
├── bridge/                    # [DEPRECATED / FROZEN] Handcrafted legacy bridge (see legacy/handcrafted-bridge)
├── llm-controller/            # [DEPRECATED / FROZEN] Handcrafted legacy controller (see legacy/handcrafted-bridge)
├── vpt-bridge/                # Step 3: STEVE-1 / VPT vision capture & continuous motor control
├── orchestrator/              # Step 4: Hierarchical orchestrator (LLM high-level + VPT motor skills)
├── rl-training/               # Step 5: Headless simulated RL fine-tuning pipeline
├── event-triggers/            # Step 6: Pure event-driven reactive failure detection (no polling)
├── build-orchestration/       # Step 7: Schematic parsing (.schem/.litematic) & autonomous building
└── docs/                      # Architectural specs & documentation
```

### Module Purposes & Connections:

0. **`/mindcraft`**:
   - **Purpose**: Autonomous agent foundation based on [mindcraft-bots/mindcraft](https://github.com/mindcraft-bots/mindcraft). Handles Mineflayer server connection, A* pathfinding (`mineflayer-pathfinder`), player following (`!followPlayer`), block collection (`mineflayer-collectblock`), multi-provider LLM conversation/tool use, auto-defense modes (`self_defense`), unstuck watchdog, and 3D web viewer (`prismarine-viewer`).
   - **Architectural Mandate**: **PROHIBITED TO REINVENT THE WHEEL**. Under no circumstance shall any agent rewrite pathfinder, `followPlayer`, or damage handling from scratch. Any custom behavior, identity, or prompt MUST be extended as a profile (`profiles/stevan.json`), skill (`src/agent/library/skills.js`), or mode (`src/agent/modes.js`) on top of Mindcraft.
   - **Connections**: Serves as the discrete body, conversational brain, and reactive executor for `orchestrator`.

1. **`/bridge`** & 2. **`/llm-controller`**:
   - **Status**: **FROZEN / LEGACY**. The initial handcrafted glue code failed to properly integrate pathfinding and reactive trips. Preserved on git branch `legacy/handcrafted-bridge` strictly for historical reference. All active execution occurs through `/mindcraft`.
3. **`/vpt-bridge`**:
   - **Purpose**: Low-level 20Hz visual motor policy using OpenAI VPT / STEVE-1. Captures the Minecraft window, processes 128x128 frames, runs neural policy inference, and injects continuous mouse and keyboard inputs via Windows direct input.
   - **Connections**: Serves as a specialized motor execution sub-policy for `orchestrator` when human-like fluid movement is needed (e.g. tree chopping, combat).
4. **`/orchestrator`**:
   - **Purpose**: Master coordinator using the Hierarchical Options Framework. Decomposes high-level missions into subgoals, deciding when to use discrete pathfinding (`bridge`) and when to activate continuous neural skills (`vpt-bridge`).
   - **Connections**: Connects `llm-controller` (planner), `bridge` (discrete body), `vpt-bridge` (motor skills), and `event-triggers` (safety interrupts).
5. **`/rl-training`**:
   - **Purpose**: Offline Reinforcement Learning (RL) fine-tuning pipeline. Trains VPT/STEVE-1 models inside simulated headless environments (Gymnasium / MineRL) with PPO to master specific reflex skills (e.g. hostile mob combat, evasion).
   - **Connections**: Exports trained neural weights checkpoints (`fine_tuned_best.zip`) directly to `vpt-bridge` for live in-game execution.
6. **`/event-triggers`**:
   - **Purpose**: Zero-polling reactive tripwires for critical safety (damage taken, falling, lava immersion, creeper proximity).
   - **Connections**: Hooks directly into native Mineflayer events from `bridge` and instantly interrupts `orchestrator` and `llm-controller` when safety thresholds are breached.
7. **`/build-orchestration`**:
   - **Purpose**: Autonomous blueprint construction from standard `.schem` and `.litematic` files. Validates environmental clearance, calculates Bill of Materials, and executes topological block placement.
   - **Connections**: Employs `vpt-bridge` / `orchestrator` to gather missing resources, and commands `bridge` to physically place blocks.

---

## 3. Approved Libraries & Runtime Matrix

| Module                     | Runtime               | Approved Libraries / Tools                                                                                           | Prohibited Patterns                                               |
| :------------------------- | :-------------------- | :------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------- |
| **`/bridge`**              | Node.js (v18+ / v20+) | `mineflayer`, `prismarine-viewer`, `canvas`, `dotenv`, `mineflayer-pathfinder`                                       | Custom packet-level auth, custom renderers                        |
| **`/llm-controller`**      | Node.js (ESM)         | `openai` (for OpenRouter/OpenAI/vLLM/Ollama), `zod`, `dotenv`                                                        | Vendor-locked proprietary SDKs without OpenAI fallback            |
| **`/vpt-bridge`**          | Python 3.10+          | `torch`, `torchvision`, `numpy`, `opencv-python`, `mss` or `bettercam`, `pydirectinput`, official STEVE-1 / VPT code | Custom neural architectures for vision/action                     |
| **`/orchestrator`**        | Node.js or Python     | Hierarchical Options framework, async queues, WebSockets / IPC                                                       | Tightly coupling LLM prompting directly into VPT loops            |
| **`/rl-training`**         | Python 3.10+          | `gymnasium`, `stable-baselines3`, `mineclip`, `minerl` or `minedojo`, `tensorboard`                                  | Manual RL loops (e.g. hand-written PPO), training on live servers |
| **`/event-triggers`**      | Node.js               | Native Mineflayer EventEmitter, `eventemitter2`                                                                      | Periodic state polling loops (`setInterval` checking health)      |
| **`/build-orchestration`** | Node.js               | `prismarine-schematic`, `prismarine-world`, `mineflayer-builder`                                                     | Hand-rolled custom block formats, unverified placements           |

---

## 4. In-Game Minecraft Verification Guide (Live Testing)

Every module in Stevan is verified by running live against a Minecraft Java Edition instance.

### General Test Environment Setup:

1. Launch **Minecraft Java Edition** (1.20+ recommended).
2. Enter Singleplayer $\rightarrow$ Create or open a test world $\rightarrow$ Allow Cheats: ON.
3. Open game menu (Esc) $\rightarrow$ **Open to LAN** $\rightarrow$ Port: `25565` $\rightarrow$ Start LAN World.

### How Verification Looks In-Game Per Module:

- **Bridge (Step 1)**: Run `npm start` in `/bridge`. Stevan spawns next to you as a physical player. Open `http://localhost:3000` in your web browser to see his live 3D first-person perspective.
- **LLM Controller (Step 2)**: Run `npm run live` in `/llm-controller`. Stevan greets you in Minecraft chat. Talk to him via `/chat` or open chat (e.g., "Stevan come" or "chop wood"). Stevan replies in chat and physically moves or mines blocks.
- **VPT Bridge (Step 3)**: Position the game window in front of a tree. Run the VPT bridge controller. You visually see Stevan's crosshair smoothly turn toward the wood, walk forward, and hold attack to chop the trunk like a human player.
- **Orchestrator (Step 4)**: Give Stevan a compound command in chat (e.g., "Build a starter shelter"). Stevan coordinates Mineflayer navigation to locate trees, engages VPT to chop wood, crafts planks at a workbench, and builds the shelter.
- **RL Training (Step 5)**: Deploy the fine-tuned combat model. Spawn a Zombie near Stevan (`/summon zombie ~2 ~ ~`). Stevan fluidly strafes, shields, times sword cooldowns, and eliminates the hostile mob taking zero damage.
- **Event Triggers (Step 6)**: While Stevan is performing a task, attack him or spawn a Creeper nearby. Within milliseconds, Stevan interrupts his active work, alerts you in chat, and retreats to safety.
- **Build Orchestration (Step 7)**: Provide Stevan with required materials. Load a `.schem` blueprint. Stevan verifies the ground and constructs the structure layer-by-layer in real time before your eyes.

---

## 5. Code Style & Conventions

- **JavaScript / TypeScript**: Modern ES Modules (`"type": "module"` in `package.json`). Strict async/await. Clean error boundaries.
- **Python**: Python 3.10+ standard. Strict type hints. PEP 8 conventions. Virtual environments (`.venv`).
- **Secrets & Credentials**: Never commit `.env` files. Always commit sanitized `.env.example` templates.
