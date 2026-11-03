/**
 * src/thermalPrintService.js
 *
 * TALLYKHATA ESC/POS THERMAL RECEIPT PRINTING ENGINE
 * Milestone: REA-ITER-219 (Voucher PDF Generation, Export & Thermal Print Backend Engine)
 * Worker: Worker 2: Averroes (Permanent Backend Developer & Business Logic / Backend & Data Architect)
 * Permanent Thread ID: 01a19154-c135-75d0-b38a-1ea50f004895
 *
 * Provides:
 * 1. Standard ESC/POS binary command builders:
 *    - INIT (0x1B 0x40)
 *    - ALIGN_LEFT (0x1B 0x61 0x00), ALIGN_CENTER (0x1B 0x61 0x01), ALIGN_RIGHT (0x1B 0x61 0x02)
 *    - BOLD_ON (0x1B 0x45 0x01), BOLD_OFF (0x1B 0x45 0x00)
 *    - DOUBLE_HEIGHT_WIDTH (0x1D 0x21 0x11), NORMAL (0x1D 0x21 0x00)
 *    - CUT_FEED (0x1D 0x56 0x42 0x03), FEED_LINES (0x1B 0x64 n)
 * 2. Strict character width formatting for 58mm (32 chars) and 80mm (48 chars).
 * 3. Robust Bengali-to-ASCII transliteration fallback for POS printers without native Unicode fonts.
 * 4. High-performance ESC/POS byte-stream assembly with Base64 output for Bluetooth printer bridges.
 */

// --- ESC/POS COMMAND CONSTANTS ---

const COMMANDS = Object.freeze({
  INIT: Buffer.from([0x1B, 0x40]),
  ALIGN_LEFT: Buffer.from([0x1B, 0x61, 0x00]),
  ALIGN_CENTER: Buffer.from([0x1B, 0x61, 0x01]),
  ALIGN_RIGHT: Buffer.from([0x1B, 0x61, 0x02]),
  BOLD_ON: Buffer.from([0x1B, 0x45, 0x01]),
  BOLD_OFF: Buffer.from([0x1B, 0x45, 0x00]),
  DOUBLE_HEIGHT_WIDTH: Buffer.from([0x1D, 0x21, 0x11]),
  DOUBLE_HEIGHT: Buffer.from([0x1D, 0x21, 0x01]),
  DOUBLE_WIDTH: Buffer.from([0x1D, 0x21, 0x10]),
  NORMAL: Buffer.from([0x1D, 0x21, 0x00]),
  UNDERLINE_ON: Buffer.from([0x1B, 0x2D, 0x01]),
  UNDERLINE_OFF: Buffer.from([0x1B, 0x2D, 0x00]),
  CUT_FEED: Buffer.from([0x1D, 0x56, 0x42, 0x03]),
  PARTIAL_CUT: Buffer.from([0x1D, 0x56, 0x01]),
  FEED_LINES: (n = 3) => Buffer.from([0x1B, 0x64, Math.max(0, Math.min(255, Math.floor(n)))]),
});

// --- PAPER ROLL PROFILES ---

const PAPER_PROFILES = Object.freeze({
  '58mm': Object.freeze({
    name: '58mm',
    width: 32,
    colItem: 14,
    colQty: 6,
    colTotal: 12,
  }),
  '80mm': Object.freeze({
    name: '80mm',
    width: 48,
    colItem: 24,
    colQty: 8,
    colTotal: 16,
  }),
});

function resolvePaperWidth(paperWidthInput = '58mm') {
  if (typeof paperWidthInput === 'number') {
    return paperWidthInput >= 40 ? 48 : 32;
  }
  const str = String(paperWidthInput || '58mm').toLowerCase();
  if (str.includes('80') || str === 'mm_80') return 48;
  return 32;
}

function resolvePaperProfile(paperWidthInput = '58mm') {
  const w = resolvePaperWidth(paperWidthInput);
  return w === 48 ? PAPER_PROFILES['80mm'] : PAPER_PROFILES['58mm'];
}

// --- COLUMN & ROW FORMATTING HELPERS ---

function formatDivider(char = '-', width = 32) {
  const safeChar = String(char || '-').charAt(0) || '-';
  const safeWidth = Math.max(10, Math.floor(Number(width) || 32));
  return safeChar.repeat(safeWidth) + '\n';
}

