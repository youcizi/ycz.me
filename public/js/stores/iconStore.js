/**
 * 图标数据管理
 * 管理分类和网站图标数据
 */

const { computed, ref } = Vue;
import { iconSelector } from './appStore.js';

// 图标数据
export const categoryIcons = ref([
    '📁', '🔧', '💻', '📚', '🎮', '🎵', '🎬', '📱',
    '🌐', '📊', '💼', '🎨', '🔬', '🏠', '🚗', '✈️',
    '🍔', '☕', '🛒', '💰', '📰', '📺', '🎯', '⚽'
]);

export const websiteIcons = ref([
    '🌐', '🔍', '📧', '💬', '📱', '💻', '🎵', '🎬',
    '📚', '📰', '🛒', '💰', '🎮', '🎨', '📊', '🔧',
    '☁️', '🔒', '📝', '📷', '🗺️', '⭐', '❤️', '🔥'
]);

export const iconCategories = ref([
    { name: 'website', label: '网站图标' },
    { name: 'category', label: '分类图标' }
]);

// 计算属性
export const currentIcons = computed(() => {
    if (iconSelector.selectedCategory === 'website') {
        return websiteIcons.value;
    } else {
        return categoryIcons.value;
    }
});