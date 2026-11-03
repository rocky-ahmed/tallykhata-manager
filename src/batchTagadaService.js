/**
 * @file batchTagadaService.js
 * @description Clean-room Customer Debt Reminders & Automated SMS Tagada Batch Dispatch Subsystem
 * Reference: REF-001 (TallyKhata-Demo.apk) classes4.dex, BulkTagadaViewModel, resources.arsc, tagada_log
 * Milestone: REA-ITER-225
 */

'use strict';

// 1. Channel Types & Dispatch Modes
const TAGADA_CHANNELS = Object.freeze({
  FREE_SMS: 'TAGADA_BY_FREE_SMS',
  SMS: 'TAGADA_BY_SMS',
  SHARE: 'TAGADA_BY_SHARE',
});

const DISPATCH_MODES = Object.freeze({
  BULK_TAGADA: 'BULK_TAGADA',
  GROUP_TAGADA: 'GROUP_TAGADA',
});

const DEBT_AGING_TIERS = Object.freeze({
  TIER_0_15: '0_15_DAYS',
  TIER_16_30: '16_30_DAYS',
  TIER_31_60: '31_60_DAYS',
  TIER_60_PLUS: '60_PLUS_DAYS',
});

const TELECOM_LIMITS = Object.freeze({
  UCS2_SINGLE: 70,
  UCS2_MULTIPART: 67,
  GSM7_SINGLE: 160,
  GSM7_MULTIPART: 153,
});

// Authentic ARSC Bengali String Tokens from reference APK resources.arsc
const BENGALI_ARSC_TOKENS = Object.freeze({
  GROUP_TAGADA: 'গ্রুপ তাগাদা',
  SEND_GROUP_TAGADA: 'গ্রুপ তাগাদা পাঠাই',
  BATCH_SAVINGS_COPY: 'একসাথে অনেককে তাগাদা পাঠানো যায়, সময় বাঁচে।',
  SELECT_MULTIPLE_PROMPT: 'একাধিক কাস্টমার কে একসাথে সিলেক্ট করে গ্রুপ তাগাদা পাঠান।',
  ADD_PHONE_PROMPT: 'গ্রুপ তাগাদা পাঠাতে ফোন নম্বর যোগ করুন।',
  VIA_TALLY_MESSAGE: 'টালি-মেসেজ-এর মাধ্যমে তাগাদা-টি পাঠানো হবে।',
  TAGADA: 'তাগাদা',
  SEND_TAGADA: 'তাগাদা পাঠাই',
  TAGADA_NOT_SENT: 'তাগাদা পাঠানো হয়নি',
  COLLECT_BY_TAGADA: 'তাগাদা পাঠিয়ে কালেকশন করুন।',
  TAGADA_MESSAGE: 'তাগাদা মেসেজ',
  BUY_TAGADA_MESSAGE: 'তাগাদা মেসেজ কিনুন',
  SEND_TAGADA_MESSAGE: 'তাগাদা মেসেজ পাঠাই',
  SELECT_TO_SEND: 'তাগাদা মেসেজ পাঠাতে সিলেক্ট করুন',
  SENDING_IN_PROGRESS: 'তাগাদা মেসেজ পাঠানো হচ্ছে',
  SEND_COMPLETED: 'তাগাদা মেসেজ পাঠানো হয়েছে।',
  NO_FREE_SMS_LEFT: 'তাগাদার জন্য ফ্রি এসএমএস অবশিষ্ট নেই।',
  VIA_FREE_SMS: 'ফ্রি এসএমএস - এর মাধ্যমে তাগাদা মেসেজটি পাঠানো হবে।',
  GOLD_UPGRADE_PROMPT: 'সব কাস্টমারকে একসাথে গ্রুপ তাগাদা পাঠাতে টালিখাতা গোল্ড নিন',
  SELECT_PACK: 'টালি-মেসেজ প্যাক সিলেক্ট করি',
  SIM_FALLBACK_NOTICE: 'তাগাদা মেসেজ পাঠাতে আপনার ফোনের মেসেজ অপশন ব্যবহার করা হবে।',
  LAST_TAGADA: 'সর্বশেষ তাগাদা %1$s',
  SMS_TEMPLATE: 'প্রিয় গ্রাহক,\n %1$s পর্যন্ত আপনার মোট বাকি %2$s টাকা। অনুগ্রহ করে আপনার বাকি পরিশোধ করুন।\n বিস্তারিত জানতে ট্যাপ করুন',
});

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const BENGALI_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

/**
 * Converts ASCII numbers to localized Bengali numerals.
 */
