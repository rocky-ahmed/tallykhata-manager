/**
 * src/digitalAnalyticsService.js
 *
 * Clean-Room Merchant Dashboard Analytics & Digital Inflow Aggregation Engine
 * Real-Time Payment Inflow Statistics, Channel Share & Velocity Analysis
 *
 * Milestone: REA-ITER-224
 * Author: Worker 2 (Averroes - Principal Backend Developer & Business Logic)
 * Verified against: REF-001 (TallyKhata-Demo.apk)
 */

// -------------------------------------------------------------
// CONSTANTS & ENUMS
// -------------------------------------------------------------
const PERIOD_TYPES = Object.freeze({
  TODAY: 'TODAY',
  THIS_WEEK: 'THIS_WEEK',
  THIS_MONTH: 'THIS_MONTH',
  ALL_TIME: 'ALL_TIME',
  CUSTOM: 'CUSTOM',
});

const PERIOD_LABELS_BN = Object.freeze({
  TODAY: 'আজকে',
  THIS_WEEK: 'এই সপ্তাহে',
  THIS_MONTH: 'এই মাসে',
  ALL_TIME: 'সব সময়',
  CUSTOM: 'নির্দিষ্ট তারিখ',
});

const PERIOD_LABELS_EN = Object.freeze({
  TODAY: 'Today',
  THIS_WEEK: 'This Week',
  THIS_MONTH: 'This Month',
  ALL_TIME: 'All Time',
  CUSTOM: 'Custom Date',
});

const SUPPORTED_CHANNELS = Object.freeze({
  bkash: Object.freeze({
    id: 'bkash',
    nameBn: 'বিকাশ',
    nameEn: 'bKash',
    color: '#D12053',
    icon: 'bkash',
  }),
  nagad: Object.freeze({
    id: 'nagad',
    nameBn: 'নগদ',
    nameEn: 'Nagad',
    color: '#F7941D',
    icon: 'nagad',
  }),
  rocket: Object.freeze({
    id: 'rocket',
    nameBn: 'রকেট',
    nameEn: 'Rocket',
    color: '#8C3494',
    icon: 'rocket',
  }),
  upay: Object.freeze({
    id: 'upay',
    nameBn: 'উপায়',
    nameEn: 'Upay',
    color: '#0066B3',
    icon: 'upay',
  }),
  bangla_qr: Object.freeze({
    id: 'bangla_qr',
    nameBn: 'বাংলা কিউআর',
    nameEn: 'Bangla QR',
    color: '#00843D',
    icon: 'bangla_qr',
  }),
  card: Object.freeze({
    id: 'card',
    nameBn: 'কার্ড',
    nameEn: 'Card',
    color: '#1A1F71',
    icon: 'card',
  }),
});

const ASCII_TO_BENGALI_DIGITS = Object.freeze({
  '0': '০',
  '1': '১',
  '2': '২',
  '3': '৩',
  '4': '৪',
  '5': '৫',
  '6': '৬',
  '7': '৭',
  '8': '৮',
  '9': '৯',
});

const BENGALI_DAY_NAMES = Object.freeze({
  0: 'রবি',
  1: 'সোম',
  2: 'মঙ্গল',
  3: 'বুধ',
  4: 'বৃহঃ',
  5: 'শুক্র',
  6: 'শনি',
});

// -------------------------------------------------------------
// BENGALI NUMERAL & CURRENCY FORMATTERS
// -------------------------------------------------------------
function toBengaliNumeral(num) {
  if (num === null || num === undefined) return '';
  return String(num).replace(/[0-9]/g, (ch) => ASCII_TO_BENGALI_DIGITS[ch] || ch);
}

