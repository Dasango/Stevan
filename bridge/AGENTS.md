# /bridge — Agent Guidelines

## 1. Scope & Responsibility
The `/bridge` module is responsible for:
- Establishing and maintaining the Mineflayer bot connection to a Minecraft Java Edition server (supports both `offline` and `microsoft` authentication).
- Hosting the `prismarine-viewer` web interface to render the bot's first-person view.
- Exposing bot state, basic control primitives, and connection events to other modules.
- Implementing graceful shutdown and error recovery without hanging server threads.

## 2. Approved Stack & Prohibited Code
- **Runtime**: Node.js (>= 18.0.0, `"type": "module"` in `package.json`).
- **Approved Packages**:
  - `mineflayer`: Core Minecraft client bot.
  - `prismarine-viewer`: Web-based first-person viewer.
  - `dotenv`: Secrets and configuration loader.
  - `mineflayer-pathfinder`: Optional navigation primitive.
- **Prohibited**:
  - DO NOT write custom low-level TCP/packet handling or protocol parsers.
  - DO NOT hardcode server IP, port, or player credentials in source files.
  - DO NOT create custom web viewers when `prismarine-viewer` is approved.

## 3. Configuration & Secrets
All connection parameters must be read from environment variables (via `.env`):
- `MC_HOST`: Server hostname or IP (default: `localhost`).
- `MC_PORT`: Server port (default: `25565`).
- `MC_USERNAME`: Bot player name or Microsoft account email.
- `MC_AUTH`: Authentication mode (`offline` or `microsoft`, default: `offline`).
- `MC_VERSION`: Minecraft version (optional, auto-negotiated if omitted).
- `VIEWER_PORT`: Local port for prismarine-viewer (default: `3000`).

A template `.env.example` must always be present and committed.

## 4. Interface Contract
- **Inputs**:
  - Connection options object.
  - Movement/action commands (`bot.lookAt`, `bot.setControlState`, etc.).
- **Outputs**:
  - Bot instance and state summary (`bot.entity.position`, `bot.health`, `bot.food`, `bot.inventory`).
- **Events Emitted**:
  - `bot:spawn`: Bot has materialized in the world.
  - `bot:health`: Health or food changed.
  - `bot:entityHurt`: Entity hurt event.
  - `bot:death`: Bot was killed.
  - `bot:end`: Connection terminated.
  - `bot:error`: Connection error occurred.

## 5. Testing & Verification
- Unit tests must test configuration loading and mock bot creation without requiring a live Minecraft server running.
- Integration tests require a local test server (e.g. Docker/vanilla/PaperMC or mock server).
- Test command:
  ```bash
  npm test
  ```
