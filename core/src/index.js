/**
 * ACIP核心模块入口
 * 
 * 导出ACIP核心协议的所有组件和工具
 * @module core
 */

// 生命周期管理
const { ModuleLifecycle, ModuleState } = require('./lifecycle/lifecycle');
const { Core, CoreEvents } = require('./lifecycle/core');

// 模块注册表
const { ModuleRegistry, RegistryEvents } = require('./registry/module-registry');

// 配置工具
const { ConfigLoader } = require('./config/config-loader');

// 日志工具
const { Logger, LogLevel } = require('./utils/logger');

// 数据模型
const models = require('./models');

/**
 * 创建一个新的ACIP核心实例
 * @param {Object} options - 核心选项
 * @returns {Core} 新的核心实例
 */
function createCore(options = {}) {
  return new Core(options);
}

// 导出所有组件
module.exports = {
  // 核心组件
  Core,
  CoreEvents,
  
  // 生命周期
  ModuleLifecycle,
  ModuleState,
  
  // 模块注册
  ModuleRegistry,
  RegistryEvents,
  
  // 配置
  ConfigLoader,
  
  // 日志
  Logger,
  LogLevel,
  
  // 数据模型
  models,
  BaseModel: models.BaseModel,
  ContextModel: models.ContextModel,
  AgentModel: models.AgentModel,
  
  // 序列化工具
  serialization: models.serialization,
  
  // 核心API
  createCore,
  
  // 版本信息
  VERSION: '0.1.0'
}; 