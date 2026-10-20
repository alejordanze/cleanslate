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

New releases built while this repository is public also have a GitHub build provenance attestation for each DMG. With the [GitHub CLI](https://cli.github.com/) installed, verify the downloaded file against the release workflow (replace the filename with the DMG you downloaded):

```sh
gh attestation verify CleanSlate-0.1.0-arm64.dmg \
  --repo alejordanze/cleanslate \
  --signer-workflow alejordanze/cleanslate/.github/workflows/release.yml
```

This checks that the exact DMG was produced by this repository's GitHub Actions release workflow. It does not mean Apple signed or notarized the app. The workflow skips attestations for private test releases; GitHub Free only supports them for public repositories.

## Use CleanSlate

1. Drag images or videos into the window, or choose **Attach files**.
2. Select **Remove metadata** and choose **Save new cleaned copies** or **Replace the original files**. Check **Remember this choice for next time**, or choose an output option in **Settings** and select **Save**. Once saved, CleanSlate uses that option directly on later cleans; choose **Ask me each time** in Settings to show the chooser again.
3. Cleaned copies are saved beside the originals with `_cleaned` in the filename. Existing cleaned copies are replaced only after you confirm. Replacing originals cannot be undone, so try a copy first when a file is important.

Most images are re-encoded with bundled FFmpeg; this can change file size, quality, or color handling. HEIC, HEIF, and writable camera RAW files are copied and cleaned with bundled ExifTool instead. SVG files are cleaned as XML: metadata, titles, descriptions, comments, and common editor annotations are removed while drawing elements are kept. Video streams are copied without re-encoding while container and stream metadata are removed where FFmpeg supports it. The app reports files it could not clean.

Real-file tests cover PNG, JPEG, HEIC, DNG, TIFF, SVG, MP4, and MOV. The picker accepts additional image and video extensions, but their cleaning results have not all been verified. Some RAW and TIFF metadata is required for the image to remain readable and may remain after cleaning. CleanSlate does not clear filenames, Finder tags, macOS extended attributes, sidecar files, or information visible or audible in the media itself. It is not a secure deletion tool. Check sensitive output before sharing it.

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
| `scripts/smoke-dmg.sh release/CleanSlate-0.1.1-arm64.dmg` | Mount and smoke-test a locally built DMG |

`ffmpeg-static` downloads a platform-specific binary during dependency installation; ExifTool is also bundled. Install dependencies on the platform you are packaging for. The macOS app and development Dock icons are generated from `icons/clear-folder.svg` with `npm run icon:mac`.

## Release a version

The [CI workflow](.github/workflows/ci.yml) runs on pushes to `main` and pull requests. Before the first automated release, configure GitHub:

1. Add **Repository admins** to the tag ruleset's bypass list with **Always allow**. The PAT acts as its admin owner when pushing the tag.
2. Create a fine-grained PAT under the admin account, limited to this repository with **Contents: Read and write**. Add it as an environment secret named `RELEASE_TAG_PAT` in a GitHub Actions environment named `release`. Restrict that environment to the `main` branch. The release job uses this PAT only to fetch and create the protected tag; its other GitHub API calls use `GITHUB_TOKEN`.

To publish a macOS release:

1. Update the version in `package.json` and `package-lock.json`, for example with `npm version patch --no-git-tag-version`. The `--no-git-tag-version` option leaves tag creation to the workflow.
2. Update the [release notes](.github/release-notes.md), then commit and push the changes to `main`. Wait for CI to pass.
3. In GitHub Actions, open **Release macOS DMGs**, choose **Run workflow** on `main`, and run it.

The [release workflow](.github/workflows/release.yml) reads the package version, creates its matching `v` tag, builds and checks both unsigned DMGs, and creates the GitHub Release after both builds pass. If a build fails after tagging, use **Re-run all jobs** on that workflow run to retry the same commit and tag. Only the repository owner can start or rerun this workflow. Releases start from the manual action because a PAT-created tag would otherwise trigger a second release run. No separate release branch or manual GitHub Release is needed.
