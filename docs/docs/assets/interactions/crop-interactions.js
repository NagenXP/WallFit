import { MIN_CROP_SOURCE_EDGE, cropOverlay, cropWindow } from "./main.js";
import { clampValue, state } from "./app-state.js";
import {
  getCropAspectRatio,
  getCropRectInSourceSpace,
  getDisplayedImageRect,
  getMinCropHeight,
  getMinCropWidth,
  setCropFromSourceRect,
  updateCropOverlay,
} from "./crop-preview.js";
import { scheduleProcess } from "./image-workflow.js";

let cropDragState = null;

function getResizeCursor(handle) {
  switch (handle) {
    case "n":
    case "s":
      return "ns-resize";
    case "e":
    case "w":
      return "ew-resize";
    case "ne":
    case "sw":
      return "nesw-resize";
    case "nw":
    case "se":
      return "nwse-resize";
    default:
      return "default";
  }
}

function setCropHoverCursor(event) {
  if (!cropWindow || cropDragState) {
    return;
  }
  const handleElement = event.target instanceof Element ? event.target.closest(".crop-handle") : null;
  const handle = handleElement instanceof HTMLElement ? handleElement.dataset.handle : "";
  if (handle) {
    cropWindow.style.cursor = getResizeCursor(handle);
    return;
  }
  cropWindow.style.cursor = "grab";
}

function resizeCropRectFreeform(dragState, deltaX, deltaY) {
  const { handle, startRect, minWidth, minHeight } = dragState;
  const right = startRect.x + startRect.width;
  const bottom = startRect.y + startRect.height;

  if (handle === "e") {
    const width = clampValue(startRect.width + deltaX, minWidth, state.width - startRect.x);
    return { x: startRect.x, y: startRect.y, width, height: startRect.height };
  }
  if (handle === "w") {
    const width = clampValue(startRect.width - deltaX, minWidth, right);
    return { x: right - width, y: startRect.y, width, height: startRect.height };
  }
  if (handle === "s") {
    const height = clampValue(startRect.height + deltaY, minHeight, state.height - startRect.y);
    return { x: startRect.x, y: startRect.y, width: startRect.width, height };
  }
  if (handle === "n") {
    const height = clampValue(startRect.height - deltaY, minHeight, bottom);
    return { x: startRect.x, y: bottom - height, width: startRect.width, height };
  }
  if (handle === "se") {
    const width = clampValue(startRect.width + deltaX, minWidth, state.width - startRect.x);
    const height = clampValue(startRect.height + deltaY, minHeight, state.height - startRect.y);
    return { x: startRect.x, y: startRect.y, width, height };
  }
  if (handle === "sw") {
    const width = clampValue(startRect.width - deltaX, minWidth, right);
    const height = clampValue(startRect.height + deltaY, minHeight, state.height - startRect.y);
    return { x: right - width, y: startRect.y, width, height };
  }
  if (handle === "ne") {
    const width = clampValue(startRect.width + deltaX, minWidth, state.width - startRect.x);
    const height = clampValue(startRect.height - deltaY, minHeight, bottom);
    return { x: startRect.x, y: bottom - height, width, height };
  }
  if (handle === "nw") {
    const width = clampValue(startRect.width - deltaX, minWidth, right);
    const height = clampValue(startRect.height - deltaY, minHeight, bottom);
    return { x: right - width, y: bottom - height, width, height };
  }
  return startRect;
}