function formatCenterText(text = '', width = 32) {
  const str = String(text || '').trim();
  const safeWidth = Math.max(10, Math.floor(Number(width) || 32));
  if (str.length >= safeWidth) return str.slice(0, safeWidth);
  const leftPad = Math.floor((safeWidth - str.length) / 2);
  const rightPad = safeWidth - str.length - leftPad;
  return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
}

function formatRowTwoColumns(leftText = '', rightText = '', width = 32) {
  const left = String(leftText || '').trim();
  const right = String(rightText || '').trim();
  const safeWidth = Math.max(10, Math.floor(Number(width) || 32));

  const totalLen = left.length + right.length;
  if (totalLen >= safeWidth) {
    const maxLeft = Math.max(1, safeWidth - right.length - 1);
    const truncLeft = left.slice(0, maxLeft);
    const spaces = Math.max(1, safeWidth - truncLeft.length - right.length);
    return truncLeft + ' '.repeat(spaces) + right + '\n';
  }

  const spaces = safeWidth - totalLen;
  return left + ' '.repeat(spaces) + right + '\n';
}

function formatRowThreeColumns(col1 = '', col2 = '', col3 = '', width = 32, colWidths = null) {
  const safeWidth = Math.max(10, Math.floor(Number(width) || 32));
  let w1, w2, w3;

  if (Array.isArray(colWidths) && colWidths.length === 3) {
    w1 = Math.floor(Number(colWidths[0]));
    w2 = Math.floor(Number(colWidths[1]));
    w3 = Math.floor(Number(colWidths[2]));
  } else if (safeWidth === 48) {
    w1 = 24; w2 = 8; w3 = 16;
  } else {
    w1 = 14; w2 = 6; w3 = 12;
  }

  const s1 = String(col1 || '').trim().slice(0, w1).padEnd(w1);
  const s2 = String(col2 || '').trim().slice(0, w2).padStart(w2);
  const s3 = String(col3 || '').trim().slice(0, w3).padStart(w3);

  return s1 + s2 + s3 + '\n';
}

// --- TRANSLITERATION / ASCII FALLBACK ENGINE ---

const BENGALI_DIGIT_MAP = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
};

