import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * VPTClient bridges the Node orchestrator to the Python VPT neural vision runner.
 */
export class VPTClient {
  /**
   * @param {Record<string, any>} [options={}]
   * @param {Function} [customRunner] - Injected executor for tests.
   */
  constructor(options = {}, customRunner = null) {
    this.customRunner = customRunner;
    const vptRoot = path.resolve(__dirname, '../../../vpt-bridge');
    this.pythonExe =
      options.pythonExe ||
      path.resolve(vptRoot, '.venv/Scripts/python.exe');
    this.vptCwd = vptRoot;
  }

  /**
   * Invokes a continuous visual skill in the Python VPT bridge.
   * @param {Object} params
   * @param {string} params.instruction - Natural language skill prompt (e.g. 'chop tree')
   * @param {number} [params.maxTicks=40] - Number of ticks to run
   * @param {boolean} [params.dryRun=true] - Dry run flag
   * @returns {Promise<Object>}
   */
  async runSkill({ instruction, maxTicks = 40, dryRun = true }) {
    if (this.customRunner) {
      return await this.customRunner({ instruction, maxTicks, dryRun });
    }

    return new Promise((resolve, reject) => {
      const args = [
        '-m',
        'vpt_bridge.cli',
        '--instruction',
        instruction,
        '--max-ticks',
        String(maxTicks),
      ];
      if (dryRun) {
        args.push('--dry-run');
      }

      const child = spawn(this.pythonExe, args, {
        cwd: this.vptCwd,
        env: { ...process.env, PYTHONPATH: '.' },
      });

      let stdoutData = '';
      let stderrData = '';

      child.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      child.on('close', (code) => {
        if (code !== 0 && !stdoutData.trim()) {
          return reject(
            new Error(
              `VPT runner exited with code ${code}. Stderr: ${stderrData.trim() || 'none'}`
            )
          );
        }

        try {
          const lines = stdoutData.trim().split('\n');
          const lastLine = lines[lines.length - 1];
          const result = JSON.parse(lastLine);
          resolve(result);
        } catch (err) {
          reject(
            new Error(
              `Failed to parse VPT output JSON: ${err.message}. Raw output: ${stdoutData}`
            )
          );
        }
      });

      child.on('error', (err) => {
        reject(new Error(`Failed to spawn VPT process: ${err.message}`));
      });
    });
  }
}

export default VPTClient;
