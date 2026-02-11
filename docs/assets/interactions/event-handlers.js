import {
  FIXED_FORMAT,
  applyCustomSizeBtn,
  browseBtn,
  clearBtn,
  customHeightInput,
  customWidthInput,
  downloadBtn,
  dropzone,
  fileInput,
  presetSelects,
  previewImage,
  resetBtn,
} from "./main.js";
import { isDropzoneLocked, isMobileViewport, state, syncDropzoneCopy } from "./app-state.js";
import { refreshPreviewBoxSize } from "./crop-preview.js";
import { setupCropAdjustments } from "./crop-interactions.js";
import {
  hasActivePresetSelection,
  setCustomSizeDisabled,
  updateClearButtonState,
  clearSelectedSize,
  resetAll,
} from "./controls-utils.js";
import { handleFile } from "./image-workflow.js";
import { applyCustomSize, getOutputDimensions, handlePresetSelection } from "./presets.js";

function setupDragAndDrop() {
  if (isMobileViewport()) {
    return;
  }
  ["dragenter", "dragover"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      if (isDropzoneLocked()) {
        dropzone.classList.remove("dragging");
        return;
      }
      dropzone.classList.add("dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.remove("dragging");
    });
  });

  dropzone.addEventListener("drop", (event) => {
    if (isDropzoneLocked()) {
      return;
    }
    const file = event.dataTransfer?.files?.[0];
    handleFile(file);
  });
}

function blockPreviewSaveActions(event) {
  if (!isDropzoneLocked()) {
    return;
  }
  event.preventDefault();
}

browseBtn.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  if (isDropzoneLocked()) {
    return;
  }
  fileInput.click();
});

dropzone.addEventListener("click", (event) => {
  if (event.target instanceof Element && event.target.closest(".crop-overlay")) {
    return;
  }
  if (isDropzoneLocked()) {
    return;
  }
  fileInput.click();
});

dropzone.addEventListener("contextmenu", blockPreviewSaveActions);

if (previewImage) {
  previewImage.draggable = false;
  previewImage.addEventListener("dragstart", blockPreviewSaveActions);
}

fileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  handleFile(file);
});

presetSelects.forEach((presetSelect) => {
  presetSelect.addEventListener("change", () => {
    const selectedOption = presetSelect.options[presetSelect.selectedIndex];
    handlePresetSelection(selectedOption, presetSelect);
  });
});

if (applyCustomSizeBtn) {
  applyCustomSizeBtn.addEventListener("click", () => {
    applyCustomSize();
  });
}

[customWidthInput, customHeightInput]
  .filter(Boolean)
  .forEach((input) => {
    input.addEventListener("input", () => {
      updateClearButtonState();
    });
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") {
        return;
      }
      event.preventDefault();
      applyCustomSize();
    });
  });

downloadBtn.addEventListener("click", () => {
  if (!state.outputBlob || !state.outputUrl) {
    return;
  }
  const format = FIXED_FORMAT;
  const baseName = state.file ? state.file.name.replace(/\.[^/.]+$/, "") : "wallfit";
  const { width, height } = getOutputDimensions();
  const link = document.createElement("a");
  link.href = state.outputUrl;
  link.download = `${baseName}-${width}x${height}.${format}`;
  link.click();
});

resetBtn.addEventListener("click", () => {
  resetAll();
});

if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    clearSelectedSize();
  });
}

setupDragAndDrop();
setupCropAdjustments();

window.addEventListener("resize", () => {
  refreshPreviewBoxSize();
  syncDropzoneCopy();
});

setCustomSizeDisabled(hasActivePresetSelection());
syncDropzoneCopy();
