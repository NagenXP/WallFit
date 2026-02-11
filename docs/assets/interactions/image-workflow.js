import {
  DEFAULT_CROP_INSET_RATIO,
  FIXED_FORMAT,
  FIXED_QUALITY,
  MAX_FILE_SIZE,
  MAX_UPLOAD_PIXELS,
  MIN_QUALITY,
  YOUTUBE_BANNER_TEMPLATE,
  downloadBtn,
  desktopPresetSelect,
  dropzoneSubtitle,
  estimatedSize,
  fileInput,
  fileName,
  originalSize,
  outputDims,
} from "./main.js";
import { formatBytes, isMobileViewport, setLoading, setStatus, state, syncDropzoneCopy } from "./app-state.js";
import {
  applyAutoCropForPreset,
  applyInsetToCurrentCrop,
  getCropSourceRect,
  setDefaultInsetCrop,
  showOriginalPreview,
  updateCropOverlay,
} from "./crop-preview.js";
import { clampSize, cleanupSource, getTargetSize, resetOutput } from "./controls-utils.js";

let processTimer = null;
const MOBILE_RISKY_DESKTOP_PRESETS = new Set(["3840x2160", "4480x2520", "5120x2880"]);
const MOBILE_HIGH_RES_WARNING = "High resolution presets (4K/4.5K/5K) may take longer to process on mobile devices.";

export function scheduleProcess() {
  if (!state.source) {
    return;
  }
  if (processTimer) {
    clearTimeout(processTimer);
  }
  if (state.processing) {
    state.pendingPreset = true;
    return;
  }
  processTimer = window.setTimeout(processImage, 200);
}

export async function processImage() {
  if (!state.source || state.processing) {
    return;
  }

  state.processing = true;
  const showReady = state.presetTriggered;
  state.presetTriggered = false;
  setLoading(true);
  downloadBtn.disabled = true;

  const cropRect = getCropSourceRect();
  const target = getTargetSize();
  const shouldCrop = Boolean(cropRect);
  const clamped = clampSize(target.width, target.height);
  const width = clamped.width;
  const height = clamped.height;
  const warnings = [];
  if (isMobileViewport() && MOBILE_RISKY_DESKTOP_PRESETS.has(desktopPresetSelect?.value || "")) {
    warnings.push(MOBILE_HIGH_RES_WARNING);
  }
  if (clamped.warning) {
    warnings.push(clamped.warning);
  }

  const format = FIXED_FORMAT;
  const mime = "image/jpeg";
  let quality = FIXED_QUALITY;
  const minQuality = MIN_QUALITY;

  try {
    const renderBlob = (w, h, q) => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { alpha: format !== "jpg" });
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      if (shouldCrop && cropRect) {
        ctx.drawImage(
          state.source,
          cropRect.x,
          cropRect.y,
          cropRect.width,
          cropRect.height,
          0,
          0,
          w,
          h,
        );
      } else {
        ctx.drawImage(state.source, 0, 0, w, h);
      }
      return new Promise((resolve) => canvas.toBlob(resolve, mime, q));
    };

    let blob = await renderBlob(width, height, quality);
    if (!blob) {
      throw new Error("Image processing failed.");
    }

    if (blob.size > MAX_FILE_SIZE) {
      let attempt = 0;
      while (blob.size > MAX_FILE_SIZE && quality > minQuality + 0.001 && attempt < 8) {
        quality = Math.max(minQuality, quality - 0.07);
        blob = await renderBlob(width, height, quality);
        if (!blob) {
          throw new Error("Image processing failed.");
        }
        attempt += 1;
      }
      if (quality < FIXED_QUALITY) {
        warnings.push(`Quality adjusted to ${Math.round(quality * 100)}% to stay under 15 MB.`);
      }
    }

    if (blob.size > MAX_FILE_SIZE) {
      setStatus("Output exceeds 15 MB at minimum quality. Try a smaller resolution.", "error");
      resetOutput();
      return;
    }

    if (state.outputUrl) {
      URL.revokeObjectURL(state.outputUrl);
    }

    state.outputBlob = blob;
    state.outputUrl = URL.createObjectURL(blob);
    outputDims.textContent = `${width} × ${height}px`;
    estimatedSize.textContent = formatBytes(blob.size);
    downloadBtn.disabled = false;
    showOriginalPreview();
    if (warnings.length > 0) {
      setStatus(warnings.join(" "), "warn");
    } else if (showReady) {
      setStatus("", "ready");
    } else {
      setStatus("", "");
    }
  } catch (error) {
    console.error(error);
    setStatus("Could not process image at this size. Try a smaller resolution.", "error");
    resetOutput();
  } finally {
    setLoading(false);
    state.processing = false;
    if (state.pendingPreset) {
      state.pendingPreset = false;
      scheduleProcess();
    }
  }
}

export async function handleFile(file) {
  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    setStatus("Please upload a valid image file.", "error");
    return;
  }
  if (file.size > MAX_FILE_SIZE) {
    setStatus("File is larger than 15 MB. Please choose a smaller image.", "error");
    fileInput.value = "";
    return;
  }

  cleanupSource();
  resetOutput();

  state.width = 0;
  state.height = 0;
  state.file = file;
  fileName.textContent = file.name;
  originalSize.textContent = formatBytes(file.size);
  setStatus("");
  if (dropzoneSubtitle) {
    dropzoneSubtitle.textContent = "Loading image...";
  }

  const previewUrl = URL.createObjectURL(file);
  state.previewUrl = previewUrl;
  showOriginalPreview();

  try {
    if ("createImageBitmap" in window) {
      const bitmap = await createImageBitmap(file);
      state.source = bitmap;
      state.sourceType = "bitmap";
      state.width = bitmap.width;
      state.height = bitmap.height;
    } else {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = previewUrl;
      });
      state.source = img;
      state.sourceType = "image";
      state.width = img.width;
      state.height = img.height;
    }

    const sourcePixels = state.width * state.height;
    if (sourcePixels > MAX_UPLOAD_PIXELS) {
      cleanupSource();
      state.file = null;
      state.width = 0;
      state.height = 0;
      fileInput.value = "";
      fileName.textContent = "No file loaded";
      originalSize.textContent = "--";
      resetOutput();
      setStatus("Image resolution is too high. Try below 5K (max 5120 × 2880).", "error");
      return;
    }

    if (state.lastPreset) {
      applyAutoCropForPreset(state.lastPreset.width, state.lastPreset.height);
      if (state.templateOverlay === YOUTUBE_BANNER_TEMPLATE) {
        applyInsetToCurrentCrop(DEFAULT_CROP_INSET_RATIO);
        updateCropOverlay();
      }
    } else {
      setDefaultInsetCrop();
    }
    showOriginalPreview();

    setStatus("");
    scheduleProcess();
  } catch (error) {
    console.error(error);
    setStatus("Could not load this image. Try a different file.", "error");
  } finally {
    syncDropzoneCopy();
  }
}
