# ACIP SDK API 参考文档

欢迎使用ACIP SDK的API参考文档。本文档详细介绍了SDK的所有模块、类、方法和配置选项，帮助开发者全面了解SDK的功能和用法。

## 目录结构

API参考文档按模块和功能区分为多个部分：

### 核心模块

- [**SDK初始化与配置**](./core/initialization.md) - 如何初始化SDK及可用的配置选项
- [**事件系统**](./core/events.md) - 事件注册、监听和处理机制
- [**错误处理**](./core/errors.md) - 错误类型、错误处理最佳实践和重试机制

### 模型调用

- [**ModelInvocation**](./model-invocation/overview.md) - 模型调用模块概述
- [**基本调用**](./model-invocation/basic-invocation.md) - 标准模型调用方法
- [**流式响应**](./model-invocation/streaming.md) - 创建和处理流式响应
- [**模型管理**](./model-invocation/models.md) - 获取可用模型和模型信息
- [**指标收集**](./model-invocation/metrics.md) - 获取和分析调用指标
- [**缓存管理**](./model-invocation/caching.md) - 响应缓存配置和优化
- [**批处理与并发**](./model-invocation/batch-processing.md) - 批量请求和并发控制

### AI助手

- [**Assistant**](./assistant/overview.md) - 对话助手模块概述
- [**创建与配置**](./assistant/creation.md) - 创建和配置助手实例
- [**消息交互**](./assistant/messaging.md) - 发送消息和处理响应
- [**对话管理**](./assistant/conversation.md) - 管理对话历史和上下文
- [**工具调用**](./assistant/tools.md) - 定义和使用工具（函数调用）

### 高级功能

- [**模型微调**](./advanced/fine-tuning.md) - 创建和管理模型微调任务
- [**成本优化**](./advanced/cost-optimization.md) - 优化模型调用成本
- [**速率限制**](./advanced/rate-limiting.md) - 设置和管理速率限制
- [**内容审核**](./advanced/content-moderation.md) - 内容过滤和审核功能
- [**安全与身份验证**](./advanced/security.md) - 安全功能和身份验证选项

### 类型定义（TypeScript）

- [**核心类型**](./types/core.md) - 基本配置和初始化类型
- [**请求类型**](./types/requests.md) - 请求参数和选项类型
- [**响应类型**](./types/responses.md) - 响应结构和数据类型
- [**事件类型**](./types/events.md) - 事件处理相关类型
- [**错误类型**](./types/errors.md) - 错误和异常类型

## 使用本文档

每个API参考页面包含以下内容：

- **功能概述** - 对相关功能的简要描述
- **方法签名** - 详细的方法参数和返回值
- **示例** - 具体的代码示例
- **注意事项** - 使用时需要注意的问题和限制
- **相关API** - 相关联的其他API引用

## 版本信息

本文档适用于ACIP SDK v1.0.0及以上版本。API可能会随着SDK的更新而变化，请确保参考与您使用的SDK版本相匹配的文档。

当前最新版本：**v1.0.0**

## 快速入门

如果您是首次使用ACIP SDK，建议先阅读[入门指南](../getting-started/README.md)，然后再深入了解具体API详情。

## 支持与反馈

如果您在使用API时遇到问题，或对文档有任何建议，请通过以下渠道联系我们：

- [GitHub Issues](https://github.com/acip-ai/sdk/issues)
- [开发者社区论坛](https://community.acip.ai)
- [开发者Discord](https://discord.gg/acip-dev) 