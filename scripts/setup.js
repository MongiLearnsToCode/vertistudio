const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const envExample = path.join(root, '.env.example');
const envFile = path.join(root, '.env');
const iconFile = path.join(root, 'resources', 'icon.png');

function step(label, fn) {
  process.stdout.write(`• ${label}... `);
  try {
    const result = fn();
    process.stdout.write(`${result || 'done'}\n`);
  } catch (err) {
    process.stdout.write('failed\n');
    console.error(`  ${err.message}`);
    process.exitCode = 1;
  }
}

step('Local .env', () => {
  if (fs.existsSync(envFile)) return 'already present';
  if (!fs.existsSync(envExample)) throw new Error('.env.example missing');
  fs.copyFileSync(envExample, envFile);
  return 'copied from .env.example';
});

step('Placeholder icon', () => {
  if (fs.existsSync(iconFile)) return 'already present';
  const res = spawnSync(
    process.execPath,
    [path.join(root, 'scripts', 'generate-placeholder-icon.js')],
    {
      cwd: root,
      stdio: 'inherit',
    },
  );
  if (res.status !== 0) throw new Error(`icon generator exited with code ${res.status}`);
  return 'generated resources/icon.png';
});

console.log('');
console.log('Next steps:');
console.log('  1. `npm run dev` to launch.');
console.log('  2. Install FFmpeg and FFprobe, then import a video in Studio.');