function resizeCropRectFromHandle(dragState, deltaX, deltaY) {
  const { handle, startRect, ratio, minWidth } = dragState;
  const maxGlobalWidth = Math.max(1, Math.min(state.width, state.height * ratio));
  const boundedMinWidth = clampValue(minWidth, 1, maxGlobalWidth);

  const clampWidth = (value, maxLimit) => {
    const boundedMaxWidth = Math.max(boundedMinWidth, Math.min(maxLimit, maxGlobalWidth));
    return clampValue(value, boundedMinWidth, boundedMaxWidth);
  };

  if (handle === "e" || handle === "w") {
    const centerY = startRect.y + startRect.height / 2;
    const maxByVertical = Math.min(centerY * 2 * ratio, (state.height - centerY) * 2 * ratio);

    if (handle === "e") {
      const left = startRect.x;
      const maxWidth = Math.min(state.width - left, maxByVertical);
      const width = clampWidth(startRect.width + deltaX, maxWidth);
      const height = width / ratio;
      const y = clampValue(centerY - height / 2, 0, state.height - height);
      return { x: left, y, width, height };
    }

    const right = startRect.x + startRect.width;
    const maxWidth = Math.min(right, maxByVertical);
    const width = clampWidth(startRect.width - deltaX, maxWidth);
    const height = width / ratio;
    const x = clampValue(right - width, 0, state.width - width);
    const y = clampValue(centerY - height / 2, 0, state.height - height);
    return { x, y, width, height };
  }

  if (handle === "n" || handle === "s") {
    const centerX = startRect.x + startRect.width / 2;
    const maxByHorizontal = Math.min((centerX * 2) / ratio, ((state.width - centerX) * 2) / ratio);

    if (handle === "s") {
      const top = startRect.y;
      const maxHeight = Math.min(state.height - top, maxByHorizontal);
      const width = clampWidth((startRect.height + deltaY) * ratio, maxHeight * ratio);
      const height = width / ratio;
      const x = clampValue(centerX - width / 2, 0, state.width - width);
      return { x, y: top, width, height };
    }

    const bottom = startRect.y + startRect.height;
    const maxHeight = Math.min(bottom, maxByHorizontal);
    const width = clampWidth((startRect.height - deltaY) * ratio, maxHeight * ratio);
    const height = width / ratio;
    const x = clampValue(centerX - width / 2, 0, state.width - width);
    const y = clampValue(bottom - height, 0, state.height - height);
    return { x, y, width, height };
  }

  let anchorX = 0;
  let anchorY = 0;
  let widthFromPointer = startRect.width;
  let heightFromPointer = startRect.height;
  let maxWidth = maxGlobalWidth;

  if (handle === "se") {
    anchorX = startRect.x;
    anchorY = startRect.y;
    widthFromPointer = startRect.width + deltaX;
    heightFromPointer = startRect.height + deltaY;
    maxWidth = Math.min(state.width - anchorX, (state.height - anchorY) * ratio);
  } else if (handle === "sw") {
    anchorX = startRect.x + startRect.width;
    anchorY = startRect.y;
    widthFromPointer = startRect.width - deltaX;
    heightFromPointer = startRect.height + deltaY;
    maxWidth = Math.min(anchorX, (state.height - anchorY) * ratio);
  } else if (handle === "ne") {
    anchorX = startRect.x;
    anchorY = startRect.y + startRect.height;
    widthFromPointer = startRect.width + deltaX;
    heightFromPointer = startRect.height - deltaY;
    maxWidth = Math.min(state.width - anchorX, anchorY * ratio);
  } else {
    anchorX = startRect.x + startRect.width;
    anchorY = startRect.y + startRect.height;
    widthFromPointer = startRect.width - deltaX;
    heightFromPointer = startRect.height - deltaY;
    maxWidth = Math.min(anchorX, anchorY * ratio);
  }

  const widthCandidate = Math.max(widthFromPointer, heightFromPointer * ratio);
  const width = clampWidth(widthCandidate, maxWidth);
  const height = width / ratio;

  if (handle === "se") {
    return { x: anchorX, y: anchorY, width, height };
  }
  if (handle === "sw") {
    return { x: anchorX - width, y: anchorY, width, height };
  }
  if (handle === "ne") {
    return { x: anchorX, y: anchorY - height, width, height };
  }
  return { x: anchorX - width, y: anchorY - height, width, height };
}

