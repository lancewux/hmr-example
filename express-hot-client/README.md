
# 客户端与服务端热更新方案

**本方案的场景是只打包前端代码，后端用express**

## 客户端热更新

>使用[webpack-dev-middleware](https://github.com/webpack/webpack-dev-middleware)和[webpack-hot-middleware](https://github.com/webpack-contrib/webpack-hot-middleware#readme)来实现客户端代码的热更新。需要代码注入。

webpack-dev-middleware使用[memory-fs](https://github.com/webpack/memory-fs)提供的内存文件系统来处理webpack打包输出的文件。webpack-dev-middleware返回的是一个中间件，当请求打包输出的静态文件时，中间件会从内存文件系统中找到该文件并返回。使用webpack的watch模式来实现热打包。

webpack-hot-middleware注册了compiler.hooks.done钩子，当webpack重新打包完成时，就会把打包的信息通过[Server-Sent Events](https://developer.mozilla.org/zh-CN/docs/Server-sent_events/Using_server-sent_events)机制发送到客户端。webpack-hot-middleware/client新建EventSource，在onmessage回调中通过module.hot相关的api完成模块的更新。

为了启用webpack的模块热更新能力，必须使用webpack.HotModuleReplacementPlugin插件。该插件会在打包的代码中加入module.hot相关的api，比如module.hot.check、module.hot.apply等。

## 服务端热更新

可以通过‘config/constant.js‘里的enableLocalServerRender来控制是否启用服务端渲染。当启用服务端渲染时，由于服务端的代码是没有转码的，直接引用jsx代码肯定不行。所以用[babel-register](https://github.com/babel/babel/tree/master/packages/babel-register)来转码引入的jsx文件。babel-register的原理是利用[require.extensions](https://nodejs.org/dist/latest-v8.x/docs/api/modules.html#modules_require_extensions)接口，在调用module._compile之前对模块的content进行转码。

由于没有对服务端代码进行打包，所以无法对服务端的代码使用webpack的热更新功能。而node的模块系统是没有热更新功能的，一种退而求其次的做法是用[nodemon](https://github.com/remy/nodemon)的热重启。当nodemon监听的文件发生改变时，nodemon就会重启服务。这个时候webpack-hot-middleware/client建立的Server-Sent Events就会disconnect，服务端重新打包代码无非推送到客户端。幸好webpack-hot-middleware/client有尝试重连机制，尝试重连间隔时间timeout的默认值是20000毫秒。为了尽快重连，这里把默认时间设置为2000毫秒。重连后，重新打包后的代码就会被推送到客户端进行热更新了。

nodemon的配置文件是nodemon.json。这里需要做个选择，nodemon是否要监听客户端组件文件？如果监听，每次修改组件文件，nodemon都会重启服务，重新打包，重连Server-Sent Events，需要几秒到十几秒的时间才能在客户端看到修改生效。如果不监听，每次修改组件文件，nodemon不会重启服务，修改的组件会通过Server-Sent Events推送到客户端进行热更新，基本1秒内就可以看到修改生效。但是服务端渲染的string并没有被替换，会出现服务端渲染和客户端渲染的dom结构不一致的告警，差异比较大的时候会造成客户端渲染出的dom结构严重错位。个人推荐的做法是，监听客户端组件文件，忍受一定的更新延迟；或者不监听客户端组件文件，同时关闭本地调试时的服务端渲染。因为本地调试时，其实不需要服务端渲染，在开发告一段落时验证一下服务端渲染是否有问题即可。

## 用法

**本地调试**

```
npm run start
```

修改代码，客户端和服务端都会热更新，用enableLocalServerRender控制是否开启服务端渲染

**发布测试环境**

```
npm run build:dev
npm run start:dev
```