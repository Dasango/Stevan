from typing import Optional, Dict, Any
import numpy as np
import mss


class ScreenCapturer:
    """High-performance screen grabber for live Minecraft window or monitor."""

    def __init__(self, monitor_region: Optional[Dict[str, int]] = None):
        """
        :param monitor_region: Optional dict with keys {'top', 'left', 'width', 'height'}.
                               If None, captures the primary monitor.
        """
        self.sct = mss.MSS() if hasattr(mss, 'MSS') else mss.mss()
        if monitor_region:
            self.monitor = monitor_region
        else:
            # Default to primary monitor (monitor 1 in mss)
            self.monitor = self.sct.monitors[1] if len(self.sct.monitors) > 1 else self.sct.monitors[0]

    def capture_frame(self, mock_frame: Optional[np.ndarray] = None) -> np.ndarray:
        """
        Captures a single frame as an RGB NumPy array of shape [H, W, 3].
        :param mock_frame: Injected frame for testing/headless execution.
        :return: np.ndarray (RGB, uint8)
        """
        if mock_frame is not None:
            return mock_frame

        try:
            sct_img = self.sct.grab(self.monitor)
            bgra = np.array(sct_img, dtype=np.uint8)
            rgb = bgra[:, :, [2, 1, 0]]
            return rgb
        except Exception:
            # Fallback for headless environments, locked desktops, or non-display sessions
            w = int(self.monitor.get("width", 640))
            h = int(self.monitor.get("height", 360))
            return np.zeros((h, w, 3), dtype=np.uint8)

    def close(self):
        """Releases the mss capture context."""
        if hasattr(self, "sct") and self.sct:
            self.sct.close()
