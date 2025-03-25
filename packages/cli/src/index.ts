#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'node:path';
import updateNotifier from 'update-notifier';
import boxen from 'boxen';
import pkg from '../package.json' with { type: 'json' };

// 导入命令
import initCommand from './commands/init.js';
import newCommand from './commands/new.js';
import configCommand from './commands/config.js';
import devCommand from './commands/dev.js';
import deployCommand from './commands/deploy.js';

// 检查更新
const notifier = updateNotifier({ pkg });
if (notifier.update) {
  console.log(
    boxen(
      `${chalk.bold('Update available!')} ${chalk.dim(notifier.update.current)} → ${chalk.green(
        notifier.update.latest
      )}\nRun ${chalk.cyan(`npm i -g @acip/cli`)} to update`,
      {
        padding: 1,
        margin: 1,
        align: 'center',
        borderColor: 'yellow',
        borderStyle: 'round',
      }
    )
  );
}

// 创建程序实例
const program = new Command();

// 设置版本和描述
program
  .name('acip')
  .description('ACIP CLI - Command Line Interface for Adaptive Contextual Intelligence Protocol')
  .version(pkg.version, '-v, --version', 'Output the current version');

// 注册命令
initCommand(program);
newCommand(program);
configCommand(program);
devCommand(program);
deployCommand(program);

// 添加帮助信息
program.on('--help', () => {
  console.log('');
  console.log('Examples:');
  console.log('  $ acip init my-acip-project');
  console.log('  $ acip new component MyComponent');
  console.log('  $ acip config set apiKey YOUR_API_KEY');
  console.log('  $ acip dev');
  console.log('  $ acip deploy');
});

// 解析参数并执行
program.parse(process.argv);

// 如果没有提供参数，显示帮助
if (!process.argv.slice(2).length) {
  console.log(
    boxen(
      `${chalk.bold.blue('ACIP CLI')} ${chalk.dim('v' + pkg.version)}\n${chalk.dim(
        'Adaptive Contextual Intelligence Protocol'
      )}\n\n${chalk.yellow('Type `acip --help` to see available commands')}`,
      {
        padding: 1,
        margin: 1,
        align: 'center',
        borderColor: 'blue',
        borderStyle: 'round',
      }
    )
  );
  process.exit(0);
} 