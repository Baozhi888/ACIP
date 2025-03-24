/**
 * ACIP日志工具
 * 
 * 提供统一的日志记录功能
 * 
 * @module utils/logger
 */

/**
 * 日志级别
 */
const LogLevel = {
  TRACE: 0,
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
  FATAL: 5,
  NONE: 6,
  
  // 日志级别名称映射
  toString: function(level) {
    switch(level) {
      case this.TRACE: return 'TRACE';
      case this.DEBUG: return 'DEBUG';
      case this.INFO: return 'INFO';
      case this.WARN: return 'WARN';
      case this.ERROR: return 'ERROR';
      case this.FATAL: return 'FATAL';
      case this.NONE: return 'NONE';
      default: return 'UNKNOWN';
    }
  },
  
  // 从字符串获取日志级别
  fromString: function(levelStr) {
    switch(levelStr.toUpperCase()) {
      case 'TRACE': return this.TRACE;
      case 'DEBUG': return this.DEBUG;
      case 'INFO': return this.INFO;
      case 'WARN': return this.WARN;
      case 'ERROR': return this.ERROR;
      case 'FATAL': return this.FATAL;
      case 'NONE': return this.NONE;
      default: return this.INFO;
    }
  }
};

/**
 * 级别名称映射
 */
const LogLevelNames = {
  [LogLevel.TRACE]: 'TRACE',
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.FATAL]: 'FATAL',
  [LogLevel.NONE]: 'NONE'
};

/**
 * 将字符串日志级别转换为数字
 * @param {string} levelName - 日志级别名称
 * @returns {number} 日志级别数值
 */
function getLevelValue(levelName) {
  if (typeof levelName === 'number') {
    return levelName;
  }
  
  const name = (levelName || '').toUpperCase();
  
  for (const [value, label] of Object.entries(LogLevelNames)) {
    if (label === name) {
      return parseInt(value, 10);
    }
  }
  
  return LogLevel.INFO; // 默认
}

/**
 * 检查是否应该记录给定级别的日志
 * @param {number} messageLevel - 消息级别
 * @param {number} loggerLevel - 日志记录器级别
 * @returns {boolean} 是否应该记录
 */
function shouldLog(messageLevel, loggerLevel) {
  return messageLevel >= loggerLevel;
}

/**
 * 格式化日志消息
 * @param {number} level - 日志级别
 * @param {string} message - 日志消息
 * @param {Object} [meta] - 附加元数据
 * @returns {string} 格式化后的日志消息
 */
function formatLogMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const levelName = LogLevel.toString(level);
  
  let formattedMeta = '';
  
  if (Object.keys(meta).length > 0) {
    try {
      formattedMeta = ` ${JSON.stringify(meta)}`;
    } catch (e) {
      formattedMeta = ' [无法序列化元数据]';
    }
  }
  
  return `[${timestamp}] [${levelName}] ${message}${formattedMeta}`;
}

/**
 * 创建控制台日志处理器
 * @returns {Function} 日志处理器函数
 */
function createConsoleHandler() {
  return (level, message, meta) => {
    const formattedMessage = formatLogMessage(level, message, meta);
    
    switch (level) {
      case LogLevel.TRACE:
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(formattedMessage);
        break;
      default:
        break;
    }
  };
}

/**
 * 日志记录器类
 */
class Logger {
  /**
   * 创建日志记录器实例
   * @param {Object} options - 日志选项
   * @param {string|number} [options.level='info'] - 日志级别
   * @param {string} [options.name='ACIP'] - 日志记录器名称
   * @param {Function[]} [options.handlers] - 日志处理器数组
   * @param {Object} [options.meta={}] - 默认元数据
   */
  constructor(options = {}) {
    this.level = getLevelValue(options.level || 'info');
    this.name = options.name || 'ACIP';
    this.handlers = options.handlers || [createConsoleHandler()];
    this.defaultMeta = options.meta || {};
    
    // 绑定日志方法
    this.trace = this.trace.bind(this);
    this.debug = this.debug.bind(this);
    this.info = this.info.bind(this);
    this.warn = this.warn.bind(this);
    this.error = this.error.bind(this);
    this.fatal = this.fatal.bind(this);
    this.log = this.log.bind(this);
    this.setLevel = this.setLevel.bind(this);
    this.addHandler = this.addHandler.bind(this);
    this.child = this.child.bind(this);
  }

