
an example of Hot Module Replacement in client for Multi-page Application with server side render
-

only the client side code is packed by webpack, the server side code is away of packing

Hot Module Replacement is realized by koa-webpack

when develop in local, you can just enter 'npm run start', then you can enjoy the Hot Module Replacement.

but, at first time, you should do 'npm run build:dev' firstly, because the packed codes are stored in memory, the file '.tmpDist/assets.json' is not accessible.

deploy in development enviroment, firstly do 'build:dev', then deploy the builded code, then do 'npm run run:dev'

