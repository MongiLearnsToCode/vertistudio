import { promises as fs, constants } from 'node:fs';
import path from 'node:path';

export class ExportDirectory {
  constructor(
    private savedDefault: () => string,
    private storeDefault: (directory: string) => void,
    private isAllowed: (directory: string) => boolean,
    private grant: (directory: string) => void,
  ) {}

  async check(directory: string, restoreDefault = true): Promise<string> {
    if (!path.isAbsolute(directory)) throw new Error('Choose an export folder.');
    let real: string;
    try {
      real = await fs.realpath(directory);
    } catch (error) {
      throw new Error('The export folder is unavailable. Choose an existing folder.', {
        cause: error,
      });
    }
    const remembered = restoreDefault && directory === this.savedDefault() && real === directory;
    if (!this.isAllowed(real) && !remembered)
      throw new Error('Choose this export folder using the folder picker first.');
    if (!(await fs.stat(real)).isDirectory())
      throw new Error('Choose a folder, not a file, for exports.');
    try {
      await fs.access(real, constants.W_OK | constants.X_OK);
    } catch (error) {
      throw new Error('The export folder is not writable. Choose another folder.', {
        cause: error,
      });
    }
    // Only the exact canonical folder previously chosen and saved by the user is restored.
    if (remembered && !this.isAllowed(real)) this.grant(real);
    return real;
  }

  async setDefault(directory: string): Promise<void> {
    this.storeDefault(directory ? await this.check(directory, false) : '');
  }
}
