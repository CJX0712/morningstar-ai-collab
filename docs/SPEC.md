# Spec - 晨星 AI 原生团队协作平台 v1.0.0

> 生成日期：2026-09-21
> 基于：PRD v0.1 + 架构文档 v1.0 + UIUX 设计方向 v1.0
> 状态：已确认（用户对三文档确认后由项目总监锁定）
> 作者：晨星

**本文档是规格即契约。** 开发、测试、验收一律以本 Spec 为唯一依据。不在此文档范围内的功能一律不做。

---

## 1. 产品定义

- **一句话描述**：开源可自托管的 AI 原生团队协作平台，把看板协作、企业知识库、会议纪要、代码/任务助手整合进同一项目上下文。
- **目标用户**：5-30 人、重视数据主权的中小团队（软件/产品/咨询/研究所）。
- **核心问题**：任务、知识、会议、代码分散在四个工具，上下文无法贯穿；闭源 SaaS 数据出境、按席位涨价。

## 2. MVP 范围（锁定）

| 优先级 | 功能 | 验收标准摘要 | RICE |
|--------|------|-------------|------|
| P0 | 项目空间 + 任务看板 | 建工作区/项目/任务，看板列可拖拽，状态持久化 | 10.0 |
| P0 | AI 对话助手 | 项目内对话，自然语言建任务/分派/查询，流式输出 | 5.3 |
| P0 | RAG 企业知识库 | 上传文档→分块→嵌入→检索，答案带来源引用 | 4.8 |
| P0 | 会议纪要/总结 | 转写文本→摘要/决策/行动项→一键转任务卡 | 2.4 |
| P0 | 代码/任务助手 | 任务拆解、代码生成与审查 | 3.7 |
| P1 | 自主 backlog 梳理、第三方集成、多模型路由、SSO/审计、多视图看板 | — | — |

## 3. 明确不做（Out-of-Scope）

| 不做的功能 | 原因 | 何时考虑 |
|-----------|------|---------|
| 自研基础大模型 / 自训嵌入 | 成本周期不可控 | 永不（保持复用开源） |
| 甘特图 / 资源排程 / 工时计费 | 超出 MVP 验证目标 | v2.0 |
| 移动原生 App | Web 响应式优先 | 有明确需求后 |
| 多租户 SaaS 计费体系 | 定位自托管 | 有商业版需求后 |
| 实时多人光标协同编辑（CRDT） | 先基础实时保存 | P1 |
| 工作流自动化引擎 | 先人工触发 AI 动作 | v2.0 |
| 完整国际化 | 中文优先，i18n 接口预留 | 有海外用户后 |

## 4. 技术架构（版本锚定）

| 层 | 技术 | 版本 | 锁定原因 |
|----|------|------|---------|
| 运行时 | Node.js | >=22.12 | 内置 fetch / node:test，免额外测试依赖 |
| 语言 | TypeScript | 5.9.3 | 严格模式 + `noEmitOnError` 保证构建可信 |
| 前端 | Next.js（App Router） | 15.5.25 | React 19 支持、SSR/rewrite 同源代理 |
| 前端 UI | React + lucide-react | 19.3.0 / 1.46.0 | 图标唯一源（P0），禁 emoji |
| 后端框架 | NestJS（Fastify 平台） | 11.2.5 | 分层与依赖注入，契合单一职责 |
| 向量库 | Qdrant（默认实现为内存） | v1.13.6 | 生产级检索；默认内存保证离线可跑 |
| LLM 接入 | OpenAI 兼容端点（Ollama/云端） | Ollama 0.6.5 | 一套客户端热切 provider |
| 数据 | 内存仓储（默认）/ PostgreSQL（预留） | — | 离线可验证优先 |
| 部署 | Docker Compose | v2 | 一键起、可回滚 |
| 认证 | 预留 JWT | — | MVP 未启用，接口位已留 |

## 5. API 端点清单（锁定）

统一前缀 `/api/v1/`，统一响应包 `Envelope<T> = { code, data, message }`，错误码分段：1xxx 业务 / 2xxx AI 网关 / 3xxx RAG / 4xxx 纪要 / 5xxx 代码助手。完整机器可读契约见 `docs/openapi.yaml`。

