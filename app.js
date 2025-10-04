const Koa = require('koa');
const views = require('koa-views');
const serve = require('koa-static');
const bodyParser = require('koa-bodyparser');
const path = require('path');
const routes = require('./routes');

const app = new Koa();

// 配置模板引擎
app.use(views(path.join(__dirname, 'views'), {
  extension: 'ejs'
}));

// 静态文件服务
app.use(serve(path.join(__dirname, 'public')));

// 解析请求体
app.use(bodyParser());

// 使用路由
app.use(routes.routes());
app.use(routes.allowedMethods());

// 错误处理
app.on('error', (err, ctx) => {
  console.error('服务器错误:', err);
});

// 固定端口：优先读取环境变量PORT，否则使用58188（避免每次随机端口）
const requestedPort = parseInt(process.env.PORT || '52866', 10);
const server = app.listen(requestedPort, () => {
  const address = server.address();
  const actualPort = typeof address === 'string' ? address : address.port;
  console.log(`服务器运行在 http://localhost:${actualPort}`);
});

module.exports = app;