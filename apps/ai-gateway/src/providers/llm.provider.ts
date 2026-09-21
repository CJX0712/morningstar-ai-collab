import type { ChatMessage, LlmProvider } from '@morningstar/contracts';

/** 默认实现：确定性离线回复，保证无网络无 Key 也能跑通全链路 */
export class MockLlmProvider implements LlmProvider {
  readonly name = 'mock';

  async complete(messages: ChatMessage[], model?: string): Promise<string> {
    const last = [...messages].reverse().find((m) => m.role === 'user');
    const question = last?.content ?? '';
    return [
      `[mock:${model ?? 'morningstar-mock-1'}] 已收到你的请求：${question}`,
      '这是一个确定性的离线回复，用于在无网络、无 API Key 的环境验证链路连通性。',
      '要接真实模型，请把 LLM_PROVIDER 设为 ollama 或 openai 并配置对应地址。',
    ].join('\n');
  }
}

interface ChatCompletionsResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

/** OpenAI 兼容端点实现：同时适配 Ollama / vLLM / 云端 OpenAI */
export class OpenAiCompatibleLlmProvider implements LlmProvider {
  constructor(
    readonly name: string,
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly defaultModel: string,
  ) {}

  async complete(messages: ChatMessage[], model?: string): Promise<string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;
    const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model: model ?? this.defaultModel, messages, stream: false }),
    });
    if (!res.ok) {
      throw new Error(`LLM 调用失败：HTTP ${res.status} ${res.statusText}`);
    }
    const json = (await res.json()) as ChatCompletionsResponse;
    const content = json.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      throw new Error('LLM 返回内容格式异常：缺少 choices[0].message.content');
    }
    return content;
  }
}

/** 工厂：按环境变量注入实现，业务层零感知 */
export function createLlmProvider(): LlmProvider {
  const kind = (process.env.LLM_PROVIDER ?? 'mock').toLowerCase();
  const model = process.env.LLM_MODEL ?? 'morningstar-mock-1';

  if (kind === 'ollama') {
    const baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434/v1';
    return new OpenAiCompatibleLlmProvider('ollama', baseUrl, '', model);
  }
  if (kind === 'openai') {
    const baseUrl = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
    return new OpenAiCompatibleLlmProvider('openai', baseUrl, process.env.OPENAI_API_KEY ?? '', model);
  }
  return new MockLlmProvider();
}
/** 注入令牌：定义在 providers 层，避免 service 反向依赖 app.module 造成循环引用 */
export const LLM_PROVIDER = 'LLM_PROVIDER';
