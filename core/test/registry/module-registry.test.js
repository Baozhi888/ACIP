/**
 * 模块注册表测试
 */
const { ModuleRegistry, RegistryEvents } = require('../../src/registry/module-registry');
const { ModuleLifecycle, ModuleState } = require('../../src/lifecycle/lifecycle');

// 模拟日志记录器
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

// 创建测试模块类
class TestModule extends ModuleLifecycle {
  constructor(name, version = '1.0.0') {
    super();
    this.name = name;
    this.moduleVersion = version;
  }
  
  async _doInitialize() {
    // 测试初始化实现
  }
  
  async _doStart() {
    // 测试启动实现
  }
  
  async _doStop() {
    // 测试停止实现
  }
  
  async _doDestroy() {
    // 测试销毁实现
  }
}

describe('ModuleRegistry', () => {
  let registry;
  
  beforeEach(() => {
    // 重置模拟记录
    jest.clearAllMocks();
    
    // 创建新的注册表实例
    registry = new ModuleRegistry({}, mockLogger);
  });
  
  test('注册新模块', async () => {
    // 创建模块实例
    const module = new TestModule('TestModule');
    
    // 创建模块信息
    const moduleInfo = {
      id: 'test-module',
      name: 'Test Module',
      version: '1.0.0',
      description: '测试模块',
      interfaces: ['TestInterface'],
      dependencies: []
    };
    
    // 注册模块并捕获事件
    let registeredEvent = null;
    registry.on(RegistryEvents.MODULE_REGISTERED, (event) => {
      registeredEvent = event;
    });
    
    const instanceId = await registry.register(moduleInfo, module);
    
    // 验证实例ID已生成
    expect(instanceId).toBeDefined();
    expect(typeof instanceId).toBe('string');
    
    // 验证事件已触发
    expect(registeredEvent).not.toBeNull();
    expect(registeredEvent.moduleId).toBe(moduleInfo.id);
    expect(registeredEvent.moduleInfo).toMatchObject(moduleInfo);
    expect(registeredEvent.instanceId).toBe(instanceId);
    
    // 验证模块可以获取
    const retrievedModule = await registry.getModule(moduleInfo.id);
    expect(retrievedModule).toBe(module);
    
    // 验证模块信息可以获取
    const retrievedInfo = await registry.getModuleInfo(moduleInfo.id);
    expect(retrievedInfo).toMatchObject(moduleInfo);
    
    // 验证模块在列表中
    const moduleList = await registry.listModules();
    expect(moduleList).toHaveLength(1);
    expect(moduleList[0]).toMatchObject(moduleInfo);
  });
  
  test('注册同一模块的更高版本', async () => {
    // 注册版本1.0.0
    const module1 = new TestModule('TestModule', '1.0.0');
    const moduleInfo1 = {
      id: 'test-module',
      name: 'Test Module',
      version: '1.0.0',
      description: '测试模块 v1'
    };
    
    await registry.register(moduleInfo1, module1);
    
    // 注册版本1.1.0
    const module2 = new TestModule('TestModule', '1.1.0');
    const moduleInfo2 = {
      id: 'test-module',
      name: 'Test Module',
      version: '1.1.0',
      description: '测试模块 v1.1'
    };
    
    // 监听更新事件
    let updateEvent = null;
    registry.on(RegistryEvents.MODULE_INFO_UPDATED, (event) => {
      updateEvent = event;
    });
    
    const instanceId2 = await registry.register(moduleInfo2, module2);
    
    // 验证更新事件
    expect(updateEvent).not.toBeNull();
    expect(updateEvent.previousVersion).toBe('1.0.0');
    expect(updateEvent.newVersion).toBe('1.1.0');
    
    // 验证获取的是新版本模块信息
    const retrievedInfo = await registry.getModuleInfo('test-module');
    expect(retrievedInfo.version).toBe('1.1.0');
    expect(retrievedInfo.description).toBe('测试模块 v1.1');
  });
  
  test('注销模块', async () => {
    // 先注册模块
    const module = new TestModule('TestModule');
    const moduleInfo = {
      id: 'test-module',
      name: 'Test Module',
      version: '1.0.0'
    };
    
    const instanceId = await registry.register(moduleInfo, module);
    
    // 监听注销事件
    let unregisteredEvent = null;
    registry.on(RegistryEvents.MODULE_UNREGISTERED, (event) => {
      unregisteredEvent = event;
    });
    
    // 注销模块
    const result = await registry.unregister('test-module');
    expect(result).toBe(true);
    
    // 验证事件已触发
    expect(unregisteredEvent).not.toBeNull();
    expect(unregisteredEvent.moduleId).toBe('test-module');
    expect(unregisteredEvent.instanceId).toBe(instanceId);
    
    // 验证模块已被移除
    const retrievedModule = await registry.getModule('test-module');
    expect(retrievedModule).toBeNull();
    
    // 验证列表中没有模块
    const moduleList = await registry.listModules();
    expect(moduleList).toHaveLength(0);
  });
  
  test('依赖检查', async () => {
    // 注册两个模块
    const module1 = new TestModule('BaseModule');
    const moduleInfo1 = {
      id: 'base-module',
      name: 'Base Module',
      version: '1.0.0'
    };
    
    await registry.register(moduleInfo1, module1);
    
    // 注册依赖基础模块的模块
    const module2 = new TestModule('DependentModule');
    const moduleInfo2 = {
      id: 'dependent-module',
      name: 'Dependent Module',
      version: '1.0.0',
      dependencies: [
        { id: 'base-module', version: '^1.0.0' }
      ]
    };
    
    await registry.register(moduleInfo2, module2);
    
    // 检查依赖
    const dependencies = await registry.getDependencies('dependent-module');
    expect(dependencies).toHaveLength(1);
    expect(dependencies[0].id).toBe('base-module');
    expect(dependencies[0].satisfied).toBe(true);
    
    // 检查依赖状态
    const checkResult = await registry.checkDependencies('dependent-module');
    expect(checkResult.allSatisfied).toBe(true);
    expect(checkResult.required.satisfied).toHaveLength(1);
    expect(checkResult.required.unsatisfied).toHaveLength(0);
    
    // 尝试注销被依赖的模块，应该失败
    const unregisterResult = await registry.unregister('base-module');
    expect(unregisterResult).toBe(false);
    expect(mockLogger.warn).toHaveBeenCalled();
  });
}); 