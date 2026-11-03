/**
 * src/receiptImageService.js
 *
 * TALLYKHATA RECEIPT / VOUCHER IMAGE ATTACHMENT & STORAGE SERVICE
 * Milestone: REA-ITER-217 (OCR Voucher Scanner / Receipt Image Ingestion Pipeline)
 *
 * Implements receipt voucher image ingestion, thumbnail calculation, file management,
 * multi-tenant storage scoping, orphaned image garbage collection, cloud backup
 * sanitization, and OCR text extraction for retail bookkeeping in Bangladesh.
 */

const fs = typeof require !== 'undefined' ? require('fs') : null;
const path = typeof require !== 'undefined' ? require('path') : null;

// --- CONSTANTS ---
const RECEIPT_IMAGE_SCHEMA_VERSION = 1;
const DEFAULT_MAX_THUMBNAIL_DIMENSION = 200; // Standard bounding box 200x200
const DEFAULT_RECEIPT_DIR = 'receipt_images';
const RECEIPT_PREFIX = 'TK_RCP_';
const THUMBNAIL_PREFIX = 'TK_RCP_THUMB_';

const SUPPORTED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const SCANNER_STATES = Object.freeze({
  IDLE: 'IDLE',
  CAPTURING: 'CAPTURING',
  PROCESSING_OCR: 'PROCESSING_OCR',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
});

const BN_NUMS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

// --- BENGALI / ASCII NUMERAL & FILE SIZE FORMATTING ---

/**
 * Converts numbers/strings containing ASCII digits to Bengali numerals.
 * @param {number|string} val
 * @returns {string}
 */
function toBengaliNumeral(val) {
  if (val === null || val === undefined) return '';
  return String(val).replace(/[0-9]/g, (d) => BN_NUMS[parseInt(d, 10)] || d);
}

const toBengaliDigits = toBengaliNumeral;

/**
 * Converts Bengali numerals to ASCII digits.
 * @param {string} val
 * @returns {string}
 */
function toAsciiDigits(val) {
  if (val === null || val === undefined) return '';
  return String(val).replace(/[০-৯]/g, (d) => String(BN_NUMS.indexOf(d)));
}

/**
 * Formats file size in bytes to human-readable format (B, KB, MB) with locale support.
 * @param {number} bytes
 * @param {object} [options]
 * @param {'bn'|'en'} [options.locale='en']
 * @returns {string}
 */
function formatFileSize(bytes, options = { locale: 'en' }) {
  const b = Math.max(0, Number(bytes) || 0);
  const locale = options && options.locale ? options.locale : 'en';

  let formatted = '';
  if (b < 1024) {
    formatted = b + (locale === 'bn' ? ' বাইট' : ' B');
  } else if (b < 1048576) {
    const kb = (b / 1024).toFixed(1).replace(/\.0$/, '');
    formatted = kb + (locale === 'bn' ? ' কেবি' : ' KB');
  } else {
    const mb = (b / 1048576).toFixed(1).replace(/\.0$/, '');
    formatted = mb + (locale === 'bn' ? ' এমবি' : ' MB');
  }
  return locale === 'bn' ? toBengaliNumeral(formatted) : formatted;
}

// --- ID & FILE PATH GENERATION ---

/**
 * Generates a unique receipt image ID.
 * @returns {string}
 */
