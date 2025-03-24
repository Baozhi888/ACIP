/**
 * ACIP SDK 高级使用示例
 * 
 * 本示例展示了ACIP SDK的高级功能，包括:
 * - 批量处理请求
 * - 并发请求处理
 * - 自定义缓存策略
 * - 错误处理和重试机制
 * - 链式模型调用
 * - 高级事件处理
 */

// 导入SDK和依赖
const acip = require('@acip/sdk');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// 初始化SDK，设置高级配置
const sdk = acip.init({
  apiKey: process.env.ACIP_API_KEY,
  defaultModelId: 'gpt-4',
  
  // 自定义缓存配置
  cacheEnabled: true,
  cacheConfig: {
    maxSize: 200,          // 最多缓存200条结果
    maxAge: 7200,          // 缓存有效期2小时
    excludeModels: ['gpt-4-vision'],  // 排除特定模型
    excludePatterns: [     // 排除包含敏感词的请求
      'password', 'secret', 'credential'
    ],
    // 自定义缓存键生成函数
    keyGenerator: (request) => {
      // 忽略temperature参数的影响，只根据消息内容生成缓存键
      const { temperature, top_p, ...rest } = request;
      return JSON.stringify(rest);
    }
  },
  
  // 设置请求超时和重试配置
  timeout: 60000,  // 60秒超时
  retryConfig: {
    maxRetries: 3,
    initialDelay: 1000,  // 首次重试等待1秒
    maxDelay: 10000,     // 最长等待10秒
    factor: 2,           // 退避指数因子
    retryOnStatusCodes: [429, 500, 502, 503, 504]  // 在这些状态码上重试
  },
  
  // 高级日志配置
  logger: {
    level: 'debug',  // 较详细的日志级别
    format: 'json',  // JSON格式日志
    transports: ['console', 'file'],  // 同时输出到控制台和文件
    fileOptions: {
      filename: './logs/acip-advanced.log',
      maxSize: '10m',
      maxFiles: 5
    }
  },
  
  // 开启其他优化功能
  rateLimitingEnabled: true,
  costOptimizationEnabled: true
});

// 演示批量处理功能
async function batchProcessingDemo() {
  console.log('=== 批量处理演示 ===');
  
  // 准备多个请求
  const prompts = [
    '用简短的一段话解释机器学习',
    '用简短的一段话解释神经网络',
    '用简短的一段话解释深度学习',
    '用简短的一段话解释强化学习',
    '用简短的一段话解释自然语言处理',
    '用简短的一段话解释计算机视觉'
  ];
  
  console.log(`准备处理 ${prompts.length} 个请求...`);
  
  // 批量处理函数
  async function batchProcess(prompts) {
    const results = [];
    const batchSize = 3; // 同时处理的最大请求数
    
    // 当前批次计数
    let batchCount = 0;
    
    for (let i = 0; i < prompts.length; i += batchSize) {
      batchCount++;
      const batch = prompts.slice(i, i + batchSize);
      console.log(`处理批次 ${batchCount}/${Math.ceil(prompts.length / batchSize)}，包含 ${batch.length} 个请求`);
      
      // 使用Promise.all并行处理一批请求
      const startTime = Date.now();
      const batchResults = await Promise.all(
        batch.map((prompt, index) => {
          console.log(`  发送请求 ${i + index + 1}/${prompts.length}: "${prompt.substring(0, 30)}..."`);
          
          return sdk.modelInvocation.invoke({
            modelId: 'gpt-3.5-turbo', // 使用速度更快的模型
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 150  // 限制响应长度
          }).catch(error => {
            // 单个请求出错不应该导致整个批次失败
            console.error(`  请求 ${i + index + 1} 出错:`, error.message);
            return { content: `[ERROR: ${error.message}]` };
          });
        })
      );
      
      const timeTaken = Date.now() - startTime;
      console.log(`批次 ${batchCount} 完成，用时: ${timeTaken}ms，平均每个请求 ${Math.round(timeTaken / batch.length)}ms`);
      
      results.push(...batchResults);
    }
    
    return results;
  }
  
  try {
    // 执行批量处理
    const results = await batchProcess(prompts);
    
    // 显示结果
    console.log('\n批量处理结果:');
    results.forEach((result, index) => {
      console.log(`\n${index + 1}. 问题: ${prompts[index]}`);
      console.log(`   回答: ${result.content}`);
    });
    
    // 分析批量请求的性能
    const metrics = sdk.modelInvocation.getMetrics();
    console.log(`\n批量处理性能分析:`);
    console.log(`- 总请求数: ${metrics.totalRequests}`);
    console.log(`- 平均响应时间: ${metrics.avgLatency}ms`);
    console.log(`- 缓存命中率: ${metrics.cacheHitRate * 100}%`);
    console.log(`- 总Token消耗: ${metrics.totalTokens}`);
    
  } catch (error) {
    console.error('批量处理出错:', error);
  }
}

