# 晨星 · AI 原生团队协作平台

开源可自托管的 AI 原生团队协作平台。**AI 是第一公民，不是插件**：看板协作、企业知识库、会议纪要、代码/任务助手四大能力共享同一项目上下文，全部可运行在你自己的环境里，数据不出内网。

作者：晨星

---

## 一、为什么做这个

| 现有方案 | 问题 |
|---------|------|
| Linear / Notion AI / ClickUp Brain | AI 是叠加层、闭源不可私有部署、按席位线性涨价、内容送往第三方模型 |
| Height（已关停） | 验证了「AI 自主整理 backlog」是真需求，但商业不可持续且无开源继任者 |
| 自拼开源栈（Plane + AnythingLLM + Dify） | 体验割裂，需要自己打通四个模块 |

晨星的解法：**一体化 + 自托管 + AI 原生 + 单一语言（TypeScript）**。

## 二、系统架构

```
浏览器 ──> apps/web (Next.js 15 / React 19)
             │ 同源代理 rewrite /api/{collab,ai,rag,meeting,code}
             ▼
  ┌──────────────┬──────────────┬───────────────┬─────────────────┐
  │ collab-core  │ ai-gateway   │ rag-service   │ meeting-summary │
  │ :3001        │ :3002        │ :3003         │ :3004           │
  │ 工作区/项目  │ 统一 LLM     │ 分块/嵌入     │ 纪要/决策/行动项│
  │ /任务/权限   │ Agent 接入   │ 检索+来源     │ 一键转任务卡    │
  └──────────────┴──────────────┴───────────────┴─────────────────┘
                        │                └──> code-task-assistant :3005
                        │                     任务拆解 / 代码审查
                        ▼
              packages/contracts（唯一契约源：类型 + 错误码 + OpenAPI）
```

**模块按单一职责划分，每个服务都能独立启动、独立验证，也能协同组成完整链路。**

| 服务 | 端口 | 职责 | 独立验证方式 |
|------|------|------|-------------|
| collab-core | 3001 | 工作区 / 项目 / 任务看板 / 权限 | 启进程后 `curl /health` 与 `/api/v1/tasks` |
| ai-gateway | 3002 | 统一 LLM/Agent 接入、provider 降级 | `LLM_PROVIDER=mock` 起服务测流式与非流式 |
| rag-service | 3003 | 文档分块、嵌入、向量检索、来源引用 | 灌入 10 条后检索校验命中率 |
| meeting-summary | 3004 | 转写文本 → 摘要/决策/行动项 → 转任务卡 | 提交样例转写断言行动项结构 |
| code-task-assistant | 3005 | 任务拆解、代码生成与审查 | mock 网关跑单测 |
| web | 3000 | 8 个页面的前端应用 | `next build` + 页面可访问 |

### 可插拔设计（离线可验证的关键）

每个对外依赖都有 Protocol + 可注入实现，**默认走零依赖实现**，因此在无网络、无 API Key、无数据库的环境下，整条链路依然能跑通并被测试验证：

| 依赖 | 默认实现（离线） | 生产实现（配置后启用） |
|------|-----------------|---------------------|
| LLM | `MockLlmProvider`（确定性回复） | Ollama / 任意 OpenAI 兼容端点 / vLLM |
| 向量库 | `MemoryVectorStore`（进程内余弦） | `QdrantVectorStore`（REST） |
| 嵌入 | `HashEmbedder`（哈希嵌入，CJK bigram） | `RemoteEmbedder`（OpenAI 兼容 /v1/embeddings） |
| 仓储 | `InMemoryCollabRepository` | Postgres 实现（接口已预留） |
| 纪要/分析 | 本地确定性启发式 | 调用 ai-gateway |

## 三、快速开始（干净环境一键复现）

前置条件：Node.js >= 22.12、npm（随 Node 提供）。

```bash
git clone <your-repo-url> morningstar
cd morningstar
npm ci              # 版本锁定安装
npm run verify      # 构建 + 18 个离线测试 + P0 emoji 门禁
```

启动全部服务（每个服务独立端口，互不阻塞）：

```bash
npm run build
node apps/collab-core/dist/main.js &
node apps/ai-gateway/dist/main.js &
node apps/rag-service/dist/main.js &
node apps/meeting-summary/dist/main.js &
node apps/code-task-assistant/dist/main.js &
npm run start --workspace=@morningstar/web   # http://localhost:3000
```

### Docker 一键起（推荐用于部署）

```bash
cp .env.example .env
docker compose up -d                 # 6 个应用服务，默认零依赖实现
docker compose --profile full up -d  # 追加 Qdrant + Ollama（生产级后端）
```

默认 `docker compose up` **不需要 GPU、不需要 API Key、不需要外部数据库**即可跑通全链路。

## 四、端到端验证（可复制粘贴）

