import type { UpdateState } from '@shared/ipc/update-types';

export interface UpdateDriver {
  check(): Promise<void>;
  download(): Promise<void>;
  install(): void;
  setAutomatic(enabled: boolean): void;
}
export class UpdateController {
  private value: UpdateState;
  private automatic = false;
  private operation: Promise<void> | undefined;
  constructor(
    private driver: UpdateDriver,
    version: string,
    disabled: string | undefined,
    private changed: (state: UpdateState) => void,
    private canInstall: () => boolean,
    manualDownloadUrl?: string,
  ) {
    this.value = {
      status: disabled ? 'disabled' : 'idle',
      currentVersion: version,
      manualDownloadUrl,
      message: disabled ?? 'Updates are checked automatically.',
    };
  }
  get state(): UpdateState {
    return { ...this.value };
  }
  private publish(state: Partial<UpdateState>) {
    this.value = { ...this.value, ...state };
    this.changed(this.state);
  }
  configure(automatic: boolean) {
    this.automatic = automatic && !this.value.manualDownloadUrl;
    this.driver.setAutomatic(this.automatic);
    if (this.automatic && this.value.status === 'available') void this.download().catch(() => {});
  }
  async check(): Promise<void> {
    if (this.value.status === 'disabled') throw new Error(this.value.message);
    if (this.operation) return this.operation;
    if (this.value.status === 'downloaded') return;
    this.publish({ status: 'checking', message: 'Checking for updates…', percent: undefined });
    this.operation = this.driver
      .check()
      .catch((error) => {
        this.failed(error);
        throw error;
      })
      .finally(() => {
        this.operation = undefined;
      });
    await this.operation;
    if (this.automatic && this.value.status === 'available') await this.download();
  }
  available(version: string) {
    this.publish({
      status: 'available',
      version,
      message: `Verti Studio ${version} is available.`,
    });
  }
  current() {
    this.publish({
      status: 'current',
      version: undefined,
      message: 'You have the latest version.',
    });
  }
  progress(percent: number) {
    this.publish({
      status: 'downloading',
      percent: Math.max(0, Math.min(100, percent)),
      message: 'Downloading update…',
    });
  }
  downloaded(version: string) {
    this.publish({
      status: 'downloaded',
      version,
      percent: 100,
      message: `Version ${version} is ready. Restart when you are ready to install it.`,
    });
  }
  failed(error: unknown) {
    this.publish({
      status: 'error',
      message: `Update could not complete. Check your connection and try again. ${error instanceof Error ? error.message : String(error)}`,
    });
  }
  async download(): Promise<void> {
    if (this.value.manualDownloadUrl)
      throw new Error(
        'Download the installer from the release website for this unsigned macOS build.',
      );
    if (this.operation) return this.operation;
    if (this.value.status !== 'available') throw new Error('Check for an available update first.');
    this.publish({ status: 'downloading', percent: 0, message: 'Downloading update…' });
    this.operation = this.driver
      .download()
      .catch((error) => {
        this.failed(error);
        throw error;
      })
      .finally(() => {
        this.operation = undefined;
      });
    return this.operation;
  }
  install() {
    if (this.value.manualDownloadUrl)
      throw new Error('Automatic macOS installation requires a signed release.');
    if (this.value.status !== 'downloaded') throw new Error('Download an update first.');
    if (!this.canInstall())
      throw new Error('Wait for video exports to finish before installing an update.');
    this.driver.install();
  }
}
