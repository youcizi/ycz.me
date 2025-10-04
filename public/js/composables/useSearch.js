/**
 * 搜索功能组合式函数
 * 处理站内搜索和外部搜索引擎相关逻辑
 */

import indexedDBService from '../services/IndexedDBService.js';
import { uiManager } from '../modules/UIManager.js';
import { 
    websites,
    filteredWebsites,
    currentCategory,
    siteSearchKeyword,
    externalSearchKeyword,
    currentFilter,
    searchMode,
    searchEngines,
    selectedEngineId,
    engineModal,
    engineForm,
    editingEngine
} from '../stores/appStore.js';

// 筛选方法
export const setFilter = (filter) => {
    currentFilter.value = filter;
    applyFilters();
};

export const applyFilters = () => {
    try {
        console.log('应用筛选条件 - 分类:', currentCategory.value, '搜索:', siteSearchKeyword.value);
        console.log('当前网站数据:', websites.value);
        
        let filtered = [...(websites.value || [])];
        
        // 按分类筛选
        if (currentCategory.value) {
            const categoryId = currentCategory.value.id;
            console.log('筛选前网站数量:', filtered.length);
            console.log('筛选条件 categoryId:', categoryId);
            filtered = filtered.filter(website => {
                console.log('检查网站:', website.name, 'categoryId:', website.categoryId, '匹配:', website.categoryId === categoryId);
                return website && website.categoryId === categoryId;
            });
            console.log('分类筛选后:', filtered.length, '个网站');
        }
        
        // 按搜索关键词筛选（仅站内搜索模式）
        if (searchMode.value === 'site' && siteSearchKeyword.value && siteSearchKeyword.value.trim()) {
            const keyword = siteSearchKeyword.value.trim().toLowerCase();
            filtered = filtered.filter(website => {
                if (!website) return false;
                
                const name = (website.name || website.title || '').toLowerCase();
                const description = (website.description || '').toLowerCase();
                const url = (website.url || '').toLowerCase();
                
                return name.includes(keyword) ||
                       description.includes(keyword) ||
                       url.includes(keyword);
            });
            console.log('搜索筛选后:', filtered.length, '个网站');
        }
        
        // 按付费类型筛选
        if (currentFilter.value !== 'all') {
            filtered = filtered.filter(website => {
                if (!website) return false;
                const paymentType = website.paymentType || website.priceType || '';
                return paymentType === currentFilter.value;
            });
            console.log('付费类型筛选后:', filtered.length, '个网站');
        }
        
        filteredWebsites.value = filtered;
        console.log('最终筛选结果:', filteredWebsites.value.length, '个网站');
        
    } catch (error) {
        console.error('筛选失败:', error);
        filteredWebsites.value = [];
    }
};

// 搜索引擎管理
export const loadSearchEngines = async () => {
    try {
        await indexedDBService.init();
        const engines = await indexedDBService.getSearchEngines();
        searchEngines.value = (engines || []).sort((a, b) => (a.order || 0) - (b.order || 0));
        // 规范化一次，确保顺序无重复且从0开始递增
        await normalizeEngineOrders();
    } catch (error) {
        console.error('加载搜索引擎失败:', error);
        searchEngines.value = [];
    }
};

export const ensureDefaultSearchEngines = async () => {
    try {
        if ((searchEngines.value || []).length === 0) {
            const defaults = [
                { name: 'Google', template: 'https://www.google.com/search?q={q}', icon: '🔎', order: 0 },
                { name: '百度', template: 'https://www.baidu.com/s?wd={q}', icon: '🔍', order: 1 },
                { name: '必应', template: 'https://www.bing.com/search?q={q}', icon: '🔍', order: 2 }
            ];
            for (const engine of defaults) {
                await indexedDBService.addSearchEngine(engine);
            }
            await loadSearchEngines();
        }
    } catch (error) {
        console.error('初始化默认搜索引擎失败:', error);
    }
};

export const switchSearchMode = (mode) => {
    searchMode.value = mode === 'external' ? 'external' : 'site';
    if (searchMode.value === 'site') {
        applyFilters();
    }
};

export const selectExternalEngine = (engineId) => {
    selectedEngineId.value = engineId || '';
};

export const buildExternalSearchUrl = (engine, query) => {
    try {
        const template = engine?.template || '';
        const encoded = encodeURIComponent(query || '');
        return template.replace('{q}', encoded);
    } catch (e) {
        return '';
    }
};

