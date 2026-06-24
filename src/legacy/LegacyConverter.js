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
 * Converts legacy NGS load/action JavaScript files to ES modules.
 *
 * The implementation intentionally supports the old object-literal format so
 * existing projects can migrate gradually without hand-rewriting every file.
 */
export default class LegacyConverter {
  /**
   * Module resolver used to locate legacy JS roots and build import paths.
   *
   * @type {import('./LegacyModuleResolver.js').default}
   */
  #resolver;

  /**
   * JSON cache used for optional `convert.config.json` replacement rules.
   *
   * @type {JsonFileCache}
   */
  #jsonCache;

  /**
   * Cached convert config; false means the optional config file was absent.
   *
   * @type {?Array<object>|false}
   */
  #convertConfig = null;

  /**
   * Create the converter with module path and config dependencies.
   *
   * @param {import('./LegacyModuleResolver.js').default} resolver Module resolver.
   * @param {JsonFileCache} [jsonCache] Shared JSON cache.
   */
  constructor(resolver, jsonCache = new JsonFileCache()) {
    this.#resolver = resolver;
    this.#jsonCache = jsonCache;
  }

  /**
   * Convert every legacy JS file under a module-relative directory.
   *
   * @param {{module?: string, dir?: string}} [options] Convert options.
   * @returns {Promise<string[]>} Converted file paths.
   */
  async convert(options = {}) {
    const module = options.module ?? 'default';
    const dir = options.dir ?? '';
    const rootDir = path.resolve(this.#resolver.jsModulePath(module), dir);
    if (!fs.existsSync(rootDir)) {
      throw new Error(`Convert directory not found: ${rootDir}`);
    }
    const files = await this.#walkJsFiles(rootDir);
    const converted = [];
    for (const filePath of files) {
      if (await this.convertFile(filePath, module)) {
        converted.push(filePath);
      }
    }
    console.log('DONE!');
    return converted;
  }

  /**
   * Convert one file when it contains `NGS.createLoad` or `NGS.createAction`.
   *
   * Files that are already modern modules are ignored and reported as false.
   *
   * @param {string} jsPath JavaScript file path.
   * @param {string} [module] NGS module name used for import path resolution.
   * @returns {Promise<boolean>} True when the file was converted.
   */
  async convertFile(jsPath, module = 'default') {
    const content = await fsp.readFile(jsPath, 'utf8');
    const ngsItemType = this.#getNgsItemType(content);
    if (!ngsItemType) {
      return false;
    }

    const ngsClassCreator = ngsItemType === 'action' ? 'NGS.createAction' : 'NGS.createLoad';
    const ngsPlainObject = this.#getObjectFromNgsItem(content);
    let ngsItemClassName = content.substring(content.indexOf(`${ngsClassCreator}(`) + ngsClassCreator.length + 2);
    ngsItemClassName = ngsItemClassName.substring(0, ngsItemClassName.indexOf(',') - 1);
    const ngsItem = this.#getNgsItemPackageAndName(ngsItemClassName, ngsItemType);
    const parentClass = this.#getParentClass(content, ngsItemType);
    const parentImportPath = this.#getImportPath(jsPath, parentClass.path, module);
    const replaced = this.#replaceLegacyImports(ngsPlainObject, jsPath, module);

    let classTemplate = `import ${parentClass.name} from '${parentImportPath}.js';\n`;
    for (const importItem of replaced.imports) {
      classTemplate += `import ${importItem.name} from '${importItem.path}.js';\n`;
    }
    classTemplate += `\nexport default class ${ngsItem.name} extends ${parentClass.name}`;
    classTemplate += replaced.content;
    await fsp.writeFile(jsPath, classTemplate, 'utf8');
    return true;
  }

  /**
   * Recursively collect JavaScript files under a directory.
   *
   * @param {string} directory Directory to scan.
   * @returns {Promise<string[]>} JavaScript file paths.
   */
  async #walkJsFiles(directory) {
    const entries = await fsp.readdir(directory, {withFileTypes: true});
    const files = [];
    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        files.push(...await this.#walkJsFiles(entryPath));
      } else if (entry.isFile() && entryPath.endsWith('.js')) {
        files.push(entryPath);
      }
    }
    return files;
  }

  /**
   * Extract and modernize the legacy object literal body.
   *
   * Non-function object properties become constructor assignments because class
   * bodies cannot directly contain the old literal property syntax.
   *
   * @param {string} item Legacy NGS item source.
   * @returns {string} ES class body source.
   */
  #getObjectFromNgsItem(item) {
    const objectPart = item.substring(item.indexOf('{'));
    let ngsPlainObject = objectPart.substring(0, objectPart.lastIndexOf('}') + 1);
    const ngsObject = Function(`'use strict'; return (${ngsPlainObject});`)();
    let constructorString = 'constructor (){\n';
    constructorString += 'super();\n';

    for (const key of Object.keys(ngsObject)) {
      if (typeof ngsObject[key] === 'function') {
        ngsPlainObject = ngsPlainObject.replace(`${ngsObject[key].toString()},`, ngsObject[key].toString());
        continue;
      }
      constructorString += `\tthis.${key} = ${JSON.stringify(ngsObject[key])};\n`;
      ngsPlainObject = this.#removeObjectProperty(ngsPlainObject, key, ngsObject[key]);
    }

    constructorString += '}\n';
    ngsPlainObject = ngsPlainObject.replace('{', `{\n\n${constructorString}`);
    ngsPlainObject = ngsPlainObject.replace(/: function/g, '');
    ngsPlainObject = ngsPlainObject.replace(/:function/g, '');
    return ngsPlainObject;
  }

  /**
   * Remove one converted non-function property from a legacy object literal.
   *
   * @param {string} content Object literal source.
   * @param {string} key Property key.
   * @param {unknown} value Property value.
   * @returns {string} Object literal source without that property.
   */
  #removeObjectProperty(content, key, value) {
    const legacyValue = String(value);
    return content
      .replace(`${key}: ${legacyValue},`, '')
      .replace(`${key} : ${legacyValue},`, '')
      .replace(`${key} :${legacyValue},`, '')
      .replace(`${key}:${legacyValue},`, '');
  }

  /**
   * Detect whether a source string is a legacy load or action declaration.
   *
   * @param {string} item Source file content.
   * @returns {?('load'|'action')} Legacy item type.
   */
  #getNgsItemType(item) {
    if (item.includes('NGS.createLoad')) {
      return 'load';
    }
    if (item.includes('NGS.createAction')) {
      return 'action';
    }
    return null;
  }

  /**
   * Convert an old dotted NGS class name to file path and ES class name.
   *
   * @param {string} itemName Legacy dotted item name.
   * @param {'load'|'action'} type Legacy item type.
   * @returns {{path: string, name: string}} Import path and generated class name.
   */
  #getNgsItemPackageAndName(itemName, type) {
    const ngsItemType = type.charAt(0).toUpperCase() + type.slice(1);
    const ngsItemPackage = itemName.substring(0, itemName.lastIndexOf('.'));
    const ngsItemModule = ngsItemPackage.replace(/\./g, '/');
    let ngsItemName = itemName.substring(itemName.lastIndexOf('.') + 1);
    ngsItemName = ngsItemName.replace(/_(\w)/g, (_match, letter) => letter.toUpperCase());
    ngsItemName = `${ngsItemName.charAt(0).toUpperCase()}${ngsItemName.slice(1)}${ngsItemType}`;
    return {path: `${ngsItemModule}/${ngsItemName}`, name: ngsItemName};
  }

  /**
   * Resolve the converted parent class from legacy inheritance metadata.
   *
   * @param {string} ngsItem Legacy source content.
   * @param {'load'|'action'} type Legacy item type.
   * @returns {{path: string, name: string}} Parent import path and class name.
   */
  #getParentClass(ngsItem, type) {
    const parentPart = ngsItem.substring(ngsItem.lastIndexOf('}') + 4);
    if (parentPart) {
      let parentClass = parentPart.substring(0, parentPart.lastIndexOf('"'));
      if (!parentClass) {
        parentClass = parentPart.substring(0, parentPart.lastIndexOf('\''));
      }
      return this.#getNgsItemPackageAndName(parentClass, type);
    }

    if (type === 'load') {
      return {path: 'ngs/AbstractLoad', name: 'AbstractLoad'};
    }
    return {path: 'ngs/AbstractAction', name: 'AbstractAction'};
  }

  /**
   * Build a module-relative import path from one JS file to another target.
   *
   * @param {string} source Source file path.
   * @param {string} target Target path without extension.
   * @param {string} module NGS module name.
   * @returns {string} Relative import path without `.js` suffix.
   */
  #getImportPath(source, target, module) {
    const sourceDir = path.dirname(source);
    let relativePath = path.relative(sourceDir, path.join(this.#resolver.jsModulePath(module), target));
    relativePath = relativePath.split(path.sep).join('/');
    if (!relativePath.startsWith('.')) {
      relativePath = `./${relativePath}`;
    }
    return relativePath;
  }

  /**
   * Apply optional `convert.config.json` name replacements and imports.
   *
   * @param {string} ngsItem Class body source.
   * @param {string} filePath File being converted.
   * @param {string} module NGS module name.
   * @returns {{imports: Array<{path: string, name: string}>, content: string}} Replacement result.
   */
  #replaceLegacyImports(ngsItem, filePath, module) {
    const config = this.#getConvertConfig();
    if (!config) {
      return {imports: [], content: ngsItem};
    }
    const imports = [];
    let content = ngsItem;
    for (const item of config) {
      if (!content.includes(item.old_name)) {
        continue;
      }
      imports.push({path: this.#getImportPath(filePath, item.path, module), name: item.name});
      content = content.replace(new RegExp(item.old_name, 'g'), item.name);
    }
    return {imports, content};
  }

  /**
   * Read optional conversion replacement config once per converter instance.
   *
   * @returns {Array<object>|false} Replacement config or false when absent.
   */
  #getConvertConfig() {
    if (this.#convertConfig !== null) {
      return this.#convertConfig;
    }
    try {
      this.#convertConfig = this.#jsonCache.read(path.resolve(this.#resolver.projectRoot, 'convert.config.json'));
    } catch {
      this.#convertConfig = false;
    }
    return this.#convertConfig;
  }
}
