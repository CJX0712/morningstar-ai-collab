'use client';

import { useState } from 'react';
import { FileUp, Search } from 'lucide-react';
import type { Citation, IngestResult } from '@morningstar/contracts';
import { DEMO_CITATIONS, callApi } from '@/lib/api';

export function KbPanel() {
  const [collection, setCollection] = useState('handbook');
  const [docId, setDocId] = useState('handbook.md');
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Citation[]>([]);
  const [log, setLog] = useState<string | null>(null);

  async function ingest() {
    const result = await callApi<IngestResult>('rag', '/ingest', {
      method: 'POST',
      body: JSON.stringify({ collection, docId, text, metadata: { source: docId } }),
    });
    setLog(result.data ? `已写入 ${result.data.chunks} 个分块` : (result.error ?? '灌入失败'));
  }

  async function retrieve() {
    const result = await callApi<{ hits: Citation[] }>(
      'rag',
      '/retrieve',
      { method: 'POST', body: JSON.stringify({ collection, query, topK: 5 }) },
      { hits: DEMO_CITATIONS },
    );
    setHits(result.data?.hits ?? []);
    setLog(result.error ?? `命中 ${result.data?.hits.length ?? 0} 条`);
  }

  return (
    <div className="split">
      <section className="card">
        <header className="card-head">
          <h2 className="card-title">文档灌入</h2>
        </header>
        <div className="field">
          <label htmlFor="collection">知识库</label>
          <input id="collection" type="text" value={collection} onChange={(e) => setCollection(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="docId">文档标识</label>
          <input id="docId" type="text" value={docId} onChange={(e) => setDocId(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="text">正文</label>
          <textarea id="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="粘贴团队规范、SOP 或 Wiki 正文" />
        </div>
        <button type="button" className="btn btn-primary" onClick={() => void ingest()}>
          <FileUp size={16} aria-hidden /> 灌入知识库
        </button>
        {log ? <p className="muted" style={{ marginTop: 'var(--space-3)' }}>{log}</p> : null}
      </section>

      <section className="card">
        <header className="card-head">
          <h2 className="card-title">语义问答</h2>
        </header>
        <div className="row" style={{ marginBottom: 'var(--space-3)' }}>
          <input
            type="text"
            value={query}
            placeholder="例如：平台的部署形态是什么"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void retrieve();
            }}
          />
          <button type="button" className="btn btn-primary" onClick={() => void retrieve()}>
            <Search size={16} aria-hidden /> 检索
          </button>
        </div>
        {hits.length === 0 ? (
          <p className="empty">检索结果会带来源引用，便于逐条追溯。</p>
        ) : (
          hits.map((hit) => (
            <article key={hit.id} className="task-card">
              <p className="task-desc">{hit.text}</p>
              <div className="row-between">
                <span className="muted">来源：{hit.source ?? '未知'}</span>
                <span className="muted">得分：{hit.score.toFixed(3)}</span>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
