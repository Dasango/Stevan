# /rl-training — Agent Guidelines

## 1. Scope & Responsibility
The `/rl-training` module manages:
- Offline and simulated reinforcement learning (RL) fine-tuning of VPT / STEVE-1 policies for targeted subtasks (e.g., hostile mob combat).
- Parallel headless simulation environments (MineRL / MineDojo / simulated Gym environment).
- Fixed reward specification and pre-defined acceptance thresholds (defined prior to training).
- Baseline benchmarking of the zero-shot base model before training.
- Checkpointing and evaluation against separate **holdout** seeds/scenarios to guard against overfitting.

## 2. Approved Stack & Prohibited Code
- **Runtime**: Python 3.10+ (managed via `.venv`).
- **Approved Packages**:
  - `stable-baselines3`: Standard PPO/SAC implementations.
  - `gymnasium` / `gym`: Environment standard.
  - `minerl` or `minedojo`: Simulated Minecraft environment interface.
  - `torch`, `torchvision`: Neural training and policy optimization.
  - `tensorboard`: Training curves and loss monitoring.
- **Prohibited**:
  - DO NOT train on a live Minecraft production server. Training must run in simulated/headless instances.
  - DO NOT hand-code PPO or RL optimization algorithms from scratch; use `stable-baselines3` or OpenAI's VPT fine-tuning scripts.
  - DO NOT modify the reward function or success metrics post-hoc after observing training curves.
  - DO NOT evaluate solely on the training environment seeds.

## 3. Configuration & Metrics Protocol
- **Reward Function Document**: Every training run must have its reward function explicitly documented in `/rl-training/specs/` before initiating training.
- **Success Criteria**: Define target metric thresholds before run start:
  - Example: "Reduce average time-to-kill from $T_{\text{baseline}}$ seconds to $< T_{\text{target}}$ seconds across 50 holdout episodes with $> 90\%$ survival rate."
- **Checkpoints**: Saved every $K$ steps to `checkpoints/`.
- **Logs**: TensorBoard logs stored in `runs/`.

## 4. Interface Contract
- **Inputs**:
  - Pretrained foundation policy weights (`.weights` or `.pt`).
  - Environment task configuration (mob type, spawn distance, inventory, arena geometry).
- **Outputs**:
  - Fine-tuned policy weights checkpoint (`fine_tuned_best.pt`).
  - Benchmark report comparing baseline vs fine-tuned performance on holdout test scenarios.

## 5. Testing & Verification
- Unit tests verify environment step/reset functions, reward calculation determinism, and tensor shape compatibility without launching long training runs.
- Run a 10-step dummy training run during CI to verify pipeline stability.
- Test command:
  ```bash
  pytest -v
  ```
