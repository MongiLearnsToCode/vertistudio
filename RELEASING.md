# Verti Studio releases

The app checks its Cloudflare HTTPS feed 15 seconds after startup and every six hours. Settings → App updates lets users check manually and opt into automatic downloads. Windows and signed macOS releases can install a downloaded update on normal quit. Linux requires an explicit restart and may request administrator authorization. Restart and install flushes project saves and refuses to interrupt an export. Offline errors do not prevent editing.

Installers contain Electron, application dependencies, FFmpeg and FFprobe. A supported desktop operating system supplies its normal graphics/audio libraries. No npm, account, API key or first-run download is required. Updating needs a connection; the downloaded installer also works offline.

## Release layout

- Site: https://vertistudio.clipverti.com
- Worker: `scripts/cloudflare/worker.mjs`, configured by `scripts/cloudflare/wrangler.jsonc`.
- Authenticated publishing is enabled with the app-specific `PUBLISH_TOKEN` Cloudflare secret in the connected Cloudflare account. The token is never sent to app users.
- Optional read-only entrypoint: `scripts/cloudflare/public-worker.mjs` (for disabling publishing while retaining downloads).
- Private R2 bucket: `verti-studio-releases`.
- Immutable files: `releases/X.Y.Z/<platform>/<filename>`.
- Update feeds: `updates/<platform>/latest*.yml`.
- Platforms: `win-x64`, `mac-x64`, `mac-arm64`, `linux-x64`.
- App installers: NSIS `.exe`, `.dmg` plus update `.zip`, `.deb` (and optional AppImage).

The Worker streams large downloads and supports byte ranges. Publishing uses authenticated multipart uploads; the public site grants no write access. Installers are checked against the builder's SHA-512 metadata before publication. Files finish uploading before their update feed changes. Each published version is immutable: bump the version for replacement files.

## First setup

