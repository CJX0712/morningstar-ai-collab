import assert from 'node:assert/strict';
import test from 'node:test';
import type { Envelope, ChatResponse } from '@morningstar/contracts';
import { ChatService } from './chat.service';
import { MockLlmProvider, createLlmProvider } from '../providers/llm.provider';

test('ai-gateway: MockProvider 返回确定性内容', async () => {
  const service = new ChatService(new MockLlmProvider());
  const res: Envelope<ChatResponse> = await service.chat({
    messages: [{ role: 'user', content: '帮我建一个登录页任务' }],
  });
  assert.equal(res.code, 0);
  assert.match(res.data.content, /登录页任务/);
  assert.equal(res.data.finishReason, 'stop');
});

test('ai-gateway: messages 为空时返回业务错误码', async () => {
  const service = new ChatService(new MockLlmProvider());
  const res = await service.chat({ messages: [] });
  assert.equal(res.code, 2001);
});

test('ai-gateway: 未知 provider 回落到 mock，保证离线可用', () => {
  process.env.LLM_PROVIDER = 'not-exist';
  const provider = createLlmProvider();
  assert.equal(provider.name, 'mock');
  delete process.env.LLM_PROVIDER;
});

test('ai-gateway: provider 抛错被兜底成错误码而非崩溃', async () => {
  const broken = {
    name: 'broken',
    complete: async (): Promise<string> => {
      throw new Error('LLM 调用失败：HTTP 500');
    },
  };
  const service = new ChatService(broken);
  const res = await service.chat({ messages: [{ role: 'user', content: 'hi' }] });
  assert.equal(res.code, 2002);
  assert.match(res.message, /HTTP 500/);
});
