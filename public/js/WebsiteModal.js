// WebsiteModal.js - 网站添加/编辑弹窗相关功能

// 显示添加网站弹窗
function showAddWebsiteModal() {
  const modal = document.getElementById('addWebsiteModal');
  const form = document.getElementById('addWebsiteForm');
  
  if (modal && form) {
    // 重置表单
    form.reset();
    
    // 清除编辑模式标记
    form.dataset.editMode = 'false';
    form.dataset.originalName = '';
    
    // 更新弹窗标题
    const modalTitle = modal.querySelector('.modal-title');
    if (modalTitle) {
      modalTitle.textContent = '添加网站';
    }
    
    // 更新提交按钮文本
    const submitBtn = modal.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.textContent = '添加网站';
    }
    
    // 更新分类选择器
    updateCategorySelector();
    
    // 显示弹窗
    modal.style.display = 'flex';
    
    // 聚焦到网站名称输入框
    setTimeout(() => {
      const nameInput = document.getElementById('websiteName');
      if (nameInput) {
        nameInput.focus();
      }
    }, 100);
  }
}

// 隐藏添加网站弹窗
function hideAddWebsiteModal() {
  const modal = document.getElementById('addWebsiteModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// 动态更新分类选择器
// 防重复调用标志
let isUpdatingCategorySelector = false;

async function updateCategorySelector() {
  // 防止重复调用
  if (isUpdatingCategorySelector) {
    return;
  }
  
  isUpdatingCategorySelector = true;
  
  try {
    const categorySelect = document.getElementById('websiteCategory');
    if (!categorySelect) {
      isUpdatingCategorySelector = false;
      return;
    }
    
    // 完全清空现有选项，包括HTML中的默认选项
    categorySelect.innerHTML = '';
    
    // 添加默认选项
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '请选择分类';
    categorySelect.appendChild(defaultOption);
    
    // 从本地存储获取分类数据
    let categories = [];
    
    // 检查是否有存储集成系统
    if (window.storageIntegration && window.storageIntegration.getStorageAdapter) {
      try {
        const adapter = window.storageIntegration.getStorageAdapter();
        categories = await adapter.getCategories();
      } catch (error) {
        console.warn('从IndexedDB获取分类失败，尝试从localStorage获取:', error);
        // 降级到localStorage
        const storedCategories = localStorage.getItem('categories');
        if (storedCategories) {
          categories = JSON.parse(storedCategories);
        }
      }
    } else {
      // 降级到localStorage
      const storedCategories = localStorage.getItem('categories');
      if (storedCategories) {
        categories = JSON.parse(storedCategories);
      }
    }
    
    // 如果本地没有分类数据，使用默认分类
    if (!categories || categories.length === 0) {
      categories = [
        { name: '工具', icon: '🔧' },
        { name: '学习', icon: '📚' },
        { name: '娱乐', icon: '🎮' },
        { name: '社交', icon: '💬' },
        { name: '购物', icon: '🛒' },
        { name: '新闻', icon: '📰' }
      ];
    }
    
    // 添加分类选项（排除"全部"分类）
    categories.forEach(category => {
      if (category.name && category.name !== '全部') {
        const option = document.createElement('option');
        option.value = category.name;
        option.textContent = category.name;
        categorySelect.appendChild(option);
      }
    });
    
  } catch (error) {
    console.error('更新分类选择器失败:', error);
  } finally {
    // 重置防重复调用标志
    isUpdatingCategorySelector = false;
  }
}

// 获取网站详细信息用于编辑
async function fetchWebsiteDetails(websiteName) {
  try {
    const response = await fetch(`/api/website/${encodeURIComponent(websiteName)}`);
    const result = await response.json();
    
    if (result.success && result.data) {
      const website = result.data;
      // 预填充表单数据
      document.getElementById('websiteName').value = website.name || '';
      document.getElementById('websiteDescription').value = website.description || '';
      document.getElementById('websiteUrl').value = website.url || '';
      document.getElementById('websiteIcon').value = website.icon || '';
      document.getElementById('websiteCategory').value = website.category || '';
      document.getElementById('websitePriceType').value = website.priceType || 'free';
      
      // 聚焦到网站名称输入框
      setTimeout(() => document.getElementById('websiteName').focus(), 100);
    } else {
      utils.showToast('获取网站信息失败', 'error');
    }
  } catch (error) {
    console.error('获取网站详细信息错误:', error);
    utils.showToast('获取网站信息失败，请稍后重试', 'error');
  }
}

// 初始化网站弹窗事件监听器
function initWebsiteModalEvents() {
  // 处理添加网站表单提交
  const addWebsiteForm = document.getElementById('addWebsiteForm');
  if (addWebsiteForm) {
    addWebsiteForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(addWebsiteForm);
      const websiteData = {
        name: formData.get('websiteName'),
        description: formData.get('websiteDescription'),
        url: formData.get('websiteUrl'),
        icon: formData.get('websiteIcon'),
        category: formData.get('websiteCategory'),
        priceType: formData.get('websitePriceType')
      };
      
      if (websiteData.name && websiteData.url && websiteData.category) {
        try {
          const isEditMode = addWebsiteForm.dataset.editMode === 'true';
          const originalName = addWebsiteForm.dataset.originalName;
          
          let response;
          if (isEditMode) {
            // 编辑模式：使用PUT请求
            response = await fetch(`/api/websites/${encodeURIComponent(originalName)}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(websiteData)
            });
          } else {
            // 添加模式：使用POST请求
            response = await fetch('/api/websites', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(websiteData)
            });
          }
          
          const result = await response.json();
          
          if (result.success) {
            const action = isEditMode ? '更新' : '添加';
            utils.showToast(`网站 "${websiteData.name}" ${action}成功！`, 'success');
            
            // 更新缓存
            const app = window.navigationApp;
            if (app) {
              if (isEditMode) {
                app.updateCachedWebsite(websiteData, originalName);
              } else {
                app.updateCachedWebsite(websiteData);
              }
            }
            
            // 关闭弹窗
            hideAddWebsiteModal();
            // 刷新页面以显示更新的网站
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          } else {
            const action = isEditMode ? '更新' : '添加';
            utils.showToast(result.message || `${action}网站失败`, 'error');
          }
        } catch (error) {
          const action = isEditMode ? '更新' : '添加';
          console.error(`${action}网站错误:`, error);
          utils.showToast(`${action}网站失败，请稍后重试`, 'error');
        }
      } else {
        utils.showToast('请填写所有必填字段', 'warning');
      }
    });
  }
}

// 导出函数供全局使用
if (typeof window !== 'undefined') {
  window.showAddWebsiteModal = showAddWebsiteModal;
  window.hideAddWebsiteModal = hideAddWebsiteModal;
  window.updateCategorySelector = updateCategorySelector;
  window.fetchWebsiteDetails = fetchWebsiteDetails;
  window.initWebsiteModalEvents = initWebsiteModalEvents;
}