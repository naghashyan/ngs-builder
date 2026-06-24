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

import path from 'node:path';

/**
 * Installs frontend npm packages declared by NGS modules.
 *
 * npm package execution is isolated here so module installation can compose
 * frontend steps without knowing npm command details.
 */
export default class NpmInstaller {
  /**
   * Process runner used to execute or dry-run npm commands.
   *
   * @type {import('../process/CommandRunner.js').default}
   */
  #runner;

  /**
   * Create an npm installer.
   *
   * @param {import('../process/CommandRunner.js').default} runner Command runner.
   */
  constructor(runner) {
    this.#runner = runner;
  }

  /**
   * Install a frontend package into the configured frontend root.
   *
   * @param {?string} packageName npm package name.
   * @param {?string} frontendRoot Frontend project directory.
   * @param {{dryRun?: boolean}} [options] Execution options.
   * @returns {Promise<?object>} Command result or null when skipped.
   */
  async install(packageName, frontendRoot, options = {}) {
    if (!packageName || !frontendRoot) {
      return null;
    }
    const {command, args, cwd} = this.buildCommand(packageName, frontendRoot);
    return this.#runner.run(command, args, {cwd, dryRun: options.dryRun});
  }

  /**
   * Build an npm install command descriptor without executing it.
   *
   * @param {string} packageName npm package name.
   * @param {string} frontendRoot Frontend project directory.
   * @returns {{command: string, args: string[], cwd: string}} Command descriptor.
   */
  buildCommand(packageName, frontendRoot) {
    return {command: 'npm', args: ['install', packageName], cwd: path.resolve(frontendRoot)};
  }
}
