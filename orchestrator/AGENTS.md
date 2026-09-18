# /orchestrator — Agent Guidelines

## 1. Scope & Overall Purpose
The `/orchestrator` module is Stevan's master coordinator. It implements the classical **Hierarchical Reinforcement Learning Options Framework** to manage complex, long-horizon objectives. It accomplishes:
- Decomposing abstract player goals (e.g., "Survive the night", "Build a starter shelter", "Gather resources") into sequential sub-tasks.
- Dynamically delegating between discrete pathfinding routines (`/bridge`) and continuous neural visual skills (`/vpt-bridge`).
- Managing execution lifecycles: Initiation conditions ($I_\omega$), Policy execution ($\pi_\omega$), and Termination conditions ($\beta_\omega$).
- Handling failures gracefully: when an option times out, hits an obstacle, or gets interrupted, it triggers an automatic replan via `/llm-controller` without crashing.

## 2. Modularity & Connections with Other Modules
- **Modularity**: Pure coordination layer. It contains no hardcoded Minecraft packets or neural weights; it simply governs how and when the other specialized modules operate.
- **Inbound Connections**:
  - Receives high-level user instructions from Minecraft chat or terminal.
  - Receives critical emergency interrupts (`interrupt:fired`) from `/event-triggers`.
  - Receives task execution feedback from `/bridge` and `/vpt-bridge`.
- **Outbound Connections**:
  - Requests subgoal decomposition and strategic replanning from `/llm-controller`.
  - Commands `/bridge` for pathfinding, item crafting, and inventory management.
  - Commands `/vpt-bridge` for real-time visual motor skills (chopping, mining, combat).

## 3. Configuration
Managed via `.env` in `/orchestrator` (see `.env.example`):
- `DEFAULT_OPTION_TIMEOUT_SEC`: Maximum time allocated to a skill before replanning (default: `45`).
- `MAX_SUBGOAL_RETRIES`: Retry limit before aborting or asking the player for guidance (default: `3`).

## 4. In-Game Minecraft Testing & Visual Verification

### How to Test in Minecraft:
1. **Prepare Minecraft**:
   - Launch Minecraft Java Edition and open your world to LAN on port `25565` (Cheats ON).
2. **Launch the Orchestrator**:
   - In terminal, navigate to `/orchestrator` and run:
     ```bash
     npm start
     ```

### What You See In-Game (Visual Results):
- **Bot Spawns & Awaits Mission**: Stevan enters your world and connects to the orchestration loop.
- **Compound Goal Execution**: Instruct Stevan in chat:
  `Recoge 3 troncos de madera y craftea tablones`
- **Visible Hierarchical Transitions**:
  1. *Subgoal 1 (Navigation)*: Stevan uses Mineflayer pathfinding to run toward the nearest tree, jumping over blocks and avoiding water.
  2. *Subgoal 2 (VPT Skill)*: Once within range, control hands off to VPT. Stevan smoothly aims his crosshair at the trunk, chops the wood, and picks up the drops.
  3. *Subgoal 3 (Crafting)*: Stevan switches back to discrete control, opens his inventory, crafts the logs into oak planks, and announces completion in chat.
- **Visual Error Recovery**: If you place a wall of dirt blocking Stevan while he is walking, he stops, recognizes the path is blocked, chats `[StevanBot] Obstáculo detectado, recalculando ruta...`, and paths around the obstruction.
