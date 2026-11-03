/**
 * src/tallyPayService.js
 *
 * Clean-Room TallyPay Wallet, Add Money & Transaction Limits Engine
 * Implements transaction limits, service charges, and digital inflow flows
 *
 * Milestone: REA-ITER-221
 * Target Reference: REF-001 (TallyKhata-Demo.apk)
 */

const crypto = require('crypto');

// -------------------------------------------------------------
// 1. TRANSACTION LIMITS & THRESHOLDS (activity_transaction_limit.xml)
// -------------------------------------------------------------
const TRANSACTION_LIMITS = {
  add_money: {
    titleBn: 'ক্যাশ-ইন (টাকা লোড / অ্যাড মানি)',
    titleEn: 'Cash In / Add Money',
    minAmount: 10.00,
    maxAmountPerTxn: 50000.00,
    dailyMaxCount: 5,
    dailyMaxAmount: 50000.00,
    monthlyMaxCount: 25,
    monthlyMaxAmount: 300000.00,
  },
  send_money: {
    titleBn: 'সেন্ড মানি (অন্য ওয়ালেটে পাঠানো)',
    titleEn: 'Send Money',
    minAmount: 10.00,
    maxAmountPerTxn: 25000.00,
    dailyMaxCount: 5,
    dailyMaxAmount: 25000.00,
    monthlyMaxCount: 20,
    monthlyMaxAmount: 100000.00,
  },
  cash_out: {
    titleBn: 'ক্যাশ-আউট (টাকা উত্তোলন)',
    titleEn: 'Cash Out / Withdrawal',
    minAmount: 50.00,
    maxAmountPerTxn: 25000.00,
    dailyMaxCount: 3,
    dailyMaxAmount: 25000.00,
    monthlyMaxCount: 15,
    monthlyMaxAmount: 150000.00,
  },
  payment_qr: {
    titleBn: 'বাংলা QR পেমেন্ট গ্রহণ',
    titleEn: 'Bangla QR Payment Receive',
    minAmount: 1.00,
    maxAmountPerTxn: 100000.00,
    dailyMaxCount: 50,
    dailyMaxAmount: 100000.00,
    monthlyMaxCount: 500,
    monthlyMaxAmount: 1000000.00,
  },
};

// -------------------------------------------------------------
// 2. SERVICE CHARGES & FEE TIERS (১০০% ফ্রি ও স্বচ্ছ চার্জ কাঠামো)
// -------------------------------------------------------------
const SERVICE_CHARGES = {
  add_money: {
    titleBn: 'ওয়ালেটে অ্যাড মানি',
    titleEn: 'Add Money to Wallet',
    ratePercent: 0.00,
    fixedFee: 0.00,
    descriptionBn: '১০০% ফ্রি লেনদেন • কোনো চার্জ নেই',
    descriptionEn: '100% Free • Zero Service Charge',
    isFree: true,
  },
  payment_qr: {
    titleBn: 'বাংলা QR পেমেন্ট রিসিভ',
    titleEn: 'Bangla QR Payment Receive',
    ratePercent: 0.00,
    fixedFee: 0.00,
    descriptionBn: '১০০% ফ্রি মার্চেন্ট রিসিভ',
    descriptionEn: '100% Free Merchant Receive',
    isFree: true,
  },
  cash_out_agent: {
    titleBn: 'এজেন্ট পয়েন্ট থেকে ক্যাশ-আউট',
    titleEn: 'Cash Out via Agent',
    ratePercent: 1.49, // ৳ ১৪.৯০ প্রতি হাজারে
    fixedFee: 0.00,
    descriptionBn: '৳ ১৪.৯০ প্রতি হাজারে (১.৪৯%)',
    descriptionEn: '৳ 14.90 per 1,000 (1.49%)',
    isFree: false,
  },
  cash_out_bank: {
    titleBn: 'সংযুক্ত ব্যাংক একাউন্টে ট্রান্সফার',
    titleEn: 'Transfer to Linked Bank',
    ratePercent: 0.00,
    fixedFee: 0.00,
    descriptionBn: '১০০% ফ্রি ব্যাংক ট্রান্সফার',
    descriptionEn: '100% Free Bank Transfer',
    isFree: true,
  },
};

