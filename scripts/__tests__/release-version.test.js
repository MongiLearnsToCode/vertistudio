import { describe, expect, it } from 'vitest';
import versionGuard from '../check-release-version.js';
const { validateReleaseVersion } = versionGuard;
describe('CircleCI release versions', () => {
  it('allows branch checks and a matching stable release tag', () => {
    expect(() => validateReleaseVersion('1.2.3', undefined)).not.toThrow();
    expect(() => validateReleaseVersion('1.2.3', 'v1.2.3')).not.toThrow();
  });
  it('rejects tags for another version and non-stable versions', () => {
    expect(() => validateReleaseVersion('1.2.3', 'v1.2.4')).toThrow('tag must match');
    expect(() => validateReleaseVersion('1.2.3-beta.1', 'v1.2.3-beta.1')).toThrow('stable');
  });
});
