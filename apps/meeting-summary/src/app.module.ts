import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { MeetingController } from './meeting/meeting.controller';
import { MeetingService } from './meeting/meeting.service';
import { SUMMARIZER, createSummarizer, type Summarizer } from './ports/summarizer';

@Module({
  controllers: [HealthController, MeetingController],
  providers: [MeetingService, { provide: SUMMARIZER, useFactory: (): Summarizer => createSummarizer() }],
})
export class AppModule {}
