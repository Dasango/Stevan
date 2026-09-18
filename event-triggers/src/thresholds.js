/**
 * Pre-defined numerical thresholds for event-driven tripwires.
 * Established prior to implementation per AGENTS.md requirements.
 */

export const TRIPWIRE_IDS = {
  SUDDEN_HEALTH_DROP: 'TRIPWIRE_SUDDEN_HEALTH_DROP',
  CRITICAL_HEALTH: 'TRIPWIRE_CRITICAL_HEALTH',
  HOSTILE_MOB_PROXIMITY: 'TRIPWIRE_HOSTILE_MOB_PROXIMITY',
  CREEPER_PROXIMITY: 'TRIPWIRE_CREEPER_PROXIMITY',
  FALLING_VELOCITY: 'TRIPWIRE_FALLING_VELOCITY',
  HAZARDOUS_SURROUNDING: 'TRIPWIRE_HAZARDOUS_SURROUNDING',
};

export const TRIPWIRE_THRESHOLDS = {
  // Sudden damage: loss of >= 4.0 HP (2 full hearts) within <= 5 ticks
  DAMAGE_DELTA_MIN: 4.0,
  DAMAGE_WINDOW_TICKS: 5,

  // Critical health boundary: <= 6.0 HP (3 hearts remaining)
  CRITICAL_HEALTH_MAX: 6.0,

  // Hostile mob safety perimeter in blocks
  HOSTILE_PROXIMITY_RADIUS: 6.0,

  // High-priority creeper ignition radius in blocks
  CREEPER_PROXIMITY_RADIUS: 4.0,

  // Downward terminal velocity indicating dangerous fall (blocks/tick)
  FALL_VELOCITY_MAX: -0.6,
  FALL_HEIGHT_MIN: 3.0,

  // Default debounce window in milliseconds to prevent interrupt spamming
  DEBOUNCE_MS: 2000,
};

/**
 * Standard Minecraft Java hostile mob identifiers.
 */
export const HOSTILE_MOB_TYPES = new Set([
  'zombie',
  'skeleton',
  'creeper',
  'spider',
  'cave_spider',
  'enderman',
  'witch',
  'phantom',
  'drowned',
  'husk',
  'stray',
  'pillager',
  'vindicator',
  'evoker',
  'ravager',
  'warden',
  'blaze',
  'ghast',
  'magma_cube',
  'slime',
  'wither_skeleton',
  'piglin_brute',
  'zombified_piglin',
]);
