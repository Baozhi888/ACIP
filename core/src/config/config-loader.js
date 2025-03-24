/**
 * ACIP配置加载器
 * 
 * 提供从各种来源加载配置的功能
 * 
 * @module config
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * 配置加载器类
 * 
 * 从文件系统、环境变量和默认值加载配置
 */
class ConfigLoader {
  /**
   * 创建配置加载器实例
   * @param {Object} options - 配置选项
   * @param {string} [options.configPath] - 配置文件路径
   * @param {boolean} [options.watchConfig=false] - 是否监视配置文件变化
   * @param {Object} [options.defaults={}] - 默认配置
   * @param {boolean} [options.useEnv=true] - 是否使用环境变量
   * @param {string} [options.envPrefix='ACIP_'] - 环境变量前缀
   * @param {Object} [logger=console] - 日志记录器
   */
  constructor(options = {}, logger = console) {
    this.configPath = options.configPath;
    this.watchConfig = options.watchConfig || false;
    this.defaults = options.defaults || {};
    this.useEnv = options.useEnv !== false;
    this.envPrefix = options.envPrefix || 'ACIP_';
    this.logger = logger;
    
    this.watcher = null;
    this.callbacks = [];
    
    // 绑定方法
    this.load = this.load.bind(this);
    this.watch = this.watch.bind(this);
    this.stopWatch = this.stopWatch.bind(this);
    this.onConfigChange = this.onConfigChange.bind(this);
  }

  /**
   * 加载配置
   * @param {string} [configPath] - 可选的配置文件路径，覆盖构造函数中指定的路径
   * @returns {Promise<Object>} 加载的配置对象
   */
  async load(configPath) {
    const targetPath = configPath || this.configPath;
    let config = { ...this.defaults };
    
    // 从文件加载配置（如果指定了路径）
    if (targetPath) {
      try {
        const fileConfig = await this._loadFromFile(targetPath);
        config = this._deepMerge(config, fileConfig);
        this.logger.info(`从 ${targetPath} 加载配置成功`);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          this.logger.error(`加载配置文件失败: ${error.message}`);
        } else {
          this.logger.warn(`配置文件 ${targetPath} 不存在，使用默认配置`);
        }
      }
    }
    
    // 从环境变量加载配置
    if (this.useEnv) {
      const envConfig = this._loadFromEnv();
      config = this._deepMerge(config, envConfig);
    }
    
    // 如果启用了配置监视，开始监视配置文件
    if (this.watchConfig && targetPath && !this.watcher) {
      this.watch(targetPath);
    }
    
