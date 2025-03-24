/**
 * ACIP SDK - 模型微调示例
 * 
 * 此示例展示了如何使用ACIP SDK创建和管理模型微调任务
 * 通过微调，您可以为特定任务优化AI模型性能
 */

// 导入ACIP SDK和fs模块
const acip = require('@acip/sdk');
const fs = require('fs');
const path = require('path');

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
    
    console.log('ACIP SDK 模型微调示例');
    console.log('版本:', sdk.getVersion());
    console.log('------------------------------------');
    
    // 解析命令行参数
    const args = process.argv.slice(2);
    const command = args[0] || 'help';
    
    // 执行相应的命令
    switch (command) {
      case 'create':
        await createFineTuningJob(sdk, args.slice(1));
        break;
      case 'list':
        await listFineTuningJobs(sdk);
        break;
      case 'get':
        await getFineTuningJob(sdk, args[1]);
        break;
      case 'cancel':
        await cancelFineTuningJob(sdk, args[1]);
        break;
      case 'mock':
        await mockFineTuningProcess(sdk);
        break;
      case 'help':
      default:
        showHelp();
        break;
    }
    
  } catch (error) {
    console.error('错误:', error.message);
    process.exit(1);
  }
}

// 创建微调任务
async function createFineTuningJob(sdk, args) {
  // 需要提供训练数据文件路径
  if (!args[0]) {
    console.error('错误: 需要提供训练数据文件路径');
    console.error('用法: node fine-tuning.js create <训练数据文件路径> [模型ID]');
    process.exit(1);
  }
  
  const trainingDataPath = args[0];
  const modelId = args[1] || 'gpt-3.5-turbo';
  
  // 检查文件是否存在
  if (!fs.existsSync(trainingDataPath)) {
    console.error(`错误: 文件不存在: ${trainingDataPath}`);
    process.exit(1);
  }
  
  console.log(`正在读取训练数据文件: ${trainingDataPath}`);
  
  try {
    // 读取训练数据
    const trainingData = JSON.parse(fs.readFileSync(trainingDataPath, 'utf8'));
    
    // 验证训练数据格式
    if (!Array.isArray(trainingData)) {
      console.error('错误: 训练数据必须是JSON数组格式');
      process.exit(1);
    }
    
    console.log(`发现${trainingData.length}条训练样本`);
    console.log('创建模型微调任务...');
    
    // 创建微调任务
    const fineTuningJob = await sdk.modelInvocation.createFineTuningJob({
      modelId,
      trainingData,
      type: 'instruction-tuning',
      name: `custom-${modelId}-${new Date().toISOString().split('T')[0]}`,
      hyperParameters: {
        epochs: 3,
        batchSize: 4,
        learningRate: 1e-5
      },
      validationData: trainingData.slice(0, Math.min(10, trainingData.length)),
      webhook: {
        url: null, // 可以提供webhook URL以接收事件通知
        events: ['completed', 'failed']
      }
    });
    
    console.log('------------------------------------');
    console.log('微调任务已创建:');
    console.log(`- 任务ID: ${fineTuningJob.id}`);
    console.log(`- 状态: ${fineTuningJob.status}`);
    console.log(`- 模型: ${fineTuningJob.modelId}`);
    console.log(`- 创建时间: ${new Date(fineTuningJob.createdAt).toLocaleString()}`);
    console.log('------------------------------------');
    console.log('运行以下命令查看任务状态:');
    console.log(`node fine-tuning.js get ${fineTuningJob.id}`);
    
  } catch (error) {
    console.error('创建微调任务失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('错误详情:', error.response.data);
    }
  }
}

// 获取微调任务列表
async function listFineTuningJobs(sdk) {
  try {
    console.log('获取微调任务列表...');
    
    const jobs = await sdk.modelInvocation.listFineTuningJobs();
    
    console.log('------------------------------------');
    console.log(`找到 ${jobs.length} 个微调任务:`);
    
    if (jobs.length === 0) {
      console.log('没有找到微调任务。');
      console.log('使用 "node fine-tuning.js create <训练数据文件路径>" 创建一个新任务。');
    } else {
      jobs.forEach((job, index) => {
        console.log(`${index + 1}. ${job.name || job.id}`);
        console.log(`   ID: ${job.id}`);
        console.log(`   状态: ${job.status}`);
        console.log(`   模型: ${job.modelId}`);
        console.log(`   创建时间: ${new Date(job.createdAt).toLocaleString()}`);
        if (job.fineTunedModelId) {
          console.log(`   微调后的模型ID: ${job.fineTunedModelId}`);
        }
        console.log();
      });
    }
    
  } catch (error) {
    console.error('获取微调任务列表失败:', error.message);
  }
}

