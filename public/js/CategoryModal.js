// CategoryModal.js - 分类弹窗相关功能

// 显示添加分类弹窗
function showAddCategoryModal() {
  const modal = document.getElementById('addCategoryModal');
  if (modal) {
    modal.style.display = 'flex';
    // 清空表单
    const form = document.getElementById('addCategoryForm');
    if (form) {
      form.reset();
    }
    // 聚焦到分类名称输入框
    const nameInput = document.getElementById('categoryName');
    if (nameInput) {
      setTimeout(() => nameInput.focus(), 100);
    }
  }
}

// 隐藏添加分类弹窗
function hideAddCategoryModal() {
  const modal = document.getElementById('addCategoryModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// 编辑分类
function editCategory(categoryName) {
  if (window.categoryManager) {
    // 查找分类数据
    const category = window.categoryManager.categories.find(cat => cat.name === categoryName);
    if (category) {
      showEditCategoryModal(category);
    } else {
      utils.showToast('未找到该分类', 'error');
    }
  } else {
    utils.showToast('分类管理器未初始化', 'error');
  }
}

// 显示编辑分类弹窗
function showEditCategoryModal(category) {
  const modal = document.getElementById('editCategoryModal');
  if (modal) {
    // 预填充表单数据
    document.getElementById('editCategoryOriginalName').value = category.name;
    document.getElementById('editCategoryName').value = category.name;
    document.getElementById('editCategoryIcon').value = category.icon;
    
    modal.style.display = 'flex';
    
    // 聚焦到分类名称输入框
    setTimeout(() => {
      const nameInput = document.getElementById('editCategoryName');
      if (nameInput) {
        nameInput.focus();
        nameInput.select();
      }
    }, 100);
  }
}

// 隐藏编辑分类弹窗
function hideEditCategoryModal() {
  const modal = document.getElementById('editCategoryModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// 删除分类
async function deleteCategory(categoryName) {
  const confirmed = await CustomModal.showConfirm(
    `确定要删除分类 "${categoryName}" 吗？\n删除后该分类下的所有网站也将被移除。`,
    '确认删除分类',
    {
      confirmText: '删除',
      cancelText: '取消'
    }
  );
  
  if (confirmed) {
    if (window.categoryManager) {
      try {
        // 查找分类对象
        const categories = await window.categoryManager.storage.getCategories();
        const category = categories.find(c => c.name === categoryName);
        
        if (category) {
          // 调用分类管理器的删除方法
          await window.categoryManager.handleDeleteCategory(category);
        } else {
          utils.showToast('未找到该分类', 'error');
        }
      } catch (error) {
        // 删除分类错误
        utils.showToast('删除分类失败，请稍后重试', 'error');
      }
    } else {
      utils.showToast('分类管理器未初始化', 'error');
    }
  }
}

// 初始化分类弹窗事件监听器
function initCategoryModalEvents() {
  // 处理添加分类表单提交
  const addCategoryForm = document.getElementById('addCategoryForm');
  if (addCategoryForm) {
    addCategoryForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const formData = new FormData(addCategoryForm);
      const categoryName = formData.get('categoryName').trim();
      const categoryIcon = formData.get('categoryIcon').trim();
      
      if (!categoryName || !categoryIcon) {
        utils.showToast('请填写完整的分类信息', 'warning');
        return;
      }
      
      // 这里可以添加提交到后端的逻辑
      utils.showToast(`添加分类 "${categoryName}" 功能开发中...`, 'info');
      // 添加分类: name, icon
      
      // 关闭弹窗
      hideAddCategoryModal();
    });
  }
  
  // 处理编辑分类表单提交
  const editCategoryForm = document.getElementById('editCategoryForm');
  if (editCategoryForm) {
    editCategoryForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const formData = new FormData(editCategoryForm);
      const categoryName = formData.get('categoryName').trim();
      const categoryIcon = formData.get('categoryIcon').trim();
      const originalName = formData.get('originalName');
      
      if (!categoryName || !categoryIcon) {
        utils.showToast('请填写完整的分类信息', 'warning');
        return;
      }
      
      // 这里可以添加提交到后端的逻辑
      utils.showToast(`编辑分类 "${categoryName}" 功能开发中...`, 'info');
      // 编辑分类: originalName, name, icon
      
      // 关闭弹窗
      hideEditCategoryModal();
    });
  }
}

// 初始化分类弹窗全局事件监听器
function initCategoryModalGlobalEvents() {
  // 点击弹窗背景关闭弹窗
  document.addEventListener('click', (e) => {
    const categoryModal = document.getElementById('addCategoryModal');
    if (categoryModal && e.target === categoryModal) {
      hideAddCategoryModal();
    }
    
    const editCategoryModal = document.getElementById('editCategoryModal');
    if (editCategoryModal && e.target === editCategoryModal) {
      hideEditCategoryModal();
    }
  });

  // ESC键关闭弹窗
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const categoryModal = document.getElementById('addCategoryModal');
      if (categoryModal && categoryModal.style.display === 'flex') {
        hideAddCategoryModal();
      }
      
      const editCategoryModal = document.getElementById('editCategoryModal');
      if (editCategoryModal && editCategoryModal.style.display === 'flex') {
        hideEditCategoryModal();
      }
    }
  });
}

// 导出函数供全局使用
if (typeof window !== 'undefined') {
  window.showAddCategoryModal = showAddCategoryModal;
  window.hideAddCategoryModal = hideAddCategoryModal;
  window.editCategory = editCategory;
  window.showEditCategoryModal = showEditCategoryModal;
  window.hideEditCategoryModal = hideEditCategoryModal;
  window.deleteCategory = deleteCategory;
  window.initCategoryModalEvents = initCategoryModalEvents;
  window.initCategoryModalGlobalEvents = initCategoryModalGlobalEvents;
}