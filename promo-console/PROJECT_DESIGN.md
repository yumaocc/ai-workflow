# AI 推广工作台设计文档

## 1. 项目定位

AI 推广工作台是一个运行在本机的运营控制台，用来把“内容生成、多平台发布、数据采集、客户筛选、客户整理”串成一条获客自动化链路。

当前项目不是 SaaS 后台，也不是对外网站。它的核心定位是：

- 本地运行的操作面板。
- 用 Codex CLI 生成可编辑的社媒图文内容。
- 需要生成封面、海报、配图、产品图或其它图片素材时，严格使用本机 Codex 的 `gpt-image-2` 技能/workflow。
- 用 `social-auto-upload` 的 `sau` CLI 完成账号登录、Cookie 检查和图文发布。
- 把命令行工具包装成按钮、表单和可读日志，降低命令行操作门槛。
- 后续接入作品数据和互动数据采集，用数据反推优质内容和潜在客户。

完整设想链路：

```text
用户输入文本
  -> AI 生成视频或图文
  -> 推送到抖音 / 小红书 / 快手等线上渠道
  -> 监控作品数据和互动数据
  -> 筛选优质客户
  -> 整理客户数据
```

## 2. 目标与非目标

### 目标

- 让用户通过页面选择平台、账号和任务，而不是手动输入 CLI 命令。
- 支持小红书、抖音、快手的账号登录和 Cookie 检查。
- 支持调用 Codex CLI 根据推广需求生成标题、正文和标签。
- 支持在内容需要图片时直接调用本机 `gpt-image-2` 技能生成图片，并把图片路径填入发布表单。
- 支持把生成内容填入发布表单，再调用 `sau upload-note` 发布图文。
- 把 CLI 输出渲染成可读日志，隐藏 ANSI 转义符和终端二维码字符画。
- 保留原始输出，便于排错。
- 设计上预留推广后数据采集、客户筛选和客户整理能力。

### 非目标

- 暂不做云端多用户系统。
- 暂不做账号密码托管。
- 暂不绕过平台风控、验证码或扫码登录。
- 当前版本暂不实现作品数据监听、评论监听、数据看板，但这些是完整链路中的后续核心模块。
- 暂不做完整交互式网页终端。

## 3. 用户流程

### 3.0 完整获客链路

目标流程不是单次发布，而是从内容生产到客户整理的闭环：

1. 用户输入产品、活动或获客需求。
2. AI 根据需求生成图文、脚本、短视频文案或视频素材方案。
3. 用户审核和编辑内容。
4. 系统把内容推送到多个线上渠道。
5. 系统持续采集作品数据：
   - 曝光量。
   - 播放量。
   - 点赞数。
   - 收藏数。
   - 评论数。
   - 转发数。
   - 主页访问或私信线索。
6. 系统采集互动用户数据：
   - 评论用户。
   - 高频互动用户。
   - 关注用户。
   - 私信用户。
   - 留资用户。
7. 系统根据规则和 AI 判断筛选优质客户。
8. 系统把客户整理为可跟进列表，供后续私信、CRM、表格或人工销售使用。

当前版本已覆盖第 1 到第 4 步的基础形态。第 5 到第 8 步需要后续增加数据采集和客户管理模块。

### 3.1 账号登录流程

1. 用户选择平台：小红书、抖音或快手。
2. 输入账号标识，默认是 `main`。
3. 点击“登录账号”。
4. 后端启动 `sau <platform> login --account <account> --headed`。
5. `social-auto-upload` 打开本机浏览器或生成登录二维码。
6. 用户完成扫码或网页登录。
7. Cookie 保存在 `social-auto-upload/cookies` 目录。
8. 页面展示执行摘要、二维码图片路径、clean output 和原始日志。

### 3.2 Cookie 检查流程

1. 用户选择平台和账号。
2. 点击“检查 Cookie”。
3. 后端启动 `sau <platform> check --account <account>`。
4. 页面展示 Cookie 是否有效。

### 3.3 内容生成流程

1. 用户输入产品或推广需求。
2. 点击“生成图文”。
3. 后端启动 `codex exec <prompt>`。
4. Codex 输出 JSON：

