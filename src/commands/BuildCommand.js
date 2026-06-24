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
 * Registers and runs the legacy JavaScript build command.
 *
 * The command object stays thin so command parsing is isolated from the
 * legacy builder implementation and remains simple to test.
 */
export default class BuildCommand {
  /**
   * Refactored legacy builder service that performs JS symlink update,
   * version rewriting, minification, and optional ES5 output.
   *
   * @type {import('../legacy/LegacyJsBuilder.js').default}
   */
  #builder;

  /**
   * Create the command wrapper with its build service dependency.
   *
   * @param {import('../legacy/LegacyJsBuilder.js').default} builder Builder implementation used by the command.
   */
  constructor(builder) {
    this.#builder = builder;
  }

  /**
   * Attach `ngs build` to the Commander program.
   *
   * @param {import('commander').Command} program Root Commander program.
   * @returns {void}
   */
  register(program) {
    program
      .command('build')
      .description('Build legacy NGS JavaScript files')
      .requiredOption('-t, --type <type>', 'build type; only js is supported', 'js')
      .option('-m, --module <module>', 'NGS module name', 'default')
      .option('-v, --bversion <version>', 'build app version')
      .option('-f, --force', 'force update symlinks before build', true)
      .action((options) => this.run(options));
  }

  /**
   * Normalize CLI options and delegate the actual build to LegacyJsBuilder.
   *
   * @param {{type?: string, module?: string, bversion?: string, force?: boolean}} [options] Parsed CLI options.
   * @returns {Promise<string[]>} Paths written by the builder.
   */
  async run(options = {}) {
    return this.#builder.build({
      type: options.type,
      module: options.module,
      version: options.bversion,
      force: options.force ?? true
    });
  }
}
