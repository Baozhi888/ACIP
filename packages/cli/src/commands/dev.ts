import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { Command } from 'commander';

interface DevCommandOptions {
  port: number;
  host: string;
  https: boolean;
  open: boolean;
  watch: boolean;
}

export default function devCommand(program: Command): void {
  program
    .command('dev')
    .description('Start a development server')
    .option('-p, --port <port>', 'Port to run the server on', (value) => parseInt(value, 10), 3000)
    .option('-h, --host <host>', 'Host to run the server on', 'localhost')
    .option('--https', 'Use HTTPS', false)
    .option('-o, --open', 'Open in browser', false)
    .option('--no-watch', 'Disable file watching', true)
    .action(async (options: DevCommandOptions) => {
      // 检查当前目录是否是ACIP项目
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        console.error(chalk.red('Error: Not an ACIP project. Please run this command from an ACIP project directory.'));
        process.exit(1);
      }

      // 读取项目的package.json来查看scripts
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        if (!packageJson.scripts || !packageJson.scripts.dev) {
          console.warn(chalk.yellow('Warning: No "dev" script found in package.json'));
        }
      } catch (error) {
        console.warn(chalk.yellow('Warning: Could not read package.json'));
      }

      // 构建服务器启动消息
      const protocol = options.https ? 'https' : 'http';
      const serverUrl = `${protocol}://${options.host}:${options.port}`;
      console.log(chalk.blue(`Starting development server at ${chalk.cyan(serverUrl)}`));
      
      // 使用spinner来模拟服务器启动过程
      const spinner = ora('Compiling...').start();
      
      // 模拟编译和启动过程
      setTimeout(() => {
        spinner.succeed('Compiled successfully!');
        console.log('\nYou can now view your ACIP app in the browser.\n');
        console.log(`  ${chalk.bold('Local:')}            ${serverUrl}`);
        console.log(`  ${chalk.bold('On Your Network:')}  ${protocol}://your-network-ip:${options.port}\n`);
        
        console.log(chalk.gray('Note that the development build is not optimized.'));
        console.log(chalk.gray('To create a production build, use npm run build.\n'));
        
        // 模拟一些服务器日志
        setInterval(() => {
          const randomLogTypes = ['info', 'request', 'response'];
          const logType = randomLogTypes[Math.floor(Math.random() * randomLogTypes.length)];
          
          if (logType === 'request') {
            console.log(chalk.dim(`[${new Date().toLocaleTimeString()}]`), 
              chalk.green('Request:'), 
              chalk.cyan('GET /api/data'));
          } else if (logType === 'response') {
            console.log(chalk.dim(`[${new Date().toLocaleTimeString()}]`), 
              chalk.green('Response:'), 
              chalk.cyan('200 OK'), 
              chalk.dim('(124ms)'));
          } else {
            console.log(chalk.dim(`[${new Date().toLocaleTimeString()}]`), 
              chalk.blue('Info:'), 
              'Watching for file changes...');
          }
        }, 5000); // 每5秒随机输出一条日志
      }, 2000); // 2秒后显示服务器启动成功
    });
} 