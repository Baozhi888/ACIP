/**
 * ACIP状态存储
 * 
 * 实现状态的本地存储与管理
 * 
 * @module state
 */

const { EventEmitter } = require('events');
const { createLogger } = require('../utils/logger');

/**
 * 状态变更事件类型
 */
const StateEvents = {
  CHANGED: 'state:changed',
  LOCKED: 'state:locked',
  UNLOCKED: 'state:unlocked',
  REPLACED: 'state:replaced',
  CLEARED: 'state:cleared'
};

/**
 * 状态存储类
 */
class StateStore {
  /**
   * 创建新的状态存储
   * @param {string} namespace - 状态命名空间
   * @param {Object} options - 存储选项
   */
  constructor(namespace, options = {}) {
    this.namespace = namespace;
    this.nodeId = options.nodeId || 'unknown';
    this.consistencyModel = options.consistencyModel || 'eventual';
    this.data = {};
    this.metadata = {
      version: 0,
      lastUpdated: Date.now(),
      owner: this.nodeId,
      locks: {}
    };
    
    this.eventBus = options.eventBus;
    this.emitter = new EventEmitter();
    this.logger = options.logger || createLogger(`StateStore:${namespace}`);
    
    this.logger.debug(`命名空间 ${namespace} 的状态存储已创建`);
  }
  
  /**
   * 获取键的值
   * @param {string} key - 状态键
   * @param {*} defaultValue - 如果键不存在时的默认值
   * @returns {*} 键的值或默认值
   */
  get(key, defaultValue = undefined) {
    return this.data[key] !== undefined ? this.data[key] : defaultValue;
  }
  
  /**
   * 设置键的值
   * @param {string} key - 状态键
   * @param {*} value - 要设置的值
   * @param {Object} options - 设置选项
   * @returns {boolean} 是否成功设置
   */
  set(key, value, options = {}) {
    // 检查键是否被锁定
    if (this.isLocked(key) && this.metadata.locks[key].holder !== options.lockHolder) {
      this.logger.warn(`尝试设置被锁定的键 ${key}`);
      return false;
    }
    
    const previousValue = this.data[key];
    this.data[key] = value;
    
    // 更新版本和时间戳
    this.metadata.version++;
    this.metadata.lastUpdated = Date.now();
    
    // 发出变更事件
    this._emitChangeEvent([{
      key,
      newValue: value,
      previousValue,
      operation: 'set',
      timestamp: this.metadata.lastUpdated,
      metadata: options.metadata
    }]);
    
    return true;
  }
  
  /**
   * 删除键
   * @param {string} key - 要删除的键
   * @param {Object} options - 删除选项
   * @returns {boolean} 是否成功删除
   */
  delete(key, options = {}) {
    // 检查键是否被锁定
    if (this.isLocked(key) && this.metadata.locks[key].holder !== options.lockHolder) {
      this.logger.warn(`尝试删除被锁定的键 ${key}`);
      return false;
    }
    
    if (this.data[key] === undefined) {
      return false;
    }
    
    const previousValue = this.data[key];
    delete this.data[key];
    
    // 更新版本和时间戳
    this.metadata.version++;
    this.metadata.lastUpdated = Date.now();
    
    // 发出变更事件
    this._emitChangeEvent([{
      key,
      previousValue,
      operation: 'delete',
      timestamp: this.metadata.lastUpdated,
      metadata: options.metadata
    }]);
    
    return true;
  }
  
  /**
   * 批量设置多个键值
   * @param {Object} entries - 键值对象
   * @param {Object} options - 设置选项
   * @returns {Object} 操作结果
   */
  setMultiple(entries, options = {}) {
    if (!entries || typeof entries !== 'object') {
      return { success: false, reason: 'invalid-entries' };
    }
    
    const changes = [];
    const failedKeys = [];
    
    for (const [key, value] of Object.entries(entries)) {
      // 检查键是否被锁定
      if (this.isLocked(key) && this.metadata.locks[key].holder !== options.lockHolder) {
        this.logger.warn(`批量设置：键 ${key} 被锁定`);
        failedKeys.push(key);
        continue;
      }
      
      const previousValue = this.data[key];
      this.data[key] = value;
      
      changes.push({
        key,
        newValue: value,
        previousValue,
        operation: 'set',
        timestamp: Date.now(),
        metadata: options.metadata
      });
    }
    
    if (changes.length > 0) {
      // 更新版本和时间戳
      this.metadata.version++;
      this.metadata.lastUpdated = Date.now();
      
      // 发出变更事件
      this._emitChangeEvent(changes);
    }
    
    return {
      success: failedKeys.length === 0,
      changedCount: changes.length,
      failedKeys
    };
  }
  
