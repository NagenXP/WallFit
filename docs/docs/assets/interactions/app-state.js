import {
  DROPZONE_COPY,
  MOBILE_BREAKPOINT,
  dropzoneSubtitle,
  dropzoneTitle,
  loadingState,
  statusTexts,
} from "./main.js";

export const state = {
  file: null,
  previewUrl: null,
  outputUrl: null,
  outputBlob: null,
  source: null,
  sourceType: "image",
  width: 0,
  height: 0,
  lastPreset: null,
  processing: false,
  presetTriggered: false,
  pendingPreset: false,
  templateOverlay: null,
  crop: {
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  },
};

export function isMobileViewport() {
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;
}

export function syncDropzoneCopy() {
  const copy = isMobileViewport() ? DROPZONE_COPY.mobile : DROPZONE_COPY.desktop;
  if (dropzoneTitle) {
    dropzoneTitle.textContent = copy.title;
  }
  if (dropzoneSubtitle) {
    dropzoneSubtitle.textContent = copy.subtitle;
  }
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "--";
  }
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(value < 10 ? 2 : 1)} ${units[index]}`;
}

export function setStatus(message, tone = "") {
  const hasMessage = Boolean(message && message.trim());
  statusTexts.forEach((statusText) => {
    statusText.textContent = message;
    statusText.className = "status preview-status controls-status";
    statusText.classList.toggle("visible", hasMessage);
    if (tone) {
      statusText.classList.add(tone);
    }
  });
}

export function setLoading(isLoading) {
  loadingState.classList.toggle("active", isLoading);
}

export function clampValue(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function isDropzoneLocked() {
  return Boolean(state.file && state.previewUrl);
}
