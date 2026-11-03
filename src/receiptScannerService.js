/**
 * src/receiptScannerService.js
 *
 * TALLYKHATA VOUCHER / RECEIPT CAMERA SCANNER & VIEWER SERVICE
 * Milestone: REA-ITER-217
 * Worker: Worker 3 (Ohm - Principal Frontend Developer, UI/UX & QA Owner)
 * Thread ID: 01a19154-e3ee-7ab2-b682-798b64a0bb6b
 */

// --- CONSTANTS ---
const RECEIPT_SCHEMA_VERSION = 1;
const MAX_RECEIPT_FILE_SIZE = 5 * 1024 * 1024; // 5 MB maximum file size
const DEFAULT_CROP_RECT = Object.freeze({ x: 0.05, y: 0.05, width: 0.9, height: 0.9 });
const ROTATION_ANGLES = Object.freeze([0, 90, 180, 270]);
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4.0;
const ZOOM_STEP = 0.25;

const SCANNER_STATES = Object.freeze({
  IDLE: 'IDLE',
  SCANNING: 'SCANNING',
  CAPTURED: 'CAPTURED',
  CROPPING: 'CROPPING',
  ATTACHED: 'ATTACHED',
});

const VIEWER_STATES = Object.freeze({
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  ZOOMED: 'ZOOMED',
});

const SUPPORTED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const BN_NUMS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

// --- NUMERAL & FORMATTING CONVERSIONS ---
function toBengaliNumeral(val) {
  if (val === null || val === undefined) return '';
  return String(val).replace(/[0-9]/g, function(d) {
    return BN_NUMS[parseInt(d, 10)] || d;
  });
}

const toBengaliDigits = toBengaliNumeral;

function toAsciiDigits(val) {
  if (val === null || val === undefined) return '';
  const bnMap = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
  return String(val).replace(/[০-৯]/g, function(ch) {
    return bnMap[ch] || ch;
  });
}

/**
 * Format raw bytes into human-readable size string in Bengali or English.
 * e.g. 245760 bytes -> '২৪০ কেবি' / '240 KB'
 */
function formatFileSize(bytes, lang) {
  lang = lang || 'bn';
  if (!bytes || bytes <= 0) return lang === 'bn' ? '০ কেবি' : '0 KB';
  const kb = bytes / 1024;
  if (kb < 1024) {
    const formatted = Math.round(kb);
    return lang === 'bn' ? (toBengaliDigits(formatted) + ' কেবি') : (formatted + ' KB');
  }
  const mb = (kb / 1024).toFixed(1);
  return lang === 'bn' ? (toBengaliDigits(mb) + ' এমবি') : (mb + ' MB');
}

/**
 * Format image dimensions into formatted string.
 * e.g. 1080, 1920 -> '১০৮০ × ১৯২০' / '1080 × 1920'
 */
function formatImageDimensions(width, height, lang) {
  lang = lang || 'bn';
  if (!width || !height) return '';
  if (lang === 'bn') {
    return toBengaliDigits(width) + ' × ' + toBengaliDigits(height);
  }
  return width + ' × ' + height;
}

/**
 * Calculate next clockwise rotation angle (0 -> 90 -> 180 -> 270 -> 0).
 */
function calculateNextRotation(current) {
  current = current || 0;
  const norm = ((current % 360) + 360) % 360;
  return (norm + 90) % 360;
}

/**
 * Clamp zoom level between MIN_ZOOM (0.5x) and MAX_ZOOM (4.0x).
 */
function clampZoom(zoom) {
  zoom = zoom !== undefined ? zoom : 1.0;
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(zoom * 100) / 100));
}

/**
 * Validate crop rectangle coordinates within [0.0, 1.0] bounds.
 */
