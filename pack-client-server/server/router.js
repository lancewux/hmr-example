
const Router = require('koa-router');
const chalk = require('chalk');
const router = new Router();
const getData = require('./api');

const Home = require('../client/component/Home.jsx');
const React = require('react');
const ReactDOM = require('react-dom/server');

const assets = require('../tmpDist/assets.json');
const { enableLocalServerRender } = require('../config/constant');

router.get('/', async (ctx, next) => {
  const entryJs = assets['home'] && assets['home']['js'] || '';
  const entryCss = assets['home'] && assets['home']['css'] || '';
  const prefetchedData = { framework: 'koa' };
  console.log(chalk.red('### getData %s'), getData());
  let reactString;
  if (process.env.NODE_ENV === 'local' && !enableLocalServerRender) {
    reactString = '';
  } else {
    reactString = ReactDOM.renderToString(
      React.createElement(Home.default || '')
    );
  }
  await ctx.render('page', {
    prefetchedData: JSON.stringify(prefetchedData),
    reactString,
    entryCss,
    entryJs
  });
});

module.exports = router;