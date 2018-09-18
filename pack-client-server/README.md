
# 客户端与服务端热更新方案

**本方案的前提是前后端代码都经过webpack打包处理**

## 客户端热更新

>使用[webpack-dev-server](https://github.com/webpack/webpack-dev-server#readme)来实现客户端代码的热更新。webpack-dev-server的功能主要分两个，一个是代码的热打包，内部用[webpack-dev-middleware](https://github.com/webpack/webpack-dev-middleware)实现。另一个是请求路径的映射和代码的热更新，通过启动一个[express](https://github.com/expressjs/express)服务并用web socket来完成。

webpack-dev-middleware打包后的代码是写入内存的，当代码有变化时，就会重新打包。webpack-dev-server会把页面请求路径映射到内存中代码的路径。

webpack-dev-server启动了一个express服务，用web socket与客户端通信。所以要在entry数组中要加入webpack-dev-server/client，即socket的客户端代码。当服务端重新打包后，就会把打包后的模块通过socket推送到客户端，并完成模块热替换（[HMR](https://webpack.js.org/concepts/hot-module-replacement/)）。

虽然webpack支持模块热替换功能，但不是默认包含的，因为生产环境就不需要这个功能，所以做成了一个插件。使用[webpack.HotModuleReplacementPlugin](https://webpack.js.org/plugins/hot-module-replacement-plugin/)插件时，才会把hmr相关代码也打包进去。

css文件的热加载要用css-hot-loader来实现

## 服务端热更新

服务端热打包用[watch](https://webpack.js.org/configuration/watch/)实现，当有文件修改时会自动打包。

服务端热更新用webpack/hot/poll实现，即轮询是否有打包新的代码，有则替换。需要在服务端注入module.hot.accept相关代码，同时在打包的entry里加入webpack/hot/poll.js文件。同样，需要使用webpack.HotModuleReplacementPlugin来开启hmr功能。

## 配置细节

cross-env 只对其后面的命令的当前环境有效，对命令执行的子环境无效。直接执行“cross-env NODE_ENV=local node server/index.js”时，server/index.js里的process.env.NODE_ENV为local。执行“cross-env NODE_ENV=local webpack --config config/webpack.config.local.js”时，“config/webpack.config.local.js”里的process.env.NODE_ENV为local，但是打包的entry里的server/index.js里的process.env.NODE_ENV为none。这时就需要webpack.DefinePlugin插件来给entry里的server/index.js里的process.env.NODE_ENV赋值了。

服务端热更新每次都会重新打包，并且需要用到以前的打包文件，所以清空文件夹只能在第一时执行，用rimraf来完成，不能用clean-webpack-plugin。

devServer.hotOnly 要设置成false，不然热更新之后不会reload。

[just-wait](https://github.com/download/just-wait)在windows上存在兼容性问题，所以直接用[npm-delay](https://github.com/krasevych/npm-delay#readme)。npm-delay生成的bin文件有点问题，所以直接引用node_modules里的相关文件。

服务端打包排除node_modules里的模块时，要把webpack/hot/poll加入白名单。

热加载时的生成文件名不能包含hash。

## 用法

**本地调试**

```
npm run start
```

修改代码，客户端和服务端都会热更新，用enableLocalServerRender控制是否开启服务端渲染

**发布测试环境**

```
npm run build:dev
npm run start-server:dev
```