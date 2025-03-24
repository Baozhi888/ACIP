/**
 * ACIP工具模块
 * 
 * 提供各种工具函数和类
 * 
 * @module utils
 */

const logger = require('./logger');

/**
 * 深度克隆对象
 * @param {*} obj - 要克隆的对象
 * @returns {*} 克隆后的对象
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item));
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  
  if (obj instanceof RegExp) {
    return new RegExp(obj);
  }
  
  const cloned = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  
  return cloned;
}

/**
 * 安全地获取对象的嵌套属性值
 * @param {Object} obj - 对象
 * @param {string} path - 属性路径，例如 'a.b.c'
 * @param {*} defaultValue - 未找到时的默认值
 * @returns {*} 属性值或默认值
 */
function get(obj, path, defaultValue) {
  if (!obj || !path) {
    return defaultValue;
  }
  
  const keys = path.split('.');
  let result = obj;
  
  for (const key of keys) {
    if (result === null || result === undefined || typeof result !== 'object') {
      return defaultValue;
    }
    
    result = result[key];
    
    if (result === undefined) {
      return defaultValue;
    }
  }
  
  return result;
}

/**
 * 安全地设置对象的嵌套属性值
 * @param {Object} obj - 对象
 * @param {string} path - 属性路径，例如 'a.b.c'
 * @param {*} value - 要设置的值
 * @returns {Object} 更新后的对象
 */
function set(obj, path, value) {
  if (!obj || !path) {
    return obj;
  }
  
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    
    if (current[key] === undefined || current[key] === null || typeof current[key] !== 'object') {
      current[key] = {};
    }
    
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
  
  return obj;
}

/**
 * 延迟执行一个函数
 * @param {number} ms - 延迟毫秒数
 * @returns {Promise} 计时器Promise
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 节流函数，限制函数调用频率
 * @param {Function} fn - 要节流的函数
 * @param {number} wait - 等待毫秒数
 * @returns {Function} 节流后的函数
 */
function throttle(fn, wait) {
  let lastCall = 0;
  
  return function(...args) {
    const now = Date.now();
    
    if (now - lastCall >= wait) {
      lastCall = now;
      return fn.apply(this, args);
    }
  };
}

/**
 * 防抖函数，将多次调用合并为一次
 * @param {Function} fn - 要防抖的函数
 * @param {number} wait - 等待毫秒数
 * @returns {Function} 防抖后的函数
 */
function debounce(fn, wait) {
  let timeout;
  
  return function(...args) {
    const context = this;
    
    clearTimeout(timeout);
    
    timeout = setTimeout(() => {
      fn.apply(context, args);
    }, wait);
  };
}

/**
 * 生成UUID
 * @returns {string} UUID字符串
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 格式化日期
 * @param {Date} date - 日期对象
 * @param {string} format - 格式字符串
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
  if (!(date instanceof Date)) {
    date = new Date(date);
  }
  
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  
  return format
    .replace('YYYY', year)
    .replace('MM', month.toString().padStart(2, '0'))
    .replace('DD', day.toString().padStart(2, '0'))
    .replace('HH', hours.toString().padStart(2, '0'))
    .replace('mm', minutes.toString().padStart(2, '0'))
    .replace('ss', seconds.toString().padStart(2, '0'));
}

/**
 * 尝试解析JSON
 * @param {string} str - JSON字符串
 * @param {*} defaultValue - 解析失败时的默认值
 * @returns {*} 解析后的对象或默认值
 */
function tryParseJSON(str, defaultValue = null) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return defaultValue;
  }
}

/**
 * 异步重试函数
 * @param {Function} fn - 要重试的异步函数
 * @param {Object} options - 选项
 * @param {number} options.retries - 重试次数
 * @param {number} options.delay - 重试间隔毫秒数
 * @param {Function} options.onRetry - 重试回调
 * @returns {Promise} 函数执行结果
 */
async function retry(fn, options = {}) {
  const { retries = 3, delay = 1000, onRetry = null } = options;
  let lastError;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      
      if (attempt < retries) {
        if (onRetry) {
          onRetry(error, attempt);
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

module.exports = {
  ...logger,
  
  // 对象和集合处理
  deepClone,
  get,
  set,
  
  // 函数处理
  delay,
  throttle,
  debounce,
  retry,
  
  // 其他工具
  generateUUID,
  formatDate,
  tryParseJSON
};