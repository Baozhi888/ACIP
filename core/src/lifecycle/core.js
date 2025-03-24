/**
 * ACIP核心模块
 * 
 * 实现ACIP协议的核心功能，包括模块管理、事件总线和状态管理
 * 
 * @module core
 */

const { ModuleLifecycle, ModuleState } = require('./lifecycle');
const { ModuleRegistry, RegistryEvents } = require('../registry/module-registry');
const EventEmitter = require('events');

/**
 * 核心模块事件
 */
const CoreEvents = {
  MODULE_REGISTERED: 'module:registered',
  MODULE_UNREGISTERED: 'module:unregistered',
  MODULE_STATE_CHANGED: 'module:stateChanged',
  CORE_STATE_CHANGED: 'core:stateChanged',
  CORE_ERROR: 'core:error',
  CONFIG_CHANGED: 'config:changed'
};

/**
 * ACIP核心类
 * 
 * 负责管理整个ACIP协议的运行状态、模块生命周期和事件总线
 */
class Core extends ModuleLifecycle {
  /**
   * 创建新的Core实例
   * @param {Object} options - 核心选项
   */
  constructor(options = {}) {
    super(options);
    
    this.name = 'ACIPCore';
    this.version = options.version || '0.1.0';
    this.eventBus = new EventEmitter();
    
    // 创建模块注册表
    this.registry = new ModuleRegistry({
      maxListeners: options.maxListeners
    }, this.logger);
    
    // 模块实例缓存，包含已初始化和启动的模块
    this.modules = new Map();
    
    // 配置事件总线的最大监听器数量
    if (options.maxListeners) {
      this.eventBus.setMaxListeners(options.maxListeners);
    }
    
    // 绑定方法，确保this指向正确
    this.registerModule = this.registerModule.bind(this);
    this.unregisterModule = this.unregisterModule.bind(this);
    this.getModule = this.getModule.bind(this);
    this.getAllModules = this.getAllModules.bind(this);
    this.on = this.on.bind(this);
    this.off = this.off.bind(this);
    this.emit = this.emit.bind(this);
    
    // 监听注册表事件
    this._setupRegistryListeners();
    
    this.logger.info(`ACIP核心 v${this.version} 已创建`);
  }

  /**
   * 初始化核心模块
   * @protected
   * @returns {Promise<void>}
   */
  async _doInitialize() {
    this.logger.info('初始化ACIP核心...');
    
    // 加载配置
    await this._loadConfig();
    
    // 初始化内部服务
    await this._initServices();
    
    this.logger.info('ACIP核心初始化完成');
  }

  /**
   * 启动核心模块
   * @protected
   * @returns {Promise<void>}
   */
  async _doStart() {
    this.logger.info('启动ACIP核心...');
    
    // 按照依赖顺序启动所有已注册模块
    const startResults = await this._startModules();
    
    if (startResults.failed.length > 0) {
      this.logger.warn(`${startResults.failed.length}个模块启动失败`);
      for (const { module, error } of startResults.failed) {
        this.logger.error(`模块 ${module.name} 启动失败: ${error.message}`);
      }
    }
    
    this.logger.info(`ACIP核心启动完成，成功启动了${startResults.success.length}个模块`);
  }

  /**
   * 停止核心模块
   * @protected
   * @returns {Promise<void>}
   */
  async _doStop() {
    this.logger.info('停止ACIP核心...');
    
    // 按照依赖关系的反向顺序停止所有模块
    const stopResults = await this._stopModules();
    
    if (stopResults.failed.length > 0) {
      this.logger.warn(`${stopResults.failed.length}个模块停止失败`);
      for (const { module, error } of stopResults.failed) {
        this.logger.error(`模块 ${module.name} 停止失败: ${error.message}`);
      }
    }
    
    this.logger.info(`ACIP核心停止完成，成功停止了${stopResults.success.length}个模块`);
  }

