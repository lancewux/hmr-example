# 使用服务端渲染的多页面应用实现客户端与服务端热更新的几种解决方案。

多页面应用(MPA, multi-page application)具有更快的首屏加载速度和更好的SEO([search engine optimization](https://en.wikipedia.org/wiki/Search_engine_optimization))，已经超过单页面应用(SPA,[Single-page application](https://en.wikipedia.org/wiki/Single-page_application))，成为更受欢迎的前端技术方案。为了更快的页面呈现速度，通常还会采用服务端渲染技术(SSR, Server Side Rendering)。为了提高开发效率，大家一般会在开发时使用热加载技术。本文接下来要探讨一下，对于使用服务端渲染的多页面应用，有哪些实现客户端与服务端热加载的解决方案。

首先区分一下几个概念。热重启(hot restart)、热编译(hot recompile)、热加载(hot reload)、热替换(hot replace)、热刷新(hot refresh)、热更新(hot update)。热重启一般是指服务端代码发生变化时自动重启服务。热编译一般是指相关代码发生变化时自动重新编译代码。热加载一般指相关代码发生变化时自动加载新的代码（通过网络请求或者文件系统读取新的代码）。热替换一般是指在不重新加载页面或者重启服务的情况下自动替换热加载的代码（由于都是模块化的代码，所以一般是指自动替换热加载的模块）。热刷新一般是指客户端代码热加载后自动刷新页面。本文的热更新主要是对上面技术的一种统称。

接下来分服务端代码打包、服务端代码不打包且使用[express](https://github.com/expressjs/express)和服务端代码不打包且使用[koa](https://github.com/koajs/koa)三种场景进行分析。

## 服务端代码打包时的热更新方案。

启用服务端渲染时，由于node不能直接运行客户端代码，最简单的解决方法就是对服务端代码进行打包。

### 客户端热更新

虽然webpack支持模块热替换(HMR,[hot module replacement](https://webpack.js.org/concepts/hot-module-replacement/))功能，但不是默认包含的。使用[webpack.HotModuleReplacementPlugin](https://webpack.js.org/plugins/hot-module-replacement-plugin/)插件后，才能完全开启HMR功能。HotModuleReplacementPlugin通过注册一些编译时的钩子([Hook](https://github.com/webpack/tapable))来注入HMR功能，比如重新编译时采用增量编译而不是全量编译。另外，还会把HMR的[runtime](https://github.com/webpack/webpack/blob/master/lib/HotModuleReplacement.runtime.js)注入到webpackBootstrap中，runtime定义了相关的[api](https://webpack.js.org/api/hot-module-replacement/)，比如module.hot.accept。根据[官方教程](https://webpack.js.org/guides/hot-module-replacement/)，我们需要在代码中加入module.hot.accept函数来替换已经热加载的新模块，否则会收到告警“[HMR] The following modules couldn't be hot updated: (Full reload needed)。This is usually because the modules which have changed (and their parents) do not know how to hot reload themselves.”。父模块引入子模块时，引用的是子模块的module.exports对象，热加载后，虽然webpack中的模块(installedModules)都已经更新了，但是，内存中父模块依赖的子模块的module.exports对象并没有被替换，所以要在accept函数中来处理一下。这里有个细节要注意一下，官方文档说，对于api

```
module.hot.accept(
  dependencies, // Either a string or an array of strings
  callback // Function to fire when the dependencies are updated
);
```

使用CommonJS时，需要在callback中手动require新模块来更新依赖，而使用ESM import时，引入的模块会被自动更新。个人测试的结果是，import的模块并没有被自动更新。但是又不能在callback中用import新模块的方式来更新依赖。怎么办呢？可以使用api：

```
module.hot.accept(
  errorHandler // Function to handle errors when evaluating the new version
);
```

该模块会更新自己，那依赖的子模块自然也被更新了。虽然这个api会阻止更新事件冒泡，但是一般会把这个函数放在最上层的模块中，所以就没影响了。

热更新会重置页面的状态，如果想保留页面的状态，可以使用[react-hot-loader](https://github.com/gaearon/react-hot-loader)。

上面说的都是js代码的热替换，那css代码的热替换呢？可以用[css-hot-loader](https://github.com/shepherdwind/css-hot-loader)来实现。

客户端热更新主要依靠[webpack-dev-server](https://github.com/webpack/webpack-dev-server#readme)来实现。webpack-dev-server主要包括热编译和热加载两个功能。webpack-dev-server集成了[webpack-dev-middleware](https://github.com/webpack/webpack-dev-middleware)中间件。webpack-dev-middleware把编译的输出文件存在[memory-fs](https://github.com/webpack/memory-fs)提供的内存文件系统中，以加快存取速度。webpack-dev-middleware调用compiler.watch函数来启动webpack的watch模式；当源文件发生变化时，webpack就会重新编译；当使用了HotModuleReplacementPlugin时，这里的重新编译其实是增量编译，不会像第一次编译那样编译整个工程代码，而是只编译发生变化的源文件并只输出发生变化的chunks和json文件，编译生成的json文件和chunks都是用上一个hash值命名的，比如‘62547a0be0169d5f328f.hot-update.json’和‘0.62547a0be0169d5f328f.hot-update.js’。一个json文件的示例如下，前面是新的hash值，后面是新的chunks信息。

```
{"h":"57080b114a576212e8f8","c":{"0":true}}
```

webpack-dev-server启动了一个express服务，把请求映射到相关文件。webpack-dev-server的热加载采用[WebSocket](https://en.wikipedia.org/wiki/WebSocket)通信协议实现，分为服务端和客户端两部分。服务端用[sockjs-node](https://github.com/sockjs/sockjs-node.git)启动一个Socket Server，同时注册一个compiler.hooks.done钩子函数，当编译完成时，向客户端发送一个代表编译完成的信息，同时带上新的hash。当使用了contentBase来代理静态文件时，由于webpack不处理静态文件的热更新，webpack-dev-server用[chokidar](https://github.com/paulmillr/chokidar.git)监听文件的变化并发送给客户端一个‘content-changed’信息，客户端收到该信息之后就会重新加载页面，以便重新请求静态文件。客户端的代码在[webpack-dev-server/client](https://github.com/webpack/webpack-dev-server/blob/master/client-src/default/index.js)文件中，这个文件是需要手动添加到entry中的。用[sockjs-client](https://github.com/sockjs/sockjs-client.git)启动一个Socket Client，当收到一个热更新信息时，就通过[webpack/hot/emitter](https://github.com/webpack/webpack/blob/master/hot/emitter.js)触发一个‘webpackHotUpdate’事件，并带上收到的hash。

那‘webpackHotUpdate’事件是在哪里被处理的呢？是被[webpack/hot/dev-server](https://github.com/webpack/webpack/blob/master/hot/dev-server.js)或者[webpack/hot/only-dev-server](https://github.com/webpack/webpack/blob/master/hot/only-dev-server.js)处理的。当devServer.hotOnly设置为true时，webpack-dev-server会把‘webpack/hot/only-dev-server.js’文件添加到entry中；否则把‘webpack/hot/dev-server.js’加入entry中。两者都会监听‘webpackHotUpdate’事件并调用module.hot.check完成模块的热加载，对于使用者而言，区别主要在于对于热加载出现异常时的处理不同，‘webpack/hot/dev-server.js’会在热加载异常时重新加载页面，而‘webpack/hot/only-dev-server.js’则不会。在打包的代码里面没有调用module.hot.accept处理子模块依赖更新就会导致热加载异常，hotOnly设置为false时就会导致重新加载页面。

module.hot.check函数调用hotDownloadManifest函数根据hash来请求新的json文件，然后再根据json文件里的信息去请求新的chunks文件。新的chunks文件是用webpackHotUpdate函数包裹的，被接收之后就会立即执行webpackHotUpdate函数来安装新的模块。hotDownloadManifest和webpackHotUpdate函数都是在[JsonpMainTemplate.runtime.js](https://github.com/webpack/webpack/blob/master/lib/web/JsonpMainTemplate.runtime.js)中定义的，HotModuleReplacementPlugin把它注入到了webpackBootstrap中。

总结一下客户端热更新的过程。webpack-dev-middleware监听文件变化，变化后进行增量编译。编译完成后触发compiler.hooks.done钩子函数，通过webpack-dev-server启动的Socket Server把新的hash值推送到客户端，编译生成的chunks和json文件都是用上一个hash值命名的。客户端通过webpack-dev-server/client（手动添加的）接收hash值，并触发‘webpackHotUpdate’事件。webpack/hot/only-dev-server（webpack-dev-server添加的）监听‘webpackHotUpdate’事件并调用module.hot.check函数来检查模块的状态。module.hot.check函数调用hotDownloadManifest函数来请求新的json文件，然后再根据json文件里的信息去请求新的chunks文件。新的chunks文件是用webpackHotUpdate函数包裹的，被接收之后就会立即执行webpackHotUpdate函数来安装新的模块。

下面讲一下配置细节，详见例子pack-client-server。

配置文件‘config/webpack.client.base.js’配置了打包客户端代码需要的基本信息。在entry里配置多页面的入口文件，简单起见，本例子只配置了一个入口文件。使用[assets-webpack-plugin](https://github.com/ztoben/assets-webpack-plugin.git)插件生成打包的manifest文件，以便在模版页面中引入相关的静态文件。

配置文件‘config/webpack.client.dev-server.js’配置了热更新相关的信息。首先设置webpack-dev-server的host和port。

```
const wds = {
  hostname: 'localhost',
  port: 8088
};
const configLocal = {
  devServer: {
    host: wds.hostname,
    port: wds.port
  }
}
```

然后配置访问webpack编译输出的相关文件的publicPath，由于webpack-dev-server代理了相关资源，所以设置为代理url。

```
const publicPath = `http://${wds.hostname}:${wds.port}/dist/`;
const configLocal = {
  devServer: {
    publicPath,
  },
  output: {
    publicPath,
  },
}
```

注意，所有的输出文件的名称都不能带[hash]，不然没办法进行热加载。然后在entry中加入‘webpack-dev-server/client’，由于Socket的服务端和客户端要使用相同的host和port，所以要把host和port通过query的形式传给客户端。

```
for (let key in entry) {
  entry[key].push(`webpack-dev-server/client?http://${wds.hostname}:${wds.port}`);
}
```

在css的loader中加入'css-hot-loader'

```
{
  test: [/\.css$/, /\.scss$/],
  use: [
    {
      loader: require.resolve('css-hot-loader')
    },
  ]
}
```

配置文件‘config/webpack.client.dev.js’配置了适用于开发环境的相关配置，用于编译发布到开发环境的代码。

在入口文件‘client/entry/home.js’中加入module.hot.accept函数，同时把hotOnly设置为true。

```
if (module.hot) {
  module.hot.accept(() => {
    console.log('[HMR] module.hot.accept failed');
  })
}
```

```
const configLocal = {
  devServer: {
    hotOnly: true,
  }
}
```

在根组件‘client/component/Home.jsx’中加入‘react-hot-loader’的hot函数，并把‘react-hot-loader/babel’加入.babelrc文件的‘plugins’中。

```
import { hot } from 'react-hot-loader';
if (module.hot) {
  Home = hot(module)(Home);
}
export default Home;
```

### 服务端热更新

注意，客户端和服务端的target设置是不一样的，客户端要设置为‘web’，服务端要设置成‘node’，webpack会据此生成适用于不同运行环境的webpackBootstrap。

客户端热编译是由webpack-dev-middleware插件完成的，服务端热编译可以通过直接运行‘webpack --watch’来实现。

客户端热更新是通过Socket接收消息后请求新的chunks和json文件来完成热加载的。服务端热更新肯定用不了Socket，那重新打包之后怎么通知node运行的'server.js'呢？可以用信号(signal)或轮询(poll)的方式。虽然webpack已经实现了signal的接收方[webpack/hot/signal](https://github.com/webpack/webpack/blob/master/hot/signal.js)，由于热编译和node运行的'server.js'属于非父子关系的两个进程，实现signal通信稍微有点麻烦，本文暂且不深入讨论。本例子采用的是轮询的方式。在entry中手动加入[webpack/hot/poll](https://github.com/webpack/webpack/blob/master/hot/poll.js)，webpack/hot/poll会在setInterval的回调函数里调用module.hot.check函数，而module.hot.check函数会调用hotDownloadManifest函数。服务端的hotDownloadManifest函数与客户端的实现是不一样的，具体实现见[NodeMainTemplate.runtime.js](https://github.com/webpack/webpack/blob/master/lib/node/NodeMainTemplate.runtime.js)，hotDownloadManifest函数直接require以hash命名的json文件。如果json文件不存在，说明没有新的热编译，如果存在则说明热编译了，更新一下hash值，然后再根据json文件的chunks信息去require新的chunks文件并完成热加载。注意，服务端的新chunks和客户端的新chunks的包裹函数是不一样的。

同样，需要在代码文件里调用module.hot.accept函数来完成最终的模块热替换。与客户端热替换不同的是，服务端采用module.hot.accept(dependencies, callback)接口，然后在callback中重新require对应的文件来实现最终的模块热更新。

下面讲一下配置细节，详见例子pack-client-server。

配置文件‘config/webpack.server.base.js’配置了打包服务端代码需要的基本信息。在entry中添加服务端入口文件，用[webpack-node-externals](https://github.com/liady/webpack-node-externals.git)插件排除node_modules里的模块，注意这里要把webpack相关的热更新代码加入白名单。忽略样式文件。

```
{
  target: 'node',
  entry: {
    index: ['../server/index']
  },
  module: {
    rules: [
      {
        test: /.(svg|scss|css)$/,
        loaders: require.resolve('ignore-loader'),
      }],
  },
  externals: [nodeExternals({
    whitelist: [/^webpack/]
  })]
};
```

配置文件‘config/webpack.server.local.js’配置了热更新的一些信息。在entry中加入‘webpack/hot/poll’，启用HotModuleReplacementPlugin插件。

```
for (let hash in entry) {
  entry[hash].push('webpack/hot/poll?1000');
}
const configLocal = {
  plugins: [
    new webpack.HotModuleReplacementPlugin()
  ]
}
```

如果用clean-webpack-plugin插件，‘webpack --watch’每次热编译时都会执行清空操作，而服务端是需要以前的文件的，所以用rimraf来完成清空任务，只在启动时清空。

[just-wait](https://github.com/download/just-wait)在windows上存在兼容性问题，所以直接用[npm-delay](https://github.com/krasevych/npm-delay#readme)。npm-delay生成的bin文件有点问题，所以直接引用node_modules里的相关文件。

配置文件‘config/webpack.server.dev.js’配置了开发环境的相关信息，用于编译发布到开发环境的代码。热更新是为了提升本地开发效率，但是，还要保证热更新的代码没有影响到其它环境下代码的正常运行，比如开发环境。

服务端渲染是为了提升页面呈现速度采用的技术，本地开发时不是必须的，本例子可在‘config/constant.js’中通过enableLocalServerRender来设置是否开启服务端渲染。为了最大程度地模拟生产环境，可以开启服务端渲染。本例子已经在技术上实现了开启服务端渲染的客户端热加载。

## 服务端代码不打包且使用express时的热更新方案

有时候，服务端的代码不适合打包，比如使用[eggjs](https://github.com/eggjs/egg/)。有些人觉得服务端打包麻烦，需要开几个进程，需要多写几个配置文件。本小节以[express](https://github.com/expressjs/express)为例，探讨一下服务端代码不打包时怎么实现热更新。由于服务端热更新方案会影响到客户端热更新方案，就先讲一下服务端热更新。

### 服务端热更新

node端使用的是CommonJS模块系统，该模块系统是没有现成的热更新方案的，或者说，CommonJS设计的时候，就没有考虑加入模块热更新的能力。那怎么办呢？一种比较流行的退而求其次的做法是用热重启，当监听的文件有变化时，就重启服务。可以使用[nodemon](https://github.com/remy/nodemon)来完成热重启，nodemon的配置文件是nodemon.json。

这里仍难需要做个选择，本地开发时是否开启服务端渲染（本例子可在‘config/constant.js’中通过enableLocalServerRender来设置是否开启服务端渲染）？如果不开启，nodemon就不需要监听客户端文件，客户端文件修改就不会导致服务重启；如果开启，nodemon就需要监听客户端文件，客户端文件修改就会导致服务重启。这里从探讨最完备的技术解决方案的角度，选择开启服务端渲染。

开启服务端渲染的一个问题是，node怎么运行客户端的代码，比如jsx文件？肯定需要转码，而且是动态的，[babel-register](https://github.com/babel/babel/tree/master/packages/babel-register)就实现了动态转码。babel-register的原理是，利用[require.extensions](https://nodejs.org/dist/latest-v8.x/docs/api/modules.html#modules_require_extensions)接口，重写require具有某些后缀名（比如’.jsx‘）的文件时的模块加载逻辑，在调用module._compile之前使用[babel](https://github.com/babel/babel)对模块的content进行转码。

开发环境和正式环境时，需要先用babel对客户端代码进行转码。

下面讲一下配置细节，详见例子express-hot。

配置'.babelrc'文件：

```
{
  "presets": [
    "env",
    "react"
  ],
  "plugins": [
    "transform-runtime"
  ]
}
```

在代码中使用babel-register，这里需要使用[ignore-html-and-css-imports](https://github.com/lgandecki/babel-plugin-ignore-html-and-css-imports.git)插件。

```
require("babel-register")({
  extensions: [".jsx", ".js"],
  plugins: ["ignore-html-and-css-imports"],
  cache: false
});
```

在nodemon.json配置监听的目录：

```
{
  "watch": [
    "config/",
    "client/",
    "server/"
  ]
}
```

用nodemon启动服务：

```
{
  "scripts": {
    "local": "cross-env NODE_ENV=local nodemon server/index.js",
  }
}
```

### 客户端热更新

由于[webpack-dev-server](https://github.com/webpack/webpack-dev-server#readme)需要新开一个进程，这里使用[webpack-hot-middleware](https://github.com/webpack-contrib/webpack-hot-middleware#readme)来实现客户端代码的热加载。同时，要用[webpack-dev-middleware](https://github.com/webpack/webpack-dev-middleware)来完成热编译。

webpack-hot-middleware与webpack-dev-server，不同的是，前者使用[Server-Sent Events, SSE](https://developer.mozilla.org/zh-CN/docs/Server-sent_events/Using_server-sent_events)机制来通信。需要在entry中手动添加[webpack-hot-middleware/client](https://github.com/webpack-contrib/webpack-hot-middleware/blob/master/client.js)。热编译完成后通过eventStream给客户端push一个hash，webpack-hot-middleware/client接收到hash后就会调用module.hot.check完成模块的热加载和热替换。webpack-hot-middleware/client自己处理了模块的热替换，不需要在代码里面加入module.hot.accept函数来完成最终的模块热替换。

当客户端文件变化时，nodemon会重启服务，webpack-hot-middleware/client就会断开连接。由于webpack-hot-middleware/client实现了重连机制，当重启完成后，webpack-hot-middleware/client会重新连接。这个时候，client会收到一个编译完成的消息和一个hash，然后尝试进行热加载。由于热编译输出的文件是用上一个hash值命名的，所以hotDownloadManifest函数会请求以上一个hash值命名的json文件。但是服务端重启后进行的是一次全新的编译，不会生成json文件。下载json文件的请求就会返回404，从而导致热加载失败。

怎么处理nodemon会重启服务导致热更新失败的问题呢？webpack-hot-middleware/client提供了一个reload参数，决定在调用module.hot.accept函数之后是否重新加载页面。我们把reload设置为true，热加载失败后，会重新加载页面，请求新编译的资源，这样页面就能正常更新了，只是没有热替换那么及时和稳定。webpack-hot-middleware/client还提供了一个timeout参数，用于设置重连的时间间隔，如果设置的太长，会导致响应慢；如果设置得太短，会导致重连后webpack编译还没有完成，请求相关文件失败，所以要设置成一个和webpack编译时间相当的数值。

由于采用的时页面热加载的方式来完成热更新，所以也就不需要[react-hot-loader](https://github.com/gaearon/react-hot-loader)和[css-hot-loader](https://github.com/shepherdwind/css-hot-loader)了。

下面讲一下配置细节，详见例子express-hot。

配置文件‘config/webpack.client.base.js’配置了打包客户端代码需要的基本信息。在entry里配置多页面的入口文件，简单起见，本例子只配置了一个入口文件。使用[assets-webpack-plugin](https://github.com/ztoben/assets-webpack-plugin.git)插件生成打包的manifest文件，以便在模版页面中引入相关的静态文件。

配置文件‘config/webpack.client.local.js’配置了热更新相关的信息。由于没有使用webpack-dev-server，所以不需要配置devServer相关参数。在entry中添加webpack-hot-middleware/client，在插件中添加HotModuleReplacementPlugin。

```
for (let hash in entry) {
  entry[hash].push('webpack-hot-middleware/client?reload=true&timeout=2000'); //设置重连时间
}
plugins = plugins.concat([
  new webpack.HotModuleReplacementPlugin()
]);
```

配置文件‘config/webpack.client.dev.js’配置了适用于开发环境的相关配置，用于编译发布到开发环境的代码。

## 服务端代码不打包且使用koa时的热更新方案

使用[koa](https://github.com/koajs/koa)时，有些插件会和使用express不一样。另外，本例子使用了自己开发的一个node模块热替换工具[hot-node-module-replacement](https://github.com/lancewuz/hot-node-module-replacement)，感兴趣的朋友可以关注一下。

### 客户端热更新

由于[webpack-dev-middleware](https://github.com/webpack/webpack-dev-middleware)和[webpack-hot-middleware](https://github.com/webpack-contrib/webpack-hot-middleware#readme)返回的中间件都是[express](https://github.com/expressjs/express)类型的，不能直接用在koa上。可以写一个wrap，把express类型中间件转化成koa类型中间件。但是还有另外一种选择，就是[koa-webpack](https://github.com/shellscape/koa-webpack.git)。

koa-webpack组合[webpack-dev-middleware](https://github.com/webpack/webpack-dev-middleware)和[webpack-hot-client](https://github.com/webpack-contrib/webpack-hot-client)来完成客户端热更新。使用koa-webpack基本不需要多余的工作，它会自动进行配置，比如添加webpack-hot-middleware/client和HotModuleReplacementPlugin。

下面讲一下配置细节，详见例子koa-hot。

配置文件‘config/webpack.client.base.js’配置了打包客户端代码需要的基本信息。在entry里配置多页面的入口文件，简单起见，本例子只配置了一个入口文件。使用[assets-webpack-plugin](https://github.com/ztoben/assets-webpack-plugin.git)插件生成打包的manifest文件，以便在模版页面中引入相关的静态文件。

配置文件‘config/webpack.client.local.js’配置了热更新相关的信息。引用css-hot-loader插件，其它配置koa-webpack会自动配置。

```
{
  test: [/\.css$/, /\.scss$/],
  use: [
    {
      loader: require.resolve('css-hot-loader')
    },
  ]
}
```

在'server/index.js'中使用webpack，reload设置为false。

```
const compiler = webpack(config);
koaWebpack({ compiler, hotClient: { port: 55756, reload: false } })
  .then((middleware) => {
    app.use(middleware);
  }, err => {
    console.log(err)
  });
```

在入口文件‘client/entry/home.js’中加入module.hot.accept函数。

```
if (module.hot) {
  module.hot.accept(() => {
    console.log('[HMR] module.hot.accept failed');
  })
}
```

在根组件‘client/component/Home.jsx’中加入‘react-hot-loader’的hot函数，并把‘react-hot-loader/babel’加入.babelrc文件的‘plugins’中。

```
import { hot } from 'react-hot-loader';
if (module.hot) {
  Home = hot(module)(Home);
}
export default Home;
```

### 服务端热更新

上面说过node端没有现成的模块热替换方案，采用热重启方案也有弊端，比如导致客户端热加载失败。本人写了一个node模块热替换工具[hot-node-module-replacement](https://github.com/lancewuz/hot-node-module-replacement)，可以满足基本的热替换功能。原理和[babel-register](https://github.com/babel/babel/tree/master/packages/babel-register)差不多。利用[require.extensions](https://nodejs.org/dist/latest-v8.x/docs/api/modules.html#modules_require_extensions)接口，重写require具有某些后缀名（比如’.js‘）的文件时的模块加载逻辑，保存模块的module.exports对象，监听相关文件，当文件变化时重新加载模块，并替换掉相应的module.exports对象中的数据。注意，和babel-register一起使用时，需要放在babel-register的后面。

开发环境和正式环境时，需要先用babel对客户端代码进行转码。

下面讲一下配置细节，详见例子koa-hot

在'server/index.js'中使用hot-node-module-replacement，需要热替换的模块需要在这行代码之后进行require。

```
require('hot-node-module-replacement')({
  extenstions: ['.js', '.jsx']
});
```

## 结语

本文比较系统地从原理层面和工程配置层面探讨了不同场景下客户端和服务端热更新的多种解决方案，完整的例子参见example-hot-module-updating，欢迎star。
