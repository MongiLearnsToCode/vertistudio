import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
const origin = 'https://verti-studio.oligasibanda.workers.dev';
const platforms = ['win-x64', 'mac-x64', 'mac-arm64', 'linux-x64'];
export async function digest(file, algorithm) {
  const hash = createHash(algorithm);
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest(algorithm === 'sha512' ? 'base64' : 'hex');
}
export async function collectRelease(directory, platform, version, base = origin) {
  if (!platforms.includes(platform) || !/^\d+\.\d+\.\d+$/.test(version))
    throw new Error('Use a supported platform and stable X.Y.Z version.');
  const names = await fs.readdir(directory);
  const manifestName = platform.startsWith('mac')
    ? 'latest-mac.yml'
    : platform === 'linux-x64'
      ? 'latest-linux.yml'
      : 'latest.yml';
  const manifest = yaml.load(await fs.readFile(path.join(directory, manifestName), 'utf8'));
  if (manifest.version !== version || !Array.isArray(manifest.files) || !manifest.files.length)
    throw new Error('Update manifest does not match the release version.');
  const files = [];
  const prefix = `releases/${version}/${platform}`;
  for (const name of names) {
    if (
      !name.startsWith(`verti-studio-${version}-`) ||
      !/[.](exe|dmg|zip|deb|AppImage|blockmap)$/.test(name)
    )
      continue;
    const file = path.join(directory, name);
    const stat = await fs.stat(file);
    files.push({
      file,
      name,
      key: `${prefix}/${name}`,
      size: stat.size,
      sha256: await digest(file, 'sha256'),
    });
  }
  for (const entry of manifest.files) {
    if (typeof entry.url !== 'string' || entry.url !== path.basename(entry.url))
      throw new Error('Manifest must reference local build artifacts.');
    const item = files.find((file) => file.name === decodeURIComponent(entry.url));
    if (
      !item ||
      entry.sha512 !== (await digest(item.file, 'sha512')) ||
      (entry.size !== undefined && entry.size !== item.size)
    )
      throw new Error(`Artifact checksum or size mismatch: ${entry.url}`);
    entry.url = `${base}/${item.key}`;
  }
  if (manifest.path) {
    const item = files.find((file) => file.name === decodeURIComponent(manifest.path));
    if (!item) throw new Error('Missing primary update artifact');
    manifest.path = `${base}/${item.key}`;
  }
  const extension = platform.startsWith('win')
    ? '.exe'
    : platform.startsWith('mac')
      ? '.dmg'
      : '.deb';
  const installer = files.find((file) => file.name.endsWith(extension));
  if (!installer) throw new Error(`Missing ${extension} installer`);
  return {
    files,
    manifestName,
    manifest: yaml.dump(manifest),
    release:
      JSON.stringify(
        { version, installer: installer.name, size: installer.size, sha256: installer.sha256 },
        null,
        2,
      ) + '\n',
  };
}
export async function publishRelease(directory, platform, version, transport) {
  const release = await collectRelease(directory, platform, version);
  // Versioned files finish before any client can discover the new manifest.
  for (const file of release.files) await transport.file(file.key, file.file);
  await transport.data(`releases/${version}/${platform}/${release.manifestName}`, release.manifest);
  await transport.data(`updates/${platform}/${release.manifestName}`, release.manifest);
  await transport.data(`updates/${platform}/release.json`, release.release);
  return release;
}
async function main() {
  const [directory, platform, version] = process.argv.slice(2);
  const token =
    process.env.VERTI_PUBLISH_TOKEN ??
    (
      await fs.readFile(
        process.env.VERTI_PUBLISH_TOKEN_FILE ?? '.release-secrets/publish-token',
        'utf8',
      )
    ).trim();
  async function request(action, key, method, body, extra = {}) {
    const url = new URL(`${origin}/_publish/${action}`);
    url.searchParams.set('key', key);
    for (const [key, value] of Object.entries(extra)) url.searchParams.set(key, String(value));
    const response = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}` },
      body,
      signal: AbortSignal.timeout(180000),
    });
    if (!response.ok)
      throw new Error(
        `Publishing failed (${response.status}) for ${key}. Existing public release metadata has not been promoted until its files finish.`,
      );
    return response.json();
  }
  const transport = {
    data: async (key, data) => {
      await request('object', key, 'PUT', data);
    },
    file: async (key, file) => {
      const { uploadId } = await request('start', key, 'POST');
      const input = await fs.open(file, 'r');
      const parts = [];
      try {
        const buffer = Buffer.alloc(16 * 1024 * 1024);
        let number = 1;
        while (true) {
          const { bytesRead } = await input.read(buffer, 0, buffer.length, null);
          if (!bytesRead) break;
          parts.push(
            await request('part', key, 'PUT', buffer.subarray(0, bytesRead), {
              uploadId,
              partNumber: number++,
            }),
          );
        }
        await request('complete', key, 'POST', JSON.stringify(parts), { uploadId });
      } catch (error) {
        await request('abort', key, 'DELETE', undefined, { uploadId }).catch(() => {});
        throw error;
      } finally {
        await input.close();
      }
    },
  };
  await publishRelease(directory, platform, version, transport);
  console.log(`Published Verti Studio ${version} for ${platform}: ${origin}`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
