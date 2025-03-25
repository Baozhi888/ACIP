/**
 * ACIP冲突解析器
 * 
 * 为分布式状态管理提供冲突检测和解决功能
 * 
 * @module state
 */

const { createLogger } = require('../utils/logger');
const { VectorClock } = require('./consistency-models');

/**
 * 冲突解决策略
 */
const ConflictResolutionStrategy = {
  // 以最后写入为准
  LAST_WRITE_WINS: 'last-write-wins',
  
  // 以远程值为准
  REMOTE_WINS: 'remote-wins', 
  
  // 以本地值为准
  LOCAL_WINS: 'local-wins',
  
  // 合并值（适用于可合并的数据结构，如集合或计数器）
  MERGE: 'merge',
  
  // 自定义解决函数
  CUSTOM: 'custom',
  
  // 需要用户干预的手动解决
  MANUAL: 'manual'
};

/**
 * 冲突解析器类
 */
class ConflictResolver {
  /**
   * 创建冲突解析器
   * @param {Object} options - 配置选项
   */
  constructor(options = {}) {
    this.defaultStrategy = options.defaultStrategy || ConflictResolutionStrategy.LAST_WRITE_WINS;
    this.customResolvers = new Map();
    this.manualConflictQueue = [];
    
    // 每个命名空间的策略
    this.namespaceStrategies = new Map();
    
    if (options.namespaceStrategies) {
      for (const [namespace, strategy] of Object.entries(options.namespaceStrategies)) {
        this.namespaceStrategies.set(namespace, strategy);
      }
    }
    
    // 自定义解析函数
    if (options.customResolvers) {
      for (const [type, resolver] of Object.entries(options.customResolvers)) {
        if (typeof resolver === 'function') {
          this.customResolvers.set(type, resolver);
        }
      }
    }
    
    this.logger = options.logger || createLogger('ConflictResolver');
    this.logger.debug('冲突解析器已初始化');
  }
  
  /**
   * 解析冲突
   * @param {string} namespace - 状态命名空间
   * @param {Array} conflicts - 冲突数组
   * @param {Object} context - 解析上下文
   * @returns {Promise<Object>} 解决的数据
   */
  async resolve(namespace, conflicts, context = {}) {
    if (!conflicts || conflicts.length === 0) {
      return {};
    }
    
    // 获取此命名空间的策略
    const strategy = this.namespaceStrategies.get(namespace) || this.defaultStrategy;
    const resolvedData = {};
    
    this.logger.debug(`使用策略 ${strategy} 解析命名空间 ${namespace} 的 ${conflicts.length} 个冲突`);
    
    for (const conflict of conflicts) {
      const { key, localValue, remoteValue } = conflict;
      
      // 获取值的类型
      const valueType = this._getValueType(localValue);
      
      try {
        // 根据策略解析冲突
        switch (strategy) {
          case ConflictResolutionStrategy.LAST_WRITE_WINS:
            resolvedData[key] = this._resolveLastWriteWins(conflict, context);
            break;
            
          case ConflictResolutionStrategy.REMOTE_WINS:
            resolvedData[key] = remoteValue;
            break;
            
          case ConflictResolutionStrategy.LOCAL_WINS:
            resolvedData[key] = localValue;
            break;
            
          case ConflictResolutionStrategy.MERGE:
            resolvedData[key] = this._resolveMerge(conflict, valueType, context);
            break;
            
          case ConflictResolutionStrategy.CUSTOM:
            resolvedData[key] = await this._resolveCustom(conflict, valueType, namespace, context);
            break;
            
          case ConflictResolutionStrategy.MANUAL:
            // 将冲突添加到手动解决队列
            this.manualConflictQueue.push({
              namespace,
              key,
              localValue,
              remoteValue,
              timestamp: Date.now(),
              context
            });
            // 暂时保留本地值
            resolvedData[key] = localValue;
            break;
            
          default:
            this.logger.warn(`未知的冲突解决策略: ${strategy}，默认使用最后写入赢`);
            resolvedData[key] = this._resolveLastWriteWins(conflict, context);
        }
      } catch (error) {
        this.logger.error(`解析键 ${key} 的冲突时出错:`, error);
        // 错误时保留本地值
        resolvedData[key] = localValue;
      }
    }
    
    return resolvedData;
  }
  
