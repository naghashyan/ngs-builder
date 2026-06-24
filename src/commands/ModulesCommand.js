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
 * Registers registry inspection commands.
 *
 * Module metadata is shown directly so maintainers can debug Composer, npm,
 * migration, and dependency declarations before installing a module.
 */
export default class ModulesCommand {
  /**
   * Registry service used to load official, remote, or local module metadata.
   *
   * @type {import('../registry/ModuleRegistry.js').default}
   */
  #registry;

  /**
   * Create the command with its registry dependency.
   *
   * @param {import('../registry/ModuleRegistry.js').default} registry Module registry service.
   */
  constructor(registry) {
    this.#registry = registry;
  }

  /**
   * Attach `ngs modules` and `ngs module info <module>` commands.
   *
   * @param {import('commander').Command} program Root Commander program.
   * @returns {void}
   */
  register(program) {
    program
      .command('modules')
      .description('List available NGS modules')
      .action(() => this.list());

    const moduleCommand = program.command('module').description('Inspect NGS modules');
    moduleCommand
      .command('info <module>')
      .description('Show module metadata')
      .action((module) => this.info(module));
  }

  /**
   * Print and return all modules available from the configured registry.
   *
   * @returns {Promise<object[]>} Module metadata objects.
   */
  async list() {
    const modules = await this.#registry.list();
    for (const module of modules) {
      console.log(`${module.name}${module.title ? ` - ${module.title}` : ''}`);
    }
    return modules;
  }

  /**
   * Print and return one module metadata object.
   *
   * @param {string} name Module registry name.
   * @returns {Promise<object>} Module metadata.
   */
  async info(name) {
    const module = await this.#registry.get(name);
    console.log(JSON.stringify(module, null, 2));
    return module;
  }
}