  /**
   * 销毁核心模块
   * @protected
   * @returns {Promise<void>}
   */
  async _doDestroy() {
    this.logger.info('销毁ACIP核心...');
    
    // 销毁所有模块
    const destroyResults = await this._destroyModules();
    
    if (destroyResults.failed.length > 0) {
      this.logger.warn(`${destroyResults.failed.length}个模块销毁失败`);
    }
    
    // 移除所有事件监听器
    this.eventBus.removeAllListeners();
    
    // 清空模块映射
    this.modules.clear();
    
    this.logger.info('ACIP核心已销毁');
  }

  /**
   * 注册模块
   * @param {string} moduleId - 模块ID
   * @param {Object} moduleInstance - 模块实例，必须实现ModuleLifecycle接口
   * @param {Object} [options={}] - 注册选项
   * @returns {Object} 注册的模块实例
   * @throws {Error} 如果模块ID已被注册或模块实例不是有效的ModuleLifecycle实例
   */
  async registerModule(moduleId, moduleInstance, options = {}) {
    if (!(moduleInstance instanceof ModuleLifecycle)) {
      throw new Error(`模块实例必须实现ModuleLifecycle接口`);
    }
    
    // 创建模块信息对象
    const moduleInfo = {
      id: moduleId,
      name: options.name || moduleId,
      version: options.version || '0.1.0',
      description: options.description || '',
      author: options.author || '',
      dependencies: options.dependencies || [],
      interfaces: options.interfaces || [],
      configuration: options.configuration || {}
    };
    
    // 在注册表中注册模块
    await this.registry.register(moduleInfo, moduleInstance);
    
    // 监听模块状态变化
    moduleInstance.onStateChange((newState, oldState, module) => {
      this.emit(CoreEvents.MODULE_STATE_CHANGED, {
        moduleId,
        newState,
        oldState,
        module
      });
    });
    
    // 缓存模块实例
    this.modules.set(moduleId, moduleInstance);
    
    this.logger.info(`模块 "${moduleId}" 已注册到核心`);
    
    return moduleInstance;
  }

  /**
   * 注销模块
   * @param {string} moduleId - 要注销的模块ID
   * @returns {Promise<boolean>} 是否成功注销
   */
  async unregisterModule(moduleId) {
    const moduleInstance = this.modules.get(moduleId);
    
    if (!moduleInstance) {
      this.logger.warn(`尝试注销不存在的模块 "${moduleId}"`);
      return false;
    }
    
    // 如果模块正在运行，先尝试停止它
    if (moduleInstance.getState() === ModuleState.RUNNING) {
      this.logger.info(`停止模块 "${moduleId}" 以便注销`);
      try {
        await moduleInstance.stop();
      } catch (error) {
        this.logger.error(`停止模块 "${moduleId}" 时出错: ${error.message}`);
      }
    }
    
    // 从注册表中注销模块
    const unregistered = await this.registry.unregister(moduleId);
    
    if (unregistered) {
      // 从模块缓存中移除
      this.modules.delete(moduleId);
      this.logger.info(`模块 "${moduleId}" 已从核心注销`);
    }
    
    return unregistered;
  }

  /**
   * 获取已注册模块
   * @param {string} moduleId - 模块ID
   * @returns {Promise<Object|null>} 模块实例，如果不存在则返回null
   */
  async getModule(moduleId) {
    // 首先检查本地缓存
    const cachedModule = this.modules.get(moduleId);
    if (cachedModule) {
      return cachedModule;
    }
    
    // 如果缓存中没有，从注册表获取
    const moduleInstance = await this.registry.getModule(moduleId);
    
    // 如果找到了模块，更新缓存
    if (moduleInstance) {
      this.modules.set(moduleId, moduleInstance);
    }
    
    return moduleInstance;
  }

  /**
   * 获取所有已注册模块的信息
   * @param {Object} [filter] - 过滤条件
   * @returns {Promise<Array<Object>>} 模块信息数组
   */
  async getAllModules(filter) {
    return this.registry.listModules(filter);
  }

