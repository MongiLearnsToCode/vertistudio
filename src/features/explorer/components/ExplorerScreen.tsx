import { useCallback, useState } from 'react';
import { File, Folder, FileQuestion, Upload, ExternalLink, FolderOpen } from 'lucide-react';
import { Panel, Button, IconButton } from '@shared/components';
import { Icon } from '@renderer/components/Icon';
import { useFileDrop, type DndResolvedPath } from '@renderer/hooks/useFileDrop';
import { useToast } from '@renderer/contexts/ToastContext';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function iconFor(item: DndResolvedPath) {
  if (!item.exists) return FileQuestion;
  if (item.isDirectory) return Folder;
  return File;
}

export function ExplorerScreen() {
  const [items, setItems] = useState<DndResolvedPath[]>([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const resolveAndSet = useCallback(async (paths: string[]) => {
    if (paths.length === 0) return;
    const res = await window.api.dndResolvePaths({ paths });
    if (res.success) setItems(res.paths);
  }, []);

  const openItem = async (item: DndResolvedPath) => {
    const res = await window.api.appOpenPath({ path: item.path });
    if (!res.success) showToast(`Open failed: ${res.error ?? 'unknown'}`, 'error');
  };

  const revealItem = async (item: DndResolvedPath) => {
    const res = await window.api.appShowInFolder({ path: item.path });
    if (!res.success) showToast(`Reveal failed: ${res.error ?? 'unknown'}`, 'error');
  };

  const handleOpenFile = async () => {
    setLoading(true);
    try {
      const result = await window.api.dialogOpenFile({
        title: 'Select a file',
        filters: [
          { name: 'All Files', extensions: ['*'] },
          { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'svg'] },
          { name: 'Documents', extensions: ['txt', 'md', 'json', 'csv'] },
        ],
      });
      if (!result.canceled && result.filePaths.length > 0) {
        await resolveAndSet(result.filePaths);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMultiple = async () => {
    setLoading(true);
    try {
      const result = await window.api.dialogOpenFile({
        title: 'Select multiple files',
        multiSelections: true,
        filters: [{ name: 'All Files', extensions: ['*'] }],
      });
      if (!result.canceled && result.filePaths.length > 0) {
        await resolveAndSet(result.filePaths);
      }
    } finally {
      setLoading(false);
    }
  };

  const { isDragOver, bind } = useFileDrop({
    onDrop: (dropped) => {
      setItems(dropped);
    },
  });

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div
        className="flex items-center justify-between h-[40px] px-3 bg-app-surface shrink-0"
        style={{ borderBottom: '0.5px solid var(--color-border)' }}
      >
        <span className="text-[13px] font-medium text-text-secondary">Explorer</span>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleOpenMultiple} disabled={loading}>
            {'Open Multiple'}
          </Button>
          <Button variant="primary" onClick={handleOpenFile} disabled={loading}>
            {'Open File'}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-[600px]">
          <p className="text-[12px] text-text-muted mb-4">Drop files onto the dashed zone below, or click Open File to invoke a native OS file dialog. Both flows resolve paths in the main process and stat each entry.</p>

          <div
            {...bind}
            className="rounded-md p-6 text-center transition-colors mb-4"
            style={{
              border: `1px dashed var(${isDragOver ? '--color-accent' : '--color-border'})`,
              background: isDragOver ? 'var(--color-app-surface)' : 'transparent',
            }}
          >
            <Icon
              icon={Upload}
              size={20}
              strokeWidth={1.4}
              className={isDragOver ? 'text-accent mx-auto mb-2' : 'text-text-dim mx-auto mb-2'}
            />
            <p className="text-[12px] text-text-secondary">
              {isDragOver ? 'Release to drop files' : 'Drag files here'}
            </p>
            <p className="text-[10px] text-text-dim mt-1">Up to 256 files per drop · main-process stat</p>
          </div>

          <Panel header={`Resolved entries (${items.length})`}>
            <div className="p-3">
              {items.length === 0 ? (
                <p className="text-[11px] text-text-dim text-center py-4">No entries yet. Drop a file above or use the Open buttons.</p>
              ) : (
                <div className="space-y-1">
                  {items.map((item) => (
                    <div
                      key={item.path}
                      className="flex items-center gap-2 px-2 py-1.5 rounded bg-app-base"
                    >
                      <Icon
                        icon={iconFor(item)}
                        size={14}
                        strokeWidth={1.2}
                        className="text-text-dim shrink-0"
                      />
                      <span className="text-[11px] text-text-secondary font-mono truncate flex-1">
                        {item.path}
                      </span>
                      <span className="text-[10px] text-text-dim shrink-0">
                        {!item.exists ? 'missing' : item.isDirectory ? 'folder' : formatSize(item.size)}
                      </span>
                      <IconButton
                        icon={<Icon icon={ExternalLink} size={14} />}
                        label="Open"
                        aria-label="Open"
                        disabled={!item.exists}
                        onClick={() => void openItem(item)}
                      />
                      <IconButton
                        icon={<Icon icon={FolderOpen} size={14} />}
                        label="Show in folder"
                        aria-label="Show in folder"
                        disabled={!item.exists}
                        onClick={() => void revealItem(item)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Panel>

          <Panel header={'How it works'} className="mt-4">
            <div className="p-3">
              <pre className="text-[10px] text-text-dim font-mono whitespace-pre-wrap leading-relaxed">
                {`// Drag-and-drop
const { isDragOver, bind } = useFileDrop({
  onDrop: (paths) => setItems(paths),
});
<div {...bind}>Drop here</div>

// Native dialog
const result = await window.api.dialogOpenFile({ ... });

// Both paths flow through dnd:resolve-paths to get
// { path, name, size, isFile, isDirectory, exists }`}
              </pre>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
