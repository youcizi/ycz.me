/**
 * 主应用程序文件 - 重构后的模块化版本
 * 使用组合式API和模块化结构
 */

// Vue 3 导入
import './vue.global.js';
const { createApp, ref, computed, watch, onMounted, onUnmounted, nextTick } = Vue;

// 服务模块导入
import DataSyncService from './services/DataSyncService.js';
import categoryManager from './modules/CategoryManager.js';
import websiteManager from './modules/WebsiteManager.js';
import { uiManager } from './modules/UIManager.js';
import indexedDBService from './services/IndexedDBService.js';

// 状态管理导入
import { 
    // 数据状态
    categories, websites, filteredWebsites,
    // 搜索状态
    currentCategory, siteSearchKeyword, externalSearchKeyword, currentFilter,
    searchMode, searchEngines, selectedEngineId,
    // UI状态
    isLoading, sidebarCollapsed,
    // 模态框状态
    modals, engineModal,
    // 编辑状态
    editingCategory, editingWebsite, editingEngine, editingFilter,
    // 表单数据
    categoryForm, websiteForm, engineForm, filterForm,
    // 图标选择器状态
    iconSelector,
    // 计算属性
    hasCategories, hasWebsites, currentCategoryName, availableParentCategories, topLevelCategories,
    // 筛选标签
    filterTags
} from './stores/appStore.js';

import { currentIcons, iconCategories } from './stores/iconStore.js';

// 组合式函数导入
import {
    getSubCategories, hasSubCategories, toggleCategoryExpansion, isCategoryExpanded,
    selectCategory, showAddCategoryModal, showEditCategoryModal, closeCategoryModal,
    saveCategory, deleteCategory
} from './composables/useCategories.js';

import {
    showAddWebsiteModal, showEditWebsiteModal, closeWebsiteModal,
    saveWebsite, deleteWebsite, openWebsite
} from './composables/useWebsites.js';

import {
    setFilter, applyFilters, loadSearchEngines,
    switchSearchMode, selectExternalEngine, performSearch,
    openEngineManager, closeEngineManager, resetEngineForm,
    startAddEngine, startEditEngine, saveEngine, deleteEngine,
    moveEngineUp, moveEngineDown
} from './composables/useSearch.js';

import {
    initEmojiPicker, showIconSelector, closeIconSelector,
    selectIcon, selectIconCategory, confirmIconSelection
} from './composables/useIcons.js';

// 工具函数导入
// 动态筛选标签工具函数
import { 
    loadFilters, openFilterManager, closeFilterManager,
    startAddFilter, startEditFilter, saveFilter, deleteFilter,
    moveFilterUp, moveFilterDown,
    getFilterName, getFilterColor
} from './composables/useFilters.js';
import { openWebsite as openWebsiteUtil } from './utils/urlUtils.js';