// -------------------------------------------------------------
// 3. SUPPORTED ADD MONEY CHANNELS & PROVIDERS
// -------------------------------------------------------------
const SUPPORTED_ADD_MONEY_CHANNELS = [
  { id: 'bkash', nameBn: 'বিকাশ', nameEn: 'bKash', type: 'mfs', color: '#D12053', icon: 'ic_bkash' },
  { id: 'nagad', nameBn: 'নগদ', nameEn: 'Nagad', type: 'mfs', color: '#F7941D', icon: 'ic_nagad' },
  { id: 'rocket', nameBn: 'রকেট', nameEn: 'Rocket', type: 'mfs', color: '#8C3494', icon: 'ic_rocket' },
  { id: 'upay', nameBn: 'উপায়', nameEn: 'Upay', type: 'mfs', color: '#0066B3', icon: 'ic_upay' },
  { id: 'visa', nameBn: 'ভিসা কার্ড', nameEn: 'Visa Card', type: 'card', color: '#1A1F71', icon: 'ic_visa' },
  { id: 'mastercard', nameBn: 'মাস্টারকার্ড', nameEn: 'Mastercard', type: 'card', color: '#EB001B', icon: 'ic_mastercard' },
  { id: 'internet_banking', nameBn: 'ইন্টারনেট ব্যাংকিং', nameEn: 'Internet Banking', type: 'bank', color: '#00843D', icon: 'ic_bank' },
];

/**
 * Calculates service charge with strict integer paisa precision.
 *
 * @param {number|string} amount - Transaction amount in Taka
 * @param {string} [serviceKey='add_money'] - Service charge key
 * @returns {{ fee: number, feePaisa: number, netAmount: number, netPaisa: number, isFree: boolean }}
 */
function calculateServiceFee(amount, serviceKey = 'add_money') {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount || 0);
  const amountPaisa = Math.round(numAmount * 100);

  const chargeRule = SERVICE_CHARGES[serviceKey] || SERVICE_CHARGES.add_money;

  if (amountPaisa <= 0 || chargeRule.isFree) {
    return {
      fee: 0.00,
      feePaisa: 0,
      netAmount: Math.max(0, amountPaisa / 100),
      netPaisa: Math.max(0, amountPaisa),
      isFree: true,
      ratePercent: 0.00,
    };
  }

  // Calculate percentage fee in integer paisa
  const rawFeePaisa = Math.round((amountPaisa * chargeRule.ratePercent) / 100);
  const fixedPaisa = Math.round((chargeRule.fixedFee || 0) * 100);
  const totalFeePaisa = rawFeePaisa + fixedPaisa;

  return {
    fee: totalFeePaisa / 100,
    feePaisa: totalFeePaisa,
    netAmount: Math.max(0, (amountPaisa - totalFeePaisa) / 100),
    netPaisa: Math.max(0, amountPaisa - totalFeePaisa),
    isFree: false,
    ratePercent: chargeRule.ratePercent,
  };
}

/**
 * Validates Add Money parameters against standard transaction limits.
 *
 * @param {number|string} amount - Amount in Taka
 * @param {string} [channelId='bkash'] - Origin channel
 * @param {Array<object>} [existingDailyTxns=[]] - Past transactions executed today
 * @returns {{ valid: boolean, error?: string, fee: number, netAmount: number, paisa: number }}
 */
