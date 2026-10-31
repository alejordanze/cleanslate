## CleanSlate 0.1.5

- Windows x64 is available for the first time, with an NSIS installer alongside the Apple silicon and Intel Mac DMGs.
- The download page links to the Windows installer and its checksum when a release includes them.
- Language settings now describe the app menus without referring to macOS on Windows.

Video streams are copied without re-encoding. Data embedded inside a codec stream, such as H.264 SEI user data, may still remain even when it does not appear in the metadata comparison. Check sensitive output before sharing it.

CleanSlate removes metadata from images and videos locally. Download the DMG matching your Mac (`arm64` for Apple silicon or `x64` for Intel) or the `win-x64` EXE for Windows. Files are processed on your computer with bundled FFmpeg and ExifTool, with SVG files cleaned directly; the app has no media upload or analytics feature. See the [README](https://github.com/alejordanze/cleanslate#readme) for usage and format limitations.

This release is **unsigned and not notarized**. We have not paid the [US$99/year Apple Developer Program membership](https://developer.apple.com/programs/) or set up Developer ID signing and notarization for this independent project. macOS cannot verify the developer identity or Apple's checks for this app, and may block it on first launch. If you trust this download, try to open CleanSlate, then use **System Settings → Privacy & Security → Open Anyway**. [Apple explains this process](https://support.apple.com/en-us/102445).

Each DMG has a matching SHA-256 checksum file. After downloading the DMG and checksum file for your architecture, run `shasum -a 256 -c SHA256SUMS-arm64.txt` or `shasum -a 256 -c SHA256SUMS-x64.txt` in the download folder. A checksum confirms the DMG matches the listed file; it is not a substitute for code signing.

The Windows installer is also unsigned. SmartScreen may show an unknown publisher warning; verify the installer against `SHA256SUMS-win-x64.txt` and continue only if you trust the download. On Windows, `Get-FileHash .\CleanSlate-0.1.5-win-x64.exe -Algorithm SHA256` prints the value to compare with the checksum file.

For releases built while this repository is public, GitHub Actions also creates a build provenance attestation for each installer. After installing the [GitHub CLI](https://cli.github.com/), verify your downloaded file with `gh attestation verify CleanSlate-0.1.5-arm64.dmg --repo alejordanze/cleanslate --signer-workflow alejordanze/cleanslate/.github/workflows/release.yml` (substitute your installer filename). This verifies which workflow produced that exact file; it does not replace code signing or notarization.
