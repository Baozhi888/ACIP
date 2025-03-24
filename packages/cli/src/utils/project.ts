import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

interface ProjectOptions {
  projectPath: string;
  template: string;
  useTypeScript: boolean;
  projectName: string;
  force?: boolean;
}

/**
 * 创建项目结构
 */
export async function createProjectStructure(options: ProjectOptions): Promise<void> {
  const { projectPath, template, useTypeScript, projectName } = options;

  // 确保目录存在
  fs.ensureDirSync(projectPath);

  // 创建基本目录结构
  const directories = [
    'src',
    'src/components',
    'src/models',
    'src/utils',
    'src/config',
    'public',
    'tests'
  ];

  for (const dir of directories) {
    fs.ensureDirSync(path.join(projectPath, dir));
  }

  // 创建package.json
  const packageJson = createPackageJson(projectName, useTypeScript);
  fs.writeFileSync(
    path.join(projectPath, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  // 创建README.md
  const readmeContent = createReadme(projectName);
  fs.writeFileSync(path.join(projectPath, 'README.md'), readmeContent);

  // 创建.gitignore
  const gitignoreContent = createGitignore();
  fs.writeFileSync(path.join(projectPath, '.gitignore'), gitignoreContent);

  // 创建配置文件
  if (useTypeScript) {
    const tsConfigContent = createTsConfig();
    fs.writeFileSync(path.join(projectPath, 'tsconfig.json'), JSON.stringify(tsConfigContent, null, 2));
  }

  // 创建环境变量示例文件
  const envExampleContent = createEnvExample();
  fs.writeFileSync(path.join(projectPath, '.env.example'), envExampleContent);

  // 根据模板创建示例文件
  await createTemplateFiles(projectPath, template, useTypeScript);

  console.log(chalk.green('\nProject structure created successfully!'));
}

/**
 * 创建package.json内容
 */
function createPackageJson(projectName: string, useTypeScript: boolean): object {
  const devDependencies: Record<string, string> = {};
  
  if (useTypeScript) {
    devDependencies['typescript'] = '^5.1.6';
    devDependencies['@types/node'] = '^20.4.2';
    devDependencies['ts-node'] = '^10.9.1';
  }

  return {
    name: projectName,
    version: '0.1.0',
    description: 'An ACIP (Adaptive Contextual Intelligence Protocol) project',
    main: useTypeScript ? 'dist/index.js' : 'src/index.js',
    type: 'module',
    scripts: {
      start: useTypeScript ? 'node dist/index.js' : 'node src/index.js',
      dev: useTypeScript ? 'ts-node src/index.ts' : 'node src/index.js',
      build: useTypeScript ? 'tsc' : 'echo "No build step required"',
      test: 'echo "Error: no test specified" && exit 1'
    },
    keywords: ['acip', 'ai', 'contextual-intelligence'],
    author: '',
    license: 'MIT',
    dependencies: {
      '@acip/sdk': '^0.1.0',
      'dotenv': '^16.3.1'
    },
    devDependencies
  };
}

/**
 * 创建README.md内容
 */
function createReadme(projectName: string): string {
  return `# ${projectName}

This project was created with [ACIP CLI](https://acip.dev).

## Getting Started

First, install the dependencies:

\`\`\`bash
npm install
# or
yarn
# or
pnpm install
\`\`\`

Then, run the development server:

\`\`\`bash
npm run dev
# or
yarn dev
# or
pnpm dev
\`\`\`

## Learn More

To learn more about ACIP, check out the [ACIP documentation](https://acip.dev/docs).

## Deploy

Follow the [deployment documentation](https://acip.dev/docs/deployment) to deploy your ACIP application.
`;
}

/**
 * 创建.gitignore内容
 */
function createGitignore(): string {
  return `# dependencies
node_modules
/.pnp
.pnp.js

# testing
/coverage

# production
/build
/dist

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.idea
.vscode
`;
}

/**
 * 创建tsconfig.json内容
 */
function createTsConfig(): object {
  return {
    compilerOptions: {
      target: 'ES2022',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      esModuleInterop: true,
      outDir: 'dist',
      strict: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      resolveJsonModule: true,
      sourceMap: true,
      declaration: true
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist', '**/*.test.ts']
  };
}

/**
 * 创建.env.example内容
 */
function createEnvExample(): string {
  return `# 你的API密钥
ACIP_API_KEY=your_api_key_here

# 默认AI模型ID
DEFAULT_MODEL_ID=gpt-4

# 应用配置
APP_PORT=3000
NODE_ENV=development
`;
}

/**
 * 根据模板创建示例文件
 */
async function createTemplateFiles(
  projectPath: string,
  template: string,
  useTypeScript: boolean
): Promise<void> {
  const fileExt = useTypeScript ? 'ts' : 'js';
  const srcDir = path.join(projectPath, 'src');
  
  // 创建入口文件
  const indexContent = createIndexFile(template, useTypeScript);
  fs.writeFileSync(path.join(srcDir, `index.${fileExt}`), indexContent);
  
  // 创建配置文件
  const configContent = createConfigFile(useTypeScript);
  fs.writeFileSync(path.join(srcDir, 'config', `index.${fileExt}`), configContent);
  
  // 创建示例组件
  if (template === 'advanced') {
    const assistantContent = createAssistantFile(useTypeScript);
    fs.writeFileSync(
      path.join(srcDir, 'components', `assistant.${fileExt}`), 
      assistantContent
    );
  }
}

/**
 * 创建入口文件内容
 */
function createIndexFile(template: string, useTypeScript: boolean): string {
  const ext = useTypeScript ? 'ts' : 'js';
  
  if (template === 'basic') {
    return `import { ACIP } from '@acip/sdk';
import 'dotenv/config';

${useTypeScript ? 'async function main(): Promise<void> {' : 'async function main() {'}
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
`;
  } else {
    return `import { ACIP } from '@acip/sdk';
import { createAssistant } from './components/assistant.${ext}';
import 'dotenv/config';

${useTypeScript ? 'async function main(): Promise<void> {' : 'async function main() {'}
  // 初始化ACIP SDK
  const acip = new ACIP({
    apiKey: process.env.ACIP_API_KEY,
    defaultModelId: process.env.DEFAULT_MODEL_ID || 'gpt-4',
    cacheEnabled: true,
    logger: {
      level: 'info'
    }
  });

  // 创建并启动助手
  const assistant = createAssistant(acip);
  
  // 注册事件监听器
  acip.on('modelInvocation:start', (data) => {
    console.log(\`Model invocation started with ID: \${data.invocationId}\`);
  });
  
  acip.on('modelInvocation:complete', (data) => {
    console.log(\`Model invocation completed in \${data.metrics.latency}ms\`);
  });
  
  // 与助手互动
  try {
    const response = await assistant.sendMessage(
      'Hello! I want to learn about adaptive context management in AI systems.'
    );
    
    console.log('Assistant Response:', response.content);
    
    // 获取对话历史
    const history = assistant.getHistory();
    console.log(\`Conversation has \${history.length} messages\`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);
`;
  }
}

/**
 * 创建配置文件内容
 */
function createConfigFile(useTypeScript: boolean): string {
  const typeAnnotation = useTypeScript ? ': Record<string, any>' : '';
  
  return `// 应用配置
export const appConfig${typeAnnotation} = {
  name: 'ACIP Example App',
  version: '0.1.0',
  description: 'An example application using ACIP SDK',
  port: process.env.APP_PORT || 3000,
  environment: process.env.NODE_ENV || 'development'
};

// AI模型配置
export const modelConfig${typeAnnotation} = {
  defaultModelId: process.env.DEFAULT_MODEL_ID || 'gpt-4',
  fallbackModelId: 'gpt-3.5-turbo',
  maxTokens: 8192,
  temperature: 0.7,
  topP: 1,
  cacheEnabled: true,
  cacheTTL: 3600 // 1小时
};

// 安全配置
export const securityConfig${typeAnnotation} = {
  contentModerationEnabled: true,
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100 // 每个IP限制请求数
  }
};
`;
}

/**
 * 创建助手组件文件内容
 */
function createAssistantFile(useTypeScript: boolean): string {
  const types = useTypeScript ? 
    `import type { ACIP, Assistant, SendMessageOptions } from '@acip/sdk';` :
    '';
  
  return `${types}${types ? '\n\n' : ''}/**
 * 创建AI助手实例
 */
export function createAssistant(acip${useTypeScript ? ': ACIP' : ''}) {
  // 创建助手实例
  const assistant = acip.createAssistant({
    name: 'ACIP Guide',
    description: 'An assistant that helps with understanding ACIP concepts and features.',
    instructions: \`
      You are ACIP Guide, an AI assistant specializing in the Adaptive Contextual Intelligence Protocol.
      Provide helpful, accurate, and concise information about ACIP's features, architecture, and usage.
      When asked about technical details, include code examples when appropriate.
      If you don't know something, admit it rather than making up information.
    \`,
    tools: [
      {
        name: 'getCurrentTime',
        description: 'Get the current time',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        },
        handler: async () => {
          return {
            time: new Date().toISOString()
          };
        }
      }
    ],
    model: {
      provider: 'openai',
      modelId: 'gpt-4'
    }
  });

  // 扩展助手功能
  const enhancedAssistant = {
    ...assistant,

    // 发送消息并返回响应
    async sendMessage(
      content${useTypeScript ? ': string' : ''}, 
      options${useTypeScript ? '?: SendMessageOptions' : ''} = {}
    ) {
      console.log('Sending message to assistant:', content);
      
      // 调用原始sendMessage方法
      const response = await assistant.sendMessage(content, options);
      
      // 记录响应
      console.log('Received response from assistant');
      
      return response;
    },

    // 获取对话历史
    getHistory() {
      return assistant.getConversation().getMessages();
    },

    // 清除对话历史
    clearHistory() {
      return assistant.getConversation().clear();
    }
  };

  return enhancedAssistant;
}
`;
} 