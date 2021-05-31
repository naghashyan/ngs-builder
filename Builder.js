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
const path = require('path');
const fs = require('fs');
const Terser = require("terser");
const babel = require('@babel/core');
const readdir = require("rrdir");
const mime = require('mime');
const FileUtil = require('./FileUtil');

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
    this.fileUtil = new FileUtil(module);
    this.jsonBuilder = {};
  }

  /**
   *
   * parse ngs js builder json
   *
   * @returns {any | undefined}
   */
  parseBuilderJson(module) {
    if(this.jsonBuilder[module]){
      return this.jsonBuilder[module];
    }
    try {
      this.jsonBuilder[module] = this.fileUtil.getJsonFileContent(this.fileUtil.getBuilderJsonPath(module));
      return this.jsonBuilder[module];
    } catch (err) {
      console.error(err);
    }
  }

  jsUpdate(module = '', force = false) {
    let builderJson = this.parseBuilderJson(module);
    builderJson.builders.forEach((builder) => {
      if(builder.include){
        return this.jsUpdate(builder.include, force);
      }
      let outDir = builder.module;
      let targetDir = this.fileUtil.getJsModulePath(builder.module);
      if(builder.source_dir){
        targetDir = path.resolve(targetDir, builder.source_dir);
      }
      if(builder.out_dir){
        outDir = builder.out_dir;
      }
      if(builder.files){
        this.createFilesSymLink(targetDir, builder.files, outDir, force);
      }

    });

  }

  createFilesSymLink(targetDir, files, outDir, force = false) {
    let outDirPath = path.resolve(this.fileUtil.getJsModulePath(), outDir);
    fs.mkdirSync(outDirPath, {recursive: true});
    files.forEach((jsFile) => {
      let outJsFile = path.resolve(outDirPath, jsFile);
      if(fs.existsSync(outJsFile)){
        if(force === false){
          return;
        }
        fs.unlinkSync(outJsFile);
      }
      let jsSourcePath = path.resolve(targetDir, jsFile);
      if(!fs.existsSync(jsSourcePath)){
        console.error('file not exists -->  ' + jsSourcePath);
        return;
      }
      let fullOutDir = path.parse(outJsFile).dir;
      if(!fs.existsSync(fullOutDir)){
        fs.mkdirSync(fullOutDir, {recursive: true});
      }
      fs.symlinkSync(jsSourcePath, outJsFile);
    });
  }

  /**
   *
   * build ngs framework js files
   * if set es5 mode true then also convert es6 to es5
   *
   * @return void
   */
  async jsBuild(version = null) {
    if(!this.fileUtil.isModuleExists()){
      console.error('Error: module not found');
      return;
    }
    let jsFiles = readdir.sync(this.fileUtil.getJsModulePath(), {followSymlinks: true});
    let builderJson = this.parseBuilderJson();
    if(!version){
      version = '1.0.0';
      if(builderJson.version){
        version = builderJson.version;
      }
    }
    let minyfy = builderJson.compress ? builderJson.compress : true;
    let buildEs5 = builderJson.es5 ? builderJson.es5 : false;
    let jsOutDir = path.resolve(this.fileUtil.getModulePath(), builderJson.out_dir);

    let jsEs5OutDir = '';
    if(buildEs5){
      jsEs5OutDir = path.resolve(process.cwd(), builderJson.es5_out_dir);
    }
    jsFiles.forEach(async (jsFile) => {
      let jsFilePath = jsFile.path;
      if(mime.getType(jsFilePath) !== 'application/javascript'){
        return;
      }
      let ngsJsFilePath = jsFilePath.replace(this.fileUtil.getJsModulePath() + '\\', '');
      ngsJsFilePath = jsFilePath.replace(this.fileUtil.getJsModulePath() + '/', '');
      let outJsFile = path.resolve(jsOutDir, ngsJsFilePath);
      if(jsFile.symlink === true){
        jsFilePath = fs.readlinkSync(jsFilePath);
      }

      let code = fs.readFileSync(jsFilePath, "utf8");
      code = code.replace(/(import.*?\.js)/gm, '$1?' + version);

      if(jsFilePath.indexOf('NGS.js') > 0){
        code = code.replace(/import\(([^\)]+)\)/gm, "import($1+'?" + version + "')");
      }
      let es5outJsFile = '';
      let es5code = '';
      if(buildEs5){
        es5outJsFile = path.resolve(jsEs5OutDir, ngsJsFilePath);
        es5code = this.buildEs5(code);
      }
      //
      fs.mkdirSync(path.dirname(outJsFile), {recursive: true});
      let minifyCode = code;
      if(minyfy){
        try {
          minifyCode = await Terser.minify(code);
          minifyCode = minifyCode.code;
          console.log( outJsFile + '  ===> DONE');
        } catch (e) {
          console.error(outJsFile + '  ===> ERROR');
        }

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
        readdir(this.fileUtil.getJsModulePath()).then((files) => {
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

  minify(builderJsonFile) {
    try {
      let builderJson = this.fileUtil.getJsonFileContent(path.resolve(process.cwd(), builderJsonFile));
      let buildEs5 = builderJson.es5 ? builderJson.es5 : false;
      let minyfy = builderJson.compress ? builderJson.compress : false;
      let outJsFile = path.resolve(process.cwd(), builderJson.out_file);
      let es5outJsFile = path.resolve(process.cwd(), builderJson.es5_out_file);
      let jsFiles = builderJson.files;
      let jsCode = '';
      jsFiles.forEach((jsFile) => {
        let jsFilePath = path.resolve(process.cwd(), builderJson.source_dir, jsFile);
        console.log(jsFilePath);
        if(mime.getType(jsFilePath) !== 'application/javascript'){
          return;
        }
        jsCode += fs.readFileSync(jsFilePath, "utf8");

      });

      let es5code = '';
      if(buildEs5){
        es5code = this.buildEs5(jsCode);
      }
      fs.mkdirSync(path.dirname(outJsFile), {recursive: true});
      let minifyCode = jsCode;
      if(minyfy){
        minifyCode = Terser.minify(jsCode).code;
      }
      fs.writeFileSync(outJsFile, minifyCode, "utf8");
      if(buildEs5){
        fs.mkdirSync(path.dirname(es5outJsFile), {recursive: true});
        if(minyfy){
          minifyCode = Terser.minify(es5code).code;
        }
        fs.writeFileSync(es5outJsFile, minifyCode, "utf8");
      }

    } catch (err) {
      console.error(err);
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


};