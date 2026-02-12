import {
  DEFAULT_CROP_INSET_RATIO,
  MIN_CROP_SOURCE_EDGE,
  PREVIEW_MIN_HEIGHT_DESKTOP,
  PREVIEW_MIN_HEIGHT_MOBILE,
  YOUTUBE_BANNER_TEMPLATE,
  cropOverlay,
  cropWindow,
  dropzone,
  fileInput,
  previewBox,
  previewImage,
  previewLabel,
  previewPlaceholder,
} from "./main.js";
import { clampValue, isMobileViewport, state } from "./app-state.js";

export function getPreviewLabelText() {
  if (!state.file || !state.previewUrl) {
    return { text: "", visible: false };
  }
  if (!state.width || !state.height) {
    return { text: "", visible: false };
  }
  if (state.lastPreset) {
    return {
      text: `Crop · ${state.lastPreset.width} × ${state.lastPreset.height}px`,
      visible: true,
    };
  }
  const cropRect = getCropSourceRect();
  if (
    cropRect
    && (
      cropRect.width !== state.width
      || cropRect.height !== state.height
      || cropRect.x !== 0
      || cropRect.y !== 0
    )
  ) {
    return { text: `Crop · ${cropRect.width} × ${cropRect.height}px`, visible: true };
  }
  return { text: `Original · ${state.width} × ${state.height}px`, visible: true };
}

export function resetCropToFullSource() {
  state.crop = {
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  };
}

export function setDefaultInsetCrop() {
  if (!state.width || !state.height) {
    resetCropToFullSource();
    return;
  }

  const insetRatio = clampValue(DEFAULT_CROP_INSET_RATIO, 0, 0.45);
  const cropWidth = clampValue(1 - insetRatio * 2, 0.0001, 1);
  const cropHeight = clampValue(1 - insetRatio * 2, 0.0001, 1);
  const offsetX = (1 - cropWidth) / 2;
  const offsetY = (1 - cropHeight) / 2;

  state.crop = {
    x: offsetX,
    y: offsetY,
    width: cropWidth,
    height: cropHeight,
  };
}

export function applyInsetToCurrentCrop(insetRatio = DEFAULT_CROP_INSET_RATIO) {
  if (!state.width || !state.height) {
    return;
  }

  const ratio = clampValue(insetRatio, 0, 0.45);
  if (ratio <= 0) {
    return;
  }

  const cropWidth = clampValue(state.crop.width, 0.0001, 1);
  const cropHeight = clampValue(state.crop.height, 0.0001, 1);

  const nextWidth = clampValue(cropWidth * (1 - ratio * 2), 0.0001, 1);
  const nextHeight = clampValue(cropHeight * (1 - ratio * 2), 0.0001, 1);
  const nextX = clampValue(state.crop.x + cropWidth * ratio, 0, 1 - nextWidth);
  const nextY = clampValue(state.crop.y + cropHeight * ratio, 0, 1 - nextHeight);

  state.crop = {
    x: nextX,
    y: nextY,
    width: nextWidth,
    height: nextHeight,
  };
}

export function applyAutoCropForPreset(targetWidth, targetHeight) {
  if (!Number.isFinite(targetWidth) || !Number.isFinite(targetHeight) || targetWidth <= 0 || targetHeight <= 0) {
    resetCropToFullSource();
    updateCropOverlay();
    return;
  }

  if (!state.width || !state.height) {
    resetCropToFullSource();
    updateCropOverlay();
    return;
  }

  const sourceRatio = state.width / state.height;
  const targetRatio = targetWidth / targetHeight;

  let cropWidth = 1;
  let cropHeight = 1;

  if (sourceRatio > targetRatio) {
    cropWidth = targetRatio / sourceRatio;
  } else {
    cropHeight = sourceRatio / targetRatio;
  }

  state.crop = {
    x: (1 - cropWidth) / 2,
    y: (1 - cropHeight) / 2,
    width: clampValue(cropWidth, 0.0001, 1),
    height: clampValue(cropHeight, 0.0001, 1),
  };

  updateCropOverlay();
}

