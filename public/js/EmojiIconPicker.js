/**
 * EmojiIconPicker - 通用emoji图标选择组件
 * 用于网址分类和网址添加的图标选择
 */
class EmojiIconPicker {
    constructor() {
        this.currentTarget = null;
        this.callback = null;
        this.selectedEmoji = '';
        this.currentCategory = 'smileys';
        this.searchKeyword = '';
        
        // Emoji分类数据
        this.emojiData = {
            smileys: {
                name: '表情',
                emojis: [
                    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
                    '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
                    '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
                    '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
                    '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧',
                    '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐'
                ]
            },
            animals: {
                name: '动物',
                emojis: [
                    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
                    '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒',
                    '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇',
                    '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜',
                    '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕',
                    '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳'
                ]
            },
            food: {
                name: '食物',
                emojis: [
                    '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈',
                    '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦',
                    '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔',
                    '🍠', '🥐', '🥖', '🍞', '🥨', '🥯', '🧀', '🥚', '🍳', '🧈',
                    '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟',
                    '🍕', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕'
                ]
            },
            travel: {
                name: '旅行',
                emojis: [
                    '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐',
                    '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '🛹', '🛼',
                    '🚁', '🛸', '✈️', '🛩️', '🛫', '🛬', '🪂', '💺', '🚀', '🛰️',
                    '🚢', '⛵', '🚤', '🛥️', '🛳️', '⛴️', '🚂', '🚃', '🚄', '🚅',
                    '🚆', '🚇', '🚈', '🚉', '🚊', '🚝', '🚞', '🚋', '🚌', '🚍',
                    '🎡', '🎢', '🎠', '🏗️', '🌁', '🗼', '🏭', '⛲', '🎪', '🚏'
                ]
            },
            activities: {
                name: '活动',
                emojis: [
                    '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱',
                    '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳',
                    '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️',
                    '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️', '🤺',
                    '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚵', '🚴', '🏆',
                    '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️', '🎪'
                ]
            },
            objects: {
                name: '物品',
                emojis: [
                    '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️',
                    '🗜️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥',
                    '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️',
                    '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋',
                    '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴',
                    '💶', '💷', '💰', '💳', '💎', '⚖️', '🧰', '🔧', '🔨', '⚒️'
                ]
            },
            symbols: {
                name: '符号',
                emojis: [
                    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
                    '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️',
                    '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐',
                    '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐',
                    '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳',
                    '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️'
                ]
            },
            flags: {
                name: '旗帜',
                emojis: [
                    '🏁', '🚩', '🎌', '🏴', '🏳️', '🏳️‍🌈', '🏳️‍⚧️', '🏴‍☠️', '🇦🇫', '🇦🇽',
                    '🇦🇱', '🇩🇿', '🇦🇸', '🇦🇩', '🇦🇴', '🇦🇮', '🇦🇶', '🇦🇬', '🇦🇷', '🇦🇲',
                    '🇦🇼', '🇦🇺', '🇦🇹', '🇦🇿', '🇧🇸', '🇧🇭', '🇧🇩', '🇧🇧', '🇧🇾', '🇧🇪',
                    '🇧🇿', '🇧🇯', '🇧🇲', '🇧🇹', '🇧🇴', '🇧🇦', '🇧🇼', '🇧🇷', '🇮🇴', '🇻🇬',
                    '🇧🇳', '🇧🇬', '🇧🇫', '🇧🇮', '🇰🇭', '🇨🇲', '🇨🇦', '🇮🇨', '🇨🇻', '🇧🇶',
                    '🇰🇾', '🇨🇫', '🇹🇩', '🇨🇱', '🇨🇳', '🇨🇽', '🇨🇨', '🇨🇴', '🇰🇲', '🇨🇬'
                ]
            }
        };
        
        this.init();
    }
    
    init() {
        this.createHTML();
        this.bindEvents();
        this.renderCategories();
        this.renderEmojis();
    }
    