const BENGALI_ACCOUNTING_TERMS = [
  { bn: /ক্যাশ\s*মেমো/gi, ascii: 'CASH MEMO' },
  { bn: /নগদ\s*মেমো/gi, ascii: 'CASH MEMO' },
  { bn: /বাকির\s*চালান/gi, ascii: 'DUE CHALAN' },
  { bn: /বাকি\s*চালান/gi, ascii: 'DUE CHALAN' },
  { bn: /খরচ\s*ভাউচার/gi, ascii: 'EXPENSE VOUCHER' },
  { bn: /খরচ\s*রসিদ/gi, ascii: 'EXPENSE RECEIPT' },
  { bn: /দোকান\s*খরচ/gi, ascii: 'SHOP EXPENSE' },
  { bn: /ভাউচার\s*নং/gi, ascii: 'Voucher No:' },
  { bn: /মেমো\s*নং/gi, ascii: 'Memo No:' },
  { bn: /চালান\s*নং/gi, ascii: 'Chalan No:' },
  { bn: /তারিখ/gi, ascii: 'Date:' },
  { bn: /সময়/gi, ascii: 'Time:' },
  { bn: /ক্রেতার\s*নাম/gi, ascii: 'Customer:' },
  { bn: /গ্রাহকের\s*নাম/gi, ascii: 'Customer:' },
  { bn: /ক্রেতা/gi, ascii: 'Customer' },
  { bn: /গ্রাহক/gi, ascii: 'Customer' },
  { bn: /প্রাপক/gi, ascii: 'Recipient' },
  { bn: /মোবাইল/gi, ascii: 'Mobile:' },
  { bn: /ফোন/gi, ascii: 'Phone:' },
  { bn: /ঠিকানা/gi, ascii: 'Address:' },
  { bn: /মালিক/gi, ascii: 'Proprietor:' },
  { bn: /স্বত্বাধিকারী/gi, ascii: 'Proprietor:' },
  { bn: /পণ্যের\s*বিবরণ/gi, ascii: 'Item Desc' },
  { bn: /পরিমাণ/gi, ascii: 'Qty' },
  { bn: /দর/gi, ascii: 'Rate' },
  { bn: /মোট\s*টাকা/gi, ascii: 'Total' },
  { bn: /মোট\s*মালামাল/gi, ascii: 'Subtotal:' },
  { bn: /মোট\s*বকেয়া/gi, ascii: 'Total Due' },
  { bn: /মোট\s*বাকি/gi, ascii: 'Total Due' },
  { bn: /সর্বমোট/gi, ascii: 'GRAND TOTAL:' },
  { bn: /মোট/gi, ascii: 'Total:' },
  { bn: /বকেয়া/gi, ascii: 'Due' },
  { bn: /বাকি/gi, ascii: 'Due' },
  { bn: /পূর্বের\s*বাকি/gi, ascii: 'Prev Due:' },
  { bn: /পূর্বের\s*বকেয়া/gi, ascii: 'Prev Due:' },
  { bn: /পূর্বের\s*জের/gi, ascii: 'Prev Bal:' },
  { bn: /বর্তমান\s*লেনদেন/gi, ascii: 'Current Txn:' },
  { bn: /বর্তমান\s*জের/gi, ascii: 'New Balance:' },
  { bn: /নতুন\s*জের/gi, ascii: 'New Balance:' },
  { bn: /বর্তমান\s*বকেয়া/gi, ascii: 'Current Due:' },
  { bn: /পরিশোধিত/gi, ascii: 'Paid Amount:' },
  { bn: /পরিশোধ/gi, ascii: 'Paid:' },
  { bn: /জমা/gi, ascii: 'Paid / Deposit:' },
  { bn: /ছাড়\s*\(কমিশন\)/gi, ascii: 'Discount:' },
  { bn: /ছাড়/gi, ascii: 'Discount:' },
  { bn: /ভ্যাট/gi, ascii: 'VAT:' },
  { bn: /টাকা\s*কথায়/gi, ascii: 'In Words:' },
  { bn: /কথায়/gi, ascii: 'In Words:' },
  { bn: /টাকা\s*মাত্র/gi, ascii: 'Taka Only' },
  { bn: /টাকা/gi, ascii: 'Tk.' },
  { bn: /৳/gi, ascii: 'Tk.' },
  { bn: /গ্রাহকের\s*স্বাক্ষর/gi, ascii: 'Customer Sign' },
  { bn: /অনুমোদিত\s*স্বাক্ষর/gi, ascii: 'Authorized Sign' },
  { bn: /স্বাক্ষর/gi, ascii: 'Sign' },
  { bn: /ধন্যবাদ,\s*আবার\s*আসবেন/gi, ascii: 'Thank you, come again!' },
  { bn: /ধন্যবাদ/gi, ascii: 'Thank You' },
  { bn: /টালিখাতা\s*ডিজিটাল\s*ভাউচার/gi, ascii: 'TallyKhata Digital Voucher' },
  { bn: /টালিখাতা\s*ডিজিটাল/gi, ascii: 'TallyKhata Digital' },
  { bn: /টালিখাতা/gi, ascii: 'TallyKhata' },
];

const BENGALI_CHAR_MAP = {
  'অ': 'A', 'আ': 'A', 'ই': 'I', 'ঈ': 'I', 'উ': 'U', 'ঊ': 'U', 'ঋ': 'R',
  'এ': 'E', 'ঐ': 'Oi', 'ও': 'O', 'ঔ': 'Ou',
  'া': 'a', 'ি': 'i', 'ী': 'i', 'ু': 'u', 'ূ': 'u', 'ৃ': 'ri',
  'ে': 'e', 'ৈ': 'oi', 'ো': 'o', 'ৌ': 'ou',
  'ক': 'k', 'খ': 'kh', 'গ': 'g', 'ঘ': 'gh', 'ঙ': 'ng',
  'চ': 'ch', 'ছ': 'chh', 'জ': 'j', 'ঝ': 'jh', 'ঞ': 'n',
  'ট': 't', 'ঠ': 'th', 'ড': 'd', 'ঢ': 'dh', 'ণ': 'n',
  'ত': 't', 'থ': 'th', 'দ': 'd', 'ধ': 'dh', 'ন': 'n',
  'প': 'p', 'ফ': 'f', 'ব': 'b', 'ভ': 'bh', 'ম': 'm',
  'য': 'z', 'র': 'r', 'ল': 'l', 'শ': 'sh', 'ষ': 'sh',
  'স': 's', 'হ': 'h', 'ড়': 'r', 'ঢ়': 'rh', 'য়': 'y',
  'ৎ': 't', 'ং': 'ng', 'ঃ': ':', 'ঁ': '', '্': '',
};

