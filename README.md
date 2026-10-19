# Verti Studio

A separate local desktop app rebuilt on [hassancs91/desktop-app-starter](https://github.com/hassancs91/desktop-app-starter), using Electron, React, TypeScript, Tailwind, and its typed preload bridge. The original Vertical Studio project is not a runtime dependency and has not been modified.

## Run

Requires Node.js 22.12+ (or 20.19+) and FFmpeg/FFprobe with x264 and AAC.

```sh
npm ci
npm run build
npm start
```

For development: `npm run dev`. On Linux, the included **Launch Verti Studio.sh** starts an already built app. Keep the source folder and its node_modules together.

Set `FFMPEG_PATH` and `FFPROBE_PATH` to absolute executable paths if automatic discovery cannot find them. Hardware options indicate FFmpeg encoder availability; actual GPU support still depends on the device and drivers.

## Workflow

1. Import videos using the button, drag and drop, or Ctrl/Cmd+O. Wide and vertical sources are accepted.
2. Select a queue entry to edit it. Drag the playhead or scroll over it; use the frame buttons for fine adjustments.
3. Set in/out at the playhead, drag either point's slider, or type `HH:MM:SS.mmm`, `MM:SS.mmm`, or seconds.
4. Review with **Play cut**. The source preview keeps its available width and adjusts its height to match the video’s aspect ratio. Portrait footage uses three columns on desktop: source preview, details/cut controls/queue, and export settings. Smaller windows stack the panels. Export framing is chosen separately.
5. Choose **Original aspect ratio** to keep the source dimensions, or **Vertical (9:16)** with Automatic, Crop, Pad, or Blur background framing. Choose **Both (original + vertical)** to export two labeled MP4 files for each cut in one batch; the vertical version uses the selected framing style. Select quality and encoder/frame-rate options.
6. Choose an export folder and export. Crop, pad, and blur output 1080×1920 H.264 MP4 with AAC when audio exists. Keep original preserves dimensions.

Select any short and use **New short** to create another independent range from the same source, without importing it again. **Clear in** resets the start to zero, **Clear out** resets the end to the source duration, and **Clear in/out** restores the full source length. Clearing trim points keeps the playhead in place. Use **Queue again** to re-export or retry. Jobs run one at a time; individual or batch cancellation stops encoding and removes its partial output. Export names are unique, so existing files are preserved. Completed sizes are measured; queued sizes are estimates.

For codecs Electron cannot play directly, FFmpeg prepares a smaller compatible local preview. Long videos can take time to prepare. Exports always encode the original source; timing is limited by its frames. A local protocol supports range requests and serves only opaque tokens for authorized source/preview files. File access remains restricted to user-picked files/folders and this app's data directory.

## Preferences and data

Settings provides System, Light, Dark, Slate, Midnight, and High contrast appearances and two display densities. Quality, framing, encoder, and frame-rate preferences persist independently of Vertical Studio. Choose a **Default export folder** in Settings to reuse a destination across restarts. The app remembers permission for that chosen folder; other locations still require the native folder picker. The Studio destination button overrides the default for the current project. Missing, moved, or unwritable destinations are checked before export. Hover over the disabled Export button, or focus its wrapper with the keyboard, to see everything that is required before exporting.

User data is stored in the **Verti Studio** directory under Electron's platform app-data directory. Projects save automatically after a short pause in editing, starting with your first video import. Project names, cut ranges, and export settings are kept locally. **Save project** (Ctrl/Cmd+S) also saves immediately. The first automatic save copies each source video once into the project under `userData/projects`; additional shorts reuse that copy. This uses disk space equal to the source footage for each project, and does not modify the original. Use **Open saved project** to continue after restarting, even if the original footage was moved or deleted. Saved cuts reopen ready to export using your default export folder, if configured. The project bar shows Saving, All changes saved, or a visible save error with a retry button. Autosave runs in the background while you edit. Switching projects and closing the window finish pending saves first; a save failure keeps the current project open. Temporary converted previews are removed at shutdown where possible; an interrupted app can leave cached files under its user-data `previews` directory. No account, API key, upload, or network connection is required for video work.

## Portable Linux app

`npm run package:local` builds a self-contained Linux folder at `dist/Verti Studio-linux`. Run its `verti-studio` executable. Keep the entire folder together; it includes Electron and does not require Node.js to launch. FFmpeg and FFprobe remain external prerequisites. Run **Install Verti Studio.sh** once to link `~/.local/opt/verti-studio` to the local build and add the applications-menu entry. An existing installation is preserved in a backup folder. **Update Verti Studio.sh** performs the same one-time setup for an existing installation.

After setup, future `npm run package:local` builds automatically become the app-menu version. Just close and reopen Verti Studio after a build; no separate update command is needed. Builds are staged before replacing the previous build, and saved projects and settings stay in user data. Keep this project folder in its current location: the menu link depends on its `dist/Verti Studio-linux` directory. This workflow is for local development; portable copies elsewhere remain independent.

## Checks and builds

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Installer commands remain available: `npm run build:linux`, `npm run build:win`, `npm run build:mac`, and `npm run build:unpack`. Prepare the bundled video tools with `npm run release:tools` first. Cloudflare hosts downloads and update feeds; signing credentials are optional build settings. CircleCI builds installers from stable version tags using `.circleci/config.yml`.

The starter's original MIT license is retained in LICENSE. Starter architecture guidance remains in CLAUDE.md and AGENTS.md. Video preset and trim behavior was carried over from the original MIT-licensed Vertical Studio application into typed services and React hooks/components.

## Installers and updates

Offline release packaging, Cloudflare hosting, opt-in automatic downloads, signing setup and the repeatable release workflow are documented in [RELEASING.md](RELEASING.md).
