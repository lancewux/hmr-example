
an example of Hot Module Replacement in client for Multi-page Application with server side render
-

only the client side code is packed by webpack, the server side code is away of packing

Hot Module Replacement is realized by koa-webpack

when develop in local, you can just enter 'npm run start', then you can enjoy the Hot Module Replacement.

but, at first time, you should do 'npm run build:dev' firstly, because the packed codes are stored in memory, the file '.tmpDist/assets.json' is not accessible.

deploy in development enviroment, firstly do 'build:dev', then deploy the builded code, then do 'npm run run:dev'

# 客户端与服务端热更新方案

**本方案的场景是只打包前端代码，后端用express**

## 客户端热更新

>使用[webpack-dev-middleware](https://github.com/webpack/webpack-dev-middleware)和[webpack-hot-middleware](https://github.com/webpack-contrib/webpack-hot-middleware#readme)来实现客户端代码的热更新。需要代码注入。

webpack-dev-middleware使用[memory-fs](https://github.com/webpack/memory-fs)提供的内存文件系统来处理webpack打包输出的文件。webpack-dev-middleware返回的是一个中间件，当请求打包输出的静态文件时，中间件会从内存文件系统中找到该文件并返回。热加载实现？

