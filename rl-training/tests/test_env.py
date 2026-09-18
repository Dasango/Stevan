import pytest
import numpy as np
from rl_training.envs.combat_env import MinecraftCombatSimEnv


def test_combat_env_reset():
    env = MinecraftCombatSimEnv()
    obs, info = env.reset(seed=42)

    assert isinstance(obs, np.ndarray)
    assert obs.shape == (8,)
    assert obs.dtype == np.float32
    assert "distance" in info
    assert 6.0 <= info["distance"] <= 10.0


def test_combat_env_step_forward():
    env = MinecraftCombatSimEnv()
    obs, info = env.reset(seed=100)
    init_dist = info["distance"]

    # Action: turn=none (1), move=forward (2), attack=0, jump=0
    action = np.array([1, 2, 0, 0], dtype=int)
    next_obs, reward, terminated, truncated, step_info = env.step(action)

    assert next_obs.shape == (8,)
    assert isinstance(reward, float)
    assert not terminated
    assert step_info["steps"] == 1


def test_combat_env_attack_and_damage():
    env = MinecraftCombatSimEnv()
    env.reset(seed=123)

    # Force mob close to bot and aligned in front
    env.bot_pos = np.array([0.0, 0.0], dtype=np.float32)
    env.bot_yaw = 0.0
    env.mob_pos = np.array([0.0, 2.0], dtype=np.float32)  # 2 blocks in front
    env.last_distance = 2.0

    # Attack: turn=none (1), move=none (1), attack=1, jump=0
    action = np.array([1, 1, 1, 0], dtype=int)
    next_obs, reward, terminated, truncated, step_info = env.step(action)

    assert step_info["hit_landed"] is True
    assert step_info["mob_hp"] == 16.0  # 20 - 4
    # Reward includes R_hit (2.5) + R_aim (0.2) - R_step (0.05)
    assert reward >= 2.5


def test_combat_env_termination():
    env = MinecraftCombatSimEnv()
    env.reset()

    # Set mob to 2 HP
    env.mob_hp = 2.0
    env.bot_pos = np.array([0.0, 0.0], dtype=np.float32)
    env.mob_pos = np.array([0.0, 1.5], dtype=np.float32)
    env.last_distance = 1.5

    action = np.array([1, 1, 1, 0], dtype=int)
    next_obs, reward, terminated, truncated, step_info = env.step(action)

    assert terminated is True
    assert step_info["is_win"] is True
    assert step_info["mob_hp"] <= 0.0
    # Terminal kill reward +25
    assert reward >= 25.0
