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
 * Registers and runs the backend migration command.
 *
 * The command is intentionally a thin proxy to `vendor/bin/ngs-migrate` because
 * SQL execution belongs to the PHP side where project DB configuration lives.
 */
export default class MigrateCommand {
  /**
   * Migration runner that resolves and executes the PHP migration binary.
   *
   * @type {import('../installer/MigrationRunner.js').default}
   */
  #migrationRunner;

  /**
   * Create the command with its migration runner dependency.
   *
   * @param {import('../installer/MigrationRunner.js').default} migrationRunner Migration runner service.
   */
  constructor(migrationRunner) {
    this.#migrationRunner = migrationRunner;
  }

  /**
   * Attach `ngs migrate` to the Commander program.
   *
   * @param {import('commander').Command} program Root Commander program.
   * @returns {void}
   */
  register(program) {
    program
      .command('migrate')
      .description('Run NGS backend database migrations')
      .option('--dry-run', 'print migration command without executing it')
      .action((options) => this.run(options));
  }

  /**
   * Execute or dry-run the migration command.
   *
   * @param {{dryRun?: boolean}} [options] Parsed CLI options.
   * @returns {Promise<object>} Command execution result.
   */
  async run(options = {}) {
    return this.#migrationRunner.run({dryRun: options.dryRun ?? false});
  }
}
