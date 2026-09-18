import os
import shutil
import pytest
from stable_baselines3 import PPO
from rl_training.envs.combat_env import MinecraftCombatSimEnv
from rl_training.evaluate import evaluate_policy


def test_baseline_and_ppo_training(tmp_path):
    env = MinecraftCombatSimEnv()

    # 1. Baseline evaluation on 5 holdout seeds
    baseline = evaluate_policy(None, env, num_episodes=5, seed_start=5001)
    assert "win_rate" in baseline
    assert "avg_time_to_kill_steps" in baseline
    assert baseline["num_episodes"] == 5

    # 2. Fast PPO training run (1024 steps)
    checkpoint_dir = str(tmp_path / "checkpoints")
    os.makedirs(checkpoint_dir, exist_ok=True)

    model = PPO(
        "MlpPolicy",
        env,
        learning_rate=1e-3,
        n_steps=256,
        batch_size=64,
        n_epochs=3,
        verbose=0,
    )
    model.learn(total_timesteps=1024)

    # 3. Checkpoint save & load
    model_path = os.path.join(checkpoint_dir, "test_model.zip")
    model.save(model_path)
    assert os.path.exists(model_path)

    loaded_model = PPO.load(model_path, env=env)
    assert loaded_model is not None

    # 4. Holdout evaluation with loaded model
    eval_metrics = evaluate_policy(loaded_model, env, num_episodes=5, seed_start=5001)
    assert "win_rate" in eval_metrics
    assert eval_metrics["num_episodes"] == 5

    env.close()
