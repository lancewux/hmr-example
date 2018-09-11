const express = require('express');
const chalk = require('chalk');
const path = require('path');

const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');
const config = require('../config/webpack.config.local.js');
const { enableLocalServerRender } = require('../config/constant');

const app = express();

app.use(express.static('static'));

app.set("view engine", "pug");
app.set('views', path.resolve(__dirname, '../static/view'));

if (process.env.NODE_ENV === 'local') {
  const compiler = webpack(config);
  app.use(webpackDevMiddleware(compiler, {
    publicPath: '/dist/'
  }));
  app.use(webpackHotMiddleware(compiler));
  //use babel to transform client code for server rendering
  if (enableLocalServerRender) {
    require("babel-register")({
      extensions: [".jsx", ".js"],
      plugins: ["ignore-html-and-css-imports"],
      cache: false
    });
  }
}

const router = require('./router');
app.use('/', router);

const port = process.env.PORT || 3006;
const host = process.env.IP || 'localhost';

app.listen(port, host, () => {
  console.info(chalk.red('==> ✅  Server is listening on %s:%d'), host, port);
});