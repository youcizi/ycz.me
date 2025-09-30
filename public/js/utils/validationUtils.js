/**
 * 验证工具函数
 * 处理表单验证、数据验证等功能
 */

import { isValidUrl } from './urlUtils.js';

// 验证必填字段
export const validateRequired = (value, fieldName = '字段') => {
    if (!value || (typeof value === 'string' && !value.trim())) {
        return `${fieldName}不能为空`;
    }
    return null;
};

// 验证字符串长度
export const validateLength = (value, min = 0, max = Infinity, fieldName = '字段') => {
    if (!value) return null;
    
    const length = value.toString().length;
    if (length < min) {
        return `${fieldName}长度不能少于${min}个字符`;
    }
    if (length > max) {
        return `${fieldName}长度不能超过${max}个字符`;
    }
    return null;
};

// 验证URL
export const validateUrl = (url, fieldName = 'URL') => {
    if (!url) return null;
    
    if (!isValidUrl(url)) {
        return `${fieldName}格式不正确`;
    }
    return null;
};

// 验证分类表单
export const validateCategoryForm = (form) => {
    const errors = {};
    
    // 验证名称
    const nameError = validateRequired(form.name, '分类名称') || 
                     validateLength(form.name, 1, 50, '分类名称');
    if (nameError) errors.name = nameError;
    
    // 验证图标
    const iconError = validateRequired(form.icon, '分类图标');
    if (iconError) errors.icon = iconError;
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

// 验证网站表单
export const validateWebsiteForm = (form) => {
    const errors = {};
    
    // 验证标题
    const titleError = validateRequired(form.title, '网站标题') || 
                      validateLength(form.title, 1, 100, '网站标题');
    if (titleError) errors.title = titleError;
    
    // 验证URL
    const urlError = validateRequired(form.url, '网站URL') || 
                    validateUrl(form.url, '网站URL');
    if (urlError) errors.url = urlError;
    
    // 验证分类
    const categoryError = validateRequired(form.categoryId, '分类');
    if (categoryError) errors.categoryId = categoryError;
    
    // 验证描述长度（可选）
    if (form.description) {
        const descError = validateLength(form.description, 0, 500, '描述');
        if (descError) errors.description = descError;
    }
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

// 验证搜索引擎表单
export const validateSearchEngineForm = (form) => {
    const errors = {};
    
    // 验证名称
    const nameError = validateRequired(form.name, '搜索引擎名称') || 
                     validateLength(form.name, 1, 50, '搜索引擎名称');
    if (nameError) errors.name = nameError;
    
    // 验证模板
    const templateError = validateRequired(form.template, '搜索模板');
    if (templateError) {
        errors.template = templateError;
    } else if (!form.template.includes('{q}')) {
        errors.template = '搜索模板必须包含 {q} 占位符';
    }
    
    // 验证模板URL格式
    if (form.template && !templateError) {
        const testUrl = form.template.replace('{q}', 'test');
        const urlError = validateUrl(testUrl, '搜索模板');
        if (urlError) errors.template = '搜索模板URL格式不正确';
    }
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

// 通用验证函数
export const validate = (value, rules = []) => {
    for (const rule of rules) {
        const error = rule(value);
        if (error) return error;
    }
    return null;
};

// 创建验证规则
export const createRules = {
    required: (fieldName = '字段') => (value) => validateRequired(value, fieldName),
    length: (min, max, fieldName = '字段') => (value) => validateLength(value, min, max, fieldName),
    url: (fieldName = 'URL') => (value) => validateUrl(value, fieldName),
    custom: (validator, message) => (value) => validator(value) ? null : message
};