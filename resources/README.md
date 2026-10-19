# App resources

This folder is the `buildResources` directory for `electron-builder`. Files placed here are picked up automatically when packaging.

## App icon

Place a single `icon.png` in this folder (≥ 512×512, ideally 1024×1024). `electron-builder` auto-derives:

- Windows: `.ico` (multiple sizes)
- macOS:   `.icns` (multiple resolutions)
- Linux:   uses the PNG directly

A purple placeholder ships with the template. To replace it:

1. Drop your own `icon.png` (1024×1024 recommended) into this folder.
2. Or run `node scripts/generate-placeholder-icon.js` to regenerate the placeholder.

## Optional: ship platform-native icons

For best results on macOS (especially for the dock), provide a hand-crafted `.icns`:

- Save `icon.icns` next to `icon.png`.
- Update `electron-builder.yml` `mac` section with `icon: resources/icon.icns`.

The same applies for `icon.ico` on Windows if you want a custom multi-resolution `.ico`.

## Notes

- This folder is **not** bundled into the app. It's only consumed at packaging time.
- For installer/uninstaller graphics on Windows, place `installerIcon.ico`, `uninstallerIcon.ico` here and configure them in `nsis:` of `electron-builder.yml`.
- For DMG background images on macOS, place `background.png` (or `@2x` variant) here and reference it from `dmg.background` in `electron-builder.yml`.
