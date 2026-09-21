import { Inject, Injectable } from '@nestjs/common';
import { fail, ok, type Envelope, type Workspace } from '@morningstar/contracts';
import { COLLAB_REPOSITORY, type CollabRepository } from '../storage/collab.store';

@Injectable()
export class WorkspaceService {
  constructor(@Inject(COLLAB_REPOSITORY) private readonly repo: CollabRepository) {}

  create(name: string): Envelope<Workspace> {
    if (typeof name !== 'string' || name.trim().length === 0) {
      return fail(1001, '工作区名称不能为空');
    }
    return ok(this.repo.createWorkspace(name.trim()));
  }

  list(): Envelope<Workspace[]> {
    return ok(this.repo.listWorkspaces());
  }
}
