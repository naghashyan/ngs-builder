/**
 * NGS builder
 *
 * @author Levon Naghashyan <levon@naghashyan.com>
 * @site https://naghashyan.com
 * @year 2019-2020
 * @package ngs.framework
 * @version 1.0.0
 *
 *
 * This file is part of the NGS package.
 *
 * @copyright Naghashyan Solutions LLC
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 */

'use strict';
import path, {dirname, format, parse} from 'path';
import fs from 'fs';
import {mkdir, writeFile} from 'fs/promises';
import {glob} from 'glob'
import {fileURLToPath} from 'url';

export default class FileUtil {


    static #instance = null;
    #ngsConfig = null;

    /**
     *
     * init builder
     *
     * @param module string
     *
     * @return void
     */
    constructor(module = null) {
        if (!module) {
            return;
        }
        this.module = module;
        try {
            let ngsModuleConfig = this.getJsonFileContent(this.getNgsModuleConfigPath());
            this.defaultModule = ngsModuleConfig.default.default.dir;
        } catch (err) {
            console.log(err);
            this.defaultModule = '';
        }
    }

    static getInstance(module = null) {
        if (this.#instance === null) {
            this.#instance = new FileUtil(module);
        }

        return this.#instance;
    }


    /**
     *
     * get ngs module full path
     *
     * @param module string
     *
     * @returns {Promise<void> | Promise<string> | * | {parent, index, key}}
     */
    getModulePath(module = '') {
        if (module === '') {
            module = this.module;
        }
        if (module === this.defaultModule || module === 'default' || module === '') {
            return path.resolve(process.cwd());
        } else if (module === 'ngs') {
            return path.resolve(process.cwd(), 'vendor', 'naghashyan', 'ngs-php-framework', 'src');
        } else if (module === 'ngs-cms') {
            return path.resolve(process.cwd(), 'vendor', 'naghashyan', 'ngs-php-cms', 'src');
        } else if (module === 'ngs-admin-tools' || module === 'ngs-AdminTools') {
            return path.resolve(process.cwd(), 'vendor', 'naghashyan', 'ngs-admin-tools', 'src');
        } else {
            let vendorPath = path.resolve(process.cwd(), module);
            if (fs.existsSync(vendorPath)) {
                return vendorPath;
            }
        }

        return path.resolve(process.cwd(), 'modules', this.module);
    }

    /**
     * check if module exists
     * @param module
     */
    isModuleExists(module = '') {
        return fs.existsSync(this.getModulePath(module));

    }

    /**
     *
     * get ngs php framework modules.json file path
     *
     * @returns {Promise<void> | Promise<string> | * | {parent, index, key}}
     */
    getNgsModuleConfigPath() {
        return path.resolve(process.cwd(), 'conf', 'modules.json');
    }

    /**
     *
     * return ngs js full dir path
     *
     * @returns {Promise<void> | Promise<any> | * | {parent, index, key}}
     */
    getJsModulePath(module = '') {
        console.log(module);
        if (module === 'ngs') {
            let jsPath = path.resolve(this.getModulePath(module), 'web', 'js', 'ngs');
            if (fs.existsSync(jsPath)) {
                return jsPath;
            }
            return path.resolve(this.getModulePath(module), 'web', 'js');
        } else if (module === 'ngs-component') {
            return path.resolve(this.getModulePath('ngs'), 'web', 'js', 'ngs-component');
        }
        return path.resolve(this.getModulePath(module), 'web', 'js');
    }

    /**
     *
     * get js builder.json file
     *
     * @returns {Promise<void> | Promise<any> | * | {parent, index, key}}
     */
    getBuilderJsonPath(module = '') {
        return path.resolve(this.getJsModulePath(module), 'builder.json');
    }


    /**
     *
     * get json encoded file conecnt
     *
     * @param jsonFilePath String
     *
     * @returns json Object
     */
    getJsonFileContent(jsonFilePath) {
        if (fs.existsSync(jsonFilePath)) {
            return JSON.parse(fs.readFileSync(jsonFilePath));
        }
        throw new Error(jsonFilePath + ' file not found');
    }

    async #ensureDir(filePath) {
        const dir = dirname(filePath);
        await mkdir(dir, {recursive: true});
    }

    async createFileRecursively(filePath, data) {
        try {
            await this.#ensureDir(filePath);
            await writeFile(filePath, data, 'utf8');
            console.log(`File created at ${filePath}`);
        } catch (error) {
            console.error(`Error creating file: ${error}`);
        }
    }

    /**
     *
     * @param filePath {string}
     * @param newExtension {string}
     * @return {*}
     */
    changeFileExtension(filePath, newExtension) {
        const parsedPath = parse(filePath);
        return format({
            ...parsedPath,
            ext: newExtension.startsWith('.') ? newExtension : `.${newExtension}`,
            base: undefined  // Ensure 'base' is undefined so that 'name' and 'ext' are used
        });
    }

    /**
     *
     * @param directory {string}
     * @param extension {string}
     * @param ignorePatterns {array}
     * @return {Promise<string[]|*[]>}
     */
    async findFilesByExtension(directory, extension = 'scss', ignorePatterns = []) {
        try {
            const pattern = `${directory}/**/*.${extension}`;
            return await glob(pattern, {ignore: ignorePatterns});
        } catch (err) {
            console.error('Error:', err);
            return [];
        }
    }

    /**
     *
     * @return {JSON|null}
     */
    getNgsConfig() {
        if (this.#ngsConfig) {
            return this.#ngsConfig;
        }
        try {
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = path.dirname(__filename);
            let ngsConfig = this.getJsonFileContent(path.resolve(process.cwd(), 'ngs.config.json'));
            const defaultConfig = this.getJsonFileContent(path.resolve(__dirname, 'ngs.config.json'));
            if (!ngsConfig) {
                this.#ngsConfig = defaultConfig;
                return this.#ngsConfig;
            }
            this.#ngsConfig = {...defaultConfig, ...ngsConfig};
            return this.#ngsConfig;
        } catch (e) {
            return null;
        }
    }
};
