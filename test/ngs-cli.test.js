import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import ModuleRegistry from '../src/registry/ModuleRegistry.js';
import ComposerInstaller from '../src/installer/ComposerInstaller.js';
import NpmInstaller from '../src/installer/NpmInstaller.js';
import MigrationRunner from '../src/installer/MigrationRunner.js';
import ModuleInstaller from '../src/installer/ModuleInstaller.js';
import FrontendInitializer from '../src/installer/FrontendInitializer.js';
import LegacyModuleResolver from '../src/legacy/LegacyModuleResolver.js';
import LegacyJsUpdater from '../src/legacy/LegacyJsUpdater.js';
import LegacyJsBuilder from '../src/legacy/LegacyJsBuilder.js';
import LegacyMinifier from '../src/legacy/LegacyMinifier.js';
import NgsCli from '../src/cli/NgsCli.js';

class MockRunner {
  calls = [];
  failOn = null;

  async run(command, args, options) {
    this.calls.push({command, args, options});
    if (this.failOn && command === this.failOn) {
      throw new Error(`failed ${command}`);
    }
    return {command, args, options, code: 0};
  }
}

async function tempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'ngs-cli-'));
}

test('registry resolves dependency order', async () => {
  const registry = new ModuleRegistry();
  const ordered = await registry.resolveInstallOrder('admin-tools-snippets');
  assert.deepEqual(ordered.map((item) => item.name), ['admin-tools', 'admin-tools-snippets']);
});

test('registry loads modules from a local directory', async () => {
  const root = await tempDir();
  await fs.mkdir(path.join(root, 'modules'));
  await fs.writeFile(path.join(root, 'modules', 'custom.json'), JSON.stringify({name: 'custom', requires: []}));
  const registry = new ModuleRegistry(root);
  const modules = await registry.list();
  assert.equal(modules[0].name, 'custom');
});

test('install builds composer, migration, and npm commands in dependency order', async () => {
  const runner = new MockRunner();
  const projectRoot = await tempDir();
  const frontendRoot = await tempDir();
  const registry = new ModuleRegistry();
  const installer = new ModuleInstaller(
    registry,
    new ComposerInstaller(runner, projectRoot),
    new MigrationRunner(runner, projectRoot),
    new NpmInstaller(runner),
    {frontendRoot}
  );

  const installed = await installer.install('admin-tools-snippets', {dryRun: true});
  assert.deepEqual(installed, ['admin-tools', 'admin-tools-snippets']);
  assert.deepEqual(runner.calls.map((call) => call.command), ['composer', process.platform === 'win32' ? 'php' : path.join(projectRoot, 'vendor', 'bin', 'ngs-migrate'), 'npm', 'composer', process.platform === 'win32' ? 'php' : path.join(projectRoot, 'vendor', 'bin', 'ngs-migrate'), 'npm']);
});

test('install stops after composer failure', async () => {
  const runner = new MockRunner();
  runner.failOn = 'composer';
  const projectRoot = await tempDir();
  const registry = new ModuleRegistry();
  const installer = new ModuleInstaller(
    registry,
    new ComposerInstaller(runner, projectRoot),
    new MigrationRunner(runner, projectRoot),
    new NpmInstaller(runner),
    {}
  );

  await assert.rejects(() => installer.install('admin-tools-snippets'), /failed composer/);
  assert.equal(runner.calls.length, 1);
});

test('frontend init creates npm init and base package install commands', async () => {
  const runner = new MockRunner();
  const frontendRoot = path.join(await tempDir(), 'front');
  const initializer = new FrontendInitializer(runner);
  const result = await initializer.init(frontendRoot, {dryRun: true});

  assert.deepEqual(result.packages, ['@naghashyan/ngs-front-core', '@naghashyan/ngs-front-admin-tools']);
  assert.deepEqual(runner.calls.map((call) => call.args), [
    ['init', '-y'],
    ['install', '@naghashyan/ngs-front-core', '@naghashyan/ngs-front-admin-tools']
  ]);
});

test('command constructors create expected composer/npm/migration commands', async () => {
  const runner = new MockRunner();
  const projectRoot = await tempDir();
  const frontendRoot = await tempDir();
  assert.deepEqual(new ComposerInstaller(runner, projectRoot).buildCommand('vendor/package'), {
    command: 'composer',
    args: ['require', 'vendor/package', '--no-interaction'],
    cwd: projectRoot
  });
  assert.deepEqual(new NpmInstaller(runner).buildCommand('@vendor/package', frontendRoot), {
    command: 'npm',
    args: ['install', '@vendor/package'],
    cwd: frontendRoot
  });
  assert.equal(new MigrationRunner(runner, projectRoot).buildCommand().cwd, projectRoot);
});

test('legacy jsupdate creates configured symlinks', async () => {
  const root = await tempDir();
  await fs.mkdir(path.join(root, 'web', 'js', 'src'), {recursive: true});
  await fs.writeFile(path.join(root, 'web', 'js', 'src', 'A.js'), 'export default class A {}');
  await fs.writeFile(path.join(root, 'web', 'js', 'builder.json'), JSON.stringify({builders: [{source_dir: 'src', out_dir: 'out', module: 'default', files: ['A.js']}]}));
  const resolver = new LegacyModuleResolver(root, 'default');
  const updater = new LegacyJsUpdater(resolver);
  const created = await updater.update('default', {force: true});
  assert.equal(created.length, 1);
  const stat = await fs.lstat(path.join(root, 'web', 'js', 'out', 'A.js'));
  assert.equal(stat.isSymbolicLink(), true);
});

