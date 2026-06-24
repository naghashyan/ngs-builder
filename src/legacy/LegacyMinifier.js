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

/**
 * Builds minified bundles from legacy builder config files.
 *
 * This is retained for projects that bundle selected utility files outside the
 * per-module JS build flow.
 */
export default class LegacyMinifier {
  /**
   * Root directory used to resolve source and output paths.
   *
   * @type {string}
   */
  #projectRoot;

  /**
   * JSON cache for minifier config reads.
   *
   * @type {JsonFileCache}
   */
  #jsonCache;

  /**
   * Create a legacy bundle minifier.
   *
   * @param {string} [projectRoot] Project root.
   * @param {JsonFileCache} [jsonCache] Shared JSON cache.
   */
  constructor(projectRoot = process.cwd(), jsonCache = new JsonFileCache()) {
    this.#projectRoot = path.resolve(projectRoot);
    this.#jsonCache = jsonCache;
  }

  /**
   * Minify the files listed in a builder config.
   *
   * @param {string} inputFile Config path relative to project root.
   * @returns {Promise<string[]>} Output file paths.
   */
  async minify(inputFile) {
    if (!inputFile) {
      throw new Error('Missing minify input file. Use -i web/js/util/builder.json.');
    }
    const builderPath = path.resolve(this.#projectRoot, inputFile);
    const builderJson = this.#jsonCache.read(builderPath);
    const jsCode = await this.#readSourceFiles(builderJson);
    const buildEs5 = builderJson.es5 ?? false;
    const compress = builderJson.compress ?? false;
    const outFile = path.resolve(this.#projectRoot, builderJson.out_file);
    const outCode = compress ? (await minify(jsCode)).code : jsCode;

    await fsp.mkdir(path.dirname(outFile), {recursive: true});
    await fsp.writeFile(outFile, outCode ?? jsCode, 'utf8');

    if (buildEs5) {
      const es5OutFile = path.resolve(this.#projectRoot, builderJson.es5_out_file);
      const es5Code = await this.#buildEs5(jsCode);
      const es5OutCode = compress ? (await minify(es5Code)).code : es5Code;
      await fsp.mkdir(path.dirname(es5OutFile), {recursive: true});
      await fsp.writeFile(es5OutFile, es5OutCode ?? es5Code, 'utf8');
      return [outFile, es5OutFile];
    }

    return [outFile];
  }

  /**
   * Read configured source files into one bundle string.
   *
   * @param {object} builderJson Minifier builder config.
   * @returns {Promise<string>} Concatenated JavaScript source.
   */
  async #readSourceFiles(builderJson) {
    let jsCode = '';
    for (const jsFile of builderJson.files ?? []) {
      const sourcePath = path.resolve(this.#projectRoot, builderJson.source_dir, jsFile);
      if (!sourcePath.endsWith('.js')) {
        continue;
      }
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`Minify source file not found: ${sourcePath}`);
      }
      jsCode += await fsp.readFile(sourcePath, 'utf8');
      jsCode += '\n';
    }
    return jsCode;
  }

  /**
   * Transpile bundle source for legacy ES5 output.
   *
   * @param {string} code Modern JavaScript source.
   * @returns {Promise<string>} Transpiled JavaScript source.
   */
  async #buildEs5(code) {
    const result = await babel.transformAsync(code, {
      sourceType: 'module',
      presets: ['@babel/preset-env'],
      plugins: ['@babel/plugin-transform-arrow-functions', '@babel/plugin-transform-modules-systemjs']
    });
    return result?.code ?? code;
  }
}
