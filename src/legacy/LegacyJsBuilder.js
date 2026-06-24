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
import {minify} from 'terser';
import * as babel from '@babel/core';
import JsonFileCache from '../config/JsonFileCache.js';
import LegacyJsUpdater from './LegacyJsUpdater.js';

/**
 * Builds legacy NGS JavaScript modules into deployable output directories.
 *
 * The builder keeps the older `web/js/builder.json` workflow working while
 * making each step explicit: symlink update, version query injection,
 * minification, and optional ES5 generation.
 */
export default class LegacyJsBuilder {
  /**
   * Module resolver used for source, output, and builder config paths.
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
   * Symlink updater run before each build to refresh included module files.
   *
   * @type {LegacyJsUpdater}
   */
  #updater;

  /**
   * Create the legacy JS builder.
   *
   * @param {import('./LegacyModuleResolver.js').default} resolver Module resolver.
   * @param {JsonFileCache} [jsonCache] Shared JSON cache.
   * @param {?LegacyJsUpdater} [updater] Optional updater override for tests.
   */
  constructor(resolver, jsonCache = new JsonFileCache(), updater = null) {
    this.#resolver = resolver;
    this.#jsonCache = jsonCache;
    this.#updater = updater ?? new LegacyJsUpdater(resolver, jsonCache);
  }

  /**
   * Build a legacy module's JS files.
   *
   * @param {{type?: string, module?: string, version?: string, force?: boolean}} [options] Build options.
   * @returns {Promise<string[]>} Output file paths.
   */
  async build(options = {}) {
    if (options.type && options.type !== 'js') {
      throw new Error(`Unsupported build type: ${options.type}. Only js is supported.`);
    }

    const module = options.module ?? 'default';
    this.#resolver.assertModuleExists(module);
    this.#resolver.assertBuilderJson(module);
    await this.#updater.update(module, {force: options.force ?? true});

    const builderJson = this.#jsonCache.read(this.#resolver.builderJsonPath(module));
    const version = options.version || builderJson.version || '1.0.0';
    const compress = builderJson.compress ?? true;
    const buildEs5 = builderJson.es5 ?? false;
    const jsOutDir = path.resolve(this.#resolver.modulePath(module), builderJson.out_dir);
    const jsEs5OutDir = buildEs5 ? path.resolve(this.#resolver.projectRoot, builderJson.es5_out_dir) : null;
    const jsFiles = await this.#walkJsFiles(this.#resolver.jsModulePath(module));
    const outputs = [];

    for (const sourceFile of jsFiles) {
      const realSourceFile = fs.lstatSync(sourceFile).isSymbolicLink() ? fs.realpathSync(sourceFile) : sourceFile;
      const relativePath = path.relative(this.#resolver.jsModulePath(module), sourceFile);
      const outFile = path.resolve(jsOutDir, relativePath);
      const code = this.#appendVersion(await fsp.readFile(realSourceFile, 'utf8'), version, realSourceFile);
      const outputCode = compress ? (await minify(code, {module: true})).code : code;

      await fsp.mkdir(path.dirname(outFile), {recursive: true});
      await fsp.writeFile(outFile, outputCode ?? code, 'utf8');
      outputs.push(outFile);
      console.log(`${outFile} ===> DONE`);

      if (buildEs5 && jsEs5OutDir) {
        const es5File = path.resolve(jsEs5OutDir, relativePath);
        const es5Code = await this.#buildEs5(code);
        const es5OutputCode = compress ? (await minify(es5Code)).code : es5Code;
        await fsp.mkdir(path.dirname(es5File), {recursive: true});
        await fsp.writeFile(es5File, es5OutputCode ?? es5Code, 'utf8');
        outputs.push(es5File);
      }
    }
    return outputs;
  }

  /**
   * Recursively collect JS files from a module's web/js directory.
   *
   * @param {string} directory Directory to scan.
   * @returns {Promise<string[]>} JavaScript file paths.
   */
  async #walkJsFiles(directory) {
    if (!fs.existsSync(directory)) {
      throw new Error(`JS directory not found: ${directory}`);
    }
    const entries = await fsp.readdir(directory, {withFileTypes: true});
    const files = [];
    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        files.push(...await this.#walkJsFiles(entryPath));
      } else if ((entry.isFile() || entry.isSymbolicLink()) && entryPath.endsWith('.js')) {
        files.push(entryPath);
      }
    }
    return files;
  }

  /**
   * Add cache-busting version query strings to static and dynamic imports.
   *
   * @param {string} code Source code.
   * @param {string} version Build version.
   * @param {string} sourceFile Source file path.
   * @returns {string} Versioned source code.
   */
  #appendVersion(code, version, sourceFile) {
    let output = code.replace(/(import\s.*?\.js)/gm, `$1?${version}`);
    if (sourceFile.includes('NGS.js')) {
      output = output.replace(/import\(([^)]+)\)/gm, `import($1+'?${version}')`);
    }
    return output;
  }

  /**
   * Transpile module code for legacy ES5 output.
   *
   * @param {string} code Modern JavaScript source.
   * @returns {Promise<string>} Transpiled code.
   */
  async #buildEs5(code) {
    const result = await babel.transformAsync(code, {
      sourceType: 'module',
      presets: ['@babel/preset-env'],
      plugins: [
        '@babel/plugin-transform-arrow-functions',
        '@babel/plugin-transform-modules-systemjs'
      ]
    });
    return result?.code ?? code;
  }
}
