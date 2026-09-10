# CleanSlate Desktop

React + Electron + TypeScript starter with a bundled FFmpeg binary.

## What is included

- Electron main and preload code in TypeScript with a React renderer
- `ffmpeg-static` wired into the main process
- A preload bridge for safe renderer access
- An Electron Builder packaging config that unpacks the FFmpeg binary
- Drag-and-drop and system-picker support for common image and video files
- A deduplicated media queue with file type, extension, size, and source details

## Scripts

Start with `npm install`, then use:

- `npm run dev` starts the Electron app in development mode
- `npm run build` bundles the app into `out/`
- `npm run preview` previews the production build
- `npm run dist` builds and packages installers into `release/`
- `npm run typecheck` runs a TypeScript-only check

## Media queue

The first media workflow accepts image and video files through drag-and-drop or the native system
file picker. Files are listed locally in the renderer and are not modified yet. The `Remove
metadata` action is intentionally a placeholder for the next FFmpeg and EXIF processing step.

If Electron reports `Error: Electron uninstall` during `npm run dev`, its platform
runtime was not downloaded. Confirm that `node_modules/electron/dist/` is missing,
then run `./node_modules/.bin/install-electron --no` with network access.

## FFmpeg note

`ffmpeg-static` downloads a platform-specific binary during install. If you package for another platform, reinstall dependencies on that target platform before building.