export const performSearch = () => {
    if (searchMode.value === 'site') {
        applyFilters();
        return;
    }
    const engine = (searchEngines.value || []).find(e => e.id === selectedEngineId.value) || null;
    if (!engine) {
        uiManager.showNotification('请选择一个搜索引擎', 'warning');
        return;
    }
    const url = buildExternalSearchUrl(engine, externalSearchKeyword.value || '');
    if (!url) {
        uiManager.showNotification('搜索引擎URL模板无效', 'error');
        return;
    }
    window.open(url, '_blank');
};

// 搜索引擎CRUD操作
export const openEngineManager = () => {
    engineModal.show = true;
};

export const closeEngineManager = () => {
    engineModal.show = false;
    resetEngineForm();
};

export const resetEngineForm = () => {
    Object.assign(engineForm, { name: '', template: '', icon: '🔍', order: 0 });
    editingEngine.value = null;
};

export const startAddEngine = () => {
    resetEngineForm();
};

export const startEditEngine = (engine) => {
    editingEngine.value = engine || null;
    if (engine) {
        Object.assign(engineForm, {
            name: engine.name || '',
            template: engine.template || '',
            icon: engine.icon || '🔍',
            order: engine.order ?? 0
        });
    }
};

export const saveEngine = async () => {
    try {
        await indexedDBService.init();
        if (!engineForm.name.trim() || !engineForm.template.trim()) {
            uiManager.showNotification('名称与模板不能为空', 'error');
            return;
        }
        const payload = {
            name: engineForm.name.trim(),
            template: engineForm.template.trim(),
            icon: engineForm.icon || '🔍',
            order: Number(engineForm.order) || getNextEngineOrder()
        };
        if (editingEngine.value && editingEngine.value.id) {
            await indexedDBService.updateSearchEngine({ id: editingEngine.value.id, ...payload });
            uiManager.showNotification('搜索引擎已更新', 'success');
        } else {
            await indexedDBService.addSearchEngine(payload);
            uiManager.showNotification('搜索引擎已添加', 'success');
        }
        await loadSearchEngines();
        resetEngineForm();
    } catch (error) {
        console.error('保存搜索引擎失败:', error);
        uiManager.showNotification('保存搜索引擎失败: ' + error.message, 'error');
    }
};

export const deleteEngine = async (engineId) => {
    if (!engineId) return;
    if (!await CustomModal.showConfirm('确定要删除该搜索引擎吗？')) return;
    try {
        await indexedDBService.deleteSearchEngine(engineId);
        await loadSearchEngines();
        uiManager.showNotification('搜索引擎已删除', 'success');
    } catch (error) {
        console.error('删除搜索引擎失败:', error);
        uiManager.showNotification('删除搜索引擎失败: ' + error.message, 'error');
    }
};

export const moveEngineUp = async (engineId) => {
    const list = [...(searchEngines.value || [])];
    const idx = list.findIndex(e => e.id === engineId);
    if (idx > 0) {
        const prev = list[idx - 1];
        const cur = list[idx];
        const tmp = prev.order || 0;
        prev.order = cur.order || 0;
        cur.order = tmp;
        await indexedDBService.updateSearchEngine(prev);
        await indexedDBService.updateSearchEngine(cur);
        await loadSearchEngines();
    }
};

export const moveEngineDown = async (engineId) => {
    const list = [...(searchEngines.value || [])];
    const idx = list.findIndex(e => e.id === engineId);
    if (idx !== -1 && idx < list.length - 1) {
        const next = list[idx + 1];
        const cur = list[idx];
        const tmp = next.order || 0;
        next.order = cur.order || 0;
        cur.order = tmp;
        await indexedDBService.updateSearchEngine(next);
        await indexedDBService.updateSearchEngine(cur);
        await loadSearchEngines();
    }
};

// 计算下一个唯一排序值，避免与现有条目重复
const getNextEngineOrder = () => {
    const list = searchEngines.value || [];
    if (!list.length) return 0;
    return Math.max(...list.map(e => e.order || 0)) + 1;
};

// 规范化排序：确保顺序从0开始连续递增，解决历史重复order导致无法移动的问题
export const normalizeEngineOrders = async () => {
    try {
        await indexedDBService.init();
        const list = [...(searchEngines.value || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
        let changed = false;
        for (let i = 0; i < list.length; i++) {
            const expected = i;
            const current = list[i].order || 0;
            if (current !== expected) {
                list[i].order = expected;
                await indexedDBService.updateSearchEngine(list[i]);
                changed = true;
            }
        }
        if (changed) {
            // 本地更新已排序列表
            searchEngines.value = list;
        }
    } catch (error) {
        console.error('规范化搜索引擎排序失败:', error);
    }
};