import EventEmitter from 'events';
import mineflayer from 'mineflayer';
import prismarineViewer from 'prismarine-viewer';
import { loadConfig } from './config.js';

/**
 * StevanBridge manages the Mineflayer bot connection, event translation,
 * and Prismarine-Viewer first-person rendering.
 */
export class StevanBridge extends EventEmitter {
  /**
   * @param {Record<string, any>} [options={}] - Configuration options or overrides.
   */
  constructor(options = {}) {
    super();
    this.config = loadConfig(options);
    this.bot = null;
    this.viewerStarted = false;
    this.isConnected = false;
    this.isSpawned = false;
  }

  /**
   * Establishes connection to the Minecraft server.
   * @returns {import('mineflayer').Bot}
   */
  connect() {
    const botOptions = {
      host: this.config.host,
      port: this.config.port,
      username: this.config.username,
      auth: this.config.auth,
      profilesFolder: this.config.profilesFolder,
    };

    if (this.config.version) {
      botOptions.version = this.config.version;
    }

    this.bot = mineflayer.createBot(botOptions);
    this._bindEvents();
    return this.bot;
  }

  /**
   * Internal binding of native Mineflayer events to module interface events.
   * @private
   */
  _bindEvents() {
    if (!this.bot) return;

    this.bot.on('login', () => {
      this.isConnected = true;
      this.emit('bot:login', {
        username: this.bot.username,
      });
    });

    this.bot.once('spawn', () => {
      this.isSpawned = true;
      this.emit('bot:spawn', {
        position: this.bot.entity?.position,
        gameMode: this.bot.game?.gameMode,
        version: this.bot.version,
      });
    });

    this.bot.on('health', () => {
      this.emit('bot:health', {
        health: this.bot.health,
        food: this.bot.food,
      });
    });

    this.bot.on('death', () => {
      this.emit('bot:death');
    });

    this.bot.on('entityHurt', (entity) => {
      this.emit('bot:entityHurt', {
        entityId: entity.id,
        name: entity.name || entity.username,
        isBot: entity === this.bot.entity,
      });
    });

    this.bot.on('kicked', (reason, loggedIn) => {
      this.emit('bot:kicked', { reason, loggedIn });
    });

    this.bot.on('error', (err) => {
      this.emit('bot:error', err);
    });

    this.bot.on('end', (reason) => {
      this.isConnected = false;
      this.isSpawned = false;
      this.emit('bot:end', { reason });
    });
  }

  /**
   * Attaches the Prismarine Web Viewer to the bot.
   * @param {number} [port=this.config.viewerPort] - HTTP server port.
   * @param {boolean} [firstPerson=true] - Enable first-person view.
   */
  startViewer(port = this.config.viewerPort, firstPerson = true) {
    if (this.viewerStarted) return;
    if (!this.bot) throw new Error('Cannot start viewer before initializing bot.');

    const attach = () => {
      if (this.viewerStarted) return;
      prismarineViewer.mineflayer(this.bot, { port, firstPerson });
      this.viewerStarted = true;
      this.emit('viewer:started', {
        port,
        firstPerson,
        url: `http://localhost:${port}`,
      });
    };

    if (this.isSpawned) {
      attach();
    } else {
      this.bot.once('spawn', () => attach());
    }
  }

  /**
   * Returns a normalized state snapshot of the bot.
   * @returns {Object}
   */
  getStatus() {
    if (!this.bot) {
      return {
        connected: false,
        spawned: false,
        username: this.config.username,
        version: null,
        position: null,
        health: null,
        food: null,
        inventoryCount: 0,
      };
    }

    return {
      connected: this.isConnected,
      spawned: this.isSpawned,
      username: this.bot.username || this.config.username,
      version: this.bot.version || this.config.version || null,
      position: this.bot.entity?.position
        ? {
            x: Math.round(this.bot.entity.position.x * 100) / 100,
            y: Math.round(this.bot.entity.position.y * 100) / 100,
            z: Math.round(this.bot.entity.position.z * 100) / 100,
          }
        : null,
      health: this.bot.health ?? null,
      food: this.bot.food ?? null,
      inventoryCount: this.bot.inventory ? this.bot.inventory.items().length : 0,
    };
  }

  /**
   * Disconnects the bot and terminates viewer web sockets cleanly.
   */
  disconnect() {
    if (this.bot) {
      if (this.bot.viewer && typeof this.bot.viewer.close === 'function') {
        try {
          this.bot.viewer.close();
        } catch (_) {}
      }
      try {
        this.bot.quit();
      } catch (_) {}
    }
    this.isConnected = false;
    this.isSpawned = false;
    this.viewerStarted = false;
  }
}

export function createStevanBot(options = {}) {
  const bridge = new StevanBridge(options);
  bridge.connect();
  return bridge;
}

export default StevanBridge;
