/**
 * Vue3 主应用文件
 * 包含所有Vue3逻辑、响应式数据和方法
 */

// 导入依赖模块
import dataSyncService from './services/DataSyncService.js';
import categoryManager from './modules/CategoryManager.js';
import websiteManager from './modules/WebsiteManager.js';
import UIManager, { uiManager } from './modules/UIManager.js';
import indexedDBService from './services/IndexedDBService.js';

// 从全局Vue对象中解构需要的API
const { createApp, ref, computed, reactive, onMounted, onUnmounted, watch, nextTick } = window.Vue;

const app = createApp({
    setup() {
        // 应用状态
        const isAppInitialized = ref(false);
        const isLoading = ref(true);
        const error = ref(null);
        
        // 响应式数据
        const categories = ref([]);
        const websites = ref([]);
        const filteredWebsites = ref([]);
        const currentCategory = ref(null);
        const searchKeyword = ref('');
        const currentFilter = ref('all');
        
        // 模态框状态 - 使用响应式对象
        const modals = reactive({
            addCategory: false,
            editCategory: false,
            addWebsite: false,
            editWebsite: false,
            iconSelector: false
        });
        
        // 编辑数据
        const editingCategory = ref(null);
        const editingWebsite = ref(null);
        
        // 图标选择器状态
        const iconSelectorContext = reactive({
            type: '', // 'category' 或 'website'
            currentIcon: '',
            callback: null
        });
        
        // 图标选择器数据
        const iconCategories = ref([
            { name: 'website', label: '网站图标' },
            { name: 'category', label: '分类图标' }
        ]);
        
        const iconSelector = reactive({
            selectedCategory: 'website',
            selectedIcon: '',
            show: false,
            type: '',
            selected: ''
        });
        
        // 表单数据 - 使用响应式对象
        const categoryForm = reactive({
            name: '',
            icon: '📁'
        });
        
        const websiteForm = reactive({
            title: '',
            url: '',
            description: '',
            icon: '🌐',
            categoryId: ''
        });
        
        // 图标数据
        const categoryIcons = ref([
            '📁', '🔧', '💻', '📚', '🎮', '🎵', '🎬', '📱',
            '🌐', '📊', '💼', '🎨', '🔬', '🏠', '🚗', '✈️',
            '🍔', '☕', '🛒', '💰', '📰', '📺', '🎯', '⚽'
        ]);
        
        const websiteIcons = ref([
            '🌐', '🔍', '📧', '💬', '📱', '💻', '🎵', '🎬',
            '📚', '📰', '🛒', '💰', '🎮', '🎨', '📊', '🔧',
            '☁️', '🔒', '📝', '📷', '🗺️', '⭐', '❤️', '🔥'
        ]);
        
        // 计算属性
        const currentIcons = computed(() => {
            if (iconSelector.selectedCategory === 'website') {
                return websiteIcons.value;
            } else {
                return categoryIcons.value;
            }
        });
        
        const hasCategories = computed(() => categories.value.length > 0);
        const hasWebsites = computed(() => filteredWebsites.value.length > 0);
        const hasCurrentCategory = computed(() => currentCategory.value !== null);
        const currentCategoryName = computed(() => {
            if (!currentCategory.value) return '全部';
            const category = categories.value.find(c => c.id === currentCategory.value);
            return category ? category.name : '全部';
        });
        
        // 监听器
        watch(searchKeyword, (newKeyword) => {
            console.log('搜索关键词变化:', newKeyword);
            applyFilters();
        });
        
        watch(currentCategory, (newCategory) => {
            console.log('当前分类变化:', newCategory);
            applyFilters();
        });
        
        watch(websites, () => {
            console.log('网站数据变化，重新应用筛选');
            applyFilters();
        }, { deep: true });
        
        // 分类相关方法
        const selectCategory = (categoryId) => {
            console.log('选择分类:', categoryId);
            currentCategory.value = categoryId === 'all' ? null : categoryId;
        };
        
        const showAddCategoryModal = () => {
            console.log('显示添加分类模态框');
            // 重置表单
            Object.assign(categoryForm, { name: '', icon: '📁' });
            editingCategory.value = null;
            
            // 显示模态框
            modals.addCategory = true;
            
            // 使用UI管理器显示模态框
            nextTick(() => {
                uiManager.showModal('add-category-modal');
            });
        };
        
        const showEditCategoryModal = (category) => {
            console.log('显示编辑分类模态框:', category);
            // 填充表单数据
            Object.assign(categoryForm, { ...category });
            editingCategory.value = category;
            
            // 显示模态框
            modals.editCategory = true;
            
            // 使用UI管理器显示模态框
            nextTick(() => {
                uiManager.showModal('edit-category-modal');
            });
        };
        
        const closeCategoryModal = () => {
            console.log('关闭分类模态框');
            
            // 关闭模态框
            modals.addCategory = false;
            modals.editCategory = false;
            
            // 重置表单和编辑状态
            Object.assign(categoryForm, { name: '', icon: '📁' });
            editingCategory.value = null;
            
            // 使用UI管理器关闭模态框
            uiManager.closeModal('add-category-modal');
            uiManager.closeModal('edit-category-modal');
        };
        
        const saveCategory = async () => {
            try {
                console.log('保存分类:', categoryForm);
                
                // 验证表单数据
                if (!categoryForm.name.trim()) {
                    uiManager.showNotification('请输入分类名称', 'error');
                    return;
                }
                
                isLoading.value = true;
                
                if (editingCategory.value) {
                    // 更新分类
                    await categoryManager.updateCategory(editingCategory.value.id, {
                        name: categoryForm.name.trim(),
                        icon: categoryForm.icon
                    });
                    uiManager.showNotification('分类更新成功', 'success');
                } else {
                    // 添加分类
                    await categoryManager.addCategory({
                        name: categoryForm.name.trim(),
                        icon: categoryForm.icon
                    });
                    uiManager.showNotification('分类添加成功', 'success');
                }
                
                // 重新加载数据
                await loadData();
                
                // 关闭模态框
                closeCategoryModal();
                
            } catch (error) {
                console.error('保存分类失败:', error);
                uiManager.showNotification('保存分类失败: ' + error.message, 'error');
            } finally {
                isLoading.value = false;
            }
        };
        
        const deleteCategory = async (categoryId) => {
            if (!await CustomModal.showConfirm('确定要删除这个分类吗？删除后该分类下的所有网站也会被删除。')) {
                return;
            }
            
            try {
                console.log('删除分类:', categoryId);
                isLoading.value = true;
                
                await categoryManager.deleteCategory(categoryId);
                
                // 如果删除的是当前选中的分类，切换到全部
                if (currentCategory.value === categoryId) {
                    currentCategory.value = null;
                }
                
                // 重新加载数据
                await loadData();
                
                uiManager.showNotification('分类删除成功', 'success');
                
            } catch (error) {
                console.error('删除分类失败:', error);
                uiManager.showNotification('删除分类失败: ' + error.message, 'error');
            } finally {
                isLoading.value = false;
            }
        };
        
        // 网站相关方法
        const showAddWebsiteModal = () => {
            console.log('显示添加网站模态框');
            // 重置表单
            Object.assign(websiteForm, {
                title: '',
                url: '',
                description: '',
                categoryId: currentCategory.value || '',
                icon: '🌐'
            });
            editingWebsite.value = null;
            
            // 显示模态框
            modals.addWebsite = true;
            
            // 使用UI管理器显示模态框
            nextTick(() => {
                uiManager.showModal('add-website-modal');
            });
        };
        
        const showEditWebsiteModal = (website) => {
            console.log('显示编辑网站模态框:', website);
            // 填充表单数据
            Object.assign(websiteForm, { ...website });
            editingWebsite.value = website;
            
            // 显示模态框
            modals.editWebsite = true;
            
            // 使用UI管理器显示模态框
            nextTick(() => {
                uiManager.showModal('edit-website-modal');
            });
        };
        
        const closeWebsiteModal = () => {
            console.log('关闭网站模态框');
            
            // 关闭模态框
            modals.addWebsite = false;
            modals.editWebsite = false;
            
            // 重置表单和编辑状态
            Object.assign(websiteForm, {
                title: '',
                url: '',
                description: '',
                categoryId: '',
                icon: '🌐'
            });
            editingWebsite.value = null;
            
            // 使用UI管理器关闭模态框
            uiManager.closeModal('add-website-modal');
            uiManager.closeModal('edit-website-modal');
        };
        
        const saveWebsite = async () => {
            try {
                console.log('保存网站:', websiteForm);
                
                // 验证表单数据
                if (!websiteForm.title.trim()) {
                    uiManager.showNotification('请输入网站名称', 'error');
                    return;
                }
                
                if (!websiteForm.url.trim()) {
                    uiManager.showNotification('请输入网站URL', 'error');
                    return;
                }
                
                if (!websiteForm.categoryId) {
                    uiManager.showNotification('请选择分类', 'error');
                    return;
                }
                
                isLoading.value = true;
                
                const websiteData = {
                    title: websiteForm.title.trim(),
                    url: websiteForm.url.trim(),
                    description: websiteForm.description.trim(),
                    categoryId: websiteForm.categoryId,
                    icon: websiteForm.icon
                };
                
                if (editingWebsite.value) {
                    // 更新网站
                    await websiteManager.updateWebsite(editingWebsite.value.id, websiteData);
                    uiManager.showNotification('网站更新成功', 'success');
                } else {
                    // 添加网站
                    await websiteManager.addWebsite(websiteData);
                    uiManager.showNotification('网站添加成功', 'success');
                }
                
                // 重新加载数据
                await loadData();
                
                // 关闭模态框
                closeWebsiteModal();
                
            } catch (error) {
                console.error('保存网站失败:', error);
                uiManager.showNotification('保存网站失败: ' + error.message, 'error');
            } finally {
                isLoading.value = false;
            }
        };
        
        const deleteWebsite = async (websiteId) => {
            if (!await CustomModal.showConfirm('确定要删除这个网站吗？')) {
                return;
            }
            
            try {
                console.log('删除网站:', websiteId);
                isLoading.value = true;
                
                await websiteManager.deleteWebsite(websiteId);
                
                // 重新加载数据
                await loadData();
                
                uiManager.showNotification('网站删除成功', 'success');
                
            } catch (error) {
                console.error('删除网站失败:', error);
                uiManager.showNotification('删除网站失败: ' + error.message, 'error');
            } finally {
                isLoading.value = false;
            }
        };
        
        // 图标选择器相关方法
        const showIconSelector = (type) => {
            console.log('显示图标选择器:', type);
            iconSelector.show = true;
            iconSelector.type = type;
            iconSelector.selected = '';
            
            // 使用UI管理器显示模态框
            nextTick(() => {
                uiManager.showModal('icon-selector-modal');
            });
        };
        
        const closeIconSelector = () => {
            console.log('关闭图标选择器');
            iconSelector.show = false;
            iconSelector.type = '';
            iconSelector.selected = '';
            
            // 使用UI管理器关闭模态框
            uiManager.closeModal('icon-selector-modal');
        };
        
        const selectIcon = (icon) => {
            console.log('选择图标:', icon);
            iconSelector.selected = icon;
        };
        
        const selectIconCategory = (categoryName) => {
            iconSelector.selectedCategory = categoryName;
        };
        
        const confirmIconSelection = () => {
            console.log('确认图标选择:', iconSelector.selected, iconSelector.type);
            
            if (iconSelector.selected) {
                if (iconSelector.type === 'category') {
                    categoryForm.icon = iconSelector.selected;
                } else if (iconSelector.type === 'website') {
                    websiteForm.icon = iconSelector.selected;
                }
            }
            
            closeIconSelector();
        };
        
        // 使用导入的管理器实例
        // categoryManager, websiteManager, uiManager, dataSyncService, dbService 已在顶部导入
        
        // 初始化管理器
        
        // 数据加载方法
        const loadCategories = async () => {
            try {
                console.log('开始加载分类数据');
                // 确保CategoryManager已初始化
                await categoryManager.init();
                const loadedCategories = categoryManager.getCategories();
                categories.value = loadedCategories || [];
                console.log('分类加载完成:', categories.value.length, '个分类');
                return categories.value;
            } catch (error) {
                console.error('加载分类失败:', error);
                error.value = '加载分类失败: ' + error.message;
                uiManager.showNotification('加载分类失败', 'error');
                categories.value = [];
                return [];
            }
        };
        
        const loadWebsites = async () => {
            try {
                console.log('开始加载网站数据');
                // 确保WebsiteManager已初始化
                await websiteManager.init();
                const loadedWebsites = websiteManager.getWebsites();
                websites.value = loadedWebsites || [];
                console.log('网站加载完成:', websites.value.length, '个网站');
                return websites.value;
            } catch (error) {
                console.error('加载网站失败:', error);
                error.value = '加载网站失败: ' + error.message;
                uiManager.showNotification('加载网站失败', 'error');
                websites.value = [];
                return [];
            }
        };
        
        const loadData = async () => {
            try {
                console.log('开始加载所有数据');
                isLoading.value = true;
                error.value = null;
                
                // 并行加载分类和网站数据
                const [categoriesResult, websitesResult] = await Promise.allSettled([
                    loadCategories(),
                    loadWebsites()
                ]);
                
                // 检查加载结果
                if (categoriesResult.status === 'rejected') {
                    console.error('分类加载失败:', categoriesResult.reason);
                }
                
                if (websitesResult.status === 'rejected') {
                    console.error('网站加载失败:', websitesResult.reason);
                }
                
                console.log('数据加载完成');
                
            } catch (error) {
                console.error('加载数据失败:', error);
                error.value = '加载数据失败: ' + error.message;
                uiManager.showNotification('加载数据失败', 'error');
            } finally {
                isLoading.value = false;
            }
        };
        
        // 筛选方法
        const setFilter = (filter) => {
            currentFilter.value = filter;
            applyFilters();
        };
        
        const applyFilters = () => {
            try {
                console.log('应用筛选条件 - 分类:', currentCategory.value, '搜索:', searchKeyword.value);
                
                let filtered = [...(websites.value || [])];
                
                // 按分类筛选
                if (currentCategory.value) {
                    filtered = filtered.filter(website => 
                        website && website.categoryId === currentCategory.value
                    );
                    console.log('分类筛选后:', filtered.length, '个网站');
                }
                
                // 按搜索关键词筛选
                if (searchKeyword.value && searchKeyword.value.trim()) {
                    const keyword = searchKeyword.value.trim().toLowerCase();
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
                
                // 按类型筛选（这里可以根据实际需求扩展）
                if (currentFilter.value !== 'all') {
                    // 这里可以根据网站的类型字段进行筛选
                    // 暂时保持所有网站显示，可以后续根据数据结构调整
                }
                
                filteredWebsites.value = filtered;
                console.log('最终筛选结果:', filteredWebsites.value.length, '个网站');
                
            } catch (error) {
                console.error('筛选失败:', error);
                filteredWebsites.value = [];
            }
        };
        
        // 事件处理器
        const handleCategoryAdded = (category) => {
            console.log('分类添加事件:', category);
            if (category && category.id) {
                const existingIndex = categories.value.findIndex(cat => cat.id === category.id);
                if (existingIndex === -1) {
                    categories.value.push(category);
                } else {
                    categories.value[existingIndex] = category;
                }
                applyFilters();
            }
        };
        
        const handleCategoryUpdated = (updatedCategory) => {
            console.log('分类更新事件:', updatedCategory);
            if (updatedCategory && updatedCategory.id) {
                const index = categories.value.findIndex(cat => cat.id === updatedCategory.id);
                if (index !== -1) {
                    categories.value[index] = updatedCategory;
                    applyFilters();
                }
            }
        };
        
        const handleCategoryDeleted = (categoryId) => {
            console.log('分类删除事件:', categoryId);
            if (categoryId) {
                // 删除分类
                categories.value = categories.value.filter(cat => cat.id !== categoryId);
                
                // 删除该分类下的所有网站
                websites.value = websites.value.filter(site => site.categoryId !== categoryId);
                
                // 如果删除的是当前选中的分类，切换到全部
                if (currentCategory.value === categoryId) {
                    currentCategory.value = null;
                }
                
                applyFilters();
            }
        };
        
        const handleWebsiteAdded = (website) => {
            console.log('网站添加事件:', website);
            if (website && website.id) {
                const existingIndex = websites.value.findIndex(site => site.id === website.id);
                if (existingIndex === -1) {
                    websites.value.push(website);
                } else {
                    websites.value[existingIndex] = website;
                }
                applyFilters();
            }
        };
        
        const handleWebsiteUpdated = (updatedWebsite) => {
            console.log('网站更新事件:', updatedWebsite);
            if (updatedWebsite && updatedWebsite.id) {
                const index = websites.value.findIndex(site => site.id === updatedWebsite.id);
                if (index !== -1) {
                    websites.value[index] = updatedWebsite;
                    applyFilters();
                }
            }
        };
        
        const handleWebsiteDeleted = (websiteId) => {
            console.log('网站删除事件:', websiteId);
            if (websiteId) {
                websites.value = websites.value.filter(site => site.id !== websiteId);
                applyFilters();
            }
        };
        
        // 分类操作
        const switchCategory = (categoryId) => {
            currentCategory.value = categoryId;
        };
        
        // 应用初始化
        const initializeApp = async () => {
            try {
                console.log('开始初始化应用');
                isLoading.value = true;
                error.value = null;
                
                // 初始化数据同步服务
                console.log('初始化数据同步服务');
                await dataSyncService.init();
                
                // 初始化UI管理器
                console.log('初始化UI管理器');
                await uiManager.init();
                
                // 设置事件监听器
                console.log('设置事件监听器');
                categoryManager.on('categoryAdded', handleCategoryAdded);
                categoryManager.on('categoryUpdated', handleCategoryUpdated);
                categoryManager.on('categoryDeleted', handleCategoryDeleted);
                
                websiteManager.on('websiteAdded', handleWebsiteAdded);
                websiteManager.on('websiteUpdated', handleWebsiteUpdated);
                websiteManager.on('websiteDeleted', handleWebsiteDeleted);
                
                // 加载初始数据
                console.log('加载初始数据');
                await loadCategories();
                await loadWebsites();
                
                // 应用初始筛选
                applyFilters();
                
                // 标记应用已初始化
                isAppInitialized.value = true;
                
                console.log('Vue3应用初始化完成');
                
            } catch (error) {
                console.error('应用初始化失败:', error);
                error.value = '应用初始化失败: ' + error.message;
                uiManager.showNotification('应用初始化失败', 'error');
            } finally {
                isLoading.value = false;
            }
        };
        
        // 清理函数
        const cleanup = () => {
            console.log('清理应用资源');
            
            // 移除事件监听器
            categoryManager.off('categoryAdded', handleCategoryAdded);
            categoryManager.off('categoryUpdated', handleCategoryUpdated);
            categoryManager.off('categoryDeleted', handleCategoryDeleted);
            
            websiteManager.off('websiteAdded', handleWebsiteAdded);
            websiteManager.off('websiteUpdated', handleWebsiteUpdated);
            websiteManager.off('websiteDeleted', handleWebsiteDeleted);
            
            // 销毁管理器
            if (uiManager && typeof uiManager.destroy === 'function') {
                uiManager.destroy();
            }
        };
        
        // 生命周期钩子
        onMounted(async () => {
            console.log('Vue应用已挂载，开始初始化');
            try {
                await initializeApp();
            } catch (error) {
                console.error('应用初始化失败:', error);
            }
        });
        
        onUnmounted(() => {
            console.log('Vue应用即将卸载');
            cleanup();
        });
        
        // 返回响应式数据和方法供模板使用
        return {
            // 应用状态
            isAppInitialized,
            isLoading,
            error,
            
            // 响应式数据
            categories,
            websites,
            filteredWebsites,
            currentCategory,
            searchKeyword,
            currentFilter,
            modals,
            editingCategory,
            editingWebsite,
            categoryForm,
            websiteForm,
            categoryIcons,
            websiteIcons,
            iconSelectorContext,
            
            // 计算属性
            hasCategories,
            hasWebsites,
            hasCurrentCategory,
            currentCategoryName,
            currentIcons,
            
            // 分类方法
            selectCategory,
            showAddCategoryModal,
            showEditCategoryModal,
            closeCategoryModal,
            saveCategory,
            deleteCategory,
            
            // 网站方法
            showAddWebsiteModal,
            showEditWebsiteModal,
            closeWebsiteModal,
            saveWebsite,
            deleteWebsite,
            
            // 图标选择器方法
            showIconSelector,
            closeIconSelector,
            selectIcon,
            selectIconCategory,
            confirmIconSelection,
            iconCategories,
            iconSelector,
            
            // 筛选方法
            setFilter,
            applyFilters,
            
            // 工具方法
            loadData,
            cleanup
        };
    }
});

// 确保DOM完全加载后再挂载应用
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountApp);
} else {
    mountApp();
}

function mountApp() {
    try {
        const appElement = document.getElementById('app');
        if (!appElement) {
            console.error('找不到 #app 元素，Vue应用挂载失败');
            return;
        }
        
        app.mount('#app');
        console.log('Vue3应用已成功挂载到 #app');
        
        // 移除 v-cloak 属性，显示应用内容
        appElement.removeAttribute('v-cloak');
        
    } catch (error) {
        console.error('Vue3应用挂载失败:', error);
        
        // 显示错误信息给用户
        const appElement = document.getElementById('app');
        if (appElement) {
            appElement.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #e74c3c;">
                    <h2>应用加载失败</h2>
                    <p>请刷新页面重试，或联系管理员。</p>
                    <p style="font-size: 12px; color: #666;">错误信息: ${error.message}</p>
                </div>
            `;
            appElement.removeAttribute('v-cloak');
        }
    }
}