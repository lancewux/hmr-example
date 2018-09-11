'use strict';

const nodeExternals = require('webpack-node-externals');
const path = require('path');

const outputPath = path.join(__dirname, '../tmpDist/server');

module.exports = {
  target: 'node',
  context: path.resolve(__dirname, './'),
  entry: {
    index: ['../server/index']
  },
  output: {
    path: outputPath,
    publicPath: '/',
    filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /\.(ico|gif|png|jpg|jpeg|svg|webp)$/,
        loaders: require.resolve('url-loader'),
        exclude: /node_modules/
      }, {
        test: /.(svg|scss|css)$/,
        loaders: require.resolve('ignore-loader'),
      }, {
        test: /\.(js|jsx)$/,
        use: [{
          loader: require.resolve('babel-loader'),
        }]
      }],
  },
  externals: [nodeExternals({
    whitelist: [/^webpack/] //这里需要把webpack/hot/poll加入白名单
  })],
  resolve: {
    extensions: ['.json', '.js', '.jsx']
  },
};