function toBengaliNumerals(val) {
  if (val === null || val === undefined) return '';
  return String(val).replace(/\d/g, (d) => BENGALI_DIGITS[Number(d)]);
}

/**
 * Formats a currency amount with comma grouping and Bengali numerals.
 */
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

  // Fallback with South Asian grouping (12,34,567.89)
  const parts = num.toFixed(maxFrac).split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];

  let lastThree = integerPart.slice(-3);
  const otherNumbers = integerPart.slice(0, -3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const grouped = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  const withDec = decimalPart !== undefined ? `${grouped}.${decimalPart}` : grouped;
  return toBengaliNumerals(withDec);
}

/**
 * Formats date into authentic Bengali representation (e.g. "০৪ নভেম্বর ২০২৬").
 */
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

/**
 * Validates Bangladeshi mobile phone numbers (+8801[3-9]xxxxxxxx or 01[3-9]xxxxxxxx).
 */
function isValidBangladeshiMobile(mobile) {
  if (!mobile) return false;
  const cleaned = String(mobile).replace(/[\s\-\(\)]/g, '');
  return /^(\+?8801|01)[3-9]\d{8}$/.test(cleaned);
}

/**
 * Calculates telecom SMS segment counts (GSM 7-bit vs UCS-2 Unicode).
 */
function calculateSmsSegments(text) {
  if (typeof text !== 'string') text = String(text || '');
  const isUnicode = /[^\u0000-\u007F]/.test(text);
  const charCount = text.length;

  if (isUnicode) {
    // Bengali characters require UCS-2 encoding: 70 chars for single SMS, 67 per segment if multi-part
    if (charCount <= TELECOM_LIMITS.UCS2_SINGLE) {
      return { encoding: 'UCS-2', charCount, segments: 1 };
    }
    return {
      encoding: 'UCS-2',
      charCount,
      segments: Math.ceil(charCount / TELECOM_LIMITS.UCS2_MULTIPART)
    };
  } else {
    // GSM 7-bit: 160 chars for single SMS, 153 per segment if multi-part
    if (charCount <= TELECOM_LIMITS.GSM7_SINGLE) {
      return { encoding: 'GSM-7', charCount, segments: 1 };
    }
    return {
      encoding: 'GSM-7',
      charCount,
      segments: Math.ceil(charCount / TELECOM_LIMITS.GSM7_MULTIPART)
    };
  }
}

/**
 * Generates personalized Bengali SMS reminder message.
 */
function generateSmsContent(
  customerName = '',
  bakiAmountBdt = 0,
  asOfDate = '০৪ নভেম্বর ২০২৬',
  accountToken = 'T-9871',
  options = {}
) {
  const baseUrl = options.tagadaBaseUrl || 'https://tallypay.com/baki';
  const formattedAmount = formatBengaliCurrency(bakiAmountBdt);
  const link = `${baseUrl}/${accountToken || 'TK'}`;

  return `প্রিয় গ্রাহক,\n ${asOfDate} পর্যন্ত আপনার মোট বাকি ৳${formattedAmount} টাকা। অনুগ্রহ করে আপনার বাকি পরিশোধ করুন।\n বিস্তারিত জানতে ট্যাপ করুন ${link}`;
}

/**
 * Batch customer selection & debt aggregation with 0.00 float drift.
 */
function evaluateBatchSelection(customers = [], selectedAccountIds = [], options = {}) {
  const selectedSet = new Set(
    selectedAccountIds.map((id) => (id !== null && id !== undefined ? String(id) : ''))
  );
  let totalEligibleCount = 0;
  let selectedCount = 0;
  let totalDuePaisa = 0;
  let selectedDuePaisa = 0;
  const validRecipients = [];
  const missingPhoneCustomers = [];

  customers.forEach((cust) => {
    if (!cust) return;
    // Normalized integer paisa
    const balPaisa = cust.balancePaisa !== undefined && cust.balancePaisa !== null
      ? Math.round(Number(cust.balancePaisa))
      : Math.round(Number(cust.balance || 0) * 100);

    // Only active debtors with positive balance owe money
    if (balPaisa > 0) {
      totalEligibleCount++;
      totalDuePaisa += balPaisa;

      const custIdStr = String(cust.id !== undefined && cust.id !== null ? cust.id : (cust.accountId || ''));
      if (selectedSet.has(custIdStr) || selectedSet.has(cust.id)) {
        selectedCount++;
        selectedDuePaisa += balPaisa;

        const normalizedCust = { ...cust, balancePaisa: balPaisa };
        const rawPhone = cust.mobile || cust.phone || '';
        if (isValidBangladeshiMobile(rawPhone)) {
          validRecipients.push(normalizedCust);
        } else {
          missingPhoneCustomers.push(normalizedCust);
        }
      }
    }
  });

  return {
    totalEligibleCount,
    selectedCount,
    totalDuePaisa,
    totalDueBdt: totalDuePaisa / 100,
    selectedDuePaisa,
    selectedDueBdt: selectedDuePaisa / 100,
    validRecipients,
    missingPhoneCustomers,
    isAllSelected: totalEligibleCount > 0 && selectedCount === totalEligibleCount
  };
}

