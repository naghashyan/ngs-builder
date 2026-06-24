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
 * Registers removed commands with explicit migration guidance.
 *
 * Keeping a named command that fails clearly is friendlier than letting
 * Commander report an unknown command for workflows that existed historically.
 */
export default class UnsupportedCommand {
  /**
   * Removed command name exposed for compatibility diagnostics.
   *
   * @type {string}
   */
  #name;

  /**
   * Create a removed-command wrapper.
   *
   * @param {string} name Removed command name.
   */
  constructor(name) {
    this.#name = name;
  }

  /**
   * Attach the removed command to Commander so it can print a clear error.
   *
   * @param {import('commander').Command} program Root Commander program.
   * @returns {void}
   */
  register(program) {
    program
      .command(this.#name)
      .description(`Removed command: ${this.#name}`)
      .action(() => this.run());
  }

  /**
   * Throw an actionable error explaining the command removal.
   *
   * @returns {never}
   */
  run() {
    throw new Error(`ngs ${this.#name} was removed. Use ngs build/jsupdate/minify or project-specific tooling instead.`);
  }
}
