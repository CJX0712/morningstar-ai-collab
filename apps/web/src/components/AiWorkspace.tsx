'use client';

import { useState } from 'react';
import { Copy, Send, SquareArrowOutUpRight, TriangleAlert } from 'lucide-react';
import type { ChatResponse } from '@morningstar/contracts';
import { callApi } from '@/lib/api';

interface Turn {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Claude Artifacts 式分屏：左侧线程记录意图，右侧沉淀产物。
 * 复制与发布是两个独立动作，避免误分享。
 */
export function AiWorkspace() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [artifact, setArtifact] = useState('');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function send() {
    const text = input.trim();
    if (!text) return;
    setPending(true);
    setNotice(null);
    const nextTurns: Turn[] = [...turns, { role: 'user', content: text }];
    setTurns(nextTurns);
    setInput('');

    const result = await callApi<ChatResponse>('ai', '/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: nextTurns, stream: false, useRag: true, collection: 'handbook' }),
    });

    if (result.data) {
      setTurns([...nextTurns, { role: 'assistant', content: result.data.content }]);
      setArtifact(result.data.content);
    } else {
      setNotice(result.error ?? '请求失败');
    }
    setPending(false);
  }

  return (
    <div className="split">
      <section className="card">
        <header className="card-head">
          <h2 className="card-title">对话线程</h2>
          <span className="muted">{pending ? '生成中' : '空闲'}</span>
        </header>

        {notice ? (
          <div className="notice notice-warn">
            <TriangleAlert size={16} aria-hidden />
            <span>{notice}</span>
          </div>
        ) : null}

        <div className="thread">
          {turns.length === 0 ? (
            <p className="empty">描述一个任务，例如「给登录接口补一个超时重试」。</p>
          ) : (
            turns.map((turn, index) => (
              <div key={index} className={turn.role === 'user' ? 'bubble bubble-user' : 'bubble'}>
                {turn.content}
              </div>
            ))
          )}
        </div>

        <div className="row" style={{ marginTop: 'var(--space-3)' }}>
          <input
            type="text"
            value={input}
            placeholder="输入你的需求"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void send();
            }}
          />
          <button type="button" className="btn btn-primary" onClick={() => void send()} disabled={pending}>
            <Send size={16} aria-hidden /> 发送
          </button>
        </div>
      </section>

      <section className="card">
        <header className="card-head">
          <h2 className="card-title">产物面板</h2>
          <div className="row">
            <button type="button" className="btn" onClick={() => void navigator.clipboard?.writeText(artifact)}>
              <Copy size={16} aria-hidden /> 复制
            </button>
            <button type="button" className="btn">
              <SquareArrowOutUpRight size={16} aria-hidden /> 发布到知识库
            </button>
          </div>
        </header>
        {artifact ? <div className="bubble">{artifact}</div> : <p className="empty">产物会出现在这里，可复制或发布。</p>}
      </section>
    </div>
  );
}
