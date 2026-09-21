import Link from 'next/link';
import { ArrowUpRight, MessagesSquare } from 'lucide-react';
import { DEMO_TASKS, callApi } from '@/lib/api';
import { Notice, SectionCard, StatCard, priorityLabel, statusLabel } from '@/components/ui';

// 数据在请求时获取，避免构建过程依赖后端可用性
export const dynamic = 'force-dynamic';

export default async function OverviewPage() {
  const tasksResult = await callApi('collab', '/api/v1/tasks', undefined, DEMO_TASKS);
  const tasks = tasksResult.data ?? [];
  const done = tasks.filter((t) => t.status === 'done').length;
  const doing = tasks.filter((t) => t.status === 'in_progress').length;
  const urgent = tasks.filter((t) => t.priority === 'urgent').length;

  return (
    <>
      <header>
        <h1 className="page-title">工作区总览</h1>
        <p className="page-desc">晨星 · 晨星产品研发空间 —— 看板、知识库与 AI 助手共享同一项目上下文。</p>
      </header>

      {tasksResult.error ? <Notice tone="warn">{tasksResult.error}</Notice> : null}

      <div className="grid grid-4">
        <StatCard label="任务总数" value={String(tasks.length)} hint="当前工作区全部任务" />
        <StatCard label="进行中" value={String(doing)} hint="需要今日跟进" />
        <StatCard label="已完成" value={String(done)} hint="本迭代累计交付" />
        <StatCard label="紧急事项" value={String(urgent)} hint="优先级为紧急" />
      </div>

      <div className="grid grid-2">
        <SectionCard
          title="近期任务"
          action={
            <Link href="/projects/demo-project" className="btn">
              <ArrowUpRight size={16} aria-hidden /> 打开看板
            </Link>
          }
        >
          {tasks.length === 0 ? (
            <p className="empty">还没有任务，去 AI 助手里用一句话创建吧。</p>
          ) : (
            <div className="list">
              {tasks.map((task) => (
                <div key={task.id} className="kv">
                  <span>
                    {task.title}
                    <span className="muted"> · {statusLabel(task.status)}</span>
                  </span>
                  <span>{priorityLabel(task.priority)}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="AI 今日摘要">
          <p className="muted">
            打开 AI 助手，可以基于当前项目上下文生成周报、拆解任务，或直接追问知识库。
          </p>
          <Link href="/ai" className="btn btn-primary">
            <MessagesSquare size={16} aria-hidden /> 进入 AI 助手
          </Link>
        </SectionCard>
      </div>
    </>
  );
}