```bash
# 1. 健康检查
curl -s localhost:3001/health | head -c 200   # {"code":0,...,"status":"up"}

# 2. 建工作区 -> 建项目 -> 建任务
WS=$(curl -s -X POST localhost:3001/api/v1/workspaces -H 'Content-Type: application/json' -d '{"name":"晨星研发空间"}')
WS_ID=$(node -e "process.stdout.write(JSON.parse(process.argv[1]).data.id)" "$WS")
PROJ=$(curl -s -X POST localhost:3001/api/v1/projects -H 'Content-Type: application/json' -d "{\"workspaceId\":\"$WS_ID\",\"name\":\"看板重构\",\"key\":\"BD\"}")
PROJ_ID=$(node -e "process.stdout.write(JSON.parse(process.argv[1]).data.id)" "$PROJ")
curl -s -X POST localhost:3001/api/v1/tasks -H 'Content-Type: application/json' \
  -d "{\"projectId\":\"$PROJ_ID\",\"title\":\"修复登录 500 报错\",\"priority\":\"urgent\",\"labels\":[\"bug\"]}"

# 3. RAG：灌入后检索（结果必须带来源）
curl -s -X POST localhost:3003/api/v1/ingest -H 'Content-Type: application/json' \
  -d '{"collection":"handbook","docId":"doc-1","text":"晨星平台开源自托管免费，企业版按席位收费。退款周期 30 天。"}'
curl -s -X POST localhost:3003/api/v1/retrieve -H 'Content-Type: application/json' \
  -d '{"collection":"handbook","query":"退款周期","topK":3}'

# 4. 会议纪要（离线兜底也会产出结构化结果）
curl -s -X POST localhost:3004/api/v1/meetings -H 'Content-Type: application/json' \
  -d '{"workspaceId":"demo","title":"周会","transcript":"我们决定采用 Teal 作为强调色。张伟负责完成登录页联调，下周提交。"}'

# 5. AI 对话（默认 mock provider，确定性回复）
curl -s -X POST localhost:3002/api/v1/chat -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"帮我建一个登录页任务"}],"stream":false}'
```

## 五、使用指南（前端页面）

| 路由 | 用途 |
|------|------|
| `/` | 工作区总览：任务统计、近期任务、AI 入口 |
| `/login` | 登录（左侧真实产品预览，右侧表单；OAuth 用文字商标 + 中性图标） |
| `/projects/:id` | 项目看板：拖拽 + 键盘可达的状态切换，两种操作等价 |
| `/tasks/:id` | 任务详情：任务内原生讨论线程 + 右侧属性栏 |
| `/ai` | AI 助手：左对话线程 / 右产物面板（复制与发布分离，防误分享） |
| `/kb` | 知识库：文档灌入 + 语义问答，答案必须带来源引用 |
| `/meetings` | 会议纪要：转写 → 摘要/决策/行动项 → 一键转任务卡 |
| `/settings` | 设置：成员 / 权限 / 集成 / 单点登录 |

浏览器请求经 Next rewrite 同源代理转发到各微服务，因此**不需要额外配置 CORS**。

## 六、设计系统

- 深色优先（`#0A0B0D` 近黑画布 + 发丝边框），提供完整浅色主题。
- 品牌强调色 **Teal `#14B8A6`**（刻意避开竞品泛滥的靛蓝/紫，也避开紫粉渐变）。
- 图标唯一来源 **lucide-react**（16/20/24px，stroke 1.75，currentColor），**零 emoji**。
- 全部颜色经 Design Token（`docs/design/design-tokens.json` → `apps/web/src/styles/tokens.css`），组件内禁止裸 hex。
- 详见 `docs/design/DESIGN.md`。

## 七、目录结构

```
apps/
  web/                     前端（Next.js App Router）
  collab-core/             协作核心
  ai-gateway/              统一 LLM/Agent 接入
  rag-service/             企业知识库
  meeting-summary/         会议纪要
  code-task-assistant/     代码与任务助手
packages/
  contracts/               唯一契约源（类型 + 错误码）
docs/
  PRD.md ARCHITECTURE.md SPEC.md openapi.yaml
  design/DESIGN.md design-tokens.json
  decisions/ADR-*.md OPEN-DECISIONS.md
docker/                    Dockerfile.service / Dockerfile.web
tools/scan-emoji.js        P0 emoji 门禁
```

## 八、版本锁定与复现性

- 运行时依赖全部 **exact 钉版本**（无 `^`），并提交 `package-lock.json`，用 `npm ci` 复现。
- Docker 镜像钉确切 tag（`qdrant/qdrant:v1.13.6`、`ollama/ollama:0.6.5`）。
- 基础 TS 配置开启 `noEmitOnError`，**带类型错误不会产生构建产物**，杜绝「看起来编译过了」。

### 与初始方案的偏差（已决，见 ADR）

| 项 | 初始方案 | 实际落地 | 原因 |
|----|---------|---------|------|
| 包管理器 | pnpm 10 | npm workspaces | 沙箱内无 pnpm、corepack 不可达；npm workspaces 同样可 `npm ci` 精确复现 |
| AI 编排 | LangChain.js | 极薄 OpenAI 兼容客户端（零依赖） | 降低依赖树与版本对齐风险；provider 抽象保留，可随时换回 |
| 向量库 SDK | @qdrant/js-client-rest | 原生 fetch 调 Qdrant REST | 零 SDK 依赖，Qdrant 仍是生产向量库 |
| 数据库 | PostgreSQL + pgvector | 默认内存仓储（Postgres 接口已预留） | 保证离线可验证；docker-compose 已预留接入位 |

## 九、已验证记录

| 项 | 命令 | 结果 |
|----|------|------|
| 后端编译 | `npm run build` | 0 个 TS 错误，exit 0 |
| 离线单元测试 | `npm run test` | 18/18 通过（无网络、无 Key、无数据库） |
| 前端构建 | `next build` | 编译成功，8/8 页面生成 |
| 端到端运行时链路 | `npm run e2e` | 27/27 通过（自动拉起 5 个服务并跑通跨服务链路） |
| P0 emoji 门禁 | `node tools/scan-emoji.js` | 扫描 93 文件，0 违规 |
| 一键全量验证 | `npm run verify` | 构建 + 单测 + E2E + 门禁，exit 0 |

`npm run e2e` 会自行拉起 5 个服务、等待健康检查、跑通「建工作区→建项目→建任务→对话→灌入→检索→会议纪要→行动项转任务卡→任务拆解→代码审查」的完整链路（含 6 条错误流断言），跑完自动关闭进程，**不需要 docker、不需要 curl、不需要外部数据库**。

## 十、许可证

MIT · Copyright (c) 2026 晨星
