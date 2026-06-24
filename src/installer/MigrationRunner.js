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

import fs from 'node:fs';
import path from 'node:path';

/**
 * Runs the PHP-owned migration binary for the backend project.
 *
 * SQL execution stays in PHP because the backend already knows the NGS database
 * configuration and can share migration infrastructure across Composer modules.
 */
export default class MigrationRunner {
  /**
   * Process runner used to execute or dry-run migrations.
   *
   * @type {import('../process/CommandRunner.js').default}
   */
  #runner;

  /**
   * Backend project root where `vendor/bin/ngs-migrate` is expected.
   *
   * @type {string}
   */
  #projectRoot;

  /**
   * Create a migration runner for one backend project.
   *
   * @param {import('../process/CommandRunner.js').default} runner Command runner.
   * @param {string} [projectRoot] Backend project root.
   */
  constructor(runner, projectRoot = process.cwd()) {
    this.#runner = runner;
    this.#projectRoot = path.resolve(projectRoot);
  }

  /**
   * Execute or dry-run backend migrations.
   *
   * @param {{dryRun?: boolean}} [options] Execution options.
   * @returns {Promise<object>} Command result.
   */
  async run(options = {}) {
    const {command, args, cwd} = this.buildCommand();
    return this.#runner.run(command, args, {cwd, dryRun: options.dryRun});
  }

  /**
   * Build the platform-aware migration command descriptor.
   *
   * Windows gets a `php vendor/bin/ngs-migrate` form so PHP scripts work even
   * when executable bits are not meaningful.
   *
   * @returns {{command: string, args: string[], cwd: string}} Command descriptor.
   */
  buildCommand() {
    const binary = this.#binaryPath();
    if (process.platform === 'win32') {
      return {command: 'php', args: [binary], cwd: this.#projectRoot};
    }
    return {command: binary, args: [], cwd: this.#projectRoot};
  }

  /**
   * Resolve the migration binary path for the current platform.
   *
   * @returns {string} Migration binary path.
   */
  #binaryPath() {
    const unixPath = path.join(this.#projectRoot, 'vendor', 'bin', 'ngs-migrate');
    const batPath = `${unixPath}.bat`;
    if (process.platform === 'win32' && fs.existsSync(batPath)) {
      return batPath;
    }
    return unixPath;
  }
}
