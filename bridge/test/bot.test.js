import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import EventEmitter from 'events';
import { StevanBridge } from '../src/bot.js';

describe('StevanBridge Module Interface & Event Translation', () => {
  test('should initialize with disconnected status', () => {
    const bridge = new StevanBridge({ username: 'TestBot' });
    const status = bridge.getStatus();

    assert.equal(status.connected, false);
    assert.equal(status.spawned, false);
    assert.equal(status.username, 'TestBot');
    assert.equal(status.position, null);
  });

  test('should properly translate mock bot lifecycle events', () => {
    const bridge = new StevanBridge({ username: 'TestBot' });
    const mockBot = new EventEmitter();

    mockBot.username = 'TestBot';
    mockBot.version = '1.20.1';
    mockBot.health = 20;
    mockBot.food = 18;
    mockBot.entity = {
      id: 101,
      position: { x: 10.5, y: 64.0, z: -25.2 },
      yaw: 0,
      pitch: 0,
    };
    mockBot.game = { gameMode: 'survival' };
    mockBot.inventory = { items: () => [1, 2, 3] };
    mockBot.quit = () => {
      mockBot.emit('end', 'quitting');
    };

    bridge.bot = mockBot;
    bridge._bindEvents();

    let loginFired = false;
    let spawnFired = false;
    let healthFired = false;
    let hurtFired = false;
    let deathFired = false;
    let endFired = false;

    bridge.on('bot:login', (data) => {
      loginFired = true;
      assert.equal(data.username, 'TestBot');
    });

    bridge.on('bot:spawn', (data) => {
      spawnFired = true;
      assert.equal(data.gameMode, 'survival');
      assert.equal(data.version, '1.20.1');
    });

    bridge.on('bot:health', (data) => {
      healthFired = true;
      assert.equal(data.health, 20);
      assert.equal(data.food, 18);
    });

    bridge.on('bot:entityHurt', (data) => {
      hurtFired = true;
      assert.equal(data.isBot, true);
    });

    bridge.on('bot:death', () => {
      deathFired = true;
    });

    bridge.on('bot:end', (data) => {
      endFired = true;
      assert.equal(data.reason, 'server shutdown');
    });

    // Fire simulated events
    mockBot.emit('login');
    assert.equal(loginFired, true);
    assert.equal(bridge.isConnected, true);

    mockBot.emit('spawn');
    assert.equal(spawnFired, true);
    assert.equal(bridge.isSpawned, true);

    const statusAfterSpawn = bridge.getStatus();
    assert.equal(statusAfterSpawn.connected, true);
    assert.equal(statusAfterSpawn.spawned, true);
    assert.deepEqual(statusAfterSpawn.position, { x: 10.5, y: 64, z: -25.2 });
    assert.equal(statusAfterSpawn.inventoryCount, 3);

    mockBot.emit('health');
    assert.equal(healthFired, true);

    mockBot.emit('entityHurt', mockBot.entity);
    assert.equal(hurtFired, true);

    mockBot.emit('death');
    assert.equal(deathFired, true);

    mockBot.emit('end', 'server shutdown');
    assert.equal(endFired, true);
    assert.equal(bridge.isConnected, false);
    assert.equal(bridge.isSpawned, false);
  });

  test('disconnect() cleanly resets connection states', () => {
    const bridge = new StevanBridge({ username: 'TestBot' });
    let quitCalled = false;
    let viewerClosed = false;

    bridge.bot = {
      quit: () => { quitCalled = true; },
      viewer: {
        close: () => { viewerClosed = true; }
      }
    };
    bridge.isConnected = true;
    bridge.isSpawned = true;
    bridge.viewerStarted = true;

    bridge.disconnect();

    assert.equal(quitCalled, true);
    assert.equal(viewerClosed, true);
    assert.equal(bridge.isConnected, false);
    assert.equal(bridge.isSpawned, false);
    assert.equal(bridge.viewerStarted, false);
  });
});
