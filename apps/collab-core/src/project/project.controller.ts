import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import type { Envelope, Project } from '@morningstar/contracts';
import { ProjectService } from './project.service';

@Controller('api/v1/projects')
export class ProjectController {
  constructor(private readonly service: ProjectService) {}

  @Post()
  create(@Body() body: { workspaceId?: string; name?: string; key?: string }): Envelope<Project> {
    return this.service.create(body ?? {});
  }

  @Get()
  list(@Query('workspaceId') workspaceId?: string): Envelope<Project[]> {
    return this.service.list(workspaceId);
  }
}
