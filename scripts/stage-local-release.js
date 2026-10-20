'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const afterPack = require('./release-after-pack');
async function main() {
  if (process.platform !== 'linux' || process.arch !== 'x64')
    throw new Error('This staging command uses the local Linux x64 build.');
  const root = path.join(__dirname, '..');
  const destination = path.join(root, 'release', 'linux-prepackaged');
  await fs.rm(destination, { recursive: true, force: true });
  await fs.cp(path.join(root, 'dist', 'Verti Studio-linux'), destination, { recursive: true });
  await afterPack({
    electronPlatformName: 'linux',
    arch: 1,
    appOutDir: destination,
    packager: { appInfo: { productFilename: 'Verti Studio' } },
  });
  await fs.writeFile(
    path.join(destination, 'resources', 'app-update.yml'),
    'provider: generic\nurl: https://vertistudio.clipverti.com/updates/linux-x64/\nuseMultipleRangeRequest: false\nupdaterCacheDirName: verti-studio-updater\n',
  );
  await fs.writeFile(path.join(destination, 'resources', 'package-type'), 'deb');
  console.log('Staged the local Linux app with offline video tools and its release update feed.');
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
