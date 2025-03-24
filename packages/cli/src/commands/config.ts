import fs from 'fs-extra';
import path from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import Conf from 'conf';

interface ConfigCommandOptions {
  global: boolean;
}

// Define the schema type
interface ConfigSchema {
  apiKey?: string;
  defaultModel: string;
  telemetryEnabled: boolean;
  userSettings: Record<string, any>;
}

// Create a type for valid config keys
type ConfigKey = keyof ConfigSchema;

export default function configCommand(program: Command): void {
  // 创建配置存储实例
  const config = new Conf<ConfigSchema>({
    projectName: 'acip',
    schema: {
      apiKey: {
        type: 'string'
      },
      defaultModel: {
        type: 'string',
        default: 'gpt-4'
      },
      telemetryEnabled: {
        type: 'boolean',
        default: true
      },
      // 用户自定义配置
      userSettings: {
        type: 'object',
        default: {}
      }
    }
  });

  // Helper function to validate config key
  function isValidConfigKey(key: string): key is ConfigKey {
    return ['apiKey', 'defaultModel', 'telemetryEnabled', 'userSettings'].includes(key);
  }

  program
    .command('config')
    .description('Manage ACIP configuration')
    .option('-g, --global', 'Use global configuration', false)
    .action(async (options: ConfigCommandOptions) => {
      // 显示可用的配置命令帮助
      console.log(chalk.blue('ACIP Configuration Management\n'));
      console.log('Usage:');
      console.log('  acip config get <key>         Get a configuration value');
      console.log('  acip config set <key> <value> Set a configuration value');
      console.log('  acip config list              List all configuration values');
      console.log('  acip config delete <key>      Delete a configuration value\n');
      
      console.log('Examples:');
      console.log('  acip config get apiKey');
      console.log('  acip config set defaultModel gpt-4');
      console.log('  acip config list');
      console.log('  acip config delete telemetryEnabled\n');
      
      console.log(chalk.dim('Use --global (-g) flag to access global configuration'));
    });

  // 获取配置
  program
    .command('config:get <key>')
    .description('Get a configuration value')
    .option('-g, --global', 'Use global configuration', false)
    .action((key: string, options: ConfigCommandOptions) => {
      try {
        if (!isValidConfigKey(key)) {
          console.log(chalk.yellow(`Invalid configuration key: '${key}'`));
          return;
        }
        const value = config.get(key);
        if (value === undefined) {
          console.log(chalk.yellow(`Configuration key '${key}' not found.`));
        } else {
          if (typeof value === 'object') {
            console.log(JSON.stringify(value, null, 2));
          } else {
            console.log(value);
          }
        }
      } catch (error) {
        console.error(chalk.red('Error reading configuration:'), error instanceof Error ? error.message : String(error));
      }
    });

  // 设置配置
  program
    .command('config:set <key> <value>')
    .description('Set a configuration value')
    .option('-g, --global', 'Use global configuration', false)
    .action((key: string, value: string, options: ConfigCommandOptions) => {
      try {
        if (!isValidConfigKey(key)) {
          console.log(chalk.yellow(`Invalid configuration key: '${key}'`));
          return;
        }
        
        // 尝试解析为JSON，如果失败则保持为字符串
        let parsedValue: any;
        try {
          parsedValue = JSON.parse(value);
        } catch (e) {
          parsedValue = value;
        }
        
        config.set(key, parsedValue);
        console.log(chalk.green(`Configuration '${key}' set successfully.`));
      } catch (error) {
        console.error(chalk.red('Error setting configuration:'), error instanceof Error ? error.message : String(error));
      }
    });

  // 列出所有配置
  program
    .command('config:list')
    .description('List all configuration values')
    .option('-g, --global', 'Use global configuration', false)
    .action((options: ConfigCommandOptions) => {
      try {
        const allConfig = config.store;
        console.log(chalk.blue('Current Configuration:'));
        console.log(JSON.stringify(allConfig, null, 2));
        
        // 显示配置文件路径
        console.log(chalk.dim(`\nConfiguration stored at: ${config.path}`));
      } catch (error) {
        console.error(chalk.red('Error listing configuration:'), error instanceof Error ? error.message : String(error));
      }
    });

  // 删除配置
  program
    .command('config:delete <key>')
    .description('Delete a configuration value')
    .option('-g, --global', 'Use global configuration', false)
    .action((key: string, options: ConfigCommandOptions) => {
      try {
        if (!isValidConfigKey(key)) {
          console.log(chalk.yellow(`Invalid configuration key: '${key}'`));
          return;
        }
        
        if (config.has(key)) {
          config.delete(key);
          console.log(chalk.green(`Configuration '${key}' deleted successfully.`));
        } else {
          console.log(chalk.yellow(`Configuration key '${key}' not found.`));
        }
      } catch (error) {
        console.error(chalk.red('Error deleting configuration:'), error instanceof Error ? error.message : String(error));
      }
    });
} 