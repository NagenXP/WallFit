import {
  applyCustomSizeBtn,
  clearBtn,
  customHeightInput,
  customWidthInput,
  downloadBtn,
  dropzone,
  estimatedSize,
  fileInput,
  fileName,
  originalSize,
  outputDims,
  presetSelects,
  previewImage,
  previewPlaceholder,
  swapCustomSizeBtn,
} from "./main.js";
import { setStatus, state } from "./app-state.js";
import {
  getCropSourceRect,
  resetCropToFullSource,
  resetPreviewBoxSize,
  setPresetTemplateOverlay,
  setPreviewLabel,
  showOriginalPreview,
  updateCropOverlay,
} from "./crop-preview.js";
import { scheduleProcess } from "./image-workflow.js";

export function resetOutput() {
  if (state.outputUrl) {
    URL.revokeObjectURL(state.outputUrl);
  }
  state.outputUrl = null;
  state.outputBlob = null;
  estimatedSize.textContent = "--";
  outputDims.textContent = "--";
  downloadBtn.disabled = true;
  showOriginalPreview();
}

export function resetAll() {
  cleanupSource();
  resetOutput();
  state.file = null;
  state.width = 0;
  state.height = 0;
  state.lastPreset = null;
  state.presetTriggered = false;
  state.pendingPreset = false;
  state.templateOverlay = null;
  resetCropToFullSource();
  fileInput.value = "";
  fileName.textContent = "No file loaded";
  originalSize.textContent = "--";
  outputDims.textContent = "--";
  estimatedSize.textContent = "--";
  previewImage.src = "";
  previewImage.classList.remove("visible");
  previewPlaceholder.style.display = "flex";
  dropzone.classList.remove("has-image");
  dropzone.classList.remove("locked");
  fileInput.disabled = false;
  setPreviewLabel("Original", false);
  resetPreviewBoxSize();
  updateCropOverlay();
  presetSelects.forEach((presetSelect) => {
    presetSelect.value = "";
  });
  clearCustomSizeInputs();
  setCustomSizeDisabled(false);
  setStatus("");
}

function hasActiveClearSelection() {
  return hasActivePresetSelection() || hasCustomSizeInputValues() || Boolean(state.lastPreset);
}

export function clearSelectedSize() {
  if (!hasActiveClearSelection()) {
    updateClearButtonState();
    return;
  }

  presetSelects.forEach((presetSelect) => {
    presetSelect.value = "";
  });
  clearCustomSizeInputs();
  state.lastPreset = null;
  state.presetTriggered = false;
  state.pendingPreset = false;
  setPresetTemplateOverlay(null);
  setCustomSizeDisabled(false);
  showOriginalPreview();
  setStatus("");
  if (state.source) {
    scheduleProcess();
  }
}

export function cleanupSource() {
  if (state.previewUrl) {
    URL.revokeObjectURL(state.previewUrl);
  }
  if (state.source && state.sourceType === "bitmap") {
    state.source.close();
  }
  state.previewUrl = null;
  state.source = null;
  state.sourceType = "image";
}

export function parseDimension(value, fallback = 1) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

export function hasCustomSizeInputValues() {
  const widthValue = customWidthInput ? customWidthInput.value.trim() : "";
  const heightValue = customHeightInput ? customHeightInput.value.trim() : "";
  return Boolean(widthValue || heightValue);
}

export function hasActivePresetSelection() {
  return presetSelects.some((presetSelect) => Boolean(presetSelect.value));
}

export function updateClearButtonState() {
  if (!clearBtn) {
    return;
  }
  clearBtn.disabled = !hasActiveClearSelection();
}

export function clearCustomSizeInputs() {
  if (customWidthInput) {
    customWidthInput.value = "";
  }
  if (customHeightInput) {
    customHeightInput.value = "";
  }
}

export function setCustomSizeDisabled(isDisabled) {
  [customWidthInput, customHeightInput, swapCustomSizeBtn, applyCustomSizeBtn]
    .filter(Boolean)
    .forEach((control) => {
      control.disabled = Boolean(isDisabled);
    });
  updateClearButtonState();
}

export function clampSize(width, height) {
  return { width, height, warning: "" };
}

export function getTargetSize() {
  if (state.lastPreset) {
    return { width: state.lastPreset.width, height: state.lastPreset.height };
  }
  const cropRect = getCropSourceRect();
  if (cropRect) {
    return { width: cropRect.width, height: cropRect.height };
  }
  return { width: state.width || 1, height: state.height || 1 };
}
