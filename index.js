#!/usr/bin/env node
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

import NgsCli from './src/cli/NgsCli.js';

const cli = new NgsCli();
await cli.run(process.argv);
