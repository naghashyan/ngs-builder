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
 * Registers and runs the legacy load/action converter command.
 *
 * The converter is intentionally retained because older NGS projects still need
 * a migration path from `NGS.createLoad` / `NGS.createAction` syntax to ES modules.
 */
export default class ConvertCommand {
  /**
   * Converter service that rewrites legacy JavaScript source files in place.
   *
   * @type {import('../legacy/LegacyConverter.js').default}
   */
  #converter;

  /**
   * Create the command wrapper with its converter dependency.
   *
   * @param {import('../legacy/LegacyConverter.js').default} converter Legacy converter service.
   */
  constructor(converter) {
    this.#converter = converter;
  }

  /**
   * Attach `ngs convert` to the Commander program.
   *
   * @param {import('commander').Command} program Root Commander program.
   * @returns {void}
   */
  register(program) {
    program
      .command('convert')
      .description('Convert old style NGS loads/actions to ES modules')
      .option('-m, --module <module>', 'NGS module name', 'default')
      .option('-t, --type <type>', 'legacy item type; accepted for compatibility')
      .option('-d, --dir <directory>', 'loads/actions directory relative to module web/js', '')
      .action((options) => this.run(options));
  }

  /**
   * Normalize CLI options and run the converter.
   *
   * @param {{module?: string, type?: string, dir?: string}} [options] Parsed CLI options.
   * @returns {Promise<string[]>} Converted file paths.
   */
  async run(options = {}) {
    return this.#converter.convert({module: options.module, type: options.type, dir: options.dir ?? ''});
  }
}