export function getDisplayedImageRect() {
  if (!previewBox || !state.width || !state.height) {
    return null;
  }

  const boxWidth = previewBox.clientWidth;
  const boxHeight = previewBox.clientHeight;
  if (!boxWidth || !boxHeight) {
    return null;
  }

  const sourceRatio = state.width / state.height;
  const boxRatio = boxWidth / boxHeight;

  let displayWidth = boxWidth;
  let displayHeight = boxHeight;
  let offsetX = 0;
  let offsetY = 0;

  if (sourceRatio > boxRatio) {
    displayHeight = boxWidth / sourceRatio;
    offsetY = (boxHeight - displayHeight) / 2;
  } else {
    displayWidth = boxHeight * sourceRatio;
    offsetX = (boxWidth - displayWidth) / 2;
  }

  return {
    width: displayWidth,
    height: displayHeight,
    x: offsetX,
    y: offsetY,
  };
}

export function getCropSourceRect() {
  if (!state.width || !state.height) {
    return null;
  }

  const cropWidth = clampValue(state.crop.width, 0.0001, 1);
  const cropHeight = clampValue(state.crop.height, 0.0001, 1);
  const sourceWidth = Math.max(1, Math.round(cropWidth * state.width));
  const sourceHeight = Math.max(1, Math.round(cropHeight * state.height));

  const maxX = Math.max(0, state.width - sourceWidth);
  const maxY = Math.max(0, state.height - sourceHeight);

  const sourceX = clampValue(Math.round(state.crop.x * state.width), 0, maxX);
  const sourceY = clampValue(Math.round(state.crop.y * state.height), 0, maxY);

  return {
    x: sourceX,
    y: sourceY,
    width: sourceWidth,
    height: sourceHeight,
  };
}

export function getCropAspectRatio() {
  if (
    state.lastPreset
    && Number.isFinite(state.lastPreset.width)
    && Number.isFinite(state.lastPreset.height)
    && state.lastPreset.width > 0
    && state.lastPreset.height > 0
  ) {
    return state.lastPreset.width / state.lastPreset.height;
  }
  if (state.width > 0 && state.height > 0) {
    return state.width / state.height;
  }
  return 1;
}

export function getCropRectInSourceSpace() {
  if (!state.width || !state.height) {
    return null;
  }
  const width = clampValue(state.crop.width, 0.0001, 1) * state.width;
  const height = clampValue(state.crop.height, 0.0001, 1) * state.height;
  const maxX = Math.max(0, state.width - width);
  const maxY = Math.max(0, state.height - height);

  return {
    x: clampValue(state.crop.x * state.width, 0, maxX),
    y: clampValue(state.crop.y * state.height, 0, maxY),
    width,
    height,
  };
}

export function setCropFromSourceRect(rect) {
  if (!rect || !state.width || !state.height) {
    return;
  }

  const width = clampValue(rect.width, 1, state.width);
  const height = clampValue(rect.height, 1, state.height);
  const x = clampValue(rect.x, 0, state.width - width);
  const y = clampValue(rect.y, 0, state.height - height);

  state.crop = {
    x: x / state.width,
    y: y / state.height,
    width: width / state.width,
    height: height / state.height,
  };
}

export function getMinCropWidth(ratio) {
  if (!state.width || !state.height) {
    return 1;
  }
  const safeRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
  const maxWidth = Math.max(1, Math.min(state.width, state.height * safeRatio));
  const minByHeight = MIN_CROP_SOURCE_EDGE * safeRatio;
  const desiredMin = Math.max(MIN_CROP_SOURCE_EDGE, minByHeight);
  return clampValue(desiredMin, 1, maxWidth);
}

export function getMinCropHeight() {
  if (!state.height) {
    return 1;
  }
  return clampValue(MIN_CROP_SOURCE_EDGE, 1, state.height);
}

export function resetPreviewBoxSize() {
  if (!previewBox) {
    return;
  }
  previewBox.style.removeProperty("--preview-h");
  previewBox.style.removeProperty("width");
  previewBox.style.removeProperty("height");
  previewBox.style.removeProperty("margin");
  if (previewImage) {
    previewImage.style.removeProperty("width");
    previewImage.style.removeProperty("height");
  }
}

