import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { collectRelease } from '../publish-release.mjs';
const { version } = JSON.parse(await fs.readFile('package.json', 'utf8'));
const platforms = ['linux-x64', 'win-x64', 'mac-arm64', 'mac-x64'];
if (process.env.CIRCLE_TAG !== `v${version}`)
  throw new Error('Publishing requires a matching release tag.');
if (!process.env.VERTI_PUBLISH_TOKEN)
  throw new Error('Configure the verti-studio-publishing CircleCI context.');
// Validate every platform before uploading or promoting any public feed.
for (const platform of platforms)
  await collectRelease(path.join('release-artifacts', platform), platform, version);
for (const platform of platforms) {
  const result = spawnSync(
    process.execPath,
    ['scripts/publish-release.mjs', path.join('release-artifacts', platform), platform, version],
    { stdio: 'inherit', shell: false },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Publishing ${platform} failed.`);
}
