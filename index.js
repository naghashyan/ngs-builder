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
const commander = require('commander');
const Builder = require('./Builder');
const Converter = require('./Converter');
let ngsModule = 'default';
const program = new commander.Command("ngs").usage("[global options] command");
program.version(require('./package.json').version);

program
  .option('-m, --module <type> ', 'NGS module name')
  .option('-t, --type <type> ', '');

program.parse(process.argv);
if(program.module){
  ngsModule = program.module;
}
if(process.argv.includes('jupdate')){
  let builder = new Builder(ngsModule);
  builder.jUpdate();
  return;
}
if(process.argv.includes('build')){
  let type = 'js';
  let builder = new Builder(ngsModule);
  if(program.type === 'js' || program.type === 'less'){
    type = program.type;
  }
  builder.jsBuild();
  return;
}
if(process.argv.includes('convert')){
  let type = 'js';
  let builder = new Builder(ngsModule);
  if(program.type === 'js' || program.type === 'less'){
    type = program.type;
  }
  let converter = new Converter(ngsModule);
  converter.convert();
}
