import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type {
  Envelope,
  MeetingStatus,
  MeetingSubmitRequest,
  Task,
} from '@morningstar/contracts';
import { MeetingService } from './meeting.service';

@Controller('api/v1/meetings')
export class MeetingController {
  constructor(private readonly service: MeetingService) {}

  @Post()
  async submit(@Body() body: MeetingSubmitRequest): Promise<Envelope<MeetingStatus>> {
    return this.service.submit(body ?? ({} as MeetingSubmitRequest));
  }

  @Get(':id')
  find(@Param('id') id: string): Envelope<MeetingStatus> {
    return this.service.find(id);
  }

  @Post(':id/action-items/to-tasks')
  async toTasks(
    @Param('id') id: string,
    @Body() body: { projectId?: string },
  ): Promise<Envelope<Task[]>> {
    return this.service.toTasks(id, String(body?.projectId ?? ''));
  }
}
