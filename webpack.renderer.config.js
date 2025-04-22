/* eslint-disable @typescript-eslint/no-var-requires */
const config = require('./webpack.base.config');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const rendererConfig = { ...config };
rendererConfig.target = 'electron-renderer';
rendererConfig.entry = {
  renderer: './src/renderer/renderer.ts',
  preload: './src/preload/preload.ts',
  exclusive: './src/renderer/exclusive.ts',
  osr: './src/renderer/osr.ts',
};

// Updated output configuration to handle preload correctly
rendererConfig.output = {
  path: path.join(__dirname, 'dist'),
  filename: (pathData) => {
    switch (pathData.chunk.name) {
      case 'exclusive':
        return 'exclusive/[name].js';
      case 'preload':
        return 'preload/[name].js';
      default:
        return 'renderer/[name].js';
    }
  },
};

rendererConfig.plugins.push(
  new CopyWebpackPlugin({
    patterns: [
      {
        from: path.resolve(__dirname, 'src/renderer/app/dist'),
        to: path.resolve(__dirname, 'dist/renderer/app/dist'),
      },
      {
        from: path.resolve(__dirname, 'src/renderer/osr.css'),
        to: path.resolve(__dirname, 'dist/renderer/osr.css'),
      },
    ],
  }),
);

rendererConfig.plugins.push(
  new HtmlWebpackPlugin({
    template: './src/renderer/index.html',
    filename: path.join(__dirname, './dist/renderer/index.html'),
    chunks: ['renderer'],
    publicPath: '',
    inject: false,
  }),
);

rendererConfig.plugins.push(
  new HtmlWebpackPlugin({
    template: './src/renderer/osr.html',
    filename: path.join(__dirname, './dist/renderer/osr.html'),
    chunks: ['osr'],
    inject: false,
    templateParameters: {
      viteAssetsPath: 'app/dist/assets',
    },
  }),
);

rendererConfig.plugins.push(
  new HtmlWebpackPlugin({
    template: './src/renderer/exclusive.html',
    filename: path.join(__dirname, './dist/exclusive/exclusive.html'),
    chunks: ['exclusive'],
    inject: false,
  }),
);

module.exports = rendererConfig;
