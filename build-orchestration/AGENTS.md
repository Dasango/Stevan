# /build-orchestration — Agent Guidelines

## 1. Scope & Overall Purpose
The `/build-orchestration` module enables Stevan to construct real buildings autonomously in Minecraft. It accomplishes:
- Parsing industry-standard Minecraft 3D voxel schematics (`.schem` Sponge format and `.litematic`).
- Computing an exact Bill of Materials (BOM) and reconciling it against Stevan's current inventory.
- Conducting environmental feasibility checks before placing a single block: verifying the construction bounding box is clear of obstructions and the foundation ground is solid.
- Generating topologically valid layer-by-layer placement orders (foundation first, gravity-dependent blocks supported, scaffolding when necessary).
- Reporting missing material deficits to trigger resource-gathering subgoals rather than failing silently.

## 2. Modularity & Connections with Other Modules
- **Modularity**: Dedicated construction architect. Operates independently from low-level network packets by utilizing standard schematic representations.
- **Inbound Connections**:
  - Receives blueprint build requests (schematic file and target world anchor coordinates `{x, y, z}`) from `/orchestrator` or player chat.
  - Receives real-time inventory counts and placement reach from `/bridge`.
- **Outbound Connections**:
  - If required materials are lacking, triggers automated resource-gathering missions via `/orchestrator` and `/vpt-bridge`.
  - Dispatches validated, step-by-step block placement commands to `/bridge` to physically place blocks in the Minecraft world.

## 3. Construction Invariants
1. **Foundation Invariant**: Every block requiring support below must have its foundation block placed and verified before proceeding.
2. **Clearance Check**: The bounding box $X \times Y \times Z$ must be surveyed for tree branches or dirt hills before building starts.
3. **Inventory Reconciler**: If required count $N_{\text{req}} > N_{\text{inv}}$, Stevan outputs a structured deficit report to prompt resource gathering.

## 4. In-Game Minecraft Testing & Visual Verification

### How to Test in Minecraft:
1. **Prepare Minecraft**:
   - Open your world to LAN on port `25565` (Cheats ON).
   - Give Stevan the necessary building supplies:
     ```minecraft
     /give StevanBot cobblestone 64
     /give StevanBot oak_planks 32
     ```
2. **Launch Construction**:
   - In terminal, navigate to `/build-orchestration` and run:
     ```bash
     npm start
     ```

### What You See In-Game (Visual Results):
- **Surveying Ground**: Stevan walks over to the anchor coordinates and looks down at the terrain to verify ground stability.
- **Progress Announcements in Chat**:
  `[StevanBot] Terreno verificado. Iniciando construcción de Refugio 3x3 (42 bloques)...`
- **Watching the Structure Rise**:
  - Stevan places the cobblestone foundation block by block, stepping back so he doesn't block his own placements.
  - He builds the four corner pillars out of oak planks up to 3 blocks high.
  - He fills the walls, leaving a 1x2 opening for a doorway.
  - He places the ceiling slabs/blocks on top, completing the structure with 100% fidelity to the blueprint.
- **Completion Confirmation**: Stevan steps out of the doorway, looks at the finished house, and chats: `[StevanBot] ¡Construcción finalizada con éxito!`
