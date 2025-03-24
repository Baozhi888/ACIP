/**
 * 模块注册表测试脚本
 * 
 * 用于手动测试模块注册表的基本功能
 */

const { ModuleRegistry, RegistryEvents } = require('../src/registry/module-registry');
const { ModuleLifecycle, ModuleState } = require('../src/lifecycle/lifecycle');
const { Logger, LogLevel } = require('../src/utils/logger');

// 创建日志记录器
const logger = new Logger({
  level: LogLevel.DEBUG,
  prefix: 'Registry-Test'
});

// 创建测试模块类
class TestModule extends ModuleLifecycle {
  constructor(name, version = '1.0.0') {
    super();
    this.name = name;
    this.moduleVersion = version;
    this.logger = logger;
  }
  
  async _doInitialize() {
    logger.info(`初始化模块 ${this.name}`);
    // 模拟初始化延迟
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  async _doStart() {
    logger.info(`启动模块 ${this.name}`);
    // 模拟启动延迟
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  async _doStop() {
    logger.info(`停止模块 ${this.name}`);
    // 模拟停止延迟
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  async _doDestroy() {
    logger.info(`销毁模块 ${this.name}`);
    // 模拟销毁延迟
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

async function runTest() {
  logger.info("开始模块注册表测试...");
  
  // 创建注册表
  const registry = new ModuleRegistry({}, logger);
  
  // 监听注册表事件
  registry.on(RegistryEvents.MODULE_REGISTERED, (event) => {
    logger.info(`模块注册事件: ${event.moduleId}, 实例ID: ${event.instanceId}`);
  });
  
  registry.on(RegistryEvents.MODULE_UNREGISTERED, (event) => {
    logger.info(`模块注销事件: ${event.moduleId}, 实例ID: ${event.instanceId}`);
  });
  
  registry.on(RegistryEvents.MODULE_INFO_UPDATED, (event) => {
    logger.info(`模块更新事件: ${event.moduleId}, 从 ${event.previousVersion} 到 ${event.newVersion}`);
  });
  
  // 创建基础模块
  const baseModule = new TestModule('BaseModule', '1.0.0');
  const baseModuleInfo = {
    id: 'base-module',
    name: 'Base Module',
    version: '1.0.0',
    description: '基础功能模块',
    author: 'ACIP Team',
    interfaces: ['IBaseModule']
  };
  
  // 注册基础模块
  logger.info("注册基础模块...");
  const baseInstanceId = await registry.register(baseModuleInfo, baseModule);
  logger.info(`基础模块注册成功，实例ID: ${baseInstanceId}`);
  
  // 创建依赖基础模块的模块
  const dataModule = new TestModule('DataModule', '1.0.0');
  const dataModuleInfo = {
    id: 'data-module',
    name: 'Data Module',
    version: '1.0.0',
    description: '数据处理模块',
    author: 'ACIP Team',
    interfaces: ['IDataProcessor'],
    dependencies: [
      { id: 'base-module', version: '^1.0.0' }
    ]
  };
  
  // 注册数据模块
  logger.info("注册数据模块...");
  const dataInstanceId = await registry.register(dataModuleInfo, dataModule);
  logger.info(`数据模块注册成功，实例ID: ${dataInstanceId}`);
  
  // 列出已注册模块
  logger.info("列出所有已注册模块:");
  const modules = await registry.listModules();
  modules.forEach(module => {
    logger.info(`- ${module.id} (${module.name}) v${module.version}`);
  });
  
  // 获取并初始化基础模块
  logger.info("初始化和启动基础模块...");
  const baseModuleInstance = await registry.getModule('base-module');
  await baseModuleInstance.initialize();
  await baseModuleInstance.start();
  
  // 获取依赖信息
  logger.info("获取数据模块的依赖信息:");
  const dependencies = await registry.getDependencies('data-module');
  dependencies.forEach(dep => {
    logger.info(`- 依赖 ${dep.id} ${dep.version}, 状态: ${dep.satisfied ? '满足' : '未满足'}`);
  });
  
  // 检查依赖状态
  logger.info("检查数据模块的依赖状态:");
  const checkResult = await registry.checkDependencies('data-module');
  logger.info(`所有必需依赖是否满足: ${checkResult.allSatisfied ? '是' : '否'}`);
  logger.info(`必需依赖满足数量: ${checkResult.required.satisfied.length}`);
  logger.info(`必需依赖未满足数量: ${checkResult.required.unsatisfied.length}`);
  
  // 尝试注销基础模块（应该失败，因为数据模块依赖它）
  logger.info("尝试注销基础模块（应该失败，因为有依赖）...");
  const unregisterResult1 = await registry.unregister('base-module');
  logger.info(`注销结果: ${unregisterResult1 ? '成功' : '失败'}`);
  
  // 先注销数据模块
  logger.info("注销数据模块...");
  const unregisterResult2 = await registry.unregister('data-module');
  logger.info(`注销结果: ${unregisterResult2 ? '成功' : '失败'}`);
  
  // 再次尝试注销基础模块（现在应该成功）
  logger.info("再次尝试注销基础模块...");
  await baseModuleInstance.stop();
  await baseModuleInstance.destroy();
  const unregisterResult3 = await registry.unregister('base-module');
  logger.info(`注销结果: ${unregisterResult3 ? '成功' : '失败'}`);
  
  // 验证所有模块已被注销
  logger.info("验证所有模块已被注销:");
  const remainingModules = await registry.listModules();
  logger.info(`剩余模块数量: ${remainingModules.length}`);
  
  logger.info("测试完成!");
}

runTest().catch(error => {
  logger.error(`测试过程中出错: ${error.message}`);
  console.error(error);
}); 