test('legacy minify writes bundle output', async () => {
  const root = await tempDir();
  await fs.mkdir(path.join(root, 'src'), {recursive: true});
  await fs.writeFile(path.join(root, 'src', 'a.js'), 'const a = 1; console.log(a);');
  await fs.writeFile(path.join(root, 'builder.json'), JSON.stringify({source_dir: 'src', out_file: 'dist/app.js', compress: false, files: ['a.js']}));
  const output = await new LegacyMinifier(root).minify('builder.json');
  assert.equal(output.length, 1);
  assert.match(await fs.readFile(path.join(root, 'dist', 'app.js'), 'utf8'), /console\.log/);
});

test('legacy minify writes Babel 8 compatible ES5 bundle output', async () => {
  const root = await tempDir();
  await fs.mkdir(path.join(root, 'src'), {recursive: true});
  await fs.writeFile(path.join(root, 'src', 'a.js'), 'const run = () => 1; export default run;');
  await fs.writeFile(path.join(root, 'builder.json'), JSON.stringify({source_dir: 'src', out_file: 'dist/app.js', es5: true, es5_out_file: 'dist/app.es5.js', compress: false, files: ['a.js']}));
  const output = await new LegacyMinifier(root).minify('builder.json');
  const es5Code = await fs.readFile(path.join(root, 'dist', 'app.es5.js'), 'utf8');

  assert.deepEqual(output.map((item) => path.relative(root, item)), ['dist/app.js', 'dist/app.es5.js']);
  assert.doesNotMatch(es5Code, /=>/);
  assert.match(es5Code, /System\.register/);
});

test('legacy build writes Babel 8 compatible ES5 module output', async () => {
  const root = await tempDir();
  await fs.mkdir(path.join(root, 'web', 'js'), {recursive: true});
  await fs.writeFile(path.join(root, 'web', 'js', 'A.js'), 'const run = () => 1; export default run;');
  await fs.writeFile(path.join(root, 'web', 'js', 'builder.json'), JSON.stringify({out_dir: 'dist', es5: true, es5_out_dir: 'web/js/es5', compress: false, builders: []}));
  const resolver = new LegacyModuleResolver(root, 'default');
  const output = await new LegacyJsBuilder(resolver).build({type: 'js', module: 'default', version: '1.0.0'});
  const es5Code = await fs.readFile(path.join(root, 'web', 'js', 'es5', 'A.js'), 'utf8');

  assert.ok(output.some((item) => item.endsWith(path.join('web', 'js', 'es5', 'A.js'))));
  assert.doesNotMatch(es5Code, /=>/);
  assert.match(es5Code, /System\.register/);
});

test('cli registers init, config, new module commands, and removed commands', () => {
  const program = new NgsCli(process.cwd()).createProgram();
  const commandNames = program.commands.map((command) => command.name());
  assert.ok(commandNames.includes('init'));
  assert.ok(commandNames.includes('config'));
  assert.ok(commandNames.includes('install'));
  assert.ok(commandNames.includes('migrate'));
  assert.ok(commandNames.includes('modules'));
  assert.ok(commandNames.includes('build'));
  assert.ok(commandNames.includes('setup'));
  assert.ok(commandNames.includes('watch'));
  assert.ok(commandNames.includes('web-build'));
});

test('config set writes local config', async () => {
  const root = await tempDir();
  const program = new NgsCli(root).createProgram();
  await program.parseAsync(['node', 'ngs', 'config', 'set', 'registry', './modules']);
  const config = JSON.parse(await fs.readFile(path.join(root, '.ngs', 'config.json'), 'utf8'));
  assert.equal(config.registry, './modules');
  assert.equal(config.backendRoot, root);
});

test('removed commands report unsupported error', async () => {
  const program = new NgsCli(process.cwd()).createProgram();
  await assert.rejects(() => program.parseAsync(['node', 'ngs', 'watch']), /was removed/);
  await assert.rejects(() => program.parseAsync(['node', 'ngs', 'setup']), /was removed/);
});

test('source classes, private fields, and methods have JSDoc', async () => {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const root = path.join(repoRoot, 'src');
  const files = [];

  async function collectFiles(directory) {
    const entries = await fs.readdir(directory, {withFileTypes: true});
    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await collectFiles(entryPath);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        files.push(entryPath);
      }
    }
  }

  function hasJsDocBefore(lines, index) {
    for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
      const text = lines[cursor].trim();
      if (text === '') {
        continue;
      }
      return text === '*/';
    }
    return false;
  }

  function needsJsDoc(line) {
    if (line.startsWith('export default class ')) {
      return true;
    }
    if (!line.startsWith('  ')) {
      return false;
    }
    const trimmed = line.trim();
    if (/^(if|for|while|switch|catch|return|resolve|reject)\b/.test(trimmed)) {
      return false;
    }
    if (/^#\w+(\s*=|;)/.test(trimmed)) {
      return true;
    }
    if (/^(async\s+)?#?\w+\s*\([^)]*\)\s*\{/.test(trimmed)) {
      return true;
    }
    return /^get\s+\w+\s*\(/.test(trimmed);
  }

  await collectFiles(root);
  const missing = [];
  for (const file of files) {
    const lines = (await fs.readFile(file, 'utf8')).split('\n');
    lines.forEach((line, index) => {
      if (needsJsDoc(line) && !hasJsDocBefore(lines, index)) {
        missing.push(`${path.relative(root, file)}:${index + 1} ${line.trim()}`);
      }
    });
  }

  assert.deepEqual(missing, []);
});
