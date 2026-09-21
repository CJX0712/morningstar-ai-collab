import { Inject, Injectable } from '@nestjs/common';
import { ERR, fail, ok, type ChatRequest, type ChatResponse, type Citation, type Envelope, type LlmProvider } from '@morningstar/contracts';
import { LLM_PROVIDER } from '../providers/llm.provider';

/** RAG 可选增强：配置了 rag-service 才启用，失败时静默降级，保证离线可用 */
async function retrieveCitations(collection: string, query: string): Promise<Citation[]> {
  const base = process.env.RAG_SERVICE_URL;
  if (!base) return [];
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/api/v1/retrieve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collection, query, topK: 3 }),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { code: number; data?: { hits?: Citation[] } };
    return json.data?.hits ?? [];
  } catch {
    return [];
  }
}

@Injectable()
export class ChatService {
  constructor(@Inject(LLM_PROVIDER) private readonly provider: LlmProvider) {}

  async chat(input: ChatRequest): Promise<Envelope<ChatResponse>> {
    if (!input?.messages || input.messages.length === 0) {
      return fail(ERR.AI_GATEWAY + 1, 'messages 不能为空');
    }
    let messages = input.messages;
    let citations: Citation[] = [];

    if (input.useRag) {
      const lastUser = [...input.messages].reverse().find((m) => m.role === 'user');
      const query = lastUser?.content ?? '';
      citations = await retrieveCitations(input.collection ?? 'default', query);
      if (citations.length > 0) {
        const context = citations.map((c, i) => `[${i + 1}] ${c.text}`).join('\n');
        messages = [
          { role: 'system', content: `请仅依据以下资料回答，并标注引用编号：\n${context}` },
          ...input.messages,
        ];
      }
    }

    const model = input.model ?? process.env.LLM_MODEL ?? 'morningstar-mock-1';
    try {
      const content = await this.provider.complete(messages, model);
      return ok({ content, model, finishReason: 'stop', citations });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      return fail(ERR.AI_GATEWAY + 2, `模型调用失败：${reason}`);
    }
  }
}
