/**
 * ACIP一致性模型
 * 
 * 定义分布式状态管理中支持的一致性模型
 * 
 * @module state
 */

/**
 * 一致性模型枚举
 */
const ConsistencyModels = {
  /**
   * 最终一致性
   * 
   * 所有节点最终将看到相同的状态，但可能在不同时间点有临时差异。
   * 优点：低延迟，高可用性
   * 缺点：可能看到暂时不一致的数据
   */
  EVENTUAL: 'eventual',
  
  /**
   * 因果一致性
   * 
   * 保证因果相关的操作以正确顺序被观察到。
   * 例如，如果操作A导致操作B，那么所有节点都会先看到A再看到B。
   * 优点：维护操作间的因果关系
   * 缺点：需要额外的元数据来跟踪因果关系
   */
  CAUSAL: 'causal',
  
  /**
   * 强一致性
   * 
   * 所有节点在任何时刻都看到完全相同的状态。
   * 优点：数据始终一致
   * 缺点：高延迟，依赖于共识算法
   */
  STRONG: 'strong'
};

/**
 * 一致性配置生成器
 */
class ConsistencyConfigFactory {
  /**
   * 创建最终一致性配置
   * @param {Object} options - 配置选项
   * @returns {Object} 一致性配置
   */
  static createEventualConfig(options = {}) {
    return {
      model: ConsistencyModels.EVENTUAL,
      syncInterval: options.syncInterval || 5000,  // ms
      conflictResolution: options.conflictResolution || 'last-write-wins',
      gossipFactor: options.gossipFactor || 0.5,   // 随机传播因子
      batchSize: options.batchSize || 100,         // 批处理大小
      antiEntropy: options.antiEntropy !== false,  // 是否启用反熵
      options
    };
  }
  
  /**
   * 创建因果一致性配置
   * @param {Object} options - 配置选项
   * @returns {Object} 一致性配置
   */
  static createCausalConfig(options = {}) {
    return {
      model: ConsistencyModels.CAUSAL,
      vectorClocks: options.vectorClocks !== false,  // 是否使用向量时钟
      dependencyTracking: options.dependencyTracking !== false,  // 是否跟踪依赖关系
      conflictResolution: options.conflictResolution || 'manual',
      waitForDependencies: options.waitForDependencies !== false,  // 是否等待依赖操作
      causalDelivery: options.causalDelivery !== false,  // 是否保证因果顺序传递
      options
    };
  }
  
  /**
   * 创建强一致性配置
   * @param {Object} options - 配置选项
   * @returns {Object} 一致性配置
   */
  static createStrongConfig(options = {}) {
    return {
      model: ConsistencyModels.STRONG,
      consensusAlgorithm: options.consensusAlgorithm || 'raft',  // 共识算法
      leaderElection: options.leaderElection !== false,  // 是否启用领导选举
      commitQuorum: options.commitQuorum || 'majority',  // 提交所需的确认数
      syncTimeout: options.syncTimeout || 2000,  // ms
      maxRetries: options.maxRetries || 3,  // 最大重试次数
      readConsistency: options.readConsistency || 'strong',  // 读一致性级别
      options
    };
  }
  
  /**
   * 根据一致性模型创建配置
   * @param {string} model - 一致性模型
   * @param {Object} options - 配置选项
   * @returns {Object} 一致性配置
   */
  static createConfig(model, options = {}) {
    switch (model) {
      case ConsistencyModels.EVENTUAL:
        return this.createEventualConfig(options);
      case ConsistencyModels.CAUSAL:
        return this.createCausalConfig(options);
      case ConsistencyModels.STRONG:
        return this.createStrongConfig(options);
      default:
        throw new Error(`不支持的一致性模型: ${model}`);
    }
  }
}

/**
 * 向量时钟实现
 * 用于因果一致性模型中跟踪事件顺序
 */