const _translitCache = new Map();
const MAX_TRANSLIT_CACHE = 2000;

/**
 * Transliterates Bengali text to clean ASCII for POS printers.
 * Includes pure-ASCII bypass and memoization cache for high-frequency printing.
 *
 * @param {string} text
 * @returns {string} ASCII-safe representation
 */
function transliterateBengaliToAscii(text) {
  if (!text || typeof text !== 'string') return '';

  const cached = _translitCache.get(text);
  if (cached !== undefined) return cached;

  // Fast path: pure ASCII string
  let isPureAscii = true;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) >= 128) {
      isPureAscii = false;
      break;
    }
  }
  if (isPureAscii) {
    const trimmed = text.trim();
    if (_translitCache.size < MAX_TRANSLIT_CACHE) _translitCache.set(text, trimmed);
    return trimmed;
  }

  let res = text;

  // 1. Convert Bengali numerals
  res = res.replace(/[০-৯]/g, (ch) => BENGALI_DIGIT_MAP[ch] || ch);

  // 2. Convert standard Bengali accounting phrases
  for (const term of BENGALI_ACCOUNTING_TERMS) {
    res = res.replace(term.bn, term.ascii);
  }

  // 3. Convert remaining Bengali characters phonetically
  let out = '';
  for (let i = 0; i < res.length; i++) {
    const ch = res[i];
    if (BENGALI_CHAR_MAP[ch] !== undefined) {
      out += BENGALI_CHAR_MAP[ch];
    } else if (ch.charCodeAt(0) < 128) {
      out += ch;
    } else {
      out += ' ';
    }
  }

  const finalStr = out.replace(/[ \t]+/g, ' ').trim();
  if (_translitCache.size < MAX_TRANSLIT_CACHE) {
    _translitCache.set(text, finalStr);
  } else {
    _translitCache.clear();
    _translitCache.set(text, finalStr);
  }
  return finalStr;
}

// --- ESC/POS RECEIPT BUILDER ---

/**
 * Builds complete ESC/POS binary receipt commands for 58mm or 80mm thermal printers.
 *
 * @param {object} voucherData - Voucher payload (or input)
 * @param {object} [options]
 * @param {'58mm'|'80mm'|number} [options.paperWidth='58mm']
 * @param {boolean} [options.useAsciiFallback=true]
 * @param {boolean} [options.cutPaper=true]
 * @param {number} [options.feedLines=3]
 * @returns {{ buffer: Buffer, rawBytes: Uint8Array, base64: string, hex: string, characterWidth: number, paperWidth: string, byteLength: number, lineCount: number }}
 */
