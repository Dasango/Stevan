import { StevanBridge } from './bot.js';
import { loadConfig } from './config.js';

const config = loadConfig();

console.log('====================================================');
console.log(' Stevan Bridge — Minecraft Client & Viewer Service');
console.log('====================================================');
console.log(`Server Host:      ${config.host}:${config.port}`);
console.log(`Bot Username:     ${config.username}`);
console.log(`Auth Mode:        ${config.auth}`);
console.log(`Viewer Target:    http://localhost:${config.viewerPort}`);
console.log('====================================================');

const bridge = new StevanBridge(config);

let heartbeatInterval = null;
const sessionStartTime = Date.now();

bridge.on('bot:login', ({ username }) => {
  console.log(`[LOGIN] Logged in as ${username}`);
});

bridge.on('bot:spawn', ({ position, gameMode, version }) => {
  console.log(`[SPAWN] Bot spawned in world!`);
  console.log(`  Version:   ${version}`);
  console.log(`  Game Mode: ${gameMode}`);
  if (position) {
    console.log(`  Position:  X: ${position.x.toFixed(2)}, Y: ${position.y.toFixed(2)}, Z: ${position.z.toFixed(2)}`);
  }

  // Periodic heartbeat every 60s
  if (!heartbeatInterval) {
    heartbeatInterval = setInterval(() => {
      const elapsedMins = ((Date.now() - sessionStartTime) / 60000).toFixed(1);
      const status = bridge.getStatus();
      console.log(`[HEARTBEAT] Elapsed: ${elapsedMins}m | Health: ${status.health}/20 | Pos: (${status.position?.x ?? 0}, ${status.position?.y ?? 0}, ${status.position?.z ?? 0})`);
    }, 60000);
  }
});

bridge.on('viewer:started', ({ url, firstPerson }) => {
  console.log(`[VIEWER] Prismarine Viewer active at ${url} (first-person: ${firstPerson})`);
});

bridge.on('bot:health', ({ health, food }) => {
  console.log(`[HEALTH] Bot HP: ${health}/20, Food: ${food}/20`);
});

bridge.on('bot:entityHurt', ({ name, isBot }) => {
  if (isBot) {
    console.log(`[WARNING] Bot took damage!`);
  } else {
    console.log(`[COMBAT] Nearby entity hurt: ${name}`);
  }
});

bridge.on('bot:kicked', ({ reason, loggedIn }) => {
  console.error(`[KICKED] Bot kicked from server. Logged in: ${loggedIn}. Reason:`, reason);
});

bridge.on('bot:error', (err) => {
  console.error('[ERROR] Bridge error:', err.message || err);
});

bridge.on('bot:end', ({ reason }) => {
  console.log(`[END] Disconnected from server. Reason: ${reason || 'unknown'}`);
  if (heartbeatInterval) clearInterval(heartbeatInterval);
});

// Clean shutdown handler
function handleShutdown(signal) {
  console.log(`\n[SHUTDOWN] Received ${signal}. Disconnecting bot and stopping viewer...`);
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  bridge.disconnect();
  console.log('[SHUTDOWN] Clean exit completed.');
  process.exit(0);
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

// Initiate connection and attach viewer
bridge.connect();
bridge.startViewer();
