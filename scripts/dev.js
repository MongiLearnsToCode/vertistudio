'use strict';
const { spawn } = require('node:child_process');
const path = require('node:path');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const entry = path.join(
  path.dirname(require.resolve('electron-vite/package.json')),
  'bin',
  'electron-vite.js',
);
const child = spawn(process.execPath, [entry, 'dev', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env,
  cwd: path.join(__dirname, '..'),
  shell: false,
});
child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
