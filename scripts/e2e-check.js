#!/usr/bin/env node
/**
 * 端到端链路自检：自行拉起 5 个服务 -> 跑通核心成功流与关键错误流 -> 关闭进程。
 *
 * 用法：node scripts/e2e-check.js
 * 退出码：0 = 全链路通过；1 = 有失败
 *
 * 设计要点：不依赖 curl / docker / 外部数据库 / API Key，纯 Node 实现，
 * 因此可以在任何装了 Node >= 22 的干净环境里一键验证系统是真的能跑。
 *
 * 作者：晨星
 */

const { spawn } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const HOST = '127.0.0.1';

const SERVICES = [
  { name: 'collab-core', entry: 'apps/collab-core/dist/main.js', port: 3001, env: {} },
  { name: 'ai-gateway', entry: 'apps/ai-gateway/dist/main.js', port: 3002, env: {} },
  { name: 'rag-service', entry: 'apps/rag-service/dist/main.js', port: 3003, env: {} },
  {
    name: 'meeting-summary',
    entry: 'apps/meeting-summary/dist/main.js',
    port: 3004,
    // 配置协作核心地址，让"行动项转任务卡"走真实跨服务调用
    env: { COLLAB_CORE_URL: `http://${HOST}:3001` },
  },
  { name: 'code-task-assistant', entry: 'apps/code-task-assistant/dist/main.js', port: 3005, env: {} },
];

const children = [];
const failures = [];
let passed = 0;

