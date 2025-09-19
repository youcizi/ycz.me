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
        const expandedCategories = ref(new Set()); // 记录展开的分类ID
        
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
            icon: '📁',
            parentId: ''
        });
        
        const websiteForm = reactive({
            title: '',
            url: '',
            description: '',
            icon: '🌐',
            categoryId: '',
            paymentType: ''
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
        
        // 获取可用的父级分类（排除当前编辑的分类及其子分类）
        const availableParentCategories = computed(() => {
            if (!categories.value.length) return [];
            
            // 如果是编辑模式，需要排除当前分类及其子分类
            if (editingCategory.value) {
                const currentId = editingCategory.value.id;
                return categories.value.filter(category => {
                    // 排除自己
                    if (category.id === currentId) return false;
                    // 排除已经是当前分类子分类的分类（防止循环引用）
                    if (category.parentId === currentId) return false;
                    // 只显示一级分类作为可选父级
                    return !category.parentId;
                });
            }
            
            // 添加模式下，显示所有一级分类
            return categories.value.filter(category => !category.parentId);
        });
        
        // 获取一级分类（用于层级显示）
        const topLevelCategories = computed(() => {
            return categories.value.filter(category => !category.parentId);
        });
        
        // 获取指定分类的子分类
        const getSubCategories = (parentId) => {
            return categories.value.filter(category => category.parentId === parentId);
        };
        
        // 检查分类是否有子分类
        const hasSubCategories = (categoryId) => {
            return categories.value.some(category => category.parentId === categoryId);
        };
        
        // 切换分类展开状态
        const toggleCategoryExpansion = (categoryId) => {
            const expanded = expandedCategories.value;
            if (expanded.has(categoryId)) {
                expanded.delete(categoryId);
            } else {
                expanded.add(categoryId);
            }
            // 触发响应式更新
            expandedCategories.value = new Set(expanded);
        };
        
        // 检查分类是否展开
        const isCategoryExpanded = (categoryId) => {
            return expandedCategories.value.has(categoryId);
        };
        
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
        const selectCategory = (categoryData) => {
            console.log('选择分类:', categoryData);
            
            // 处理分类数据，保持完整的category对象
            if (categoryData === null || categoryData === 'all') {
                currentCategory.value = null;
            } else if (typeof categoryData === 'object' && categoryData.id) {
                // 直接使用传入的category对象
                currentCategory.value = categoryData;
            } else {
                // 如果传入的是ID，查找完整的category对象
                const category = categories.value.find(c => c.id === categoryData);
                currentCategory.value = category || null;
            }
            
            // 同步到NavigationApp（如果存在）
            const categoryName = currentCategory.value ? currentCategory.value.name : '全部';
            if (window.navigationApp && typeof window.navigationApp.handleCategoryChangeFromEvent === 'function') {
                window.navigationApp.handleCategoryChangeFromEvent(categoryName);
            }
            
            // 重新应用筛选
            applyFilters();
        };
        
        const showAddCategoryModal = () => {
            console.log('显示添加分类模态框');
            // 重置表单
            Object.assign(categoryForm, { name: '', icon: '📁', parentId: '' });
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
            Object.assign(categoryForm, { 
                name: category.name || '',
                icon: category.icon || '📁',
                parentId: category.parentId || ''
            });
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
            Object.assign(categoryForm, { name: '', icon: '📁', parentId: '' });
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
                
                const categoryData = {
                    name: categoryForm.name.trim(),
                    icon: categoryForm.icon,
                    parentId: categoryForm.parentId || null
                };
                
                if (editingCategory.value) {
                    // 更新分类
                    await categoryManager.updateCategory(editingCategory.value.id, categoryData);
                    uiManager.showNotification('分类更新成功', 'success');
                } else {
                    // 添加分类
                    await categoryManager.addCategory(categoryData);
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
            // 获取分类信息以显示更详细的警告
            const category = categories.value.find(cat => cat.id === categoryId);
            const categoryName = category ? category.name : '该分类';
            
            // 使用更醒目的警告样式
            if (!await CustomModal.showConfirm(
                `⚠️ 警告：删除分类将会永久删除以下内容：\n\n` +
                `• 分类：${categoryName}\n` +
                `• 该分类下的所有网站\n` +
                `• 该分类的所有子分类及其网站\n\n` +
                `此操作不可撤销，请谨慎操作！`,
                '⚠️ 危险操作确认',
                {
                    confirmText: '确认删除',
                    cancelText: '取消'
                }
            )) {
                return;
            }
            
            try {
                console.log('删除分类:', categoryId);
                isLoading.value = true;
                
                await categoryManager.deleteCategory(categoryId);
                
                // 如果删除的是当前选中的分类，切换到全部
                if (currentCategory.value && currentCategory.value.id === categoryId) {
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
                categoryId: currentCategory.value ? currentCategory.value.id : '',
                icon: '🌐',
                paymentType: ''
            });
            editingWebsite.value = null;
            
            // 显示模态框
            modals.addWebsite = true;
        };
        
        const showEditWebsiteModal = (website) => {
            console.log('显示编辑网站模态框:', website);
            // 填充表单数据，确保字段映射正确
            Object.assign(websiteForm, {
                title: website.name || website.title || '', // 使用name字段填充title表单字段
                url: website.url || '',
                description: website.description || '',
                categoryId: website.categoryId || '',
                icon: website.icon || '🌐',
                paymentType: website.paymentType || ''
            });
            editingWebsite.value = website;
            
            // 显示模态框（复用添加网站的模态框）
            modals.addWebsite = true;
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
                icon: '🌐',
                paymentType: ''
            });
            editingWebsite.value = null;
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
                    name: websiteForm.title.trim(), // 使用name字段以保持与IndexedDB一致
                    title: websiteForm.title.trim(), // 保留title字段用于兼容性
                    url: websiteForm.url.trim(),
                    description: websiteForm.description.trim(),
                    categoryId: websiteForm.categoryId,
                    icon: websiteForm.icon,
                    paymentType: websiteForm.paymentType || '' // 添加paymentType字段
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
            if (!websiteId) {
                console.warn('删除网站: 网站ID为空');
                return;
            }
            
            // 检查网站是否存在于本地数据中
            const websiteExists = websites.value.find(site => site.id === websiteId);
            if (!websiteExists) {
                console.warn(`网站 ${websiteId} 不存在，从UI中移除`);
                // 直接从UI中移除（可能是数据不同步导致的）
                websites.value = websites.value.filter(site => site.id !== websiteId);
                applyFilters();
                return;
            }
            
            if (!await CustomModal.showConfirm(`确定要删除网站 "${websiteExists.name || websiteExists.title}" 吗？`)) {
                return;
            }
            
            try {
                console.log('删除网站:', websiteId);
                isLoading.value = true;
                
                const result = await websiteManager.deleteWebsite(websiteId);
                
                if (result === false) {
                    // 网站不存在或已被删除，但操作成功完成
                    console.log('网站已被清理，无需进一步操作');
                    uiManager.showNotification('网站已删除', 'info');
                } else {
                    // 正常删除成功
                    uiManager.showNotification('网站删除成功', 'success');
                }
                
                // 重新加载数据以确保UI同步
                await loadData();
                
            } catch (error) {
                console.error('删除网站失败:', error);
                
                // 根据错误类型提供不同的用户提示
                if (error.message && error.message.includes('网站不存在')) {
                    // 网站不存在，清理UI数据
                    websites.value = websites.value.filter(site => site.id !== websiteId);
                    applyFilters();
                    uiManager.showNotification('网站已不存在，已从列表中移除', 'info');
                } else {
                    uiManager.showNotification('删除网站失败: ' + error.message, 'error');
                }
            } finally {
                isLoading.value = false;
            }
        };
        
        // 图标选择器相关方法 - 使用新的EmojiIconPicker组件
        let emojiPicker = null;
        
        const initEmojiPicker = () => {
            if (!emojiPicker) {
                emojiPicker = new EmojiIconPicker();
            }
        };
        
        const showIconSelector = (type, currentIcon) => {
            console.log('显示图标选择器:', type, '当前图标:', currentIcon);
            initEmojiPicker();
            
            // 查找对应的input元素
            let inputElement = null;
            if (type === 'category') {
                // 查找分类图标输入框
                inputElement = document.querySelector('.category-modal .icon-preview-input');
            } else if (type === 'website') {
                // 查找网站图标输入框
                inputElement = document.querySelector('.website-modal .icon-preview-input');
            }
            
            if (inputElement) {
                // 使用新的showForInput方法
                EmojiIconPicker.showForInput(inputElement);
            } else {
                // 回退到原有方式
                const callback = (selectedEmoji) => {
                    console.log('选择的emoji:', selectedEmoji);
                    if (selectedEmoji) {
                        if (type === 'category') {
                            categoryForm.icon = selectedEmoji;
                            console.log('分类图标已更新:', categoryForm.icon);
                        } else if (type === 'website') {
                            websiteForm.icon = selectedEmoji;
                            console.log('网站图标已更新:', websiteForm.icon);
                        }
                    }
                };
                
                const targetElement = document.activeElement || document.body;
                emojiPicker.show(targetElement, callback);
            }
        };
        
        const closeIconSelector = () => {
            console.log('关闭图标选择器');
            if (emojiPicker) {
                emojiPicker.hide();
            }
        };
        
        // 保持向后兼容的方法
        const selectIcon = (icon) => {
            console.log('选择图标:', icon);
            // 这个方法现在由EmojiIconPicker内部处理
        };
        
        const selectIconCategory = (categoryName) => {
            // 这个方法现在由EmojiIconPicker内部处理
        };
        
        const confirmIconSelection = () => {
            // 这个方法现在由EmojiIconPicker内部处理
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
        
        const handleCategoryDeleted = (deletedCategory) => {
             console.log('分类删除事件:', deletedCategory);
             if (deletedCategory && deletedCategory.id) {
                 const categoryId = deletedCategory.id;
                 const categoryName = deletedCategory.name;
                 
                 // 删除分类
                 categories.value = categories.value.filter(cat => cat.id !== categoryId);
                 
                 // 将该分类下的网站更新为"未分类"
                 websites.value = websites.value.map(site => {
                     if (site.category === categoryName) {
                         return { ...site, category: '未分类' };
                     }
                     return site;
                 });
                 
                 // 如果删除的是当前选中的分类，切换到全部
                 if (currentCategory.value && currentCategory.value.id === categoryId) {
                     currentCategory.value = null;
                 }
                 
                 // 重新加载数据以确保同步
                 loadWebsites().then(() => {
                     applyFilters();
                 });
                 
                 console.log(`已从UI中移除分类 "${deletedCategory.name}"，其下的网站已移动到"未分类"`);
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
        
        // 付费类型相关方法
        const getPaymentTypeLabel = (paymentType) => {
            const labels = {
                'free': '免费',
                'paid': '付费',
                'trial': '试用',
                'points': '送积分'
            };
            return labels[paymentType] || '';
        };
        
        const getPaymentTypeClass = (paymentType) => {
            const classes = {
                'free': 'payment-type-free',
                'paid': 'payment-type-paid',
                'trial': 'payment-type-trial',
                'points': 'payment-type-points'
            };
            return classes[paymentType] || '';
        };
        
        const openWebsite = (url) => {
            if (url) {
                window.open(url, '_blank');
            }
        };
        
        // 侧边栏切换方法
        const toggleSidebar = async () => {
            try {
                // 调用NavigationApp的toggleSidebar方法
                if (window.navigationApp && typeof window.navigationApp.toggleSidebar === 'function') {
                    await window.navigationApp.toggleSidebar();
                } else {
                    // 如果NavigationApp不可用，直接切换CSS类
                    const sidebar = document.querySelector('.sidebar');
                    if (sidebar) {
                        sidebar.classList.toggle('collapsed');
                    }
                }
            } catch (error) {
                console.error('切换侧边栏失败:', error);
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
            availableParentCategories,
            topLevelCategories,
            
            // 层级相关数据
            expandedCategories,
            
            // 分类方法
            selectCategory,
            showAddCategoryModal,
            showEditCategoryModal,
            closeCategoryModal,
            saveCategory,
            deleteCategory,
            
            // 层级相关方法
            getSubCategories,
            hasSubCategories,
            toggleCategoryExpansion,
            isCategoryExpanded,
            
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
            cleanup,
            
            // 付费类型方法
            getPaymentTypeLabel,
            getPaymentTypeClass,
            openWebsite,
            
            // 侧边栏方法
            toggleSidebar
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