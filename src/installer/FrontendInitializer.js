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
import fsp from 'node:fs/promises';
import path from 'node:path';

/**
 * Base frontend packages required for a new NGS admin frontend project.
 *
 * @type {string[]}
 */
const BASE_FRONTEND_PACKAGES = [
  '@naghashyan/ngs-front-core',
  '@naghashyan/ngs-front-admin-tools'
];

/**
 * Initializes the frontend side of an NGS project.
 *
 * This service owns npm bootstrap behavior so `ngs init` can create a usable
 * frontend without mixing npm details into command parsing.
 */
export default class FrontendInitializer {
  /**
   * Process runner used for npm init and npm install commands.
   *
   * @type {import('../process/CommandRunner.js').default}
   */
  #runner;

  /**
   * Create the frontend initializer.
   *
   * @param {import('../process/CommandRunner.js').default} runner Command runner.
   */
  constructor(runner) {
    this.#runner = runner;
  }

  /**
   * Return the base frontend packages as a copy to avoid accidental mutation.
   *
   * @returns {string[]} Base npm package names.
   */
  get basePackages() {
    return [...BASE_FRONTEND_PACKAGES];
  }

  /**
   * Create/prepare the frontend folder and install base packages.
   *
   * @param {?string} frontendRoot Frontend directory to initialize.
   * @param {{dryRun?: boolean}} [options] Execution options.
   * @returns {Promise<?{frontendRoot: string, packages: string[]}>} Init result or null when skipped.
   */
  async init(frontendRoot, options = {}) {
    if (!frontendRoot) {
      return null;
    }
    const root = path.resolve(frontendRoot);
    await fsp.mkdir(root, {recursive: true});

    const packageJsonPath = path.join(root, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      await this.#runner.run('npm', ['init', '-y'], {cwd: root, dryRun: options.dryRun});
    }

    await this.#runner.run('npm', ['install', ...BASE_FRONTEND_PACKAGES], {cwd: root, dryRun: options.dryRun});
    return {frontendRoot: root, packages: this.basePackages};
  }

  /**
   * Build the npm commands needed for frontend initialization.
   *
   * This is useful for tests and future dry-run UIs that want to show the plan
   * before executing it.
   *
   * @param {string} frontendRoot Frontend directory to initialize.
   * @returns {Array<{command: string, args: string[], cwd: string}>} Command descriptors.
   */
  buildCommands(frontendRoot) {
    const root = path.resolve(frontendRoot);
    const commands = [];
    if (!fs.existsSync(path.join(root, 'package.json'))) {
      commands.push({command: 'npm', args: ['init', '-y'], cwd: root});
    }
    commands.push({command: 'npm', args: ['install', ...BASE_FRONTEND_PACKAGES], cwd: root});
    return commands;
  }
}