1. The source repository is [MongiLearnsToCode/vertistudio](https://github.com/MongiLearnsToCode/vertistudio), with SSH URL `git@github.com:MongiLearnsToCode/vertistudio.git`. Clone it for a normal local Git checkout. Keep `.release-secrets`, `release`, `release-artifacts`, `dist`, `.env` and `node_modules` out of Git. Do not commit credentials or project videos.
2. The [CircleCI project](https://app.circleci.com/pipelines/github/MongiLearnsToCode/vertistudio) is connected to **main** using `.circleci/config.yml`. Its first checks workflow passed on commit `81dd3b5`. Ensure the integration delivers tag events. The Windows and macOS executors must be available to the organization.
3. The CircleCI organization context **verti-studio-publishing** is configured with **VERTI_PUBLISH_TOKEN** and restricted to the **vertistudio** project. Only the publishing job receives this context. To replace the value, use CircleCI's masked secret input or a password manager; never paste it into a commit, terminal command argument, or chat.
4. For signed macOS builds, add CircleCI project environment variables `MAC_CSC_LINK`, `MAC_CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID`. These require an Apple Developer account. Without them, the build produces unsigned installers: update checks still run, automatic installation is disabled, and Gatekeeper may block opening them.
5. Optional Windows signing uses CircleCI project environment variables `WIN_CSC_LINK` and `WIN_CSC_KEY_PASSWORD`. Without these, Windows may show an unrecognized publisher warning. Signing certificates may have additional issuer-specific requirements.

CircleCI runs checks on branch pushes. Stable version tags run four installer jobs: Linux x64, Windows x64, macOS arm64 and macOS x64. Both Mac jobs use an Apple Silicon runner; Intel packages are cross-packaged with Intel Electron and video binaries. Each job verifies its artifacts and saves them to a distinct workspace directory. Publishing waits for all four jobs and revalidates every platform's checksums before uploading. The publishing job is serialized to prevent overlapping release uploads. GitHub Actions workflows are removed.

The configuration uses the documented [Windows Server 2022 executor](https://circleci.com/docs/guides/execute/using-windows/) and [M4 Pro macOS executor](https://circleci.com/docs/guides/execute/using-macos/). CircleCI's config compiler has accepted the configuration. Native Windows and Mac installation checks remain necessary.

The first tagged build, `v0.1.1`, successfully built and verified Windows and Linux installers. Its Mac jobs failed because an empty signing-certificate variable was treated as a path. Version 0.1.2 corrected the signing environment and built Linux and Windows, but the Mac jobs attempted both architectures while each job prepared only one architecture of video tools. Version 0.1.3 removes the fixed architecture list so each Mac job builds only its requested architecture. Neither failed tag was published to the download site because publication waits for every platform.

The publishing secret is already configured in Cloudflare. To rotate it, generate a fresh app-specific value, update the Worker's `PUBLISH_TOKEN` with `npx wrangler secret put PUBLISH_TOKEN --config scripts/cloudflare/wrangler.jsonc`, then update both the CircleCI context and the ignored local credential file. Never commit a secret to the Wrangler configuration.

## Publish an update

1. Change the version with `npm version patch` (or `minor` / `major`) in the Git repository.
2. Push the resulting commit and tag: `git push --follow-tags`.
3. CircleCI runs checks, prepares and verifies FFmpeg/FFprobe, builds installers, and uploads them to Cloudflare. Existing users discover the new version automatically.

The tag must exactly match `v` plus the package version. Use stable `X.Y.Z` versions. A failed platform build prevents publication. Previously installed apps and projects continue to work while a release is being built. Avoid rebuilding a version whose files have already been published; use a new version instead.

## Build on an individual platform

With Node.js 22 and the dependencies installed:

```sh
npm ci
npm run release:tools
npm run typecheck
npm run lint
npm run test
npm run build:deb   # Debian/Ubuntu x64
# npm run build:win # Windows x64
# npm run build:mac -- --arm64  # Apple Silicon Mac
# npm run build:mac -- --x64   # Intel Mac
```

`release:tools` downloads the build-time video binaries and their original license/build notes from the supplier's pinned release, records SHA-256 provenance and executes native smoke checks (including H.264/AAC encoder availability). The installer build verifies the recorded hashes and includes the tools. The local development package retains its existing build/restart workflow and does not replace itself from the public feed.

Publish a completed platform build with `npm run release:publish -- dist linux-x64 X.Y.Z` (substitute the correct platform and version). It reads the ignored credential file locally or `VERTI_PUBLISH_TOKEN` in CI. Do not run it against unverified or partially built installers.

## Video-tool notices and source access

FFmpeg/FFprobe are separate executables, not linked into the application. Their original GPL license and supplier build notes are included under `resources/tools`. The supplier is https://github.com/eugeneware/ffmpeg-static/releases/tag/b6.1.1; the build notes identify the individual FFmpeg and third-party library versions. Preserve all notices. Before distributing a release, provide access to the corresponding sources and build materials for the exact video binaries supplied, alongside the downloads, according to their license. A binary checksum and a link to a different FFmpeg version do not replace corresponding source access.

## Current local artifact

`dist/verti-studio-0.1.0-amd64.deb` is published on the Cloudflare site, together with its Linux updater feed. It includes the updater configuration and video tools. A full public download was verified against both SHA-256 release metadata and the updater's SHA-512 manifest (142,386,448 bytes). Range requests, download redirects, uncached update feeds, and rejection of unauthenticated uploads were also checked on the live site. It has not been installed on a clean machine. Windows and macOS installers have not yet been built; connecting and running CircleCI remains necessary. Use a new version (for example 0.1.1) for the first automated release; published 0.1.0 files cannot be replaced.

## Verification limits

Unit tests validate update states, opt-in downloads, busy-export blocking, feed hashes, publication order and download-host access controls. Native installation, restart, OS permissions and code signing must also be tested on each target OS using installed copies. Test an upgrade between two distinct versions before a public launch. Developer/local builds deliberately report that they are updated by rebuilding, rather than modifying the user's source checkout.
