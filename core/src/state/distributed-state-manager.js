/**
 * ACIP分布式状态管理
 * 
 * 实现ACIP v0.2协议规范中定义的分布式状态管理功能，支持:
 * - 多种一致性模型
 * - 状态同步机制
 * - 冲突检测和解决
 * - 状态分区和分片
 * 
 * @module state
 */

const { v4: uuidv4 } = require('uuid');
const { createLogger } = require('../utils/logger');
const { StateStore } = require('./state-store');
const { ConsistencyModels } = require('./consistency-models');
const { ConflictResolver } = require('./conflict-resolver');

/**
 * 分布式状态管理器类
 */
class DistributedStateManager {
  /**
   * 创建分布式状态管理器
   * @param {Object} options - 配置选项 
   * @param {Object} eventBus - 事件总线实例
   */
  constructor(options = {}, eventBus) {
    this.nodeId = options.nodeId || uuidv4();
    this.storeMap = new Map();
    this.eventBus = eventBus;
    this.logger = options.logger || createLogger('DistributedStateManager');
    
    // 配置默认一致性模型
    this.defaultConsistencyModel = options.defaultConsistencyModel || ConsistencyModels.EVENTUAL;
    
    // 节点列表
    this.nodes = new Map();
    
    // 同步配置
    this.syncConfig = {
      interval: options.syncInterval || 5000,  // ms
      batchSize: options.syncBatchSize || 100,
      retries: options.syncRetries || 3,
      autoSync: options.autoSync !== false
    };
    
    // 冲突解析器
    this.conflictResolver = new ConflictResolver(options.conflictResolution);
    
    // 分区配置
    this.partitionConfig = options.partitioning || {
      enabled: false,
      strategy: 'hash',
      partitionCount: 1,
      replicationFactor: 1
    };
    
    this.logger.info(`分布式状态管理器已初始化，节点ID: ${this.nodeId}`);
    
    // 设置事件监听器
    if (this.eventBus) {
      this._setupEventListeners();
    }
    
    // 如果启用了自动同步，开始同步循环
    if (this.syncConfig.autoSync) {
      this._startSyncLoop();
    }
  }
  
