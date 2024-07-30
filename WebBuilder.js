/**
 * NGS Web Components builder
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
import fs from 'fs';
import {minify} from 'terser';
import mime from 'mime';
import * as sass from 'sass';
import FileUtil from "./FileUtil.js";

export default class WebBuilder {

    async build() {
        const fileUtil = FileUtil.getInstance();
        const ngsConfig = fileUtil.getNgsConfig();
        const webBuilder = new WebBuilder();
        let ignoreDirs = [];
        for (let i = 0; i < ngsConfig.build.ignore.length; i++) {
            ignoreDirs.push(ngsConfig.build.ignore[i] + '/**');
        }
        const allfiles = await fileUtil.findFilesByExtension(ngsConfig.build.source, '*', ignoreDirs);
        for (let i = 0; i < allfiles.length; i++) {
            let filePath = allfiles[i];
            await webBuilder.copyFile(filePath, ngsConfig.build.source, true, false);
        }

    }

    /**
     *
     * @param sourceFilePath {string}
     * @param outputDir {string|null}
     * @param doCompress {boolean}
     * @param includeSourceMap {boolean}
     */
    async copyFile(sourceFilePath, outputDir = null, doCompress = false, includeSourceMap = false) {
        const fileUtil = FileUtil.getInstance();
        const ngsConfig = fileUtil.getNgsConfig();
        const relativePath = path.relative(ngsConfig.build.source, sourceFilePath);
        outputDir = outputDir ? outputDir : ngsConfig.build.output;
        let outputFilePath = path.resolve(outputDir, relativePath);
        switch (mime.getType(sourceFilePath)) {
            case 'text/x-scss':
                const compiledStyle = this.buildSass(sourceFilePath, outputFilePath, doCompress);
                if (!compiledStyle) {
                    break;
                }
                outputFilePath = FileUtil.getInstance().changeFileExtension(outputFilePath, '.css');
                let outputCssContent = compiledStyle.css;
                if (includeSourceMap) {
                    const outputMapFilePath = outputFilePath + '.map';
                    const sourceMapComment = `/*# sourceMappingURL=${path.basename(outputMapFilePath)} */\n`;
                    outputCssContent += sourceMapComment;
                    await FileUtil.getInstance().createFileRecursively(outputMapFilePath, JSON.stringify(compiledStyle.sourceMap));
                }
                await FileUtil.getInstance().createFileRecursively(outputFilePath, outputCssContent);
                break;
            case 'application/javascript':
                const compiledJsCode = this.jsBuild(sourceFilePath);
                await FileUtil.getInstance().createFileRecursively(outputFilePath, compiledJsCode);
                break;
            default:
                await FileUtil.getInstance().createFileRecursively(outputFilePath, outputFilePath)
        }
    }

    /**
     *
     * @param sourceFilePath {string}
     * @param outputFilePath {string}
     * @param doCompress {boolean}
     * @return {CompileResult}
     */
    buildSass(sourceFilePath, outputFilePath, doCompress = false) {
        let style = doCompress ? "compressed" : "expanded";
        try {
            return sass.compile(sourceFilePath, {
                style: style,
                sourceMap: true,
                sourceMapEmbed: true,
                outFile: outputFilePath,
            });
        } catch (e) {
            console.error(e);
            return null;
        }

    }


    /**
     *
     * build ngs framework js files
     * if set es5 mode true then also convert es6 to es5
     *
     * @return {string}
     */
    async jsBuild(jsFilePath, compress = true) {
        let code = fs.readFileSync(jsFilePath, "utf8");
        code = code.replace(/(import\s.*?\.js)/gm, '$1?' + version);
        code = code.replace(/import\(([^\)]+)\)/gm, "import($1+'?" + version + "')");
        let minifyCode = code;
        if (compress) {
            try {
                minifyCode = await minify(code, {
                    module: true
                });
                minifyCode = minifyCode.code;
                console.log(outJsFile + '  ===> DONE');
            } catch (e) {
                console.error(e, outJsFile + '  ===> ERROR');
            }

        }
        return minifyCode;
    }


};