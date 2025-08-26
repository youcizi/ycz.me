/**
 * API控制器
 * 处理API相关的业务逻辑
 */

const Website = require('../models/Website');

class ApiController {
  constructor() {
    this.websiteModel = new Website();
  }

  /**
   * 根据分类获取网站
   * @param {Object} ctx Koa上下文对象
   */
  async getWebsitesByCategory(ctx) {
    try {
      const category = ctx.params.category;
      
      if (!category) {
        ctx.status = 400;
        ctx.body = { success: false, message: '分类参数不能为空' };
        return;
      }

      const websites = this.websiteModel.getWebsitesByCategory(category);
      
      ctx.body = {
        success: true,
        data: websites
      };
    } catch (error) {
      console.error('获取分类网站失败:', error);
      ctx.status = 500;
      ctx.body = { success: false, message: '服务器内部错误' };
    }
  }

  /**
   * 搜索网站
   * @param {Object} ctx Koa上下文对象
   */
  async searchWebsites(ctx) {
    try {
      const query = ctx.query.q;
      
      if (!query) {
        ctx.status = 400;
        ctx.body = { success: false, message: '搜索关键词不能为空' };
        return;
      }

      const results = this.websiteModel.searchWebsites(query);
      
      ctx.body = {
        success: true,
        data: results
      };
    } catch (error) {
      console.error('搜索网站失败:', error);
      ctx.status = 500;
      ctx.body = { success: false, message: '服务器内部错误' };
    }
  }

  /**
   * 添加新网站
   * @param {Object} ctx Koa上下文对象
   */
  async addWebsite(ctx) {
    try {
      const { name, description, url, icon, category } = ctx.request.body;
      
      if (!name || !url || !category) {
        ctx.status = 400;
        ctx.body = { success: false, message: '网站名称、URL和分类不能为空' };
        return;
      }

      const success = this.websiteModel.addWebsite({
        name,
        description,
        url,
        icon,
        category
      });
      
      if (success) {
        ctx.body = {
          success: true,
          message: '网站添加成功'
        };
      } else {
        ctx.status = 400;
        ctx.body = { success: false, message: '网站添加失败' };
      }
    } catch (error) {
      console.error('添加网站失败:', error);
      ctx.status = 500;
      ctx.body = { success: false, message: '服务器内部错误' };
    }
  }

  /**
   * 删除网站
   * @param {Object} ctx Koa上下文对象
   */
  async deleteWebsite(ctx) {
    try {
      const { name } = ctx.params;
      
      if (!name) {
        ctx.status = 400;
        ctx.body = { success: false, message: '网站名称不能为空' };
        return;
      }

      const success = this.websiteModel.removeWebsite(name);
      
      if (success) {
        ctx.body = {
          success: true,
          message: '网站删除成功'
        };
      } else {
        ctx.status = 404;
        ctx.body = { success: false, message: '网站不存在' };
      }
    } catch (error) {
      console.error('删除网站失败:', error);
      ctx.status = 500;
      ctx.body = { success: false, message: '服务器内部错误' };
    }
  }

  /**
   * 获取所有分类
   * @param {Object} ctx Koa上下文对象
   */
  async getCategories(ctx) {
    try {
      const categories = this.websiteModel.getAllCategories();
      
      ctx.body = {
        success: true,
        data: categories
      };
    } catch (error) {
      console.error('获取分类失败:', error);
      ctx.status = 500;
      ctx.body = { success: false, message: '服务器内部错误' };
    }
  }
}

module.exports = ApiController;