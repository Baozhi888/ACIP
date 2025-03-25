/**
 * ACIP SDK - 流式响应示例
 * 
 * 此示例展示了如何使用ACIP SDK创建流式响应，实时获取AI模型生成的内容
 */

// 导入ACIP SDK
const acip = require('@acip/sdk');

// 用于获取命令行参数
const parseArgs = () => {
  const args = process.argv.slice(2);
  const prompt = args.join(' ') || '用详细步骤解释如何实现一个简单的Node.js网络服务器';
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
    const sdk = acip.init({ apiKey });
    
    console.log('ACIP SDK 流式响应示例');
    console.log('版本:', sdk.getVersion());
    console.log('------------------------------------');
    
    // 获取用户提示
    const { prompt } = parseArgs();
    console.log(`用户提问: ${prompt}`);
    console.log('------------------------------------');
    
    // 准备请求
    const request = {
      modelId: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: '你是一个专业的编程助手，擅长提供详细的技术解释和代码示例。' 
        },
        { 
          role: 'user', 
          content: prompt 
        }
      ],
      temperature: 0.7,
      max_tokens: 2048,
      stream: true // 启用流式响应
    };
    
    console.log('AI回答:');
    
    // 记录开始时间
    const startTime = Date.now();
    
    // 变量用于收集完整响应
    let fullResponse = '';
    let tokenCount = 0;
    
    // 创建流式连接
    const stream = await sdk.modelInvocation.createStream(request);
    
    // 处理流式数据
    stream.on('data', (chunk) => {
      // 显示每个块的内容
      process.stdout.write(chunk.content || '');
      
      // 累积完整响应
      fullResponse += chunk.content || '';
      tokenCount++;
    });
    
    // 处理流结束
    stream.on('end', () => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log('\n------------------------------------');
      console.log(`生成完成，耗时: ${duration}秒`);
      console.log(`估计token数: ${tokenCount}`);
      console.log(`响应总长度: ${fullResponse.length} 字符`);
      
      // 获取请求之后的指标
      const metrics = sdk.modelInvocation.getMetrics();
      if (metrics && metrics.lastRequest) {
        console.log('\n请求统计:');
        console.log(`- 模型ID: ${metrics.lastRequest.modelId || request.modelId}`);
        console.log(`- 请求延迟: ${metrics.lastRequest.latency}ms`);
        console.log(`- 首token延迟: ${metrics.lastRequest.ttft}ms`);
      }
    });
    
    // 处理错误
    stream.on('error', (error) => {
      console.error('\n流式处理错误:', error.message);
      if (error.response) {
        console.error('响应状态:', error.response.status);
        console.error('错误详情:', error.response.data);
      }
    });
    
  } catch (error) {
    console.error('初始化错误:', error.message);
    process.exit(1);
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