import { CircleAlert, CircleCheck, TriangleAlert } from 'lucide-react';

export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {hint ? <div className="stat-hint">{hint}</div> : null}
    </div>
  );
}

export function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card">
      <header className="card-head">
        <h2 className="card-title">{title}</h2>
        {action}
      </header>
      <div className="card-body">{children}</div>
    </section>
  );
}

export function Notice({
  tone,
  children,
}: {
  tone: 'info' | 'warn' | 'error' | 'success';
  children: React.ReactNode;
}) {
  const Icon = tone === 'success' ? CircleCheck : tone === 'error' ? CircleAlert : TriangleAlert;
  return (
    <div className={`notice notice-${tone}`}>
      <Icon size={16} aria-hidden />
      <span>{children}</span>
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  backlog: '待规划',
  todo: '待开始',
  in_progress: '进行中',
  done: '已完成',
  cancelled: '已取消',
};

const PRIORITY_LABEL: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急',
};

export function statusLabel(status: string): string {
  return STATUS_LABEL[status] ?? status;
}

export function priorityLabel(priority: string): string {
  return PRIORITY_LABEL[priority] ?? priority;
}
