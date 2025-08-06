const path = require('path');
const baseConfig = require('./webpack.base.config');

const preloadConfig = {
  ...baseConfig,
  target: 'electron-preload',
  entry: {
    preload: './src/preload/preload.ts',
  },
  output: {
    path: path.join(__dirname, 'dist/preload'),
    filename: '[name].js',
  },
};

module.exports = preloadConfig;
