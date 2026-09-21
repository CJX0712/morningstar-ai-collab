import assert from 'node:assert/strict';
import test from 'node:test';
import { MeetingService } from './meeting.service';
import { LocalSummarizer } from '../ports/summarizer';

const TRANSCRIPT = [
  '今天讨论 v3.2 组件重构的排期。',
  '我们决定采用 Teal 作为品牌强调色，不再使用紫色渐变。',
  '张伟负责完成登录页的联调工作，下周提交。',
  '李娜跟进向量库检索的压测报告。',
  '下一次评审确定在本周五进行。',
].join('\n');

test('meeting-summary: 离线产出摘要、决策与行动项', async () => {
  const service = new MeetingService(new LocalSummarizer());
  const res = await service.submit({
    workspaceId: 'ws-1',
    title: 'v3.2 重构周会',
    transcript: TRANSCRIPT,
  });
  assert.equal(res.code, 0);
  assert.equal(res.data.stage, 'done');
  assert.ok(res.data.summary && res.data.summary.length > 0);
  assert.ok(res.data.decisions?.some((d) => d.includes('Teal')));
  assert.ok(res.data.actionItems && res.data.actionItems.length >= 2);
  assert.equal(res.data.actionItems?.[0].assignee, '张伟');
});

test('meeting-summary: 可按 id 回查状态', async () => {
  const service = new MeetingService(new LocalSummarizer());
  const res = await service.submit({ workspaceId: 'ws-1', title: 't', transcript: TRANSCRIPT });
  const found = service.find(res.data.id);
  assert.equal(found.code, 0);
  assert.equal(found.data.title, 't');
});

test('meeting-summary: 参数缺失与不存在的会议走错误码', async () => {
  const service = new MeetingService(new LocalSummarizer());
  assert.equal((await service.submit({ workspaceId: '', title: 't', transcript: 'x' })).code, 4001);
  assert.equal(service.find('missing').code, 4002);
  assert.equal((await service.toTasks('missing', 'p')).code, 4002);
});

test('meeting-summary: 未配置 collab-core 时明确报错而非静默失败', async () => {
  const previous = process.env.COLLAB_CORE_URL;
  delete process.env.COLLAB_CORE_URL;
  const service = new MeetingService(new LocalSummarizer());
  const res = await service.submit({ workspaceId: 'ws-1', title: 't', transcript: TRANSCRIPT });
  const converted = await service.toTasks(res.data.id, 'project-1');
  assert.equal(converted.code, 4005);
  if (previous) process.env.COLLAB_CORE_URL = previous;
});
