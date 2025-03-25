# JavaScript/TypeScript SDK

ACIP JavaScript/TypeScript SDK提供了一组强大的工具和API，帮助开发者轻松构建基于AI的应用程序。本文档将详细介绍SDK的安装、配置和使用方法。

## 安装SDK

您可以使用npm、yarn或pnpm安装ACIP SDK：

```bash
# 使用npm
npm install @acip/sdk

# 使用yarn
yarn add @acip/sdk

# 使用pnpm
pnpm add @acip/sdk
```

## SDK结构

ACIP SDK由多个模块组成，每个模块负责特定的功能：

- **ModelInvocation**：处理AI模型的调用和响应
- **Assistant**：提供对话式AI助手功能
- **工具和实用函数**：辅助功能和工具集

## 基本用法

### 初始化SDK

使用SDK的第一步是初始化它，并提供必要的配置：

```javascript
const acip = require('@acip/sdk');

// 基本初始化
const sdk = acip.init({ 
  apiKey: process.env.ACIP_API_KEY 
});

// 高级初始化
const advancedSdk = acip.init({
  apiKey: process.env.ACIP_API_KEY,
  defaultModelId: 'gpt-4o',
  cacheEnabled: true,
  rateLimitingEnabled: true,
  costOptimizationEnabled: true,
  logger: {
    level: 'info',
    transports: ['console', 'file']
  },
  metrics: {
    enabled: true,
    detailed: true
  }
});
```

### 配置选项

SDK初始化时支持以下配置选项：

| 选项 | 类型 | 默认值 | 描述 |
|------|------|-------|------|
| `apiKey` | string | null | API密钥，用于身份验证 |
| `defaultModelId` | string | 'gpt-4o' | 默认使用的AI模型 |
| `cacheEnabled` | boolean | false | 是否启用响应缓存 |
| `cacheMaxSize` | number | 100 | 缓存的最大条目数 |
| `cacheMaxAge` | number | 3600 | 缓存条目的最大生命周期（秒） |
| `rateLimitingEnabled` | boolean | false | 是否启用速率限制 |
| `costOptimizationEnabled` | boolean | false | 是否启用成本优化 |
| `logger` | object | { level: 'info' } | 日志配置 |
| `metrics` | object | { enabled: true } | 指标收集配置 |
| `timeout` | number | 30000 | 请求超时时间（毫秒） |

## 模型调用

ModelInvocation模块是SDK的核心，提供与AI模型交互的功能。

### 基本调用

```javascript
// 基本模型调用
const response = await sdk.modelInvocation.invoke({
  modelId: 'gpt-4o',
  messages: [
    { role: 'system', content: '你是一个有用的助手。' },
    { role: 'user', content: '解释量子计算的基本原理' }
  ],
  temperature: 0.7,
  max_tokens: 500
});

console.log(response.content);
```

### 流式响应

```javascript
// 创建流式响应
const stream = await sdk.modelInvocation.createStream({
  modelId: 'gpt-4o',
  messages: [
    { role: 'system', content: '你是一个有用的助手。' },
    { role: 'user', content: '解释量子计算的基本原理' }
  ],
  stream: true
});

// 处理流式数据
stream.on('data', (chunk) => {
  process.stdout.write(chunk.content || '');
});

stream.on('end', () => {
  console.log('\n流式响应完成');
});

stream.on('error', (error) => {
  console.error('流式响应错误:', error);
});
```

### 获取可用模型

```javascript
// 获取可用的AI模型列表
const models = await sdk.modelInvocation.getModels();

// 获取特定类型的模型
const chatModels = await sdk.modelInvocation.getModels({ 
  type: 'chat',
  minTokenLimit: 8000
});

console.log('可用模型:', models);
```

### 获取使用指标

```javascript
// 获取使用指标和统计数据
const metrics = sdk.modelInvocation.getMetrics();

console.log('总请求数:', metrics.totalRequests);
console.log('总Token用量:', metrics.totalTokens);
console.log('平均响应时间:', metrics.avgLatency, 'ms');
```

## 创建对话助手

ACIP提供了一个Assistant类，简化了创建对话式AI体验的过程。

### 基本用法

```javascript
// 创建助手
const assistant = sdk.createAssistant({
  modelId: 'gpt-4o',
  systemPrompt: '你是一个专业的编程助手，擅长解答编程相关问题。',
  name: '编程助手'
});

// 发送消息
const response = await assistant.sendMessage('如何在JavaScript中实现防抖函数？');
console.log(response.content);

// 继续对话（上下文会自动保持）
const followUp = await assistant.sendMessage('这与节流有什么区别？');
console.log(followUp.content);
```

### 助手配置选项

创建Assistant实例时支持以下选项：