export function setPreviewBoxSize(width, height) {
  if (!previewBox) {
    return;
  }
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    resetPreviewBoxSize();
    return;
  }

  const container = previewBox.parentElement;
  const containerWidth = container ? container.clientWidth : previewBox.clientWidth;
  if (!containerWidth) {
    resetPreviewBoxSize();
    return;
  }

  const mobileViewport = isMobileViewport();
  const ratio = height / width;
  const viewportMaxHeight = Math.min(window.innerHeight * 0.5, 520);
  const containerMaxHeight = container ? container.clientHeight : 0;
  const maxHeight = containerMaxHeight > 0 ? Math.min(viewportMaxHeight, containerMaxHeight) : viewportMaxHeight;
  const baseMinHeight = mobileViewport ? PREVIEW_MIN_HEIGHT_MOBILE : PREVIEW_MIN_HEIGHT_DESKTOP;
  const minHeight = Math.min(baseMinHeight, maxHeight);

  let targetWidth = containerWidth;
  let targetHeight = targetWidth * ratio;

  if (targetHeight > maxHeight) {
    targetHeight = maxHeight;
    targetWidth = Math.min(containerWidth, targetHeight / ratio);
  }

  if (targetHeight < minHeight) {
    targetHeight = minHeight;
    targetWidth = Math.min(containerWidth, targetHeight / ratio);
  }

  previewBox.style.width = `${Math.round(targetWidth)}px`;
  previewBox.style.height = `${Math.round(targetHeight)}px`;
  previewBox.style.margin = "0 auto";
}

export function refreshPreviewBoxSize() {
  if (state.width && state.height) {
    setPreviewBoxSize(state.width, state.height);
  } else {
    resetPreviewBoxSize();
  }
  updateCropOverlay();
}

export function setPreviewLabel(text, isVisible = true) {
  if (!previewLabel) {
    return;
  }
  previewLabel.textContent = text;
  previewLabel.classList.toggle("visible", isVisible);
}

function updatePresetTemplateOverlay() {
  if (!cropWindow) {
    return;
  }
  const showYouTubeBannerTemplate = Boolean(
    state.templateOverlay === YOUTUBE_BANNER_TEMPLATE
    && state.file
    && state.previewUrl
    && state.width
    && state.height
  );
  cropWindow.classList.toggle("show-template-youtube", showYouTubeBannerTemplate);
}

export function setPresetTemplateOverlay(templateId) {
  state.templateOverlay = templateId === YOUTUBE_BANNER_TEMPLATE ? YOUTUBE_BANNER_TEMPLATE : null;
  updatePresetTemplateOverlay();
}

export function updateCropOverlay() {
  if (!cropOverlay || !cropWindow) {
    return;
  }

  const canShow = Boolean(state.file && state.previewUrl && state.width && state.height);
  cropOverlay.classList.toggle("active", canShow);
  cropOverlay.setAttribute("aria-hidden", canShow ? "false" : "true");
  updatePresetTemplateOverlay();

  if (!canShow) {
    cropWindow.classList.remove("dragging");
    cropWindow.classList.remove("resizing");
    return;
  }

  const imageRect = getDisplayedImageRect();
  if (!imageRect) {
    return;
  }

  const cropWidth = clampValue(state.crop.width, 0.0001, 1);
  const cropHeight = clampValue(state.crop.height, 0.0001, 1);
  const cropX = clampValue(state.crop.x, 0, 1 - cropWidth);
  const cropY = clampValue(state.crop.y, 0, 1 - cropHeight);

  state.crop = {
    x: cropX,
    y: cropY,
    width: cropWidth,
    height: cropHeight,
  };

  const left = imageRect.x + cropX * imageRect.width;
  const top = imageRect.y + cropY * imageRect.height;
  const width = cropWidth * imageRect.width;
  const height = cropHeight * imageRect.height;

  cropWindow.style.left = `${left}px`;
  cropWindow.style.top = `${top}px`;
  cropWindow.style.width = `${width}px`;
  cropWindow.style.height = `${height}px`;
}

export function showOriginalPreview() {
  const hasPreview = Boolean(state.file && state.previewUrl);
  const isPreviewReady = Boolean(hasPreview && state.width && state.height);
  dropzone.classList.toggle("has-image", isPreviewReady);
  dropzone.classList.toggle("locked", hasPreview);
  fileInput.disabled = hasPreview;
  if (isPreviewReady) {
    previewImage.src = state.previewUrl;
    previewImage.classList.add("visible");
    previewPlaceholder.style.display = "none";
    const label = getPreviewLabelText();
    setPreviewLabel(label.text, label.visible);
  } else {
    previewImage.src = "";
    previewImage.classList.remove("visible");
    previewPlaceholder.style.display = "flex";
    const label = getPreviewLabelText();
    setPreviewLabel(label.text, label.visible);
  }
  if (state.width && state.height) {
    setPreviewBoxSize(state.width, state.height);
  } else {
    resetPreviewBoxSize();
  }
  updateCropOverlay();
}
