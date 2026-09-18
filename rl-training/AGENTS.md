# /rl-training — Agent Guidelines

## 1. Scope & Overall Purpose
The `/rl-training` module is the specialized neural skill laboratory. It accomplishes:
- Fine-tuning pretrained OpenAI VPT and STEVE-1 neural policies inside headless, accelerated Minecraft simulation environments (Gymnasium / MineRL).
- Applying standard Proximal Policy Optimization (PPO via `stable-baselines3`) to master hard reflex skills where base foundation models struggle (e.g., hostile mob combat, dodging skeleton arrows, shield parrying).
- Defining strict, verifiable reward functions (e.g., maximizing damage dealt to enemies while penalizing damage taken by the bot).
- Benchmarking trained models on separate holdout environment seeds to ensure skills generalize to unseen terrain.
- Exporting trained policy checkpoints (`fine_tuned_best.zip`) ready for direct in-game execution.

## 2. Modularity & Connections with Other Modules
- **Modularity**: Completely isolated offline training environment. It runs accelerated simulation loops without touching the live Minecraft production server.
- **Inbound Connections**:
  - Takes foundation pretrained weights (`.pt` or `.weights`) as a starting point.
- **Outbound Connections**:
  - Directly feeds fine-tuned neural checkpoints (`fine_tuned_best.zip`) to `/vpt-bridge/weights/`, empowering `/vpt-bridge` and `/orchestrator` with expert in-game combat and survival skills.

## 3. Training Configuration & Checkpoints
Managed via `.env` in `/rl-training` (see `.env.example`):
- `TOTAL_TIMESTEPS`: Total training steps (e.g., `50000`).
- `CHECKPOINT_DIR`: Output folder for trained weights (default: `checkpoints/`).
- `TENSORBOARD_LOG_DIR`: Directory for real-time loss and reward graphs (default: `runs/`).

## 4. In-Game Minecraft Testing & Visual Verification

### How to Test in Minecraft:
1. **Deploy Trained Weights**:
   - Ensure a trained combat policy checkpoint is placed in `/vpt-bridge/weights/`.
2. **Prepare Minecraft**:
   - Open your world to LAN on port `25565` (Cheats ON).
   - Give Stevan an iron sword and shield:
     `/give StevanBot iron_sword` and `/give StevanBot shield`.
3. **Trigger Combat Scenario**:
   - Spawn a hostile mob near Stevan:
     ```minecraft
     /summon zombie ~3 ~ ~
     ```

### What You See In-Game (Visual Results):
- **Fluid Combat Reflexes**: Rather than walking in a rigid straight line or standing still like a basic scripted bot, Stevan executes fluid combat maneuvers:
  - *Strafing & Spacing*: Stevan circles around the zombie to stay out of its direct forward reach.
  - *Timed Critical Hits*: Stevan pauses between swings to let the Minecraft weapon attack cooldown recharge fully, dealing maximum damage with sweep particles.
  - *Shield Parrying*: When the zombie lunges forward, Stevan raises his shield to block incoming damage, then counters with a strike.
- **Flawless Victory**: The hostile mob is defeated within seconds, and Stevan takes zero damage or retains nearly full hearts.
