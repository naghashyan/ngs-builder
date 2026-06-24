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
 * Built-in registry entries used when no external registry is configured.
 *
 * These defaults make the CLI usable immediately while still allowing teams to
 * point `.ngs/config.json` at a private or development registry.
 *
 * @type {Array<object>}
 */
const DEFAULT_MODULES = [
  {
    name: 'admin-tools',
    title: 'NGS Admin Tools',
    backend: {composer: 'naghashyan/ngs-admin-tools', migrations: true},
    frontend: {npm: '@naghashyan/ngs-front-admin-tools', required: false},
    requires: []
  },
  {
    name: 'admin-tools-snippets',
    title: 'Admin Tools Snippets',
    backend: {composer: 'naghashyan/admin-tools-snippets', migrations: true},
    frontend: {npm: '@naghashyan/ngs-front-admin-tools', required: false},
    requires: ['admin-tools']
  },
  {
    name: 'admin-tools-openapi',
    title: 'Admin Tools OpenAPI',
    backend: {composer: 'naghashyan/ngs-admin-tools-openapi', migrations: false},
    frontend: null,
    requires: ['admin-tools']
  }
];

/**
 * Loads NGS module metadata and resolves module dependency order.
 *
 * A registry can be omitted, supplied as a local JSON file/folder, or loaded
 * from an HTTP endpoint. This keeps official modules, customer modules, and
 * local development registries behind one API.
 */
export default class ModuleRegistry {
  /**
   * Registry source URL, JSON file, directory, or null for built-ins.
   *
   * @type {?string}
   */
  #source;

  /**
   * Shared JSON cache for local registry file reads.
   *
   * @type {JsonFileCache}
   */
  #jsonCache;

  /**
   * Cached module list for this CLI invocation.
   *
   * @type {?Array<object>}
   */
  #modules = null;

  /**
   * Create a registry loader.
   *
   * @param {?string} [source] Registry source or null for defaults.
   * @param {JsonFileCache} [jsonCache] Shared JSON cache.
   */
  constructor(source = null, jsonCache = new JsonFileCache()) {
    this.#source = source;
    this.#jsonCache = jsonCache;
  }

  /**
   * Return all registry modules, loading them once per process.
   *
   * @returns {Promise<Array<object>>} Module metadata list.
   */
  async list() {
    if (this.#modules !== null) {
      return this.#modules;
    }
    this.#modules = await this.#loadModules();
    return this.#modules;
  }

  /**
   * Return one module metadata object by registry name.
   *
   * @param {string} name Module registry name.
   * @returns {Promise<object>} Module metadata.
   */
  async get(name) {
    const modules = await this.list();
    const module = modules.find((item) => item.name === name);
    if (!module) {
      const suggestions = modules
        .filter((item) => item.name.includes(name) || name.includes(item.name))
        .map((item) => item.name)
        .join(', ');
      throw new Error(`Unknown NGS module: ${name}${suggestions ? `. Similar modules: ${suggestions}` : ''}`);
    }
    return module;
  }

  /**
   * Resolve dependencies before the requested module.
   *
   * The returned order is safe for installation because each dependency appears
   * before the module that requires it.
   *
   * @param {string} moduleName Module registry name to install.
   * @returns {Promise<Array<object>>} Ordered module metadata list.
   */
  async resolveInstallOrder(moduleName) {
    const modules = await this.list();
    const byName = new Map(modules.map((item) => [item.name, item]));
    const visiting = new Set();
    const visited = new Set();
    const ordered = [];

    /**
     * Depth-first dependency resolver with cycle detection.
     *
     * @param {string} name Module registry name being visited.
     * @returns {void}
     */
    const visit = (name) => {
      if (visited.has(name)) {
        return;
      }
      if (visiting.has(name)) {
        throw new Error(`Circular module dependency detected: ${name}`);
      }
      const module = byName.get(name);
      if (!module) {
        throw new Error(`Module dependency not found: ${name}`);
      }
      visiting.add(name);
      for (const dependency of module.requires ?? []) {
        visit(dependency);
      }
      visiting.delete(name);
      visited.add(name);
      ordered.push(module);
    };

    visit(moduleName);
    return ordered;
  }

  /**
   * Load modules from built-ins, HTTP JSON, a registry file, or a directory.
   *
   * @returns {Promise<Array<object>>} Module metadata list.
   */
  async #loadModules() {
    if (!this.#source) {
      return DEFAULT_MODULES;
    }
    if (this.#source.startsWith('http://') || this.#source.startsWith('https://')) {
      const response = await fetch(this.#source);
      if (!response.ok) {
        throw new Error(`Failed to load NGS registry: ${this.#source}`);
      }
      const payload = await response.json();
      return Array.isArray(payload) ? payload : payload.modules ?? [];
    }

    const sourcePath = path.resolve(this.#source);
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`NGS registry source not found: ${sourcePath}`);
    }
    if (fs.statSync(sourcePath).isDirectory()) {
      const modulesDir = path.join(sourcePath, 'modules');
      const dir = fs.existsSync(modulesDir) ? modulesDir : sourcePath;
      const files = fs.readdirSync(dir).filter((file) => file.endsWith('.json')).sort();
      return files.map((file) => this.#jsonCache.read(path.join(dir, file)));
    }

    const payload = this.#jsonCache.read(sourcePath);
    return Array.isArray(payload) ? payload : payload.modules ?? [];
  }
}