  /**
   * 获取模块依赖信息
   * @param {string} moduleId - 模块ID
   * @returns {Promise<Array<Object>>} 依赖信息数组
   */
  async getModuleDependencies(moduleId) {
    return this.registry.getDependencies(moduleId);
  }

  /**
   * 检查模块依赖是否满足
   * @param {string} moduleId - 模块ID
   * @returns {Promise<Object>} 依赖检查结果
   */
  async checkModuleDependencies(moduleId) {
    return this.registry.checkDependencies(moduleId);
  }

  /**
   * 获取特定接口的所有模块
   * @param {string} interfaceName - 接口名称
   * @returns {Promise<Array<Object>>} 实现该接口的模块信息数组
   */
  async getModulesByInterface(interfaceName) {
    return this.registry.listModules({ interface: interfaceName });
  }

  /**
   * 注册事件监听器
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
   * 触发事件
   * @param {string} event - 事件名称
   * @param {*} data - 事件数据
   */
  emit(event, data) {
    this.eventBus.emit(event, data);
  }

  /**
   * 设置注册表事件监听器
   * @private
   */
  _setupRegistryListeners() {
    // 监听模块注册事件
    this.registry.on(RegistryEvents.MODULE_REGISTERED, (data) => {
      this.emit(CoreEvents.MODULE_REGISTERED, {
        moduleId: data.moduleId,
        moduleInfo: data.moduleInfo,
        instanceId: data.instanceId
      });
    });
    
    // 监听模块注销事件
    this.registry.on(RegistryEvents.MODULE_UNREGISTERED, (data) => {
      this.emit(CoreEvents.MODULE_UNREGISTERED, {
        moduleId: data.moduleId,
        moduleInfo: data.moduleInfo,
        instanceId: data.instanceId
      });
    });
  }

  /**
   * 加载配置
   * @private
   * @returns {Promise<void>}
   */
  async _loadConfig() {
    this.logger.info('加载ACIP核心配置...');
    
    // 如果提供了配置加载器，则使用它加载配置
    if (this.options.configLoader) {
      try {
        this.config = await this.options.configLoader();
        this.logger.info('成功加载配置');
      } catch (error) {
        this.logger.error(`加载配置失败: ${error.message}`);
        this.config = {};
      }
    } else {
      // 使用默认配置
      this.config = this.options.config || {};
      this.logger.info('使用默认配置');
    }
  }

  /**
   * 初始化内部服务
   * @private
   * @returns {Promise<void>}
   */
  async _initServices() {
    // 这里初始化核心内部服务
    this.logger.info('初始化核心内部服务...');
    
    // 示例: 可以在这里初始化各种内部服务
    
    this.logger.info('核心内部服务初始化完成');
  }

  /**
   * 按依赖顺序启动所有模块
   * @private
   * @returns {Promise<Object>} 启动结果
   */
  async _startModules() {
    const result = {
      success: [],
      failed: []
    };
    
    // 获取所有模块
    const modules = await this.registry.listModules();
    
    if (modules.length === 0) {
      this.logger.info('没有已注册的模块需要启动');
      return result;
    }
    
    // 构建依赖图并获取启动顺序
    const moduleDependencies = new Map();
    
    for (const moduleInfo of modules) {
      const dependencies = moduleInfo.dependencies || [];
      moduleDependencies.set(moduleInfo.id, dependencies.map(dep => dep.id));
    }
    
    const startOrder = this._getModuleDependencyOrder(moduleDependencies);
    
    // 按顺序启动每个模块
    for (const moduleId of startOrder) {
      const moduleInstance = await this.getModule(moduleId);
      
      if (!moduleInstance) {
        this.logger.warn(`模块 "${moduleId}" 在注册表中但无法获取实例，跳过启动`);
        continue;
      }
      
      try {
        this.logger.info(`正在启动模块 "${moduleId}"...`);
        
        // 如果模块尚未初始化，先初始化
        if (moduleInstance.getState() === ModuleState.CREATED) {
          await moduleInstance.initialize();
        }
        
        // 启动模块
        await moduleInstance.start();
        
        result.success.push({
          id: moduleId,
          module: moduleInstance
        });
        
        this.logger.info(`模块 "${moduleId}" 已成功启动`);
      } catch (error) {
        result.failed.push({
          id: moduleId,
          module: moduleInstance,
          error
        });
        
        this.logger.error(`启动模块 "${moduleId}" 失败: ${error.message}`);
      }
    }
    
    return result;
  }

