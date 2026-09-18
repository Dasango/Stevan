from typing import Optional, Dict, Any, List
import numpy as np
import gymnasium as gym


def evaluate_policy(
    model_or_policy,
    env: gym.Env,
    num_episodes: int = 30,
    seed_start: int = 5001,
) -> Dict[str, Any]:
    """
    Evaluates policy performance on holdout scenarios not seen during training.
    """
    returns = []
    wins = []
    steps_list = []
    damage_taken_list = []

    for episode_idx in range(num_episodes):
        seed = seed_start + episode_idx
        obs, _ = env.reset(seed=seed)
        done = False
        truncated = False
        episode_reward = 0.0
        episode_damage = 0.0

        while not (done or truncated):
            if hasattr(model_or_policy, "predict"):
                # SB3 model
                action, _ = model_or_policy.predict(obs, deterministic=True)
            elif callable(model_or_policy):
                action = model_or_policy(obs)
            else:
                # Untrained random baseline
                action = env.action_space.sample()

            obs, reward, done, truncated, info = env.step(action)
            episode_reward += reward
            episode_damage += info.get("damage_taken", 0.0)

        returns.append(episode_reward)
        is_win = info.get("is_win", False)
        wins.append(1 if is_win else 0)
        damage_taken_list.append(episode_damage)
        if is_win:
            steps_list.append(info.get("steps", env.max_steps))

    win_rate = float(np.mean(wins))
    avg_steps = float(np.mean(steps_list)) if steps_list else float(env.max_steps)
    avg_damage = float(np.mean(damage_taken_list))
    avg_return = float(np.mean(returns))

    return {
        "num_episodes": num_episodes,
        "seed_range": f"{seed_start}-{seed_start + num_episodes - 1}",
        "win_rate": round(win_rate * 100.0, 1),
        "avg_time_to_kill_steps": round(avg_steps, 1),
        "avg_damage_taken": round(avg_damage, 2),
        "avg_episode_return": round(avg_return, 2),
    }
