# ACIP CLI API 参考

本文档提供ACIP CLI的完整API参考，包括所有命令、选项和参数的详细说明。

## 全局选项

以下选项适用于所有ACIP CLI命令：

| 选项 | 描述 |
|------|------|
| `-v, --version` | 显示CLI版本号 |
| `-h, --help` | 显示帮助信息 |
| `--no-color` | 禁用彩色输出 |
| `--debug` | 启用调试模式，显示详细日志信息 |

## 命令参考

### `init`

创建一个新的ACIP项目。

**语法：**
```
acip init [projectName] [options]
```

**参数：**
- `projectName`：（可选）项目名称。如果不提供，CLI将提示输入。

**选项：**
- `-t, --template <template>`：使用的模板（basic或advanced），默认值是"basic"
- `--typescript`：使用TypeScript（默认）
- `--javascript`：使用JavaScript而不是TypeScript
- `--no-install`：跳过依赖安装步骤

**示例：**
```bash
acip init my-app -t advanced
```

**返回：**
创建项目目录和文件，如果`--no-install`未指定，则安装依赖。

### `new`

创建新的组件、模型、工具或配置。

**语法：**
```
acip new <type> [name] [options]
```

**参数：**
- `type`：（必需）资源类型，可选值：component, model, tool, config
- `name`：（可选）资源名称。如果不提供，CLI将提示输入。

**选项：**
- `-d, --directory <dir>`：目标目录，默认基于资源类型和项目结构确定
- `--ts`：使用TypeScript（默认）
- `--js`：使用JavaScript而不是TypeScript

**示例：**
```bash
acip new component UserProfile
```

**返回：**
在指定目录中创建新文件。

### `config`

管理ACIP配置。

**语法：**
```
acip config <action> [key] [value]
```

**参数：**
- `action`：（必需）操作类型，可选值：set, get, list, delete
- `key`：（仅当action为set、get或delete时必需）配置键
- `value`：（仅当action为set时必需）配置值

**选项：**
- `--global`：操作全局配置而不是项目配置
- `--json`：以JSON格式输出结果

**示例：**
```bash
acip config set apiKey my-api-key
acip config get apiKey
acip config list --json
acip config delete apiKey
```

**返回：**
根据操作类型返回相应结果：
- `set`：确认消息
- `get`：配置值
- `list`：所有配置的键值对
- `delete`：确认消息

### `dev`

启动开发服务器。

**语法：**
```
acip dev [options]
```

**选项：**
- `-p, --port <port>`：指定端口，默认值是3000
- `--host <host>`：指定主机，默认值是"localhost"
- `--https`：使用HTTPS
- `--open`：在浏览器中自动打开应用
- `--no-watch`：禁用文件监视和自动重载

**示例：**
```bash
acip dev -p 8080 --open
```

**返回：**
启动开发服务器，监听指定端口，并显示服务器URL。

### `deploy`

部署ACIP应用。

**语法：**
```
acip deploy [environment] [options]
```

**参数：**
- `environment`：（可选）部署环境，可选值：production, staging, development。默认值是"production"。

**选项：**
- `--dry-run`：模拟部署，不实际执行
- `--verbose`：显示详细输出
- `--config <path>`：指定部署配置文件路径
- `--force`：强制部署，忽略警告
- `--no-build`：跳过构建步骤

**示例：**
```bash
acip deploy staging --dry-run
```

**返回：**
执行部署流程，显示部署状态和结果。

### `plugin`

管理ACIP插件。

**语法：**
```
acip plugin <action> [name]
```

**参数：**
- `action`：（必需）操作类型，可选值：add, remove, list, update
- `name`：（仅当action为add、remove或update时必需）插件名称

**选项：**
- `--version <version>`：（仅当action为add或update时可用）指定插件版本
- `--global`：全局安装插件

**示例：**
```bash
acip plugin add @acip/plugin-analytics
acip plugin list
acip plugin update @acip/plugin-analytics --version 1.2.0
acip plugin remove @acip/plugin-analytics
```

**返回：**
根据操作类型执行相应操作并显示结果。

### `help`

显示命令帮助信息。

**语法：**
```
acip help [command]
```

**参数：**
- `command`：（可选）要显示帮助信息的命令

**示例：**
```bash
acip help init
```

**返回：**
显示指定命令的帮助信息，如果未指定命令，则显示所有可用命令的帮助信息。

## 扩展CLI

ACIP CLI支持通过插件系统进行扩展。您可以创建自定义插件来添加新命令或修改现有命令的行为。插件开发文档可在[CLI插件开发指南](https://acip.dev/docs/cli/plugin-development)中找到。

## 配置文件

CLI使用多级配置系统：

1. **全局配置** - 适用于所有项目的设置
2. **用户配置** - 特定于当前用户的设置
3. **项目配置** - 特定于当前项目的设置

配置文件使用JSON格式，可以通过`acip config`命令或直接编辑相应文件进行修改。

### 配置文件位置

- 全局配置：`<installation_path>/config/default.json`
- 用户配置：
  - Windows: `%USERPROFILE%\.acip\config.json`
  - macOS/Linux: `$HOME/.acip/config.json`
- 项目配置：项目根目录下的`.acip/config.json`

## 命令执行流程

当您执行CLI命令时，ACIP CLI遵循以下流程：

1. 解析命令和选项
2. 加载配置（全局 -> 用户 -> 项目）
3. 应用环境变量覆盖
4. 验证命令参数
5. 执行命令逻辑
6. 返回结果

## 错误代码

CLI命令可能返回以下错误码：

| 代码 | 描述 |
|------|------|
| 0 | 成功 |
| 1 | 通用错误 |
| 2 | 无效的参数或选项 |
| 3 | 配置错误 |
| 4 | 文件系统错误 |
| 5 | 网络错误 |
| 6 | 依赖错误 |
| 7 | 权限错误 |

## 环境变量

ACIP CLI支持通过环境变量自定义行为：

| 环境变量 | 描述 | 默认值 |
|---------|------|--------|
| `ACIP_CLI_HOME` | CLI数据和配置的根目录 | `~/.acip` |
| `ACIP_CLI_LOG_LEVEL` | 日志级别 (debug, info, warn, error) | `info` |
| `ACIP_CLI_REGISTRY` | 自定义npm注册表URL | npm默认注册表 |
| `ACIP_CLI_TIMEOUT` | API请求超时（毫秒） | `30000` |
| `ACIP_CLI_NO_COLOR` | 禁用彩色输出 | `false` |