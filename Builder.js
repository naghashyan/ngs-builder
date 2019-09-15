#!/usr/bin/env node
/**
 * NGS builder
 *
 * @author Levon Naghashyan <levon@naghashyan.com>
 * @site https://naghashyan.com
 * @year 2019
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
const path = require('path');
const fs = require('fs');
const Terser = require("terser");
const babel = require('@babel/core');

module.exports = class Builder {
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
      this.defaultModule = '';
    }
  }

  /**
   *
   * get ngs module full path
   *
   * @returns {Promise<void> | Promise<string> | * | {parent, index, key}}
   */
  getModulePath() {
    if(this.module === this.defaultModule || this.module === 'default' || this.module === ''){
      return path.resolve(process.cwd());
    } else if(this.module === 'ngs'){
      return path.resolve(process.cwd(), 'modules', 'vendor', 'naghashyan', 'ngs-php-framework', 'src');
    } else if(this.module === 'ngs-cms'){
      return path.resolve(process.cwd(), 'modules', 'vendor', 'naghashyan', 'ngs-php-cms', 'src');
    }
    return path.resolve(process.cwd(), 'modules');
  }

  /**
   *
   * get ngs php framework modules.json file path
   *
   * @returns {Promise<void> | Promise<string> | * | {parent, index, key}}
   */
  getNgsModuleConfigPath() {
    return path.resolve(process.cwd(), 'config', 'modules.json');
  }

  /**
   *
   * return ngs js full dir path
   *
   * @returns {Promise<void> | Promise<any> | * | {parent, index, key}}
   */
  getJsModulePath() {
    return path.resolve(this.getModulePath(), 'web', 'js');
  }

  /**
   *
   * get js builder.json file
   *
   * @returns {Promise<void> | Promise<any> | * | {parent, index, key}}
   */
  getBuilderJsonPath() {
    return path.resolve(this.getModulePath(), 'builder.json');
  }

  /**
   *
   * parse ngs js builder json
   *
   * @returns {any | undefined}
   */
  parseBuilderJson() {
    if(this.jsonBuilder){
      return this.jsonBuilder;
    }
    try {
      this.jsonBuilder = this.getJsonFileContent(this.getBuilderJsonPath());
      return this.jsonBuilder;
    } catch (err) {
      console.error(err);
    }
  }

  /**
   *
   * build ngs framework js files
   * if set es5 mode true then also convert es6 to es5
   *
   * @return void
   */
  jsBuild() {
    try {
      let builderJson = this.parseBuilderJson();
      let minyfy = builderJson.compress ? builderJson.compress : true;
      let buildEs5 = builderJson.es5 ? builderJson.es5 : false;
      let jsOutDir = path.resolve(process.cwd(), builderJson.out_dir);
      if(buildEs5){
        var jsEs5OutDir = path.resolve(process.cwd(), builderJson.es5_out_dir);
      }
      let files = [];
      console.log(builderJson);
      builderJson.builders.forEach(function (builder) {
        files = files.concat(builder.files);
      });
      files.forEach(function (jsFile) {
        let outJsFile = path.resolve(jsOutDir, jsFile);
        let code = fs.readFileSync(path.resolve(process.cwd(), jsFile), "utf8");
        if(buildEs5){
          var es5outJsFile = path.resolve(jsEs5OutDir, jsFile);
          var es5code = this.buildEs5(code);
        }
        fs.mkdirSync(path.dirname(outJsFile), {recursive: true});
        if(minyfy){
          var minifyCode = Terser.minify(code).code;
        }
        fs.writeFileSync(outJsFile, minifyCode, "utf8");
        if(buildEs5){
          fs.mkdirSync(path.dirname(es5outJsFile), {recursive: true});
          if(minyfy){
            minifyCode = Terser.minify(es5code).code;
          }
          fs.writeFileSync(es5outJsFile, minifyCode, "utf8");
        }
      }.bind(this));
    } catch (e) {
      console.log(e);
    }
  }

  /**
   *
   * conver es6 code to es5 using babel
   *
   * @param code string
   * @returns {*}
   */

  buildEs5(code) {
    return babel.transform(code, {
      sourceType: "module",
      presets: [
        require("@babel/preset-env"),
        require("@babel/polyfill")
      ],
      plugins: [
        "@babel/plugin-syntax-dynamic-import",
        "@babel/plugin-transform-arrow-functions",
        "@babel/plugin-transform-modules-systemjs"
      ]
    }).code;
  }

  getJsonFileContent(jsonFilePath) {
    if(fs.existsSync(jsonFilePath)){
      return JSON.parse(fs.readFileSync(jsonFilePath));
    }
    throw new Error(jsonFilePath + ' file not found');
  }


};