| 选项 | 类型 | 默认值 | 描述 |
|------|------|-------|------|
| `modelId` | string | 'gpt-4o' | 使用的AI模型ID |
| `systemPrompt` | string | '你是一个有用的AI助手。' | 系统提示，定义助手的角色和行为 |
| `temperature` | number | 0.7 | 响应的随机性（0-1） |
| `maxTokens` | number | 2048 | 响应的最大Token数 |
| `name` | string | 'Assistant' | 助手的名称 |
| `tools` | array | [] | 助手可以使用的工具/函数 |
| `memory` | boolean | true | 是否启用对话历史记忆 |
| `memorySize` | number | 10 | 记忆的对话轮数 |
| `streaming` | boolean | true | 是否使用流式响应 |

### 管理对话历史

```javascript
// 获取对话历史
const history = assistant.getHistory();
console.log('对话历史:', history);

// 获取不包含系统消息的历史
const userHistory = assistant.getHistory({ excludeSystem: true });

// 清除对话历史（但保留系统提示）
assistant.clearHistory();

// 完全清除历史（包括系统提示）
assistant.clearHistory({ keepSystem: false });
```

### 更新助手配置

```javascript
// 更新助手配置
assistant.configure({
  systemPrompt: '你现在是一个数学专家，擅长解决数学问题。',
  temperature: 0.3,
  maxTokens: 4096
});

// 配置后继续对话
const response = await assistant.sendMessage('求解方程 x² + 5x + 6 = 0');
```

## 使用工具和函数调用

ACIP支持工具（函数调用），允许AI助手使用外部功能。

### 定义工具

```javascript
// 定义工具（函数）
const tools = [
  {
    type: 'function',
    function: {
      name: 'searchDatabase',
      description: '在产品数据库中搜索商品',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '搜索关键词'
          },
          category: {
            type: 'string',
            description: '商品类别',
            enum: ['电子产品', '服装', '食品', '家居']
          },
          maxResults: {
            type: 'integer',
            description: '最大返回结果数'
          }
        },
        required: ['query']
      }
    }
  }
];

// 创建带工具的助手
const assistant = sdk.createAssistant({
  modelId: 'gpt-4o',
  systemPrompt: '你是一个购物助手，可以查询产品信息。',
  tools: tools
});
```

### 处理工具调用

```javascript
// 监听消息完成事件，处理工具调用
assistant.on('message:complete', async (message) => {
  // 检查是否有工具调用
  if (message.toolCalls && message.toolCalls.length > 0) {
    // 处理每个工具调用
    const toolOutputs = [];
    
    for (const toolCall of message.toolCalls) {
      const { name, arguments: args } = toolCall.function;
      const parsedArgs = JSON.parse(args);
      
      // 根据工具名称执行相应函数
      if (name === 'searchDatabase') {
        // 模拟数据库搜索
        const searchResults = await simulateSearchDatabase(
          parsedArgs.query,
          parsedArgs.category,
          parsedArgs.maxResults
        );
        
        // 添加结果到工具输出
        toolOutputs.push({
          toolCallId: toolCall.id,
          output: JSON.stringify(searchResults)
        });
      }
    }
    
    // 将工具结果发送回助手
    if (toolOutputs.length > 0) {
      await assistant.submitToolOutputs(toolOutputs);
    }
  }
});

// 模拟数据库搜索函数
async function simulateSearchDatabase(query, category, maxResults = 3) {
  // 在实际应用中，这里会连接到真实数据库
  console.log(`搜索商品: ${query}，类别: ${category || '所有'}`);
  
  // 模拟延迟
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 返回模拟结果
  return {
    query: query,
    category: category,
    results: [
      { id: '1', name: `${query}商品1`, price: 199, rating: 4.5 },
      { id: '2', name: `${query}商品2`, price: 299, rating: 4.2 },
      { id: '3', name: `${query}商品3`, price: 159, rating: 4.7 }
    ].slice(0, maxResults),
    timestamp: new Date().toISOString()
  };
}
```

### 发送消息并接收工具结果

```javascript
// 发送需要使用工具的消息
async function searchProducts() {
  try {
    console.log('用户: 我想找一些价格低于200元的电子产品');
    console.log('助手: ');
    await assistant.sendMessage('我想找一些价格低于200元的电子产品');
  } catch (error) {
    console.error('错误:', error);
  }
}

// 运行示例
searchProducts();
```

## 模型微调

对于需要针对特定任务优化模型性能的场景，ACIP提供了模型微调功能。

### 创建微调任务

```javascript
// 创建微调任务
const fineTuningJob = await sdk.modelInvocation.createFineTuningJob({
  modelId: 'gpt-3.5-turbo',
  trainingData: trainingData, // 训练数据数组
  type: 'instruction-tuning',
  name: 'custom-customer-support-model',
  hyperParameters: {
    epochs: 3,
    batchSize: 4,
    learningRate: 1e-5
  }
});

console.log('微调任务已创建:', fineTuningJob);
```