| Method | Path | 服务 | 功能 |
|--------|------|------|------|
| GET | /health | 全部 | 健康检查 |
| POST | /api/v1/workspaces | collab-core | 创建工作区 |
| GET | /api/v1/workspaces | collab-core | 列出工作区 |
| POST | /api/v1/projects | collab-core | 创建项目 |
| GET | /api/v1/projects | collab-core | 列出项目（可按 workspaceId 过滤） |
| POST | /api/v1/tasks | collab-core | 创建任务 |
| GET | /api/v1/tasks | collab-core | 列出任务（可按 projectId/status 过滤） |
| GET | /api/v1/tasks/:id | collab-core | 任务详情 |
| PATCH | /api/v1/tasks/:id | collab-core | 更新任务（含状态流转） |
| DELETE | /api/v1/tasks/:id | collab-core | 删除任务 |
| POST | /api/v1/chat | ai-gateway | 非流式对话 |
| POST | /api/v1/chat/stream | ai-gateway | SSE 流式对话 |
| GET | /api/v1/models | ai-gateway | 当前 provider 与模型 |
| POST | /api/v1/ingest | rag-service | 文档灌入（分块+嵌入） |
| POST | /api/v1/retrieve | rag-service | 语义检索（带来源） |
| GET | /api/v1/collections | rag-service | 知识库列表 |
| POST | /api/v1/meetings | meeting-summary | 提交转写，产出纪要 |
| GET | /api/v1/meetings/:id | meeting-summary | 查询纪要状态 |
| POST | /api/v1/meetings/:id/action-items/to-tasks | meeting-summary | 行动项转任务卡 |
| POST | /api/v1/tasks/:id/breakdown | code-task-assistant | 任务拆解 |
| POST | /api/v1/code/review | code-task-assistant | 代码审查 |
| GET | /api/v1/analyzer | code-task-assistant | 当前分析器（local/remote） |

## 6. 数据库表清单

MVP 默认进程内存储，逻辑模型如下（切换 Postgres 时按此建表）：

| 表 | 核心字段 | 索引 | 关联 |
|----|---------|------|------|
| workspaces | id, name, created_at | PK id | 1..n projects |
| projects | id, workspace_id, name, key, created_at | PK id, IDX workspace_id | 1..n tasks |
| tasks | id, project_id, title, description, status, priority, assignee_id, labels, created_at, updated_at | PK id, IDX project_id, IDX status | n..1 project |
| vector_records | id, collection, vector, text, metadata | IDX collection | 逻辑归属 collection |
| meetings | id, title, stage, summary, decisions, action_items | PK id | 可派生 tasks |

## 7. 页面清单（锁定）

| 页面 | 路由 | 核心组件 | 对应 API | 主题 |
|------|------|---------|---------|------|
| 登录 | /login | 预览面板 + 表单 + SSO 按钮 | 预留 | 深色默认 |
| 工作区总览 | / | StatCard / SectionCard | GET /api/v1/tasks | 深色默认 |
| 项目看板 | /projects/:id | TaskBoard（拖拽 + 键盘） | GET/PATCH /api/v1/tasks | 深色默认 |
| 任务详情 | /tasks/:id | 讨论线程 + 属性栏 | GET /api/v1/tasks/:id | 深色默认 |
| AI 助手 | /ai | AiWorkspace（分屏） | POST /api/v1/chat | 深色默认 |
| 知识库 | /kb | KbPanel | POST /ingest, /retrieve | 深色默认 |
| 会议纪要 | /meetings | MeetingPanel | POST /api/v1/meetings | 深色默认 |
| 设置 | /settings | 分组卡片 | — | 深色默认 |

## 8. 设计 Token（锁定）

- **主色**：Teal `--accent: #14B8A6`（明确禁用紫粉渐变与默认 Tailwind 靛蓝）
- **画布**：深色 `#0A0B0D` / 浅色 `#F7F8FA`，双主题完整实现
- **字体**：Inter + Noto Sans SC；等宽 JetBrains Mono
- **图标库**：lucide-react 1.46.0（唯一源，16/20/24px，stroke 1.75）
- **间距**：4px 栅格；**圆角**：6/8/12/16px；**动效**：150-300ms，cubic-bezier(0.2,0,0,1)，支持 prefers-reduced-motion
- 机器可读源：`docs/design/design-tokens.json`；前端落地：`apps/web/src/styles/tokens.css`

## 9. 验收标准（EARS 格式）

