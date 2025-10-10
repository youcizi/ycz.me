/**
 * 主页控制器
 * 处理主页相关的业务逻辑
 */

const Website = require('../models/Website');
const https = require('https');
const http = require('http');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => { req.destroy(new Error('请求超时')); });
  });
}

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
      // 统一由 Koa 服务端提供 defaultData，来源 .env 的 DEFAULT_SITE 或后备地址
      const defaultApiUrl = process.env.DEFAULT_SITE || 'https://admin.ycz.me/api/site.index/index';
      let defaultData = { categories: [], websites: [], filters: [], searchEngines: [] };
      try {
        const json = await fetchJson(defaultApiUrl);
        const payload = json?.data || json || {};
        defaultData = {
          categories: Array.isArray(payload.categories) ? payload.categories : [],
          websites: Array.isArray(payload.websites) ? payload.websites : [],
          filters: Array.isArray(payload.filters) ? payload.filters : [],
          searchEngines: Array.isArray(payload.searchEngines) ? payload.searchEngines : []
        };
      } catch (e) {
        console.warn('默认数据接口获取失败，使用空数据作为回退:', e?.message || e);
      }

      await ctx.render('index', {
        title: 'AI网址导航',
        categories: this.websiteModel.getAllCategories(),
        websites: this.websiteModel.getAllWebsites(),
        defaultData
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
      // 与首页一致：服务端拉取默认数据并注入到页面
      const defaultApiUrl = process.env.DEFAULT_SITE || 'https://admin.ycz.me/api/site.index/index';
      let defaultData = { categories: [], websites: [], filters: [], searchEngines: [] };
      try {
        const json = await fetchJson(defaultApiUrl);
        const payload = json?.data || json || {};
        defaultData = {
          categories: Array.isArray(payload.categories) ? payload.categories : [],
          websites: Array.isArray(payload.websites) ? payload.websites : [],
          filters: Array.isArray(payload.filters) ? payload.filters : [],
          searchEngines: Array.isArray(payload.searchEngines) ? payload.searchEngines : []
        };
      } catch (e) {
        console.warn('默认数据接口获取失败（数据管理页），使用空数据作为回退:', e?.message || e);
      }

      await ctx.render('data-manager', {
        title: '数据管理 - AI网址导航',
        defaultData
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