    createHTML() {
        // 检查是否已存在
        if (document.getElementById('emoji-icon-picker')) {
            return;
        }
        
        const html = `
            <div id="emoji-icon-picker" class="emoji-picker-overlay" style="display: none;">
                <div class="emoji-picker-container">
                    <div class="emoji-picker-header">
                        <h3>选择图标</h3>
                        <button class="emoji-picker-close">✕</button>
                    </div>
                    
                    <div class="emoji-picker-search">
                        <input type="text" placeholder="搜索emoji..." class="emoji-search-input">
                    </div>
                    
                    <div class="emoji-picker-categories">
                        <!-- 分类按钮将在这里动态生成 -->
                    </div>
                    
                    <div class="emoji-picker-content">
                        <div class="emoji-grid">
                            <!-- emoji将在这里动态生成 -->
                        </div>
                    </div>
                    
                    <div class="emoji-picker-footer">
                        <button class="btn btn-secondary emoji-picker-cancel">取消</button>
                        <button class="btn btn-primary emoji-picker-confirm">确认</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', html);
    }
    
    bindEvents() {
        const picker = document.getElementById('emoji-icon-picker');
        if (!picker) return;
        
        // 关闭按钮
        picker.querySelector('.emoji-picker-close').addEventListener('click', () => {
            this.hide();
        });
        
        // 取消按钮
        picker.querySelector('.emoji-picker-cancel').addEventListener('click', () => {
            this.hide();
        });
        
        // 确认按钮
        picker.querySelector('.emoji-picker-confirm').addEventListener('click', () => {
            this.confirmSelection();
        });
        
        // 点击遮罩关闭
        picker.addEventListener('click', (e) => {
            if (e.target === picker) {
                this.hide();
            }
        });
        
        // 搜索功能
        const searchInput = picker.querySelector('.emoji-search-input');
        searchInput.addEventListener('input', (e) => {
            this.searchKeyword = e.target.value.toLowerCase();
            this.renderEmojis();
        });
        
        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && picker.style.display !== 'none') {
                this.hide();
            }
        });
    }
    
    renderCategories() {
        const categoriesContainer = document.querySelector('.emoji-picker-categories');
        if (!categoriesContainer) return;
        
        categoriesContainer.innerHTML = '';
        
        Object.keys(this.emojiData).forEach(categoryKey => {
            const category = this.emojiData[categoryKey];
            const button = document.createElement('button');
            button.className = `emoji-category-btn ${categoryKey === this.currentCategory ? 'active' : ''}`;
            button.textContent = category.name;
            button.dataset.category = categoryKey;
            
            button.addEventListener('click', () => {
                this.selectCategory(categoryKey);
            });
            
            categoriesContainer.appendChild(button);
        });
    }
    
    renderEmojis() {
        const emojiGrid = document.querySelector('.emoji-grid');
        if (!emojiGrid) return;
        
        emojiGrid.innerHTML = '';
        
        let emojisToShow = [];
        
        if (this.searchKeyword) {
            // 搜索模式：在所有分类中搜索
            Object.values(this.emojiData).forEach(category => {
                emojisToShow.push(...category.emojis);
            });
            // 这里可以添加更复杂的搜索逻辑，比如根据emoji名称搜索
        } else {
            // 分类模式：显示当前分类的emoji
            emojisToShow = this.emojiData[this.currentCategory]?.emojis || [];
        }
        
        emojisToShow.forEach(emoji => {
            const button = document.createElement('button');
            button.className = `emoji-btn ${emoji === this.selectedEmoji ? 'selected' : ''}`;
            button.textContent = emoji;
            button.title = emoji;
            
            button.addEventListener('click', () => {
                this.selectEmoji(emoji);
            });
            
            emojiGrid.appendChild(button);
        });
    }
    
    selectCategory(categoryKey) {
        this.currentCategory = categoryKey;
        this.searchKeyword = '';
        document.querySelector('.emoji-search-input').value = '';
        this.renderCategories();
        this.renderEmojis();
    }
    
    selectEmoji(emoji) {
        this.selectedEmoji = emoji;
        this.renderEmojis();
    }
    
    show(target, callback) {
        this.currentTarget = target;
        this.callback = callback;
        this.selectedEmoji = '';
        
        const picker = document.getElementById('emoji-icon-picker');
        if (picker) {
            picker.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }
    
    hide() {
        const picker = document.getElementById('emoji-icon-picker');
        if (picker) {
            picker.style.display = 'none';
            document.body.style.overflow = '';
        }
        
        this.currentTarget = null;
        this.callback = null;
        this.selectedEmoji = '';
    }
    
    confirmSelection() {
        if (this.selectedEmoji && this.callback) {
            this.callback(this.selectedEmoji);
        }
        this.hide();
    }
    
    // 静态方法，方便全局调用
    static show(target, callback) {
        if (!window.emojiIconPickerInstance) {
            window.emojiIconPickerInstance = new EmojiIconPicker();
        }
        window.emojiIconPickerInstance.show(target, callback);
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmojiIconPicker;
} else {
    window.EmojiIconPicker = EmojiIconPicker;
}