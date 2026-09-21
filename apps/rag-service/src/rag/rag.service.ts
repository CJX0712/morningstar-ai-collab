import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  ERR,
  fail,
  ok,
  type Citation,
  type Embedder,
  type Envelope,
  type IngestRequest,
  type IngestResult,
  type RetrieveRequest,
  type RetrieveResult,
  type VectorRecord,
} from '@morningstar/contracts';
import {
  EMBEDDER,
  VECTOR_STORE,
  MemoryVectorStore,
  QdrantVectorStore,
  type MemoryVectorStore as MemoryStore,
  type QdrantVectorStore as QdrantStore,
} from '../ports/vector.store';

type AnyVectorStore = MemoryVectorStore | QdrantVectorStore;

/** 固定长度分块 + 重叠，避免切断语义；中文按字符切分 */
export function chunkText(text: string, size = 800, overlap = 100): string[] {
  const clean = text.replace(/\r\n/g, '\n').trim();
  if (clean.length <= size) return clean.length > 0 ? [clean] : [];
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + size, clean.length);
    chunks.push(clean.slice(start, end));
    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}

@Injectable()
export class RagService {
  constructor(
    @Inject(VECTOR_STORE) private readonly store: AnyVectorStore,
    @Inject(EMBEDDER) private readonly embedder: Embedder,
  ) {}

  async ingest(input: IngestRequest): Promise<Envelope<IngestResult>> {
    if (!input?.collection || !input?.docId || !input?.text) {
      return fail(ERR.RAG + 1, 'collection、docId、text 均为必填');
    }
    const size = Number(process.env.CHUNK_SIZE ?? 800);
    const overlap = Number(process.env.CHUNK_OVERLAP ?? 100);
    const chunks = chunkText(input.text, size, overlap);
    if (chunks.length === 0) {
      return fail(ERR.RAG + 2, '文档内容为空，未产生任何分块');
    }

    const records: VectorRecord[] = [];
    for (let i = 0; i < chunks.length; i += 1) {
      records.push({
        id: randomUUID(),
        vector: await this.embedder.embed(chunks[i]),
        text: chunks[i],
        metadata: {
          docId: input.docId,
          chunkIndex: i,
          source: input.metadata?.source ?? input.docId,
          ...(input.metadata ?? {}),
        },
      });
    }

    try {
      const typedStore: MemoryStore | QdrantStore = this.store;
      await typedStore.ensureCollection(input.collection, this.embedder.dimension);
      await this.store.upsert(input.collection, records);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      return fail(ERR.RAG + 3, `向量库写入失败：${reason}`);
    }

    return ok({ collection: input.collection, docId: input.docId, chunks: chunks.length });
  }

  async retrieve(input: RetrieveRequest): Promise<Envelope<RetrieveResult>> {
    if (!input?.collection || !input?.query) {
      return fail(ERR.RAG + 4, 'collection 与 query 为必填');
    }
    const topK = input.topK ?? 5;
    try {
      const vector = await this.embedder.embed(input.query);
      const hits = await this.store.query(input.collection, vector, topK);
      const filtered: Citation[] = input.scoreThreshold
        ? hits.filter((h) => h.score >= (input.scoreThreshold ?? 0))
        : hits;
      return ok({ hits: filtered });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      return fail(ERR.RAG + 5, `检索失败：${reason}`);
    }
  }

  async collections(): Promise<Envelope<string[]>> {
    const typedStore: MemoryStore | QdrantStore = this.store;
    try {
      return ok(await typedStore.listCollections());
    } catch {
      return ok([]);
    }
  }
}