  /**
   * 记录跟踪级别日志
   * @param {string} message - 日志消息
   * @param {Object} [meta] - 附加元数据
   */
  trace(message, meta = {}) {
    this.log(LogLevel.TRACE, message, meta);
  }

  /**
   * 记录调试级别日志
   * @param {string} message - 日志消息
   * @param {Object} [meta] - 附加元数据
   */
  debug(message, meta = {}) {
    this.log(LogLevel.DEBUG, message, meta);
  }

  /**
   * 记录信息级别日志
   * @param {string} message - 日志消息
   * @param {Object} [meta] - 附加元数据
   */
  info(message, meta = {}) {
    this.log(LogLevel.INFO, message, meta);
  }

  /**
   * 记录警告级别日志
   * @param {string} message - 日志消息
   * @param {Object} [meta] - 附加元数据
   */
  warn(message, meta = {}) {
    this.log(LogLevel.WARN, message, meta);
  }

  /**
   * 记录错误级别日志
   * @param {string} message - 日志消息
   * @param {Object|Error} [metaOrError] - 附加元数据或错误对象
   */
  error(message, metaOrError = {}) {
    let meta = metaOrError;
    
    // 处理错误对象
    if (metaOrError instanceof Error) {
      meta = {
        error: {
          name: metaOrError.name,
          message: metaOrError.message,
          stack: metaOrError.stack
        },
        ...meta
      };
    }
    
    this.log(LogLevel.ERROR, message, meta);
  }

  /**
   * 记录致命错误级别日志
   * @param {string} message - 日志消息
   * @param {Object|Error} [metaOrError] - 附加元数据或错误对象
   */
  fatal(message, metaOrError = {}) {
    let meta = metaOrError;
    
    // 处理错误对象
    if (metaOrError instanceof Error) {
      meta = {
        error: {
          name: metaOrError.name,
          message: metaOrError.message,
          stack: metaOrError.stack
        },
        ...meta
      };
    }
    
    this.log(LogLevel.FATAL, message, meta);
  }

  /**
   * 记录任意级别的日志
   * @param {number} level - 日志级别
   * @param {string} message - 日志消息
   * @param {Object} [meta] - 附加元数据
   */
  log(level, message, meta = {}) {
    if (!shouldLog(level, this.level)) {
      return;
    }
    
    const combinedMeta = {
      ...this.defaultMeta,
      ...meta,
      logger: this.name
    };
    
    for (const handler of this.handlers) {
      try {
        handler(level, message, combinedMeta);
      } catch (error) {
        console.error(`日志处理器错误: ${error.message}`);
      }
    }
  }

  /**
   * 设置日志级别
   * @param {string|number} level - 新的日志级别
   */
  setLevel(level) {
    this.level = getLevelValue(level);
  }

  /**
   * 添加日志处理器
   * @param {Function} handler - 日志处理器函数
   */
  addHandler(handler) {
    if (typeof handler === 'function') {
      this.handlers.push(handler);
    }
  }

  /**
   * 创建子日志记录器
   * @param {string} name - 子日志记录器名称
   * @param {Object} [meta] - 附加元数据
   * @returns {Logger} 子日志记录器实例
   */
  child(name, meta = {}) {
    return new Logger({
      level: this.level,
      name: `${this.name}:${name}`,
      handlers: this.handlers,
      meta: {
        ...this.defaultMeta,
        ...meta
      }
    });
  }
}

/**
 * 创建默认日志记录器
 * @param {Object} [options] - 日志选项
 * @returns {Logger} 日志记录器实例
 */
function createLogger(options = {}) {
  return new Logger(options);
}

// 创建并导出默认日志记录器
const defaultLogger = createLogger();

module.exports = {
  Logger,
  createLogger,
  defaultLogger,
  LogLevel,
  LogLevelNames
}; 