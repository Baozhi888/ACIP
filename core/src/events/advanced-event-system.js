/**
 * ACIP高级事件系统
 * 
 * 实现ACIP v0.2协议规范中定义的高级事件系统，支持:
 * - 事件过滤和优先级
 * - 分布式事件处理
 * - 事件持久化
 * - 高级事件路由
 * 
 * @module events
 */

const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');
const minimatch = require('minimatch');
const { createLogger } = require('../utils/logger');

/**
 * 事件优先级
 */
const EventPriority = {
  HIGHEST: 1,
  HIGH: 2,
  NORMAL: 3,
  LOW: 4,
  LOWEST: 5
};

/**
 * 事件持久化存储类型
 */
const StorageType = {
  MEMORY: 'memory',
  DISK: 'disk',
  DATABASE: 'database'
};

/**
 * 创建新的事件
 * @param {string} type - 事件类型
 * @param {any} payload - 事件数据
 * @param {Object} options - 事件选项
 * @returns {Object} 事件对象
 */
function createEvent(type, payload, options = {}) {
  return {
    id: options.id || uuidv4(),
    type,
    source: options.source || 'unknown',
    timestamp: options.timestamp || Date.now(),
    priority: options.priority || EventPriority.NORMAL,
    correlationId: options.correlationId,
    payload,
    metadata: {
      version: options.version || '1.0',
      ttl: options.ttl,
      routing: options.routing || {
        broadcast: false
      }
    }
  };
}

/**
 * 高级事件总线类
 */
class AdvancedEventBus {
  /**
   * 创建新的高级事件总线实例
   * @param {Object} options - 事件总线选项
   */
  constructor(options = {}) {
    this.emitter = new EventEmitter();
    this.nodeId = options.nodeId || uuidv4();
    this.subscriptions = new Map();
    this.nodes = new Map();
    this.persistenceEnabled = !!options.persistence;
    this.persistenceOptions = options.persistence || {
      storage: StorageType.MEMORY,
      retention: {
        count: 1000
      }
    };
    this.logger = options.logger || createLogger('AdvancedEventBus');
    
    // 事件存储
    this.eventStore = [];
    
    // 设置最大监听器数量
    if (options.maxListeners) {
      this.emitter.setMaxListeners(options.maxListeners);
    }
    
    this.logger.info(`高级事件总线已初始化，节点ID: ${this.nodeId}`);
  }

  /**
   * 发布事件
   * @param {string} type - 事件类型
   * @param {any} payload - 事件数据
   * @param {Object} options - 事件选项
   * @returns {string} 事件ID
   */
  publish(type, payload, options = {}) {
    const event = createEvent(type, payload, {
      ...options,
      source: options.source || this.nodeId
    });
    
    this.logger.debug(`发布事件: ${event.id}, 类型: ${event.type}`);
    
    // 本地处理事件
    this._processLocalEvent(event);
    
    // 分布式处理 - 如果配置了路由
    if (event.metadata.routing && 
        (event.metadata.routing.broadcast || 
         (event.metadata.routing.targetNodes && event.metadata.routing.targetNodes.length > 0))) {
      this._distributeEvent(event);
    }
    
    // 事件持久化
    if (this.persistenceEnabled) {
      this._persistEvent(event);
    }
    
    return event.id;
  }

  /**
   * 订阅事件
   * @param {string|string[]} patterns - 事件类型模式，支持glob
   * @param {Function} listener - 监听器函数
   * @param {Object} options - 订阅选项
   * @returns {Object} 订阅对象
   */
  subscribe(patterns, listener, options = {}) {
    const subscriptionId = options.id || uuidv4();
    const normalizedPatterns = Array.isArray(patterns) ? patterns : [patterns];
    
    const subscription = {
      id: subscriptionId,
      patterns: normalizedPatterns,
      listener,
      filter: options.filter,
      priority: options.priority || EventPriority.NORMAL,
      metadata: {
        nodeId: this.nodeId,
        temporary: !!options.temporary,
        expiresAt: options.expiresAt
      }
    };
    
    this.subscriptions.set(subscriptionId, subscription);
    this.logger.debug(`创建订阅: ${subscriptionId}, 模式: ${normalizedPatterns.join(', ')}`);
    
    // 如果是临时订阅并设置了过期时间，设置过期处理
    if (subscription.metadata.temporary && subscription.metadata.expiresAt) {
      const timeToExpire = subscription.metadata.expiresAt - Date.now();
      if (timeToExpire > 0) {
        setTimeout(() => {
          this.unsubscribe(subscriptionId);
        }, timeToExpire);
      } else {
        this.logger.warn(`订阅 ${subscriptionId} 创建时已过期`);
      }
    }
    
    return {
      id: subscriptionId,
      unsubscribe: () => this.unsubscribe(subscriptionId)
    };
  }

