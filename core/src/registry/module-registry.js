/**
 * ACIP模块注册表
 * 
 * 负责模块的注册、发现和版本管理
 * 
 * @module registry
 */

const EventEmitter = require('events');
const semver = require('semver');
const { v4: generateUUID } = require('uuid');

/**
 * 模块注册表事件
 */
const RegistryEvents = {
  MODULE_REGISTERED: 'module:registered',
  MODULE_UNREGISTERED: 'module:unregistered',
  MODULE_INFO_UPDATED: 'module:infoUpdated',
  REGISTRY_ERROR: 'registry:error'
};

/**
 * 模块注册表类
 * 
 * 管理所有ACIP模块的注册、发现和版本控制
 */
class ModuleRegistry {
  /**
   * 创建新的模块注册表实例
   * @param {Object} options - 配置选项
   * @param {Object} [logger=console] - 日志记录器
   */
  constructor(options = {}, logger = console) {
    this.modules = new Map();
    this.logger = logger;
    this.eventBus = new EventEmitter();
    
    // 配置事件总线的最大监听器数量
    if (options.maxListeners) {
      this.eventBus.setMaxListeners(options.maxListeners);
    }
    
    // 绑定方法，确保this指向正确
    this.register = this.register.bind(this);
    this.unregister = this.unregister.bind(this);
    this.getModule = this.getModule.bind(this);
    this.getModuleInfo = this.getModuleInfo.bind(this);
    this.listModules = this.listModules.bind(this);
    this.getDependencies = this.getDependencies.bind(this);
    this.checkDependencies = this.checkDependencies.bind(this);
    this.on = this.on.bind(this);
    this.off = this.off.bind(this);
    
    this.logger.info('模块注册表已初始化');
  }

  /**
   * 注册模块
   * @param {Object} moduleInfo - 模块信息
   * @param {Object} moduleInstance - 模块实例
   * @returns {Promise<string>} 实例ID
   * @throws {Error} 如果模块信息无效或无法注册
   */
  async register(moduleInfo, moduleInstance) {
    // 验证模块信息
    if (!moduleInfo || !moduleInfo.id) {
      throw new Error('模块信息无效：缺少模块ID');
    }
    
    if (!moduleInfo.version) {
      throw new Error('模块信息无效：缺少版本号');
    }
    
    if (!this._isValidVersion(moduleInfo.version)) {
      throw new Error(`模块版本号 "${moduleInfo.version}" 无效，必须符合语义化版本规范`);
    }
    
    // 检查是否已存在相同模块
    const existingModule = this.modules.get(moduleInfo.id);
    
    // 生成实例ID
    const instanceId = generateUUID();
    
    // 如果模块已存在，检查版本并更新
    if (existingModule) {
      this.logger.info(`模块 "${moduleInfo.id}" 已存在，检查版本兼容性...`);
      
      const currentVersion = existingModule.moduleInfo.version;
      const newVersion = moduleInfo.version;
      
      // 比较版本号
      if (semver.gt(newVersion, currentVersion)) {
        this.logger.info(`正在更新模块 "${moduleInfo.id}" 版本: ${currentVersion} -> ${newVersion}`);
        
        // 更新模块信息
        existingModule.moduleInfo = {
          ...moduleInfo,
          updatedAt: new Date()
        };
        
        // 添加新实例
        existingModule.instances.set(instanceId, moduleInstance);
        
        // 发送更新事件
        this._emitEvent(RegistryEvents.MODULE_INFO_UPDATED, {
          moduleId: moduleInfo.id,
          moduleInfo: existingModule.moduleInfo,
          instanceId,
          previousVersion: currentVersion,
          newVersion
        });
      } else {
        this.logger.info(`添加模块 "${moduleInfo.id}" 的另一个实例，版本: ${newVersion}`);
        
        // 添加新实例
        existingModule.instances.set(instanceId, moduleInstance);
      }
    } else {
      // 创建新的模块记录
      this.modules.set(moduleInfo.id, {
        moduleInfo: {
          ...moduleInfo,
          registeredAt: new Date(),
          updatedAt: new Date()
        },
        instances: new Map([[instanceId, moduleInstance]])
      });
      
      this.logger.info(`模块 "${moduleInfo.id}" 已注册，版本: ${moduleInfo.version}`);
    }
    
    // 发送注册事件
    this._emitEvent(RegistryEvents.MODULE_REGISTERED, {
      moduleId: moduleInfo.id,
      moduleInfo: this.modules.get(moduleInfo.id).moduleInfo,
      instanceId
    });
    
    return instanceId;
  }

