# 基本模型调用

`ModelInvocation.invoke()` 方法是ACIP SDK的核心功能，用于向AI模型发送请求并获取响应。本页面详细介绍了该方法的参数、返回值和使用方式。

## 功能概述

`invoke()` 方法提供了一个统一的接口，用于调用各种AI模型，无论它们来自哪个提供商。该方法支持自定义提示、模型参数和响应格式，并内置了错误处理、重试机制、指标收集和优化功能。

## 方法签名

```typescript
async invoke(options: InvokeOptions): Promise<InvokeResponse>
```

## 参数

`options` 对象支持以下参数：

| 参数名 | 类型 | 必填 | 默认值 | 描述 |
|-------|------|------|-------|------|
| `modelId` | string | 否 | SDK初始化时设置的defaultModelId | 要使用的AI模型ID |
| `messages` | Array<Message> | 是 | - | 发送给模型的消息数组 |
| `temperature` | number | 否 | 0.7 | 控制生成文本的随机性 (0-1) |
| `max_tokens` | number | 否 | 模型最大值 | 响应中生成的最大token数 |
| `top_p` | number | 否 | 1 | 核采样概率阈值 (0-1) |
| `frequency_penalty` | number | 否 | 0 | 减少重复词语的频率惩罚值 (-2.0到2.0) |
| `presence_penalty` | number | 否 | 0 | 增加新话题出现概率的惩罚值 (-2.0到2.0) |
| `stop` | string[] | 否 | [] | 停止生成的序列列表 |
| `user` | string | 否 | - | 最终用户的唯一标识符 |
| `cache` | boolean | 否 | SDK初始化时的cacheEnabled设置 | 是否启用响应缓存 |
| `timeout` | number | 否 | SDK初始化时的timeout设置 | 请求超时时间(毫秒) |
| `retryConfig` | RetryConfig | 否 | SDK初始化时的retryConfig | 请求重试配置 |
| `metadata` | Record<string, any> | 否 | {} | 与请求关联的自定义元数据 |
| `providerOptions` | Record<string, any> | 否 | {} | 特定于模型提供商的选项 |

### Message类型

```typescript
interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  }
}
```

### RetryConfig类型

```typescript
interface RetryConfig {
  maxRetries: number;        // 最大重试次数
  initialDelay: number;      // 首次重试等待时间(毫秒)
  maxDelay: number;          // 最长重试等待时间(毫秒)
  factor: number;            // 重试等待时间的增长因子
  retryOnStatusCodes: number[]; // 触发重试的HTTP状态码
}
```

## 返回值

方法返回一个Promise，解析为`InvokeResponse`对象：

```typescript
interface InvokeResponse {
  model: string;              // 使用的模型ID
  provider: string;           // 模型提供商(如openai, anthropic等)
  content: string;            // 模型生成的内容
  messages: Message[];        // 包含新生成消息的完整消息历史
  finishReason: string;       // 生成结束的原因(如stop, length等)
  toolCalls?: ToolCall[];     // 模型请求的工具调用
  usage?: {                   // Token使用情况
    promptTokens: number;     // 提示使用的token数
    completionTokens: number; // 完成使用的token数
    totalTokens: number;      // 总token数
  };
  metrics: {                  // 调用指标
    latency: number;          // 请求延迟(毫秒)
    inputTokens: number;      // 输入token数(可能是估算)
    outputTokens: number;     // 输出token数
    totalTokens: number;      // 总token数
    estimatedCost: number;    // 估算成本(美元)
    cached: boolean;          // 是否来自缓存
    optimizationApplied?: string; // 应用的优化策略
  };
  metadata?: Record<string, any>; // 请求中提供的元数据
}
```

## 使用示例

### 基本使用

```javascript
// 基本模型调用示例
const response = await sdk.modelInvocation.invoke({
  modelId: 'gpt-4',
  messages: [
    { role: 'system', content: '你是一个有用的助手。' },
    { role: 'user', content: '解释量子计算的基本原理' }
  ],
  temperature: 0.7,
  max_tokens: 500
});

console.log(response.content);
```

### 带错误处理的使用

```javascript
try {
  const response = await sdk.modelInvocation.invoke({
    modelId: 'gpt-4',
    messages: [
      { role: 'user', content: '解释相对论' }
    ]
  });
  
  console.log('模型响应:', response.content);
  console.log('使用的token数:', response.metrics.totalTokens);
  
} catch (error) {
  if (error.name === 'RateLimitError') {
    console.error('速率限制错误，请稍后重试');
  } else if (error.name === 'TimeoutError') {
    console.error('请求超时，可能需要简化问题');
  } else {
    console.error('调用模型时出错:', error.message);
  }
}
```

### 自定义缓存和重试配置

```javascript
const response = await sdk.modelInvocation.invoke({
  modelId: 'gpt-4',
  messages: [
    { role: 'user', content: '用Python写一个快速排序算法' }
  ],
  // 启用缓存
  cache: true,
  // 自定义重试配置
  retryConfig: {
    maxRetries: 5,
    initialDelay: 1000,
    maxDelay: 15000,
    factor: 2,
    retryOnStatusCodes: [429, 500, 502, 503, 504]
  },
  // 添加自定义元数据
  metadata: {
    userId: 'user-123',
    sessionId: 'session-456',
    requestType: 'code-generation'
  }
});
```

### 使用工具调用

```javascript
// 处理包含工具调用的响应
const response = await sdk.modelInvocation.invoke({
  modelId: 'gpt-4',
  messages: [
    { role: 'system', content: '你是一个有用的助手，可以使用工具。' },
    { role: 'user', content: '北京现在的天气怎么样？' }
  ],
  // 定义可用工具
  tools: [
    {
      type: 'function',
      function: {
        name: 'getCurrentWeather',
        description: '获取指定地点的当前天气',
        parameters: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: '城市名称，如"北京"、"上海"'
            }
          },
          required: ['location']
        }
      }
    }
  ]
});

// 检查是否有工具调用
if (response.toolCalls && response.toolCalls.length > 0) {
  console.log('模型请求使用工具:');
  const toolCall = response.toolCalls[0];
  console.log(`- 工具名称: ${toolCall.function.name}`);
  console.log(`- 参数: ${toolCall.function.arguments}`);
  
  // 处理工具调用并提供结果
  // ...
}
```

## 注意事项

- **模型ID**: 确保使用的`modelId`存在且您有权访问。可以通过`sdk.modelInvocation.getModels()`获取可用模型列表。
- **Token限制**: 每个模型都有输入token数限制，确保您的消息不超过模型的最大token限制。
- **成本优化**: 启用`costOptimizationEnabled`后，SDK可能会自动选择最佳模型或优化您的请求，以降低成本。
- **缓存行为**: 缓存键基于请求内容生成，默认情况下会考虑`temperature`等参数。可通过自定义缓存键生成器修改此行为。
- **超时处理**: 复杂或长篇请求可能需要更长的超时时间，特别是使用较大模型时。
- **重试策略**: 重试主要针对临时性错误（如速率限制、服务器错误），永久性错误（如认证失败、无效请求）不会重试。

## 相关API

- [**流式响应**](./streaming.md) - 使用流式API获取实时响应
- [**模型管理**](./models.md) - 获取和管理可用的AI模型
- [**指标收集**](./metrics.md) - 获取模型调用的指标和统计数据
- [**缓存管理**](./caching.md) - 配置和管理响应缓存
- [**成本优化**](../advanced/cost-optimization.md) - 优化模型调用成本
- [**错误处理**](../core/errors.md) - 处理模型调用错误 