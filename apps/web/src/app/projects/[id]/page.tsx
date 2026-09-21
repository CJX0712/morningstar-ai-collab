import Link from 'next/link';
import { DEMO_TASKS, callApi } from '@/lib/api';
import { Notice } from '@/components/ui';
import { TaskBoard } from '@/components/TaskBoard';

export const dynamic = 'force-dynamic';

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await callApi('collab', `/api/v1/tasks?projectId=${encodeURIComponent(id)}`, undefined, DEMO_TASKS);

  return (
    <>
      <header>
        <h1 className="page-title">项目看板</h1>
        <p className="page-desc">项目 {id} —— 拖拽卡片或使用按钮切换状态，两种操作等价。</p>
      </header>

      {result.error ? <Notice tone="warn">{result.error}</Notice> : null}

      <TaskBoard initialTasks={result.data ?? []} disabled={Boolean(result.error)} />

      <div className="row">
        <Link href="/tasks/demo-1" className="btn">查看任务详情示例</Link>
        <Link href="/ai" className="btn">用 AI 拆解任务</Link>
      </div>
    </>
  );
}