// 演示高级错误处理和重试机制
async function errorHandlingDemo() {
  console.log('\n=== 错误处理和重试机制演示 ===');
  
  // 创建一个测试函数，模拟不同类型的错误
  async function testErrorHandling(errorType) {
    try {
      console.log(`测试错误类型: ${errorType}`);
      
      let response;
      
      switch (errorType) {
        case 'invalid_model':
          // 测试无效模型错误
          response = await sdk.modelInvocation.invoke({
            modelId: 'nonexistent-model',
            messages: [{ role: 'user', content: '你好' }]
          });
          break;
          
        case 'rate_limit':
          // 模拟速率限制错误 (这里通过一个特殊提示来触发我们的测试环境)
          response = await sdk.modelInvocation.invoke({
            modelId: 'gpt-4',
            messages: [{ role: 'user', content: '[SIMULATE_RATE_LIMIT_ERROR] 测试' }]
          });
          break;
          
        case 'timeout':
          // 模拟超时错误
          const timeoutSdk = acip.init({
            ...sdk.config,
            timeout: 1  // 设置超短的超时时间
          });
          
          response = await timeoutSdk.modelInvocation.invoke({
            modelId: 'gpt-4',
            messages: [{ 
              role: 'user', 
              content: '写一篇非常详细的文章，包含至少2000个字...' 
            }]
          });
          break;
          
        case 'content_moderation':
          // 模拟内容审核错误
          response = await sdk.modelInvocation.invoke({
            modelId: 'gpt-4',
            messages: [{ 
              role: 'user', 
              content: '[SIMULATE_CONTENT_VIOLATION] 测试不当内容' 
            }]
          });
          break;
          
        case 'auto_retry':
          // 测试自动重试机制
          console.log('模拟服务器错误并测试自动重试功能...');
          sdk.on('retry', (attempt, error, delay) => {
            console.log(`重试尝试 #${attempt}，因为: ${error.message}，将在 ${delay}ms 后重试`);
          });
          
          response = await sdk.modelInvocation.invoke({
            modelId: 'gpt-4',
            messages: [{ 
              role: 'user', 
              content: '[SIMULATE_SERVER_ERROR_WITH_RETRY] 测试自动重试' 
            }]
          });
          break;
          
        default:
          throw new Error(`未知的错误类型: ${errorType}`);
      }
      
      // 如果没有抛出错误，说明错误处理失败
      console.error(`预期会发生 ${errorType} 错误，但却成功返回了:`, response);
      
    } catch (error) {
      // 详细分析和处理错误
      console.log(`捕获到错误 (${errorType}):`);
      console.log(`- 错误名称: ${error.name}`);
      console.log(`- 错误消息: ${error.message}`);
      
      // 展示重试信息
      if (error.retryAttempts) {
        console.log(`- 重试次数: ${error.retryAttempts}次`);
        console.log(`- 总耗时: ${error.totalTime}ms (包含重试)`);
      }
      
      // 错误处理建议
      const errorHandlingStrategy = {
        'ModelNotFoundError': '请检查模型ID是否正确，或使用sdk.modelInvocation.getModels()获取可用模型列表',
        'RateLimitError': '实现指数退避重试或减少并发请求数量',
        'TimeoutError': '增加超时时间设置，或分解为更小的请求',
        'ContentModerationError': '审查并修改输入内容，确保符合使用政策'
      };
      
      const suggestion = errorHandlingStrategy[error.name] || '请联系SDK支持团队';
      console.log(`- 处理建议: ${suggestion}`);
      
      // 返回错误对象以便调用者进一步处理
      return error;
    }
  }
  
  // 依次测试各种错误类型
  const errorTypes = ['invalid_model', 'rate_limit', 'timeout', 'content_moderation', 'auto_retry'];
  
  for (const errorType of errorTypes) {
    await testErrorHandling(errorType);
    console.log(''); // 添加空行分隔
  }
}

