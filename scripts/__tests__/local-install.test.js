import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import localInstall from '../local-install.js';

const { linkLocalInstall, publishBuild } = localInstall;
let temporary;
let root;
let home;
let source;
let installed;
async function build(directory, content) {
  await fs.mkdir(path.join(directory, 'resources'), { recursive: true });
  await fs.writeFile(path.join(directory, 'resources', 'app.asar'), content);
  await fs.writeFile(path.join(directory, 'verti-studio'), 'runtime');
  await fs.writeFile(path.join(directory, 'icon.png'), 'icon');
}
async function archive(directory) {
  return fs.readFile(path.join(directory, 'resources', 'app.asar'), 'utf8');
}
beforeEach(async () => {
  temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'verti-local-install-'));
  root = path.join(temporary, 'Project with spaces');
  home = path.join(temporary, 'User Home');
  source = path.join(root, 'dist', 'Verti Studio-linux');
  installed = path.join(home, '.local', 'opt', 'verti-studio');
  await build(source, 'new version');
});
afterEach(async () => {
  await fs.rm(temporary, { recursive: true, force: true });
});

describe.skipIf(process.platform !== 'linux')('Linux local app installation', () => {
  it('preserves the old app, links the menu to the build, and leaves saved data intact', async () => {
    await build(installed, 'old version');
    const dataHome = path.join(home, 'custom data');
    const savedProject = path.join(home, '.config', 'Verti Studio', 'projects', 'saved.json');
    await fs.mkdir(path.dirname(savedProject), { recursive: true });
    await fs.writeFile(savedProject, 'my cuts');
    const result = await linkLocalInstall({ root, home, dataHome });
    expect((await fs.lstat(installed)).isSymbolicLink()).toBe(true);
    expect(await archive(installed)).toBe('new version');
    expect(await archive(result.backup)).toBe('old version');
    expect(await fs.readFile(savedProject, 'utf8')).toBe('my cuts');
    const desktop = await fs.readFile(
      path.join(dataHome, 'applications', 'verti-studio.desktop'),
      'utf8',
    );
    expect(desktop).toContain(`"${path.join(installed, 'verti-studio')}"`);
    expect(desktop).toContain(`Icon=${path.join(installed, 'icon.png')}`);
  });
  it('opens subsequent builds through the same installed path without another update', async () => {
    await linkLocalInstall({ root, home, dataHome: path.join(home, 'data') });
    const staged = path.join(root, 'dist', 'staged-next');
    await build(staged, 'next build');
    await publishBuild(staged, source);
    expect(await archive(installed)).toBe('next build');
    expect(await fs.readlink(installed)).toBe(source);
  });
  it('is safe to run again and does not create more backups', async () => {
    const dataHome = path.join(home, 'data');
    await linkLocalInstall({ root, home, dataHome });
    const result = await linkLocalInstall({ root, home, dataHome });
    expect(result.backup).toBeUndefined();
    expect(await fs.readdir(path.dirname(installed))).toEqual(['verti-studio']);
  });
  it('restores the working build if publishing fails', async () => {
    await expect(publishBuild(path.join(temporary, 'missing-build'), source)).rejects.toThrow();
    expect(await archive(source)).toBe('new version');
  });
  it('refuses incomplete builds and unrelated installation folders', async () => {
    await fs.unlink(path.join(source, 'icon.png'));
    await expect(linkLocalInstall({ root, home })).rejects.toThrow();
    await expect(fs.lstat(installed)).rejects.toThrow();
    await fs.writeFile(path.join(source, 'icon.png'), 'icon');
    await fs.mkdir(installed, { recursive: true });
    await fs.writeFile(path.join(installed, 'keep.txt'), 'unrelated');
    await expect(linkLocalInstall({ root, home })).rejects.toThrow('unrecognized');
    expect(await fs.readFile(path.join(installed, 'keep.txt'), 'utf8')).toBe('unrelated');
  });
});
