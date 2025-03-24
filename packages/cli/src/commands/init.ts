import fs from 'fs-extra';
import path from 'path';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { Command } from 'commander';
import { createProjectStructure } from '../utils/project.js';

interface InitOptions {
  typescript: boolean;
  javascript: boolean;
  force: boolean;
  skipPrompts: boolean;
  template: string;
}

export default function initCommand(program: Command): void {
  program
    .command('init [projectName]')
    .description('Initialize a new ACIP project')
    .option('--typescript', 'Use TypeScript (default)', true)
    .option('--javascript', 'Use JavaScript instead of TypeScript')
    .option('-f, --force', 'Overwrite existing files')
    .option('--skip-prompts', 'Skip all prompts and use default values')
    .option('-t, --template <name>', 'Specify a template (default: basic)', 'basic')
    .action(async (projectName: string | undefined, options: InitOptions) => {
      let finalProjectName = projectName;
      let useTypeScript = options.javascript ? false : options.typescript;
      
      // 如果没有提供项目名称且没有跳过提示，询问用户
      if (!finalProjectName && !options.skipPrompts) {
        const answers = await inquirer.prompt<{ projectName: string }>([
          {
            type: 'input',
            name: 'projectName',
            message: 'What is the name of your project?',
            default: 'my-acip-project',
            validate: (input: string) => {
              if (/^[a-z0-9-]+$/.test(input)) return true;
              return 'Project name must contain only lowercase letters, numbers, and hyphens.';
            }
          }
        ]);
        finalProjectName = answers.projectName;
      } else if (!finalProjectName) {
        // 如果跳过提示则使用默认名称
        finalProjectName = 'my-acip-project';
      }
      
      // 如果允许提示且没有明确指定JavaScript，询问语言偏好
      if (!options.skipPrompts && !options.javascript && !options.typescript) {
        const answers = await inquirer.prompt<{ language: string }>([
          {
            type: 'list',
            name: 'language',
            message: 'Which language would you like to use?',
            choices: [
              { name: 'TypeScript', value: 'typescript' },
              { name: 'JavaScript', value: 'javascript' }
            ],
            default: 'typescript'
          }
        ]);
        useTypeScript = answers.language === 'typescript';
      }
      
      // 确定项目路径
      const projectPath = path.resolve(process.cwd(), finalProjectName);
      
      console.log(chalk.blue(`\nCreating a new ACIP project in ${chalk.bold(projectPath)}`));
      console.log(`Using ${chalk.bold(useTypeScript ? 'TypeScript' : 'JavaScript')}\n`);
      
      try {
        // 创建项目结构
        await createProjectStructure({
          projectName: finalProjectName,
          projectPath,
          useTypeScript,
          template: options.template,
          force: options.force
        });
        
        console.log(chalk.green('\n✅ Project created successfully!'));
        console.log('\nNext steps:');
        console.log(`  cd ${finalProjectName}`);
        console.log('  npm install');
        console.log('  npm run dev\n');
        console.log(`To learn more about ACIP, check out the documentation at ${chalk.cyan('https://acip.dev/docs')}`);
      } catch (error) {
        console.error(chalk.red('\n❌ Failed to create project:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
} 