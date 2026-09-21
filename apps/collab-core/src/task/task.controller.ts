import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import type { CreateTaskRequest, Envelope, Task, TaskStatus, UpdateTaskRequest } from '@morningstar/contracts';
import { TaskService } from './task.service';

@Controller('api/v1/tasks')
export class TaskController {
  constructor(private readonly service: TaskService) {}

  @Post()
  create(@Body() body: CreateTaskRequest): Envelope<Task> {
    return this.service.create(body ?? ({} as CreateTaskRequest));
  }

  @Get()
  list(@Query('projectId') projectId?: string, @Query('status') status?: string): Envelope<Task[]> {
    return this.service.list({ projectId, status: status as TaskStatus | undefined });
  }

  @Get(':id')
  find(@Param('id') id: string): Envelope<Task> {
    return this.service.find(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateTaskRequest): Envelope<Task> {
    return this.service.update(id, body ?? {});
  }

  @Delete(':id')
  remove(@Param('id') id: string): Envelope<{ id: string; deleted: boolean }> {
    return this.service.remove(id);
  }
}
