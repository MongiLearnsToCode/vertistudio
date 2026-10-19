import { Button, Select, TextInput } from '@shared/components';
import type { StudioController } from '../hooks/useStudio';

export function ProjectBar({ studio }: { studio: StudioController }) {
  const project = studio.projects;
  const disabled = studio.loading || studio.running || project.working;
  return (
    <section
      aria-label="Project"
      className="mb-5 p-3 rounded-lg border border-border bg-app-surface space-y-2"
    >
      <div className="flex flex-wrap gap-2 items-center">
        <label htmlFor="project-name" className="text-xs text-text-secondary">
          Project
        </label>
        <TextInput
          id="project-name"
          value={project.name}
          maxLength={120}
          disabled={disabled}
          onChange={(event) => project.setName(event.target.value)}
          className="flex-1 min-w-40"
        />
        <Button
          variant="primary"
          disabled={disabled || project.saving || (!studio.items.length && !project.id)}
          onClick={() => void project.save()}
        >
          {project.saving ? 'Saving…' : project.saveError ? 'Retry save' : 'Save project'}
        </Button>
        <Button
          variant="secondary"
          disabled={disabled}
          onClick={() => void project.switchProject()}
        >
          New project
        </Button>
        <Select
          aria-label="Open saved project"
          placeholder="Open saved project…"
          value=""
          disabled={disabled || !project.projects.length}
          options={project.projects.map((entry) => ({ value: entry.id, label: entry.name }))}
          onValueChange={(id) => void project.switchProject(id)}
        />
      </div>
      <p
        role={project.saveError ? 'alert' : 'status'}
        className={`text-[11px] ${project.saveError ? 'text-accent-red' : 'text-text-muted'}`}
      >
        {project.saveError
          ? `Autosave failed: ${project.saveError}. Your edits are still here. Retry saving.`
          : project.saving
            ? 'Saving project and source footage…'
            : project.dirty
              ? 'Autosave on · Changes will save shortly…'
              : project.id
                ? 'Autosave on · All changes saved'
                : 'Autosave on · Import footage to start a project'}
      </p>
    </section>
  );
}