function check(label, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${label}`);
  } else {
    failures.push(`${label} :: ${detail ?? '断言失败'}`);
    console.log(`  FAIL ${label} :: ${detail ?? '断言失败'}`);
  }
}

async function waitForHealth(port, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://${HOST}:${port}/health`);
      if (res.ok) {
        const json = await res.json();
        if (json && json.code === 0) return true;
      }
    } catch {
      // 服务还没起来，继续等
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

async function post(port, urlPath, body) {
  const res = await fetch(`http://${HOST}:${port}${urlPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function get(port, urlPath) {
  const res = await fetch(`http://${HOST}:${port}${urlPath}`);
  return res.json();
}

async function main() {
  console.log('[e2e] 启动 5 个服务...');
  for (const svc of SERVICES) {
    const child = spawn(process.execPath, [svc.entry], {
      cwd: ROOT,
      env: { ...process.env, PORT: String(svc.port), NODE_ENV: 'production', ...svc.env },
      stdio: 'ignore',
    });
    children.push(child);
  }

  console.log('[e2e] 等待健康检查...');
  for (const svc of SERVICES) {
    const ok = await waitForHealth(svc.port);
    if (!ok) {
      failures.push(`服务 ${svc.name} 健康检查超时`);
      console.log(`  FAIL ${svc.name} 健康检查超时`);
    } else {
      passed += 1;
      console.log(`  ok   ${svc.name} health (${svc.port})`);
    }
  }
  if (failures.length > 0) return;

  console.log('\n[e2e] 协作核心：工作区 -> 项目 -> 任务 -> 状态流转');
  const ws = await post(3001, '/api/v1/workspaces', { name: '晨星研发空间' });
  check('创建工作区 code=0', ws.code === 0 && Boolean(ws.data?.id), JSON.stringify(ws));
  const workspaceId = ws.data?.id;

  const badWs = await post(3001, '/api/v1/workspaces', { name: '   ' });
  check('空名称返回 1001', badWs.code === 1001, JSON.stringify(badWs));

  const proj = await post(3001, '/api/v1/projects', { workspaceId, name: '看板重构', key: 'BD' });
  check('创建项目 code=0', proj.code === 0 && Boolean(proj.data?.id), JSON.stringify(proj));
  const projectId = proj.data?.id;

  const task = await post(3001, '/api/v1/tasks', {
    projectId,
    title: '修复登录接口 500 报错',
    description: 'token 过期时网关返回了 500',
    priority: 'urgent',
    labels: ['bug', 'auth'],
  });
  check('创建任务 code=0 且默认 backlog', task.code === 0 && task.data?.status === 'backlog', JSON.stringify(task));
  const taskId = task.data?.id;

  const orphan = await post(3001, '/api/v1/tasks', { projectId: 'not-exist', title: '孤儿任务' });
  check('项目不存在返回 1004', orphan.code === 1004, JSON.stringify(orphan));

  const moved = await fetch(`http://${HOST}:3001/api/v1/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'in_progress' }),
  }).then((r) => r.json());
  check('状态流转到 in_progress', moved.code === 0 && moved.data?.status === 'in_progress', JSON.stringify(moved));

  const badStatus = await fetch(`http://${HOST}:3001/api/v1/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'nope' }),
  }).then((r) => r.json());
  check('非法状态返回 1006', badStatus.code === 1006, JSON.stringify(badStatus));

  console.log('\n[e2e] AI 网关：对话');
  const chat = await post(3002, '/api/v1/chat', {
    messages: [{ role: 'user', content: '帮我建一个登录页任务' }],
    stream: false,
  });
  check('对话返回 code=0 且含内容', chat.code === 0 && typeof chat.data?.content === 'string', JSON.stringify(chat));
  const emptyChat = await post(3002, '/api/v1/chat', { messages: [] });
  check('空 messages 返回 2001', emptyChat.code === 2001, JSON.stringify(emptyChat));

  console.log('\n[e2e] RAG：灌入 -> 检索（必须带来源）');
  // 文档长度需超过 CHUNK_SIZE(800) 才会走多分块路径
  const doc = '晨星平台采用开源自托管模式，编排文件在仓库根目录。退款周期为 30 天，企业版按席位收费。'.repeat(20);
  const ingest = await post(3003, '/api/v1/ingest', {
    collection: 'handbook',
    docId: 'handbook.md',
    text: doc,
    metadata: { source: 'handbook.md' },
  });
  check('灌入 code=0 且分块数>1', ingest.code === 0 && ingest.data?.chunks > 1, JSON.stringify(ingest));

  const retrieve = await post(3003, '/api/v1/retrieve', { collection: 'handbook', query: '退款周期', topK: 3 });
  const hits = retrieve.data?.hits ?? [];
  check('检索命中且得分>0', retrieve.code === 0 && hits.length > 0 && hits[0].score > 0, JSON.stringify(retrieve));
  check('检索结果带来源', hits.length > 0 && hits[0].source === 'handbook.md', JSON.stringify(hits[0]));

  const emptyDoc = await post(3003, '/api/v1/ingest', { collection: 'c', docId: 'd', text: '   ' });
  check('空文档返回 3002', emptyDoc.code === 3002, JSON.stringify(emptyDoc));

  console.log('\n[e2e] 会议纪要：转写 -> 摘要/决策/行动项 -> 转任务卡');
  const meeting = await post(3004, '/api/v1/meetings', {
    workspaceId,
    title: 'v3.2 重构周会',
    transcript: [
      '今天讨论 v3.2 组件重构的排期。',
      '我们决定采用 Teal 作为品牌强调色。',
      '张伟负责完成登录页的联调工作，下周提交。',
      '李娜跟进向量库检索的压测报告。',
    ].join('\n'),
    language: 'zh-CN',
  });
  check('纪要 code=0 且 stage=done', meeting.code === 0 && meeting.data?.stage === 'done', JSON.stringify(meeting));
  check('识别出决策', Array.isArray(meeting.data?.decisions) && meeting.data.decisions.length > 0, JSON.stringify(meeting.data?.decisions));
  check('行动项带责任人张伟', (meeting.data?.actionItems ?? []).some((a) => a.assignee === '张伟'), JSON.stringify(meeting.data?.actionItems));
  const meetingId = meeting.data?.id;

  const fetched = await get(3004, `/api/v1/meetings/${meetingId}`);
  check('可按 id 回查纪要', fetched.code === 0 && fetched.data?.title === 'v3.2 重构周会', JSON.stringify(fetched));

  const converted = await post(3004, `/api/v1/meetings/${meetingId}/action-items/to-tasks`, { projectId });
  check('行动项转成任务卡（跨服务调用）', converted.code === 0 && Array.isArray(converted.data) && converted.data.length > 0, JSON.stringify(converted));
  check('生成的任务属于本项目', (converted.data ?? []).every((t) => t.projectId === projectId), JSON.stringify(converted.data?.[0]));

  console.log('\n[e2e] 代码/任务助手：拆解与审查');
  const breakdown = await post(3005, `/api/v1/tasks/${taskId}/breakdown`, {
    taskId,
    title: '修复登录接口 500 报错',
    maxSubTasks: 3,
  });
  check('任务拆解数量受约束', breakdown.code === 0 && breakdown.data?.subTasks?.length === 3, JSON.stringify(breakdown));

  const review = await post(3005, '/api/v1/code/review', {
    code: 'function render(input){ console.log(input); el.innerHTML = input; }',
    language: 'javascript',
  });
  check('代码审查识别高危写法', review.code === 0 && review.data?.issues?.some((i) => i.severity === 'error'), JSON.stringify(review));

  const noCode = await post(3005, '/api/v1/code/review', { code: '' });
  check('空代码返回 5002', noCode.code === 5002, JSON.stringify(noCode));
}

function shutdown() {
  for (const child of children) {
    try {
      child.kill();
    } catch {
      // 进程可能已退出
    }
  }
}

main()
  .catch((error) => {
    failures.push(`未捕获异常：${error instanceof Error ? error.stack : String(error)}`);
  })
  .finally(() => {
    shutdown();
    console.log('\n[e2e] 结果');
    console.log(`  通过：${passed}`);
    console.log(`  失败：${failures.length}`);
    if (failures.length > 0) {
      console.log('  失败明细：');
      for (const f of failures) console.log(`    - ${f}`);
    }
    process.exit(failures.length === 0 ? 0 : 1);
  });
