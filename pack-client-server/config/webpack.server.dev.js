'use strict';

const webpack = require('webpack');
const configBase = require('./webpack.server.base');

const configDev = {
  mode: 'development',
  plugins: [
    new webpack.DefinePlugin({ //定义打包脚本里的环境变量，cross-env对打包代码的环境变量不起作用
      'process.env': {
        NODE_ENV: '"development"'
      }
    })
  ]
}

const config = Object.assign({}, configBase, configDev);
module.exports = config;