```json
{
  "title": "...",
  "note": "...",
  "tags": ["..."],
  "angle": "...",
  "image_required": true,
  "image_prompt": "...",
  "image_policy": "gpt-image-2",
  "safety_notes": ["..."]
}
```

5. 如果 `image_required` 为 `true`，后端立即按 `gpt-image-2` 技能规则检测模式，并在 Mode A 下调用 `scripts/generate.js` 生成本地图片。
6. 页面展示标题、正文、标签、图片预览、图片路径和 prompt 路径。
7. 用户点击“填入发布表单”。
8. 页面把 JSON 中的标题、正文、标签和生成图片绝对路径填入发布区域。
9. 图片生成只能使用 `gpt-image-2`，不能用其它图片来源替代。

### 3.4 图文发布流程

1. 用户确认平台、账号、标题、正文、标签。
2. 用户输入本地图片绝对路径，每行一个。
3. 点击“发布”。
4. 后端启动：

```bash
sau <platform> upload-note --account <account> --images <paths...> --title <title> --note <note> --tags <tags>
```

5. 页面展示发布命令执行结果。

### 3.5 推广后数据采集流程

这是后续阶段需要补齐的核心流程。

1. 系统记录每次发布任务：
   - 平台。
   - 账号。
   - 内容标题。
   - 内容正文。
   - 素材路径。
   - 发布时间。
   - 平台作品 ID 或作品 URL。
2. 定时任务按平台拉取作品数据。
3. 系统保存每个时间点的数据快照。
4. 页面展示作品趋势：
   - 初始冷启动数据。
   - 1 小时、6 小时、24 小时、72 小时表现。
   - 点赞、收藏、评论、转发的变化。
5. 系统识别高表现内容：
   - 高点击。
   - 高互动。
   - 高收藏。
   - 评论质量较高。
6. 系统把高表现内容反馈给内容生成模块，用于优化下一批选题和文案。

### 3.6 优质客户筛选流程

这是推广数据采集之后的下一层目标。

1. 系统采集评论、私信、关注、留资等用户行为。
2. 对用户互动内容做结构化分析：
   - 是否表达明确需求。
   - 是否询价。
   - 是否留下联系方式。
   - 是否有购买意图。
   - 是否只是泛互动。
3. 根据规则和 AI 打分生成线索等级：
   - A 级：明确需求，可直接跟进。
   - B 级：有兴趣，需要培育。
   - C 级：弱兴趣，只做记录。
   - 无效：广告、无关、重复或低质量互动。
4. 页面展示可跟进客户列表。
5. 支持导出到 CSV、表格或后续 CRM。

### 3.7 客户数据整理流程

客户数据需要从平台互动数据转成可运营的数据资产。

建议结构：

```json
{
  "platform": "xiaohongshu",
  "account": "main",
  "sourceWorkId": "platform-work-id",
  "sourceWorkUrl": "https://...",
  "userId": "platform-user-id",
  "nickname": "用户昵称",
  "profileUrl": "https://...",
  "interactionType": "comment",
  "interactionText": "想了解价格",
  "intentScore": 86,
  "leadLevel": "A",
  "tags": ["询价", "API", "开发者"],
  "nextAction": "私信跟进",
  "createdAt": "2026-06-23T10:00:00+08:00"
}
```

这部分数据后续应支持：

- 去重。
- 合并同一用户的多次互动。
- 标记跟进状态。
- 增加备注。
- 导出。
- 按平台、作品、意图等级、跟进状态筛选。

## 4. 信息架构

当前页面使用 `ConsoleApp` 组件复用不同模式：

| 路由 | 模式 | 用途 |
| --- | --- | --- |
| `/` | `home` | 概览页，展示账号、生成、发布和日志 |
| `/accounts` | `accounts` | 只展示账号登录和 Cookie 检查 |
| `/generate` | `generate` | 只展示 Codex 图文生成 |

页面顶部提供轻量导航，不使用侧边栏。这个项目的主要任务是连续操作，不需要复杂后台导航。

后续完整链路需要新增页面：

| 路由 | 用途 |
| --- | --- |
| `/works` | 作品列表和数据表现 |
| `/analytics` | 推广数据看板 |
| `/leads` | 优质客户和线索列表 |
| `/customers` | 整理后的客户资料 |
| `/tasks` | 发布、采集、分析任务历史 |

