/**
 * CryptoUtils - 加密工具类
 * 提供密码哈希、数据加密解密、盐值生成等安全功能
 */
class CryptoUtils {
    /**
     * 生成随机盐值
     * @param {number} length 盐值长度，默认32字节
     * @returns {Uint8Array} 盐值
     */
    static generateSalt(length = 32) {
        return crypto.getRandomValues(new Uint8Array(length));
    }

    /**
     * 生成随机IV（初始化向量）
     * @param {number} length IV长度，默认12字节（适用于AES-GCM）
     * @returns {Uint8Array} IV
     */
    static generateIV(length = 12) {
        return crypto.getRandomValues(new Uint8Array(length));
    }

    /**
     * 使用PBKDF2算法生成密码哈希
     * @param {string} password 原始密码
     * @param {Uint8Array} salt 盐值
     * @param {number} iterations 迭代次数，默认100000
     * @returns {Promise<string>} Base64编码的密码哈希
     */
    static async hashPassword(password, salt, iterations = 100000) {
        try {
            // 将密码转换为ArrayBuffer
            const encoder = new TextEncoder();
            const passwordBuffer = encoder.encode(password);

            // 导入密码作为密钥材料
            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                passwordBuffer,
                { name: 'PBKDF2' },
                false,
                ['deriveBits']
            );

            // 使用PBKDF2派生密钥
            const hashBuffer = await crypto.subtle.deriveBits(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: iterations,
                    hash: 'SHA-256'
                },
                keyMaterial,
                256 // 256位密钥
            );

