import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemoryCollabRepository } from '../storage/collab.store';
import { WorkspaceService } from '../workspace/workspace.service';
import { ProjectService } from '../project/project.service';
import { TaskService } from './task.service';

test('collab-core: 建工作区 -> 建项目 -> 建任务 -> 状态流转', () => {
  const repo = new InMemoryCollabRepository();
  const workspaces = new WorkspaceService(repo);
  const projects = new ProjectService(repo);
  const tasks = new TaskService(repo);

  const ws = workspaces.create('晨星研发空间');
  assert.equal(ws.data.name, '晨星研发空间');
  assert.ok(ws.data.id.length > 0);

  const project = projects.create({ workspaceId: ws.data.id, name: '看板重构', key: 'BD' });
  assert.equal(project.code, 0);
  assert.equal(project.data.key, 'BD');

  const created = tasks.create({
    projectId: project.data.id,
    title: '修复登录 500 报错',
    priority: 'high',
    labels: ['bug'],
  });
  assert.equal(created.code, 0);
  assert.equal(created.data.status, 'backlog');
  assert.equal(created.data.priority, 'high');

  const moved = tasks.update(created.data.id, { status: 'in_progress' });
  assert.equal(moved.code, 0);
  assert.equal(moved.data.status, 'in_progress');

  const listed = tasks.list({ projectId: project.data.id });
  assert.equal(listed.data.length, 1);
});

test('collab-core: 参数校验与错误码', () => {
  const repo = new InMemoryCollabRepository();
  const workspaces = new WorkspaceService(repo);
  const projects = new ProjectService(repo);
  const tasks = new TaskService(repo);

  assert.equal(workspaces.create('  ').code, 1001);
  assert.equal(projects.create({ workspaceId: 'x' }).code, 1002);
  assert.equal(tasks.create({ projectId: 'missing', title: '孤儿任务' }).code, 1004);

  const ws = workspaces.create('ws').data;
  const project = projects.create({ workspaceId: ws.id, name: 'p', key: 'P' }).data;
  const task = tasks.create({ projectId: project.id, title: 't' }).data;
  assert.equal(tasks.update(task.id, { status: 'nope' as never }).code, 1006);
  assert.equal(tasks.find('missing').code, 1005);
});
