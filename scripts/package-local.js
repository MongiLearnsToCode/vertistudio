'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { createPackage } = require('@electron/asar');
const { publishBuild } = require('./local-install');
const root = path.join(__dirname, '..');
async function main() {
  if (process.platform !== 'linux')
    throw new Error(
      'The portable local packaging command targets Linux. Use build:win or build:mac on those platforms.',
    );
  const packages = new Set();
  async function resolvePackage(name, from) {
    let current = from;
    while (true) {
      const candidate = path.join(current, 'node_modules', ...name.split('/'));
      try {
        await fs.access(path.join(candidate, 'package.json'));
        return candidate;
      } catch {
        /* Match Node's search through ancestor node_modules directories. */
      }
      const parent = path.dirname(current);
      if (parent === current) return null;
      current = parent;
    }
  }
  async function collect(directory, rootNames) {
    const manifest = JSON.parse(await fs.readFile(path.join(directory, 'package.json'), 'utf8'));
    const names = new Set(
      rootNames || [
        ...Object.keys(manifest.dependencies || {}),
        ...Object.keys(manifest.optionalDependencies || {}),
        ...Object.keys(manifest.peerDependencies || {}),
      ],
    );
    for (const name of names) {
      const source = await resolvePackage(name, directory);
      if (!source) {
        if (manifest.dependencies?.[name]) throw new Error(`Missing runtime dependency: ${name}`);
        continue;
      }
      if (packages.has(source)) continue;
      packages.add(source);
      await collect(source);
    }
  }
  // The renderer is bundled. Only imports left in the main bundle need modules at runtime.
  const bundle = await fs.readFile(path.join(root, 'out', 'main', 'index.js'), 'utf8');
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  const roots = new Set();
  for (const match of bundle.matchAll(/\b(?:require|import)\(["']([^"']+)["']\)/g)) {
    const specifier = match[1];
    const name = specifier.startsWith('@')
      ? specifier.split('/').slice(0, 2).join('/')
      : specifier.split('/')[0];
    if (manifest.dependencies?.[name]) roots.add(name);
  }
  await collect(root, [...roots]);
  const staging = await fs.mkdtemp(path.join(os.tmpdir(), 'verti-package-'));
  const output = path.join(root, 'dist', 'Verti Studio-linux');
  await fs.mkdir(path.dirname(output), { recursive: true });
  const runtime = await fs.mkdtemp(path.join(path.dirname(output), '.verti-build-'));
  try {
    await fs.cp(path.join(root, 'out'), path.join(staging, 'out'), { recursive: true });
    await fs.cp(path.join(root, 'resources'), path.join(staging, 'resources'), { recursive: true });
    await fs.copyFile(path.join(root, 'package.json'), path.join(staging, 'package.json'));
    await fs.copyFile(path.join(root, 'LICENSE'), path.join(staging, 'LICENSE'));
    for (const source of [...packages].sort()) {
      const target = path.join(staging, path.relative(root, source));
      await fs.cp(source, target, {
        recursive: true,
        filter: (file) => !path.relative(source, file).split(path.sep).includes('node_modules'),
      });
    }
    await fs.cp(path.join(root, 'node_modules', 'electron', 'dist'), runtime, { recursive: true });
    await fs.rm(path.join(runtime, 'resources', 'default_app.asar'), { force: true });
    await createPackage(staging, path.join(runtime, 'resources', 'app.asar'));
    await fs.rename(path.join(runtime, 'electron'), path.join(runtime, 'verti-studio'));
    await fs.chmod(path.join(runtime, 'verti-studio'), 0o755);
    await fs.copyFile(path.join(root, 'README.md'), path.join(runtime, 'README.md'));
    await fs.copyFile(path.join(root, 'resources', 'icon.png'), path.join(runtime, 'icon.png'));
    await publishBuild(runtime, output);
    console.log(
      'Local build refreshed. If the app menu has been linked, restart Verti Studio to use it.',
    );
    console.log(`Packaged local app: ${path.join(output, 'verti-studio')}`);
  } finally {
    await fs.rm(staging, { recursive: true, force: true });
    await fs.rm(runtime, { recursive: true, force: true });
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
