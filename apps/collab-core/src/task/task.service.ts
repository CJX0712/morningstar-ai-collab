import { Inject, Injectable } from '@nestjs/common';
import {
  ERR,
  fail,
  ok,
  type CreateTaskRequest,
  type Envelope,
  type Task,
  type TaskStatus,
  type UpdateTaskRequest,
} from '@morningstar/contracts';
import { COLLAB_REPOSITORY, type CollabRepository } from '../storage/collab.store';

const VALID_STATUS: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'done', 'cancelled'];

@Injectable()
export class TaskService {
  constructor(@Inject(COLLAB_REPOSITORY) private readonly repo: CollabRepository) {}

  create(input: CreateTaskRequest): Envelope<Task> {
    if (!input?.projectId || !input?.title) {
      return fail(ERR.BUSINESS + 3, 'projectId 与 title 为必填');
    }
    if (!this.repo.findProject(input.projectId)) {
      return fail(ERR.BUSINESS + 4, `项目不存在：${input.projectId}`);
    }
    return ok(this.repo.createTask({
      projectId: input.projectId,
      title: input.title,
      description: input.description,
      priority: input.priority,
      assigneeId: input.assigneeId,
      labels: input.labels,
    }));
  }

  list(filter: { projectId?: string; status?: TaskStatus }): Envelope<Task[]> {
    return ok(this.repo.listTasks(filter));
  }

  find(id: string): Envelope<Task> {
    const row = this.repo.findTask(id);
    return row ? ok(row) : fail(ERR.BUSINESS + 5, `任务不存在：${id}`);
  }

  update(id: string, patch: UpdateTaskRequest): Envelope<Task> {
    if (patch.status && !VALID_STATUS.includes(patch.status)) {
      return fail(ERR.BUSINESS + 6, `非法状态值：${patch.status}`);
    }
    const row = this.repo.updateTask(id, patch);
    return row ? ok(row) : fail(ERR.BUSINESS + 5, `任务不存在：${id}`);
  }

  remove(id: string): Envelope<{ id: string; deleted: boolean }> {
    return ok({ id, deleted: this.repo.deleteTask(id) });
  }
}
