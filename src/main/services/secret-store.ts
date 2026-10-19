import { app, safeStorage } from 'electron';
import { promises as fs } from 'fs';
import path from 'path';
import { logEngine } from '../../logging';

const log = logEngine.createLogger('SecretStore');

const SECRETS_FILENAME = 'secrets.dat';

class SecretStore {
  private secrets: Record<string, string> = {};
  private filePath = '';
  private encryptionAvailable = false;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    this.filePath = path.join(app.getPath('userData'), SECRETS_FILENAME);
    this.encryptionAvailable = safeStorage.isEncryptionAvailable();

    if (!this.encryptionAvailable) {
      log.warn(
        'safeStorage encryption not available; secrets will be stored with the platform fallback (plaintext on Linux without keyring)',
        { platform: process.platform },
      );
    }

    await this.load();
    this.initialized = true;
    log.info('Secret store initialized', {
      path: this.filePath,
      encryptionAvailable: this.encryptionAvailable,
      keyCount: Object.keys(this.secrets).length,
    });
  }

  get(key: string): string | null {
    this.assertReady();
    return Object.prototype.hasOwnProperty.call(this.secrets, key) ? this.secrets[key]! : null;
  }

  /**
   * Whether secrets are encrypted at rest. False on platforms whose
   * `safeStorage` backend isn't available — primarily Linux without
   * `gnome-keyring` / `kwallet`. Surfaced to the renderer via
   * `secret:status` so the API Keys panel can warn the user.
   */
  isEncryptionAvailable(): boolean {
    this.assertReady();
    return this.encryptionAvailable;
  }

  async set(key: string, value: string): Promise<void> {
    this.assertReady();
    this.secrets[key] = value;
    await this.persist();
  }

  async delete(key: string): Promise<void> {
    this.assertReady();
    if (!Object.prototype.hasOwnProperty.call(this.secrets, key)) return;
    delete this.secrets[key];
    await this.persist();
  }

  private async load(): Promise<void> {
    let buffer: Buffer;
    try {
      buffer = await fs.readFile(this.filePath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        this.secrets = {};
        return;
      }
      throw err;
    }

    if (buffer.length === 0) {
      this.secrets = {};
      return;
    }

    try {
      const json = this.encryptionAvailable
        ? safeStorage.decryptString(buffer)
        : buffer.toString('utf-8');
      const parsed: unknown = JSON.parse(json);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        this.secrets = parsed as Record<string, string>;
      } else {
        log.warn('Secret file did not contain a JSON object; treating as empty');
        this.secrets = {};
      }
    } catch (err) {
      log.error('Failed to decrypt or parse secret file; starting with empty store', err);
      this.secrets = {};
    }
  }

  private async persist(): Promise<void> {
    const json = JSON.stringify(this.secrets);
    const payload = this.encryptionAvailable
      ? safeStorage.encryptString(json)
      : Buffer.from(json, 'utf-8');

    const tmpPath = `${this.filePath}.tmp`;
    await fs.writeFile(tmpPath, payload);
    await fs.rename(tmpPath, this.filePath);
  }

  private assertReady(): void {
    if (!this.initialized) {
      throw new Error('SecretStore.init() must be called before use');
    }
  }
}

export const secretStore = new SecretStore();
