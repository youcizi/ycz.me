/**
 * 网站管理组合式函数
 * 处理网站相关的业务逻辑
 */

import websiteManager from '../modules/WebsiteManager.js';
import { uiManager } from '../modules/UIManager.js';
import { 
    websites, 
    currentCategory, 
    modals, 
    websiteForm, 
    editingWebsite,
    isLoading 
} from '../stores/appStore.js';

// 网站模态框管理
export const showAddWebsiteModal = () => {
    console.log('显示添加网站模态框');
    Object.assign(websiteForm, {
        title: '',
        url: '',
        description: '',
        categoryId: currentCategory.value ? currentCategory.value.id : '',
        icon: '🌐',
        paymentType: ''
    });
    editingWebsite.value = null;
    modals.addWebsite = true;
};

export const showEditWebsiteModal = (website) => {
    console.log('显示编辑网站模态框:', website);
    Object.assign(websiteForm, {
        title: website.name || website.title || '',
        url: website.url || '',
        description: website.description || '',
        categoryId: website.categoryId || '',
        icon: website.icon || '🌐',
        paymentType: website.paymentType || ''
    });
    editingWebsite.value = website;
    modals.addWebsite = true;
};

export const closeWebsiteModal = () => {
    console.log('关闭网站模态框');
    modals.addWebsite = false;
    modals.editWebsite = false;
    
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

// 网站保存
export const saveWebsite = async () => {
    try {
        console.log('保存网站:', websiteForm);
        
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
            name: websiteForm.title.trim(),
            title: websiteForm.title.trim(),
            url: websiteForm.url.trim(),
            description: websiteForm.description.trim(),
            categoryId: websiteForm.categoryId,
            icon: websiteForm.icon,
            paymentType: websiteForm.paymentType || ''
        };
        
        if (editingWebsite.value) {
            await websiteManager.updateWebsite(editingWebsite.value.id, websiteData);
            uiManager.showNotification('网站更新成功', 'success');
        } else {
            await websiteManager.addWebsite(websiteData);
            uiManager.showNotification('网站添加成功', 'success');
        }
        
        closeWebsiteModal();
        
    } catch (error) {
        console.error('保存网站失败:', error);
        uiManager.showNotification('保存网站失败: ' + error.message, 'error');
    } finally {
        isLoading.value = false;
    }
};

// 网站删除
export const deleteWebsite = async (websiteId) => {
    if (!websiteId) {
        console.warn('删除网站: 网站ID为空');
        return;
    }
    
    const websiteExists = websites.value.find(site => site.id === websiteId);
    if (!websiteExists) {
        console.warn(`网站 ${websiteId} 不存在，从UI中移除`);
        websites.value = websites.value.filter(site => site.id !== websiteId);
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
            console.log('网站已被清理，无需进一步操作');
            uiManager.showNotification('网站已删除', 'info');
        } else {
            uiManager.showNotification('网站删除成功', 'success');
        }
        
    } catch (error) {
        console.error('删除网站失败:', error);
        
        if (error.message && error.message.includes('网站不存在')) {
            websites.value = websites.value.filter(site => site.id !== websiteId);
            uiManager.showNotification('网站已不存在，已从列表中移除', 'info');
        } else {
            uiManager.showNotification('删除网站失败: ' + error.message, 'error');
        }
    } finally {
        isLoading.value = false;
    }
};

// 工具方法
export const openWebsite = (url) => {
    if (url) {
        window.open(url, '_blank');
    }
};