  /**
   * 清除所有数据
   * @param {Object} options - 清除选项
   * @returns {boolean} 是否成功清除
   */
  clear(options = {}) {
    // 检查是否有锁定的键
    if (Object.keys(this.metadata.locks).length > 0 && !options.force) {
      this.logger.warn('尝试清除包含锁定键的存储');
      return false;
    }
    
    const previousData = { ...this.data };
    this.data = {};
    
    // 清除所有锁
    this.metadata.locks = {};
    
    // 更新版本和时间戳
    this.metadata.version++;
    this.metadata.lastUpdated = Date.now();
    
    // 发出清除事件
    this.emitter.emit(StateEvents.CLEARED, {
      namespace: this.namespace,
      previousData,
      timestamp: this.metadata.lastUpdated,
      metadata: options.metadata
    });
    
    if (this.eventBus) {
      this.eventBus.publish(StateEvents.CLEARED, {
        namespace: this.namespace,
        timestamp: this.metadata.lastUpdated,
        nodeId: this.nodeId,
        metadata: options.metadata
      });
    }
    
    return true;
  }
  
  /**
   * 锁定键
   * @param {string} key - 要锁定的键
   * @param {string} holder - 锁持有者ID
   * @param {number} [ttl=30000] - 锁的生存时间(毫秒)
   * @returns {boolean} 是否成功锁定
   */
  lock(key, holder, ttl = 30000) {
    if (this.isLocked(key)) {
      if (this.metadata.locks[key].holder === holder) {
        // 更新现有锁的过期时间
        this.metadata.locks[key].expires = Date.now() + ttl;
        return true;
      }
      
      this.logger.warn(`尝试锁定已被 ${this.metadata.locks[key].holder} 锁定的键 ${key}`);
      return false;
    }
    
    this.metadata.locks[key] = {
      holder,
      expires: Date.now() + ttl
    };
    
    // 发出锁定事件
    this.emitter.emit(StateEvents.LOCKED, {
      namespace: this.namespace,
      key,
      holder,
      expires: this.metadata.locks[key].expires
    });
    
    if (this.eventBus) {
      this.eventBus.publish(StateEvents.LOCKED, {
        namespace: this.namespace,
        key,
        holder,
        expires: this.metadata.locks[key].expires,
        nodeId: this.nodeId
      });
    }
    
    // 设置自动释放锁的定时器
    setTimeout(() => {
      if (this.metadata.locks[key] && this.metadata.locks[key].holder === holder) {
        this.unlock(key, holder);
      }
    }, ttl);
    
    return true;
  }
  
  /**
   * 解锁键
   * @param {string} key - 要解锁的键
   * @param {string} [holder] - 锁持有者ID，如果提供，只有持有者才能解锁
   * @returns {boolean} 是否成功解锁
   */
  unlock(key, holder) {
    if (!this.isLocked(key)) {
      return true; // 键未被锁定
    }
    
    if (holder && this.metadata.locks[key].holder !== holder) {
      this.logger.warn(`尝试由非持有者 ${holder} 解锁键 ${key}`);
      return false;
    }
    
    const lockInfo = this.metadata.locks[key];
    delete this.metadata.locks[key];
    
    // 发出解锁事件
    this.emitter.emit(StateEvents.UNLOCKED, {
      namespace: this.namespace,
      key,
      previousHolder: lockInfo.holder
    });
    
    if (this.eventBus) {
      this.eventBus.publish(StateEvents.UNLOCKED, {
        namespace: this.namespace,
        key,
        previousHolder: lockInfo.holder,
        nodeId: this.nodeId
      });
    }
    
    return true;
  }
  