function buildThermalReceiptCommands(voucherData = {}, options = {}) {
  const opts = options || {};
  const width = resolvePaperWidth(opts.paperWidth || voucherData.paperWidth || '58mm');
  const paperWidthName = width === 48 ? '80mm' : '58mm';
  const useAscii = opts.useAsciiFallback !== undefined ? Boolean(opts.useAsciiFallback) : true;
  const cutPaper = opts.cutPaper !== undefined ? Boolean(opts.cutPaper) : true;
  const feedCount = Math.max(1, Math.min(10, Math.floor(Number(opts.feedLines || 3))));

  // Extract core fields
  const data = voucherData || {};
  const fin = data.financials || {};
  const biz = data.business || {};
  const party = data.party || {};

  const sanitize = (txt) => {
    if (!txt) return '';
    return useAscii ? transliterateBengaliToAscii(String(txt)) : String(txt);
  };

  const shopName = sanitize(data.businessName || biz.name || 'TallyKhata Store');
  const proprietor = sanitize(data.proprietorName || biz.proprietor || '');
  const phone = sanitize(data.businessPhone || biz.phone || '');
  const address = sanitize(data.businessAddress || biz.address || '');

  const voucherNo = String(data.voucherNo || data.voucherNumber || 'VCH-001');
  const date = String(data.date || new Date().toISOString().split('T')[0]);
  const time = String(data.time || '11:30 AM');

  const customerName = sanitize(data.customerName || party.name || 'General Customer');
  const customerPhone = sanitize(data.customerPhone || party.phone || '');

  let rawType = String(data.voucherType || data.type || 'CASH_MEMO').toUpperCase();
  let typeTitle = 'CASH MEMO';
  if (rawType.includes('DUE') || rawType.includes('CHALAN') || rawType.includes('CREDIT')) {
    typeTitle = 'DUE CHALAN';
  } else if (rawType.includes('EXPENSE')) {
    typeTitle = 'EXPENSE VOUCHER';
  }

  // Amounts in exact paisa math
  const subtotal = fin.subtotal !== undefined ? fin.subtotal : (Number(data.subtotal) || Number(data.amount) || 0);
  const discount = fin.discount !== undefined ? fin.discount : (Number(data.discount) || 0);
  const prevDue = fin.previousBalance !== undefined ? fin.previousBalance : (Number(data.previousBalance) || 0);
  const currentAmount = fin.currentAmount !== undefined ? fin.currentAmount : (Number(data.amount) || 0);
  const paidAmount = fin.paidAmount !== undefined ? fin.paidAmount : (typeTitle === 'CASH MEMO' ? currentAmount : (Number(data.paidAmount) || 0));
  const newBalance = fin.newBalance !== undefined ? fin.newBalance : (typeTitle === 'DUE CHALAN' ? (prevDue + currentAmount - paidAmount) : 0);

  const qrString = String(data.qrVerificationString || `TK:VCH:v1:1:${voucherNo}:${Math.round(currentAmount * 100)}:${date}:VERIFIED`);

  const items = Array.isArray(data.items) && data.items.length > 0 ? data.items : [];

  // Assemble Command Buffers
  const chunks = [];
  let lineCount = 0;

  function pushText(text) {
    if (!text) return;
    const buf = Buffer.from(text, 'utf8');
    chunks.push(buf);
    lineCount += (text.match(/\n/g) || []).length;
  }

  // 1. INIT PRINTER
  chunks.push(COMMANDS.INIT);

  // 2. SHOP BRANDING HEADER (CENTERED)
  chunks.push(COMMANDS.ALIGN_CENTER);
  chunks.push(COMMANDS.DOUBLE_HEIGHT_WIDTH);
  chunks.push(COMMANDS.BOLD_ON);
  pushText(shopName + '\n');
  chunks.push(COMMANDS.NORMAL);
  chunks.push(COMMANDS.BOLD_OFF);

  if (proprietor) {
    pushText(proprietor + '\n');
  }
  if (phone || address) {
    pushText((phone ? `Phone: ${phone}` : '') + (phone && address ? ' | ' : '') + address + '\n');
  }

  chunks.push(COMMANDS.FEED_LINES(1));

  // 3. VOUCHER BANNER
  chunks.push(COMMANDS.DOUBLE_HEIGHT);
  chunks.push(COMMANDS.BOLD_ON);
  pushText(`*** ${typeTitle} ***\n`);
  chunks.push(COMMANDS.NORMAL);
  chunks.push(COMMANDS.BOLD_OFF);

  // 4. DIVIDER & METADATA
  pushText(formatDivider('=', width));
  chunks.push(COMMANDS.ALIGN_LEFT);

  pushText(formatRowTwoColumns('Voucher No:', voucherNo, width));
  pushText(formatRowTwoColumns('Date:', `${date} ${time}`, width));
  pushText(formatRowTwoColumns('Customer:', customerName, width));
  if (customerPhone) {
    pushText(formatRowTwoColumns('Mobile:', customerPhone, width));
  }

  // 5. ITEMIZED TABLE
  pushText(formatDivider('-', width));

  const colWidths = width === 48 ? [24, 8, 16] : [14, 6, 12];
  pushText(formatRowThreeColumns('Item', 'Qty', 'Amount', width, colWidths));
  pushText(formatDivider('-', width));

  if (items.length > 0) {
    for (const it of items) {
      const itName = sanitize(it.name || 'Product');
      const itQty = `${it.quantity || 1} ${sanitize(it.unit || '')}`.trim();
      const itTotal = `Tk ${Number(it.subtotal || 0).toLocaleString('en-IN')}`;
      pushText(formatRowThreeColumns(itName, itQty, itTotal, width, colWidths));
    }
  } else {
    pushText(formatRowThreeColumns(sanitize(data.note || 'General Transaction'), '1', `Tk ${Number(currentAmount).toLocaleString('en-IN')}`, width, colWidths));
  }

  // 6. TOTALS & BALANCES
  pushText(formatDivider('-', width));

  pushText(formatRowTwoColumns('Subtotal:', `Tk ${subtotal.toLocaleString('en-IN')}`, width));
  if (discount > 0) {
    pushText(formatRowTwoColumns('Discount:', `- Tk ${discount.toLocaleString('en-IN')}`, width));
  }
  if (prevDue > 0) {
    pushText(formatRowTwoColumns('Prev Due:', `Tk ${prevDue.toLocaleString('en-IN')}`, width));
  }

  chunks.push(COMMANDS.BOLD_ON);
  pushText(formatRowTwoColumns('Current Txn:', `Tk ${currentAmount.toLocaleString('en-IN')}`, width));
  if (paidAmount > 0) {
    pushText(formatRowTwoColumns('Paid Amount:', `Tk ${paidAmount.toLocaleString('en-IN')}`, width));
  }
  pushText(formatRowTwoColumns('New Balance:', `Tk ${newBalance.toLocaleString('en-IN')}`, width));
  chunks.push(COMMANDS.BOLD_OFF);

  pushText(formatDivider('=', width));

  // 7. FOOTER & VERIFICATION SEAL
  chunks.push(COMMANDS.ALIGN_CENTER);
  pushText(formatCenterText(`[VERIFY: ${qrString.slice(0, Math.min(24, width - 4))}]`, width) + '\n');
  pushText('Thank you! TallyKhata Digital\n');

  // 8. FEED & CUT
  chunks.push(COMMANDS.FEED_LINES(feedCount));
  if (cutPaper) {
    chunks.push(COMMANDS.CUT_FEED);
  }

  const combinedBuffer = Buffer.concat(chunks);
  const base64 = combinedBuffer.toString('base64');
  const hex = combinedBuffer.toString('hex');

  return {
    buffer: combinedBuffer,
    rawBytes: new Uint8Array(combinedBuffer),
    base64,
    hex,
    characterWidth: width,
    paperWidth: paperWidthName,
    paperWidthMm: paperWidthName,
    paperProfile: paperWidthName,
    byteLength: combinedBuffer.length,
    lineCount,
  };
}