| 编号 | 功能 | 验收标准 | 优先级 |
|------|------|---------|--------|
| AC-01 | 工作区 | While 用户提供合法名称，系统**必须**创建工作区并返回 id | P0 |
| AC-02 | 工作区 | If 名称为空，系统**必须**返回 code 1001 与错误信息 | P0 |
| AC-03 | 任务 | Given 已存在项目，When 提交合法任务，Then 系统**必须**创建任务且默认状态为 backlog | P0 |
| AC-04 | 任务 | If projectId 不存在，系统**必须**返回 code 1004 | P0 |
| AC-05 | 任务 | If 状态值非法，系统**必须**返回 code 1006 | P0 |
| AC-06 | 对话 | Given 非空 messages，When 调用 /chat，Then 系统**必须**返回模型回复与 model 名 | P0 |
| AC-07 | 对话 | If messages 为空，系统**必须**返回 code 2001 | P0 |
| AC-08 | 对话 | Where provider 调用失败，系统**必须**降级为 code 2002 而非崩溃 | P0 |
| AC-09 | RAG | Given 已灌入文档，When 检索相同关键词，Then **必须**命中且 hits 带 score 与 source | P0 |
| AC-10 | RAG | If 文档为空，系统**必须**返回 code 3002 | P0 |
| AC-11 | 纪要 | Given 提交含责任人的转写，When 处理完成，Then **必须**产出 summary/decisions/actionItems 且行动项带 assignee | P0 |
| AC-12 | 纪要 | If 未配置 COLLAB_CORE_URL，转任务卡时**必须**返回 code 4005 明确报错 | P0 |
| AC-13 | 代码助手 | When 审查含 eval/innerHTML 的代码，Then **必须**产出 severity=error 的 issue | P0 |
| AC-14 | 前端 | Where 后端不可达，页面**必须**展示降级示例数据与错误提示，不得白屏 | P0 |
| AC-15 | 复现 | Given 干净环境，When 执行 `npm ci && npm run verify`，Then 构建、测试、P0 门禁**必须**全部通过 | P0 |

## 10. 边界与约束

- 不支持 IE；目标 Chrome/Safari/Firefox 最新两个版本。
- 响应式断点：<=900px 折叠为单列。
- 性能目标：首屏 <3s，API p95 <500ms，RAG 检索 <3s。
- 单文件 <=300 行；入口文件只做装配，零业务逻辑。
- **P0 绝对规则**：禁 emoji 作功能图标（唯一图标源 lucide-react）；禁紫粉渐变；禁空洞占位文案；禁硬编码颜色（#fff/#000 除外）。

## 11. 内嵌已知坑

| 坑 | 技术栈指纹 | 根因 | 修法 |
|----|-----------|------|------|
| `node --test dist/` 报 MODULE_NOT_FOUND | node-22 | 该构建把目录参数当模块解析 | 改用 glob：`node --test "dist/**/*.test.js"` |
| tsc 带类型错误仍产出 dist | typescript | 默认 `noEmitOnError=false`，假"编译通过" | 基础配置显式开启 `noEmitOnError` |
| PowerShell `Set-Content -Path` 遇 `[id]` 静默失败 | powershell | `-Path` 支持通配符，`[id]` 被当字符类 | 一律用 `-LiteralPath` |
| PowerShell UTF8 写入带 BOM，JSON.parse 失败 | powershell | `Set-Content -Encoding UTF8` 加 BOM | 交付前脚本统一剥离 BOM |
| npm 报 404 ohpm.openharmony.cn | 沙箱 npm registry | registry 被改写为鸿蒙源 | 安装加 `--registry=https://registry.npmmirror.com` |
| Bash `ls/tr/head/dirname` 不可用 | 沙箱 coreutils | coreutils 未初始化 | 全部 shell 操作改用 PowerShell |
| PowerShell stdout 不回传 | 工具限制 | 该工具不返回 stdout | 结果写文件后用 Read 读取 |
| 中文哈希嵌入余弦恒为 0 | 自研 embedder | 中文无空格，整句被切成单个 token | 分词改为 CJK 字符 bigram + 拉丁词 |

## 12. 端到端验证步骤

```bash
# 1) 构建 + 测试 + P0 门禁（干净环境）
npm ci
npm run verify          # build -> test -> scan-emoji，任一失败即退出非 0

# 2) 启动（默认零依赖实现）
npm run build
node apps/collab-core/dist/main.js &
node apps/ai-gateway/dist/main.js &
node apps/rag-service/dist/main.js &
node apps/meeting-summary/dist/main.js &
node apps/code-task-assistant/dist/main.js &

# 3) 核心成功流：建任务
curl -s -X POST localhost:3001/api/v1/workspaces -H 'Content-Type: application/json' -d '{"name":"晨星"}'
# 断言：code=0 且 data.id 非空

# 4) 关键错误流：空名称
curl -s -X POST localhost:3001/api/v1/workspaces -H 'Content-Type: application/json' -d '{"name":"  "}'
# 断言：code=1001
```

## 13. 变更记录

| 日期 | 变更内容 | 原因 | 影响范围 |
|------|---------|------|---------|
| 2026-09-21 | 初版锁定 | 三文档经用户确认 | 全量 |
