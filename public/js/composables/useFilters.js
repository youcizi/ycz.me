/**
 * 筛选标签管理组合式函数
 * 处理筛选标签的加载、增删改、排序以及与UI的交互
 */

import indexedDBService from '../services/IndexedDBService.js';
import { uiManager } from '../modules/UIManager.js';
import { filterTags, modals, filterForm, editingFilter } from '../stores/appStore.js';

const { nextTick } = Vue;

// 加载筛选标签
export const loadFilters = async () => {
    try {
        await indexedDBService.init();
        const tags = await indexedDBService.getFilters();
        filterTags.value = Array.isArray(tags) ? tags : [];
        // 保持按order排序
        filterTags.value.sort((a, b) => (a.order || 0) - (b.order || 0));
        console.log('筛选标签加载完成:', filterTags.value.length, '个标签');
    } catch (error) {
        console.error('加载筛选标签失败:', error);
        filterTags.value = [];
    }
};

export const openFilterManager = async () => {
    await loadFilters();
    resetFilterForm();
    editingFilter.value = null;
    modals.filterManager = true;
    await nextTick();
};

export const closeFilterManager = () => {
    modals.filterManager = false;
    resetFilterForm();
    editingFilter.value = null;
};

export const startAddFilter = () => {
    resetFilterForm();
    editingFilter.value = null;
};

export const startEditFilter = (tag) => {
    if (!tag) return;
    editingFilter.value = tag;
    Object.assign(filterForm, {
        id: tag.id,
        name: tag.name,
        key: tag.key,
        backgroundColor: tag.backgroundColor || '#3b82f6',
        order: tag.order || 0
    });
};

export const saveFilter = async () => {
    try {
        await indexedDBService.init();
        const name = (filterForm.name || '').trim();
        const key = (filterForm.key || '').trim();
        if (!name || !key) {
            uiManager.showNotification('名称与Key不能为空', 'error');
            return;
        }

        const payload = {
            id: filterForm.id || undefined,
            name,
            key,
            backgroundColor: filterForm.backgroundColor || '#3b82f6',
            order: Number(filterForm.order) || getNextOrder()
        };

        if (editingFilter.value && editingFilter.value.id) {
            await indexedDBService.updateFilter(payload);
            uiManager.showNotification('筛选标签已更新', 'success');
        } else {
            await indexedDBService.addFilter(payload);
            uiManager.showNotification('筛选标签已添加', 'success');
        }

        await loadFilters();
        resetFilterForm();
        editingFilter.value = null;
    } catch (error) {
        console.error('保存筛选标签失败:', error);
        uiManager.showNotification('保存筛选标签失败: ' + error.message, 'error');
    }
};

export const deleteFilter = async (id) => {
    try {
        if (!id) return;
        await indexedDBService.init();
        await indexedDBService.deleteFilter(id);
        uiManager.showNotification('筛选标签已删除', 'success');
        await loadFilters();
    } catch (error) {
        console.error('删除筛选标签失败:', error);
        uiManager.showNotification('删除筛选标签失败: ' + error.message, 'error');
    }
};

export const moveFilterUp = async (id) => {
    const index = filterTags.value.findIndex(t => t.id === id);
    if (index <= 0) return;
    await swapOrder(index, index - 1);
};

export const moveFilterDown = async (id) => {
    const index = filterTags.value.findIndex(t => t.id === id);
    if (index < 0 || index >= filterTags.value.length - 1) return;
    await swapOrder(index, index + 1);
};

const swapOrder = async (i, j) => {
    try {
        await indexedDBService.init();
        const a = filterTags.value[i];
        const b = filterTags.value[j];
        const tmp = a.order || 0;
        a.order = b.order || 0;
        b.order = tmp;
        await indexedDBService.updateFilter(a);
        await indexedDBService.updateFilter(b);
        // 本地重新排序
        filterTags.value.sort((x, y) => (x.order || 0) - (y.order || 0));
    } catch (error) {
        console.error('交换排序失败:', error);
        uiManager.showNotification('调整排序失败: ' + error.message, 'error');
    }
};

const getNextOrder = () => {
    if (!filterTags.value.length) return 0;
    return Math.max(...filterTags.value.map(t => t.order || 0)) + 1;
};

export const resetFilterForm = () => {
    Object.assign(filterForm, {
        id: '',
        name: '',
        key: '',
        backgroundColor: '#3b82f6',
        order: getNextOrder()
    });
};

// 显示徽标所需的工具函数
export const getFilterName = (key) => {
    if (!key) return '';
    const tag = filterTags.value.find(t => t.key === key);
    return tag ? tag.name : '';
};

export const getFilterColor = (key) => {
    if (!key) return '';
    const tag = filterTags.value.find(t => t.key === key);
    return tag ? (tag.backgroundColor || '#3b82f6') : '';
};