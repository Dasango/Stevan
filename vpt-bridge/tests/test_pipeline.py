import numpy as np
from vpt_bridge.pipeline import VPTPipeline
from vpt_bridge.config import VPTConfig


def test_pipeline_step_and_latency():
    config = VPTConfig(device="cpu", input_width=128, input_height=128)
    pipeline = VPTPipeline(config=config, dry_run=True)

    synthetic_frame = np.random.randint(0, 256, (720, 1280, 3), dtype=np.uint8)

    result = pipeline.step(instruction="chop tree", mock_frame=synthetic_frame)

    assert result["instruction"] == "chop tree"
    assert "action" in result
    assert "latency" in result
    lat = result["latency"]

    # Verify each sub-stage recorded latency
    assert lat["capture_ms"] >= 0.0
    assert lat["preprocess_ms"] > 0.0
    assert lat["inference_ms"] > 0.0
    assert lat["injection_ms"] >= 0.0
    assert lat["total_ms"] > 0.0
    assert result["effective_fps"] > 0.0

    pipeline.close()


def test_pipeline_benchmark():
    config = VPTConfig(device="cpu", input_width=128, input_height=128)
    pipeline = VPTPipeline(config=config, dry_run=True)

    synthetic_frame = np.random.randint(0, 256, (360, 640, 3), dtype=np.uint8)

    benchmark = pipeline.run_benchmark(
        instruction="get sand", num_frames=15, mock_frame=synthetic_frame
    )

    assert benchmark["num_frames"] == 15
    assert benchmark["avg_latency_ms"] > 0.0
    assert benchmark["avg_fps"] > 0.0
    assert benchmark["instruction"] == "get sand"

    pipeline.close()
