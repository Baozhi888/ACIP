# ACIP SDK 使用示例

本目录包含了ACIP SDK的使用示例，帮助开发者快速上手使用ACIP的各种功能。

## 示例列表

1. [基本模型调用](./basic-model-invocation.js) - 展示如何进行基本的AI模型调用
2. [创建对话助手](./create-assistant.js) - 展示如何创建和使用对话式AI助手
3. [模型流式响应](./streaming-response.js) - 展示如何使用流式响应获取实时结果
4. [工具使用示例](./tool-usage.js) - 展示如何使用工具增强AI能力
5. [模型微调操作](./fine-tuning.js) - 展示如何创建和管理模型微调任务

## 快速入门

要运行这些示例，您需要先设置您的API密钥：

```bash
# 设置环境变量
export ACIP_API_KEY=your_api_key_here
```

然后，您可以运行任何示例：

```bash
node examples/basic-model-invocation.js
```

## 基本用法

以下是使用ACIP SDK的基本示例：

```javascript
const acip = require('@acip/sdk').init({ 
  apiKey: process.env.ACIP_API_KEY 
});

// 调用AI模型
async function main() {
  try {
    const response = await acip.modelInvocation.invoke({
      modelId: 'gpt-4oo',
      messages: [
        { role: 'system', content: '你是一个有帮助的AI助手。' },
        { role: 'user', content: '解释什么是ACIP？' }
      ]
    });
    
    console.log('AI回复:', response.content);
  } catch (error) {
    console.error('调用失败:', error);
  }
}

main();
```

## 创建对话助手

创建一个持续对话的AI助手：

```javascript
const acip = require('@acip/sdk').init({ 
  apiKey: process.env.ACIP_API_KEY 
});

// 创建助手
const assistant = acip.createAssistant({
  modelId: 'gpt-4oo',
  systemPrompt: '你是一个专注于帮助用户解决编程问题的AI助手。',
  name: '编程助手'
});

// 对话示例
async function chat() {
  try {
    // 发送第一条消息
    let response = await assistant.sendMessage('如何在JavaScript中实现防抖函数？');
    console.log('AI:', response.content);
    
    // 继续对话
    response = await assistant.sendMessage('这个与节流函数有什么区别？');
    console.log('AI:', response.content);
  } catch (error) {
    console.error('对话失败:', error);
  }
}

chat();
```

## 高级用法

请查看各个示例文件，了解更多高级用法，包括：

- 流式响应处理
- 工具使用和函数调用
- 异步请求处理
- 错误处理和重试策略
- 模型微调和自定义

## 更多资源

- [ACIP SDK 完整文档](https://docs.acip.ai)
- [API 参考](https://api.acip.ai/reference)
- [常见问题解答](https://docs.acip.ai/faq) 