/**
 * Builds raw ESC/POS binary data from an array of pre-formatted text lines.
 *
 * @param {string[]} lines
 * @param {object} [options]
 * @returns {Buffer}
 */
function buildRawEscPosFromText(lines = [], options = {}) {
  const chunks = [COMMANDS.INIT];
  const list = Array.isArray(lines) ? lines : [String(lines || '')];
  for (const line of list) {
    chunks.push(Buffer.from(String(line) + '\n', 'utf8'));
  }
  if (options.feedLines) {
    chunks.push(COMMANDS.FEED_LINES(Number(options.feedLines) || 3));
  }
  if (options.cutPaper) {
    chunks.push(COMMANDS.CUT_FEED);
  }
  return Buffer.concat(chunks);
}

// --- MODULE EXPORTS ---

const thermalPrintService = {
  COMMANDS,
  PAPER_PROFILES,
  resolvePaperWidth,
  resolvePaperProfile,
  formatDivider,
  formatCenterText,
  formatRowTwoColumns,
  formatRowThreeColumns,
  transliterateBengaliToAscii,
  buildThermalReceiptCommands,
  buildRawEscPosFromText,
  thermalPrintService: null,
  default: null,
};

thermalPrintService.thermalPrintService = thermalPrintService;
thermalPrintService.default = thermalPrintService;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = thermalPrintService;
  module.exports.default = thermalPrintService;
}
if (typeof window !== 'undefined') {
  window.thermalPrintService = thermalPrintService;
}
