/**
 * NGS Watcher
 *
 * @author Levon Naghashyan <levon@naghashyan.com>
 * @site https://naghashyan.com
 * @year 2024
 * @package ngs.framework
 * @version 1.0.0
 *
 *
 * This file is part of the NGS package.
 *
 * @copyright Naghashyan Solutions LLC
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 */

'use strict';
import path from 'path';
import browserSync from 'browser-sync';
import chokidar from 'chokidar';
import WebBuilder from "./WebBuilder.js";
import FileUtil from "./FileUtil.js";

export default class Watcher {

    #ngsWatchOptions = {
        'isOpenNewTab': false,
        isEnable: false,
        'port': 3000,
        'uiPort': 3001,
        'outputDir': path.resolve(process.cwd(), 'htdocs'),
        'sourceDir': path.resolve(process.cwd(), 'src'),
        'appDir': path.resolve(process.cwd(), 'src', 'app'),
        'dir': ''
    };
    #browserSync = null;

    async watch() {
        console.log('scss sync started');
        await this.syncProject();
        console.log('scss sync DONE');
        const fileUtil = FileUtil.getInstance();
        const ngsConfig = fileUtil.getNgsConfig();
        if (ngsConfig.build.browserSync.isEnable) {
            this.#createBrowserSync();
        }
        if (ngsConfig.build.watch) {
            this.#watchChanges();
        }
    }

    /**
     * @return {Promise<void>}
     */
    async syncProject() {
        const fileUtil = FileUtil.getInstance();
        const ngsConfig = fileUtil.getNgsConfig();
        const webBuilder = new WebBuilder();
        let ignoreDirs = [];
        for (let i = 0; i < ngsConfig.build.ignore.length; i++) {
            ignoreDirs.push(ngsConfig.build.ignore[i] + '/**');
        }
        const scssFiles = await fileUtil.findFilesByExtension(ngsConfig.build.source, 'scss', ignoreDirs);
        const allfiles = await fileUtil.findFilesByExtension(ngsConfig.build.source, '*', ignoreDirs);
        for (let i = 0; i < scssFiles.length; i++) {
            let scssFile = scssFiles[i];
            await webBuilder.copyFile(scssFile, ngsConfig.build.source, true, true);
        }
    }

    #createBrowserSync() {
        const fileUtil = FileUtil.getInstance();
        const ngsConfig = fileUtil.getNgsConfig();
        this.#browserSync = browserSync.create();
        let publicPath = path.resolve(process.cwd(), ngsConfig.build.output);
        console.log(ngsConfig.build.browserSync.port);
        this.#browserSync.init({
            server: {
                baseDir: publicPath
            },
            files: [publicPath + '/**/*.*'], // Watch all files in the public directory
            notify: true,
            open: ngsConfig.build.browserSync.isOpenNewTab,
            port: ngsConfig.build.browserSync.port,
            ui: {
                port: ngsConfig.build.browserSync.uiPort
            },
            callbacks: {
                ready: function (err, bs) {
                    if (err) {
                        logger(`Error: ${err.message}`);
                    } else {
                        logger(`is running at http://localhost:${bs.options.get('port')}`);
                    }
                }
            }
        }, () => {
            console.log('Ngs BrowserSync is running...');
        });
        if (!ngsConfig.build.browserSync.isOpenNewTab) {
            this.#browserSync.reload();
        }
        const logger = (message) => {
            console.log(`[Ngs Watcher]: ${message}`);
        };
    }


    /**
     *
     * build ngs framework js files
     * if set es5 mode true then also convert es6 to es5
     *
     * @return Promise
     */
    #watchChanges() {
        const webBuilder = new WebBuilder();
        const fileUtil = FileUtil.getInstance();
        const ngsConfig = fileUtil.getNgsConfig();
        let ignoreDirs = [];
        for (let i = 0; i < ngsConfig.build.ignore.length; i++) {
            ignoreDirs.push(ngsConfig.build.ignore[i] + '/**');
        }
        const pattern = `${ngsConfig.build.source}/**/*.scss`;
        const watcher = chokidar.watch(pattern, {
            persistent: true,
            ignored: ignoreDirs
        });
        watcher
            .on('change', async filePath => {
                await webBuilder.copyFile(filePath, ngsConfig.build.source, true, true);
                if (ngsConfig.build.browserSync.isEnable && ngsConfig.build.browserSync.reload) {
                    this.#browserSync.reload();
                }
            })
            .on('error', error => console.error(`Watcher error: ${error}`));
        console.log('NGS Watcher is running...');
    }


};