// 获取微调任务详情
async function getFineTuningJob(sdk, jobId) {
  if (!jobId) {
    console.error('错误: 需要提供任务ID');
    console.error('用法: node fine-tuning.js get <任务ID>');
    process.exit(1);
  }
  
  try {
    console.log(`获取微调任务详情: ${jobId}`);
    
    const job = await sdk.modelInvocation.getFineTuningJob(jobId);
    
    console.log('------------------------------------');
    console.log('微调任务详情:');
    console.log(`- 任务ID: ${job.id}`);
    console.log(`- 名称: ${job.name || '未命名'}`);
    console.log(`- 状态: ${job.status}`);
    console.log(`- 模型: ${job.modelId}`);
    console.log(`- 类型: ${job.type}`);
    console.log(`- 创建时间: ${new Date(job.createdAt).toLocaleString()}`);
    
    if (job.finishedAt) {
      console.log(`- 完成时间: ${new Date(job.finishedAt).toLocaleString()}`);
    }
    
    if (job.fineTunedModelId) {
      console.log(`- 微调后的模型ID: ${job.fineTunedModelId}`);
    }
    
    if (job.metrics) {
      console.log('- 训练指标:');
      
      if (job.metrics.trainingLoss) {
        console.log(`  - 训练损失: ${job.metrics.trainingLoss}`);
      }
      
      if (job.metrics.validationLoss) {
        console.log(`  - 验证损失: ${job.metrics.validationLoss}`);
      }
      
      if (job.metrics.epochs) {
        console.log(`  - 完成的训练轮次: ${job.metrics.epochs}`);
      }
    }
    
    if (job.error) {
      console.log('- 错误:');
      console.log(`  - 消息: ${job.error.message}`);
      console.log(`  - 代码: ${job.error.code}`);
    }
    
  } catch (error) {
    console.error('获取微调任务详情失败:', error.message);
  }
}

// 取消微调任务
async function cancelFineTuningJob(sdk, jobId) {
  if (!jobId) {
    console.error('错误: 需要提供任务ID');
    console.error('用法: node fine-tuning.js cancel <任务ID>');
    process.exit(1);
  }
  
  try {
    console.log(`取消微调任务: ${jobId}`);
    
    await sdk.modelInvocation.cancelFineTuningJob(jobId);
    
    console.log('------------------------------------');
    console.log('微调任务已取消');
    
    // 获取并显示更新后的状态
    const job = await sdk.modelInvocation.getFineTuningJob(jobId);
    
    console.log(`- 任务ID: ${job.id}`);
    console.log(`- 状态: ${job.status}`);
    
  } catch (error) {
    console.error('取消微调任务失败:', error.message);
  }
}

// 模拟完整的微调流程（用于演示）
async function mockFineTuningProcess(sdk) {
  console.log('模拟完整的模型微调流程...');
  
  // 创建模拟训练数据
  const trainingDataFile = path.join(__dirname, 'mock_training_data.json');
  
  const trainingData = [];
  
  // 生成10个问答对作为训练数据
  for (let i = 1; i <= 10; i++) {
    trainingData.push({
      messages: [
        { role: 'system', content: 'You are a helpful AI assistant specialized in ACIP (Adaptive Contextual Intelligence Protocol).' },
        { role: 'user', content: `什么是ACIP的第${i}个主要特点？` },
        { role: 'assistant', content: `ACIP的第${i}个主要特点是其${getRandomFeature()}。这使得ACIP能够在各种场景下提供更加智能和适应性强的AI服务。` }
      ]
    });
  }
  
  // 将训练数据写入文件
  fs.writeFileSync(trainingDataFile, JSON.stringify(trainingData, null, 2));
  
  console.log(`创建了模拟训练数据文件: ${trainingDataFile}`);
  console.log(`包含 ${trainingData.length} 条训练样本`);
  
  // 注册事件监听器
  sdk.modelInvocation.on('finetune:progress', (event) => {
    console.log(`[事件] 微调进度: ${event.progress}%, 状态: ${event.status}`);
  });
  
  sdk.modelInvocation.on('finetune:completed', (event) => {
    console.log(`[事件] 微调完成: 模型ID = ${event.fineTunedModelId}`);
  });
  
  // 创建微调任务
  try {
    console.log('创建微调任务...');
    
    const fineTuningJob = await sdk.modelInvocation.createFineTuningJob({
      modelId: 'gpt-3.5-turbo',
      trainingData,
      type: 'instruction-tuning',
      name: `demo-fine-tuning-${Date.now()}`,
      hyperParameters: {
        epochs: 2,
        batchSize: 4
      }
    });
    
    console.log(`微调任务已创建，ID: ${fineTuningJob.id}`);
    
    // 模拟微调过程
    await simulateFineTuningProgress(sdk, fineTuningJob.id);
    
    // 使用微调后的模型
    await testFineTunedModel(sdk, fineTuningJob.id);
    
  } catch (error) {
    console.error('微调过程中出错:', error.message);
  } finally {
    // 清理临时文件
    try {
      fs.unlinkSync(trainingDataFile);
      console.log(`已删除临时训练数据文件: ${trainingDataFile}`);
    } catch (e) {
      console.error('清理文件时出错:', e.message);
    }
  }
}

