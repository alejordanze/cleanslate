## CleanSlate 0.1.4

- View a file's embedded metadata before cleaning, then compare the original and cleaned fields from the file list. The comparison highlights key changes and lets you search and filter the full field list.
- Repeated metadata tags now appear separately in the comparison instead of being hidden as duplicates.
- More optional location, ownership, and descriptive metadata is removed from supported camera RAW, HEIC, and HEIF files. Structural fields remain to keep the original format readable; RAW camera make and model are retained because some software needs them to render the image.
- Cleaned JPEG, TIFF, MP4, and MOV files no longer gain certain writer comments or encoder tags during processing. Real-file checks also verify the cleaned files keep their original formats and can still be opened.
- The comparison explains why some fields remain for each file type, including RAW, HEIC/HEIF, SVG, other images, and videos.
- The app interface and macOS menus are available in English, Spanish, French, Simplified Chinese, German, Japanese, and Brazilian Portuguese. Choose a language in Settings or the app menu, or follow your Mac's language setting.
- The Remove All button now expands to fit its label in every supported language.

Video streams are copied without re-encoding. Data embedded inside a codec stream, such as H.264 SEI user data, may still remain even when it does not appear in the metadata comparison. Check sensitive output before sharing it.

CleanSlate removes metadata from images and videos locally. Download the DMG matching your Mac: `arm64` for Apple silicon or `x64` for Intel. Files are processed on your Mac with bundled FFmpeg and ExifTool, with SVG files cleaned directly; the app has no media upload or analytics feature. See the [README](https://github.com/alejordanze/cleanslate#readme) for usage and format limitations.

This release is **unsigned and not notarized**. We have not paid the [US$99/year Apple Developer Program membership](https://developer.apple.com/programs/) or set up Developer ID signing and notarization for this independent project. macOS cannot verify the developer identity or Apple's checks for this app, and may block it on first launch. If you trust this download, try to open CleanSlate, then use **System Settings → Privacy & Security → Open Anyway**. [Apple explains this process](https://support.apple.com/en-us/102445).

Each DMG has a matching SHA-256 checksum file. After downloading the DMG and checksum file for your architecture, run `shasum -a 256 -c SHA256SUMS-arm64.txt` or `shasum -a 256 -c SHA256SUMS-x64.txt` in the download folder. A checksum confirms the DMG matches the listed file; it is not a substitute for code signing.

For releases built while this repository is public, GitHub Actions also creates a build provenance attestation for each DMG. After installing the [GitHub CLI](https://cli.github.com/), verify your downloaded file with `gh attestation verify CleanSlate-0.1.4-arm64.dmg --repo alejordanze/cleanslate --signer-workflow alejordanze/cleanslate/.github/workflows/release.yml` (substitute your DMG filename). This verifies which workflow produced that exact file; it does not replace Apple signing or notarization.
