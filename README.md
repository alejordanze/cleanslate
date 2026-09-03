# CleanSlate Desktop

Electron + TypeScript starter with a bundled FFmpeg binary.

## What is included

- Electron main, preload, and renderer code in TypeScript
- `ffmpeg-static` wired into the main process
- A preload bridge for safe renderer access
- An Electron Builder packaging config that unpacks the FFmpeg binary

## Scripts

Start with `npm install`, then use:

- `npm run dev` starts the Electron app in development mode
- `npm run build` bundles the app into `out/`
- `npm run preview` previews the production build
- `npm run dist` builds and packages installers into `release/`
- `npm run typecheck` runs a TypeScript-only check

If Electron reports `Error: Electron uninstall` during `npm run dev`, its platform
runtime was not downloaded. Confirm that `node_modules/electron/dist/` is missing,
then run `./node_modules/.bin/install-electron --no` with network access.

## FFmpeg note

`ffmpeg-static` downloads a platform-specific binary during install. If you package for another platform, reinstall dependencies on that target platform before building.
