import fs from 'node:fs/promises';
import path from 'node:path';
import { collectRelease } from '../publish-release.mjs';
const platform = process.argv[2];
const { version } = JSON.parse(await fs.readFile('package.json', 'utf8'));
const release = await collectRelease('dist', platform, version);
const destination = path.join('release-artifacts', platform);
await fs.mkdir(destination, { recursive: true });
for (const file of release.files) await fs.copyFile(file.file, path.join(destination, file.name));
await fs.copyFile(
  path.join('dist', release.manifestName),
  path.join(destination, release.manifestName),
);
console.log(`Verified and staged ${platform} installers.`);
