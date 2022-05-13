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
import path from 'path';
import fs from 'fs';

export default class FileUtil {
  /**
   *
   * init builder
   *
   * @param module string
   *
   * @return void
   */
  constructor(module) {
    this.module = module;
    try {
      let ngsModuleConfig = this.getJsonFileContent(this.getNgsModuleConfigPath());
      this.defaultModule = ngsModuleConfig.default.default.dir;
    } catch (err) {
      console.log(err);
      this.defaultModule = '';
    }
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
    if(module === ''){
      module = this.module;
    }
    if(module === this.defaultModule || module === 'default' || module === ''){
      return path.resolve(process.cwd());
    } else if(module === 'ngs'){
      return path.resolve(process.cwd(), 'vendor', 'naghashyan', 'ngs-php-framework', 'src');
    } else if(module === 'ngs-cms'){
      return path.resolve(process.cwd(), 'vendor', 'naghashyan', 'ngs-php-cms', 'src');
    } else if(module === 'ngs-admin-tools' || module === 'ngs-AdminTools'){
      return path.resolve(process.cwd(), 'vendor', 'naghashyan', 'ngs-admin-tools', 'src');
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
    if(fs.existsSync(jsonFilePath)){
      return JSON.parse(fs.readFileSync(jsonFilePath));
    }
    throw new Error(jsonFilePath + ' file not found');
  }

};