## 5. 前端设计

### 5.1 视觉方向

遵循仓库中的 `DESIGN.md`：

- 本地操作台，不做营销落地页。
- 首屏直接服务任务：账号状态、内容生成、发布、日志。
- 使用紧凑面板、清晰标签和稳定控件。
- 日志是一级界面，不是附属调试信息。

### 5.2 组件结构

核心组件：

- `ConsoleApp`
  - 管理平台、账号、生成需求、发布表单、运行状态和最近一次结果。
  - 根据 `mode` 决定展示哪些功能区。
- `TerminalOutput`
  - 展示命令摘要。
  - 展示二维码图片路径。
  - 展示清洗后的 stdout/stderr。
  - 折叠展示原始 stdout/stderr。

### 5.3 终端输出设计

当前采用“日志面板”而不是完整终端模拟器：

- 适合按钮触发任务、展示结果的场景。
- 不需要用户在页面里输入 shell 命令。
- 可读性和实现成本优于完整终端。

以后如果需要实时交互式终端，再引入：

- `xterm.js`：前端终端模拟器。
- `node-pty`：后端伪终端。
- WebSocket 或 SSE：实时传输 stdout/stderr。

当前日志面板已经处理：

- ANSI 转义符清洗。
- 终端二维码字符画过滤。
- 二维码图片路径提取。
- 摘要、clean output、raw output 分层展示。

## 6. 后端设计

后端使用 Next.js App Router 的 Route Handlers，运行在 Node.js runtime。

### 6.1 路由接口

| 接口 | 方法 | 功能 |
| --- | --- | --- |
| `/api/health` | `GET` | 返回 `sau`、Codex CLI 配置和可用状态 |
| `/api/accounts/check` | `POST` | 检查平台账号 Cookie |
| `/api/accounts/login` | `POST` | 启动平台登录流程 |
| `/api/generate` | `POST` | 调用 Codex CLI 生成图文 JSON |
| `/api/publish/note` | `POST` | 调用 `sau upload-note` 发布图文 |

后续数据采集和客户筛选需要新增接口：

| 接口 | 方法 | 功能 |
| --- | --- | --- |
| `/api/works` | `GET` | 查询已发布作品列表 |
| `/api/works/sync` | `POST` | 同步平台作品数据 |
| `/api/works/:id/metrics` | `GET` | 查询作品指标快照 |
| `/api/interactions/sync` | `POST` | 同步评论、私信、关注等互动数据 |
| `/api/leads` | `GET` | 查询筛选后的潜在客户 |
| `/api/leads/score` | `POST` | 对互动用户进行意向评分 |
| `/api/customers` | `GET/POST` | 查询或保存整理后的客户资料 |

### 6.2 命令执行层

`src/lib/run-command.ts` 使用 `child_process.spawn` 执行外部命令：

- `shell: false`，降低 shell 注入风险。
- stdout/stderr 分别收集。
- 每个命令有超时。
- 返回 `code`、`signal`、`stdout`、`stderr`、`durationMs`。

当前是请求-响应模式：命令结束后一次性返回结果。

### 6.3 响应清洗层

`src/lib/api.ts` 中的 `commandResponse` 负责统一包装命令结果：

```ts
{
  success: boolean;
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  summary: string;
  cleanStdout: string;
  cleanStderr: string;
  qrImagePath: string;
}
```

设计原因：

- 前端不直接理解复杂 CLI 输出。
- 后端更适合做 ANSI、二维码块、路径提取等命令输出清洗。
- 原始日志仍保留，方便调试。

## 7. 外部依赖

### 7.1 social-auto-upload

路径默认由 `src/lib/paths.ts` 推导：

```ts
SAU_ROOT || path.resolve(projectRoot, "..", "social-auto-upload")
SAU_BIN || path.join(sauRoot, ".venv", "bin", "sau")
```

职责：

- 登录平台账号。
- 保存和检查 Cookie。
- 上传图文内容。

### 7.2 Codex CLI

路径默认使用：

```ts
CODEX_BIN || "codex"
```

职责：

- 根据推广需求生成结构化 JSON。
- 当前通过 `codex exec <prompt>` 同步执行。
- 当内容需要图片时，Codex 输出 `gpt-image-2` 专用 `image_prompt`，由后续图片生成模块执行。

