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

"$app_binary" --smoke-test
