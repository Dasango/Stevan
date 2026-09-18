# /bridge — Agent Guidelines

## 1. Scope & Overall Purpose
The `/bridge` module is the physical gateway connecting Stevan to Minecraft. It accomplishes:
- Establishing and maintaining a persistent bot player connection to a Minecraft Java Edition server using Mineflayer.
- Handling authentication seamlessly in both `offline` mode (local LAN / cracked servers) and `microsoft` mode (official servers).
- Tracking bot physical state in real time: 3D coordinates, orientation, health, hunger, and complete inventory contents.
- Hosting an embedded `prismarine-viewer` web interface on port 3000, rendering Stevan's first-person perspective live in any browser.
- Exposing high-level movement primitives (pathfinding, lookAt, jumping) and safe event dispatching.

## 2. Modularity & Connections with Other Modules
- **Modularity**: Completely standalone. `/bridge` can run entirely on its own to spawn a functional player bot in Minecraft with zero AI dependencies.
- **Outbound Connections**:
  - Emits native lifecycle and world events (`bot:spawn`, `bot:health`, `bot:entityHurt`, `bot:death`, `bot:physicsTick`) to `/event-triggers` for safety tripwires.
  - Provides real-time world state snapshots (coordinates, nearby blocks, inventory) to `/llm-controller` and `/orchestrator`.
- **Inbound Connections**:
  - Receives discrete action commands (`moveTo`, `mineBlock`, `placeBlock`, `chat`) from `/llm-controller`, `/orchestrator`, and `/build-orchestration`.

## 3. Configuration & Secrets
All connection parameters are managed via `.env` (sanitized template in `.env.example`):
- `MC_HOST`: Minecraft server hostname/IP (default: `localhost`).
- `MC_PORT`: Server port (default: `25565`).
- `MC_USERNAME`: Bot player name (default: `StevanBot`).
- `MC_AUTH`: Authentication mode (`offline` or `microsoft`, default: `offline`).
- `VIEWER_PORT`: Web viewer port (default: `3000`).

## 4. In-Game Minecraft Testing & Visual Verification

### How to Test in Minecraft:
1. **Prepare Minecraft**:
   - Launch Minecraft Java Edition (1.20+ recommended).
   - Enter a Singleplayer world.
   - Press **Esc** $\rightarrow$ **Open to LAN** $\rightarrow$ Set Port to `25565` $\rightarrow$ Click **Start LAN World**.
2. **Launch the Bridge**:
   - In terminal, navigate to `/bridge` and run:
     ```bash
     npm start
     ```

### What You See In-Game (Visual Results):
- **Bot Spawns**: Inside your Minecraft world, you see a player named `StevanBot` physically materialize next to your player or at world spawn.
- **Web 3D Viewer**: Open `http://localhost:3000` in your web browser. You see Stevan's live first-person view. When the bot moves his head or looks around, the browser viewer renders the world in real time.
- **Physical Interactions**: If you push or hit Stevan in-game, you see him take knockback and damage particles, and the console immediately logs his updated health.
