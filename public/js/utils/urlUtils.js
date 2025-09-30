/**
 * URL相关工具函数
 * 处理URL验证、格式化等功能
 */

// 验证URL格式
export const isValidUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    
    try {
        // 如果URL不包含协议，自动添加https://
        const urlToTest = url.includes('://') ? url : `https://${url}`;
        new URL(urlToTest);
        return true;
    } catch {
        return false;
    }
};

// 格式化URL，确保包含协议
export const formatUrl = (url) => {
    if (!url || typeof url !== 'string') return '';
    
    const trimmed = url.trim();
    if (!trimmed) return '';
    
    // 如果已经包含协议，直接返回
    if (trimmed.includes('://')) {
        return trimmed;
    }
    
    // 否则添加https://协议
    return `https://${trimmed}`;
};

// 从URL中提取域名
export const extractDomain = (url) => {
    if (!url || typeof url !== 'string') return '';
    
    try {
        const formattedUrl = formatUrl(url);
        const urlObj = new URL(formattedUrl);
        return urlObj.hostname;
    } catch {
        return '';
    }
};

// 获取网站favicon URL
export const getFaviconUrl = (url) => {
    const domain = extractDomain(url);
    if (!domain) return '';
    
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
};

// 打开网站URL
export const openWebsite = (url) => {
    if (!url) return;
    
    const formattedUrl = formatUrl(url);
    if (isValidUrl(formattedUrl)) {
        window.open(formattedUrl, '_blank');
    } else {
        console.error('无效的URL:', url);
    }
};

// 检查URL是否为HTTPS
export const isHttps = (url) => {
    if (!url || typeof url !== 'string') return false;
    
    try {
        const formattedUrl = formatUrl(url);
        const urlObj = new URL(formattedUrl);
        return urlObj.protocol === 'https:';
    } catch {
        return false;
    }
};

// 获取URL的简短显示版本
export const getShortUrl = (url, maxLength = 50) => {
    if (!url || typeof url !== 'string') return '';
    
    const domain = extractDomain(url);
    if (!domain) return url;
    
    if (domain.length <= maxLength) {
        return domain;
    }
    
    return domain.substring(0, maxLength - 3) + '...';
};