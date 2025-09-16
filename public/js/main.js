// 全局变量声明
let isUpdatingCategorySelector = false;
let currentEditingWebsiteId = null;
let currentEditingCategoryId = null;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化应用
    if (typeof NavigationApp !== 'undefined') {
        window.navigationApp = new NavigationApp();
        
        // 绑定全局函数供HTML onclick使用
        window.handleEditWebsite = function(websiteName) {
            if (window.navigationApp) {
                window.navigationApp.handleEditWebsite(websiteName);
            }
        };
        
        window.handleDeleteWebsite = function(websiteName) {
            if (window.navigationApp) {
                window.navigationApp.handleDeleteWebsite(websiteName);
            }
        };
    }
});