function formatCurrencyBn(takaAmount, symbol = '৳') {
  if (takaAmount === null || takaAmount === undefined || isNaN(takaAmount)) {
    return symbol ? `${symbol} ০.০০` : '০.০০';
  }
  const isNegative = takaAmount < 0;
  const absVal = Math.abs(takaAmount);
  const formattedEn = absVal.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const formattedBn = toBengaliNumeral(formattedEn);
  const prefix = isNegative ? '-' : '';
  return symbol ? `${prefix}${symbol} ${formattedBn}` : `${prefix}${formattedBn}`;
}

function formatCurrencyEn(takaAmount, symbol = '৳') {
  if (takaAmount === null || takaAmount === undefined || isNaN(takaAmount)) {
    return symbol ? `${symbol} 0.00` : '0.00';
  }
  const isNegative = takaAmount < 0;
  const absVal = Math.abs(takaAmount);
  const formattedEn = absVal.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const prefix = isNegative ? '-' : '';
  return symbol ? `${prefix}${symbol} ${formattedEn}` : `${prefix}${formattedEn}`;
}

// -------------------------------------------------------------
// DATE & TIMESTAMP UTILITIES
// -------------------------------------------------------------
function formatIsoDate(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function extractRecordTimestamp(record) {
  if (!record || typeof record !== 'object') return 0;
  const candidateFields = [
    'timestamp',
    'createdAt',
    'created_at',
    'txn_date',
    'date',
    'updatedAt',
    'updated_at',
    'time',
  ];
  for (const field of candidateFields) {
    const val = record[field];
    if (val !== undefined && val !== null && val !== '') {
      if (typeof val === 'number' && !isNaN(val)) return val;
      const parsed = Date.parse(val);
      if (!isNaN(parsed)) return parsed;
    }
  }
  return 0;
}

function extractRecordIsoDate(record) {
  if (!record || typeof record !== 'object') return '';
  if (record.date && typeof record.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(record.date.trim())) {
    return record.date.trim();
  }
  if (record.txn_date && typeof record.txn_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(record.txn_date.trim())) {
    return record.txn_date.trim();
  }
  const ts = extractRecordTimestamp(record);
  if (ts > 0) {
    return formatIsoDate(new Date(ts));
  }
  return '';
}

function filterTransactionsByDateRange(transactions = [], startDate = null, endDate = null) {
  if (!Array.isArray(transactions)) return [];
  if (!startDate && !endDate) return [...transactions];

  const startIso = startDate ? (startDate.includes('T') ? formatIsoDate(startDate) : startDate.trim().slice(0, 10)) : null;
  const endIso = endDate ? (endDate.includes('T') ? formatIsoDate(endDate) : endDate.trim().slice(0, 10)) : null;

  return transactions.filter((tx) => {
    if (!tx) return false;
    const txDateIso = extractRecordIsoDate(tx);
    if (!txDateIso) return true;

    if (startIso && txDateIso < startIso) return false;
    if (endIso && txDateIso > endIso) return false;
    return true;
  });
}

function resolveAnalyticsDateRange(periodType = 'TODAY', options = {}, referenceDate = new Date()) {
  const refDate = referenceDate instanceof Date && !isNaN(referenceDate.getTime())
    ? referenceDate
    : (referenceDate ? new Date(referenceDate) : new Date());

  let normPeriod = String(periodType || 'TODAY').toUpperCase().replace(/[-\s]/g, '_');
  if (!PERIOD_TYPES[normPeriod]) {
    normPeriod = PERIOD_TYPES.TODAY;
  }

  // Support explicit overrides in options
  if (options.startDate || options.start || options.from) {
    normPeriod = PERIOD_TYPES.CUSTOM;
  }

  const todayStr = formatIsoDate(refDate);

  if (normPeriod === PERIOD_TYPES.TODAY) {
    const yesterday = new Date(refDate);
    yesterday.setDate(refDate.getDate() - 1);
    const yesterdayStr = formatIsoDate(yesterday);
    return {
      periodKey: PERIOD_TYPES.TODAY,
      periodLabelBn: PERIOD_LABELS_BN.TODAY,
      periodLabelEn: PERIOD_LABELS_EN.TODAY,
      startDate: todayStr,
      endDate: todayStr,
      priorStartDate: yesterdayStr,
      priorEndDate: yesterdayStr,
    };
  }

  if (normPeriod === PERIOD_TYPES.THIS_WEEK) {
    // 7-day period ending today
    const weekStart = new Date(refDate);
    weekStart.setDate(refDate.getDate() - 6);
    const weekStartStr = formatIsoDate(weekStart);

    const priorWeekEnd = new Date(weekStart);
    priorWeekEnd.setDate(weekStart.getDate() - 1);
    const priorWeekStart = new Date(priorWeekEnd);
    priorWeekStart.setDate(priorWeekEnd.getDate() - 6);

    return {
      periodKey: PERIOD_TYPES.THIS_WEEK,
      periodLabelBn: PERIOD_LABELS_BN.THIS_WEEK,
      periodLabelEn: PERIOD_LABELS_EN.THIS_WEEK,
      startDate: weekStartStr,
      endDate: todayStr,
      priorStartDate: formatIsoDate(priorWeekStart),
      priorEndDate: formatIsoDate(priorWeekEnd),
    };
  }

  if (normPeriod === PERIOD_TYPES.THIS_MONTH) {
    const y = refDate.getFullYear();
    const m = refDate.getMonth();
    const monthStart = new Date(y, m, 1);
    const monthEnd = new Date(y, m + 1, 0);

    const priorMonthStart = new Date(y, m - 1, 1);
    const priorMonthEnd = new Date(y, m, 0);

    return {
      periodKey: PERIOD_TYPES.THIS_MONTH,
      periodLabelBn: PERIOD_LABELS_BN.THIS_MONTH,
      periodLabelEn: PERIOD_LABELS_EN.THIS_MONTH,
      startDate: formatIsoDate(monthStart),
      endDate: formatIsoDate(monthEnd),
      priorStartDate: formatIsoDate(priorMonthStart),
      priorEndDate: formatIsoDate(priorMonthEnd),
    };
  }

  if (normPeriod === PERIOD_TYPES.ALL_TIME) {
    return {
      periodKey: PERIOD_TYPES.ALL_TIME,
      periodLabelBn: PERIOD_LABELS_BN.ALL_TIME,
      periodLabelEn: PERIOD_LABELS_EN.ALL_TIME,
      startDate: null,
      endDate: null,
      priorStartDate: null,
      priorEndDate: null,
    };
  }

  // CUSTOM RANGE
  const rawStart = options.startDate || options.start || options.from || todayStr;
  const rawEnd = options.endDate || options.end || options.to || todayStr;
  const startStr = formatIsoDate(rawStart);
  const endStr = formatIsoDate(rawEnd);

  const dStart = new Date(startStr);
  const dEnd = new Date(endStr);
  const diffTime = Math.max(0, dEnd.getTime() - dStart.getTime());
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const priorEnd = new Date(dStart);
  priorEnd.setDate(dStart.getDate() - 1);
  const priorStart = new Date(priorEnd);
  priorStart.setDate(priorEnd.getDate() - (diffDays - 1));

  return {
    periodKey: PERIOD_TYPES.CUSTOM,
    periodLabelBn: PERIOD_LABELS_BN.CUSTOM,
    periodLabelEn: PERIOD_LABELS_EN.CUSTOM,
    startDate: startStr,
    endDate: endStr,
    priorStartDate: formatIsoDate(priorStart),
    priorEndDate: formatIsoDate(priorEnd),
  };
}

// -------------------------------------------------------------
// CHANNEL RESOLVER & NORMALIZATION
// -------------------------------------------------------------
function resolveChannelId(rawChannel) {
  if (!rawChannel || typeof rawChannel !== 'string') return 'bangla_qr';
  const clean = rawChannel.toLowerCase().trim().replace(/[-\s]/g, '_');

  if (clean === 'bkash') return 'bkash';
  if (clean === 'nagad') return 'nagad';
  if (clean === 'rocket' || clean === 'dbbl') return 'rocket';
  if (clean === 'upay') return 'upay';
  if (clean === 'card' || clean === 'visa' || clean === 'mastercard' || clean === 'amex') return 'card';
  if (clean === 'bangla_qr' || clean === 'cellfin' || clean === 'qr' || clean === 'bqr') return 'bangla_qr';

  return 'bangla_qr';
}

// -------------------------------------------------------------
// CORE ANALYTICS CALCULATION ENGINE
// -------------------------------------------------------------
/**
 * Calculates digital inflow analytics across transactions with integer-paisa precision.
 * Guarantees zero floating-point drift and exact 100.00% channel distribution via Largest-Remainder Method.
 *
 * @param {Array<object>} transactions - Raw digital transactions
 * @param {object} [options={}] - Analytics query options
 * @returns {object} Comprehensive Inflow Summary & Analytics
 */
function calculateDigitalInflowAnalytics(transactions = [], options = {}) {
  const txList = Array.isArray(transactions) ? transactions : [];

  // 1. Resolve date range and period parameters
  const resolved = resolveAnalyticsDateRange(
    options.period || options.periodKey || 'TODAY',
    options,
    options.referenceDate || new Date()
  );

  const periodKey = resolved.periodKey;
  const periodLabelBn = options.periodLabelBn || resolved.periodLabelBn;
  const periodLabelEn = options.periodLabelEn || resolved.periodLabelEn;
  const startDate = options.startDate ? formatIsoDate(options.startDate) : resolved.startDate;
  const endDate = options.endDate ? formatIsoDate(options.endDate) : resolved.endDate;
  const targetBizId = options.businessId !== undefined && options.businessId !== null
    ? String(options.businessId)
    : null;

  // 2. Filter transactions by businessId, date range, status, and credit type
  const inRangeTxns = filterTransactionsByDateRange(txList, startDate, endDate);

  let grossInflowPaisa = 0;
  let netInflowPaisa = 0;
  let totalTxnCount = 0;

  // Initialize channel counters
  const channelMap = {};
  for (const [key, meta] of Object.entries(SUPPORTED_CHANNELS)) {
    channelMap[key] = {
      channelId: meta.id,
      channelNameBn: meta.nameBn,
      channelNameEn: meta.nameEn,
      color: meta.color,
      icon: meta.icon,
      amountPaisa: 0,
      totalAmountPaisa: 0,
      amountTaka: 0,
      txnCount: 0,
      percentage: 0.00,
      percentageShare: 0.00,
      basisPoints: 0,
    };
  }

  // Initialize timeseries structures
  // Hourly buckets for TODAY (00:00 to 23:00)
  const isHourly = periodKey === PERIOD_TYPES.TODAY;
  const hourlyBuckets = [];
  if (isHourly) {
    for (let h = 0; h < 24; h++) {
      const hStr = String(h).padStart(2, '0');
      hourlyBuckets.push({
        hour: h,
        hourLabel: `${hStr}:00`,
        hourLabelBn: toBengaliNumeral(`${hStr}:০০`),
        amountPaisa: 0,
        amountTaka: 0,
        txnCount: 0,
      });
    }
  }

  // Daily map for multi-day periods
  const dailyMap = {};

  for (const txn of inRangeTxns) {
    if (!txn || typeof txn !== 'object') continue;

    // Multi-tenant business isolation check
    if (targetBizId) {
      const txBiz = String(txn.businessId || txn.business_id || '1');
      if (txBiz !== targetBizId) continue;
    }

    // Status filter: ignore failed, cancelled, or reversed transactions
    const rawStatus = String(txn.status || 'SUCCESS').toUpperCase();
    if (rawStatus === 'FAILED' || rawStatus === 'CANCELLED' || rawStatus === 'REVERSED' || rawStatus === 'FAIL') {
      continue;
    }

    // Inflow type filter: must be inward credit / deposit
    const rawType = String(txn.type || txn.txn_type || 'CREDIT').toUpperCase();
    if (rawType === 'DEBIT' && txn.direction === 'out' && !txn.isCredit) {
      continue;
    }

    // Extract exact integer paisa amounts
    let paisa = 0;
    if (txn.amountPaisa !== undefined && txn.amountPaisa !== null) {
      paisa = Math.round(Number(txn.amountPaisa));
    } else {
      const numTaka = Number(txn.amount !== undefined && txn.amount !== null ? txn.amount : (txn.amount_received || 0));
      paisa = Math.round(numTaka * 100);
    }

    if (isNaN(paisa) || paisa <= 0) continue;

    let feePaisa = 0;
    if (txn.feePaisa !== undefined && txn.feePaisa !== null) {
      feePaisa = Math.round(Number(txn.feePaisa));
    } else if (txn.fee !== undefined && txn.fee !== null) {
      feePaisa = Math.round(Number(txn.fee) * 100);
    }
    if (isNaN(feePaisa) || feePaisa < 0) feePaisa = 0;

    grossInflowPaisa += paisa;
    netInflowPaisa += (paisa - feePaisa);
    totalTxnCount++;

    // Channel attribution
    const rawCh = txn.channelId || txn.channel || txn.appId || txn.paymentMethod;
    const resolvedChId = resolveChannelId(rawCh);
    const chMetric = channelMap[resolvedChId] || channelMap.bangla_qr;
    chMetric.amountPaisa += paisa;
    chMetric.totalAmountPaisa += paisa;
    chMetric.txnCount++;

    // Timeseries attribution
    const ts = extractRecordTimestamp(txn);
    if (isHourly) {
      let h = 0;
      if (ts > 0) {
        h = new Date(ts).getHours();
      } else if (txn.time && typeof txn.time === 'string') {
        const parts = txn.time.split(':');
        h = parseInt(parts[0], 10) || 0;
      }
      h = Math.max(0, Math.min(23, h));
      hourlyBuckets[h].amountPaisa += paisa;
      hourlyBuckets[h].txnCount++;
    } else {
      const dayIso = extractRecordIsoDate(txn) || formatIsoDate(new Date(ts || Date.now()));
      if (dayIso) {
        if (!dailyMap[dayIso]) {
          const dObj = new Date(dayIso);
          const dayOfWeek = !isNaN(dObj.getDay()) ? dObj.getDay() : 0;
          dailyMap[dayIso] = {
            date: dayIso,
            dateBn: toBengaliNumeral(dayIso),
            dayLabelBn: BENGALI_DAY_NAMES[dayOfWeek] || '',
            amountPaisa: 0,
            amountTaka: 0,
            txnCount: 0,
          };
        }
        dailyMap[dayIso].amountPaisa += paisa;
        dailyMap[dayIso].txnCount++;
      }
    }
  }

  // Finalize channel Taka amounts and metrics
  const channelBreakdown = Object.values(channelMap);
  for (const ch of channelBreakdown) {
    ch.amountTaka = ch.amountPaisa / 100;
  }

  // 3. Largest-Remainder Method (Hare-Niemeyer Algorithm) for Channel Distribution
  // Guarantees sum of basisPoints === 10,000 and sum of percentage === 100.00%
  if (grossInflowPaisa > 0) {
    let allocatedBp = 0;
    const remainders = [];

    for (const ch of channelBreakdown) {
      const exactBp = (ch.amountPaisa * 10000) / grossInflowPaisa;
      const floorBp = Math.floor(exactBp);
      ch.basisPoints = floorBp;
      allocatedBp += floorBp;
      remainders.push({
        channel: ch,
        remainder: exactBp - floorBp,
        amountPaisa: ch.amountPaisa,
      });
    }

    const diff = 10000 - allocatedBp;
    remainders.sort((a, b) => (b.remainder - a.remainder) || (b.amountPaisa - a.amountPaisa));

    for (let i = 0; i < diff && i < remainders.length; i++) {
      remainders[i].channel.basisPoints += 1;
    }

    for (const ch of channelBreakdown) {
      ch.percentage = Number((ch.basisPoints / 100).toFixed(2));
      ch.percentageShare = ch.percentage;
    }
  }

  // 4. Average Ticket Size (integer paisa)
  const averageTicketPaisa = totalTxnCount > 0 ? Math.round(grossInflowPaisa / totalTxnCount) : 0;
  const averageTicketTaka = averageTicketPaisa / 100;

  // 5. Finalize Timeseries
  let velocityTimeseries = [];
  if (isHourly) {
    for (const b of hourlyBuckets) {
      b.amountTaka = b.amountPaisa / 100;
    }
    velocityTimeseries = hourlyBuckets;
  } else {
    const dates = Object.keys(dailyMap).sort();
    for (const d of dates) {
      dailyMap[d].amountTaka = dailyMap[d].amountPaisa / 100;
      velocityTimeseries.push(dailyMap[d]);
    }
  }

  // 6. Period-Over-Period Growth Calculation
  let priorPeriodGrossPaisa = 0;
  if (options.priorPeriodGrossPaisa !== undefined && options.priorPeriodGrossPaisa !== null) {
    priorPeriodGrossPaisa = Math.round(Number(options.priorPeriodGrossPaisa));
  } else if (options.priorTransactions && Array.isArray(options.priorTransactions)) {
    for (const pTx of options.priorTransactions) {
      const pPaisa = pTx.amountPaisa !== undefined && pTx.amountPaisa !== null
        ? Math.round(Number(pTx.amountPaisa))
        : Math.round(Number(pTx.amount || 0) * 100);
      if (!isNaN(pPaisa) && pPaisa > 0) priorPeriodGrossPaisa += pPaisa;
    }
  } else if (resolved.priorStartDate && resolved.priorEndDate) {
    const priorTxns = filterTransactionsByDateRange(txList, resolved.priorStartDate, resolved.priorEndDate);
    for (const pTx of priorTxns) {
      if (targetBizId) {
        const pBiz = String(pTx.businessId || pTx.business_id || '1');
        if (pBiz !== targetBizId) continue;
      }
      const pStatus = String(pTx.status || 'SUCCESS').toUpperCase();
      if (pStatus === 'FAILED' || pStatus === 'CANCELLED' || pStatus === 'REVERSED') continue;
      const pPaisa = pTx.amountPaisa !== undefined && pTx.amountPaisa !== null
        ? Math.round(Number(pTx.amountPaisa))
        : Math.round(Number(pTx.amount || 0) * 100);
      if (!isNaN(pPaisa) && pPaisa > 0) priorPeriodGrossPaisa += pPaisa;
    }
  }

  let growthRatePct = 0.0;
  if (priorPeriodGrossPaisa > 0) {
    growthRatePct = Number((((grossInflowPaisa - priorPeriodGrossPaisa) * 100) / priorPeriodGrossPaisa).toFixed(2));
  } else if (priorPeriodGrossPaisa === 0 && grossInflowPaisa > 0) {
    growthRatePct = 100.0;
  } else {
    growthRatePct = 0.0;
  }

  const growthDirection = growthRatePct > 0 ? 'POSITIVE' : (growthRatePct < 0 ? 'NEGATIVE' : 'NEUTRAL');
  const growthSign = growthRatePct > 0 ? '+' : '';
  const formattedGrowthBn = `${growthSign}${toBengaliNumeral(growthRatePct.toFixed(2))}%`;

  // 7. Formatted Output Strings
  const currencySymbol = options.currencySymbol || '৳';
  const formattedTotalInflowBn = formatCurrencyBn(grossInflowPaisa / 100, currencySymbol);
  const formattedTotalInflowEn = formatCurrencyEn(grossInflowPaisa / 100, currencySymbol);
  const formattedNetInflowBn = formatCurrencyBn(netInflowPaisa / 100, currencySymbol);
  const formattedAverageTicketBn = formatCurrencyBn(averageTicketTaka, currencySymbol);
  const formattedAverageTicketEn = formatCurrencyEn(averageTicketTaka, currencySymbol);
  const formattedTxnCountBn = toBengaliNumeral(totalTxnCount);

  return {
    periodKey,
    periodLabelBn,
    periodLabelEn,
    startDate,
    endDate,
    totalInflowPaisa: grossInflowPaisa,
    totalInflowTaka: grossInflowPaisa / 100,
    grossInflowPaisa,
    grossInflowBdt: grossInflowPaisa / 100,
    netInflowPaisa,
    netInflowTaka: netInflowPaisa / 100,
    netInflowBdt: netInflowPaisa / 100,
    totalTxnCount,
    averageTicketPaisa,
    averageTicketTaka,
    avgTicketPaisa: averageTicketPaisa,
    avgTicketBdt: averageTicketTaka,
    formattedTotalInflowBn,
    formattedTotalInflowEn,
    formattedNetInflowBn,
    formattedAverageTicketBn,
    formattedAverageTicketEn,
    formattedTxnCountBn,
    channelBreakdown,
    velocityTimeseries,
    timeseries: velocityTimeseries,
    priorPeriodGrossPaisa,
    priorGrossPaisa: priorPeriodGrossPaisa,
    priorGrossTaka: priorPeriodGrossPaisa / 100,
    growthRatePct,
    growthPercentage: growthRatePct,
    growthDirection,
    formattedGrowthBn,
  };
}

// -------------------------------------------------------------
// CLASS-BASED ENGINE FOR COMPATIBILITY
// -------------------------------------------------------------
class MerchantAnalyticsEngine {
  constructor() {
    this.CHANNELS = {
      bkash: { id: 'bkash', nameBn: 'বিকাশ' },
      nagad: { id: 'nagad', nameBn: 'নগদ' },
      rocket: { id: 'rocket', nameBn: 'রকেট' },
      upay: { id: 'upay', nameBn: 'উপায়' },
      card: { id: 'card', nameBn: 'কার্ড' },
      bangla_qr: { id: 'bangla_qr', nameBn: 'বাংলা কিউআর' },
    };
  }

  calculatePeriodSummary(transactions, periodKey, periodLabelBn, startDate, endDate, priorPeriodGrossPaisa = 0) {
    return calculateDigitalInflowAnalytics(transactions, {
      period: periodKey,
      periodLabelBn,
      startDate,
      endDate,
      priorPeriodGrossPaisa,
    });
  }

  calculateDigitalInflowAnalytics(transactions, options) {
    return calculateDigitalInflowAnalytics(transactions, options);
  }

  filterTransactionsByDateRange(transactions, startDate, endDate) {
    return filterTransactionsByDateRange(transactions, startDate, endDate);
  }
}

const merchantAnalyticsEngine = new MerchantAnalyticsEngine();

// -------------------------------------------------------------
// EXPORTS
// -------------------------------------------------------------
module.exports = {
  PERIOD_TYPES,
  PERIOD_LABELS_BN,
  PERIOD_LABELS_EN,
  SUPPORTED_CHANNELS,
  calculateDigitalInflowAnalytics,
  filterTransactionsByDateRange,
  resolveAnalyticsDateRange,
  resolveChannelId,
  toBengaliNumeral,
  formatCurrencyBn,
  formatCurrencyEn,
  MerchantAnalyticsEngine,
  merchantAnalyticsEngine,
  default: merchantAnalyticsEngine,
};
