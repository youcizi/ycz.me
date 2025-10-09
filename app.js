const Koa = require('koa');
// 加载 .env 配置，支持 PORT 与 DEFAULT_SITE 等环境变量
try { require('dotenv').config(); } catch (e) {}
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

// 读取 .env 中的 PORT，若未设置则默认 3002
const requestedPort = parseInt(process.env.PORT || '3002', 10);
const server = app.listen(requestedPort, () => {
  const address = server.address();
  const actualPort = typeof address === 'string' ? address : address.port;
  console.log(`服务器运行在 http://localhost:${actualPort}`);
});

module.exports = app;