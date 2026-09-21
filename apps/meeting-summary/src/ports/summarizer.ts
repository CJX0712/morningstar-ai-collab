import type { ActionItem } from '@morningstar/contracts';

export const SUMMARIZER = 'SUMMARIZER';

export interface MeetingDigest {
  summary: string;
  decisions: string[];
  actionItems: ActionItem[];
}

export interface Summarizer {
  readonly name: string;
  summarize(transcript: string, language?: string): Promise<MeetingDigest>;
}

const DECISION_HINT = ['决定', '决议', '确定', '通过', '一致同意'];
// 行动项信号要用强动词或明确责任人，避免把「排期/完成」这类名词误判成待办
const ACTION_HINT = ['待办', '待跟进', '认领', '记得', '下周', '明天', '需要对接', '排给'];

function splitSentences(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .split(/[。！？\n!?]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function pickAssignee(sentence: string): string | undefined {
  const match = sentence.match(/([\u4e00-\u9fa5A-Za-z]{2,4})(?:负责|跟进|认领|来跟)/);
  return match?.[1];
}

/** 默认实现：本地确定性抽取，无网络无 Key 也能产出结构化纪要 */
export class LocalSummarizer implements Summarizer {
  readonly name = 'local';

  async summarize(transcript: string, language?: string): Promise<MeetingDigest> {
    // 本地实现不使用 language，显式声明以保持与 Summarizer 协议一致
    void language;
    const sentences = splitSentences(transcript);
    const decisions = sentences.filter((s) => DECISION_HINT.some((h) => s.includes(h)));
    const withAssignee = sentences.map((sentence) => ({ sentence, assignee: pickAssignee(sentence) }));
    // 命中强动词，或能识别出责任人，才判定为行动项
    const actionSentences = withAssignee.filter(
      (row) => ACTION_HINT.some((h) => row.sentence.includes(h)) || row.assignee !== undefined,
    );
    const actionItems: ActionItem[] = actionSentences.map((row) => ({
      title: row.sentence.length > 40 ? `${row.sentence.slice(0, 40)}...` : row.sentence,
      assignee: row.assignee,
    }));
    return {
      summary: sentences.slice(0, 3).join('。') || '本次会议未提供可解析内容。',
      decisions: decisions.length > 0 ? decisions : ['本次会议未记录明确决策。'],
      actionItems,
    };
  }
}

/** 远端实现：调用 ai-gateway，解析其返回的 JSON；失败由上层决定是否降级 */
export class RemoteSummarizer implements Summarizer {
  readonly name = 'remote';

  constructor(private readonly baseUrl: string = process.env.AI_GATEWAY_URL ?? 'http://127.0.0.1:3002') {}

  async summarize(transcript: string, language = 'zh-CN'): Promise<MeetingDigest> {
    const prompt = [
      `请把以下会议记录整理为 JSON，字段为 summary、decisions、actionItems（每项含 title、assignee、due）。使用 ${language}。`,
      '只返回 JSON，不要额外解释。',
      transcript,
    ].join('\n');

    const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/api/v1/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], stream: false }),
    });
    if (!res.ok) throw new Error(`AI 网关调用失败：HTTP ${res.status}`);

    const json = (await res.json()) as { code: number; data?: { content?: string }; message?: string };
    const content = json.data?.content;
    if (json.code !== 0 || typeof content !== 'string') {
      throw new Error(`AI 网关返回异常：${json.message ?? '未知错误'}`);
    }
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start < 0 || end < 0) throw new Error('模型未返回可解析的 JSON');
    const parsed = JSON.parse(content.slice(start, end + 1)) as Partial<MeetingDigest>;
    return {
      summary: parsed.summary ?? '',
      decisions: parsed.decisions ?? [],
      actionItems: parsed.actionItems ?? [],
    };
  }
}

export function createSummarizer(): Summarizer {
  return process.env.AI_GATEWAY_URL ? new RemoteSummarizer() : new LocalSummarizer();
}
