## CleanSlate 0.1.2

- SVG files now have their metadata removed while keeping the drawing intact.
- Processing errors are clearer and no longer expose internal file paths. Long messages wrap cleanly beside the action button.
- Choose **Remember this choice for next time** when saving cleaned files, or select **Save output setting** in **Settings**. CleanSlate remembers your choice between launches and skips the output prompt on later cleans. Choose **Ask me each time** to bring the prompt back.
- See which files were cleaned directly in the file list, including whether a new copy was saved or the original was updated.
- A quieter heading and custom window bar keep the focus on your files. The gear icon opens Settings, and the window controls are at the top left.
- File rows now use a red trash icon, action buttons use the new white arrow, and the macOS app icon has a soft blue background for contrast.

CleanSlate removes metadata from images and videos locally. Download the DMG matching your Mac: `arm64` for Apple silicon or `x64` for Intel. Files are processed on your Mac with bundled FFmpeg and ExifTool, with SVG files cleaned directly; the app has no media upload or analytics feature. See the [README](https://github.com/alejordanze/cleanslate#readme) for usage and format limitations.

This release is **unsigned and not notarized**. We have not paid the [US$99/year Apple Developer Program membership](https://developer.apple.com/programs/) or set up Developer ID signing and notarization for this independent project. macOS cannot verify the developer identity or Apple's checks for this app, and may block it on first launch. If you trust this download, try to open CleanSlate, then use **System Settings → Privacy & Security → Open Anyway**. [Apple explains this process](https://support.apple.com/en-us/102445).

Each DMG has a matching SHA-256 checksum file. After downloading the DMG and checksum file for your architecture, run `shasum -a 256 -c SHA256SUMS-arm64.txt` or `shasum -a 256 -c SHA256SUMS-x64.txt` in the download folder. A checksum confirms the DMG matches the listed file; it is not a substitute for code signing.

For releases built while this repository is public, GitHub Actions also creates a build provenance attestation for each DMG. After installing the [GitHub CLI](https://cli.github.com/), verify your downloaded file with `gh attestation verify CleanSlate-0.1.2-arm64.dmg --repo alejordanze/cleanslate --signer-workflow alejordanze/cleanslate/.github/workflows/release.yml` (substitute your DMG filename). This verifies which workflow produced that exact file; it does not replace Apple signing or notarization.
