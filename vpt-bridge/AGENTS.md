# /vpt-bridge — Agent Guidelines

## 1. Scope & Overall Purpose
The `/vpt-bridge` module executes continuous, human-like visual motor control using OpenAI Video Pre-Training (VPT) and STEVE-1. It accomplishes:
- High-performance screen capture of the active Minecraft window on Windows (using `mss` / `bettercam`).
- Visual preprocessing following the official STEVE-1 pipeline (downscaling to 128x128, RGB normalization, and temporal frame buffer history).
- Neural policy inference conditioned on natural language prompts (via MineCLIP embeddings) such as `"chop tree"`, `"kill zombie"`, or `"mine dirt"`.
- Real-time direct input injection into Windows via `pydirectinput`, outputting analog mouse rotation (`dx, dy`) and keyboard presses (WASD, jump, sneak, attack, use).
- Sustaining a continuous 20Hz motor control loop matching Minecraft's native physics tick rate.

## 2. Modularity & Connections with Other Modules
- **Modularity**: Completely self-contained vision-action pipeline. It interacts with Minecraft purely through the monitor pixels and Windows OS input injection, independent of network protocol bots.
- **Inbound Connections**:
  - Receives short-horizon motor skill requests (e.g. prompt `"chop tree"`, timeout `15s`) from `/orchestrator`.
  - Uses fine-tuned policy weights trained in `/rl-training`.
- **Outbound Connections**:
  - Reports option status, completion signals, and execution telemetry (FPS, inference latency) back to `/orchestrator`.

## 3. Configuration & Weights
Managed via `.env` in `/vpt-bridge` (see `.env.example`):
- `VPT_MODEL_WEIGHTS_PATH`: Path to pretrained VPT/STEVE-1 weights.
- `MINECRAFT_WINDOW_TITLE`: Title of the Minecraft game window (default: `"Minecraft"`).
- `DEVICE`: Inference device (`cuda` for GPU acceleration or `cpu` fallback).
- `TARGET_FPS`: Target control frequency (default: `20` ticks/second).

## 4. In-Game Minecraft Testing & Visual Verification

### How to Test in Minecraft:
1. **Prepare Minecraft**:
   - Open Minecraft Java Edition in windowed mode (make sure the window title is "Minecraft").
   - Stand in front of a tree or open terrain.
2. **Launch the VPT Controller**:
   - In terminal, navigate to `/vpt-bridge` and run:
     ```powershell
     .\.venv\Scripts\python -m vpt_bridge.cli --instruction "chop tree" --duration 5
     ```

### What You See In-Game (Visual Results):
- **Window Focus & Smooth Aim**: Minecraft window gains focus automatically. The crosshair smoothly rotates towards the tree trunk with fluid, human-like analog mouse movement rather than robotic instant angle snaps.
- **Visual Action Execution**: Stevan steps forward towards the trunk and presses and holds the attack key (left-click), actively chipping away at the wood block.
- **Real-Time Telemetry in Terminal**: The console displays the 20Hz loop stats in real time:
  - Screen capture latency: ~2-5 ms.
  - Neural inference latency: ~15-25 ms.
  - Injected motor inputs: `mouse: [dx, dy]`, `forward: 1`, `attack: 1`.
