import os
from dataclasses import dataclass
from pathlib import Path
from dotenv import load_dotenv

# Load .env from module root
load_dotenv(Path(__file__).resolve().parent.parent / ".env")


@dataclass
class VPTConfig:
    window_title: str = "Minecraft"
    target_fps: int = 20
    input_width: int = 128
    input_height: int = 128
    device: str = "cpu"
    vpt_weights_path: str = ""
    steve1_weights_path: str = ""
    mineclip_weights_path: str = ""


def load_vpt_config(overrides: dict = None) -> VPTConfig:
    overrides = overrides or {}
    return VPTConfig(
        window_title=overrides.get("window_title", os.getenv("MINECRAFT_WINDOW_TITLE", "Minecraft")),
        target_fps=int(overrides.get("target_fps", os.getenv("TARGET_FPS", 20))),
        input_width=int(overrides.get("input_width", os.getenv("VPT_INPUT_WIDTH", 128))),
        input_height=int(overrides.get("input_height", os.getenv("VPT_INPUT_HEIGHT", 128))),
        device=overrides.get("device", os.getenv("DEVICE", "cpu")),
        vpt_weights_path=overrides.get("vpt_weights_path", os.getenv("VPT_WEIGHTS_PATH", "")),
        steve1_weights_path=overrides.get("steve1_weights_path", os.getenv("STEVE1_WEIGHTS_PATH", "")),
        mineclip_weights_path=overrides.get("mineclip_weights_path", os.getenv("MINECLIP_WEIGHTS_PATH", "")),
    )
