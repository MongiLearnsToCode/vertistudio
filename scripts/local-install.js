'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { randomUUID } = require('node:crypto');

async function inspect(file) {
  try {
    return await fs.lstat(file);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function publishBuild(staged, destination) {
  const backup = `${destination}.previous-${randomUUID()}`;
  const existing = await inspect(destination);
  if (existing) await fs.rename(destination, backup);
  try {
    await fs.rename(staged, destination);
  } catch (error) {
    if (existing) await fs.rename(backup, destination);
    throw error;
  }
  if (existing) await fs.rm(backup, { recursive: true, force: true });
}

function desktopEntry(installDirectory) {
  if (/[\r\n]/.test(installDirectory))
    throw new Error('Installation paths cannot contain newlines.');
  const executable = path
    .join(installDirectory, 'verti-studio')
    .replace(/[\\"`$]/g, '\\$&')
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '%%');
  const icon = path.join(installDirectory, 'icon.png').replace(/\\/g, '\\\\');
  return `[Desktop Entry]
Type=Application
Version=1.0
Name=Verti Studio
GenericName=Video Editor
Comment=Cut videos and export vertical clips
Exec=env -u ELECTRON_RUN_AS_NODE "${executable}" %F
Icon=${icon}
Terminal=false
Categories=AudioVideo;Video;AudioVideoEditing;
Keywords=video;vertical;clips;reels;shorts;editing;
StartupNotify=true
`;
}

async function linkLocalInstall({
  root,
  home = os.homedir(),
  dataHome = process.env.XDG_DATA_HOME || path.join(home, '.local', 'share'),
}) {
  if (process.platform !== 'linux')
    throw new Error('This local installation command supports Linux.');
  const source = await fs.realpath(path.join(root, 'dist', 'Verti Studio-linux'));
  for (const file of ['verti-studio', 'resources/app.asar', 'icon.png']) {
    if (!(await fs.stat(path.join(source, file))).isFile())
      throw new Error(`Incomplete build: ${file}`);
  }
  const destination = path.join(home, '.local', 'opt', 'verti-studio');
  const entry = desktopEntry(destination);
  const existing = await inspect(destination);
  let backup;
  if (existing?.isSymbolicLink()) {
    const linked = path.resolve(path.dirname(destination), await fs.readlink(destination));
    if (linked !== source)
      throw new Error(`Installation already links to another location: ${linked}`);
  } else {
    if (existing) {
      if (
        !existing.isDirectory() ||
        !(await inspect(path.join(destination, 'resources', 'app.asar')))?.isFile()
      )
        throw new Error(
          'The installation path contains an unrecognized file or folder; it was left intact.',
        );
    }
    await fs.mkdir(path.dirname(destination), { recursive: true });
    const pending = `${destination}.link-${randomUUID()}`;
    await fs.symlink(source, pending, 'dir');
    try {
      if (existing) {
        backup = `${destination}.backup-${randomUUID()}`;
        await fs.rename(destination, backup);
      }
      try {
        await fs.rename(pending, destination);
      } catch (error) {
        if (backup) await fs.rename(backup, destination);
        throw error;
      }
    } finally {
      await fs.rm(pending, { force: true });
    }
  }
  const applications = path.join(dataHome, 'applications');
  await fs.mkdir(applications, { recursive: true });
  const desktop = path.join(applications, 'verti-studio.desktop');
  const pendingDesktop = `${desktop}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(pendingDesktop, entry, { mode: 0o644, flag: 'wx' });
    await fs.rename(pendingDesktop, desktop);
  } finally {
    await fs.rm(pendingDesktop, { force: true });
  }
  return { destination, source, backup };
}

module.exports = { linkLocalInstall, publishBuild, desktopEntry };
