import { Inject, Injectable } from '@nestjs/common';
import {
  ERR,
  fail,
  ok,
  type BreakdownRequest,
  type BreakdownResult,
  type CodeReviewRequest,
  type CodeReviewResult,
  type Envelope,
} from '@morningstar/contracts';
import { ANALYZER, LocalAnalyzer, type Analyzer } from '../ports/analyzer';

@Injectable()
export class AssistantService {
  constructor(@Inject(ANALYZER) private readonly analyzer: Analyzer) {}

  async breakdown(taskId: string, input: BreakdownRequest): Promise<Envelope<BreakdownResult>> {
    if (!taskId || !input?.title) {
      return fail(ERR.CODE + 1, 'taskId 与 title 为必填');
    }
    try {
      return ok(await this.analyzer.breakdown({
        taskId,
        title: input.title,
        description: input.description,
        maxSubTasks: input.maxSubTasks,
      }));
    } catch (error) {
      const fallback = await new LocalAnalyzer().breakdown({
        taskId,
        title: input.title,
        description: input.description,
        maxSubTasks: input.maxSubTasks,
      });
      void error;
      return ok(fallback);
    }
  }

  async review(input: CodeReviewRequest): Promise<Envelope<CodeReviewResult>> {
    if (!input?.code) {
      return fail(ERR.CODE + 2, 'code 为必填');
    }
    try {
      return ok(await this.analyzer.review({
        code: input.code,
        language: input.language,
        context: input.context,
      }));
    } catch (error) {
      const fallback = await new LocalAnalyzer().review({
        code: input.code,
        language: input.language,
        context: input.context,
      });
      void error;
      return ok(fallback);
    }
  }
}
