/**
 * 付费类型工具函数
 * 处理付费类型的标签、颜色等显示逻辑
 */

// 获取付费类型标签
export const getPaymentTypeLabel = (type) => {
    const labels = {
        'free': '免费',
        'paid': '付费',
        'freemium': '免费增值',
        'trial': '试用',
        'subscription': '订阅'
    };
    return labels[type] || type || '未知';
};

// 获取付费类型颜色类
export const getPaymentTypeColor = (type) => {
    const colors = {
        'free': 'success',
        'paid': 'danger',
        'freemium': 'warning',
        'trial': 'info',
        'subscription': 'primary'
    };
    return colors[type] || 'secondary';
};

// 获取付费类型的完整CSS类
export const getPaymentTypeClass = (type) => {
    return `badge bg-${getPaymentTypeColor(type)}`;
};

// 验证付费类型是否有效
export const isValidPaymentType = (type) => {
    const validTypes = ['free', 'paid', 'freemium', 'trial', 'subscription'];
    return validTypes.includes(type);
};

// 获取所有可用的付费类型选项
export const getPaymentTypeOptions = () => {
    return [
        { value: 'free', label: '免费', color: 'success' },
        { value: 'paid', label: '付费', color: 'danger' },
        { value: 'freemium', label: '免费增值', color: 'warning' },
        { value: 'trial', label: '试用', color: 'info' },
        { value: 'subscription', label: '订阅', color: 'primary' }
    ];
};