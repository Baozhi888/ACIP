/**
 * ACIP SDK 基本使用示例
 * 
 * 本示例展示了如何初始化ACIP SDK，配置选项，以及基本的模型调用
 */

// 导入SDK
const acip = require('@acip/sdk');
require('dotenv').config(); // 加载.env文件中的环境变量

// 初始化SDK
const sdk = acip.init({
  apiKey: process.env.ACIP_API_KEY,
  defaultModelId: 'gpt-4',
  cacheEnabled: true,
  logger: {
    level: 'info',
    transports: ['console']
  }
});

// 同步配置更新
sdk.configure({
  rateLimitingEnabled: true,
  costOptimizationEnabled: true
});

// 基本的模型调用
async function basicModelInvocation() {
  try {
    console.log('发送请求到模型...');
    
    const response = await sdk.modelInvocation.invoke({
      messages: [
        { role: 'system', content: '你是一个专业的AI助手，擅长解答问题并提供有用的信息。' },
        { role: 'user', content: '请解释什么是人工智能，并给出三个现实应用的例子。' }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });
    
    console.log('\n模型响应:');
    console.log(response.content);
    
    // 获取响应指标
    console.log('\n响应指标:');
    console.log(`- 用时: ${response.metrics.latency} ms`);
    console.log(`- 输入token数: ${response.metrics.inputTokens}`);
    console.log(`- 输出token数: ${response.metrics.outputTokens}`);
    console.log(`- 总token数: ${response.metrics.totalTokens}`);
    
  } catch (error) {
    console.error('模型调用错误:', error.message);
    if (error.response) {
      console.error('错误详情:', error.response.data);
    }
  }
}

// 流式响应示例
async function streamingExample() {
  try {
    console.log('\n创建流式响应...');
    console.log('问题: 详细解释量子计算的工作原理和潜在应用');
    console.log('模型响应: ');
    
    const stream = await sdk.modelInvocation.createStream({
      modelId: 'gpt-4',
      messages: [
        { role: 'system', content: '你是一个专业的科学解释者，善于用通俗易懂的语言解释复杂概念。' },
        { role: 'user', content: '详细解释量子计算的工作原理和潜在应用' }
      ],
      temperature: 0.5
    });
    
    // 处理流式数据
    stream.on('data', (chunk) => {
      process.stdout.write(chunk.content || '');
    });
    
    stream.on('end', () => {
      console.log('\n\n流式响应完成');
      
      // 获取流式会话的最终指标
      const metrics = stream.getMetrics();
      console.log('流式会话指标:');
      console.log(`- 总持续时间: ${metrics.totalDuration} ms`);
      console.log(`- 第一个token响应时间: ${metrics.timeToFirstToken} ms`);
      console.log(`- 总token数: ${metrics.totalTokens}`);
    });
    
    stream.on('error', (error) => {
      console.error('\n流式响应错误:', error);
    });
    
  } catch (error) {
    console.error('创建流式会话错误:', error.message);
  }
}

// 创建助手示例
async function assistantExample() {
  try {
    console.log('\n创建AI助手...');
    
    // 创建助手实例
    const assistant = sdk.createAssistant({
      modelId: 'gpt-4',
      systemPrompt: '你是一个编程专家，擅长解答与JavaScript编程相关的问题，并提供简洁、高效的代码示例。',
      name: 'JavaScript助手',
      temperature: 0.3,
      streaming: true
    });
    
    // 发送第一条消息并接收流式响应
    console.log('用户: 如何在JavaScript中实现一个简单的防抖函数？');
    console.log('助手: ');
    
    // 注册流式事件处理
    assistant.on('message:chunk', (chunk) => {
      process.stdout.write(chunk.content || '');
    });
    
    // 发送消息
    await assistant.sendMessage('如何在JavaScript中实现一个简单的防抖函数？');
    
    // 发送后续消息
    console.log('\n\n用户: 现在再给我解释一下节流函数，并说明它与防抖的区别');
    console.log('助手: ');
    
    await assistant.sendMessage('现在再给我解释一下节流函数，并说明它与防抖的区别');
    
    // 获取并打印完整对话历史
    const history = assistant.getHistory();
    console.log('\n对话历史:');
    history.forEach((message, index) => {
      console.log(`[${message.role}]: ${message.content.substring(0, 50)}...`);
    });
    
  } catch (error) {
    console.error('助手错误:', error.message);
  }
}

// 使用工具调用的示例
async function toolCallExample() {
  try {
    console.log('\n创建带工具调用的助手...');
    
    // 定义工具
    const tools = [
      {
        type: 'function',
        function: {
          name: 'getCurrentWeather',
          description: '获取指定位置的当前天气信息',
          parameters: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: '城市名称，如"北京"、"上海"、"广州"等'
              },
              unit: {
                type: 'string',
                enum: ['celsius', 'fahrenheit'],
                description: '温度单位，可选"celsius"或"fahrenheit"'
              }
            },
            required: ['location']
          }
        }
      }
    ];
    
    // 创建带工具的助手
    const assistant = sdk.createAssistant({
      modelId: 'gpt-4',
      systemPrompt: '你是一个旅行顾问，可以提供旅行建议并检查目的地的天气情况。',
      tools: tools,
      streaming: false
    });
    
    // 监听消息完成事件，处理工具调用
    assistant.on('message:complete', async (message) => {
      // 检查是否有工具调用
      if (message.toolCalls && message.toolCalls.length > 0) {
        console.log('检测到工具调用请求');
        
        const toolOutputs = [];
        
        for (const toolCall of message.toolCalls) {
          const { name, arguments: args } = toolCall.function;
          const parsedArgs = JSON.parse(args);
          
          console.log(`调用工具: ${name}`);
          console.log(`参数: ${JSON.stringify(parsedArgs, null, 2)}`);
          
          if (name === 'getCurrentWeather') {
            // 模拟获取天气数据
            const weatherData = await simulateWeatherAPI(
              parsedArgs.location,
              parsedArgs.unit || 'celsius'
            );
            
            toolOutputs.push({
              toolCallId: toolCall.id,
              output: JSON.stringify(weatherData)
            });
          }
        }
        
        // 将工具结果发送回助手
        if (toolOutputs.length > 0) {
          console.log('将工具结果发送回助手...');
          await assistant.submitToolOutputs(toolOutputs);
        }
      }
    });
    
    // 发送需要使用工具的消息
    console.log('用户: 我下周想去北京旅游，那里的天气怎么样？');
    const response = await assistant.sendMessage('我下周想去北京旅游，那里的天气怎么样？');
    
    console.log('助手最终回复:');
    console.log(response.content);
    
  } catch (error) {
    console.error('工具调用错误:', error.message);
  }
}

