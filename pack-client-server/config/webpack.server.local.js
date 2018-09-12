'use strict';

const webpack = require('webpack');
const path = require('path');

const configBase = require('./webpack.server.base');

const entry = configBase.entry;
for (let hash in entry) {
  entry[hash].push('webpack/hot/poll?1000');
}

const configLocal = {
  mode: 'none',
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: '"local"'
      }
    }),
    new webpack.HotModuleReplacementPlugin()
  ]
}

const config = Object.assign({}, configBase, configLocal);
module.exports = config;