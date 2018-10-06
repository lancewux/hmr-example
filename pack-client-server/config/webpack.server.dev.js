'use strict';

const webpack = require('webpack');
const configBase = require('./webpack.server.base');

const configDev = {
  mode: 'development',
  plugins: [
    // 定义被打包的代码里的环境变量
    // cross-env只对控制打包的代码的环境变量生效，对被打包的代码的环境变量无效
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: '"development"'
      }
    })
  ]
}

const config = Object.assign({}, configBase, configDev);
module.exports = config;