### 管理微调任务

```javascript
// 获取微调任务列表
const jobs = await sdk.modelInvocation.listFineTuningJobs();

// 获取特定微调任务的详情
const jobDetails = await sdk.modelInvocation.getFineTuningJob(fineTuningJob.id);

// 取消微调任务
await sdk.modelInvocation.cancelFineTuningJob(fineTuningJob.id);
```

### 使用微调模型

```javascript
// 使用微调后的模型
const response = await sdk.modelInvocation.invoke({
  modelId: jobDetails.fineTunedModelId, // 使用微调后的模型ID
  messages: [
    { role: 'system', content: '你是一个客户支持专家。' },
    { role: 'user', content: '我的订单发货了吗？' }
  ]
});
```

## 事件系统

ACIP使用事件系统通知应用程序重要事件，便于实现实时更新和响应式UI。

### 可用事件

#### 助手事件

- `message:chunk` - 流式响应的消息片段
- `message:complete` - 完整消息接收完毕
- `error` - 发生错误

#### 模型调用事件

- `invoke:start` - 开始模型调用
- `invoke:complete` - 模型调用完成
- `invoke:error` - 模型调用出错
- `finetune:progress` - 微调任务进度更新
- `finetune:completed` - 微调任务完成
- `finetune:failed` - 微调任务失败

### 注册事件监听器

```javascript
// 注册助手事件
assistant.on('message:chunk', (chunk) => {
  process.stdout.write(chunk.content || '');
});

assistant.on('message:complete', (message) => {
  console.log('\n消息完成');
});

assistant.on('error', (error) => {
  console.error('助手错误:', error);
});

// 注册模型调用事件
sdk.modelInvocation.on('invoke:start', (request) => {
  console.log('开始调用模型:', request.modelId);
});

sdk.modelInvocation.on('invoke:complete', (response) => {
  console.log('模型调用完成，用时:', response.latency, 'ms');
});

sdk.modelInvocation.on('finetune:progress', (progress) => {
  console.log(`微调进度: ${progress.progress}%, 状态: ${progress.status}`);
});
```

### 移除事件监听器

```javascript
// 定义事件处理函数
function handleChunk(chunk) {
  process.stdout.write(chunk.content || '');
}

// 注册事件
assistant.on('message:chunk', handleChunk);

// 稍后移除特定事件监听器
assistant.off('message:chunk', handleChunk);

// 移除所有特定类型的事件监听器
assistant.off('message:chunk');
```

## 错误处理

SDK使用标准的JavaScript错误机制，并提供详细的错误信息。

```javascript
try {
  const response = await sdk.modelInvocation.invoke({
    modelId: 'nonexistent-model', // 不存在的模型ID
    messages: [
      { role: 'user', content: '你好' }
    ]
  });
} catch (error) {
  console.error('错误类型:', error.name);
  console.error('错误消息:', error.message);
  
  if (error.response) {
    console.error('响应状态:', error.response.status);
    console.error('错误详情:', error.response.data);
  }
  
  if (error.request) {
    console.error('请求详情:', error.request);
  }
}
```

### 常见错误类型

| 错误类型 | 描述 | 可能原因 |
|---------|------|---------|
| `AuthenticationError` | 身份验证错误 | API密钥无效或已过期 |
| `RateLimitError` | 速率限制错误 | 超过API调用限制 |
| `InvalidRequestError` | 无效请求错误 | 请求参数不正确 |
| `ModelNotFoundError` | 模型不存在错误 | 指定的模型ID不存在 |
| `ServiceUnavailableError` | 服务不可用错误 | 底层AI服务暂时不可用 |
| `TimeoutError` | 超时错误 | 请求超过了指定的超时时间 |
| `ContentModerationError` | 内容审核错误 | 内容被审核系统标记 |

## 高级用例

### 批量处理

```javascript
// 批量处理多个请求
async function batchProcess(prompts) {
  const results = [];
  const batchSize = 3; // 同时处理的最大请求数
  
  for (let i = 0; i < prompts.length; i += batchSize) {
    const batch = prompts.slice(i, i + batchSize);
    
    // 并行处理一批请求
    const batchResults = await Promise.all(
      batch.map(prompt => 
        sdk.modelInvocation.invoke({
          modelId: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }]
        })
      )
    );
    
    results.push(...batchResults);
  }
  
  return results;
}

// 使用示例
const prompts = [
  '什么是机器学习？',
  '解释神经网络',
  '什么是深度学习？',
  '解释强化学习',
  '什么是自然语言处理？'
];

const results = await batchProcess(prompts);
```

### 链式处理

