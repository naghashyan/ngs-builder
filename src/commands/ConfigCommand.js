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
 * Implements `ngs config` commands for reading and updating `.ngs/config.json`.
 *
 * Configuration management is intentionally separated from initialization so
 * projects can safely update paths and registry settings without reinstalling
 * packages or touching the database.
 */
export default class ConfigCommand {
  /**
   * Local project configuration store.
   *
   * @type {import('../config/NgsConfig.js').default}
   */
  #ngsConfig;

  /**
   * Create the command with a project-scoped config store.
   *
   * @param {import('../config/NgsConfig.js').default} ngsConfig Config reader/writer.
   */
  constructor(ngsConfig) {
    this.#ngsConfig = ngsConfig;
  }

  /**
   * Attach `ngs config`, `ngs config get`, and `ngs config set` commands.
   *
   * @param {import('commander').Command} program Root Commander program.
   * @returns {void}
   */
  register(program) {
    const config = program
      .command('config')
      .description('View or update local NGS project configuration')
      .action(() => this.show());

    config
      .command('get [key]')
      .description('Get all config or one config value')
      .action((key) => this.get(key));

    config
      .command('set <key> <value>')
      .description('Set a config value')
      .action((key, value) => this.set(key, value));
  }

  /**
   * Print and return the whole config object, creating defaults if needed.
   *
   * @returns {Promise<object>} Current config.
   */
  async show() {
    const config = await this.#ensureConfig();
    console.log(JSON.stringify(config, null, 2));
    return config;
  }

  /**
   * Print and return either the whole config or a single top-level value.
   *
   * @param {?string} [key] Optional top-level config key.
   * @returns {Promise<unknown>} Requested config value or full config.
   */
  async get(key = null) {
    const config = await this.#ensureConfig();
    if (!key) {
      console.log(JSON.stringify(config, null, 2));
      return config;
    }
    const value = config[key] ?? null;
    console.log(value === null ? '' : String(value));
    return value;
  }

  /**
   * Set a top-level config value and persist it to `.ngs/config.json`.
   *
   * @param {string} key Top-level config key.
   * @param {string} value Raw CLI value.
   * @returns {Promise<object>} Updated config object.
   */
  async set(key, value) {
    const config = await this.#ensureConfig();
    config[key] = this.#normalizeValue(key, value);
    await this.#ngsConfig.write(config);
    console.log(`NGS config updated: ${key}`);
    return config;
  }

  /**
   * Ensure the config file has at least a backend root before reads or writes.
   *
   * This makes `ngs config` useful in a fresh repository without forcing users
   * through the heavier `ngs init` flow.
   *
   * @returns {Promise<object>} Existing or newly-created config.
   */
  async #ensureConfig() {
    const existing = this.#ngsConfig.read();
    if (existing.backendRoot) {
      return existing;
    }
    const backendRoot = this.#ngsConfig.findComposerRoot();
    const config = {...existing, backendRoot: backendRoot ?? this.#ngsConfig.projectRoot};
    await this.#ngsConfig.write(config);
    return config;
  }

  /**
   * Convert CLI strings into stable config values.
   *
   * Paths are resolved relative to the project root to avoid later commands
   * depending on the shell's current working directory.
   *
   * @param {string} key Config key being set.
   * @param {string} value Raw CLI value.
   * @returns {string|boolean|null} Normalized value.
   */
  #normalizeValue(key, value) {
    if (key === 'frontendRoot' || key === 'backendRoot') {
      return path.resolve(this.#ngsConfig.projectRoot, value);
    }
    if (value === 'null') {
      return null;
    }
    if (value === 'true') {
      return true;
    }
    if (value === 'false') {
      return false;
    }
    return value;
  }
}