// 模拟天气API
async function simulateWeatherAPI(location, unit) {
  console.log(`模拟获取${location}的天气数据，单位: ${unit}`);
  
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 生成随机天气数据
  const temp = unit === 'celsius' 
    ? Math.floor(Math.random() * 35) 
    : Math.floor(Math.random() * 95);
  
  const conditions = ['晴朗', '多云', '阴天', '小雨', '大雨', '雷雨', '小雪', '大雪'];
  const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
  
  return {
    location: location,
    temperature: temp,
    unit: unit,
    condition: randomCondition,
    humidity: Math.floor(Math.random() * 100),
    windSpeed: Math.floor(Math.random() * 30),
    forecast: [
      { day: '今天', condition: randomCondition, tempHigh: temp + 2, tempLow: temp - 5 },
      { day: '明天', condition: conditions[Math.floor(Math.random() * conditions.length)], tempHigh: temp + 1, tempLow: temp - 6 },
      { day: '后天', condition: conditions[Math.floor(Math.random() * conditions.length)], tempHigh: temp + 3, tempLow: temp - 4 }
    ],
    lastUpdated: new Date().toISOString()
  };
}

// 运行所有示例
async function runAllExamples() {
  try {
    // 监听SDK事件
    sdk.on('invoke:start', (request) => {
      console.log(`[事件] 开始调用模型: ${request.modelId || sdk.config.defaultModelId}`);
    });

    sdk.on('invoke:complete', (response) => {
      console.log(`[事件] 模型调用完成，用时: ${response.metrics.latency} ms`);
    });
    
    // 运行基本模型调用示例
    await basicModelInvocation();
    
    // 运行流式响应示例
    await streamingExample();
    
    // 运行助手示例
    await assistantExample();
    
    // 运行工具调用示例
    await toolCallExample();
    
    console.log('\n所有示例已完成运行');
    
  } catch (error) {
    console.error('运行示例时出错:', error);
  }
}

// 立即运行所有示例
runAllExamples(); 