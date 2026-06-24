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

/**
 * Installs registry modules across backend, database, and frontend concerns.
 *
 * The installer follows registry dependency order and stops on the first failed
 * step so partial installs are visible and not hidden by later commands.
 */
export default class ModuleInstaller {
  /**
   * Module registry used for metadata and dependency ordering.
   *
   * @type {import('../registry/ModuleRegistry.js').default}
   */
  #registry;

  /**
   * Backend Composer package installer.
   *
   * @type {import('./ComposerInstaller.js').default}
   */
  #composerInstaller;

  /**
   * Backend migration runner.
   *
   * @type {import('./MigrationRunner.js').default}
   */
  #migrationRunner;

  /**
   * Frontend npm package installer.
   *
   * @type {import('./NpmInstaller.js').default}
   */
  #npmInstaller;

  /**
   * Local NGS config used for default frontend folder resolution.
   *
   * @type {object}
   */
  #config;

  /**
   * Create the module installer with all required install services.
   *
   * @param {import('../registry/ModuleRegistry.js').default} registry Module registry.
   * @param {import('./ComposerInstaller.js').default} composerInstaller Composer installer.
   * @param {import('./MigrationRunner.js').default} migrationRunner Migration runner.
   * @param {import('./NpmInstaller.js').default} npmInstaller npm installer.
   * @param {object} [config] Local project config.
   */
  constructor(registry, composerInstaller, migrationRunner, npmInstaller, config = {}) {
    this.#registry = registry;
    this.#composerInstaller = composerInstaller;
    this.#migrationRunner = migrationRunner;
    this.#npmInstaller = npmInstaller;
    this.#config = config;
  }

  /**
   * Install a module and all of its registry dependencies.
   *
   * @param {string} moduleName Module registry name.
   * @param {{frontendRoot?: string, dryRun?: boolean}} [options] Install options.
   * @returns {Promise<string[]>} Installed module names in execution order.
   */
  async install(moduleName, options = {}) {
    const orderedModules = await this.#registry.resolveInstallOrder(moduleName);
    const installed = [];

    for (const module of orderedModules) {
      console.log(`Installing ${module.name}`);
      if (module.backend?.composer) {
        await this.#composerInstaller.install(module.backend.composer, options);
      }
      if (module.backend?.migrations) {
        await this.#migrationRunner.run(options);
      }
      if (module.frontend?.npm) {
        const frontendRoot = options.frontendRoot ?? this.#config.frontendRoot;
        if (frontendRoot) {
          await this.#npmInstaller.install(module.frontend.npm, frontendRoot, options);
        } else if (module.frontend.required) {
          throw new Error(`Frontend folder is required for module ${module.name}`);
        } else {
          console.log(`Skipped frontend install for ${module.name}: frontend folder is not configured.`);
        }
      }
      installed.push(module.name);
    }

    return installed;
  }

  /**
   * Build the command plan for a module install without executing commands.
   *
   * @param {string} moduleName Module registry name.
   * @param {{frontendRoot?: string}} [options] Plan options.
   * @returns {Promise<Array<{command: string, args: string[], cwd: string}>>} Command descriptors.
   */
  async buildPlan(moduleName, options = {}) {
    const orderedModules = await this.#registry.resolveInstallOrder(moduleName);
    const commands = [];
    for (const module of orderedModules) {
      if (module.backend?.composer) {
        commands.push(this.#composerInstaller.buildCommand(module.backend.composer, options));
      }
      if (module.backend?.migrations) {
        commands.push(this.#migrationRunner.buildCommand());
      }
      const frontendRoot = options.frontendRoot ?? this.#config.frontendRoot;
      if (module.frontend?.npm && frontendRoot) {
        commands.push(this.#npmInstaller.buildCommand(module.frontend.npm, frontendRoot));
      }
    }
    return commands;
  }
}
