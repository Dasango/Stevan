import { TripwireManager } from './tripwire-manager.js';
import { TRIPWIRE_IDS, TRIPWIRE_THRESHOLDS, HOSTILE_MOB_TYPES } from './thresholds.js';
import { buildStateSnapshot } from './snapshot.js';

export {
  TripwireManager,
  TRIPWIRE_IDS,
  TRIPWIRE_THRESHOLDS,
  HOSTILE_MOB_TYPES,
  buildStateSnapshot,
};

if (process.argv[1] && process.argv[1].endsWith('index.js')) {
  console.log('====================================================');
  console.log(' Stevan Event Triggers — Reactive Failure Detection');
  console.log('====================================================');
  console.log('Mode: Pure Event-Driven (Zero Polling Intervals)');
  console.log('Active Tripwires:');
  for (const [name, id] of Object.entries(TRIPWIRE_IDS)) {
    console.log(` - ${name}: ${id}`);
  }
  console.log('====================================================');
}
