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
import JsonFileCache from '../config/JsonFileCache.js';

/**
 * Creates the legacy symlink layout described by `web/js/builder.json`.
 *
 * This mirrors old NGS builder behavior while validating missing source files
 * early so broken module references fail with actionable errors.
 */
export default class LegacyJsUpdater {
  /**
   * Module resolver used to locate each builder source and destination.
   *
   * @type {import('./LegacyModuleResolver.js').default}
   */
  #resolver;

  /**
   * JSON cache for builder config reads.
   *
   * @type {JsonFileCache}
   */
  #jsonCache;

  /**
   * Modules visited during one update run, used to avoid include cycles.
   *
   * @type {Set<string>}
   */
  #visited = new Set();

  /**
   * Create a legacy symlink updater.
   *
   * @param {import('./LegacyModuleResolver.js').default} resolver Module resolver.
   * @param {JsonFileCache} [jsonCache] Shared JSON cache.
   */
  constructor(resolver, jsonCache = new JsonFileCache()) {
    this.#resolver = resolver;
    this.#jsonCache = jsonCache;
  }

  /**
   * Update symlinks for one module and any included modules.
   *
   * @param {?string} [module] Module name to update.
   * @param {{module?: string, force?: boolean}} [options] Update options.
   * @returns {Promise<Array<{sourcePath: string, outPath: string}>>} Created symlink records.
   */
  async update(module = null, options = {}) {
    const selectedModule = module ?? options.module ?? 'default';
    if (this.#visited.has(selectedModule)) {
      return [];
    }
    this.#visited.add(selectedModule);

    this.#resolver.assertBuilderJson(selectedModule);
    const builderJson = this.#jsonCache.read(this.#resolver.builderJsonPath(selectedModule));
    const created = [];

    for (const builder of builderJson.builders ?? []) {
      if (builder.include) {
        created.push(...await this.update(builder.include, options));
        continue;
      }
      created.push(...await this.#createBuilderLinks(builder, options.force ?? false, selectedModule));
    }
    return created;
  }

  /**
   * Create symlinks for one builder entry.
   *
   * @param {object} builder Builder entry from builder.json.
   * @param {boolean} force Whether existing links/files should be replaced.
   * @param {string} currentModule Destination module being updated.
   * @returns {Promise<Array<{sourcePath: string, outPath: string}>>} Created symlink records.
   */
  async #createBuilderLinks(builder, force, currentModule) {
    let targetDir = this.#resolver.jsModulePath(builder.module);
    if (builder.source_dir) {
      targetDir = path.resolve(targetDir, builder.source_dir);
    }
    const outDir = builder.out_dir ?? builder.module;
    const outDirPath = path.resolve(this.#resolver.jsModulePath(currentModule), outDir);
    await fsp.mkdir(outDirPath, {recursive: true});

    const created = [];
    for (const jsFile of builder.files ?? []) {
      const sourcePath = path.resolve(targetDir, jsFile);
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`Source JS file not found: ${sourcePath}`);
      }

      const outPath = path.resolve(outDirPath, jsFile);
      await fsp.mkdir(path.dirname(outPath), {recursive: true});
      if (fs.existsSync(outPath)) {
        if (!force) {
          continue;
        }
        await fsp.rm(outPath, {force: true});
      }
      await fsp.symlink(sourcePath, outPath);
      created.push({sourcePath, outPath});
      console.log(`${sourcePath} ----> created`);
    }
    return created;
  }
}
