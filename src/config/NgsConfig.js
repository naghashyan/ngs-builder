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
import JsonFileCache from './JsonFileCache.js';

/**
 * Reads and writes local project configuration.
 *
 * The config store centralizes `.ngs/config.json` path handling so commands do
 * not duplicate backend-root detection or persistence details.
 */
export default class NgsConfig {
  /**
   * Directory where `.ngs/config.json` should live.
   *
   * @type {string}
   */
  #projectRoot;

  /**
   * JSON cache used to avoid reparsing config during one CLI invocation.
   *
   * @type {JsonFileCache}
   */
  #jsonCache;

  /**
   * Create a config store scoped to a project root.
   *
   * @param {string} [projectRoot] Project directory.
   * @param {JsonFileCache} [jsonCache] Shared JSON cache.
   */
  constructor(projectRoot = process.cwd(), jsonCache = new JsonFileCache()) {
    this.#projectRoot = path.resolve(projectRoot);
    this.#jsonCache = jsonCache;
  }

  /**
   * Return the project root used by this config store.
   *
   * @returns {string} Absolute project root path.
   */
  get projectRoot() {
    return this.#projectRoot;
  }

  /**
   * Return the absolute `.ngs/config.json` path.
   *
   * @returns {string} Config file path.
   */
  get configPath() {
    return path.join(this.#projectRoot, '.ngs', 'config.json');
  }

  /**
   * Check whether the local config file already exists.
   *
   * @returns {boolean} True when `.ngs/config.json` exists.
   */
  exists() {
    return fs.existsSync(this.configPath);
  }

  /**
   * Read the local config or return an empty object for fresh projects.
   *
   * @returns {object} Parsed config object.
   */
  read() {
    if (!this.exists()) {
      return {};
    }
    return this.#jsonCache.read(this.configPath);
  }

  /**
   * Persist the local config with stable formatting.
   *
   * @param {object} config Config object to write.
   * @returns {Promise<void>}
   */
  async write(config) {
    await this.#jsonCache.write(this.configPath, config);
  }

  /**
   * Walk upward from projectRoot until a Composer backend root is found.
   *
   * @returns {?string} Directory containing `composer.json`, or null if missing.
   */
  findComposerRoot() {
    let current = this.#projectRoot;
    while (true) {
      if (fs.existsSync(path.join(current, 'composer.json'))) {
        return current;
      }
      const parent = path.dirname(current);
      if (parent === current) {
        return null;
      }
      current = parent;
    }
  }
}
