import EventEmitter2 from 'eventemitter2';
import { TRIPWIRE_IDS, TRIPWIRE_THRESHOLDS, HOSTILE_MOB_TYPES } from './thresholds.js';
import { buildStateSnapshot } from './snapshot.js';

/**
 * TripwireManager implements pure event-driven reactive failure detection.
 * Strictly zero polling loops (setInterval / setTimeout status polling forbidden).
 */
export class TripwireManager extends EventEmitter2 {
  /**
   * @param {any} [bot] - Mineflayer bot instance
   * @param {Record<string, any>} [options={}]
   */
  constructor(bot = null, options = {}) {
    super({ wildcard: true });
    this.bot = bot;
    this.debounceMs = options.debounceMs ?? TRIPWIRE_THRESHOLDS.DEBOUNCE_MS;
    this.lastTriggered = new Map(); // triggerId -> timestamp

    // Historical tracking for sudden damage across ticks
    this.recentHealthHistory = []; // { tick: number, health: number }
    this.currentTick = 0;
    this.lastHealth = 20.0;

    this.stats = {
      triggersFired: 0,
      totalEventsHandled: 0,
      tripwireCounts: {},
    };

    if (bot) {
      this.attach(bot);
    }
  }

  /**
   * Binds event listeners directly to the Mineflayer bot event emitter.
   * @param {any} bot
   */
  attach(bot) {
    this.bot = bot;
    this.lastHealth = bot.health ?? 20.0;

    this._onHealth = () => this._handleHealthEvent();
    this._onEntityHurt = (entity) => this._handleEntityHurt(entity);
    this._onEntitySpawn = (entity) => this._handleEntitySpawn(entity);
    this._onPhysicsTick = () => this._handlePhysicsTick();

    this.bot.on('health', this._onHealth);
    this.bot.on('entityHurt', this._onEntityHurt);
    this.bot.on('entitySpawn', this._onEntitySpawn);
    this.bot.on('physicsTick', this._onPhysicsTick);
  }

  /**
   * Detaches all event listeners from bot.
   */
  detach() {
    if (!this.bot) return;
    this.bot.removeListener('health', this._onHealth);
    this.bot.removeListener('entityHurt', this._onEntityHurt);
    this.bot.removeListener('entitySpawn', this._onEntitySpawn);
    this.bot.removeListener('physicsTick', this._onPhysicsTick);
    this.bot = null;
  }

  _isDebounced(triggerId) {
    const lastTime = this.lastTriggered.get(triggerId) || 0;
    return Date.now() - lastTime < this.debounceMs;
  }

  _fireInterrupt(triggerId, severity, extraData = {}) {
    if (this._isDebounced(triggerId)) {
      return false;
    }

    this.lastTriggered.set(triggerId, Date.now());
    this.stats.triggersFired++;
    this.stats.tripwireCounts[triggerId] = (this.stats.tripwireCounts[triggerId] || 0) + 1;

    const snapshot = buildStateSnapshot(this.bot, triggerId, severity, extraData);
    this.emit('tripwire:triggered', snapshot);
    this.emit(`tripwire:${triggerId}`, snapshot);
    return true;
  }

  _handleHealthEvent() {
    this.stats.totalEventsHandled++;
    if (!this.bot) return;

    const currentHealth = this.bot.health ?? 20.0;
    const delta = this.lastHealth - currentHealth;

    // 1. Critical health threshold check
    if (currentHealth <= TRIPWIRE_THRESHOLDS.CRITICAL_HEALTH_MAX && currentHealth > 0) {
      this._fireInterrupt(TRIPWIRE_IDS.CRITICAL_HEALTH, 'CRITICAL', {
        currentHealth,
        healthDelta: -delta,
        reason: 'Bot health dropped below critical threshold.',
      });
    }

    // 2. Sudden health drop check
    if (delta >= TRIPWIRE_THRESHOLDS.DAMAGE_DELTA_MIN) {
      this._fireInterrupt(TRIPWIRE_IDS.SUDDEN_HEALTH_DROP, 'CRITICAL', {
        currentHealth,
        healthDelta: -delta,
        reason: `Sudden damage of ${delta.toFixed(1)} HP exceeded threshold of ${TRIPWIRE_THRESHOLDS.DAMAGE_DELTA_MIN} HP.`,
      });
    }

    this.lastHealth = currentHealth;
  }

  _handleEntityHurt(entity) {
    this.stats.totalEventsHandled++;
    if (!this.bot || !entity) return;

    // If bot took damage
    if (entity === this.bot.entity) {
      this._handleHealthEvent();
    }
  }

  _handleEntitySpawn(entity) {
    this.stats.totalEventsHandled++;
    if (!this.bot || !entity || !entity.position || !this.bot.entity?.position) return;

    const entityName = (entity.name || entity.username || '').toLowerCase();
    if (!HOSTILE_MOB_TYPES.has(entityName)) return;

    const distance = this.bot.entity.position.distanceTo(entity.position);

    // Creeper proximity is immediate critical threat
    if (entityName === 'creeper' && distance <= TRIPWIRE_THRESHOLDS.CREEPER_PROXIMITY_RADIUS) {
      this._fireInterrupt(TRIPWIRE_IDS.CREEPER_PROXIMITY, 'CRITICAL', {
        threatMob: entityName,
        distance: Math.round(distance * 10) / 10,
        threatPosition: entity.position,
      });
      return;
    }

    // General hostile mob proximity
    if (distance <= TRIPWIRE_THRESHOLDS.HOSTILE_PROXIMITY_RADIUS) {
      this._fireInterrupt(TRIPWIRE_IDS.HOSTILE_MOB_PROXIMITY, 'WARNING', {
        threatMob: entityName,
        distance: Math.round(distance * 10) / 10,
        threatPosition: entity.position,
      });
    }
  }

  _handlePhysicsTick() {
    this.stats.totalEventsHandled++;
    this.currentTick++;
    if (!this.bot || !this.bot.entity) return;

    // 1. Falling velocity check
    const vy = this.bot.entity.velocity?.y ?? 0.0;
    if (vy <= TRIPWIRE_THRESHOLDS.FALL_VELOCITY_MAX) {
      this._fireInterrupt(TRIPWIRE_IDS.FALLING_VELOCITY, 'CRITICAL', {
        verticalVelocity: Math.round(vy * 100) / 100,
        velocityThreshold: TRIPWIRE_THRESHOLDS.FALL_VELOCITY_MAX,
        reason: 'Severe downward velocity detected (falling).',
      });
    }

    // 2. Hazardous environment check (lava, fire)
    const inLava = this.bot.entity.isInLava;
    if (inLava) {
      this._fireInterrupt(TRIPWIRE_IDS.HAZARDOUS_SURROUNDING, 'CRITICAL', {
        hazard: 'lava',
        reason: 'Bot is submerged in lava.',
      });
    }
  }
}

export default TripwireManager;
