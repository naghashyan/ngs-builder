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
 * Registers and runs the legacy bundle minifier command.
 *
 * This command supports existing `builder.json` bundle configs while keeping
 * minification logic outside of the command parser.
 */
export default class MinifyCommand {
  /**
   * Minifier service that reads bundle config and writes output files.
   *
   * @type {import('../legacy/LegacyMinifier.js').default}
   */
  #minifier;

  /**
   * Create the command with its minifier dependency.
   *
   * @param {import('../legacy/LegacyMinifier.js').default} minifier Legacy minifier service.
   */
  constructor(minifier) {
    this.#minifier = minifier;
  }

  /**
   * Attach `ngs minify` to the Commander program.
   *
   * @param {import('commander').Command} program Root Commander program.
   * @returns {void}
   */
  register(program) {
    program
      .command('minify')
      .description('Build minified legacy JavaScript bundle from a builder config')
      .requiredOption('-i, --input <input>', 'builder JSON file')
      .action((options) => this.run(options));
  }

  /**
   * Run minification for the provided builder config.
   *
   * @param {{input: string}} [options] Parsed CLI options.
   * @returns {Promise<string[]>} Output file paths.
   */
  async run(options = {}) {
    return this.#minifier.minify(options.input);
  }
}
