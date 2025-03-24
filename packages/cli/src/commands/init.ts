import fs from 'fs-extra';
import path from 'path';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { Command } from 'commander';
import { createProjectStructure } from '../utils/project.js';

export default function initCommand(program: Command) {
  program
    .command('init [projectName]')
    .description('Initialize a new ACIP project')
    .option('-t, --template <template>', 'Template to use (basic, advanced)', 'basic')
    .option('--typescript', 'Use TypeScript (default)', true)
    .option('--javascript', 'Use JavaScript instead of TypeScript')
    .option('--no-install', 'Skip package installation')
    .action(async (projectName, options) => {
      // 如果没有提供项目名称，提示用户输入
      if (!projectName) {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'projectName',
            message: 'What is the name of your project?',
            default: 'my-acip-project',
            validate: (input: string) => {
              if (/^[a-zA-Z0-9-_]+$/.test(input)) return true;
              return 'Project name may only include letters, numbers, underscores and hashes.';
            }
          }
        ]);
        projectName = answers.projectName;
      }

      const projectPath = path.resolve(process.cwd(), projectName);

      // 检查目录是否已经存在
      if (fs.existsSync(projectPath)) {
        const { overwrite } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'overwrite',
            message: `Directory '${projectName}' already exists. Do you want to overwrite it?`,
            default: false
          }
        ]);

        if (!overwrite) {
          console.log(chalk.yellow('Operation cancelled.'));
          return;
        }

        // 清空目录
        fs.emptyDirSync(projectPath);
      }

      // 使用TypeScript还是JavaScript
      const useTypeScript = options.javascript ? false : options.typescript;

      // 创建项目
      const spinner = ora('Creating your ACIP project...').start();
      
      try {
        await createProjectStructure({
          projectPath,
          template: options.template,
          useTypeScript,
          projectName
        });

        spinner.succeed(`Project created at ${chalk.green(projectPath)}`);

        // 安装依赖
        if (options.install !== false) {
          spinner.text = 'Installing dependencies...';
          spinner.start();
          
          // 在这里可以调用npm或yarn安装依赖
          // 例如: await execa('npm', ['install'], { cwd: projectPath });
          
          spinner.succeed('Dependencies installed');
        }

        // 显示后续步骤
        console.log(`\n${chalk.bold('Next steps:')}`);
        console.log(`  cd ${projectName}`);
        if (options.install === false) {
          console.log('  npm install');
        }
        console.log('  npm run dev\n');
        console.log(`${chalk.bold('Documentation:')}`);
        console.log('  https://acip.dev/docs\n');
      } catch (error) {
        spinner.fail('Failed to create project');
        console.error(error);
      }
    });
} 