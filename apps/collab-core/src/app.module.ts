import { Module } from '@nestjs/common';
import { TaskController } from './task/task.controller';
import { TaskService } from './task/task.service';
import { COLLAB_REPOSITORY, InMemoryCollabRepository } from './storage/collab.store';
import { HealthController } from './health/health.controller';
import { ProjectController } from './project/project.controller';
import { ProjectService } from './project/project.service';
import { WorkspaceController } from './workspace/workspace.controller';
import { WorkspaceService } from './workspace/workspace.service';

@Module({
  controllers: [HealthController, WorkspaceController, ProjectController, TaskController],
  providers: [
    WorkspaceService,
    ProjectService,
    TaskService,
    { provide: COLLAB_REPOSITORY, useClass: InMemoryCollabRepository },
  ],
})
export class AppModule {}
