'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { gunzipSync } = require('node:zlib');
const { execFileSync } = require('node:child_process');
const root = path.join(__dirname, '..');
async function prepare(platform = process.platform, arch = process.arch) {
  if (!['linux-x64', 'win32-x64', 'darwin-x64', 'darwin-arm64'].includes(`${platform}-${arch}`))
    throw new Error('Unsupported release platform.');
  const directory = path.join(root, 'release', 'tools', `${platform}-${arch}`);
  const base = 'https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1';
  await fs.mkdir(directory, { recursive: true });
  async function download(file) {
    const response = await fetch(`${base}/${file}`, { signal: AbortSignal.timeout(180000) });
    if (!response.ok) throw new Error(`Could not download ${file}: ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }
  const provenance = { supplier: base, platform, arch, files: {} };
  for (const name of ['ffmpeg', 'ffprobe']) {
    const data = await download(`${name}-${platform}-${arch}.gz`);
    const binary = gunzipSync(data);
    await fs.writeFile(path.join(directory, name + (platform === 'win32' ? '.exe' : '')), binary, {
      mode: 0o755,
    });
    provenance.files[name] = { sha256: createHash('sha256').update(binary).digest('hex') };
  }
  for (const name of ['LICENSE', 'README'])
    await fs.writeFile(path.join(directory, name), await download(`${platform}-${arch}.${name}`));
  await fs.writeFile(
    path.join(directory, 'provenance.json'),
    JSON.stringify(provenance, null, 2) + '\n',
  );
  await verify(directory, platform, arch, true);
  console.log(`Prepared offline video tools for ${platform}-${arch}`);
}
async function verify(directory, platform, arch, execute = false) {
  for (const name of ['ffmpeg', 'ffprobe', 'LICENSE', 'README', 'provenance.json'])
    await fs.access(
      path.join(
        directory,
        ['ffmpeg', 'ffprobe'].includes(name) && platform === 'win32' ? name + '.exe' : name,
      ),
    );
  const provenance = JSON.parse(await fs.readFile(path.join(directory, 'provenance.json'), 'utf8'));
  if (provenance.platform !== platform || provenance.arch !== arch)
    throw new Error('Video tools do not match the installer platform.');
  for (const name of ['ffmpeg', 'ffprobe']) {
    const binary = path.join(directory, name + (platform === 'win32' ? '.exe' : ''));
    const digest = createHash('sha256')
      .update(await fs.readFile(binary))
      .digest('hex');
    if (digest !== provenance.files[name].sha256)
      throw new Error(`Video tool integrity check failed: ${name}`);
    if (execute && platform === process.platform && arch === process.arch) {
      execFileSync(binary, ['-version'], { stdio: 'pipe', timeout: 30000, windowsHide: true });
      if (name === 'ffmpeg') {
        const encoders = execFileSync(binary, ['-hide_banner', '-encoders'], {
          encoding: 'utf8',
          timeout: 30000,
          windowsHide: true,
        });
        if (!/\blibx264\b/.test(encoders) || !/\baac\b/.test(encoders))
          throw new Error('FFmpeg must include libx264 and AAC.');
      }
    }
  }
}
module.exports = { prepare, verify };
if (require.main === module) {
  const args = process.argv.slice(2);
  const option = (name, fallback) =>
    args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
  prepare(option('--platform', process.platform), option('--arch', process.arch)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
