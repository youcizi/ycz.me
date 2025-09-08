/**
 * 分类管理器
 * 负责处理分类的增删改查和UI交互
 */
class CategoryManager {
    constructor(navigationDB, storageIntegration) {
        this.navigationDB = navigationDB;
        this.storage = storageIntegration;
        this.categories = [];
        this.currentEditingCategory = null;
        this.draggedCategory = null;
        this.init();
    }

    /**
     * 初始化分类管理器
     */
    init() {
        this.bindEvents();
        this.loadCategories();
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 添加分类按钮事件
        const addCategoryBtn = document.querySelector('.add-category-btn');
        if (addCategoryBtn) {
            addCategoryBtn.addEventListener('click', () => this.showAddCategoryModal());
        }

        // 分类右键菜单事件
        document.addEventListener('contextmenu', (e) => {
            const categoryItem = e.target.closest('.nav-item:not(.add-category-btn)');
            if (categoryItem) {
                e.preventDefault();
                this.showContextMenu(e, categoryItem);
            }
        });

        // 点击其他地方隐藏右键菜单
        document.addEventListener('click', () => {
            this.hideContextMenu();
        });

        // 拖拽事件
        this.bindDragEvents();
    }

    /**
     * 绑定拖拽事件
     */
    bindDragEvents() {
        const sidebarNav = document.querySelector('.sidebar-nav');
        if (!sidebarNav) return;

        // 使用事件委托处理动态生成的分类项
        sidebarNav.addEventListener('dragstart', (e) => {
            const categoryItem = e.target.closest('.nav-item:not(.add-category-btn)');
            if (categoryItem) {
                this.draggedCategory = categoryItem;
                categoryItem.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', categoryItem.outerHTML);
            }
        });

        sidebarNav.addEventListener('dragend', (e) => {
            const categoryItem = e.target.closest('.nav-item:not(.add-category-btn)');
            if (categoryItem) {
                categoryItem.classList.remove('dragging');
                this.draggedCategory = null;
            }
        });

        sidebarNav.addEventListener('dragover', (e) => {
            e.preventDefault();
            const categoryItem = e.target.closest('.nav-item:not(.add-category-btn)');
            if (categoryItem && categoryItem !== this.draggedCategory) {
                const rect = categoryItem.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                
                // 移除所有拖拽指示器
                document.querySelectorAll('.nav-item').forEach(item => {
                    item.classList.remove('drag-over-top', 'drag-over-bottom');
                });
                
                // 添加拖拽指示器
                if (e.clientY < midY) {
                    categoryItem.classList.add('drag-over-top');
                } else {
                    categoryItem.classList.add('drag-over-bottom');
                }
            }
        });

        sidebarNav.addEventListener('drop', (e) => {
            e.preventDefault();
            const targetItem = e.target.closest('.nav-item:not(.add-category-btn)');
            if (targetItem && this.draggedCategory && targetItem !== this.draggedCategory) {
                this.handleCategoryReorder(this.draggedCategory, targetItem, e.clientY);
            }
            
            // 清理拖拽状态
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('drag-over-top', 'drag-over-bottom', 'dragging');
            });
        });
    }

    /**
     * 加载分类列表
     */
    async loadCategories() {
        try {
            // 从NavigationDB中加载分类
            if (this.navigationDB) {
                this.categories = await this.navigationDB.getCategories();
            } else {
                // 回退到localStorage
                const cachedCategories = localStorage.getItem('nav_categories');
                this.categories = cachedCategories ? JSON.parse(cachedCategories) : [];
            }
            this.renderCategories(this.categories);
        } catch (error) {
            console.error('加载分类失败:', error);
            CustomModal.showError('加载分类失败');
        }
    }

    /**
     * 渲染分类列表
     */
    renderCategories(categories) {
        const sidebarNav = document.querySelector('.sidebar-nav');
        if (!sidebarNav) return;

        // 保留添加分类按钮
        const addCategoryBtn = sidebarNav.querySelector('.add-category-btn');
        
        // 清空现有分类
        sidebarNav.innerHTML = '';
        
        // 渲染分类项
        categories.forEach(category => {
            const categoryElement = this.createCategoryElement(category);
            sidebarNav.appendChild(categoryElement);
        });
        
        // 重新添加添加分类按钮
        if (addCategoryBtn) {
            sidebarNav.appendChild(addCategoryBtn);
        }
    }

    /**
     * 创建分类元素
     */
    createCategoryElement(category) {
        const categoryElement = document.createElement('button');
        categoryElement.className = `nav-item ${category.active ? 'active' : ''}`;
        categoryElement.setAttribute('data-category', category.name);
        categoryElement.setAttribute('data-category-id', category.id);
        categoryElement.setAttribute('draggable', 'true');
        categoryElement.type = 'button';
        
        categoryElement.innerHTML = `
            <span class="nav-icon">${category.icon}</span>
            <span class="nav-text">${this.escapeHtml(category.name)}</span>
            <div class="nav-actions">
                <span class="action-icon edit-category" title="编辑分类">✏️</span>
                <span class="action-icon delete-category" title="删除分类">🗑️</span>
            </div>
        `;
        
        // 绑定点击事件
        categoryElement.addEventListener('click', (e) => {
            if (!e.target.closest('.nav-actions')) {
                this.handleCategoryClick(category);
            }
        });
        
        // 绑定编辑和删除事件
        const editBtn = categoryElement.querySelector('.edit-category');
        const deleteBtn = categoryElement.querySelector('.delete-category');
        
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showEditCategoryModal(category);
            });
        }
        
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleDeleteCategory(category);
            });
        }
        
        return categoryElement;
    }

    /**
     * 显示添加分类弹窗
     */
    showAddCategoryModal() {
        this.currentEditingCategory = null;
        this.showCategoryModal('添加分类', '', '📁');
    }

    /**
     * 显示编辑分类弹窗
     */
    showEditCategoryModal(category) {
        this.currentEditingCategory = category;
        this.showCategoryModal('编辑分类', category.name, category.icon);
    }

    /**
     * 显示分类弹窗
     */
    showCategoryModal(title, name = '', icon = '📁') {
        // 创建弹窗HTML
        const modalHTML = `
            <div class="custom-modal category-modal" id="categoryModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">${title}</h3>
                        <button class="modal-close" type="button">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="categoryForm">
                            <div class="form-group">
                                <label for="categoryName">分类名称：</label>
                                <input type="text" id="categoryName" name="categoryName" 
                                       value="${this.escapeHtml(name)}" required 
                                       placeholder="请输入分类名称" maxlength="20">
                            </div>
                            <div class="form-group">
                                <label for="categoryIcon">分类图标：</label>
                                <div class="icon-input-container">
                                    <input type="text" id="categoryIcon" name="categoryIcon" 
                                       class="icon-input" value="${icon}" required 
                                       placeholder="例如：📚">
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="modal-btn secondary" 
                                onclick="categoryManager.hideCategoryModal()">取消</button>
                        <button type="button" class="modal-btn primary" 
                                onclick="categoryManager.handleCategorySubmit()">
                            ${this.currentEditingCategory ? '更新' : '添加'}
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // 移除已存在的弹窗
        const existingModal = document.getElementById('categoryModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // 添加新弹窗
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        const modal = document.getElementById('categoryModal');
        const closeBtn = modal.querySelector('.modal-close');
        
        // 绑定关闭事件
        closeBtn.addEventListener('click', () => this.hideCategoryModal());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideCategoryModal();
            }
        });
        
        // 重新绑定图标选择器事件到新创建的弹窗中的输入框
        if (window.emojiIconPicker) {
            window.emojiIconPicker.bindInputEvents(modal);
        }
        
        // 显示弹窗
        setTimeout(() => {
            modal.classList.add('show');
            document.getElementById('categoryName').focus();
        }, 10);
        
        document.body.style.overflow = 'hidden';
    }

    /**
     * 隐藏分类弹窗
     */
    hideCategoryModal() {
        const modal = document.getElementById('categoryModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
                document.body.style.overflow = '';
            }, 300);
        }
    }

    /**
     * 处理分类表单提交
     */
    async handleCategorySubmit() {
        const form = document.getElementById('categoryForm');
        const formData = new FormData(form);
        const categoryName = formData.get('categoryName').trim();
        const categoryIcon = formData.get('categoryIcon').trim();
        
        // 验证输入
        if (!categoryName) {
            CustomModal.showError('请输入分类名称');
            return;
        }
        
        if (!categoryIcon) {
            CustomModal.showError('请选择分类图标');
            return;
        }
        
        try {
            // 检查分类名称是否重复
            const adapter = this.storage.getStorageAdapter();
            const existingCategories = await adapter.getCategories();
            const isDuplicate = existingCategories.some(cat => 
                cat.name === categoryName && 
                (!this.currentEditingCategory || cat.id !== this.currentEditingCategory.id)
            );
            
            if (isDuplicate) {
                CustomModal.showError('分类名称已存在');
                return;
            }
            
            const categoryData = {
                name: categoryName,
                icon: categoryIcon
            };
            
            let result;
            if (this.navigationDB) {
                if (this.currentEditingCategory) {
                    // 更新现有分类
                    result = await this.navigationDB.updateCategory(this.currentEditingCategory.id, categoryData);
                    CustomModal.showSuccess('分类更新成功');
                } else {
                    // 添加新分类
                    result = await this.navigationDB.addCategory(categoryData);
                    CustomModal.showSuccess('分类添加成功');
                }
            } else {
                // 回退到localStorage
                if (this.currentEditingCategory) {
                    const index = this.categories.findIndex(cat => cat.id === this.currentEditingCategory.id);
                    if (index !== -1) {
                        this.categories[index] = { ...this.categories[index], ...categoryData };
                    }
                    CustomModal.showSuccess('分类更新成功');
                } else {
                    categoryData.id = Date.now().toString();
                    this.categories.push(categoryData);
                    CustomModal.showSuccess('分类添加成功');
                }
                localStorage.setItem('nav_categories', JSON.stringify(this.categories));
                result = categoryData;
            }
            
            this.hideCategoryModal();
            await this.loadCategories();
            
            // 同步更新添加网站弹窗的分类选择器
            if (typeof updateCategorySelector === 'function') {
                await updateCategorySelector();
            }
            
        } catch (error) {
            console.error('保存分类失败:', error);
            CustomModal.showError('保存分类失败');
        }
    }

    /**
     * 处理删除分类
     */
    async handleDeleteCategory(category) {
        try {
            let websites = [];
            let categoryWebsites = [];
            
            // 检查分类下是否有网站
            if (this.navigationDB) {
                websites = await this.navigationDB.getWebsites();
                categoryWebsites = websites.filter(site => site.category === category.name);
            } else {
                // 从localStorage检查
                const cachedWebsites = localStorage.getItem('nav_websites');
                if (cachedWebsites) {
                    websites = JSON.parse(cachedWebsites);
                    categoryWebsites = websites.filter(site => site.category === category.name);
                }
            }
            
            if (categoryWebsites.length > 0) {
                const confirmed = await CustomModal.showConfirm(
                    `分类"${category.name}"下还有${categoryWebsites.length}个网站，删除分类后这些网站将移动到"未分类"。确定要删除吗？`,
                    '确认删除分类'
                );
                
                if (!confirmed) return;
                
                // 将网站移动到未分类
                if (this.navigationDB) {
                    for (const website of categoryWebsites) {
                        await this.navigationDB.updateWebsite(website.id, {
                            ...website,
                            category: '未分类'
                        });
                    }
                } else {
                    // 更新localStorage中的网站
                    websites.forEach(site => {
                        if (site.category === category.name) {
                            site.category = '未分类';
                        }
                    });
                    localStorage.setItem('nav_websites', JSON.stringify(websites));
                }
            } else {
                const confirmed = await CustomModal.showConfirm(
                    `确定要删除分类"${category.name}"吗？`,
                    '确认删除分类'
                );
                
                if (!confirmed) return;
            }
            
            // 删除分类
            if (this.navigationDB) {
                await this.navigationDB.deleteCategory(category.id);
            } else {
                this.categories = this.categories.filter(cat => cat.id !== category.id);
                localStorage.setItem('nav_categories', JSON.stringify(this.categories));
            }
            
            CustomModal.showSuccess('分类删除成功');
            await this.loadCategories();
            
            // 同步更新添加网站弹窗的分类选择器
            if (typeof updateCategorySelector === 'function') {
                await updateCategorySelector();
            }
            
        } catch (error) {
            console.error('删除分类失败:', error);
            CustomModal.showError('删除分类失败');
        }
    }

    /**
     * 处理分类点击
     */
    handleCategoryClick(category) {
        // 更新活跃状态
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const categoryElement = document.querySelector(`[data-category-id="${category.id}"]`);
        if (categoryElement) {
            categoryElement.classList.add('active');
        }
        
        // 触发分类切换事件
        if (window.navigationApp) {
            window.navigationApp.currentCategory = category.name;
            window.navigationApp.loadWebsites(category.name);
        }
    }

    /**
     * 处理分类重新排序
     */
    async handleCategoryReorder(draggedElement, targetElement, clientY) {
        try {
            const draggedId = draggedElement.getAttribute('data-category-id');
            const targetId = targetElement.getAttribute('data-category-id');
            
            if (!draggedId || !targetId) return;
            
            const adapter = this.storage.getStorageAdapter();
            const categories = await adapter.getCategories();
            const draggedCategory = categories.find(c => c.id === draggedId);
            const targetCategory = categories.find(c => c.id === targetId);
            
            if (!draggedCategory || !targetCategory) return;
            
            // 计算新的排序
            const rect = targetElement.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            const insertBefore = clientY < midY;
            
            let newOrder;
            if (insertBefore) {
                newOrder = targetCategory.order - 0.5;
            } else {
                newOrder = targetCategory.order + 0.5;
            }
            
            // 更新拖拽分类的排序
            const updatedCategory = { ...draggedCategory, order: newOrder };
            await adapter.updateCategory(updatedCategory);
            
            // 重新整理所有分类的排序
            await this.reorderCategories();
            
            // 重新加载分类
            await this.loadCategories();
            
        } catch (error) {
            console.error('分类排序失败:', error);
            CustomModal.showError('分类排序失败');
        }
    }

    /**
     * 重新整理分类排序
     */
    async reorderCategories() {
        try {
            const adapter = this.storage.getStorageAdapter();
            const categories = await adapter.getCategories();
            categories.sort((a, b) => a.order - b.order);
            
            // 重新分配连续的排序号
            for (let i = 0; i < categories.length; i++) {
                const updatedCategory = { ...categories[i], order: i + 1 };
                await adapter.updateCategory(updatedCategory);
            }
        } catch (error) {
            console.error('重新整理分类排序失败:', error);
        }
    }

    /**
     * 显示右键菜单
     */
    showContextMenu(event, categoryElement) {
        const categoryId = categoryElement.getAttribute('data-category-id');
        if (!categoryId) return;
        
        // 移除已存在的右键菜单
        this.hideContextMenu();
        
        const contextMenu = document.createElement('div');
        contextMenu.className = 'category-context-menu';
        contextMenu.innerHTML = `
            <div class="context-menu-item" data-action="edit">
                <span class="context-menu-icon">✏️</span>
                <span class="context-menu-text">编辑分类</span>
            </div>
            <div class="context-menu-item" data-action="delete">
                <span class="context-menu-icon">🗑️</span>
                <span class="context-menu-text">删除分类</span>
            </div>
        `;
        
        // 设置菜单位置
        contextMenu.style.position = 'fixed';
        contextMenu.style.left = event.clientX + 'px';
        contextMenu.style.top = event.clientY + 'px';
        contextMenu.style.zIndex = '10000';
        
        document.body.appendChild(contextMenu);
        
        // 绑定菜单项事件
        contextMenu.addEventListener('click', async (e) => {
            const action = e.target.closest('.context-menu-item')?.getAttribute('data-action');
            if (!action) return;
            
            const adapter = this.storage.getStorageAdapter();
            const categories = await adapter.getCategories();
            const category = categories.find(c => c.id === categoryId);
            if (!category) return;
            
            if (action === 'edit') {
                this.showEditCategoryModal(category);
            } else if (action === 'delete') {
                this.handleDeleteCategory(category);
            }
            
            this.hideContextMenu();
        });
        
        // 调整菜单位置，避免超出屏幕
        setTimeout(() => {
            const rect = contextMenu.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                contextMenu.style.left = (event.clientX - rect.width) + 'px';
            }
            if (rect.bottom > window.innerHeight) {
                contextMenu.style.top = (event.clientY - rect.height) + 'px';
            }
        }, 0);
    }

    /**
     * 隐藏右键菜单
     */
    hideContextMenu() {
        const existingMenu = document.querySelector('.category-context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
    }



    /**
     * HTML转义
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CategoryManager;
}