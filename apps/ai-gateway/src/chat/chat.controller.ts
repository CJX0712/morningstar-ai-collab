import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import type { ChatRequest, ChatResponse, Envelope } from '@morningstar/contracts';
import { ChatService } from './chat.service';

@Controller('api/v1')
export class ChatController {
  constructor(private readonly service: ChatService) {}

  @Post('chat')
  async chat(@Body() body: ChatRequest): Promise<Envelope<ChatResponse>> {
    return this.service.chat(body ?? ({} as ChatRequest));
  }

  @Get('models')
  models(): Envelope<{ provider: string; model: string }> {
    return {
      code: 0,
      message: 'ok',
      data: {
        provider: process.env.LLM_PROVIDER ?? 'mock',
        model: process.env.LLM_MODEL ?? 'morningstar-mock-1',
      },
    };
  }

  /** SSE 流式：先产出完整结果再分帧下发；真实 provider 可替换为增量 token */
  @Post('chat/stream')
  async stream(@Body() body: ChatRequest, @Res() reply: FastifyReply): Promise<void> {
    reply.header('Content-Type', 'text/event-stream; charset=utf-8');
    reply.header('Cache-Control', 'no-cache');
    reply.header('Connection', 'keep-alive');

    const result = await this.service.chat(body ?? ({} as ChatRequest));
    const payload = result.code === 0 ? result.data.content : `错误：${result.message}`;
    for (const ch of Array.from(payload)) {
      reply.raw.write(`data: ${JSON.stringify({ delta: ch, done: false })}\n\n`);
    }
    reply.raw.write(`data: ${JSON.stringify({ delta: '', done: true })}\n\n`);
    reply.raw.end();
  }
}
