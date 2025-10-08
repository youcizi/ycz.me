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
   * 根据名称获取单个网站详情
   * @param {Object} ctx Koa上下文对象
   */
  async getWebsiteByName(ctx) {
    try {
      const { name } = ctx.params;
      
      if (!name) {
        ctx.status = 400;
        ctx.body = { success: false, message: '网站名称不能为空' };
        return;
      }

      const website = this.websiteModel.getWebsiteByName(decodeURIComponent(name));
      
      if (website) {
        ctx.body = {
          success: true,
          data: website
        };
      } else {
        ctx.status = 404;
        ctx.body = { success: false, message: '网站不存在' };
      }
    } catch (error) {
      console.error('获取网站详情失败:', error);
      ctx.status = 500;
      ctx.body = { success: false, message: '服务器内部错误' };
    }
  }

  /**
   * 更新网站信息
   * @param {Object} ctx Koa上下文对象
   */
  async updateWebsite(ctx) {
    try {
      const { name } = ctx.params;
      const { name: newName, description, url, icon, category } = ctx.request.body;
      
      if (!name) {
        ctx.status = 400;
        ctx.body = { success: false, message: '网站名称不能为空' };
        return;
      }

      if (!newName || !url || !category) {
        ctx.status = 400;
        ctx.body = { success: false, message: '网站名称、URL和分类不能为空' };
        return;
      }

      const success = this.websiteModel.updateWebsite(decodeURIComponent(name), {
        name: newName,
        description,
        url,
        icon,
        category
      });
      
      if (success) {
        ctx.body = {
          success: true,
          message: '网站更新成功'
        };
      } else {
        ctx.status = 404;
        ctx.body = { success: false, message: '网站不存在' };
      }
    } catch (error) {
      console.error('更新网站失败:', error);
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

  /**
   * AI聊天代理：服务端转发到目标 Chat Completions 接口，避免浏览器CORS。
   * 请求体：{ url: string, apiKey?: string, provider?: string, payload: { model, messages, temperature, stream } }
   */
  async proxyChatCompletions(ctx) {
    try {
      const { url, apiKey, provider, payload } = ctx.request.body || {};
      if (!url || !payload || typeof payload !== 'object') {
        ctx.status = 400;
        ctx.body = { success: false, message: '参数错误：缺少 url 或 payload' };
        return;
      }

      const targetUrl = String(url);
      if (!/^https?:\/\//i.test(targetUrl)) {
        ctx.status = 400;
        ctx.body = { success: false, message: '非法目标地址：仅支持 http/https' };
        return;
      }

      const isStream = !!payload?.stream;
      const headers = { 'Content-Type': 'application/json' };
      const key = (apiKey || '').trim();
      if (key) {
        headers['Authorization'] = `Bearer ${key}`;
        headers['X-API-Key'] = key;
      }
      if (isStream) {
        headers['Accept'] = 'text/event-stream';
      }

      const body = JSON.stringify(payload);
      const resp = await fetch(targetUrl, { method: 'POST', headers, body });
      const contentType = (resp.headers.get('content-type') || '').toLowerCase();

      // 流式SSE转发
      if (isStream && contentType.includes('text/event-stream') && resp.body) {
        ctx.respond = false; // 直接控制原始响应
        ctx.res.statusCode = 200;
        ctx.res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        ctx.res.setHeader('Cache-Control', 'no-cache');
        ctx.res.setHeader('Connection', 'keep-alive');
        ctx.res.flushHeaders?.();

        const reader = resp.body.getReader();
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value && value.length) {
              // 直接转发上游SSE字节
              ctx.res.write(Buffer.from(value));
            }
          }
        } catch (streamErr) {
          // 流中断时，发送一个错误事件（部分前端可能显示为重试流式失败）
          try {
            ctx.res.write(`event: error\ndata: ${JSON.stringify({ message: streamErr?.message || 'SSE代理中断' })}\n\n`);
          } catch (_) {}
        } finally {
          ctx.res.end();
        }
        return; // 已完成原始响应
      }

      // 非流式或上游未返回SSE：以JSON一次性返回
      const text = await resp.text();
      let data;
      try { data = JSON.parse(text); } catch (_) { data = { output_text: text }; }
      ctx.status = resp.status;
      ctx.body = data;
    } catch (error) {
      console.error('AI代理请求失败:', error);
      ctx.status = 500;
      ctx.body = { error: { message: error?.message || '服务器内部错误' } };
    }
  }
}

module.exports = ApiController;