  /**
   * 创建或获取状态存储
   * @param {string} namespace - 状态命名空间
   * @param {Object} options - 存储选项
   * @returns {StateStore} 状态存储实例
   */
  getStore(namespace, options = {}) {
    if (this.storeMap.has(namespace)) {
      return this.storeMap.get(namespace);
    }
    
    const store = new StateStore(namespace, {
      ...options,
      nodeId: this.nodeId,
      consistencyModel: options.consistencyModel || this.defaultConsistencyModel,
      eventBus: this.eventBus
    });
    
    this.storeMap.set(namespace, store);
    this.logger.debug(`为命名空间 ${namespace} 创建了新的状态存储`);
    
    return store;
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
      connectedAt: Date.now(),
      lastSync: null
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
   * 手动触发与远程节点的状态同步
   * @param {string} [nodeId] - 可选的特定节点ID，如果不提供则同步所有节点
   * @returns {Promise<Object>} 同步结果
   */
  async syncWithNodes(nodeId) {
    if (nodeId && this.nodes.has(nodeId)) {
      return this._syncWithNode(this.nodes.get(nodeId));
    }
    
    const results = {};
    const syncPromises = [];
    
    for (const [id, node] of this.nodes.entries()) {
      if (node.status === 'connected' && id !== this.nodeId) {
        syncPromises.push(
          this._syncWithNode(node)
            .then(result => { results[id] = result; })
            .catch(error => { 
              this.logger.error(`与节点 ${id} 同步失败:`, error);
              results[id] = { success: false, error: error.message };
            })
        );
      }
    }
    
    await Promise.all(syncPromises);
    return results;
  }
  
  /**
   * 配置分区策略
   * @param {Object} config - 分区配置
   */
  configurePartitioning(config) {
    this.partitionConfig = {
      ...this.partitionConfig,
      ...config
    };
    
    // 如果启用分区，重新计算所有存储的分区映射
    if (this.partitionConfig.enabled) {
      this._recalculatePartitions();
    }
    
    this.logger.info(`更新分区配置: ${JSON.stringify(this.partitionConfig)}`);
  }
  
  /**
   * 获取命名空间的所有者节点
   * @param {string} namespace - 状态命名空间
   * @param {string} key - 状态键
   * @returns {string|null} 负责此键的节点ID
   */
  getResponsibleNode(namespace, key) {
    if (!this.partitionConfig.enabled) {
      return null; // 未启用分区，所有节点都负责所有状态
    }
    
    const partitionIndex = this._calculatePartition(namespace, key);
    const nodeIds = Array.from(this.nodes.keys());
    
    // 如果没有节点，返回null
    if (nodeIds.length === 0) {
      return null;
    }
    
    // 计算哪个节点负责此分区
    return nodeIds[partitionIndex % nodeIds.length];
  }
  
  /**
   * 获取当前活跃存储的数量
   * @returns {number} 存储数量
   */
  get storeCount() {
    return this.storeMap.size;
  }
  
  /**
   * 获取当前连接的节点数量
   * @returns {number} 节点数量
   */
  get nodeCount() {
    return this.nodes.size;
  }
  
  /**
   * 销毁管理器，停止所有同步
   */
  destroy() {
    this._stopSyncLoop();
    
    // 清理事件监听器
    if (this.eventBus) {
      // 取消所有事件订阅
    }
    
    // 关闭所有存储
    for (const store of this.storeMap.values()) {
      store.close();
    }
    
    this.storeMap.clear();
    this.nodes.clear();
    
    this.logger.info('分布式状态管理器已销毁');
  }
  
  /**
   * 设置事件监听器
   * @private
   */
  _setupEventListeners() {
    // 订阅节点状态变化事件
    if (this.eventBus.subscribe) {
      this.eventBus.subscribe('node:connected', event => {
        const { nodeId } = event.payload;
        if (this.nodes.has(nodeId)) {
          const node = this.nodes.get(nodeId);
          node.status = 'connected';
          node.lastConnected = Date.now();
          this.logger.debug(`节点 ${nodeId} 已连接`);
        }
      });
      
      this.eventBus.subscribe('node:disconnected', event => {
        const { nodeId } = event.payload;
        if (this.nodes.has(nodeId)) {
          const node = this.nodes.get(nodeId);
          node.status = 'disconnected';
          node.lastDisconnected = Date.now();
          this.logger.debug(`节点 ${nodeId} 已断开连接`);
        }
      });
      
      // 订阅状态同步请求
      this.eventBus.subscribe('state:syncRequest', event => {
        this._handleSyncRequest(event.payload, event.source);
      });
      
      // 订阅状态同步响应
      this.eventBus.subscribe('state:syncResponse', event => {
        this._handleSyncResponse(event.payload, event.source);
      });
    }
  }
  
  /**
   * 开始同步循环
   * @private
   */
  _startSyncLoop() {
    if (this._syncIntervalId) {
      this._stopSyncLoop();
    }
    
    this._syncIntervalId = setInterval(() => {
      this.syncWithNodes().catch(error => {
        this.logger.error('自动同步过程中出错:', error);
      });
    }, this.syncConfig.interval);
    
    this.logger.debug(`同步循环已启动，间隔: ${this.syncConfig.interval}ms`);
  }
  
  /**
   * 停止同步循环
   * @private
   */
  _stopSyncLoop() {
    if (this._syncIntervalId) {
      clearInterval(this._syncIntervalId);
      this._syncIntervalId = null;
      this.logger.debug('同步循环已停止');
    }
  }
  
  /**
   * 与特定节点同步
   * @private
   * @param {Object} node - 节点
   * @returns {Promise<Object>} 同步结果
   */
  async _syncWithNode(node) {
    if (node.status !== 'connected') {
      return { success: false, reason: 'node-not-connected' };
    }
    
    try {
      // 准备同步请求
      const syncRequest = this._prepareSyncRequest(node);
      
      // 发送同步请求
      if (node.sendSyncRequest && typeof node.sendSyncRequest === 'function') {
        const response = await node.sendSyncRequest(syncRequest);
        await this._processSyncResponse(response, node.id);
        
        // 更新节点的最后同步时间
        node.lastSync = Date.now();
        
        return { success: true };
      } else {
        // 通过事件总线发送同步请求
        if (this.eventBus) {
          this.eventBus.publish('state:syncRequest', syncRequest, {
            routing: {
              targetNodes: [node.id]
            }
          });
          
          // 注意：这里我们不等待响应，因为它将通过事件异步处理
          node.lastSyncAttempt = Date.now();
          return { success: true, async: true };
        }
        
        return { success: false, reason: 'no-sync-method' };
      }
    } catch (error) {
      this.logger.error(`与节点 ${node.id} 同步时出错:`, error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * 准备同步请求
   * @private
   * @param {Object} node - 目标节点
   * @returns {Object} 同步请求
   */
  _prepareSyncRequest(node) {
    const request = {
      requestId: uuidv4(),
      sourceNodeId: this.nodeId,
      targetNodeId: node.id,
      timestamp: Date.now(),
      syncPoints: {}
    };
    
    // 为每个存储添加同步点
    for (const [namespace, store] of this.storeMap.entries()) {
      if (!this._isResponsibleForNamespace(node.id, namespace)) {
        continue;
      }
      
      request.syncPoints[namespace] = {
        version: store.metadata.version,
        lastUpdated: store.metadata.lastUpdated
      };
    }
    
    return request;
  }
  
  /**
   * 处理同步请求
   * @private
   * @param {Object} request - 同步请求
   * @param {string} sourceNodeId - 源节点ID
   */
  _handleSyncRequest(request, sourceNodeId) {
    this.logger.debug(`收到来自节点 ${sourceNodeId} 的同步请求`);
    
    // 准备同步响应
    const response = {
      requestId: request.requestId,
      sourceNodeId: this.nodeId,
      targetNodeId: sourceNodeId,
      timestamp: Date.now(),
      states: {}
    };
    
    // 为每个命名空间处理同步
    for (const [namespace, syncPoint] of Object.entries(request.syncPoints)) {
      const store = this.storeMap.get(namespace);
      
      if (!store) {
        continue; // 我们没有这个命名空间的数据
      }
      
      // 检查版本，看看我们是否有更新的数据
      if (store.metadata.version > syncPoint.version || 
          (store.metadata.version === syncPoint.version && 
           store.metadata.lastUpdated > syncPoint.lastUpdated)) {
        
        // 我们有更新的数据，发送增量更新
        response.states[namespace] = {
          version: store.metadata.version,
          lastUpdated: store.metadata.lastUpdated,
          data: this._getIncrementalState(store, syncPoint)
        };
      }
    }
    
    // 发送响应
    if (this.eventBus) {
      this.eventBus.publish('state:syncResponse', response, {
        routing: {
          targetNodes: [sourceNodeId]
        }
      });
    }
  }
  
  /**
   * 处理同步响应
   * @private
   * @param {Object} response - 同步响应
   * @param {string} sourceNodeId - 源节点ID
   */
  async _handleSyncResponse(response, sourceNodeId) {
    this.logger.debug(`收到来自节点 ${sourceNodeId} 的同步响应`);
    
    await this._processSyncResponse(response, sourceNodeId);
    
    // 更新节点的最后同步时间
    if (this.nodes.has(sourceNodeId)) {
      const node = this.nodes.get(sourceNodeId);
      node.lastSync = Date.now();
    }
  }
  
  /**
   * 处理同步响应数据
   * @private
   * @param {Object} response - 同步响应
   * @param {string} sourceNodeId - 源节点ID
   */
  async _processSyncResponse(response, sourceNodeId) {
    // 处理每个命名空间的状态更新
    for (const [namespace, state] of Object.entries(response.states)) {
      const store = this.storeMap.get(namespace);
      
      if (!store) {
        // 我们没有这个命名空间的存储，创建一个
        const newStore = this.getStore(namespace);
        await this._mergeRemoteState(newStore, state, sourceNodeId);
        continue;
      }
      
      // 如果远程版本更新，则合并状态
      if (state.version > store.metadata.version || 
          (state.version === store.metadata.version && 
           state.lastUpdated > store.metadata.lastUpdated)) {
        await this._mergeRemoteState(store, state, sourceNodeId);
      } else if (state.version === store.metadata.version && 
                state.lastUpdated === store.metadata.lastUpdated) {
        this.logger.debug(`命名空间 ${namespace} 已同步`);
      } else {
        // 我们的版本更新，可能应该发送数据给对方
        this.logger.debug(`命名空间 ${namespace} 的本地版本更新，考虑向节点 ${sourceNodeId} 发送更新`);
      }
    }
  }
  
  /**
   * 合并远程状态
   * @private
   * @param {StateStore} store - 本地存储
   * @param {Object} remoteState - 远程状态
   * @param {string} sourceNodeId - 源节点ID
   */
  async _mergeRemoteState(store, remoteState, sourceNodeId) {
    try {
      // 根据一致性模型执行合并
      switch (store.consistencyModel) {
        case ConsistencyModels.STRONG:
          // 强一致性：直接替换我们的状态
          await store.replaceData(remoteState.data, remoteState.version, remoteState.lastUpdated);
          break;
          
        case ConsistencyModels.CAUSAL:
          // 因果一致性：使用冲突解析器合并状态
          await this._mergeCausalState(store, remoteState, sourceNodeId);
          break;
          
        case ConsistencyModels.EVENTUAL:
        default:
          // 最终一致性：简单的版本比较，使用增量更新
          if (remoteState.version > store.metadata.version) {
            await store.updateData(remoteState.data, remoteState.version, remoteState.lastUpdated);
          } else {
            // 版本相同但时间戳不同，合并变更
            await this._mergeChanges(store, remoteState, sourceNodeId);
          }
          break;
      }
      
      this.logger.debug(`命名空间 ${store.namespace} 的状态已与节点 ${sourceNodeId} 同步`);
    } catch (error) {
      this.logger.error(`合并命名空间 ${store.namespace} 的远程状态时出错:`, error);
      throw error;
    }
  }
  
  /**
   * 合并因果一致性状态
   * @private
   * @param {StateStore} store - 本地存储
   * @param {Object} remoteState - 远程状态
   * @param {string} sourceNodeId - 源节点ID
   */
  async _mergeCausalState(store, remoteState, sourceNodeId) {
    // 实现因果一致性合并逻辑
    const conflicts = [];
    
    // 检测冲突
    for (const [key, value] of Object.entries(remoteState.data)) {
      if (store.data[key] !== undefined && 
          JSON.stringify(store.data[key]) !== JSON.stringify(value)) {
        conflicts.push({ key, localValue: store.data[key], remoteValue: value });
      }
    }
    
    // 解决冲突
    if (conflicts.length > 0) {
      const resolvedData = await this.conflictResolver.resolve(
        store.namespace, 
        conflicts, 
        { localNodeId: this.nodeId, remoteNodeId: sourceNodeId }
      );
      
      // 更新解决后的数据
      for (const [key, value] of Object.entries(resolvedData)) {
        store.data[key] = value;
      }
      
      // 更新版本和时间戳
      store.metadata.version = Math.max(store.metadata.version, remoteState.version);
      store.metadata.lastUpdated = Date.now();
    } else {
      // 没有冲突，合并更新
      await store.updateData(remoteState.data, remoteState.version, remoteState.lastUpdated);
    }
  }
  
  /**
   * 合并变更
   * @private
   * @param {StateStore} store - 本地存储
   * @param {Object} remoteState - 远程状态
   * @param {string} sourceNodeId - 源节点ID
   */
  async _mergeChanges(store, remoteState, sourceNodeId) {
    // 合并远程数据中的更改
    for (const [key, value] of Object.entries(remoteState.data)) {
      // 简单的合并策略：以最后更新时间为准
      store.data[key] = value;
    }
    
    // 更新元数据
    store.metadata.version = Math.max(store.metadata.version, remoteState.version);
    store.metadata.lastUpdated = Date.now();
    
    // 触发更新事件
    store._emitChangeEvent();
  }
  
  /**
   * 获取增量状态
   * @private
   * @param {StateStore} store - 本地存储
   * @param {Object} syncPoint - 同步点
   * @returns {Object} 增量状态
   */
  _getIncrementalState(store, syncPoint) {
    // 如果版本差异大，或者是首次同步，发送全部数据
    if (syncPoint.version === 0 || 
        store.metadata.version - syncPoint.version > 10) {
      return { ...store.data };
    }
    
    // 否则只发送自上次同步以来更改的数据
    const incrementalData = {};
    
    // 在实际实现中，我们需要跟踪键的更改时间
    // 这里简化处理，只发送所有数据的子集
    const keys = Object.keys(store.data);
    const keysToSend = keys.slice(0, Math.min(keys.length, this.syncConfig.batchSize));
    
    for (const key of keysToSend) {
      incrementalData[key] = store.data[key];
    }
    
    return incrementalData;
  }
  
  /**
   * 重新计算分区映射
   * @private
   */
  _recalculatePartitions() {
    // 实现分区重新计算逻辑
    this.logger.info('重新计算分区映射');
    
    // 实际实现中，这里会根据分区策略和当前节点状态
    // 重新分配分区责任
  }
  
  /**
   * 计算键所属的分区
   * @private
   * @param {string} namespace - 命名空间
   * @param {string} key - 键
   * @returns {number} 分区索引
   */
  _calculatePartition(namespace, key) {
    const fullKey = `${namespace}:${key}`;
    
    if (!this.partitionConfig.enabled) {
      return 0;
    }
    
    switch (this.partitionConfig.strategy) {
      case 'key-range':
        // 基于键范围的分区
        const firstChar = fullKey.charAt(0).toLowerCase();
        const charCode = firstChar.charCodeAt(0);
        return Math.floor((charCode - 97) / 26 * this.partitionConfig.partitionCount);
        
      case 'custom':
        // 自定义分区映射函数
        if (this.partitionConfig.partitionMapping && 
            typeof this.partitionConfig.partitionMapping === 'function') {
          return this.partitionConfig.partitionMapping(fullKey);
        }
        // 如果没有自定义函数，回退到哈希
        
      case 'hash':
      default:
        // 哈希分区 (简单实现)
        let hash = 0;
        for (let i = 0; i < fullKey.length; i++) {
          hash = ((hash << 5) - hash) + fullKey.charCodeAt(i);
          hash |= 0; // 转换为32位整数
        }
        return Math.abs(hash % this.partitionConfig.partitionCount);
    }
  }
  
  /**
   * 检查节点是否负责特定命名空间
   * @private
   * @param {string} nodeId - 节点ID
   * @param {string} namespace - 命名空间
   * @returns {boolean} 是否负责
   */
  _isResponsibleForNamespace(nodeId, namespace) {
    if (!this.partitionConfig.enabled) {
      return true; // 未启用分区，所有节点负责所有数据
    }
    
    // 实际实现中，这里会检查该命名空间是否分配给了指定节点
    // 简化起见，我们假设所有节点都负责所有命名空间
    return true;
  }
}

module.exports = {
  DistributedStateManager,
  ConsistencyModels
}; 