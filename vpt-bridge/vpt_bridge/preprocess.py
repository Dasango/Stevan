from typing import Tuple, Optional
import cv2
import numpy as np
import torch


class FramePreprocessor:
    """
    Standard image preprocessor matching OpenAI VPT / STEVE-1 run_agent.py specifications.
    Resizes visual gameplay frames to 128x128 RGB and scales to normalized float32 tensors.
    """

    def __init__(self, target_size: Tuple[int, int] = (128, 128), device: str = "cpu"):
        """
        :param target_size: Target (width, height) tuple, default (128, 128).
        :param device: Target PyTorch device ("cpu" or "cuda").
        """
        self.target_size = target_size
        self.device = torch.device(device)

    def preprocess(self, rgb_frame: np.ndarray) -> torch.Tensor:
        """
        Processes a raw RGB frame into a model-ready PyTorch tensor.
        :param rgb_frame: NumPy uint8 array of shape [H, W, 3].
        :return: PyTorch float32 tensor of shape [1, 3, target_height, target_width] on designated device.
        """
        if not isinstance(rgb_frame, np.ndarray):
            raise TypeError(f"Expected np.ndarray, got {type(rgb_frame)}")

        if rgb_frame.ndim != 3 or rgb_frame.shape[2] != 3:
            raise ValueError(f"Expected RGB image of shape [H, W, 3], got {rgb_frame.shape}")

        # Resize to 128x128 (OpenCV uses (width, height))
        resized = cv2.resize(
            rgb_frame,
            self.target_size,
            interpolation=cv2.INTER_AREA if rgb_frame.shape[0] > self.target_size[1] else cv2.INTER_LINEAR,
        )

        # Transpose from [H, W, C] to [C, H, W]
        transposed = np.transpose(resized, (2, 0, 1))

        # Convert to float32 normalized in [0.0, 1.0]
        tensor = torch.from_numpy(transposed).float() / 255.0

        # Add batch dimension [1, C, H, W]
        batched = tensor.unsqueeze(0).to(self.device)
        return batched
