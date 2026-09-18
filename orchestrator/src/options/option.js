import EventEmitter from 'events';

/**
 * Base Option class following the Hierarchical RL Options Framework <I, pi, beta>.
 */
export class Option extends EventEmitter {
  /**
   * @param {string} id - Unique identifier for the option instance.
   * @param {string} type - 'discrete_mineflayer' | 'continuous_vpt'
   * @param {Record<string, any>} [params={}] - Parameters passed to the policy.
   * @param {number} [timeoutSeconds=30] - Max timeout boundary.
   */
  constructor(id, type, params = {}, timeoutSeconds = 30) {
    super();
    this.id = id;
    this.type = type;
    this.params = params;
    this.timeoutSeconds = timeoutSeconds;
    this.status = 'PENDING'; // 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILURE' | 'TIMEOUT' | 'INTERRUPTED'
    this.startTime = null;
    this.endTime = null;
  }

  /**
   * Initiation condition I_omega(s): determines if this option can be started.
   * @param {Record<string, any>} state
   * @returns {boolean}
   */
  canInitiate(state) {
    return true;
  }

  /**
   * Termination condition beta_omega(s): determines if this option has completed.
   * @param {Record<string, any>} state
   * @param {Record<string, any>} metrics
   * @returns {boolean}
   */
  shouldTerminate(state, metrics = {}) {
    if (this.startTime && (Date.now() - this.startTime) / 1000 >= this.timeoutSeconds) {
      return true;
    }
    return false;
  }

  /**
   * Executes the intra-option policy pi_omega.
   * @param {Record<string, any>} context - Bridge, controller, or VPT client.
   * @returns {Promise<Record<string, any>>}
   */
  async execute(context) {
    throw new Error('Option.execute() must be implemented by subclass.');
  }
}

/**
 * Discrete Mineflayer Option (high-level action via llm-controller or bridge).
 */
export class MineflayerOption extends Option {
  constructor(id, action, params = {}, timeoutSeconds = 30) {
    super(id, 'discrete_mineflayer', params, timeoutSeconds);
    this.action = action; // 'moveTo' | 'mineBlock' | 'placeBlock' | 'craftItem' | 'equipItem'
  }

  async execute(context) {
    this.status = 'RUNNING';
    this.startTime = Date.now();
    this.emit('option:start', { id: this.id, action: this.action, params: this.params });

    try {
      const executor = context.executor || context.llmController?.executor;
      if (!executor) {
        throw new Error('No ActionExecutor available in context.');
      }

      const execResult = await executor.execute(this.action, this.params);
      this.endTime = Date.now();
      const elapsed = (this.endTime - this.startTime) / 1000;

      if (execResult.success) {
        this.status = 'SUCCESS';
        const result = {
          optionId: this.id,
          type: this.type,
          action: this.action,
          status: 'SUCCESS',
          durationSeconds: elapsed,
          data: execResult.data,
          terminationReason: 'ACTION_COMPLETED',
        };
        this.emit('option:complete', result);
        return result;
      } else {
        this.status = 'FAILURE';
        const result = {
          optionId: this.id,
          type: this.type,
          action: this.action,
          status: 'FAILURE',
          durationSeconds: elapsed,
          error: execResult.error,
          terminationReason: 'ACTION_FAILED',
        };
        this.emit('option:failure', result);
        return result;
      }
    } catch (err) {
      this.status = 'FAILURE';
      this.endTime = Date.now();
      const result = {
        optionId: this.id,
        type: this.type,
        action: this.action,
        status: 'FAILURE',
        durationSeconds: (this.endTime - this.startTime) / 1000,
        error: err.message || err,
        terminationReason: 'EXCEPTION',
      };
      this.emit('option:failure', result);
      return result;
    }
  }
}

/**
 * Continuous VPT Visual Skill Option.
 */
export class VPTSkillOption extends Option {
  constructor(id, instruction, params = {}, timeoutSeconds = 30) {
    super(id, 'continuous_vpt', params, timeoutSeconds);
    this.instruction = instruction; // e.g. 'chop tree', 'get sand', 'kill mob'
    this.maxTicks = params.maxTicks ?? 40;
  }

  async execute(context) {
    this.status = 'RUNNING';
    this.startTime = Date.now();
    this.emit('option:start', { id: this.id, instruction: this.instruction, maxTicks: this.maxTicks });

    try {
      const vptClient = context.vptClient;
      if (!vptClient) {
        throw new Error('No VPTClient available in context.');
      }

      const vptResult = await vptClient.runSkill({
        instruction: this.instruction,
        maxTicks: this.maxTicks,
        dryRun: context.dryRun ?? true,
      });

      this.endTime = Date.now();
      const elapsed = (this.endTime - this.startTime) / 1000;

      this.status = vptResult.status === 'SUCCESS' ? 'SUCCESS' : 'FAILURE';
      const result = {
        optionId: this.id,
        type: this.type,
        instruction: this.instruction,
        status: this.status,
        durationSeconds: elapsed,
        ticksExecuted: vptResult.ticksExecuted,
        avgFps: vptResult.avgFps,
        terminationReason: vptResult.terminationReason || 'MAX_TICKS_REACHED',
        error: vptResult.error,
      };

      if (this.status === 'SUCCESS') {
        this.emit('option:complete', result);
      } else {
        this.emit('option:failure', result);
      }
      return result;
    } catch (err) {
      this.status = 'FAILURE';
      this.endTime = Date.now();
      const result = {
        optionId: this.id,
        type: this.type,
        instruction: this.instruction,
        status: 'FAILURE',
        durationSeconds: (this.endTime - this.startTime) / 1000,
        error: err.message || err,
        terminationReason: 'EXCEPTION',
      };
      this.emit('option:failure', result);
      return result;
    }
  }
}
