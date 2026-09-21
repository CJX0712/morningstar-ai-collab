import { createHash } from 'node:crypto';
import type { Citation, Embedder, VectorRecord, VectorStore } from '@morningstar/contracts';

export const VECTOR_STORE = 'VECTOR_STORE';
export const EMBEDDER = 'EMBEDDER';

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

const CJK_RE = /[\u3400-\u4dbf\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/u;

/**
 * 分词：中日韩文本切成字符 bigram，拉丁文本按词切。
 * 若按 CJK 整串切词，中文句子会变成单个超长 token，查询词无法命中，余弦恒为 0。
 */
export function tokenize(text: string): string[] {
  const words = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const tokens: string[] = [];
  for (const word of words) {
    if (!CJK_RE.test(word)) {
      tokens.push(word);
      continue;
    }
    const chars = Array.from(word);
    if (chars.length === 1) {
      tokens.push(chars[0]);
      continue;
    }
    for (let i = 0; i < chars.length - 1; i += 1) {
      tokens.push(chars[i] + chars[i + 1]);
    }
  }
  return tokens;
}

/** 默认嵌入实现：确定性哈希嵌入，离线可用、可复现，无需下载模型 */
export class HashEmbedder implements Embedder {
  readonly name = 'hash';

  constructor(readonly dimension: number = Number(process.env.EMBEDDING_DIM ?? 256)) {}

  async embed(text: string): Promise<number[]> {
    const vector = new Array<number>(this.dimension).fill(0);
    const tokens = tokenize(text);
    if (tokens.length === 0) return vector;
    for (const token of tokens) {
      const digest = createHash('sha256').update(token).digest();
      const index = digest.readUInt16BE(0) % this.dimension;
      const sign = digest.readUInt8(2) % 2 === 0 ? 1 : -1;
      vector[index] += sign;
    }
    return vector;
  }
}

/** 远端嵌入实现：复用 ai-gateway 的 OpenAI 兼容 /v1/embeddings 端点 */
export class RemoteEmbedder implements Embedder {
  readonly name = 'remote';

  constructor(
    readonly dimension: number = Number(process.env.EMBEDDING_DIM ?? 1536),
    private readonly baseUrl: string = process.env.AI_GATEWAY_URL ?? 'http://127.0.0.1:3002',
    private readonly model: string = process.env.EMBEDDING_MODEL ?? 'nomic-embed-text',
  ) {}

  async embed(text: string): Promise<number[]> {
    const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/v1/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, input: text }),
    });
    if (!res.ok) throw new Error(`嵌入服务调用失败：HTTP ${res.status}`);
    const json = (await res.json()) as { data?: Array<{ embedding?: number[] }> };
    const vector = json.data?.[0]?.embedding;
    if (!vector) throw new Error('嵌入服务返回格式异常：缺少 data[0].embedding');
    return vector;
  }
}

/** 默认向量后端：进程内余弦检索 */
export class MemoryVectorStore implements VectorStore {
  readonly name = 'memory';
  private readonly store = new Map<string, Map<string, { vector: number[]; text: string; source?: string }>>();

  async upsert(collection: string, records: VectorRecord[]): Promise<void> {
    const bucket = this.store.get(collection) ?? new Map();
    for (const record of records) {
      bucket.set(record.id, {
        vector: record.vector,
        text: record.text,
        source: typeof record.metadata?.source === 'string' ? record.metadata.source : undefined,
      });
    }
    this.store.set(collection, bucket);
  }

  async query(collection: string, vector: number[], topK: number): Promise<Citation[]> {
    const bucket = this.store.get(collection);
    if (!bucket) return [];
    const scored = [...bucket.entries()].map(([id, row]) => ({
      id,
      score: cosine(vector, row.vector),
      text: row.text,
      source: row.source,
    }));
    return scored.sort((a, b) => b.score - a.score).slice(0, topK).filter((row) => row.score > 0);
  }

  async ensureCollection(collection: string, vectorSize: number): Promise<void> {
    void vectorSize;
    if (!this.store.has(collection)) this.store.set(collection, new Map());
  }

  async listCollections(): Promise<string[]> {
    return [...this.store.keys()];
  }
}

/** 生产向量后端：Qdrant REST API（零 SDK 依赖） */
export class QdrantVectorStore implements VectorStore {
  readonly name = 'qdrant';

  constructor(private readonly baseUrl: string = process.env.QDRANT_URL ?? 'http://127.0.0.1:6333') {}

  async ensureCollection(collection: string, vectorSize: number): Promise<void> {
    await fetch(`${this.baseUrl.replace(/\/$/, '')}/collections/${encodeURIComponent(collection)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vectors: { size: vectorSize, distance: 'Cosine' } }),
    });
  }

  async upsert(collection: string, records: VectorRecord[]): Promise<void> {
    const points = records.map((r) => ({ id: r.id, vector: r.vector, payload: { text: r.text, ...(r.metadata ?? {}) } }));
    await fetch(`${this.baseUrl.replace(/\/$/, '')}/collections/${encodeURIComponent(collection)}/points?wait=true`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points }),
    });
  }

  async query(collection: string, vector: number[], topK: number): Promise<Citation[]> {
    const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/collections/${encodeURIComponent(collection)}/points/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vector, limit: topK, with_payload: true }),
    });
    if (!res.ok) throw new Error(`Qdrant 检索失败：HTTP ${res.status}`);
    const json = (await res.json()) as { result?: Array<{ id: string | number; score: number; payload?: Record<string, unknown> }> };
    return (json.result ?? []).map((row) => ({
      id: String(row.id),
      score: row.score,
      text: String(row.payload?.text ?? ''),
      source: typeof row.payload?.source === 'string' ? row.payload.source : undefined,
    }));
  }

  async listCollections(): Promise<string[]> {
    const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/collections`);
    if (!res.ok) return [];
    const json = (await res.json()) as { result?: { collections?: Array<{ name: string }> } };
    return (json.result?.collections ?? []).map((c) => c.name);
  }
}

/** 工厂：按环境变量选择实现，默认全内存（离线可跑） */
export function createVectorStore(): MemoryVectorStore | QdrantVectorStore {
  const backend = (process.env.VECTOR_BACKEND ?? 'memory').toLowerCase();
  return backend === 'qdrant' ? new QdrantVectorStore() : new MemoryVectorStore();
}

export function createEmbedder(): HashEmbedder | RemoteEmbedder {
  const kind = (process.env.EMBEDDER ?? 'hash').toLowerCase();
  return kind === 'remote' ? new RemoteEmbedder() : new HashEmbedder();
}
