"""CLI and JSON-RPC subprocess runner for VPT Bridge.

Allows orchestrator to invoke low-level VPT skills via child process or stdio.
"""

import argparse
import json
import sys
import time
from .pipeline import VPTPipeline
from .config import load_vpt_config


def run_vpt_skill(instruction: str, max_ticks: int = 40, dry_run: bool = True):
    config = load_vpt_config()
    pipeline = VPTPipeline(config=config, dry_run=dry_run)

    start_time = time.perf_counter()
    tick_records = []

    try:
        for tick in range(max_ticks):
            step_result = pipeline.step(instruction=instruction)
            tick_records.append(step_result)

        elapsed = time.perf_counter() - start_time
        fps_values = [r["effective_fps"] for r in tick_records]

        result = {
            "status": "SUCCESS",
            "instruction": instruction,
            "ticksExecuted": max_ticks,
            "durationSeconds": round(elapsed, 3),
            "avgFps": round(float(sum(fps_values) / len(fps_values)), 1) if fps_values else 0.0,
            "terminationReason": "MAX_TICKS_REACHED",
        }
    except Exception as e:
        elapsed = time.perf_counter() - start_time
        result = {
            "status": "FAILURE",
            "instruction": instruction,
            "error": str(e),
            "ticksExecuted": len(tick_records),
            "durationSeconds": round(elapsed, 3),
            "terminationReason": "EXCEPTION",
        }
    finally:
        pipeline.close()

    # Output machine-readable JSON result
    print(json.dumps(result))
    return result


def main():
    parser = argparse.ArgumentParser(description="VPT Skill Runner")
    parser.add_argument("--instruction", type=str, default="chop tree", help="Task prompt")
    parser.add_argument("--max-ticks", type=int, default=30, help="Number of ticks to run")
    parser.add_argument("--dry-run", action="store_true", default=True, help="Simulate input injection")
    args = parser.parse_args()

    run_vpt_skill(
        instruction=args.instruction,
        max_ticks=args.max_ticks,
        dry_run=args.dry_run,
    )


if __name__ == "__main__":
    main()