  /**
   * 停止所有模块
   * @private
   * @returns {Promise<Object>} 停止结果
   */
  async _stopModules() {
    const result = {
      success: [],
      failed: []
    };
    
    // 获取所有模块
    const modules = await this.registry.listModules();
    
    if (modules.length === 0) {
      return result;
    }
    
    // 构建依赖图并获取启动顺序（反转以获取停止顺序）
    const moduleDependencies = new Map();
    
    for (const moduleInfo of modules) {
      const dependencies = moduleInfo.dependencies || [];
      moduleDependencies.set(moduleInfo.id, dependencies.map(dep => dep.id));
    }
    
    const stopOrder = this._getModuleDependencyOrder(moduleDependencies).reverse();
    
    // 按顺序停止每个模块
    for (const moduleId of stopOrder) {
      const moduleInstance = this.modules.get(moduleId);
      
      if (!moduleInstance) {
        continue;
      }
      
      // 只停止运行中的模块
      if (moduleInstance.getState() !== ModuleState.RUNNING) {
        continue;
      }
      
      try {
        this.logger.info(`正在停止模块 "${moduleId}"...`);
        await moduleInstance.stop();
        
        result.success.push({
          id: moduleId,
          module: moduleInstance
        });
        
        this.logger.info(`模块 "${moduleId}" 已成功停止`);
      } catch (error) {
        result.failed.push({
          id: moduleId,
          module: moduleInstance,
          error
        });
        
        this.logger.error(`停止模块 "${moduleId}" 失败: ${error.message}`);
      }
    }
    
    return result;
  }

  /**
   * 销毁所有模块
   * @private
   * @returns {Promise<Object>} 销毁结果
   */
  async _destroyModules() {
    const result = {
      success: [],
      failed: []
    };
    
    // 获取所有模块
    const modules = Array.from(this.modules.entries());
    
    for (const [moduleId, moduleInstance] of modules) {
      try {
        this.logger.info(`正在销毁模块 "${moduleId}"...`);
        await moduleInstance.destroy();
        
        result.success.push({
          id: moduleId,
          module: moduleInstance
        });
        
        this.logger.info(`模块 "${moduleId}" 已成功销毁`);
      } catch (error) {
        result.failed.push({
          id: moduleId,
          module: moduleInstance,
          error
        });
        
        this.logger.error(`销毁模块 "${moduleId}" 失败: ${error.message}`);
      }
    }
    
    return result;
  }

  /**
   * 获取模块的依赖顺序
   * @private
   * @param {Map<string, string[]>} dependencies - 模块依赖映射
   * @returns {Array<string>} 按依赖顺序排列的模块ID数组
   */
  _getModuleDependencyOrder(dependencies) {
    const graph = {};
    const moduleIds = Array.from(dependencies.keys());
    
    for (const id of moduleIds) {
      graph[id] = dependencies.get(id) || [];
    }
    
    // 执行拓扑排序
    const visited = new Set();
    const temp = new Set();
    const order = [];
    
    function visit(id) {
      if (temp.has(id)) {
        throw new Error(`检测到依赖循环: ${Array.from(temp).join(' -> ')} -> ${id}`);
      }
      
      if (!visited.has(id)) {
        temp.add(id);
        
        for (const depId of graph[id]) {
          if (graph[depId]) { // 确保依赖项在图中
            visit(depId);
          }
        }
        
        temp.delete(id);
        visited.add(id);
        order.push(id);
      }
    }
    
    // 对每个未访问的节点执行DFS
    for (const id of moduleIds) {
      if (!visited.has(id)) {
        visit(id);
      }
    }
    
    return order;
  }
}

module.exports = {
  Core,
  CoreEvents
}; 