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
import JsonFileCache from '../config/JsonFileCache.js';

/**
 * Resolves legacy NGS module paths.
 *
 * Old projects use a mixture of project-root modules, Composer vendor modules,
 * and `modules/<name>` folders. Keeping this logic in one class prevents path
 * rules from spreading across builder, converter, and updater code.
 */
export default class LegacyModuleResolver {
  /**
   * Project root used as the base for all module resolution.
   *
   * @type {string}
   */
  #projectRoot;

  /**
   * Default module name for methods where no module is supplied.
   *
   * @type {string}
   */
  #module;

  /**
   * JSON cache used to read `conf/modules.json` once.
   *
   * @type {JsonFileCache}
   */
  #jsonCache;

  /**
   * Default module directory configured by the NGS backend, when available.
   *
   * @type {string}
   */
  #defaultModule;

  /**
   * Create a resolver for one project root.
   *
   * @param {string} [projectRoot] Project root.
   * @param {string} [module] Default module name.
   * @param {JsonFileCache} [jsonCache] Shared JSON cache.
   */
  constructor(projectRoot = process.cwd(), module = 'default', jsonCache = new JsonFileCache()) {
    this.#projectRoot = path.resolve(projectRoot);
    this.#module = module || 'default';
    this.#jsonCache = jsonCache;
    this.#defaultModule = this.#readDefaultModule();
  }

  /**
   * Return the project root used by this resolver.
   *
   * @returns {string} Project root.
   */
  get projectRoot() {
    return this.#projectRoot;
  }

  /**
   * Resolve the filesystem root of an NGS module.
   *
   * @param {string} [module] Module name.
   * @returns {string} Module root path.
   */
  modulePath(module = this.#module) {
    const selectedModule = module || this.#module;
    if (selectedModule === this.#defaultModule || selectedModule === 'default' || selectedModule === '') {
      return this.#projectRoot;
    }
    if (selectedModule === 'ngs') {
      return path.join(this.#projectRoot, 'vendor', 'naghashyan', 'ngs-php-framework', 'src');
    }
    if (selectedModule === 'ngs-cms') {
      return path.join(this.#projectRoot, 'vendor', 'naghashyan', 'ngs-php-cms', 'src');
    }
    if (selectedModule === 'ngs-admin-tools' || selectedModule === 'ngs-AdminTools') {
      return path.join(this.#projectRoot, 'vendor', 'naghashyan', 'ngs-admin-tools', 'src');
    }

    const directPath = path.join(this.#projectRoot, selectedModule);
    if (fs.existsSync(directPath)) {
      return directPath;
    }

    return path.join(this.#projectRoot, 'modules', selectedModule);
  }

  /**
   * Resolve the `web/js` root for a module.
   *
   * @param {string} [module] Module name.
   * @returns {string} Module JavaScript root path.
   */
  jsModulePath(module = this.#module) {
    const selectedModule = module || this.#module;
    if (selectedModule === 'ngs') {
      const nestedPath = path.join(this.modulePath(selectedModule), 'web', 'js', 'ngs');
      if (fs.existsSync(nestedPath)) {
        return nestedPath;
      }
    }
    if (selectedModule === 'ngs-component') {
      return path.join(this.modulePath('ngs'), 'web', 'js', 'ngs-component');
    }
    return path.join(this.modulePath(selectedModule), 'web', 'js');
  }

  /**
   * Resolve the builder config path for a module.
   *
   * @param {string} [module] Module name.
   * @returns {string} Builder config path.
   */
  builderJsonPath(module = this.#module) {
    return path.join(this.jsModulePath(module), 'builder.json');
  }

  /**
   * Validate that a module root exists before build operations continue.
   *
   * @param {string} [module] Module name.
   * @returns {string} Existing module root path.
   */
  assertModuleExists(module = this.#module) {
    const modulePath = this.modulePath(module);
    if (!fs.existsSync(modulePath)) {
      throw new Error(`NGS module not found: ${module} (${modulePath})`);
    }
    return modulePath;
  }

  /**
   * Validate that a module has a `web/js/builder.json` file.
   *
   * @param {string} [module] Module name.
   * @returns {string} Existing builder config path.
   */
  assertBuilderJson(module = this.#module) {
    const builderPath = this.builderJsonPath(module);
    if (!fs.existsSync(builderPath)) {
      throw new Error(`builder.json not found for module ${module}: ${builderPath}`);
    }
    return builderPath;
  }

  /**
   * Build an import path from a source file to a target module JS path.
   *
   * @param {string} sourceFile Source file path.
   * @param {string} targetPath Target path without extension.
   * @param {string} [module] Module name.
   * @returns {string} Relative import path without `.js` extension.
   */
  relativeImportPath(sourceFile, targetPath, module = this.#module) {
    const sourceDir = path.dirname(sourceFile);
    let relativePath = path.relative(sourceDir, path.join(this.jsModulePath(module), targetPath));
    relativePath = relativePath.split(path.sep).join('/');
    if (!relativePath.startsWith('.')) {
      relativePath = `./${relativePath}`;
    }
    return relativePath.replace(/\.js$/, '');
  }

  /**
   * Read the default module directory from `conf/modules.json` when present.
   *
   * @returns {string} Default module directory or empty string.
   */
  #readDefaultModule() {
    const moduleConfigPath = path.join(this.#projectRoot, 'conf', 'modules.json');
    try {
      const config = this.#jsonCache.read(moduleConfigPath);
      return config?.default?.default?.dir ?? '';
    } catch {
      return '';
    }
  }
}
