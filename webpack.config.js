/* eslint-disable @typescript-eslint/no-var-requires */
const mainConfig = require('./webpack.base.config');
const rendererConfig = require('./webpack.renderer.config');

module.exports = [mainConfig, rendererConfig];
