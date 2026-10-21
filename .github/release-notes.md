## CleanSlate 0.1.3

- CleanSlate now checks GitHub Releases for a newer macOS version when it starts. If one is available, a notice in the file screen links to the release for a manual download and install.
- Dismissing the notice hides it for the current app session. It appears again on the next full quit and launch if the newer release is still available. Closing and reopening the window in the same session keeps it hidden.

The update notice begins with 0.1.3. Earlier versions cannot announce this release; install 0.1.3 manually to receive notices about future releases. The check contacts GitHub for release information, sends no media files, and does not interrupt cleaning when offline.

CleanSlate removes metadata from images and videos locally. Download the DMG matching your Mac: `arm64` for Apple silicon or `x64` for Intel. Files are processed on your Mac with bundled FFmpeg and ExifTool, with SVG files cleaned directly; the app has no media upload or analytics feature. See the [README](https://github.com/alejordanze/cleanslate#readme) for usage and format limitations.

This release is **unsigned and not notarized**. We have not paid the [US$99/year Apple Developer Program membership](https://developer.apple.com/programs/) or set up Developer ID signing and notarization for this independent project. macOS cannot verify the developer identity or Apple's checks for this app, and may block it on first launch. If you trust this download, try to open CleanSlate, then use **System Settings → Privacy & Security → Open Anyway**. [Apple explains this process](https://support.apple.com/en-us/102445).

Each DMG has a matching SHA-256 checksum file. After downloading the DMG and checksum file for your architecture, run `shasum -a 256 -c SHA256SUMS-arm64.txt` or `shasum -a 256 -c SHA256SUMS-x64.txt` in the download folder. A checksum confirms the DMG matches the listed file; it is not a substitute for code signing.

For releases built while this repository is public, GitHub Actions also creates a build provenance attestation for each DMG. After installing the [GitHub CLI](https://cli.github.com/), verify your downloaded file with `gh attestation verify CleanSlate-0.1.3-arm64.dmg --repo alejordanze/cleanslate --signer-workflow alejordanze/cleanslate/.github/workflows/release.yml` (substitute your DMG filename). This verifies which workflow produced that exact file; it does not replace Apple signing or notarization.
