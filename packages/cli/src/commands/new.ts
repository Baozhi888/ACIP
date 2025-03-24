import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { Command } from 'commander';

// 可创建的资源类型
const RESOURCE_TYPES = ['component', 'model', 'tool', 'config'];

// 资源模板内容
const TEMPLATES: Record<string, (name: string, isTs: boolean) => string> = {
  component: (name: string, isTs: boolean) => {
    const typeAnnotation = isTs ? ': any' : '';
    return `/**
 * ${name} Component
 */
${isTs ? 'import { ACIP } from \'@acip/sdk\';\n\n' : ''}export function ${name}(props${typeAnnotation}) {
  // 组件实现
  return {
    name: '${name}',
    
    // 组件方法
    async initialize() {
      // 初始化逻辑
      return true;
    },
    
    async process(input${typeAnnotation}) {
      // 处理输入
      return {
        result: 'Processed by ${name}'
      };
    }
  };
}
`;
  },
  
  model: (name: string, isTs: boolean) => {
    return `/**
 * ${name} Model
 */
${isTs ? 'import { ModelConfig } from \'@acip/sdk\';\n\n' : ''}${isTs ? `interface ${name}Props {
  apiKey?: string;
  baseUrl?: string;
  version?: string;
}

` : ''}export const ${name}Model = {
  name: '${name}',
  
  // 模型配置
  ${isTs ? `config${isTs ? ': ModelConfig' : ''} = ` : 'config: '}{
    provider: '${name.toLowerCase()}',
    supportedFeatures: ['text-generation', 'embeddings'],
    maxTokens: 8192,
    inputCostPer1KTokens: 0.01,
    outputCostPer1KTokens: 0.03
  },
  
  // 创建客户端
  createClient(${isTs ? 'props: ' + name + 'Props' : 'props'}) {
    const { apiKey, baseUrl = 'https://api.example.com', version = 'v1' } = props;
    
    // 在这里初始化与该模型提供商的API客户端
    return {
      // 客户端方法
      generate: async (prompt${isTs ? ': string' : ''}) => {
        // 实现生成逻辑
        console.log(\`Calling ${name} API with prompt: \${prompt}\`);
        return { text: 'Generated response from ${name}' };
      },
      
      getEmbedding: async (text${isTs ? ': string' : ''}) => {
        // 实现嵌入逻辑
        return [0.1, 0.2, 0.3, 0.4]; // 示例嵌入
      }
    };
  }
};
`;
  },
  
  tool: (name: string, isTs: boolean) => {
    return `/**
 * ${name} Tool
 */
${isTs ? 'import { ToolDefinition } from \'@acip/sdk\';\n\n' : ''}export const ${name.charAt(0).toLowerCase() + name.slice(1)}Tool = ${isTs ? 'ToolDefinition = ' : ''}{
  name: '${name.charAt(0).toLowerCase() + name.slice(1)}',
  description: 'A tool for ${name}',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The query to process'
      },
      options: {
        type: 'object',
        description: 'Additional options',
        properties: {
          maxResults: {
            type: 'number',
            description: 'Maximum number of results to return'
          }
        }
      }
    },
    required: ['query']
  },
  
  // Tool handler implementation
  async handler(params${isTs ? ': { query: string; options?: { maxResults?: number } }' : ''}) {
    const { query, options = {} } = params;
    const { maxResults = 5 } = options;
    
    console.log(\`Processing query "\${query}" with ${name} tool\`);
    
    // 实现工具逻辑
    const results = [
      { id: 1, title: 'Result 1 for ' + query },
      { id: 2, title: 'Result 2 for ' + query },
      { id: 3, title: 'Result 3 for ' + query }
    ].slice(0, maxResults);
    
    return {
      results,
      count: results.length,
      processed: query
    };
  }
};
`;
  },
  
  config: (name: string, isTs: boolean) => {
    const typeAnnotation = isTs ? ': Record<string, any>' : '';
    return `/**
 * ${name} Configuration
 */
export const ${name.charAt(0).toLowerCase() + name.slice(1)}Config${typeAnnotation} = {
  // 配置值
  enabled: true,
  timeout: 30000,
  retryAttempts: 3,
  
  // 环境特定配置
  development: {
    debug: true,
    logLevel: 'verbose'
  },
  
  production: {
    debug: false,
    logLevel: 'error'
  },
  
  // 获取当前环境配置
  getEnvConfig() {
    const env = process.env.NODE_ENV || 'development';
    return this[env] || this.development;
  }
};
`;
  }
};

interface NewCommandOptions {
  directory: string;
  ts: boolean;
  js: boolean;
}

export default function newCommand(program: Command): void {
  program
    .command('new <type> [name]')
    .description('Create a new resource (component, model, tool, config)')
    .option('-d, --directory <dir>', 'Target directory', '')
    .option('--ts', 'Use TypeScript (default)', true)
    .option('--js', 'Use JavaScript instead of TypeScript')
    .action(async (type: string, name: string | undefined, options: NewCommandOptions) => {
      // 验证资源类型
      if (!RESOURCE_TYPES.includes(type)) {
        console.error(chalk.red(`Error: Invalid resource type '${type}'.`));
        console.log(`Available types: ${RESOURCE_TYPES.join(', ')}`);
        return;
      }
      
      // 如果没有提供名称，提示用户输入
      if (!name) {
        const answers = await inquirer.prompt<{ name: string }>([
          {
            type: 'input',
            name: 'name',
            message: `What is the name of your ${type}?`,
            validate: (input: string) => {
              if (/^[A-Z][a-zA-Z0-9]*$/.test(input)) return true;
              return 'Name must start with an uppercase letter and contain only alphanumeric characters.';
            }
          }
        ]);
        name = answers.name;
      }
      
      // 使用TypeScript还是JavaScript
      const useTypeScript = options.js ? false : options.ts;
      const fileExt = useTypeScript ? 'ts' : 'js';
      
      // 确定目标目录
      let targetDir;
      if (options.directory) {
        targetDir = path.resolve(process.cwd(), options.directory);
      } else {
        // 默认目录逻辑
        const srcDir = path.resolve(process.cwd(), 'src');
        
        if (fs.existsSync(srcDir)) {
          const typeDirs: Record<string, string> = {
            component: 'components',
            model: 'models',
            tool: 'tools',
            config: 'config'
          };
          
          targetDir = path.join(srcDir, typeDirs[type] || '');
        } else {
          targetDir = process.cwd();
        }
      }
      
      // 确保目录存在
      fs.ensureDirSync(targetDir);
      
      // 生成文件名
      const fileName = `${name}.${fileExt}`;
      const filePath = path.join(targetDir, fileName);
      
      // 检查文件是否已存在
      if (fs.existsSync(filePath)) {
        const { overwrite } = await inquirer.prompt<{ overwrite: boolean }>([
          {
            type: 'confirm',
            name: 'overwrite',
            message: `${fileName} already exists. Do you want to overwrite it?`,
            default: false
          }
        ]);
        
        if (!overwrite) {
          console.log(chalk.yellow('Operation cancelled.'));
          return;
        }
      }
      
      // 获取模板内容
      const template = TEMPLATES[type];
      if (!template) {
        console.error(chalk.red(`Error: Template for ${type} not found.`));
        return;
      }
      
      const content = template(name, useTypeScript);
      
      // 写入文件
      try {
        fs.writeFileSync(filePath, content);
        console.log(chalk.green(`Successfully created ${type}: ${chalk.bold(filePath)}`));
      } catch (error) {
        console.error(chalk.red('Error creating file:'), error);
      }
    });
} 