```javascript
// 链式处理：一个模型的输出作为另一个模型的输入
async function processingChain(initialPrompt) {
  // 第一步：生成概要
  const summaryResponse = await sdk.modelInvocation.invoke({
    modelId: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: '创建一个简洁的概要。' },
      { role: 'user', content: initialPrompt }
    ]
  });
  
  const summary = summaryResponse.content;
  console.log('生成的概要:', summary);
  
  // 第二步：基于概要生成详细内容
  const detailedResponse = await sdk.modelInvocation.invoke({
    modelId: 'gpt-4o',
    messages: [
      { role: 'system', content: '基于提供的概要生成详细内容。' },
      { role: 'user', content: `基于以下概要生成一篇详细的文章：\n\n${summary}` }
    ]
  });
  
  return {
    summary: summary,
    detailedContent: detailedResponse.content
  };
}

// 使用示例
const result = await processingChain('解释人工智能的历史和未来发展趋势');
```

### 自定义缓存策略

```javascript
// 初始化SDK时配置自定义缓存
const sdk = acip.init({
  apiKey: process.env.ACIP_API_KEY,
  cacheEnabled: true,
  // 自定义缓存配置
  cacheConfig: {
    maxSize: 200,          // 最多缓存200条结果
    maxAge: 7200,          // 缓存有效期2小时
    excludeModels: ['gpt-4o-vision'],  // 排除特定模型
    excludePatterns: [     // 排除包含敏感词的请求
      'password', 'secret', 'credential'
    ],
    // 自定义缓存键生成函数
    keyGenerator: (request) => {
      // 忽略temperature参数的影响
      const { temperature, ...rest } = request;
      return JSON.stringify(rest);
    }
  }
});
```

### 自定义日志记录

```javascript
// 配置自定义日志记录
const sdk = acip.init({
  apiKey: process.env.ACIP_API_KEY,
  logger: {
    level: 'debug',  // 日志级别: debug, info, warn, error
    format: 'json',  // 日志格式: text, json
    transports: ['console', 'file'],  // 日志输出目标
    fileOptions: {
      filename: './logs/acip.log',
      maxSize: '10m',
      maxFiles: 5
    },
    // 自定义日志处理函数
    customHandler: (level, message, meta) => {
      // 添加应用特定信息
      meta.appVersion = '1.2.0';
      meta.environment = process.env.NODE_ENV;
      
      // 调用外部日志服务
      if (level === 'error') {
        notifyErrorMonitoringService(message, meta);
      }
    }
  }
});
```

## TypeScript支持

ACIP SDK提供完整的TypeScript类型定义，使您能够获得代码提示和类型检查。

```typescript
import { init, Assistant, ModelInvocation } from '@acip/sdk';

// 初始化SDK
const sdk = init({ 
  apiKey: process.env.ACIP_API_KEY as string 
});

// 使用类型定义
interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCalls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    }
  }>;
}

// 创建一个有类型的消息数组
const messages: ChatMessage[] = [
  { role: 'system', content: '你是一个有用的助手。' },
  { role: 'user', content: '你好！' }
];

// 使用类型化的API
async function sendMessage() {
  const response = await sdk.modelInvocation.invoke({
    modelId: 'gpt-4o',
    messages: messages
  });
  
  return response;
}
```

## 性能优化建议

### 缓存策略

- 启用SDK的内置缓存，以避免重复调用模型
- 对于频繁使用的提示，考虑使用应用级缓存
- 使用恰当的缓存生存期，平衡新鲜度和性能

### 请求优化

- 保持提示简短明确，减少不必要的上下文
- 使用适当的模型 - 不是所有任务都需要gpt-4o
- 设置合理的`max_tokens`值，避免生成过长的响应

### 流式响应

- 对于长回答，请使用流式响应，提升用户体验
- 在UI中显示打字机效果，让用户更早开始阅读

### 批处理

- 将多个相似请求批量处理，减少API调用次数
- 使用并行处理，但注意API速率限制

## 故障排除

### 常见问题

1. **API密钥无效**
   - 确保API密钥正确并有效
   - 检查是否有足够的使用配额

2. **响应超时**
   - 增加请求超时时间
   - 考虑使用流式响应
   - 检查网络连接

3. **速率限制错误**
   - 实现请求重试逻辑，包括退避策略
   - 减少并行请求数量
   - 考虑升级您的API使用计划

4. **内容被审核系统拒绝**
   - 检查您的提示是否包含敏感内容
   - 使用更中性的语言重新表述请求

## 下一步

- 查看[完整API参考文档](https://api.acip.ai/reference)
- 探索[示例应用和用例](https://github.com/acip-ai/examples)
- 加入[开发者社区](https://community.acip.ai)讨论和提问
- 了解[核心模块](./core-modules/README.md)的更多细节 