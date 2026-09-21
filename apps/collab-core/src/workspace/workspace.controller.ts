import { Body, Controller, Get, Post } from '@nestjs/common';
import type { Envelope, Workspace } from '@morningstar/contracts';
import { WorkspaceService } from './workspace.service';

@Controller('api/v1/workspaces')
export class WorkspaceController {
  constructor(private readonly service: WorkspaceService) {}

  @Post()
  create(@Body() body: { name?: string }): Envelope<Workspace> {
    return this.service.create(String(body?.name ?? ''));
  }

  @Get()
  list(): Envelope<Workspace[]> {
    return this.service.list();
  }
}
