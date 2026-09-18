import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.js';

describe('Bridge Configuration Loader', () => {
  test('should load default configuration when no overrides are provided', () => {
    // Clear relevant environment variables temporarily
    const originalEnv = { ...process.env };
    delete process.env.MC_HOST;
    delete process.env.MC_PORT;
    delete process.env.MC_USERNAME;
    delete process.env.MC_AUTH;
    delete process.env.VIEWER_PORT;

    try {
      const config = loadConfig();
      assert.equal(config.host, 'localhost');
      assert.equal(config.port, 25565);
      assert.equal(config.username, 'StevanBot');
      assert.equal(config.auth, 'offline');
      assert.equal(config.viewerPort, 3000);
      assert.equal(config.version, false);
    } finally {
      process.env = originalEnv;
    }
  });

  test('should apply custom overrides properly', () => {
    const custom = {
      host: '192.168.1.100',
      port: 25577,
      username: 'MinerAlex',
      auth: 'microsoft',
      version: '1.20.1',
      viewerPort: 8080,
    };

    const config = loadConfig(custom);
    assert.equal(config.host, '192.168.1.100');
    assert.equal(config.port, 25577);
    assert.equal(config.username, 'MinerAlex');
    assert.equal(config.auth, 'microsoft');
    assert.equal(config.version, '1.20.1');
    assert.equal(config.viewerPort, 8080);
  });

  test('should reject invalid auth modes', () => {
    assert.throws(
      () => loadConfig({ auth: 'invalid_mode' }),
      /Unsupported MC_AUTH mode: "invalid_mode"/
    );
  });

  test('should reject invalid port numbers', () => {
    const originalPort = process.env.MC_PORT;
    try {
      process.env.MC_PORT = 'not-a-number';
      assert.throws(
        () => loadConfig(),
        /Invalid port for MC_PORT: "not-a-number"/
      );

      process.env.MC_PORT = '999999';
      assert.throws(
        () => loadConfig(),
        /Invalid port for MC_PORT: "999999"/
      );
    } finally {
      process.env.MC_PORT = originalPort;
    }
  });
});