  /**
   * 注销模块
   * @param {string} moduleId - 模块ID
   * @param {string} [instanceId] - 特定实例ID，如果不提供则注销所有实例
   * @returns {Promise<boolean>} 是否成功注销
   */
  async unregister(moduleId, instanceId) {
    const moduleEntry = this.modules.get(moduleId);
    
    if (!moduleEntry) {
      this.logger.warn(`尝试注销不存在的模块 "${moduleId}"`);
      return false;
    }
    
    // 检查是否有其他模块依赖此模块
    const dependentModules = await this._checkDependentModules(moduleId);
    
    if (dependentModules.length > 0) {
      this.logger.warn(`无法注销模块 "${moduleId}"，以下模块依赖它: ${dependentModules.join(', ')}`);
      return false;
    }
    
    // 如果指定了实例ID，只注销特定实例
    if (instanceId) {
      if (!moduleEntry.instances.has(instanceId)) {
        this.logger.warn(`尝试注销不存在的实例 "${instanceId}" (模块 "${moduleId}")`);
        return false;
      }
      
      // 移除特定实例
      moduleEntry.instances.delete(instanceId);
      
      this.logger.info(`模块 "${moduleId}" 的实例 "${instanceId}" 已注销`);
      
      // 如果没有更多实例，完全移除模块
      if (moduleEntry.instances.size === 0) {
        this.modules.delete(moduleId);
        this.logger.info(`模块 "${moduleId}" 已完全注销（没有剩余实例）`);
      }
      
      // 发送注销事件
      this._emitEvent(RegistryEvents.MODULE_UNREGISTERED, {
        moduleId,
        moduleInfo: moduleEntry.moduleInfo,
        instanceId
      });
      
      return true;
    }
    
    // 注销所有实例
    const allInstanceIds = Array.from(moduleEntry.instances.keys());
    
    // 从注册表中移除模块
    this.modules.delete(moduleId);
    
    this.logger.info(`模块 "${moduleId}" 及其所有实例已注销`);
    
    // 为每个实例发送注销事件
    for (const insId of allInstanceIds) {
      this._emitEvent(RegistryEvents.MODULE_UNREGISTERED, {
        moduleId,
        moduleInfo: moduleEntry.moduleInfo,
        instanceId: insId
      });
    }
    
    return true;
  }

  /**
   * 获取模块实例
   * @param {string} moduleId - 模块ID
   * @param {string} [instanceId] - 特定实例ID，如果不提供则返回默认实例
   * @returns {Promise<Object|null>} 模块实例，如果不存在则返回null
   */
  async getModule(moduleId, instanceId) {
    const moduleEntry = this.modules.get(moduleId);
    
    if (!moduleEntry) {
      return null;
    }
    
    if (instanceId) {
      // 返回指定实例
      return moduleEntry.instances.get(instanceId) || null;
    }
    
    // 返回第一个实例（默认）
    const instances = Array.from(moduleEntry.instances.values());
    return instances.length > 0 ? instances[0] : null;
  }

  /**
   * 获取模块信息
   * @param {string} moduleId - 模块ID
   * @returns {Promise<Object|null>} 模块信息，如果不存在则返回null
   */
  async getModuleInfo(moduleId) {
    const moduleEntry = this.modules.get(moduleId);
    return moduleEntry ? moduleEntry.moduleInfo : null;
  }