### 7.3 GPT Image 2

图片素材生成统一走本机 Codex 的 `gpt-image-2` 技能/workflow。

适用范围：

- 图文发布配图。
- 小红书封面。
- 抖音/快手封面。
- 海报、产品图、活动 KV。
- 数据图、流程图、技术图的位图素材。

硬性约束：

- 不用网络随机图。
- 不用占位图库图。
- 不用其它图片模型替代。
- 如果运行环境不能直接出图，就保存并展示 `gpt-image-2` prompt，等待用户或后续模块执行。

建议流程：

1. 内容生成模块判断是否需要图片。
2. 如果需要，生成 `image_prompt`。
3. 图片模块读取 `gpt-image-2` 技能，先执行模式检测。
4. Mode A 直接生成图片并保存本地路径。
5. Mode B 调用宿主图像工具执行同一 prompt。
6. Mode C 保存 prompt，并提示用户需要手动执行。
7. 发布模块只接收本地图片路径。

### 7.4 HeroUI

用于页面基础组件：

- `Button`
- `Card`
- `Chip`
- `Input`
- `TextArea`

当前因 HeroUI CSS 包解析问题，项目使用复制后的 `src/app/heroui.css`。

## 8. 数据与状态

当前没有数据库。

### 8.1 前端状态

由 `ConsoleApp` 内部 React state 管理：

- 当前平台。
- 当前账号。
- 推广需求。
- 生成后的标题、正文、标签。
- 图片路径。
- 健康检查状态。
- 最近一次命令结果。
- 当前运行中的动作。

### 8.2 本地文件状态

主要状态由外部工具持有：

- Cookie：`social-auto-upload/cookies`
- 登录二维码图片：通常也在 `social-auto-upload/cookies`
- 发布素材图片：用户输入的本地绝对路径

### 8.3 后续持久化数据模型

完整链路需要引入本地数据库。优先建议 SQLite，因为项目是本地工具，SQLite 足够轻量，也便于导出。

建议核心表：

| 表 | 用途 |
| --- | --- |
| `accounts` | 平台账号配置和 Cookie 状态 |
| `contents` | AI 生成的图文、脚本、视频方案 |
| `publish_tasks` | 发布任务记录 |
| `works` | 平台作品记录，保存作品 ID 和 URL |
| `work_metric_snapshots` | 作品数据快照 |
| `interactions` | 评论、私信、关注、留资等互动事件 |
| `leads` | AI 或规则筛选后的潜在客户 |
| `customers` | 整理后的客户资料 |

### 8.4 作品数据模型

```ts
type Work = {
  id: string;
  platform: "xiaohongshu" | "douyin" | "kuaishou";
  account: string;
  title: string;
  contentId: string;
  platformWorkId: string;
  platformWorkUrl: string;
  publishedAt: string;
};

type WorkMetricSnapshot = {
  id: string;
  workId: string;
  collectedAt: string;
  views?: number;
  plays?: number;
  likes?: number;
  favorites?: number;
  comments?: number;
  shares?: number;
  follows?: number;
  profileVisits?: number;
  privateMessages?: number;
};
```

### 8.5 线索数据模型

```ts
type Lead = {
  id: string;
  platform: string;
  account: string;
  sourceWorkId: string;
  platformUserId: string;
  nickname: string;
  profileUrl?: string;
  interactionType: "comment" | "message" | "follow" | "form";
  interactionText?: string;
  intentScore: number;
  leadLevel: "A" | "B" | "C" | "invalid";
  tags: string[];
  reason: string;
  nextAction: string;
  status: "new" | "contacted" | "qualified" | "ignored";
  createdAt: string;
  updatedAt: string;
};
```

## 9. 安全与边界

### 9.1 本地优先

项目默认只建议本机运行，不直接暴露到公网。

原因：

- 后端可以启动本机子进程。
- 后端可以访问本地文件路径。
- Cookie 和账号登录态保存在本机。

### 9.2 命令执行安全

当前命令执行使用参数数组和 `shell: false`，避免拼接 shell 字符串。

仍需注意：

- 不要把服务暴露给不可信网络。
- 不要允许任意命令输入。
- 图片路径应继续保持白名单式业务参数，而不是 shell 文本。

