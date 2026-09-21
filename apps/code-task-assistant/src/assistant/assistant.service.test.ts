import assert from 'node:assert/strict';
import test from 'node:test';
import { AssistantService } from './assistant.service';
import { LocalAnalyzer } from '../ports/analyzer';

test('code-task-assistant: 任务拆解数量受 maxSubTasks 约束', async () => {
  const service = new AssistantService(new LocalAnalyzer());
  const res = await service.breakdown('task-1', { taskId: 'task-1', title: '接入向量检索', maxSubTasks: 2 });
  assert.equal(res.code, 0);
  assert.equal(res.data.subTasks.length, 2);
  assert.match(res.data.subTasks[0].title, /接入向量检索/);
});

test('code-task-assistant: 代码审查能识别高危写法与调试日志', async () => {
  const service = new AssistantService(new LocalAnalyzer());
  const code = [
    'function render(input) {',
    '  console.log(input);',
    '  el.innerHTML = input;',
    '  if (input == null) return;',
    '}',
  ].join('\n');
  const res = await service.review({ code, language: 'javascript' });
  assert.equal(res.code, 0);
  assert.ok(res.data.issues.length >= 3);
  assert.ok(res.data.issues.some((i) => i.severity === 'error'));
  assert.ok(res.data.summary.includes('行'));
});

test('code-task-assistant: 干净代码不误报', async () => {
  const service = new AssistantService(new LocalAnalyzer());
  const res = await service.review({ code: 'const total = items.reduce((a, b) => a + b, 0);' });
  assert.equal(res.code, 0);
  assert.equal(res.data.issues.length, 0);
});

test('code-task-assistant: 参数缺失返回代码助手段错误码', async () => {
  const service = new AssistantService(new LocalAnalyzer());
  assert.equal((await service.breakdown('', { taskId: '', title: 'x' })).code, 5001);
  assert.equal((await service.review({ code: '' })).code, 5002);
});
