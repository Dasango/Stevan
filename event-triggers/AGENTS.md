# /event-triggers — Agent Guidelines

## 1. Scope & Responsibility
The `/event-triggers` module provides reactive safety interrupts for the bot:
- Listens directly to native Mineflayer events (`health`, `entityHurt`, `entitySpawn`, `physicsTick`, etc.).
- Implements strict threshold-based tripwires (e.g., sudden damage, hostile mob entry within safety radius, rapid downward velocity indicating a fall).
- Generates an immediate delta state snapshot upon tripwire firing.
- Emits interrupt events to `/orchestrator` to suspend current low-level action and return decision authority to `/llm-controller`.
- **Absolute Rule**: Zero polling loops (`setInterval`, busy-wait loops checking bot status are strictly forbidden).

## 2. Approved Stack & Prohibited Code
- **Runtime**: Node.js (>= 18.0.0, `"type": "module"`).
- **Approved Packages**:
  - Native Node.js `EventEmitter` / Mineflayer event listeners.
  - `eventemitter2`: For wildcard and structured event dispatching if needed.
- **Prohibited**:
  - DO NOT implement polling (`setInterval` / `setTimeout` loops to check `bot.health` or entity distance). All logic must hook into native Mineflayer event emitters.
  - DO NOT make autonomous reaction decisions inside the trigger (the trigger only interrupts and captures snapshot; the LLM or orchestrator decides what to do).
  - DO NOT spam duplicate interrupts; enforce tripwire debounce cooldowns.

## 3. Pre-defined Tripwire Thresholds
Tripwires must follow predefined, documented numerical thresholds:
- `TRIPWIRE_HEALTH_DROP`: Damage $\ge 4.0$ HP (2 hearts) within $\le 5$ physics ticks.
- `TRIPWIRE_HOSTILE_PROXIMITY`: Hostile mob within $\le 6.0$ blocks radius.
- `TRIPWIRE_FALL_VELOCITY`: Downward velocity $v_y \le -0.6$ blocks/tick with distance to ground $> 3$ blocks.
- `TRIPWIRE_SUFFOCATION_OR_LAVA`: Bot submerged in lava, fire, or solid block for $\ge 2$ ticks.

## 4. Interface Contract
- **Inputs**:
  - Active Mineflayer `bot` instance from `/bridge`.
- **Outputs**:
  - Interrupt signal payload emitted to `/orchestrator`:
    ```json
    {
      "triggerId": "TRIPWIRE_HOSTILE_PROXIMITY",
      "severity": "critical",
      "timestamp": 1773789000,
      "snapshot": {
        "botPosition": { "x": 10.5, "y": 64, "z": -22.1 },
        "health": 16.0,
        "causeEntity": { "type": "skeleton", "distance": 4.8, "position": { "x": 12.0, "y": 64, "z": -18.0 } }
      }
    }
    ```
- **Events Emitted**:
  - `interrupt:fired`: Dispatched immediately when a threshold is breached.
  - `interrupt:cleared`: Dispatched when condition is no longer present.

## 5. Testing & Verification
- Unit tests emit mock Mineflayer events to verify tripwire trigger timing, debounce windows, and snapshot construction.
- Measure false positives/negatives in staged scenarios (simulated fall, simulated hurt event).
- Test command:
  ```bash
  npm test
  ```
