const Koa = require('koa');
const chalk = require('chalk');
const views = require('koa-views');
const koaStatic = require('koa-static');

const app = new Koa();

const handler = async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.log('server error', err);
    ctx.response.status = e.statusCode || e.status || 500;
  }
}

app.use(handler);

app.use(koaStatic('static'));

app.use(views('.//static/view', {
  extension: 'pug'
}));

let router = require('./router');

//不能写成app.use(router.routes())，热替换会无效
app.use(async (ctx, next) => {
  await router.routes()(ctx, next);
});

if (process.env.NODE_ENV === 'local' && module.hot) {
  module.hot.accept('./router', () => {
    router = require('./router');
  })
}

const port = process.env.PORT || 3006;
const host = process.env.IP || 'localhost';

console.info(chalk.red('sever index.js'));

app.listen(port, host, () => {
  console.info(chalk.red('==> ✅  Server is listening on %s:%d'), host, port);
});