/**
 * Categorizes customer debt accounts into aging tiers.
 */
function categorizeDebtAging(customers = [], asOfDate = new Date()) {
  const asOfMs = (asOfDate instanceof Date ? asOfDate : new Date(asOfDate)).getTime();

  const tiers = {
    [DEBT_AGING_TIERS.TIER_0_15]: { count: 0, totalPaisa: 0, customers: [] },
    [DEBT_AGING_TIERS.TIER_16_30]: { count: 0, totalPaisa: 0, customers: [] },
    [DEBT_AGING_TIERS.TIER_31_60]: { count: 0, totalPaisa: 0, customers: [] },
    [DEBT_AGING_TIERS.TIER_60_PLUS]: { count: 0, totalPaisa: 0, customers: [] },
  };

  customers.forEach((cust) => {
    if (!cust) return;
    const balPaisa = cust.balancePaisa !== undefined && cust.balancePaisa !== null
      ? Math.round(Number(cust.balancePaisa))
      : Math.round(Number(cust.balance || 0) * 100);

    if (balPaisa <= 0) return;

    const dateStr = cust.lastTxnDate || cust.lastDate || cust.lastTagadaDate || cust.createDate || cust.create_date || cust.createdAt;
    let daysDiff = 0;
    if (dateStr) {
      const dMs = new Date(dateStr).getTime();
      if (!isNaN(dMs)) {
        daysDiff = Math.max(0, Math.floor((asOfMs - dMs) / (1000 * 60 * 60 * 24)));
      }
    }

    const item = { ...cust, balancePaisa: balPaisa, daysOverdue: daysDiff };

    if (daysDiff <= 15) {
      tiers[DEBT_AGING_TIERS.TIER_0_15].count++;
      tiers[DEBT_AGING_TIERS.TIER_0_15].totalPaisa += balPaisa;
      tiers[DEBT_AGING_TIERS.TIER_0_15].customers.push(item);
    } else if (daysDiff <= 30) {
      tiers[DEBT_AGING_TIERS.TIER_16_30].count++;
      tiers[DEBT_AGING_TIERS.TIER_16_30].totalPaisa += balPaisa;
      tiers[DEBT_AGING_TIERS.TIER_16_30].customers.push(item);
    } else if (daysDiff <= 60) {
      tiers[DEBT_AGING_TIERS.TIER_31_60].count++;
      tiers[DEBT_AGING_TIERS.TIER_31_60].totalPaisa += balPaisa;
      tiers[DEBT_AGING_TIERS.TIER_31_60].customers.push(item);
    } else {
      tiers[DEBT_AGING_TIERS.TIER_60_PLUS].count++;
      tiers[DEBT_AGING_TIERS.TIER_60_PLUS].totalPaisa += balPaisa;
      tiers[DEBT_AGING_TIERS.TIER_60_PLUS].customers.push(item);
    }
  });

  return tiers;
}

/**
 * Sorts debtors by priority scheduling criteria.
 */
function sortDebtorsByPriority(debtors = [], criteria = 'balance_desc') {
  const copy = [...debtors];
  const getPaisa = (c) => (c.balancePaisa !== undefined ? Number(c.balancePaisa) : Math.round(Number(c.balance || 0) * 100));

  copy.sort((a, b) => {
    if (criteria === 'balance_desc') {
      return getPaisa(b) - getPaisa(a);
    }
    if (criteria === 'balance_asc') {
      return getPaisa(a) - getPaisa(b);
    }
    if (criteria === 'aging_desc') {
      const aDate = new Date(a.lastTxnDate || a.lastDate || a.createdAt || 0).getTime();
      const bDate = new Date(b.lastTxnDate || b.lastDate || b.createdAt || 0).getTime();
      return aDate - bDate; // Older date comes first
    }
    if (criteria === 'last_tagada_asc') {
      const aTagada = a.lastTagadaDate ? new Date(a.lastTagadaDate).getTime() : 0;
      const bTagada = b.lastTagadaDate ? new Date(b.lastTagadaDate).getTime() : 0;
      return aTagada - bTagada; // Never sent (0) or oldest first
    }
    if (criteria === 'name_asc') {
      return String(a.name || '').localeCompare(String(b.name || ''), 'bn');
    }
    return 0;
  });

  return copy;
}

