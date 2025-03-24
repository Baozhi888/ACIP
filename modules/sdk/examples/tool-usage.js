/**
 * ACIP SDK - 工具使用示例
 * 
 * 此示例展示了如何使用ACIP SDK让AI助手调用工具/函数
 * 展示的是一个天气查询和计算器工具的实现
 */

// 导入ACIP SDK和readline模块用于命令行交互
const acip = require('@acip/sdk');
const readline = require('readline');

// 创建命令行接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 定义工具函数
const tools = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: '获取特定位置的当前天气信息',
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
            description: '温度单位，默认为摄氏度(celsius)'
          }
        },
        required: ['location']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'calculate',
      description: '执行数学计算',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: '要计算的数学表达式，如"2 + 2"、"sin(45)"等'
          }
        },
        required: ['expression']
      }
    }
  }
];

// 主函数
async function main() {
  try {
    // 从环境变量获取API密钥
    const apiKey = process.env.ACIP_API_KEY;
    if (!apiKey) {
      console.error('错误: 未设置ACIP_API_KEY环境变量');
      console.error('请先设置您的API密钥: export ACIP_API_KEY=your_api_key_here');
      process.exit(1);
    }
    
    // 初始化SDK
    const sdk = acip.init({ apiKey });
    
    console.log('ACIP SDK 工具使用示例');
    console.log('版本:', sdk.getVersion());
    console.log('------------------------------------');
    console.log('创建一个带工具的AI助手实例...');
    
    // 创建助手
    const assistant = sdk.createAssistant({
      modelId: 'gpt-4',
      systemPrompt: '你是一个有用的AI助手，可以回答问题并使用工具帮助用户。当用户询问天气或需要数学计算时，请使用相应的工具来获取信息。',
      temperature: 0.7,
      maxTokens: 1024,
      name: '工具助手',
      tools: tools, // 提供工具定义
    });
    
    console.log('AI助手已创建完成！');
    console.log('------------------------------------');
    console.log('可用工具:');
    console.log('1. get_weather - 获取天气信息');
    console.log('   示例: "北京今天天气怎么样？"');
    console.log('2. calculate - 执行数学计算');
    console.log('   示例: "计算123 * 456"');
    console.log('------------------------------------');
    console.log('开始交互式对话 (输入"退出"或"exit"结束对话)');
    console.log('------------------------------------');
    
    // 开始对话循环
    startConversation(assistant);
    
  } catch (error) {
    console.error('初始化失败:', error.message);
    process.exit(1);
  }
}

// 对话循环函数
function startConversation(assistant) {
  // 处理消息事件
  assistant.on('message:complete', (message) => {
    // 检查是否有工具调用
    if (message.toolCalls && message.toolCalls.length > 0) {
      // 处理工具调用
      handleToolCalls(message.toolCalls);
    } else {
      // 直接显示下一个提示
      console.log('\n------------------------------------');
      promptUser();
    }
  });
  
  // 错误事件处理器
  assistant.on('error', (error) => {
    console.error('\n错误:', error.message);
    promptUser();
  });
  
  // 处理工具调用
  async function handleToolCalls(toolCalls) {
    console.log('\n[系统] 助手请求使用工具，正在处理...');
    
    // 存储工具调用结果
    const toolOutputs = [];
    
    // 处理每个工具调用
    for (const toolCall of toolCalls) {
      const { name, arguments: args } = toolCall.function;
      const parsedArgs = JSON.parse(args);
      
      console.log(`[系统] 调用工具: ${name} 参数:`, parsedArgs);
      
      let result;
      
      // 根据工具名称执行相应的函数
      if (name === 'get_weather') {
        result = await getWeather(parsedArgs.location, parsedArgs.unit);
      } else if (name === 'calculate') {
        result = calculate(parsedArgs.expression);
      } else {
        result = { error: `未知工具: ${name}` };
      }
      
      console.log(`[系统] 工具结果:`, result);
      
      // 添加到工具输出
      toolOutputs.push({
        toolCallId: toolCall.id,
        output: JSON.stringify(result)
      });
    }
    
    // 将所有工具结果发送回助手
    console.log('[系统] 将工具结果发送回助手...');
    console.log('AI: ');
    
    try {
      await assistant.submitToolOutputs(toolOutputs);
    } catch (error) {
      console.error('提交工具输出失败:', error);
      promptUser();
    }
  }
  
  // 提示用户输入
  function promptUser() {
    rl.question('您: ', async (input) => {
      // 检查是否退出
      if (input.toLowerCase() === 'exit' || input === '退出') {
        rl.close();
        console.log('对话已结束');
        process.exit(0);
        return;
      }
      
      // 发送消息到助手
      console.log('AI: ');
      try {
        await assistant.sendMessage(input);
      } catch (error) {
        console.error('\n发送消息失败:', error.message);
        promptUser();
      }
    });
  }
  
  // 开始对话
  console.log('AI: 你好！我是你的AI助手，可以回答问题、查询天气和进行数学计算。有什么我能帮到你的吗？');
  promptUser();
}

// 模拟的天气API调用
async function getWeather(location, unit = 'celsius') {
  // 在实际应用中，这将是一个真实的API调用
  console.log(`[系统] 正在获取${location}的天气数据...`);
  
  // 模拟请求延迟
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // 生成随机天气数据
  const conditions = ['晴朗', '多云', '阴天', '小雨', '大雨', '雷雨', '雾', '雪'];
  const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
  
  // 生成随机温度（摄氏度）
  const tempC = Math.floor(Math.random() * 35) + 5; // 5°C to 40°C
  
  // 转换温度单位（如果需要）
  const temperature = unit === 'fahrenheit' ? (tempC * 9/5) + 32 : tempC;
  const unitSymbol = unit === 'fahrenheit' ? '°F' : '°C';
  
  // 湿度百分比
  const humidity = Math.floor(Math.random() * 60) + 30; // 30% to 90%
  
  return {
    location: location,
    condition: randomCondition,
    temperature: temperature + unitSymbol,
    humidity: humidity + '%',
    updated: new Date().toLocaleString(),
    message: `${location}目前天气${randomCondition}，温度${temperature}${unitSymbol}，湿度${humidity}%。`
  };
}

// 计算器函数
function calculate(expression) {
  console.log(`[系统] 计算表达式: ${expression}`);
  
  try {
    // 注意：eval有安全风险，在实际应用中请使用更安全的方法
    // 如第三方库math.js或安全的表达式计算器
    const sanitizedExpression = expression
      .replace(/[^-()\d/*+.]/g, '') // 仅允许基本数学字符
      .replace(/^\*/g, '') // 禁止表达式开头的操作符
      .replace(/\/\//g, '/'); // 防止注释注入
      
    // 进行计算
    const result = eval(sanitizedExpression);
    
    return {
      expression: expression,
      result: result,
      message: `表达式 ${expression} 的计算结果是 ${result}`
    };
  } catch (error) {
    return {
      expression: expression,
      error: error.message,
      message: `计算表达式 ${expression} 时出错: ${error.message}`
    };
  }
}

// 运行主函数
if (require.main === module) {
  main().catch(err => {
    console.error('未处理的错误:', err);
    process.exit(1);
  });
}

// 导出main函数以便在其他模块中使用
module.exports = { main }; 