function validateCropRect(rect) {
  if (!rect || typeof rect !== 'object') return Object.assign({}, DEFAULT_CROP_RECT);
  let x = Math.max(0, Math.min(0.9, Number(rect.x) || 0));
  let y = Math.max(0, Math.min(0.9, Number(rect.y) || 0));
  const maxWidth = Math.round((1.0 - x) * 1000) / 1000;
  const maxHeight = Math.round((1.0 - y) * 1000) / 1000;
  let width = Math.min(maxWidth, Math.max(0.05, Number(rect.width) || 0.9));
  let height = Math.min(maxHeight, Math.max(0.05, Number(rect.height) || 0.9));
  return { x: x, y: y, width: width, height: height };
}

/**
 * Construct and validate a Voucher / Receipt record.
 */
function createReceiptRecord(opts) {
  opts = opts || {};
  const now = new Date();
  const id = opts.id || ('receipt_' + now.getTime() + '_' + Math.random().toString(36).substring(2, 8));
  const uri = opts.uri || ('file:///storage/emulated/0/Android/data/com.tallykhata.app/files/receipts/' + id + '.jpg');
  const thumbnailUri = opts.thumbnailUri || uri;
  const width = Number(opts.width) || 1080;
  const height = Number(opts.height) || 1920;
  const fileSize = Number(opts.fileSize) || 245760; // 240 KB default
  const mimeType = opts.mimeType || 'image/jpeg';
  const timestamp = opts.timestamp || now.toISOString();
  const txnId = opts.txnId || null;
  const accountId = opts.accountId || null;
  const businessId = opts.businessId || 'biz_default';
  const title = opts.title || (opts.txnType ? ('Voucher (' + opts.txnType + ')') : 'Voucher Receipt');
  const rotation = opts.rotation !== undefined ? Number(opts.rotation) % 360 : 0;
  const cropRect = validateCropRect(opts.cropRect);
  const ocrData = opts.ocrData || null;

  return {
    version: RECEIPT_SCHEMA_VERSION,
    id: id,
    uri: uri,
    thumbnailUri: thumbnailUri,
    width: width,
    height: height,
    fileSize: fileSize,
    mimeType: mimeType,
    timestamp: timestamp,
    txnId: txnId,
    accountId: accountId,
    businessId: businessId,
    title: title,
    rotation: rotation,
    cropRect: cropRect,
    ocrData: ocrData,
  };
}

/**
 * Validate receipt invariants:
 * - Must have id and uri
 * - File size <= MAX_RECEIPT_FILE_SIZE (5 MB)
 * - Valid MIME type
 */
function validateReceipt(receipt) {
  const errors = [];
  if (!receipt || typeof receipt !== 'object') {
    return { valid: false, errors: ['Receipt must be an object'] };
  }
  if (!receipt.id) errors.push('Receipt ID is required');
  if (!receipt.uri) errors.push('Receipt URI is required');
  if (receipt.fileSize && receipt.fileSize > MAX_RECEIPT_FILE_SIZE) {
    errors.push('File size exceeds 5MB limit (' + receipt.fileSize + ' bytes)');
  }
  if (receipt.mimeType && !SUPPORTED_MIME_TYPES.has(receipt.mimeType)) {
    errors.push('Unsupported MIME type: ' + receipt.mimeType);
  }
  return { valid: errors.length === 0, errors: errors };
}

/**
 * Lightweight Voucher OCR parser simulator:
 * Extracts amounts, date, and possible merchant name from raw text.
 */
