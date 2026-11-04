/**
 * src/billPaymentService.js
 *
 * TallyPay Utility Bill Payment Subsystem (BillPaymentActivity)
 * Clean-room reconstruction matching reference architecture in REF-001 (classes4.dex & resources.arsc)
 *
 * Milestone: REA-ITER-226
 * Architect: Worker 2: Averroes (Permanent Backend Developer & Business Logic)
 */

const crypto = require('crypto');

// -------------------------------------------------------------
// BENGALI NUMERAL & FORMATTING HELPERS
// -------------------------------------------------------------
const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const BENGALI_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

function toBengaliNumerals(val) {
  if (val === null || val === undefined) return '';
  return String(val).replace(/\d/g, (d) => BENGALI_DIGITS[Number(d)] !== undefined ? BENGALI_DIGITS[Number(d)] : d);
}

function formatBengaliCurrency(amount, options = {}) {
  const num = Number(amount || 0);
  const minFrac = options.minimumFractionDigits !== undefined ? options.minimumFractionDigits : 2;
  const maxFrac = options.maximumFractionDigits !== undefined ? options.maximumFractionDigits : 2;
  try {
    const formatted = num.toLocaleString('bn-BD', {
      minimumFractionDigits: minFrac,
      maximumFractionDigits: maxFrac
    });
    if (/[০-৯]/.test(formatted)) {
      return formatted;
    }
  } catch (_) {}

  const fixed = num.toFixed(maxFrac);
  const [intPart, decPart] = fixed.split('.');
  let lastThree = intPart.slice(-3);
  const otherNumbers = intPart.slice(0, -3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const grouped = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  const withDec = decPart ? `${grouped}.${decPart}` : grouped;
  return toBengaliNumerals(withDec);
}

function formatBengaliDate(inputDate) {
  let d;
  if (!inputDate) {
    d = new Date();
  } else if (inputDate instanceof Date) {
    d = inputDate;
  } else if (typeof inputDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(inputDate)) {
    const [y, m, day] = inputDate.split('T')[0].split('-').map(Number);
    d = new Date(y, m - 1, day);
  } else {
    d = new Date(inputDate);
  }
  if (isNaN(d.getTime())) return String(inputDate);

  const day = String(d.getDate()).padStart(2, '0');
  const monthName = BENGALI_MONTHS[d.getMonth()];
  const year = String(d.getFullYear());
  return `${toBengaliNumerals(day)} ${monthName} ${toBengaliNumerals(year)}`;
}

function isValidBangladeshiMobile(mobile) {
  if (!mobile) return false;
  const cleaned = String(mobile).replace(/[\s\-\(\)]/g, '');
  return /^(\+?8801|01)[3-9]\d{8}$/.test(cleaned);
}

function maskWalletNumber(walletNo) {
  if (!walletNo) return '';
  const s = String(walletNo).replace(/[\s\-\+]/g, '');
  if (s.length < 8) return s;
  return s.substring(0, 3) + '****' + s.substring(s.length - 4);
}

// -------------------------------------------------------------
// 1. BILLER CATEGORIES & DATA/UI TYPE ENUMS
// -------------------------------------------------------------
const BILLER_CATEGORIES = {
  ELECTRICITY_BILL: {
    id: 'CAT_ELEC',
    code: 'ELECTRICITY_BILL',
    name: 'Electricity',
    nameBn: 'বিদ্যুৎ বিল',
    icon: 'zap',
    priority: 1,
  },
  WATER_BILL: {
    id: 'CAT_WATER',
    code: 'WATER_BILL',
    name: 'Water',
    nameBn: 'পানি বিল',
    icon: 'droplet',
    priority: 2,
  },
  GAS_BILL: {
    id: 'CAT_GAS',
    code: 'GAS_BILL',
    name: 'Gas',
    nameBn: 'গ্যাস বিল',
    icon: 'flame',
    priority: 3,
  },
  INTERNET_BILL: {
    id: 'CAT_INTERNET',
    code: 'INTERNET_BILL',
    name: 'Internet',
    nameBn: 'ইন্টারনেট বিল',
    icon: 'wifi',
    priority: 4,
  },
  OTHER_BILL: {
    id: 'CAT_OTHER',
    code: 'OTHER_BILL',
    name: 'Internet / Other',
    nameBn: 'ইন্টারনেট / অন্যান্য',
    icon: 'grid',
    priority: 5,
  },
};

const BILL_PAYMENT_INPUT_DATA_TYPES = {
  DATA_TYPE_DECIMAL: 'DATA_TYPE_DECIMAL',
  DATA_TYPE_NUMBER: 'DATA_TYPE_NUMBER',
  DATA_TYPE_PASSWORD: 'DATA_TYPE_PASSWORD',
  DATA_TYPE_STRING: 'DATA_TYPE_STRING',
  DATA_TYPE_UNKNOWN: 'DATA_TYPE_UNKNOWN',
};

const BILL_PAYMENT_INPUT_UI_TYPES = {
  UI_TYPE_DROP_DOWN: 'UI_TYPE_DROP_DOWN',
  UI_TYPE_TEXT: 'UI_TYPE_TEXT',
  UI_TYPE_UNKNOWN: 'UI_TYPE_UNKNOWN',
  UI_TYPE_VIDEO: 'UI_TYPE_VIDEO',
};

const BILL_PAYMENT_LABEL_KEYWORDS = {
  LABEL_KEY_WORD_ACCOUNT_NO: 'LABEL_KEY_WORD_ACCOUNT_NO',
  LABEL_KEY_WORD_AMOUNT: 'LABEL_KEY_WORD_AMOUNT',
  LABEL_KEY_WORD_MOBILE_NUMBER: 'LABEL_KEY_WORD_MOBILE_NUMBER',
  LABEL_KEY_WORD_TYPE_UNKNOWN: 'LABEL_KEY_WORD_TYPE_UNKNOWN',
};

// Authentic Bengali resource tokens from resources.arsc
const BENGALI_ARSC_TOKENS = {
  HEADER_BILL_PAY: 'বিল পে',
  SECTION_BILL_PAYMENT: 'বিল পেমেন্ট',
  PAYMENT_SUCCESS_BANNER: 'বিল পেমেন্ট সফল হয়েছে',
  RECEIPT_TITLE: 'বিল রশিদ',
  SHARE_RECEIPT: 'বিল রশিদ শেয়ার করি',
  BILL_NO_FORMAT: 'বিল নং: %1',
  SEARCH_BILLER_PLACEHOLDER: 'বিলার বা প্রতিষ্ঠান খোঁজ করুন',
  BILLER_SAVED_TOAST: 'বিলার একাউন্টটি সেভ করা হয়াছে',
  SAVE_BILLER_CHECKBOX: 'পরবর্তী লেনদেনের জন্য বিলার সেভ করি',
};

// -------------------------------------------------------------
// 2. BILLER PROVIDER REGISTRY WITH DYNAMIC FORM SCHEMAS
// -------------------------------------------------------------
const BILLER_PROVIDERS = [
  // ---------------- ELECTRICITY_BILL (6 Providers) ----------------
  {
    id: 1,
    billerCode: 'DESCO_POSTPAID',
    billerName: 'DESCO Postpaid',
    billerNameBn: 'ডেসকো (পোস্টপেইড)',
    billerFullName: 'Dhaka Electric Supply Company Limited (Postpaid)',
    billerCategory: 'ELECTRICITY_BILL',
    billerCategoryBn: 'বিদ্যুৎ',
    billerType: 'POSTPAID',
    billerWallet: 'DESCO_POST_WALLET',
    categoryPriority: 1,
    isBillerActive: true,
    visible: true,
    fields: [
      {
        id: 101,
        key: 'account_no',
        label: 'Account No',
        labelBn: 'একাউন্ট নম্বর',
        hint: 'Enter 8-digit Account Number',
        hintBn: '৮ ডিজিটের একাউন্ট নম্বর দিন',
        inputType: BILL_PAYMENT_INPUT_DATA_TYPES.DATA_TYPE_NUMBER,
        uiType: BILL_PAYMENT_INPUT_UI_TYPES.UI_TYPE_TEXT,
        labelKeyword: BILL_PAYMENT_LABEL_KEYWORDS.LABEL_KEY_WORD_ACCOUNT_NO,
        regex: '^[0-9]{8}$',
        minLength: 8,
        maxLength: 8,
        required: true,
      },
      {
        id: 102,
        key: 'customer_mobile',
        label: 'Customer Mobile',
        labelBn: 'গ্রাহকের মোবাইল নম্বর',
        hint: 'Enter 11-digit mobile number',
        hintBn: '১১ ডিজিটের মোবাইল নম্বর দিন',
        inputType: BILL_PAYMENT_INPUT_DATA_TYPES.DATA_TYPE_NUMBER,
        uiType: BILL_PAYMENT_INPUT_UI_TYPES.UI_TYPE_TEXT,
        labelKeyword: BILL_PAYMENT_LABEL_KEYWORDS.LABEL_KEY_WORD_MOBILE_NUMBER,
        regex: '^01[3-9][0-9]{8}$',
        minLength: 11,
        maxLength: 11,
        required: true,
      },
    ],
  },
  {
    id: 2,
    billerCode: 'DESCO_PREPAID',
    billerName: 'DESCO Prepaid',
    billerNameBn: 'ডেসকো (প্রিপেইড)',
    billerFullName: 'Dhaka Electric Supply Company Limited (Prepaid)',
    billerCategory: 'ELECTRICITY_BILL',
    billerCategoryBn: 'বিদ্যুৎ',
    billerType: 'PREPAID',
    billerWallet: 'DESCO_PRE_WALLET',
    categoryPriority: 2,
    isBillerActive: true,
    visible: true,
    fields: [
      {
        id: 201,
        key: 'account_no',
        label: 'Account No',
        labelBn: 'একাউন্ট নম্বর',
        hint: 'Enter Account Number',
        hintBn: 'একাউন্ট নম্বর দিন',
        inputType: BILL_PAYMENT_INPUT_DATA_TYPES.DATA_TYPE_NUMBER,
        uiType: BILL_PAYMENT_INPUT_UI_TYPES.UI_TYPE_TEXT,
        labelKeyword: BILL_PAYMENT_LABEL_KEYWORDS.LABEL_KEY_WORD_ACCOUNT_NO,
        regex: '^[0-9]{8,12}$',
        minLength: 8,
        maxLength: 12,
        required: true,
      },
      {
        id: 202,
        key: 'meter_no',
        label: 'Meter No',
        labelBn: 'মিটার নম্বর',
        hint: 'Enter Meter Number',
        hintBn: 'মিটার নম্বর দিন',
        inputType: BILL_PAYMENT_INPUT_DATA_TYPES.DATA_TYPE_NUMBER,
        uiType: BILL_PAYMENT_INPUT_UI_TYPES.UI_TYPE_TEXT,
        labelKeyword: BILL_PAYMENT_LABEL_KEYWORDS.LABEL_KEY_WORD_TYPE_UNKNOWN,
        regex: '^[0-9]{8,12}$',
        minLength: 8,
        maxLength: 12,
        required: true,
      },
      {
        id: 203,
        key: 'customer_mobile',
        label: 'Customer Mobile',
        labelBn: 'গ্রাহকের মোবাইল নম্বর',
        hint: 'Enter 11-digit mobile number',
        hintBn: '১১ ডিজিটের মোবাইল নম্বর দিন',
        inputType: BILL_PAYMENT_INPUT_DATA_TYPES.DATA_TYPE_NUMBER,
        uiType: BILL_PAYMENT_INPUT_UI_TYPES.UI_TYPE_TEXT,
        labelKeyword: BILL_PAYMENT_LABEL_KEYWORDS.LABEL_KEY_WORD_MOBILE_NUMBER,
        regex: '^01[3-9][0-9]{8}$',
        minLength: 11,
        maxLength: 11,
        required: true,
      },
    ],
  },
  {
    id: 3,
    billerCode: 'DPDC_POSTPAID',
    billerName: 'DPDC Postpaid',
    billerNameBn: 'ডিপিডিসি (পোস্টপেইড)',
    billerFullName: 'Dhaka Power Distribution Company Limited (Postpaid)',
    billerCategory: 'ELECTRICITY_BILL',
    billerCategoryBn: 'বিদ্যুৎ',
    billerType: 'POSTPAID',
    billerWallet: 'DPDC_POST_WALLET',
    categoryPriority: 3,
    isBillerActive: true,
    visible: true,
    fields: [
      {
        id: 301,
        key: 'account_no',
        label: 'Customer No',
        labelBn: 'কাস্টমার নম্বর',
        hint: 'Enter 8-10 digit Customer Number',
        hintBn: '৮-১০ ডিজিটের কাস্টমার নম্বর দিন',
        inputType: BILL_PAYMENT_INPUT_DATA_TYPES.DATA_TYPE_NUMBER,
        uiType: BILL_PAYMENT_INPUT_UI_TYPES.UI_TYPE_TEXT,
        labelKeyword: BILL_PAYMENT_LABEL_KEYWORDS.LABEL_KEY_WORD_ACCOUNT_NO,
        regex: '^[0-9]{8,10}$',
        minLength: 8,
        maxLength: 10,
        required: true,
      },
      {
        id: 302,
        key: 'customer_mobile',
        label: 'Customer Mobile',
        labelBn: 'গ্রাহকের মোবাইল নম্বর',
        hint: 'Enter 11-digit mobile number',
        hintBn: '১১ ডিজিটের মোবাইল নম্বর দিন',
        inputType: BILL_PAYMENT_INPUT_DATA_TYPES.DATA_TYPE_NUMBER,
        uiType: BILL_PAYMENT_INPUT_UI_TYPES.UI_TYPE_TEXT,
        labelKeyword: BILL_PAYMENT_LABEL_KEYWORDS.LABEL_KEY_WORD_MOBILE_NUMBER,
        regex: '^01[3-9][0-9]{8}$',
        minLength: 11,
        maxLength: 11,
        required: true,
      },
    ],
  },
  {
    id: 4,
    billerCode: 'DPDC_PREPAID',
    billerName: 'DPDC Prepaid',
    billerNameBn: 'ডিপিডিসি (প্রিপেইড)',
    billerFullName: 'Dhaka Power Distribution Company Limited (Prepaid)',
    billerCategory: 'ELECTRICITY_BILL',
    billerCategoryBn: 'বিদ্যুৎ',
    billerType: 'PREPAID',
    billerWallet: 'DPDC_PRE_WALLET',
    categoryPriority: 4,
    isBillerActive: true,
    visible: true,
    fields: [
      {
        id: 401,
        key: 'account_no',
        label: 'Customer No',
        labelBn: 'কাস্টমার নম্বর',
        hint: 'Enter Customer Number',
        hintBn: 'কাস্টমার নম্বর দিন',
        inputType: BILL_PAYMENT_INPUT_DATA_TYPES.DATA_TYPE_NUMBER,
        uiType: BILL_PAYMENT_INPUT_UI_TYPES.UI_TYPE_TEXT,
        labelKeyword: BILL_PAYMENT_LABEL_KEYWORDS.LABEL_KEY_WORD_ACCOUNT_NO,
        regex: '^[0-9]{8,10}$',
        minLength: 8,
        maxLength: 10,
        required: true,
      },
      {
        id: 402,
        key: 'meter_no',
        label: 'Meter No',
        labelBn: 'মিটার নম্বর',
        hint: 'Enter Meter Number',
        hintBn: 'মিটার নম্বর দিন',
        inputType: BILL_PAYMENT_INPUT_DATA_TYPES.DATA_TYPE_NUMBER,
        uiType: BILL_PAYMENT_INPUT_UI_TYPES.UI_TYPE_TEXT,
        labelKeyword: BILL_PAYMENT_LABEL_KEYWORDS.LABEL_KEY_WORD_TYPE_UNKNOWN,
        regex: '^[0-9]{8,12}$',
        minLength: 8,
        maxLength: 12,
        required: true,
      },
      {
        id: 403,
        key: 'customer_mobile',
        label: 'Customer Mobile',
        labelBn: 'গ্রাহকের মোবাইল নম্বর',
        hint: 'Enter 11-digit mobile number',
        hintBn: '১১ ডিজিটের মোবাইল নম্বর দিন',
        inputType: BILL_PAYMENT_INPUT_DATA_TYPES.DATA_TYPE_NUMBER,
        uiType: BILL_PAYMENT_INPUT_UI_TYPES.UI_TYPE_TEXT,
        labelKeyword: BILL_PAYMENT_LABEL_KEYWORDS.LABEL_KEY_WORD_MOBILE_NUMBER,
        regex: '^01[3-9][0-9]{8}$',
        minLength: 11,
        maxLength: 11,
        required: true,
      },
    ],
  },
  {
    id: 5,
    billerCode: 'NESCO',
    billerName: 'NESCO',
    billerNameBn: 'নেসকো',
    billerFullName: 'Northern Electricity Supply Company Limited',
    billerCategory: 'ELECTRICITY_BILL',
    billerCategoryBn: 'বিদ্যুৎ',
    billerType: 'POSTPAID',
    billerWallet: 'NESCO_WALLET',
    categoryPriority: 5,
    isBillerActive: true,
    visible: true,
    fields: [
      {
        id: 501,
        key: 'account_no',
        label: 'Customer No',
        labelBn: 'কাস্টমার নম্বর',
        hint: 'Enter 8-10 digit Customer Number',
        hintBn: '৮-১০ ডিজিটের কাস্টমার নম্বর দিন',
        inputType: BILL_PAYMENT_INPUT_DATA_TYPES.DATA_TYPE_NUMBER,
        uiType: BILL_PAYMENT_INPUT_UI_TYPES.UI_TYPE_TEXT,
        labelKeyword: BILL_PAYMENT_LABEL_KEYWORDS.LABEL_KEY_WORD_ACCOUNT_NO,
        regex: '^[0-9]{8,10}$',
        minLength: 8,
        maxLength: 10,
        required: true,
      },
      {
        id: 502,
        key: 'customer_mobile',
        label: 'Customer Mobile',
        labelBn: 'গ্রাহকের মোবাইল নম্বর',
        hint: 'Enter 11-digit mobile number',
        hintBn: '১১ ডিজিটের মোবাইল নম্বর দিন',
        inputType: BILL_PAYMENT_INPUT_DATA_TYPES.DATA_TYPE_NUMBER,
        uiType: BILL_PAYMENT_INPUT_UI_TYPES.UI_TYPE_TEXT,
        labelKeyword: BILL_PAYMENT_LABEL_KEYWORDS.LABEL_KEY_WORD_MOBILE_NUMBER,
        regex: '^01[3-9][0-9]{8}$',
        minLength: 11,
        maxLength: 11,
        required: true,
      },
    ],
  },
  {
    id: 6,
    billerCode: 'BREB',
    billerName: 'BREB / Polli Bidyut',
    billerNameBn: 'পল্লী বিদ্যুৎ (বিআরইবি)',
    billerFullName: 'Bangladesh Rural Electrification Board (Polli Bidyut)',
    billerCategory: 'ELECTRICITY_BILL',
    billerCategoryBn: 'বিদ্যুৎ',
    billerType: 'POSTPAID',
    billerWallet: 'BREB_WALLET',
    categoryPriority: 6,
    isBillerActive: true,
    visible: true,
    fields: [
      {
        id: 601,
        key: 'sms_account_no',
        label: 'SMS Account No',
        labelBn: 'এসএমএস হিসাব নং',
        hint: 'Enter 11-13 digit SMS Account Number',
        hintBn: 'বিল পেপারে উল্লিখিত এসএমএস হিসাব নং দিন',
        inputType: BILL_PAYMENT_INPUT_DATA_TYPES.DATA_TYPE_NUMBER,
        uiType: BILL_PAYMENT_INPUT_UI_TYPES.UI_TYPE_TEXT,
        labelKeyword: BILL_PAYMENT_LABEL_KEYWORDS.LABEL_KEY_WORD_ACCOUNT_NO,
        regex: '^[0-9]{11,13}$',
        minLength: 11,
        maxLength: 13,
        required: true,
      },
      {
        id: 602,
        key: 'customer_mobile',
        label: 'Customer Mobile',
        labelBn: 'গ্রাহকের মোবাইল নম্বর',
        hint: 'Enter 11-digit mobile number',
        hintBn: '১১ ডিজিটের মোবাইল নম্বর দিন',
        inputType: BILL_PAYMENT_INPUT_DATA_TYPES.DATA_TYPE_NUMBER,
        uiType: BILL_PAYMENT_INPUT_UI_TYPES.UI_TYPE_TEXT,
        labelKeyword: BILL_PAYMENT_LABEL_KEYWORDS.LABEL_KEY_WORD_MOBILE_NUMBER,
        regex: '^01[3-9][0-9]{8}$',
        minLength: 11,
        maxLength: 11,
        required: true,
      },
    ],
  },

  // ---------------- WATER_BILL (2 Providers) ----------------
  {
    id: 7,
    billerCode: 'DHAKA_WASA',
    billerName: 'Dhaka WASA',
    billerNameBn: 'ঢাকা ওয়াসা',
    billerFullName: 'Dhaka Water Supply and Sewerage Authority',
    billerCategory: 'WATER_BILL',
    billerCategoryBn: 'পানি',
    billerType: 'POSTPAID',
    billerWallet: 'DWASA_WALLET',
    categoryPriority: 1,
    isBillerActive: true,
    visible: true,
    fields: [
      {
        id: 701,
        key: 'account_no',
        label: 'Account No',
        labelBn: 'একাউন্ট নম্বর',
        hint: 'Enter 9-12 digit Account Number',
        hintBn: '৯-১২ ডিজিটের একাউন্ট নম্বর দিন',
        inputType: BILL_PAYMENT_INPUT_DATA_TYPES.DATA_TYPE_NUMBER,
        uiType: BILL_PAYMENT_INPUT_UI_TYPES.UI_TYPE_TEXT,
        labelKeyword: BILL_PAYMENT_LABEL_KEYWORDS.LABEL_KEY_WORD_ACCOUNT_NO,
        regex: '^[0-9]{9,12}$',
        minLength: 9,
        maxLength: 12,
        required: true,
      },
      {
        id: 702,
        key: 'customer_mobile',
        label: 'Customer Mobile',
        labelBn: 'গ্রাহকের মোবাইল নম্বর',
        hint: 'Enter 11-digit mobile number',
        hintBn: '১১ ডিজিটের মোবাইল নম্বর দিন',
        inputType: BILL_PAYMENT_INPUT_DATA_TYPES.DATA_TYPE_NUMBER,
        uiType: BILL_PAYMENT_INPUT_UI_TYPES.UI_TYPE_TEXT,
        labelKeyword: BILL_PAYMENT_LABEL_KEYWORDS.LABEL_KEY_WORD_MOBILE_NUMBER,
        regex: '^01[3-9][0-9]{8}$',
        minLength: 11,
        maxLength: 11,
        required: true,
      },
    ],
  },
  {
    id: 8,
    billerCode: 'CHATTOGRAM_WASA',
    billerName: 'Chattogram WASA',
    billerNameBn: 'চট্টগ্রাম ওয়াসা',
    billerFullName: 'Chattogram Water Supply and Sewerage Authority',
    billerCategory: 'WATER_BILL',
    billerCategoryBn: 'পানি',
    billerType: 'POSTPAID',
    billerWallet: 'CWASA_WALLET',
    categoryPriority: 2,
    isBillerActive: true,
    visible: true,
    fields: [
      {
        id: 801,
        key: 'account_no',
        label: 'Account No',
        labelBn: 'একাউন্ট নম্বর',
        hint: 'Enter 8-12 digit Account Number',
        hintBn: '৮-১২ ডিজিটের একাউন্ট নম্বর দিন',
        inputType: BILL_PAYMENT_INPUT_DATA_TYPES.DATA_TYPE_NUMBER,
        uiType: BILL_PAYMENT_INPUT_UI_TYPES.UI_TYPE_TEXT,
        labelKeyword: BILL_PAYMENT_LABEL_KEYWORDS.LABEL_KEY_WORD_ACCOUNT_NO,
        regex: '^[0-9]{8,12}$',
        minLength: 8,
        maxLength: 12,
        required: true,
      },
      {
        id: 802,
        key: 'customer_mobile',
        label: 'Customer Mobile',
        labelBn: 'গ্রাহকের মোবাইল নম্বর',
        hint: 'Enter 11-digit mobile number',
        hintBn: '১১ ডিজিটের মোবাইল নম্বর দিন',
        inputType: BILL_PAYMENT_INPUT_DATA_TYPES.DATA_TYPE_NUMBER,
        uiType: BILL_PAYMENT_INPUT_UI_TYPES.UI_TYPE_TEXT,
        labelKeyword: BILL_PAYMENT_LABEL_KEYWORDS.LABEL_KEY_WORD_MOBILE_NUMBER,
        regex: '^01[3-9][0-9]{8}$',
        minLength: 11,
        maxLength: 11,
        required: true,
      },
    ],
  },

  // ---------------- GAS_BILL (4 Providers) ----------------
  {
    id: 9,
    billerCode: 'TITAS_GAS_NON_METERED',
    billerName: 'Titas Gas (Non-metered)',
    billerNameBn: 'তিতাস গ্যাস (নন-মিটারড)',
    billerFullName: 'Titas Gas Transmission and Distribution Co. Ltd. (Non-metered)',
    billerCategory: 'GAS_BILL',
    billerCategoryBn: 'গ্যাস',
    billerType: 'NON_METERED',
    billerWallet: 'TITAS_NM_WALLET',
    categoryPriority: 1,
    isBillerActive: true,
    visible: true,
    fields: [
      {
        id: 901,
        key: 'account_no',
        label: 'Customer Code',
        labelBn: 'গ্রাহক কোড / একাউন্ট নং',
        hint: 'Enter 8-12 alphanumeric Customer Code',
        hintBn: '৮-১২ ডিজিট বা অক্ষরের গ্রাহক কোড দিন',
        inputType: BILL_PAYMENT_INPUT_DATA_TYPES.DATA_TYPE_STRING,
        uiType: BILL_PAYMENT_INPUT_UI_TYPES.UI_TYPE_TEXT,
        labelKeyword: BILL_PAYMENT_LABEL_KEYWORDS.LABEL_KEY_WORD_ACCOUNT_NO,
        regex: '^[A-Za-z0-9]{8,12}$',
        minLength: 8,
        maxLength: 12,
        required: true,
      },
      {
        id: 902,
        key: 'customer_mobile',
        label: 'Customer Mobile',
        labelBn: 'গ্রাহকের মোবাইল নম্বর',
        hint: 'Enter 11-digit mobile number',
        hintBn: '১১ ডিজিটের মোবাইল নম্বর দিন',
        inputType: BILL_PAYMENT_INPUT_DATA_TYPES.DATA_TYPE_NUMBER,
        uiType: BILL_PAYMENT_INPUT_UI_TYPES.UI_TYPE_TEXT,
        labelKeyword: BILL_PAYMENT_LABEL_KEYWORDS.LABEL_KEY_WORD_MOBILE_NUMBER,
        regex: '^01[3-9][0-9]{8}$',
        minLength: 11,
        maxLength: 11,
        required: true,
      },
    ],
  },
  {
    id: 10,
    billerCode: 'TITAS_GAS_METERED',
    billerName: 'Titas Gas (Metered)',
    billerNameBn: 'তিতাস গ্যাস (মিটারড)',
    billerFullName: 'Titas Gas Transmission and Distribution Co. Ltd. (Metered)',
    billerCategory: 'GAS_BILL',
    billerCategoryBn: 'গ্যাস',
    billerType: 'METERED',
    billerWallet: 'TITAS_M_WALLET',
    categoryPriority: 2,
    isBillerActive: true,
    visible: true,
    fields: [
      {
        id: 1001,
        key: 'account_no',
        label: 'Customer Code',
        labelBn: 'গ্রাহক কোড',
        hint: 'Enter 8-12 alphanumeric Customer Code',
        hintBn: 'গ্রাহক কোড দিন',
        inputType: BILL_PAYMENT_INPUT_DATA_TYPES.DATA_TYPE_STRING,
        uiType: BILL_PAYMENT_INPUT_UI_TYPES.UI_TYPE_TEXT,
        labelKeyword: BILL_PAYMENT_LABEL_KEYWORDS.LABEL_KEY_WORD_ACCOUNT_NO,
        regex: '^[A-Za-z0-9]{8,12}$',
        minLength: 8,
        maxLength: 12,
        required: true,
      },
      {
        id: 1002,
        key: 'meter_no',
        label: 'Meter No',
        labelBn: 'মিটার নম্বর',
        hint: 'Enter 8-12 digit Meter Number',
        hintBn: 'মিটার নম্বর দিন',
        inputType: BILL_PAYMENT_INPUT_DATA_TYPES.DATA_TYPE_NUMBER,
        uiType: BILL_PAYMENT_INPUT_UI_TYPES.UI_TYPE_TEXT,
        labelKeyword: BILL_PAYMENT_LABEL_KEYWORDS.LABEL_KEY_WORD_TYPE_UNKNOWN,
        regex: '^[0-9]{8,12}$',
        minLength: 8,
        maxLength: 12,
        required: true,
      },
      {
        id: 1003,
        key: 'customer_mobile',
        label: 'Customer Mobile',
        labelBn: 'গ্রাহকের মোবাইল নম্বর',
        hint: 'Enter 11-digit mobile number',
        hintBn: '১১ ডিজিটের মোবাইল নম্বর দিন',
        inputType: BILL_PAYMENT_INPUT_DATA_TYPES.DATA_TYPE_NUMBER,
        uiType: BILL_PAYMENT_INPUT_UI_TYPES.UI_TYPE_TEXT,
        labelKeyword: BILL_PAYMENT_LABEL_KEYWORDS.LABEL_KEY_WORD_MOBILE_NUMBER,
        regex: '^01[3-9][0-9]{8}$',
        minLength: 11,
        maxLength: 11,
        required: true,
      },
    ],
  },
  {
    id: 11,
    billerCode: 'BAKHRABAD_GAS',
    billerName: 'Bakhrabad Gas',
    billerNameBn: 'বাখরাবাদ গ্যাস',
    billerFullName: 'Bakhrabad Gas Distribution Company Limited',
    billerCategory: 'GAS_BILL',
    billerCategoryBn: 'গ্যাস',
    billerType: 'NON_METERED',
    billerWallet: 'BAKHRABAD_WALLET',
    categoryPriority: 3,
    isBillerActive: true,
    visible: true,
    fields: [
      {
        id: 1101,
        key: 'account_no',
        label: 'Customer No',
        labelBn: 'গ্রাহক নম্বর',
        hint: 'Enter 8-12 alphanumeric Customer Number',
        hintBn: '৮-১২ ডিজিটের গ্রাহক নম্বর দিন',
        inputType: BILL_PAYMENT_INPUT_DATA_TYPES.DATA_TYPE_STRING,
        uiType: BILL_PAYMENT_INPUT_UI_TYPES.UI_TYPE_TEXT,
        labelKeyword: BILL_PAYMENT_LABEL_KEYWORDS.LABEL_KEY_WORD_ACCOUNT_NO,
        regex: '^[A-Za-z0-9]{8,12}$',
        minLength: 8,
        maxLength: 12,
        required: true,
      },
      {
        id: 1102,
        key: 'customer_mobile',
        label: 'Customer Mobile',
        labelBn: 'গ্রাহকের মোবাইল নম্বর',
        hint: 'Enter 11-digit mobile number',
        hintBn: '১১ ডিজিটের মোবাইল নম্বর দিন',
        inputType: BILL_PAYMENT_INPUT_DATA_TYPES.DATA_TYPE_NUMBER,
        uiType: BILL_PAYMENT_INPUT_UI_TYPES.UI_TYPE_TEXT,
        labelKeyword: BILL_PAYMENT_LABEL_KEYWORDS.LABEL_KEY_WORD_MOBILE_NUMBER,
        regex: '^01[3-9][0-9]{8}$',
        minLength: 11,
        maxLength: 11,
        required: true,
      },
    ],
  },
  {
    id: 12,
    billerCode: 'JALALABAD_GAS',
    billerName: 'Jalalabad Gas',
    billerNameBn: 'জালালাবাদ গ্যাস',
    billerFullName: 'Jalalabad Gas Transmission and Distribution System Ltd.',
    billerCategory: 'GAS_BILL',
    billerCategoryBn: 'গ্যাস',
    billerType: 'NON_METERED',
    billerWallet: 'JALALABAD_WALLET',
    categoryPriority: 4,
    isBillerActive: true,
    visible: true,
    fields: [
      {
        id: 1201,
        key: 'account_no',
        label: 'Customer No',
        labelBn: 'গ্রাহক নম্বর',
        hint: 'Enter 8-12 alphanumeric Customer Number',
        hintBn: '৮-১২ ডিজিটের গ্রাহক নম্বর দিন',
        inputType: BILL_PAYMENT_INPUT_DATA_TYPES.DATA_TYPE_STRING,
        uiType: BILL_PAYMENT_INPUT_UI_TYPES.UI_TYPE_TEXT,
        labelKeyword: BILL_PAYMENT_LABEL_KEYWORDS.LABEL_KEY_WORD_ACCOUNT_NO,
        regex: '^[A-Za-z0-9]{8,12}$',
        minLength: 8,
        maxLength: 12,
        required: true,
      },
      {
        id: 1202,
        key: 'customer_mobile',
        label: 'Customer Mobile',
        labelBn: 'গ্রাহকের মোবাইল নম্বর',
        hint: 'Enter 11-digit mobile number',
        hintBn: '১১ ডিজিটের মোবাইল নম্বর দিন',
        inputType: BILL_PAYMENT_INPUT_DATA_TYPES.DATA_TYPE_NUMBER,
        uiType: BILL_PAYMENT_INPUT_UI_TYPES.UI_TYPE_TEXT,
        labelKeyword: BILL_PAYMENT_LABEL_KEYWORDS.LABEL_KEY_WORD_MOBILE_NUMBER,
        regex: '^01[3-9][0-9]{8}$',
        minLength: 11,
        maxLength: 11,
        required: true,
      },
    ],
  },

  // ---------------- INTERNET_BILL (4 Providers) ----------------
  {
    id: 13,
    billerCode: 'LINK3',
    billerName: 'Link3',
    billerNameBn: 'লিংক থ্রি (Link3)',
    billerFullName: 'Link3 Technologies Limited',
    billerCategory: 'INTERNET_BILL',
    billerCategoryBn: 'ইন্টারনেট',
    billerType: 'BROADBAND',
    billerWallet: 'LINK3_WALLET',
    categoryPriority: 1,
    isBillerActive: true,
    visible: true,
    fields: [
      {
        id: 1301,
        key: 'account_no',
        label: 'Subscriber ID',
        labelBn: 'সাবস্ক্রাইবার আইডি / ইউজার আইডি',
        hint: 'Enter Subscriber ID',
        hintBn: 'সাবস্ক্রাইবার বা ইউজার আইডি দিন',
        inputType: BILL_PAYMENT_INPUT_DATA_TYPES.DATA_TYPE_STRING,
        uiType: BILL_PAYMENT_INPUT_UI_TYPES.UI_TYPE_TEXT,
        labelKeyword: BILL_PAYMENT_LABEL_KEYWORDS.LABEL_KEY_WORD_ACCOUNT_NO,
        regex: '^[A-Za-z0-9_\-]{4,20}$',
        minLength: 4,
        maxLength: 20,
        required: true,
      },
      {
        id: 1302,
        key: 'customer_mobile',
        label: 'Customer Mobile',
        labelBn: 'গ্রাহকের মোবাইল নম্বর',
        hint: 'Enter 11-digit mobile number',
        hintBn: '১১ ডিজিটের মোবাইল নম্বর দিন',
        inputType: BILL_PAYMENT_INPUT_DATA_TYPES.DATA_TYPE_NUMBER,
        uiType: BILL_PAYMENT_INPUT_UI_TYPES.UI_TYPE_TEXT,
        labelKeyword: BILL_PAYMENT_LABEL_KEYWORDS.LABEL_KEY_WORD_MOBILE_NUMBER,
        regex: '^01[3-9][0-9]{8}$',
        minLength: 11,
        maxLength: 11,
        required: true,
      },
    ],
  },
  {
    id: 14,
    billerCode: 'AMBERIT',
    billerName: 'AmberIT',
    billerNameBn: 'অ্যাম্বার আইটি (AmberIT)',
    billerFullName: 'Amber IT Limited',
    billerCategory: 'INTERNET_BILL',
    billerCategoryBn: 'ইন্টারনেট',
    billerType: 'BROADBAND',
    billerWallet: 'AMBERIT_WALLET',
    categoryPriority: 2,
    isBillerActive: true,
    visible: true,
    fields: [
      {
        id: 1401,
        key: 'account_no',
        label: 'Customer ID',
        labelBn: 'গ্রাহক আইডি',
        hint: 'Enter Customer ID',
        hintBn: 'গ্রাহক আইডি দিন',
        inputType: BILL_PAYMENT_INPUT_DATA_TYPES.DATA_TYPE_STRING,
        uiType: BILL_PAYMENT_INPUT_UI_TYPES.UI_TYPE_TEXT,
        labelKeyword: BILL_PAYMENT_LABEL_KEYWORDS.LABEL_KEY_WORD_ACCOUNT_NO,
        regex: '^[A-Za-z0-9]{4,16}$',
        minLength: 4,
        maxLength: 16,
        required: true,
      },
      {
        id: 1402,
        key: 'customer_mobile',
        label: 'Customer Mobile',
        labelBn: 'গ্রাহকের মোবাইল নম্বর',
        hint: 'Enter 11-digit mobile number',
        hintBn: '১১ ডিজিটের মোবাইল নম্বর দিন',
        inputType: BILL_PAYMENT_INPUT_DATA_TYPES.DATA_TYPE_NUMBER,
        uiType: BILL_PAYMENT_INPUT_UI_TYPES.UI_TYPE_TEXT,
        labelKeyword: BILL_PAYMENT_LABEL_KEYWORDS.LABEL_KEY_WORD_MOBILE_NUMBER,
        regex: '^01[3-9][0-9]{8}$',
        minLength: 11,
        maxLength: 11,
        required: true,
      },
    ],
  },
  {
    id: 15,
    billerCode: 'CARNIVAL',
    billerName: 'Carnival',
    billerNameBn: 'কার্নিভাল ইন্টারনেট',
    billerFullName: 'Carnival Internet (Dot Internet Service Ltd.)',
    billerCategory: 'INTERNET_BILL',
    billerCategoryBn: 'ইন্টারনেট',
    billerType: 'BROADBAND',
    billerWallet: 'CARNIVAL_WALLET',
    categoryPriority: 3,
    isBillerActive: true,
    visible: true,
    fields: [
      {
        id: 1501,
        key: 'account_no',
        label: 'User ID',
        labelBn: 'ইউজার আইডি',
        hint: 'Enter User ID',
        hintBn: 'ইউজার আইডি দিন',
        inputType: BILL_PAYMENT_INPUT_DATA_TYPES.DATA_TYPE_STRING,
        uiType: BILL_PAYMENT_INPUT_UI_TYPES.UI_TYPE_TEXT,
        labelKeyword: BILL_PAYMENT_LABEL_KEYWORDS.LABEL_KEY_WORD_ACCOUNT_NO,
        regex: '^[A-Za-z0-9_\-]{4,20}$',
        minLength: 4,
        maxLength: 20,
        required: true,
      },
      {
        id: 1502,
        key: 'customer_mobile',
        label: 'Customer Mobile',
        labelBn: 'গ্রাহকের মোবাইল নম্বর',
        hint: 'Enter 11-digit mobile number',
        hintBn: '১১ ডিজিটের মোবাইল নম্বর দিন',
        inputType: BILL_PAYMENT_INPUT_DATA_TYPES.DATA_TYPE_NUMBER,
        uiType: BILL_PAYMENT_INPUT_UI_TYPES.UI_TYPE_TEXT,
        labelKeyword: BILL_PAYMENT_LABEL_KEYWORDS.LABEL_KEY_WORD_MOBILE_NUMBER,
        regex: '^01[3-9][0-9]{8}$',
        minLength: 11,
        maxLength: 11,
        required: true,
      },
    ],
  },
  {
    id: 16,
    billerCode: 'BTCL',
    billerName: 'BTCL',
    billerNameBn: 'বিটিসিএল (টেলিফোন ও ইন্টারনেট)',
    billerFullName: 'Bangladesh Telecommunications Company Limited',
    billerCategory: 'INTERNET_BILL',
    billerCategoryBn: 'ইন্টারনেট',
    billerType: 'LANDLINE_INTERNET',
    billerWallet: 'BTCL_WALLET',
    categoryPriority: 4,
    isBillerActive: true,
    visible: true,
    fields: [
      {
        id: 1601,
        key: 'account_no',
        label: 'Telephone / Customer No',
        labelBn: 'টেলিফোন / গ্রাহক নম্বর',
        hint: 'Enter 6-12 digit Telephone or Customer Number',
        hintBn: '৬-১২ ডিজিটের টেলিফোন বা গ্রাহক নম্বর দিন',
        inputType: BILL_PAYMENT_INPUT_DATA_TYPES.DATA_TYPE_STRING,
        uiType: BILL_PAYMENT_INPUT_UI_TYPES.UI_TYPE_TEXT,
        labelKeyword: BILL_PAYMENT_LABEL_KEYWORDS.LABEL_KEY_WORD_ACCOUNT_NO,
        regex: '^[0-9]{6,12}$',
        minLength: 6,
        maxLength: 12,
        required: true,
      },
      {
        id: 1602,
        key: 'customer_mobile',
        label: 'Customer Mobile',
        labelBn: 'গ্রাহকের মোবাইল নম্বর',
        hint: 'Enter 11-digit mobile number',
        hintBn: '১১ ডিজিটের মোবাইল নম্বর দিন',
        inputType: BILL_PAYMENT_INPUT_DATA_TYPES.DATA_TYPE_NUMBER,
        uiType: BILL_PAYMENT_INPUT_UI_TYPES.UI_TYPE_TEXT,
        labelKeyword: BILL_PAYMENT_LABEL_KEYWORDS.LABEL_KEY_WORD_MOBILE_NUMBER,
        regex: '^01[3-9][0-9]{8}$',
        minLength: 11,
        maxLength: 11,
        required: true,
      },
    ],
  },
];

// Common biller aliases for robust consumer lookup
const BILLER_ALIASES = {
  DESCO: 'DESCO_POSTPAID',
  DESCO_POST: 'DESCO_POSTPAID',
  DESCO_PRE: 'DESCO_PREPAID',
  DPDC: 'DPDC_POSTPAID',
  DPDC_POST: 'DPDC_POSTPAID',
  DPDC_PRE: 'DPDC_PREPAID',
  NESCO_POSTPAID: 'NESCO',
  POLLI_BIDYUT: 'BREB',
  BREB_POSTPAID: 'BREB',
  REB: 'BREB',
  WASA: 'DHAKA_WASA',
  WASA_DHAKA: 'DHAKA_WASA',
  DWASA: 'DHAKA_WASA',
  WASA_CTG: 'CHATTOGRAM_WASA',
  CWASA: 'CHATTOGRAM_WASA',
  TITAS: 'TITAS_GAS_NON_METERED',
  TITAS_GAS: 'TITAS_GAS_NON_METERED',
  TITAS_NON_METERED: 'TITAS_GAS_NON_METERED',
  TITAS_METERED: 'TITAS_GAS_METERED',
  LINK_3: 'LINK3',
  AMBER_IT: 'AMBERIT',
};

// -------------------------------------------------------------
// 3. REGISTRY ACCESS & LOOKUP METHODS
// -------------------------------------------------------------
function getBillerCategories() {
  return Object.values(BILLER_CATEGORIES);
}

function getBillerList(category = null) {
  if (!category) return [...BILLER_PROVIDERS];
  const catUpper = String(category).trim().toUpperCase();
  return BILLER_PROVIDERS.filter((b) => {
    if (b.billerCategory === catUpper) return true;
    if (catUpper === 'OTHER_BILL' && b.billerCategory === 'INTERNET_BILL') return true;
    if (catUpper === 'INTERNET_BILL' && b.billerCategory === 'OTHER_BILL') return true;
    return false;
  });
}

function getBillerByCode(billerCode) {
  if (!billerCode) return null;
  const rawCode = String(billerCode).trim().toUpperCase();
  const resolvedCode = BILLER_ALIASES[rawCode] || rawCode;
  return BILLER_PROVIDERS.find((b) => b.billerCode === resolvedCode) || null;
}

// -------------------------------------------------------------
// 4. DYNAMIC FIELD VALIDATION
// -------------------------------------------------------------
function validateBillerField(field, value) {
  if (!field) return { valid: false, error: 'Invalid field definition' };
  const valStr = value !== undefined && value !== null ? String(value).trim() : '';
  const label = field.labelBn || field.label || 'তথ্য';

  if (field.required && valStr.length === 0) {
    return { valid: false, error: `${label} প্রয়োজন।` };
  }

  if (valStr.length > 0) {
    if (field.minLength && valStr.length < field.minLength) {
      return { valid: false, error: `${label} কমপক্ষে ${toBengaliNumerals(field.minLength)} সংখ্যার হতে হবে।` };
    }
    if (field.maxLength && valStr.length > field.maxLength) {
      return { valid: false, error: `${label} সর্বোচ্চ ${toBengaliNumerals(field.maxLength)} সংখ্যার হতে পারে।` };
    }
    if (field.regex) {
      const reg = new RegExp(field.regex);
      if (!reg.test(valStr)) {
        return { valid: false, error: `সঠিক ${label} প্রদান করুন।` };
      }
    }
  }

  return { valid: true };
}

function validateBillerInputs(billerCode, inputs = {}) {
  const biller = getBillerByCode(billerCode);
  if (!biller) {
    return { valid: false, error: 'বিলার পাওয়া যায়নি।' };
  }

  const errors = {};
  const normalizedInputs = {};

  const resolveValue = (key) => {
    if (inputs[key] !== undefined) return inputs[key];
    const camel = key.replace(/_([a-z])/g, (_, g) => g.toUpperCase());
    if (inputs[camel] !== undefined) return inputs[camel];
    if (key === 'account_no' && inputs.accountNumber !== undefined) return inputs.accountNumber;
    if (key === 'meter_no' && inputs.meterNumber !== undefined) return inputs.meterNumber;
    if (key === 'sms_account_no' && (inputs.smsAccountNo !== undefined || inputs.smsAccount !== undefined)) {
      return inputs.smsAccountNo || inputs.smsAccount;
    }
    if (key === 'customer_mobile' && (inputs.mobile !== undefined || inputs.customerMobile !== undefined || inputs.phone !== undefined)) {
      return inputs.mobile || inputs.customerMobile || inputs.phone;
    }
    return undefined;
  };

  for (const field of biller.fields) {
    const val = resolveValue(field.key);
    normalizedInputs[field.key] = val !== undefined && val !== null ? String(val).trim() : '';
    const res = validateBillerField(field, normalizedInputs[field.key]);
    if (!res.valid) {
      errors[field.key] = res.error;
    }
  }

  const valid = Object.keys(errors).length === 0;
  return {
    valid,
    errors,
    firstError: Object.values(errors)[0] || null,
    normalizedInputs,
  };
}

// -------------------------------------------------------------
// 5. TIERED CONVENIENCE FEE CALCULATOR (Integer-Paisa Precision)
// -------------------------------------------------------------
/**
 * TallyPay Utility Bill Service Charge Tier (Integer Paisa)
 * Rules:
 *   <= 50,000 paisa (৳500)      -> 500 paisa (৳5)
 *   50,001 - 500,000 paisa (৳500 - ৳5,000) -> 1,000 paisa (৳10)
 *   > 500,000 paisa (> ৳5,000)  -> 1,500 paisa (৳15)
 *
 * @param {number} amountPaisa - Bill principal amount in paisa (1 BDT = 100 Paisa)
 * @returns {number} Convenience fee in paisa
 */
function calculateBillConvenienceFee(amountPaisa) {
  const p = Math.max(0, Math.round(Number(amountPaisa) || 0));
  if (p <= 50000) {
    return 500;
  } else if (p <= 500000) {
    return 1000;
  } else {
    return 1500;
  }
}

// Aliases matching reference investigation & test suites
const calculateUtilityBillFeePaisa = calculateBillConvenienceFee;
const calculateServiceChargePaisa = calculateBillConvenienceFee;

// -------------------------------------------------------------
// 6. BILL INQUIRY RESOLVER (fetchBillInfo)
// -------------------------------------------------------------
function fetchBillInfo(options = {}, maybeInputs = null) {
  let billerCode = null;
  let rawInputs = {};

  if (typeof options === 'string') {
    billerCode = options;
    rawInputs = maybeInputs || {};
  } else if (options && typeof options === 'object') {
    billerCode = options.billerCode;
    rawInputs = options.fieldInputs || options.inputs || options;
  }

  const biller = getBillerByCode(billerCode);
  if (!biller) {
    throw new Error('বিলার পাওয়া যায়নি: ' + billerCode);
  }

  const validation = validateBillerInputs(biller.billerCode, rawInputs);
  if (!validation.valid) {
    const err = new Error(validation.firstError || 'ইনপুট তথ্যে ত্রুটি রয়েছে।');
    err.validationErrors = validation.errors;
    throw err;
  }

  const accountNo = validation.normalizedInputs.account_no ||
                    validation.normalizedInputs.sms_account_no ||
                    rawInputs.accountNo ||
                    rawInputs.smsAccountNo ||
                    '';
  const meterNo = validation.normalizedInputs.meter_no || rawInputs.meterNo || null;
  const customerMobile = validation.normalizedInputs.customer_mobile || rawInputs.customerMobile || '';

  // Determine bill amounts in exact integer paisa
  const defaultPaisa = 125000; // ৳ 1,250.00
  const billAmountPaisa = options.billAmountPaisa !== undefined
    ? Math.max(0, Math.round(Number(options.billAmountPaisa)))
    : (options.amount !== undefined ? Math.round(Number(options.amount) * 100) : defaultPaisa);

  const surchargePaisa = options.surchargePaisa !== undefined
    ? Math.max(0, Math.round(Number(options.surchargePaisa)))
    : 0;

  const totalDuePaisa = billAmountPaisa + surchargePaisa;
  const feePaisa = calculateBillConvenienceFee(totalDuePaisa);
  const totalPayablePaisa = totalDuePaisa + feePaisa;

  const refId = options.refId || ('REF-INQ-' + Date.now() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase());
  const refNoAck = options.refNoAck || ('ACK-' + Date.now());

  const customerName = options.customerName || 'মোঃ রফিকুল ইসলাম';
  const billPeriod = options.billPeriod || 'October 2026';
  const billPeriodBn = options.billPeriodBn || 'অক্টোবর ২০২৬';
  const billStatus = options.billStatus || 'UNPAID';
  const dueDate = options.dueDate || '2026-11-25';

  return {
    success: true,
    billerCode: biller.billerCode,
    billerName: biller.billerName,
    billerNameBn: biller.billerNameBn,
    billerCategory: biller.billerCategory,
    billerCategoryBn: biller.billerCategoryBn,
    accountNo,
    meterNo,
    customerMobile,
    customerName,
    billPeriod,
    billPeriodBn,
    billStatus,
    dueDate,
    billAmountPaisa,
    billAmount: billAmountPaisa / 100,
    surchargePaisa,
    surcharge: surchargePaisa / 100,
    totalDuePaisa,
    totalDue: totalDuePaisa / 100,
    feePaisa,
    fee: feePaisa / 100,
    totalPayablePaisa,
    totalPayable: totalPayablePaisa / 100,
    refId,
    refNoAck,
    fieldInputs: validation.normalizedInputs,
    billerInfo: {
      customerName,
      accountNo,
      meterNo,
      billPeriod,
      dueDate,
      billAmount: billAmountPaisa / 100,
      surcharge: surchargePaisa / 100,
      totalDue: totalDuePaisa / 100,
      fee: feePaisa / 100,
      totalPayable: totalPayablePaisa / 100,
      billStatus,
    },
  };
}

// -------------------------------------------------------------
// 7. TRANSACTION ID GENERATION (TKBP-YYYYMMDD-XXXXXX)
// -------------------------------------------------------------
function generateBillPaymentTransactionId(date = new Date()) {
  const d = (date instanceof Date && !isNaN(date.getTime())) ? date : new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `TKBP-${yyyy}${mm}${dd}-${randomSuffix}`;
}

// -------------------------------------------------------------
// 8. BILL PAYMENT EXECUTION (executeBillPayment)
// -------------------------------------------------------------
async function executeBillPayment(options = {}, storageRepo = null) {
  if (!options || typeof options !== 'object') {
    throw new Error('পেমেন্ট তথ্যের অবজেক্ট আবশ্যক');
  }

  const walletNo = String(options.walletNo || options.fromWallet || '01700000000').replace(/[\s\-\+]/g, '');
  if (!isValidBangladeshiMobile(walletNo) && walletNo.length !== 11) {
    throw new Error('Invalid merchant wallet number');
  }

  const pin = options.pin !== undefined ? String(options.pin).trim() : '';
  if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    throw new Error('Invalid TallyPay 4-digit PIN');
  }

  // Active wallet PIN verification against repo
  if (storageRepo && storageRepo.currentStore && storageRepo.currentStore.appPin) {
    const configuredPin = String(storageRepo.currentStore.appPin).trim();
    if (configuredPin.length === 4 && pin !== configuredPin) {
      throw new Error('ভুল পিন প্রদান করা হয়েছে');
    }
  }

  const billerCode = options.billerCode;
  const biller = getBillerByCode(billerCode);
  if (!biller) {
    throw new Error('বিলার পাওয়া যায়নি: ' + billerCode);
  }

  const amountPaisa = options.amountPaisa !== undefined
    ? Math.max(0, Math.round(Number(options.amountPaisa)))
    : (options.amount !== undefined ? Math.round(Number(options.amount) * 100) : 0);

  if (amountPaisa <= 0) {
    throw new Error('Invalid bill amount');
  }

  const feePaisa = options.feePaisa !== undefined
    ? Math.max(0, Math.round(Number(options.feePaisa)))
    : calculateBillConvenienceFee(amountPaisa);

  const totalPayablePaisa = amountPaisa + feePaisa;

  const businessId = String(options.businessId || (storageRepo && storageRepo.currentStore && storageRepo.currentStore.activeBusinessId) || '1');

  // Validate wallet balance
  let availableBalancePaisa = 150000; // default mock 1,500 BDT
  if (options.walletBalancePaisa !== undefined) {
    availableBalancePaisa = Number(options.walletBalancePaisa);
  } else if (storageRepo && storageRepo.currentStore) {
    const storeBal = storageRepo.currentStore.walletBalance;
    if (storeBal !== undefined && storeBal !== null) {
      availableBalancePaisa = Math.round(Number(storeBal) * 100);
    }
  }

  if (availableBalancePaisa < totalPayablePaisa) {
    const err = new Error(`পর্যাপ্ত ওয়ালেট ব্যালেন্স নেই। প্রয়োজন: ৳${formatBengaliCurrency(totalPayablePaisa / 100)}, ব্যালেন্স: ৳${formatBengaliCurrency(availableBalancePaisa / 100)}`);
    err.code = 'INSUFFICIENT_WALLET_BALANCE';
    err.requiredPaisa = totalPayablePaisa;
    err.availablePaisa = availableBalancePaisa;
    throw err;
  }

  const transactionNumber = generateBillPaymentTransactionId();
  const now = new Date();
  const timestamp = now.toISOString();

  const accountNo = String(options.accountNo || options.smsAccountNo || options.fieldInputs?.account_no || options.fieldInputs?.sms_account_no || '');
  const meterNo = options.meterNo || options.fieldInputs?.meter_no || null;
  const customerName = options.customerName || 'গ্রাহক';
  const customerMobile = options.customerMobile || options.fieldInputs?.customer_mobile || '';
  const billPeriod = options.billPeriod || 'October 2026';
  const refId = options.refId || ('REF-' + Date.now());

  // 1. Digital Receipt Metadata (BillReceiptInfo)
  const receiptInfo = {
    transactionNumber,
    transactionId: transactionNumber,
    walletNo,
    billerCode: biller.billerCode,
    billerName: biller.billerName,
    billerNameBn: biller.billerNameBn,
    billerCategory: biller.billerCategory,
    accountNo,
    meterNo,
    customerName,
    customerMobile,
    billPeriod,
    billAmountPaisa: amountPaisa,
    billAmount: amountPaisa / 100,
    feePaisa: feePaisa,
    fee: feePaisa / 100,
    totalPaymentPaisa: totalPayablePaisa,
    totalPayment: totalPayablePaisa / 100,
    status: 'SUCCESS',
    timestamp,
    paymentDate: timestamp,
    paymentDateBn: formatBengaliDate(now),
    refId,
    businessId,
  };

  // 2. Printable PDF & Share Metadata (BillReceiptPDFData)
  const checksumSeed = `${transactionNumber}_${walletNo}_${totalPayablePaisa}_${biller.billerCode}`;
  const userToken = crypto.createHash('sha256').update(checksumSeed).digest('hex').substring(0, 16).toUpperCase();

  const receiptPDFData = {
    title: 'বিল রশিদ',
    transactionId: transactionNumber,
    billerName: biller.billerName,
    billerNameBn: biller.billerNameBn,
    billerCategory: biller.billerCategory,
    accountNo,
    meterNo: meterNo || '',
    customerName,
    customerMobile,
    billPeriod,
    billAmount: amountPaisa / 100,
    billAmountPaisa: amountPaisa,
    serviceCharge: feePaisa / 100,
    feePaisa,
    totalPayment: totalPayablePaisa / 100,
    totalPaymentPaisa: totalPayablePaisa,
    tallyPayAccount: maskWalletNumber(walletNo),
    paymentDate: timestamp,
    paymentDateBn: formatBengaliDate(now),
    status: 'সফল',
    userToken,
  };

  // 3. Normalized BillPaymentTransaction Record
  const transactionRecord = {
    id: transactionNumber,
    transactionNumber,
    txnNumber: transactionNumber,
    businessId,
    business_id: businessId,
    billerCode: biller.billerCode,
    billerName: biller.billerName,
    billerCategory: biller.billerCategory,
    accountNo,
    meterNo,
    customerName,
    customerMobile,
    billPeriod,
    amount: amountPaisa / 100,
    amountPaisa,
    fee: feePaisa / 100,
    feePaisa,
    totalPayment: totalPayablePaisa / 100,
    totalPaymentPaisa: totalPayablePaisa,
    fromWallet: walletNo,
    walletNo,
    toWallet: biller.billerWallet || biller.billerCode,
    invoiceNo: refId,
    refId,
    status: 'SUCCESS',
    txnTime: timestamp,
    timestamp,
    paymentDate: timestamp,
    receiptInfo,
    receiptPDFData,
    created_at: timestamp,
  };

  // Persist transaction & deduct wallet balance if storage repository is active
  if (storageRepo) {
    // Deduct wallet balance
    if (typeof storageRepo.mutateStore === 'function') {
      await storageRepo.mutateStore((prev) => {
        const currentBal = prev.walletBalance !== undefined ? prev.walletBalance : 1500;
        const newBal = Math.max(0, currentBal - (totalPayablePaisa / 100));
        return {
          ...prev,
          walletBalance: newBal,
        };
      });
    }

    // Persist transaction record
    if (typeof storageRepo.logBillPaymentTransaction === 'function') {
      await storageRepo.logBillPaymentTransaction(businessId, transactionRecord);
    }

    // Automatically save biller if requested
    if (options.shouldSaveBiller || options.saveForNext) {
      if (typeof storageRepo.saveBillerAccount === 'function') {
        await storageRepo.saveBillerAccount(businessId, {
          billerCode: biller.billerCode,
          accountNo,
          meterNo,
          nickName: options.nickName || customerName,
          customerMobile,
          billerCategory: biller.billerCategory,
        });
      }
    }
  }

  return {
    success: true,
    status: 'SUCCESS',
    transactionNumber,
    transaction: transactionRecord,
    receiptInfo,
    receiptPDFData,
    billAmountPaisa: amountPaisa,
    feePaisa,
    totalPaymentPaisa: totalPayablePaisa,
  };
}

