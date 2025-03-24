# ACIP CLI

ACIP命令行界面(CLI)是一个强大的工具，用于简化ACIP项目的创建、开发和管理。CLI提供了一系列命令，帮助开发者快速搭建项目框架、创建组件、配置环境和部署应用。

## 安装

通过npm全局安装CLI：

```bash
npm install -g @acip/cli
```

或使用yarn：

```bash
yarn global add @acip/cli
```

## 使用方法

安装后，可以使用`acip`命令执行各种操作：

```bash
acip [命令] [选项]
```

## 可用命令

### 初始化项目

创建一个新的ACIP项目：

```bash
acip init [项目名称] [选项]
```

选项：
- `-t, --template <template>` - 使用的模板（basic或advanced）
- `--typescript` - 使用TypeScript（默认）
- `--javascript` - 使用JavaScript
- `--no-install` - 跳过依赖安装

示例：
```bash
# 创建一个使用高级模板的TypeScript项目
acip init my-acip-app -t advanced

# 创建一个JavaScript项目
acip init my-js-app --javascript
```

### 创建资源

创建新的组件、模型、工具或配置：

```bash
acip new <类型> [名称] [选项]
```

类型：
- `component` - 创建一个新组件
- `model` - 创建一个新模型
- `tool` - 创建一个新工具
- `config` - 创建一个新配置

选项：
- `-d, --directory <dir>` - 目标目录
- `--ts` - 使用TypeScript（默认）
- `--js` - 使用JavaScript

示例：
```bash
# 创建一个新组件
acip new component MyComponent

# 在指定目录创建一个JavaScript模型
acip new model OpenAI --js -d src/custom-models
```

### 配置管理

管理ACIP配置：

```bash
acip config [动作] [键] [值]
```

动作：
- `set` - 设置配置值
- `get` - 获取配置值
- `list` - 列出所有配置
- `delete` - 删除配置值

示例：
```bash
# 设置API密钥
acip config set apiKey YOUR_API_KEY

# 获取默认模型
acip config get defaultModel

# 列出所有配置
acip config list
```

### 开发服务器

启动开发服务器：

```bash
acip dev [选项]
```

选项：
- `-p, --port <port>` - 指定端口（默认：3000）
- `--host <host>` - 指定主机（默认：localhost）

示例：
```bash
# 在默认端口启动开发服务器
acip dev

# 在指定端口启动开发服务器
acip dev -p 8080
```

### 部署

部署ACIP应用：

```bash
acip deploy [环境] [选项]
```

环境：
- `production` - 生产环境（默认）
- `staging` - 预发布环境
- `development` - 开发环境

选项：
- `--dry-run` - 模拟部署，不实际执行
- `--verbose` - 显示详细输出

示例：
```bash
# 部署到生产环境
acip deploy

# 模拟部署到预发布环境
acip deploy staging --dry-run
```

## 配置

CLI工具使用配置文件来存储设置和首选项。默认配置文件位于：

- Windows: `%USERPROFILE%\.acip\config.json`
- macOS/Linux: `$HOME/.acip/config.json`

您可以使用`acip config`命令或直接编辑配置文件来修改这些设置。

## 项目模板

CLI支持多种项目模板：

### 基础模板（basic）

提供最小化的ACIP项目结构，包含：
- 基本SDK设置
- 简单模型调用示例
- 基础项目结构

适合：初学者或简单AI应用。

### 高级模板（advanced）

提供更完整的项目结构，包含：
- 完整SDK配置
- 助手实现
- 事件系统示例
- 工具集成示例
- 配置管理

适合：复杂AI应用或需要高级功能的项目。

## 故障排除

如果遇到问题，可以尝试以下解决方案：

1. 确保您使用的是最新版本的CLI：
   ```bash
   npm update -g @acip/cli
   ```

2. 清除CLI缓存：
   ```bash
   acip cache clear
   ```

3. 如果遇到权限问题，尝试使用管理员权限运行命令。

4. 查看日志文件，位于：
   - Windows: `%USERPROFILE%\.acip\logs\`
   - macOS/Linux: `$HOME/.acip/logs/`

## 更多资源

- [ACIP文档](https://acip.dev/docs)
- [CLI API参考](https://acip.dev/docs/cli/api)
- [项目模板详解](https://acip.dev/docs/cli/templates)
- [常见问题解答](https://acip.dev/docs/cli/faq) 