import EventEmitter from 'events';
import { VPTClient } from './clients/vpt-client.js';
import { MineflayerOption, VPTSkillOption } from './options/option.js';

/**
 * StevanOrchestrator manages hierarchical goal chains combining
 * high-level LLM discrete planning with low-level VPT visual motor execution.
 */
export class StevanOrchestrator extends EventEmitter {
  /**
   * @param {Object} [options={}]
   * @param {Object} [options.executor] - ActionExecutor instance
   * @param {Object} [options.vptClient] - Injected VPTClient instance
   * @param {boolean} [options.dryRun=true]
   */
  constructor(options = {}) {
    super();
    this.executor = options.executor || null;
    this.vptClient = options.vptClient || new VPTClient();
    this.dryRun = options.dryRun ?? true;
    this.currentOption = null;
    this.activeMission = null;
  }

  setExecutor(executor) {
    this.executor = executor;
  }

  /**
   * Executes a sequential goal chain of Options.
   * @param {Array<import('./options/option.js').Option>} optionsChain
   * @param {Record<string, any>} [worldState={}]
   * @returns {Promise<Object>}
   */
  async executeGoalChain(optionsChain, worldState = {}) {
    const missionId = `mission_${Date.now()}`;
    this.activeMission = missionId;
    this.emit('mission:start', { missionId, totalOptions: optionsChain.length });

    const trace = [];
    const context = {
      executor: this.executor,
      vptClient: this.vptClient,
      dryRun: this.dryRun,
    };

    let missionSuccess = true;
    const missionStartTime = Date.now();

    for (let i = 0; i < optionsChain.length; i++) {
      const option = optionsChain[i];
      this.currentOption = option;

      // 1. Check initiation condition I_omega(s)
      if (!option.canInitiate(worldState)) {
        const failureRecord = {
          optionId: option.id,
          type: option.type,
          status: 'INITIATION_REJECTED',
          reason: 'Preconditions not met.',
        };
        trace.push(failureRecord);
        this.emit('option:initiation_failed', failureRecord);
        missionSuccess = false;
        break;
      }

      this.emit('option:step', { step: i + 1, total: optionsChain.length, optionId: option.id, type: option.type });

      // 2. Execute intra-option policy pi_omega
      const executionRecord = await option.execute(context);
      trace.push(executionRecord);

      // 3. Termination condition check
      if (executionRecord.status !== 'SUCCESS') {
        missionSuccess = false;
        this.emit('mission:failed', {
          missionId,
          failedAtStep: i + 1,
          failedOption: option.id,
          reason: executionRecord.error || executionRecord.terminationReason,
        });
        break;
      }
    }

    const totalDuration = (Date.now() - missionStartTime) / 1000;
    const missionResult = {
      missionId,
      status: missionSuccess ? 'SUCCESS' : 'FAILED',
      totalDurationSeconds: round(totalDuration, 3),
      optionsExecuted: trace.length,
      trace,
    };

    this.currentOption = null;
    this.activeMission = null;

    if (missionSuccess) {
      this.emit('mission:complete', missionResult);
    }
    return missionResult;
  }
}

function round(val, dec = 2) {
  return Math.round(val * 10 ** dec) / 10 ** dec;
}

export default StevanOrchestrator;
