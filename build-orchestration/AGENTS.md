# /build-orchestration — Agent Guidelines

## 1. Scope & Responsibility
The `/build-orchestration` module enables autonomous in-world construction:
- Parses industry-standard Minecraft schematic formats (`.schem`, `.litematic`) using approved parsers.
- Computes Bill of Materials (BOM) and performs inventory reconciliation.
- Performs environmental feasibility checks (sufficient clearance, valid foundation, biome resource availability).
- Delegates missing resource gathering tasks to `/orchestrator` / `/vpt-bridge`.
- Generates topologically valid block placement sequences (foundation first, gravity support, scaffolding where needed) using Mineflayer building primitives.
- Explicitly handles infeasible conditions by returning actionable replanning reports to `/llm-controller`.

## 2. Approved Stack & Prohibited Code
- **Runtime**: Node.js (>= 18.0.0, `"type": "module"`).
- **Approved Packages**:
  - `prismarine-schematic`: For reading and writing standard Sponge `.schem` files.
  - `prismarine-world`: Block and chunk coordinate manipulation.
  - `mineflayer-builder` / `mineflayer-pathfinder`: Placement and positioning.
- **Prohibited**:
  - DO NOT invent custom ad-hoc JSON or text blueprint formats; use standard `.schem` or `.litematic`.
  - DO NOT attempt to place blocks in mid-air violating Minecraft physics or support requirements.
  - DO NOT fail silently when materials are missing; fail fast with a structured feasibility deficit report.

## 3. Placement & Feasibility Rules
1. **Support Invariant**: Any block requiring support beneath it must have its foundation block placed and verified first.
2. **Clearance Check**: The bounding box $X \times Y \times Z$ must be verified for obstructions before commencing placement.
3. **Inventory Reconciler**: If required count $N_{\text{req}} > N_{\text{inv}}$, return a deficit list:
   ```json
   {
     "status": "INFEASIBLE_MISSING_MATERIALS",
     "missing": [
       { "item": "oak_planks", "needed": 16, "available": 4, "deficit": 12 }
     ]
   }
   ```

## 4. Interface Contract
- **Inputs**:
  - Schematic file buffer or path.
  - Anchor point `{ x, y, z }` and rotation (`0`, `90`, `180`, `270`).
- **Outputs**:
  - Feasibility validation report.
  - Progress events (placed block count, total blocks, current coordinates).
- **Events Emitted**:
  - `build:started`: Build initiated.
  - `build:progress`: Block placed successfully.
  - `build:interrupted`: Block placement obstructed or failed.
  - `build:completed`: All schematic blocks verified in world.

## 5. Testing & Verification
- Unit tests verify schematic loading, BOM extraction, and topological placement sequence calculation using a small synthetic 3x3 box `.schem`.
- Integration tests simulate virtual placement in a mock prismarine world.
- Test command:
  ```bash
  npm test
  ```
