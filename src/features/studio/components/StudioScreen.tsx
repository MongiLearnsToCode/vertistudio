import { useState } from 'react';
import { Scissors, Upload, Plus } from 'lucide-react';
import { Button } from '@shared/components';
import { Icon } from '@renderer/components/Icon';
import { useFileDrop } from '@renderer/hooks/useFileDrop';
import { useStudio } from '../hooks/useStudio';
import { CutEditor } from './CutEditor';
import { ExportSettings } from './ExportSettings';
import { ProjectBar } from './ProjectBar';
import { VideoQueue } from './VideoQueue';
export function StudioScreen() {
  const studio = useStudio();
  const [validTrim, setValidTrim] = useState(true);
  const { bind, isDragOver } = useFileDrop({
    disabled: studio.running || studio.loading || studio.projects.working,
    onDrop: async (paths) => {
      await studio.importPaths(paths.filter((entry) => entry.isFile).map((entry) => entry.path));
    },
  });
  return (
    <div className="flex flex-col h-full" {...bind}>
      <header className="h-10 px-4 flex items-center justify-between shrink-0 border-b border-border bg-app-surface">
        <span className="text-[13px] font-medium text-text-primary">Verti Studio</span>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={
              !studio.items.length || studio.running || studio.loading || studio.projects.working
            }
            onClick={studio.clear}
          >
            Clear queue
          </Button>
          <Button
            variant="secondary"
            disabled={
              !studio.selected || studio.loading || studio.running || studio.projects.working
            }
            onClick={studio.newShort}
          >
            New short
          </Button>
          <Button
            variant="primary"
            disabled={studio.loading || studio.running || studio.projects.working}
            onClick={() => void studio.pickFiles()}
          >
            <Icon icon={Plus} size={13} className="mr-1" />
            {studio.loading ? 'Importing…' : 'Import video'}
          </Button>
        </div>
      </header>
      <div
        className={`flex-1 overflow-auto p-5 ${isDragOver ? 'ring-2 ring-inset ring-accent bg-app-active' : ''}`}
      >
        <div className="max-w-[1400px] mx-auto">
          <ProjectBar studio={studio} />
          <div className="flex items-start gap-3 mb-5">
            <span className="p-2 rounded-lg bg-app-active text-accent-light">
              <Icon icon={Scissors} size={22} />
            </span>
            <div>
              <h1 className="text-xl font-semibold text-text-primary">Make the cut.</h1>
              <p className="text-xs text-text-muted mt-1">
                Import footage, choose your moment, export in your preferred format.
              </p>
            </div>
          </div>
          {studio.error ? (
            <p
              role="alert"
              className="mb-4 p-3 border border-accent-red rounded text-xs text-accent-red whitespace-pre-wrap"
            >
              {studio.error}
            </p>
          ) : null}
          {studio.selected ? (
            <CutEditor
              key={studio.selected.id}
              item={studio.selected}
              locked={studio.running || studio.projects.working}
              onTrim={studio.changeTrim}
              onValidity={setValidTrim}
              queue={<VideoQueue studio={studio} />}
              exportSettings={<ExportSettings studio={studio} valid={validTrim} />}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px] gap-5 items-start">
              <div className="min-w-0 space-y-5">
                <section
                  className="min-h-[330px] flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-app-surface p-8 text-center"
                  aria-label="Import footage"
                >
                  <Icon icon={Upload} size={34} className="text-text-muted mb-5" />
                  <h2 className="text-lg text-text-primary font-medium">Drop footage here</h2>
                  <p className="mt-2 text-xs text-text-muted max-w-sm">
                    Wide or vertical. MOV, MP4, MKV, WebM and more. Scrub your preview and set an in
                    and out point.
                  </p>
                  <Button
                    variant="primary"
                    className="mt-5"
                    size="md"
                    disabled={studio.loading}
                    onClick={() => void studio.pickFiles()}
                  >
                    Choose video files
                  </Button>
                  <p className="mt-3 text-[11px] text-text-muted">Ctrl / Cmd + O to import</p>
                </section>
                {studio.items.length ? <VideoQueue studio={studio} /> : null}
              </div>
              <ExportSettings studio={studio} valid={validTrim} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
