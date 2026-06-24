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
import readline from 'node:readline/promises';
import {stdin as input, stdout as output} from 'node:process';

/**
 * Implements first-time NGS project bootstrap.
 *
 * `ngs init` is allowed to perform package installation because the command is
 * explicitly about creating a usable project. Later config changes should use
 * `ngs config`, which does not reinstall dependencies.
 */
export default class InitCommand {
  /**
   * Project config store used to read and persist `.ngs/config.json`.
   *
   * @type {import('../config/NgsConfig.js').default}
   */
  #ngsConfig;

  /**
   * Frontend bootstrap service for npm initialization and base package install.
   *
   * @type {import('../installer/FrontendInitializer.js').default}
   */
  #frontendInitializer;

  /**
   * Module installer used when `--with-admin-tools` is requested.
   *
   * @type {import('../installer/ModuleInstaller.js').default}
   */
  #moduleInstaller;

  /**
   * Create the init command with its backend and frontend orchestration services.
   *
   * @param {import('../config/NgsConfig.js').default} ngsConfig Config reader/writer.
   * @param {import('../installer/FrontendInitializer.js').default} frontendInitializer Frontend initializer.
   * @param {import('../installer/ModuleInstaller.js').default} moduleInstaller Backend module installer.
   */
  constructor(ngsConfig, frontendInitializer, moduleInstaller) {
    this.#ngsConfig = ngsConfig;
    this.#frontendInitializer = frontendInitializer;
    this.#moduleInstaller = moduleInstaller;
  }

  /**
   * Attach `ngs init` to the Commander program.
   *
   * @param {import('commander').Command} program Root Commander program.
   * @returns {void}
   */
  register(program) {
    program
      .command('init')
      .description('Initialize an NGS backend project and optional frontend app')
      .option('--frontend <path>', 'frontend folder path to create or initialize')
      .option('--skip-front', 'skip frontend initialization')
      .option('--with-admin-tools', 'install backend admin-tools module during init')
      .option('--registry <source>', 'module registry URL, file, or directory')
      .option('--dry-run', 'print commands without executing them')
      .action((options) => this.run(options));
  }

  /**
   * Initialize backend config, optional frontend packages, and optional admin-tools.
   *
   * @param {{frontend?: string, skipFront?: boolean, withAdminTools?: boolean, registry?: string, dryRun?: boolean}} [options] Init options.
   * @returns {Promise<object>} Persisted project config.
   */
  async run(options = {}) {
    const existing = this.#ngsConfig.read();
    const backendRoot = this.#ngsConfig.findComposerRoot();
    if (!backendRoot) {
      throw new Error('composer.json was not found. Run ngs init from an NGS backend project.');
    }

    const config = {...existing, backendRoot};
    config.registry = options.registry ?? existing.registry ?? null;

    if (!options.skipFront) {
      const frontendRoot = options.frontend ?? existing.frontendRoot ?? await this.#askFrontendRoot();
      if (frontendRoot) {
        const initialized = await this.#frontendInitializer.init(path.resolve(backendRoot, frontendRoot), {dryRun: options.dryRun ?? false});
        config.frontendRoot = initialized.frontendRoot;
        config.frontend = {
          initialized: true,
          packages: initialized.packages
        };
      }
    }

    await this.#ngsConfig.write(config);

    if (options.withAdminTools) {
      await this.#moduleInstaller.install('admin-tools', {
        frontendRoot: config.frontendRoot,
        dryRun: options.dryRun ?? false
      });
    }

    console.log(`NGS project initialized: ${this.#ngsConfig.configPath}`);
    return config;
  }

  /**
   * Prompt for a frontend folder only when the terminal can accept input.
   *
   * Non-interactive environments return null so CI and scripted installs never
   * hang waiting for a prompt.
   *
   * @returns {Promise<?string>} Frontend path or null when skipped.
   */
  async #askFrontendRoot() {
    if (!process.stdin.isTTY) {
      return null;
    }
    const rl = readline.createInterface({input, output});
    const answer = await rl.question('Frontend folder path (empty to skip): ');
    rl.close();
    return answer.trim() || null;
  }
}
