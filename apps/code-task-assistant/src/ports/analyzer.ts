import type { BreakdownResult, CodeReviewResult } from '@morningstar/contracts';

export const ANALYZER = 'ANALYZER';

export interface Analyzer {
  readonly name: string;
  breakdown(input: { taskId: string; title: string; description?: string; maxSubTasks?: number }): Promise<BreakdownResult>;
  review(input: { code: string; language?: string; context?: string }): Promise<CodeReviewResult>;
}

const PHASES = [
  { suffix: '现状梳理与方案确认', detail: '梳理现状、确认边界与验收口径，输出方案要点。' },
  { suffix: '核心实现', detail: '按方案完成主链路编码，覆盖正常路径。' },
  { suffix: '异常与边界处理', detail: '补齐参数校验、错误处理与降级路径。' },
  { suffix: '测试与联调', detail: '补单元测试并完成跨模块联调。' },
  { suffix: '文档与交付', detail: '补充使用说明与部署注意事项，提交评审。' },
];

/** 默认实现：本地启发式，确定性、离线可用 */
export class LocalAnalyzer implements Analyzer {
  readonly name = 'local';

  async breakdown(input: {
    taskId: string;
    title: string;
    description?: string;
    maxSubTasks?: number;
  }): Promise<BreakdownResult> {
    const limit = Math.max(1, Math.min(input.maxSubTasks ?? 4, PHASES.length));
    return {
      taskId: input.taskId,
      subTasks: PHASES.slice(0, limit).map((phase) => ({
        title: `${input.title} · ${phase.suffix}`,
        description: phase.detail,
        estimate: '0.5d',
      })),
    };
  }

  async review(input: { code: string; language?: string; context?: string }): Promise<CodeReviewResult> {
    const issues: CodeReviewResult['issues'] = [];
    const lines = input.code.split(/\r?\n/);

    lines.forEach((raw, index) => {
      if (raw.includes('TODO') || raw.includes('FIXME')) {
        issues.push({ severity: 'warn', line: index + 1, message: '存在待办标记，交付前需清理。', suggestion: '替换为具体实现或登记为独立任务。' });
      }
      if (/\bconsole\.log\s*\(/.test(raw)) {
        issues.push({ severity: 'warn', line: index + 1, message: '存在调试日志输出。', suggestion: '改用项目统一日志组件或删除。' });
      }
      if (/\beval\s*\(|innerHTML\s*=/.test(raw)) {
        issues.push({ severity: 'error', line: index + 1, message: '发现高危写法，存在注入风险。', suggestion: '改用安全 API 并对输入做转义校验。' });
      }
      if (/==(?!=)/.test(raw) && !raw.includes('===')) {
        issues.push({ severity: 'info', line: index + 1, message: '使用了宽松相等比较。', suggestion: '统一改为严格相等 === 。' });
      }
    });

    return {
      summary: issues.length === 0
        ? `未发现明显问题，共审查 ${lines.length} 行${input.language ? `（${input.language}）` : ''}。`
        : `共审查 ${lines.length} 行，发现 ${issues.length} 处待改进点。`,
      issues,
    };
  }
}

/** 远端实现：调用 ai-gateway 获取 JSON 结果 */
export class RemoteAnalyzer implements Analyzer {
  readonly name = 'remote';

  constructor(private readonly baseUrl: string = process.env.AI_GATEWAY_URL ?? 'http://127.0.0.1:3002') {}

  private async ask(prompt: string): Promise<string> {
    const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/api/v1/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], stream: false }),
    });
    if (!res.ok) throw new Error(`AI 网关调用失败：HTTP ${res.status}`);
    const json = (await res.json()) as { code: number; data?: { content?: string }; message?: string };
    if (json.code !== 0 || typeof json.data?.content !== 'string') {
      throw new Error(`AI 网关返回异常：${json.message ?? '未知错误'}`);
    }
    return json.data.content;
  }

  async breakdown(input: {
    taskId: string;
    title: string;
    description?: string;
    maxSubTasks?: number;
  }): Promise<BreakdownResult> {
    const prompt = [
      `把任务「${input.title}」拆成不超过 ${input.maxSubTasks ?? 4} 个子任务，`,
      '返回 JSON：{"subTasks":[{"title":"","description":"","estimate":""}]}，不要额外解释。',
      input.description ?? '',
    ].join('\n');
    const content = await this.ask(prompt);
    const parsed = JSON.parse(extractJson(content)) as { subTasks?: BreakdownResult['subTasks'] };
    return { taskId: input.taskId, subTasks: parsed.subTasks ?? [] };
  }

  async review(input: { code: string; language?: string; context?: string }): Promise<CodeReviewResult> {
    const prompt = [
      '审查以下代码，返回 JSON：{"summary":"","issues":[{"severity":"info|warn|error","line":0,"message":"","suggestion":""}]}',
      `语言：${input.language ?? 'auto'}`,
      input.context ?? '',
      input.code,
    ].join('\n');
    const content = await this.ask(prompt);
    const parsed = JSON.parse(extractJson(content)) as CodeReviewResult;
    return { summary: parsed.summary ?? '', issues: parsed.issues ?? [] };
  }
}

export function extractJson(content: string): string {
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start < 0 || end < 0) throw new Error('模型未返回可解析的 JSON');
  return content.slice(start, end + 1);
}

export function createAnalyzer(): Analyzer {
  return process.env.AI_GATEWAY_URL ? new RemoteAnalyzer() : new LocalAnalyzer();
}
