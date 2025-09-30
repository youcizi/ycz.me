/**
 * 图标选择器组合式函数
 * 处理图标选择相关的业务逻辑
 */

import { categoryForm, websiteForm } from '../stores/appStore.js';

// 图标选择器相关方法
let emojiPicker = null;

export const initEmojiPicker = () => {
    if (!emojiPicker) {
        emojiPicker = new EmojiIconPicker();
    }
};

export const showIconSelector = (type, currentIcon) => {
    console.log('显示图标选择器:', type, '当前图标:', currentIcon);
    initEmojiPicker();
    
    // 查找对应的input元素
    let inputElement = null;
    if (type === 'category') {
        inputElement = document.querySelector('.category-modal .icon-preview-input');
    } else if (type === 'website') {
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

export const closeIconSelector = () => {
    console.log('关闭图标选择器');
    if (emojiPicker) {
        emojiPicker.hide();
    }
};

// 保持向后兼容的方法
export const selectIcon = (icon) => {
    console.log('选择图标:', icon);
    // 这个方法现在由EmojiIconPicker内部处理
};

export const selectIconCategory = (categoryName) => {
    // 这个方法现在由EmojiIconPicker内部处理
};

export const confirmIconSelection = () => {
    // 这个方法现在由EmojiIconPicker内部处理
};