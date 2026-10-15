CleanSlate removes metadata from images and videos. Download the DMG matching your Mac: `arm64` for Apple silicon or `x64` for Intel.

This release is **unsigned and not notarized**. macOS may block it on first launch. If you trust this download, try to open CleanSlate, then use **System Settings → Privacy & Security → Open Anyway**. [Apple explains this process](https://support.apple.com/en-us/102445).

Each DMG has a matching SHA-256 checksum file. After downloading both files for your architecture, run `shasum -a 256 -c SHA256SUMS-arm64.txt` or `shasum -a 256 -c SHA256SUMS-x64.txt` in the download folder.
