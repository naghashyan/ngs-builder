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
const readdir = require("rrdir");
const mime = require('mime');

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

  jUpdate() {
    let builderJson = this.parseBuilderJson();
    builderJson.builders.forEach((builder) => {
      let outDir = builder.module;
      let targetDir = this.getJsModulePath(builder.module);
      if(builder.out_dir){
        outDir = builder.out_dir;
      }
      if(builder.files){
        this.createFilesSymLink(targetDir, builder.files, outDir);
        return;
      }

    });

  }

  createFilesSymLink(targetDir, files, outDir) {
    let outDirPath = path.resolve(this.getJsModulePath(), outDir);
    fs.mkdirSync(outDirPath, {recursive: true});
    files.forEach((jsFile) => {
      let outJsFile = path.resolve(outDirPath, jsFile);
      fs.symlinkSync(path.resolve(targetDir, jsFile), outJsFile);
    });
  }

  /**
   *
   * build ngs framework js files
   * if set es5 mode true then also convert es6 to es5
   *
   * @return void
   */
  jsBuild() {

    let jsFiles = readdir.sync(this.getJsModulePath(), {followSymlinks: true});
    let builderJson = this.parseBuilderJson();
    let minyfy = builderJson.compress ? builderJson.compress : true;
    let buildEs5 = builderJson.es5 ? builderJson.es5 : false;
    let jsOutDir = path.resolve(process.cwd(), builderJson.out_dir);
    let jsEs5OutDir = '';
    if(buildEs5){
      jsEs5OutDir = path.resolve(process.cwd(), builderJson.es5_out_dir);
    }
    jsFiles.forEach((jsFile) => {
      let jsFilePath = jsFile.path;
      if(mime.getType(jsFilePath) !== 'application/javascript'){
        return;
      }
      let ngsJsFilePath = jsFilePath.replace(this.getJsModulePath() + '\\', '');
      let outJsFile = path.resolve(jsOutDir, ngsJsFilePath);
      if(jsFile.symlink === true){
        jsFilePath = fs.readlinkSync(jsFilePath);
      }

      let code = fs.readFileSync(jsFilePath, "utf8");
      if(buildEs5){
        var es5outJsFile = path.resolve(jsEs5OutDir, ngsJsFilePath);
        var es5code = this.buildEs5(code);
      }
      fs.mkdirSync(path.dirname(outJsFile), {recursive: true});
      let minifyCode;
      if(minyfy){
        minifyCode = Terser.minify(code).code;
      }
      fs.writeFileSync(outJsFile, minifyCode, "utf8");
      if(buildEs5){
        fs.mkdirSync(path.dirname(es5outJsFile), {recursive: true});
        if(minyfy){
          minifyCode = Terser.minify(es5code).code;
        }
        fs.writeFileSync(es5outJsFile, minifyCode, "utf8");
      }
    });
  }

  /**
   *
   * build ngs framework js files
   * if set es5 mode true then also convert es6 to es5
   *
   * @return Promise
   */
  readModuleJsDir() {
    return new Promise((resolve, reject) => {
        console.log(this.getJsModulePath());
        readdir(this.getJsModulePath()).then((files) => {
            console.log(files);
            let jsFiles = [];
            files.forEach((file) => {
              if(mime.getType(file) === 'application/javascript'){
                jsFiles.push(file);
              }
            });
            resolve(jsFiles);
          },
          (error) => {
            reject(error);
          }
        );
      }
    );
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