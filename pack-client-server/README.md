
an example of Hot Module Replacement in client for Multi-page Application with server side render
-

only the client side code is packed by webpack, the server side code is away of packing

Hot Module Replacement is realized by koa-webpack

when develop in local, you can just enter 'npm run start', then you can enjoy the Hot Module Replacement.

but, at first time, you should do 'npm run build:dev' firstly, because the packed codes are stored in memory, the file '.tmpDist/assets.json' is not accessible.

deploy in development enviroment, firstly do 'build:dev', then deploy the builded code, then do 'npm run run:dev'

客户端热更新
-

使用webpack-dev-server来实现客户端代码的热更新。webpack-dev-server的功能主要分两个，一个是代码的热打包，用webpack-dev-middleware实现。另一个是请求路径的映射和代码的热更新，通过启动一个express服务并用web socket来完成。

webpack-dev-middleware打包后的代码是写入内存的，当代码有变化时，就会重新打包。webpack-dev-server会把页面请求路径映射到内存中代码的路径。webpack-dev-server启动了一个express服务，用web socket与客户端通信。所以要在entry数组中要加入webpack-dev-server/client，即socket的客户端代码。当服务端重新打包后，就会把打包后的模块通过socket推送到客户端，并完成模块热替换（hmr）。虽然webpack支持模块热替换功能，但不是默认包含的，因为生产环境就不需要这个功能，所以做成了一个插件。使用webpack.HotModuleReplacementPlugin插件时，才会把hmr相关代码也打包进去。

服务端热更新
-

服务端热打包用‘--watch’实现，当有文件修改时会自动打包。

服务端热更新用webpack/hot/poll实现，即轮询是否有打包新的代码，有则替换。需要在服务端注入module.hot.accept相关代码，同时在打包的entry里加入webpack/hot/poll.js文件。同样，需要使用webpack.HotModuleReplacementPlugin来开启hmr功能。

cross-env 只对其后面的命令的当前环境有效，对命令执行的子环境无效。直接执行“cross-env NODE_ENV=local node server/index.js”时，server/index.js里的process.env.NODE_ENV为local。执行“cross-env NODE_ENV=local webpack --config config/webpack.config.local.js”时，“config/webpack.config.local.js”里的process.env.NODE_ENV为local，但是打包的entry里的server/index.js里的process.env.NODE_ENV为none。这时就需要webpack.DefinePlugin插件来给entry里的server/index.js里的process.env.NODE_ENV赋值了。
