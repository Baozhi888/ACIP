# 快速开始

本指南将帮助您快速设置ACIP开发环境，并创建您的第一个ACIP应用程序。

## 安装和配置

### 前提条件

开始使用ACIP前，请确保您的系统满足以下要求：

- **Node.js**: 18.0.0 或更高版本
- **npm**: 8.0.0 或更高版本

您可以使用以下命令检查您的Node.js和npm版本：

```bash
node --version
npm --version
```

### 安装SDK

ACIP目前提供JavaScript/TypeScript SDK。您可以使用npm或yarn安装：

```bash
# 使用npm
npm install @acip/sdk

# 使用yarn
yarn add @acip/sdk

# 使用pnpm
pnpm add @acip/sdk
```

### 获取API密钥

要使用ACIP连接到AI模型，您需要获取API密钥。ACIP支持多种AI服务提供商，包括：

- OpenAI
- Anthropic
- Google VertexAI
- 等等...

如果您已有这些提供商的API密钥，可以直接在ACIP中使用。如果没有，请访问相应提供商的网站注册并获取API密钥。

为了开发和测试，我们建议使用环境变量来存储您的API密钥：

```bash
# 设置环境变量
export ACIP_API_KEY=your_api_key_here

# Windows命令行
set ACIP_API_KEY=your_api_key_here

# Windows PowerShell
$env:ACIP_API_KEY="your_api_key_here"
```

## 第一个ACIP应用

### 基本示例：AI对话

下面是一个简单的示例，展示如何使用ACIP创建基本的AI对话应用：

```javascript
// 导入ACIP SDK
const acip = require('@acip/sdk');

// 初始化SDK
const sdk = acip.init({ 
  apiKey: process.env.ACIP_API_KEY 
});

// 创建对话助手
const assistant = sdk.createAssistant({
  modelId: 'gpt-4o',
  systemPrompt: '你是一个友好、有用的AI助手。',
  name: '我的助手'
});

// 发送消息并处理响应
async function chat() {
  try {
    // 发送消息给助手
    const response = await assistant.sendMessage('你好！介绍一下适应性上下文智能协议(ACIP)');
    
    // 显示响应
    console.log('助手回复:', response.content);
    
    // 发送后续消息，上下文会自动保持
    const followUpResponse = await assistant.sendMessage('它有哪些主要模块？');
    console.log('助手回复:', followUpResponse.content);
    
  } catch (error) {
    console.error('出错了:', error);
  }
}

// 运行对话
chat();
```

### 流式响应示例

如果您想获得类似ChatGPT那样的实时响应，可以使用流式处理：

```javascript
// 导入ACIP SDK
const acip = require('@acip/sdk');

// 初始化SDK
const sdk = acip.init({ 
  apiKey: process.env.ACIP_API_KEY 
});

// 创建对话助手（启用流式响应）
const assistant = sdk.createAssistant({
  modelId: 'gpt-4o',
  systemPrompt: '你是一个友好、有用的AI助手。',
  streaming: true  // 启用流式响应
});

// 注册事件处理器接收实时响应片段
assistant.on('message:chunk', (chunk) => {
  // 实时显示生成的内容
  process.stdout.write(chunk.content || '');
});

// 消息完成事件
assistant.on('message:complete', (message) => {
  console.log('\n\n对话已完成。');
});

// 发送消息
async function streamDemo() {
  try {
    console.log('发送中...\n');
    await assistant.sendMessage('用3-5句话概述适应性上下文智能协议(ACIP)的主要特点');
  } catch (error) {
    console.error('出错了:', error);
  }
}

// 运行示例
streamDemo();
```

### 使用工具示例

ACIP支持使用工具（外部函数调用），允许AI助手使用外部功能：