// 模拟微调进度
async function simulateFineTuningProgress(sdk, jobId) {
  console.log('模拟微调进度...');
  
  // 模拟状态变化：created -> running -> succeeded
  const statusUpdates = [
    { status: 'created', progress: 0, delay: 1000 },
    { status: 'validating_files', progress: 5, delay: 2000 },
    { status: 'queued', progress: 10, delay: 2000 },
    { status: 'running', progress: 20, delay: 1500 },
    { status: 'running', progress: 40, delay: 1500 },
    { status: 'running', progress: 60, delay: 1500 },
    { status: 'running', progress: 80, delay: 1500 },
    { status: 'finalizing', progress: 95, delay: 1000 },
    { status: 'succeeded', progress: 100, delay: 1000 }
  ];
  
  // 模拟工作期间的指标
  const metrics = {
    trainingLoss: 0.8,
    validationLoss: 0.9,
    epochs: 0
  };
  
  // 模拟每个状态
  for (const update of statusUpdates) {
    await new Promise(resolve => setTimeout(resolve, update.delay));
    
    if (update.status === 'running') {
      // 更新训练指标
      metrics.trainingLoss -= 0.1;
      metrics.validationLoss -= 0.08;
      metrics.epochs += 0.5;
    }
    
    // 模拟任务进度事件
    console.log(`状态更新: ${update.status}, 进度: ${update.progress}%`);
    
    // 如果是最终状态，添加生成的微调模型ID
    if (update.status === 'succeeded') {
      console.log('微调完成！');
      console.log('生成的微调模型ID: ft:gpt-3.5-turbo:acip:custom:demo-' + Date.now());
    }
  }
  
  console.log('微调过程模拟完成');
}

// 测试微调后的模型
async function testFineTunedModel(sdk, jobId) {
  // 模拟微调后的模型ID
  const fineTunedModelId = 'ft:gpt-3.5-turbo:acip:custom:demo-' + Date.now();
  
  console.log('------------------------------------');
  console.log(`测试微调后的模型: ${fineTunedModelId}`);
  
  // 测试提示
  const testPrompt = '什么是ACIP，它有什么特点？';
  
  console.log(`测试提示: "${testPrompt}"`);
  console.log('生成回答...');
  
  // 模拟延迟
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 模拟回答
  const response = `ACIP（适应性上下文智能协议）是一个先进的AI交互框架，专为提高AI系统的适应性和上下文理解能力而设计。

主要特点包括：
1. 上下文保留和管理：能够跨多次交互维持对话上下文
2. 适应性响应生成：根据用户的具体需求和情境调整输出
3. 模块化架构：支持灵活扩展和集成不同的AI功能模块
4. 安全性和隐私保护：内置的内容审核和隐私保障机制
5. 多模型支持：可以连接和调用多种不同的基础AI模型
6. 优化的性能和成本管理：通过智能调度和缓存减少资源消耗

这些特点使ACIP成为构建复杂AI应用的理想基础架构，特别适合需要持续对话和上下文理解的场景。`;
  
  console.log('------------------------------------');
  console.log('生成的回答:');
  console.log(response);
  console.log('------------------------------------');
  console.log('微调模型测试完成');
}

// 显示帮助信息
function showHelp() {
  console.log('用法:');
  console.log('  node fine-tuning.js <命令> [参数]');
  console.log();
  console.log('可用命令:');
  console.log('  create <训练数据文件路径> [模型ID]  创建新的微调任务');
  console.log('  list                              列出所有微调任务');
  console.log('  get <任务ID>                       获取微调任务详情');
  console.log('  cancel <任务ID>                    取消微调任务');
  console.log('  mock                              模拟完整的微调流程（用于演示）');
  console.log('  help                              显示此帮助信息');
  console.log();
  console.log('示例:');
  console.log('  node fine-tuning.js create ./training_data.json gpt-3.5-turbo');
  console.log('  node fine-tuning.js list');
  console.log('  node fine-tuning.js get ft-abc123');
  console.log('  node fine-tuning.js mock');
}

// 生成随机特点描述
function getRandomFeature() {
  const features = [
    '强大的上下文管理能力',
    '高度可定制的模型调用系统',
    '先进的安全性和隐私保护',
    '优化的token使用效率',
    '多模型协作能力',
    '实时流式响应功能',
    '内置的性能监控系统',
    '灵活的扩展性架构',
    '智能缓存机制',
    '跨平台兼容性'
  ];
  
  return features[Math.floor(Math.random() * features.length)];
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