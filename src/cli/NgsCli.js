/**
 * NGS CLI
 *
 * @author Naghashyan Solutions LLC
 * @site https://naghashyan.com
 * @year 2026
 * @package @naghashyan/ngs-builder
 *
 * Unified NGS command-line tools for project setup, module installation,
 * migrations orchestration, and legacy JS building.
 */

import {Command} from 'commander';
import CommandRunner from '../process/CommandRunner.js';
import JsonFileCache from '../config/JsonFileCache.js';
import NgsConfig from '../config/NgsConfig.js';
import ModuleRegistry from '../registry/ModuleRegistry.js';
import ComposerInstaller from '../installer/ComposerInstaller.js';
import NpmInstaller from '../installer/NpmInstaller.js';
import MigrationRunner from '../installer/MigrationRunner.js';
import ModuleInstaller from '../installer/ModuleInstaller.js';
import FrontendInitializer from '../installer/FrontendInitializer.js';
import LegacyModuleResolver from '../legacy/LegacyModuleResolver.js';
import LegacyJsUpdater from '../legacy/LegacyJsUpdater.js';
import LegacyJsBuilder from '../legacy/LegacyJsBuilder.js';
import LegacyConverter from '../legacy/LegacyConverter.js';
import LegacyMinifier from '../legacy/LegacyMinifier.js';
import BuildCommand from '../commands/BuildCommand.js';
import JsUpdateCommand from '../commands/JsUpdateCommand.js';
import ConvertCommand from '../commands/ConvertCommand.js';
import MinifyCommand from '../commands/MinifyCommand.js';
import InitCommand from '../commands/InitCommand.js';
import ConfigCommand from '../commands/ConfigCommand.js';
import InstallCommand from '../commands/InstallCommand.js';
import MigrateCommand from '../commands/MigrateCommand.js';
import ModulesCommand from '../commands/ModulesCommand.js';
import UnsupportedCommand from '../commands/UnsupportedCommand.js';

/**
 * Main CLI composition root.
 *
 * This class wires commands to services in one place so individual command and
 * service classes can remain small, testable, and free from global setup logic.
 */
export default class NgsCli {
  /**
   * Project root used for config discovery and legacy module resolution.
   *
   * @type {string}
   */
  #projectRoot;

  /**
   * Create a CLI instance scoped to a project directory.
   *
   * @param {string} [projectRoot] Directory treated as the NGS project root.
   */
  constructor(projectRoot = process.cwd()) {
    this.#projectRoot = projectRoot;
  }

  /**
   * Build the Commander program and register all supported commands.
   *
   * Services are instantiated here because they share configuration and process
   * execution dependencies that should be consistent across commands.
   *
   * @returns {Command} Configured Commander program.
   */
  createProgram() {
    const program = new Command('ngs');
    program.version('2.0.0');
    program.exitOverride();
    program.showHelpAfterError();

    const jsonCache = new JsonFileCache();
    const configStore = new NgsConfig(this.#projectRoot, jsonCache);
    const config = configStore.read();
    const runner = new CommandRunner();
    const registry = new ModuleRegistry(config.registry ?? null, jsonCache);
    const composerInstaller = new ComposerInstaller(runner, config.backendRoot ?? this.#projectRoot);
    const migrationRunner = new MigrationRunner(runner, config.backendRoot ?? this.#projectRoot);
    const npmInstaller = new NpmInstaller(runner);
    const moduleInstaller = new ModuleInstaller(registry, composerInstaller, migrationRunner, npmInstaller, config);
    const resolver = new LegacyModuleResolver(this.#projectRoot, 'default', jsonCache);
    const updater = new LegacyJsUpdater(resolver, jsonCache);

    new BuildCommand(new LegacyJsBuilder(resolver, jsonCache, updater)).register(program);
    new JsUpdateCommand(updater).register(program);
    new ConvertCommand(new LegacyConverter(resolver, jsonCache)).register(program);
    new MinifyCommand(new LegacyMinifier(this.#projectRoot, jsonCache)).register(program);
    new InitCommand(configStore, new FrontendInitializer(runner), moduleInstaller).register(program);
    new ConfigCommand(configStore).register(program);
    new InstallCommand(moduleInstaller).register(program);
    new MigrateCommand(migrationRunner).register(program);
    new ModulesCommand(registry).register(program);
    new UnsupportedCommand('setup').register(program);
    new UnsupportedCommand('watch').register(program);
    new UnsupportedCommand('web-build').register(program);

    return program;
  }

  /**
   * Parse argv and translate Commander errors into process exit codes.
   *
   * @param {string[]} [argv] CLI argument vector.
   * @returns {Promise<number>} Exit code suitable for process.exitCode.
   */
  async run(argv = process.argv) {
    const program = this.createProgram();
    try {
      await program.parseAsync(argv);
    } catch (error) {
      if (error.code === 'commander.helpDisplayed' || error.code === 'commander.version') {
        return 0;
      }
      console.error(error.message);
      process.exitCode = error.exitCode ?? 1;
      return process.exitCode;
    }
    return 0;
  }
}
