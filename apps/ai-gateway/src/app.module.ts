import { Module } from '@nestjs/common';
import type { LlmProvider } from '@morningstar/contracts';
import { ChatController } from './chat/chat.controller';
import { ChatService } from './chat/chat.service';
import { HealthController } from './health/health.controller';
import { LLM_PROVIDER, createLlmProvider } from './providers/llm.provider';

@Module({
  controllers: [HealthController, ChatController],
  providers: [
    ChatService,
    { provide: LLM_PROVIDER, useFactory: (): LlmProvider => createLlmProvider() },
  ],
})
export class AppModule {}
