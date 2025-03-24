/**
 * 模块生命周期管理
 * 
 * 定义ACIP模块的标准生命周期和状态转换
 * 
 * @module lifecycle
 */

/**
 * 模块状态枚举
 */
const ModuleState = {
  CREATED: 'created',    // 模块已创建但未初始化
  INITIALIZING: 'initializing', // 模块正在初始化
  INITIALIZED: 'initialized',   // 模块已初始化但未启动
  STARTING: 'starting',   // 模块正在启动
  RUNNING: 'running',     // 模块正在运行
  STOPPING: 'stopping',   // 模块正在停止
  STOPPED: 'stopped',     // 模块已停止
  DESTROYING: 'destroying', // 模块正在销毁
  DESTROYED: 'destroyed',   // 模块已销毁
  ERROR: 'error'          // 模块处于错误状态
};

/**
 * 模块生命周期接口
 * 
 * 所有ACIP模块都必须实现这个接口
 */
class ModuleLifecycle {
  /**
   * 创建新的模块实例
   * @param {Object} options - 模块选项
   */
  constructor(options = {}) {
    this.state = ModuleState.CREATED;
    this.options = options;
    this.logger = options.logger || console;
    this.events = [];
  }

  /**
   * 初始化模块
   * 
   * 在模块开始运行前执行初始化操作，如加载配置、建立连接等
   * 
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      this._changeState(ModuleState.INITIALIZING);
      // 子类应该重写这个方法实现具体初始化逻辑
      await this._doInitialize();
      this._changeState(ModuleState.INITIALIZED);
      this.logger.info(`模块 ${this.constructor.name} 初始化完成`);
    } catch (error) {
      this._handleError('初始化过程中出错', error);
      throw error;
    }
  }

  /**
   * 启动模块
   * 
   * 使模块开始运行并提供服务
   * 
   * @returns {Promise<void>}
   */
  async start() {
    if (this.state !== ModuleState.INITIALIZED) {
      throw new Error(`无法启动模块，当前状态为 ${this.state}，需要先初始化`);
    }

    try {
      this._changeState(ModuleState.STARTING);
      // 子类应该重写这个方法实现具体启动逻辑
      await this._doStart();
      this._changeState(ModuleState.RUNNING);
      this.logger.info(`模块 ${this.constructor.name} 已启动并正在运行`);
    } catch (error) {
      this._handleError('启动过程中出错', error);
      throw error;
    }
  }

  /**
   * 停止模块
   * 
   * 使模块停止运行，但保留状态以便可以重新启动
   * 
   * @returns {Promise<void>}
   */
  async stop() {
    if (this.state !== ModuleState.RUNNING) {
      throw new Error(`无法停止模块，当前状态为 ${this.state}，需要先启动`);
    }

    try {
      this._changeState(ModuleState.STOPPING);
      // 子类应该重写这个方法实现具体停止逻辑
      await this._doStop();
      this._changeState(ModuleState.STOPPED);
      this.logger.info(`模块 ${this.constructor.name} 已停止`);
    } catch (error) {
      this._handleError('停止过程中出错', error);
      throw error;
    }
  }

  /**
   * 销毁模块
   * 
   * 释放模块占用的所有资源，销毁后模块无法重新启动
   * 
   * @returns {Promise<void>}
   */
  async destroy() {
    if (this.state === ModuleState.RUNNING) {
      await this.stop();
    }

    try {
      this._changeState(ModuleState.DESTROYING);
      // 子类应该重写这个方法实现具体销毁逻辑
      await this._doDestroy();
      this._changeState(ModuleState.DESTROYED);
      this.logger.info(`模块 ${this.constructor.name} 已销毁`);
    } catch (error) {
      this._handleError('销毁过程中出错', error);
      throw error;
    }
  }

  /**
   * 获取模块当前状态
   * @returns {string} 当前状态
   */
  getState() {
    return this.state;
  }

  /**
   * 添加状态变更监听器
   * @param {Function} listener - 状态变更监听器函数
   * @returns {Function} 用于移除监听器的函数
   */
  onStateChange(listener) {
    this.events.push(listener);
    return () => {
      const index = this.events.indexOf(listener);
      if (index !== -1) {
        this.events.splice(index, 1);
      }
    };
  }

  /**
   * 实际初始化逻辑
   * @protected
   * @returns {Promise<void>}
   */
  async _doInitialize() {
    // 空实现，子类应该重写这个方法
  }

  /**
   * 实际启动逻辑
   * @protected
   * @returns {Promise<void>}
   */
  async _doStart() {
    // 空实现，子类应该重写这个方法
  }

  /**
   * 实际停止逻辑
   * @protected
   * @returns {Promise<void>}
   */
  async _doStop() {
    // 空实现，子类应该重写这个方法
  }

  /**
   * 实际销毁逻辑
   * @protected
   * @returns {Promise<void>}
   */
  async _doDestroy() {
    // 空实现，子类应该重写这个方法
  }

  /**
   * 改变模块状态并通知监听器
   * @private
   * @param {string} newState - 新状态
   */
  _changeState(newState) {
    const oldState = this.state;
    this.state = newState;
    
    // 通知所有监听器
    for (const listener of this.events) {
      try {
        listener(newState, oldState, this);
      } catch (error) {
        this.logger.error('状态变更监听器执行出错', error);
      }
    }
  }

  /**
   * 处理生命周期过程中的错误
   * @private
   * @param {string} message - 错误消息
   * @param {Error} error - 错误对象
   */
  _handleError(message, error) {
    this.logger.error(`${message}: ${error.message}`, error);
    this._changeState(ModuleState.ERROR);
  }
}

module.exports = {
  ModuleLifecycle,
  ModuleState
}; 