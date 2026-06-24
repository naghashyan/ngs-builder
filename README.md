# NGS CLI

`@naghashyan/ngs-builder` publishes the `ngs` command-line tool for NGS projects. It is the unified project helper for module installation, PHP migration orchestration, frontend package setup, and the legacy JavaScript build commands that older NGS applications still depend on.

## Why This Package Exists

NGS modules can contain more than one installation step. A backend module may need a Composer package, database migrations, and a matching frontend npm package. Composer scripts are not a good place to run SQL automatically, and installing a frontend package from a backend Composer package is also not reliable.

The `ngs` CLI keeps those responsibilities explicit:

- Composer installs backend PHP packages.
- PHP owns database migrations through `vendor/bin/ngs-migrate`.
- npm installs frontend packages in the configured frontend folder.
- NGS module metadata defines dependency order and install steps.
- Legacy JavaScript commands stay available for old NGS projects that still build with `web/js/builder.json`.

This makes module installation repeatable without hiding database changes inside Composer lifecycle scripts.

## Requirements

- Node.js 24.11.0 or newer.
- npm compatible with Node.js 24.
- Composer available in backend projects that install PHP modules.
- `vendor/bin/ngs-migrate` available when backend migrations are enabled.

The package targets Node.js 24+ native ESM and uses the current Babel 8, Commander 15, ESLint 10, and Terser toolchain.

## Installation

Install globally when you want the `ngs` command available everywhere:

```bash
npm install -g @naghashyan/ngs-builder
```

Or run it through npm scripts inside a project if your team prefers local tool versions.

## Project Bootstrap

Use `ngs init` for first-time project setup:

```bash
ngs init
ngs init --frontend ../front
ngs init --skip-front
ngs init --with-admin-tools
```

When frontend initialization is enabled, `ngs init` creates the frontend folder if needed, runs `npm init -y` when `package.json` is missing, and installs the base frontend packages:

```bash
npm install @naghashyan/ngs-front-core @naghashyan/ngs-front-admin-tools
```

Use `--skip-front` for backend-only projects or when the frontend is managed separately.

## Project Config

Use `ngs config` to view or update local project settings:

```bash
ngs config
ngs config get
ngs config get frontendRoot
ngs config set frontendRoot ../front
ngs config set registry ./ngs-modules
```

Config is stored in `.ngs/config.json`:

```json
{
  "backendRoot": "/path/to/api",
  "frontendRoot": "/path/to/front",
  "frontend": {
    "initialized": true,
    "packages": [
      "@naghashyan/ngs-front-core",
      "@naghashyan/ngs-front-admin-tools"
    ]
  },
  "registry": null
}
```

## Module Registry

The CLI can load module definitions from a registry, for example a repository such as `naghashyan/ngs-modules` or a local registry folder configured with `ngs config set registry`.

A registry entry describes the module name, dependencies, Composer package, migration requirement, and frontend npm package. During installation, dependencies are resolved first so shared modules are installed before modules that require them.

Useful commands:

```bash
ngs modules
ngs module info admin-tools-snippets
ngs install admin-tools-snippets
```

## Module Installation Flow

`ngs install admin-tools-snippets` can coordinate these steps in order:

1. Install required Composer packages for backend modules.
2. Run backend migrations through `vendor/bin/ngs-migrate` when the module declares migrations.
3. Install frontend npm packages in the configured frontend folder.
4. Stop immediately if any required step fails.

Database migrations are intentionally not run from Composer package scripts. They stay in PHP and are executed by the explicit `ngs migrate` command or by the installer when a module declares that migrations are required.

Run migrations directly with:

```bash
ngs migrate
```

## Legacy JavaScript Commands

Older NGS projects still use legacy JavaScript build configuration files. These commands are retained and refactored into the new CLI structure:

```bash
ngs jsupdate -m module_name
ngs build -t js -m module_name -v 1.0.0
ngs convert -m module_name -d loads
ngs minify -i web/js/util/builder.json
```

Supported legacy config files include:

- `web/js/builder.json`
- `convert.config.json`
- existing NGS module path conventions

The legacy builder validates module paths, validates `builder.json`, caches parsed JSON reads, normalizes paths across platforms, and produces clearer errors for missing source files.

## Removed Commands

These commands were removed intentionally:

```bash
ngs setup
ngs watch
ngs web-build
```

Use `ngs init`, `ngs config`, module-specific install commands, and project-specific frontend tooling instead.

## Development

Install dependencies and run checks:

```bash
npm install
npm run check
```

Available scripts:

```bash
npm run lint
npm run lint:fix
npm test
npm run check
```

The test suite uses Node's built-in test runner and includes coverage for command parsing, removed command errors, registry loading, install ordering, command construction, legacy JS update/build/convert/minify behavior, Babel 8 ES5 output, and source JSDoc coverage.

## Publishing Notes

Before publishing to npm or GitHub, run:

```bash
npm run check
npm audit --audit-level=low
```

Do not publish generated `node_modules`. Keep migrations in PHP packages and keep module orchestration in this CLI.