/**
 * Clean Architecture Batch Tagada Dispatch Engine.
 */
class TagadaBatchDispatchEngine {
  constructor(
    merchantName = 'মেসার্স ভাই ভাই এন্টারপ্রাইজ',
    tagadaBaseUrl = 'https://tallypay.com/baki'
  ) {
    this.merchantName = merchantName;
    this.tagadaBaseUrl = tagadaBaseUrl;
    this.tagadaLogTable = [];
    this.nextLogId = 1;
  }

  generateSmsContent(
    customerName,
    bakiAmountBdt,
    asOfDate = '০৪ নভেম্বর ২০২৬',
    accountToken = 'T-9871',
    options = {}
  ) {
    return generateSmsContent(customerName, bakiAmountBdt, asOfDate, accountToken, {
      tagadaBaseUrl: this.tagadaBaseUrl,
      ...options
    });
  }

  calculateSmsSegments(text) {
    return calculateSmsSegments(text);
  }

  evaluateBatchSelection(customers, selectedAccountIds, options = {}) {
    return evaluateBatchSelection(customers, selectedAccountIds, options);
  }

  categorizeDebtAging(customers, asOfDate = new Date()) {
    return categorizeDebtAging(customers, asOfDate);
  }

  sortDebtorsByPriority(debtors, criteria = 'balance_desc') {
    return sortDebtorsByPriority(debtors, criteria);
  }

  executeBatchDispatch(
    recipients,
    quotaState,
    dispatchDate = '2026-11-04 14:30:00',
    options = {}
  ) {
    let availableFree = Number(quotaState.freeSmsCount !== undefined ? quotaState.freeSmsCount : (quotaState.remainingSmsCount || 0));
    let availablePurchased = Number(quotaState.purchasedSmsCount !== undefined ? quotaState.purchasedSmsCount : (quotaState.tallyMessageBalance || 0));
    const dispatchResults = [];
    const businessId = options.businessId || '1';

    recipients.forEach((cust) => {
      let allocatedType = null;
      if (availableFree > 0) {
        allocatedType = TAGADA_CHANNELS.FREE_SMS;
        availableFree--;
      } else if (availablePurchased > 0) {
        allocatedType = TAGADA_CHANNELS.SMS;
        availablePurchased--;
      } else {
        allocatedType = TAGADA_CHANNELS.SHARE; // Fallback to external share / device SMS
      }

      const balPaisa = cust.balancePaisa !== undefined
        ? Number(cust.balancePaisa)
        : Math.round(Number(cust.balance || 0) * 100);
      const amountBdt = balPaisa / 100;
      const accountId = cust.id !== undefined && cust.id !== null ? cust.id : (cust.accountId || 0);

      const logEntry = {
        id: this.nextLogId++,
        account_id: accountId,
        accountId: String(accountId),
        tagada_type: allocatedType,
        tagadaType: allocatedType,
        credit_amount: amountBdt,
        creditAmount: amountBdt,
        synced: 0,
        create_date: dispatchDate,
        createDate: dispatchDate,
        business_id: businessId,
        businessId: String(businessId)
      };
      this.tagadaLogTable.push(logEntry);

      dispatchResults.push({
        accountId,
        mobile: cust.mobile || cust.phone || '',
        allocatedType,
        amountBdt,
        logId: logEntry.id,
        status: 'DISPATCHED'
      });
    });

    return {
      dispatchedCount: dispatchResults.length,
      remainingFreeQuota: availableFree,
      remainingPurchasedQuota: availablePurchased,
      dispatchResults,
      updatedQuotaState: {
        freeSmsCount: availableFree,
        purchasedSmsCount: availablePurchased,
        remainingSmsCount: availableFree,
        tallyMessageBalance: availablePurchased,
      }
    };
  }
}

const batchTagadaEngine = new TagadaBatchDispatchEngine();

module.exports = {
  TAGADA_CHANNELS,
  DISPATCH_MODES,
  DEBT_AGING_TIERS,
  TELECOM_LIMITS,
  BENGALI_ARSC_TOKENS,
  toBengaliNumerals,
  formatBengaliCurrency,
  formatBengaliDate,
  isValidBangladeshiMobile,
  calculateSmsSegments,
  generateSmsContent,
  evaluateBatchSelection,
  categorizeDebtAging,
  sortDebtorsByPriority,
  TagadaBatchDispatchEngine,
  batchTagadaEngine
};
