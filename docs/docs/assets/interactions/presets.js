import {
  DEFAULT_CROP_INSET_RATIO,
  YOUTUBE_BANNER_TEMPLATE,
  customHeightInput,
  customWidthInput,
  outputDims,
  presetSelects,
} from "./main.js";
import { setStatus, state } from "./app-state.js";
import {
  applyAutoCropForPreset,
  applyInsetToCurrentCrop,
  resetCropToFullSource,
  setPresetTemplateOverlay,
  showOriginalPreview,
  updateCropOverlay,
} from "./crop-preview.js";
import {
  clearCustomSizeInputs,
  hasActivePresetSelection,
  hasCustomSizeInputValues,
  parseDimension,
  setCustomSizeDisabled,
} from "./controls-utils.js";
import { scheduleProcess } from "./image-workflow.js";

export function handlePresetSelection(selectedOption, sourceSelect) {
  if (!selectedOption || !selectedOption.dataset.w || !selectedOption.dataset.h) {
    setPresetTemplateOverlay(null);
    setCustomSizeDisabled(hasActivePresetSelection());
    if (
      sourceSelect
      && !sourceSelect.value
      && presetSelects.every((presetSelect) => !presetSelect.value)
      && !hasCustomSizeInputValues()
    ) {
      state.lastPreset = null;
      state.presetTriggered = false;
      resetCropToFullSource();
      showOriginalPreview();
      scheduleProcess();
    }
    return;
  }

  presetSelects.forEach((presetSelect) => {
    if (presetSelect !== sourceSelect) {
      presetSelect.value = "";
    }
  });
  clearCustomSizeInputs();
  setCustomSizeDisabled(true);

  const targetWidth = parseDimension(selectedOption.dataset.w, 1);
  const targetHeight = parseDimension(selectedOption.dataset.h, 1);
  const templateId = selectedOption.dataset.template || null;

  state.lastPreset = { width: targetWidth, height: targetHeight };
  setPresetTemplateOverlay(templateId);
  state.presetTriggered = true;
  applyAutoCropForPreset(targetWidth, targetHeight);
  if (templateId === YOUTUBE_BANNER_TEMPLATE) {
    applyInsetToCurrentCrop(DEFAULT_CROP_INSET_RATIO);
    updateCropOverlay();
  }

  showOriginalPreview();

  scheduleProcess();
}

export function applyCustomSize() {
  if (!customWidthInput || !customHeightInput) {
    return;
  }

  const widthRaw = customWidthInput.value.trim();
  const heightRaw = customHeightInput.value.trim();
  if (!widthRaw || !heightRaw) {
    setStatus("Enter both custom width and height.", "error");
    return;
  }

  const targetWidth = parseDimension(widthRaw, 0);
  const targetHeight = parseDimension(heightRaw, 0);
  if (!targetWidth || !targetHeight) {
    setStatus("Custom size must use positive numbers.", "error");
    return;
  }

  customWidthInput.value = String(targetWidth);
  customHeightInput.value = String(targetHeight);
  presetSelects.forEach((presetSelect) => {
    presetSelect.value = "";
  });
  setCustomSizeDisabled(false);

  state.lastPreset = { width: targetWidth, height: targetHeight };
  setPresetTemplateOverlay(null);
  state.presetTriggered = true;
  applyAutoCropForPreset(targetWidth, targetHeight);
  setStatus("");

  showOriginalPreview();

  scheduleProcess();
}

export function swapCustomSize() {
  if (!customWidthInput || !customHeightInput) {
    return;
  }

  const widthRaw = customWidthInput.value.trim();
  const heightRaw = customHeightInput.value.trim();
  customWidthInput.value = heightRaw;
  customHeightInput.value = widthRaw;

  if (!customWidthInput.value.trim() || !customHeightInput.value.trim()) {
    setStatus("");
    return;
  }

  applyCustomSize();
}

export function getOutputDimensions() {
  const match = outputDims.textContent.match(/(\d+)\s*×\s*(\d+)/);
  if (match) {
    return { width: Number.parseInt(match[1], 10), height: Number.parseInt(match[2], 10) };
  }
  if (state.lastPreset) {
    return state.lastPreset;
  }
  return { width: state.width || 1, height: state.height || 1 };
}