// 演示链式模型调用 (Chain of Thought)
async function chainOfThoughtDemo() {
  console.log('\n=== 链式模型调用演示 ===');
  
  // 一个复杂的问题
  const complexQuestion = `设计一个智能家居系统的架构，该系统需要整合照明、安全、温控和娱乐系统，并提供语音和移动应用控制界面。`;
  
  console.log(`复杂问题: "${complexQuestion}"`);
  console.log('开始链式处理...');
  
  // 第一步 - 问题分解
  console.log('\n步骤 1: 问题分解');
  const decompositionResponse = await sdk.modelInvocation.invoke({
    modelId: 'gpt-4',
    messages: [
      { role: 'system', content: '你是一个专业的系统架构分析师。你的任务是将复杂的系统设计问题分解为明确的子问题。只列出子问题，不要提供解决方案。' },
      { role: 'user', content: complexQuestion }
    ]
  });
  
  console.log('问题分解结果:');
  console.log(decompositionResponse.content);
  
  // 第二步 - 为每个子问题生成解决方案
  console.log('\n步骤 2: 子问题分析');
  
  // 将分解结果转换为子问题数组
  const subProblems = decompositionResponse.content
    .split('\n')
    .filter(line => line.trim().length > 0)
    .map(line => line.replace(/^\d+\.\s*/, '').trim());
  
  const solutions = [];
  
  for (const [index, subProblem] of subProblems.entries()) {
    console.log(`\n分析子问题 ${index + 1}/${subProblems.length}: "${subProblem}"`);
    
    const solutionResponse = await sdk.modelInvocation.invoke({
      modelId: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: '你是一个专业的系统架构师。提供简洁明了的技术解决方案。' },
        { role: 'user', content: `为以下问题提供技术解决方案 (150字以内):\n${subProblem}` }
      ],
      max_tokens: 250
    });
    
    solutions.push({
      problem: subProblem,
      solution: solutionResponse.content
    });
    
    console.log(`解决方案: ${solutionResponse.content.substring(0, 100)}...`);
  }
  
  // 第三步 - 整合所有解决方案
  console.log('\n步骤 3: 整合解决方案');
  
  // 构建集成提示
  let integrationPrompt = `基于以下各个组件的解决方案，设计一个完整、连贯的智能家居系统架构：\n\n`;
  
  solutions.forEach((item, index) => {
    integrationPrompt += `组件 ${index + 1}: ${item.problem}\n`;
    integrationPrompt += `解决方案: ${item.solution}\n\n`;
  });
  
  integrationPrompt += `请提供一个整合所有这些组件的完整系统架构设计，包括组件之间的交互和数据流。`;
  
  const finalResponse = await sdk.modelInvocation.invoke({
    modelId: 'gpt-4',
    messages: [
      { role: 'system', content: '你是一个高级系统架构师，擅长整合多个子系统设计为一个连贯的整体架构。' },
      { role: 'user', content: integrationPrompt }
    ]
  });
  
  console.log('\n最终系统架构:');
  console.log(finalResponse.content);
  
  // 分析和保存结果
  try {
    // 创建结果对象
    const result = {
      originalQuestion: complexQuestion,
      decomposition: decompositionResponse.content,
      subProblems: solutions,
      finalArchitecture: finalResponse.content,
      metadata: {
        timestamp: new Date().toISOString(),
        modelUsed: {
          decomposition: 'gpt-4',
          solutions: 'gpt-3.5-turbo',
          integration: 'gpt-4'
        },
        tokenUsage: {
          decomposition: decompositionResponse.metrics.totalTokens,
          solutions: solutions.reduce((sum, s) => sum + s.solution.length, 0) / 4, // 估算
          integration: finalResponse.metrics.totalTokens,
        }
      }
    };
    
    // 确保输出目录存在
    const outputDir = path.join(__dirname, 'output');
    await fs.mkdir(outputDir, { recursive: true });
    
    // 保存结果到文件
    const filename = path.join(outputDir, `architecture_design_${Date.now()}.json`);
    await fs.writeFile(filename, JSON.stringify(result, null, 2));
    
    console.log(`\n链式调用结果已保存到: ${filename}`);
    
  } catch (error) {
    console.error('保存结果出错:', error);
  }
}

