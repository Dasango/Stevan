"""Hardware Baseline & Reference Instruction Benchmark for VPT Bridge.

Executes the capture -> preprocess -> inference -> action injection pipeline
across canonical STEVE-1 reference instructions and reports latency / FPS baselines.
"""

import sys
import numpy as np
from vpt_bridge.pipeline import VPTPipeline
from vpt_bridge.config import load_vpt_config

REFERENCE_INSTRUCTIONS = [
    "chop tree",
    "get sand",
    "kill mob",
    "mine dirt",
    "gather wood",
]


def run_hardware_benchmark(num_frames_per_task: int = 20):
    print("================================================================")
    print(" Stevan VPT Bridge — Hardware Latency & Throughput Benchmark")
    print("================================================================")

    config = load_vpt_config()
    print(f"Device:           {config.device}")
    print(f"Input Resolution: {config.input_width}x{config.input_height}")
    print(f"Target FPS:       {config.target_fps} ticks/sec")
    print("================================================================\n")

    pipeline = VPTPipeline(config=config, dry_run=True)
    # Generate 1920x1080 synthetic screen capture fixture
    mock_screen = np.random.randint(0, 256, (1080, 1920, 3), dtype=np.uint8)

    print(f"{'Instruction':<15} | {'Avg Total (ms)':<15} | {'Avg Inference (ms)':<20} | {'Effective FPS':<15}")
    print("-" * 72)

    all_latencies = []
    all_fps = []

    for task in REFERENCE_INSTRUCTIONS:
        summary = pipeline.run_benchmark(
            instruction=task, num_frames=num_frames_per_task, mock_frame=mock_screen
        )
        avg_tot = summary["avg_latency_ms"]
        avg_inf = summary["avg_inference_ms"]
        fps = summary["avg_fps"]
        all_latencies.append(avg_tot)
        all_fps.append(fps)

        print(f"{task:<15} | {avg_tot:<15.2f} | {avg_inf:<20.2f} | {fps:<15.1f}")

    pipeline.close()

    overall_avg_lat = np.mean(all_latencies)
    overall_avg_fps = np.mean(all_fps)

    print("-" * 72)
    print(f"OVERALL BASELINE: Avg Latency = {overall_avg_lat:.2f} ms | Avg FPS = {overall_avg_fps:.1f} FPS")
    print(f"Target (20 Hz = 50 ms budget): {'MEETS BUDGET' if overall_avg_lat <= 50.0 else 'EXCEEDS 50ms'}")
    print("================================================================")
    return {
        "overall_avg_latency_ms": round(float(overall_avg_lat), 2),
        "overall_avg_fps": round(float(overall_avg_fps), 1),
    }


if __name__ == "__main__":
    run_hardware_benchmark()
