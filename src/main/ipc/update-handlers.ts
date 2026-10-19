import { updateActionSchema } from '@shared/validation/update-schema';
import type { UpdateResponse } from '@shared/ipc/update-types';
import { getUpdates } from '../services/updates/update-service';
import { logEngine } from '@logging/index';
const log = logEngine.createLogger('UpdateHandlers');
export async function handleUpdateAction(
  _event: Electron.IpcMainInvokeEvent,
  action: unknown,
): Promise<UpdateResponse> {
  const updates = getUpdates();
  try {
    const parsed = updateActionSchema.parse(action);
    if (parsed === 'check') await updates.check();
    if (parsed === 'download') await updates.download();
    if (parsed === 'install') updates.install();
    return { success: true, state: updates.state };
  } catch (error) {
    log.error('Update action failed', error, { action });
    return {
      success: false,
      state: updates.state,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