  /**
   * 取消订阅
   * @param {string} subscriptionId - 订阅ID
   * @returns {boolean} 是否成功取消
   */
  unsubscribe(subscriptionId) {
    if (!this.subscriptions.has(subscriptionId)) {
      this.logger.warn(`尝试取消不存在的订阅: ${subscriptionId}`);
      return false;
    }
    
    this.subscriptions.delete(subscriptionId);
    this.logger.debug(`取消订阅: ${subscriptionId}`);
    return true;
  }

  /**
   * 添加远程节点
   * @param {Object} node - 节点信息
   * @returns {string} 节点ID
   */
  addNode(node) {
    const nodeId = node.id || uuidv4();
    this.nodes.set(nodeId, {
      ...node,
      id: nodeId,
      status: 'connected',
      connectedAt: Date.now()
    });
    
    this.logger.info(`添加远程节点: ${nodeId}`);
    return nodeId;
  }

  /**
   * 移除远程节点
   * @param {string} nodeId - 节点ID
   * @returns {boolean} 是否成功移除
   */
  removeNode(nodeId) {
    if (!this.nodes.has(nodeId)) {
      this.logger.warn(`尝试移除不存在的节点: ${nodeId}`);
      return false;
    }
    
    this.nodes.delete(nodeId);
    this.logger.info(`移除远程节点: ${nodeId}`);
    return true;
  }

  /**
   * 检索事件历史
   * @param {Object} filter - 过滤条件
   * @param {Object} options - 检索选项
   * @returns {Array} 匹配的事件数组
   */
  getEventHistory(filter = {}, options = {}) {
    if (!this.persistenceEnabled) {
      this.logger.warn('尝试获取事件历史，但持久化未启用');
      return [];
    }
    
    let results = [...this.eventStore];
    
    // 应用过滤
    if (filter.type) {
      const typePatterns = Array.isArray(filter.type) ? filter.type : [filter.type];
      results = results.filter(event => 
        typePatterns.some(pattern => minimatch(event.type, pattern))
      );
    }
    
    if (filter.source) {
      results = results.filter(event => event.source === filter.source);
    }
    
    if (filter.correlationId) {
      results = results.filter(event => event.correlationId === filter.correlationId);
    }
    
    if (filter.timeStart) {
      results = results.filter(event => event.timestamp >= filter.timeStart);
    }
    
    if (filter.timeEnd) {
      results = results.filter(event => event.timestamp <= filter.timeEnd);
    }
    
    // 应用排序
    if (options.sort) {
      const sortField = options.sort.field || 'timestamp';
      const sortDir = options.sort.direction === 'asc' ? 1 : -1;
      results.sort((a, b) => {
        if (a[sortField] < b[sortField]) return -1 * sortDir;
        if (a[sortField] > b[sortField]) return 1 * sortDir;
        return 0;
      });
    }
    
    // 应用分页
    if (options.limit) {
      const start = options.offset || 0;
      const end = start + options.limit;
      results = results.slice(start, end);
    }
    
    return results;
  }

  /**
   * 清除事件历史
   * @param {Object} filter - 过滤条件
   * @returns {number} 清除的事件数量
   */
  clearEventHistory(filter = {}) {
    if (!this.persistenceEnabled) {
      this.logger.warn('尝试清除事件历史，但持久化未启用');
      return 0;
    }
    
    const initialCount = this.eventStore.length;
    
    // 应用过滤条件
    if (Object.keys(filter).length === 0) {
      // 清除所有事件
      this.eventStore = [];
    } else {
      this.eventStore = this.eventStore.filter(event => {
        // 保留不匹配过滤条件的事件
        if (filter.type && minimatch(event.type, filter.type)) return false;
        if (filter.source && event.source === filter.source) return false;
        if (filter.correlationId && event.correlationId === filter.correlationId) return false;
        if (filter.before && event.timestamp < filter.before) return false;
        if (filter.after && event.timestamp > filter.after) return false;
        return true;
      });
    }
    
    const removedCount = initialCount - this.eventStore.length;
    this.logger.debug(`清除了 ${removedCount} 个事件`);
    
    return removedCount;
  }

  /**
   * 在本地处理事件
   * @private
   * @param {Object} event - 事件对象
   */
  _processLocalEvent(event) {
    // 获取匹配此事件的所有订阅
    const matchingSubscriptions = Array.from(this.subscriptions.values()).filter(sub => {
      // 检查是否已过期
      if (sub.metadata.expiresAt && sub.metadata.expiresAt < Date.now()) {
        this.unsubscribe(sub.id);
        return false;
      }
      
      // 检查模式匹配
      const patternMatched = sub.patterns.some(pattern => minimatch(event.type, pattern));
      if (!patternMatched) return false;
      
      // 检查自定义过滤器
      if (sub.filter && typeof sub.filter === 'function') {
        try {
          return sub.filter(event);
        } catch (error) {
          this.logger.error(`订阅 ${sub.id} 的过滤器执行错误:`, error);
          return false;
        }
      }
      
      return true;
    });
    
    // 按优先级排序
    matchingSubscriptions.sort((a, b) => a.priority - b.priority);
    
    // 触发所有匹配的监听器
    for (const sub of matchingSubscriptions) {
      try {
        this.logger.debug(`触发订阅 ${sub.id} 的监听器，事件: ${event.id}`);
        sub.listener(event);
      } catch (error) {
        this.logger.error(`订阅 ${sub.id} 的监听器执行错误:`, error);
      }
    }
    
    // 同时发出原始事件供原始EventEmitter接口使用
    this.emitter.emit(event.type, event);
  }

