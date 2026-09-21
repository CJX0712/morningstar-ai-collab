import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type {
  BreakdownRequest,
  BreakdownResult,
  CodeReviewRequest,
  CodeReviewResult,
  Envelope,
} from '@morningstar/contracts';
import { AssistantService } from './assistant.service';

@Controller('api/v1')
export class AssistantController {
  constructor(private readonly service: AssistantService) {}

  @Post('tasks/:id/breakdown')
  async breakdown(
    @Param('id') id: string,
    @Body() body: BreakdownRequest,
  ): Promise<Envelope<BreakdownResult>> {
    return this.service.breakdown(id, body ?? ({} as BreakdownRequest));
  }

  @Post('code/review')
  async review(@Body() body: CodeReviewRequest): Promise<Envelope<CodeReviewResult>> {
    return this.service.review(body ?? ({} as CodeReviewRequest));
  }

  @Get('analyzer')
  analyzer(): Envelope<{ analyzer: string }> {
    return { code: 0, message: 'ok', data: { analyzer: process.env.AI_GATEWAY_URL ? 'remote' : 'local' } };
  }
}
