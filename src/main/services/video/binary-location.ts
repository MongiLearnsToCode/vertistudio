import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
export function binaryCandidates(
  name: string,
  platform: NodeJS.Platform,
  resources: string | undefined,
  searchPath: string,
  override?: string,
  home = os.homedir(),
): string[] {
  const filename = platform === 'win32' ? `${name}.exe` : name;
  return [
    resources ? path.join(resources, 'tools', filename) : undefined,
    override,
    ...[
      ...searchPath.split(path.delimiter),
      path.join(home, '.local', 'bin'),
      ...(platform === 'win32'
        ? []
        : ['/usr/local/bin', '/usr/bin', '/opt/homebrew/bin', '/snap/bin']),
    ]
      .filter(Boolean)
      .map((dir) => path.join(dir, filename)),
  ].filter((candidate): candidate is string => Boolean(candidate) && path.isAbsolute(candidate!));
}
export function resolveBinary(name: string): string {
  for (const candidate of binaryCandidates(
    name,
    process.platform,
    process.resourcesPath,
    process.env.PATH ?? '',
    process.env[`${name.toUpperCase()}_PATH`],
  )) {
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      /* Try the next installation. */
    }
  }
  throw new Error(
    `${name} was not found. Reinstall the offline installer, or install FFmpeg and FFprobe for a development build.`,
  );
}