    return config;
  }

  /**
   * 开始监视配置文件变化
   * @param {string} [configPath] - 要监视的配置文件路径
   */
  watch(configPath) {
    const targetPath = configPath || this.configPath;
    
    if (!targetPath) {
      this.logger.warn('未指定配置文件路径，无法监视配置变化');
      return;
    }
    
    // 停止现有的监视器
    this.stopWatch();
    
    try {
      // 使用Node.js fs.watch API
      const dir = path.dirname(targetPath);
      const file = path.basename(targetPath);
      
      this.watcher = fs.watch(dir, (eventType, filename) => {
        if (filename === file && eventType === 'change') {
          this.logger.info(`检测到配置文件变化: ${targetPath}`);
          this.load(targetPath)
            .then(newConfig => {
              for (const callback of this.callbacks) {
                try {
                  callback(newConfig);
                } catch (error) {
                  this.logger.error(`配置变更回调执行出错: ${error.message}`);
                }
              }
            })
            .catch(error => {
              this.logger.error(`重新加载配置失败: ${error.message}`);
            });
        }
      });
      
      this.logger.info(`开始监视配置文件: ${targetPath}`);
    } catch (error) {
      this.logger.error(`启动配置监视失败: ${error.message}`);
    }
  }

  /**
   * 停止监视配置文件
   */
  stopWatch() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      this.logger.info('停止监视配置文件');
    }
  }

  /**
   * 注册配置变更回调
   * @param {Function} callback - 配置变更回调函数
   * @returns {Function} 用于移除回调的函数
   */
  onConfigChange(callback) {
    this.callbacks.push(callback);
    
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index !== -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  /**
   * 从文件加载配置
   * @private
   * @param {string} filePath - 配置文件路径
   * @returns {Promise<Object>} 从文件加载的配置
   */
  async _loadFromFile(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    const extension = path.extname(filePath).toLowerCase();
    
    if (extension === '.json') {
      return JSON.parse(content);
    } else if (extension === '.js') {
      // 使用eval而不是require，避免缓存问题
      // 注意：这在生产环境中可能有安全风险
      const module = {};
      eval(`(function(module) { ${content} })(module)`);
      return module.exports || {};
    } else {
      throw new Error(`不支持的配置文件格式: ${extension}`);
    }
  }

  /**
   * 从环境变量加载配置
   * @private
   * @returns {Object} 从环境变量加载的配置
   */
  _loadFromEnv() {
    const config = {};
    const envPrefix = this.envPrefix;
    
    for (const key in process.env) {
      if (key.startsWith(envPrefix)) {
        const configPath = key
          .substring(envPrefix.length)
          .toLowerCase()
          .split('_');
        
        let current = config;
        
        // 遍历路径，构建嵌套对象
        for (let i = 0; i < configPath.length - 1; i++) {
          const segment = configPath[i];
          if (!current[segment]) {
            current[segment] = {};
          }
          current = current[segment];
        }
        
        // 设置最终值
        const finalKey = configPath[configPath.length - 1];
        const value = process.env[key];
        
        // 尝试将值转换为适当的类型
        current[finalKey] = this._parseValue(value);
      }
    }
    
    return config;
  }

  /**
   * 解析配置值，尝试转换为合适的数据类型
   * @private
   * @param {string} value - 输入值
   * @returns {*} 转换后的值
   */
  _parseValue(value) {
    // 如果值是布尔值字符串
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    
    // 如果值是null
    if (value.toLowerCase() === 'null') return null;
    
    // 如果值是undefined
    if (value.toLowerCase() === 'undefined') return undefined;
    
    // 如果值是数字
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) return numValue;
    }
    
    // 如果值是JSON对象/数组
    if ((value.startsWith('{') && value.endsWith('}')) || 
        (value.startsWith('[') && value.endsWith(']'))) {
      try {
        return JSON.parse(value);
      } catch (e) {
        // 解析失败，返回原始字符串
        return value;
      }
    }
    
    // 默认返回字符串
    return value;
  }

  /**
   * 深度合并两个对象
   * @private
   * @param {Object} target - 目标对象
   * @param {Object} source - 源对象
   * @returns {Object} 合并后的对象
   */
  _deepMerge(target, source) {
    const output = { ...target };
    
    for (const key in source) {
      if (source[key] === undefined) {
        continue;
      }
      
      if (
        typeof source[key] === 'object' && 
        source[key] !== null && 
        !Array.isArray(source[key]) &&
        typeof target[key] === 'object' && 
        target[key] !== null && 
        !Array.isArray(target[key])
      ) {
        // 两者都是对象，递归合并
        output[key] = this._deepMerge(target[key], source[key]);
      } else {
        // 源覆盖目标
        output[key] = source[key];
      }
    }
    
    return output;
  }
}

// 创建并导出默认配置
const defaultConfig = {
  core: {
    version: '0.1.0',
    logLevel: 'info',
    maxListeners: 100
  },
  modules: {
    autoStart: true,
    defaultTimeout: 30000 // 毫秒
  },
  security: {
    enabled: true,
    encryption: {
      algorithm: 'aes-256-gcm'
    }
  }
};

module.exports = {
  ConfigLoader,
  defaultConfig
}; 