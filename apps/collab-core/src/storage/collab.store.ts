import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Project, Task, TaskPriority, TaskStatus, Workspace } from '@morningstar/contracts';

/** 注入令牌：运行时决定用内存实现还是 Postgres 实现 */
export const COLLAB_REPOSITORY = 'COLLAB_REPOSITORY';

export interface CreateTaskInput {
  projectId: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  assigneeId?: string;
  labels?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  labels?: string[];
}

/** 仓储协议：业务逻辑只依赖协议，便于替换实现与注入测试替身 */
export interface CollabRepository {
  createWorkspace(name: string): Workspace;
  listWorkspaces(): Workspace[];
  createProject(input: { workspaceId: string; name: string; key: string }): Project;
  listProjects(workspaceId?: string): Project[];
  findProject(id: string): Project | undefined;
  createTask(input: CreateTaskInput): Task;
  listTasks(filter: { projectId?: string; status?: TaskStatus }): Task[];
  findTask(id: string): Task | undefined;
  updateTask(id: string, patch: UpdateTaskInput): Task | undefined;
  deleteTask(id: string): boolean;
}

/** 默认实现：进程内存储，零依赖，保证离线可验证 */
@Injectable()
export class InMemoryCollabRepository implements CollabRepository {
  private readonly workspaces = new Map<string, Workspace>();
  private readonly projects = new Map<string, Project>();
  private readonly tasks = new Map<string, Task>();

  createWorkspace(name: string): Workspace {
    const row: Workspace = { id: randomUUID(), name, createdAt: new Date().toISOString() };
    this.workspaces.set(row.id, row);
    return row;
  }

  listWorkspaces(): Workspace[] {
    return [...this.workspaces.values()];
  }

  createProject(input: { workspaceId: string; name: string; key: string }): Project {
    const row: Project = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      name: input.name,
      key: input.key,
      createdAt: new Date().toISOString(),
    };
    this.projects.set(row.id, row);
    return row;
  }

  listProjects(workspaceId?: string): Project[] {
    const all = [...this.projects.values()];
    return workspaceId ? all.filter((p) => p.workspaceId === workspaceId) : all;
  }

  findProject(id: string): Project | undefined {
    return this.projects.get(id);
  }

  createTask(input: CreateTaskInput): Task {
    const now = new Date().toISOString();
    const row: Task = {
      id: randomUUID(),
      projectId: input.projectId,
      title: input.title,
      description: input.description,
      status: 'backlog',
      priority: input.priority ?? 'medium',
      assigneeId: input.assigneeId,
      labels: input.labels ?? [],
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(row.id, row);
    return row;
  }

  listTasks(filter: { projectId?: string; status?: TaskStatus }): Task[] {
    return [...this.tasks.values()].filter((t) => {
      const hitProject = !filter.projectId || t.projectId === filter.projectId;
      const hitStatus = !filter.status || t.status === filter.status;
      return hitProject && hitStatus;
    });
  }

  findTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  updateTask(id: string, patch: UpdateTaskInput): Task | undefined {
    const current = this.tasks.get(id);
    if (!current) return undefined;
    const next: Task = { ...current, ...patch, id: current.id, updatedAt: new Date().toISOString() };
    this.tasks.set(id, next);
    return next;
  }

  deleteTask(id: string): boolean {
    return this.tasks.delete(id);
  }
}
