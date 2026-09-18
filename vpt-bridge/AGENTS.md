# /vpt-bridge — Agent Guidelines

## 1. Scope & Responsibility
The `/vpt-bridge` module executes:
- Screen capture of the live Minecraft window (on Windows OS using high-performance capture).
- Frame preprocessing following the exact STEVE-1 / OpenAI VPT pipeline (`run_agent.py` specification: resolution resizing, color space conversion, normalization, and frame buffer history).
- Neural policy inference with STEVE-1 (MineCLIP text-prompt conditioned) or base VPT models.
- Translation of policy logits into continuous/discrete motor inputs (mouse dx/dy, keyboard presses).
- Input injection into Minecraft via Windows direct input (`pydirectinput`) or Mineflayer socket.
- Latency (ms per frame) and throughput (FPS) telemetry logging.

## 2. Approved Stack & Prohibited Code
- **Runtime**: Python 3.10+ (managed via `.venv`).
- **Approved Packages**:
  - `torch`, `torchvision`: Neural inference (CUDA enabled if GPU is available, CPU fallback).
  - `numpy`, `opencv-python`: Array manipulation and image preprocessing.
  - `mss` or `bettercam`: High-speed Windows screen capture.
  - `pydirectinput`: DirectX-compatible keyboard and mouse input injection.
  - `mineclip`: For STEVE-1 goal/prompt conditioning.
- **Prohibited**:
  - DO NOT reinvent image preprocessing or invent custom resolutions/color normalizations that deviate from `STEVE-1/run_agent.py`.
  - DO NOT hardcode screen coordinates or resolution offsets; detect the Minecraft game window dynamically.
  - DO NOT reinvent custom neural architectures for vision-to-action translation.

## 3. Configuration & Weights
Environment variables (via `.env`):
- `VPT_MODEL_WEIGHTS_PATH`: Local path to pretrained `.weights` or `.pt` file.
- `STEVE1_WEIGHTS_PATH`: Path to STEVE-1 model weights.
- `MINECLIP_WEIGHTS_PATH`: Path to MineCLIP model weights.
- `MINECRAFT_WINDOW_TITLE`: Title of the game window (default: `"Minecraft"`).
- `DEVICE`: Inference device (`cuda` or `cpu`, default auto-detect).
- `TARGET_FPS`: Loop target frequency (default: `20` ticks/sec).

Large weight files (`*.pt`, `*.pth`, `*.weights`) must stay outside git (handled by `.gitignore`).

## 4. Interface Contract
- **Inputs**:
  - Captured RGB video frame from game client.
  - Natural language goal prompt (e.g., `"chop tree"`, `"kill zombie"`, `"mine dirt"`).
- **Outputs**:
  - Action dict matching OpenAI VPT action space:
    ```python
    {
      "mouse": [dx, dy],
      "forward": 0 | 1,
      "back": 0 | 1,
      "left": 0 | 1,
      "right": 0 | 1,
      "jump": 0 | 1,
      "sneak": 0 | 1,
      "sprint": 0 | 1,
      "attack": 0 | 1,
      "use": 0 | 1
    }
    ```
  - Performance telemetry (`inference_time_ms`, `capture_time_ms`, `effective_fps`).

## 5. Testing & Verification
- Unit tests must run offline with synthetic NumPy frame arrays and mock model weights.
- Integration tests verify screen capture grab speed and action dict validation.
- Test command:
  ```bash
  pytest -v
  ```
