#!/usr/bin/env node
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
const commander = require('commander');
const Builder = require('./Builder');
const Converter = require('./Converter');
let ngsModule = 'default';
const program = new commander.Command("ngs").usage("[global options] command");
program.version(require('./package.json').version);

program
  .option('build', 'build ngs js project')
  .option('jsupdate', 'create symbolic link using builder.json')
  .option('convert', 'convert old style ngs loads/actions to ES6 classes')
  .option('-m, --module <type> ', 'NGS module name')
  .option('-t, --type <type> ', '', 'file type')
  .option('-i, --input [type...]', 'builder.json file')
  .option('-o, --output <type> ', '')
  .option('-f, --force', 'force update clean folder before do update')
  .option('-v, --bversion <type>', 'build app version')
  .option('-d, --dir <dir> ', '');

program.parse(process.argv);
if(program.module){
  ngsModule = program.module;
}
if(process.argv.includes('jsupdate') || process.argv.includes('jupdate')){
  let builder = new Builder(ngsModule);
  builder.jsUpdate('', program.force);
  console.log("DONE!");
  return;
}
if(process.argv.includes('build')){
  let type = 'js';
  let builder = new Builder(ngsModule);
  if(program.type === 'js' || program.type === 'less'){
    type = program.type;
  }
  let buildVersion = null;
  if(program.bversion){
    buildVersion = program.bversion;
  }
  if(program.v === 'js' || program.type === 'less'){
    type = program.type;
  }
  builder.jsBuild(buildVersion);
  console.log("DONE!");
  return;
}
if(process.argv.includes('convert')){
  let type = 'js';
  let builder = new Builder(ngsModule);
  if(program.type === 'js' || program.type === 'less'){
    type = program.type;
  }
  let ngsItemDir = '';
  if(program.dir){
    ngsItemDir = program.dir;
  }
  let converter = new Converter(ngsModule);
  converter.convert(ngsItemDir);
}
if(process.argv.includes('minify')){
  let _builder = new Builder('');
  _builder.minify(program.input);
}