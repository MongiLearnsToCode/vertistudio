import type { EncoderId, VideoBootstrap } from '@shared/video/types';

export function exportBlockers(state: {
  valid: boolean;
  itemCount: number;
  queuedCount: number;
  output: string;
  outputChecking: boolean;
  outputError: string;
  engine: VideoBootstrap | null;
  encoder: EncoderId;
  loading: boolean;
  projectWorking: boolean;
}): string[] {
  const reasons: string[] = [];
  if (!state.itemCount) reasons.push('Import a video and select a cut.');
  else if (!state.queuedCount)
    reasons.push('Queue a clip for export using New short or Queue again.');
  if (!state.valid) reasons.push('Fix the In and Out times so the cut is valid.');
  if (!state.output) reasons.push('Choose an export folder, or set a default folder in Settings.');
  else if (state.outputChecking) reasons.push('Wait for the export folder check to finish.');
  else if (state.outputError) reasons.push(state.outputError);
  if (!state.engine) reasons.push('Wait for FFmpeg and FFprobe to finish checking.');
  else if (!state.engine.ready)
    reasons.push('Install or configure FFmpeg and FFprobe before exporting.');
  else if (!state.engine.encoders[state.encoder])
    reasons.push('Select an available video encoder.');
  if (state.loading) reasons.push('Wait for video import to finish.');
  if (state.projectWorking) reasons.push('Wait for the project to finish opening.');
  return reasons;
}
