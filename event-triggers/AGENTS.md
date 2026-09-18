# /event-triggers — Agent Guidelines

## 1. Scope & Overall Purpose
The `/event-triggers` module is Stevan's autonomic nervous system and emergency reflex guard. It accomplishes:
- Listening directly to native Mineflayer game events (`health`, `entityHurt`, `entitySpawn`, `physicsTick`) with zero performance overhead.
- Enforcing strict numerical safety tripwires (e.g. sudden damage $\ge 4.0$ HP, hostile mob proximity $\le 6$ blocks, falling velocity indicating a drop, lava/fire contact).
- Generating an instantaneous delta state snapshot (bot coordinates, health, offending entity type, distance) at the exact moment a threshold is breached.
- Emitting immediate high-priority interrupt signals to abort any running action in $< 5$ milliseconds.
- **Strict Rule**: Zero polling loops (`setInterval` or continuous busy loops checking health are prohibited; all checks must be event-driven).

## 2. Modularity & Connections with Other Modules
- **Modularity**: Completely decoupled watchdog. Consumes zero CPU cycles when the game state is stable.
- **Inbound Connections**:
  - Hooks into the active Mineflayer `bot` instance emitted by `/bridge`.
- **Outbound Connections**:
  - Dispatches immediate emergency interrupts (`interrupt:fired`) to `/orchestrator` and `/llm-controller` to preempt current tasks and trigger survival routines (retreat, shield, eat food).

## 3. Predefined Tripwire Thresholds
- `TRIPWIRE_HEALTH_DROP`: Damage $\ge 4.0$ HP (2 full hearts) in $\le 5$ physics ticks.
- `TRIPWIRE_HOSTILE_PROXIMITY`: Hostile entity enters $\le 6.0$ blocks radius.
- `TRIPWIRE_FALL_VELOCITY`: Downward velocity $v_y \le -0.6$ blocks/tick with distance to ground $> 3$ blocks.
- `TRIPWIRE_SUFFOCATION_OR_LAVA`: Bot in lava, fire, or suffocating block for $\ge 2$ ticks.

## 4. In-Game Minecraft Testing & Visual Verification

### How to Test in Minecraft:
1. **Prepare Minecraft**:
   - Open your world to LAN on port `25565` (Cheats ON).
   - Have Stevan connected and performing a peaceful task (such as walking across a field or mining dirt).
2. **Trigger an Emergency in Live Game**:
   - Hit Stevan with an iron sword, or spawn a Creeper right next to him:
     ```minecraft
     /summon creeper ~1.5 ~ ~
     ```

### What You See In-Game (Visual Results):
- **Instantaneous Task Abort**: Within milliseconds of the hit or Creeper spawn, Stevan completely halts his active pathfinding or mining action.
- **Visual Alert in Chat**: Stevan immediately reports the emergency in Minecraft chat:
  `[StevanBot] ¡ALERTA! Peligro detectado: creeper a 1.5 bloques. Interrumpiendo tarea actual.`
- **Survival Evasion**: Rather than mindlessly standing still or continuing to mine blocks while exploding, Stevan immediately sprints in reverse away from the Creeper's fuse radius or raises his shield to absorb the blast.
