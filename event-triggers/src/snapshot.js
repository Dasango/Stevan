import { HOSTILE_MOB_TYPES } from './thresholds.js';

/**
 * Builds a structured, concise state snapshot for LLM decision making.
 * @param {any} bot - Mineflayer bot instance
 * @param {string} triggerId - ID of fired tripwire
 * @param {string} severity - 'CRITICAL' | 'WARNING'
 * @param {Record<string, any>} [extraData={}] - Trigger-specific context
 * @returns {Object}
 */
export function buildStateSnapshot(bot, triggerId, severity, extraData = {}) {
  const botPos = bot.entity?.position
    ? {
        x: Math.round(bot.entity.position.x * 100) / 100,
        y: Math.round(bot.entity.position.y * 100) / 100,
        z: Math.round(bot.entity.position.z * 100) / 100,
      }
    : null;

  // Scan for nearby threats within 16 blocks
  const nearbyThreats = [];
  if (bot.entities && bot.entity?.position) {
    for (const id in bot.entities) {
      const entity = bot.entities[id];
      if (!entity || entity === bot.entity) continue;

      const entityName = (entity.name || entity.username || '').toLowerCase();
      if (HOSTILE_MOB_TYPES.has(entityName) && entity.position) {
        const dist = Math.round(bot.entity.position.distanceTo(entity.position) * 10) / 10;
        if (dist <= 16.0) {
          nearbyThreats.push({
            name: entityName,
            distance: dist,
            position: {
              x: Math.round(entity.position.x * 10) / 10,
              y: Math.round(entity.position.y * 10) / 10,
              z: Math.round(entity.position.z * 10) / 10,
            },
          });
        }
      }
    }
  }

  // Sort threats by proximity
  nearbyThreats.sort((a, b) => a.distance - b.distance);

  return {
    interruptId: `interrupt_${triggerId.toLowerCase()}_${Date.now()}`,
    trigger: triggerId,
    severity,
    timestamp: Date.now(),
    snapshot: {
      botPosition: botPos,
      health: bot.health ?? 20,
      food: bot.food ?? 20,
      nearbyThreats: nearbyThreats.slice(0, 5), // top 5 closest threats
      ...extraData,
    },
  };
}
