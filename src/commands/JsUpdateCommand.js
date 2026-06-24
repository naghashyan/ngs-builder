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
 * Registers and runs the legacy JS symlink update command.
 *
 * The command keeps the old `ngs jsupdate` workflow available while the actual
 * implementation lives in a focused updater service.
 */
export default class JsUpdateCommand {
  /**
   * Updater service that reads `builder.json` and creates module symlinks.
   *
   * @type {import('../legacy/LegacyJsUpdater.js').default}
   */
  #updater;

  /**
   * Create the command with its updater dependency.
   *
   * @param {import('../legacy/LegacyJsUpdater.js').default} updater Legacy updater service.
   */
  constructor(updater) {
    this.#updater = updater;
  }

  /**
   * Attach `ngs jsupdate` to the Commander program.
   *
   * @param {import('commander').Command} program Root Commander program.
   * @returns {void}
   */
  register(program) {
    program
      .command('jsupdate')
      .description('Create legacy NGS JavaScript symlinks using builder.json')
      .option('-m, --module <module>', 'NGS module name', 'default')
      .option('-f, --force', 'replace existing symlinks', true)
      .action((options) => this.run(options));
  }

  /**
   * Run symlink update for the selected module.
   *
   * @param {{module?: string, force?: boolean}} [options] Parsed CLI options.
   * @returns {Promise<Array<{sourcePath: string, outPath: string}>>} Created symlink records.
   */
  async run(options = {}) {
    return this.#updater.update(options.module, {force: options.force ?? true});
  }
}
