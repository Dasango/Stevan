import time
from typing import Optional, Dict, Any, List
import numpy as np

from .config import VPTConfig, load_vpt_config
from .capture import ScreenCapturer
from .preprocess import FramePreprocessor
from .policy import VPTAgentPolicy
from .injector import InputInjector
from .action_space import VPTAction


class VPTPipeline:
    """
    End-to-end continuous loop pipeline:
    Screen Capture -> Frame Preprocessing (128x128) -> VPT/STEVE-1 Policy -> Input Injection.
    """

    def __init__(
        self,
        config: Optional[VPTConfig] = None,
        dry_run: bool = True,
        mock_capturer: Optional[ScreenCapturer] = None,
    ):
        self.config = config or load_vpt_config()
        self.capturer = mock_capturer or ScreenCapturer()
        self.preprocessor = FramePreprocessor(
            target_size=(self.config.input_width, self.config.input_height),
            device=self.config.device,
        )
        self.policy = VPTAgentPolicy(
            weights_path=self.config.vpt_weights_path or self.config.steve1_weights_path,
            device=self.config.device,
        )
        self.injector = InputInjector(dry_run=dry_run)

    def step(
        self, instruction: str = "chop tree", mock_frame: Optional[np.ndarray] = None
    ) -> Dict[str, Any]:
        """
        Executes a single pipeline iteration with stage-by-stage latency profiling.
        """
        t0 = time.perf_counter()

        # 1. Capture
        t_cap_start = time.perf_counter()
        raw_frame = self.capturer.capture_frame(mock_frame=mock_frame)
        t_cap_end = time.perf_counter()

        # 2. Preprocess
        t_prep_start = time.perf_counter()
        visual_tensor = self.preprocessor.preprocess(raw_frame)
        t_prep_end = time.perf_counter()

        # 3. Policy inference
        t_inf_start = time.perf_counter()
        action = self.policy.predict(visual_tensor, instruction=instruction)
        t_inf_end = time.perf_counter()

        # 4. Action injection
        t_inj_start = time.perf_counter()
        injection_result = self.injector.inject(action)
        t_inj_end = time.perf_counter()

        t_total_end = time.perf_counter()

        cap_ms = (t_cap_end - t_cap_start) * 1000.0
        prep_ms = (t_prep_end - t_prep_start) * 1000.0
        inf_ms = (t_inf_end - t_inf_start) * 1000.0
        inj_ms = (t_inj_end - t_inj_start) * 1000.0
        total_ms = (t_total_end - t0) * 1000.0
        effective_fps = 1000.0 / total_ms if total_ms > 0 else 0.0

        return {
            "instruction": instruction,
            "action": action.to_dict(),
            "injection": injection_result,
            "latency": {
                "capture_ms": round(cap_ms, 2),
                "preprocess_ms": round(prep_ms, 2),
                "inference_ms": round(inf_ms, 2),
                "injection_ms": round(inj_ms, 2),
                "total_ms": round(total_ms, 2),
            },
            "effective_fps": round(effective_fps, 1),
        }

    def run_benchmark(
        self, instruction: str = "chop tree", num_frames: int = 30, mock_frame: Optional[np.ndarray] = None
    ) -> Dict[str, Any]:
        """
        Runs a consecutive series of frames to establish a hardware performance baseline.
        """
        records: List[Dict[str, Any]] = []
        for _ in range(num_frames):
            records.append(self.step(instruction=instruction, mock_frame=mock_frame))

        total_latencies = [r["latency"]["total_ms"] for r in records]
        inf_latencies = [r["latency"]["inference_ms"] for r in records]
        fps_values = [r["effective_fps"] for r in records]

        summary = {
            "num_frames": num_frames,
            "instruction": instruction,
            "avg_latency_ms": round(float(np.mean(total_latencies)), 2),
            "p95_latency_ms": round(float(np.percentile(total_latencies, 95)), 2),
            "avg_inference_ms": round(float(np.mean(inf_latencies)), 2),
            "avg_fps": round(float(np.mean(fps_values)), 1),
            "device": self.config.device,
        }
        return summary

    def close(self):
        """Releases capture resources and resets injection states."""
        self.injector.release_all()
        self.capturer.close()
