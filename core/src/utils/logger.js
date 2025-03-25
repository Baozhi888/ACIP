/**
 * ACIP日志工具
 * 
 * 统一的日志记录模块，支持不同日志级别和输出格式
 * 
 * @module utils
 */

/**
 * 日志级别枚举
 */
const LogLevel = {
  TRACE: 0,
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
  FATAL: 5,
  NONE: 6
};

/**
 * 默认日志配置
 */
const DEFAULT_CONFIG = {
  level: LogLevel.INFO,
  colorize: true,
  timestamp: true,
  format: 'text',
  transports: ['console'],
  contextPadding: 14,
  dateFormat: 'YYYY-MM-DD HH:mm:ss.SSS'
};

// 全局日志配置
let globalConfig = { ...DEFAULT_CONFIG };

/**
 * 设置全局日志配置
 * @param {Object} config - 日志配置选项
 */
function configureLogger(config = {}) {
  globalConfig = {
    ...globalConfig,
    ...config
  };
  
  // 确保日志级别有效
  if (typeof globalConfig.level === 'string') {
    globalConfig.level = LogLevel[globalConfig.level.toUpperCase()] || LogLevel.INFO;
  }
}

/**
 * ANSI 颜色代码
 */
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m'
};

/**
 * 日志级别对应的颜色和标签
 */
const LEVEL_STYLES = {
  [LogLevel.TRACE]: { color: COLORS.dim + COLORS.white, label: 'TRACE' },
  [LogLevel.DEBUG]: { color: COLORS.cyan, label: 'DEBUG' },
  [LogLevel.INFO]: { color: COLORS.green, label: 'INFO' },
  [LogLevel.WARN]: { color: COLORS.yellow, label: 'WARN' },
  [LogLevel.ERROR]: { color: COLORS.red, label: 'ERROR' },
  [LogLevel.FATAL]: { color: COLORS.bright + COLORS.red, label: 'FATAL' }
};

/**
 * 格式化日期
 * @private
 * @param {Date} date - 日期对象
 * @param {string} format - 格式字符串
 * @returns {string} 格式化的日期字符串
 */
function formatDate(date, format) {
  const pad = (num, size = 2) => String(num).padStart(size, '0');
  
  const tokens = {
    YYYY: date.getFullYear(),
    MM: pad(date.getMonth() + 1),
    DD: pad(date.getDate()),
    HH: pad(date.getHours()),
    mm: pad(date.getMinutes()),
    ss: pad(date.getSeconds()),
    SSS: pad(date.getMilliseconds(), 3)
  };
  
  return format.replace(/YYYY|MM|DD|HH|mm|ss|SSS/g, match => tokens[match]);
}

/**
 * 创建日志记录器
 * @param {string} context - 日志上下文名称（例如模块名）
 * @param {Object} [options] - 此记录器的特定选项
 * @returns {Object} 日志记录器对象
 */
function createLogger(context, options = {}) {
  const config = {
    ...globalConfig,
    ...options
  };
  
  // 格式化日志消息
  function formatLogMessage(level, message, ...args) {
    if (level < config.level) {
      return null;
    }
    
    const timestamp = config.timestamp 
      ? formatDate(new Date(), config.dateFormat) + ' '
      : '';
      
    const levelInfo = LEVEL_STYLES[level] || LEVEL_STYLES[LogLevel.INFO];
    const levelStr = levelInfo.label;
    
    const contextStr = context ? `[${context}]` : '';
    const paddedContext = contextStr.padEnd(config.contextPadding, ' ');
    
    let formatted = `${timestamp}${levelStr} ${paddedContext} ${message}`;
    
    // 处理额外参数
    if (args.length > 0) {
      // 如果args是对象，尝试格式化为JSON
      try {
        const argsStr = args.map(arg => {
          if (typeof arg === 'object' && arg !== null) {
            return JSON.stringify(arg);
          }
          return String(arg);
        }).join(' ');
        
        formatted += ' ' + argsStr;
      } catch (err) {
        formatted += ' ' + args.join(' ');
      }
    }
    
    // 应用颜色
    if (config.colorize) {
      return `${levelInfo.color}${formatted}${COLORS.reset}`;
    }
    
    return formatted;
  }
  
  // 输出日志信息
  function logMessage(level, message, ...args) {
    const formatted = formatLogMessage(level, message, ...args);
    if (!formatted) return;
    
    // 根据配置将日志发送到不同的目标
    config.transports.forEach(transport => {
      switch (transport) {
        case 'console':
          console.log(formatted);
          break;
        case 'file':
          // 实际应用中可实现文件日志
          break;
        case 'remote':
          // 实际应用中可实现远程日志
          break;
        default:
          // 自定义传输方式
          if (typeof transport === 'function') {
            transport(level, formatted, { context, message, args });
          }
      }
    });
  }
  
  return {
    /**
     * 获取当前日志记录器的上下文
     * @returns {string} 上下文名称
     */
    getContext() {
      return context;
    },
    
    /**
     * 获取当前配置
     * @returns {Object} 日志配置
     */
    getConfig() {
      return { ...config };
    },
    
    /**
     * 记录跟踪级别消息
     * @param {string} message - 日志消息
     * @param {...any} args - 附加参数
     */
    trace(message, ...args) {
      logMessage(LogLevel.TRACE, message, ...args);
    },
    
    /**
     * 记录调试级别消息
     * @param {string} message - 日志消息
     * @param {...any} args - 附加参数
     */
    debug(message, ...args) {
      logMessage(LogLevel.DEBUG, message, ...args);
    },
    
    /**
     * 记录信息级别消息
     * @param {string} message - 日志消息
     * @param {...any} args - 附加参数
     */
    info(message, ...args) {
      logMessage(LogLevel.INFO, message, ...args);
    },
    
    /**
     * 记录警告级别消息
     * @param {string} message - 日志消息
     * @param {...any} args - 附加参数
     */
    warn(message, ...args) {
      logMessage(LogLevel.WARN, message, ...args);
    },
    
    /**
     * 记录错误级别消息
     * @param {string} message - 日志消息
     * @param {...any} args - 附加参数
     */
    error(message, ...args) {
      logMessage(LogLevel.ERROR, message, ...args);
    },
    
    /**
     * 记录致命错误级别消息
     * @param {string} message - 日志消息
     * @param {...any} args - 附加参数
     */
    fatal(message, ...args) {
      logMessage(LogLevel.FATAL, message, ...args);
    },
    
    /**
     * 创建带有子上下文的新日志记录器
     * @param {string} subContext - 子上下文名称
     * @returns {Object} 子日志记录器
     */
    createSubLogger(subContext) {
      return createLogger(`${context}:${subContext}`, config);
    }
  };
}

// 创建默认日志记录器
const defaultLogger = createLogger('ACIP');

module.exports = {
  LogLevel,
  createLogger,
  configureLogger,
  defaultLogger
}; 