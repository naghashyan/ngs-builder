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
 * Small JSON reader/writer with per-process caching.
 *
 * The cache avoids repeatedly parsing the same project metadata while keeping
 * writes coherent by updating the cached value after every write.
 */
export default class JsonFileCache {
  /**
   * Map of absolute JSON file paths to parsed values.
   *
   * @type {Map<string, unknown>}
   */
  #cache = new Map();

  /**
   * Read and parse a JSON file, returning the cached value on later calls.
   *
   * @param {string} filePath JSON file path.
   * @returns {unknown} Parsed JSON value.
   */
  read(filePath) {
    const normalizedPath = path.resolve(filePath);
    if (this.#cache.has(normalizedPath)) {
      return this.#cache.get(normalizedPath);
    }
    if (!fs.existsSync(normalizedPath)) {
      throw new Error(`JSON file not found: ${normalizedPath}`);
    }
    const value = JSON.parse(fs.readFileSync(normalizedPath, 'utf8'));
    this.#cache.set(normalizedPath, value);
    return value;
  }

  /**
   * Write formatted JSON and update the cache for future reads.
   *
   * @param {string} filePath Destination JSON file.
   * @param {unknown} value JSON-serializable value.
   * @returns {Promise<void>}
   */
  async write(filePath, value) {
    const normalizedPath = path.resolve(filePath);
    await fsp.mkdir(path.dirname(normalizedPath), {recursive: true});
    await fsp.writeFile(normalizedPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    this.#cache.set(normalizedPath, value);
  }
}