function beginCropDrag(event) {
  if (!cropWindow || !state.width || !state.height) {
    return;
  }
  if (event.button !== undefined && event.button !== 0) {
    return;
  }

  const imageRect = getDisplayedImageRect();
  const startRect = getCropRectInSourceSpace();
  if (!imageRect || !startRect) {
    return;
  }

  const handleElement = event.target instanceof Element ? event.target.closest(".crop-handle") : null;
  const handle = handleElement instanceof HTMLElement && handleElement.dataset.handle ? handleElement.dataset.handle : null;
  const mode = handle ? "resize" : "move";
  const isRatioLocked = Boolean(state.lastPreset);
  const ratio = isRatioLocked ? getCropAspectRatio() : null;

  event.preventDefault();
  event.stopPropagation();

  cropDragState = {
    pointerId: event.pointerId,
    mode,
    handle,
    startClientX: event.clientX,
    startClientY: event.clientY,
    startRect,
    imageRect,
    ratio,
    isRatioLocked,
    minWidth: isRatioLocked ? getMinCropWidth(ratio) : clampValue(MIN_CROP_SOURCE_EDGE, 1, state.width),
    minHeight: isRatioLocked ? getMinCropWidth(ratio) / ratio : getMinCropHeight(),
  };

  cropWindow.classList.toggle("dragging", mode === "move");
  cropWindow.classList.toggle("resizing", mode === "resize");
  if (mode === "resize" && handle) {
    cropWindow.style.cursor = getResizeCursor(handle);
  }
  if (typeof cropWindow.setPointerCapture === "function") {
    cropWindow.setPointerCapture(event.pointerId);
  }
}

function moveCropDrag(event) {
  if (!cropDragState) {
    setCropHoverCursor(event);
    return;
  }
  if (event.pointerId !== cropDragState.pointerId) {
    return;
  }

  event.preventDefault();

  const deltaClientX = event.clientX - cropDragState.startClientX;
  const deltaClientY = event.clientY - cropDragState.startClientY;
  const deltaX = cropDragState.imageRect.width ? (deltaClientX * state.width) / cropDragState.imageRect.width : 0;
  const deltaY = cropDragState.imageRect.height ? (deltaClientY * state.height) / cropDragState.imageRect.height : 0;

  if (cropDragState.mode === "move") {
    const { width, height, x, y } = cropDragState.startRect;
    setCropFromSourceRect({
      x: clampValue(x + deltaX, 0, state.width - width),
      y: clampValue(y + deltaY, 0, state.height - height),
      width,
      height,
    });
  } else {
    const resizedRect = cropDragState.isRatioLocked
      ? resizeCropRectFromHandle(cropDragState, deltaX, deltaY)
      : resizeCropRectFreeform(cropDragState, deltaX, deltaY);
    setCropFromSourceRect(resizedRect);
  }

  updateCropOverlay();
  scheduleProcess();
}

function endCropDrag(event) {
  if (!cropDragState || event.pointerId !== cropDragState.pointerId) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  if (typeof cropWindow.releasePointerCapture === "function" && cropWindow.hasPointerCapture(event.pointerId)) {
    cropWindow.releasePointerCapture(event.pointerId);
  }

  cropDragState = null;
  cropWindow.classList.remove("dragging");
  cropWindow.classList.remove("resizing");
  cropWindow.style.cursor = "grab";
}

export function setupCropAdjustments() {
  if (!cropWindow || !cropOverlay) {
    return;
  }

  cropOverlay.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });

  cropWindow.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  cropWindow.addEventListener("pointerenter", setCropHoverCursor);
  cropWindow.addEventListener("pointerleave", () => {
    if (!cropDragState) {
      cropWindow.style.cursor = "grab";
    }
  });
  cropWindow.addEventListener("pointerdown", beginCropDrag);
  cropWindow.addEventListener("pointermove", moveCropDrag);
  cropWindow.addEventListener("pointerup", endCropDrag);
  cropWindow.addEventListener("pointercancel", endCropDrag);
}
