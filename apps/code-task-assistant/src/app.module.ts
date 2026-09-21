import { Module } from '@nestjs/common';
import { AssistantController } from './assistant/assistant.controller';
import { AssistantService } from './assistant/assistant.service';
import { HealthController } from './health/health.controller';
import { ANALYZER, createAnalyzer, type Analyzer } from './ports/analyzer';

@Module({
  controllers: [HealthController, AssistantController],
  providers: [AssistantService, { provide: ANALYZER, useFactory: (): Analyzer => createAnalyzer() }],
})
export class AppModule {}
