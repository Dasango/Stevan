# RL Task Specification: Hostile Mob Combat Fine-Tuning

## 1. Task Objective
Fine-tune a baseline policy using Proximal Policy Optimization (PPO) in a headless simulated Minecraft arena to efficiently engage and eliminate a hostile mob (Zombie, 20 HP) while minimizing damage taken and reducing time-to-kill.

---

## 2. Fixed Pre-defined Reward Function

The reward function $R_t$ at each simulation time step $t$ is defined as follows and must **not** be modified post-hoc:

$$R_t = R_{\text{distance}} + R_{\text{aim}} + R_{\text{hit}} + R_{\text{kill}} + R_{\text{damage}} + R_{\text{step}}$$

### Component Definitions
1. **Distance Closure Reward**:
   $$R_{\text{distance}} = 0.1 \times \max(0, d_{t-1} - d_t)$$
   Incentivizes the agent to close distance toward the target mob.
2. **Aim Alignment Reward**:
   $$R_{\text{aim}} = 0.2 \quad \text{if } |\theta_{\text{gaze}} - \theta_{\text{mob}}| < 15^\circ \text{ else } 0.0$$
   Encourages centering the mob within the combat crosshair.
3. **Successful Strike Reward**:
   $$R_{\text{hit}} = +2.5 \quad \text{when } \text{attack} = 1 \land d_t \le 3.5 \land |\Delta \theta| < 20^\circ$$
   Awarded when an attack connects with the mob hitbox.
4. **Terminal Elimination (Kill) Reward**:
   $$R_{\text{kill}} = +25.0 \quad \text{when } \text{mob\_hp} \le 0$$
   Terminal bonus awarded upon destroying the hostile mob.
5. **Bot Damage Penalty**:
   $$R_{\text{damage}} = -1.5 \quad \text{per mob strike received}$$
   Penalizes allowing the mob to land hits on the bot.
6. **Time Step Penalty**:
   $$R_{\text{step}} = -0.05 \quad \text{per step}$$
   Enforces temporal efficiency and incentivizes fast completion.

---

## 3. Pre-defined Numerical Success Thresholds

Metrics are evaluated over 50 **holdout scenarios** (seeds `5001-5050`) not seen during training (`1-5000`):

| Metric | Baseline Target ($T_{\text{baseline}}$) | Fine-Tuned Acceptance Threshold ($T_{\text{target}}$) |
| :--- | :--- | :--- |
| **Win Rate** (Mob Killed & Bot Survives) | $\le 50\%$ | $\ge 85\%$ |
| **Average Time-to-Kill** (Steps) | $\ge 70$ steps | $\le 35$ steps |
| **Damage Received per Encounter** | $\ge 6.0$ HP (3 hearts) | $\le 2.5$ HP (1.25 hearts) |
| **Generalization Gap** (Train vs Holdout) | N/A | Difference in win rate $< 10\%$ (No overfitting) |
