/**
 * 应用状态管理
 * 管理全局应用状态、分类、网站等数据
 */

const { ref, computed, reactive } = Vue;

// 应用状态
export const isAppInitialized = ref(false);
export const isLoading = ref(true);
export const error = ref(null);

// 数据状态
export const categories = ref([]);
export const websites = ref([]);
export const filteredWebsites = ref([]);
export const currentCategory = ref(null);

// 搜索状态
export const siteSearchKeyword = ref('');
export const externalSearchKeyword = ref('');
export const currentFilter = ref('all');
export const searchMode = ref('site'); // 'site' 或 'external'
export const searchEngines = ref([]);
export const selectedEngineId = ref('');

// UI状态
export const expandedCategories = ref(new Set());
export const sidebarCollapsed = ref(false);

// 模态框状态
export const modals = reactive({
    addCategory: false,
    editCategory: false,
    addWebsite: false,
    editWebsite: false,
    iconSelector: false
});

// 编辑状态
export const editingCategory = ref(null);
export const editingWebsite = ref(null);

// 表单数据
export const categoryForm = reactive({
    name: '',
    icon: '📁',
    parentId: ''
});

export const websiteForm = reactive({
    title: '',
    url: '',
    description: '',
    icon: '🌐',
    categoryId: '',
    paymentType: ''
});

// 搜索引擎管理状态
export const engineModal = reactive({ show: false });
export const engineForm = reactive({ 
    name: '', 
    template: '', 
    icon: '🔍', 
    order: 0 
});
export const editingEngine = ref(null);

// 图标选择器状态
export const iconSelectorContext = reactive({
    type: '',
    currentIcon: '',
    callback: null
});

export const iconSelector = reactive({
    selectedCategory: 'website',
    selectedIcon: '',
    show: false,
    type: '',
    selected: ''
});

// 计算属性
export const hasCategories = computed(() => categories.value.length > 0);
export const hasWebsites = computed(() => filteredWebsites.value.length > 0);
export const hasCurrentCategory = computed(() => currentCategory.value !== null);
export const currentCategoryName = computed(() => {
    if (!currentCategory.value) return '全部';
    const category = categories.value.find(c => c.id === currentCategory.value);
    return category ? category.name : '全部';
});

// 获取可用的父级分类
export const availableParentCategories = computed(() => {
    if (!categories.value.length) return [];
    
    if (editingCategory.value) {
        const currentId = editingCategory.value.id;
        return categories.value.filter(category => {
            if (category.id === currentId) return false;
            if (category.parentId === currentId) return false;
            return !category.parentId;
        });
    }
    
    return categories.value.filter(category => !category.parentId);
});

// 获取一级分类
export const topLevelCategories = computed(() => {
    return categories.value.filter(category => !category.parentId);
});