function generateReceiptImageId() {
  return 'rcp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

/**
 * Generates a canonical file name for a receipt image: TK_RCP_<journalId>_<timestamp>.<ext>
 * @param {string|number} journalId
 * @param {number} [timestamp=Date.now()]
 * @param {string} [ext='jpg']
 * @returns {string}
 */
function generateReceiptFileName(journalId, timestamp = Date.now(), ext = 'jpg') {
  const cleanId = String(journalId !== undefined && journalId !== null ? journalId : 'GEN').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanExt = String(ext || 'jpg').replace(/^\./, '').toLowerCase();
  return RECEIPT_PREFIX + cleanId + '_' + timestamp + '.' + cleanExt;
}

/**
 * Generates a canonical file name for a receipt thumbnail: TK_RCP_THUMB_<journalId>_<timestamp>.<ext>
 * @param {string|number} journalId
 * @param {number} [timestamp=Date.now()]
 * @param {string} [ext='jpg']
 * @returns {string}
 */
function generateReceiptThumbnailName(journalId, timestamp = Date.now(), ext = 'jpg') {
  const cleanId = String(journalId !== undefined && journalId !== null ? journalId : 'GEN').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanExt = String(ext || 'jpg').replace(/^\./, '').toLowerCase();
  return THUMBNAIL_PREFIX + cleanId + '_' + timestamp + '.' + cleanExt;
}

/**
 * Resolves directory path for local receipt images storage.
 * @param {string} [customPath=null]
 * @returns {string}
 */
function resolveReceiptDirectory(customPath = null) {
  if (customPath) return customPath;
  if (path) return path.join(DEFAULT_RECEIPT_DIR);
  return DEFAULT_RECEIPT_DIR;
}

// --- METADATA & VALIDATION ---

/**
 * Creates and normalizes receipt image metadata conforming to RECEIPT_IMAGE_SCHEMA_VERSION = 1.
 * Supports dual-compatibility aliases for frontend & backend ergonomics.
 *
 * @param {object} props
 * @returns {object} Normalized receipt image record
 */
function createReceiptImageMetadata(props = {}) {
  if (!props || typeof props !== 'object') {
    throw new Error('Receipt image properties must be an object');
  }

  const rawJournalId = props.journalId !== undefined && props.journalId !== null
    ? props.journalId
    : (props.journal_id !== undefined && props.journal_id !== null
        ? props.journal_id
        : (props.txnId !== undefined && props.txnId !== null ? props.txnId : null));

  if (rawJournalId === null || rawJournalId === undefined || String(rawJournalId).trim() === '') {
    throw new Error('journalId is required for receipt image metadata');
  }
  const journalId = String(rawJournalId).trim();

  const rawSize = props.fileSizeBytes !== undefined ? props.fileSizeBytes : props.fileSize;
  const fileSizeBytes = Math.max(0, Math.floor(Number(rawSize) || 0));

  const width = Math.max(0, Math.floor(Number(props.width) || 0));
  const height = Math.max(0, Math.floor(Number(props.height) || 0));

  let rawMime = String(props.mimeType || props.mime_type || 'image/jpeg').toLowerCase();
  if (rawMime === 'image/jpg') rawMime = 'image/jpeg';
  if (!SUPPORTED_MIME_TYPES.has(rawMime)) {
    throw new Error('Unsupported mimeType: ' + rawMime + '. Supported: ' + Array.from(SUPPORTED_MIME_TYPES).join(', '));
  }
  const mimeType = rawMime;

  const rawBizId = props.businessId !== undefined && props.businessId !== null
    ? props.businessId
    : (props.business_id !== undefined && props.business_id !== null ? props.business_id : '1');
  const businessId = String(rawBizId);

  const id = props.id || generateReceiptImageId();
  const timestamp = Date.now();
  const ext = mimeType === 'image/png' ? 'png' : (mimeType === 'image/webp' ? 'webp' : 'jpg');
  const fileName = props.fileName || generateReceiptFileName(journalId, timestamp, ext);

  const fileUri = props.fileUri !== undefined ? props.fileUri : (props.uri !== undefined ? props.uri : null);
  const thumbnailUri = props.thumbnailUri !== undefined ? props.thumbnailUri : (props.thumbnail !== undefined ? props.thumbnail : null);

  const ocrText = props.ocrText !== undefined ? props.ocrText : (props.ocr_text !== undefined ? props.ocr_text : null);
  const isSynced = Boolean(props.isSynced !== undefined ? props.isSynced : props.is_synced);
  const createdAt = props.createdAt || new Date().toISOString();
  const metadata = props.metadata && typeof props.metadata === 'object' ? { ...props.metadata } : {};

  return {
    id,
    fileName,
    fileUri,
    thumbnailUri,
    fileSizeBytes,
    width,
    height,
    mimeType,
    createdAt,
    journalId,
    businessId,
    ocrText,
    isSynced,
    metadata,
    // Ergonomic compatibility aliases
    uri: fileUri,
    thumbnail: thumbnailUri,
    fileSize: fileSizeBytes,
    journal_id: journalId,
    business_id: businessId,
    ocr_text: ocrText,
    is_synced: isSynced,
    version: RECEIPT_IMAGE_SCHEMA_VERSION,
  };
}

/**
 * Validates a receipt image record against schema invariants.
 *
 * @param {object} receipt
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateReceiptImage(receipt) {
  const errors = [];
  if (!receipt || typeof receipt !== 'object') {
    return { valid: false, errors: ['Receipt image must be an object'] };
  }

  if (!receipt.id || typeof receipt.id !== 'string') {
    errors.push('id is required and must be a string');
  }

  const jId = receipt.journalId !== undefined && receipt.journalId !== null
    ? receipt.journalId
    : receipt.journal_id;
  if (jId === undefined || jId === null || String(jId).trim() === '') {
    errors.push('journalId is required');
  }

  const bId = receipt.businessId !== undefined && receipt.businessId !== null
    ? receipt.businessId
    : receipt.business_id;
  if (bId === undefined || bId === null || String(bId).trim() === '') {
    errors.push('businessId is required');
  }

  const mime = String(receipt.mimeType || receipt.mime_type || '').toLowerCase();
  const normalizedMime = mime === 'image/jpg' ? 'image/jpeg' : mime;
  if (!SUPPORTED_MIME_TYPES.has(normalizedMime)) {
    errors.push('Invalid mimeType: ' + mime + '. Expected one of: ' + Array.from(SUPPORTED_MIME_TYPES).join(', '));
  }

  const size = Number(receipt.fileSizeBytes !== undefined ? receipt.fileSizeBytes : receipt.fileSize);
  if (isNaN(size) || size < 0) {
    errors.push('fileSizeBytes must be a non-negative number');
  }

  const w = Number(receipt.width);
  if (isNaN(w) || w < 0) {
    errors.push('width must be a non-negative integer');
  }

  const h = Number(receipt.height);
  if (isNaN(h) || h < 0) {
    errors.push('height must be a non-negative integer');
  }

  if (!receipt.createdAt || isNaN(Date.parse(receipt.createdAt))) {
    errors.push('createdAt must be a valid ISO date string');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Boolean helper for receipt image validation.
 * @param {object} receipt
 * @returns {boolean}
 */
function isValidReceiptImage(receipt) {
  return validateReceiptImage(receipt).valid;
}

// --- THUMBNAIL DIMENSIONS CALCULATOR ---

/**
 * Calculates thumbnail bounding box dimensions preserving aspect ratio.
 *
 * @param {number} origWidth - Original image width
 * @param {number} origHeight - Original image height
 * @param {number} [maxDimension=DEFAULT_MAX_THUMBNAIL_DIMENSION] - Maximum bounding dimension
 * @returns {{ width: number, height: number, scale: number }}
 */
function calculateThumbnailBounds(origWidth, origHeight, maxDimension = DEFAULT_MAX_THUMBNAIL_DIMENSION) {
  const w = Math.floor(Number(origWidth) || 0);
  const h = Math.floor(Number(origHeight) || 0);
  const maxDim = Math.max(1, Math.floor(Number(maxDimension) || DEFAULT_MAX_THUMBNAIL_DIMENSION));

  if (w <= 0 || h <= 0) {
    return { width: maxDim, height: maxDim, scale: 1.0 };
  }

  if (w <= maxDim && h <= maxDim) {
    return { width: w, height: h, scale: 1.0 };
  }

  const scale = maxDim / Math.max(w, h);
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
    scale: Math.round(scale * 10000) / 10000,
  };
}

