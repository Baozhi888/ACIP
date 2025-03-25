import { ACIP } from '@acip/sdk';
import 'dotenv/config';

async function main(): Promise<void> {
  // 初始化ACIP SDK
  const acip = new ACIP({
    apiKey: process.env.ACIP_API_KEY,
    defaultModelId: process.env.DEFAULT_MODEL_ID || 'gpt-4'
  });

  // 简单的模型调用示例
  try {
    const response = await acip.modelInvocation.invoke({
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello! What can you tell me about ACIP?' }
      ]
    });

    console.log('AI Response:', response.content);
    
    // 输出使用的tokens和延迟
    console.log('Metrics:', response.metrics);
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);
