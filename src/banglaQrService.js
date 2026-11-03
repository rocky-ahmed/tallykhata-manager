/**
 * src/banglaQrService.js
 *
 * Clean-Room Super QR & Bangla QR EMVCo Payment Engine
 * Implementation conforming to Bangladesh Bank National Bangla QR Specifications
 *
 * Milestone: REA-ITER-220
 * Author: Worker 2 (Averroes - Permanent Backend Developer & Business Logic)
 * Verified against: REF-001 (TallyKhata-Demo.apk)
 */

const crypto = require('crypto');

// -------------------------------------------------------------
// CONSTANTS & EMVCo BANGLA QR STANDARDS
// -------------------------------------------------------------
const BANGLA_QR_RID = 'A000000677010111'; // Bangladesh Bank National Bangla QR GUID
const DEFAULT_MCC = '5411';               // Grocery Stores & Supermarkets
const CURRENCY_BDT = '050';               // ISO 4217 numeric code for Bangladeshi Taka
const COUNTRY_BD = 'BD';                  // ISO 3166-1 alpha-2 for Bangladesh
const DEFAULT_CITY = 'Dhaka';
const DEFAULT_ACQUIRER = 'TALLYPAY';

const POI_STATIC = '11';                  // Customer enters amount in their app
const POI_DYNAMIC = '12';                 // Amount embedded in QR code by merchant

// Standard Bengali MFS and Digital Banking Brands Interoperable with Bangla QR
const SUPPORTED_PAYMENT_APPS = [
  { id: 'bkash', nameBn: 'বিকাশ', nameEn: 'bKash', color: '#D12053' },
  { id: 'nagad', nameBn: 'নগদ', nameEn: 'Nagad', color: '#F7941D' },
  { id: 'rocket', nameBn: 'রকেট', nameEn: 'Rocket', color: '#8C3494' },
  { id: 'upay', nameBn: 'উপায়', nameEn: 'Upay', color: '#0066B3' },
  { id: 'cellfin', nameBn: 'সেলফিন', nameEn: 'Cellfin', color: '#00843D' },
  { id: 'visa', nameBn: 'ভিসা', nameEn: 'Visa', color: '#1A1F71' },
  { id: 'mastercard', nameBn: 'মাস্টারকার্ড', nameEn: 'Mastercard', color: '#EB001B' },
];

/**
 * Calculates standard 16-bit CRC-CCITT (polynomial 0x1021, initial value 0xFFFF)
 * Required by EMVCo Merchant-Presented QR Specification Tag 63.
 *
 * @param {string} payloadString - String up to and including '6304'
 * @returns {string} 4-character uppercase hexadecimal checksum
 */