```javascript
// 导入ACIP SDK
const acip = require('@acip/sdk');

// 初始化SDK
const sdk = acip.init({ 
  apiKey: process.env.ACIP_API_KEY 
});

// 定义工具（函数）
const tools = [
  {
    type: 'function',
    function: {
      name: 'getCurrentWeather',
      description: '获取当前天气信息',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: '城市名称，如北京、上海'
          }
        },
        required: ['location']
      }
    }
  }
];

// 创建带工具的助手
const assistant = sdk.createAssistant({
  modelId: 'gpt-4o',
  systemPrompt: '你是一个助手，可以查询天气信息。',
  tools: tools
});

// 处理工具调用
assistant.on('message:complete', async (message) => {
  if (message.toolCalls && message.toolCalls.length > 0) {
    console.log('\n助手请求使用工具...');
    
    // 处理工具调用
    const toolOutputs = [];
    
    for (const toolCall of message.toolCalls) {
      if (toolCall.function.name === 'getCurrentWeather') {
        const args = JSON.parse(toolCall.function.arguments);
        
        // 模拟天气API调用
        const weatherResult = {
          location: args.location,
          temperature: '23°C',
          condition: '晴朗',
          humidity: '65%',
          updated: new Date().toLocaleString()
        };
        
        // 添加工具输出
        toolOutputs.push({
          toolCallId: toolCall.id,
          output: JSON.stringify(weatherResult)
        });
        
        console.log(`查询${args.location}的天气...`);
      }
    }
    
    // 将工具结果发送回助手
    console.log('工具执行完成，返回结果给助手...\n');
    console.log('助手回复: ');
    await assistant.submitToolOutputs(toolOutputs);
  }
});

// 发送消息
async function toolDemo() {
  try {
    console.log('用户: 北京今天天气怎么样？');
    console.log('助手: ');
    await assistant.sendMessage('北京今天天气怎么样？');
  } catch (error) {
    console.error('出错了:', error);
  }
}

// 运行示例
toolDemo();
```

## 基本概念

在继续深入了解ACIP之前，让我们先了解一些核心概念：

### SDK初始化

使用`acip.init()`初始化SDK，通常需要提供API密钥和其他可选配置：

```javascript
const sdk = acip.init({ 
  apiKey: 'your_api_key',      // API密钥
  cacheEnabled: true,          // 启用缓存
  defaultModelId: 'gpt-4o',     // 默认模型
  logger: {                    // 日志配置
    level: 'info'
  }
});
```

### 模型调用

ACIP提供统一的模型调用接口，支持多种AI模型：

```javascript
// 基本调用
const response = await sdk.modelInvocation.invoke({
  modelId: 'gpt-4o',
  messages: [
    { role: 'system', content: '你是一个有用的助手。' },
    { role: 'user', content: '解释什么是ACIP？' }
  ]
});

// 获取调用统计
const metrics = sdk.modelInvocation.getMetrics();
```

### 助手实例

ACIP的Assistant类提供更高级的对话功能：

```javascript
// 创建助手
const assistant = sdk.createAssistant({
  modelId: 'gpt-4o',
  systemPrompt: '你是一个专家助手。',
  memory: true,          // 启用记忆
  memorySize: 10,        // 记住10轮对话
  streaming: true        // 启用流式响应
});

// 发送消息
const response = await assistant.sendMessage('你好！');

// 获取对话历史
const history = assistant.getHistory();

// 清除历史
assistant.clearHistory();
```

### 事件系统

ACIP使用事件系统通知应用程序重要事件：

```javascript
// 注册事件监听器
assistant.on('message:chunk', (chunk) => {
  // 处理消息片段
});

assistant.on('message:complete', (message) => {
  // 处理完整消息
});

assistant.on('error', (error) => {
  // 处理错误
});

// 移除事件监听器
assistant.off('message:chunk', handlerFunction);
```

## 下一步

恭喜！您已经了解了ACIP的基础知识并创建了第一个应用。接下来，您可以：

- 查看[JavaScript SDK文档](./javascript-sdk.md)了解更多高级功能
- 探索[模型调用模块](./core-modules/model-invocation.md)深入了解AI模型调用
- 学习如何使用[上下文管理](./core-modules/context-management.md)增强应用智能性
- 了解[安全模块](./core-modules/security.md)以保护您的AI应用

或者，您可以查看[示例应用库](https://github.com/acip-ai/examples)了解更多实际应用场景。 