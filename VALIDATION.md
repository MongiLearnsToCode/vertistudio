# Validation — 19 October 2026

- TypeScript: `npm run typecheck` passed.
- Lint: `npm run lint` passed.
- Tests: `npm test` passed 40 tests; the optional FFmpeg integration test is skipped in the default suite.
- FFmpeg integration: `VERTI_TEST_FFMPEG=1 npm test -- src/main/services/video/__tests__/encode.integration.test.ts` passed. A generated wide video was cut between keyframes from 0.52s to 1.24s through Keep original, Crop, Pad and Blur, retaining audio and the expected output duration/dimensions.
- Production build: `npm run build` passed.
- Portable Linux app: assembled at `dist/Verti Studio-linux`. Executable permissions, package identity, compiled main/preload/renderer, icon, and core runtime modules were checked inside app.asar.
- Electron 41.3.0 Linux distribution: SHA256 matched the official Electron release manifest.
- Original Vertical Studio: file hashes matched the pre-migration snapshot; no source/project files changed.

The normal development launcher reached application startup and window creation. Follow-up desktop smoke checks could not complete because sandbox restrictions blocked native startup or local server access, so full graphical playback/export and screenshots have not been verified. React control tests and real FFmpeg integration checks passed. No physical GPU, Windows or macOS testing was performed.

The standard electron-builder unpack command was blocked while spawning its dependency collector in this environment. The included portable local packager uses filesystem dependency resolution and a standard Electron app.asar instead. It can be rebuilt with `npm run package:local` on Linux.
