'use strict';
const path = require('node:path');
const { linkLocalInstall } = require('./local-install');

async function main() {
  const result = await linkLocalInstall({ root: path.join(__dirname, '..') });
  console.log(
    'App menu linked to the local build. Future package:local builds appear after restarting Verti Studio.',
  );
  console.log(`Keep this project in place: ${path.join(__dirname, '..')}`);
  if (result.backup) console.log(`Previous installation preserved at: ${result.backup}`);
}
main().catch((error) => {
  console.error(`Could not link the installed app: ${error.message}`);
  console.error(
    'Run Install Verti Studio.sh once from your normal terminal after building the app.',
  );
  process.exitCode = 1;
});
