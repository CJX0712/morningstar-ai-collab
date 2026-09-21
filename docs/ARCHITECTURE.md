# 架构文档：AI 原生团队协作平台 MVP（"晨星"）

> 作者署名：晨星。文档语言：中文为主，关键数据/版本保留英文。
> 约束遵循：① 全栈 TypeScript（Next.js 前端 + Node 后端）；② 交付为 GitHub 仓库 + docker-compose 一键起，干净环境可复现；③ 4 个 AI 模块（LLM Agent、RAG 知识库、会议纪要/总结、代码/任务助手）；④ 优先复用业界领先开源成果，模块单一职责、接口清晰、可独立验证、可协同成链路；⑤ P0 规则——锁定 SVG 图标库 **lucide-react**，全文档与 API 禁用 emoji，技术栈必须包含该图标库依赖。

---

## 结论先行（Executive Summary）

MVP 采用 **pnpm monorepo（全栈 TypeScript）+ docker-compose 一键编排**：

- 前端：**Next.js 15（App Router, React 19）**
- 后端各服务：**NestJS 11（Fastify 平台）**，按单一职责拆分为 5 个可独立部署/验证的 Node 服务
- AI 编排：**LangChain.js（@langchain/* 0.3 系）**，Agent 用 LangGraph.js
- 向量库（RAG）：**Qdrant 1.13.x**（主选），Chroma 1.0 为备选
- LLM 接入：**ai-gateway 统一抽象**，默认本地 Ollama 0.6（OpenAI 兼容端点），可无缝切换云端 OpenAI/DeepSeek/Claude 或 vLLM
- 对象存储：**MinIO**（精确钉版本，见警告）；任务队列：**BullMQ on Redis 7**；主库：**PostgreSQL 17 + pgvector 0.8**
- 图标库（P0 锁定）：**lucide-react**（ISC 许可，1600+ SVG 图标，零运行时依赖，React 19 兼容，tree-shakeable）

三条可行性红线（必须在方案评审签字确认）：

1. **LlamaIndex.TS 已于 2026-04-30 归档为只读（不再发布）**——新项目一律改用 LangChain.js，不再评估 LlamaIndex.ts。
2. **MinIO 社区版 Docker 镜像自 RELEASE.2025-09-07 起停止推送，`latest` 已冻结**，项目于 2025-12~2026-02 进入维护/归档模式。必须钉死最后有效标签 `RELEASE.2025-09-07T16-13-09Z`，并规划 SeaweedFS/Garage 迁移路径。
3. **Ollama 默认串行处理请求、并发低、CPU 推理延迟高**——仅作本地开发/隐私场景；生产流量走云端 API 或 vLLM，ai-gateway 必须实现 provider 降级。

---

## 1. 技术选型对比矩阵（每层级 ≥3 方案 + 评分）

评分维度：生态成熟度 / 学习成本 / 部署成本 / 扩展性 / 团队熟悉度（满分 5）。

### 1.1 前端框架
| 方案 | 生态 | 学习 | 部署 | 扩展 | 熟悉 | 结论 |
|------|------|------|------|------|------|------|
| **Next.js 15（App Router, React 19）** | 5 | 4 | 5 | 4 | 5 | **选定**。SSR/RSC/Route Handlers 一体化，前端+轻 BFF 同仓 |
| Vite + React SPA | 4 | 5 | 3 | 3 | 5 | 需另配网关，MVP 集成成本更高 |
| Nuxt 3（Vue） | 4 | 3 | 4 | 4 | 2 | 与全栈 TS/React 路线不符 |

### 1.2 后端 / API 框架
| 方案 | 生态 | 学习 | 部署 | 扩展 | 熟悉 | 结论 |
|------|------|------|------|------|------|------|
| **NestJS 11（Fastify 平台）** | 5 | 3 | 5 | 5 | 4 | **选定**。Module/DI/Swagger 天然支撑"单一职责+OpenAPI 契约+可独立验证" |
| Fastify 裸用 | 4 | 4 | 5 | 3 | 5 | 轻但缺结构化模块边界，多服务难维护 |
| Express 4/5 | 4 | 5 | 4 | 3 | 5 | 结构自由度高但需自建房式，易过度设计 |
| tRPC | 4 | 3 | 4 | 3 | 3 | 端到端类型佳，但跨服务/多语言契约弱 |

### 1.3 向量数据库（RAG）
| 方案 | 生态 | 学习 | 部署 | 扩展 | 熟悉 | 结论 |
|------|------|------|------|------|------|------|
| **Qdrant 1.13.x** | 5 | 4 | 5 | 5 | 3 | **选定**。Rust、过滤强、REST+gRPC、Docker 一键 |
| Chroma 1.0.x | 4 | 5 | 4 | 3 | 3 | 备选；JS 客户端 v3 重写，简单但规模/过滤弱于 Qdrant |
| pgvector 0.8 | 4 | 5 | 4 | 3 | 4 | 与 PG 同库省运维，但百万级向量检索性能弱于专用库 |

### 1.4 LLM 推理 / 接入
| 方案 | 生态 | 学习 | 部署 | 扩展 | 熟悉 | 结论 |
|------|------|------|------|------|------|------|
| **Ollama 0.6（本地，OpenAI 兼容端点 /v1）** | 4 | 5 | 3 | 2 | 4 | **默认本地方案**，一行起模型；并发低、需 GPU |
| **云端 API（OpenAI/DeepSeek/Claude）** | 5 | 4 | 5 | 5 | 4 | **生产主流量**，按量计费，零运维；经 ai-gateway 统一接入 |
| vLLM 0.7（GPU 集群） | 4 | 2 | 2 | 5 | 2 | 高吞吐场景备选，部署复杂 |

> 决策：ai-gateway 以"OpenAI 兼容协议"为唯一抽象面——Ollama、vLLM、多数云厂商均暴露 `/v1`，一套客户端即可热切换 provider。

### 1.5 Agent 编排框架
| 方案 | 生态 | 学习 | 部署 | 扩展 | 熟悉 | 结论 |
|------|------|------|------|------|------|------|
| **LangChain.js 0.3（@langchain/core）+ LangGraph.js** | 5 | 3 | 4 | 5 | 4 | **选定**。Runnable/LCEL + 状态图，TS 一等公民 |
| LlamaIndex.TS | — | — | — | — | — | **否决**：2026-04-30 归档只读，不再维护 |
| 自研编排 | 2 | 2 | 4 | 3 | 3 | 违背"优先复用"原则，弃用 |

### 1.6 对象存储 / 任务队列 / 包管理 / 容器
| 层 | 选定 | 备选 | 备注 |
|----|------|------|------|
| 对象存储 | **MinIO `RELEASE.2025-09-07T16-13-09Z`** | SeaweedFS、Garage、本地卷 | 见警告②，钉死标签 |
| 任务队列 | **BullMQ ^5 on Redis 7** | Temporal、NATS | 长任务（纪要/代码助手）异步化 |
| 包管理 / Monorepo | **pnpm 10 workspace** | yarn、npm | `packageManager` 锁 pnpm@10.15.0 |
| 容器编排 | **docker-compose v2** | k8s、Nomad | MVP 不需要 k8s 复杂度 |
| 图标库（P0） | **lucide-react 1.46.0** | @radix-icons、heroicons、tabler | 锁定 SVG 图标，禁 emoji |

---

## 2. 版本锚定表（写实际版本号，防幻觉 API）

| 组件 | 锚定版本 | 锁定方式 |
|------|----------|----------|
| Node.js | 22（Active LTS, ≥22.12.0） | `.nvmrc` + Docker 基础镜像 `node:22-bookworm-slim` |
| pnpm | 10.15.0 | 根 `package.json` 的 `packageManager` 字段 + corepack |
| Next.js | 15.1.x（App Router） | lockfile |
| React / React-DOM | 19.0.0 | lockfile |
| lucide-react | 1.46.0（latest 1.x） | lockfile（P0 锁定） |
| NestJS | `@nestjs/core` ^11.1.0 | lockfile |
| @nestjs/platform-fastify | ^11.1.0（Fastify v5） | lockfile |
| LangChain.js | `@langchain/core` ^0.3.0（**所有 @langchain/* 必须同 core 版本**） | pnpm `overrides` 强制统一 |
| @langchain/openai / community / qdrant | 与 core 匹配的 0.3.x | pnpm `overrides` |
| LangGraph.js | `@langchain/langgraph` ^0.2.x | lockfile |
| Qdrant | `qdrant/qdrant:1.13.6`（建议 1.16.3 亦可） | 镜像 tag + volume |
| @qdrant/js-client-rest | ^1.13.0 | lockfile |
| Chroma（备选） | `chromadb` 1.0.x，JS 客户端 v3 | lockfile |
| Ollama | `ollama/ollama:0.6.5`，npm `ollama` ^0.6.0 | 镜像 tag + lockfile |
| vLLM（可选） | v0.7.x | 镜像 tag |
| PostgreSQL + pgvector | `pgvector/pgvector:0.8.0-pg17`（Postgres 17.6） | 镜像 tag |
| Redis | `redis:7` | 镜像 tag |
| MinIO | `minio/minio:RELEASE.2025-09-07T16-13-09Z` | 镜像 tag（冻结版，必钉） |
| BullMQ | `bullmq` ^5 | lockfile |

**关键兼容性注记**：
- 所有 `@langchain/*` 包必须共享同一 `@langchain/core` 版本，否则运行时报错。用 pnpm `overrides` 强制对齐。
- Embedding 维度必须与 Qdrant 集合 `vector size` 一致：云端 `text-embedding-3-small`=1536，本地 `nomic-embed-text`（Ollama）=768。由配置按集合驱动，不硬编码。
- Next.js 15 的 `cookies()/headers()/params/searchParams` 已改为 **async**，web 层代码须 `await`。

---

## 3. 系统模块划分（单一职责）

Monorepo 结构：
```
apps/
  web/                 # Next.js 15 前端 + 轻 BFF
  collab-core/         # 协作平台核心服务
  ai-gateway/          # 统一 LLM / Agent 接入
  rag-service/         # 知识库检索
  meeting-summary/     # 会议纪要 / 总结
  code-task-assistant/ # 代码 / 任务助手
packages/
  contracts/           # 跨服务 TS 类型 + OpenAPI 规范（唯一契约源）
  config/              # 共享配置 / 环境变量 schema
```

### 3.1 collab-core（NestJS + Fastify）
- 职责：工作区、成员、权限、文档、任务、实时协作（WebSocket）。
- 依赖：PostgreSQL+pgvector（业务数据/全文检索）、Redis（WebSocket pub/sub、缓存）。
- 接口（REST）：`POST /api/v1/workspaces`、`GET /api/v1/tasks?...`、`WS /api/v1/collab`。
- 独立验证：`pnpm --filter collab-core test` + 容器起 PG/Redis 后 `curl` 冒烟；Swagger 自出 OpenAPI。

### 3.2 ai-gateway（NestJS + Fastify）
- 职责：统一 LLM/Agent 接入；provider 抽象（OpenAI/DeepSeek/Claude/Ollama/vLLM）、流式 chat、Agent 编排（LangGraph）、模型路由+降级、token 计费。
- 依赖：LangChain.js、LangGraph.js、Ollama（可选本地）、Redis（限流/会话）。
- 接口：`POST /api/v1/chat`（SSE 流式）、`POST /api/v1/agents/run`。
- 独立验证：带 `OPENAI_API_KEY` 或本地 Ollama 起服务，`curl` 测流式输出；可用 `config.provider=ollama` 切本地。

### 3.3 rag-service（NestJS + Fastify）
- 职责：知识库 ingestion（分块→embed→写 Qdrant）、检索、rerank。
- 依赖：Qdrant、embedding provider（经 ai-gateway 或直连）、MinIO（源文件）。
- 接口：`POST /api/v1/ingest`、`POST /api/v1/retrieve`、`GET /api/v1/collections`。
- 独立验证：起 Qdrant，`curl` 灌 10 条文档后 `retrieve` 校验命中；与 ai-gateway 解耦可单测。

### 3.4 meeting-summary（NestJS + Fastify）
- 职责：接收会议音频/转录→转写（Whisper 经 Ollama 或云 ASR）→结构化纪要+行动项（LLM）。
- 依赖：MinIO（音频）、ai-gateway（LLM）、BullMQ（异步长任务）。
- 接口：`POST /api/v1/meetings`（提交）、`GET /api/v1/meetings/:id`（状态/结果，SSE 进度）。
- 独立验证：入队后用假音频跑完整 pipeline，断言产出含"行动项"结构；可 mock ai-gateway 做隔离测试。

### 3.5 code-task-assistant（NestJS + Fastify）
- 职责：任务拆解、代码生成/审查、与 collab-core 任务联动。
- 依赖：ai-gateway（LLM/Agent）、rag-service（可选代码索引）、collab-core（写回任务）。
- 接口：`POST /api/v1/tasks/:id/breakdown`、`POST /api/v1/code/review`。
- 独立验证：mock ai-gateway 与 collab-core，跑任务拆解单测。

---

## 4. 模块间调用关系（Call Graph）

```
                ┌──────────────┐
   Browser ───> │  web (Next)  │ ── REST/WS ──> collab-core
                └──────────────┘        └──> ai-gateway (流式 chat 直连)
                        │                     │
                        │        collab-core ─┘ (typed HTTP client)
                        │                     │
                  ai-gateway ───> rag-service (retrieve)
                        │           │
                        ├──> Ollama / 云端 LLM (OpenAI 兼容 /v1)
                        │
   meeting-summary ──> ai-gateway (LLM) , MinIO (音频) , BullMQ (异步)
   code-task-assistant ──> ai-gateway , rag-service , collab-core

   同步：typed HTTP（共享 packages/contracts 的 TS 类型 + OpenAPI）
   异步：BullMQ on Redis（meeting-summary / code-task-assistant 长任务）
```

---

## 5. 接口契约样例（TS 类型，契约源 packages/contracts）

```typescript
// ai-gateway 流式对话请求/响应（OpenAI 兼容 SSE）
export interface ChatRequest {
  model: string;            // "gpt-4o-mini" | "deepseek-chat" | "qwen2.5:7b"
  messages: { role: 'system'|'user'|'assistant'; content: string }[];
  stream?: boolean;         // true → SSE
  useRag?: boolean;         // 是否先走 rag-service 检索
}
export interface ChatChunk { delta: { content: string }; finish?: boolean; }

// rag-service 检索
export interface RetrieveRequest {
  collection: string;       // Qdrant 集合名
  query: string;
  topK?: number;            // 默认 8
  scoreThreshold?: number;  // 默认 0.75
}
export interface RetrieveResult {
  hits: { id: string; score: number; payload: Record<string, unknown> }[];
}

// meeting-summary 提交
export interface MeetingSubmit {
  workspaceId: string;
  audioRef: string;         // MinIO object key
  language?: string;        // 默认 zh
}
export interface MeetingStatus {
  id: string; stage: 'queued'|'transcribing'|'summarizing'|'done'|'failed';
  summary?: string; actionItems?: { owner?: string; text: string; due?: string }[];
}
```

统一响应包：`{ code: 0, data: T, message: string }`；错误码分段：1xxx 业务、2xxx AI 网关、3xxx RAG、4xxx 纪要、5xxx 代码助手。所有端点带 `/api/v1/` 版本前缀。

---

## 6. 复用开源清单（集成而非自研）

| 开源项目 | 用途 | 集成方式 |
|----------|------|----------|
| LangChain.js / LangGraph.js | Agent 编排、Runnable、状态图 | ai-gateway 直接 import，`@langchain/openai` 接 Ollama/云 |
| Qdrant（服务+JS 客户端） | 向量检索 | rag-service 经 `@qdrant/js-client-rest` 读写，Docker 起服务 |
| Ollama | 本地 LLM/embedding/Whisper | docker 服务，OpenAI 兼容端点被 ai-gateway 复用 |
| BullMQ | 异步任务队列 | meeting-summary / code-task-assistant 入队，Redis 承载 |
| MinIO | S3 兼容对象存储 | `@aws-sdk/client-s3` 直连，存音频/源文档 |
| NestJS Swagger | 自动产出 OpenAPI | 各服务 `DocumentBuilder` 生成契约，frontend 据以生成 TS 类型 |
| lucide-react | SVG 图标（P0 锁定） | web 全量 import，`<MessageSquare/>` 等，禁 emoji |
| pgvector | 业务库全文/向量混合 | collab-core 同库，避免额外向量服务 |

---

## 7. 依赖冲突 / 版本锁定策略 + docker-compose 拓扑

**锁定策略**
- 根 `package.json` 设 `"packageManager": "pnpm@10.15.0"`，`corepack enable` 保证版本一致；提交 `pnpm-lock.yaml`（锁 exact）。
- pnpm `overrides` 强制 `@langchain/core` 唯一版本；`.npmrc` 开 `strict-peer-dependencies=true`。
- 所有 Docker 镜像钉 **确切 tag**（必要时 digest）；基础镜像 `node:22-bookworm-slim@sha256:...`。
- `packages/contracts` 为唯一契约源，前端/后端均引用，避免漂移。

**docker-compose 拓扑（端口 / 依赖顺序 / healthcheck）**

| 服务 | 端口 | depends_on（healthcheck） | healthcheck |
|------|------|---------------------------|-------------|
| postgres (pgvector) | 5432 | — | `pg_isready -U postgres` |
| redis | 6379 | — | `redis-cli ping` |
| qdrant | 6333/6334 | — | `curl -f http://localhost:6333/health` |
| minio | 9000/9001 | — | `curl -f http://localhost:9001/minio/health/live` |
| ollama | 11434 | —（可选 GPU `--gpus all`） | `curl -f http://localhost:11434/` |
| collab-core | 3001 | postgres,redis(healthy) | `curl -f http://localhost:3001/health` |
| ai-gateway | 3002 | redis,ollama?(healthy) | `curl -f http://localhost:3002/health` |
| rag-service | 3003 | qdrant,minio(healthy) | `curl -f http://localhost:3003/health` |
| meeting-summary | 3004 | redis,minio,ai-gateway(healthy) | `curl -f http://localhost:3004/health` |
| code-task-assistant | 3005 | ai-gateway,rag-service,collab-core(healthy) | `curl -f http://localhost:3005/health` |
| web (next) | 3000 | collab-core,ai-gateway(healthy) | `curl -f http://localhost:3000` |

启动顺序由 `depends_on: { condition: service_healthy }` 保证；`docker-compose up` 一键拉起，干净环境可复现。

---

## 8. 可行性警告（必读）

1. **LlamaIndex.TS 归档**：2026-04-30 起只读，不再发版。新项目一律 LangChain.js，勿引入 LlamaIndex.ts。
2. **MinIO 镜像冻结**：社区版 Docker 镜像止于 `RELEASE.2025-09-07T16-13-09Z`，`latest` 冻结、项目归档。必须钉该标签；规划 SeaweedFS/Garage 迁移；对 CVE-2025-62506 等仅源码修复，镜像无补丁。
3. **Ollama 并发与延迟**：默认串行、CPU 推理慢；仅本地/隐私用，生产走云或 vLLM，ai-gateway 实现 provider 降级与限流。
4. **Embedding 维度耦合**：集合 `vector size` 须与模型维度一致（1536 vs 768），配置驱动，迁移知识库时重建集合。
5. **@langchain/* 版本对齐**：core 必须唯一，pnpm overrides 兜底，否则运行期异常。
6. **本地 LLM 硬件**：Ollama 实用延迟需 GPU；无 GPU 的 CI/干净环境应默认走云端 key 或跳过本地模型测试。
7. **Next.js 15 async API**：`cookies/headers/params/searchParams` 须 await，web 层代码适配。
8. **复现性**：干净环境 `docker-compose pull` 依赖镜像可达；MinIO/Ollama 钉 tag+digest，避免漂移。

---

## 附录：架构决策记录（ADR）清单
- ADR-001：采用 pnpm monorepo + 全栈 TypeScript（状态：Accepted）
- ADR-002：后端统一 NestJS 11（Fastify），按单一职责拆 5 服务（Accepted）
- ADR-003：向量库选 Qdrant 1.13（Chroma 备选）（Accepted）
- ADR-004：AI 编排选 LangChain.js（否决 LlamaIndex.ts，因其归档）（Accepted）
- ADR-005：LLM 接入经 ai-gateway 统一 OpenAI 兼容抽象，Ollama 本地 + 云兜底（Accepted）
- ADR-006：图标库锁定 lucide-react（P0 合规，禁 emoji）（Accepted）
- ADR-007：对象存储用 MinIO 并钉冻结标签，规划 SeaweedFS 迁移（Accepted，带风险）

（详细 ADR 文档将随 Phase 2 落地于 `docs/decisions/`。）