// 创建Vue应用
const app = createApp({
    setup() {
        // 数据加载方法
        const loadCategories = async () => {
            try {
                await indexedDBService.init();
                const data = await indexedDBService.getCategories();
                categories.value = data || [];
                console.log('分类加载完成:', categories.value.length, '个分类');
            } catch (error) {
                console.error('加载分类失败:', error);
                categories.value = [];
            }
        };

        const loadWebsites = async () => {
            try {
                await indexedDBService.init();
                const data = await indexedDBService.getWebsites();
                websites.value = data || [];
                console.log('网站加载完成:', websites.value.length, '个网站');
                applyFilters();
            } catch (error) {
                console.error('加载网站失败:', error);
                websites.value = [];
            }
        };

        const loadData = async () => {
            isLoading.value = true;
            try {
                await Promise.all([
                    loadCategories(),
                    loadWebsites(),
                    loadSearchEngines(),
                    loadFilters()
                ]);
            } catch (error) {
                console.error('加载数据失败:', error);
            } finally {
                isLoading.value = false;
            }
        };

        // 事件处理器
        const handleCategoryAdded = (category) => {
            console.log('分类已添加:', category);
            loadCategories();
        };

        const handleCategoryUpdated = (category) => {
            console.log('分类已更新:', category);
            loadCategories();
        };

        const handleCategoryDeleted = (categoryId) => {
            console.log('分类已删除:', categoryId);
            loadCategories();
            loadWebsites();
        };

        const handleWebsiteAdded = (website) => {
            console.log('网站已添加:', website);
            loadWebsites();
        };

        const handleWebsiteUpdated = (website) => {
            console.log('网站已更新:', website);
            loadWebsites();
        };

        const handleWebsiteDeleted = (websiteId) => {
            console.log('网站已删除:', websiteId);
            loadWebsites();
        };

        // 应用初始化
        const initializeApp = async () => {
            console.log('初始化应用...');
            
            // 设置事件监听器
            categoryManager.on('categoryAdded', handleCategoryAdded);
            categoryManager.on('categoryUpdated', handleCategoryUpdated);
            categoryManager.on('categoryDeleted', handleCategoryDeleted);
            
            websiteManager.on('websiteAdded', handleWebsiteAdded);
            websiteManager.on('websiteUpdated', handleWebsiteUpdated);
            websiteManager.on('websiteDeleted', handleWebsiteDeleted);
            
            // 加载初始数据
            await loadData();
            
            // 应用初始筛选
            applyFilters();
            
            console.log('应用初始化完成');
        };

        // 清理函数
        const cleanup = () => {
            categoryManager.off('categoryAdded', handleCategoryAdded);
            categoryManager.off('categoryUpdated', handleCategoryUpdated);
            categoryManager.off('categoryDeleted', handleCategoryDeleted);
            
            websiteManager.off('websiteAdded', handleWebsiteAdded);
            websiteManager.off('websiteUpdated', handleWebsiteUpdated);
            websiteManager.off('websiteDeleted', handleWebsiteDeleted);
        };

        // 侧边栏切换
        const toggleSidebar = () => {
            sidebarCollapsed.value = !sidebarCollapsed.value;
        };

        // 监听器
        watch(siteSearchKeyword, () => {
            if (searchMode.value === 'site') {
                applyFilters();
            }
        });

        watch(currentCategory, () => {
            applyFilters();
        });

        watch(websites, () => {
            applyFilters();
        });

        // 生命周期钩子
        onMounted(() => {
            initializeApp();
        });

        onUnmounted(() => {
            cleanup();
        });

        // 返回模板需要的所有数据和方法
        return {
            // 响应式数据
            categories,
            websites,
            filteredWebsites,
            filterTags,
            currentCategory,
            siteSearchKeyword,
            externalSearchKeyword,
            currentFilter,
            searchMode,
            searchEngines,
            selectedEngineId,
            sidebarCollapsed,
            isLoading,
            
            // 模态框状态
            modals,
            engineModal,
            
            // 编辑状态
            editingCategory,
            editingWebsite,
            editingEngine,
            editingFilter,
            
            // 表单数据
            categoryForm,
            websiteForm,
            engineForm,
            filterForm,
            
            // 图标选择器状态
            iconSelector,
            
            // 计算属性
            hasCategories,
            hasWebsites,
            currentCategoryName,
            availableParentCategories,
            topLevelCategories,
            currentIcons,
            iconCategories,
            
            // 分类相关方法
            getSubCategories,
            hasSubCategories,
            toggleCategoryExpansion,
            isCategoryExpanded,
            selectCategory,
            showAddCategoryModal,
            showEditCategoryModal,
            closeCategoryModal,
            saveCategory,
            deleteCategory,
            
            // 网站相关方法
            showAddWebsiteModal,
            showEditWebsiteModal,
            closeWebsiteModal,
            saveWebsite,
            deleteWebsite,
            openWebsite: openWebsiteUtil,
            
            // 搜索相关方法
            setFilter,
            applyFilters,
            switchSearchMode,
            selectExternalEngine,
            performSearch,
            
            // 搜索引擎管理方法
            openEngineManager,
            closeEngineManager,
            resetEngineForm,
            startAddEngine,
            startEditEngine,
            saveEngine,
            deleteEngine,
            moveEngineUp,
            moveEngineDown,
            
            // 图标相关方法
            initEmojiPicker,
            showIconSelector,
            closeIconSelector,
            selectIcon,
            selectIconCategory,
            confirmIconSelection,
            
            // 筛选标签管理方法
            openFilterManager,
            closeFilterManager,
            startAddFilter,
            startEditFilter,
            saveFilter,
            deleteFilter,
            moveFilterUp,
            moveFilterDown,
            // 徽标展示工具
            getFilterName,
            getFilterColor,
            toggleSidebar,
            
            // 数据加载方法
            loadCategories,
            loadWebsites,
            loadData,
            loadFilters
        };
    }
});

// 挂载应用
const mountApp = () => {
    app.mount('#app');
    console.log('Vue应用已挂载');
};

// 导出挂载函数
window.mountApp = mountApp;

// 如果DOM已加载，立即挂载
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountApp);
} else {
    mountApp();
}