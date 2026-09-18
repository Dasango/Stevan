import math
from typing import Optional, Dict, Any, Tuple
import numpy as np
import gymnasium as gym
from gymnasium import spaces


class MinecraftCombatSimEnv(gym.Env):
    """
    Headless simulated Minecraft combat arena for hostile mob fine-tuning.
    Complies with gymnasium.Env standard and fixed specs in specs/reward_spec.md.
    """

    metadata = {"render_modes": ["human", "rgb_array"], "render_fps": 20}

    def __init__(self, max_steps: int = 100):
        super().__init__()
        self.max_steps = max_steps

        # Action: [turn (0:left, 1:none, 2:right), move (0:back, 1:none, 2:forward), attack (0:no, 1:yes), jump (0:no, 1:yes)]
        self.action_space = spaces.MultiDiscrete([3, 3, 2, 2])

        # State representation: [rel_x, rel_z, distance, angle_to_mob, bot_hp/20, mob_hp/20, bot_yaw, in_range]
        self.observation_space = spaces.Box(
            low=np.array([-50.0, -50.0, 0.0, -math.pi, 0.0, 0.0, -math.pi, 0.0], dtype=np.float32),
            high=np.array([50.0, 50.0, 50.0, math.pi, 1.0, 1.0, math.pi, 1.0], dtype=np.float32),
            dtype=np.float32,
        )

        # Simulation state
        self.bot_pos = np.zeros(2, dtype=np.float32)  # [x, z]
        self.bot_yaw = 0.0  # radians
        self.bot_hp = 20.0
        self.mob_pos = np.zeros(2, dtype=np.float32)
        self.mob_hp = 20.0
        self.steps = 0
        self.mob_attack_cooldown = 0
        self.last_distance = 0.0

    def _get_obs(self) -> np.ndarray:
        rel = self.mob_pos - self.bot_pos
        dist = float(np.linalg.norm(rel))

        # Absolute angle to mob
        angle_to_mob = math.atan2(rel[0], rel[1])
        # Relative angle between bot heading and mob
        relative_angle = (angle_to_mob - self.bot_yaw + math.pi) % (2 * math.pi) - math.pi

        in_range = 1.0 if dist <= 3.5 and abs(relative_angle) < (25.0 * math.pi / 180.0) else 0.0

        obs = np.array(
            [
                rel[0],
                rel[1],
                dist,
                relative_angle,
                self.bot_hp / 20.0,
                self.mob_hp / 20.0,
                self.bot_yaw,
                in_range,
            ],
            dtype=np.float32,
        )
        return obs

    def reset(
        self, *, seed: Optional[int] = None, options: Optional[Dict[str, Any]] = None
    ) -> Tuple[np.ndarray, Dict[str, Any]]:
        super().reset(seed=seed)
        self.steps = 0
        self.bot_hp = 20.0
        self.mob_hp = 20.0
        self.bot_pos = np.zeros(2, dtype=np.float32)
        self.bot_yaw = 0.0
        self.mob_attack_cooldown = 0

        # Spawn mob at distance between 6 and 10 blocks at random angle
        init_distance = float(self.np_random.uniform(6.0, 10.0))
        init_angle = float(self.np_random.uniform(-math.pi, math.pi))
        self.mob_pos = np.array(
            [init_distance * math.sin(init_angle), init_distance * math.cos(init_angle)],
            dtype=np.float32,
        )
        self.last_distance = init_distance

        return self._get_obs(), {"distance": init_distance}

    def step(self, action: np.ndarray) -> Tuple[np.ndarray, float, bool, bool, Dict[str, Any]]:
        self.steps += 1
        turn, move, attack, jump = action[0], action[1], action[2], action[3]

        # 1. Update bot rotation
        turn_rate = 15.0 * math.pi / 180.0  # 15 degrees per tick
        if turn == 0:
            self.bot_yaw = (self.bot_yaw - turn_rate + math.pi) % (2 * math.pi) - math.pi
        elif turn == 2:
            self.bot_yaw = (self.bot_yaw + turn_rate + math.pi) % (2 * math.pi) - math.pi

        # 2. Update bot position (forward/back)
        move_speed = 0.21  # normal Minecraft walk speed per tick
        if move == 2:  # forward
            self.bot_pos[0] += move_speed * math.sin(self.bot_yaw)
            self.bot_pos[1] += move_speed * math.cos(self.bot_yaw)
        elif move == 0:  # back
            self.bot_pos[0] -= move_speed * math.sin(self.bot_yaw)
            self.bot_pos[1] -= move_speed * math.cos(self.bot_yaw)

        # 3. Mob AI: moves toward bot
        rel = self.bot_pos - self.mob_pos
        current_distance = float(np.linalg.norm(rel))
        if current_distance > 0.1:
            mob_speed = 0.12  # zombie speed
            mob_dir = rel / current_distance
            self.mob_pos += mob_dir * mob_speed

        new_distance = float(np.linalg.norm(self.mob_pos - self.bot_pos))

        # 4. Calculate relative angle for aim
        angle_to_mob = math.atan2(self.mob_pos[0] - self.bot_pos[0], self.mob_pos[1] - self.bot_pos[1])
        rel_angle = (angle_to_mob - self.bot_yaw + math.pi) % (2 * math.pi) - math.pi

        # 5. Combat hit resolution
        hit_landed = False
        damage_taken = 0.0

        if attack == 1 and new_distance <= 3.5 and abs(rel_angle) <= (25.0 * math.pi / 180.0):
            # Bot hits mob with sword
            self.mob_hp = max(0.0, self.mob_hp - 4.0)
            hit_landed = True

        # Mob counter-attack
        if self.mob_attack_cooldown > 0:
            self.mob_attack_cooldown -= 1
        elif new_distance <= 1.8 and self.mob_hp > 0:
            # Mob hits bot
            self.bot_hp = max(0.0, self.bot_hp - 2.0)
            damage_taken = 2.0
            self.mob_attack_cooldown = 10  # 0.5s cooldown

        # 6. Calculate Fixed Predefined Reward
        reward = 0.0

        # R_distance: positive for closing distance
        distance_closure = max(0.0, self.last_distance - new_distance)
        reward += 0.1 * distance_closure
        self.last_distance = new_distance

        # R_aim: rewarded for centering mob in crosshair (< 15 degrees)
        if abs(rel_angle) < (15.0 * math.pi / 180.0):
            reward += 0.2

        # R_hit: successful strike
        if hit_landed:
            reward += 2.5

        # R_kill: terminal elimination bonus
        if self.mob_hp <= 0:
            reward += 25.0

        # R_damage: penalty for receiving hits
        if damage_taken > 0:
            reward -= 1.5

        # R_step: time efficiency penalty
        reward -= 0.05

        # 7. Check termination
        terminated = self.mob_hp <= 0 or self.bot_hp <= 0
        truncated = self.steps >= self.max_steps

        info = {
            "is_win": self.mob_hp <= 0 and self.bot_hp > 0,
            "steps": self.steps,
            "mob_hp": self.mob_hp,
            "bot_hp": self.bot_hp,
            "hit_landed": hit_landed,
            "damage_taken": damage_taken,
        }

        return self._get_obs(), reward, terminated, truncated, info
