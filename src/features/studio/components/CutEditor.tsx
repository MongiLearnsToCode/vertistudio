import { useCallback, type ReactNode } from 'react';
import type { Trim } from '@shared/video/types';
import type { QueueItem } from '../types';
import { useVideoCut } from '../hooks/useVideoCut';
import { CutControls } from './CutControls';
import { SourcePreview } from './SourcePreview';
interface Props {
  item: QueueItem;
  locked: boolean;
  onTrim: (id: string, trim: Trim) => void;
  onValidity: (valid: boolean) => void;
  queue?: ReactNode;
  exportSettings?: ReactNode;
}
export function CutEditor({ item, locked, onTrim, onValidity, queue, exportSettings }: Props) {
  const change = useCallback((trim: Trim) => onTrim(item.id, trim), [item.id, onTrim]);
  const cut = useVideoCut(item, change, onValidity);
  const portrait = item.video.height > item.video.width;
  return (
    <div
      className={`grid grid-cols-1 items-start gap-5 ${
        portrait
          ? 'lg:grid-cols-[minmax(180px,0.8fr)_minmax(400px,1.2fr)_260px]'
          : 'lg:grid-cols-[minmax(0,1fr)_260px]'
      }`}
    >
      <div className={portrait ? 'min-w-0' : 'min-w-0 lg:col-start-1 lg:row-start-1'}>
        <SourcePreview video={item.video} cut={cut} />
      </div>
      <div
        aria-label="Cut details and queue"
        role="region"
        className={`min-w-0 space-y-5 ${portrait ? '' : 'lg:col-start-1 lg:row-start-2'}`}
      >
        <CutControls item={item} cut={cut} locked={locked} />
        {queue}
      </div>
      <div className={`min-w-0 ${portrait ? '' : 'lg:col-start-2 lg:row-start-1 lg:row-span-2'}`}>
        {exportSettings}
      </div>
    </div>
  );
}
