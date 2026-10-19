import type { ProjectSaveRequest, ProjectSummary } from '@shared/ipc/types';

export type ProjectDraft = Omit<ProjectSaveRequest, 'id'>;

export function projectFingerprint(draft: ProjectDraft): string {
  return JSON.stringify({
    name: draft.name.trim() || 'Untitled project',
    cuts: draft.cuts,
    options: {
      preset: draft.options.preset,
      fit: draft.options.fit,
      encoder: draft.options.encoder,
      keepFps: draft.options.keepFps,
      both: draft.options.both ?? false,
    },
  });
}

export class ProjectSaveQueue {
  id: string | undefined;
  saved = '';
  summary: ProjectSummary | undefined;
  private draft: ProjectDraft | undefined;
  private pending: Promise<void> | undefined;
  constructor(private persist: (request: ProjectSaveRequest) => Promise<ProjectSummary>) {}

  get dirty(): boolean {
    return Boolean(
      this.pending ||
      (this.draft &&
        (this.id || this.draft.cuts.length) &&
        projectFingerprint(this.draft) !== this.saved),
    );
  }
  update(draft: ProjectDraft): void {
    this.draft = draft;
  }

  restore(id: string | undefined, draft: ProjectDraft): void {
    if (this.pending) throw new Error('Wait for the current project save to finish.');
    this.id = id;
    this.draft = draft;
    this.saved = id ? projectFingerprint(draft) : '';
    this.summary = undefined;
  }

  async flush(): Promise<void> {
    while (this.dirty) {
      if (!this.pending) {
        const draft = this.draft!;
        const fingerprint = projectFingerprint(draft);
        this.pending = (async () => {
          const result = await this.persist({ ...draft, id: this.id });
          this.id = result.id;
          this.saved = fingerprint;
          this.summary = result;
        })().finally(() => {
          this.pending = undefined;
        });
      }
      await this.pending;
    }
  }
}
