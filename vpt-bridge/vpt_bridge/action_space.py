from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any
import numpy as np


@dataclass
class VPTAction:
    """Represents an atomic 20Hz discrete/continuous motor action."""

    mouse: List[float] = field(default_factory=lambda: [0.0, 0.0])  # [pitch, yaw] deltas
    attack: int = 0
    use: int = 0
    forward: int = 0
    back: int = 0
    left: int = 0
    right: int = 0
    jump: int = 0
    sneak: int = 0
    sprint: int = 0
    drop: int = 0
    inventory: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class ActionSpace:
    """Helper for converting between neural network output tensors/distributions and VPTAction."""

    BUTTON_KEYS = [
        "attack",
        "use",
        "forward",
        "back",
        "left",
        "right",
        "jump",
        "sneak",
        "sprint",
        "drop",
        "inventory",
    ]

    @staticmethod
    def clamp_mouse(pitch: float, yaw: float, max_delta: float = 30.0) -> List[float]:
        """Clamps camera rotation within human physical limits per tick."""
        return [
            float(np.clip(pitch, -max_delta, max_delta)),
            float(np.clip(yaw, -max_delta, max_delta)),
        ]

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> VPTAction:
        """Validates and instantiates a VPTAction from a dictionary."""
        mouse = data.get("mouse", [0.0, 0.0])
        clamped_mouse = cls.clamp_mouse(mouse[0], mouse[1])

        action_kwargs = {"mouse": clamped_mouse}
        for key in cls.BUTTON_KEYS:
            val = data.get(key, 0)
            action_kwargs[key] = 1 if int(val) > 0 else 0

        return VPTAction(**action_kwargs)

    @classmethod
    def create_idle(cls) -> VPTAction:
        """Returns a zero/noop action."""
        return VPTAction()
