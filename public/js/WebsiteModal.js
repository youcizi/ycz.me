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

// 显示编辑网站弹窗
async function showEditWebsiteModal(websiteData) {
  const modal = document.getElementById('addWebsiteModal');
  const form = document.getElementById('addWebsiteForm');
  
  if (modal && form) {
    let website;
    
    // 如果传入的是字符串（网站名称），从本地IndexedDB获取完整数据
    if (typeof websiteData === 'string') {
      const app = window.navigationApp;
      if (app && app.navigationDB) {
        try {
          const websites = await app.navigationDB.getWebsites();
          website = websites.find(w => w.name === websiteData);
          if (!website) {
            console.error('未找到网站:', websiteData);
            utils.showToast('未找到要编辑的网站', 'error');
            return;
          }
        } catch (error) {
          console.error('从IndexedDB获取网站数据失败:', error);
          utils.showToast('获取网站信息失败', 'error');
          return;
        }
      } else {
        console.error('NavigationDB实例不可用');
        utils.showToast('数据库未初始化', 'error');
        return;
      }
    } else {
      // 如果传入的是对象，直接使用
      website = websiteData;
    }
    
    console.log('编辑网站数据:', website);
    
    // 设置编辑模式标记
    form.dataset.editMode = 'true';
    form.dataset.originalName = website.name;
    
    // 更新弹窗标题
    const modalTitle = modal.querySelector('.modal-title');
    if (modalTitle) {
      modalTitle.textContent = '编辑网站';
    }
    
    // 更新提交按钮文本
    const submitBtn = modal.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.textContent = '保存修改';
    }
    
    // 更新分类选择器
    await updateCategorySelector();
    
    // 直接填充表单数据
    document.getElementById('websiteName').value = website.name || '';
    document.getElementById('websiteDescription').value = website.description || '';
    document.getElementById('websiteUrl').value = website.url || '';
    document.getElementById('websiteIcon').value = website.icon || '';
    
    // 设置分类选择器的值 - 直接使用categoryId
    let categoryValue = '';
    if (website.categoryId && website.categoryId !== 'all') {
      categoryValue = website.categoryId;
    } else if (website.category && website.category !== '未分类') {
      // 如果没有categoryId但有category，尝试通过名称匹配
      const app = window.navigationApp;
      if (app && app.navigationDB) {
        try {
          const categories = await app.navigationDB.getCategories();
          const category = categories.find(cat => cat.name === website.category);
          if (category && category.id) {
            categoryValue = category.id;
          } else {
            categoryValue = website.category;
          }
        } catch (error) {
          console.error('获取分类信息失败:', error);
          categoryValue = website.category;
        }
      } else {
        categoryValue = website.category;
      }
    }
    
    document.getElementById('websiteCategory').value = categoryValue;
    document.getElementById('websitePaymentType').value = website.paymentType || website.priceType || '';
    
    console.log('编辑表单数据填充:', {
      name: website.name,
      categoryId: website.categoryId,
      category: website.category,
      selectedCategory: categoryValue
    });
    
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

// 动态更新分类选择器
// 防重复调用标志
let isUpdatingWebsiteCategorySelector = false;

async function updateCategorySelector() {
  // 防止重复调用
  if (isUpdatingWebsiteCategorySelector) {
    return;
  }
  
  isUpdatingWebsiteCategorySelector = true;
  
  try {
    const categorySelect = document.getElementById('websiteCategory');
    if (!categorySelect) {
      isUpdatingWebsiteCategorySelector = false;
      return;
    }
    
    // 完全清空现有选项，包括HTML中的默认选项
    categorySelect.innerHTML = '';
    
    // 添加默认选项
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '请选择分类';
    categorySelect.appendChild(defaultOption);
    
    // 从IndexedDB获取分类数据
    let categories = [];
    
    // 检查是否有NavigationDB实例
    const app = window.navigationApp;
    if (app && app.navigationDB) {
      try {
        categories = await app.navigationDB.getCategories();
        console.log('分类选择器 - 从IndexedDB获取的分类:', categories);
      } catch (error) {
        console.error('分类选择器 - 从IndexedDB获取分类失败:', error);
      }
    } else {
      console.warn('分类选择器 - NavigationDB实例不可用');
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
      console.log('分类选择器 - 使用默认分类:', categories);
    }
    
    // 添加分类选项（排除"全部"分类）
    let addedCount = 0;
    categories.forEach(category => {
      if (category.name && category.name !== '全部') {
        const option = document.createElement('option');
        // 使用分类ID作为value，如果没有ID则使用name（兼容默认分类）
        option.value = category.id || category.name;
        option.textContent = category.name;
        // 添加data属性存储分类信息
        option.dataset.categoryId = category.id || '';
        option.dataset.categoryName = category.name;
        categorySelect.appendChild(option);
        addedCount++;
      }
    });
    
    console.log('分类选择器 - 添加了', addedCount, '个分类选项');
    console.log('分类选择器 - 当前选择器选项数量:', categorySelect.options.length);
    
  } catch (error) {
    // 更新分类选择器失败
  } finally {
    // 重置防重复调用标志
    isUpdatingWebsiteCategorySelector = false;
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
      document.getElementById('websitePaymentType').value = website.paymentType || website.priceType || '';
      
      // 聚焦到网站名称输入框
      setTimeout(() => document.getElementById('websiteName').focus(), 100);
    } else {
      utils.showToast('获取网站信息失败', 'error');
    }
  } catch (error) {
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
      const categoryValue = formData.get('websiteCategory');
      
      console.log('表单提交 - 收集到的分类值:', categoryValue);
      
      // 获取分类ID和名称
      let categoryId = 'all';
      let categoryName = '未分类';
      
      if (categoryValue) {
        // 获取选中的option元素来获取分类信息
        const categorySelect = document.getElementById('websiteCategory');
        const selectedOption = categorySelect.querySelector(`option[value="${categoryValue}"]`);
        
        if (selectedOption) {
          categoryId = selectedOption.dataset.categoryId || categoryValue;
          categoryName = selectedOption.dataset.categoryName || selectedOption.textContent;
          console.log('表单提交 - 分类信息:', { categoryId, categoryName, categoryValue });
        } else {
          // 如果没有找到对应的option，可能是默认分类
          categoryId = categoryValue;
          categoryName = categoryValue;
          console.log('表单提交 - 使用默认分类信息:', { categoryId, categoryName });
        }
      }
      
      const websiteData = {
        name: formData.get('websiteName'),
        description: formData.get('websiteDescription'),
        url: formData.get('websiteUrl'),
        icon: formData.get('websiteIcon'),
        category: categoryName, // 保留category字段用于服务器端
        categoryId: categoryId, // 添加categoryId字段用于IndexedDB
        paymentType: formData.get('websitePaymentType')
      };
      
      console.log('表单提交 - 最终网站数据:', websiteData);
      
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
            
            // 更新IndexedDB
            const app = window.navigationApp;
            if (app) {
              if (isEditMode) {
                await app.updateWebsiteInLocal(websiteData, originalName);
              } else {
                await app.addWebsiteToLocal(websiteData);
              }
              // 重新加载网站数据以更新显示
              await app.loadWebsites();
            }
            
            // 关闭弹窗
            hideAddWebsiteModal();
          } else {
            const action = isEditMode ? '更新' : '添加';
            utils.showToast(result.message || `${action}网站失败`, 'error');
          }
        } catch (error) {
          const action = isEditMode ? '更新' : '添加';
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
  window.showEditWebsiteModal = showEditWebsiteModal;
  window.updateCategorySelector = updateCategorySelector;
  window.fetchWebsiteDetails = fetchWebsiteDetails;
  window.initWebsiteModalEvents = initWebsiteModalEvents;
}