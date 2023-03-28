#!/usr/bin/env node
/**
 * NGS builder
 *
 * @author Levon Naghashyan <levon@naghashyan.com>
 * @site https://naghashyan.com
 * @year 2019-2023
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
import {readFile} from 'fs/promises';
import Builder from './Builder.js';
import Converter from './Converter.js';
import {Command} from 'commander/esm.mjs';

export default class NgsBuilder {
  #ngsBuildOptions = {
    'module': 'default',
    'version': '1.0.0',
    'force': true,
    'type': 'js',
    'dir': ''
  };

  constructor() {
    this.initNgsBuilder();
  }

  async initNgsBuilder() {
    this.program = new Command("ngs").usage("[global options] command");
    await this.initCommandLineOptions();
    this.program.parse(process.argv);
    this.handleCommandLineOption(process.argv);
  }

  async initCommandLineOptions() {
    const json = JSON.parse(await readFile(new URL('./package.json', import.meta.url)));
    this.program.version(json.version);
    this.program
      .option('build', 'build ngs js project')
      .option('jsupdate', 'create symbolic link using builder.json')
      .option('convert', 'convert old style ngs loads/actions to ES6 classes')
      .option('-m, --module <module> ', 'NGS module name')
      .option('-t, --type <type> ', 'file type')
      .option('-i, --input <input>', 'builder.json file')
      .option('-o, --output <output> ', '')
      .option('-f, --force', 'force update clean folder before do update')
      .option('-v, --bversion <bversion>', 'build app version')
      .option('-d, --dir <directory> ', '');
  }

  getNgsBuilderOptions() {
    let options = this.program.opts();
    if(options.module){
      this.#ngsBuildOptions.module = options.module;
    }
    if(options.type){
      this.#ngsBuildOptions.type = options.type;
    }
    if(options.force){
      this.#ngsBuildOptions.force = options.force;
    }
    if(options.bversion){
      this.#ngsBuildOptions.version = options.bversion;
    }
    if(options.directory){
      this.#ngsBuildOptions.dir = options.directory;
    }
    if(options.input){
      this.#ngsBuildOptions.input = options.input;
    }
    return this.#ngsBuildOptions;
  }

  handleCommandLineOption(argv) {
    if(argv.includes('jsupdate')){
      return this.jsUpdate();
    }
    if(argv.includes('build')){
      return this.build();
    }
  }

  jsUpdate() {
    let ngsBuildOptions = this.getNgsBuilderOptions();
    let builder = new Builder(ngsBuildOptions);
    builder.jsUpdate();
  }

  build() {
    let ngsBuildOptions = this.getNgsBuilderOptions();
    if(ngsBuildOptions.type === 'js'){
      return this.jsBuild(ngsBuildOptions);
    }

    if(ngsBuildOptions.type === 'sass'){
      return this.sassBuild(ngsBuildOptions);
    }

    if(ngsBuildOptions.type === 'less'){
      return this.lessBuild(ngsBuildOptions);
    }
  }

  jsBuild(ngsBuildOptions) {
    let builder = new Builder(ngsBuildOptions);
    return builder.jsBuild();
  }

  sassBuild(ngsBuildOptions) {

  }

  lessBuild(ngsBuildOptions) {

  }

  convert() {
    let ngsBuildOptions = this.getNgsBuilderOptions();
    let converter = new Converter(ngsBuildOptions);
    return converter.convert();
  }

  minify() {
    let ngsBuildOptions = this.getNgsBuilderOptions();
    let builder = new Builder(ngsBuildOptions);
    return builder.minify();
  }
}
new NgsBuilder();
