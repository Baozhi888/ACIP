import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import ora from 'ora';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface DevCommandOptions {
    port?: string;
}

export default function devCommand(program: Command): void {
    program
        .command('dev')
        .description('Start a development server')
        .option('-p, --port <port>', 'Port to run the server on', '3000')
        .action(async (options: DevCommandOptions) => {
            const spinner = ora('Starting development server...').start();

            try {
                // 确保项目目录存在
                const projectDir = process.cwd();
                const templateDir = path.join(path.dirname(path.dirname(__dirname)), 'templates/default');

                // 如果项目目录为空，复制模板文件
                const files = await fs.readdir(projectDir);
                if (files.length === 0) {
                    await fs.copy(templateDir, projectDir);
                }

                // 确保 package.json 存在
                const packageJsonPath = path.join(projectDir, 'package.json');
                if (!fs.existsSync(packageJsonPath)) {
                    const packageJson = {
                        name: 'acip-project',
                        version: '1.0.0',
                        private: true,
                        type: 'commonjs',
                        dependencies: {
                            express: '^4.18.3'
                        }
                    };
                    await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
                }

                // 确保依赖已安装
                if (!fs.existsSync(path.join(projectDir, 'node_modules'))) {
                    spinner.text = 'Installing dependencies...';
                    await installDependencies(projectDir);
                }

                // 确保 server.js 存在
                const serverFile = path.join(projectDir, 'server.js');
                if (!fs.existsSync(serverFile)) {
                    const templateServerFile = path.join(templateDir, 'server.js');
                    await fs.copy(templateServerFile, serverFile);
                }

                // 确保 public 目录存在
                const publicDir = path.join(projectDir, 'public');
                if (!fs.existsSync(publicDir)) {
                    await fs.copy(path.join(templateDir, 'public'), publicDir);
                }

                // 启动开发服务器
                spinner.succeed('Dependencies installed');
                spinner.text = 'Starting development server...';

                const serverProcess = spawn('node', [serverFile], {
                    stdio: 'inherit',
                    cwd: projectDir,
                    env: {
                        ...process.env,
                        PORT: options.port
                    }
                });

                serverProcess.on('error', (error) => {
                    console.error(chalk.red('Failed to start development server:'), error);
                    process.exit(1);
                });

                // 监听文件变化
                watchFiles(projectDir);

            } catch (error) {
                spinner.fail('Failed to start development server');
                console.error(chalk.red('Error:'), error);
                process.exit(1);
            }
        });
}

async function installDependencies(projectDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const npm = spawn('npm', ['install'], {
            stdio: 'inherit',
            cwd: projectDir
        });

        npm.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`npm install failed with code ${code}`));
            }
        });

        npm.on('error', reject);
    });
}

function watchFiles(projectDir: string): void {
    const watcher = fs.watch(projectDir, { recursive: true }, (eventType, filename) => {
        if (filename) {
            console.log(chalk.gray(`[${new Date().toLocaleTimeString()}] Info: File changed: ${filename}`));
        }
    });

    process.on('SIGINT', () => {
        watcher.close();
        process.exit(0);
    });
} 