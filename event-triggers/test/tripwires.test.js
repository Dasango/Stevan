import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import EventEmitter from 'events';
import { TripwireManager } from '../src/tripwire-manager.js';
import { TRIPWIRE_IDS } from '../src/thresholds.js';

/**
 * Creates a mock Mineflayer bot event emitter with standard spatial properties.
 */
function createMockBot() {
  const bot = new EventEmitter();
  bot.health = 20.0;
  bot.food = 20.0;
  bot.entity = {
    id: 1,
    position: {
      x: 0.0,
      y: 64.0,
      z: 0.0,
      distanceTo: (otherPos) => {
        const dx = otherPos.x - bot.entity.position.x;
        const dy = otherPos.y - bot.entity.position.y;
        const dz = otherPos.z - bot.entity.position.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
      },
    },
    velocity: { x: 0.0, y: 0.0, z: 0.0 },
    isInLava: false,
  };
  bot.entities = {};
  return bot;
}

describe('Event-Triggers — Staged Trigger Scenarios & False-Positive Verification', () => {
  test('Scenario 1: Sudden Health Drop (Damage >= 4 HP) triggers interrupt', () => {
    const bot = createMockBot();
    const manager = new TripwireManager(bot, { debounceMs: 0 });

    const interrupts = [];
    manager.on('tripwire:triggered', (e) => interrupts.push(e));

    // Simulate sudden damage: 20 HP -> 14 HP (loss of 6 HP)
    bot.health = 14.0;
    bot.emit('health');

    assert.equal(interrupts.length, 1);
    assert.equal(interrupts[0].trigger, TRIPWIRE_IDS.SUDDEN_HEALTH_DROP);
    assert.equal(interrupts[0].severity, 'CRITICAL');
    assert.equal(interrupts[0].snapshot.healthDelta, -6.0);
  });

  test('Scenario 2: Critical Low Health (Health <= 6 HP) triggers interrupt', () => {
    const bot = createMockBot();
    const manager = new TripwireManager(bot, { debounceMs: 0 });

    const interrupts = [];
    manager.on('tripwire:triggered', (e) => interrupts.push(e));

    // Simulate critical drop: 20 -> 5 HP
    bot.health = 5.0;
    bot.emit('health');

    const critical = interrupts.find((i) => i.trigger === TRIPWIRE_IDS.CRITICAL_HEALTH);
    assert.ok(critical, 'Critical health tripwire should fire');
    assert.equal(critical.severity, 'CRITICAL');
    assert.equal(critical.snapshot.currentHealth, 5.0);
  });

  test('Scenario 3: Falling Velocity (v_y <= -0.6 blocks/tick) triggers interrupt', () => {
    const bot = createMockBot();
    const manager = new TripwireManager(bot, { debounceMs: 0 });

    const interrupts = [];
    manager.on('tripwire:triggered', (e) => interrupts.push(e));

    // Simulate downward velocity from falling off a ledge
    bot.entity.velocity.y = -0.85;
    bot.emit('physicsTick');

    assert.equal(interrupts.length, 1);
    assert.equal(interrupts[0].trigger, TRIPWIRE_IDS.FALLING_VELOCITY);
    assert.equal(interrupts[0].severity, 'CRITICAL');
    assert.equal(interrupts[0].snapshot.verticalVelocity, -0.85);
  });

  test('Scenario 4: Hostile Mob Proximity (Zombie at 4.5 blocks) triggers interrupt', () => {
    const bot = createMockBot();
    const manager = new TripwireManager(bot, { debounceMs: 0 });

    const interrupts = [];
    manager.on('tripwire:triggered', (e) => interrupts.push(e));

    // Hostile entity spawns nearby (4.5 blocks away)
    const zombie = {
      name: 'zombie',
      position: { x: 3.0, y: 64.0, z: 3.35 }, // dist ≈ 4.5
    };
    bot.emit('entitySpawn', zombie);

    assert.equal(interrupts.length, 1);
    assert.equal(interrupts[0].trigger, TRIPWIRE_IDS.HOSTILE_MOB_PROXIMITY);
    assert.equal(interrupts[0].severity, 'WARNING');
    assert.equal(interrupts[0].snapshot.threatMob, 'zombie');
  });

  test('Scenario 5: Creeper Proximity (<= 4 blocks) triggers CRITICAL interrupt', () => {
    const bot = createMockBot();
    const manager = new TripwireManager(bot, { debounceMs: 0 });

    const interrupts = [];
    manager.on('tripwire:triggered', (e) => interrupts.push(e));

    const creeper = {
      name: 'creeper',
      position: { x: 2.0, y: 64.0, z: 2.0 }, // dist ≈ 2.83
    };
    bot.emit('entitySpawn', creeper);

    assert.equal(interrupts.length, 1);
    assert.equal(interrupts[0].trigger, TRIPWIRE_IDS.CREEPER_PROXIMITY);
    assert.equal(interrupts[0].severity, 'CRITICAL');
  });

  test('False Positive Guard 1: Passive animal (cow, sheep) does NOT trigger interrupt', () => {
    const bot = createMockBot();
    const manager = new TripwireManager(bot, { debounceMs: 0 });

    const interrupts = [];
    manager.on('tripwire:triggered', (e) => interrupts.push(e));

    const cow = {
      name: 'cow',
      position: { x: 1.0, y: 64.0, z: 1.0 },
    };
    const sheep = {
      name: 'sheep',
      position: { x: 0.5, y: 64.0, z: 0.5 },
    };

    bot.emit('entitySpawn', cow);
    bot.emit('entitySpawn', sheep);

    // ZERO false positives
    assert.equal(interrupts.length, 0);
  });

  test('False Positive Guard 2: Minor damage (< 4 HP) does NOT trigger sudden damage tripwire', () => {
    const bot = createMockBot();
    const manager = new TripwireManager(bot, { debounceMs: 0 });

    const interrupts = [];
    manager.on('tripwire:triggered', (e) => interrupts.push(e));

    // Minor damage of 1 HP (e.g. cactus or slight bump): 20 HP -> 19 HP
    bot.health = 19.0;
    bot.emit('health');

    // ZERO false positives
    assert.equal(interrupts.length, 0);
  });

  test('False Positive Guard 3: Upward jump velocity (v_y = +0.42) does NOT trigger fall tripwire', () => {
    const bot = createMockBot();
    const manager = new TripwireManager(bot, { debounceMs: 0 });

    const interrupts = [];
    manager.on('tripwire:triggered', (e) => interrupts.push(e));

    // Normal jump upward velocity in Minecraft
    bot.entity.velocity.y = 0.42;
    bot.emit('physicsTick');

    // Zero false positives
    assert.equal(interrupts.length, 0);
  });

  test('Debounce Window: Prevents duplicate spamming within cooldown window', () => {
    const bot = createMockBot();
    // 500ms debounce window
    const manager = new TripwireManager(bot, { debounceMs: 500 });

    const interrupts = [];
    manager.on('tripwire:triggered', (e) => interrupts.push(e));

    // First trigger
    bot.health = 14.0;
    bot.emit('health');
    assert.equal(interrupts.length, 1);

    // Second trigger immediately after
    bot.health = 10.0;
    bot.emit('health');
    // Debounced -> still 1
    assert.equal(interrupts.length, 1);
  });
});
