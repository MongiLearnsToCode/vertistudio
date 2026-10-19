'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { Arch } = require('builder-util');
const { verify } = require('./prepare-release-tools');
module.exports = async function afterPack(context) {
  const platform = context.electronPlatformName;
  const arch = Arch[context.arch];
  const tools = path.join(__dirname, '..', 'release', 'tools', `${platform}-${arch}`);
  await verify(tools, platform, arch);
  const resources =
    platform === 'darwin'
      ? path.join(
          context.appOutDir,
          context.packager.appInfo.productFilename + '.app',
          'Contents',
          'Resources',
        )
      : path.join(context.appOutDir, 'resources');
  await fs.cp(tools, path.join(resources, 'tools'), { recursive: true });
  await fs.writeFile(
    path.join(resources, 'release.json'),
    JSON.stringify({
      macSigned: platform === 'darwin' && Boolean(process.env.CSC_LINK),
      tools: `${platform}-${arch}`,
    }),
  );
};
