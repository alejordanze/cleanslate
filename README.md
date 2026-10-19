# CleanSlate

CleanSlate removes embedded metadata from images and videos on your Mac. Add files, choose whether to keep the originals, and clean them locally before sharing. No account or upload is required.

## Download for macOS

Download CleanSlate from the [GitHub Releases page](https://github.com/alejordanze/cleanslate/releases). Choose the `arm64` DMG for an Apple silicon Mac (M series) or the `x64` DMG for an Intel Mac. Open the DMG and drag CleanSlate into Applications.

The app is **unsigned and not notarized**. We have not joined the [Apple Developer Program, which costs US$99 per year](https://developer.apple.com/programs/), or set up the Developer ID signing and [notarization](https://developer.apple.com/developer-id/) process. We are keeping this independent project free of that recurring cost and setup for now. This means macOS cannot verify the developer identity or confirm that Apple has checked the download. If macOS blocks CleanSlate, try opening it once, then go to **System Settings → Privacy & Security → Open Anyway** and follow [Apple's instructions](https://support.apple.com/en-us/102445). Only do this for a download you trust; there is no need to disable Gatekeeper for the whole Mac.

Each release includes a SHA-256 checksum file for each DMG. Download the DMG and its matching `SHA256SUMS-arm64.txt` or `SHA256SUMS-x64.txt` into the same folder, then run one of these commands there:

```sh
shasum -a 256 -c SHA256SUMS-arm64.txt
shasum -a 256 -c SHA256SUMS-x64.txt
```

Use the command for your Mac's architecture. A matching checksum confirms the DMG matches the file listed on that release page; it does not replace code signing or notarization.

## Use CleanSlate

1. Drag images or videos into the window, or choose **Attach files**.
2. Select **Remove metadata** and choose **Save new cleaned copies** or **Replace the original files**.
3. Cleaned copies are saved beside the originals with `_cleaned` in the filename. Existing cleaned copies are replaced only after you confirm. Replacing originals cannot be undone, so try a copy first when a file is important.

Most images are re-encoded with bundled FFmpeg; this can change file size, quality, or color handling. HEIC, HEIF, and writable camera RAW files are copied and cleaned with bundled ExifTool instead. Video streams are copied without re-encoding while container and stream metadata are removed where FFmpeg supports it. The app reports files it could not clean.

Real-file tests cover PNG, JPEG, HEIC, DNG, TIFF, MP4, and MOV. The picker accepts additional image and video extensions, but their cleaning results have not all been verified. Some RAW and TIFF metadata is required for the image to remain readable and may remain after cleaning. CleanSlate does not clear filenames, Finder tags, macOS extended attributes, sidecar files, or information visible or audible in the media itself. It is not a secure deletion tool. Check sensitive output before sharing it.

## Privacy and verification

CleanSlate's processing flow uses local files and the bundled FFmpeg and ExifTool binaries, and works without an internet connection. The app has no account, cloud processing, analytics, telemetry, or automatic update mechanism in its source. It does not include an upload request for your media. If you save files in a folder synced by iCloud, Dropbox, or another service, that service may sync them independently of CleanSlate.

You can review the [source code](https://github.com/alejordanze/cleanslate), including the [file-processing code](src/main/metadata.ts) and [release workflow](.github/workflows/release.yml). Releases are built from a version tag in GitHub Actions. The workflow runs typechecks and tests, mounts and launches each macOS DMG, then publishes both architectures with checksums only after both builds pass. These checks make failures easier to catch; they are not an independent security audit. [Report a problem](https://github.com/alejordanze/cleanslate/issues) if a file retains sensitive metadata or behaves unexpectedly.

## Build and test locally

Use Node.js 22 or newer. Install dependencies with `npm ci`, then:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the desktop app for development |
| `npm run typecheck` | Check TypeScript types |
| `npm test` | Run unit and real-media metadata tests |
| `npm run build` | Build the app into `out/` |
| `npm run dist:mac -- --arm64` | Build an Apple silicon DMG in `release/` |
| `npm run dist:mac -- --x64` | Build an Intel DMG in `release/` |
| `scripts/smoke-dmg.sh release/CleanSlate-0.1.0-arm64.dmg` | Mount and smoke-test a locally built DMG |

`ffmpeg-static` downloads a platform-specific binary during dependency installation; ExifTool is also bundled. Install dependencies on the platform you are packaging for. The macOS icon is generated from `icons/logo-options/clear-folder.svg` with `npm run icon:mac`.

The [CI workflow](.github/workflows/ci.yml) runs on pushes to `main` and pull requests. To publish a macOS release, update the package version and [release notes](.github/release-notes.md), push the changes, then push a matching tag such as `v0.1.0`. The [release workflow](.github/workflows/release.yml) builds and publishes the unsigned DMGs; a tag push is a public release action.
