/**
 * 主页控制器
 * 处理主页相关的业务逻辑
 */

const Website = require('../models/Website');

class HomeController {
  constructor() {
    this.websiteModel = new Website();
  }

  /**
   * 渲染主页
   * @param {Object} ctx Koa上下文对象
   */
  async index(ctx) {
    try {
      await ctx.render('index', {
        title: '网站导航',
        categories: this.websiteModel.getAllCategories(),
        websites: this.websiteModel.getAllWebsites()
      });
    } catch (error) {
      console.error('渲染主页失败:', error);
      ctx.status = 500;
      ctx.body = { success: false, message: '服务器内部错误' };
    }
  }

  /**
   * 渲染数据管理页面
   * @param {Object} ctx Koa上下文对象
   */
  async dataManager(ctx) {
    try {
      await ctx.render('data-manager', {
        title: '数据管理 - 网站导航'
      });
    } catch (error) {
      console.error('渲染数据管理页面失败:', error);
      ctx.status = 500;
      ctx.body = { success: false, message: '服务器内部错误' };
    }
  }
}

module.exports = HomeController;