### 9.3 平台合规

项目只负责自动化用户自己授权的账号操作，不负责绕过平台限制。

内容生成提示词中已包含基本安全约束：

- 避免夸大承诺。
- 避免“绕过限制”“破解”“无限制”“官方平替”等高风险表达。

### 9.4 数据采集合规

后续做推广数据采集时，需要明确边界：

- 只采集用户自己账号下可见的作品数据和互动数据。
- 不采集非必要个人敏感信息。
- 不绕过平台权限、验证码、登录限制或访问控制。
- 客户数据只用于用户自己的业务跟进。
- 导出客户数据前应让用户明确知道导出内容。

## 10. 当前限制

- 命令输出不是实时流式展示，必须等命令结束后才显示完整结果。
- 登录二维码只展示图片路径，没有直接在页面渲染图片。
- 没有任务队列，当前同一时间只通过 `busyAction` 限制一个前端任务。
- 没有历史记录，刷新页面会丢失最近一次执行结果。
- 没有内容草稿保存。
- 没有平台作品数据监听。
- 没有互动用户采集。
- 没有优质客户筛选。
- 没有客户数据整理和导出。
- 没有发布前预览。
- 只覆盖图文发布，不覆盖短视频剪辑、封面生成、定时发布。

## 11. 后续演进路线

### 11.1 短期

- 在页面直接显示登录二维码图片，而不是只显示路径。
- 增加发布前预览区。
- 增加生成结果编辑状态和 JSON 解析错误提示。
- 增加命令历史记录。
- 增加图片路径存在性校验。
- 发布成功后保存作品 URL 或作品 ID。

### 11.2 中期

- 将命令执行改为任务模型：
  - `POST /api/tasks`
  - `GET /api/tasks/:id`
  - `GET /api/tasks/:id/logs`
- 使用 SSE 流式展示日志。
- 支持取消正在执行的任务。
- 支持草稿保存到本地 SQLite 或 JSON 文件。
- 支持多个账号配置。
- 增加作品列表和数据采集任务。
- 增加作品指标快照存储。
- 增加互动数据采集入口。

### 11.3 长期

- 接入 `xterm.js`，提供高级终端模式。
- 接入内容模板库和平台差异化提示词。
- 增加定时发布。
- 增加作品数据采集和效果复盘。
- 增加优质客户筛选和线索评分。
- 增加客户资料整理、导出和跟进状态管理。
- 增加多平台批量任务编排。

## 12. 推荐目录约定

当前目录已经可用。后续如果继续扩大，建议演进为：

```text
src/
  app/
    api/
      accounts/
      generate/
      publish/
      tasks/
      works/
      leads/
      customers/
  components/
    ConsoleApp.tsx
    TerminalOutput.tsx
    AccountPanel.tsx
    GeneratePanel.tsx
    PublishPanel.tsx
    WorkMetricsPanel.tsx
    LeadList.tsx
  lib/
    api.ts
    paths.ts
    run-command.ts
    tasks.ts
    output-cleaner.ts
    storage.ts
    lead-scoring.ts
```

当前不急着拆分。等任务队列、历史记录或日志流式能力出现后，再拆组件和服务层会更自然。

## 13. 技术决策记录

| 决策 | 当前选择 | 原因 |
| --- | --- | --- |
| 应用框架 | Next.js App Router | 前后端一体，适合本地控制台和 BFF |
| UI 组件库 | HeroUI | 快速搭建表单、按钮、卡片 |
| 发布能力 | 调用 `sau` CLI | 复用 `social-auto-upload` 已有能力 |
| 内容生成 | 调用 Codex CLI | 本机已有 Codex，避免先做复杂模型配置 |
| 命令交互 | 按钮触发 + 日志展示 | 当前不需要完整交互式终端 |
| 日志处理 | 后端清洗 + 前端分区渲染 | 降低前端复杂度，提升可读性 |
| 数据存储 | 暂无数据库 | MVP 阶段状态主要来自本地 CLI 和文件 |
| 推广数据采集 | 后续接入本地 SQLite + 定时同步 | 当前先打通发布链路，再补数据闭环 |
| 客户筛选 | 规则评分 + AI 辅助判断 | 互动文本和行为信号需要结合判断 |
