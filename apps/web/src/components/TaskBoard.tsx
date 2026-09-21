'use client';

import { useState } from 'react';
import type { Task, TaskStatus } from '@morningstar/contracts';
import { priorityLabel, statusLabel } from './ui';

const COLUMNS: Array<{ key: TaskStatus; label: string }> = [
  { key: 'backlog', label: '待规划' },
  { key: 'todo', label: '待开始' },
  { key: 'in_progress', label: '进行中' },
  { key: 'done', label: '已完成' },
];

/**
 * 看板：优先 HTML5 拖拽，同时提供键盘可达的状态切换按钮，避免纯鼠标依赖。
 */
export function TaskBoard({ initialTasks, disabled }: { initialTasks: Task[]; disabled?: boolean }) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [dragging, setDragging] = useState<string | null>(null);

  function move(id: string, status: TaskStatus) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  }

  return (
    <div className="board">
      {COLUMNS.map((column) => (
        <div
          key={column.key}
          className="column"
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragging) move(dragging, column.key);
            setDragging(null);
          }}
        >
          <header className="column-head">
            <span>{column.label}</span>
            <span className="count">{tasks.filter((t) => t.status === column.key).length}</span>
          </header>
          {tasks
            .filter((t) => t.status === column.key)
            .map((task) => (
              <article
                key={task.id}
                className="task-card"
                draggable={!disabled}
                onDragStart={() => setDragging(task.id)}
                onDragEnd={() => setDragging(null)}
              >
                <h3 className="task-title">{task.title}</h3>
                {task.description ? <p className="task-desc">{task.description}</p> : null}
                <div className="task-meta">
                  <span className={`chip chip-${task.priority}`}>{priorityLabel(task.priority)}</span>
                  {task.labels.map((label) => (
                    <span key={label} className="chip">{label}</span>
                  ))}
                </div>
                <div className="task-actions">
                  {COLUMNS.filter((c) => c.key !== task.status).map((c) => (
                    <button key={c.key} type="button" className="ghost" onClick={() => move(task.id, c.key)}>
                      移到{statusLabel(c.key)}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          {tasks.filter((t) => t.status === column.key).length === 0 ? (
            <p className="empty">暂无任务</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