// --- FILE SYSTEM STORAGE & GARBAGE COLLECTION ---

/**
 * Safely unlinks a receipt image file on disk with cross-platform URI normalization.
 *
 * @param {string} fileUri - Path or file:// URI
 * @param {object} [fsAdapter=null] - Optional filesystem adapter
 * @returns {Promise<{ success: boolean, deleted: boolean, fileUri: string, error?: string }>}
 */
async function deleteReceiptFile(fileUri, fsAdapter = null) {
  if (!fileUri) return { success: true, deleted: false, fileUri: null };
  const rawPath = String(fileUri).replace(/^file:\/\//, '');

  try {
    if (fsAdapter && typeof fsAdapter.unlink === 'function') {
      await fsAdapter.unlink(rawPath);
      return { success: true, deleted: true, fileUri };
    }
    if (fs && typeof fs.existsSync === 'function' && fs.existsSync(rawPath)) {
      fs.unlinkSync(rawPath);
      return { success: true, deleted: true, fileUri };
    }
    return { success: true, deleted: false, fileUri };
  } catch (err) {
    return { success: false, deleted: false, error: err.message, fileUri };
  }
}

/**
 * Scans the receipt directory and removes orphaned images not linked to active database records.
 *
 * @param {Array<object>} activeReceipts - List of current receipt image records
 * @param {string} [directoryPath=null] - Receipt directory to scan
 * @param {object} [fsAdapter=null] - Optional filesystem adapter
 * @returns {Promise<{ scannedCount: number, referencedCount: number, orphanedCount: number, deletedCount: number, bytesReclaimed: number, deletedFiles: string[], errors: Array<object> }>}
 */
async function cleanOrphanedReceiptImages(activeReceipts = [], directoryPath = null, fsAdapter = null) {
  const dir = directoryPath || resolveReceiptDirectory();
  const referencedNames = new Set();

  for (const r of activeReceipts) {
    if (!r) continue;
    if (r.fileName) referencedNames.add(path ? path.basename(r.fileName) : r.fileName);
    if (r.fileUri) {
      const clean = String(r.fileUri).replace(/^file:\/\//, '');
      referencedNames.add(path ? path.basename(clean) : clean);
    }
    if (r.thumbnailUri) {
      const clean = String(r.thumbnailUri).replace(/^file:\/\//, '');
      referencedNames.add(path ? path.basename(clean) : clean);
    }
  }

  let scannedCount = 0;
  let referencedCount = 0;
  let orphanedCount = 0;
  let deletedCount = 0;
  let bytesReclaimed = 0;
  const deletedFiles = [];
  const errors = [];

  try {
    if (!fs || typeof fs.existsSync !== 'function' || !fs.existsSync(dir)) {
      return { scannedCount, referencedCount, orphanedCount, deletedCount, bytesReclaimed, deletedFiles, errors };
    }

    const files = fs.readdirSync(dir);
    scannedCount = files.length;

    for (const f of files) {
      const fullPath = path ? path.join(dir, f) : dir + '/' + f;
      if (referencedNames.has(f)) {
        referencedCount++;
      } else {
        orphanedCount++;
        try {
          let size = 0;
          if (typeof fs.statSync === 'function') {
            const stats = fs.statSync(fullPath);
            size = stats.size;
          }
          if (fsAdapter && typeof fsAdapter.unlink === 'function') {
            await fsAdapter.unlink(fullPath);
          } else {
            fs.unlinkSync(fullPath);
          }
          deletedCount++;
          bytesReclaimed += size;
          deletedFiles.push(f);
        } catch (delErr) {
          errors.push({ file: f, error: delErr.message });
        }
      }
    }
  } catch (scanErr) {
    errors.push({ directory: dir, error: scanErr.message });
  }

  return {
    scannedCount,
    referencedCount,
    orphanedCount,
    deletedCount,
    bytesReclaimed,
    deletedFiles,
    errors,
  };
}

// --- CLOUD BACKUP SANITIZATION & STORAGE METRICS ---

/**
 * Strips heavy binary data, base64 payloads, and local file URIs for portable cloud backup.
 *
 * @param {Array<object>} receipts
 * @returns {Array<object>} Sanitized metadata records
 */
function sanitizeReceiptImagesForBackup(receipts = []) {
  if (!Array.isArray(receipts)) return [];
  return receipts.map((r) => {
    if (!r || typeof r !== 'object') return r;
    const {
      imageBlob,
      base64Data,
      data,
      rawBytes,
      blob,
      buffer,
      imageData,
      ...rest
    } = r;

    return {
      ...rest,
      fileUri: null, // Scrub local device path
      thumbnailUri: null,
      uri: null,
      thumbnail: null,
      sanitized: true,
      backupExcludedBinary: true,
    };
  });
}

/**
 * Calculates aggregate storage metrics for receipt images.
 *
 * @param {Array<object>} receipts
 * @param {object} [options]
 * @param {'bn'|'en'} [options.locale='en']
 * @returns {object}
 */
function calculateReceiptStorageUsage(receipts = [], options = {}) {
  const list = Array.isArray(receipts) ? receipts : [];
  const locale = options && options.locale ? options.locale : 'en';

  let totalBytes = 0;
  let withOcrCount = 0;
  const byMimeType = {};
  const byBusiness = {};

  for (const r of list) {
    if (!r) continue;
    const bytes = Number(r.fileSizeBytes !== undefined ? r.fileSizeBytes : r.fileSize) || 0;
    totalBytes += bytes;

    if (r.ocrText && typeof r.ocrText === 'string' && r.ocrText.trim().length > 0) {
      withOcrCount++;
    }

    const mime = r.mimeType || 'unknown';
    byMimeType[mime] = (byMimeType[mime] || 0) + bytes;

    const biz = String(r.businessId || '1');
    if (!byBusiness[biz]) byBusiness[biz] = { count: 0, bytes: 0 };
    byBusiness[biz].count++;
    byBusiness[biz].bytes += bytes;
  }

  const averageFileSizeBytes = list.length > 0 ? Math.round(totalBytes / list.length) : 0;

  return {
    totalCount: list.length,
    totalBytes,
    averageFileSizeBytes,
    withOcrCount,
    formattedBytesBn: formatFileSize(totalBytes, { locale: 'bn' }),
    formattedBytesEn: formatFileSize(totalBytes, { locale: 'en' }),
    formattedAverageBytesBn: formatFileSize(averageFileSizeBytes, { locale: 'bn' }),
    formattedAverageBytesEn: formatFileSize(averageFileSizeBytes, { locale: 'en' }),
    byMimeType,
    byBusiness,
  };
}

// --- OCR TEXT EXTRACTION & VOUCHER PARSER ---

/**
 * Extracts financial metadata (amounts, dates, memo numbers, keywords) from raw OCR text.
 *
 * @param {string} ocrText - Raw OCR text
 * @returns {object} Extracted voucher details
 */
function extractVoucherDetails(ocrText) {
  if (!ocrText || typeof ocrText !== 'string') {
    return {
      detectedAmounts: [],
      primaryAmount: null,
      detectedDates: [],
      memoNumber: null,
      keywords: [],
      rawText: '',
    };
  }

  const text = ocrText.trim();
  const detectedAmounts = [];
  const detectedDates = [];
  let memoNumber = null;
  const keywords = [];

  // 1. Detect keywords
  const KEYWORD_MAP = [
    { key: 'total', regex: /মোট|সর্বমোট|টাকা|total|net\s*amount|grand\s*total/i },
    { key: 'due', regex: /বাকি|দেনা|due/i },
    { key: 'paid', regex: /জমা|পরিশোধ|paid|cash/i },
    { key: 'memo', regex: /মেমো|রসিদ|চালান|ভাউচার|memo|receipt|voucher|bill|invoice/i },
  ];

  for (const km of KEYWORD_MAP) {
    if (km.regex.test(text)) {
      keywords.push(km.key);
    }
  }

  // 2. Extract Memo / Voucher Number
  const memoRegex = /(?:মেমো|রসিদ|রশিদ|চালান|ভাউচার|memo|receipt|voucher|invoice|bill)(?:\s*(?:নং|নম্বর|no|number|num))?[\s#№:.-]*([A-Za-z0-9_-]+)/i;
  const memoMatch = text.match(memoRegex);
  if (memoMatch && memoMatch[1]) {
    memoNumber = memoMatch[1].trim();
  }

  // 3. Extract Dates (Bengali and ASCII)
  const dateRegex = /\b(\d{1,4}[-/.]\d{1,2}[-/.]\d{2,4})\b/g;
  let dMatch;
  while ((dMatch = dateRegex.exec(text)) !== null) {
    detectedDates.push(dMatch[1]);
  }

  // 4. Extract Amounts
  const normalizedText = toAsciiDigits(text);
  const lines = normalizedText.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (/মোট|total|grand|net|জমা|পরিশোধ|paid|cash|due|বাকি|টাকা/i.test(trimmed)) {
      const matches = trimmed.match(/([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/g);
      if (matches) {
        for (const m of matches) {
          const cleanNum = parseFloat(m.replace(/,/g, ''));
          if (!isNaN(cleanNum) && cleanNum > 0 && !detectedAmounts.includes(cleanNum)) {
            detectedAmounts.push(cleanNum);
          }
        }
      }
    }
  }

  if (detectedAmounts.length === 0) {
    const globalMatches = normalizedText.match(/\b([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)\b/g);
    if (globalMatches) {
      for (const m of globalMatches) {
        const cleanNum = parseFloat(m.replace(/,/g, ''));
        if (!isNaN(cleanNum) && cleanNum > 0 && (cleanNum < 1900 || cleanNum > 2100) && !detectedAmounts.includes(cleanNum)) {
          detectedAmounts.push(cleanNum);
        }
      }
    }
  }

  const primaryAmount = detectedAmounts.length > 0 ? Math.max(...detectedAmounts) : null;

  return {
    detectedAmounts,
    primaryAmount,
    detectedDates,
    memoNumber,
    keywords,
    rawText: text,
  };
}

// --- SCANNER STATE MACHINE ---

class ReceiptScannerStateMachine {
  constructor() {
    this.state = SCANNER_STATES.IDLE;
    this.listeners = new Map();
    this.currentReceipt = null;
    this.lastError = null;
  }

  on(event, cb) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(cb);
    return () => this.listeners.get(event)?.delete(cb);
  }

  emit(event, data) {
    const set = this.listeners.get(event);
    if (set) {
      for (const cb of set) {
        try { cb(data); } catch (_) {}
      }
    }
  }

  startCapture() {
    if (this.state === SCANNER_STATES.PROCESSING_OCR) {
      throw new Error('Cannot start capture while OCR is processing');
    }
    this.state = SCANNER_STATES.CAPTURING;
    this.currentReceipt = null;
    this.lastError = null;
    this.emit('stateChange', { state: this.state });
    return this.state;
  }

  captureSuccess(imageProps) {
    this.state = SCANNER_STATES.PROCESSING_OCR;
    this.emit('stateChange', { state: this.state, image: imageProps });
    return this.state;
  }

  processOcrComplete(ocrText, receiptData = {}) {
    const voucherInfo = extractVoucherDetails(ocrText);
    const metadata = createReceiptImageMetadata({
      ...receiptData,
      ocrText,
      metadata: {
        ...(receiptData.metadata || {}),
        voucherInfo,
      },
    });
    this.currentReceipt = metadata;
    this.state = SCANNER_STATES.COMPLETED;
    this.emit('stateChange', { state: this.state, receipt: metadata });
    this.emit('completed', metadata);
    return metadata;
  }

  fail(error) {
    this.state = SCANNER_STATES.FAILED;
    this.lastError = error;
    this.emit('stateChange', { state: this.state, error });
    this.emit('error', error);
    return this.state;
  }

  reset() {
    this.state = SCANNER_STATES.IDLE;
    this.currentReceipt = null;
    this.lastError = null;
    this.emit('stateChange', { state: this.state });
    return this.state;
  }
}

// --- UNIFIED EXPORTS ---

const receiptImageService = {
  RECEIPT_IMAGE_SCHEMA_VERSION,
  DEFAULT_MAX_THUMBNAIL_DIMENSION,
  DEFAULT_RECEIPT_DIR,
  RECEIPT_PREFIX,
  THUMBNAIL_PREFIX,
  SUPPORTED_MIME_TYPES,
  SCANNER_STATES,
  toBengaliNumeral,
  toBengaliDigits,
  toAsciiDigits,
  formatFileSize,
  generateReceiptImageId,
  generateReceiptFileName,
  generateReceiptThumbnailName,
  resolveReceiptDirectory,
  createReceiptImageMetadata,
  validateReceiptImage,
  isValidReceiptImage,
  calculateThumbnailBounds,
  deleteReceiptFile,
  cleanOrphanedReceiptImages,
  sanitizeReceiptImagesForBackup,
  calculateReceiptStorageUsage,
  extractVoucherDetails,
  ReceiptScannerStateMachine,
  // Cross-worker interoperability aliases
  RECEIPT_SCHEMA_VERSION: RECEIPT_IMAGE_SCHEMA_VERSION,
  createReceiptRecord: createReceiptImageMetadata,
  validateReceipt: validateReceiptImage,
  parseVoucherOcrText: extractVoucherDetails,
  receiptImageService: null,
  default: null,
};

// Circular self references for flexible destructuring/default imports
receiptImageService.receiptImageService = receiptImageService;
receiptImageService.default = receiptImageService;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = receiptImageService;
  module.exports.default = receiptImageService;
}
if (typeof window !== 'undefined') {
  window.receiptImageService = receiptImageService;
}
if (typeof global !== 'undefined') {
  global.receiptImageService = receiptImageService;
}
