export function getBridge() {
  const bridge = window.cleanslate;

  if (!bridge) {
    throw new Error(
      "Electron preload bridge is unavailable. Restart the app with npm run dev.",
    );
  }

  return bridge;
}

export function getMetadataBridge() {
  const bridge = getBridge();

  if (typeof bridge.removeMetadata !== "function") {
    throw new Error(
      "The CleanSlate bridge is out of date. Fully quit and restart the app to load the latest version.",
    );
  }

  return bridge;
}
