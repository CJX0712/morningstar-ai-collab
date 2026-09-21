import assert from 'node:assert/strict';
import test from 'node:test';
import { RagService, chunkText } from './rag.service';
import { HashEmbedder, MemoryVectorStore } from '../ports/vector.store';

function buildService(): RagService {
  return new RagService(new MemoryVectorStore(), new HashEmbedder(256));
}

test('rag-service: 分块按 size 切分并有重叠', () => {
  const text = 'a'.repeat(1700);
  const chunks = chunkText(text, 800, 100);
  assert.equal(chunks.length, 3);
  assert.equal(chunks[0].length, 800);
});

test('rag-service: 灌入后可检索到相同关键词且带来源', async () => {
  const service = buildService();
  const ingest = await service.ingest({
    collection: 'handbook',
    docId: 'doc-1',
    // 文档需超过 CHUNK_SIZE(800) 才会触发多分块路径
    text: '晨星平台的定价策略是开源自托管免费，企业版按席位收费。退款周期为 30 天。'.repeat(30),
  });
  assert.equal(ingest.code, 0);
  assert.ok(ingest.data.chunks > 1);

  const hit = await service.retrieve({ collection: 'handbook', query: '定价策略 退款周期', topK: 3 });
  assert.equal(hit.code, 0);
  assert.ok(hit.data.hits.length > 0);
  assert.ok(hit.data.hits[0].score > 0);
  assert.ok(hit.data.hits[0].text.includes('定价策略'));
  assert.equal(hit.data.hits[0].source, 'doc-1');
});

test('rag-service: 空文档与缺参返回 RAG 段错误码', async () => {
  const service = buildService();
  assert.equal((await service.ingest({ collection: 'c', docId: 'd', text: '   ' })).code, 3002);
  assert.equal((await service.ingest({ collection: '', docId: 'd', text: 'x' })).code, 3001);
  assert.equal((await service.retrieve({ collection: 'c', query: '' })).code, 3004);
});

test('rag-service: 哈希嵌入确定性且维度正确', async () => {
  const embedder = new HashEmbedder(128);
  const a = await embedder.embed('晨星 AI 协作平台');
  const b = await embedder.embed('晨星 AI 协作平台');
  assert.equal(a.length, 128);
  assert.deepEqual(a, b);
});
