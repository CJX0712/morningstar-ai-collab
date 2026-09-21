import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  ERR,
  fail,
  ok,
  type Envelope,
  type MeetingStage,
  type MeetingStatus,
  type MeetingSubmitRequest,
  type Task,
} from '@morningstar/contracts';
import { SUMMARIZER, LocalSummarizer, type Summarizer } from '../ports/summarizer';

interface MeetingRecord extends MeetingStatus {}

function toTaskBody(title: string, projectId: string, assignee?: string) {
  return {
    projectId,
    title,
    description: `由会议行动项自动生成：${title}`,
    labels: ['meeting'],
    assigneeId: assignee,
    priority: 'medium' as const,
  };
}

@Injectable()
export class MeetingService {
  private readonly meetings = new Map<string, MeetingRecord>();

  constructor(@Inject(SUMMARIZER) private readonly summarizer: Summarizer) {}

  async submit(input: MeetingSubmitRequest): Promise<Envelope<MeetingStatus>> {
    if (!input?.workspaceId || !input?.title || !input?.transcript) {
      return fail(ERR.MEETING + 1, 'workspaceId、title、transcript 均为必填');
    }
    const id = randomUUID();
    const record: MeetingRecord = { id, title: input.title, stage: 'summarizing' };
    this.meetings.set(id, record);

    try {
      const digest = await this.summarizer.summarize(input.transcript, input.language);
      const done: MeetingRecord = { ...record, stage: 'done', ...digest };
      this.meetings.set(id, done);
      return ok(done);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const fallback = await new LocalSummarizer().summarize(input.transcript, input.language);
      const degraded: MeetingRecord = { ...record, stage: 'done', ...fallback, error: `远端总结失败已降级：${reason}` };
      this.meetings.set(id, degraded);
      return ok(degraded);
    }
  }

  find(id: string): Envelope<MeetingStatus> {
    const row = this.meetings.get(id);
    return row ? ok(row) : fail(ERR.MEETING + 2, `会议不存在：${id}`);
  }

  /** 行动项一键转任务卡：调用 collab-core；未配置时返回空数组并说明原因 */
  async toTasks(id: string, projectId: string): Promise<Envelope<Task[]>> {
    const row = this.meetings.get(id);
    if (!row) return fail(ERR.MEETING + 2, `会议不存在：${id}`);
    if (!row.actionItems || row.actionItems.length === 0) {
      return fail(ERR.MEETING + 3, '该会议没有可转换的行动项');
    }
    if (!projectId) return fail(ERR.MEETING + 4, 'projectId 为必填');

    const base = process.env.COLLAB_CORE_URL;
    if (!base) {
      return fail(ERR.MEETING + 5, '未配置 COLLAB_CORE_URL，无法创建任务');
    }

    const created: Task[] = [];
    for (const item of row.actionItems) {
      const res = await fetch(`${base.replace(/\/$/, '')}/api/v1/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toTaskBody(item.title, projectId, item.assignee)),
      });
      if (!res.ok) continue;
      const json = (await res.json()) as { code: number; data?: Task };
      if (json.code === 0 && json.data) created.push(json.data);
    }
    return ok(created);
  }

  stage(id: string): MeetingStage | undefined {
    return this.meetings.get(id)?.stage;
  }
}