  /**
   * 注册自定义冲突解析器
   * @param {string} valueType - 值类型
   * @param {Function} resolver - 解析函数
   * @returns {boolean} 是否成功注册
   */
  registerCustomResolver(valueType, resolver) {
    if (typeof resolver !== 'function') {
      throw new Error('解析器必须是一个函数');
    }
    
    this.customResolvers.set(valueType, resolver);
    this.logger.debug(`为类型 ${valueType} 注册了自定义解析器`);
    return true;
  }
  
  /**
   * 设置命名空间的冲突解决策略
   * @param {string} namespace - 状态命名空间
   * @param {string} strategy - 冲突解决策略
   */
  setNamespaceStrategy(namespace, strategy) {
    if (!Object.values(ConflictResolutionStrategy).includes(strategy)) {
      throw new Error(`未知的冲突解决策略: ${strategy}`);
    }
    
    this.namespaceStrategies.set(namespace, strategy);
    this.logger.debug(`为命名空间 ${namespace} 设置了策略 ${strategy}`);
  }
  
  /**
   * 获取等待手动解决的冲突
   * @returns {Array} 冲突数组
   */
  getPendingManualConflicts() {
    return [...this.manualConflictQueue];
  }
  
  /**
   * 手动解决冲突
   * @param {number} conflictIndex - 冲突索引
   * @param {*} resolvedValue - 解决的值
   * @returns {boolean} 是否成功解决
   */
  resolveManualConflict(conflictIndex, resolvedValue) {
    if (conflictIndex < 0 || conflictIndex >= this.manualConflictQueue.length) {
      throw new Error(`冲突索引 ${conflictIndex} 超出范围`);
    }
    
    const conflict = this.manualConflictQueue[conflictIndex];
    
    // 发出解决事件
    this.emit('conflict:resolved', {
      namespace: conflict.namespace,
      key: conflict.key,
      resolvedValue,
      localValue: conflict.localValue,
      remoteValue: conflict.remoteValue,
      resolvedBy: 'manual'
    });
    
    // 从队列中移除冲突
    this.manualConflictQueue.splice(conflictIndex, 1);
    
    return true;
  }
  
  /**
   * 获取值的类型
   * @private
   * @param {*} value - 要检查的值
   * @returns {string} 值类型
   */
  _getValueType(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (value instanceof Set) return 'set';
    if (value instanceof Map) return 'map';
    if (value instanceof Date) return 'date';
    
    // 对象中的特殊类型检查
    if (typeof value === 'object') {
      if (value._type === 'counter') return 'counter';
      if (value._type === 'vector-clock') return 'vector-clock';
      if (value._type === 'set') return 'set-object';
      if (value._type === 'map') return 'map-object';
      return 'object';
    }
    
    return typeof value;
  }
  
  /**
   * 使用最后写入赢策略解决冲突
   * @private
   * @param {Object} conflict - 冲突对象
   * @param {Object} context - 上下文
   * @returns {*} 解决的值
   */
  _resolveLastWriteWins(conflict, context) {
    const { localValue, remoteValue } = conflict;
    
    // 检查本地值和远程值中的时间戳
    const localTimestamp = this._extractTimestamp(localValue);
    const remoteTimestamp = this._extractTimestamp(remoteValue);
    
    if (localTimestamp && remoteTimestamp) {
      return localTimestamp >= remoteTimestamp ? localValue : remoteValue;
    }
    
    // 检查上下文中的时间戳
    if (context.localTimestamp && context.remoteTimestamp) {
      return context.localTimestamp >= context.remoteTimestamp ? localValue : remoteValue;
    }
    
    // 默认使用远程值
    return remoteValue;
  }
  
  /**
   * 从值中提取时间戳
   * @private
   * @param {*} value - 要检查的值
   * @returns {number|null} 时间戳或null
   */
  _extractTimestamp(value) {
    if (!value || typeof value !== 'object') {
      return null;
    }
    
    // 检查常见的时间戳属性
    if (value.timestamp) return value.timestamp;
    if (value.updatedAt) return new Date(value.updatedAt).getTime();
    if (value.lastModified) return new Date(value.lastModified).getTime();
    if (value._timestamp) return value._timestamp;
    
    // 如果是日期对象
    if (value instanceof Date) {
      return value.getTime();
    }
    
    return null;
  }
  
