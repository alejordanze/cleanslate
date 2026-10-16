# CleanSlate Desktop

React + Electron desktop app for removing metadata from images and videos with a bundled FFmpeg binary.

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
- `npm run dist:mac -- --arm64` builds an Apple silicon DMG; use `--x64` for Intel
- `scripts/smoke-dmg.sh release/CleanSlate-0.1.0-arm64.dmg` mounts the DMG, launches the packaged app in hidden smoke-test mode, and detaches it
- `npm test` runs format intake and processing unit tests plus real PNG, JPEG, HEIC, DNG, TIFF, MP4, and MOV metadata-removal checks
- `npm run typecheck` runs a TypeScript-only check

## Media queue

The media workflow accepts image and video files through drag-and-drop or the native system file
picker. Choosing `Remove metadata` asks whether to replace the originals or create new cleaned
copies beside them with `_cleaned` added to the filename. Video streams are copied without
re-encoding. HEIC, HEIF, and writable camera RAW formats are copied and cleaned with the bundled
ExifTool so their image data stays intact. Other images are re-encoded with FFmpeg. RAW formats
retain metadata required to decode the image; optional tags such as artist and comments are removed.

If Electron reports `Error: Electron uninstall` during `npm run dev`, its platform
runtime was not downloaded. Confirm that `node_modules/electron/dist/` is missing,
then run `./node_modules/.bin/install-electron --no` with network access.

## FFmpeg note

`ffmpeg-static` downloads a platform-specific binary during install. ExifTool is also bundled for
HEIC, HEIF, and writable RAW files. If you package for another platform, reinstall dependencies on
that target platform before building.

## macOS release

The CI workflow runs typecheck, unit tests, and a renderer build on pushes to `main` and pull requests. The release workflow runs when an existing `v<package version>` tag is pushed, or when it is selected through **Run workflow**. It builds separate Apple silicon and Intel DMGs on matching macOS runners, mounts and launches each DMG, checks its bundled FFmpeg and ExifTool, and publishes both DMGs plus SHA-256 checksums to a GitHub release only after both builds pass.

For version `0.1.0`, push the commits to `main`, then create and push tag `v0.1.0`. The tag must match `package.json`. The release workflow uses the repository's `GITHUB_TOKEN` with `contents: write`; no extra GitHub token is needed.

These DMGs are intentionally unsigned and not notarized. macOS may block the first launch. If you trust the download, try opening the app, then choose **System Settings → Privacy & Security → Open Anyway**, as described by [Apple](https://support.apple.com/en-us/102445). Do not use an unsigned build when you need a normal first-launch experience for end users.
