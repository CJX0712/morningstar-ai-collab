import { Controller, Get } from '@nestjs/common';
import { ok, type Envelope } from '@morningstar/contracts';

@Controller()
export class HealthController {
  @Get('health')
  health(): Envelope<{ service: string; status: string; time: string }> {
    return ok({
      service: 'collab-core',
      status: 'up',
      time: new Date().toISOString(),
    });
  }
}