  /**
   * 检查键是否被锁定
   * @param {string} key - 要检查的键
   * @returns {boolean} 是否被锁定
   */
  isLocked(key) {
    if (!this.metadata.locks[key]) {
      return false;
    }
    
    // 检查锁是否过期
    if (this.metadata.locks[key].expires < Date.now()) {
      delete this.metadata.locks[key];
      return false;
    }
    
    return true;
  }
  
  /**
   * 注册变更事件监听器
   * @param {Function} listener - 监听器函数
   * @returns {Function} 用于移除监听器的函数
   */
  onChange(listener) {
    this.emitter.on(StateEvents.CHANGED, listener);
    return () => this.emitter.off(StateEvents.CHANGED, listener);
  }
  
  /**
   * 批量更新数据
   * @param {Object} updates - 更新数据
   * @param {number} version - 更新后的版本号
   * @param {number} lastUpdated - 更新时间戳
   */
  async updateData(updates, version, lastUpdated) {
    // 将更新合并到当前数据
    for (const [key, value] of Object.entries(updates)) {
      this.data[key] = value;
    }
    
    // 更新元数据
    this.metadata.version = version;
    this.metadata.lastUpdated = lastUpdated || Date.now();
    
    // 发出变更事件
    this._emitChangeEvent(
      Object.keys(updates).map(key => ({
        key,
        newValue: updates[key],
        operation: 'update',
        timestamp: this.metadata.lastUpdated,
        remote: true
      }))
    );
  }
  
  /**
   * 替换所有数据
   * @param {Object} newData - 新数据
   * @param {number} version - 新版本号
   * @param {number} lastUpdated - 更新时间戳
   */
  async replaceData(newData, version, lastUpdated) {
    const previousData = { ...this.data };
    this.data = { ...newData };
    
    // 更新元数据
    this.metadata.version = version;
    this.metadata.lastUpdated = lastUpdated || Date.now();
    
    // 发出替换事件
    this.emitter.emit(StateEvents.REPLACED, {
      namespace: this.namespace,
      previousData,
      newData: this.data,
      version: this.metadata.version,
      timestamp: this.metadata.lastUpdated
    });
    
    if (this.eventBus) {
      this.eventBus.publish(StateEvents.REPLACED, {
        namespace: this.namespace,
        version: this.metadata.version,
        timestamp: this.metadata.lastUpdated,
        nodeId: this.nodeId
      });
    }
  }
  
  /**
   * 关闭存储
   */
  close() {
    this.emitter.removeAllListeners();
    this.logger.debug(`命名空间 ${this.namespace} 的状态存储已关闭`);
  }
  
  /**
   * 获取键值数量
   * @returns {number} 键值对数量
   */
  get size() {
    return Object.keys(this.data).length;
  }
  
  /**
   * 获取所有键
   * @returns {string[]} 键数组
   */
  get keys() {
    return Object.keys(this.data);
  }
  
  /**
   * 获取所有活动锁的数量
   * @returns {number} 锁数量
   */
  get lockCount() {
    // 清除过期的锁
    this._clearExpiredLocks();
    return Object.keys(this.metadata.locks).length;
  }
  
  /**
   * 发出变更事件
   * @private
   * @param {Array} changes - 变更数组
   */
  _emitChangeEvent(changes = []) {
    if (changes.length === 0) return;
    
    const event = {
      namespace: this.namespace,
      changes,
      version: this.metadata.version,
      timestamp: this.metadata.lastUpdated,
      nodeId: this.nodeId
    };
    
    // 本地事件
    this.emitter.emit(StateEvents.CHANGED, event);
    
    // 分布式事件
    if (this.eventBus) {
      this.eventBus.publish(StateEvents.CHANGED, event);
    }
  }
  
  /**
   * 清除过期的锁
   * @private
   */
  _clearExpiredLocks() {
    const now = Date.now();
    let cleared = 0;
    
    for (const [key, lock] of Object.entries(this.metadata.locks)) {
      if (lock.expires < now) {
        delete this.metadata.locks[key];
        cleared++;
      }
    }
    
    if (cleared > 0) {
      this.logger.debug(`清除了 ${cleared} 个过期的锁`);
    }
  }
}

module.exports = {
  StateStore,
  StateEvents
}; 