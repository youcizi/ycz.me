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
        title: 'AI网址导航',
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
        title: '数据管理 - AI网址导航'
      });
    } catch (error) {
      console.error('渲染数据管理页面失败:', error);
      ctx.status = 500;
      ctx.body = { success: false, message: '服务器内部错误' };
    }
  }

  /**
   * 渲染在线工具页面
   * @param {Object} ctx Koa上下文对象
   */
  async tools(ctx) {
    try {
      const now = new Date();
      const currentDateStr = now.toLocaleDateString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long'
      });
      await ctx.render('tools', {
        title: '在线工具 - AI网址导航',
        currentDateStr
      });
    } catch (error) {
      console.error('渲染在线工具页面失败:', error);
      ctx.status = 500;
      ctx.body = { success: false, message: '服务器内部错误' };
    }
  }

  /**
   * 渲染AI聊天页面
   * @param {Object} ctx Koa上下文对象
   */
  async aiChat(ctx) {
    try {
      await ctx.render('ai-chat', {
        title: 'AI聊天'
      });
    } catch (error) {
      console.error('渲染AI聊天页面失败:', error);
      ctx.status = 500;
      ctx.body = { success: false, message: '服务器内部错误' };
    }
  }

  /**
   * 渲染 Emoji 图标页面
   * @param {Object} ctx Koa上下文对象
   */
  async emoji(ctx) {
    try {
      await ctx.render('emoji', {
        title: 'Emoji图标大全'
      });
    } catch (error) {
      console.error('渲染Emoji图标页面失败:', error);
      ctx.status = 500;
      ctx.body = { success: false, message: '服务器内部错误' };
    }
  }
}

module.exports = HomeController;