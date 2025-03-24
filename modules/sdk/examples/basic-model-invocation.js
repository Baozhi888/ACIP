/**
 * ACIP SDK - 基本模型调用示例
 * 
 * 此示例展示了如何使用ACIP SDK进行基本的AI模型调用
 */

// 导入ACIP SDK
const acip = require('@acip/sdk');

// 用于获取命令行参数
const parseArgs = () => {
  const args = process.argv.slice(2);
  const prompt = args.join(' ') || '解释什么是适应性上下文智能协议(ACIP)？';
  return { prompt };
};

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
    const sdk = acip.init({ 
      apiKey,
      // 可选配置
      defaultModelId: 'gpt-4',
      cacheEnabled: true
    });
    
    console.log('ACIP SDK 版本:', sdk.getVersion());
    console.log('正在处理您的请求...\n');
    
    // 获取用户提示
    const { prompt } = parseArgs();
    
    // 准备请求
    const request = {
      modelId: 'gpt-4', // 可以使用不同的模型
      messages: [
        { 
          role: 'system', 
          content: '你是一个友好、信息丰富、准确的人工智能助手。你提供简洁明了的回答。' 
        },
        { 
          role: 'user', 
          content: prompt 
        }
      ],
      temperature: 0.7,
      max_tokens: 1024
    };
    
    console.log(`用户提问: ${prompt}\n`);
    
    // 调用AI模型
    const startTime = Date.now();
    const response = await sdk.modelInvocation.invoke(request);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // 显示结果
    console.log('AI回复:');
    console.log('--------------------------------------------------');
    console.log(response.content);
    console.log('--------------------------------------------------');
    console.log(`\n请求完成 (耗时: ${duration}秒)`);
    
    // 获取和显示使用统计信息
    const stats = sdk.modelInvocation.getMetrics();
    console.log('\n请求统计:');
    console.log(`- 输入tokens: ${response.usage?.prompt_tokens || 'N/A'}`);
    console.log(`- 输出tokens: ${response.usage?.completion_tokens || 'N/A'}`);
    console.log(`- 总tokens: ${response.usage?.total_tokens || 'N/A'}`);
    console.log(`- 模型ID: ${response.modelId || request.modelId}`);
    
  } catch (error) {
    console.error('请求失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('错误详情:', error.response.data);
    }
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