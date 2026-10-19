import type { VideoEvent, VideoExportRequest, VideoInfo, VideoOutput } from '@shared/video/types';

interface Runner {
  start(
    request: VideoExportRequest,
    video: VideoInfo,
    notify: (event: VideoEvent) => void,
  ): Promise<string>;
  cancel(id: string): void;
  cleanup(): void;
}

export class MultiExportRunner {
  private active = new Set<string>();
  private canceled = new Set<string>();
  constructor(private runner: Runner) {}

  async start(
    request: VideoExportRequest,
    video: VideoInfo,
    notify: (event: VideoEvent) => void,
  ): Promise<string> {
    if (this.active.has(request.id)) throw new Error('This video is already encoding.');
    if (!request.both) return this.runner.start(request, video, notify);
    this.active.add(request.id);
    const outputs: VideoOutput[] = [];
    const variants = [
      { format: 'original' as const, fit: 'keep' as const },
      {
        format: 'vertical' as const,
        fit: request.fit === 'keep' ? ('auto' as const) : request.fit,
      },
    ];
    try {
      for (const [index, variant] of variants.entries()) {
        if (this.canceled.has(request.id)) {
          notify({ id: request.id, type: 'canceled', outputs });
          return outputs.at(-1)?.path ?? '';
        }
        const terminal = await new Promise<VideoEvent>((resolve, reject) => {
          void this.runner
            .start({ ...request, both: false, fit: variant.fit }, video, (event) => {
              if (event.type === 'progress')
                notify({
                  ...event,
                  format: variant.format,
                  percent:
                    event.percent === undefined ? undefined : (index * 100 + event.percent) / 2,
                });
              else resolve(event);
            })
            .catch(reject);
        });
        if (terminal.type !== 'done') {
          notify({
            ...terminal,
            format: variant.format,
            outputs,
            size: outputs.reduce((sum, output) => sum + output.size, 0),
          });
          return outputs.at(-1)?.path ?? '';
        }
        if (!terminal.output) throw new Error('The encoder did not return an output file.');
        outputs.push({ format: variant.format, path: terminal.output, size: terminal.size ?? 0 });
        notify({
          id: request.id,
          type: index === 1 ? 'done' : 'progress',
          percent: (index + 1) * 50,
          format: variant.format,
          outputs: outputs.slice(),
          output: terminal.output,
          size: outputs.reduce((sum, output) => sum + output.size, 0),
        });
      }
      return outputs.at(-1)?.path ?? '';
    } finally {
      this.active.delete(request.id);
      this.canceled.delete(request.id);
    }
  }
  cancel(id: string): void {
    if (this.active.has(id)) this.canceled.add(id);
    this.runner.cancel(id);
  }
  cleanup(): void {
    for (const id of this.active) this.canceled.add(id);
    this.runner.cleanup();
  }
}
