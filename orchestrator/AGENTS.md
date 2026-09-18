# /orchestrator — Agent Guidelines

## 1. Scope & Responsibility
The `/orchestrator` module coordinates the interaction between:
- High-level goal planning (`/llm-controller`).
- Discrete bot actions (`/bridge`).
- Low-level continuous neural skills (`/vpt-bridge`).
- Reactive tripwire interrupts (`/event-triggers`).

It adopts the classical **Hierarchical RL Options Framework** ($\langle I_\omega, \pi_\omega, \beta_\omega \rangle$):
1. Initiation conditions ($I_\omega$): Evaluates if conditions are met to trigger an option.
2. Intra-option policy ($\pi_\omega$): Delegates execution to either Mineflayer discrete routines or VPT visual policy.
3. Termination condition ($\beta_\omega$): Signals success, timeout, failure, or emergency interrupt to return control to the LLM.

## 2. Approved Stack & Prohibited Code
- **Runtime**: Node.js (>= 18.0.0, `"type": "module"`) or Python 3.10+.
- **Approved Patterns**:
  - Finite State Machine / Options Framework.
  - JSON-RPC, WebSockets, or async message bus for IPC between Node and Python components.
  - Async task queues with strict timeout boundaries.
- **Prohibited**:
  - DO NOT run continuous busy-wait loops without yield/sleep.
  - DO NOT tightly bind the high-level LLM into 20Hz frame loops.
  - DO NOT ignore termination signals or unhandled failure states.

## 3. Configuration
Environment variables (via `.env`):
- `ORCHESTRATOR_IPC_PORT`: IPC port for bridge communication (default: `8765`).
- `DEFAULT_OPTION_TIMEOUT_SEC`: Fallback timeout for autonomous skills (default: `45`).
- `MAX_SUBGOAL_RETRIES`: Number of attempts before triggering an LLM replan (default: `3`).

## 4. Interface Contract
- **Inputs**:
  - User high-level mission (e.g., `"Survive the first night by building a dirt shelter"`).
- **Outputs**:
  - Option execution telemetry, sequence of selected options, end status (success/failure/replan).
- **Events**:
  - `option:start`: Option initiated.
  - `option:complete`: Option terminated successfully.
  - `option:interrupt`: Interrupted by an emergency event trigger.
  - `option:timeout`: Timed out without reaching goal state.

## 5. Testing & Verification
- Unit tests must simulate goal chains using mock sub-modules (mock LLM responses, mock VPT execution, mock Mineflayer state).
- Validate state transitions: start -> execute -> termination/interrupt -> replan.
- Test command:
  ```bash
  npm test
  ```
