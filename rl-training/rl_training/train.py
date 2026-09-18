"""Headless PPO Reinforcement Learning Fine-Tuning Pipeline for Minecraft Combat.

Trains an agent on simulated mob combat, compares against pre-training baseline,
and evaluates holdout generalization against predefined thresholds.
"""

import os
from pathlib import Path
import numpy as np
from stable_baselines3 import PPO
from stable_baselines3.common.callbacks import CheckpointCallback

from rl_training.envs.combat_env import MinecraftCombatSimEnv
from rl_training.evaluate import evaluate_policy


def run_training_pipeline(
    total_timesteps: int = 25000,
    checkpoint_dir: str = "checkpoints",
    tensorboard_dir: str = "runs",
    holdout_episodes: int = 30,
):
    print("================================================================")
    print(" Stevan RL Training — Headless PPO Fine-Tuning Pipeline")
    print("================================================================")
    print(f"Algorithm:           PPO (Stable-Baselines3)")
    print(f"Total Timesteps:     {total_timesteps}")
    print(f"Environment:         MinecraftCombatSimEnv (Headless)")
    print(f"Reward Spec:         specs/reward_spec.md (Fixed)")
    print(f"Holdout Seeds:       5001 - {5001 + holdout_episodes - 1}")
    print("================================================================\n")

    Path(checkpoint_dir).mkdir(parents=True, exist_ok=True)
    Path(tensorboard_dir).mkdir(parents=True, exist_ok=True)

    # 1. Environment creation
    env = MinecraftCombatSimEnv()

    # 2. Baseline Measurement (Untrained agent)
    print("[1/4] Measuring Zero-Shot Baseline Performance on Holdout Scenarios...")
    baseline_metrics = evaluate_policy(None, env, num_episodes=holdout_episodes, seed_start=5001)
    print(f"  Baseline Win Rate:          {baseline_metrics['win_rate']}%")
    print(f"  Baseline Avg Time-to-Kill:  {baseline_metrics['avg_time_to_kill_steps']} steps")
    print(f"  Baseline Avg Damage Taken:  {baseline_metrics['avg_damage_taken']} HP")
    print(f"  Baseline Avg Return:        {baseline_metrics['avg_episode_return']}")

    # 3. PPO Agent Initialization & Training
    print(f"\n[2/4] Training PPO Policy for {total_timesteps} steps...")
    model = PPO(
        "MlpPolicy",
        env,
        learning_rate=3e-4,
        n_steps=512,
        batch_size=64,
        n_epochs=5,
        gamma=0.99,
        gae_lambda=0.95,
        ent_coef=0.01,
        verbose=0,
        tensorboard_log=tensorboard_dir,
    )

    checkpoint_callback = CheckpointCallback(
        save_freq=max(1000, total_timesteps // 3),
        save_path=checkpoint_dir,
        name_prefix="ppo_combat_checkpoint",
    )

    model.learn(total_timesteps=total_timesteps, callback=checkpoint_callback)

    final_model_path = os.path.join(checkpoint_dir, "fine_tuned_best.zip")
    model.save(final_model_path)
    print(f"  Training complete! Checkpoint saved to: {final_model_path}")

    # 4. Holdout Evaluation
    print(f"\n[3/4] Evaluating Fine-Tuned Policy on Holdout Scenarios...")
    fine_tuned_metrics = evaluate_policy(model, env, num_episodes=holdout_episodes, seed_start=5001)
    print(f"  Fine-Tuned Win Rate:         {fine_tuned_metrics['win_rate']}%")
    print(f"  Fine-Tuned Avg Time-to-Kill: {fine_tuned_metrics['avg_time_to_kill_steps']} steps")
    print(f"  Fine-Tuned Avg Damage Taken: {fine_tuned_metrics['avg_damage_taken']} HP")
    print(f"  Fine-Tuned Avg Return:       {fine_tuned_metrics['avg_episode_return']}")

    # 5. Threshold Verification
    print("\n[4/4] Comparing Against Pre-defined Acceptance Thresholds:")
    print("-" * 68)
    print(f"{'Metric':<25} | {'Baseline':<12} | {'Fine-Tuned':<12} | {'Target Threshold':<15}")
    print("-" * 68)
    print(
        f"{'Win Rate':<25} | {str(baseline_metrics['win_rate']) + '%':<12} | {str(fine_tuned_metrics['win_rate']) + '%':<12} | {'>= 85.0%':<15}"
    )
    print(
        f"{'Time-to-Kill (steps)':<25} | {str(baseline_metrics['avg_time_to_kill_steps']):<12} | {str(fine_tuned_metrics['avg_time_to_kill_steps']):<12} | {'<= 35.0 steps':<15}"
    )
    print(
        f"{'Damage Taken (HP)':<25} | {str(baseline_metrics['avg_damage_taken']):<12} | {str(fine_tuned_metrics['avg_damage_taken']):<12} | {'<= 2.5 HP':<15}"
    )
    print("-" * 68)

    env.close()

    return {
        "baseline": baseline_metrics,
        "fine_tuned": fine_tuned_metrics,
        "checkpoint": final_model_path,
    }


if __name__ == "__main__":
    run_training_pipeline()