  /**
   * 使用合并策略解决冲突
   * @private
   * @param {Object} conflict - 冲突对象
   * @param {string} valueType - 值类型
   * @param {Object} context - 上下文
   * @returns {*} 解决的值
   */
  _resolveMerge(conflict, valueType, context) {
    const { localValue, remoteValue } = conflict;
    
    switch (valueType) {
      case 'array':
        // 合并数组，删除重复项
        return [...new Set([...localValue, ...remoteValue])];
        
      case 'set':
        // 合并Set
        return new Set([...localValue, ...remoteValue]);
        
      case 'set-object':
        // 合并Set对象表示
        return {
          _type: 'set',
          values: [...new Set([...localValue.values, ...remoteValue.values])]
        };
        
      case 'map':
        // 合并Map，使用最新的键值
        const mergedMap = new Map(localValue);
        for (const [key, value] of remoteValue.entries()) {
          mergedMap.set(key, value);
        }
        return mergedMap;
        
      case 'map-object':
        // 合并Map对象表示
        return {
          _type: 'map',
          entries: {
            ...localValue.entries,
            ...remoteValue.entries
          }
        };
        
      case 'counter':
        // 合并计数器，取最大值
        return {
          _type: 'counter',
          value: Math.max(localValue.value, remoteValue.value)
        };
        
      case 'object':
        // 深度合并对象
        return this._deepMergeObjects(localValue, remoteValue, context);
        
      case 'vector-clock':
        // 合并向量时钟
        if (localValue._vectors && remoteValue._vectors) {
          const mergedClock = new VectorClock(localValue._vectors);
          mergedClock.merge(new VectorClock(remoteValue._vectors));
          return {
            _type: 'vector-clock',
            _vectors: mergedClock.toJSON()
          };
        }
        // 回退到远程值
        return remoteValue;
        
      default:
        // 默认使用远程值
        return remoteValue;
    }
  }
  
  /**
   * 深度合并对象
   * @private
   * @param {Object} local - 本地对象
   * @param {Object} remote - 远程对象
   * @param {Object} context - 上下文
   * @returns {Object} 合并后的对象
   */
  _deepMergeObjects(local, remote, context) {
    if (!local || typeof local !== 'object') return remote;
    if (!remote || typeof remote !== 'object') return local;
    
    const result = { ...local };
    
    for (const key of Object.keys(remote)) {
      if (key in result) {
        const localValue = result[key];
        const remoteValue = remote[key];
        
        // 如果两者都是对象，递归合并
        if (typeof localValue === 'object' && typeof remoteValue === 'object' &&
            !Array.isArray(localValue) && !Array.isArray(remoteValue)) {
          result[key] = this._deepMergeObjects(localValue, remoteValue, context);
        } else {
          // 使用远程值
          result[key] = remoteValue;
        }
      } else {
        // 本地没有的键，使用远程值
        result[key] = remote[key];
      }
    }
    
    return result;
  }
  
  /**
   * 使用自定义解析器解决冲突
   * @private
   * @param {Object} conflict - 冲突对象
   * @param {string} valueType - 值类型
   * @param {string} namespace - 命名空间
   * @param {Object} context - 上下文
   * @returns {Promise<*>} 解决的值
   */
  async _resolveCustom(conflict, valueType, namespace, context) {
    const { key, localValue, remoteValue } = conflict;
    
    // 检查是否有针对此类型的自定义解析器
    const typeResolver = this.customResolvers.get(valueType);
    if (typeResolver) {
      return await typeResolver(localValue, remoteValue, { key, namespace, ...context });
    }
    
    // 检查是否有针对此命名空间的自定义解析器
    const namespaceResolver = this.customResolvers.get(namespace);
    if (namespaceResolver) {
      return await namespaceResolver(localValue, remoteValue, { key, valueType, ...context });
    }
    
    // 检查是否有通用解析器
    const generalResolver = this.customResolvers.get('*');
    if (generalResolver) {
      return await generalResolver(localValue, remoteValue, { key, namespace, valueType, ...context });
    }
    
    // 没有合适的解析器，使用最后写入赢策略
    this.logger.warn(`没有针对类型 ${valueType} 或命名空间 ${namespace} 的自定义解析器，使用最后写入赢策略`);
    return this._resolveLastWriteWins(conflict, context);
  }
}

module.exports = {
  ConflictResolver,
  ConflictResolutionStrategy
}; 