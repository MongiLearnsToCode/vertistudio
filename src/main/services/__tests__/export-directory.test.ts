import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExportDirectory } from '../export-directory';

let root: string;
let chosen: string;
let other: string;
let saved: string;
let grants: Set<string>;
const service = () =>
  new ExportDirectory(
    () => saved,
    (directory) => {
      saved = directory;
    },
    (directory) => grants.has(directory),
    (directory) => {
      grants.add(directory);
    },
  );
beforeEach(async () => {
  root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'verti-export-directory-')));
  chosen = path.join(root, 'Chosen exports');
  other = path.join(root, 'Other folder');
  await fs.mkdir(chosen);
  await fs.mkdir(other);
  saved = '';
  grants = new Set();
});
afterEach(async () => {
  vi.restoreAllMocks();
  await fs.rm(root, { recursive: true, force: true });
});

describe('Default export directory', () => {
  it('only stores a folder already authorized by the native picker', async () => {
    await expect(service().setDefault(chosen)).rejects.toThrow('folder picker');
    expect(saved).toBe('');
    grants.add(chosen);
    await service().setDefault(chosen);
    expect(saved).toBe(await fs.realpath(chosen));
  });
  it('restores permission for exactly the selected default across sessions', async () => {
    grants.add(chosen);
    await service().setDefault(chosen);
    grants.clear();
    expect(await service().check(chosen)).toBe(chosen);
    expect(grants.has(chosen)).toBe(true);
    await expect(service().check(other)).rejects.toThrow('folder picker');
    expect(grants.has(other)).toBe(false);
  });
  it('does not follow a replaced default symlink into a new location', async () => {
    grants.add(chosen);
    await service().setDefault(chosen);
    grants.clear();
    await fs.rename(chosen, path.join(root, 'Previous folder'));
    await fs.symlink(other, chosen, process.platform === 'win32' ? 'junction' : 'dir');
    await expect(service().check(chosen)).rejects.toThrow('folder picker');
    expect(grants.size).toBe(0);
  });
  it('reports missing, unwritable, and non-directory destinations', async () => {
    await expect(service().check(path.join(root, 'missing'))).rejects.toThrow('unavailable');
    const file = path.join(root, 'file.mp4');
    await fs.writeFile(file, 'video');
    grants.add(file);
    await expect(service().check(file)).rejects.toThrow('not a file');
    grants.add(chosen);
    vi.spyOn(fs, 'access').mockRejectedValueOnce(new Error('Permission denied'));
    await expect(service().check(chosen)).rejects.toThrow('not writable');
  });
  it('clears the default without granting any new location', async () => {
    saved = chosen;
    await service().setDefault('');
    expect(saved).toBe('');
    expect(grants.size).toBe(0);
  });
});