  /**
   * 列出已注册模块
   * @param {Object} [filter] - 过滤条件
   * @param {string} [filter.interface] - 根据接口过滤
   * @param {string} [filter.version] - 根据版本过滤
   * @param {string} [filter.author] - 根据作者过滤
   * @param {Array<string>} [filter.ids] - 模块ID列表
   * @returns {Promise<Array<Object>>} 模块信息数组
   */
  async listModules(filter = {}) {
    const result = [];
    
    for (const [id, entry] of this.modules.entries()) {
      const { moduleInfo } = entry;
      
      // 应用过滤条件
      if (filter.interface && (!moduleInfo.interfaces || !moduleInfo.interfaces.includes(filter.interface))) {
        continue;
      }
      
      if (filter.version && !semver.satisfies(moduleInfo.version, filter.version)) {
        continue;
      }
      
      if (filter.author && moduleInfo.author !== filter.author) {
        continue;
      }
      
      if (filter.ids && !filter.ids.includes(id)) {
        continue;
      }
      
      // 添加实例数量信息
      const moduleData = {
        ...moduleInfo,
        instanceCount: entry.instances.size
      };
      
      result.push(moduleData);
    }
    
    return result;
  }

  /**
   * 获取模块依赖
   * @param {string} moduleId - 模块ID
   * @returns {Promise<Array<Object>>} 依赖数组
   */
  async getDependencies(moduleId) {
    const moduleEntry = this.modules.get(moduleId);
    
    if (!moduleEntry) {
      return [];
    }
    
    const { dependencies = [] } = moduleEntry.moduleInfo;
    
    // 解析每个依赖的详细信息
    return dependencies.map(dep => {
      const depEntry = this.modules.get(dep.id);
      
      return {
        id: dep.id,
        version: dep.version,
        optional: dep.optional || false,
        satisfied: depEntry ? semver.satisfies(depEntry.moduleInfo.version, dep.version) : false,
        installed: !!depEntry
      };
    });
  }

  /**
   * 检查模块依赖是否满足
   * @param {string} moduleId - 模块ID
   * @returns {Promise<Object>} 依赖检查结果
   */
  async checkDependencies(moduleId) {
    const dependencies = await this.getDependencies(moduleId);
    
    const result = {
      allSatisfied: true,
      required: {
        satisfied: [],
        unsatisfied: []
      },
      optional: {
        satisfied: [],
        unsatisfied: []
      }
    };
    
    for (const dep of dependencies) {
      if (dep.optional) {
        if (dep.satisfied) {
          result.optional.satisfied.push(dep);
        } else {
          result.optional.unsatisfied.push(dep);
        }
      } else {
        if (dep.satisfied) {
          result.required.satisfied.push(dep);
        } else {
          result.required.unsatisfied.push(dep);
          result.allSatisfied = false;
        }
      }
    }
    
    return result;
  }

  /**
   * 为指定的事件注册监听器
   * @param {string} event - 事件名称
   * @param {Function} listener - 监听器函数
   * @returns {Function} 用于移除监听器的函数
   */
  on(event, listener) {
    this.eventBus.on(event, listener);
    return () => this.eventBus.off(event, listener);
  }

  /**
   * 移除事件监听器
   * @param {string} event - 事件名称
   * @param {Function} listener - 监听器函数
   */
  off(event, listener) {
    this.eventBus.off(event, listener);
  }

  /**
   * 检查依赖此模块的其他模块
   * @private
   * @param {string} moduleId - 模块ID
   * @returns {Promise<Array<string>>} 依赖此模块的模块ID数组
   */
  async _checkDependentModules(moduleId) {
    const dependentModules = [];
    
    for (const [id, entry] of this.modules.entries()) {
      if (id === moduleId) continue;
      
      const { dependencies = [] } = entry.moduleInfo;
      
      if (dependencies.some(dep => dep.id === moduleId)) {
        dependentModules.push(id);
      }
    }
    
    return dependentModules;
  }

  /**
   * 验证版本字符串是否为有效的语义化版本
   * @private
   * @param {string} version - 版本字符串
   * @returns {boolean} 是否有效
   */
  _isValidVersion(version) {
    return semver.valid(version) !== null;
  }

  /**
   * 触发事件
   * @private
   * @param {string} event - 事件名称
   * @param {Object} data - 事件数据
   */
  _emitEvent(event, data) {
    this.eventBus.emit(event, data);
  }
}

module.exports = {
  ModuleRegistry,
  RegistryEvents
}; 