// 演示自定义缓存与成本优化
async function cacheAndCostOptimizationDemo() {
  console.log('\n=== 缓存与成本优化演示 ===');
  
  // 重置指标以便于观察
  sdk.modelInvocation.resetMetrics();
  
  console.log('测试相同请求的缓存行为...');
  
  const samplePrompt = '简要解释量子计算的基本原理';
  
  // 函数：执行请求并显示指标
  async function makeRequest(iteration) {
    const startTime = Date.now();
    
    const response = await sdk.modelInvocation.invoke({
      messages: [{ role: 'user', content: samplePrompt }],
      temperature: 0.7  // 注意：我们的自定义缓存忽略temperature参数
    });
    
    const duration = Date.now() - startTime;
    const metrics = sdk.modelInvocation.getMetrics();
    const isCached = duration < 500; // 简单估计，如果响应很快，可能是缓存命中
    
    console.log(`请求 #${iteration}:`);
    console.log(`- 耗时: ${duration}ms`);
    console.log(`- 缓存状态: ${isCached ? '命中' : '未命中'}`);
    console.log(`- 当前缓存命中率: ${(metrics.cacheHits / metrics.totalRequests * 100).toFixed(1)}%`);
    
    if (iteration === 1) {
      // 只在第一次显示完整响应
      console.log(`- 响应: "${response.content.substring(0, 100)}..."`);
    }
    
    return { response, metrics, duration };
  }
  
  // 执行三次相同请求，观察缓存行为
  await makeRequest(1);
  await makeRequest(2);
  await makeRequest(3);
  
  // 测试成本优化功能
  console.log('\n测试成本优化功能...');
  
  // 启用详细成本跟踪
  sdk.modelInvocation.configure({
    costOptimizationEnabled: true,
    costTracking: {
      enabled: true,
      detailed: true,
      currency: 'USD'
    }
  });
  
  // 使用不同的提示长度和复杂度测试
  const testCases = [
    { name: '简短查询', content: '什么是机器学习？' },
    { name: '中等查询', content: '解释机器学习的主要类型和应用场景，包括监督学习、无监督学习和强化学习。' },
    { name: '复杂查询', content: '详细分析深度学习在计算机视觉中的应用，包括卷积神经网络的架构、关键技术突破和现实应用案例。请包含技术细节和近期研究方向。' }
  ];
  
  let totalOriginalCost = 0;
  let totalOptimizedCost = 0;
  
  for (const testCase of testCases) {
    console.log(`\n测试: ${testCase.name}`);
    
    // 先禁用优化，获取基准成本
    sdk.modelInvocation.configure({ costOptimizationEnabled: false });
    
    const baseResponse = await sdk.modelInvocation.invoke({
      modelId: 'gpt-4',
      messages: [{ role: 'user', content: testCase.content }]
    });
    
    const baseCost = baseResponse.metrics.estimatedCost;
    totalOriginalCost += baseCost;
    
    // 启用优化，比较成本
    sdk.modelInvocation.configure({ costOptimizationEnabled: true });
    
    const optimizedResponse = await sdk.modelInvocation.invoke({
      // 不指定模型，让优化器选择
      messages: [{ role: 'user', content: testCase.content }]
    });
    
    const optimizedCost = optimizedResponse.metrics.estimatedCost;
    totalOptimizedCost += optimizedCost;
    
    const savings = ((1 - optimizedCost / baseCost) * 100).toFixed(1);
    const selectedModel = optimizedResponse.model || '(自动选择的模型)';
    
    console.log(`原始成本: $${baseCost.toFixed(5)} (使用 gpt-4)`);
    console.log(`优化成本: $${optimizedCost.toFixed(5)} (使用 ${selectedModel})`);
    console.log(`节省: ${savings}%`);
    console.log(`优化策略: ${optimizedResponse.optimizationApplied || '模型选择'}`);
  }
  
  // 显示总体优化结果
  const totalSavings = ((1 - totalOptimizedCost / totalOriginalCost) * 100).toFixed(1);
  
  console.log(`\n总体成本分析:`);
  console.log(`- 未优化总成本: $${totalOriginalCost.toFixed(5)}`);
  console.log(`- 优化后总成本: $${totalOptimizedCost.toFixed(5)}`);
  console.log(`- 总节省: ${totalSavings}%`);
  
  // 获取优化器统计数据
  const optimizerStats = sdk.modelInvocation.getCostOptimizerStats();
  
  console.log(`\n优化器统计:`);
  console.log(`- 处理请求数: ${optimizerStats.requestsProcessed}`);
  console.log(`- 成功优化次数: ${optimizerStats.optimizationsApplied}`);
  console.log(`- 累计节省: $${optimizerStats.totalSavings.toFixed(5)}`);
  console.log(`- 优化策略效果排名:`);
  
  Object.entries(optimizerStats.savingsByStrategy)
    .sort((a, b) => b[1] - a[1])
    .forEach(([strategy, savings]) => {
      console.log(`  · ${strategy}: $${savings.toFixed(5)}`);
    });
}

