#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 path/to/CleanSlate.dmg" >&2
  exit 2
fi

dmg_path="$1"
mount_dir="$(mktemp -d "${TMPDIR:-/tmp}/cleanslate-dmg.XXXXXX")"
mounted=false

cleanup() {
  if [[ "$mounted" == true ]]; then
    for attempt in 1 2 3 4 5; do
      if hdiutil detach "$mount_dir" -quiet; then
        mounted=false
        break
      fi
      sleep 2
    done
    if [[ "$mounted" == true ]]; then
      hdiutil detach "$mount_dir" -force -quiet
    fi
  fi
  rmdir "$mount_dir"
}
trap cleanup EXIT

hdiutil verify "$dmg_path" >/dev/null
hdiutil attach "$dmg_path" -nobrowse -readonly -mountpoint "$mount_dir" -quiet
mounted=true

app_binary="$mount_dir/CleanSlate.app/Contents/MacOS/CleanSlate"
if [[ ! -x "$app_binary" ]]; then
  echo "CleanSlate executable is missing from the DMG." >&2
  exit 1
fi

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source_icon="$project_dir/icons/cleanslate.icns"
for embedded_icon in "$mount_dir/CleanSlate.app/Contents/Resources/icon.icns" "$mount_dir/.VolumeIcon.icns"; do
  if [[ ! -f "$embedded_icon" ]] || ! cmp -s "$source_icon" "$embedded_icon"; then
    echo "The DMG does not contain the CleanSlate icon at $embedded_icon." >&2
    exit 1
  fi
done

"$app_binary" --smoke-test
