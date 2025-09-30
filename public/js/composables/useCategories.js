/**
 * 分类管理组合式函数
 * 处理分类相关的业务逻辑
 */

const { nextTick } = Vue;
import categoryManager from '../modules/CategoryManager.js';
import { uiManager } from '../modules/UIManager.js';
import { 
    categories, 
    currentCategory, 
    modals, 
    categoryForm, 
    editingCategory,
    expandedCategories,
    isLoading 
} from '../stores/appStore.js';

// 分类层级相关方法
export const getSubCategories = (parentId) => {
    return categories.value.filter(category => category.parentId === parentId);
};

export const hasSubCategories = (categoryId) => {
    return categories.value.some(category => category.parentId === categoryId);
};

export const toggleCategoryExpansion = (categoryId) => {
    const expanded = expandedCategories.value;
    if (expanded.has(categoryId)) {
        expanded.delete(categoryId);
    } else {
        expanded.add(categoryId);
    }
    expandedCategories.value = new Set(expanded);
};

export const isCategoryExpanded = (categoryId) => {
    return expandedCategories.value.has(categoryId);
};

// 分类选择
export const selectCategory = (categoryData) => {
    console.log('选择分类:', categoryData);
    
    if (categoryData === null || categoryData === 'all') {
        currentCategory.value = null;
    } else if (typeof categoryData === 'object' && categoryData.id) {
        currentCategory.value = categoryData;
    } else {
        const category = categories.value.find(c => c.id === categoryData);
        currentCategory.value = category || null;
    }
    
    // 同步到NavigationApp
    const categoryName = currentCategory.value ? currentCategory.value.name : '全部';
    if (window.navigationApp && typeof window.navigationApp.handleCategoryChangeFromEvent === 'function') {
        window.navigationApp.handleCategoryChangeFromEvent(categoryName);
    }
};

// 模态框管理
export const showAddCategoryModal = () => {
    console.log('显示添加分类模态框');
    Object.assign(categoryForm, { name: '', icon: '📁', parentId: '' });
    editingCategory.value = null;
    modals.addCategory = true;
    
    nextTick(() => {
        uiManager.showModal('add-category-modal');
    });
};

export const showEditCategoryModal = (category) => {
    console.log('显示编辑分类模态框:', category);
    Object.assign(categoryForm, { 
        name: category.name || '',
        icon: category.icon || '📁',
        parentId: category.parentId || ''
    });
    editingCategory.value = category;
    modals.editCategory = true;
    
    nextTick(() => {
        uiManager.showModal('edit-category-modal');
    });
};

export const closeCategoryModal = () => {
    console.log('关闭分类模态框');
    modals.addCategory = false;
    modals.editCategory = false;
    Object.assign(categoryForm, { name: '', icon: '📁', parentId: '' });
    editingCategory.value = null;
    
    uiManager.closeModal('add-category-modal');
    uiManager.closeModal('edit-category-modal');
};

// 分类保存
export const saveCategory = async () => {
    try {
        console.log('保存分类:', categoryForm);
        
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
            await categoryManager.updateCategory(editingCategory.value.id, categoryData);
            uiManager.showNotification('分类更新成功', 'success');
        } else {
            await categoryManager.addCategory(categoryData);
            uiManager.showNotification('分类添加成功', 'success');
        }
        
        closeCategoryModal();
        
    } catch (error) {
        console.error('保存分类失败:', error);
        uiManager.showNotification('保存分类失败: ' + error.message, 'error');
    } finally {
        isLoading.value = false;
    }
};

// 分类删除
export const deleteCategory = async (categoryId) => {
    const category = categories.value.find(cat => cat.id === categoryId);
    const categoryName = category ? category.name : '该分类';
    
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
        
        if (currentCategory.value && currentCategory.value.id === categoryId) {
            currentCategory.value = null;
        }
        
        uiManager.showNotification('分类删除成功', 'success');
        setTimeout(() => {
            window.location.reload();            
        }, 1500);
    } catch (error) {
        console.error('删除分类失败:', error);
        uiManager.showNotification('删除分类失败: ' + error.message, 'error');
    } finally {
        isLoading.value = false;
    }
};