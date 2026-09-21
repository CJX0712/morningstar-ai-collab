import type { Citation, Task, Workspace } from '@morningstar/contracts';

/** 服务端渲染直连服务；浏览器侧走 Next rewrite 同源代理，避免跨域开销与额外依赖 */
export const SERVICES = {
  collab: process.env.COLLAB_CORE_URL ?? 'http://localhost:3001',
  ai: process.env.AI_GATEWAY_URL ?? 'http://localhost:3002',
  rag: process.env.RAG_SERVICE_URL ?? 'http://localhost:3003',
  meeting: process.env.MEETING_SUMMARY_URL ?? 'http://localhost:3004',
  code: process.env.CODE_TASK_ASSISTANT_URL ?? 'http://localhost:3005',
};

const PROXY: Record<ServiceKey, string> = {
  collab: '/api/collab',
  ai: '/api/ai',
  rag: '/api/rag',
  meeting: '/api/meeting',
  code: '/api/code',
};

export type ServiceKey = keyof typeof SERVICES;

export interface ApiResult<T> {
  data: T | null;
  error: string | null;
}

interface EnvelopeShape<T> {
  code: number;
  data: T;
  message: string;
}

/** path 可写全路径 /api/v1/xxx 或省略前缀写成 /xxx，内部统一归一化 */
function resolve(service: ServiceKey, path: string): string {
  const local = path.replace(/^\/api\/v1/, '');
  if (typeof window === 'undefined') {
    return `${SERVICES[service].replace(/\/$/, '')}/api/v1${local}`;
  }
  return `${PROXY[service]}${local}`;
}

/**
 * 统一调用入口：永不抛异常，后端不可达时用 fallback 兜底，保证页面不白屏。
 */
export async function callApi<T>(
  service: ServiceKey,
  path: string,
  init?: RequestInit,
  fallback?: T,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(resolve(service, path), {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      cache: 'no-store',
    });
    if (!res.ok) {
      return fallback !== undefined
        ? { data: fallback, error: `后端返回 HTTP ${res.status}` }
        : { data: null, error: `后端返回 HTTP ${res.status}` };
    }
    const json = (await res.json()) as EnvelopeShape<T>;
    if (json.code !== 0) {
      return fallback !== undefined
        ? { data: fallback, error: json.message }
        : { data: null, error: json.message };
    }
    return { data: json.data, error: null };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return fallback !== undefined
      ? { data: fallback, error: `后端不可达（${reason}），当前展示示例数据` }
      : { data: null, error: `后端不可达（${reason}）` };
  }
}
/** 与 summarizer/analyzer 一致的本地兜底，保证前端无后端也能完成演示。作者：晨星 */

export const DEMO_WORKSPACE: Workspace = {
  id: 'demo-workspace',
  name: '晨星产品研发空间',
  createdAt: '2026-09-21T00:00:00.000Z',
};

export const DEMO_TASKS: Task[] = [
  {
    id: 'demo-1',
    projectId: 'demo-project',
    title: '修复登录接口 500 报错',
    description: '网关鉴权中间件在 token 过期时未返回 401',
    status: 'in_progress',
    priority: 'urgent',
    labels: ['bug', 'auth'],
    createdAt: '2026-09-21T00:00:00.000Z',
    updatedAt: '2026-09-21T00:00:00.000Z',
  },
  {
    id: 'demo-2',
    projectId: 'demo-project',
    title: '知识库检索结果补充来源引用',
    description: '每个答案必须可溯源到具体文档片段',
    status: 'todo',
    priority: 'high',
    labels: ['rag'],
    createdAt: '2026-09-21T00:00:00.000Z',
    updatedAt: '2026-09-21T00:00:00.000Z',
  },
  {
    id: 'demo-3',
    projectId: 'demo-project',
    title: '看板拖拽交互补充键盘可达',
    description: '满足 WCAG 2.1 AA 基本可达性要求',
    status: 'backlog',
    priority: 'medium',
    labels: ['a11y'],
    createdAt: '2026-09-21T00:00:00.000Z',
    updatedAt: '2026-09-21T00:00:00.000Z',
  },
];

export const DEMO_CITATIONS: Citation[] = [
  { id: 'c1', score: 0.82, text: '晨星平台采用开源自托管模式，编排文件在同仓库的 docker-compose.yml。', source: 'handbook.md' },
  { id: 'c2', score: 0.64, text: '默认向量后端为进程内实现，无需外部依赖即可完成检索链路验证。', source: 'architecture.md' },
];