// -------------------------------------------------------------
// 9. SAVED BILLER CRUD OPERATIONS
// -------------------------------------------------------------
async function saveBillerAccount(billerData = {}, storageRepo = null) {
  if (!billerData || typeof billerData !== 'object') {
    throw new Error('বিলার তথ্য আবশ্যক');
  }

  const businessId = String(billerData.businessId || (storageRepo && storageRepo.currentStore && storageRepo.currentStore.activeBusinessId) || '1');
  const billerCode = String(billerData.billerCode || '').trim();
  const biller = getBillerByCode(billerCode);
  if (!biller) {
    throw new Error('বিলার পাওয়া যায়নি: ' + billerCode);
  }

  const accountNo = String(billerData.accountNo || billerData.smsAccountNo || '').trim();
  if (!accountNo) {
    throw new Error('একাউন্ট নম্বর আবশ্যক');
  }

  const record = {
    id: billerData.id || `SAVED_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
    businessId,
    business_id: businessId,
    billerCode: biller.billerCode,
    billerName: biller.billerName,
    billerNameBn: biller.billerNameBn,
    billerCategory: biller.billerCategory,
    accountNo,
    meterNo: billerData.meterNo || null,
    nickName: billerData.nickName || billerData.customerName || biller.billerName,
    customerMobile: billerData.customerMobile || '',
    createdAt: billerData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (storageRepo && typeof storageRepo.saveBillerAccount === 'function') {
    return storageRepo.saveBillerAccount(businessId, record);
  }

  return { success: true, savedBiller: record };
}

function getSavedBillers(businessId = null, options = {}, storageRepo = null) {
  const targetBizId = String(businessId || (storageRepo && storageRepo.currentStore && storageRepo.currentStore.activeBusinessId) || '1');
  if (storageRepo && typeof storageRepo.getSavedBillers === 'function') {
    return storageRepo.getSavedBillers(targetBizId, options);
  }
  return [];
}

async function deleteSavedBiller(businessId, savedBillerId, storageRepo = null) {
  const targetBizId = String(businessId || (storageRepo && storageRepo.currentStore && storageRepo.currentStore.activeBusinessId) || '1');
  if (!savedBillerId) {
    throw new Error('Saved Biller ID is required');
  }

  if (storageRepo && typeof storageRepo.deleteSavedBiller === 'function') {
    return storageRepo.deleteSavedBiller(targetBizId, savedBillerId);
  }

  return { success: true, deletedId: savedBillerId };
}

// -------------------------------------------------------------
// 10. BILL RECEIPT HISTORY
// -------------------------------------------------------------
function getBillReceiptList(businessId = null, options = {}, storageRepo = null) {
  const targetBizId = String(businessId || (storageRepo && storageRepo.currentStore && storageRepo.currentStore.activeBusinessId) || '1');
  if (storageRepo && typeof storageRepo.getBillPaymentTransactions === 'function') {
    return storageRepo.getBillPaymentTransactions(targetBizId, options);
  }
  return [];
}

// -------------------------------------------------------------
// 11. UNIFIED BILL PAYMENT ENGINE CLASS
// -------------------------------------------------------------
class BillPaymentEngine {
  constructor(storageRepo = null) {
    this.storageRepo = storageRepo;
    this.savedBillers = new Map();
    this.receipts = [];
    this.supportedCategories = Object.values(BILLER_CATEGORIES);
  }

  getBillerCategories() {
    return getBillerCategories();
  }

  getBillerList(category = null) {
    return getBillerList(category);
  }

  getBillerByCode(code) {
    return getBillerByCode(code);
  }

  validateBillerField(field, value) {
    return validateBillerField(field, value);
  }

  validateBillerInputs(billerCode, inputs) {
    return validateBillerInputs(billerCode, inputs);
  }

  calculateServiceChargePaisa(amountPaisa) {
    return calculateBillConvenienceFee(amountPaisa);
  }

  calculateBillConvenienceFee(amountPaisa) {
    return calculateBillConvenienceFee(amountPaisa);
  }

  fetchBillInfo(options, maybeInputs = null) {
    return fetchBillInfo(options, maybeInputs);
  }

  async executeBillPayment(options) {
    return executeBillPayment(options, this.storageRepo);
  }

  // Pure-JS synchronous simulation method matching Gibbs reference architecture
  processBillPayment({ walletNo, pin, billerCode, accountNo, amountPaisa, saveForNext = false }) {
    if (!walletNo || String(walletNo).length !== 11) {
      throw new Error('Invalid merchant wallet number');
    }
    if (!pin || String(pin).length !== 4) {
      throw new Error('Invalid TallyPay 4-digit PIN');
    }
    const amt = Number(amountPaisa) || 0;
    if (amt <= 0) {
      throw new Error('Invalid bill amount');
    }

    const feePaisa = this.calculateServiceChargePaisa(amt);
    const totalPaymentPaisa = amt + feePaisa;
    const txnNumber = generateBillPaymentTransactionId();

    const receipt = {
      transactionNumber: txnNumber,
      walletNo,
      billerCode,
      accountNo,
      billAmountPaisa: amt,
      feePaisa,
      totalPaymentPaisa,
      status: 'SUCCESS',
      timestamp: new Date().toISOString(),
    };

    this.receipts.push(receipt);

    if (saveForNext) {
      const billerKey = billerCode + '_' + accountNo;
      this.savedBillers.set(billerKey, {
        id: 'SAVED_' + Date.now(),
        billerCode,
        accountNo,
        createdAt: new Date().toISOString(),
      });
    }

    return receipt;
  }
}

const billPaymentEngine = new BillPaymentEngine();

// -------------------------------------------------------------
// MODULE EXPORTS
// -------------------------------------------------------------
module.exports = {
  // Constants & Enums
  BILLER_CATEGORIES,
  BILL_PAYMENT_INPUT_DATA_TYPES,
  BILL_PAYMENT_INPUT_UI_TYPES,
  BILL_PAYMENT_LABEL_KEYWORDS,
  BENGALI_ARSC_TOKENS,
  BILLER_PROVIDERS,
  BILLER_ALIASES,

  // Numerals & Formatters
  toBengaliNumerals,
  formatBengaliCurrency,
  formatBengaliDate,
  isValidBangladeshiMobile,
  maskWalletNumber,

  // Registry & Validation
  getBillerCategories,
  getBillerList,
  getBillerByCode,
  validateBillerField,
  validateBillerInputs,

  // Fees & Inquiry
  calculateBillConvenienceFee,
  calculateUtilityBillFeePaisa,
  calculateServiceChargePaisa,
  fetchBillInfo,
  generateBillPaymentTransactionId,

  // Payment & Receipts
  executeBillPayment,
  getBillReceiptList,

  // Saved Billers
  saveBillerAccount,
  getSavedBillers,
  deleteSavedBiller,

  // Engine Class & Instance
  BillPaymentEngine,
  billPaymentEngine,
};
