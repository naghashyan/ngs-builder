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

import mime from 'mime';
//import rrdir from 'rrdir';
import fs from 'fs';
import path from 'path';
import FileUtil from './FileUtil.js';

export default class Converter {

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
  }

  /**
   *
   * build ngs framework js files
   * if set es5 mode true then also convert es6 to es5
   *
   * @return void
   */
  convert(jsDir = '') {
    let files = readdir.sync(path.resolve(this.fileUtil.getJsModulePath(), jsDir), {followSymlinks: true});
    files.forEach((fileObj) => {
      if(mime.getType(fileObj.path) === 'application/javascript'){
        this.doConvert(fileObj.path);
      }
    });
    console.log('DONE!');
  }

  doConvert(jsPath) {
    let content = this.getFileContent(jsPath);
    let ngsItemType = this.getNgsItemType(content);
    if(!ngsItemType){
      return;
    }
    let ngsClassCreator = 'NGS.createLoad';
    if(ngsItemType === 'action'){
      ngsClassCreator = 'NGS.createAction';
    }
    let ngsPlainObject = this.getObjectFromNgsItem(content);
    let ngsItemClassName = content.substring(content.indexOf(ngsClassCreator + '(') + ngsClassCreator.length + 2);
    ngsItemClassName = ngsItemClassName.substring(0, ngsItemClassName.indexOf(',') - 1);
    let ngsItem = this.getNGSItemPackageAndName(ngsItemClassName, ngsItemType);
    let ngsClassName = ngsItem.name;
    let parentClass = this.getParentClass(content, ngsItemType);
    let importPath = this.getImportPath(jsPath, parentClass.path);
    let classTemplate = 'import ' + parentClass.name + ' from ' + "'" + importPath + ".js';\n";

    let itemArr = this.getAndReplaceOldStaff(ngsPlainObject, jsPath);
    itemArr.imports.forEach((importItem) => {
      classTemplate += 'import ' + importItem.name + ' from ' + "'" + importItem.path + ".js';\n";
    });
    classTemplate += "\n";
    classTemplate += 'export default class ' + ngsClassName + ' extends ' + parentClass.name;
    classTemplate += itemArr.content;
    fs.writeFileSync(jsPath, classTemplate, "utf8");

  }

  getObjectFromNgsItem(item) {
    let objectPeace = item.substring(item.indexOf('{'));
    let ngsPlainObject = objectPeace.substring(0, objectPeace.lastIndexOf('}') + 1);
    let ngsObject;
    eval('ngsObject = ' + ngsPlainObject);
    let replaceString = '';
    let constructorString = 'constructor (){\n';
    constructorString += 'super();\n';
    for (let key in ngsObject) {
      if(!ngsObject.hasOwnProperty(key)){
        continue;
      }
      if(typeof ngsObject[key] === 'function'){
        ngsPlainObject = ngsPlainObject.replace(ngsObject[key].toString() + ',', ngsObject[key].toString());
        continue;
      }
      constructorString += '\tthis.' + key + ' = ' + ngsObject[key] + ';\n';
      ngsPlainObject = ngsPlainObject.replace(key + ': ' + ngsObject[key] + ',', '');
      ngsPlainObject = ngsPlainObject.replace(key + ' : ' + ngsObject[key] + ',', '');
      ngsPlainObject = ngsPlainObject.replace(key + ' :' + ngsObject[key] + ',', '');
      ngsPlainObject = ngsPlainObject.replace(key + ':' + ngsObject[key] + ',', '');
    }
    constructorString += '}\n';
    ngsPlainObject = ngsPlainObject.replace(/{/, '{\n\n' + constructorString);
    ngsPlainObject = ngsPlainObject.replace(/: function/g, '');
    ngsPlainObject = ngsPlainObject.replace(/:function/g, '');
    return ngsPlainObject;
  }

  getNgsItemType(item) {
    if(item.indexOf('NGS.createLoad') >= 0){
      return 'load';
    }
    if(item.indexOf('NGS.createAction') >= 0){
      return 'action';
    }
  }

  getNGSItemPackageAndName(itemName, type) {
    let action = itemName;
    let ngsItemType = type.charAt(0).toUpperCase() + type.slice(1);
    let ngsItemPackage = itemName.substr(0, itemName.lastIndexOf("."));
    let ngsItemModule = ngsItemPackage.replace(/\./g, '/', function (delim) {
      return delim.replace('_', '/');
    });
    let ngsItemName = itemName.substr(itemName.lastIndexOf(".") + 1);
    ngsItemName = ngsItemName.replace(/_(\w)/g, function (delim) {
      delim = delim.replace('_', '');
      return delim.charAt(0).toUpperCase() + delim.slice(1);
    });
    ngsItemName = ngsItemName.charAt(0).toUpperCase() + ngsItemName.slice(1) + ngsItemType;
    return {
      path: ngsItemModule + '/' + ngsItemName,
      name: ngsItemName
    };
  }

  getParentClass(ngsItem, type) {
    let parentPeace = ngsItem.substring(ngsItem.lastIndexOf('}') + 4);
    let parentClass;
    if(parentPeace){
      parentClass = parentPeace.substring(0, parentPeace.lastIndexOf('"'));
      if(!parentClass){
        parentClass = parentPeace.substring(0, parentPeace.lastIndexOf('\''));
      }
      parentClass = this.getNGSItemPackageAndName(parentClass, type)
    } else{
      if(type === 'load'){
        parentClass = {
          path: 'ngs/AbstractLoad',
          name: 'AbstractLoad'
        };
      } else{
        parentClass = {
          path: 'ngs/AbstractAction',
          name: 'AbstractAction'
        };
      }
    }
    return parentClass;
  }

  getImportPath(source, target) {
    let ngsJsFilePath = source.replace(this.fileUtil.getJsModulePath() + '\\', '');
    let pathCount = (ngsJsFilePath.match(/\\/g) || []).length;
    if(pathCount === 0){
      return './' + target;
    }
    for (let i = 0; i < pathCount; i++) {
      target = '../' + target;
    }
    return target;

  }

  getAndReplaceOldStaff(ngsItem, path) {
    let configJson = this.getConvertConfig();
    if(!configJson){
      return {
        imports: [],
        content: ngsItem
      };
    }
    let importArr = [];
    configJson.forEach((item) => {
      if(ngsItem.indexOf(item.old_name) < 0){
        return;
      }
      importArr.push({
        path: this.getImportPath(path, item.path),
        name: item.name
      });
      ngsItem = ngsItem.replace(new RegExp(item.old_name, 'g'), item.name);
    });
    return {
      imports: importArr,
      content: ngsItem
    };
  }

  getConvertConfig() {
    if(this.convertConfigJson){
      return this.jsonBuilder;
    }
    try {
      return this.fileUtil.getJsonFileContent(path.resolve(process.cwd(), 'convert.config.json'));
    } catch (e) {
      return null;
    }
  }

  getFileContent(jsonFilePath) {
    if(fs.existsSync(jsonFilePath)){
      return fs.readFileSync(jsonFilePath).toString();
    }
    throw new Error(jsonFilePath + ' file not found');
  }

}