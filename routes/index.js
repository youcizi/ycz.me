/**
 * 主路由文件
 * 定义应用的所有路由
 */

const Router = require('koa-router');
const HomeController = require('../controllers/HomeController');
const ApiController = require('../controllers/ApiController');

const router = new Router();

// 实例化控制器
const homeController = new HomeController();
const apiController = new ApiController();

// 主页路由
router.get('/', homeController.index.bind(homeController));

// 数据管理页面路由
router.get('/data-manager', homeController.dataManager.bind(homeController));

// 在线工具页面路由
router.get('/tools', homeController.tools.bind(homeController));

// AI聊天页面路由
router.get('/ai-chat', homeController.aiChat.bind(homeController));

// API路由
router.get('/api/websites/:category', apiController.getWebsitesByCategory.bind(apiController));
router.get('/api/search', apiController.searchWebsites.bind(apiController));
router.get('/api/categories', apiController.getCategories.bind(apiController));
router.post('/api/websites', apiController.addWebsite.bind(apiController));
router.get('/api/website/:name', apiController.getWebsiteByName.bind(apiController));
router.put('/api/websites/:name', apiController.updateWebsite.bind(apiController));
router.delete('/api/websites/:name', apiController.deleteWebsite.bind(apiController));

module.exports = router;