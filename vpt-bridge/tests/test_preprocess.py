import pytest
import numpy as np
import torch
from vpt_bridge.preprocess import FramePreprocessor


def test_frame_preprocessor_shape_and_normalization():
    preprocessor = FramePreprocessor(target_size=(128, 128), device="cpu")

    # Synthetic 1920x1080 RGB frame
    synthetic_frame = np.random.randint(0, 256, (1080, 1920, 3), dtype=np.uint8)

    tensor = preprocessor.preprocess(synthetic_frame)

    assert isinstance(tensor, torch.Tensor)
    assert tensor.shape == (1, 3, 128, 128)
    assert tensor.dtype == torch.float32
    assert tensor.min().item() >= 0.0
    assert tensor.max().item() <= 1.0


def test_frame_preprocessor_invalid_inputs():
    preprocessor = FramePreprocessor()

    with pytest.raises(TypeError):
        preprocessor.preprocess("not-an-array")

    # Invalid channel count (grayscale 2D)
    with pytest.raises(ValueError):
        preprocessor.preprocess(np.zeros((100, 100), dtype=np.uint8))
