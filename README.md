# 🦫 卡皮巴拉法庭 · Capybara Court

一个中文双人实时 AI 调解网页。双方使用同一个房间码进入，分别写下自己的陈述；双方都提交后，系统才公开双方陈述并请求 AI 生成判词。

> **DeepSeek 版本：** 这份项目默认接入 DeepSeek，不再请求 OpenAI。Render 环境变量请使用 `DEEPSEEK_API_KEY` 和 `DEEPSEEK_MODEL=deepseek-flash`。修改 GitHub 文件后，Render 会自动重新部署；不要把真实密钥放进仓库。

> **推荐部署方式：GitHub + Render。** GitHub 用来保存代码，Render 负责运行 Node.js 后端、实时房间和 AI 请求。单独使用 GitHub Pages 不够，因为 GitHub Pages 不能运行这个项目需要的 Node.js / Socket.IO 服务端。

## 功能

- 房间码加入同一个实时房间，分别选择 A 方 / B 方。
- 双方提交前互相看不到对方的陈述。
- 两份陈述齐全后，由 AI 用中文生成裁决摘要、事实与推测辨析、双方合理之处、责任分析与行动建议。
- 裁决支持 A 方更有理、B 方更有理、双方都有道理、信息不足，不强行判输赢。
- 支持手机页面、复制房间码、断线重连、打印 / 保存判决书。
- 房间数据暂存在服务进程内存中，约 2 小时无活动后清理；服务重启后未完成的房间会消失。

## 方式一：上传到 GitHub，再部署到 Render（推荐）

### 1. 把项目放进 GitHub 仓库

1. 下载并解压整个项目 ZIP。
2. 登录 GitHub，创建一个新仓库，例如 `capybara-court`。
3. 将解压后 **`capybara-court` 文件夹里的所有文件和 `public` 文件夹** 上传到仓库根目录。上传后应能直接看到 `package.json`、`server.js`、`render.yaml`、`README.md` 和 `public/`。
4. 不要上传 `.env` 文件，也不要把 API Key 写进任何代码文件。`.gitignore` 已配置忽略 `.env`。

### 2. 在 Render 创建服务

1. 打开 <https://render.com/> 并登录。
2. 选择 **New → Blueprint**，连接 GitHub 并选中刚创建的仓库。
3. Render 会读取仓库根目录的 `render.yaml`，按提示创建服务。
4. 在环境变量设置中填入 `DEEPSEEK_API_KEY`，值为你自己的 DeepSeek API Key。不要把真实密钥写进 `render.yaml` 或上传到 GitHub。
5. 确认创建并等待部署完成。Render 会给你一个 `https://你的服务名.onrender.com` 地址，打开它即可使用。

如果你已经有旧版 Render 服务：先把本版本文件提交到同一个 GitHub 仓库；部署后进入服务的 **Environment** 页面，新增 `DEEPSEEK_API_KEY`（DeepSeek 控制台生成的真实密钥）和 `DEEPSEEK_MODEL=deepseek-flash`，然后保存并重新部署。旧的 `OPENAI_API_KEY` 不再使用，可以删除。不要把真实密钥提交到 GitHub。

官方部署文档：<https://render.com/docs/web-services>  
官方环境变量说明：<https://render.com/docs/configure-environment-variables>

### 3. 两个人怎么开庭

1. 双方分别打开同一个 Render 网站链接，建议使用不同设备或不同浏览器。
2. 一方输入房间码（也可以点“随机生成”），选 A 方进入。
3. 把房间码发给另一方；对方输入同一码，选 B 方进入。
4. 双方分别填写经过和自己最在意的事情，独立提交。
5. 双方都提交之后，AI 才开始裁决。

### 4. 后续如何更新网页

修改项目文件后，提交并推送到 GitHub 关联分支。Render 默认会跟随仓库更新自动重新部署。

## 方式二：本地运行

需要 Node.js 20 或更高版本：<https://nodejs.org/>

1. 解压项目，在项目根目录打开终端 / PowerShell。
2. 复制 `.env.example` 并重命名为 `.env`。
3. 打开 `.env`，填写 `DEEPSEEK_API_KEY`。默认模型是 `deepseek-flash`。
4. 执行：

   ```bash
   npm install
   npm start
   ```

5. 浏览器打开 <http://localhost:3000>。

Windows 也可以双击 `启动法庭.bat`，然后按照提示配置 API Key。

## AI API 说明

本项目通过服务端调用 DeepSeek Chat Completions API，使用 `https://api.deepseek.com/chat/completions` 与 `deepseek-flash` 模型。请先在 [DeepSeek 开放平台](https://platform.deepseek.com/) 创建 API Key，并在 Render 的 Environment 中配置 `DEEPSEEK_API_KEY`。API 是否可调用取决于 DeepSeek 账户的额度/计费状态，费用以 [官方模型与价格页面](https://api-docs.deepseek.com/quick_start/pricing/) 为准。

项目不会把 API Key 发送给浏览器。请只在本地 `.env` 或部署平台的服务端环境变量中配置密钥，切勿把密钥提交到公共仓库。如果密钥曾经误提交，请立即在 API 平台撤销并重新生成。

## 隐私与限制

- 请勿输入真实姓名、电话、住址、账号、密码或其他敏感信息。
- 双方陈述会发送给你配置的 AI 服务进行分析；部署平台也会运行本项目服务。开始使用前应让双方知情同意。
- 当前版本没有数据库、账号系统或持久化存储；服务重启时，房间、陈述和判词都会丢失。免费主机可能休眠或重启，不适合依赖它保存重要内容。
- 本项目是帮助双方梳理观点的娱乐 / 调解工具，AI 只能依据提供的文字分析，无法独立核实事实，也不能替代法律、医疗或心理健康专业人士。涉及威胁、暴力、胁迫或人身安全风险时，应优先保护安全并求助可信任的人或专业机构。

## 项目结构

```text
capybara-court/
├── .env.example       # 本地配置模板，不包含真实密钥
├── .gitignore
├── package.json
├── render.yaml         # Render 部署配置
├── server.js           # Express + Socket.IO + AI 判词服务端
├── 启动法庭.bat        # Windows 本地启动脚本
└── public/
    ├── index.html
    ├── styles.css
    └── app.js
```
