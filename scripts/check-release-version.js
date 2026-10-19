'use strict';
const { version } = require('../package.json');
function validateReleaseVersion(version, tag) {
  if (!/^\d+\.\d+\.\d+$/.test(version))
    throw new Error('Public releases require a stable X.Y.Z version.');
  if (tag && tag !== `v${version}`) throw new Error('The release tag must match package.json.');
}
module.exports = { validateReleaseVersion };
if (require.main === module) {
  validateReleaseVersion(version, process.env.CIRCLE_TAG);
  console.log(`Preparing Verti Studio ${version}`);
}
