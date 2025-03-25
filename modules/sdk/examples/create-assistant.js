/**
 * ACIP SDK - 创建对话助手示例
 * 
 * 此示例展示了如何使用ACIP SDK创建和使用对话式AI助手
 * 运行此示例后，您可以与AI助手进行交互式对话
 */

// 导入ACIP SDK和readline模块用于命令行交互
const acip = require('@acip/sdk');
const readline = require('readline');

// 创建命令行接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

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
    
    console.log('ACIP SDK Assistant示例');
    console.log('版本:', sdk.getVersion());
    console.log('------------------------------------');
    console.log('创建一个新的AI助手实例...');
    
    // 创建助手
    const assistant = sdk.createAssistant({
      modelId: 'gpt-4o',
      systemPrompt: '你是一个友好、有用的AI助手，专注于提供简洁明了的回答。你是ACIP（适应性上下文智能协议）的专家，能够解释相关概念和用法。',
      temperature: 0.7,
      maxTokens: 1024,
      name: 'ACIP助手',
      memory: true, // 启用对话历史记忆
      memorySize: 10 // 记住最近10轮对话
    });
    
    console.log('AI助手已创建完成！');
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
  // 注册消息块事件处理器(用于流式输出)
  assistant.on('message:chunk', (chunk) => {
    process.stdout.write(chunk.content || '');
  });
  
  // 消息完成事件处理器
  assistant.on('message:complete', () => {
    console.log('\n------------------------------------');
    promptUser();
  });
  
  // 错误事件处理器
  assistant.on('error', (error) => {
    console.error('\n错误:', error.message);
    promptUser();
  });
  
  // 提示用户输入
  function promptUser() {
    rl.question('您: ', async (input) => {
      // 检查是否退出
      if (input.toLowerCase() === 'exit' || input === '退出') {
        rl.close();
        console.log('对话已结束');
        
        // 显示对话历史
        console.log('\n对话历史摘要:');
        const history = assistant.getHistory({ excludeSystem: true });
        history.forEach((msg, i) => {
          const role = msg.role === 'user' ? '用户' : 'AI';
          console.log(`${i+1}. ${role}: ${msg.content.substring(0, 60)}${msg.content.length > 60 ? '...' : ''}`);
        });
        
        process.exit(0);
        return;
      }
      
      // 检查特殊命令
      if (input.startsWith('/')) {
        handleCommand(input);
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
  
  // 处理特殊命令
  function handleCommand(input) {
    const cmd = input.slice(1).split(' ')[0].toLowerCase();
    
    switch (cmd) {
      case 'clear':
        console.log('清除对话历史...');
        assistant.clearHistory();
        console.log('对话历史已清除');
        break;
        
      case 'help':
        console.log('可用命令:');
        console.log('/clear - 清除对话历史');
        console.log('/help - 显示帮助信息');
        console.log('exit 或 退出 - 结束对话');
        break;
        
      default:
        console.log(`未知命令: ${cmd}`);
        console.log('输入 /help 查看可用命令');
    }
    
    promptUser();
  }
  
  // 开始对话
  console.log('AI: 你好！我是ACIP助手，有什么我能帮到你的吗？');
  promptUser();
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