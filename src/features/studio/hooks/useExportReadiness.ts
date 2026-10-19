import { exportBlockers } from '../export-readiness';
import type { StudioController } from './useStudio';

export function useExportReadiness(studio: StudioController, valid: boolean) {
  const reasons = exportBlockers({
    valid,
    itemCount: studio.items.length,
    queuedCount: studio.items.filter((item) => item.status === 'queued').length,
    output: studio.output,
    outputChecking: studio.outputChecking,
    outputError: studio.outputError,
    engine: studio.engine,
    encoder: studio.encoder,
    loading: studio.loading,
    projectWorking: studio.projects.working,
  });
  return { reasons, disabled: reasons.length > 0 };
}
