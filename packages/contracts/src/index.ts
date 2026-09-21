/**
 * 晨星 AI 原生团队协作平台 —— 跨服务契约（唯一契约源）
 *
 * 规则：
 * 1. 本文件是前后端唯一类型来源，任何服务不得自行定义重复类型。
 * 2. 所有 HTTP 响应统一包成 Envelope<T>。
 * 3. 错误码按服务分段，便于定位。
 *
 * 作者：晨星
 */

// ---------------------------------------------------------------------------
// 统一响应包
// ---------------------------------------------------------------------------

export interface Envelope<T> {
  code: number;
  data: T;
  message: string;
}

export function ok<T>(data: T): Envelope<T> {
  return { code: 0, data, message: 'ok' };
}

/**
 * 构造失败响应。
 * 声明为泛型以便在 strict 模式下可直接作为任意 Envelope<T> 返回
 * （错误响应不含业务数据，此处以 null 占位并由泛型保证调用侧类型安全）。
 */
export function fail<T = null>(code: number, message: string): Envelope<T> {
  return { code, data: null as unknown as T, message };
}

/** 错误码分段：1xxx 业务 / 2xxx AI 网关 / 3xxx RAG / 4xxx 纪要 / 5xxx 代码助手 */
export const ERR = {
  BUSINESS: 1000,
  AI_GATEWAY: 2000,
  RAG: 3000,
  MEETING: 4000,
  CODE: 5000,
} as const;

// ---------------------------------------------------------------------------
// 协作核心（collab-core）
// ---------------------------------------------------------------------------

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Workspace {
  id: string;
  name: string;
  createdAt: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  key: string;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  labels: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkspaceRequest {
  name: string;
}

export interface CreateProjectRequest {
  workspaceId: string;
  name: string;
  key: string;
}

export interface CreateTaskRequest {
  projectId: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  assigneeId?: string;
  labels?: string[];
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  labels?: string[];
}

// ---------------------------------------------------------------------------
// AI 网关（ai-gateway）
// ---------------------------------------------------------------------------

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatRequest {
  model?: string;
  messages: ChatMessage[];
  stream?: boolean;
  useRag?: boolean;
  collection?: string;
}

export interface ChatResponse {
  content: string;
  model: string;
  finishReason?: string;
  citations?: Citation[];
}

export interface ChatChunk {
  delta: string;
  done: boolean;
}

/** LLM Provider 抽象：运行时注入，测试期可用 mock 实现 */
export interface LlmProvider {
  readonly name: string;
  complete(messages: ChatMessage[], model?: string): Promise<string>;
}

// ---------------------------------------------------------------------------
// RAG 知识库（rag-service）
// ---------------------------------------------------------------------------

export interface Citation {
  id: string;
  score: number;
  text: string;
  source?: string;
}

export interface IngestRequest {
  collection: string;
  docId: string;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface IngestResult {
  collection: string;
  docId: string;
  chunks: number;
}

export interface RetrieveRequest {
  collection: string;
  query: string;
  topK?: number;
  scoreThreshold?: number;
}

export interface RetrieveResult {
  hits: Citation[];
}

/** 向量后端抽象：内存实现用于离线验证，Qdrant 实现用于生产 */
export interface VectorStore {
  readonly name: string;
  upsert(collection: string, vectors: VectorRecord[]): Promise<void>;
  query(collection: string, vector: number[], topK: number): Promise<Citation[]>;
}

export interface VectorRecord {
  id: string;
  vector: number[];
  text: string;
  metadata?: Record<string, unknown>;
}

/** 嵌入器抽象：mock 实现可离线运行，远端实现走模型服务 */
export interface Embedder {
  readonly name: string;
  readonly dimension: number;
  embed(text: string): Promise<number[]>;
}

// ---------------------------------------------------------------------------
// 会议纪要（meeting-summary）
// ---------------------------------------------------------------------------

export type MeetingStage = 'queued' | 'summarizing' | 'done' | 'failed';

export interface ActionItem {
  title: string;
  assignee?: string;
  due?: string;
}

export interface MeetingSubmitRequest {
  workspaceId: string;
  title: string;
  transcript: string;
  language?: string;
}

export interface MeetingStatus {
  id: string;
  title: string;
  stage: MeetingStage;
  summary?: string;
  decisions?: string[];
  actionItems?: ActionItem[];
  error?: string;
}

// ---------------------------------------------------------------------------
// 代码 / 任务助手（code-task-assistant）
// ---------------------------------------------------------------------------

export interface BreakdownRequest {
  taskId: string;
  title: string;
  description?: string;
  maxSubTasks?: number;
}

export interface BreakdownResult {
  taskId: string;
  subTasks: Array<{ title: string; description: string; estimate?: string }>;
}

export interface CodeReviewRequest {
  code: string;
  language?: string;
  context?: string;
}

export interface CodeReviewResult {
  summary: string;
  issues: Array<{
    severity: 'info' | 'warn' | 'error';
    line?: number;
    message: string;
    suggestion?: string;
  }>;
}
