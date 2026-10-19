import { session } from 'electron';
import { logEngine } from '../../logging';

const log = logEngine.createLogger('Permissions');

const ALLOWED_PERMISSIONS = new Set<string>([
  // Add permissions here as features need them.
  // e.g. 'notifications', 'clipboard-sanitized-write'
]);

export function registerPermissionHandler(): void {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowed = ALLOWED_PERMISSIONS.has(permission);
    if (!allowed) {
      log.warn('Denied permission request', { permission });
    }
    callback(allowed);
  });

  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    return ALLOWED_PERMISSIONS.has(permission);
  });
}
