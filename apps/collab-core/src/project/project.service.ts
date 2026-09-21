import { Inject, Injectable } from '@nestjs/common';
import { fail, ok, type Envelope, type Project } from '@morningstar/contracts';
import { COLLAB_REPOSITORY, type CollabRepository } from '../storage/collab.store';

@Injectable()
export class ProjectService {
  constructor(@Inject(COLLAB_REPOSITORY) private readonly repo: CollabRepository) {}

  create(input: { workspaceId?: string; name?: string; key?: string }): Envelope<Project> {
    if (!input.workspaceId || !input.name || !input.key) {
      return fail(1002, 'workspaceId、name、key 均为必填');
    }
    return ok(this.repo.createProject({
      workspaceId: input.workspaceId,
      name: input.name,
      key: input.key,
    }));
  }

  list(workspaceId?: string): Envelope<Project[]> {
    return ok(this.repo.listProjects(workspaceId));
  }
}
