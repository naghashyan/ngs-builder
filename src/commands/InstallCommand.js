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
 * Registers and runs module installation commands.
 *
 * The command delegates dependency ordering and per-package install steps to
 * ModuleInstaller so the CLI surface stays small and predictable.
 */
export default class InstallCommand {
  /**
   * Module orchestration service for Composer, migrations, and npm packages.
   *
   * @type {import('../installer/ModuleInstaller.js').default}
   */
  #moduleInstaller;

  /**
   * Create the command with its installer service.
   *
   * @param {import('../installer/ModuleInstaller.js').default} moduleInstaller Module installer.
   */
  constructor(moduleInstaller) {
    this.#moduleInstaller = moduleInstaller;
  }

  /**
   * Attach `ngs install <module>` to the Commander program.
   *
   * @param {import('commander').Command} program Root Commander program.
   * @returns {void}
   */
  register(program) {
    program
      .command('install <module>')
      .description('Install an NGS module backend, migrations, and optional frontend package')
      .option('--frontend <path>', 'frontend folder path')
      .option('--dry-run', 'print commands without executing them')
      .action((module, options) => this.run(module, options));
  }

  /**
   * Install a named module and print the final ordered install list.
   *
   * @param {string} module Module registry name.
   * @param {{frontend?: string, dryRun?: boolean}} [options] Parsed CLI options.
   * @returns {Promise<string[]>} Installed module names in execution order.
   */
  async run(module, options = {}) {
    const installed = await this.#moduleInstaller.install(module, {
      frontendRoot: options.frontend,
      dryRun: options.dryRun ?? false
    });
    console.log(`Installed modules: ${installed.join(', ')}`);
    return installed;
  }
}
