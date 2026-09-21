'use client';

import { useState } from 'react';
import { ListChecks, Sparkles } from 'lucide-react';
import type { MeetingStatus } from '@morningstar/contracts';
import { callApi } from '@/lib/api';

const SAMPLE = [
  '今天讨论 v3.2 组件重构的排期。',
  '我们决定采用 Teal 作为品牌强调色，不再使用紫色渐变。',
  '张伟负责完成登录页的联调工作，下周提交。',
  '李娜跟进向量库检索的压测报告。',
].join('\n');

export function MeetingPanel() {
  const [title, setTitle] = useState('v3.2 重构周会');
  const [transcript, setTranscript] = useState(SAMPLE);
  const [result, setResult] = useState<MeetingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    const res = await callApi<MeetingStatus>('meeting', '/meetings', {
      method: 'POST',
      body: JSON.stringify({ workspaceId: 'demo-workspace', title, transcript, language: 'zh-CN' }),
    });
    if (res.data) setResult(res.data);
    else setError(res.error ?? '生成失败');
    setPending(false);
  }

  return (
    <div className="split">
      <section className="card">
        <header className="card-head">
          <h2 className="card-title">会议记录</h2>
        </header>
        <div className="field">
          <label htmlFor="title">会议主题</label>
          <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="transcript">转写文本</label>
          <textarea id="transcript" value={transcript} onChange={(e) => setTranscript(e.target.value)} />
        </div>
        <button type="button" className="btn btn-primary" onClick={() => void submit()} disabled={pending}>
          <Sparkles size={16} aria-hidden /> {pending ? '生成中' : '生成纪要'}
        </button>
        {error ? (
          <p className="notice notice-error" style={{ marginTop: 'var(--space-3)' }}>
            <span>{error}</span>
          </p>
        ) : null}
      </section>

      <section className="card">
        <header className="card-head">
          <h2 className="card-title">纪要产物</h2>
          {result ? <span className="muted">{result.stage}</span> : null}
        </header>
        {!result ? (
          <p className="empty">生成结果会拆成摘要、决策与行动项，行动项可一键转任务卡。</p>
        ) : (
          <>
            <h3 className="card-title">摘要</h3>
            <p className="muted">{result.summary}</p>
            <h3 className="card-title" style={{ marginTop: 'var(--space-4)' }}>决策</h3>
            <ul className="list">
              {(result.decisions ?? []).map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
            <h3 className="card-title" style={{ marginTop: 'var(--space-4)' }}>行动项</h3>
            {(result.actionItems ?? []).length === 0 ? (
              <p className="empty">未识别到行动项。</p>
            ) : (
              (result.actionItems ?? []).map((item) => (
                <div key={item.title} className="kv">
                  <span>{item.title}</span>
                  <span>
                    <ListChecks size={16} aria-hidden /> {item.assignee ?? '未指派'}
                  </span>
                </div>
              ))
            )}
            {result.error ? <p className="notice notice-warn"><span>{result.error}</span></p> : null}
          </>
        )}
      </section>
    </div>
  );
}