function validateAddMoney(amount, channelId = 'bkash', existingDailyTxns = []) {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount || 0);

  if (isNaN(numAmount) || numAmount <= 0) {
    return { valid: false, error: 'INVALID_AMOUNT: টাকার সঠিক পরিমাণ লিখুন' };
  }

  const paisa = Math.round(numAmount * 100);
  const roundedAmount = paisa / 100;
  const limits = TRANSACTION_LIMITS.add_money;

  if (roundedAmount < limits.minAmount) {
    return {
      valid: false,
      error: `MIN_AMOUNT_LIMIT: সর্বনিম্ন অ্যাড মানি পরিমাণ ৳ ${limits.minAmount.toFixed(2)}`,
      paisa,
      amount: roundedAmount,
    };
  }

  if (roundedAmount > limits.maxAmountPerTxn) {
    return {
      valid: false,
      error: `MAX_AMOUNT_LIMIT: প্রতিবার সর্বোচ্চ অ্যাড মানি সীমা ৳ ${limits.maxAmountPerTxn.toLocaleString('bn-BD')}`,
      paisa,
      amount: roundedAmount,
    };
  }

  // Calculate daily velocity and volume
  const todayTxns = Array.isArray(existingDailyTxns) ? existingDailyTxns : [];
  const todayCount = todayTxns.length;
  const todaySumPaisa = todayTxns.reduce((acc, t) => acc + Math.round((Number(t.amount) || 0) * 100), 0);

  if (todayCount >= limits.dailyMaxCount) {
    return {
      valid: false,
      error: `DAILY_COUNT_EXCEEDED: দৈনিক সর্বোচ্চ ${limits.dailyMaxCount} বার অ্যাড মানি করা যাবে`,
      todayCount,
    };
  }

  if (todaySumPaisa + paisa > Math.round(limits.dailyMaxAmount * 100)) {
    const remainingPaisa = Math.max(0, Math.round(limits.dailyMaxAmount * 100) - todaySumPaisa);
    return {
      valid: false,
      error: `DAILY_AMOUNT_EXCEEDED: দৈনিক অবশিষ্ট সীমা ৳ ${(remainingPaisa / 100).toFixed(2)}`,
      remainingDailyAmount: remainingPaisa / 100,
    };
  }

  const feeCalc = calculateServiceFee(roundedAmount, 'add_money');

  return {
    valid: true,
    amount: roundedAmount,
    paisa,
    fee: feeCalc.fee,
    netAmount: feeCalc.netAmount,
    channelId,
  };
}

/**
 * Initiates an Add Money top-up transaction and returns transaction payload.
 *
 * @param {object} merchantConfig - Merchant details (wallet, name)
 * @param {object} request - Top-up request details
 * @param {number|string} request.amount - Top-up amount
 * @param {string} request.channel - Channel ID (bkash, nagad, rocket, card)
 * @param {number} [request.currentBalance=0] - Current wallet balance
 * @returns {object} Transaction result & metadata
 */
function initiateAddMoneyTransaction(merchantConfig, request = {}) {
  const channel = SUPPORTED_ADD_MONEY_CHANNELS.find(c => c.id === request.channel) || SUPPORTED_ADD_MONEY_CHANNELS[0];
  const validation = validateAddMoney(request.amount, channel.id, request.existingDailyTxns || []);

  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const curBal = Number(request.currentBalance || 0);
  const curPaisa = Math.round(curBal * 100);
  const addPaisa = validation.paisa;
  const newBalPaisa = curPaisa + addPaisa;
  const newBalance = newBalPaisa / 100;

  const txnNumber = `TP-ADD-${Date.now().toString().slice(-8)}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const nowIso = new Date().toISOString();

  const transaction = {
    id: 'w_add_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
    transactionNumber: txnNumber,
    type: 'add_money',
    direction: 'in',
    title: `অ্যাড মানি (${channel.nameBn})`,
    titleEn: `Add Money (${channel.nameEn})`,
    amount: validation.amount,
    paisa: validation.paisa,
    fee: validation.fee,
    netAmount: validation.netAmount,
    balanceBefore: curBal,
    balanceAfter: newBalance,
    channelId: channel.id,
    channelName: channel.nameBn,
    channelType: channel.type,
    status: 'SUCCESS',
    statusCode: '00',
    statusMessageBn: 'টাকা লোড সফল হয়েছে',
    statusMessageEn: 'Add Money Successful',
    merchantWallet: merchantConfig.accountNo || merchantConfig.ownerPhone || '01700000000',
    merchantName: merchantConfig.merchantName || merchantConfig.businessName || 'TallyKhata Merchant',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  return {
    success: true,
    transaction,
    newBalance,
    formattedBengaliAmount: `৳ ${validation.amount.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}`,
  };
}

module.exports = {
  TRANSACTION_LIMITS,
  SERVICE_CHARGES,
  SUPPORTED_ADD_MONEY_CHANNELS,
  calculateServiceFee,
  validateAddMoney,
  initiateAddMoneyTransaction,
};