  /**
   * 分发事件到远程节点
   * @private
   * @param {Object} event - 事件对象
   */
  _distributeEvent(event) {
    // 如果是广播模式，发送给所有连接的节点
    if (event.metadata.routing.broadcast) {
      for (const [nodeId, node] of this.nodes.entries()) {
        if (nodeId !== this.nodeId && node.status === 'connected') {
          this._sendEventToNode(event, node);
        }
      }
      return;
    }
    
    // 否则发送到特定目标节点
    if (event.metadata.routing.targetNodes && event.metadata.routing.targetNodes.length > 0) {
      for (const targetNodeId of event.metadata.routing.targetNodes) {
        const node = this.nodes.get(targetNodeId);
        if (node && node.status === 'connected') {
          this._sendEventToNode(event, node);
        } else {
          this.logger.warn(`目标节点 ${targetNodeId} 不可用，事件无法发送`);
        }
      }
    }
  }

  /**
   * 发送事件到特定节点
   * @private
   * @param {Object} event - 事件对象
   * @param {Object} node - 目标节点
   */
  _sendEventToNode(event, node) {
    this.logger.debug(`发送事件 ${event.id} 到节点 ${node.id}`);
    
    // 实际实现会使用节点的通信协议发送事件
    // 这里只是一个模拟实现
    if (node.sendEvent && typeof node.sendEvent === 'function') {
      try {
        node.sendEvent(event);
      } catch (error) {
        this.logger.error(`向节点 ${node.id} 发送事件失败:`, error);
      }
    } else {
      this.logger.warn(`节点 ${node.id} 没有实现sendEvent方法`);
    }
  }

  /**
   * 接收来自远程节点的事件
   * @param {Object} event - 事件对象
   * @param {string} sourceNodeId - 源节点ID
   */
  receiveEvent(event, sourceNodeId) {
    this.logger.debug(`从节点 ${sourceNodeId} 接收事件 ${event.id}`);
    
    // 防止事件循环
    if (event.source === this.nodeId) {
      this.logger.debug(`忽略来自自身的事件: ${event.id}`);
      return;
    }
    
    // 本地处理收到的远程事件
    this._processLocalEvent(event);
    
    // 如果需要进一步路由，继续分发
    if (event.metadata.routing && 
        event.metadata.routing.broadcast && 
        sourceNodeId) {
      
      // 将事件转发给除了源节点和自身以外的所有节点
      for (const [nodeId, node] of this.nodes.entries()) {
        if (nodeId !== this.nodeId && 
            nodeId !== sourceNodeId && 
            node.status === 'connected') {
          this._sendEventToNode(event, node);
        }
      }
    }
  }

  /**
   * 持久化事件
   * @private
   * @param {Object} event - 事件对象
   */
  _persistEvent(event) {
    if (!this.persistenceEnabled) return;
    
    this.eventStore.push(event);
    this.logger.debug(`事件 ${event.id} 已持久化`);
    
    // 检查是否超过保留限制
    const { retention } = this.persistenceOptions;
    
    if (retention.count && this.eventStore.length > retention.count) {
      // 移除最旧的事件
      const overflow = this.eventStore.length - retention.count;
      this.eventStore.splice(0, overflow);
      this.logger.debug(`移除了 ${overflow} 个旧事件以遵守保留策略`);
    }
    
    if (retention.time) {
      const cutoffTime = Date.now() - retention.time;
      const initialCount = this.eventStore.length;
      
      // 移除过期事件
      this.eventStore = this.eventStore.filter(e => e.timestamp >= cutoffTime);
      
      const removedCount = initialCount - this.eventStore.length;
      if (removedCount > 0) {
        this.logger.debug(`移除了 ${removedCount} 个过期事件以遵守保留策略`);
      }
    }
  }

  /**
   * 获取当前订阅数量
   * @returns {number} 订阅数量
   */
  get subscriptionCount() {
    return this.subscriptions.size;
  }

  /**
   * 获取当前连接的节点数量
   * @returns {number} 节点数量
   */
  get nodeCount() {
    return this.nodes.size;
  }

  /**
   * 获取事件存储中的事件数量
   * @returns {number} 事件数量
   */
  get eventCount() {
    return this.eventStore.length;
  }
}

// 导出模块
module.exports = {
  AdvancedEventBus,
  EventPriority,
  StorageType,
  createEvent
}; 