function parseVoucherOcrText(rawText) {
  rawText = rawText || '';
  if (!rawText || typeof rawText !== 'string') {
    return { detectedAmount: null, detectedDate: null, detectedMerchant: null, confidence: 0 };
  }

  let detectedAmount = null;
  let detectedDate = null;
  let detectedMerchant = null;

  // Normalize Bengali numerals to ASCII for parser
  const asciiText = toAsciiDigits(rawText);

  // Amount pattern (e.g. ৳ 1,500, TK 1200, 1500.00, etc.)
  const amountMatch = asciiText.match(/(?:৳|Tk|TK|Total|মোট|টাকা)[:\s]*([0-9,]+(?:\.[0-9]{1,2})?)/i);
  if (amountMatch) {
    const cleanNum = parseFloat(amountMatch[1].replace(/,/g, ''));
    if (!isNaN(cleanNum)) detectedAmount = cleanNum;
  }

  // Date pattern (DD/MM/YYYY or YYYY-MM-DD or DD-MM-YYYY)
  const dateMatch = rawText.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})|(\d{4}[/-]\d{1,2}[/-]\d{1,2})/);
  if (dateMatch) {
    detectedDate = dateMatch[0];
  }

  // Merchant name pattern (first non-empty line with letters)
  const lines = rawText.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 2; });
  if (lines.length > 0 && !lines[0].match(/^(Voucher|Receipt|Bill|Date|Memo|ভাউচার|মেমো)/i)) {
    detectedMerchant = lines[0];
  }

  const confidence = (detectedAmount ? 0.5 : 0) + (detectedDate ? 0.3 : 0) + (detectedMerchant ? 0.2 : 0);

  return {
    rawText: rawText,
    detectedAmount: detectedAmount,
    detectedDate: detectedDate,
    detectedMerchant: detectedMerchant,
    confidence: Math.round(confidence * 100) / 100,
  };
}

/**
 * Generate a deterministic Mock Receipt for testing & preview.
 */
function generateMockReceipt(txnType, amount, debtorName) {
  txnType = txnType || 'SELL';
  amount = amount !== undefined ? amount : 1500;
  debtorName = debtorName || 'করিম ট্রেডার্স';

  const mockText = 'মেসার্স ' + debtorName + '\nক্যাশ মেমো\nতারিখ: ০৩/১১/২০২৬\nমোট টাকা: ৳ ' + amount + '\nধন্যবাদ আবার আসবেন';
  const ocr = parseVoucherOcrText(mockText);

  return createReceiptRecord({
    title: debtorName + ' - ' + txnType,
    fileSize: 184320, // 180 KB
    ocrData: ocr,
  });
}

/**
 * Receipt Scanner State Machine controller.
 */
function ReceiptScannerController() {
  this.state = SCANNER_STATES.IDLE;
  this.capturedPhoto = null;
  this.rotation = 0;
  this.cropRect = Object.assign({}, DEFAULT_CROP_RECT);
  this.flashMode = false;
  this.cameraType = 'back';
}

ReceiptScannerController.prototype.startScanning = function() {
  this.state = SCANNER_STATES.SCANNING;
  this.capturedPhoto = null;
  this.rotation = 0;
  this.cropRect = Object.assign({}, DEFAULT_CROP_RECT);
  return this.state;
};

ReceiptScannerController.prototype.capture = function(mockPhotoUri) {
  if (this.state !== SCANNER_STATES.SCANNING) {
    throw new Error('Cannot capture photo from state ' + this.state);
  }
  this.state = SCANNER_STATES.CAPTURED;
  this.capturedPhoto = mockPhotoUri || ('file:///storage/emulated/0/DCIM/Camera/IMG_' + Date.now() + '.jpg');
  return this.capturedPhoto;
};

ReceiptScannerController.prototype.rotate = function() {
  this.rotation = calculateNextRotation(this.rotation);
  return this.rotation;
};

ReceiptScannerController.prototype.setCrop = function(rect) {
  this.state = SCANNER_STATES.CROPPING;
  this.cropRect = validateCropRect(rect);
  return this.cropRect;
};

ReceiptScannerController.prototype.toggleFlash = function() {
  this.flashMode = !this.flashMode;
  return this.flashMode;
};

ReceiptScannerController.prototype.switchCamera = function() {
  this.cameraType = this.cameraType === 'back' ? 'front' : 'back';
  return this.cameraType;
};

ReceiptScannerController.prototype.retake = function() {
  this.state = SCANNER_STATES.SCANNING;
  this.capturedPhoto = null;
  this.rotation = 0;
  this.cropRect = Object.assign({}, DEFAULT_CROP_RECT);
  return this.state;
};

