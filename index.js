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
let ngsModule = 'default';

const program = new commander.Command("ngs").usage("[global options] command");
program
  .option('-b, --build <type> ', 'NGS module name', 'js')
  .option('-m, --module <type> ', 'NGS module name');


program.parse(process.argv);
if(program.module){
  ngsModule = program.module;
}
if(program.build && program.build === 'js'){
  let builder = new Builder(ngsModule);
  builder.jsBuild();
}