class VectorClock {
  /**
   * 创建新的向量时钟
   * @param {Object} initialVectors - 初始向量
   * @param {string} [nodeId] - 节点ID
   */
  constructor(initialVectors = {}, nodeId) {
    this.vectors = { ...initialVectors };
    this.nodeId = nodeId;
  }
  
  /**
   * 递增当前节点的时钟
   * @param {string} nodeId - 节点ID
   * @returns {VectorClock} 更新后的向量时钟
   */
  increment(nodeId = this.nodeId) {
    if (!nodeId) {
      throw new Error('递增向量时钟需要节点ID');
    }
    
    const currentCount = this.vectors[nodeId] || 0;
    this.vectors[nodeId] = currentCount + 1;
    return this;
  }
  
  /**
   * 合并另一个向量时钟
   * @param {VectorClock} other - 另一个向量时钟
   * @returns {VectorClock} 合并后的向量时钟
   */
  merge(other) {
    if (!(other instanceof VectorClock)) {
      throw new Error('只能与另一个VectorClock实例合并');
    }
    
    // 合并两个向量时钟，取每个节点的最大值
    const allNodeIds = new Set([
      ...Object.keys(this.vectors),
      ...Object.keys(other.vectors)
    ]);
    
    for (const nodeId of allNodeIds) {
      const thisValue = this.vectors[nodeId] || 0;
      const otherValue = other.vectors[nodeId] || 0;
      this.vectors[nodeId] = Math.max(thisValue, otherValue);
    }
    
    return this;
  }
  
  /**
   * 比较与另一个向量时钟的关系
   * @param {VectorClock} other - 另一个向量时钟
   * @returns {number} -1: 早于, 0: 并发, 1: 晚于
   */
  compare(other) {
    if (!(other instanceof VectorClock)) {
      throw new Error('只能与另一个VectorClock实例比较');
    }
    
    let lessThan = false;
    let greaterThan = false;
    
    // 检查所有节点的时钟
    const allNodeIds = new Set([
      ...Object.keys(this.vectors),
      ...Object.keys(other.vectors)
    ]);
    
    for (const nodeId of allNodeIds) {
      const thisValue = this.vectors[nodeId] || 0;
      const otherValue = other.vectors[nodeId] || 0;
      
      if (thisValue < otherValue) {
        lessThan = true;
      } else if (thisValue > otherValue) {
        greaterThan = true;
      }
      
      // 如果同时发现大于和小于关系，表示两个向量时钟是并发的
      if (lessThan && greaterThan) {
        return 0; // 并发
      }
    }
    
    if (lessThan && !greaterThan) {
      return -1; // 早于
    } else if (!lessThan && greaterThan) {
      return 1; // 晚于
    } else {
      return 0; // 相等或并发
    }
  }
  
  /**
   * 检查是否与另一个向量时钟并发
   * @param {VectorClock} other - 另一个向量时钟
   * @returns {boolean} 是否并发
   */
  isConcurrentWith(other) {
    return this.compare(other) === 0;
  }
  
  /**
   * 检查是否发生在另一个向量时钟之前
   * @param {VectorClock} other - 另一个向量时钟
   * @returns {boolean} 是否早于
   */
  isHappensBefore(other) {
    return this.compare(other) === -1;
  }
  
  /**
   * 检查是否发生在另一个向量时钟之后
   * @param {VectorClock} other - 另一个向量时钟
   * @returns {boolean} 是否晚于
   */
  isHappensAfter(other) {
    return this.compare(other) === 1;
  }
  
  /**
   * 转换为JSON
   * @returns {Object} JSON表示
   */
  toJSON() {
    return { ...this.vectors };
  }
  
  /**
   * 从JSON创建向量时钟
   * @param {Object} json - JSON表示
   * @param {string} [nodeId] - 节点ID
   * @returns {VectorClock} 向量时钟实例
   */
  static fromJSON(json, nodeId) {
    return new VectorClock(json, nodeId);
  }
}

module.exports = {
  ConsistencyModels,
  ConsistencyConfigFactory,
  VectorClock
}; 