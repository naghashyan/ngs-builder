/**
 * NGS CLI
 *
 * @author Naghashyan Solutions LLC
 * @site https://naghashyan.com
 * @year 2026
 * @package @naghashyan/ngs-builder
 *
 * Unified NGS command-line tools for project setup, module installation,
 * migrations orchestration, and legacy JS building.
 */

import {spawn} from 'node:child_process';

/**
 * Executes external commands for Composer, npm, and migration binaries.
 *
 * Centralizing process execution makes dry-run behavior consistent and keeps
 * tests from accidentally running real package managers or database migrations.
 */
export default class CommandRunner {
  /**
   * Run a command and reject when it exits unsuccessfully.
   *
   * @param {string} command Executable name or absolute binary path.
   * @param {string[]} [args] Command arguments.
   * @param {{cwd?: string, dryRun?: boolean, stdio?: import('node:child_process').StdioOptions, env?: NodeJS.ProcessEnv}} [options] Execution options.
   * @returns {Promise<{command: string, args: string[], cwd: string, code: number}>} Execution result.
   */
  async run(command, args = [], options = {}) {
    const commandText = [command, ...args].join(' ');
    if (options.dryRun) {
      console.log(`[dry-run] ${commandText}`);
      return {command, args, cwd: options.cwd ?? process.cwd(), code: 0};
    }

    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: options.cwd ?? process.cwd(),
        shell: process.platform === 'win32',
        stdio: options.stdio ?? 'inherit',
        env: options.env ?? process.env
      });

      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) {
          resolve({command, args, cwd: options.cwd ?? process.cwd(), code});
          return;
        }
        reject(new Error(`Command failed (${code}): ${commandText}`));
      });
    });
  }
}
