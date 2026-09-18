import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from module root (one level up from src) or project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Validates and parses integer environment variables with a fallback.
 * @param {string|undefined} val - Environment variable value.
 * @param {number} fallback - Default integer.
 * @param {string} varName - Variable name for error reporting.
 * @returns {number}
 */
function parsePort(val, fallback, varName) {
  if (!val) return fallback;
  const parsed = parseInt(val, 10);
  if (isNaN(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid port for ${varName}: "${val}". Must be an integer between 1 and 65535.`);
  }
  return parsed;
}

/**
 * Loads and validates bot and viewer configuration.
 * @param {Record<string, any>} [overrides={}] - Optional configuration overrides.
 * @returns {BridgeConfig}
 */
export function loadConfig(overrides = {}) {
  const host = overrides.host ?? process.env.MC_HOST ?? 'localhost';
  const port = overrides.port ?? parsePort(process.env.MC_PORT, 25565, 'MC_PORT');
  const username = overrides.username ?? process.env.MC_USERNAME ?? 'StevanBot';
  const rawAuth = overrides.auth ?? process.env.MC_AUTH ?? 'offline';
  const auth = rawAuth.toLowerCase();

  if (auth !== 'offline' && auth !== 'microsoft') {
    throw new Error(`Unsupported MC_AUTH mode: "${auth}". Must be "offline" or "microsoft".`);
  }

  const version = overrides.version ?? process.env.MC_VERSION ?? false;
  const viewerPort = overrides.viewerPort ?? parsePort(process.env.VIEWER_PORT, 3000, 'VIEWER_PORT');
  const profilesFolder = overrides.profilesFolder ?? process.env.PROFILES_FOLDER ?? path.resolve(__dirname, '../.ms-cache');

  return {
    host,
    port,
    username,
    auth,
    version: version || false,
    viewerPort,
    profilesFolder,
  };
}

export default loadConfig;