function calculateCrc16Ccitt(payloadString) {
  let crc = 0xFFFF;
  const buf = Buffer.from(payloadString, 'utf8');
  for (let i = 0; i < buf.length; i++) {
    crc ^= (buf[i] << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Formats a single EMVCo TLV (Tag-Length-Value) element.
 *
 * @param {string|number} tag - 2-digit tag identifier (e.g. "00", "26", 52)
 * @param {string} value - String value of the tag
 * @returns {string} Formatted TLV string (e.g. "000201")
 */
function formatTlv(tag, value) {
  if (value === undefined || value === null) return '';
  const strVal = String(value);
  const tagStr = String(tag).padStart(2, '0');
  const lenStr = String(Buffer.byteLength(strVal, 'utf8')).padStart(2, '0');
  return `${tagStr}${lenStr}${strVal}`;
}

/**
 * Parses an EMVCo TLV string into a key-value dictionary.
 *
 * @param {string} tlvString - Raw TLV data stream
 * @returns {object} Map of tag string to value string
 */
function parseTlv(tlvString) {
  const result = {};
  if (!tlvString || typeof tlvString !== 'string') return result;

  const buf = Buffer.from(tlvString, 'utf8');
  let offset = 0;
  const len = buf.length;

  while (offset + 4 <= len) {
    const tag = buf.toString('utf8', offset, offset + 2);
    const lengthStr = buf.toString('utf8', offset + 2, offset + 4);
    const length = parseInt(lengthStr, 10);
    if (isNaN(length) || length < 0) break;

    const valStart = offset + 4;
    const valEnd = valStart + length;
    if (valEnd > len) break;

    const val = buf.toString('utf8', valStart, valEnd);
    result[tag] = val;
    offset = valEnd;
  }

  return result;
}

/**
 * Verifies the CRC16-CCITT checksum of a complete EMVCo QR code string.
 *
 * @param {string} qrString - Complete QR payload containing tag 63
 * @returns {boolean} True if checksum matches exactly
 */
function validateBanglaQrChecksum(qrString) {
  if (!qrString || typeof qrString !== 'string' || qrString.length < 8) return false;
  const tag63Idx = qrString.lastIndexOf('6304');
  if (tag63Idx === -1 || tag63Idx + 8 !== qrString.length) return false;

  const dataBeforeCrc = qrString.substring(0, tag63Idx + 4);
  const expectedCrc = qrString.substring(tag63Idx + 4).toUpperCase();
  const calculatedCrc = calculateCrc16Ccitt(dataBeforeCrc);

  return expectedCrc === calculatedCrc;
}

/**
 * Generates an interoperable EMVCo TLV string compliant with Bangladesh Bank Bangla QR specs.
 *
 * @param {object} merchantConfig - Merchant profile details
 * @param {string} [merchantConfig.merchantName='TallyKhata Merchant'] - Merchant store or trade name
 * @param {string} [merchantConfig.merchantCity='Dhaka'] - Merchant city/district
 * @param {string} [merchantConfig.accountNo='01700000000'] - Merchant mobile wallet/account PAN
 * @param {string} [merchantConfig.acquirerId='TALLYPAY'] - Acquirer ID / Bank institution
 * @param {string} [merchantConfig.mcc='5411'] - Merchant Category Code
 * @param {object} [options] - Dynamic QR options
 * @param {number|string} [options.amount=null] - Transaction amount (if present, produces Dynamic QR)
 * @param {string} [options.billNumber=null] - Unique invoice or bill number
 * @param {string} [options.reference=null] - Customer or ledger reference ID
 * @param {string} [options.terminalId='POS-01'] - Merchant counter or terminal ID
 * @returns {string} Fully assembled and signed EMVCo Bangla QR payload
 */
function generateBanglaQrPayload(merchantConfig = {}, options = {}) {
  const mName = String(merchantConfig.merchantName || merchantConfig.businessName || 'TallyKhata Merchant').trim().slice(0, 25);
  const mCity = String(merchantConfig.merchantCity || DEFAULT_CITY).trim().slice(0, 15);
  const mAccount = String(merchantConfig.accountNo || merchantConfig.merchantPan || merchantConfig.ownerPhone || '01700000000').trim();
  const mAcquirer = String(merchantConfig.acquirerId || DEFAULT_ACQUIRER).trim().toUpperCase();
  const mMcc = String(merchantConfig.mcc || DEFAULT_MCC).trim();

  // Validate amount for Dynamic vs Static
  let hasAmount = false;
  let formattedAmount = '';
  if (options && options.amount !== undefined && options.amount !== null) {
    const numAmount = typeof options.amount === 'string' ? parseFloat(options.amount) : options.amount;
    if (!isNaN(numAmount) && numAmount > 0) {
      hasAmount = true;
      // Exact 2-decimal formatting (integer paisa safe)
      const integerPaisa = Math.round(numAmount * 100);
      formattedAmount = (integerPaisa / 100).toFixed(2);
    }
  }

  // Tag 00: Payload Format Indicator (Fixed "01")
  let payload = formatTlv('00', '01');

  // Tag 01: Point of Initiation Method ("11" = Static, "12" = Dynamic)
  payload += formatTlv('01', hasAmount ? POI_DYNAMIC : POI_STATIC);

  // Tag 26: Merchant Account Information (Bangladesh Bank Bangla QR Standard)
  let tag26Sub = formatTlv('00', BANGLA_QR_RID);
  tag26Sub += formatTlv('01', mAccount);
  tag26Sub += formatTlv('02', mAcquirer);
  payload += formatTlv('26', tag26Sub);

  // Tag 52: Merchant Category Code
  payload += formatTlv('52', mMcc);

  // Tag 53: Transaction Currency ("050" = BDT)
  payload += formatTlv('53', CURRENCY_BDT);

  // Tag 54: Transaction Amount (Present only in Dynamic QR)
  if (hasAmount && formattedAmount) {
    payload += formatTlv('54', formattedAmount);
  }

  // Tag 58: Country Code ("BD")
  payload += formatTlv('58', COUNTRY_BD);

  // Tag 59: Merchant Name
  payload += formatTlv('59', mName);

  // Tag 60: Merchant City
  payload += formatTlv('60', mCity);

  // Tag 62: Additional Data Field Template (Optional)
  let tag62Sub = '';
  if (options.billNumber) tag62Sub += formatTlv('01', String(options.billNumber).trim().slice(0, 25));
  if (options.reference) tag62Sub += formatTlv('05', String(options.reference).trim().slice(0, 25));
  if (options.terminalId) tag62Sub += formatTlv('07', String(options.terminalId).trim().slice(0, 10));
  if (tag62Sub.length > 0) {
    payload += formatTlv('62', tag62Sub);
  }

  // Tag 63: CRC16 Checksum
  const prefixForCrc = payload + '6304';
  const crc = calculateCrc16Ccitt(prefixForCrc);
  return prefixForCrc + crc;
}

/**
 * Decodes and validates any raw QR string against EMVCo & Bangla QR standards.
 *
 * @param {string} qrString - Scanned QR code text
 * @returns {object} Extracted structured merchant & payment fields
 */
function parseBanglaQrPayload(qrString) {
  const result = {
    isValid: false,
    isBanglaQr: false,
    checksumValid: false,
    poiMethod: POI_STATIC,
    isDynamic: false,
    merchantName: '',
    merchantCity: '',
    merchantAccount: '',
    acquirerId: '',
    mcc: '',
    currency: '',
    amount: null,
    paisa: null,
    billNumber: null,
    reference: null,
    terminalId: null,
    rawTags: {},
    error: null,
  };

  if (!qrString || typeof qrString !== 'string') {
    result.error = 'EMPTY_OR_INVALID_QR';
    return result;
  }

  // 1. Validate CRC
  const isCrcOk = validateBanglaQrChecksum(qrString);
  result.checksumValid = isCrcOk;
  if (!isCrcOk) {
    result.error = 'INVALID_CRC_CHECKSUM';
    return result;
  }

  // 2. Parse top-level TLVs
  const tags = parseTlv(qrString);
  result.rawTags = tags;

  if (tags['00'] !== '01') {
    result.error = 'UNSUPPORTED_EMVCO_VERSION';
    return result;
  }

  result.poiMethod = tags['01'] || POI_STATIC;
  result.isDynamic = result.poiMethod === POI_DYNAMIC;

  // 3. Parse Merchant Account Information (Tag 26)
  if (tags['26']) {
    const sub26 = parseTlv(tags['26']);
    if (sub26['00'] === BANGLA_QR_RID || sub26['02']) {
      result.isBanglaQr = true;
    }
    result.merchantAccount = sub26['01'] || '';
    result.acquirerId = sub26['02'] || DEFAULT_ACQUIRER;
  }

  result.mcc = tags['52'] || '';
  result.currency = tags['53'] || '';
  result.merchantName = tags['59'] || '';
  result.merchantCity = tags['60'] || '';

  // 4. Parse Amount (Tag 54)
  if (tags['54']) {
    const num = parseFloat(tags['54']);
    if (!isNaN(num) && num > 0) {
      result.amount = Math.round(num * 100) / 100;
      result.paisa = Math.round(num * 100);
    }
  }

  // 5. Parse Additional Data (Tag 62)
  if (tags['62']) {
    const sub62 = parseTlv(tags['62']);
    result.billNumber = sub62['01'] || null;
    result.reference = sub62['05'] || null;
    result.terminalId = sub62['07'] || null;
  }

  result.isValid = result.isBanglaQr && isCrcOk && !!result.merchantName;
  return result;
}

/**
 * Simulates an inward digital customer payment via Bangla QR.
 * Generates an authentic BanglaQrResponseDto matching REF-001.
 *
 * @param {object} merchantConfig - Merchant details
 * @param {object} paymentDetails - Payment parameters
 * @param {number} paymentDetails.amount - Transaction amount in Taka
 * @param {string} [paymentDetails.customerName='সাধারণ কাস্টমার'] - Customer name
 * @param {string} [paymentDetails.customerWallet='01711223344'] - Customer sender wallet
 * @param {string} [paymentDetails.app='bkash'] - Origin payment app (bkash/nagad/bank)
 * @returns {object} BanglaQrResponseDto & transaction ledger metadata
 */
function simulateCustomerPayment(merchantConfig, paymentDetails = {}) {
  const amountNum = typeof paymentDetails.amount === 'string' ? parseFloat(paymentDetails.amount) : (paymentDetails.amount || 0);
  const paisa = Math.round(amountNum * 100);
  const roundedAmount = paisa / 100;

  if (paisa <= 0) {
    throw new Error('INVALID_PAYMENT_AMOUNT: Payment amount must be greater than zero');
  }

  const txnNumber = `BQR-${Date.now().toString().slice(-8)}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const nowIso = new Date().toISOString();
  const customerName = paymentDetails.customerName || 'কাস্টমার পেমেন্ট';
  const customerWallet = paymentDetails.customerWallet || '01711' + Math.floor(100000 + Math.random() * 900000);
  const merchantWallet = merchantConfig.accountNo || merchantConfig.ownerPhone || '01700000000';
  const currentBalance = typeof merchantConfig.currentBalance === 'number' ? merchantConfig.currentBalance : 10000.00;
  const newBalance = Math.round((currentBalance + roundedAmount) * 100) / 100;

  const appMeta = SUPPORTED_PAYMENT_APPS.find(a => a.id === paymentDetails.app) || SUPPORTED_PAYMENT_APPS[0];

  const responseDto = {
    amount: roundedAmount,
    balanceFrom: 50000.00,
    balanceTo: newBalance,
    canReverse: true,
    counterId: 1,
    fee: 0.00,
    fromName: customerName,
    fromWallet: customerWallet,
    invoiceNo: paymentDetails.billNumber || `INV-${Date.now().toString().slice(-6)}`,
    outletId: 1,
    reversedTxn: false,
    toWallet: merchantWallet,
    transactionNumber: txnNumber,
    txnTime: nowIso,
    txnType: 'BANGLA_QR_INWARD',
    typeName: `${appMeta.nameEn} Payment`,
    appNameBn: appMeta.nameBn,
    appId: appMeta.id,
  };

  return {
    success: true,
    responseDto,
    paisa,
    formattedBengaliAmount: `৳ ${roundedAmount.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}`,
    auditString: `BQR:IN:${txnNumber}:${paisa}:${merchantWallet}:${nowIso}`,
  };
}

/**
 * Generates an ASCII/SVG grid representation of QR pattern for headless testing and visual rendering.
 *
 * @param {string} payload - Raw QR payload string
 * @returns {object} Dimensional grid metrics and base64 simulated SVG
 */
function generateQrVisualMatrix(payload) {
  const hash = crypto.createHash('sha256').update(payload || '').digest();
  const size = 25; // 25x25 QR matrix grid
  const matrix = [];

  for (let r = 0; r < size; r++) {
    const row = [];
    for (let c = 0; c < size; c++) {
      // Finder patterns in 3 corners
      const isTopLeft = (r < 7 && c < 7);
      const isTopRight = (r < 7 && c >= size - 7);
      const isBottomLeft = (r >= size - 7 && c < 7);

      if (isTopLeft || isTopRight || isBottomLeft) {
        const localR = isBottomLeft ? r - (size - 7) : r;
        const localC = isTopRight ? c - (size - 7) : c;
        const isBorder = localR === 0 || localR === 6 || localC === 0 || localC === 6;
        const isCenter = localR >= 2 && localR <= 4 && localC >= 2 && localC <= 4;
        row.push(isBorder || isCenter ? 1 : 0);
      } else {
        const byteIndex = (r * size + c) % hash.length;
        row.push((hash[byteIndex] >> (c % 8)) & 1);
      }
    }
    matrix.push(row);
  }

  return {
    size,
    matrix,
    dataLength: (payload || '').length,
    hashHex: hash.toString('hex').slice(0, 16),
  };
}

module.exports = {
  BANGLA_QR_RID,
  DEFAULT_MCC,
  CURRENCY_BDT,
  COUNTRY_BD,
  DEFAULT_CITY,
  DEFAULT_ACQUIRER,
  POI_STATIC,
  POI_DYNAMIC,
  SUPPORTED_PAYMENT_APPS,
  calculateCrc16Ccitt,
  formatTlv,
  parseTlv,
  validateBanglaQrChecksum,
  generateBanglaQrPayload,
  parseBanglaQrPayload,
  simulateCustomerPayment,
  generateQrVisualMatrix,
};