ReceiptScannerController.prototype.finalize = function(extraOpts) {
  extraOpts = extraOpts || {};
  if (!this.capturedPhoto) {
    throw new Error('No photo captured to finalize');
  }
  this.state = SCANNER_STATES.ATTACHED;
  const recordOpts = Object.assign({
    uri: this.capturedPhoto,
    rotation: this.rotation,
    cropRect: this.cropRect,
  }, extraOpts);
  return createReceiptRecord(recordOpts);
};

ReceiptScannerController.prototype.reset = function() {
  this.state = SCANNER_STATES.IDLE;
  this.capturedPhoto = null;
  this.rotation = 0;
  this.cropRect = Object.assign({}, DEFAULT_CROP_RECT);
  this.flashMode = false;
  this.cameraType = 'back';
};

/**
 * Receipt Viewer Controller for zoom, pan, and rotation interactions.
 */
function ReceiptViewerController() {
  this.state = VIEWER_STATES.CLOSED;
  this.activeReceipt = null;
  this.zoom = 1.0;
  this.rotation = 0;
}

ReceiptViewerController.prototype.open = function(receipt) {
  if (!receipt) throw new Error('Receipt is required to open viewer');
  this.state = VIEWER_STATES.OPEN;
  this.activeReceipt = receipt;
  this.zoom = 1.0;
  this.rotation = receipt.rotation || 0;
  return this.activeReceipt;
};

ReceiptViewerController.prototype.zoomIn = function() {
  this.zoom = clampZoom(this.zoom + ZOOM_STEP);
  if (this.zoom > 1.0) this.state = VIEWER_STATES.ZOOMED;
  return this.zoom;
};

ReceiptViewerController.prototype.zoomOut = function() {
  this.zoom = clampZoom(this.zoom - ZOOM_STEP);
  if (this.zoom <= 1.0) this.state = VIEWER_STATES.OPEN;
  return this.zoom;
};

ReceiptViewerController.prototype.resetZoom = function() {
  this.zoom = 1.0;
  this.state = VIEWER_STATES.OPEN;
  return this.zoom;
};

ReceiptViewerController.prototype.rotate = function() {
  this.rotation = calculateNextRotation(this.rotation);
  return this.rotation;
};

ReceiptViewerController.prototype.close = function() {
  this.state = VIEWER_STATES.CLOSED;
  this.activeReceipt = null;
  this.zoom = 1.0;
  this.rotation = 0;
};

module.exports = {
  RECEIPT_SCHEMA_VERSION: RECEIPT_SCHEMA_VERSION,
  MAX_RECEIPT_FILE_SIZE: MAX_RECEIPT_FILE_SIZE,
  DEFAULT_CROP_RECT: DEFAULT_CROP_RECT,
  ROTATION_ANGLES: ROTATION_ANGLES,
  MIN_ZOOM: MIN_ZOOM,
  MAX_ZOOM: MAX_ZOOM,
  ZOOM_STEP: ZOOM_STEP,
  SCANNER_STATES: SCANNER_STATES,
  VIEWER_STATES: VIEWER_STATES,
  SUPPORTED_MIME_TYPES: SUPPORTED_MIME_TYPES,
  toBengaliNumeral: toBengaliNumeral,
  toBengaliDigits: toBengaliDigits,
  toAsciiDigits: toAsciiDigits,
  formatFileSize: formatFileSize,
  formatImageDimensions: formatImageDimensions,
  calculateNextRotation: calculateNextRotation,
  clampZoom: clampZoom,
  validateCropRect: validateCropRect,
  createReceiptRecord: createReceiptRecord,
  validateReceipt: validateReceipt,
  parseVoucherOcrText: parseVoucherOcrText,
  generateMockReceipt: generateMockReceipt,
  ReceiptScannerController: ReceiptScannerController,
  ReceiptViewerController: ReceiptViewerController,
};
