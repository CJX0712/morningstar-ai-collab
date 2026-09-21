import Link from 'next/link';
import { ArrowLeft, CircleCheck, TriangleAlert } from 'lucide-react';
import { DEMO_TASKS, callApi } from '@/lib/api';
import { Notice, priorityLabel, statusLabel } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fallback = DEMO_TASKS.find((t) => t.id === id) ?? DEMO_TASKS[0];
  const result = await callApi('collab', `/api/v1/tasks/${encodeURIComponent(id)}`, undefined, fallback);
  const task = result.data;

  return (
    <>
      <Link href="/" className="row">
        <ArrowLeft size={16} aria-hidden /> 返回总览
      </Link>

      <header>
        <h1 className="page-title">{task?.title ?? '任务不存在'}</h1>
        <p className="page-desc">{task?.description ?? '该任务可能已被删除。'}</p>
      </header>

      {result.error ? <Notice tone="warn">{result.error}</Notice> : null}

      {task ? (
        <div className="split">
          <section className="card">
            <header className="card-head">
              <h2 className="card-title">任务内讨论</h2>
            </header>
            <div className="thread">
              <div className="bubble">
                这条讨论线程保留在任务本身，不需要跳到另一个聊天窗口就能回溯决策过程。
              </div>
              <div className="bubble bubble-user">把登录报错的根因整理一下，下午同步给后端。</div>
            </div>
          </section>

          <aside className="card">
            <header className="card-head">
              <h2 className="card-title">属性</h2>
            </header>
            <div className="kv"><span>状态</span><span>{statusLabel(task.status)}</span></div>
            <div className="kv"><span>优先级</span><span>{priorityLabel(task.priority)}</span></div>
            <div className="kv"><span>负责人</span><span>{task.assigneeId ?? '未指派'}</span></div>
            <div className="kv"><span>标签</span><span>{task.labels.join('、') || '无'}</span></div>
            <div className="kv"><span>更新时间</span><span>{task.updatedAt}</span></div>
          </aside>
        </div>
      ) : null}

      <div className="row">
        <Link href="/ai" className="btn">
          <CircleCheck size={16} aria-hidden /> 让 AI 拆解这个任务
        </Link>
        <span className="muted">
          <TriangleAlert size={16} aria-hidden /> 未配置 AI 网关时，助手会走本地确定性兜底。
        </span>
      </div>
    </>
  );
}