// 演示高级事件处理
async function advancedEventHandlingDemo() {
  console.log('\n=== 高级事件处理演示 ===');
  
  // 创建自定义事件记录器
  const eventLog = [];
  
  function logEvent(eventName, data) {
    const timestamp = new Date().toISOString();
    eventLog.push({ timestamp, eventName, data });
    console.log(`[${timestamp}] 事件: ${eventName}`);
  }
  
  // 注册各种事件监听器
  console.log('注册事件监听器...');
  
  sdk.on('invoke:start', (request) => {
    logEvent('invoke:start', { modelId: request.modelId });
  });
  
  sdk.on('invoke:complete', (response) => {
    logEvent('invoke:complete', { 
      modelId: response.model,
      latency: response.metrics.latency,
      tokens: response.metrics.totalTokens
    });
  });
  
  sdk.on('invoke:error', (error) => {
    logEvent('invoke:error', { 
      name: error.name, 
      message: error.message 
    });
  });
  
  sdk.on('cache:hit', (key) => {
    logEvent('cache:hit', { key: key.substring(0, 20) + '...' });
  });
  
  sdk.on('cache:miss', (key) => {
    logEvent('cache:miss', { key: key.substring(0, 20) + '...' });
  });
  
  sdk.on('optimization:applied', (strategy, savings) => {
    logEvent('optimization:applied', { strategy, savings });
  });
  
  // 执行一些操作来触发事件
  console.log('\n执行操作以触发事件...');
  
  // 正常请求 - 应该触发 invoke:start 和 invoke:complete
  await sdk.modelInvocation.invoke({
    messages: [{ role: 'user', content: '今天天气怎么样？' }]
  });
  
  // 带缓存的请求 - 第二次应该触发 cache:hit
  await sdk.modelInvocation.invoke({
    messages: [{ role: 'user', content: '列出三种常见的编程语言' }]
  });
  
  await sdk.modelInvocation.invoke({
    messages: [{ role: 'user', content: '列出三种常见的编程语言' }]
  });
  
  // 错误请求 - 应该触发 invoke:error
  try {
    await sdk.modelInvocation.invoke({
      modelId: 'invalid-model',
      messages: [{ role: 'user', content: '测试错误' }]
    });
  } catch (error) {
    // 错误已由事件处理器记录
  }
  
  // 优化请求 - 应该触发 optimization:applied
  await sdk.modelInvocation.invoke({
    messages: [{ role: 'user', content: '用一句话描述什么是计算机' }]
  });
  
  // 显示收集的事件日志
  console.log('\n事件日志摘要:');
  
  // 按事件类型对日志进行分组和计数
  const eventCounts = {};
  eventLog.forEach(event => {
    eventCounts[event.eventName] = (eventCounts[event.eventName] || 0) + 1;
  });
  
  // 显示事件计数
  Object.entries(eventCounts).forEach(([eventName, count]) => {
    console.log(`- ${eventName}: ${count}次`);
  });
  
  // 创建一个简单的事件可视化
  console.log('\n事件时间线:');
  
  const startTime = new Date(eventLog[0].timestamp).getTime();
  
  eventLog.forEach(event => {
    const eventTime = new Date(event.timestamp).getTime();
    const timeOffset = eventTime - startTime;
    const bar = '█'.repeat(Math.min(50, Math.floor(timeOffset / 10)));
    
    console.log(`${timeOffset}ms ${bar} ${event.eventName}`);
  });
}

// 运行所有高级示例
async function runAllAdvancedExamples() {
  console.log('====== ACIP SDK 高级示例 ======\n');
  
  try {
    // 批量处理演示
    await batchProcessingDemo();
    
    // 链式模型调用演示
    await chainOfThoughtDemo();
    
    // 缓存和成本优化演示
    await cacheAndCostOptimizationDemo();
    
    // 错误处理演示
    await errorHandlingDemo();
    
    // 高级事件处理演示
    await advancedEventHandlingDemo();
    
    console.log('\n====== 所有高级示例已完成 ======');
    
  } catch (error) {
    console.error('\n运行高级示例时出错:', error);
  }
}

// 运行所有示例
runAllAdvancedExamples(); 