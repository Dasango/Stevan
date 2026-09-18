from typing import Dict, Any, List
import pydirectinput
from .action_space import VPTAction

# Safety pause setting for pydirectinput
pydirectinput.PAUSE = 0.001


class InputInjector:
    """
    Direct input injector translating VPT actions to DirectX-compatible
    keyboard and mouse events on Windows.
    """

    KEY_MAPPINGS = {
        "forward": "w",
        "back": "s",
        "left": "a",
        "right": "d",
        "jump": "space",
        "sneak": "shift",
        "sprint": "ctrl",
        "drop": "q",
        "inventory": "e",
    }

    def __init__(self, dry_run: bool = True):
        """
        :param dry_run: If True, simulates action injection without sending actual OS events.
        """
        self.dry_run = dry_run
        self.active_keys: List[str] = []
        self.last_injected: Dict[str, Any] = {}

    def inject(self, action: VPTAction) -> Dict[str, Any]:
        """
        Injects a single tick action into the game window.
        """
        injected_record = {
            "mouse": action.mouse,
            "keys_down": [],
            "keys_up": [],
            "mouse_down": [],
            "mouse_up": [],
            "dry_run": self.dry_run,
        }

        # 1. Mouse movement (pitch = dy, yaw = dx)
        dy = int(action.mouse[0])
        dx = int(action.mouse[1])
        if (dx != 0 or dy != 0) and not self.dry_run:
            try:
                pydirectinput.moveRel(dx, dy, relative=True)
            except Exception as e:
                injected_record["mouse_error"] = str(e)

        # 2. Mouse attack (left click)
        if action.attack > 0:
            injected_record["mouse_down"].append("left")
            if not self.dry_run:
                pydirectinput.mouseDown(button="left")
        else:
            injected_record["mouse_up"].append("left")
            if not self.dry_run:
                pydirectinput.mouseUp(button="left")

        # 3. Mouse use (right click)
        if action.use > 0:
            injected_record["mouse_down"].append("right")
            if not self.dry_run:
                pydirectinput.mouseDown(button="right")
        else:
            injected_record["mouse_up"].append("right")
            if not self.dry_run:
                pydirectinput.mouseUp(button="right")

        # 4. Keyboard keys
        for action_name, os_key in self.KEY_MAPPINGS.items():
            is_active = getattr(action, action_name, 0) > 0
            if is_active:
                injected_record["keys_down"].append(os_key)
                if not self.dry_run:
                    pydirectinput.keyDown(os_key)
            else:
                injected_record["keys_up"].append(os_key)
                if not self.dry_run:
                    pydirectinput.keyUp(os_key)

        self.last_injected = injected_record
        return injected_record

    def release_all(self):
        """Emergency release of all keyboard keys and mouse buttons."""
        if not self.dry_run:
            for os_key in self.KEY_MAPPINGS.values():
                try:
                    pydirectinput.keyUp(os_key)
                except Exception:
                    pass
            try:
                pydirectinput.mouseUp(button="left")
                pydirectinput.mouseUp(button="right")
            except Exception:
                pass
