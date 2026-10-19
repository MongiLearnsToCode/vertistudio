// Rename the app in one command.
//   npm run rebrand -- --name "Acme Notes" --id com.acme.notes [--description "..."] [--author "You <you@x.com>"]
// Patches package.json, electron-builder.yml, the window title in
// src/renderer/index.html, and the README H1. Safe to re-run.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const write = (p, s) => fs.writeFileSync(path.join(root, p), s);

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[key] = true;
    else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

const kebab = (s) =>
  String(s)
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_:]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

const args = parseArgs(process.argv.slice(2));
if (args.help || typeof args.name !== 'string' || typeof args.id !== 'string') {
  console.error('Usage: npm run rebrand -- --name "Acme Notes" --id com.acme.notes');
  console.error('                         [--description "..."] [--author "You <you@example.com>"]');
  process.exit(args.help ? 0 : 1);
}
if (!/^[a-zA-Z][\w-]*(\.[a-zA-Z][\w-]*)+$/.test(args.id)) {
  console.error(`--id must look like com.yourname.app (got "${args.id}")`);
  process.exit(1);
}

const productName = args.name.trim();
const pkg = JSON.parse(read('package.json'));
pkg.name = kebab(productName);
pkg.productName = productName;
if (typeof args.description === 'string') pkg.description = args.description;
if (typeof args.author === 'string') pkg.author = args.author;
write('package.json', JSON.stringify(pkg, null, 2) + '\n');

let yml = read('electron-builder.yml');
yml = yml.replace(/^appId: .*$/m, `appId: ${args.id}`);
yml = yml.replace(/^productName: .*$/m, `productName: ${productName}`);
write('electron-builder.yml', yml);

let html = read('src/renderer/index.html');
html = html.replace(/<title>[^<]*<\/title>/, `<title>${productName}</title>`);
html = html.replace(/<div class="app-name">[^<]*<\/div>/, `<div class="app-name">${productName}</div>`);
write('src/renderer/index.html', html);

write('README.md', read('README.md').replace(/^# .*$/m, `# ${productName}`));

console.log(`Renamed to "${productName}" (${args.id}). Package name: ${pkg.name}`);
