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
 * Installs backend Composer packages for NGS modules.
 *
 * Composer behavior is isolated here so module installation can be tested by
 * inspecting command construction instead of invoking Composer directly.
 */
export default class ComposerInstaller {
  /**
   * Process runner used to execute or dry-run Composer commands.
   *
   * @type {import('../process/CommandRunner.js').default}
   */
  #runner;

  /**
   * Backend project root where Composer should run.
   *
   * @type {string}
   */
  #projectRoot;

  /**
   * Create a Composer installer for one backend project.
   *
   * @param {import('../process/CommandRunner.js').default} runner Command runner.
   * @param {string} [projectRoot] Backend root containing `composer.json`.
   */
  constructor(runner, projectRoot = process.cwd()) {
    this.#runner = runner;
    this.#projectRoot = path.resolve(projectRoot);
  }

  /**
   * Install a Composer package into the backend project.
   *
   * @param {?string} packageName Composer package constraint.
   * @param {{dryRun?: boolean, noInteraction?: boolean}} [options] Install options.
   * @returns {Promise<?object>} Command result or null when no package is needed.
   */
  async install(packageName, options = {}) {
    if (!packageName) {
      return null;
    }
    const {command, args, cwd} = this.buildCommand(packageName, options);
    return this.#runner.run(command, args, {cwd, dryRun: options.dryRun});
  }

  /**
   * Build the Composer command without executing it.
   *
   * @param {string} packageName Composer package constraint.
   * @param {{noInteraction?: boolean}} [options] Command options.
   * @returns {{command: string, args: string[], cwd: string}} Command descriptor.
   */
  buildCommand(packageName, options = {}) {
    const args = ['require', packageName];
    if (options.noInteraction ?? true) {
      args.push('--no-interaction');
    }
    return {command: 'composer', args, cwd: this.#projectRoot};
  }
}