            // 转换为Base64字符串
            return this.arrayBufferToBase64(hashBuffer);
        } catch (error) {
            console.error('密码哈希生成失败:', error);
            throw new Error('密码哈希生成失败');
        }
    }

    /**
     * 验证密码
     * @param {string} password 输入的密码
     * @param {string} storedHash 存储的密码哈希
     * @param {Uint8Array} salt 盐值
     * @param {number} iterations 迭代次数，默认100000
     * @returns {Promise<boolean>} 验证结果
     */
    static async verifyPassword(password, storedHash, salt, iterations = 100000) {
        try {
            const computedHash = await this.hashPassword(password, salt, iterations);
            return computedHash === storedHash;
        } catch (error) {
            console.error('密码验证失败:', error);
            return false;
        }
    }

    /**
     * 从密码派生加密密钥
     * @param {string} password 密码
     * @param {Uint8Array} salt 盐值
     * @param {number} iterations 迭代次数，默认100000
     * @returns {Promise<CryptoKey>} 加密密钥
     */
    static async deriveKeyFromPassword(password, salt, iterations = 100000) {
        try {
            const encoder = new TextEncoder();
            const passwordBuffer = encoder.encode(password);

            // 导入密码作为密钥材料
            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                passwordBuffer,
                { name: 'PBKDF2' },
                false,
                ['deriveKey']
            );

            // 派生AES密钥
            const key = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: iterations,
                    hash: 'SHA-256'
                },
                keyMaterial,
                {
                    name: 'AES-GCM',
                    length: 256
                },
                false,
                ['encrypt', 'decrypt']
            );

            return key;
        } catch (error) {
            console.error('密钥派生失败:', error);
            throw new Error('密钥派生失败');
        }
    }

    /**
     * 使用AES-GCM算法加密数据
     * @param {string|Object} data 要加密的数据
     * @param {string} password 密码
     * @param {Uint8Array} salt 盐值，可选
     * @returns {Promise<Object>} 包含加密数据、IV、盐值的对象
     */
    static async encryptData(data, password, salt = null) {
        try {
            // 生成盐值（如果未提供）
            if (!salt) {
                salt = this.generateSalt();
            }

            // 生成IV
            const iv = this.generateIV();

            // 派生密钥
            const key = await this.deriveKeyFromPassword(password, salt);

            // 将数据转换为字符串（如果是对象）
            const dataString = typeof data === 'string' ? data : JSON.stringify(data);
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(dataString);

            // 加密数据
            const encryptedBuffer = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                key,
                dataBuffer
            );

            return {
                encryptedData: this.arrayBufferToBase64(encryptedBuffer),
                iv: Array.from(iv),
                salt: Array.from(salt),
                algorithm: 'AES-GCM',
                keyDerivation: 'PBKDF2'
            };
        } catch (error) {
            console.error('数据加密失败:', error);
            throw new Error('数据加密失败');
        }
    }

    /**
     * 使用AES-GCM算法解密数据
     * @param {Object} encryptedObject 加密对象
     * @param {string} password 密码
     * @returns {Promise<string>} 解密后的数据
     */
    static async decryptData(encryptedObject, password) {
        try {
            const { encryptedData, iv, salt } = encryptedObject;

            // 转换数组为Uint8Array
            const ivArray = new Uint8Array(iv);
            const saltArray = new Uint8Array(salt);

            // 派生密钥
            const key = await this.deriveKeyFromPassword(password, saltArray);

            // 转换Base64为ArrayBuffer
            const encryptedBuffer = this.base64ToArrayBuffer(encryptedData);

            // 解密数据
            const decryptedBuffer = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: ivArray
                },
                key,
                encryptedBuffer
            );

            // 转换为字符串
            const decoder = new TextDecoder();
            return decoder.decode(decryptedBuffer);
        } catch (error) {
            console.error('数据解密失败:', error);
            throw new Error('数据解密失败或密码错误');
        }
    }

    /**
     * 加密JSON对象
     * @param {Object} jsonObject JSON对象
     * @param {string} password 密码
     * @param {Uint8Array} salt 盐值，可选
     * @returns {Promise<Object>} 加密结果
     */
    static async encryptJSON(jsonObject, password, salt = null) {
        try {
            const jsonString = JSON.stringify(jsonObject);
            return await this.encryptData(jsonString, password, salt);
        } catch (error) {
            console.error('JSON加密失败:', error);
            throw new Error('JSON加密失败');
        }
    }

    /**
     * 解密JSON对象
     * @param {Object} encryptedObject 加密对象
     * @param {string} password 密码
     * @returns {Promise<Object>} 解密后的JSON对象
     */
    static async decryptJSON(encryptedObject, password) {
        try {
            const decryptedString = await this.decryptData(encryptedObject, password);
            return JSON.parse(decryptedString);
        } catch (error) {
            console.error('JSON解密失败:', error);
            throw new Error('JSON解密失败或密码错误');
        }
    }

    /**
     * 生成安全的随机密码
     * @param {number} length 密码长度，默认16
     * @param {Object} options 选项
     * @returns {string} 随机密码
     */
    static generateSecurePassword(length = 16, options = {}) {
        const {
            includeUppercase = true,
            includeLowercase = true,
            includeNumbers = true,
            includeSymbols = true,
            excludeSimilar = true
        } = options;

        let charset = '';
        
        if (includeUppercase) {
            charset += excludeSimilar ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        }
        
        if (includeLowercase) {
            charset += excludeSimilar ? 'abcdefghjkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
        }
        
        if (includeNumbers) {
            charset += excludeSimilar ? '23456789' : '0123456789';
        }
        
        if (includeSymbols) {
            charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
        }

        if (!charset) {
            throw new Error('至少需要选择一种字符类型');
        }

        const randomValues = crypto.getRandomValues(new Uint8Array(length));
        let password = '';
        
        for (let i = 0; i < length; i++) {
            password += charset[randomValues[i] % charset.length];
        }

        return password;
    }

    /**
     * 计算数据的SHA-256哈希
     * @param {string|ArrayBuffer} data 数据
     * @returns {Promise<string>} Base64编码的哈希值
     */
    static async sha256Hash(data) {
        try {
            let buffer;
            if (typeof data === 'string') {
                const encoder = new TextEncoder();
                buffer = encoder.encode(data);
            } else {
                buffer = data;
            }

            const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
            return this.arrayBufferToBase64(hashBuffer);
        } catch (error) {
            console.error('SHA-256哈希计算失败:', error);
            throw new Error('哈希计算失败');
        }
    }

    /**
     * 验证数据完整性
     * @param {string} data 原始数据
     * @param {string} expectedHash 期望的哈希值
     * @returns {Promise<boolean>} 验证结果
     */
    static async verifyIntegrity(data, expectedHash) {
        try {
            const computedHash = await this.sha256Hash(data);
            return computedHash === expectedHash;
        } catch (error) {
            console.error('完整性验证失败:', error);
            return false;
        }
    }

    /**
     * 生成HMAC签名
     * @param {string} data 数据
     * @param {string} secret 密钥
     * @returns {Promise<string>} Base64编码的HMAC签名
     */
    static async generateHMAC(data, secret) {
        try {
            const encoder = new TextEncoder();
            const keyBuffer = encoder.encode(secret);
            const dataBuffer = encoder.encode(data);

            // 导入密钥
            const key = await crypto.subtle.importKey(
                'raw',
                keyBuffer,
                {
                    name: 'HMAC',
                    hash: 'SHA-256'
                },
                false,
                ['sign']
            );

            // 生成签名
            const signature = await crypto.subtle.sign('HMAC', key, dataBuffer);
            return this.arrayBufferToBase64(signature);
        } catch (error) {
            console.error('HMAC签名生成失败:', error);
            throw new Error('HMAC签名生成失败');
        }
    }

    /**
     * 验证HMAC签名
     * @param {string} data 原始数据
     * @param {string} signature 签名
     * @param {string} secret 密钥
     * @returns {Promise<boolean>} 验证结果
     */
    static async verifyHMAC(data, signature, secret) {
        try {
            const computedSignature = await this.generateHMAC(data, secret);
            return computedSignature === signature;
        } catch (error) {
            console.error('HMAC签名验证失败:', error);
            return false;
        }
    }

    // ==================== 工具方法 ====================

    /**
     * ArrayBuffer转Base64
     * @param {ArrayBuffer} buffer 
     * @returns {string} Base64字符串
     */
    static arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /**
     * Base64转ArrayBuffer
     * @param {string} base64 Base64字符串
     * @returns {ArrayBuffer}
     */
    static base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    /**
     * 字节数组转十六进制字符串
     * @param {Uint8Array} bytes 
     * @returns {string} 十六进制字符串
     */
    static bytesToHex(bytes) {
        return Array.from(bytes)
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * 十六进制字符串转字节数组
     * @param {string} hex 十六进制字符串
     * @returns {Uint8Array} 字节数组
     */
    static hexToBytes(hex) {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
        }
        return bytes;
    }

    /**
     * 检查浏览器是否支持Web Crypto API
     * @returns {boolean} 支持状态
     */
    static isSupported() {
        return typeof crypto !== 'undefined' && 
               typeof crypto.subtle !== 'undefined' && 
               typeof crypto.getRandomValues === 'function';
    }

    /**
     * 获取加密算法信息
     * @returns {Object} 算法信息
     */
    static getAlgorithmInfo() {
        return {
            passwordHashing: {
                algorithm: 'PBKDF2',
                hash: 'SHA-256',
                iterations: 100000,
                keyLength: 256
            },
            dataEncryption: {
                algorithm: 'AES-GCM',
                keyLength: 256,
                ivLength: 12
            },
            integrity: {
                algorithm: 'SHA-256'
            },
            signature: {
                algorithm: 'HMAC',
                hash: 'SHA-256'
            }
        };
    }

    /**
     * 估算密码强度
     * @param {string} password 密码
     * @returns {Object} 密码强度信息
     */
    static estimatePasswordStrength(password) {
        if (!password) {
            return { score: 0, level: 'very-weak', feedback: '密码不能为空' };
        }

        let score = 0;
        const feedback = [];

        // 长度检查
        if (password.length >= 8) score += 1;
        else feedback.push('密码长度至少8位');

        if (password.length >= 12) score += 1;
        if (password.length >= 16) score += 1;

        // 字符类型检查
        if (/[a-z]/.test(password)) score += 1;
        else feedback.push('包含小写字母');

        if (/[A-Z]/.test(password)) score += 1;
        else feedback.push('包含大写字母');

        if (/[0-9]/.test(password)) score += 1;
        else feedback.push('包含数字');

        if (/[^a-zA-Z0-9]/.test(password)) score += 1;
        else feedback.push('包含特殊字符');

        // 复杂性检查
        if (!/(..).*\1/.test(password)) score += 1; // 无重复字符对
        if (!/012|123|234|345|456|567|678|789|890|abc|bcd|cde|def/.test(password.toLowerCase())) {
            score += 1; // 无连续字符
        }

        // 确定强度等级
        let level, levelText;
        if (score <= 2) {
            level = 'very-weak';
            levelText = '非常弱';
        } else if (score <= 4) {
            level = 'weak';
            levelText = '弱';
        } else if (score <= 6) {
            level = 'medium';
            levelText = '中等';
        } else if (score <= 8) {
            level = 'strong';
            levelText = '强';
        } else {
            level = 'very-strong';
            levelText = '非常强';
        }

        return {
            score,
            level,
            levelText,
            feedback: feedback.length > 0 ? feedback : ['密码强度良好']
        };
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CryptoUtils;
} else {
    window.CryptoUtils = CryptoUtils;
}