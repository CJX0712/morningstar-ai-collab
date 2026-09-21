import { Controller, Get } from '@nestjs/common';
import { ok, type Envelope } from '@morningstar/contracts';

@Controller()
export class HealthController {
  @Get('health')
  health(): Envelope<{ service: string; status: string; time: string }> {
    return ok({ service: 'code-task-assistant', status: 'up', time: new Date().toISOString() });
  }
}
