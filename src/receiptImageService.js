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

const CONFIDENCE_HIGH = 0.85;
const CONFIDENCE_MEDIUM = 0.60;

const BENGALI_MONTHS = Object.freeze({
  'জানুয়ারি': 1, 'জানুয়ারি': 1,
  'ফেব্রুয়ারি': 2, 'ফেব্রুয়ারি': 2,
  'মার্চ': 3,
  'এপ্রিল': 4,
  'মে': 5,
  'জুন': 6,
  'জুলাই': 7,
  'আগস্ট': 8, 'আগষ্ট': 8,
  'সেপ্টেম্বর': 9,
  'অক্টোবর': 10,
  'নভেম্বর': 11,
  'ডিসেম্বর': 12,
});

const ENGLISH_MONTHS = Object.freeze({
  'january': 1, 'jan': 1,
  'february': 2, 'feb': 2,
  'march': 3, 'mar': 3,
  'april': 4, 'apr': 4,
  'may': 5,
  'june': 6, 'jun': 6,
  'july': 7, 'jul': 7,
  'august': 8, 'aug': 8,
  'september': 9, 'sep': 9, 'sept': 9,
  'october': 10, 'oct': 10,
  'november': 11, 'nov': 11,
  'december': 12, 'dec': 12,
});

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
  let ocrInference = props.ocrInference !== undefined ? props.ocrInference : null;
  if (!ocrInference && ocrText && typeof ocrText === 'string' && ocrText.trim() !== '') {
    try {
      ocrInference = inferVoucherFields(ocrText);
    } catch (_) {
      ocrInference = null;
    }
  }
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
    ocrInference,
    isSynced,
    metadata,
    // Ergonomic compatibility aliases
    uri: fileUri,
    thumbnail: thumbnailUri,
    fileSize: fileSizeBytes,
    journal_id: journalId,
    business_id: businessId,
    ocr_text: ocrText,
    ocr_inference: ocrInference,
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
  const normalizedDateText = toAsciiDigits(text);
  while ((dMatch = dateRegex.exec(normalizedDateText)) !== null) {
    detectedDates.push(dMatch[1]);
  }

  // 4. Extract Amounts
  const normalizedText = toAsciiDigits(text);
  const lines = normalizedText.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (/মোট|total|grand|net|জমা|পরিশোধ|paid|cash|due|বাকি|টাকা/i.test(trimmed)) {
      const matches = trimmed.match(/(?:[0-9]{1,3}(?:,[0-9]{2,3})+(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/g);
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
    const globalMatches = normalizedText.match(/\b(?:[0-9]{1,3}(?:,[0-9]{2,3})+(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)\b/g);
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


/**
 * Invariant-backed OCR Voucher Fields Inference Engine (Iteration 218)
 * Extracts and scores amount, integer paisa, date, voucher/memo number, party name,
 * and transaction type from raw OCR text with multi-factor confidence scoring.
 *
 * @param {string|object} rawInput - Raw OCR text string or receipt object
 * @param {object} [options] - Optional override preferences
 * @returns {object} Inferred voucher fields with confidence metadata
 */
function inferVoucherFields(rawInput, options = {}) {
  options = options || {};
  let text = '';
  if (typeof rawInput === 'string') {
    text = rawInput;
  } else if (rawInput && typeof rawInput === 'object') {
    text = rawInput.ocrText || rawInput.ocr_text || rawInput.rawText || (rawInput.ocrData && rawInput.ocrData.rawText) || '';
  }

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return {
      amount: null,
      amountPaisa: 0,
      amountFormatted: '',
      amountFormattedEn: '',
      candidateAmounts: [],
      date: null,
      dateBn: '',
      voucherNo: null,
      voucherNoBn: '',
      partyName: null,
      transactionType: null,
      confidence: 0,
      overallConfidence: 0,
      confidenceTier: 'low',
      isHighConfidence: false,
      isMediumConfidence: false,
      fieldConfidences: {
        amount: 0,
        date: 0,
        voucherNo: 0,
        partyName: 0,
        transactionType: 0,
        voucher: 0,
        party: 0,
      },
      rawText: String(text || ''),
      isAutoDetected: false,
      candidates: {
        amounts: [],
        dates: [],
        voucherNumbers: [],
        parties: [],
      },
    };
  }

  const cleanText = text.trim();
  const asciiText = toAsciiDigits(cleanText);
  const lines = cleanText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // 1. EXTRACT AMOUNTS & INTEGER PAISA
  const amountCandidates = [];
  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx];
    const isDateLine = /(?:তারিখ|তাং|Date|Dated|Dt)[\s:.\-=]/i.test(rawLine);
    const isVoucherLine = /(?:মেমো|রসিদ|চালান|ভাউচার|Memo|Receipt|Invoice|Bill|Challan)\s*(?:নং|no)?[\s:.\-=]/i.test(rawLine);
    const hasCurrency = /(?:৳|টাকা|Tk\.?|BDT|\/[-=])/i.test(rawLine);

    if ((isDateLine || isVoucherLine) && !hasCurrency) {
      continue;
    }

    const isGrandTotal = /(?:সর্বমোট|গ্র্যান্ড\s*টোটাল|grand\s*total|net\s*total|মোট\s*টাকা|মোট\s*বিল|মোট\s*বকেয়া|মোট\s*বকেয়া)/i.test(rawLine);
    const isTotal = /(?:মোট|total|বিল\s*টাকা|টাকার\s*পরিমাণ|মোট\s*মূল্য|নিট\s*পরিশোধ|net\s*amount)/i.test(rawLine);
    const isDueOrPaid = /(?:বাকি|বাকী|দেনা|জমা|পরিশোধ|নগদ|paid|due|cash)/i.test(rawLine);

    const asciiLine = toAsciiDigits(rawLine);
    const matches = asciiLine.matchAll(/(?:৳|Tk\.?|BDT)?\s*\b([0-9]{1,3}(?:,[0-9]{2,3})+(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)\b\s*(?:\/[-=]|\s*টাকা|\s*Tk\.?|\s*৳)?/gi);

    for (const m of matches) {
      const cleanNum = m[1].replace(/,/g, '');
      const val = parseFloat(cleanNum);
      if (isNaN(val) || val <= 0) continue;

      if (!hasCurrency && (val >= 1990 && val <= 2050) && !isGrandTotal && !isTotal) {
        continue;
      }
      if (val > 100000000 && !isGrandTotal) {
        continue;
      }

      let priority = 1;
      let conf = 0.50;

      if (isGrandTotal) {
        priority = 5;
        conf = 0.95;
      } else if (isTotal) {
        priority = 4;
        conf = 0.90;
      } else if (isDueOrPaid && hasCurrency) {
        priority = 3;
        conf = 0.85;
      } else if (hasCurrency) {
        priority = 2;
        conf = 0.75;
      } else {
        priority = 1;
        conf = 0.50;
      }

      amountCandidates.push({
        raw: m[0].trim(),
        value: Math.round(val * 100) / 100,
        paisa: Math.round(val * 100),
        priority,
        confidence: conf,
        lineIndex: idx,
        line: rawLine,
      });
    }
  }

  amountCandidates.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return b.value - a.value;
  });

  const primaryAmount = amountCandidates.length > 0 ? amountCandidates[0].value : null;
  const primaryAmountPaisa = primaryAmount !== null ? Math.round(primaryAmount * 100) : 0;
  const amountMatchQuality = amountCandidates.length > 0 ? amountCandidates[0].confidence : 0;
  const candidateAmounts = amountCandidates.map(c => c.value);

  // 2. EXTRACT DATES
  const dateCandidates = [];

  for (const [mName, mNum] of Object.entries(BENGALI_MONTHS)) {
    const regex = new RegExp('([০-৯0-9]{1,2})\\s+' + mName + '(?:\\s*,?\\s*([০-৯0-9]{2,4}))?', 'i');
    const m = cleanText.match(regex);
    if (m) {
      const day = parseInt(toAsciiDigits(m[1]), 10);
      let year = m[2] ? parseInt(toAsciiDigits(m[2]), 10) : new Date().getFullYear();
      if (year < 100) year += 2000;
      if (day >= 1 && day <= 31 && year >= 2000 && year <= 2099) {
        const iso = `${year}-${String(mNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dateCandidates.push({ raw: m[0], iso, confidence: 0.95 });
      }
    }
  }

  for (const [mName, mNum] of Object.entries(ENGLISH_MONTHS)) {
    const regex1 = new RegExp('\\b([0-9]{1,2})\\s+' + mName + '(?:\\s*,?\\s*([0-9]{2,4}))?\\b', 'i');
    const m1 = asciiText.match(regex1);
    if (m1) {
      const day = parseInt(m1[1], 10);
      let year = m1[2] ? parseInt(m1[2], 10) : new Date().getFullYear();
      if (year < 100) year += 2000;
      if (day >= 1 && day <= 31 && year >= 2000 && year <= 2099) {
        const iso = `${year}-${String(mNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dateCandidates.push({ raw: m1[0], iso, confidence: 0.95 });
      }
    }
    const regex2 = new RegExp('\\b' + mName + '\\s+([0-9]{1,2})(?:\\s*,?\\s*([0-9]{2,4}))?\\b', 'i');
    const m2 = asciiText.match(regex2);
    if (m2) {
      const day = parseInt(m2[1], 10);
      let year = m2[2] ? parseInt(m2[2], 10) : new Date().getFullYear();
      if (year < 100) year += 2000;
      if (day >= 1 && day <= 31 && year >= 2000 && year <= 2099) {
        const iso = `${year}-${String(mNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dateCandidates.push({ raw: m2[0], iso, confidence: 0.95 });
      }
    }
  }

  for (const line of lines) {
    const isDateAnchor = /(?:তারিখ|তাং|Date|Dated|Dt)[\s:.\-=]+/i.test(line);
    const lineAscii = toAsciiDigits(line);

    const dMatch = lineAscii.match(/(?:তারিখ|তাং|Date|Dated|Dt)?[\s:.\-=]*\b([0-3]?[0-9])[-/.]([0-1]?[0-9])[-/.](20[0-9]{2}|19[0-9]{2}|[0-9]{2})\b/i);
    if (dMatch) {
      let day = parseInt(dMatch[1], 10);
      let month = parseInt(dMatch[2], 10);
      let year = parseInt(dMatch[3], 10);
      if (year < 100) year += 2000;
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 2000 && year <= 2099) {
        const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dateCandidates.push({ raw: dMatch[0].trim(), iso, confidence: isDateAnchor ? 0.95 : 0.85 });
      }
    }

    const yMatch = lineAscii.match(/\b(20[0-9]{2})[-/.]([0-1]?[0-9])[-/.]([0-3]?[0-9])\b/);
    if (yMatch) {
      let year = parseInt(yMatch[1], 10);
      let month = parseInt(yMatch[2], 10);
      let day = parseInt(yMatch[3], 10);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 2000 && year <= 2099) {
        const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dateCandidates.push({ raw: yMatch[0].trim(), iso, confidence: isDateAnchor ? 0.95 : 0.85 });
      }
    }
  }

  dateCandidates.sort((a, b) => b.confidence - a.confidence);
  const detectedDate = dateCandidates.length > 0 ? dateCandidates[0].iso : null;
  const dateMatchQuality = dateCandidates.length > 0 ? dateCandidates[0].confidence : 0;

  // 3. EXTRACT VOUCHER / MEMO NUMBER
  const voucherCandidates = [];
  for (const line of lines) {
    const vMatch1 = line.match(/(?:ক্যাশ\s*মেমো|মেমো|রসিদ|রশিদ|চালান|ভাউচার|বিল|ইনভয়েস|Cash\s*Memo|Memo|Receipt|Voucher|Invoice|Bill|Challan|Chalan)\s*(?:নং|নম্বর|no\.?|num\.?|number|#)?[\s#:.\-=]+([A-Za-z0-9০-৯_\-\/]+)/i);
    if (vMatch1 && vMatch1[1]) {
      const v = vMatch1[1].trim();
      if (v.length >= 1 && !/^(টাকা|মোট|তারিখ|Date)$/i.test(v)) {
        voucherCandidates.push({ raw: v, confidence: 0.90 });
      }
    }
    const vMatch2 = line.match(/(?:নং|নম্বর|no\.?|num\.?|number|#)[\s#:.\-=]+([A-Za-z0-9০-৯_\-\/]+)/i);
    if (vMatch2 && vMatch2[1]) {
      const v = vMatch2[1].trim();
      if (v.length >= 1 && !/^(টাকা|মোট|তারিখ|Date)$/i.test(v)) {
        voucherCandidates.push({ raw: v, confidence: 0.70 });
      }
    }
  }

  voucherCandidates.sort((a, b) => b.confidence - a.confidence);
  const memoNumber = voucherCandidates.length > 0 ? voucherCandidates[0].raw : null;
  const voucherMatchQuality = voucherCandidates.length > 0 ? voucherCandidates[0].confidence : 0;

  // 4. EXTRACT PARTY / CUSTOMER / VENDOR NAME
  const partyCandidates = [];
  const customerPattern = /(?:ক্রেতার\s*নাম|গ্রাহকের\s*নাম|পার্টির\s*নাম|প্রাপকের\s*নাম|প্রাপক|গ্রাহক|ক্রেতা|Customer\s*Name|Party\s*Name|Recipient|Customer|Client|Billed\s*To|Sold\s*To)\s*[:.\-=]+\s*([^\r\n,;|]+)/i;
  for (const line of lines) {
    const m = line.match(customerPattern);
    if (m && m[1]) {
      const clean = m[1].trim().replace(/^[:.\-\s]+|[:.\-\s]+$/g, '');
      if (clean.length >= 2 && !/^(ক্যাশ\s*মেমো|চালান|রসিদ|ভাউচার|বিল)$/i.test(clean)) {
        partyCandidates.push({ raw: clean, confidence: 0.90 });
      }
    }
  }

  const namePattern = /(?:^|\s)নাম\s*[:.\-=]+\s*([^\r\n,;|]+)/i;
  for (const line of lines) {
    const m = line.match(namePattern);
    if (m && m[1]) {
      const clean = m[1].trim().replace(/^[:.\-\s]+|[:.\-\s]+$/g, '');
      if (clean.length >= 2 && !/^(ক্যাশ\s*মেমো|চালান|রসিদ|ভাউচার|বিল|বাকি|জমা)$/i.test(clean)) {
        partyCandidates.push({ raw: clean, confidence: 0.80 });
      }
    }
  }

  const messrsPattern = /(?:মেসার্স|M\/S\.?|Messrs\.?)\s*[:.\-]?[\s]*([^\r\n,;|]+)/i;
  for (const line of lines) {
    const m = line.match(messrsPattern);
    if (m && m[0]) {
      const clean = m[0].trim().replace(/^[:.\-\s]+|[:.\-\s]+$/g, '');
      if (clean.length >= 4) {
        partyCandidates.push({ raw: clean, confidence: 0.75 });
      }
    }
  }

  if (partyCandidates.length === 0 && lines.length > 0) {
    const firstLine = lines[0];
    if (firstLine.length >= 4 && !/^(?:ক্যাশ\s*মেমো|রসিদ|ভাউচার|চালান|Voucher|Receipt|Bill|Cash\s*Memo|Date|তারিখ)/i.test(firstLine)) {
      partyCandidates.push({ raw: firstLine, confidence: 0.65 });
    }
  }

  partyCandidates.sort((a, b) => b.confidence - a.confidence);
  const partyName = partyCandidates.length > 0 ? partyCandidates[0].raw : null;
  const partyMatchQuality = partyCandidates.length > 0 ? partyCandidates[0].confidence : 0;

  // 5. INFER TRANSACTION TYPE
  let expenseScore = 0;
  let creditScore = 0;
  let debitScore = 0;

  if (/দোকান\s*খরচ|ব্যয়\s*খাত|ব্যয়\s*খাত|খরচের\s*খাত/i.test(cleanText)) expenseScore += 4;
  if (/বিদ্যুৎ\s*বিল|দোকান\s*ভাড়া|দোকান\s*ভাড়া|কর্মচারীর\s*বেতন|যাতায়াত\s*খরচ|যাতায়াত\s*খরচ/i.test(cleanText)) expenseScore += 3;
  if (/খরচ|ব্যয়|ব্যয়|বিল|expense|utility|rent|salary/i.test(cleanText)) expenseScore += 2;

  if (/বাকি\s*বিক্রি|বাকি\s*চালান|মাল\s*বাবদ\s*বাকি|মোট\s*বকেয়া|মোট\s*বকেয়া/i.test(cleanText)) creditScore += 4;
  if (/বাকি|বাকী|দেনা|বকেয়া|বকেয়া|দিলাম|due\s*amount|due|credit|payable/i.test(cleanText)) creditScore += 2;

  if (/নগদ\s*গ্রহণ|নগদ\s*মেমো|ক্যাশ\s*মেমো|আদায়|আদায়|পেলাম/i.test(cleanText)) debitScore += 3;
  if (/জমা|নগদ|পরিশোধ|paid|received|cash\s*memo|cash/i.test(cleanText)) debitScore += 2;

  const maxScore = Math.max(expenseScore, creditScore, debitScore);
  let transactionType = null;
  let typeConfidence = 0;

  if (maxScore > 0) {
    if (expenseScore === maxScore) transactionType = 'expense';
    else if (creditScore === maxScore) transactionType = 'credit';
    else transactionType = 'debit';

    const totalScore = expenseScore + creditScore + debitScore;
    const ratio = maxScore / totalScore;
    typeConfidence = Math.min(0.95, Math.max(0.50, Math.round((0.50 + 0.45 * ratio) * 100) / 100));
  }

  // 6. CONFIDENCE AGGREGATION
  const fieldConfidences = {
    amount: amountMatchQuality,
    date: dateMatchQuality,
    voucherNo: voucherMatchQuality,
    partyName: partyMatchQuality,
    transactionType: typeConfidence,
    voucher: voucherMatchQuality,
    party: partyMatchQuality,
  };

  const overallConfidence = Math.min(1.0, Math.round((
    amountMatchQuality * 0.35 +
    dateMatchQuality * 0.25 +
    partyMatchQuality * 0.15 +
    voucherMatchQuality * 0.15 +
    typeConfidence * 0.10
  ) * 100) / 100);

  let confidenceTier = 'low';
  if (overallConfidence >= CONFIDENCE_HIGH) {
    confidenceTier = 'high';
  } else if (overallConfidence >= CONFIDENCE_MEDIUM) {
    confidenceTier = 'medium';
  }

  const isHigh = overallConfidence >= CONFIDENCE_HIGH;
  const isMedium = overallConfidence >= CONFIDENCE_MEDIUM;

  const amountFormatted = primaryAmount !== null ? ('৳ ' + toBengaliNumeral(primaryAmount.toLocaleString('en-US'))) : '';
  const amountFormattedEn = primaryAmount !== null ? ('৳ ' + primaryAmount.toLocaleString('en-US')) : '';
  const dateBn = detectedDate ? toBengaliNumeral(detectedDate) : '';
  const voucherNoBn = memoNumber ? toBengaliNumeral(memoNumber) : '';

  return {
    amount: primaryAmount,
    amountPaisa: primaryAmountPaisa,
    amountFormatted,
    amountFormattedEn,
    candidateAmounts,
    date: detectedDate,
    dateBn,
    voucherNo: memoNumber,
    voucherNoBn,
    partyName,
    transactionType,
    confidence: overallConfidence,
    overallConfidence,
    confidenceTier,
    isHighConfidence: isHigh,
    isMediumConfidence: isMedium,
    fieldConfidences,
    rawText: cleanText,
    isAutoDetected: Boolean(primaryAmount !== null || detectedDate !== null || memoNumber !== null),
    candidates: {
      amounts: amountCandidates,
      dates: dateCandidates,
      voucherNumbers: voucherCandidates,
      parties: partyCandidates,
    },
  };
}

/**
 * Evaluates whether an OCR inference result meets high confidence threshold (>= 0.85).
 *
 * @param {object} inferred - Result from inferVoucherFields
 * @returns {boolean}
 */
function isHighConfidence(inferred) {
  if (!inferred || typeof inferred !== 'object') return false;
  return Number(inferred.overallConfidence !== undefined ? inferred.overallConfidence : inferred.confidence) >= CONFIDENCE_HIGH;
}

/**
 * Evaluates whether an OCR inference result meets medium confidence threshold (>= 0.60).
 *
 * @param {object} inferred - Result from inferVoucherFields
 * @returns {boolean}
 */
function isMediumConfidence(inferred) {
  if (!inferred || typeof inferred !== 'object') return false;
  return Number(inferred.overallConfidence !== undefined ? inferred.overallConfidence : inferred.confidence) >= CONFIDENCE_MEDIUM;
}

/**
 * Formats a human-readable summary of inferred voucher fields in Bengali or English.
 *
 * @param {object} inferred - Result from inferVoucherFields
 * @param {object} [options]
 * @param {'bn'|'en'} [options.language='bn']
 * @returns {string}
 */
function formatInferredSummary(inferred, options = {}) {
  if (!inferred || typeof inferred !== 'object') return '';
  const lang = (options && (options.language || options.locale)) === 'en' ? 'en' : 'bn';

  const amountVal = inferred.amount !== null && inferred.amount !== undefined ? inferred.amount : null;
  const amountStr = amountVal !== null
    ? (lang === 'bn' ? `৳${toBengaliNumeral(amountVal.toLocaleString('en-IN'))}` : `৳${amountVal.toLocaleString('en-IN')}`)
    : (lang === 'bn' ? 'অজানা' : 'Unknown');

  const dateVal = inferred.date || (lang === 'bn' ? 'তারিখবিহীন' : 'No Date');
  const voucherVal = inferred.voucherNo || (lang === 'bn' ? 'মেমোবিহীন' : 'No Memo');
  const partyVal = inferred.partyName || (lang === 'bn' ? 'পক্ষবিহীন' : 'No Party');

  let typeLabel = lang === 'bn' ? 'অনির্দিষ্ট' : 'unspecified';
  if (inferred.transactionType === 'credit') {
    typeLabel = lang === 'bn' ? 'বাকি' : 'credit';
  } else if (inferred.transactionType === 'debit') {
    typeLabel = lang === 'bn' ? 'জমা' : 'debit';
  } else if (inferred.transactionType === 'expense') {
    typeLabel = lang === 'bn' ? 'খরচ' : 'expense';
  }

  const confVal = Math.round((Number(inferred.overallConfidence !== undefined ? inferred.overallConfidence : inferred.confidence) || 0) * 100);
  const confStr = lang === 'bn' ? `${toBengaliNumeral(confVal)}%` : `${confVal}%`;

  if (lang === 'bn') {
    return `ভাউচার সারাংশ: পরিমাণ ${amountStr}, তারিখ: ${toBengaliNumeral(dateVal)}, মেমো নং: ${toBengaliNumeral(voucherVal)}, পক্ষ: ${partyVal}, ধরন: ${typeLabel} (নির্ভরযোগ্যতা: ${confStr})`;
  } else {
    return `Voucher Summary: Amount ${amountStr}, Date: ${dateVal}, Memo: ${voucherVal}, Party: ${partyVal}, Type: ${typeLabel} (Confidence: ${confStr})`;
  }
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
  CONFIDENCE_HIGH,
  CONFIDENCE_MEDIUM,
  BENGALI_MONTHS,
  ENGLISH_MONTHS,
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
  inferVoucherFields,
  isHighConfidence,
  isMediumConfidence,
  formatInferredSummary,
  ReceiptScannerStateMachine,
  // Cross-worker interoperability aliases
  RECEIPT_SCHEMA_VERSION: RECEIPT_IMAGE_SCHEMA_VERSION,
  createReceiptRecord: createReceiptImageMetadata,
  validateReceipt: validateReceiptImage,
  parseVoucherOcrText: extractVoucherDetails,
  inferVoucher: inferVoucherFields,
  parseVoucherOcr: inferVoucherFields,
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
