export const dropzone = document.getElementById("dropzone");
export const fileInput = document.getElementById("fileInput");
export const browseBtn = document.getElementById("browseBtn");
export const fileName = document.getElementById("fileName");
export const originalSize = document.getElementById("originalSize");
export const estimatedSize = document.getElementById("estimatedSize");
export const outputDims = document.getElementById("outputDims");
export const FIXED_FORMAT = "jpg";
export const FIXED_QUALITY = 0.9;
export const MIN_QUALITY = 0.6;
export const downloadBtn = document.getElementById("downloadBtn");
export const clearBtn = document.getElementById("clearBtn");
export const resetBtn = document.getElementById("resetBtn");
export const statusTexts = [document.getElementById("statusText")].filter(Boolean);
export const previewImage = document.getElementById("previewImage");
export const previewPlaceholder = document.getElementById("previewPlaceholder");
export const dropzoneTitle = document.getElementById("dropzoneTitle");
export const dropzoneSubtitle = document.getElementById("dropzoneSubtitle");
export const previewLabel = document.getElementById("previewLabel");
export const previewBox = document.querySelector(".preview-image");
export const cropOverlay = document.getElementById("cropOverlay");
export const cropWindow = document.getElementById("cropWindow");
export const loadingState = document.getElementById("loadingState");
export const desktopPresetSelect = document.getElementById("desktopPreset");
export const mobilePresetSelect = document.getElementById("mobilePreset");
export const aspectPresetSelect = document.getElementById("aspectPreset");
export const socialPresetSelect = document.getElementById("socialPreset");
export const customWidthInput = document.getElementById("customWidth");
export const customHeightInput = document.getElementById("customHeight");
export const swapCustomSizeBtn = document.getElementById("swapCustomSizeBtn");
export const applyCustomSizeBtn = document.getElementById("applyCustomSizeBtn");
export const presetSelects = [desktopPresetSelect, mobilePresetSelect, aspectPresetSelect, socialPresetSelect].filter(Boolean);
export const MOBILE_BREAKPOINT = 768;
export const MAX_FILE_SIZE = 20 * 1024 * 1024;
export const PREVIEW_MIN_HEIGHT_MOBILE = 200;
export const PREVIEW_MIN_HEIGHT_DESKTOP = 240;
export const MIN_CROP_SOURCE_EDGE = 48;
export const DEFAULT_CROP_INSET_RATIO = 0.04;
export const YOUTUBE_BANNER_TEMPLATE = "youtube-banner";
export const DROPZONE_COPY = {
  desktop: {
    title: "Upload your image",
    subtitle: "Drag & drop or click Browse",
  },
  mobile: {
    title: "Upload your image",
    subtitle: "Click Browse",
  },
};

// Bootstrap interactions after shared exports are initialized.
void import("./event-handlers.js").catch((error) => {
  console.error("Failed to initialize event handlers.", error);
});
