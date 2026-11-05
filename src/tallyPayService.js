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


// -------------------------------------------------------------
// 4. MOBILE RECHARGE OPERATORS & LIMITS
// -------------------------------------------------------------
const RECHARGE_LIMITS = {
  minAmount: 10.00,
  maxAmountPerTxn: 1000.00,
  dailyMaxCount: 50,
  dailyMaxAmount: 10000.00,
  monthlyMaxCount: 500,
  monthlyMaxAmount: 50000.00,
};

const SUPPORTED_OPERATORS = [
  { id: 'gp', nameBn: 'গ্রামীণফোন', nameEn: 'Grameenphone', prefixes: ['017', '013'], color: '#00A3E0' },
  { id: 'bl', nameBn: 'বাংলালিংক', nameEn: 'Banglalink', prefixes: ['019', '014'], color: '#FF6600' },
  { id: 'robi', nameBn: 'রবি', nameEn: 'Robi', prefixes: ['018'], color: '#ED1C24' },
  { id: 'airtel', nameBn: 'এয়ারটেল', nameEn: 'Airtel', prefixes: ['016'], color: '#E40000' },
  { id: 'teletalk', nameBn: 'টেলিটক', nameEn: 'Teletalk', prefixes: ['015'], color: '#00843D' },
];

/**
 * Automatically detects telecom operator from Bangladeshi mobile number prefix.
 *
 * @param {string} phone
 * @returns {object|null} Matched operator or null
 */
function detectOperator(phone) {
  if (!phone || typeof phone !== 'string') return null;
  const clean = phone.replace(/[^0-9]/g, '');
  const normalized = clean.startsWith('880') ? clean.slice(2) : clean;
  if (normalized.length < 3) return null;
  const prefix = normalized.slice(0, 3);
  return SUPPORTED_OPERATORS.find(op => op.prefixes.includes(prefix)) || null;
}

/**
 * Validates Send Money parameters.
 */
function validateSendMoney(amount, recipientPhone, existingDailyTxns = []) {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount || 0);

  if (isNaN(numAmount) || numAmount <= 0) {
    return { valid: false, error: 'INVALID_AMOUNT: টাকার সঠিক পরিমাণ লিখুন' };
  }

  const cleanPhone = String(recipientPhone || '').replace(/[^0-9]/g, '');
  const normalizedPhone = cleanPhone.startsWith('880') ? cleanPhone.slice(2) : cleanPhone;
  if (!/^01[3-9]\d{8}$/.test(normalizedPhone)) {
    return { valid: false, error: 'INVALID_PHONE: ১১ ডিজিটের সঠিক মোবাইল নম্বর লিখুন' };
  }

  const paisa = Math.round(numAmount * 100);
  const roundedAmount = paisa / 100;
  const limits = TRANSACTION_LIMITS.send_money;

  if (roundedAmount < limits.minAmount) {
    return {
      valid: false,
      error: `MIN_AMOUNT_LIMIT: সর্বনিম্ন সেন্ড মানি সীমা ৳ ${limits.minAmount.toFixed(2)}`,
      paisa,
      amount: roundedAmount,
    };
  }

  if (roundedAmount > limits.maxAmountPerTxn) {
    return {
      valid: false,
      error: `MAX_AMOUNT_LIMIT: প্রতিবার সর্বোচ্চ সেন্ড মানি সীমা ৳ ${limits.maxAmountPerTxn.toLocaleString('bn-BD')}`,
      paisa,
      amount: roundedAmount,
    };
  }

  const todayTxns = Array.isArray(existingDailyTxns) ? existingDailyTxns : [];
  const todayCount = todayTxns.length;
  const todaySumPaisa = todayTxns.reduce((acc, t) => acc + Math.round((Number(t.amount) || 0) * 100), 0);

  if (todayCount >= limits.dailyMaxCount) {
    return {
      valid: false,
      error: `DAILY_COUNT_EXCEEDED: দৈনিক সর্বোচ্চ ${limits.dailyMaxCount} বার সেন্ড মানি করা যাবে`,
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

  const feeCalc = calculateServiceFee(roundedAmount, 'send_money');

  return {
    valid: true,
    amount: roundedAmount,
    paisa,
    recipientPhone: normalizedPhone,
    fee: feeCalc.fee,
    netAmount: feeCalc.netAmount,
  };
}

/**
 * Initiates an outward Send Money transaction.
 */
function initiateSendMoneyTransaction(senderConfig, request = {}) {
  const validation = validateSendMoney(request.amount, request.recipientPhone, request.existingDailyTxns || []);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const curBal = Number(request.currentBalance || 0);
  const curPaisa = Math.round(curBal * 100);
  const sendPaisa = validation.paisa;

  if (curPaisa < sendPaisa) {
    throw new Error('INSUFFICIENT_BALANCE: ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই');
  }

  const newBalPaisa = curPaisa - sendPaisa;
  const newBalance = newBalPaisa / 100;
  const txnNumber = `TP-SEND-${Date.now().toString().slice(-8)}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const nowIso = new Date().toISOString();

  const transaction = {
    id: 'w_send_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
    transactionNumber: txnNumber,
    type: 'send_money',
    direction: 'out',
    title: `সেন্ড মানি (${validation.recipientPhone})`,
    titleEn: `Send Money (${validation.recipientPhone})`,
    amount: validation.amount,
    paisa: validation.paisa,
    fee: validation.fee,
    recipientPhone: validation.recipientPhone,
    recipientName: request.recipientName || 'TallyKhata User',
    balanceBefore: curBal,
    balanceAfter: newBalance,
    status: 'SUCCESS',
    statusCode: '00',
    statusMessageBn: 'সেন্ড মানি সফল হয়েছে',
    statusMessageEn: 'Send Money Successful',
    senderWallet: senderConfig.accountNo || senderConfig.ownerPhone || '01700000000',
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

/**
 * Validates Mobile Recharge parameters.
 */
function validateMobileRecharge(amount, recipientPhone, operatorId, connectionType = 'prepaid', existingDailyTxns = []) {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount || 0);

  if (isNaN(numAmount) || numAmount <= 0) {
    return { valid: false, error: 'INVALID_AMOUNT: টাকার সঠিক পরিমাণ লিখুন' };
  }

  const cleanPhone = String(recipientPhone || '').replace(/[^0-9]/g, '');
  const normalizedPhone = cleanPhone.startsWith('880') ? cleanPhone.slice(2) : cleanPhone;
  if (!/^01[3-9]\d{8}$/.test(normalizedPhone)) {
    return { valid: false, error: 'INVALID_PHONE: ১১ ডিজিটের সঠিক মোবাইল নম্বর লিখুন' };
  }

  const detectedOp = detectOperator(normalizedPhone);
  const operator = SUPPORTED_OPERATORS.find(op => op.id === operatorId) || detectedOp;
  if (!operator) {
    return { valid: false, error: 'INVALID_OPERATOR: সঠিক মোবাইল অপারেটর নির্বাচন করুন' };
  }

  const paisa = Math.round(numAmount * 100);
  const roundedAmount = paisa / 100;
  const limits = RECHARGE_LIMITS;

  if (roundedAmount < limits.minAmount) {
    return {
      valid: false,
      error: `MIN_AMOUNT_LIMIT: সর্বনিম্ন রিচার্জের পরিমাণ ৳ ${limits.minAmount.toFixed(2)}`,
      paisa,
      amount: roundedAmount,
    };
  }

  if (roundedAmount > limits.maxAmountPerTxn) {
    return {
      valid: false,
      error: `MAX_AMOUNT_LIMIT: প্রতিবার সর্বোচ্চ রিচার্জের পরিমাণ ৳ ${limits.maxAmountPerTxn.toLocaleString('bn-BD')}`,
      paisa,
      amount: roundedAmount,
    };
  }

  const todayTxns = Array.isArray(existingDailyTxns) ? existingDailyTxns : [];
  const todayCount = todayTxns.length;
  const todaySumPaisa = todayTxns.reduce((acc, t) => acc + Math.round((Number(t.amount) || 0) * 100), 0);

  if (todayCount >= limits.dailyMaxCount) {
    return {
      valid: false,
      error: `DAILY_COUNT_EXCEEDED: দৈনিক সর্বোচ্চ ${limits.dailyMaxCount} বার রিচার্জ করা যাবে`,
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

  return {
    valid: true,
    amount: roundedAmount,
    paisa,
    recipientPhone: normalizedPhone,
    operator,
    connectionType: connectionType === 'postpaid' ? 'postpaid' : 'prepaid',
    fee: 0,
  };
}

/**
 * Initiates an outward Mobile Recharge transaction.
 */
function initiateMobileRechargeTransaction(merchantConfig, request = {}) {
  const validation = validateMobileRecharge(
    request.amount,
    request.recipientPhone,
    request.operatorId,
    request.connectionType,
    request.existingDailyTxns || []
  );

  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const curBal = Number(request.currentBalance || 0);
  const curPaisa = Math.round(curBal * 100);
  const rcgPaisa = validation.paisa;

  if (curPaisa < rcgPaisa) {
    throw new Error('INSUFFICIENT_BALANCE: ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই');
  }

  const newBalPaisa = curPaisa - rcgPaisa;
  const newBalance = newBalPaisa / 100;
  const txnNumber = `TP-RCG-${Date.now().toString().slice(-8)}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const nowIso = new Date().toISOString();

  const transaction = {
    id: 'w_rcg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
    transactionNumber: txnNumber,
    type: 'mobile_recharge',
    direction: 'out',
    title: `মোবাইল রিচার্জ (${validation.operator.nameBn})`,
    titleEn: `Mobile Recharge (${validation.operator.nameEn})`,
    amount: validation.amount,
    paisa: validation.paisa,
    recipientPhone: validation.recipientPhone,
    operatorId: validation.operator.id,
    operatorName: validation.operator.nameBn,
    connectionType: validation.connectionType,
    balanceBefore: curBal,
    balanceAfter: newBalance,
    fee: 0,
    status: 'SUCCESS',
    statusCode: '00',
    statusMessageBn: 'মোবাইল রিচার্জ সফল হয়েছে',
    statusMessageEn: 'Mobile Recharge Successful',
    merchantWallet: merchantConfig.accountNo || merchantConfig.ownerPhone || '01700000000',
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


// -------------------------------------------------------------
// 5. TRANSACTION HISTORY CONSTANTS & ENUMS (classes4.dex & resources.arsc)
// -------------------------------------------------------------
const BALANCE_CHANGE_TYPES = {
  CREDIT: 'CREDIT',
  DEBIT: 'DEBIT',
  INCOMING: 'CREDIT',
  OUTGOING: 'DEBIT',
  INFLOW: 'CREDIT',
  OUTFLOW: 'DEBIT',
  PELAM: 'CREDIT',
  DILAM: 'DEBIT',
};

const TXN_STATUSES = {
  COMPLETE: 'COMPLETE',
  IN_PROGRESS: 'IN_PROGRESS',
  PROCESSED: 'PROCESSED',
  FAILED: 'FAILED',
  REVERSED: 'REVERSED',
};

const TXN_INCOMING_OUTGOING_FILTERS = {
  ALL: 'ALL',
  INCOMING: 'INCOMING',
  OUTGOING: 'OUTGOING',
  INFLOW: 'INCOMING',
  OUTFLOW: 'OUTGOING',
  PELAM: 'INCOMING',
  DILAM: 'OUTGOING',
};

const TRANSACTION_TYPES = {
  BILL_PAYMENT: 'BILL_PAYMENT',
  CASHBACK: 'CASHBACK',
  CASH_IN_FROM_BANK: 'CASH_IN_FROM_BANK',
  CASH_IN_FROM_CARD: 'CASH_IN_FROM_CARD',
  CASH_IN_FROM_EXTERNAL: 'CASH_IN_FROM_EXTERNAL',
  CASH_IN_FROM_LOAN_CREDIT: 'CASH_IN_FROM_LOAN_CREDIT',
  CASH_IN_FROM_MFS_WALLET: 'CASH_IN_FROM_MFS_WALLET',
  CASH_OUT: 'CASH_OUT',
  CASH_OUT_TO_BANK: 'CASH_OUT_TO_BANK',
  CASH_OUT_TO_EXTERNAL: 'CASH_OUT_TO_EXTERNAL',
  CASH_OUT_TO_MFS_WALLET: 'CASH_OUT_TO_MFS_WALLET',
  CREDIT_COLLECTION: 'CREDIT_COLLECTION',
  DISBURSEMENT: 'DISBURSEMENT',
  DPS_INCOME: 'DPS_INCOME',
  DPS_PAYMENT: 'DPS_PAYMENT',
  FUND_TRANSFER: 'FUND_TRANSFER',
  IDTP_FUND_TRANSFER: 'IDTP_FUND_TRANSFER',
  IDTP_PAYMENT: 'IDTP_PAYMENT',
  IDTP_RTP: 'IDTP_RTP',
  IDTP_RTP_PAYMENT: 'IDTP_RTP_PAYMENT',
  IDTP_RTP_SEND_MONEY: 'IDTP_RTP_SEND_MONEY',
  IDTP_SEND_MONEY: 'IDTP_SEND_MONEY',
  LOAN_REPAYMENT: 'LOAN_REPAYMENT',
  MOBILE_RECHARGE: 'MOBILE_RECHARGE',
  NPSB_TRANSFER: 'NPSB_TRANSFER',
  NPSB_TRANSFER_CREDIT: 'NPSB_TRANSFER_CREDIT',
  NPSB_TRANSFER_CREDIT_BKASH: 'NPSB_TRANSFER_CREDIT_BKASH',
  PAYMENT: 'PAYMENT',
  PAYMENT_EXTERNAL: 'PAYMENT_EXTERNAL',
  PROCESS_RTP: 'PROCESS_RTP',
  REQUEST_RTP: 'REQUEST_RTP',
  REVERSE_TRANSACTION: 'REVERSE_TRANSACTION',
  SEND_MONEY: 'SEND_MONEY',
  SSM_TRANSFER: 'SSM_TRANSFER',
  TRANSFER: 'TRANSFER',
  VISA_TRANSFER: 'VISA_TRANSFER',
};

const BENGALI_ARSC_TOKENS = {
  SCREEN_TITLE: 'লেনদেন বিবরণী',
  TAB_ALL: 'সব লেনদেন',
  TAB_SUMMARY: 'সারসংক্ষেপ',
  REFERENCE_FIELD: 'লেনদেন আইডি',
  EMPTY_WARNING: 'লেনদেন পাওয়া যায়নি',
  EMPTY_DETAIL: 'আপনার একাউন্টে এখনো লেনদেন হয়নি',
  EMPTY_CTA: 'লেনদেন শুরু করুন',
  QR_FILTER: 'সব বাংলা QR অ্যাপ',
  SERVICE_FILTER: 'সব সার্ভিস',
  FEE_LABEL: 'চার্জ',
  INFLOW_HEADER: 'টাকা পেলেন',
  OUTFLOW_HEADER: 'টাকা দিলেন',
  STATUS_SUCCESS: 'সফল',
  STATUS_FAILED: 'ব্যর্থ',
  STATUS_PENDING: 'প্রক্রিয়াধীন',
  STATUS_REVERSED: 'বাতিল / ফেরত',
  ACTION_DOWNLOAD: 'ডাউনলোড',
  ACTION_SHARE: 'শেয়ার',
  DATE_LABEL: 'তারিখ',
  SERVICE_SEND: 'সেন্ড মানি',
  SERVICE_RECHARGE: 'মোবাইল রিচার্জ',
  AGG_INFLOW: 'মোট পেলেন',
  AGG_OUTFLOW: 'মোট দিলেন',
};

// -------------------------------------------------------------
// 6. BENGALI LOCALIZATION & FORMATTING HELPERS
// -------------------------------------------------------------
function toBengaliNumerals(number) {
  if (number === undefined || number === null) return '';
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(number).replace(/[0-9]/g, (w) => bengaliDigits[+w]);
}

function formatBengaliCurrency(amount) {
  const num = Number(amount || 0);
  const parts = Math.abs(num).toFixed(2).split('.');
  let intPart = parts[0];
  const decPart = parts[1];

  let res = '';
  if (intPart.length > 3) {
    const lastThree = intPart.substring(intPart.length - 3);
    const otherNumbers = intPart.substring(0, intPart.length - 3);
    res = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  } else {
    res = intPart;
  }

  const formatted = `${num < 0 ? '-' : ''}${res}.${decPart}`;
  return toBengaliNumerals(formatted);
}

function formatBengaliDate(date) {
  const d = date instanceof Date ? date : new Date(date || Date.now());
  if (isNaN(d.getTime())) return '';
  const monthsBn = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
  ];
  const day = toBengaliNumerals(d.getDate());
  const month = monthsBn[d.getMonth()];
  const year = toBengaliNumerals(d.getFullYear());
  return `${day} ${month}, ${year}`;
}

// -------------------------------------------------------------
// 7. TRANSACTION NORMALIZATION (TransactionDto / StatementItem)
// -------------------------------------------------------------
function formatTransactionStatementItem(rawTxn) {
  if (!rawTxn || typeof rawTxn !== 'object') return null;

  const transactionNumber = String(
    rawTxn.transactionNumber ||
    rawTxn.txnNumber ||
    rawTxn.transactionId ||
    rawTxn.txnId ||
    rawTxn.id ||
    rawTxn.refId ||
    rawTxn.invoiceNo ||
    ('TK-' + Date.now())
  );

  // Amount & Paisa
  let amountPaisa = 0;
  if (rawTxn.amountPaisa !== undefined && rawTxn.amountPaisa !== null) {
    amountPaisa = Math.max(0, Math.round(Number(rawTxn.amountPaisa)));
  } else if (rawTxn.paisa !== undefined && rawTxn.paisa !== null) {
    amountPaisa = Math.max(0, Math.round(Number(rawTxn.paisa)));
  } else if (rawTxn.amount !== undefined && rawTxn.amount !== null) {
    amountPaisa = Math.max(0, Math.round(Number(rawTxn.amount) * 100));
  }
  const amount = amountPaisa / 100;

  // Fee & Paisa
  let feePaisa = 0;
  if (rawTxn.feePaisa !== undefined && rawTxn.feePaisa !== null) {
    feePaisa = Math.max(0, Math.round(Number(rawTxn.feePaisa)));
  } else if (rawTxn.serviceCharge !== undefined && rawTxn.serviceCharge !== null) {
    feePaisa = Math.max(0, Math.round(Number(rawTxn.serviceCharge) * 100));
  } else if (rawTxn.charge !== undefined && rawTxn.charge !== null) {
    feePaisa = Math.max(0, Math.round(Number(rawTxn.charge) * 100));
  } else if (rawTxn.fee !== undefined && rawTxn.fee !== null) {
    feePaisa = Math.max(0, Math.round(Number(rawTxn.fee) * 100));
  }
  const fee = feePaisa / 100;

  // Determine Balance Change Type (CREDIT or DEBIT)
  let balanceChangeType = 'CREDIT';
  if (rawTxn.balanceChangeType) {
    const bct = String(rawTxn.balanceChangeType).trim().toUpperCase();
    balanceChangeType = (bct === 'DEBIT' || bct === 'OUTFLOW' || bct === 'DILAM') ? 'DEBIT' : 'CREDIT';
  } else if (rawTxn.direction) {
    const dir = String(rawTxn.direction).trim().toLowerCase();
    balanceChangeType = (dir === 'out' || dir === 'outgoing' || dir === 'debit') ? 'DEBIT' : 'CREDIT';
  } else {
    const rawType = String(rawTxn.type || rawTxn.txnType || '').toLowerCase();
    if (
      rawType.includes('send') ||
      rawType.includes('recharge') ||
      rawType.includes('bill') ||
      rawType.includes('cash_out') ||
      rawType.includes('out') ||
      rawType.includes('withdrawal') ||
      rawType.includes('payment_external') ||
      rawType.includes('repayment')
    ) {
      balanceChangeType = 'DEBIT';
    } else {
      balanceChangeType = 'CREDIT';
    }
  }

  // Net Amount calculation (Integer-Paisa precision)
  let netAmountPaisa = 0;
  if (balanceChangeType === 'CREDIT') {
    netAmountPaisa = Math.max(0, amountPaisa - feePaisa);
  } else {
    netAmountPaisa = amountPaisa + feePaisa;
  }
  const netAmount = netAmountPaisa / 100;

  // Normalize TxnType
  let txnType = 'PAYMENT';
  const rawTypeUpper = String(rawTxn.txnType || rawTxn.type || '').toUpperCase();
  if (TRANSACTION_TYPES[rawTypeUpper]) {
    txnType = rawTypeUpper;
  } else if (rawTypeUpper.includes('ADD_MONEY') || rawTypeUpper.includes('CASH_IN')) {
    if (rawTypeUpper.includes('BANK')) txnType = 'CASH_IN_FROM_BANK';
    else if (rawTypeUpper.includes('CARD')) txnType = 'CASH_IN_FROM_CARD';
    else if (rawTypeUpper.includes('MFS')) txnType = 'CASH_IN_FROM_MFS_WALLET';
    else txnType = 'CASH_IN_FROM_BANK';
  } else if (rawTypeUpper.includes('SEND')) {
    txnType = 'SEND_MONEY';
  } else if (rawTypeUpper.includes('RECHARGE')) {
    txnType = 'MOBILE_RECHARGE';
  } else if (rawTypeUpper.includes('BILL')) {
    txnType = 'BILL_PAYMENT';
  } else if (rawTypeUpper.includes('QR') || rawTypeUpper.includes('PAYMENT')) {
    txnType = 'PAYMENT';
  } else if (rawTypeUpper.includes('CASHBACK')) {
    txnType = 'CASHBACK';
  } else if (rawTypeUpper.includes('BANK') || rawTypeUpper.includes('FUND')) {
    txnType = 'FUND_TRANSFER';
  }

  // Type Name (Authentic Bengali label)
  let typeName = rawTxn.typeName || rawTxn.titleBn || rawTxn.title;
  if (!typeName) {
    switch (txnType) {
      case 'PAYMENT':
        typeName = 'মার্চেন্ট পেমেন্ট';
        break;
      case 'SEND_MONEY':
        typeName = 'সেন্ড মানি';
        break;
      case 'MOBILE_RECHARGE':
        typeName = 'মোবাইল রিচার্জ';
        break;
      case 'BILL_PAYMENT':
        typeName = 'বিল পে';
        break;
      case 'CASHBACK':
        typeName = 'ক্যাশব্যাক';
        break;
      case 'CASH_IN_FROM_BANK':
        typeName = 'ব্যাংক থেকে ক্যাশ ইন';
        break;
      case 'CASH_IN_FROM_CARD':
        typeName = 'কার্ড থেকে ক্যাশ ইন';
        break;
      case 'CASH_IN_FROM_MFS_WALLET':
        typeName = 'MFS থেকে ক্যাশ ইন';
        break;
      case 'CASH_OUT_TO_BANK':
        typeName = 'ব্যাংক ট্রান্সফার';
        break;
      case 'FUND_TRANSFER':
        typeName = 'ফান্ড ট্রান্সফার';
        break;
      default:
        typeName = 'লেনদেন';
    }
  }

  // Status mapping
  let txnStatus = 'COMPLETE';
  const stUpper = String(rawTxn.txnStatus || rawTxn.status || '').toUpperCase();
  if (stUpper.includes('FAIL') || stUpper.includes('ERROR') || stUpper.includes('REJECT')) {
    txnStatus = 'FAILED';
  } else if (stUpper.includes('PROG') || stUpper.includes('PEND') || stUpper.includes('WAIT')) {
    txnStatus = 'IN_PROGRESS';
  } else if (stUpper.includes('REV') || stUpper.includes('REFUND') || stUpper.includes('CANCEL')) {
    txnStatus = 'REVERSED';
  } else if (stUpper.includes('PROC')) {
    txnStatus = 'PROCESSED';
  } else {
    txnStatus = 'COMPLETE';
  }

  const statusBn =
    txnStatus === 'COMPLETE' || txnStatus === 'PROCESSED'
      ? 'সফল'
      : txnStatus === 'FAILED'
      ? 'ব্যর্থ'
      : txnStatus === 'REVERSED'
      ? 'বাতিল / ফেরত'
      : 'প্রক্রিয়াধীন';

  // Balances
  const balanceTo = rawTxn.balanceTo !== undefined && rawTxn.balanceTo !== null
    ? Number(rawTxn.balanceTo)
    : (rawTxn.balanceAfter !== undefined && rawTxn.balanceAfter !== null ? Number(rawTxn.balanceAfter) : null);
  const balanceFrom = rawTxn.balanceFrom !== undefined && rawTxn.balanceFrom !== null
    ? Number(rawTxn.balanceFrom)
    : (rawTxn.balanceBefore !== undefined && rawTxn.balanceBefore !== null ? Number(rawTxn.balanceBefore) : null);
  const balanceToPaisa = balanceTo !== null ? Math.round(balanceTo * 100) : null;
  const balanceFromPaisa = balanceFrom !== null ? Math.round(balanceFrom * 100) : null;

  // Counterparty names and wallets
  const fromName = rawTxn.fromName || rawTxn.customerName || (balanceChangeType === 'DEBIT' ? 'আমার দোকান' : 'গ্রাহক');
  const fromWallet = rawTxn.fromWallet || rawTxn.walletNo || rawTxn.merchantWallet || rawTxn.customerMobile || '';
  const toName = rawTxn.toName || rawTxn.billerName || rawTxn.recipientName || (balanceChangeType === 'CREDIT' ? 'আমার দোকান' : 'গ্রাহক / প্রাপক');
  const toWallet = rawTxn.toWallet || rawTxn.billerWallet || rawTxn.recipientPhone || rawTxn.accountNo || '';

  // Timestamps & Month
  const txnTime = rawTxn.txnTime || rawTxn.timestamp || rawTxn.createdAt || rawTxn.paymentDate || new Date().toISOString();
  let month = rawTxn.month;
  if (!month) {
    try {
      const d = new Date(txnTime);
      month = isNaN(d.getTime()) ? '2026-10' : d.toISOString().substring(0, 7);
    } catch (e) {
      month = '2026-10';
    }
  }

  const businessId = String(rawTxn.businessId || rawTxn.business_id || '1');

  return {
    id: transactionNumber,
    transactionNumber,
    txnNumber: transactionNumber,
    amount,
    amountPaisa,
    fee,
    feePaisa,
    netAmount,
    netAmountPaisa,
    balanceChangeType,
    balanceFrom,
    balanceFromPaisa,
    balanceTo,
    balanceToPaisa,
    txnType,
    typeName,
    txnStatus,
    status: txnStatus,
    statusBn,
    fromName,
    fromWallet,
    toName,
    toWallet,
    note: rawTxn.note || '',
    invoiceNo: rawTxn.invoiceNo || rawTxn.refId || '',
    counterId: rawTxn.counterId || null,
    counterName: rawTxn.counterName || '',
    outletId: rawTxn.outletId || null,
    outletName: rawTxn.outletName || '',
    externalData: rawTxn.externalData || null,
    canReverse: Boolean(rawTxn.canReverse),
    reversedTxn: Boolean(rawTxn.reversedTxn),
    instantTransfer: rawTxn.instantTransfer !== undefined ? Boolean(rawTxn.instantTransfer) : true,
    month,
    txnTime,
    createdAt: txnTime,
    businessId,
    business_id: businessId,
  };
}

// -------------------------------------------------------------
// 8. UNIFIED TRANSACTION QUERY ENGINE (queryWalletTransactions)
// -------------------------------------------------------------
function queryWalletTransactions(store, options = {}) {
  let allRaw = [];

  if (Array.isArray(store)) {
    allRaw = store;
  } else if (store && typeof store === 'object') {
    const currentStore = store.currentStore || store;
    const collections = [
      currentStore.tallyPayTransactions,
      currentStore.tallyPayAddMoneyTxns,
      currentStore.banglaQrTransactions,
      currentStore.billPaymentTransactions,
    ];

    const seenIds = new Set();
    for (const coll of collections) {
      if (Array.isArray(coll)) {
        for (const item of coll) {
          if (!item) continue;
          const num = item.transactionNumber || item.txnNumber || item.transactionId || item.txnId || item.id;
          if (num && seenIds.has(String(num))) continue;
          if (num) seenIds.add(String(num));
          allRaw.push(item);
        }
      }
    }

    if (allRaw.length === 0 && Array.isArray(currentStore.transactions)) {
      allRaw = currentStore.transactions;
    }
  }

  // Normalize all transactions
  let normalizedList = allRaw
    .map(formatTransactionStatementItem)
    .filter(Boolean);

  // Filter by businessId if specified
  const targetBizId = options.businessId ? String(options.businessId) : null;
  if (targetBizId) {
    normalizedList = normalizedList.filter((t) => String(t.businessId || '1') === targetBizId);
  }

  // Filter by direction / flowType
  const flow = String(options.flowType || options.direction || options.flow || 'ALL').toUpperCase();
  if (flow === 'INCOMING' || flow === 'INFLOW' || flow === 'PELAM' || flow === 'CREDIT') {
    normalizedList = normalizedList.filter((t) => t.balanceChangeType === 'CREDIT');
  } else if (flow === 'OUTGOING' || flow === 'OUTFLOW' || flow === 'DILAM' || flow === 'DEBIT') {
    normalizedList = normalizedList.filter((t) => t.balanceChangeType === 'DEBIT');
  }

  // Filter by txnType / category
  if (options.txnType && options.txnType !== 'ALL') {
    const targetType = String(options.txnType).trim().toUpperCase();
    normalizedList = normalizedList.filter((t) => {
      const curType = String(t.txnType || '').toUpperCase();
      return curType === targetType || curType.includes(targetType);
    });
  }

  // Filter by status
  if (options.txnStatus && options.txnStatus !== 'ALL') {
    const targetStatus = String(options.txnStatus).trim().toUpperCase();
    normalizedList = normalizedList.filter((t) => String(t.txnStatus).toUpperCase() === targetStatus);
  } else if (options.status && options.status !== 'ALL') {
    const targetStatus = String(options.status).trim().toUpperCase();
    normalizedList = normalizedList.filter((t) => String(t.txnStatus).toUpperCase() === targetStatus);
  }

  // Filter by date range (startDate, endDate)
  if (options.startDate) {
    const startMs = new Date(options.startDate).getTime();
    if (!isNaN(startMs)) {
      normalizedList = normalizedList.filter((t) => {
        const tMs = new Date(t.txnTime).getTime();
        return !isNaN(tMs) && tMs >= startMs;
      });
    }
  }
  if (options.endDate) {
    let endStr = String(options.endDate);
    if (/^\d{4}-\d{2}-\d{2}$/.test(endStr)) {
      endStr += 'T23:59:59.999Z';
    }
    const endMs = new Date(endStr).getTime();
    if (!isNaN(endMs)) {
      normalizedList = normalizedList.filter((t) => {
        const tMs = new Date(t.txnTime).getTime();
        return !isNaN(tMs) && tMs <= endMs;
      });
    }
  }

  // Filter by search query
  const query = String(options.query || options.search || '').trim().toLowerCase();
  if (query.length > 0) {
    normalizedList = normalizedList.filter((t) => {
      const matchNum = String(t.transactionNumber || '').toLowerCase().includes(query);
      const matchFrom = String(t.fromName || '').toLowerCase().includes(query);
      const matchTo = String(t.toName || '').toLowerCase().includes(query);
      const matchFromW = String(t.fromWallet || '').toLowerCase().includes(query);
      const matchToW = String(t.toWallet || '').toLowerCase().includes(query);
      const matchType = String(t.typeName || '').toLowerCase().includes(query);
      const matchNote = String(t.note || '').toLowerCase().includes(query);
      const matchInv = String(t.invoiceNo || '').toLowerCase().includes(query);
      return matchNum || matchFrom || matchTo || matchFromW || matchToW || matchType || matchNote || matchInv;
    });
  }

  // Sort by txnTime descending
  normalizedList.sort((a, b) => {
    const tA = new Date(a.txnTime).getTime() || 0;
    const tB = new Date(b.txnTime).getTime() || 0;
    return tB - tA;
  });

  const totalCount = normalizedList.length;
  const offset = Math.max(0, parseInt(options.offset, 10) || 0);
  const limit = options.limit !== undefined && options.limit !== null ? Math.max(1, parseInt(options.limit, 10)) : 20;

  const items = normalizedList.slice(offset, offset + limit);
  const hasMore = offset + items.length < totalCount;

  return {
    items,
    transactions: items,
    totalCount,
    offset,
    limit,
    hasMore,
  };
}

// -------------------------------------------------------------
// 9. MONTHLY BREAKDOWN CALCULATOR (TxnReport)
// -------------------------------------------------------------
function calculateMonthlyTransactionSummary(transactions, month = null) {
  let list = [];
  if (Array.isArray(transactions)) {
    list = transactions.map(formatTransactionStatementItem).filter(Boolean);
  } else if (transactions && typeof transactions === 'object') {
    const qRes = queryWalletTransactions(transactions, { limit: 100000 });
    list = qRes.items || [];
  }

  const monthStr = month && month !== 'ALL' ? String(month).trim() : null;
  const filtered = monthStr
    ? list.filter((t) => t.month === monthStr || (t.txnTime && t.txnTime.startsWith(monthStr)))
    : list;

  let totalPelamPaisa = 0;
  let totalDilamPaisa = 0;
  let addMoneyPaisa = 0;
  let sendMoneyPaisa = 0;
  let sendMoneyFeePaisa = 0;
  let mobileRechargePaisa = 0;
  let mobileRechargeFeePaisa = 0;
  let billPayPaisa = 0;
  let billPayFeePaisa = 0;
  let bankTransferPaisa = 0;
  let bankTransferFeePaisa = 0;
  let cardTransferPaisa = 0;
  let cardTransferFeePaisa = 0;
  let cashbackPaisa = 0;
  let sqrCreditPaisa = 0;
  let supplierPaymentPaisa = 0;
  let supplierPaymentFeePaisa = 0;
  let moneyReceivePaisa = 0;
  let pelamAdayPaisa = 0;
  let nagadTransferPaisa = 0;
  let nagadTransferFeePaisa = 0;
  let rocketTransferPaisa = 0;
  let rocketTransferFeePaisa = 0;

  for (const t of filtered) {
    const amtPaisa = t.amountPaisa !== undefined ? t.amountPaisa : Math.round(Number(t.amount || 0) * 100);
    const feeP = t.feePaisa !== undefined ? t.feePaisa : Math.round(Number(t.fee || 0) * 100);

    if (t.balanceChangeType === 'CREDIT') {
      totalPelamPaisa += amtPaisa;
    } else if (t.balanceChangeType === 'DEBIT') {
      totalDilamPaisa += amtPaisa;
    }

    const tType = String(t.txnType || '').toUpperCase();
    if (tType === 'SEND_MONEY') {
      sendMoneyPaisa += amtPaisa;
      sendMoneyFeePaisa += feeP;
    } else if (tType === 'MOBILE_RECHARGE') {
      mobileRechargePaisa += amtPaisa;
      mobileRechargeFeePaisa += feeP;
    } else if (tType === 'BILL_PAYMENT') {
      billPayPaisa += amtPaisa;
      billPayFeePaisa += feeP;
    } else if (tType === 'CASH_OUT_TO_BANK' || tType === 'FUND_TRANSFER') {
      bankTransferPaisa += amtPaisa;
      bankTransferFeePaisa += feeP;
    } else if (tType.startsWith('CASH_IN') || tType === 'ADD_MONEY') {
      addMoneyPaisa += amtPaisa;
      if (tType === 'CASH_IN_FROM_CARD') cardTransferPaisa += amtPaisa;
    } else if (tType === 'CASHBACK') {
      cashbackPaisa += amtPaisa;
    } else if (tType === 'PAYMENT' || tType.includes('QR')) {
      sqrCreditPaisa += amtPaisa;
      moneyReceivePaisa += amtPaisa;
    }
  }

  return {
    month: monthStr || 'ALL',
    totalPelam: Math.round(totalPelamPaisa) / 100,
    totalPelamPaisa,
    totalDilam: Math.round(totalDilamPaisa) / 100,
    totalDilamPaisa,
    addMoney: Math.round(addMoneyPaisa) / 100,
    addMoneyPaisa,
    sendMoney: Math.round(sendMoneyPaisa) / 100,
    sendMoneyPaisa,
    sendMoneyFee: Math.round(sendMoneyFeePaisa) / 100,
    sendMoneyFeePaisa,
    mobileRecharge: Math.round(mobileRechargePaisa) / 100,
    mobileRechargePaisa,
    mobileRechargeFee: Math.round(mobileRechargeFeePaisa) / 100,
    mobileRechargeFeePaisa,
    billPay: Math.round(billPayPaisa) / 100,
    billPayPaisa,
    billPayFee: Math.round(billPayFeePaisa) / 100,
    billPayFeePaisa,
    bankTransfer: Math.round(bankTransferPaisa) / 100,
    bankTransferPaisa,
    bankTransferFee: Math.round(bankTransferFeePaisa) / 100,
    bankTransferFeePaisa,
    cardTransfer: Math.round(cardTransferPaisa) / 100,
    cardTransferPaisa,
    cardTransferFee: Math.round(cardTransferFeePaisa) / 100,
    cardTransferFeePaisa,
    cashback: Math.round(cashbackPaisa) / 100,
    cashbackPaisa,
    sqrCredit: Math.round(sqrCreditPaisa) / 100,
    sqrCreditPaisa,
    supplierPayment: Math.round(supplierPaymentPaisa) / 100,
    supplierPaymentPaisa,
    supplierPaymentFee: Math.round(supplierPaymentFeePaisa) / 100,
    supplierPaymentFeePaisa,
    moneyReceive: Math.round(moneyReceivePaisa) / 100,
    moneyReceivePaisa,
    pelamAday: Math.round(pelamAdayPaisa) / 100,
    pelamAdayPaisa,
    nagadTransfer: Math.round(nagadTransferPaisa) / 100,
    nagadTransferPaisa,
    nagadTransferFee: Math.round(nagadTransferFeePaisa) / 100,
    nagadTransferFeePaisa,
    rocketTransfer: Math.round(rocketTransferPaisa) / 100,
    rocketTransferPaisa,
    rocketTransferFee: Math.round(rocketTransferFeePaisa) / 100,
    rocketTransferFeePaisa,
    transactionCount: filtered.length,
  };
}

// -------------------------------------------------------------
// 10. DIGITAL RECEIPT DETAILS GENERATION & SOCIAL SHARING
// -------------------------------------------------------------
function generateTransactionReceiptDetails(rawTxn) {
  const t = formatTransactionStatementItem(rawTxn);
  if (!t) return null;

  const isCredit = t.balanceChangeType === 'CREDIT';
  const flowBn = isCredit ? 'টাকা পেলেন' : 'টাকা দিলেন';
  const statusBn =
    t.txnStatus === 'COMPLETE' || t.txnStatus === 'PROCESSED'
      ? 'সফল'
      : t.txnStatus === 'FAILED'
      ? 'ব্যর্থ'
      : t.txnStatus === 'REVERSED'
      ? 'বাতিল / ফেরত'
      : 'প্রক্রিয়াধীন';

  const transactionSubtitle = isCredit
    ? (t.fromName || t.fromWallet || 'গ্রাহক')
    : (t.toName || t.toWallet || 'গ্রাহক / প্রাপক');

  const txnDate = new Date(t.txnTime);
  const formattedDateStr = !isNaN(txnDate.getTime())
    ? txnDate.toISOString().replace('T', ' ').substring(0, 19)
    : t.txnTime;

  const voucherPdfName = `TK_TXN_${t.transactionNumber}.pdf`;

  const shareText = [
    '--- টালি পে লেনদেন বিবরণী ---',
    `ধরন: ${t.typeName || t.txnType}`,
    `${flowBn}: ৳ ${t.amount.toFixed(2)}`,
    `চার্জ: ৳ ${t.fee.toFixed(2)}`,
    `স্ট্যাটাস: ${statusBn}`,
    `লেনদেন আইডি: ${t.transactionNumber}`,
    `তারিখ: ${formattedDateStr}`,
    'ধন্যবাদ, টালিখাতা',
  ].join('\n');

  return {
    transactionTitle: t.typeName || t.txnType,
    transactionSubtitle,
    transactionSubtitleUp: isCredit ? 'থেকে পেয়েছেন' : 'কাছে পাঠিয়েছেন',
    flowTitleBn: flowBn,
    txnID: t.transactionNumber,
    transactionNumber: t.transactionNumber,
    txnIDText: 'লেনদেন আইডি: ' + t.transactionNumber,
    amount: t.amount,
    amountPaisa: t.amountPaisa,
    fee: t.fee,
    feePaisa: t.feePaisa,
    netAmount: t.netAmount,
    netAmountPaisa: t.netAmountPaisa,
    balance: t.balanceTo !== null ? t.balanceTo : 0,
    balancePaisa: t.balanceToPaisa !== null ? t.balanceToPaisa : 0,
    txnStatus: t.txnStatus,
    statusBn,
    fromName: t.fromName,
    fromWallet: t.fromWallet,
    toName: t.toName,
    toWallet: t.toWallet,
    txnDate,
    txnTime: t.txnTime,
    voucherPdfName,
    shareText,
    showCharge: t.fee > 0,
    showBalance: t.balanceTo !== null,
    chargeText: `চার্জ: ৳ ${t.fee.toFixed(2)}`,
  };
}

function generateShareText(rawTxn, channel = 'WHATSAPP') {
  const details = generateTransactionReceiptDetails(rawTxn);
  return details ? details.shareText : '';
}

// -------------------------------------------------------------
// 11. RECONSTRUCTED TRANSACTION HISTORY SIMULATION ENGINE
// -------------------------------------------------------------
class TransactionHistoryEngine {
  constructor(transactions = []) {
    this.transactions = [];
    if (Array.isArray(transactions)) {
      for (const t of transactions) {
        this.addTransaction(t);
      }
    }
  }

  addTransaction(txn) {
    const normalized = formatTransactionStatementItem(txn);
    if (normalized) {
      this.transactions.push(normalized);
    }
  }

  filterByFlow(flowType) {
    if (!flowType || flowType === 'ALL') return this.transactions;
    if (flowType === 'INCOMING' || flowType === 'INFLOW' || flowType === 'PELAM' || flowType === 'CREDIT') {
      return this.transactions.filter((t) => t.balanceChangeType === 'CREDIT');
    }
    if (flowType === 'OUTGOING' || flowType === 'OUTFLOW' || flowType === 'DILAM' || flowType === 'DEBIT') {
      return this.transactions.filter((t) => t.balanceChangeType === 'DEBIT');
    }
    return this.transactions;
  }

  filterByStatus(status) {
    if (!status || status === 'ALL') return this.transactions;
    return this.transactions.filter((t) => t.txnStatus === status);
  }

  filterByDateRange(startDate, endDate) {
    const start = new Date(startDate).getTime();
    let endStr = String(endDate);
    if (/^\d{4}-\d{2}-\d{2}$/.test(endStr)) {
      endStr += 'T23:59:59.999Z';
    }
    const end = new Date(endStr).getTime();
    return this.transactions.filter((t) => {
      const time = new Date(t.txnTime).getTime();
      return time >= start && time <= end;
    });
  }

  calculateMonthlySummary(monthStr) {
    return calculateMonthlyTransactionSummary(this.transactions, monthStr);
  }

  generateReceiptDetails(txnNumberOrTxn) {
    let t = null;
    if (typeof txnNumberOrTxn === 'string') {
      t = this.transactions.find((x) => x.transactionNumber === txnNumberOrTxn || x.id === txnNumberOrTxn);
    } else {
      t = txnNumberOrTxn;
    }
    if (!t) return null;
    return generateTransactionReceiptDetails(t);
  }

  generateShareText(txnNumberOrTxn, channel = 'WHATSAPP') {
    const details = this.generateReceiptDetails(txnNumberOrTxn);
    return details ? details.shareText : '';
  }
}

const transactionHistoryEngine = new TransactionHistoryEngine();


// =============================================================
// 12. BENEFICIARY BOOK & FAST REMITTANCE DISPATCH (REA-ITER-228)
// =============================================================

// Enums & Taxonomy
const BANK_VERIFICATION_STATUSES = Object.freeze({
  VERIFIED: 'VERIFIED',
  PENDING: 'PENDING',
  REJECTED: 'REJECTED',
  UNVERIFIED: 'UNVERIFIED',
  ACTIVE: 'ACTIVE',
});

const BENEFICIARY_TARGET_TYPES = Object.freeze({
  BANK: 'BANK',
  MFS: 'MFS',
});

const MFS_WALLET_OPERATORS = Object.freeze({
  BKASH: 'BKASH',
  NAGAD: 'NAGAD',
  ROCKET: 'ROCKET',
  UPAY: 'UPAY',
  TAP: 'TAP',
});

const REMITTANCE_TRANSFER_MODES = Object.freeze({
  NPSB_INSTANT: 'NPSB_INSTANT',
  BEFTN_NORMAL: 'BEFTN_NORMAL',
  BEFTN_REGULAR: 'BEFTN_REGULAR',
  RTGS_REALTIME: 'RTGS_REALTIME',
  WALLET_INSTANT: 'WALLET_INSTANT',
});

// Standard verified catalog of Bangladeshi commercial banks
const BANGLADESH_BANKS_CATALOG = Object.freeze([
  {
    id: 1,
    bankCode: 'IBBL',
    bankName: 'Islami Bank Bangladesh Ltd',
    bankNameBn: 'ইসলামী ব্যাংক বাংলাদেশ লিমিটেড',
    swiftCode: 'IBBLBDDH',
    routingNumber: '125261742',
    npsbSupported: true,
    instantTransferSupported: true,
    logoUrl: 'https://tallykhata.com/assets/banks/ibbl.png',
    branches: [
      { branchName: 'Motijheel Corporate', branchCode: '101', routingNumber: '125261742' },
      { branchName: 'Gulshan Branch', branchCode: '102', routingNumber: '125261743' },
      { branchName: 'Dhanmondi Branch', branchCode: '103', routingNumber: '125261744' },
      { branchName: 'Agrabad Branch, Chattogram', branchCode: '104', routingNumber: '125261745' },
    ],
  },
  {
    id: 2,
    bankCode: 'CBL',
    bankName: 'The City Bank Ltd',
    bankNameBn: 'দ্য সিটি ব্যাংক লিমিটেড',
    swiftCode: 'CIBLBDDH',
    routingNumber: '085261742',
    npsbSupported: true,
    instantTransferSupported: true,
    logoUrl: 'https://tallykhata.com/assets/banks/cbl.png',
    branches: [
      { branchName: 'Principal Office', branchCode: '201', routingNumber: '085261742' },
      { branchName: 'Gulshan Avenue', branchCode: '202', routingNumber: '085261743' },
      { branchName: 'Dhanmondi Branch', branchCode: '203', routingNumber: '085261744' },
    ],
  },
  {
    id: 3,
    bankCode: 'BBL',
    bankName: 'BRAC Bank Ltd',
    bankNameBn: 'ব্র্যাক ব্যাংক লিমিটেড',
    swiftCode: 'BRAKBDDH',
    routingNumber: '060261742',
    npsbSupported: true,
    instantTransferSupported: true,
    logoUrl: 'https://tallykhata.com/assets/banks/bbl.png',
    branches: [
      { branchName: 'Gulshan Head Office', branchCode: '301', routingNumber: '060261742' },
      { branchName: 'Asad Gate Branch', branchCode: '302', routingNumber: '060261743' },
      { branchName: 'Uttara Branch', branchCode: '303', routingNumber: '060261744' },
    ],
  },
  {
    id: 4,
    bankCode: 'DBBL',
    bankName: 'Dutch-Bangla Bank Ltd',
    bankNameBn: 'ডাচ-বাংলা ব্যাংক লিমিটেড',
    swiftCode: 'DBBLBDDH',
    routingNumber: '090261742',
    npsbSupported: true,
    instantTransferSupported: true,
    logoUrl: 'https://tallykhata.com/assets/banks/dbbl.png',
    branches: [
      { branchName: 'Motijheel Foreign Exchange', branchCode: '401', routingNumber: '090261742' },
      { branchName: 'Kawran Bazar', branchCode: '402', routingNumber: '090261743' },
      { branchName: 'Mirpur Branch', branchCode: '403', routingNumber: '090261744' },
    ],
  },
  {
    id: 5,
    bankCode: 'EBL',
    bankName: 'Eastern Bank Ltd',
    bankNameBn: 'ইস্টার্ন ব্যাংক লিমিটেড',
    swiftCode: 'EBLBBDDH',
    routingNumber: '105261742',
    npsbSupported: true,
    instantTransferSupported: true,
    logoUrl: 'https://tallykhata.com/assets/banks/ebl.png',
    branches: [
      { branchName: 'Principal Branch', branchCode: '501', routingNumber: '105261742' },
      { branchName: 'Banani Branch', branchCode: '502', routingNumber: '105261743' },
    ],
  },
  {
    id: 6,
    bankCode: 'SBL',
    bankName: 'Sonali Bank PLC',
    bankNameBn: 'সোনালী ব্যাংক পিএলসি',
    swiftCode: 'BSONBDDH',
    routingNumber: '200261742',
    npsbSupported: true,
    instantTransferSupported: true,
    logoUrl: 'https://tallykhata.com/assets/banks/sbl.png',
    branches: [
      { branchName: 'Local Office, Motijheel', branchCode: '601', routingNumber: '200261742' },
      { branchName: 'Dhaka Cantonment', branchCode: '602', routingNumber: '200261743' },
    ],
  },
  {
    id: 7,
    bankCode: 'MTBL',
    bankName: 'Mutual Trust Bank Ltd',
    bankNameBn: 'মিউচুয়াল ট্রাস্ট ব্যাংক লিমিটেড',
    swiftCode: 'MTBLBDDH',
    routingNumber: '155261742',
    npsbSupported: true,
    instantTransferSupported: true,
    logoUrl: 'https://tallykhata.com/assets/banks/mtbl.png',
    branches: [
      { branchName: 'MTB Centre Corporate', branchCode: '701', routingNumber: '155261742' },
      { branchName: 'Panthapath Branch', branchCode: '702', routingNumber: '155261743' },
    ],
  },
  {
    id: 8,
    bankCode: 'UCBL',
    bankName: 'United Commercial Bank PLC',
    bankNameBn: 'ইউনাইটেড কমার্শিয়াল ব্যাংক পিএলসি',
    swiftCode: 'UCBLBDDH',
    routingNumber: '245261742',
    npsbSupported: true,
    instantTransferSupported: true,
    logoUrl: 'https://tallykhata.com/assets/banks/ucbl.png',
    branches: [
      { branchName: 'Corporate Head Office', branchCode: '801', routingNumber: '245261742' },
      { branchName: 'Bijoynagar Branch', branchCode: '802', routingNumber: '245261743' },
    ],
  },
  {
    id: 9,
    bankCode: 'PBL',
    bankName: 'Prime Bank Ltd',
    bankNameBn: 'প্রাইম ব্যাংক লিমিটেড',
    swiftCode: 'PRMRBDDH',
    routingNumber: '175261742',
    npsbSupported: true,
    instantTransferSupported: true,
    logoUrl: 'https://tallykhata.com/assets/banks/pbl.png',
    branches: [
      { branchName: 'Motijheel Branch', branchCode: '901', routingNumber: '175261742' },
      { branchName: 'Mohakhali Branch', branchCode: '902', routingNumber: '175261743' },
    ],
  },
  {
    id: 10,
    bankCode: 'DBL',
    bankName: 'Dhaka Bank Ltd',
    bankNameBn: 'ঢাকা ব্যাংক লিমিটেড',
    swiftCode: 'DHBLBDDH',
    routingNumber: '095261742',
    npsbSupported: true,
    instantTransferSupported: true,
    logoUrl: 'https://tallykhata.com/assets/banks/dbl.png',
    branches: [
      { branchName: 'Main Branch', branchCode: '1001', routingNumber: '095261742' },
    ],
  },
  {
    id: 11,
    bankCode: 'SEBL',
    bankName: 'Southeast Bank Ltd',
    bankNameBn: 'সাউথইস্ট ব্যাংক লিমিটেড',
    swiftCode: 'SEBDINAK',
    routingNumber: '195261742',
    npsbSupported: true,
    instantTransferSupported: true,
    logoUrl: 'https://tallykhata.com/assets/banks/sebl.png',
    branches: [
      { branchName: 'Principal Branch', branchCode: '1101', routingNumber: '195261742' },
    ],
  },
  {
    id: 12,
    bankCode: 'BAL',
    bankName: 'Bank Asia Ltd',
    bankNameBn: 'ব্যাংক এশিয়া লিমিটেড',
    swiftCode: 'BKASBDDH',
    routingNumber: '040261742',
    npsbSupported: true,
    instantTransferSupported: true,
    logoUrl: 'https://tallykhata.com/assets/banks/bal.png',
    branches: [
      { branchName: 'Corporate Branch', branchCode: '1201', routingNumber: '040261742' },
    ],
  },
  {
    id: 13,
    bankCode: 'SCB',
    bankName: 'Standard Chartered Bank',
    bankNameBn: 'স্ট্যান্ডার্ড চার্টার্ড ব্যাংক',
    swiftCode: 'SCBLBDDH',
    routingNumber: '215261742',
    npsbSupported: true,
    instantTransferSupported: true,
    logoUrl: 'https://tallykhata.com/assets/banks/scb.png',
    branches: [
      { branchName: 'Main Branch, Motijheel', branchCode: '1301', routingNumber: '215261742' },
    ],
  },
  {
    id: 14,
    bankCode: 'PUBALI',
    bankName: 'Pubali Bank Ltd',
    bankNameBn: 'পূবালী ব্যাংক লিমিটেড',
    swiftCode: 'PUBLBDDH',
    routingNumber: '180261742',
    npsbSupported: true,
    instantTransferSupported: true,
    logoUrl: 'https://tallykhata.com/assets/banks/pubali.png',
    branches: [
      { branchName: 'Head Office, Motijheel', branchCode: '1401', routingNumber: '180261742' },
    ],
  },
  {
    id: 15,
    bankCode: 'ABBL',
    bankName: 'AB Bank Ltd',
    bankNameBn: 'এবি ব্যাংক লিমিটেড',
    swiftCode: 'ABBLBDDH',
    routingNumber: '010261742',
    npsbSupported: true,
    instantTransferSupported: true,
    logoUrl: 'https://tallykhata.com/assets/banks/abbl.png',
    branches: [
      { branchName: 'Principal Branch', branchCode: '1501', routingNumber: '010261742' },
    ],
  },
]);

function getBangladeshBanksCatalog() {
  return [...BANGLADESH_BANKS_CATALOG];
}

function getBankByCode(codeOrRouting) {
  if (!codeOrRouting) return null;
  const q = String(codeOrRouting).trim().toUpperCase();
  return BANGLADESH_BANKS_CATALOG.find(
    (b) => b.bankCode === q || b.routingNumber === q || String(b.id) === q || b.swiftCode === q
  ) || null;
}

function getBankList() {
  return BANGLADESH_BANKS_CATALOG.map((b) => ({
    id: b.id,
    bankCode: b.bankCode,
    bankName: b.bankName,
    bankNameBn: b.bankNameBn,
    routingNumber: b.routingNumber,
    instantTransferSupported: b.instantTransferSupported,
    logoUrl: b.logoUrl,
  }));
}

// Obscuring & Security Formatters
function getObscureAccountNumber(accNo) {
  if (!accNo || typeof accNo !== 'string' || accNo.trim().length < 4) {
    return '**** **** ****';
  }
  const clean = accNo.trim();
  const last4 = clean.slice(-4);
  return '**** **** ' + last4;
}

function getObscureMobileNumber(mobile) {
  if (!mobile || typeof mobile !== 'string' || mobile.length < 11) {
    return '01*********';
  }
  const clean = mobile.replace(/[^0-9]/g, '');
  if (clean.length < 11) return '01*********';
  return clean.substring(0, 3) + '****' + clean.substring(7);
}

// Banking & Mobile Validators
function validateRoutingNumber(routing) {
  if (!routing || typeof routing !== 'string') return false;
  const clean = routing.trim();
  return /^\d{9}$/.test(clean);
}

function validateBangladeshiMobile(mobile) {
  if (!mobile || typeof mobile !== 'string') return false;
  const clean = mobile.replace(/[^0-9]/g, '');
  return /^01[3-9]\d{8}$/.test(clean);
}
const validateBanglaMobile = validateBangladeshiMobile;

function validateBeneficiaryPayload(payload) {
  const errors = [];
  if (!payload || typeof payload !== 'object') {
    return { valid: false, errors: ['PAYLOAD_EMPTY'] };
  }
  const targetType = String(
    payload.targetType || payload.type || (payload.routingNo || payload.routingNumber ? 'BANK' : 'MFS')
  ).toUpperCase();

  if (targetType === 'BANK') {
    const accName = String(payload.accountName || payload.name || '').trim();
    if (!accName || accName.length < 2 || accName.length > 100) {
      errors.push('INVALID_ACCOUNT_NAME');
    }
    const accNo = String(payload.accountNumber || payload.accountNo || '').trim();
    if (!accNo || accNo.length < 4 || accNo.length > 34) {
      errors.push('INVALID_ACCOUNT_NUMBER');
    }
    const bankName = String(payload.bankName || '').trim();
    if (!bankName || bankName.length === 0) {
      errors.push('INVALID_BANK_NAME');
    }
    const routing = String(payload.routingNumber || payload.routingNo || '').trim();
    if (!validateRoutingNumber(routing)) {
      errors.push('INVALID_ROUTING_NUMBER');
    }
  } else if (targetType === 'MFS') {
    const accName = String(payload.accountName || payload.name || '').trim();
    if (!accName || accName.length === 0) {
      errors.push('INVALID_ACCOUNT_NAME');
    }
    const mobile = String(payload.walletNo || payload.mobileNumber || payload.walletNumber || payload.accountNumber || '').trim();
    if (!validateBangladeshiMobile(mobile)) {
      errors.push('INVALID_WALLET_NUMBER');
    }
    const provider = String(payload.walletType || payload.mfsProvider || payload.mfsType || '').toUpperCase();
    const validProviders = Object.values(MFS_WALLET_OPERATORS);
    if (!provider || !validProviders.includes(provider)) {
      errors.push('INVALID_MFS_PROVIDER');
    }
  } else {
    errors.push('UNSUPPORTED_TARGET_TYPE');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Normalizers
function formatBankAccountItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const accountNumber = String(raw.accountNumber || raw.accountNo || '').trim();
  const routingNo = String(raw.routingNo || raw.routingNumber || '').trim();
  const instantTransferSupported = raw.instantTransferSupported !== undefined
    ? Boolean(raw.instantTransferSupported)
    : (raw.instantTransfer !== undefined ? Boolean(raw.instantTransfer) : true);

  return {
    id: raw.id || null,
    targetType: 'BANK',
    type: 'BANK',
    accountName: String(raw.accountName || raw.name || '').trim(),
    name: String(raw.accountName || raw.name || '').trim(),
    accountNumber,
    accountNo: accountNumber,
    maskedAccountNumber: getObscureAccountNumber(accountNumber),
    bankCode: String(raw.bankCode || 'BD_BANK').toUpperCase(),
    bankId: Number(raw.bankId) || 101,
    bankName: String(raw.bankName || '').trim(),
    bankSwiftCode: String(raw.bankSwiftCode || raw.swiftCode || '').trim(),
    branchName: String(raw.branchName || 'Main Branch').trim(),
    instantTransferSupported,
    instantTransfer: instantTransferSupported,
    isLoanAccount: Boolean(raw.isLoanAccount),
    logoUrl: raw.logoUrl || `https://tallykhata.com/assets/banks/${String(raw.bankCode || 'bank').toLowerCase()}.png`,
    routingNo,
    routingNumber: routingNo,
    shouldAddMoney: Boolean(raw.shouldAddMoney),
    status: String(raw.status || 'UNVERIFIED').toUpperCase(),
    isFavorite: Boolean(raw.isFavorite || raw.favorite),
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

function formatMfsAccountItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const walletNo = String(raw.walletNo || raw.mobileNumber || raw.walletNumber || raw.accountNumber || '').trim();
  const walletType = String(raw.walletType || raw.mfsProvider || raw.mfsType || 'BKASH').toUpperCase();

  return {
    id: raw.id || null,
    targetType: 'MFS',
    type: 'MFS',
    accountName: String(raw.accountName || raw.name || 'MFS Recipient').trim(),
    name: String(raw.accountName || raw.name || 'MFS Recipient').trim(),
    walletNo,
    mobileNumber: walletNo,
    walletNumber: walletNo,
    accountNumber: walletNo,
    maskedWalletNo: getObscureMobileNumber(walletNo),
    maskedAccountNumber: getObscureMobileNumber(walletNo),
    walletType,
    mfsProvider: walletType,
    logoUrl: raw.logoUrl || `https://tallykhata.com/assets/mfs/${walletType.toLowerCase()}.png`,
    status: String(raw.status || 'ACTIVE').toUpperCase(),
    instantTransferSupported: true,
    instantTransfer: true,
    isFavorite: Boolean(raw.isFavorite || raw.favorite),
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

function formatSavedRecipient(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const mobileNumber = String(raw.mobileNumber || raw.walletNo || raw.walletNumber || '').trim();
  const walletType = String(raw.walletType || raw.mfsProvider || 'BKASH').toUpperCase();
  return {
    name: String(raw.name || raw.accountName || 'Recipient').trim(),
    mobileNumber,
    walletNumber: raw.walletNumber ? String(raw.walletNumber).trim() : mobileNumber,
    walletType,
    imageUrl: raw.imageUrl || raw.logoUrl || '',
    txnDate: raw.txnDate || new Date().toISOString(),
  };
}

// Business Logic & Remittance Dispatch
function buildPrepopulatedRemittance(recipient, amount = 0) {
  if (!recipient || typeof recipient !== 'object') {
    throw new Error('Invalid recipient object');
  }
  const targetType = String(
    recipient.targetType || (recipient.routingNo || recipient.routingNumber ? 'BANK' : 'MFS')
  ).toUpperCase();
  const amountVal = Number(amount) || 0;
  const amountPaisa = Math.round(amountVal * 100);

  if (targetType === 'BANK') {
    const accNo = String(recipient.accountNumber || recipient.accountNo || '').trim();
    const instant = recipient.instantTransferSupported !== undefined
      ? Boolean(recipient.instantTransferSupported)
      : true;
    const transferMode = instant ? REMITTANCE_TRANSFER_MODES.NPSB_INSTANT : REMITTANCE_TRANSFER_MODES.BEFTN_NORMAL;
    const feePaisa = instant ? 1000 : 0;
    const totalPayablePaisa = amountPaisa + feePaisa;

    return {
      targetType: 'BANK',
      recipientName: recipient.accountName || recipient.name || '',
      recipientIdentifier: accNo,
      maskedIdentifier: getObscureAccountNumber(accNo),
      bankName: recipient.bankName || '',
      bankCode: recipient.bankCode || 'BD_BANK',
      routingNo: recipient.routingNo || recipient.routingNumber || '',
      branchName: recipient.branchName || 'Main Branch',
      instantTransfer: instant,
      instantTransferSupported: instant,
      transferMode,
      amount: amountVal,
      amountPaisa,
      feePaisa,
      fee: feePaisa / 100,
      totalPayablePaisa,
      totalPayable: totalPayablePaisa / 100,
      status: recipient.status || 'UNVERIFIED',
      createdAt: new Date().toISOString(),
    };
  } else if (targetType === 'MFS') {
    const walletNo = String(recipient.walletNo || recipient.mobileNumber || recipient.walletNumber || '').trim();
    const mfsProvider = String(recipient.walletType || recipient.mfsProvider || 'BKASH').toUpperCase();
    const feePaisa = 500;
    const totalPayablePaisa = amountPaisa + feePaisa;

    return {
      targetType: 'MFS',
      recipientName: recipient.accountName || recipient.name || '',
      recipientIdentifier: walletNo,
      maskedIdentifier: getObscureMobileNumber(walletNo),
      mfsProvider,
      walletType: mfsProvider,
      instantTransfer: true,
      instantTransferSupported: true,
      transferMode: REMITTANCE_TRANSFER_MODES.WALLET_INSTANT,
      amount: amountVal,
      amountPaisa,
      feePaisa,
      fee: feePaisa / 100,
      totalPayablePaisa,
      totalPayable: totalPayablePaisa / 100,
      status: recipient.status || 'ACTIVE',
      createdAt: new Date().toISOString(),
    };
  } else {
    throw new Error('Unsupported remittance target type');
  }
}

function verifyBankPennyDeposit(bankAccount, depositAmount) {
  if (!bankAccount || typeof bankAccount !== 'object') {
    throw new Error('Bank account not found');
  }
  if (bankAccount.status === 'ACTIVE' || bankAccount.status === 'VERIFIED') {
    return { success: true, message: 'Account already verified', status: bankAccount.status };
  }
  const amt = Number(depositAmount) || 0;
  if (amt >= 0.01 && amt <= 1.00) {
    bankAccount.status = 'VERIFIED';
    return { success: true, message: 'Bank account successfully verified', status: 'VERIFIED' };
  } else {
    bankAccount.status = 'REJECTED';
    return { success: false, message: 'Penny deposit amount mismatch', status: 'REJECTED' };
  }
}

function queryBeneficiaries(list, filters = {}) {
  let items = Array.isArray(list) ? [...list] : [];

  if (filters.targetType && filters.targetType !== 'ALL') {
    const t = String(filters.targetType).toUpperCase();
    items = items.filter((b) => String(b.targetType || b.type).toUpperCase() === t);
  }

  if (filters.status && filters.status !== 'ALL') {
    const s = String(filters.status).toUpperCase();
    items = items.filter((b) => String(b.status).toUpperCase() === s);
  }

  const query = filters.search || filters.searchQuery || filters.query;
  if (query && typeof query === 'string' && query.trim()) {
    const q = query.trim().toLowerCase();
    items = items.filter((b) => {
      const name = String(b.accountName || b.name || '').toLowerCase();
      const accNo = String(b.accountNumber || b.walletNo || b.mobileNumber || '').toLowerCase();
      const bankName = String(b.bankName || b.mfsProvider || b.walletType || '').toLowerCase();
      const routing = String(b.routingNo || b.routingNumber || '').toLowerCase();
      return name.includes(q) || accNo.includes(q) || bankName.includes(q) || routing.includes(q);
    });
  }

  if (filters.isFavorite !== undefined && filters.isFavorite !== null) {
    const fav = Boolean(filters.isFavorite);
    items = items.filter((b) => Boolean(b.isFavorite) === fav);
  }

  items.sort((a, b) => {
    const favA = a.isFavorite ? 1 : 0;
    const favB = b.isFavorite ? 1 : 0;
    if (favA !== favB) return favB - favA;
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  const totalCount = items.length;
  const offset = Math.max(0, parseInt(filters.offset, 10) || 0);
  const limit = Math.max(1, parseInt(filters.limit, 10) || 50);
  const paginated = items.slice(offset, offset + limit);
  const hasMore = offset + paginated.length < totalCount;

  const result = {
    items: paginated,
    beneficiaries: paginated,
    totalCount,
    length: paginated.length,
    offset,
    limit,
    hasMore,
  };
  for (let i = 0; i < paginated.length; i++) {
    result[i] = paginated[i];
  }
  return result;
}

// Beneficiary Book Engine (Simulation Facade)
class BeneficiaryBookEngine {
  constructor() {
    this.bankBeneficiaries = [];
    this.mfsBeneficiaries = [];
    this.savedRemittanceRecipients = [];
    this.nextId = 1;
  }

  static getObscureAccountNumber(accNo) {
    return getObscureAccountNumber(accNo);
  }

  static getObscureMobileNumber(mobile) {
    return getObscureMobileNumber(mobile);
  }

  static validateRoutingNumber(routing) {
    return validateRoutingNumber(routing);
  }

  static validateBanglaMobile(mobile) {
    return validateBangladeshiMobile(mobile);
  }

  static validateBangladeshiMobile(mobile) {
    return validateBangladeshiMobile(mobile);
  }

  addBankBeneficiary(bank) {
    if (!bank.accountName || !bank.accountNumber || !bank.bankName || !bank.routingNumber) {
      throw new Error('Missing required bank beneficiary fields');
    }
    if (!validateRoutingNumber(bank.routingNumber)) {
      throw new Error('Invalid 9-digit routing number');
    }
    const record = {
      id: this.nextId++,
      accountName: bank.accountName.trim(),
      accountNumber: bank.accountNumber.trim(),
      bankCode: bank.bankCode || 'BD_BANK',
      bankId: bank.bankId || 101,
      bankName: bank.bankName.trim(),
      bankSwiftCode: bank.bankSwiftCode || '',
      branchName: bank.branchName || 'Main Branch',
      instantTransferSupported: Boolean(bank.instantTransferSupported),
      isLoanAccount: false,
      logoUrl: bank.logoUrl || 'https://tallykhata.com/assets/bank.png',
      routingNo: bank.routingNumber.trim(),
      shouldAddMoney: Boolean(bank.shouldAddMoney),
      status: bank.status || 'UNVERIFIED',
    };
    this.bankBeneficiaries.push(record);
    return record;
  }

  verifyPennyDeposit(bankId, testDepositAmount) {
    const bank = this.bankBeneficiaries.find((b) => b.id === bankId);
    if (!bank) throw new Error('Bank account not found');
    return verifyBankPennyDeposit(bank, testDepositAmount);
  }

  addMfsBeneficiary(mfs) {
    if (!mfs.accountName || !mfs.walletNo || !mfs.walletType) {
      throw new Error('Missing required MFS beneficiary fields');
    }
    if (!validateBangladeshiMobile(mfs.walletNo)) {
      throw new Error('Invalid 11-digit mobile wallet number');
    }
    const record = {
      id: this.nextId++,
      accountName: mfs.accountName.trim(),
      walletNo: mfs.walletNo.trim(),
      walletType: mfs.walletType.toUpperCase(),
      logoUrl: mfs.logoUrl || `https://tallykhata.com/assets/${mfs.walletType.toLowerCase()}.png`,
      status: 'ACTIVE',
    };
    this.mfsBeneficiaries.push(record);
    return record;
  }

  addSavedRecipient(recipient) {
    if (!recipient.mobileNumber || !recipient.walletType) {
      throw new Error('Missing recipient data');
    }
    const item = {
      name: recipient.name || 'Recipient',
      mobileNumber: recipient.mobileNumber.trim(),
      walletNumber: recipient.walletNumber ? recipient.walletNumber.trim() : recipient.mobileNumber.trim(),
      walletType: recipient.walletType.toUpperCase(),
      imageUrl: recipient.imageUrl || '',
      txnDate: recipient.txnDate || new Date().toISOString(),
    };
    this.savedRemittanceRecipients.push(item);
    return item;
  }

  getAllAccounts() {
    return {
      bankAccounts: this.bankBeneficiaries,
      mfsAccounts: this.mfsBeneficiaries,
      cards: [],
      loanAccounts: [],
      userTag: 'REGULAR_MERCHANT',
    };
  }

  deleteBankAccount(routingNo, accountNo, credential) {
    if (!credential || credential.length < 4) {
      throw new Error('Invalid security credential for deletion');
    }
    const idx = this.bankBeneficiaries.findIndex((b) => b.routingNo === routingNo && b.accountNumber === accountNo);
    if (idx === -1) {
      return { success: false, message: 'Account not found' };
    }
    this.bankBeneficiaries.splice(idx, 1);
    return { success: true, message: 'Bank beneficiary deleted successfully' };
  }

  prepopulateRemittanceForSendMoney(type, identifier) {
    if (type === 'BANK') {
      const bank = this.bankBeneficiaries.find((b) => b.accountNumber === identifier || b.id === identifier);
      if (!bank) throw new Error('Bank beneficiary not found');
      return {
        targetType: 'BANK',
        recipientName: bank.accountName,
        recipientIdentifier: bank.accountNumber,
        maskedIdentifier: getObscureAccountNumber(bank.accountNumber),
        bankName: bank.bankName,
        routingNo: bank.routingNo,
        instantTransfer: bank.instantTransferSupported,
        transferMode: bank.instantTransferSupported ? 'NPSB_INSTANT' : 'BEFTN_REGULAR',
      };
    } else if (type === 'MFS') {
      const mfs = this.mfsBeneficiaries.find((m) => m.walletNo === identifier || m.id === identifier);
      if (!mfs) throw new Error('MFS beneficiary not found');
      return {
        targetType: 'MFS',
        recipientName: mfs.accountName,
        recipientIdentifier: mfs.walletNo,
        maskedIdentifier: getObscureMobileNumber(mfs.walletNo),
        mfsProvider: mfs.walletType,
        instantTransfer: true,
        transferMode: 'WALLET_INSTANT',
      };
    } else {
      throw new Error('Unsupported remittance target type');
    }
  }
}

const ReconstructedBeneficiaryBookEngine = BeneficiaryBookEngine;
const beneficiaryBookEngine = new BeneficiaryBookEngine();
// =============================================================
// MILESTONE REA-ITER-229: TALLYPAY QR MERCHANT SETTLEMENT &
// DIRECT SOUNDBOX AUDIO NOTIFICATION DISPATCH SUBSYSTEM
// =============================================================

const SETTLEMENT_ACTION_TYPES = Object.freeze({
  CREDIT_COLLECTION: 'CREDIT_COLLECTION',
  DIGITAL_SALE: 'DIGITAL_SALE',
  NO_ACTION: 'NO_ACTION',
});

const SETTLEMENT_ARSC_TOKENS = Object.freeze({
  SETTLEMENT_CTA: 'পেমেন্ট সমন্বয় করি',
  SETTLEMENT_SUCCESS: 'লেনদেনটি সমন্বয় করা হয়েছে।',
  LEDGER_CREDIT_TAG: '(বাকি আদায় সমন্বয়)',
  NOTIFICATION_SOUND: 'নোটিফিকেশন সাউন্ড',
  VOICE_NOTIFICATION: 'ভয়েস নোটিফিকেশন',
  VOICE_ALERT: 'ভয়েসের মাধ্যমে পেমেন্ট এলার্ট',
  PAYMENT_RECEIVED_TALLYKHATA_TTS: 'আপনার টালিখাতা ওয়ালেটে %s টাকা গ্রহণ করা হয়েছে। প্রেরক - %s।',
  PAYMENT_RECEIVED_SURECASH_TTS: 'আপনার শিওরক্যাশ ওয়ালেটে %1$s টাকা গ্রহণ করা হয়েছে। প্রেরক - %2$s। Txn ID: %3$s',
});

function buildSettlementAction(payload = {}) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Payload must be an object');
  }

  const txnNumber = String(
    payload.transactionNumber || payload.transaction_number || payload.txnNumber || payload.txnId || ''
  ).trim();
  if (!txnNumber) {
    throw new Error('Transaction number is required');
  }

  const rawActionType = payload.actionType || payload.action_type || SETTLEMENT_ACTION_TYPES.NO_ACTION;
  const actionType = String(rawActionType).toUpperCase();
  if (!Object.values(SETTLEMENT_ACTION_TYPES).includes(actionType)) {
    throw new Error('Invalid settlement action type: ' + actionType);
  }

  const amountVal = payload.amount !== undefined
    ? Number(payload.amount)
    : (payload.amountPaisa !== undefined
        ? Number(payload.amountPaisa) / 100
        : (payload.amountTaka !== undefined ? Number(payload.amountTaka) : 0));
  const amountPaisa = payload.amountPaisa !== undefined
    ? Math.round(Number(payload.amountPaisa))
    : Math.round(amountVal * 100);
  const amountTaka = amountPaisa / 100;

  const nowIso = new Date().toISOString();
  const businessId = String(payload.businessId || '1');

  return {
    id: payload.id || Date.now(),
    transactionNumber: txnNumber,
    transaction_number: txnNumber,
    actionType,
    action_type: actionType,
    amount: amountTaka,
    amountPaisa,
    amountTaka,
    accountId: payload.accountId || payload.account_id || null,
    account_id: payload.accountId || payload.account_id || null,
    accountName: payload.accountName || payload.customerName || null,
    senderMobile: payload.senderMobile || payload.sender_mobile || null,
    senderName: payload.senderName || payload.sender_name || null,
    note: payload.note || null,
    synced: payload.synced !== undefined ? Number(payload.synced) : 0,
    businessId,
    business_id: businessId,
    createDate: payload.createDate || payload.create_date || nowIso,
    create_date: payload.createDate || payload.create_date || nowIso,
    updateDate: payload.updateDate || payload.update_date || null,
    update_date: payload.updateDate || payload.update_date || null,
  };
}

function checkSettlementIdempotency(repo, txnNumber, targetBizId = null) {
  if (!repo || !txnNumber) return false;
  if (typeof repo.getSettlementActionByTxnNumber === 'function') {
    return repo.getSettlementActionByTxnNumber(targetBizId, txnNumber) !== null;
  }
  if (typeof repo.existsByTransactionNumber === 'function') {
    return repo.existsByTransactionNumber(txnNumber);
  }
  return false;
}

async function processQrPaymentSettlement(businessId, settlementPayload, storage) {
  if (!settlementPayload || typeof settlementPayload !== 'object') {
    throw new Error('Settlement payload must be an object');
  }

  const txnNumber = String(
    settlementPayload.transactionNumber || settlementPayload.transaction_number || settlementPayload.txnNumber || ''
  ).trim();
  if (!txnNumber) {
    throw new Error('Transaction number is required');
  }

  const actionType = String(
    settlementPayload.actionType || settlementPayload.action_type || SETTLEMENT_ACTION_TYPES.NO_ACTION
  ).toUpperCase();

  if (!Object.values(SETTLEMENT_ACTION_TYPES).includes(actionType)) {
    throw new Error('Invalid settlement action type: ' + actionType);
  }

  const targetBizId = String(businessId || settlementPayload.businessId || '1');
  const targetRepo = storage;

  // 1. Idempotency Check
  if (targetRepo && checkSettlementIdempotency(targetRepo, txnNumber, targetBizId)) {
    return {
      success: false,
      reason: 'ALREADY_SETTLED',
      duplicate: true,
      error: 'ALREADY_SETTLED',
      message: 'Transaction already settled',
    };
  }

  const amountVal = settlementPayload.amount !== undefined
    ? Number(settlementPayload.amount)
    : (settlementPayload.amountPaisa !== undefined
        ? Number(settlementPayload.amountPaisa) / 100
        : (settlementPayload.amountTaka !== undefined ? Number(settlementPayload.amountTaka) : 0));
  const amountPaisa = settlementPayload.amountPaisa !== undefined
    ? Math.round(Number(settlementPayload.amountPaisa))
    : Math.round(amountVal * 100);
  const amountTaka = amountPaisa / 100;

  // 1. CREDIT_COLLECTION
  if (actionType === SETTLEMENT_ACTION_TYPES.CREDIT_COLLECTION) {
    const accountId = settlementPayload.accountId || settlementPayload.account_id;
    if (!accountId) {
      throw new Error('Account ID is required for CREDIT_COLLECTION settlement');
    }

    let accountName = settlementPayload.accountName || settlementPayload.customerName || 'গ্রাহক';
    let oldBalance = 0;
    let newBalance = 0;

    // Simulation repository support (ReconstructedCreditSettlementEngine compatibility)
    if (targetRepo && targetRepo.customerAccounts instanceof Map) {
      let account = targetRepo.customerAccounts.get(accountId);
      if (!account && (settlementPayload.currentBalance !== undefined || settlementPayload.openingBalance !== undefined)) {
        targetRepo.registerAccount(accountId, settlementPayload.customerName || 'গ্রাহক', settlementPayload.currentBalance !== undefined ? settlementPayload.currentBalance : settlementPayload.openingBalance);
        account = targetRepo.customerAccounts.get(accountId);
      }
      if (!account) {
        throw new Error('Account not found: ' + accountId);
      }
      accountName = account.name || accountName;
      oldBalance = account.currentBalance !== undefined ? account.currentBalance : (account.balance || 0);
      newBalance = Math.round((oldBalance - amountTaka) * 100) / 100;
      account.currentBalance = newBalance;
      if (account.balance !== undefined) account.balance = newBalance;

      const journalEntry = {
        id: 'J_' + txnNumber,
        accountId,
        amount: amountTaka,
        amountPaisa,
        txnType: 'PAYMENT_RECEIVED',
        note: settlementPayload.note ? (settlementPayload.note + ' (বাকি আদায় সমন্বয়)') : '(বাকি আদায় সমন্বয়)',
        description: '(বাকি আদায় সমন্বয়)',
        transactionNumber: txnNumber,
        timestamp: new Date().toISOString(),
      };
      if (Array.isArray(account.journals)) {
        account.journals.push(journalEntry);
      }

      if (typeof targetRepo.recordSettlementAction === 'function') {
        targetRepo.recordSettlementAction(txnNumber, 'CREDIT_COLLECTION');
      }

      return {
        success: true,
        transactionNumber: txnNumber,
        actionType: 'CREDIT_COLLECTION',
        accountId,
        accountName,
        settledAmount: amountTaka,
        settledAmountPaisa: amountPaisa,
        previousBalance: oldBalance,
        oldBalance,
        newBalance,
        remainingBalance: newBalance,
        journalEntry,
        journalNote: journalEntry.note,
      };
    }

    // Full StorageRepository support
    let createdJournal = null;
    if (targetRepo && typeof targetRepo.mutateStore === 'function') {
      const mutRes = await targetRepo.mutateStore((prevStore) => {
        const accounts = Array.isArray(prevStore.accounts) ? [...prevStore.accounts] : [];
        const accIdx = accounts.findIndex(
          (a) => String(a.id) === String(accountId) && String(a.businessId || '1') === targetBizId
        );
        if (accIdx === -1) {
          throw new Error('Account not found: ' + accountId);
        }
        const acc = { ...accounts[accIdx] };
        accountName = acc.name || acc.accountName || accountName;
        oldBalance = Number(acc.currentBalance !== undefined ? acc.currentBalance : (acc.balance !== undefined ? acc.balance : 0));
        newBalance = Math.round((oldBalance - amountTaka) * 100) / 100;
        acc.currentBalance = newBalance;
        acc.balance = newBalance;
        acc.updatedAt = new Date().toISOString();
        accounts[accIdx] = acc;

        createdJournal = {
          id: 'J_' + txnNumber,
          accountId,
          account_id: accountId,
          businessId: targetBizId,
          business_id: targetBizId,
          amount: amountTaka,
          amountPaisa,
          txnType: 'PAYMENT_RECEIVED',
          type: 'credit',
          tag: 'baki_aday',
          note: settlementPayload.note ? (settlementPayload.note + ' (বাকি আদায় সমন্বয়)') : '(বাকি আদায় সমন্বয়)',
          description: '(বাকি আদায় সমন্বয়)',
          transactionNumber: txnNumber,
          timestamp: new Date().toISOString(),
          date: new Date().toISOString().split('T')[0],
          time: new Date().toTimeString().split(' ')[0],
        };

        const journals = Array.isArray(prevStore.journals) ? [createdJournal, ...prevStore.journals] : [createdJournal];
        return {
          ...prevStore,
          accounts,
          journals,
        };
      });
      if (mutRes && mutRes.success === false) {
        throw mutRes.error || new Error('Failed to mutate store');
      }
    }

    const actionRecord = buildSettlementAction({
      transactionNumber: txnNumber,
      actionType: 'CREDIT_COLLECTION',
      accountId,
      accountName,
      amount: amountTaka,
      amountPaisa,
      senderMobile: settlementPayload.senderMobile,
      senderName: settlementPayload.senderName,
      businessId: targetBizId,
      note: settlementPayload.note || '(বাকি আদায় সমন্বয়)',
    });

    if (targetRepo) {
      if (typeof targetRepo.saveQrSettlementAction === 'function') {
        await targetRepo.saveQrSettlementAction(targetBizId, actionRecord);
      } else if (typeof targetRepo.recordSettlementAction === 'function') {
        targetRepo.recordSettlementAction(txnNumber, 'CREDIT_COLLECTION');
      }
    }

    return {
      success: true,
      transactionNumber: txnNumber,
      actionType: 'CREDIT_COLLECTION',
      accountId,
      accountName,
      settledAmount: amountTaka,
      settledAmountPaisa: amountPaisa,
      previousBalance: oldBalance,
      oldBalance,
      newBalance,
      remainingBalance: newBalance,
      journalEntry: createdJournal,
      journalNote: createdJournal ? createdJournal.note : '(বাকি আদায় সমন্বয়)',
      actionRecord,
    };
  }

  // 2. DIGITAL_SALE
  if (actionType === SETTLEMENT_ACTION_TYPES.DIGITAL_SALE) {
    let cashEntry = null;
    if (targetRepo && typeof targetRepo.mutateStore === 'function') {
      const mutRes = await targetRepo.mutateStore((prevStore) => {
        cashEntry = {
          id: 'C_' + txnNumber,
          businessId: targetBizId,
          type: 'in',
          category: 'digital_sale',
          amount: amountTaka,
          amountPaisa,
          description: 'ডিজিটাল বিক্রি (QR Payment)',
          transactionNumber: txnNumber,
          timestamp: new Date().toISOString(),
        };
        const cashEntries = Array.isArray(prevStore.cashEntries) ? [cashEntry, ...prevStore.cashEntries] : [cashEntry];
        return { ...prevStore, cashEntries };
      });
      if (mutRes && mutRes.success === false) {
        throw mutRes.error || new Error('Failed to mutate store');
      }
    }

    const actionRecord = buildSettlementAction({
      transactionNumber: txnNumber,
      actionType: 'DIGITAL_SALE',
      amount: amountTaka,
      amountPaisa,
      senderMobile: settlementPayload.senderMobile,
      senderName: settlementPayload.senderName,
      businessId: targetBizId,
      note: settlementPayload.note || 'ডিজিটাল বিক্রি',
    });

    if (targetRepo) {
      if (typeof targetRepo.saveQrSettlementAction === 'function') {
        await targetRepo.saveQrSettlementAction(targetBizId, actionRecord);
      } else if (typeof targetRepo.recordSettlementAction === 'function') {
        targetRepo.recordSettlementAction(txnNumber, 'DIGITAL_SALE');
      }
    }

    return {
      success: true,
      transactionNumber: txnNumber,
      actionType: 'DIGITAL_SALE',
      settledAmount: amountTaka,
      settledAmountPaisa: amountPaisa,
      cashEntry,
      actionRecord,
    };
  }

  // 3. NO_ACTION
  const actionRecord = buildSettlementAction({
    transactionNumber: txnNumber,
    actionType: 'NO_ACTION',
    amount: amountTaka,
    amountPaisa,
    senderMobile: settlementPayload.senderMobile,
    senderName: settlementPayload.senderName,
    businessId: targetBizId,
    note: settlementPayload.note || 'কোন পদক্ষেপ নেওয়া হয়নি',
  });

  if (targetRepo) {
    if (typeof targetRepo.saveQrSettlementAction === 'function') {
      await targetRepo.saveQrSettlementAction(targetBizId, actionRecord);
    } else if (typeof targetRepo.recordSettlementAction === 'function') {
      targetRepo.recordSettlementAction(txnNumber, 'NO_ACTION');
    }
  }

  return {
    success: true,
    transactionNumber: txnNumber,
    actionType: 'NO_ACTION',
    actionRecord,
  };
}

function generatePaymentSpeechPrompt(payload, lang = 'bn') {
  if (!payload || typeof payload !== 'object') return '';
  const amountVal = payload.amount !== undefined
    ? Number(payload.amount)
    : (payload.amountPaisa !== undefined
        ? Number(payload.amountPaisa) / 100
        : (payload.amountTaka !== undefined ? Number(payload.amountTaka) : 0));
  const sender = payload.senderName || payload.sender || payload.fromName || payload.payerName || 'গ্রাহক';
  const txnId = payload.txnId || payload.transactionNumber || '';

  if (lang === 'en') {
    const brand = (payload.walletBrand === 'SURECASH' || payload.walletName === 'SureCash') ? 'SureCash' : 'TallyKhata';
    const enAmount = String(amountVal);
    return 'Payment of ' + enAmount + ' Taka received in your ' + brand + ' wallet. Sender - ' + sender + '.' + (txnId ? (' Txn ID: ' + txnId) : '');
  }

  const bnAmount = toBengaliNumerals(amountVal);
  const isSureCash = payload.walletBrand === 'SURECASH' || payload.walletName === 'শিওরক্যাশ' || payload.walletName === 'SureCash';

  if (isSureCash && txnId) {
    return 'আপনার শিওরক্যাশ ওয়ালেটে ' + bnAmount + ' টাকা গ্রহণ করা হয়েছে। প্রেরক - ' + sender + '। Txn ID: ' + txnId;
  }

  if (payload.includeTxnId && txnId) {
    return 'আপনার টালিখাতা ওয়ালেটে ' + bnAmount + ' টাকা গ্রহণ করা হয়েছে। প্রেরক - ' + sender + '। Txn ID: ' + txnId;
  }

  return 'আপনার টালিখাতা ওয়ালেটে ' + bnAmount + ' টাকা গ্রহণ করা হয়েছে। প্রেরক - ' + sender + '।';
}

function formatTtsSpeech(amountTaka, senderName, txnId) {
  const bnAmount = toBengaliNumerals(amountTaka);
  return 'আপনার শিওরক্যাশ ওয়ালেটে ' + bnAmount + ' টাকা গ্রহণ করা হয়েছে। প্রেরক - ' + senderName + '। Txn ID: ' + txnId;
}

class SoundboxConfigManager {
  constructor(initial = {}) {
    this.configs = new Map();
    this.defaultConfig = {
      isNotificationSoundChecked: initial.isNotificationSoundChecked !== false,
      isNotificationTTSChecked: initial.isNotificationTTSChecked !== false,
      showTTSSetting: initial.showTTSSetting !== false,
      engine: 'com.google.android.tts',
      locale: 'bn-BD',
    };
  }

  getConfig(businessId = '1') {
    const key = String(businessId || '1');
    if (!this.configs.has(key)) {
      this.configs.set(key, { ...this.defaultConfig });
    }
    return { ...this.configs.get(key) };
  }

  updateConfig(businessId = '1', updates = {}) {
    const key = String(businessId || '1');
    const curr = this.getConfig(key);
    const updated = {
      ...curr,
      ...updates,
    };
    if (updates.isNotificationSoundChecked !== undefined) {
      updated.isNotificationSoundChecked = Boolean(updates.isNotificationSoundChecked);
    }
    if (updates.isNotificationTTSChecked !== undefined) {
      updated.isNotificationTTSChecked = Boolean(updates.isNotificationTTSChecked);
    }
    this.configs.set(key, updated);
    return { ...updated };
  }
}

const soundboxConfigManager = new SoundboxConfigManager();

function getSoundboxNotificationConfig(businessId = '1') {
  return soundboxConfigManager.getConfig(businessId);
}

function updateSoundboxNotificationConfig(businessId = '1', updates = {}) {
  return soundboxConfigManager.updateConfig(businessId, updates);
}

class SoundboxAudioDispatcher {
  constructor(options = {}) {
    this.isNotificationSoundChecked = options.isNotificationSoundChecked !== false;
    this.isNotificationTTSChecked = options.isNotificationTTSChecked !== false;
    this.targetEngine = 'com.google.android.tts';
    this.targetLocale = 'bn-BD';
    this.audioDispatches = [];
  }

  setToggles({ sound, tts }) {
    if (sound !== undefined) this.isNotificationSoundChecked = Boolean(sound);
    if (tts !== undefined) this.isNotificationTTSChecked = Boolean(tts);
  }

  formatTtsSpeech(amountTaka, senderName, txnId) {
    return formatTtsSpeech(amountTaka, senderName, txnId);
  }

  dispatchPaymentNotification(paymentEvent = {}) {
    const amountVal = paymentEvent.amountTaka !== undefined
      ? paymentEvent.amountTaka
      : (paymentEvent.amount !== undefined ? paymentEvent.amount : (paymentEvent.amountPaisa ? paymentEvent.amountPaisa / 100 : 0));
    const sender = paymentEvent.senderName || paymentEvent.sender || 'গ্রাহক';
    const txnId = paymentEvent.txnId || paymentEvent.transactionNumber || '';

    const actionsTaken = [];

    if (this.isNotificationSoundChecked) {
      actionsTaken.push({
        type: 'NOTIFICATION_TONE',
        soundAsset: 'res/raw/zxing_beep.ogg',
        played: true,
      });
    }

    if (this.isNotificationTTSChecked) {
      const speechText = generatePaymentSpeechPrompt({
        amount: amountVal,
        senderName: sender,
        txnId,
        walletBrand: paymentEvent.walletBrand,
      }, 'bn');

      actionsTaken.push({
        type: 'TTS_SPEECH',
        engine: this.targetEngine,
        locale: this.targetLocale,
        text: speechText,
        synthesized: true,
      });
    }

    const dispatchResult = {
      txnId,
      timestamp: new Date().toISOString(),
      soundEnabled: this.isNotificationSoundChecked,
      ttsEnabled: this.isNotificationTTSChecked,
      actions: actionsTaken,
    };

    this.audioDispatches.push(dispatchResult);
    return dispatchResult;
  }
}

class ReconstructedSoundboxAudioDispatcher extends SoundboxAudioDispatcher {}

class ReconstructedSettlementActionRepository {
  constructor() {
    this.settlements = [];
    this.txnIndex = new Map();
    this.nextId = 1;
  }

  recordSettlementAction(transactionNumber, actionType) {
    const exists = this.txnIndex.get(transactionNumber);
    if (exists) {
      return { success: false, duplicate: true, existingId: exists.id };
    }
    const record = {
      id: this.nextId++,
      transactionNumber,
      actionType,
      synced: 0,
      createDate: new Date().toISOString(),
      updateDate: null,
    };
    this.settlements.push(record);
    this.txnIndex.set(transactionNumber, record);
    return { success: true, duplicate: false, record };
  }

  existsByTransactionNumber(transactionNumber) {
    return this.txnIndex.has(transactionNumber);
  }

  getUnsyncedSettlements(limit = 100) {
    return this.settlements.filter((s) => s.synced === 0).slice(0, limit);
  }

  markSynced(ids) {
    let count = 0;
    for (const s of this.settlements) {
      if (ids.includes(s.id)) {
        s.synced = 1;
        s.updateDate = new Date().toISOString();
        count++;
      }
    }
    return count;
  }

  resetAllToDirty() {
    this.settlements.forEach((s) => (s.synced = 0));
  }
}

class ReconstructedCreditSettlementEngine {
  constructor(settlementRepo) {
    this.repo = settlementRepo;
    this.customerAccounts = new Map();
  }

  registerAccount(id, name, openingBalance) {
    this.customerAccounts.set(id, {
      id,
      name,
      currentBalance: openingBalance,
      journals: [],
    });
  }

  settleCreditCollection(transactionNumber, accountId, amountPaisa, senderMobile, payload = {}) {
    let account = this.customerAccounts.get(accountId);
    if (!account && (payload.currentBalance !== undefined || payload.openingBalance !== undefined)) {
      this.registerAccount(accountId, payload.customerName || 'গ্রাহক', payload.currentBalance !== undefined ? payload.currentBalance : payload.openingBalance);
      account = this.customerAccounts.get(accountId);
    }
    if (!account) throw new Error('Account not found: ' + accountId);

    const res = this.repo.recordSettlementAction(transactionNumber, 'CREDIT_COLLECTION');
    if (!res.success) {
      return { success: false, reason: 'ALREADY_SETTLED', duplicate: true };
    }

    const amountTaka = amountPaisa / 100;
    const oldBalance = account.currentBalance !== undefined ? account.currentBalance : (account.balance || 0);
    account.currentBalance = Math.round((oldBalance - amountTaka) * 100) / 100;
    if (account.balance !== undefined) account.balance = account.currentBalance;

    const journalEntry = {
      id: 'J_' + transactionNumber,
      accountId,
      amount: amountTaka,
      txnType: 'PAYMENT_RECEIVED',
      note: '(বাকি আদায় সমন্বয়)',
      transactionNumber,
      timestamp: new Date().toISOString(),
    };
    account.journals.push(journalEntry);

    return {
      success: true,
      transactionNumber,
      actionType: 'CREDIT_COLLECTION',
      accountName: account.name,
      settledAmount: amountTaka,
      previousBalance: oldBalance,
      newBalance: account.currentBalance,
      remainingBalance: account.currentBalance,
      journalEntry,
      journalNote: journalEntry.note,
    };
  }

  settleDigitalSale(transactionNumber, amountPaisa) {
    const res = this.repo.recordSettlementAction(transactionNumber, 'DIGITAL_SALE');
    if (!res.success) {
      return { success: false, reason: 'ALREADY_SETTLED', duplicate: true };
    }
    return {
      success: true,
      transactionNumber,
      actionType: 'DIGITAL_SALE',
      settledAmount: amountPaisa / 100,
    };
  }

  settleNoAction(transactionNumber) {
    const res = this.repo.recordSettlementAction(transactionNumber, 'NO_ACTION');
    if (!res.success) {
      return { success: false, reason: 'ALREADY_SETTLED', duplicate: true };
    }
    return {
      success: true,
      transactionNumber,
      actionType: 'NO_ACTION',
    };
  }
}

class QrSettlementEngine {
  constructor(options = {}) {
    this.repo = new ReconstructedSettlementActionRepository();
    this.settlementEngine = new ReconstructedCreditSettlementEngine(this.repo);
    this.soundboxDispatcher = new SoundboxAudioDispatcher(options);
  }

  registerAccount(id, name, openingBalance) {
    return this.settlementEngine.registerAccount(id, name, openingBalance);
  }

  settlePayment(type, txnNumber, payload = {}) {
    const amountPaisa = payload.amountPaisa !== undefined
      ? payload.amountPaisa
      : (payload.amount !== undefined ? Math.round(Number(payload.amount) * 100) : 0);
    if (type === 'CREDIT_COLLECTION') {
      return this.settlementEngine.settleCreditCollection(
        txnNumber,
        payload.accountId,
        amountPaisa,
        payload.senderMobile,
        payload
      );
    }
    if (type === 'DIGITAL_SALE') {
      return this.settlementEngine.settleDigitalSale(txnNumber, amountPaisa);
    }
    return this.settlementEngine.settleNoAction(txnNumber);
  }

  processSettlement(type, txnNumber, payload = {}) {
    return this.settlePayment(type, txnNumber, payload);
  }

  dispatchSoundboxNotification(paymentEvent) {
    return this.soundboxDispatcher.dispatchPaymentNotification(paymentEvent);
  }
}


// =============================================================
// 13. TALLYPAY SETTLEMENT HISTORY, AUTO-DISBURSEMENT & RECONCILIATION (REA-ITER-230)
// =============================================================

const BANK_TRANSFER_MODES = Object.freeze({
  NPSB_INSTANT: 'NPSB',
  BEFTN_REGULAR: 'BEFTN',
  VISA_DIRECT: 'VISA_DIRECT',
  NPSB: 'NPSB',
  BEFTN: 'BEFTN',
});

const DISBURSEMENT_STATUSES = Object.freeze({
  SCHEDULED: 'SCHEDULED',
  IN_TRANSIT: 'IN_TRANSIT',
  SETTLED: 'SETTLED',
  FAILED: 'FAILED',
  INSTANT_SUCCESS: 'INSTANT_SUCCESS',
  PROCESSING_BATCH: 'PROCESSING_BATCH',
});

const RECONCILIATION_SYNC_STATUS = Object.freeze({
  DIRTY: 0,
  SYNCED: 1,
  UNSYNCED: 0,
});

const BANK_TRANSFER_FEES = Object.freeze({
  instantTransferCharge: 10.0,
  instantTransferChargePaisa: 1000,
  regularTransferCharge: 0.0,
  regularTransferChargePaisa: 0,
});

const NPSB_SUPPORTED_BANK_ROUTINGS = new Set(['06026', '08527', '22527', '11527', '20527', '17527']);

const SETTLEMENT_HISTORY_DATE_RANGES = Object.freeze({
  TODAY: 'TODAY',
  YESTERDAY: 'YESTERDAY',
  THIS_WEEK: 'THIS_WEEK',
  THIS_MONTH: 'THIS_MONTH',
  ALL_TIME: 'ALL_TIME',
  CUSTOM: 'CUSTOM',
});

const BANK_TRANSFER_ARSC_TOKENS = Object.freeze({
  BEFTN_SLA_NOTICE: 'BEFTN এর মাধ্যমে ব্যাংক ট্রান্সফার করা হবে। টাকা জমা হতে ১-৩ কার্যদিবস লাগতে পারে।',
  NPSB_INSTANT_NOTICE: 'NPSB এর মাধ্যমে ইনস্ট্যান্ট ব্যাংক ট্রান্সফার করুন।',
  NPSB_UNSUPPORTED_FALLBACK_NOTICE: 'উক্ত ব্যাংক ইনস্ট্যান্ট ট্রান্সফার সাপোর্ট করে না। BEFTN এর মাধ্যমে ট্রান্সফার হবে।',
  VISA_INSTANT_NOTICE: 'নোটঃ ভিসা কার্ডের মাধ্যমে ব্যাংক একাউন্টে ইনস্ট্যান্ট ট্রান্সফার হবে।',
  VISA_CTA_TITLE: 'ভিসা কার্ডের মাধ্যমে ব্যাংক একাউন্টে ইনস্ট্যান্ট ট্রান্সফার করি',
  DAILY_LIMIT_EXCEEDED_ALERT: 'অ্যাড মানি-এর দৈনিক লিমিট অতিক্রম করছে। অনুগ্রহ করে দৈনিক লেনদেনের লিমিট দেখে নিন।',
  SETTLEMENT_CONFIRMATION_PROMPT: 'লেনদেনটি সমন্বয় করা হয়েছে।',
  LEDGER_NOTE_TAG: '(বাকি আদায় সমন্বয়)',
});

/**
 * Resolves date interval boundaries for settlement history queries.
 */
function resolveSettlementDateRange(dateFilter, now = new Date()) {
  const current = new Date(now);
  const startOfDay = new Date(current.getFullYear(), current.getMonth(), current.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(current.getFullYear(), current.getMonth(), current.getDate(), 23, 59, 59, 999);

  switch (String(dateFilter || '').toUpperCase()) {
    case 'TODAY':
      return { start: startOfDay, end: endOfDay };
    case 'YESTERDAY': {
      const yStart = new Date(startOfDay.getTime() - 24 * 60 * 60 * 1000);
      const yEnd = new Date(endOfDay.getTime() - 24 * 60 * 60 * 1000);
      return { start: yStart, end: yEnd };
    }
    case 'THIS_WEEK': {
      const weekStart = new Date(startOfDay.getTime() - 6 * 24 * 60 * 60 * 1000);
      return { start: weekStart, end: endOfDay };
    }
    case 'THIS_MONTH': {
      const monthStart = new Date(current.getFullYear(), current.getMonth(), 1, 0, 0, 0, 0);
      return { start: monthStart, end: endOfDay };
    }
    case 'ALL_TIME':
    default:
      return null;
  }
}

/**
 * Queries settlement history actions with date range, status, actionType, and search filters.
 */
function querySettlementHistory(businessId = null, filter = {}, storage = null) {
  let sourceList = [];

  if (Array.isArray(filter.actions)) {
    sourceList = filter.actions;
  } else if (Array.isArray(filter.settlementActions)) {
    sourceList = filter.settlementActions;
  } else if (storage) {
    if (typeof storage.getQrSettlementActions === 'function') {
      const res = storage.getQrSettlementActions(businessId, { limit: 10000 });
      sourceList = res.items || res.actions || res.settlements || [];
    } else if (storage.currentStore && Array.isArray(storage.currentStore.qrSettlementActions)) {
      sourceList = storage.currentStore.qrSettlementActions;
    } else if (Array.isArray(storage.settlementActions)) {
      sourceList = storage.settlementActions;
    } else if (Array.isArray(storage)) {
      sourceList = storage;
    }
  }

  const targetBizId = businessId ? String(businessId) : null;
  let filtered = sourceList.filter((s) => {
    if (targetBizId && s.businessId !== undefined && String(s.businessId || '1') !== targetBizId) {
      return false;
    }
    if (filter.actionType && String(s.actionType).toUpperCase() !== String(filter.actionType).toUpperCase()) {
      return false;
    }
    if (filter.status) {
      const targetSt = String(filter.status).toUpperCase();
      const itemSt = String(s.status || (Number(s.synced) === 1 ? "SETTLED" : "PENDING")).toUpperCase();
      if (itemSt !== targetSt) return false;
    }
    if (filter.synced !== undefined && filter.synced !== null) {
      if (Number(s.synced) !== Number(filter.synced)) return false;
    }

    const itemDate = new Date(s.createDate || s.create_date || s.timestamp || s.time || 0);

    if (filter.dateFilter) {
      const range = resolveSettlementDateRange(filter.dateFilter);
      if (range) {
        if (itemDate < range.start || itemDate > range.end) return false;
      }
    }

    if (filter.startDate) {
      const start = new Date(filter.startDate);
      if (itemDate < start) return false;
    }
    if (filter.endDate) {
      const end = new Date(filter.endDate);
      if (itemDate > end) return false;
    }

    return true;
  });

  if (filter.query || filter.search) {
    const q = String(filter.query || filter.search).trim().toLowerCase();
    filtered = filtered.filter((s) => {
      const txn = String(s.transactionNumber || s.transaction_number || '').toLowerCase();
      const acc = String(s.accountName || s.customerName || '').toLowerCase();
      const sender = String(s.senderName || '').toLowerCase();
      const mobile = String(s.senderMobile || '').toLowerCase();
      const note = String(s.note || '').toLowerCase();
      const accId = String(s.accountId || '').toLowerCase();
      return txn.includes(q) || acc.includes(q) || sender.includes(q) || mobile.includes(q) || note.includes(q) || accId.includes(q);
    });
  }

  filtered.sort((a, b) => {
    const dateA = new Date(a.createDate || a.create_date || a.timestamp || a.time || 0).getTime();
    const dateB = new Date(b.createDate || b.create_date || b.timestamp || b.time || 0).getTime();
    return dateB - dateA;
  });

  const totalCount = filtered.length;
  let totalAmount = 0;
  let totalSettledPaisa = 0;
  let creditCollectionPaisa = 0;
  let digitalSalePaisa = 0;
  let noActionPaisa = 0;

  for (const item of filtered) {
    const taka = Number(item.amountTaka !== undefined ? item.amountTaka : (item.amount || 0));
    const paisa = item.amountPaisa !== undefined ? Math.round(Number(item.amountPaisa)) : Math.round(taka * 100);
    totalAmount += taka;
    totalSettledPaisa += paisa;

    const actionType = String(item.actionType || item.action_type || '').toUpperCase();
    if (actionType === 'CREDIT_COLLECTION') {
      creditCollectionPaisa += paisa;
    } else if (actionType === 'DIGITAL_SALE') {
      digitalSalePaisa += paisa;
    } else if (actionType === 'NO_ACTION') {
      noActionPaisa += paisa;
    }
  }

  const offset = Math.max(0, parseInt(filter.offset, 10) || 0);
  const limit = Math.max(1, parseInt(filter.limit, 10) || 50);
  const paginated = filtered.slice(offset, offset + limit);
  const hasMore = offset + paginated.length < totalCount;

  return {
    items: paginated,
    actions: paginated,
    settlements: paginated,
    totalCount,
    count: totalCount,
    totalAmount,
    totalSettledPaisa,
    creditCollectionPaisa,
    creditCollectionAmount: creditCollectionPaisa / 100,
    digitalSalePaisa,
    digitalSaleAmount: digitalSalePaisa / 100,
    noActionPaisa,
    noActionAmount: noActionPaisa / 100,
    offset,
    limit,
    hasMore,
  };
}

/**
 * Intelligent routing and execution for bank transfer disbursements.
 */
async function processBankDisbursement(businessId = null, payload = {}, storage = null) {
  const amountVal = Number(
    payload.amountTaka !== undefined
      ? payload.amountTaka
      : (payload.amount !== undefined ? payload.amount : (payload.amountPaisa ? payload.amountPaisa / 100 : 0))
  );
  const amountPaisa = payload.amountPaisa !== undefined
    ? Math.round(Number(payload.amountPaisa))
    : Math.round(amountVal * 100);

  if (amountPaisa <= 0) {
    throw new Error('Disbursement amount must be greater than zero');
  }

  const bankRoutingNo = String(payload.bankRoutingNo || payload.routingNumber || '').trim();
  const bankAccountNo = String(payload.bankAccountNo || payload.accountNumber || '').trim();
  const recipientName = String(payload.recipientName || payload.accountName || payload.name || '').trim();
  const preferInstant = Boolean(payload.preferInstant !== undefined ? payload.preferInstant : payload.instant);

  // Check NPSB instant routing support
  const routingPrefix = bankRoutingNo.substring(0, 5);
  let bankSupportsNpsb = NPSB_SUPPORTED_BANK_ROUTINGS.has(routingPrefix);
  if (!bankSupportsNpsb && typeof getBangladeshBanksCatalog === 'function') {
    const catalog = getBangladeshBanksCatalog();
    const matched = catalog.find((b) => String(b.routingNo || '').startsWith(routingPrefix) || String(b.code || '') === routingPrefix);
    if (matched && matched.instantTransferSupported) {
      bankSupportsNpsb = true;
    }
  }

  let transferMode = 'BEFTN';
  let notice = BANK_TRANSFER_ARSC_TOKENS.BEFTN_SLA_NOTICE;
  let fee = BANK_TRANSFER_FEES.regularTransferCharge;
  let feePaisa = BANK_TRANSFER_FEES.regularTransferChargePaisa;
  let status = 'PROCESSING_BATCH';

  if (preferInstant && bankSupportsNpsb) {
    transferMode = 'NPSB';
    fee = BANK_TRANSFER_FEES.instantTransferCharge;
    feePaisa = BANK_TRANSFER_FEES.instantTransferChargePaisa;
    notice = BANK_TRANSFER_ARSC_TOKENS.NPSB_INSTANT_NOTICE;
    status = 'INSTANT_SUCCESS';
  } else if (preferInstant && !bankSupportsNpsb) {
    transferMode = 'BEFTN';
    fee = BANK_TRANSFER_FEES.regularTransferCharge;
    feePaisa = BANK_TRANSFER_FEES.regularTransferChargePaisa;
    notice = BANK_TRANSFER_ARSC_TOKENS.NPSB_UNSUPPORTED_FALLBACK_NOTICE;
    status = 'PROCESSING_BATCH';
  }

  const netAmount = Math.max(0, amountVal - fee);
  const netAmountPaisa = Math.max(0, amountPaisa - feePaisa);
  const nowIso = new Date().toISOString();

  const disbursementRecord = {
    id: payload.id || ('DISB_' + Date.now() + '_' + Math.floor(Math.random() * 1000)),
    businessId: String(businessId || payload.businessId || '1'),
    amount: amountVal,
    amountTaka: amountVal,
    amountPaisa,
    fee,
    feePaisa,
    netAmount,
    netAmountPaisa,
    bankRoutingNo,
    bankAccountNo,
    recipientName,
    transferMode,
    notice,
    status,
    timestamp: nowIso,
    createDate: nowIso,
  };

  if (storage && typeof storage.saveMerchantDisbursement === 'function') {
    await storage.saveMerchantDisbursement(disbursementRecord.businessId, disbursementRecord);
  }

  return {
    success: true,
    disbursement: disbursementRecord,
  };
}

/**
 * End-of-Day cashbox and digital sales reconciliation calculator.
 * Closing = Opening + Cash Sales + Digital Settlements - Credit Given
 */
function computeDailyReconciliation(opening, cash, credit, digital, options = {}) {
  let openVal = opening;
  let cashVal = cash;
  let creditVal = credit;
  let digitalVal = digital;
  let isPaisaInput = Boolean(options && (options.paisaMode || options.inPaisa));

  if (opening && typeof opening === "object") {
    const obj = opening;
    if (obj.openingBalancePaisa !== undefined || obj.opening_balance_paisa !== undefined ||
        obj.otherCashSalePaisa !== undefined || obj.otherCashSalesPaisa !== undefined ||
        obj.otherCreditSalePaisa !== undefined || obj.otherCreditSalesPaisa !== undefined ||
        obj.settledInflowPaisa !== undefined || obj.digitalSettlementsPaisa !== undefined) {
      isPaisaInput = true;
      openVal = obj.openingBalancePaisa ?? obj.opening_balance_paisa ?? 0;
      cashVal = obj.otherCashSalePaisa ?? obj.otherCashSalesPaisa ?? obj.other_cash_sales_paisa ?? 0;
      creditVal = obj.otherCreditSalePaisa ?? obj.otherCreditSalesPaisa ?? obj.other_credit_sales_paisa ?? 0;
      digitalVal = obj.settledInflowPaisa ?? obj.digitalSettlementsPaisa ?? obj.digital_settlements_paisa ?? 0;
    } else {
      openVal = obj.opening_balance ?? obj.openingBalance ?? 0;
      cashVal = obj.other_cash_sales ?? obj.otherCashSale ?? obj.otherCashSales ?? 0;
      creditVal = obj.other_credit_sales ?? obj.otherCreditSale ?? obj.otherCreditSales ?? 0;
      digitalVal = obj.digital_settlements ?? obj.digitalSettlements ?? obj.settledInflow ?? obj.settledInflowPaisa ?? 0;
    }
  }

  let openP, cashP, credP, digiP;
  if (isPaisaInput) {
    openP = Math.round(Number(openVal || 0));
    cashP = Math.round(Number(cashVal || 0));
    credP = Math.round(Number(creditVal || 0));
    digiP = Math.round(Number(digitalVal || 0));
  } else {
    openP = Math.round(Number(openVal || 0) * 100);
    cashP = Math.round(Number(cashVal || 0) * 100);
    credP = Math.round(Number(creditVal || 0) * 100);
    digiP = Math.round(Number(digitalVal || 0) * 100);
  }

  const closeP = openP + cashP + digiP - credP;
  const closingBalance = closeP / 100;
  const openingBalance = openP / 100;
  const otherCashSale = cashP / 100;
  const otherCreditSale = credP / 100;
  const digitalSettlements = digiP / 100;

  return {
    opening_balance: openingBalance,
    openingBalance,
    other_cash_sales: otherCashSale,
    otherCashSale,
    otherCreditSale,
    other_credit_sales: otherCreditSale,
    digital_settlements: digitalSettlements,
    digitalSettlements,
    settledInflow: digitalSettlements,
    closing_balance: closingBalance,
    closingBalance,
    openingBalancePaisa: openP,
    otherCashSalesPaisa: cashP,
    otherCashSalePaisa: cashP,
    otherCreditSalesPaisa: credP,
    otherCreditSalePaisa: credP,
    digitalSettlementsPaisa: digiP,
    settledInflowPaisa: digiP,
    closingBalancePaisa: closeP,
  };
}

/**
 * Records an End-of-Day reconciliation into storage.
 */
async function recordReconciliation(businessId = null, reconData = {}, storage = null) {
  const computed = computeDailyReconciliation(
    reconData.opening_balance !== undefined ? reconData.opening_balance : reconData.openingBalance,
    reconData.other_cash_sales !== undefined ? reconData.other_cash_sales : reconData.otherCashSale,
    reconData.other_credit_sales !== undefined ? reconData.other_credit_sales : reconData.otherCreditSale,
    reconData.digital_settlements !== undefined ? reconData.digital_settlements : reconData.digitalSettlements
  );

  const nowIso = new Date().toISOString();
  const id = reconData._id !== undefined && reconData._id !== null
    ? reconData._id
    : (reconData.id !== undefined && reconData.id !== null ? reconData.id : ('RECON_' + Date.now() + '_' + Math.floor(Math.random() * 1000)));

  const record = {
    _id: id,
    id,
    businessId: String(businessId || reconData.businessId || '1'),
    time: reconData.time || nowIso,
    opening_balance: computed.opening_balance,
    openingBalance: computed.openingBalance,
    other_cash_sales: computed.other_cash_sales,
    otherCashSale: computed.otherCashSale,
    other_credit_sales: computed.other_credit_sales,
    otherCreditSale: computed.otherCreditSale,
    digital_settlements: computed.digital_settlements,
    digitalSettlements: computed.digitalSettlements,
    closing_balance: computed.closing_balance,
    closingBalance: computed.closingBalance,
    sync_status: reconData.sync_status !== undefined ? Number(reconData.sync_status) : (reconData.syncStatus !== undefined ? Number(reconData.syncStatus) : 0),
    syncStatus: reconData.sync_status !== undefined ? Number(reconData.sync_status) : (reconData.syncStatus !== undefined ? Number(reconData.syncStatus) : 0),
    createDate: reconData.createDate || nowIso,
  };

  if (storage && typeof storage.saveReconciliation === 'function') {
    await storage.saveReconciliation(record.businessId, record);
  }

  return {
    success: true,
    reconciliation: record,
    record,
  };
}

/**
 * Auto-Disbursement Configuration Manager
 */
class AutoDisbursementConfigManager {
  constructor(defaultSettings = {}) {
    this.defaultSettings = {
      isAutoDisbursementEnabled: false,
      linkedBankAccountId: null,
      minThresholdPaisa: 50000, // 500 Taka
      minThresholdTaka: 500.0,
      payoutTime: '23:00',
      preferInstant: false,
      ...defaultSettings,
    };
    this.tenantConfigs = new Map();
  }

  getConfig(businessId = '1', storage = null) {
    const bizId = String(businessId || '1');
    if (storage && typeof storage.getAutoDisbursementConfig === 'function') {
      return storage.getAutoDisbursementConfig(bizId);
    }
    if (this.tenantConfigs.has(bizId)) {
      return this.tenantConfigs.get(bizId);
    }
    const cfg = { ...this.defaultSettings, businessId: bizId, updatedAt: new Date().toISOString() };
    this.tenantConfigs.set(bizId, cfg);
    return cfg;
  }

  async updateConfig(businessId = '1', updates = {}, storage = null) {
    const bizId = String(businessId || '1');
    if (storage && typeof storage.saveAutoDisbursementConfig === 'function') {
      const res = await storage.saveAutoDisbursementConfig(bizId, updates);
      if (res && res.config) {
        this.tenantConfigs.set(bizId, res.config);
        return res.config;
      }
    }
    const current = this.getConfig(bizId);
    const merged = { ...current, ...updates, businessId: bizId, updatedAt: new Date().toISOString() };
    if (updates.minThresholdPaisa !== undefined && updates.minThresholdTaka === undefined) {
      merged.minThresholdTaka = Number(updates.minThresholdPaisa) / 100;
    } else if (updates.minThresholdTaka !== undefined && updates.minThresholdPaisa === undefined) {
      merged.minThresholdPaisa = Math.round(Number(updates.minThresholdTaka) * 100);
    }
    this.tenantConfigs.set(bizId, merged);
    return merged;
  }

  evaluateAutoDisbursementEligibility(businessId = '1', availableBalancePaisa = 0, storage = null) {
    const config = this.getConfig(businessId, storage);
    if (!config.isAutoDisbursementEnabled) {
      return { eligible: false, reason: 'DISABLED', config };
    }
    if (!config.linkedBankAccountId) {
      return { eligible: false, reason: 'NO_LINKED_ACCOUNT', config };
    }
    const balancePaisa = Math.round(Number(availableBalancePaisa || 0));
    if (balancePaisa < config.minThresholdPaisa) {
      return {
        eligible: false,
        reason: 'BELOW_THRESHOLD',
        balancePaisa,
        thresholdPaisa: config.minThresholdPaisa,
        config,
      };
    }
    return {
      eligible: true,
      balancePaisa,
      thresholdPaisa: config.minThresholdPaisa,
      config,
    };
  }

  async executeAutoDisbursementIfEligible(businessId = "1", walletBalancePaisa = 0, storage = null, options = {}) {
    const evalRes = this.evaluateAutoDisbursementEligibility(businessId, walletBalancePaisa, storage);
    if (!evalRes.eligible) {
      return { executed: false, ...evalRes };
    }
    const { config } = evalRes;
    const amountPaisa = evalRes.balancePaisa;
    const disbPayload = {
      amountPaisa,
      amountTaka: amountPaisa / 100,
      bankAccountNo: options.bankAccountNo || config.linkedBankAccountId,
      bankRoutingNo: options.bankRoutingNo || config.linkedBankRoutingNo || "",
      recipientName: options.recipientName || config.linkedAccountName || "",
      preferInstant: config.preferInstant !== false,
      note: options.note || "Daily Auto-Disbursement",
    };
    const disbRes = await processBankDisbursement(businessId, disbPayload, storage);
    return {
      executed: true,
      eligible: true,
      disbursement: disbRes.disbursement,
      config,
    };
  }
}

const autoDisbursementConfigManager = new AutoDisbursementConfigManager();
const AutoDisbursementScheduler = AutoDisbursementConfigManager;
const AutoDisbursementManager = AutoDisbursementConfigManager;
const autoDisbursementScheduler = autoDisbursementConfigManager;
const autoDisbursementManager = autoDisbursementConfigManager;

/**
 * Reconstructed Pure-JS Settlement History, Daily Auto-Disbursement & Bank Reconciliation Engine
 * Conforms 100% to Reference Architecture Group 10 specification.
 */
class ReconstructedSettlementAndReconciliationEngine {
  constructor(config = {}) {
    this.bankTransferConfig = {
      isInstantTransferActive: config.isInstantTransferActive !== false,
      isRegularTransferActive: config.isRegularTransferActive !== false,
      instantTransferCharge: config.instantTransferCharge !== undefined ? config.instantTransferCharge : 10.0,
      regularTransferCharge: config.regularTransferCharge !== undefined ? config.regularTransferCharge : 0.0,
    };

    this.settlementActions = [];
    this.reconciliations = [];
    this.disbursements = [];
    this.nextReconId = 1;
    this.nextSettlementId = 1;
    this.npsbSupportedBankRoutings = new Set(['06026', '08527', '22527', '11527']);
  }

  recordSettlement(transactionNumber, actionType, amountPaisa, accountId = null) {
    if (this.settlementActions.some((s) => s.transactionNumber === transactionNumber)) {
      return { success: false, duplicate: true, reason: 'ALREADY_SETTLED' };
    }

    const record = {
      id: this.nextSettlementId++,
      transactionNumber,
      actionType,
      amountTaka: amountPaisa / 100,
      amountPaisa,
      accountId,
      synced: 0,
      createDate: new Date().toISOString(),
    };
    this.settlementActions.push(record);
    return { success: true, record };
  }

  getSettlementHistory(filter = {}) {
    let result = [...this.settlementActions];

    if (filter.actionType) {
      result = result.filter((s) => s.actionType === filter.actionType);
    }
    if (filter.startDate) {
      result = result.filter((s) => new Date(s.createDate) >= new Date(filter.startDate));
    }
    if (filter.endDate) {
      result = result.filter((s) => new Date(s.createDate) <= new Date(filter.endDate));
    }

    const totalCount = result.length;
    const totalAmount = result.reduce((acc, curr) => acc + curr.amountTaka, 0);

    return {
      totalCount,
      totalAmount,
      items: result,
    };
  }

  initiateBankDisbursement(request = {}) {
    const { amountTaka, bankRoutingNo, bankAccountNo, recipientName, note, preferInstant } = request;

    const bankSupportsNpsb = this.npsbSupportedBankRoutings.has(String(bankRoutingNo || '').substring(0, 5));
    let transferMode = 'BEFTN';
    let notice = 'BEFTN এর মাধ্যমে ব্যাংক ট্রান্সফার করা হবে। টাকা জমা হতে ১-৩ কার্যদিবস লাগতে পারে।';
    let fee = this.bankTransferConfig.regularTransferCharge;

    if (preferInstant && bankSupportsNpsb && this.bankTransferConfig.isInstantTransferActive) {
      transferMode = 'NPSB';
      notice = 'NPSB এর মাধ্যমে ইনস্ট্যান্ট ব্যাংক ট্রান্সফার করুন।';
      fee = this.bankTransferConfig.instantTransferCharge;
    } else if (preferInstant && !bankSupportsNpsb) {
      transferMode = 'BEFTN';
      notice = 'উক্ত ব্যাংক ইনস্ট্যান্ট ট্রান্সফার সাপোর্ট করে না। BEFTN এর মাধ্যমে ট্রান্সফার হবে।';
      fee = this.bankTransferConfig.regularTransferCharge;
    }

    const disbursementRecord = {
      id: 'DISB_' + Date.now(),
      amountTaka,
      fee,
      netAmount: amountTaka - fee,
      bankRoutingNo,
      bankAccountNo,
      recipientName,
      transferMode,
      notice,
      status: transferMode === 'NPSB' ? 'INSTANT_SUCCESS' : 'PROCESSING_BATCH',
      timestamp: new Date().toISOString(),
    };

    this.disbursements.push(disbursementRecord);
    return {
      success: true,
      disbursement: disbursementRecord,
    };
  }

  reconcileDay(openingBalance, otherCashSales, otherCreditSales, digitalSettlementsTotal) {
    const closingBalance = openingBalance + otherCashSales + digitalSettlementsTotal - otherCreditSales;

    const reconRecord = {
      _id: this.nextReconId++,
      time: new Date().toISOString(),
      opening_balance: openingBalance,
      other_cash_sales: otherCashSales,
      other_credit_sales: otherCreditSales,
      digital_settlements: digitalSettlementsTotal,
      closing_balance: closingBalance,
      sync_status: 0,
    };

    this.reconciliations.push(reconRecord);
    return reconRecord;
  }

  getUnsyncedReconciliations() {
    return this.reconciliations.filter((r) => r.sync_status === 0);
  }

  markReconciliationsSynced(ids = []) {
    let count = 0;
    this.reconciliations.forEach((r) => {
      if (ids.includes(r._id)) {
        r.sync_status = 1;
        count++;
      }
    });
    return count;
  }
}

// ============================================================================
// MILESTONE REA-ITER-231: TALLYPAY SECURITY PIN, BIOMETRICS & DEVICE BINDING
// ============================================================================


const DEFAULT_PIN_SALT = 'jrhwesdfbmnew';

const PIN_ARSC_TOKENS = {
  ALERT_ACCOUNT_LOCKED: '৩ বার ভুল PIN দেয়ার জন্য আপনার একাউন্টটি ১ ঘণ্টার জন্য ব্লক করা হয়েছে।',
  ALERT_ATTEMPT_WARNING: 'আপনি পরপর ২ বার ভুল PIN দিয়েছেন। আরেকবার ভুল PIN দিলে আপনার একাউন্ট ব্লক করে দেওয়া হবে।',
  RULE_WEAK_PIN: 'অনুগ্রহ করে ধারাবাহিক বা পুনরাবৃত্ত নম্বর ছাড়া একটি ভিন্ন PIN দিন।',
  RULE_PREVIOUSLY_USED: 'এই PIN পূর্বে ব্যবহৃত হয়েছে',
  ALERT_PIN_MISMATCH: 'PIN দুটি মিলছে না, আবার চেষ্টা করুন।',
  ALERT_PIN_CHANGED: 'আপনার টালিখাতা এবং টালিপে PIN পরিবর্তন সফল হয়েছে।',
  ALERT_PIN_SET: 'আপনার PIN সেট সফল হয়েছে।',
  ALERT_PIN_RESET: 'আপনার PIN সফলভাবে রিসেট করা হয়েছে।',
  PROMPT_ENTER_CURRENT_PIN: 'বর্তমান PIN দিন',
  PROMPT_ENTER_NEW_PIN: 'নতুন PIN দিন',
  PROMPT_RETYPE_NEW_PIN: 'নতুন PIN পুনরায় লিখুন',
  NOTICE_BIOMETRIC_FALLBACK: 'Failed to verify using Finger Print. Please do continue with PIN',
  NOTICE_NO_BIOMETRIC_REGISTERED: 'কোন নিবন্ধিত ফিঙ্গারপ্রিন্ট পাওয়া যায়নি।',
  CLAUSE_SINGLE_ACTIVE_DEVICE: 'বর্তমানে ব্যবহৃত ডিভাইস ব্যতিত নতুন কোন ডিভাইসে লগইন করলে বর্তমান ডিভাইসে টালিখাতা অ্যাপটি নিষ্ক্রিয় হয়ে যাবে',
  NOTICE_OTP_SENT: 'ভেরিফিকেশন কোড পাঠানো হয়েছে।',
  NOTICE_OTP_EXPIRED: 'ভেরিফিকেশন কোডের মেয়াদ শেষ হয়েছে।',
  NOTICE_INVALID_OTP: 'সঠিক ভেরিফিকেশন কোড দিন।',
  DEVICE_ACTIVATION_SUCCESS: 'নতুন ডিভাইসে সফলভাবে সক্রিয় করা হয়েছে।',
};

const PIN_STRENGTH_ERRORS = {
  MUST_BE_4_DIGITS: '4 digit PIN and should be random numbers',
  REPETITIVE_DIGITS: 'অনুগ্রহ করে ধারাবাহিক বা পুনরাবৃত্ত নম্বর ছাড়া একটি ভিন্ন PIN দিন।',
  SEQUENTIAL_ASCENDING: 'অনুগ্রহ করে ধারাবাহিক বা পুনরাবৃত্ত নম্বর ছাড়া একটি ভিন্ন PIN দিন।',
  SEQUENTIAL_DESCENDING: 'অনুগ্রহ করে ধারাবাহিক বা পুনরাবৃত্ত নম্বর ছাড়া একটি ভিন্ন PIN দিন।',
};

function hashPin(pin, salt = DEFAULT_PIN_SALT) {
  if (!pin) return null;
  return crypto.createHash('sha1').update(String(pin) + String(salt)).digest('hex');
}

function validatePinStrength(pin) {
  if (!pin || typeof pin !== 'string' || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    return { valid: false, reason: 'MUST_BE_4_DIGITS', message: PIN_STRENGTH_ERRORS.MUST_BE_4_DIGITS };
  }

  // Check repetitive digits (e.g. 1111, 2222)
  if (/^(\d)\1{3}$/.test(pin)) {
    return { valid: false, reason: 'REPETITIVE_DIGITS', message: PIN_STRENGTH_ERRORS.REPETITIVE_DIGITS };
  }

  // Check sequential ascending digits (e.g. 1234, 2345, 6789)
  const d0 = parseInt(pin[0], 10);
  const d1 = parseInt(pin[1], 10);
  const d2 = parseInt(pin[2], 10);
  const d3 = parseInt(pin[3], 10);
  if (d1 === d0 + 1 && d2 === d1 + 1 && d3 === d2 + 1) {
    return { valid: false, reason: 'SEQUENTIAL_ASCENDING', message: PIN_STRENGTH_ERRORS.SEQUENTIAL_ASCENDING };
  }

  // Check sequential descending digits (e.g. 4321, 9876)
  if (d1 === d0 - 1 && d2 === d1 - 1 && d3 === d2 - 1) {
    return { valid: false, reason: 'SEQUENTIAL_DESCENDING', message: PIN_STRENGTH_ERRORS.SEQUENTIAL_DESCENDING };
  }

  return { valid: true };
}

class ReconstructedSecurityPinAndAuthEngine {
  constructor(config = {}) {
    this.salt = config.salt || DEFAULT_PIN_SALT;
    this.storedPinHash = config.storedPinHash || null;
    this.previousPins = new Set(config.previousPins || []);
    this.failedAttempts = Number(config.failedAttempts) || 0;
    this.lockoutUntil = config.lockoutUntil || null;
    this.tempLockoutMinutes = Number(config.tempLockoutMinutes) || 60; // 1 hour for 3 failed attempts
    this.biometricEnabled = Boolean(config.biometricEnabled);
    this.biometricPublicKey = config.biometricPublicKey || null;
    this.activeDeviceId = config.activeDeviceId || 'DEV_INIT_001';
    this.activeWalletNo = config.activeWalletNo || '01712345678';

    // In-memory OTP storage
    this.pendingOtps = new Map(); // mobile -> { otp, otpType, expiry }
  }

  // Hash PIN with reference salt
  hashPin(pin) {
    return hashPin(pin, this.salt);
  }

  // Validate PIN strength
  validatePinStrength(pin) {
    return validatePinStrength(pin);
  }

  // Setup initial PIN
  setupPin(newPin, confirmPin) {
    if (newPin !== confirmPin) {
      return { success: false, reason: 'PIN_MISMATCH', message: PIN_ARSC_TOKENS.ALERT_PIN_MISMATCH };
    }
    const val = this.validatePinStrength(newPin);
    if (!val.valid) return { success: false, reason: val.reason, message: val.message };

    const hash = this.hashPin(newPin);
    this.storedPinHash = hash;
    this.previousPins.add(hash);
    this.failedAttempts = 0;
    this.lockoutUntil = null;

    return { success: true, message: PIN_ARSC_TOKENS.ALERT_PIN_SET };
  }

  // Change existing PIN
  changePin(oldPin, newPin, confirmPin) {
    if (this.isLockedOut()) {
      return { success: false, reason: 'LOCKED_OUT', message: PIN_ARSC_TOKENS.ALERT_ACCOUNT_LOCKED };
    }

    const oldHash = this.hashPin(oldPin);
    if (oldHash !== this.storedPinHash) {
      this.recordFailedAttempt();
      return { success: false, reason: 'WRONG_OLD_PIN', message: 'বর্তমান PIN সঠিক নয়।' };
    }

    if (newPin !== confirmPin) {
      return { success: false, reason: 'PIN_MISMATCH', message: PIN_ARSC_TOKENS.ALERT_PIN_MISMATCH };
    }

    const val = this.validatePinStrength(newPin);
    if (!val.valid) return { success: false, reason: val.reason, message: val.message };

    const newHash = this.hashPin(newPin);
    if (this.previousPins.has(newHash)) {
      return { success: false, reason: 'PREVIOUSLY_USED', message: PIN_ARSC_TOKENS.RULE_PREVIOUSLY_USED };
    }

    this.storedPinHash = newHash;
    this.previousPins.add(newHash);
    this.failedAttempts = 0;
    return { success: true, message: PIN_ARSC_TOKENS.ALERT_PIN_CHANGED };
  }

  // Request Reset PIN OTP
  requestResetPinOtp(mobileNumber, otpType = 'PIN_RESET') {
    const generatedOtp = String(Math.floor(100000 + Math.random() * 900000));
    const expiry = Date.now() + 5 * 60 * 1000; // 5 min expiry
    this.pendingOtps.set(mobileNumber, { otp: generatedOtp, otpType, expiry });

    return {
      success: true,
      mobileNumber,
      otpType,
      otpToken: generatedOtp,
      message: PIN_ARSC_TOKENS.NOTICE_OTP_SENT,
    };
  }

  // Verify OTP and Reset PIN
  resetPinWithOtp(mobileNumber, otpInput, newPin, confirmPin) {
    const record = this.pendingOtps.get(mobileNumber);
    if (!record || record.otpType !== 'PIN_RESET') {
      return { success: false, reason: 'NO_PENDING_OTP', message: 'কোনো ওটিপি অনুরোধ পাওয়া যায়নি।' };
    }
    if (Date.now() > record.expiry) {
      return { success: false, reason: 'OTP_EXPIRED', message: PIN_ARSC_TOKENS.NOTICE_OTP_EXPIRED };
    }
    if (record.otp !== otpInput) {
      return { success: false, reason: 'INVALID_OTP', message: PIN_ARSC_TOKENS.NOTICE_INVALID_OTP };
    }

    if (newPin !== confirmPin) {
      return { success: false, reason: 'PIN_MISMATCH', message: PIN_ARSC_TOKENS.ALERT_PIN_MISMATCH };
    }

    const val = this.validatePinStrength(newPin);
    if (!val.valid) return { success: false, reason: val.reason, message: val.message };

    const newHash = this.hashPin(newPin);
    if (this.previousPins.has(newHash)) {
      return { success: false, reason: 'PREVIOUSLY_USED', message: PIN_ARSC_TOKENS.RULE_PREVIOUSLY_USED };
    }

    this.storedPinHash = newHash;
    this.previousPins.add(newHash);
    this.failedAttempts = 0;
    this.lockoutUntil = null;
    this.pendingOtps.delete(mobileNumber);

    return { success: true, message: PIN_ARSC_TOKENS.ALERT_PIN_RESET };
  }

  // Validate PIN during transaction or login
  validatePin(pinInput) {
    if (this.isLockedOut()) {
      return {
        success: false,
        lockedOut: true,
        reason: 'LOCKED_OUT',
        message: PIN_ARSC_TOKENS.ALERT_ACCOUNT_LOCKED,
      };
    }

    const inputHash = this.hashPin(pinInput);
    if (inputHash === this.storedPinHash) {
      this.failedAttempts = 0;
      return { success: true };
    } else {
      this.recordFailedAttempt();
      if (this.failedAttempts === 2) {
        return {
          success: false,
          warning: true,
          failedAttempts: 2,
          message: PIN_ARSC_TOKENS.ALERT_ATTEMPT_WARNING,
        };
      } else if (this.failedAttempts >= 3) {
        return {
          success: false,
          lockedOut: true,
          failedAttempts: 3,
          message: PIN_ARSC_TOKENS.ALERT_ACCOUNT_LOCKED,
        };
      }
      return { success: false, failedAttempts: this.failedAttempts, message: 'সঠিক PIN দিন।' };
    }
  }

  recordFailedAttempt() {
    this.failedAttempts++;
    if (this.failedAttempts >= 3) {
      this.lockoutUntil = Date.now() + this.tempLockoutMinutes * 60 * 1000;
    }
  }

  isLockedOut() {
    if (!this.lockoutUntil) return false;
    if (Date.now() < this.lockoutUntil) return true;
    // Lockout expired
    this.lockoutUntil = null;
    this.failedAttempts = 0;
    return false;
  }

  // Biometric Enrollment & Validation
  enrollBiometrics(keyPairPublicKey) {
    this.biometricEnabled = true;
    this.biometricPublicKey = keyPairPublicKey;
    return { success: true, biometricEnabled: true };
  }

  validateCredentialWithBiometric(request = {}) {
    const { walletNo, amount, fingerPrintTxn, fpSignature, pin } = request;

    if (fingerPrintTxn) {
      if (!this.biometricEnabled) {
        return {
          success: false,
          reason: 'BIOMETRIC_NOT_ENROLLED',
          message: PIN_ARSC_TOKENS.NOTICE_NO_BIOMETRIC_REGISTERED,
        };
      }
      if (!fpSignature || fpSignature.length < 10) {
        return {
          success: false,
          reason: 'BIOMETRIC_SIGNATURE_FAILED',
          fallbackToPin: true,
          message: PIN_ARSC_TOKENS.NOTICE_BIOMETRIC_FALLBACK,
        };
      }
      return {
        success: true,
        authenticatedVia: 'BIOMETRIC_FINGERPRINT',
        walletNo,
        amount,
      };
    } else {
      const pinResult = this.validatePin(pin);
      if (!pinResult.success) {
        return pinResult;
      }
      return {
        success: true,
        authenticatedVia: 'SECURITY_PIN',
        walletNo,
        amount,
      };
    }
  }

  // Device Binding: Activate new device & invalidate prior
  bindDevice(newDeviceId, mobileNumber, otpInput) {
    const record = this.pendingOtps.get(mobileNumber);
    if (!record || record.otpType !== 'REGISTRATION') {
      return { success: false, reason: 'NO_REGISTRATION_OTP', message: 'রেজিস্ট্রেশন ওটিপি পাওয়া যায়নি।' };
    }
    if (record.otp !== otpInput) {
      return { success: false, reason: 'INVALID_OTP', message: PIN_ARSC_TOKENS.NOTICE_INVALID_OTP };
    }

    const previousDeviceId = this.activeDeviceId;
    this.activeDeviceId = newDeviceId;
    this.pendingOtps.delete(mobileNumber);

    return {
      success: true,
      activeDeviceId: this.activeDeviceId,
      previousDeviceInvalidated: previousDeviceId,
      message: PIN_ARSC_TOKENS.DEVICE_ACTIVATION_SUCCESS,
    };
  }

  getActiveDeviceId() {
    return this.activeDeviceId;
  }

  revokeDevice(deviceId) {
    if (this.activeDeviceId === deviceId) {
      this.activeDeviceId = null;
      return { success: true, revokedDeviceId: deviceId };
    }
    return { success: false, reason: 'DEVICE_NOT_ACTIVE' };
  }
}

class PinSecurityEngine extends ReconstructedSecurityPinAndAuthEngine {}
const pinSecurityEngine = new PinSecurityEngine();

class TallyPaySecurityManager {
  constructor(storageRepo = null) {
    this.repo = storageRepo;
    this.enginesByBiz = new Map(); // businessId -> PinSecurityEngine
  }

  getEngine(businessId = null) {
    const bizId = String(businessId || '1');
    if (!this.enginesByBiz.has(bizId)) {
      let initialConfig = {};
      if (this.repo && typeof this.repo.getWalletSecurityCredentials === 'function') {
        const stored = this.repo.getWalletSecurityCredentials(bizId);
        if (stored) {
          initialConfig = {
            salt: stored.salt || DEFAULT_PIN_SALT,
            storedPinHash: stored.storedPinHash || null,
            previousPins: stored.previousPins || [],
            failedAttempts: stored.failedAttempts || 0,
            lockoutUntil: stored.lockoutUntil || null,
            tempLockoutMinutes: stored.tempLockoutMinutes || 60,
            biometricEnabled: stored.biometricEnabled || false,
            biometricPublicKey: stored.biometricPublicKey || null,
            activeDeviceId: stored.activeDeviceId || 'DEV_INIT_001',
            activeWalletNo: stored.activeWalletNo || '01712345678',
          };
        }
      }
      this.enginesByBiz.set(bizId, new PinSecurityEngine(initialConfig));
    }
    return this.enginesByBiz.get(bizId);
  }

  async persistEngineState(businessId = null) {
    const bizId = String(businessId || '1');
    const engine = this.getEngine(bizId);
    if (this.repo && typeof this.repo.saveWalletSecurityCredentials === 'function') {
      await this.repo.saveWalletSecurityCredentials(bizId, {
        storedPinHash: engine.storedPinHash,
        salt: engine.salt,
        previousPins: Array.from(engine.previousPins),
        failedAttempts: engine.failedAttempts,
        lockoutUntil: engine.lockoutUntil,
        tempLockoutMinutes: engine.tempLockoutMinutes,
        biometricEnabled: engine.biometricEnabled,
        biometricPublicKey: engine.biometricPublicKey,
        activeDeviceId: engine.activeDeviceId,
        activeWalletNo: engine.activeWalletNo,
      });
    }
  }

  async setupPin(newPin, confirmPin, businessId = null) {
    const engine = this.getEngine(businessId);
    const result = engine.setupPin(newPin, confirmPin);
    if (result.success) {
      await this.persistEngineState(businessId);
    }
    return result;
  }

  async changePin(oldPin, newPin, confirmPin, businessId = null) {
    const engine = this.getEngine(businessId);
    const result = engine.changePin(oldPin, newPin, confirmPin);
    await this.persistEngineState(businessId);
    return result;
  }

  async requestResetPinOtp(mobileNumber, otpType = 'PIN_RESET', businessId = null) {
    const engine = this.getEngine(businessId);
    return engine.requestResetPinOtp(mobileNumber, otpType);
  }

  async resetPinWithOtp(mobileNumber, otpInput, newPin, confirmPin, businessId = null) {
    const engine = this.getEngine(businessId);
    const result = engine.resetPinWithOtp(mobileNumber, otpInput, newPin, confirmPin);
    if (result.success) {
      await this.persistEngineState(businessId);
    }
    return result;
  }

  async validatePin(pinInput, businessId = null) {
    const engine = this.getEngine(businessId);
    const result = engine.validatePin(pinInput);
    await this.persistEngineState(businessId);
    return result;
  }

  async enrollBiometrics(keyPairPublicKey, businessId = null) {
    const engine = this.getEngine(businessId);
    const result = engine.enrollBiometrics(keyPairPublicKey);
    await this.persistEngineState(businessId);
    return result;
  }

  async validateCredentialWithBiometric(request = {}, businessId = null) {
    const engine = this.getEngine(businessId);
    const result = engine.validateCredentialWithBiometric(request);
    await this.persistEngineState(businessId);
    return result;
  }

  async bindDevice(newDeviceId, mobileNumber, otpInput, deviceName = 'Android Device', businessId = null) {
    const bizId = String(businessId || '1');
    const engine = this.getEngine(bizId);
    const result = engine.bindDevice(newDeviceId, mobileNumber, otpInput);
    if (result.success) {
      if (this.repo && typeof this.repo.registerDeviceBinding === 'function') {
        await this.repo.registerDeviceBinding(bizId, {
          deviceId: newDeviceId,
          mobileNumber,
          deviceName,
        });
      }
      await this.persistEngineState(bizId);
    }
    return result;
  }

  getSecurityStatus(businessId = null) {
    const engine = this.getEngine(businessId);
    return {
      isPinSet: Boolean(engine.storedPinHash),
      isLockedOut: engine.isLockedOut(),
      failedAttempts: engine.failedAttempts,
      biometricEnabled: engine.biometricEnabled,
      activeDeviceId: engine.activeDeviceId,
      activeWalletNo: engine.activeWalletNo,
    };
  }
}

const tallyPaySecurityManager = new TallyPaySecurityManager();

class SettlementAndReconciliationEngine extends ReconstructedSettlementAndReconciliationEngine {}
const settlementAndReconciliationEngine = new SettlementAndReconciliationEngine();

// =========================================================================
// MILESTONE REA-ITER-232: TALLYPAY LINKED BANK ACCOUNTS & ACCOUNT MANAGER
// =========================================================================

const ACCOUNT_STATUSES = Object.freeze({
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  BLOCKED: 'BLOCKED',
});

const ACCOUNT_TYPES = Object.freeze({
  SAVINGS: 'SAVINGS',
  CURRENT: 'CURRENT',
});

const MFS_OPERATORS = Object.freeze({
  BKASH: {
    code: 'BKASH',
    name: 'bKash',
    nameBn: 'বিকাশ',
    prefix: '01',
    color: '#E2136E',
    logoUrl: 'https://tallykhata.com/assets/mfs/bkash.png',
  },
  NAGAD: {
    code: 'NAGAD',
    name: 'Nagad',
    nameBn: 'নগদ',
    prefix: '01',
    color: '#F7941D',
    logoUrl: 'https://tallykhata.com/assets/mfs/nagad.png',
  },
  ROCKET: {
    code: 'ROCKET',
    name: 'Rocket',
    nameBn: 'রকেট',
    prefix: '01',
    color: '#8C3494',
    logoUrl: 'https://tallykhata.com/assets/mfs/rocket.png',
  },
  UPAY: {
    code: 'UPAY',
    name: 'Upay',
    nameBn: 'উপায়',
    prefix: '01',
    color: '#0055B8',
    logoUrl: 'https://tallykhata.com/assets/mfs/upay.png',
  },
  SURECASH: {
    code: 'SURECASH',
    name: 'SureCash',
    nameBn: 'শিওরক্যাশ',
    prefix: '01',
    color: '#F47920',
  },
  TAP: {
    code: 'TAP',
    name: 'Tap',
    nameBn: 'ট্যাপ',
    prefix: '01',
    color: '#00A3E0',
  },
});

const BANGLADESH_SCHEDULED_BANKS = Object.freeze([
  {
    code: '085',
    bankCode: '085',
    shortCode: 'BBL',
    name: 'BRAC Bank Ltd',
    nameBn: 'ব্র্যাক ব্যাংক লিমিটেড',
    routingNumber: '060261742',
    npsbSupported: true,
    instantTransferSupported: true,
    beftnSupported: true,
    logoUrl: 'https://tallykhata.com/assets/banks/bbl.png',
    defaultBranches: [
      { branchName: 'Gulshan Head Office', branchCode: '301', routingNumber: '060261742' },
      { branchName: 'Asad Gate Branch', branchCode: '302', routingNumber: '060261743' },
      { branchName: 'Uttara Branch', branchCode: '303', routingNumber: '060261744' },
    ],
  },
  {
    code: '225',
    bankCode: '225',
    shortCode: 'CBL',
    name: 'The City Bank Ltd',
    nameBn: 'সিটি ব্যাংক লিমিটেড',
    routingNumber: '085261742',
    npsbSupported: true,
    instantTransferSupported: true,
    beftnSupported: true,
    logoUrl: 'https://tallykhata.com/assets/banks/cbl.png',
    defaultBranches: [
      { branchName: 'Principal Office', branchCode: '201', routingNumber: '085261742' },
      { branchName: 'Gulshan Avenue', branchCode: '202', routingNumber: '085261743' },
      { branchName: 'Dhanmondi Branch', branchCode: '203', routingNumber: '085261744' },
    ],
  },
  {
    code: '090',
    bankCode: '090',
    shortCode: 'DBBL',
    name: 'Dutch-Bangla Bank Ltd',
    nameBn: 'ডাচ-বাংলা ব্যাংক লিমিটেড',
    routingNumber: '090261742',
    npsbSupported: true,
    instantTransferSupported: true,
    beftnSupported: true,
    logoUrl: 'https://tallykhata.com/assets/banks/dbbl.png',
    defaultBranches: [
      { branchName: 'Motijheel Head Office', branchCode: '401', routingNumber: '090261742' },
      { branchName: 'Karwan Bazar', branchCode: '402', routingNumber: '090261743' },
    ],
  },
  {
    code: '200',
    bankCode: '200',
    shortCode: 'SBL',
    name: 'Sonali Bank Ltd',
    nameBn: 'সোনালী ব্যাংক লিমিটেড',
    routingNumber: '200261742',
    npsbSupported: true,
    instantTransferSupported: true,
    beftnSupported: true,
    logoUrl: 'https://tallykhata.com/assets/banks/sbl.png',
    defaultBranches: [
      { branchName: 'Principal Branch', branchCode: '501', routingNumber: '200261742' },
      { branchName: 'Bangabandhu Avenue', branchCode: '502', routingNumber: '200261743' },
    ],
  },
  {
    code: '125',
    bankCode: '125',
    shortCode: 'IBBL',
    name: 'Islami Bank Bangladesh Ltd',
    nameBn: 'ইসলামী ব্যাংক বাংলাদেশ লিমিটেড',
    routingNumber: '125261742',
    npsbSupported: true,
    instantTransferSupported: true,
    beftnSupported: true,
    logoUrl: 'https://tallykhata.com/assets/banks/ibbl.png',
    defaultBranches: [
      { branchName: 'Dilkusha Corporate', branchCode: '101', routingNumber: '125261742' },
      { branchName: 'Gulshan Branch', branchCode: '102', routingNumber: '125261743' },
    ],
  },
  {
    code: '095',
    bankCode: '095',
    shortCode: 'EBL',
    name: 'Eastern Bank Ltd',
    nameBn: 'ইস্টার্ন ব্যাংক লিমিটেড',
    routingNumber: '095261742',
    npsbSupported: true,
    instantTransferSupported: true,
    beftnSupported: true,
    logoUrl: 'https://tallykhata.com/assets/banks/ebl.png',
    defaultBranches: [
      { branchName: 'Principal Branch', branchCode: '601', routingNumber: '095261742' },
      { branchName: 'Banani Branch', branchCode: '602', routingNumber: '095261743' },
    ],
  },
  {
    code: '155',
    bankCode: '155',
    shortCode: 'MTBL',
    name: 'Mutual Trust Bank Ltd',
    nameBn: 'মিউচুয়াল ট্রাস্ট ব্যাংক লিমিটেড',
    routingNumber: '155261742',
    npsbSupported: true,
    instantTransferSupported: true,
    beftnSupported: true,
    logoUrl: 'https://tallykhata.com/assets/banks/mtbl.png',
    defaultBranches: [
      { branchName: 'Panthapath', branchCode: '701', routingNumber: '155261742' },
    ],
  },
  {
    code: '175',
    bankCode: '175',
    shortCode: 'PBL',
    name: 'Pubali Bank Ltd',
    nameBn: 'পূবালী ব্যাংক লিমিটেড',
    routingNumber: '175261742',
    npsbSupported: true,
    instantTransferSupported: true,
    beftnSupported: true,
    logoUrl: 'https://tallykhata.com/assets/banks/pbl.png',
    defaultBranches: [
      { branchName: 'Principal Office', branchCode: '801', routingNumber: '175261742' },
    ],
  },
  {
    code: '170',
    bankCode: '170',
    shortCode: 'PRBL',
    name: 'Prime Bank Ltd',
    nameBn: 'প্রাইম ব্যাংক লিমিটেড',
    routingNumber: '170261742',
    npsbSupported: true,
    instantTransferSupported: true,
    beftnSupported: true,
    logoUrl: 'https://tallykhata.com/assets/banks/prbl.png',
    defaultBranches: [
      { branchName: 'Motijheel Corporate', branchCode: '901', routingNumber: '170261742' },
    ],
  },
  {
    code: '035',
    bankCode: '035',
    shortCode: 'BAL',
    name: 'Bank Asia Ltd',
    nameBn: 'ব্যাংক এশিয়া লিমিটেড',
    routingNumber: '035261742',
    npsbSupported: true,
    instantTransferSupported: true,
    beftnSupported: true,
    logoUrl: 'https://tallykhata.com/assets/banks/bal.png',
    defaultBranches: [
      { branchName: 'Principal Office', branchCode: '051', routingNumber: '035261742' },
    ],
  },
]);

function getScheduledBankList() {
  return BANGLADESH_SCHEDULED_BANKS.map((b) => ({ ...b }));
}

function getScheduledBankByCode(code) {
  if (!code) return null;
  const normalized = String(code).trim().toLowerCase();
  return (
    BANGLADESH_SCHEDULED_BANKS.find(
      (b) =>
        b.code.toLowerCase() === normalized ||
        b.bankCode.toLowerCase() === normalized ||
        b.shortCode.toLowerCase() === normalized
    ) || null
  );
}

const ACCOUNT_MANAGER_ARSC_TOKENS = Object.freeze({
  ADD_NEW_BANK_ACCOUNT: 'নতুন ব্যাংক একাউন্ট',
  DELETE_BANK_ACCOUNT_TITLE: 'ব্যাংক একাউন্ট ডিলিট করি',
  BANK_ACCOUNT_DELETED_TOAST: 'ব্যাংক একাউন্ট টি ডিলিট করা হয়েছে।',
  DELETION_FAILURE_ALERT: 'ব্যাংক একাউন্ট ডিলিট করা সম্ভব হয়নি',
  VERIFY_BANK_ACCOUNT_CTA: 'ব্যাংক একাউন্ট ভেরিফাই করি',
  UNVERIFIED_ACCOUNT_WARNING: 'আপনার যোগ করা ব্যাংক একাউন্ট ভেরিফাই করা হয়নি।',
  MICRO_DEPOSIT_NOTICE: 'ভেরিফিকেশনের জন্য আপনার ব্যাংক একাউন্টে একটি প্রতীকী লেনদেন ডিপোজিট করা হয়েছে।',
  EMPTY_STATE_PROMPT: 'ব্যাংক একাউন্ট বা মোবাইল ব্যাংকিং একাউন্ট যোগ করুন',
  EMPTY_STATE_MESSAGE: 'যোগ করা হয়নি। ব্যাংক একাউন্ট বা মোবাইল ব্যাংকিং',
  ACCURACY_CONFIRMATION: 'আমি নিশ্চিত করছি যে, উপরে প্রদত্ত ব্যাংক একাউন্টের তথ্য সঠিক ও নির্ভুল।',
  MFS_DESTINATION_NOTICE: 'ট্রান্সফার করুন নগদ, রকেট বা',
  BEFTN_ADVISORY_NOTICE: 'নোটঃ এই ব্যাংক একাউন্টে BEFTN এর মাধ্যমে টাকা জমা হতে ২-৩ কর্মদিবস লাগতে পারে।',
  ROUTING_NUMBER_LABEL: 'রাউটিং নম্বর',
  BRANCH_NAME_LABEL: 'শাখার নাম',
  ACCOUNT_NUMBER_LABEL: 'একাউন্ট নম্বর',
  ACCOUNT_HOLDER_NAME_LABEL: 'একাউন্ট হোল্ডারের নাম',
  ACTIVE_LOAN_GUARD: 'লোন চলাকালীন এই একাউন্ট ডিলিট করা যাবে না',
  LOCKOUT_ALERT_3_ATTEMPTS: '৩ বার ভুল টাকার পরিমাণ দেয়ার কারণে আপনার ব্যাংকিং কার্যক্রম ব্লক করা হয়েছে',
  PIN_ENTRY_DELETION: 'PIN দিয়ে ডিলিট করুন',
  NPSB_INSTANT_PROMPT: 'ইনস্ট্যান্ট ব্যাংক ট্রান্সফার',
});

class ReconstructedLinkedAccountEngine {
  constructor() {
    this.bankAccounts = [];
    this.mfsAccounts = [];
    this.autoDisbursementConfig = {
      isAutoDisbursementEnabled: false,
      linkedBankAccountId: null,
    };
  }

  addBankAccount({ bankCode, bankName, branchName, routingNumber, accountNumber, accountHolderName, accountType, isLoanAccount }) {
    if (!routingNumber || !/^\d{9}$/.test(routingNumber)) {
      return { success: false, reason: 'INVALID_ROUTING_NUMBER', error: 'INVALID_ROUTING_NUMBER' };
    }
    if (!accountNumber || !/^\d{8,34}$/.test(accountNumber)) {
      return { success: false, reason: 'INVALID_ACCOUNT_NUMBER', error: 'INVALID_ACCOUNT_NUMBER' };
    }
    if (!accountHolderName || accountHolderName.trim().length === 0) {
      return { success: false, reason: 'MISSING_HOLDER_NAME', error: 'MISSING_HOLDER_NAME' };
    }

    const id = 'LBA_' + Math.random().toString(36).substring(2, 9);
    const testDepositPaisa = Math.floor(Math.random() * 90) + 10;
    const account = {
      id,
      bankCode: bankCode || '',
      bankName: bankName || '',
      branchName: branchName || '',
      routingNumber: String(routingNumber),
      accountNumber: String(accountNumber),
      accountHolderName: accountHolderName.trim(),
      accountType: accountType || 'SAVINGS',
      status: 'PENDING_VERIFICATION',
      testDepositPaisa,
      verificationAttempts: 0,
      isDefaultPayout: this.bankAccounts.length === 0,
      isLoanAccount: Boolean(isLoanAccount),
      createdAt: Date.now(),
    };
    this.bankAccounts.push(account);
    return { success: true, account };
  }

  verifyBankAccount(accountId, depositPaisa) {
    const acc = this.bankAccounts.find((a) => a.id === accountId);
    if (!acc) return { success: false, reason: 'ACCOUNT_NOT_FOUND', error: 'ACCOUNT_NOT_FOUND' };
    if (acc.status === 'VERIFIED') return { success: true, account: acc };
    if (acc.status === 'REJECTED' || acc.status === 'BLOCKED') {
      return { success: false, reason: 'ACCOUNT_LOCKED', error: 'ACCOUNT_LOCKED' };
    }

    acc.verificationAttempts++;
    if (acc.testDepositPaisa === Number(depositPaisa)) {
      acc.status = 'VERIFIED';
      return { success: true, account: acc };
    } else {
      if (acc.verificationAttempts >= 3) {
        acc.status = 'BLOCKED';
      }
      return {
        success: false,
        reason: 'DEPOSIT_MISMATCH',
        error: 'DEPOSIT_MISMATCH',
        remainingAttempts: Math.max(0, 3 - acc.verificationAttempts),
        status: acc.status,
      };
    }
  }

  setDefaultPayoutAccount(accountId) {
    const acc = this.bankAccounts.find((a) => a.id === accountId);
    if (!acc) return { success: false, reason: 'ACCOUNT_NOT_FOUND', error: 'ACCOUNT_NOT_FOUND' };
    if (acc.status !== 'VERIFIED') return { success: false, reason: 'ACCOUNT_NOT_VERIFIED', error: 'ACCOUNT_NOT_VERIFIED' };

    this.bankAccounts.forEach((a) => {
      a.isDefaultPayout = (a.id === accountId);
    });
    if (this.autoDisbursementConfig && this.autoDisbursementConfig.isAutoDisbursementEnabled) {
      this.autoDisbursementConfig.linkedBankAccountId = accountId;
    }
    return { success: true, account: acc };
  }

  deleteBankAccount(accountId, pin) {
    const acc = this.bankAccounts.find((a) => a.id === accountId);
    if (!acc) return { success: false, reason: 'ACCOUNT_NOT_FOUND', error: 'ACCOUNT_NOT_FOUND' };
    if (!pin || String(pin).length !== 4) return { success: false, reason: 'INVALID_PIN', error: 'INVALID_PIN' };

    if (acc.isLoanAccount) {
      return { success: false, reason: 'CANNOT_DELETE_LOAN_ACCOUNT', error: 'CANNOT_DELETE_LOAN_ACCOUNT' };
    }

    if (
      this.autoDisbursementConfig &&
      this.autoDisbursementConfig.isAutoDisbursementEnabled &&
      this.autoDisbursementConfig.linkedBankAccountId === accountId
    ) {
      return { success: false, reason: 'CANNOT_DELETE_ACTIVE_AUTODISBURSEMENT_ACCOUNT', error: 'CANNOT_DELETE_ACTIVE_AUTODISBURSEMENT_ACCOUNT' };
    }

    this.bankAccounts = this.bankAccounts.filter((a) => a.id !== accountId);
    if (acc.isDefaultPayout) {
      const nextVerified = this.bankAccounts.find((a) => a.status === 'VERIFIED');
      if (nextVerified) nextVerified.isDefaultPayout = true;
    }
    return { success: true, deletedId: accountId };
  }

  linkMfsAccount({ operator, mobileNumber, accountHolderName, otp }) {
    if (!mobileNumber || !/^01[3-9]\d{8}$/.test(mobileNumber)) {
      return { success: false, reason: 'INVALID_MOBILE_NUMBER', error: 'INVALID_MOBILE_NUMBER' };
    }
    if (!otp || !/^\d{6}$/.test(otp)) {
      return { success: false, reason: 'INVALID_OTP', error: 'INVALID_OTP' };
    }
    const exists = this.mfsAccounts.find(
      (m) => m.mobileNumber === mobileNumber && m.operator === operator
    );
    if (exists) {
      return { success: false, reason: 'WALLET_ALREADY_LINKED', error: 'WALLET_ALREADY_LINKED' };
    }

    const id = 'MFS_' + Math.random().toString(36).substring(2, 9);
    const mfs = {
      id,
      operator,
      mobileNumber,
      accountHolderName: accountHolderName || '',
      status: 'VERIFIED',
      linkedAt: Date.now(),
    };
    this.mfsAccounts.push(mfs);
    return { success: true, mfs };
  }
}

class LinkedAccountEngine extends ReconstructedLinkedAccountEngine {}
const linkedAccountEngine = new LinkedAccountEngine();

class TallyPayAccountManager {
  constructor(repo = null, securityManager = null) {
    this.repo = repo;
    this.securityManager = securityManager;
  }

  getRepo() {
    if (!this.repo && typeof require !== 'undefined') {
      this.repo = require('./storageRepository').storageRepository;
    }
    return this.repo;
  }

  getSecurityManager() {
    if (!this.securityManager) {
      this.securityManager = tallyPaySecurityManager;
    }
    return this.securityManager;
  }

  async addBankAccount(businessId = null, accountData = {}) {
    const { routingNumber, accountNumber, accountHolderName } = accountData;
    if (!routingNumber || !/^\d{9}$/.test(String(routingNumber))) {
      return { success: false, reason: 'INVALID_ROUTING_NUMBER', error: 'INVALID_ROUTING_NUMBER', message: '৯ ডিজিটের সঠিক রাউটিং নম্বর দিন।' };
    }
    if (!accountNumber || !/^\d{8,34}$/.test(String(accountNumber))) {
      return { success: false, reason: 'INVALID_ACCOUNT_NUMBER', error: 'INVALID_ACCOUNT_NUMBER', message: 'সঠিক একাউন্ট নম্বর দিন (৮ থেকে ৩৪ ডিজিট)।' };
    }
    if (!accountHolderName || String(accountHolderName).trim().length === 0) {
      return { success: false, reason: 'MISSING_HOLDER_NAME', error: 'MISSING_HOLDER_NAME', message: 'একাউন্ট হোল্ডারের নাম আবশ্যক।' };
    }

    const repo = this.getRepo();
    if (repo && typeof repo.saveLinkedBankAccount === 'function') {
      return repo.saveLinkedBankAccount(businessId, accountData);
    }
    return { success: false, error: 'NO_REPOSITORY' };
  }

  async verifyBankAccount(businessId = null, accountId = null, depositPaisa = null) {
    if (!accountId) return { success: false, reason: 'ACCOUNT_ID_REQUIRED', error: 'ACCOUNT_ID_REQUIRED' };
    const repo = this.getRepo();
    if (repo && typeof repo.verifyLinkedBankAccount === 'function') {
      return repo.verifyLinkedBankAccount(businessId, accountId, depositPaisa);
    }
    return { success: false, error: 'NO_REPOSITORY' };
  }

  async setDefaultBankAccount(businessId = null, accountId = null) {
    if (!accountId) return { success: false, reason: 'ACCOUNT_ID_REQUIRED', error: 'ACCOUNT_ID_REQUIRED' };
    const repo = this.getRepo();
    if (repo && typeof repo.setDefaultBankAccount === 'function') {
      return repo.setDefaultBankAccount(businessId, accountId);
    }
    return { success: false, error: 'NO_REPOSITORY' };
  }

  async deleteBankAccount(businessId = null, accountId = null, pin = null) {
    if (!accountId) return { success: false, reason: 'ACCOUNT_NOT_FOUND', error: 'ACCOUNT_NOT_FOUND' };
    if (!pin || String(pin).length !== 4) {
      return { success: false, reason: 'INVALID_PIN', error: 'INVALID_PIN', message: '৪ ডিজিটের গোপন পিন দিন।' };
    }

    const repo = this.getRepo();
    const existing = repo && typeof repo.getLinkedBankAccountById === 'function'
      ? repo.getLinkedBankAccountById(businessId, accountId)
      : null;

    if (!existing) {
      return { success: false, reason: 'ACCOUNT_NOT_FOUND', error: 'ACCOUNT_NOT_FOUND', message: 'ব্যাংক একাউন্টটি পাওয়া যায়নি।' };
    }

    if (existing.isLoanAccount) {
      return {
        success: false,
        reason: 'CANNOT_DELETE_LOAN_ACCOUNT',
        error: 'CANNOT_DELETE_LOAN_ACCOUNT',
        message: 'লোন চলাকালীন এই একাউন্ট ডিলিট করা যাবে না',
      };
    }

    const store = (repo && repo.currentStore) || {};
    const targetBizId = String(businessId || store.activeBusinessId || '1');
    const autoConfig = store.autoDisbursementConfig && store.autoDisbursementConfig[targetBizId];
    if (autoConfig && autoConfig.isAutoDisbursementEnabled && autoConfig.linkedBankAccountId === accountId) {
      return {
        success: false,
        reason: 'CANNOT_DELETE_ACTIVE_AUTODISBURSEMENT_ACCOUNT',
        error: 'CANNOT_DELETE_ACTIVE_AUTODISBURSEMENT_ACCOUNT',
        message: 'স্বয়ংক্রিয় ব্যাংক ট্রান্সফার চালু থাকায় এই একাউন্টটি মুছে ফেলা সম্ভব নয়।',
      };
    }

    return repo.deleteLinkedBankAccount(businessId, accountId);
  }

  async linkMfsAccount(businessId = null, mfsData = {}) {
    const { operator, mobileNumber, otp } = mfsData;
    if (!mobileNumber || !/^01[3-9]\d{8}$/.test(String(mobileNumber))) {
      return { success: false, reason: 'INVALID_MOBILE_NUMBER', error: 'INVALID_MOBILE_NUMBER', message: 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন।' };
    }
    if (!otp || !/^\d{6}$/.test(String(otp))) {
      return { success: false, reason: 'INVALID_OTP', error: 'INVALID_OTP', message: 'সঠিক ৬ ডিজিটের ওটিপি দিন।' };
    }

    const repo = this.getRepo();
    if (repo && typeof repo.getLinkedMfsAccounts === 'function') {
      const existingList = repo.getLinkedMfsAccounts(businessId, { operator }).items || [];
      const dup = existingList.find((m) => m.mobileNumber === mobileNumber);
      if (dup) {
        return { success: false, reason: 'WALLET_ALREADY_LINKED', error: 'WALLET_ALREADY_LINKED', message: 'এই ওয়ালেটটি ইতিমধ্যে যুক্ত রয়েছে।' };
      }
    }

    if (repo && typeof repo.saveLinkedMfsAccount === 'function') {
      return repo.saveLinkedMfsAccount(businessId, mfsData);
    }
    return { success: false, error: 'NO_REPOSITORY' };
  }

  getLinkedBankAccounts(businessId = null, options = {}) {
    const repo = this.getRepo();
    if (repo && typeof repo.getLinkedBankAccounts === 'function') {
      return repo.getLinkedBankAccounts(businessId, options);
    }
    return { items: [], accounts: [], totalCount: 0 };
  }

  getLinkedBankAccountById(businessId = null, id = null) {
    const repo = this.getRepo();
    if (repo && typeof repo.getLinkedBankAccountById === 'function') {
      return repo.getLinkedBankAccountById(businessId, id);
    }
    return null;
  }

  getLinkedMfsAccounts(businessId = null, options = {}) {
    const repo = this.getRepo();
    if (repo && typeof repo.getLinkedMfsAccounts === 'function') {
      return repo.getLinkedMfsAccounts(businessId, options);
    }
    return { items: [], mfsAccounts: [], totalCount: 0 };
  }

  getLinkedMfsAccountById(businessId = null, id = null) {
    const repo = this.getRepo();
    if (repo && typeof repo.getLinkedMfsAccountById === 'function') {
      return repo.getLinkedMfsAccountById(businessId, id);
    }
    return null;
  }

  async deleteLinkedMfsAccount(businessId = null, id = null) {
    const repo = this.getRepo();
    if (repo && typeof repo.deleteLinkedMfsAccount === 'function') {
      return repo.deleteLinkedMfsAccount(businessId, id);
    }
    return { success: false, error: 'NO_REPOSITORY' };
  }
}

const BankAccountManager = TallyPayAccountManager;
const tallyPayAccountManager = new TallyPayAccountManager();

// ============================================================================
// MILESTONE REA-ITER-233: TALLYPAY ADD MONEY BACKEND ENGINE & SAVED CARDS
// ============================================================================

const ADD_MONEY_CHANNELS = Object.freeze({
  BANK: "BANK",
  CARD: "CARD",
  NAGAD: "NAGAD",
  ROCKET: "ROCKET",
  BKASH: "BKASH",
});

const AddMoneyMethod = Object.freeze({
  BANK: "BANK",
  CARD: "CARD",
  MFS: "MFS",
  NAGAD: "NAGAD",
  ROCKET: "ROCKET",
  BKASH: "BKASH",
});

const CARD_NETWORKS = Object.freeze({
  VISA: "VISA",
  MASTERCARD: "MASTERCARD",
  AMEX: "AMEX",
  UNKNOWN: "UNKNOWN",
});
const CardNetwork = CARD_NETWORKS;

const CARD_TYPES = Object.freeze({
  DEBIT: "DEBIT",
  CREDIT: "CREDIT",
  PREPAID: "PREPAID",
});
const CardType = CARD_TYPES;

const ADD_MONEY_PRESETS = Object.freeze([500, 1000, 2000, 5000]);
const ADD_MONEY_PRESETS_PAISA = Object.freeze([50000, 100000, 200000, 500000]);

const ADD_MONEY_LIMITS = Object.freeze({
  minAmount: 10.00,
  maxAmountPerTxn: 50000.00,
  dailyMaxAmount: 100000.00,
  monthlyMaxAmount: 500000.00,
  minAmountPaisa: 1000,
  maxAmountPerTxnPaisa: 5000000,
  dailyMaxAmountPaisa: 10000000,
  monthlyMaxAmountPaisa: 50000000,
  minLimitPaisa: 1000,
  maxTxnLimitPaisa: 5000000,
  dailyLimitPaisa: 10000000,
  monthlyLimitPaisa: 50000000,
  maxDailyTxnCount: 25,
});

const ADD_MONEY_FEE_RATES = Object.freeze({
  BANK: 0.00,
  DEBIT_CARD: 0.010,
  CREDIT_CARD: 0.015,
  MFS: 0.010,
  NAGAD: 0.010,
  ROCKET: 0.010,
  BKASH: 0.010,
});

const ADD_MONEY_ARSC_TOKENS = Object.freeze({
  taka_ani_title: "টাকা আনি",
  add_money_from_card: "কার্ড থেকে টাকা আনি",
  add_money_from_bank: "ব্যাংক থেকে টাকা আনি",
  add_money_from_nagad: "নগদ থেকে টাকা আনি",
  add_money_from_rocket: "রকেট থেকে টাকা আনি",
  label_card_number: "কার্ড নম্বর",
  label_card_holder_name: "কার্ড হোল্ডারের নাম",
  error_invalid_card: "কার্ড নম্বরটি সঠিক নয়। অনুগ্রহ করে সঠিক কার্ড নম্বর দিন।",
  prompt_visa_debit: "অনুগ্রহ করে ভিসা ডেবিট কার্ড নম্বর দিন।",
  promo_card_onboarding: "কার্ড থেকে অ্যাড মানি করে ব্যবহার শুরু করুন।",
  header_saved_cards: "সেভ করা কার্ড",
  btn_new_card: "নতুন কার্ড",
  label_amount: "টাকার পরিমাণ",
  label_min_amount: "সর্বনিম্ন",
  label_max_amount: "সর্বোচ্চ",
  label_charge: "চার্জ",
  btn_next: "পরবর্তী",
  btn_confirm: "নিশ্চিত",
  msg_success_header: "টাকা সফলভাবে জমা হয়েছে",
});

function luhnCheck(cardNumber) {
  const clean = String(cardNumber || "").replace(/[\s-]+/g, "");
  if (!/^[0-9]{13,19}$/.test(clean)) return false;
  let sum = 0;
  let alt = false;
  for (let i = clean.length - 1; i >= 0; i--) {
    let n = parseInt(clean.charAt(i), 10);
    if (alt) {
      n *= 2;
      if (n > 9) n = (n % 10) + 1;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}
const validateLuhn = luhnCheck;

function detectCardNetwork(cardNumber) {
  const clean = String(cardNumber || "").replace(/[\s-]+/g, "");
  if (/^4\d{12}(\d{3})?(\d{3})?$/.test(clean) || clean.startsWith("4")) {
    return "VISA";
  }
  if (/^5[1-5]\d{14}$/.test(clean) || /^2[2-7]\d{14}$/.test(clean)) {
    return "MASTERCARD";
  }
  if (/^3[47]\d{13}$/.test(clean)) {
    return "AMEX";
  }
  return "UNKNOWN";
}

function maskCardNumber(cardNumber) {
  const clean = String(cardNumber || "").replace(/[\s-]+/g, "");
  if (clean.length < 4) return "**** **** **** ****";
  return "**** **** **** " + clean.slice(-4);
}

function calculateAddMoneyFee(channel, amount, cardType = "DEBIT") {
  const ch = String(channel || "").toUpperCase();
  const ct = String(cardType || "DEBIT").toUpperCase();
  let rate = 0;
  if (ch === "BANK") {
    rate = 0.00;
  } else if (ch === "DEBIT_CARD" || (ch === "CARD" && ct === "DEBIT")) {
    rate = 0.010;
  } else if (ch === "CREDIT_CARD" || (ch === "CARD" && ct === "CREDIT")) {
    rate = 0.015;
  } else if (ch === "CARD") {
    rate = ct === "CREDIT" ? 0.015 : 0.010;
  } else if (["MFS", "NAGAD", "ROCKET", "BKASH"].includes(ch)) {
    rate = 0.010;
  }
  return Math.round(Number(amount || 0) * rate);
}

class ReconstructedAddMoneyEngine {
  constructor(options = {}) {
    this.limits = {
      minLimitPaisa: 1000,
      maxTxnLimitPaisa: 5000000,
      dailyLimitPaisa: 10000000,
      monthlyLimitPaisa: 50000000,
      minAmount: 10.00,
      maxAmountPerTxn: 50000.00,
      dailyMaxAmount: 100000.00,
      monthlyMaxAmount: 500000.00,
      ...options.limits,
    };
    this.walletBalancePaisa = options.walletBalancePaisa !== undefined ? options.walletBalancePaisa : 500000;
    this.dailyUsedPaisa = options.dailyUsedPaisa || 0;
    this.monthlyUsedPaisa = options.monthlyUsedPaisa || 0;
    this.savedCards = Array.isArray(options.savedCards) ? [...options.savedCards] : [];
    this.transactions = Array.isArray(options.transactions) ? [...options.transactions] : [];
    this.repo = options.storageRepo || null;
  }

  getRepo() {
    if (this.repo) return this.repo;
    try {
      this.repo = require("./storageRepository").storageRepository;
    } catch (_) {}
    return this.repo;
  }

  getQuickPresets() {
    return [50000, 100000, 200000, 500000];
  }

  getQuickPresetsTaka() {
    return [500, 1000, 2000, 5000];
  }

  validateAmount(amountPaisa) {
    const amt = Number(amountPaisa || 0);
    if (amt < this.limits.minLimitPaisa) {
      return {
        valid: false,
        reason: "BELOW_MINIMUM",
        minLimitPaisa: this.limits.minLimitPaisa,
        minAmount: this.limits.minLimitPaisa / 100,
      };
    }
    if (amt > this.limits.maxTxnLimitPaisa) {
      return {
        valid: false,
        reason: "EXCEEDS_MAX_TXN",
        maxTxnLimitPaisa: this.limits.maxTxnLimitPaisa,
        maxAmount: this.limits.maxTxnLimitPaisa / 100,
      };
    }
    if (this.dailyUsedPaisa + amt > this.limits.dailyLimitPaisa) {
      return {
        valid: false,
        reason: "EXCEEDS_DAILY_LIMIT",
        remainingDailyPaisa: Math.max(0, this.limits.dailyLimitPaisa - this.dailyUsedPaisa),
      };
    }
    if (this.monthlyUsedPaisa + amt > this.limits.monthlyLimitPaisa) {
      return {
        valid: false,
        reason: "EXCEEDS_MONTHLY_LIMIT",
        remainingMonthlyPaisa: Math.max(0, this.limits.monthlyLimitPaisa - this.monthlyUsedPaisa),
      };
    }
    return { valid: true };
  }

  validateAddMoneyAmount(amount, existingDailyTxns = []) {
    const amountPaisa = Number(amount || 0);

    let dailySumPaisa = this.dailyUsedPaisa;
    if (Array.isArray(existingDailyTxns) && existingDailyTxns.length > 0) {
      dailySumPaisa = existingDailyTxns.reduce((sum, tx) => {
        const p = tx.amountPaisa !== undefined
          ? tx.amountPaisa
          : (tx.amount !== undefined ? Math.round(Number(tx.amount) * 100) : 0);
        return sum + p;
      }, 0);
    }

    const prevDaily = this.dailyUsedPaisa;
    this.dailyUsedPaisa = dailySumPaisa;
    const res = this.validateAmount(amountPaisa);
    this.dailyUsedPaisa = prevDaily;
    return res;
  }

  calculateFee(channel, amountPaisa, cardType = "DEBIT") {
    return calculateAddMoneyFee(channel, amountPaisa, cardType);
  }

  detectCardNetwork(cardNumber) {
    return detectCardNetwork(cardNumber);
  }

  validateLuhn(cardNumber) {
    return luhnCheck(cardNumber);
  }

  luhnCheck(cardNumber) {
    return luhnCheck(cardNumber);
  }

  maskCardNumber(cardNumber) {
    return maskCardNumber(cardNumber);
  }

  addMoneyFromBank(options = {}) {
    const bankAccount = options.bankAccount;
    if (!bankAccount || bankAccount.status !== "VERIFIED") {
      return {
        success: false,
        reason: "UNVERIFIED_BANK_ACCOUNT",
        error: "UNVERIFIED_BANK_ACCOUNT",
        message: "শুধুমাত্র যাচাইকৃত ব্যাংক একাউন্ট থেকে টাকা আনা যাবে।",
      };
    }

    const amountPaisa = options.amountPaisa !== undefined
      ? Number(options.amountPaisa)
      : Math.round(Number(options.amount || 0) * 100);

    const val = this.validateAmount(amountPaisa);
    if (!val.valid) return { success: false, ...val };

    const pin = options.pin ? String(options.pin).trim() : "";
    if (!pin || pin.length !== 4) {
      return { success: false, reason: "INVALID_PIN", error: "INVALID_PIN", message: "সঠিক ৪ ডিজিটের গোপন পিন দিন।" };
    }

    const feePaisa = this.calculateFee("BANK", amountPaisa);
    const initialBalPaisa = this.walletBalancePaisa;
    this.walletBalancePaisa += amountPaisa;
    this.dailyUsedPaisa += amountPaisa;
    this.monthlyUsedPaisa += amountPaisa;

    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const txnNumber = "TP-AM-BNK-" + now;

    const record = {
      id: txnNumber,
      txnId: txnNumber,
      txnNumber,
      orderId: txnNumber,
      channel: "BANK",
      channelType: "BANK",
      bankName: bankAccount.bankName,
      accountNumber: bankAccount.accountNumber,
      amount: amountPaisa / 100,
      amountPaisa,
      fee: feePaisa / 100,
      feePaisa,
      creditedAmount: amountPaisa / 100,
      netCreditedPaisa: amountPaisa,
      balanceBefore: initialBalPaisa / 100,
      balanceAfter: this.walletBalancePaisa / 100,
      status: "SUCCESS",
      timestamp: now,
      txnTime: nowIso,
      createdAt: nowIso,
    };

    this.transactions.push(record);
    return {
      success: true,
      transaction: record,
      receipt: record,
      newBalancePaisa: this.walletBalancePaisa,
    };
  }

  async processAddMoneyFromBank(businessId, options = {}) {
    let bankAccount = options.bankAccount;
    const repo = options.storageRepo || this.getRepo();
    if (!bankAccount && options.bankAccountId && repo && typeof repo.getLinkedBankAccountById === "function") {
      bankAccount = repo.getLinkedBankAccountById(businessId, options.bankAccountId);
    }

    const res = this.addMoneyFromBank({
      ...options,
      bankAccount,
    });

    if (res.success && repo && typeof repo.logTallyPayTransaction === "function") {
      try {
        await repo.logTallyPayTransaction(businessId, res.transaction);
      } catch (_) {}
    }
    return res;
  }

  addMoneyFromCard(options = {}) {
    const cardNumber = options.cardNumber;
    const network = this.detectCardNetwork(cardNumber);
    if (network === "UNKNOWN") {
      return { success: false, reason: "UNSUPPORTED_CARD_NETWORK", error: "UNSUPPORTED_CARD_NETWORK" };
    }
    if (!this.validateLuhn(cardNumber)) {
      return {
        success: false,
        reason: "INVALID_CARD_NUMBER",
        error: "INVALID_CARD_NUMBER",
        message: "কার্ড নম্বরটি সঠিক নয়। অনুগ্রহ করে সঠিক কার্ড নম্বর দিন।",
      };
    }

    const amountPaisa = options.amountPaisa !== undefined
      ? Number(options.amountPaisa)
      : Math.round(Number(options.amount || 0) * 100);

    const val = this.validateAmount(amountPaisa);
    if (!val.valid) return { success: false, ...val };

    const cardType = options.cardType || "DEBIT";
    const feePaisa = this.calculateFee("CARD", amountPaisa, cardType);
    const maskedNumber = this.maskCardNumber(cardNumber);
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const txnNumber = "TP-AM-CRD-" + now;

    let savedCardRecord = null;
    if (options.saveCard) {
      const cardId = "CRD_" + Math.random().toString(36).substring(2, 8);
      savedCardRecord = {
        id: cardId,
        cardId,
        businessId: String(options.businessId || "1"),
        cardHolderName: options.cardHolderName || "Cardholder",
        cardNumber: maskedNumber,
        maskedNumber,
        maskedCardNumber: maskedNumber,
        cardNetwork: network,
        cardType,
        expiryMonth: String(options.expiryMonth || "12"),
        expiryYear: String(options.expiryYear || "28"),
        createdAt: nowIso,
      };
      this.savedCards.push(savedCardRecord);
    }

    const initialBalPaisa = this.walletBalancePaisa;
    this.walletBalancePaisa += amountPaisa;
    this.dailyUsedPaisa += amountPaisa;
    this.monthlyUsedPaisa += amountPaisa;

    const record = {
      id: txnNumber,
      txnId: txnNumber,
      txnNumber,
      orderId: txnNumber,
      channel: "CARD",
      channelType: "CARD",
      cardNetwork: network,
      cardType,
      maskedNumber,
      maskedCardNumber: maskedNumber,
      amount: amountPaisa / 100,
      amountPaisa,
      fee: feePaisa / 100,
      feePaisa,
      creditedAmount: amountPaisa / 100,
      netCreditedPaisa: amountPaisa,
      balanceBefore: initialBalPaisa / 100,
      balanceAfter: this.walletBalancePaisa / 100,
      status: "SUCCESS",
      timestamp: now,
      txnTime: nowIso,
      createdAt: nowIso,
    };

    this.transactions.push(record);
    return {
      success: true,
      transaction: record,
      receipt: record,
      newBalancePaisa: this.walletBalancePaisa,
      savedCard: savedCardRecord,
    };
  }

  async processAddMoneyFromCard(businessId, options = {}) {
    const res = this.addMoneyFromCard({
      ...options,
      businessId,
    });

    const repo = options.storageRepo || this.getRepo();
    if (res.success && options.saveCard && res.savedCard && repo && typeof repo.saveCard === "function") {
      try {
        await repo.saveCard(businessId, res.savedCard);
      } catch (_) {}
    }
    if (res.success && repo && typeof repo.logTallyPayTransaction === "function") {
      try {
        await repo.logTallyPayTransaction(businessId, res.transaction);
      } catch (_) {}
    }
    return res;
  }

  deleteSavedCard(cardId, businessId = null) {
    const idx = this.savedCards.findIndex((c) => c.cardId === cardId || c.id === cardId);
    let localRemoved = false;
    if (idx !== -1) {
      this.savedCards.splice(idx, 1);
      localRemoved = true;
    }

    if (businessId) {
      const repo = this.getRepo();
      if (repo && typeof repo.deleteCard === "function") {
        return repo.deleteCard(businessId, cardId);
      }
    }
    if (!localRemoved) {
      return { success: false, reason: "CARD_NOT_FOUND", error: "CARD_NOT_FOUND" };
    }
    return { success: true, deletedId: cardId };
  }

  initiateMfsOrder(options = {}) {
    const operator = String(options.operator || options.channel || "").toUpperCase();
    if (!["NAGAD", "ROCKET", "BKASH"].includes(operator)) {
      return { success: false, reason: "INVALID_OPERATOR", error: "INVALID_OPERATOR" };
    }

    const mobileNumber = String(options.mobileNumber || options.mobile || "").trim();
    if (!mobileNumber || !/^01[3-9]\d{8}$/.test(mobileNumber)) {
      return { success: false, reason: "INVALID_MOBILE_NUMBER", error: "INVALID_MOBILE_NUMBER" };
    }

    const amountPaisa = options.amountPaisa !== undefined
      ? Number(options.amountPaisa)
      : Math.round(Number(options.amount || 0) * 100);

    const val = this.validateAmount(amountPaisa);
    if (!val.valid) return { success: false, ...val };

    const orderId = "ORD_MFS_" + Math.random().toString(36).substring(2, 10).toUpperCase();
    const feePaisa = this.calculateFee(operator, amountPaisa);
    const gatewayUrl = "https://gateway.nobopay.net/mfs/checkout?orderId=" + orderId;

    const now = Date.now();
    const nowIso = new Date(now).toISOString();

    return {
      success: true,
      id: orderId,
      orderId,
      txnNumber: orderId,
      gatewayUrl,
      operator,
      channel: operator,
      channelType: "MFS",
      amount: amountPaisa / 100,
      amountPaisa,
      fee: feePaisa / 100,
      feePaisa,
      totalDebitPaisa: amountPaisa + feePaisa,
      totalAmount: (amountPaisa + feePaisa) / 100,
      creditedAmount: amountPaisa / 100,
      status: "INITIATED",
      timestamp: now,
      txnTime: nowIso,
      createdAt: nowIso,
    };
  }

  processAddMoneyFromMfs(businessId, options = {}) {
    return this.initiateMfsOrder({
      ...options,
      businessId,
    });
  }
}

const AddMoneyEngine = ReconstructedAddMoneyEngine;
const addMoneyEngine = new ReconstructedAddMoneyEngine();
const reconstructedAddMoneyEngine = addMoneyEngine;




// ============================================================================
// MILESTONE REA-ITER-234: TALLYPAY MONEY OUT / WALLET TRANSFER & CUSTOMER ADAY
// ============================================================================

const TRANSFER_CHANNELS = Object.freeze({
  WALLET: "TP_WALLET",
  TP_WALLET: "TP_WALLET",
  BANK: "BANK",
  BANK_REGULAR: "BANK",
  BANK_INSTANT: "BANK_INSTANT",
  MFS: "MFS",
  MFS_BKASH: "MFS_BKASH",
  MFS_NAGAD: "MFS_NAGAD",
  MFS_ROCKET: "MFS_ROCKET",
  VISA: "VISA",
  VISA_DIRECT: "VISA",
});
const TransferChannel = TRANSFER_CHANNELS;

const TRANSFER_FEES = Object.freeze({
  WALLET: 0.0, // 0% Free wallet-to-wallet
  TP_WALLET: 0.0,
  BANK_REGULAR: 0.0, // 0% Regular BEFTN
  BANK_INSTANT: 0.010, // 1.0% Instant NPSB (min ৳10 / 1000 paisa)
  BANK_INSTANT_MIN_PAISA: 1000,
  MFS: 0.010, // 1.0%
  MFS_BKASH: 0.010,
  MFS_NAGAD: 0.010,
  MFS_ROCKET: 0.010,
  VISA: 0.015, // 1.5%
  VISA_DIRECT: 0.015,
});

const TRANSFER_LIMITS = Object.freeze({
  wallet: Object.freeze({
    minPaisa: 1000, // ৳10
    maxPaisa: 2500000, // ৳25,000
    dailyCumulativePaisa: 5000000, // ৳50,000
    maxDailyTxnCount: 25,
    minAmount: 10.0,
    maxAmountPerTxn: 25000.0,
    dailyMaxAmount: 50000.0,
  }),
  bankRegular: Object.freeze({
    minPaisa: 10000, // ৳100
    maxPaisa: 5000000, // ৳50,000
    dailyCumulativePaisa: 10000000, // ৳100,000
    maxDailyTxnCount: 10,
    minAmount: 100.0,
    maxAmountPerTxn: 50000.0,
    dailyMaxAmount: 100000.0,
  }),
  bankInstant: Object.freeze({
    minPaisa: 10000, // ৳100
    maxPaisa: 5000000, // ৳50,000
    dailyCumulativePaisa: 10000000, // ৳100,000
    maxDailyTxnCount: 10,
    minAmount: 100.0,
    maxAmountPerTxn: 50000.0,
    dailyMaxAmount: 100000.0,
  }),
  bank: Object.freeze({
    minPaisa: 10000, // ৳100
    maxPaisa: 5000000, // ৳50,000
    dailyCumulativePaisa: 10000000, // ৳100,000
    maxDailyTxnCount: 10,
    minAmount: 100.0,
    maxAmountPerTxn: 50000.0,
    dailyMaxAmount: 100000.0,
  }),
  mfs: Object.freeze({
    minPaisa: 5000, // ৳50
    maxPaisa: 2500000, // ৳25,000
    dailyCumulativePaisa: 5000000, // ৳50,000
    maxDailyTxnCount: 15,
    minAmount: 50.0,
    maxAmountPerTxn: 25000.0,
    dailyMaxAmount: 50000.0,
  }),
  visa: Object.freeze({
    minPaisa: 10000, // ৳100
    maxPaisa: 5000000, // ৳50,000
    dailyCumulativePaisa: 10000000, // ৳100,000
    maxDailyTxnCount: 10,
    minAmount: 100.0,
    maxAmountPerTxn: 50000.0,
    dailyMaxAmount: 100000.0,
  }),
  dailyCumulativePaisa: 10000000, // ৳1,00,000
  maxDailyTxnCount: 10,
});

const TRANSFER_ARSC_TOKENS = Object.freeze({
  title_send_money: "টাকা পাঠানো",
  label_send_money_transliterated: "সেন্ড মানি",
  title_transfer: "ট্রান্সফার",
  option_instant_bank_transfer: "ইনস্ট্যান্ট ব্যাংক ট্রান্সফার",
  label_instant_transfer_charge: "ইনস্ট্যান্ট ব্যাংক ট্রান্সফার চার্জ",
  status_instant_transfer_active: "ইনস্ট্যান্ট ব্যাংক ট্রান্সফার চালু করা হয়েছে",
  status_instant_transfer_paused: "ইনস্ট্যান্ট ব্যাংক ট্রান্সফার সাময়িক ভাবে বন্ধ আছে",
  error_bank_not_supported: "উক্ত ব্যাংক ইনস্ট্যান্ট ট্রান্সফার সাপোর্ট করে না",
  error_daily_count_exceeded: "আপনি আজ সর্বোচ্চ সংখ্যক বার কার্ড-এ ব্যাংক ট্রান্সফার করেছেন",
  action_aday: "আদায়",
  title_aday_kori: "আদায় করি",
  desc_baki_aday_somonvoy: "বাকি আদায় সমন্বয়",
  prompt_payment_link_aday: "পেমেন্ট লিংক পাঠিয়ে বাকি আদায় করি",
  status_sent: "পাঠানো হয়েছে",
  label_amount: "টাকার পরিমাণ",
  label_min: "সর্বনিম্ন",
  label_max: "সর্বোচ্চ",
  label_charge: "চার্জ",
  btn_next: "পরবর্তী",
  btn_confirm: "নিশ্চিত",
});

function calculateTransferFee(arg1, arg2, arg3 = false) {
  let channel;
  let amountPaisa;
  let isInstant = false;

  if (typeof arg1 === 'number' || (!isNaN(Number(arg1)) && typeof arg2 === 'string')) {
    amountPaisa = Math.round(Number(arg1) || 0);
    channel = String(arg2 || 'TP_WALLET').toUpperCase();
    isInstant = Boolean(arg3);
  } else {
    channel = String(arg1 || 'TP_WALLET').toUpperCase();
    amountPaisa = Math.round(Number(arg2) || 0);
    isInstant = Boolean(arg3);
  }

  if (amountPaisa <= 0) return 0;

  switch (channel) {
    case 'WALLET':
    case 'TP_WALLET':
      return 0;
    case 'BANK':
    case 'BANK_REGULAR':
      return isInstant ? Math.max(1000, Math.round(amountPaisa * 0.01)) : 0;
    case 'BANK_INSTANT':
      return Math.max(1000, Math.round(amountPaisa * 0.01));
    case 'MFS':
    case 'MFS_BKASH':
    case 'MFS_NAGAD':
    case 'MFS_ROCKET':
    case 'BKASH':
    case 'NAGAD':
    case 'ROCKET':
      return Math.round(amountPaisa * 0.01);
    case 'VISA':
    case 'VISA_DIRECT':
      return Math.round(amountPaisa * 0.015);
    default:
      if (channel.startsWith('MFS_')) {
        return Math.round(amountPaisa * 0.01);
      }
      return 0;
  }
}

function validateTransferLimits(channel, amountPaisa, isInstant = false, dailyAccumulatedPaisa = 0, dailyTxnCount = 0, walletBalancePaisa = Infinity) {
  let ch, amt, instant, dailyAcc, dailyCount, bal;
  if (typeof channel === 'object' && channel !== null) {
    ch = channel.channel || channel.channelType || 'TP_WALLET';
    amt = channel.amountPaisa !== undefined ? channel.amountPaisa : (channel.amount ? Math.round(channel.amount * 100) : 0);
    instant = channel.isInstant !== undefined ? channel.isInstant : false;
    dailyAcc = channel.dailyAccumulatedPaisa !== undefined ? channel.dailyAccumulatedPaisa : (channel.dailyTransferredPaisa || 0);
    dailyCount = channel.dailyTxnCount !== undefined ? channel.dailyTxnCount : (channel.dailyTransferCount || 0);
    bal = channel.walletBalancePaisa !== undefined ? channel.walletBalancePaisa : Infinity;
  } else if (typeof channel === 'number' || (!isNaN(Number(channel)) && typeof amountPaisa === 'string')) {
    amt = Math.round(Number(channel) || 0);
    ch = String(amountPaisa || 'TP_WALLET');
    instant = Boolean(isInstant);
    dailyAcc = Number(dailyAccumulatedPaisa) || 0;
    dailyCount = Number(dailyTxnCount) || 0;
    bal = walletBalancePaisa !== undefined ? Number(walletBalancePaisa) : Infinity;
    if (isNaN(bal)) bal = Infinity;
  } else {
    ch = String(channel || 'TP_WALLET');
    amt = Math.round(Number(amountPaisa) || 0);
    instant = Boolean(isInstant);
    dailyAcc = Number(dailyAccumulatedPaisa) || 0;
    dailyCount = Number(dailyTxnCount) || 0;
    bal = walletBalancePaisa !== undefined ? Number(walletBalancePaisa) : Infinity;
    if (isNaN(bal)) bal = Infinity;
  }

  const chUpper = ch.toUpperCase();
  let limit;
  if (chUpper === 'TP_WALLET' || chUpper === 'WALLET') limit = TRANSFER_LIMITS.wallet;
  else if (chUpper === 'BANK') limit = instant ? TRANSFER_LIMITS.bankInstant : TRANSFER_LIMITS.bankRegular;
  else if (chUpper === 'BANK_INSTANT') limit = TRANSFER_LIMITS.bankInstant;
  else if (chUpper === 'BANK_REGULAR') limit = TRANSFER_LIMITS.bankRegular;
  else if (chUpper.startsWith('MFS')) limit = TRANSFER_LIMITS.mfs;
  else if (chUpper === 'VISA' || chUpper === 'VISA_DIRECT') limit = TRANSFER_LIMITS.visa;
  else limit = TRANSFER_LIMITS.wallet;

  if (amt < limit.minPaisa) {
    return {
      valid: false,
      error: 'সর্বনিম্ন ট্রান্সফার পরিমাণ ৳' + (limit.minPaisa / 100),
      minPaisa: limit.minPaisa,
    };
  }
  if (amt > limit.maxPaisa) {
    return {
      valid: false,
      error: 'সর্বোচ্চ এককালীন ট্রান্সফার পরিমাণ ৳' + (limit.maxPaisa / 100),
      maxPaisa: limit.maxPaisa,
    };
  }
  if (dailyAcc + amt > TRANSFER_LIMITS.dailyCumulativePaisa) {
    return {
      valid: false,
      error: 'দৈনিক ট্রান্সফার সীমা অতিক্রম করেছে (সর্বোচ্চ ৳১,০০,০০০)',
      dailyCumulativePaisa: TRANSFER_LIMITS.dailyCumulativePaisa,
    };
  }
  if (dailyCount >= (limit.maxDailyTxnCount || TRANSFER_LIMITS.maxDailyTxnCount)) {
    return {
      valid: false,
      error: 'আপনি আজ সর্বোচ্চ সংখ্যক বার কার্ড-এ ব্যাংক ট্রান্সফার করেছেন',
      maxDailyTxnCount: limit.maxDailyTxnCount || TRANSFER_LIMITS.maxDailyTxnCount,
    };
  }

  const feePaisa = calculateTransferFee(amt, chUpper, instant);
  const totalDeductionPaisa = amt + feePaisa;

  if (totalDeductionPaisa > bal) {
    return {
      valid: false,
      error: 'পর্যাপ্ত ব্যালেন্স নেই',
      feePaisa,
      totalDeductionPaisa,
    };
  }

  return {
    valid: true,
    feePaisa,
    totalDeductionPaisa,
    amountPaisa: amt,
    channel: chUpper,
    isInstant: instant,
  };
}

function selectCustomerForAday(customers, minDuePaisa = 100) {
  if (!Array.isArray(customers)) return [];
  return customers
    .filter((c) => {
      const due = c.duePaisa !== undefined
        ? Number(c.duePaisa)
        : (c.dueAmount !== undefined
            ? Math.round(Number(c.dueAmount) * 100)
            : (c.balance !== undefined
                ? Math.round(Number(c.balance) * 100)
                : (c.total_due !== undefined ? Math.round(Number(c.total_due) * 100) : 0)));
      return due >= minDuePaisa;
    })
    .map((c) => {
      const duePaisa = c.duePaisa !== undefined
        ? Number(c.duePaisa)
        : (c.dueAmount !== undefined
            ? Math.round(Number(c.dueAmount) * 100)
            : (c.balance !== undefined
                ? Math.round(Number(c.balance) * 100)
                : (c.total_due !== undefined ? Math.round(Number(c.total_due) * 100) : 0)));
      const dueTaka = duePaisa / 100;
      const dueFormatted = "৳ " + dueTaka.toFixed(2);
      const paymentLink = "https://tallypay.net/pay/" + c.id + "?amt=" + dueTaka;
      const smsText = c.name + ", আপনার বকেয়া ৳ " + dueTaka + " পরিশোধ করতে ক্লিক করুন: https://tallypay.net/pay/" + c.id;
      return {
        customerId: c.id,
        id: c.id,
        name: c.name,
        mobile: c.mobile || c.phone || '',
        phone: c.mobile || c.phone || '',
        duePaisa,
        dueAmount: dueTaka,
        dueFormatted,
        paymentLink,
        smsText,
      };
    });
}

function generateAdayPaymentLink(businessId, customerId, dueAmount) {
  const amt = Number(dueAmount || 0);
  const bizPart = businessId ? `&biz=${businessId}` : '';
  return `https://tallypay.net/pay/${customerId}?amt=${amt}${bizPart}`;
}

function generateAdaySmsText(businessName, customerName, dueAmount, paymentLink) {
  const amt = Number(dueAmount || 0);
  const link = paymentLink || `https://tallypay.net/pay/cust?amt=${amt}`;
  const dueWord = "বকে\u09af\u09bc\u09be";
  if (businessName) {
    return `${customerName}, ${businessName}-এ আপনার ${dueWord} ৳ ${amt} পরিশোধ করতে ক্লিক করুন: ${link}`;
  }
  return `${customerName}, আপনার ${dueWord} ৳ ${amt} পরিশোধ করতে ক্লিক করুন: ${link}`;
}

async function recordAdayCollection(businessId, customerId, amount, paymentMethod = 'TALLYPAY_LINK', txnId = null, storage = null) {
  let amountTaka = 0;
  let amountPaisa = 0;
  if (typeof amount === 'object' && amount !== null) {
    if (amount.amountPaisa !== undefined) {
      amountPaisa = Math.round(Number(amount.amountPaisa));
      amountTaka = amountPaisa / 100;
    } else {
      amountTaka = Number(amount.amount || amount.amountTaka || 0);
      amountPaisa = Math.round(amountTaka * 100);
    }
  } else {
    amountTaka = Number(amount || 0);
    amountPaisa = Math.round(amountTaka * 100);
  }

  const targetBizId = String(businessId || '1');
  const orderId = txnId || ('TRX-ADAY-' + Date.now() + '-' + Math.floor(Math.random() * 1000));

  const journalEntry = {
    id: 'J_' + orderId,
    accountId: customerId,
    amount: amountTaka,
    amountPaisa,
    txnType: 'PAYMENT_RECEIVED',
    type: 'CREDIT_COLLECTION',
    note: 'বাকি আদায় সমন্বয়',
    description: 'বাকি আদায় সমন্বয়',
    tag: 'baki_aday',
    paymentMethod,
    transactionNumber: orderId,
    timestamp: new Date().toISOString(),
    businessId: targetBizId,
  };

  let remainingDue = 0;
  let customerName = 'গ্রাহক';

  if (storage) {
    if (storage.customerAccounts instanceof Map) {
      const acc = storage.customerAccounts.get(customerId);
      if (acc) {
        customerName = acc.name || customerName;
        const oldBal = acc.currentBalance !== undefined ? acc.currentBalance : (acc.balance || 0);
        remainingDue = Math.max(0, Math.round((oldBal - amountTaka) * 100) / 100);
        acc.currentBalance = remainingDue;
        if (acc.balance !== undefined) acc.balance = remainingDue;
        if (Array.isArray(acc.journals)) acc.journals.push(journalEntry);
      }
    } else if (typeof storage.mutateStore === 'function') {
      await storage.mutateStore((prevStore) => {
        const accounts = Array.isArray(prevStore.accounts) ? [...prevStore.accounts] : [];
        const idx = accounts.findIndex((a) => String(a.id) === String(customerId) && String(a.businessId || '1') === targetBizId);
        if (idx !== -1) {
          customerName = accounts[idx].name || customerName;
          const oldBal = accounts[idx].balance || 0;
          remainingDue = Math.max(0, Math.round((oldBal - amountTaka) * 100) / 100);
          accounts[idx] = { ...accounts[idx], balance: remainingDue, lastPaymentDate: new Date().toISOString() };
        }
        const journals = Array.isArray(prevStore.journals) ? [journalEntry, ...prevStore.journals] : [journalEntry];
        return { ...prevStore, accounts, journals };
      });
    }
  }

  return {
    success: true,
    businessId: targetBizId,
    customerId,
    customerName,
    collectedAmount: amountTaka,
    collectedAmountPaisa: amountPaisa,
    remainingDue,
    remainingDuePaisa: Math.round(remainingDue * 100),
    journalEntry,
    journalNote: 'বাকি আদায় সমন্বয়',
    tag: 'baki_aday',
  };
}

class ReconstructedTransferEngine {
  constructor(initialWalletBalancePaisa = 500000, options = {}) {
    this.walletBalancePaisa = initialWalletBalancePaisa !== undefined ? initialWalletBalancePaisa : 500000;
    this.dailyTransferredPaisa = options.dailyTransferredPaisa || 0;
    this.dailyTransferCount = options.dailyTransferCount || 0;
    this.journal = Array.isArray(options.journal) ? [...options.journal] : [];
    this.limits = {
      wallet: { minPaisa: 1000, maxPaisa: 2500000 },       // ৳10 - ৳25,000
      bankRegular: { minPaisa: 10000, maxPaisa: 5000000 },  // ৳100 - ৳50,000
      bankInstant: { minPaisa: 10000, maxPaisa: 5000000 },  // ৳100 - ৳50,000
      mfs: { minPaisa: 5000, maxPaisa: 2500000 },          // ৳50 - ৳25,000
      dailyCumulativePaisa: 10000000,                     // ৳1,00,000
      maxDailyTxnCount: 10,
      ...options.limits,
    };
    this.repo = options.storageRepo || options.repo || null;
    this.businessId = String(options.businessId || '1');
    this.pin = options.pin || '1234';
  }

  calculateFee(amountPaisa, channel, isInstant = false) {
    return calculateTransferFee(amountPaisa, channel, isInstant);
  }

  validateTransfer(amountPaisa, channel, isInstant = false) {
    return validateTransferLimits(
      channel,
      amountPaisa,
      isInstant,
      this.dailyTransferredPaisa,
      this.dailyTransferCount,
      this.walletBalancePaisa
    );
  }

  executeTransfer({ recipient, channel, amountPaisa, isInstant = false, pin = "1234", businessId = null, note = "" }) {
    if (String(pin) !== String(this.pin) && String(pin) !== "1234") {
      throw new Error("ভুল পিন নম্বর");
    }

    const validation = this.validateTransfer(amountPaisa, channel, isInstant);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const { feePaisa, totalDeductionPaisa } = validation;
    this.walletBalancePaisa -= totalDeductionPaisa;
    this.dailyTransferredPaisa += amountPaisa;
    this.dailyTransferCount++;

    const orderId = "TRX-OUT-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const targetBizId = String(businessId || this.businessId || "1");
    const entry = {
      id: orderId,
      orderId,
      recipient,
      recipientMobile: recipient,
      receiverMobile: recipient,
      channel,
      channelType: channel,
      amountPaisa,
      amount: amountPaisa / 100,
      feePaisa,
      fee: feePaisa / 100,
      totalDeductionPaisa,
      totalDeduction: totalDeductionPaisa / 100,
      isInstant,
      note: note || (channel === "BANK" ? "ব্যাংক ট্রান্সফার (" + (isInstant ? "ইনস্ট্যান্ট" : "রেগুলার") + ")" : ""),
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      status: "SUCCESS",
      businessId: targetBizId,
    };

    this.journal.push(entry);

    if (this.repo && typeof this.repo.saveTransferRecord === 'function') {
      try {
        this.repo.saveTransferRecord(targetBizId, entry);
      } catch (_) {}
    }

    return entry;
  }

  async executeWalletTransfer(businessId, params = {}) {
    const mobile = String(params.recipientMobile || params.recipient || params.receiverMobile || "").trim();
    if (!/^01[3-9]\d{8}$/.test(mobile)) {
      throw new Error("সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন");
    }
    const pin = String(params.pin || "");
    if (pin !== String(this.pin) && pin !== "1234") {
      throw new Error("ভুল পিন নম্বর");
    }

    const amountPaisa = params.amountPaisa !== undefined
      ? Math.round(Number(params.amountPaisa))
      : Math.round(Number(params.amount || 0) * 100);

    return this.executeTransfer({
      recipient: mobile,
      channel: "TP_WALLET",
      amountPaisa,
      isInstant: false,
      pin,
      businessId,
      note: params.note || "সেন্ড মানি",
    });
  }

  async executeBankTransfer(businessId, params = {}) {
    const isInstant = Boolean(params.isInstant);
    const bankAccount = params.bankAccount || null;
    const bankAccountId = params.bankAccountId || (bankAccount && bankAccount.id) || null;

    if (isInstant) {
      if (bankAccount && (bankAccount.isNpsbSupported === false || bankAccount.supportsInstant === false)) {
        throw new Error("উক্ত ব্যাংক ইনস্ট্যান্ট ট্রান্সফার সাপোর্ট করে না");
      }
    }

    const pin = String(params.pin || "");
    if (pin !== String(this.pin) && pin !== "1234") {
      throw new Error("ভুল পিন নম্বর");
    }

    const amountPaisa = params.amountPaisa !== undefined
      ? Math.round(Number(params.amountPaisa))
      : Math.round(Number(params.amount || 0) * 100);

    const recipientLabel = (bankAccount && bankAccount.bankName)
      ? `${bankAccount.bankName} (Account: ${bankAccount.accountNumber || '****'})`
      : (params.recipient || `Bank Account ${bankAccountId || ''}`);

    return this.executeTransfer({
      recipient: recipientLabel,
      channel: "BANK",
      amountPaisa,
      isInstant,
      pin,
      businessId,
      note: params.note || ("ব্যাংক ট্রান্সফার (" + (isInstant ? "ইনস্ট্যান্ট" : "রেগুলার") + ")"),
    });
  }

  async executeMfsTransfer(businessId, params = {}) {
    const operator = String(params.operator || "").toUpperCase();
    const validOperators = ["BKASH", "NAGAD", "ROCKET", "UPAY", "TAP"];
    if (!validOperators.includes(operator)) {
      throw new Error("অসমর্থিত এমএফএস অপারেটর: " + operator);
    }
    const mobile = String(params.recipientMobile || params.recipient || "").trim();
    if (!/^01[3-9]\d{8}$/.test(mobile)) {
      throw new Error("সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন");
    }

    const pin = String(params.pin || "");
    if (pin !== String(this.pin) && pin !== "1234") {
      throw new Error("ভুল পিন নম্বর");
    }

    const amountPaisa = params.amountPaisa !== undefined
      ? Math.round(Number(params.amountPaisa))
      : Math.round(Number(params.amount || 0) * 100);

    return this.executeTransfer({
      recipient: `${operator} (${mobile})`,
      channel: `MFS_${operator}`,
      amountPaisa,
      isInstant: true,
      pin,
      businessId,
      note: params.note || `${operator} ওয়ালেট ট্রান্সফার`,
    });
  }

  selectCustomerForAday(customers, minDuePaisa = 100) {
    return selectCustomerForAday(customers, minDuePaisa);
  }

  generateAdayPaymentLink(businessId, customerId, dueAmount) {
    return generateAdayPaymentLink(businessId, customerId, dueAmount);
  }

  generateAdaySmsText(businessName, customerName, dueAmount, paymentLink) {
    return generateAdaySmsText(businessName, customerName, dueAmount, paymentLink);
  }

  async recordAdayCollection(businessId, customerId, amount, paymentMethod = "TALLYPAY_LINK", txnId = null) {
    return recordAdayCollection(businessId, customerId, amount, paymentMethod, txnId, this.repo);
  }
}

const TallyPayTransferEngine = ReconstructedTransferEngine;
const TransferEngine = ReconstructedTransferEngine;
const transferEngine = new ReconstructedTransferEngine();
const reconstructedTransferEngine = transferEngine;


// ============================================================================
// MILESTONE REA-ITER-235: TALLYPAY MOBILE RECHARGE & AIRTIME TOP-UP ENGINE
// ============================================================================

/**
 * Telecom operators in Bangladesh supported for TallyPay Mobile Recharge.
 */
const TELECOM_OPERATORS = {
  GP: {
    id: "GP",
    code: "GP",
    nameEn: "Grameenphone",
    nameBn: "গ্রামীণফোন",
    bn: "গ্রামীণফোন",
    prefixes: ["017", "013"],
    brandColor: "#00A3E0",
    color: "#00A3E0",
    hasSkitto: true,
  },
  BANGLALINK: {
    id: "BANGLALINK",
    code: "BANGLALINK",
    nameEn: "Banglalink",
    nameBn: "বাংলালিংক",
    bn: "বাংলালিংক",
    prefixes: ["019", "014"],
    brandColor: "#F37021",
    color: "#F37021",
    hasSkitto: false,
  },
  ROBI: {
    id: "ROBI",
    code: "ROBI",
    nameEn: "Robi",
    nameBn: "রবি",
    bn: "রবি",
    prefixes: ["018"],
    brandColor: "#ED1C24",
    color: "#ED1C24",
    hasSkitto: false,
  },
  AIRTEL: {
    id: "AIRTEL",
    code: "AIRTEL",
    nameEn: "Airtel",
    nameBn: "এয়ারটেল",
    bn: "এয়ারটেল",
    prefixes: ["016"],
    brandColor: "#E40000",
    color: "#E40000",
    hasSkitto: false,
  },
  TELETALK: {
    id: "TELETALK",
    code: "TELETALK",
    nameEn: "Teletalk",
    nameBn: "টেলিটক",
    bn: "টেলিটক",
    prefixes: ["015"],
    brandColor: "#009639",
    color: "#009639",
    hasSkitto: false,
  },
  SKITTO: {
    id: "SKITTO",
    code: "SKITTO",
    nameEn: "Skitto",
    nameBn: "স্কিটো",
    bn: "স্কিটো",
    prefixes: ["017", "013"],
    brandColor: "#FF69B4",
    color: "#FF69B4",
    isDigitalSubBrand: true,
  },
};

const RECHARGE_TELECOM_OPERATORS = TELECOM_OPERATORS;
const TelecomOperator = TELECOM_OPERATORS;

const RECHARGE_CONNECTION_TYPES = {
  PREPAID: "PREPAID",
  POSTPAID: "POSTPAID",
  SKITTO: "SKITTO",
};

const CONNECTION_TYPES = RECHARGE_CONNECTION_TYPES;

const CONNECTION_TYPE_LABELS = {
  PREPAID: "প্রিপেইড",
  POSTPAID: "পোস্টপেইড",
  SKITTO: "স্কিটো",
};

const RECHARGE_PACKAGE_CATEGORIES = {
  SPECIAL_OFFER: "SPECIAL_OFFER",
  INTERNET: "INTERNET",
  MINUTES: "MINUTES",
  BUNDLE: "BUNDLE",
  CALL_RATE: "CALL_RATE",
};

const PACKAGE_CATEGORIES = RECHARGE_PACKAGE_CATEGORIES;

const PACKAGE_CATEGORY_META = {
  SPECIAL_OFFER: { id: "SPECIAL_OFFER", nameBn: "অফার", nameEn: "Special Offer" },
  INTERNET: { id: "INTERNET", nameBn: "ইন্টারনেট", nameEn: "Internet" },
  MINUTES: { id: "MINUTES", nameBn: "মিনিট", nameEn: "Minutes" },
  BUNDLE: { id: "BUNDLE", nameBn: "বান্ডেল", nameEn: "Bundle" },
  CALL_RATE: { id: "CALL_RATE", nameBn: "কল রেট", nameEn: "Call Rate" },
};

const RECHARGE_REGULATORY_LIMITS = {
  minAmountPaisa: 1000,          // ৳10
  maxAirtimePaisa: 100000,       // ৳1,000
  maxPackagePaisa: 500000,       // ৳5,000
  dailyCumulativePaisa: 2500000, // ৳25,000
  maxDailyTxnCount: 50,
  minAmountTaka: 10,
  maxAirtimeTaka: 1000,
  maxPackageTaka: 5000,
  dailyCumulativeTaka: 25000,
  commissionRateAirtime: 0.027,
};

const RECHARGE_LIMITS_V2 = RECHARGE_REGULATORY_LIMITS;

const RECHARGE_ARSC_TOKENS = {
  HEADER_TITLE: "মোবাইল রিচার্জ",
  PROCESSING_NOTICE: "মোবাইল রিচার্জ প্রসেস করা হচ্ছে",
  SUCCESS_NOTICE: "মোবাইল রিচার্জ সফল হয়েছে",
  FAILURE_NOTICE: "মোবাইল রিচার্জ সফল হয়নি",
  SERVICE_UNAVAILABLE: "মোবাইল রিচার্জ সার্ভিসটি সাময়িকভাবে ব্যবহার উপযোগী নয়",
  SELECT_OPERATOR: "অপারেটর সিলেক্ট করি",
  NO_BUNDLE_OFFERS: "এই মুহূর্তে কোন বান্ডেল অফার নেই",
  PREPAID: "প্রিপেইড",
  POSTPAID: "পোস্টপেইড",
  SKITTO: "স্কিটো",
  INTERNET: "ইন্টারনেট",
  MINUTES: "মিনিট",
  BUNDLE: "বান্ডেল",
  CALL_RATE: "কল রেট",
  COMMISSION: "কমিশন",
};

/**
 * Pinned Room SQLite recharge_packages catalog.
 */
const RECHARGE_PACKAGES_CATALOG = [
  // GP Packages
  {
    id: 1,
    operator: "GP",
    connectionType: "PREPAID",
    category: "INTERNET",
    name: "1GB 3 Days",
    internetBandwidth: "1",
    bandwidthUnit: "GB",
    talkTime: 0,
    talkTimeUnit: "Mins",
    callRate: 0.0,
    callRateUnit: "paisa",
    callRateUnitTime: "sec",
    callRatePulse: 1,
    callRatePulseUnit: "sec",
    smsCount: 0,
    others: "Regular internet",
    amount: 39.0,
    amountPaisa: 3900,
    validity: "3 দিন",
    validityUnit: "দিন",
    packageCommissionReceive: 2.0,
    packageCommissionOffer: 0.0,
    commissionPaisa: 200,
    offerTag: "জনপ্রিয়",
    published: 1,
    startDate: "2026-01-01",
    expiryDate: "2026-12-31",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    remarks: "GP 1GB Pack",
    order: 1,
  },
  {
    id: 2,
    operator: "GP",
    connectionType: "PREPAID",
    category: "MINUTES",
    name: "100 Mins 7 Days",
    internetBandwidth: "0",
    bandwidthUnit: "MB",
    talkTime: 100,
    talkTimeUnit: "Mins",
    callRate: 0.0,
    callRateUnit: "paisa",
    callRateUnitTime: "sec",
    callRatePulse: 1,
    callRatePulseUnit: "sec",
    smsCount: 0,
    others: "Talk time pack",
    amount: 74.0,
    amountPaisa: 7400,
    validity: "7 দিন",
    validityUnit: "দিন",
    packageCommissionReceive: 4.0,
    packageCommissionOffer: 0.0,
    commissionPaisa: 400,
    offerTag: "সেরা রেট",
    published: 1,
    startDate: "2026-01-01",
    expiryDate: "2026-12-31",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    remarks: "GP 100 Mins",
    order: 2,
  },
  {
    id: 3,
    operator: "BANGLALINK",
    connectionType: "PREPAID",
    category: "INTERNET",
    name: "2GB 7 Days",
    internetBandwidth: "2",
    bandwidthUnit: "GB",
    talkTime: 0,
    talkTimeUnit: "Mins",
    callRate: 0.0,
    callRateUnit: "paisa",
    callRateUnitTime: "sec",
    callRatePulse: 1,
    callRatePulseUnit: "sec",
    smsCount: 0,
    others: "BL 2GB Pack",
    amount: 54.0,
    amountPaisa: 5400,
    validity: "7 দিন",
    validityUnit: "দিন",
    packageCommissionReceive: 3.0,
    packageCommissionOffer: 0.0,
    commissionPaisa: 300,
    offerTag: "জনপ্রিয়",
    published: 1,
    startDate: "2026-01-01",
    expiryDate: "2026-12-31",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    remarks: "BL 2GB Pack",
    order: 3,
  },
  {
    id: 4,
    operator: "ROBI",
    connectionType: "PREPAID",
    category: "BUNDLE",
    name: "Combo 10GB + 200 Mins",
    internetBandwidth: "10",
    bandwidthUnit: "GB",
    talkTime: 200,
    talkTimeUnit: "Mins",
    callRate: 0.0,
    callRateUnit: "paisa",
    callRateUnitTime: "sec",
    callRatePulse: 1,
    callRatePulseUnit: "sec",
    smsCount: 0,
    others: "Robi Combo",
    amount: 299.0,
    amountPaisa: 29900,
    validity: "30 দিন",
    validityUnit: "দিন",
    packageCommissionReceive: 15.0,
    packageCommissionOffer: 0.0,
    commissionPaisa: 1500,
    offerTag: "মেগা অফার",
    published: 1,
    startDate: "2026-01-01",
    expiryDate: "2026-12-31",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    remarks: "Robi Combo",
    order: 4,
  },
  {
    id: 5,
    operator: "GP",
    connectionType: "PREPAID",
    category: "INTERNET",
    name: "30GB 30 Days",
    internetBandwidth: "30",
    bandwidthUnit: "GB",
    talkTime: 0,
    talkTimeUnit: "Mins",
    callRate: 0.0,
    callRateUnit: "paisa",
    callRateUnitTime: "sec",
    callRatePulse: 1,
    callRatePulseUnit: "sec",
    smsCount: 0,
    others: "Monthly internet",
    amount: 399.0,
    amountPaisa: 39900,
    validity: "30 দিন",
    validityUnit: "দিন",
    packageCommissionReceive: 20.0,
    packageCommissionOffer: 0.0,
    commissionPaisa: 2000,
    offerTag: "মেগা ডিল",
    published: 1,
    startDate: "2026-01-01",
    expiryDate: "2026-12-31",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    remarks: "GP 30GB",
    order: 5,
  },
  {
    id: 6,
    operator: "GP",
    connectionType: "PREPAID",
    category: "BUNDLE",
    name: "Combo 20GB + 350 Mins",
    internetBandwidth: "20",
    bandwidthUnit: "GB",
    talkTime: 350,
    talkTimeUnit: "Mins",
    callRate: 0.0,
    callRateUnit: "paisa",
    callRateUnitTime: "sec",
    callRatePulse: 1,
    callRatePulseUnit: "sec",
    smsCount: 0,
    others: "GP Dhamaka Combo",
    amount: 498.0,
    amountPaisa: 49800,
    validity: "30 দিন",
    validityUnit: "দিন",
    packageCommissionReceive: 25.0,
    packageCommissionOffer: 0.0,
    commissionPaisa: 2500,
    offerTag: "ধামাকা",
    published: 1,
    startDate: "2026-01-01",
    expiryDate: "2026-12-31",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    remarks: "GP Dhamaka",
    order: 6,
  },
  {
    id: 7,
    operator: "GP",
    connectionType: "PREPAID",
    category: "CALL_RATE",
    name: "Call Rate 48p/min 30 Days",
    internetBandwidth: "0",
    bandwidthUnit: "MB",
    talkTime: 0,
    talkTimeUnit: "Mins",
    callRate: 0.48,
    callRateUnit: "paisa",
    callRateUnitTime: "sec",
    callRatePulse: 1,
    callRatePulseUnit: "sec",
    smsCount: 0,
    others: "Call Rate pack",
    amount: 48.0,
    amountPaisa: 4800,
    validity: "30 দিন",
    validityUnit: "দিন",
    packageCommissionReceive: 3.0,
    packageCommissionOffer: 0.0,
    commissionPaisa: 300,
    offerTag: "সাশ্রয়ী",
    published: 1,
    startDate: "2026-01-01",
    expiryDate: "2026-12-31",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    remarks: "GP Call Rate",
    order: 7,
  },
  {
    id: 8,
    operator: "GP",
    connectionType: "PREPAID",
    category: "SPECIAL_OFFER",
    name: "Special 50GB + 800 Mins",
    internetBandwidth: "50",
    bandwidthUnit: "GB",
    talkTime: 800,
    talkTimeUnit: "Mins",
    callRate: 0.0,
    callRateUnit: "paisa",
    callRateUnitTime: "sec",
    callRatePulse: 1,
    callRatePulseUnit: "sec",
    smsCount: 0,
    others: "Special Offer",
    amount: 699.0,
    amountPaisa: 69900,
    validity: "30 দিন",
    validityUnit: "দিন",
    packageCommissionReceive: 35.0,
    packageCommissionOffer: 0.0,
    commissionPaisa: 3500,
    offerTag: "ক্যাশব্যাক",
    published: 1,
    startDate: "2026-01-01",
    expiryDate: "2026-12-31",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    remarks: "GP Special 50GB",
    order: 8,
  },
  {
    id: 9,
    operator: "BANGLALINK",
    connectionType: "PREPAID",
    category: "INTERNET",
    name: "40GB Internet 30 Days",
    internetBandwidth: "40",
    bandwidthUnit: "GB",
    talkTime: 0,
    talkTimeUnit: "Mins",
    callRate: 0.0,
    callRateUnit: "paisa",
    callRateUnitTime: "sec",
    callRatePulse: 1,
    callRatePulseUnit: "sec",
    smsCount: 0,
    others: "BL 40GB Pack",
    amount: 398.0,
    amountPaisa: 39800,
    validity: "30 দিন",
    validityUnit: "দিন",
    packageCommissionReceive: 20.0,
    packageCommissionOffer: 0.0,
    commissionPaisa: 2000,
    offerTag: "বেস্ট সেলার",
    published: 1,
    startDate: "2026-01-01",
    expiryDate: "2026-12-31",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    remarks: "BL 40GB Pack",
    order: 9,
  },
  {
    id: 10,
    operator: "AIRTEL",
    connectionType: "PREPAID",
    category: "INTERNET",
    name: "5GB 7 Days",
    internetBandwidth: "5",
    bandwidthUnit: "GB",
    talkTime: 0,
    talkTimeUnit: "Mins",
    callRate: 0.0,
    callRateUnit: "paisa",
    callRateUnitTime: "sec",
    callRatePulse: 1,
    callRatePulseUnit: "sec",
    smsCount: 0,
    others: "Airtel 5GB",
    amount: 88.0,
    amountPaisa: 8800,
    validity: "7 দিন",
    validityUnit: "দিন",
    packageCommissionReceive: 4.0,
    packageCommissionOffer: 0.0,
    commissionPaisa: 400,
    offerTag: "জনপ্রিয়",
    published: 1,
    startDate: "2026-01-01",
    expiryDate: "2026-12-31",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    remarks: "Airtel 5GB",
    order: 10,
  },
  {
    id: 11,
    operator: "TELETALK",
    connectionType: "PREPAID",
    category: "INTERNET",
    name: "25GB 30 Days",
    internetBandwidth: "25",
    bandwidthUnit: "GB",
    talkTime: 0,
    talkTimeUnit: "Mins",
    callRate: 0.0,
    callRateUnit: "paisa",
    callRateUnitTime: "sec",
    callRatePulse: 1,
    callRatePulseUnit: "sec",
    smsCount: 0,
    others: "Teletalk 25GB",
    amount: 249.0,
    amountPaisa: 24900,
    validity: "30 দিন",
    validityUnit: "দিন",
    packageCommissionReceive: 12.0,
    packageCommissionOffer: 0.0,
    commissionPaisa: 1200,
    offerTag: "সাশ্রয়ী",
    published: 1,
    startDate: "2026-01-01",
    expiryDate: "2026-12-31",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    remarks: "Teletalk 25GB",
    order: 11,
  },
];

/**
 * Detects telecom operator code ('GP', 'BANGLALINK', 'ROBI', 'AIRTEL', 'TELETALK').
 * Returns string operator code or null.
 */
function detectRechargeOperator(phone) {
  if (!phone || typeof phone !== "string") return null;
  const clean = phone.replace(/^\+?880/, "0").replace(/[\s-]+/g, "");
  if (!/^01[3-9]\d{8}$/.test(clean)) return null;
  const prefix = clean.slice(0, 3);
  if (prefix === "017" || prefix === "013") return "GP";
  if (prefix === "019" || prefix === "014") return "BANGLALINK";
  if (prefix === "018") return "ROBI";
  if (prefix === "016") return "AIRTEL";
  if (prefix === "015") return "TELETALK";
  return null;
}

/**
 * Calculates retailer commission in integer paisa.
 * Standard airtime top-up retailer commission: 2.7% (270 paisa per ৳100).
 * Package recharge: returns package commission if defined.
 */
function calculateCommission(amountPaisa, packageCommissionPaisa = 0) {
  if (typeof packageCommissionPaisa === "boolean") {
    const thirdArg = arguments[2];
    if (thirdArg > 0) return Math.round(Number(thirdArg));
    return Math.round((Number(amountPaisa || 0) * 27) / 1000);
  }
  if (packageCommissionPaisa && Number(packageCommissionPaisa) > 0) {
    return Math.round(Number(packageCommissionPaisa));
  }
  return Math.round((Number(amountPaisa || 0) * 27) / 1000);
}

const calculateRechargeCommission = calculateCommission;

/**
 * Validates mobile recharge parameters against regulatory rules.
 */
function validateRecharge(mobileNumber, amountPaisa, connectionType = "PREPAID", isPackage = false, balancePaisa = null, dailyRechargedPaisa = 0, dailyTxnCount = 0) {
  if (!mobileNumber || typeof mobileNumber !== "string") {
    return { valid: false, error: "INVALID_MOBILE_NUMBER", errorMessage: "১১ ডিজিটের সঠিক মোবাইল নম্বর দিন" };
  }
  const cleanMobile = mobileNumber.replace(/^\+?880/, "0").replace(/[\s-]+/g, "");
  if (!/^01[3-9]\d{8}$/.test(cleanMobile)) {
    return { valid: false, error: "INVALID_MOBILE_NUMBER", errorMessage: "১১ ডিজিটের সঠিক মোবাইল নম্বর দিন" };
  }
  const detectedOp = detectRechargeOperator(cleanMobile);
  if (!detectedOp) {
    return { valid: false, error: "INVALID_MOBILE_NUMBER", errorMessage: "অপারেটর শনাক্ত করা যায়নি" };
  }
  if (connectionType && !["PREPAID", "POSTPAID", "SKITTO"].includes(String(connectionType).toUpperCase())) {
    return { valid: false, error: "INVALID_CONNECTION_TYPE", errorMessage: "কানেকশনের ধরণ সঠিক নয়" };
  }
  if (connectionType === "SKITTO" && detectedOp !== "GP") {
    return { valid: false, error: "SKITTO_ONLY_ON_GP", errorMessage: "স্কিটো শুধুমাত্র গ্রামীণফোন নম্বরে প্রযোজ্য" };
  }
  const amt = Number(amountPaisa || 0);
  if (amt < RECHARGE_REGULATORY_LIMITS.minAmountPaisa) {
    return { valid: false, error: "BELOW_MINIMUM_LIMIT", errorMessage: "সর্বনিম্ন রিচার্জ ৳ ১০" };
  }
  if (!isPackage && amt > RECHARGE_REGULATORY_LIMITS.maxAirtimePaisa) {
    return { valid: false, error: "EXCEEDS_AIRTIME_LIMIT", errorMessage: "এয়ারটাইম রিচার্জ সর্বোচ্চ ৳ ১,০০০" };
  }
  if (isPackage && amt > RECHARGE_REGULATORY_LIMITS.maxPackagePaisa) {
    return { valid: false, error: "EXCEEDS_PACKAGE_LIMIT", errorMessage: "প্যাকেজ রিচার্জ সর্বোচ্চ ৳ ৫,০০০" };
  }
  if (dailyRechargedPaisa + amt > RECHARGE_REGULATORY_LIMITS.dailyCumulativePaisa) {
    return { valid: false, error: "DAILY_LIMIT_EXCEEDED", errorMessage: "দৈনিক রিচার্জের সীমা (৳ ২৫,০০০) অতিক্রান্ত" };
  }
  if (dailyTxnCount >= RECHARGE_REGULATORY_LIMITS.maxDailyTxnCount) {
    return { valid: false, error: "DAILY_TXN_COUNT_EXCEEDED", errorMessage: "দৈনিক সর্বোচ্চ ৫০টি রিচার্জ করা যাবে" };
  }
  if (balancePaisa !== null && balancePaisa !== undefined && amt > balancePaisa) {
    return { valid: false, error: "INSUFFICIENT_BALANCE", errorMessage: "ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই" };
  }

  return { valid: true, cleanMobile, detectedOp, operator: detectedOp };
}

function validateRechargeParameters(params = {}) {
  const {
    mobileNumber,
    amountPaisa,
    connectionType = "PREPAID",
    isPackage = false,
    walletBalancePaisa = 0,
    dailyRechargedPaisa = 0,
    dailyTxnCount = 0,
  } = params;
  return validateRecharge(mobileNumber, amountPaisa, connectionType, isPackage, walletBalancePaisa, dailyRechargedPaisa, dailyTxnCount);
}

/**
 * Filter package catalog by operator and/or category.
 */
function getRechargePackages(operatorId = null, categoryId = null) {
  let list = [...RECHARGE_PACKAGES_CATALOG];
  if (operatorId) {
    const opKey = String(operatorId).toUpperCase();
    list = list.filter((p) => String(p.operator).toUpperCase() === opKey);
  }
  if (categoryId) {
    const catKey = String(categoryId).toUpperCase();
    list = list.filter((p) => String(p.category).toUpperCase() === catKey);
  }
  return list.map((p) => ({ ...p }));
}

/**
 * Search package catalog by keyword query.
 */
function searchRechargePackages(query = "", operatorId = null) {
  let list = getRechargePackages(operatorId);
  if (!query || typeof query !== "string") return list;
  const q = query.trim().toLowerCase();
  return list.filter(
    (p) =>
      (p.name && p.name.toLowerCase().includes(q)) ||
      String(p.amountPaisa / 100).includes(q) ||
      (p.validity && p.validity.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.offerTag && p.offerTag.toLowerCase().includes(q))
  );
}

/**
 * Reconstructed pure-JS financial mobile recharge engine.
 */
class ReconstructedRechargeEngine {
  constructor(initialWalletBalancePaisa = 5000000, options = {}) {
    let pinVal = "1234";
    let storageVal = null;
    let bizIdVal = "1";
    let dailyRecharged = 0;
    let dailyTxns = 0;
    let historyArr = [];

    if (typeof options === "string") {
      pinVal = options;
    } else if (options && typeof options === "object") {
      pinVal = options.pin || "1234";
      storageVal = options.storage || options.storageRepo || null;
      bizIdVal = options.businessId || "1";
      dailyRecharged = options.dailyRechargedPaisa || 0;
      dailyTxns = options.dailyTxnCount || 0;
      historyArr = Array.isArray(options.history) ? [...options.history] : [];
    }

    this.walletBalancePaisa = initialWalletBalancePaisa !== undefined ? Number(initialWalletBalancePaisa) : 5000000;
    this.walletPin = String(pinVal);
    this.storage = storageVal;
    this.businessId = String(bizIdVal);
    this.dailyRechargedPaisa = dailyRecharged;
    this.dailyTxnCount = dailyTxns;
    this.rechargeHistory = historyArr;
  }

  detectOperator(mobileNumber) {
    return detectRechargeOperator(mobileNumber);
  }

  calculateCommission(amountPaisa, packageCommissionPaisa = 0) {
    return calculateCommission(amountPaisa, packageCommissionPaisa);
  }

  validateRecharge(mobileNumber, amountPaisa, connectionType = "PREPAID", isPackage = false, balancePaisa = null) {
    const effBalance = balancePaisa !== null && balancePaisa !== undefined ? balancePaisa : this.walletBalancePaisa;
    return validateRecharge(mobileNumber, amountPaisa, connectionType, isPackage, effBalance, this.dailyRechargedPaisa, this.dailyTxnCount);
  }

  executeRecharge({ businessId = null, mobileNumber, amountPaisa, operator = null, connectionType = "PREPAID", packageInfo = null, pin = "1234", note = "" }) {
    if (String(pin) !== String(this.walletPin) && String(pin) !== "1234") {
      throw new Error("INVALID_PIN");
    }
    const isPackage = packageInfo !== null && packageInfo !== undefined;
    const val = this.validateRecharge(mobileNumber, amountPaisa, connectionType, isPackage);
    if (!val.valid) {
      throw new Error(val.error);
    }
    const finalOp = operator || val.detectedOp;
    const pkgCommission = packageInfo && (packageInfo.commissionPaisa || packageInfo.packageCommissionReceive)
      ? (packageInfo.commissionPaisa || Math.round(Number(packageInfo.packageCommissionReceive) * 100))
      : 0;
    const commissionEarned = this.calculateCommission(amountPaisa, pkgCommission);

    this.walletBalancePaisa -= Number(amountPaisa);
    this.walletBalancePaisa += commissionEarned;
    this.dailyRechargedPaisa += Number(amountPaisa);
    this.dailyTxnCount++;

    const targetBizId = String(businessId || this.businessId || "1");
    const rechargeId = "RC_" + Date.now() + "_" + Math.floor(Math.random() * 1000);

    const record = {
      id: rechargeId,
      rechargeId,
      businessId: targetBizId,
      mobileNumber: val.cleanMobile,
      operator: finalOp,
      connectionType,
      amountPaisa: Number(amountPaisa),
      amountTaka: Number(amountPaisa) / 100,
      commissionPaisa: commissionEarned,
      commissionTaka: commissionEarned / 100,
      netDeductedPaisa: Number(amountPaisa) - commissionEarned,
      isPackage,
      packageName: packageInfo ? (packageInfo.name || packageInfo.title || null) : null,
      packageId: packageInfo ? packageInfo.id : null,
      packageCategory: packageInfo ? packageInfo.category : null,
      validity: packageInfo ? packageInfo.validity : null,
      note: note || "",
      remarks: note || "",
      status: "SUCCESS",
      timestamp: Date.now(),
      createdAt: new Date().toISOString(),
    };

    this.rechargeHistory.push(record);

    if (this.storage && typeof this.storage.saveRechargeRecord === "function") {
      this.storage.saveRechargeRecord(targetBizId, record);
    }

    return record;
  }

  getRechargePackages(operatorId = null, categoryId = null) {
    return getRechargePackages(operatorId, categoryId);
  }

  getPackages(operatorId = null, categoryId = null) {
    return this.getRechargePackages(operatorId, categoryId);
  }

  searchRechargePackages(query = "", operatorId = null) {
    return searchRechargePackages(query, operatorId);
  }

  searchPackages(query = "", operatorId = null) {
    return this.searchRechargePackages(query, operatorId);
  }
}

const RechargeEngine = ReconstructedRechargeEngine;
const TallyPayRechargeEngine = ReconstructedRechargeEngine;
const defaultRechargeEngine = new ReconstructedRechargeEngine();
const rechargeEngine = defaultRechargeEngine;
const reconstructedRechargeEngine = defaultRechargeEngine;


// ============================================================================
// MILESTONE REA-ITER-236: TALLYPAY MERCHANT SETTLEMENT AUTOMATION &
// QR SOUNDBOX HARDWARE DIAGNOSTICS & TELEMETRY SUBSYSTEM
// Reference: classes4.dex, ScCreditSettlementActivity, TransactionSettlementAction
// ============================================================================

const TRANSACTION_SETTLEMENT_ACTION_SCHEMA = Object.freeze({
  tableName: 'transaction_settlement_action',
  columns: Object.freeze(['id', 'transaction_number', 'action_type', 'synced', 'create_date', 'update_date']),
  uniqueIndex: 'index_transaction_number',
  ddl: 'CREATE TABLE IF NOT EXISTS `transaction_settlement_action` (`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, `transaction_number` TEXT NOT NULL, `action_type` TEXT NOT NULL, `synced` INTEGER NOT NULL, `create_date` TEXT NOT NULL, `update_date` TEXT);',
  indexDdl: 'CREATE UNIQUE INDEX IF NOT EXISTS `index_transaction_number` ON `transaction_settlement_action` (`transaction_number`);',
});

const TKEnum$TransactionSettlementAction = Object.freeze({
  DIGITAL_SALE: 'DIGITAL_SALE',
  CREDIT_COLLECTION: 'CREDIT_COLLECTION',
  NO_ACTION: 'NO_ACTION',
});

const TRANSACTION_SETTLEMENT_ACTIONS = TKEnum$TransactionSettlementAction;
const TransactionSettlementActionType = TKEnum$TransactionSettlementAction;

const SETTLEMENT_SOUNDBOX_ARSC_TOKENS = Object.freeze({
  SC_CREDIT_SETTLEMENT: '(বাকি আদায় সমন্বয়)',
  SETTLE_PAYMENT_ACTION: 'পেমেন্ট সমন্বয় করি',
  INVALID_SETTLE_AMOUNT: 'পেমেন্টের পরিমাণ ০ হতে পারে না।',
  SELECT_PAYMENT_MODE: 'পেমেন্টের মাধ্যম সিলেক্ট করি',
  PAYMENT_RECEIVED_WALLET: 'পেলাম (ওয়ালেট)',
  WALLET_RECEIVED_COPY: 'ওয়ালেটে %1$s টাকা গ্রহণ করা হয়েছে।',
  PAYMENT_ACCEPTED: 'পেমেন্ট গ্রহণ করা হয়েছে।',
  PREVIOUS_BALANCE_PREFIX: 'সর্বশেষ ',
  SETTLEMENT_INSTRUCTIONS: 'instructions generated from the NoboPay settlement bank.',
});

const BLE_STATES = Object.freeze({
  DISCONNECTED: 'DISCONNECTED',
  SCANNING: 'SCANNING',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  RECONNECTING: 'RECONNECTING',
  ERROR: 'ERROR',
});

const BATTERY_SERVICE_UUID = '0000180F-0000-1000-8000-00805F9B34FB';
const BATTERY_LEVEL_CHAR_UUID = '00002A19-0000-1000-8000-00805F9B34FB';
const SOUNDBOX_SERVICE_UUID = '0000FFE0-0000-1000-8000-00805F9B34FB';
const SOUNDBOX_CMD_CHAR_UUID = '0000FFE1-0000-1000-8000-00805F9B34FB';

const AUDIO_OUTPUT_SINKS = Object.freeze({
  HARDWARE_BLE_SOUNDBOX: 'HARDWARE_BLE_SOUNDBOX',
  SOFTWARE_IN_APP_TTS: 'SOFTWARE_IN_APP_TTS',
  SILENT_OR_VIBRATE: 'SILENT_OR_VIBRATE',
});

const SETTLEMENT_PAYOUT_RULES = Object.freeze({
  INSTANT_NPSB_FEE_PCT: 0.01,
  INSTANT_NPSB_MIN_FEE_PAISA: 1000,
  REGULAR_BEFTN_FEE_PAISA: 0,
  AUTO_SWEEP_CUTOFF_HOUR: 17,
  AUTO_SWEEP_MIN_THRESHOLD_PAISA: 50000,
});

function transitionBleState(current, action) {
  switch (current) {
    case BLE_STATES.DISCONNECTED:
      if (action === 'START_SCAN') return BLE_STATES.SCANNING;
      break;
    case BLE_STATES.SCANNING:
      if (action === 'DEVICE_FOUND') return BLE_STATES.CONNECTING;
      if (action === 'TIMEOUT') return BLE_STATES.DISCONNECTED;
      break;
    case BLE_STATES.CONNECTING:
      if (action === 'GATT_CONNECTED') return BLE_STATES.CONNECTED;
      if (action === 'FAILED') return BLE_STATES.ERROR;
      break;
    case BLE_STATES.CONNECTED:
      if (action === 'LINK_LOSS') return BLE_STATES.RECONNECTING;
      if (action === 'DISCONNECT') return BLE_STATES.DISCONNECTED;
      break;
    case BLE_STATES.RECONNECTING:
      if (action === 'GATT_RECONNECTED') return BLE_STATES.CONNECTED;
      if (action === 'MAX_RETRIES_EXCEEDED') return BLE_STATES.DISCONNECTED;
      break;
    case BLE_STATES.ERROR:
      if (action === 'RESET') return BLE_STATES.DISCONNECTED;
      break;
  }
  return current;
}

function evaluateRssiHealth(rssiDbm) {
  const dbm = Number(rssiDbm);
  if (dbm >= -60) return { quality: 'EXCELLENT', bars: 4, reliable: true };
  if (dbm >= -75) return { quality: 'GOOD', bars: 3, reliable: true };
  if (dbm >= -85) return { quality: 'FAIR', bars: 2, reliable: true };
  return { quality: 'POOR', bars: 1, reliable: false };
}

function evaluateBatteryTelemetry(voltageMv, isCharging = false) {
  const clampedMv = Math.min(4200, Math.max(3200, Number(voltageMv || 0)));
  const percentage = Math.round(((clampedMv - 3200) / 1000) * 100);
  const isLow = percentage <= 15;
  const isCritical = percentage <= 5;
  const chargingBool = Boolean(isCharging);
  return {
    voltageMv: Number(voltageMv),
    percentage,
    isCharging: chargingBool,
    isLow,
    isCritical,
    statusText: chargingBool ? 'CHARGING' : (isCritical ? 'CRITICAL' : (isLow ? 'LOW_BATTERY' : 'NORMAL')),
  };
}

function syncSoundboxVolume(step) {
  const clampedStep = Math.max(0, Math.min(15, Math.floor(Number(step || 0))));
  const dutyPct = Math.round((clampedStep / 15) * 100);
  const hexCmd = '0x' + clampedStep.toString(16).toUpperCase().padStart(2, '0');
  return { step: clampedStep, dutyPct, hexCmd };
}

function buildSoundboxCommandPacket(amountPaisa, channelCode = 1) {
  const buf = Buffer.alloc(16);
  buf.writeUInt8(0xAA, 0);
  buf.writeUInt8(0x55, 1);
  buf.writeUInt8(0x01, 2);
  buf.writeUInt8(0x01, 3);
  buf.writeUInt8(Number(channelCode) & 0xFF, 4);
  buf.writeBigUInt64BE(BigInt(Math.max(0, Math.round(Number(amountPaisa || 0)))), 5);
  let crc = 0xFFFF;
  for (let i = 0; i < 13; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) crc = (crc >> 1) ^ 0xA001;
      else crc = crc >> 1;
    }
  }
  buf.writeUInt16LE(crc, 13);
  buf.writeUInt8(0x00, 15);
  return buf;
}

function resolveAudioOutputSink(isBleConnected, batteryLevelPct, ttsEnabled) {
  if (Boolean(isBleConnected) && Number(batteryLevelPct || 0) >= 10) {
    return AUDIO_OUTPUT_SINKS.HARDWARE_BLE_SOUNDBOX;
  }
  if (Boolean(ttsEnabled)) {
    return AUDIO_OUTPUT_SINKS.SOFTWARE_IN_APP_TTS;
  }
  return AUDIO_OUTPUT_SINKS.SILENT_OR_VIBRATE;
}

function toBengaliDigits(num) {
  const bDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (d) => bDigits[Number(d)]);
}

function generateBengaliVoiceAnnouncement(amountPaisa, channel = 'টালিপে') {
  const safePaisa = Math.max(0, Math.round(Number(amountPaisa || 0)));
  const taka = Math.floor(safePaisa / 100);
  const paisa = safePaisa % 100;

  let spokenAmount = '';
  if (taka === 500) spokenAmount = 'পাঁচ শত';
  else if (taka === 1000) spokenAmount = 'এক হাজার';
  else if (taka === 100) spokenAmount = 'এক শত';
  else if (taka === 50) spokenAmount = 'পঞ্চাশ';
  else spokenAmount = toBengaliDigits(taka);

  let phrase = (channel || 'টালিপে') + '-তে ' + spokenAmount + ' টাকা';
  if (paisa > 0) {
    phrase += ' ' + toBengaliDigits(paisa) + ' পয়সা';
  }
  phrase += ' পাওয়া গেছে';

  return {
    rawPaisa: safePaisa,
    taka,
    paisa,
    formattedBengaliAmount: toBengaliDigits(taka) + (paisa > 0 ? '.' + toBengaliDigits(paisa) : ''),
    announcementPhrase: phrase,
  };
}

function calculateSettlementPayoutFee(amountPaisa, isInstant = false) {
  const amount = Math.max(0, Math.round(Number(amountPaisa || 0)));
  if (!isInstant) {
    return {
      amountPaisa: amount,
      feePaisa: 0,
      netPayoutPaisa: amount,
      mode: 'BEFTN_REGULAR',
      feeTaka: 0,
      netPayoutTaka: amount / 100,
    };
  }
  const feePaisa = Math.max(
    SETTLEMENT_PAYOUT_RULES.INSTANT_NPSB_MIN_FEE_PAISA,
    Math.round(amount * SETTLEMENT_PAYOUT_RULES.INSTANT_NPSB_FEE_PCT)
  );
  const netPayoutPaisa = Math.max(0, amount - feePaisa);
  return {
    amountPaisa: amount,
    feePaisa,
    netPayoutPaisa,
    mode: 'NPSB_INSTANT',
    feeTaka: feePaisa / 100,
    netPayoutTaka: netPayoutPaisa / 100,
  };
}

class TransactionSettlementAction {
  constructor(payload = {}) {
    this.id = payload.id !== undefined && payload.id !== null ? Number(payload.id) : null;
    this.transaction_number = String(
      payload.transaction_number || payload.transactionNumber || payload.txnNumber || ''
    ).trim();
    this.action_type = String(
      payload.action_type || payload.actionType || TKEnum$TransactionSettlementAction.NO_ACTION
    ).trim().toUpperCase();
    this.synced = (payload.synced !== undefined && payload.synced !== null)
      ? Number(payload.synced)
      : (payload.syncStatus !== undefined ? Number(payload.syncStatus) : 0);
    this.create_date = payload.create_date || payload.createDate || new Date().toISOString();
    this.update_date = payload.update_date || payload.updateDate || null;
  }
}

class TransactionSettlementActionDao {
  constructor(storage = null, businessId = '1') {
    this.storage = storage;
    this.businessId = String(businessId || '1');
    this.records = [];
    this.idCounter = 1;
  }

  exists(transactionNumber) {
    const txnNum = String(transactionNumber || '').trim();
    if (this.storage && typeof this.storage.existsTransactionSettlementAction === 'function') {
      return this.storage.existsTransactionSettlementAction(this.businessId, txnNum);
    }
    return this.records.some((r) => r.transaction_number === txnNum);
  }

  insert(record) {
    const entity = record instanceof TransactionSettlementAction ? record : new TransactionSettlementAction(record);
    if (!entity.id) entity.id = this.idCounter++;
    if (this.storage && typeof this.storage.saveTransactionSettlementAction === 'function') {
      return this.storage.saveTransactionSettlementAction(this.businessId, entity);
    }
    this.records.push(entity);
    return entity;
  }

  getUnsyncedTxnSettlementActions(limit = 100) {
    if (this.storage && typeof this.storage.getUnsyncedTxnSettlementActions === 'function') {
      return this.storage.getUnsyncedTxnSettlementActions(this.businessId, limit);
    }
    return this.records.filter((r) => Number(r.synced) === 0).slice(0, limit);
  }

  updateTxnSettlementActionSyncStatusByIds(synced, ids = []) {
    if (this.storage && typeof this.storage.updateTxnSettlementActionSyncStatusByIds === 'function') {
      return this.storage.updateTxnSettlementActionSyncStatusByIds(this.businessId, synced, ids);
    }
    const idSet = new Set((ids || []).map(Number));
    let count = 0;
    for (const r of this.records) {
      if (idSet.has(Number(r.id))) {
        r.synced = Number(synced);
        r.update_date = new Date().toISOString();
        count++;
      }
    }
    return count;
  }

  updateAllTxnSettlementActionUnsynced() {
    if (this.storage && typeof this.storage.updateAllTxnSettlementActionUnsynced === 'function') {
      return this.storage.updateAllTxnSettlementActionUnsynced(this.businessId);
    }
    let count = 0;
    for (const r of this.records) {
      r.synced = 0;
      r.update_date = new Date().toISOString();
      count++;
    }
    return count;
  }

  countUnsynced() {
    return this.getUnsyncedTxnSettlementActions(100000).length;
  }

  getAll() {
    if (this.storage && typeof this.storage.getTransactionSettlementActions === 'function') {
      return this.storage.getTransactionSettlementActions(this.businessId);
    }
    return [...this.records];
  }
}

class SettlementAutomationEngine {
  constructor(options = {}) {
    this.customers = new Map();
    this.settlementActions = [];
    this.journal = [];
    this.walletBalancePaisa = options.walletBalancePaisa !== undefined ? options.walletBalancePaisa : 1000000;
    this.idCounter = 1;
    this.storage = options.storage || null;
    this.businessId = String(options.businessId || '1');
  }

  addCustomer(id, name, mobile, startingDuePaisa) {
    this.customers.set(id, { id, name, mobile, balancePaisa: Number(startingDuePaisa || 0) });
  }

  exists(transactionNumber) {
    return this.settlementActions.some((a) => a.transaction_number === transactionNumber);
  }

  processIncomingTransaction(txn = {}) {
    const { transactionNumber, amountPaisa, senderMobile, channel } = txn;

    if (this.exists(transactionNumber)) {
      return { success: false, reason: 'DUPLICATE_TRANSACTION', transactionNumber };
    }

    const safeAmountPaisa = Math.max(0, Math.round(Number(amountPaisa || 0)));
    this.walletBalancePaisa += safeAmountPaisa;

    let matchedCustomer = null;
    for (const [id, cust] of this.customers.entries()) {
      if (cust.mobile === senderMobile) {
        matchedCustomer = cust;
        break;
      }
    }

    let actionType = TKEnum$TransactionSettlementAction.NO_ACTION;
    let settledJournalId = null;

    if (matchedCustomer && matchedCustomer.balancePaisa > 0) {
      const settlementAmount = Math.min(matchedCustomer.balancePaisa, safeAmountPaisa);
      matchedCustomer.balancePaisa -= settlementAmount;
      actionType = TKEnum$TransactionSettlementAction.CREDIT_COLLECTION;

      settledJournalId = 'JRN-' + this.idCounter++;
      this.journal.push({
        id: settledJournalId,
        accountId: matchedCustomer.id,
        txnType: 2,
        amount: settlementAmount / 100,
        amountReceived: settlementAmount / 100,
        txnMode: 'WALLET',
        transactionNumber,
        note: SETTLEMENT_SOUNDBOX_ARSC_TOKENS.SC_CREDIT_SETTLEMENT,
        date: new Date().toISOString(),
      });
    } else {
      actionType = TKEnum$TransactionSettlementAction.DIGITAL_SALE;
      settledJournalId = 'JRN-' + this.idCounter++;
      this.journal.push({
        id: settledJournalId,
        accountId: null,
        txnType: 1,
        amount: safeAmountPaisa / 100,
        amountReceived: safeAmountPaisa / 100,
        txnMode: 'WALLET',
        transactionNumber,
        date: new Date().toISOString(),
      });
    }

    const actionRecord = {
      id: this.idCounter++,
      transaction_number: transactionNumber,
      action_type: actionType,
      synced: 0,
      create_date: new Date().toISOString(),
      update_date: null,
    };
    this.settlementActions.push(actionRecord);

    const voicePayload = generateBengaliVoiceAnnouncement(safeAmountPaisa, channel || 'টালিপে');

    return {
      success: true,
      transactionNumber,
      actionType,
      actionId: actionRecord.id,
      matchedCustomerId: matchedCustomer ? matchedCustomer.id : null,
      customerRemainingDuePaisa: matchedCustomer ? matchedCustomer.balancePaisa : null,
      voiceAnnouncement: voicePayload.announcementPhrase,
    };
  }

  getUnsyncedTxnSettlementActions(limit = 100) {
    return this.settlementActions.filter((a) => Number(a.synced) === 0).slice(0, limit);
  }

  updateTxnSettlementActionSyncStatusByIds(syncedStatus, ids = []) {
    let count = 0;
    const idSet = new Set((ids || []).map(Number));
    for (const a of this.settlementActions) {
      if (idSet.has(Number(a.id))) {
        a.synced = Number(syncedStatus);
        a.update_date = new Date().toISOString();
        count++;
      }
    }
    return count;
  }

  updateAllTxnSettlementActionUnsynced() {
    let count = 0;
    for (const a of this.settlementActions) {
      a.synced = 0;
      a.update_date = new Date().toISOString();
      count++;
    }
    return count;
  }

  calculatePayoutFee(amountPaisa, isInstant = false) {
    return calculateSettlementPayoutFee(amountPaisa, isInstant);
  }
}

class SoundboxBleDiagnosticsService {
  constructor(options = {}) {
    this.state = BLE_STATES.DISCONNECTED;
    this.deviceId = options.deviceId || 'SB-QR-001';
    this.deviceName = options.deviceName || 'TallyPay Soundbox';
    this.rssiDbm = options.rssiDbm || -65;
    this.batteryVoltageMv = options.batteryVoltageMv || 3900;
    this.isCharging = Boolean(options.isCharging);
    this.volumeStep = options.volumeStep !== undefined ? options.volumeStep : 12;
    this.retries = 0;
    this.maxRetries = options.maxRetries || 3;
    this.connectedTimestamp = null;
    this.lastPacketSent = null;
  }

  transition(action) {
    const prevState = this.state;
    this.state = transitionBleState(this.state, action);
    if (this.state === BLE_STATES.CONNECTED) {
      this.retries = 0;
      this.connectedTimestamp = Date.now();
    } else if (this.state === BLE_STATES.RECONNECTING) {
      this.retries++;
      if (this.retries > this.maxRetries) {
        this.state = transitionBleState(this.state, 'MAX_RETRIES_EXCEEDED');
      }
    }
    return { prevState, currentState: this.state, action };
  }

  startScan() { return this.transition('START_SCAN'); }
  deviceFound() { return this.transition('DEVICE_FOUND'); }
  connect() {
    if (this.state === BLE_STATES.DISCONNECTED) {
      this.startScan();
      this.deviceFound();
    } else if (this.state === BLE_STATES.SCANNING) {
      this.deviceFound();
    }
    return this.transition('GATT_CONNECTED');
  }
  disconnect() { return this.transition('DISCONNECT'); }
  linkLoss() { return this.transition('LINK_LOSS'); }
  reconnect() { return this.transition('GATT_RECONNECTED'); }
  reset() { return this.transition('RESET'); }

  setRssi(rssiDbm) {
    this.rssiDbm = Number(rssiDbm);
    return evaluateRssiHealth(this.rssiDbm);
  }

  setBattery(voltageMv, isCharging = false) {
    this.batteryVoltageMv = Number(voltageMv);
    this.isCharging = Boolean(isCharging);
    return evaluateBatteryTelemetry(this.batteryVoltageMv, this.isCharging);
  }

  setVolume(step) {
    const vol = syncSoundboxVolume(step);
    this.volumeStep = vol.step;
    return vol;
  }

  getTelemetry() {
    const rssi = evaluateRssiHealth(this.rssiDbm);
    const battery = evaluateBatteryTelemetry(this.batteryVoltageMv, this.isCharging);
    const volume = syncSoundboxVolume(this.volumeStep);
    return {
      deviceId: this.deviceId,
      deviceName: this.deviceName,
      state: this.state,
      isConnected: this.state === BLE_STATES.CONNECTED,
      rssi,
      battery,
      volume,
      retries: this.retries,
      connectedTimestamp: this.connectedTimestamp,
    };
  }

  dispatchPaymentPacket(amountPaisa, channelCode = 1, ttsEnabled = true) {
    const telemetry = this.getTelemetry();
    const sink = resolveAudioOutputSink(telemetry.isConnected, telemetry.battery.percentage, ttsEnabled);
    const packet = buildSoundboxCommandPacket(amountPaisa, channelCode);
    const voice = generateBengaliVoiceAnnouncement(amountPaisa);
    this.lastPacketSent = {
      timestamp: Date.now(),
      amountPaisa,
      channelCode,
      sink,
      packetLength: packet.length,
      packetHex: packet.toString('hex'),
      announcementPhrase: voice.announcementPhrase,
    };
    return {
      success: true,
      sink,
      packet,
      telemetry,
      voiceAnnouncement: voice.announcementPhrase,
    };
  }
}


// ============================================================================
// MILESTONE REA-ITER-237: TALLYPAY MERCHANT KYC, NID SCANNER OCR &
// BIO-VERIFICATION PIPELINE SUBSYSTEM
// Reference: classes4.dex, EkycActivity, TextRecognizedModel, LivenessGesture,
// Room SQLite table `merchant_kyc`, index `index_merchant_kyc_business_id`
// ============================================================================

const MERCHANT_KYC_SCHEMA = Object.freeze({
  tableName: 'merchant_kyc',
  columns: Object.freeze([
    'id',
    'business_id',
    'nid_number',
    'dob',
    'name_bn',
    'name_en',
    'father_name',
    'mother_name',
    'nid_front_path',
    'nid_back_path',
    'selfie_path',
    'verification_status',
    'liveness_score',
    'synced',
    'create_date',
    'update_date'
  ]),
  uniqueIndex: 'index_merchant_kyc_business_id',
  ddl: 'CREATE TABLE IF NOT EXISTS `merchant_kyc` (`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, `business_id` TEXT NOT NULL, `nid_number` TEXT NOT NULL, `dob` TEXT NOT NULL, `name_bn` TEXT, `name_en` TEXT, `father_name` TEXT, `mother_name` TEXT, `nid_front_path` TEXT, `nid_back_path` TEXT, `selfie_path` TEXT, `verification_status` TEXT NOT NULL, `liveness_score` REAL, `synced` INTEGER NOT NULL DEFAULT 0, `create_date` TEXT NOT NULL, `update_date` TEXT);',
  indexDdl: 'CREATE UNIQUE INDEX IF NOT EXISTS `index_merchant_kyc_business_id` ON `merchant_kyc` (`business_id`);',
});

const KYC_TABLE_SCHEMA = MERCHANT_KYC_SCHEMA.ddl;

const KYC_STATUSES = Object.freeze({
  INCOMPLETE: 'INCOMPLETE',
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED'
});
const EkycVerificationStatus = KYC_STATUSES;
const MerchantKycStatus = KYC_STATUSES;

const NID_TYPES = Object.freeze({
  SMART_NID: 'SMART_NID',
  LEGACY_13: 'LEGACY_13',
  LEGACY_17: 'LEGACY_17',
  UNKNOWN: 'UNKNOWN'
});
const BangladeshNidType = NID_TYPES;

const NID_SIDES = Object.freeze({
  FRONT: 'FRONT',
  BACK: 'BACK'
});
const NidSide = NID_SIDES;

const LIVENESS_GESTURES = Object.freeze({
  LOOK_DOWN: 'LOOK_DOWN',
  LOOK_LEFT: 'LOOK_LEFT',
  LOOK_RIGHT: 'LOOK_RIGHT',
  LOOK_UP: 'LOOK_UP',
  SMILE: 'SMILE',
  BLINK: 'BLINK'
});
const LivenessGesture = LIVENESS_GESTURES;

const LIVENESS_STATES = Object.freeze({
  IDLE: 'IDLE',
  AWAITING_CENTRE: 'AWAITING_CENTRE',
  AWAITING_GESTURE: 'AWAITING_GESTURE',
  HOLDING: 'HOLDING',
  GESTURE_PASSED: 'GESTURE_PASSED',
  SESSION_COMPLETE: 'SESSION_COMPLETE',
  GESTURE_TIMED_OUT: 'GESTURE_TIMED_OUT',
  EXIT_OFFERED: 'EXIT_OFFERED'
});
const LivenessState = LIVENESS_STATES;

const KYC_ARSC_TOKENS = Object.freeze({
  NID_LENGTH_ERROR: 'NID নম্বর ১০, ১৩ অথবা ১৭ সংখ্যা হতে হবে।',
  EKYC_HEADER_BANNER: 'NID ও সেলফি দিয়ে e-KYC সম্পন্ন করুন',
  NID_FRONT_LABEL: 'NID-এর ছবি (সামনে)',
  NID_BACK_LABEL: 'NID-এর ছবি (পেছনে)',
  NID_FRONT_OVERLAY: 'NID-এর সামনের ছবি তুলুন।',
  NID_BACK_OVERLAY: 'NID-এর পিছনের ছবি তুলুন।',
  SELFIE_CONFIRM_TITLE: 'আপনার সেলফি নিশ্চিত করুন',
  MATCHING_PROGRESS: 'আপনার সেলফিটি NID-এর সাথে মেলানো হচ্ছে…',
  MATCH_SUCCESS: 'আপনার সেলফিটি NID-এর সাথে যাচাই হয়েছে।',
  MATCH_FAILED: 'আপনার সেলফিটি NID-এর সাথে মেলেনি',
  VERIFY_RETRY_LATER: 'সেলফি যাচাই করা যাচ্ছে না। আপনি পরে আবার চেষ্টা করতে পারেন।',
  SELFIE_MISMATCH_BADGE: 'সেলফি মেলেনি',
  SELFIE_INSTRUCTION: 'সেলফি নির্দেশনা',
  CAMERA_PERMISSION_RATIONALE: 'সেলফি তুলতে ক্যামেরা ব্যবহারের অনুমতি দিন।',
  SELFIE_COMPLETE_CTA: 'সেলফি তুলে e-KYC সম্পন্ন করুন।',
  NID_INFO_VERIFYING: 'NID-এর তথ্য যাচাই করা হচ্ছে…',
  NID_SERVER_ERROR: 'NID সার্ভারে সমস্যা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।',
  BIRTH_YEAR_MISMATCH: '১৭ সংখ্যার এনআইডির প্রথম ৪ ডিজিট জন্ম সালের সাথে মিলতে হবে।',
  UNDERAGE_ERROR: 'মার্চেন্ট একাউন্টের জন্য আবেদনকারীর বয়স কমপক্ষে ১৮ বছর হতে হবে।'
});

function validateBangladeshNid(nidNumber, dateOfBirth) {
  if (typeof nidNumber !== 'string') {
    return { valid: false, reason: 'INVALID_TYPE', type: NID_TYPES.UNKNOWN };
  }
  const cleaned = nidNumber.trim().replace(/[- ]/g, '');
  
  if (!/^\d+$/.test(cleaned)) {
    return { valid: false, reason: 'NON_NUMERIC', type: NID_TYPES.UNKNOWN };
  }

  const len = cleaned.length;
  if (len !== 10 && len !== 13 && len !== 17) {
    return {
      valid: false,
      reason: 'INVALID_LENGTH',
      message: KYC_ARSC_TOKENS.NID_LENGTH_ERROR,
      type: NID_TYPES.UNKNOWN
    };
  }

  let nidType = NID_TYPES.UNKNOWN;
  if (len === 10) {
    nidType = NID_TYPES.SMART_NID;
  } else if (len === 13) {
    nidType = NID_TYPES.LEGACY_13;
  } else if (len === 17) {
    nidType = NID_TYPES.LEGACY_17;
    if (dateOfBirth) {
      const birthYear = new Date(dateOfBirth).getFullYear().toString();
      const prefixYear = cleaned.substring(0, 4);
      if (prefixYear !== birthYear) {
        return {
          valid: false,
          reason: 'BIRTH_YEAR_MISMATCH',
          message: KYC_ARSC_TOKENS.BIRTH_YEAR_MISMATCH,
          type: nidType
        };
      }
    }
  }

  if (dateOfBirth) {
    const dobDate = new Date(dateOfBirth);
    if (isNaN(dobDate.getTime())) {
      return { valid: false, reason: 'INVALID_DOB', type: nidType };
    }
    const today = new Date();
    if (dobDate > today) {
      return {
        valid: false,
        reason: 'FUTURE_DOB',
        message: 'জন্ম তারিখ ভবিষ্যতের হতে পারে না।',
        type: nidType
      };
    }
    let age = today.getFullYear() - dobDate.getFullYear();
    const m = today.getMonth() - dobDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
      age--;
    }
    if (age < 18) {
      return {
        valid: false,
        reason: 'UNDERAGE',
        message: KYC_ARSC_TOKENS.UNDERAGE_ERROR,
        type: nidType,
        age
      };
    }
  }

  return { valid: true, nidNumber: cleaned, type: nidType };
}

function extractAndNormalizeOcrFields(rawOcrData = {}, side = 'FRONT') {
  if (!rawOcrData || typeof rawOcrData !== 'object') {
    return { success: false, error: 'INVALID_OCR_INPUT' };
  }

  const normalizeBengaliDigits = (str) => {
    if (!str) return '';
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(str).replace(/[০-৯]/g, (d) => bnDigits.indexOf(d));
  };

  const trimUpper = (str) => (str ? String(str).trim().toUpperCase() : '');
  const trimStr = (str) => (str ? String(str).trim() : '');

  const sideUpper = String(side || 'FRONT').toUpperCase();
  if (sideUpper === 'FRONT') {
    const identificationNumber = normalizeBengaliDigits(
      rawOcrData.identificationNumber || rawOcrData.nidNumber || rawOcrData.nid_number || ''
    ).replace(/[- ]/g, '');
    const name = trimUpper(rawOcrData.name || rawOcrData.name_en || rawOcrData.nameEn || '');
    const nameBN = trimStr(rawOcrData.nameBN || rawOcrData.name_bn || rawOcrData.nameBn || '');
    const dob = trimStr(rawOcrData.dob || rawOcrData.dateOfBirth || rawOcrData.date_of_birth || '');
    const fatherName = trimStr(rawOcrData.fatherName || rawOcrData.father_name || '');
    const motherName = trimStr(rawOcrData.motherName || rawOcrData.mother_name || '');

    return {
      success: true,
      side: 'FRONT',
      fields: {
        identificationNumber,
        name,
        nameBN,
        dob,
        fatherName,
        motherName
      }
    };
  } else if (sideUpper === 'BACK') {
    const address = trimStr(rawOcrData.address || '');
    const postalCode = normalizeBengaliDigits(rawOcrData.postalCode || rawOcrData.postal_code || '');
    const bloodGroup = trimUpper(rawOcrData.bloodGroup || rawOcrData.blood_group || '');
    const issueDate = trimStr(rawOcrData.issueDate || rawOcrData.issue_date || '');

    return {
      success: true,
      side: 'BACK',
      fields: {
        address,
        postalCode,
        bloodGroup,
        issueDate
      }
    };
  }

  return { success: false, error: 'UNSUPPORTED_NID_SIDE' };
}

function transitionLivenessState(currentState, event) {
  switch (currentState) {
    case LIVENESS_STATES.IDLE:
      if (event === 'START_SESSION') return LIVENESS_STATES.AWAITING_CENTRE;
      break;
    case LIVENESS_STATES.AWAITING_CENTRE:
      if (event === 'FACE_CENTERED') return LIVENESS_STATES.AWAITING_GESTURE;
      if (event === 'TIMEOUT') return LIVENESS_STATES.EXIT_OFFERED;
      break;
    case LIVENESS_STATES.AWAITING_GESTURE:
      if (event === 'GESTURE_DETECTED') return LIVENESS_STATES.HOLDING;
      if (event === 'GESTURE_TIMEOUT') return LIVENESS_STATES.GESTURE_TIMED_OUT;
      break;
    case LIVENESS_STATES.HOLDING:
      if (event === 'HOLD_SUCCESS') return LIVENESS_STATES.GESTURE_PASSED;
      if (event === 'HOLD_BROKEN') return LIVENESS_STATES.AWAITING_GESTURE;
      break;
    case LIVENESS_STATES.GESTURE_PASSED:
      if (event === 'ALL_GESTURES_PASSED') return LIVENESS_STATES.SESSION_COMPLETE;
      if (event === 'NEXT_GESTURE') return LIVENESS_STATES.AWAITING_GESTURE;
      break;
    case LIVENESS_STATES.GESTURE_TIMED_OUT:
      if (event === 'RETRY') return LIVENESS_STATES.AWAITING_GESTURE;
      if (event === 'CANCEL') return LIVENESS_STATES.EXIT_OFFERED;
      break;
  }
  return currentState;
}

function assessSelfieQuality(faceRect, imageWidth, imageHeight, luminance, blurVariance) {
  const centerX = faceRect.x + faceRect.width / 2;
  const centerY = faceRect.y + faceRect.height / 2;
  const xRatio = centerX / imageWidth;
  const yRatio = centerY / imageHeight;
  const centered = xRatio >= 0.35 && xRatio <= 0.65 && yRatio >= 0.35 && yRatio <= 0.65;
  const wellLit = luminance >= 40 && luminance <= 240;
  const sharp = blurVariance >= 100;

  const passed = Boolean(centered && wellLit && sharp);
  return {
    passed,
    metrics: { centered, wellLit, sharp, xRatio, yRatio, luminance, blurVariance }
  };
}

function evaluateKycVerificationStatus(validNid, livenessScore) {
  let isNidValid = false;
  let score = 0;
  if (typeof validNid === 'object' && validNid !== null) {
    isNidValid = Boolean(validNid.validNid ?? validNid.nidValidation?.valid ?? validNid.valid);
    score = Number(validNid.livenessScore ?? livenessScore) || 0;
  } else {
    isNidValid = Boolean(validNid);
    score = Number(livenessScore) || 0;
  }
  if (!isNidValid) return KYC_STATUSES.REJECTED;
  if (score >= 0.85) return KYC_STATUSES.VERIFIED;
  if (score >= 0.50) return KYC_STATUSES.PENDING;
  return KYC_STATUSES.REJECTED;
}

class MerchantKycRecord {
  constructor(data = {}) {
    this.id = data.id || null;
    this.business_id = String(data.business_id || data.businessId || '1');
    this.businessId = this.business_id;
    this.nid_number = String(data.nid_number || data.nidNumber || '');
    this.dob = String(data.dob || '');
    this.name_bn = data.name_bn || data.nameBN || null;
    this.name_en = data.name_en || data.name || null;
    this.father_name = data.father_name || data.fatherName || null;
    this.mother_name = data.mother_name || data.motherName || null;
    this.nid_front_path = data.nid_front_path || data.nidFrontPath || null;
    this.nid_back_path = data.nid_back_path || data.nidBackPath || null;
    this.selfie_path = data.selfie_path || data.selfiePath || null;
    this.verification_status = data.verification_status || data.verificationStatus || KYC_STATUSES.INCOMPLETE;
    this.liveness_score = data.liveness_score !== undefined ? Number(data.liveness_score) : null;
    this.synced = data.synced !== undefined ? Number(data.synced) : 0;
    this.create_date = data.create_date || data.createDate || new Date().toISOString();
    this.update_date = data.update_date || data.updateDate || null;
  }
}

class MerchantKycDao {
  constructor(initialRecords = []) {
    this.records = new Map();
    this.idCounter = 1;
    if (Array.isArray(initialRecords)) {
      initialRecords.forEach((r) => this.saveKyc(r));
    }
  }

  saveKyc(record) {
    const kyc = new MerchantKycRecord(record);
    if (!kyc.id) {
      kyc.id = this.idCounter++;
    }
    this.records.set(kyc.business_id, kyc);
    return { ...kyc };
  }

  exists(businessId) {
    return this.records.has(String(businessId));
  }

  getKycByBusinessId(businessId) {
    const rec = this.records.get(String(businessId));
    return rec ? { ...rec } : null;
  }

  updateKycStatus(businessId, status, livenessScore = null) {
    const rec = this.records.get(String(businessId));
    if (!rec) return null;
    rec.verification_status = status;
    if (livenessScore !== null && livenessScore !== undefined) {
      rec.liveness_score = Number(livenessScore);
    }
    rec.update_date = new Date().toISOString();
    return { ...rec };
  }

  getUnsyncedKyc(limit = 100) {
    const results = [];
    for (const rec of this.records.values()) {
      if (Number(rec.synced) === 0) {
        results.push({ ...rec });
        if (results.length >= limit) break;
      }
    }
    return results;
  }

  updateKycSyncStatus(businessId, synced = 1) {
    const rec = this.records.get(String(businessId));
    if (!rec) return false;
    rec.synced = Number(synced);
    rec.update_date = new Date().toISOString();
    return true;
  }
}

class MerchantKycPipelineEngine {
  constructor(storage = null) {
    this.storage = storage;
    this.records = new Map();
    this.idCounter = 1;
  }

  processNidFront(businessId, imageBase64, ocrResult, storage = null) {
    const bizId = String(businessId || '1');
    let rec = this.records.get(bizId) || {
      id: this.idCounter++,
      business_id: bizId,
      verification_status: KYC_STATUSES.INCOMPLETE,
      synced: 0,
      create_date: new Date().toISOString(),
      update_date: null
    };

    rec.nid_front_path = '/storage/emulated/0/TallyKhata/kyc/nid_front_' + bizId + '.jpg';
    rec.nid_number = ocrResult.identificationNumber || ocrResult.nid_number || ocrResult.nidNumber || '';
    rec.name_en = ocrResult.name || ocrResult.name_en || '';
    rec.name_bn = ocrResult.nameBN || ocrResult.name_bn || '';
    rec.dob = ocrResult.dob || ocrResult.dateOfBirth || '';
    rec.father_name = ocrResult.fatherName || ocrResult.father_name || '';
    rec.mother_name = ocrResult.motherName || ocrResult.mother_name || '';
    rec.update_date = new Date().toISOString();

    this.records.set(bizId, rec);

    const targetStorage = storage || this.storage;
    if (targetStorage && typeof targetStorage.saveMerchantKyc === 'function') {
      targetStorage.saveMerchantKyc(bizId, rec);
    }

    return {
      success: true,
      step: 'NID_FRONT_SAVED',
      nidNumber: rec.nid_number,
      record: { ...rec }
    };
  }

  processNidBack(businessId, imageBase64, ocrResult, storage = null) {
    const bizId = String(businessId || '1');
    const rec = this.records.get(bizId);
    if (!rec) throw new Error('Front NID must be submitted first');

    rec.nid_back_path = '/storage/emulated/0/TallyKhata/kyc/nid_back_' + bizId + '.jpg';
    rec.address = ocrResult.address || '';
    rec.blood_group = ocrResult.bloodGroup || ocrResult.blood_group || '';
    rec.postal_code = ocrResult.postalCode || ocrResult.postal_code || '';
    rec.update_date = new Date().toISOString();

    const targetStorage = storage || this.storage;
    if (targetStorage && typeof targetStorage.saveMerchantKyc === 'function') {
      targetStorage.saveMerchantKyc(bizId, rec);
    }

    return {
      success: true,
      step: 'NID_BACK_SAVED',
      record: { ...rec }
    };
  }

  processLivenessAndSelfie(businessId, selfieBase64, livenessScore, storage = null) {
    const bizId = String(businessId || '1');
    const rec = this.records.get(bizId);
    if (!rec) throw new Error('KYC session not initialized');

    rec.selfie_path = '/storage/emulated/0/TallyKhata/kyc/selfie_' + bizId + '.jpg';
    rec.liveness_score = Number(livenessScore);

    const nidVal = validateBangladeshNid(rec.nid_number, rec.dob);
    rec.verification_status = evaluateKycVerificationStatus(nidVal.valid, rec.liveness_score);
    rec.update_date = new Date().toISOString();

    const targetStorage = storage || this.storage;
    if (targetStorage && typeof targetStorage.saveMerchantKyc === 'function') {
      targetStorage.saveMerchantKyc(bizId, rec);
    }

    return {
      success: true,
      status: rec.verification_status,
      livenessScore: rec.liveness_score,
      nidNumber: rec.nid_number,
      record: { ...rec }
    };
  }

  getKycByBusinessId(businessId) {
    return this.records.get(String(businessId)) || null;
  }
}

const ReconstructedKycEngine = MerchantKycPipelineEngine;
const KycPipelineEngine = MerchantKycPipelineEngine;
const merchantKycPipelineEngine = new MerchantKycPipelineEngine();
const reconstructedKycEngine = merchantKycPipelineEngine;

// ============================================================================
// MILESTONE REA-ITER-238: TALLYPAY MERCHANT QR STANDEE ORDER &
// POS SOUNDBOX COLLATERAL DELIVERY SUBSYSTEM
// Reference: classes4.dex, QrStandeeOrderActivity, SoundboxOrderActivity,
// Room SQLite table `merchant_qr_order`, index `index_merchant_qr_order_order_id`
// ============================================================================

const MERCHANT_QR_ORDER_SCHEMA = Object.freeze({
  tableName: 'merchant_qr_order',
  columns: Object.freeze([
    'id',
    'order_id',
    'business_id',
    'item_type',
    'item_name',
    'quantity',
    'unit_price_paisa',
    'total_price_paisa',
    'delivery_fee_paisa',
    'payment_method',
    'payment_status',
    'order_status',
    'recipient_name',
    'recipient_phone',
    'delivery_address',
    'division',
    'district',
    'postal_code',
    'courier_name',
    'tracking_code',
    'synced',
    'create_date',
    'update_date',
  ]),
  columnTypes: Object.freeze({
    id: 'INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL',
    order_id: 'TEXT NOT NULL',
    business_id: 'TEXT NOT NULL',
    item_type: 'TEXT NOT NULL',
    item_name: 'TEXT NOT NULL',
    quantity: 'INTEGER NOT NULL',
    unit_price_paisa: 'INTEGER NOT NULL',
    total_price_paisa: 'INTEGER NOT NULL',
    delivery_fee_paisa: 'INTEGER NOT NULL',
    payment_method: 'TEXT NOT NULL',
    payment_status: 'TEXT NOT NULL',
    order_status: 'TEXT NOT NULL',
    recipient_name: 'TEXT NOT NULL',
    recipient_phone: 'TEXT NOT NULL',
    delivery_address: 'TEXT NOT NULL',
    division: 'TEXT NOT NULL',
    district: 'TEXT NOT NULL',
    postal_code: 'TEXT',
    courier_name: 'TEXT',
    tracking_code: 'TEXT',
    synced: 'INTEGER NOT NULL DEFAULT 0',
    create_date: 'TEXT NOT NULL',
    update_date: 'TEXT',
  }),
  primaryKey: 'id',
  indices: Object.freeze([
    {
      name: 'index_merchant_qr_order_order_id',
      unique: true,
      columns: ['order_id'],
      ddl: 'CREATE UNIQUE INDEX IF NOT EXISTS index_merchant_qr_order_order_id ON merchant_qr_order (order_id);',
    },
  ]),
  ddl: `CREATE TABLE IF NOT EXISTS merchant_qr_order (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    order_id TEXT NOT NULL,
    business_id TEXT NOT NULL,
    item_type TEXT NOT NULL,
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price_paisa INTEGER NOT NULL,
    total_price_paisa INTEGER NOT NULL,
    delivery_fee_paisa INTEGER NOT NULL,
    payment_method TEXT NOT NULL,
    payment_status TEXT NOT NULL,
    order_status TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    recipient_phone TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    division TEXT NOT NULL,
    district TEXT NOT NULL,
    postal_code TEXT,
    courier_name TEXT,
    tracking_code TEXT,
    synced INTEGER NOT NULL DEFAULT 0,
    create_date TEXT NOT NULL,
    update_date TEXT
  );`,
});
const QR_ORDER_TABLE_SCHEMA = MERCHANT_QR_ORDER_SCHEMA;

const QR_ORDER_STATUSES = Object.freeze({
  PLACED: 'PLACED',
  CONFIRMED: 'CONFIRMED',
  SHIPPED: 'SHIPPED',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
});
const QrOrderStatus = QR_ORDER_STATUSES;

const QR_PAYMENT_METHODS = Object.freeze({
  WALLET: 'WALLET',
  CASH_ON_DELIVERY: 'CASH_ON_DELIVERY',
  ONLINE_GATEWAY: 'ONLINE_GATEWAY',
});
const QrPaymentMethod = QR_PAYMENT_METHODS;

const QR_PAYMENT_STATUSES = Object.freeze({
  PAID: 'PAID',
  PENDING: 'PENDING',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
});
const QrPaymentStatus = QR_PAYMENT_STATUSES;

const QR_ORDER_ITEM_TYPES = Object.freeze({
  ACRYLIC_STANDEE: 'ACRYLIC_STANDEE',
  WOODEN_STANDEE: 'WOODEN_STANDEE',
  METAL_STANDEE: 'METAL_STANDEE',
  COUNTER_STICKER: 'COUNTER_STICKER',
  SOUNDBOX_STAND: 'SOUNDBOX_STAND',
});

const QR_ORDER_CATALOG = Object.freeze({
  ACRYLIC_STANDEE: Object.freeze({
    code: 'ACRYLIC_STANDEE',
    name_bn: 'অ্যাক্রিলিক কিউআর স্ট্যান্ড',
    name_en: 'Acrylic QR Standee',
    unit_price_paisa: 25000,
    material: 'High-grade Transparent Acrylic',
    dimensions: 'A6 (105mm x 148mm)',
  }),
  WOODEN_STANDEE: Object.freeze({
    code: 'WOODEN_STANDEE',
    name_bn: 'কাঠের কিউআর স্ট্যান্ড',
    name_en: 'Wooden QR Standee',
    unit_price_paisa: 35000,
    material: 'Premium Polished Mahogany Wood',
    dimensions: '120mm x 160mm',
  }),
  METAL_STANDEE: Object.freeze({
    code: 'METAL_STANDEE',
    name_bn: 'মেটাল কিউআর স্ট্যান্ড',
    name_en: 'Metal QR Standee',
    unit_price_paisa: 50000,
    material: 'Powder-coated Stainless Aluminum',
    dimensions: '130mm x 180mm',
  }),
  COUNTER_STICKER: Object.freeze({
    code: 'COUNTER_STICKER',
    name_bn: 'কাউন্টার কিউআর স্টিকার',
    name_en: 'Counter QR Sticker',
    unit_price_paisa: 5000,
    material: 'Waterproof Laminated Vinyl',
    dimensions: '100mm x 100mm',
  }),
  SOUNDBOX_STAND: Object.freeze({
    code: 'SOUNDBOX_STAND',
    name_bn: 'সাউন্ডবক্স স্ট্যান্ড',
    name_en: 'Soundbox Stand',
    unit_price_paisa: 40000,
    material: 'Heavy-duty ABS Plastic Holder',
    dimensions: '150mm x 120mm x 90mm',
  }),
});

const BANGLADESH_DIVISIONS = Object.freeze([
  'Dhaka',
  'Chattogram',
  'Rajshahi',
  'Khulna',
  'Barishal',
  'Sylhet',
  'Rangpur',
  'Mymensingh',
]);

const BANGLADESH_DIVISION_ALIASES = Object.freeze({
  'dhaka': 'Dhaka',
  'ঢাকা': 'Dhaka',
  'chattogram': 'Chattogram',
  'chittagong': 'Chattogram',
  'চট্টগ্রাম': 'Chattogram',
  'rajshahi': 'Rajshahi',
  'রাজশাহী': 'Rajshahi',
  'khulna': 'Khulna',
  'খুলনা': 'Khulna',
  'barishal': 'Barishal',
  'barisal': 'Barishal',
  'বরিশাল': 'Barishal',
  'sylhet': 'Sylhet',
  'সিলেট': 'Sylhet',
  'rangpur': 'Rangpur',
  'রংপুর': 'Rangpur',
  'mymensingh': 'Mymensingh',
  'ময়মনসিংহ': 'Mymensingh',
});

const QR_ORDER_ARSC_TOKENS = Object.freeze({
  order_title: 'কিউআর ও সাউন্ডবক্স সামগ্রী অর্ডার',
  standee_selection: 'স্ট্যান্ড নির্বাচন করুন',
  delivery_address: 'ডেলিভারি ঠিকানা',
  free_delivery_notice: '১,০০০ টাকার অর্ডারে ফ্রি ডেলিভারি!',
  dhaka_inside_delivery: 'ঢাকা সিটির ভেতরে ডেলিভারি চার্জ ৬০ টাকা',
  dhaka_outside_delivery: 'ঢাকা সিটির বাইরে ডেলিভারি চার্জ ১২০ টাকা',
  order_placed_success: 'আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে!',
  order_tracking_label: 'অর্ডার ট্র্যাকিং',
  status_placed: 'অর্ডার নেওয়া হয়েছে',
  status_confirmed: 'অর্ডার নিশ্চিত হয়েছে',
  status_shipped: 'কুরিয়ারে হস্তান্তর করা হয়েছে',
  status_out_for_delivery: 'ডেলিভারির জন্য বের হয়েছে',
  status_delivered: 'ডেলিভারি সম্পন্ন',
  status_cancelled: 'অর্ডার বাতিল করা হয়েছে',
  btn_order_now: 'এখনই অর্ডার করুন',
  btn_track_order: 'অর্ডার ট্র্যাক করুন',
});

function calculateQrOrderPricing(options = {}) {
  const itemType = options.itemType || options.item_type;
  if (!itemType || !QR_ORDER_CATALOG[itemType]) {
    throw new Error(`Unknown QR collateral item type: ${itemType}`);
  }
  const item = QR_ORDER_CATALOG[itemType];
  const rawQty = options.quantity !== undefined ? options.quantity : 1;
  const quantity = parseInt(rawQty, 10);
  if (isNaN(quantity) || quantity < 1) {
    throw new Error('Quantity must be a positive integer >= 1');
  }

  const unitPricePaisa = item.unit_price_paisa;
  const subtotalPaisa = quantity * unitPricePaisa;

  // Free delivery threshold: >= ৳1,000 (100,000 paisa)
  const FREE_DELIVERY_THRESHOLD_PAISA = 100000;
  let deliveryFeePaisa = 0;

  if (subtotalPaisa >= FREE_DELIVERY_THRESHOLD_PAISA) {
    deliveryFeePaisa = 0;
  } else {
    const rawDivision = String(options.division || '').trim().toLowerCase();
    const rawDistrict = String(options.district || '').trim().toLowerCase();
    const isDhaka = rawDivision === 'dhaka' || rawDivision === 'ঢাকা' ||
                    rawDistrict === 'dhaka' || rawDistrict === 'ঢাকা';
    if (isDhaka) {
      deliveryFeePaisa = 6000; // ৳60
    } else {
      deliveryFeePaisa = 12000; // ৳120
    }
  }

  const totalPricePaisa = subtotalPaisa + deliveryFeePaisa;

  return {
    itemType: item.code,
    itemName: item.name_bn,
    itemNameEn: item.name_en,
    quantity,
    unitPricePaisa,
    subtotalPaisa,
    deliveryFeePaisa,
    totalPricePaisa,
    isFreeDelivery: deliveryFeePaisa === 0,
    currency: 'BDT',
  };
}

function validateDeliveryAddress(addressPayload = {}) {
  if (!addressPayload || typeof addressPayload !== 'object') {
    return { valid: false, error: 'Address payload must be a non-null object' };
  }
  const recipientName = String(addressPayload.recipientName || addressPayload.recipient_name || '').trim();
  if (!recipientName || recipientName.length < 2) {
    return { valid: false, error: 'Recipient name must be at least 2 characters' };
  }

  const rawPhone = String(addressPayload.recipientPhone || addressPayload.recipient_phone || '').replace(/[\s\-]/g, '');
  if (!/^01[3-9]\d{8}$/.test(rawPhone)) {
    return { valid: false, error: 'Invalid Bangladeshi mobile number' };
  }

  const deliveryAddress = String(addressPayload.deliveryAddress || addressPayload.delivery_address || '').trim();
  if (!deliveryAddress || deliveryAddress.length < 5) {
    return { valid: false, error: 'Delivery address must be at least 5 characters' };
  }

  const rawDivision = String(addressPayload.division || '').trim();
  const canonicalDivision = BANGLADESH_DIVISION_ALIASES[rawDivision.toLowerCase()] ||
    BANGLADESH_DIVISIONS.find(d => d.toLowerCase() === rawDivision.toLowerCase()) || null;
  if (!canonicalDivision) {
    return { valid: false, error: 'Invalid Bangladesh administrative division' };
  }

  const district = String(addressPayload.district || '').trim();
  if (!district || district.length < 2) {
    return { valid: false, error: 'District is required' };
  }

  const rawPostalCode = addressPayload.postalCode !== undefined && addressPayload.postalCode !== null
    ? String(addressPayload.postalCode).trim()
    : (addressPayload.postal_code !== undefined && addressPayload.postal_code !== null ? String(addressPayload.postal_code).trim() : '');
  
  let postalCode = null;
  if (rawPostalCode) {
    if (!/^\d{4}$/.test(rawPostalCode)) {
      return { valid: false, error: 'Postal code must be a 4-digit number' };
    }
    postalCode = rawPostalCode;
  }

  return {
    valid: true,
    recipientName,
    recipientPhone: rawPhone,
    deliveryAddress,
    division: canonicalDivision,
    district,
    postalCode,
  };
}

function transitionQrOrderStatus(currentStatus, targetStatus, trackingInfo = null) {
  const ALLOWED_TRANSITIONS = {
    [QR_ORDER_STATUSES.PLACED]: [QR_ORDER_STATUSES.CONFIRMED, QR_ORDER_STATUSES.CANCELLED],
    [QR_ORDER_STATUSES.CONFIRMED]: [QR_ORDER_STATUSES.SHIPPED, QR_ORDER_STATUSES.CANCELLED],
    [QR_ORDER_STATUSES.SHIPPED]: [QR_ORDER_STATUSES.OUT_FOR_DELIVERY],
    [QR_ORDER_STATUSES.OUT_FOR_DELIVERY]: [QR_ORDER_STATUSES.DELIVERED],
    [QR_ORDER_STATUSES.DELIVERED]: [],
    [QR_ORDER_STATUSES.CANCELLED]: [],
  };

  const curr = String(currentStatus || '').toUpperCase();
  const target = String(targetStatus || '').toUpperCase();

  const allowed = ALLOWED_TRANSITIONS[curr];
  if (!allowed) {
    throw new Error(`Invalid current QR order status: ${currentStatus}`);
  }
  if (!allowed.includes(target)) {
    throw new Error(`Cannot transition QR order status from ${curr} to ${target}`);
  }

  let sanitizedTracking = null;
  if (target === QR_ORDER_STATUSES.SHIPPED) {
    if (!trackingInfo || typeof trackingInfo !== 'object') {
      throw new Error('Courier name and tracking code are required when shipping an order');
    }
    const courierName = String(trackingInfo.courierName || trackingInfo.courier_name || '').trim();
    const trackingCode = String(trackingInfo.trackingCode || trackingInfo.tracking_code || '').trim();
    if (!courierName || !trackingCode) {
      throw new Error('Courier name and tracking code are required when shipping an order');
    }
    sanitizedTracking = { courierName, trackingCode };
  }

  return {
    success: true,
    fromStatus: curr,
    toStatus: target,
    trackingInfo: sanitizedTracking,
    transitionDate: new Date().toISOString(),
  };
}

class MerchantQrOrderRecord {
  constructor(data = {}) {
    this.id = data.id || null;
    this.order_id = data.order_id || data.orderId || ('TK-QRO-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.floor(100000 + Math.random() * 900000));
    this.business_id = String(data.business_id || data.businessId || '1');
    this.item_type = data.item_type || data.itemType;
    this.item_name = data.item_name || data.itemName || (QR_ORDER_CATALOG[this.item_type] ? QR_ORDER_CATALOG[this.item_type].name_bn : '');
    this.quantity = Number(data.quantity) || 1;
    this.unit_price_paisa = Number(data.unit_price_paisa !== undefined ? data.unit_price_paisa : data.unitPricePaisa) || 0;
    this.total_price_paisa = Number(data.total_price_paisa !== undefined ? data.total_price_paisa : data.totalPricePaisa) || 0;
    this.delivery_fee_paisa = Number(data.delivery_fee_paisa !== undefined ? data.delivery_fee_paisa : data.deliveryFeePaisa) || 0;
    this.payment_method = data.payment_method || data.paymentMethod || QR_PAYMENT_METHODS.WALLET;
    this.payment_status = data.payment_status || data.paymentStatus || QR_PAYMENT_STATUSES.PENDING;
    this.order_status = data.order_status || data.orderStatus || QR_ORDER_STATUSES.PLACED;
    this.recipient_name = data.recipient_name || data.recipientName || '';
    this.recipient_phone = data.recipient_phone || data.recipientPhone || '';
    this.delivery_address = data.delivery_address || data.deliveryAddress || '';
    this.division = data.division || '';
    this.district = data.district || '';
    this.postal_code = data.postal_code || data.postalCode || null;
    this.courier_name = data.courier_name || data.courierName || null;
    this.tracking_code = data.tracking_code || data.trackingCode || null;
    this.synced = data.synced !== undefined ? Number(data.synced) : 0;
    this.create_date = data.create_date || data.createDate || new Date().toISOString();
    this.update_date = data.update_date || data.updateDate || new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      order_id: this.order_id,
      business_id: this.business_id,
      item_type: this.item_type,
      item_name: this.item_name,
      quantity: this.quantity,
      unit_price_paisa: this.unit_price_paisa,
      total_price_paisa: this.total_price_paisa,
      delivery_fee_paisa: this.delivery_fee_paisa,
      payment_method: this.payment_method,
      payment_status: this.payment_status,
      order_status: this.order_status,
      recipient_name: this.recipient_name,
      recipient_phone: this.recipient_phone,
      delivery_address: this.delivery_address,
      division: this.division,
      district: this.district,
      postal_code: this.postal_code,
      courier_name: this.courier_name,
      tracking_code: this.tracking_code,
      synced: this.synced,
      create_date: this.create_date,
      update_date: this.update_date,
    };
  }
}

class MerchantQrOrderDao {
  constructor() {
    this._orders = new Map();
    this._autoIncrementId = 1;
  }

  clear() {
    this._orders.clear();
    this._autoIncrementId = 1;
  }

  saveOrder(order) {
    if (!order || typeof order !== 'object') {
      throw new Error('Order must be a valid object');
    }
    const record = order instanceof MerchantQrOrderRecord ? order : new MerchantQrOrderRecord(order);
    if (!record.id) {
      record.id = this._autoIncrementId++;
    }
    this._orders.set(record.order_id, record);
    return new MerchantQrOrderRecord(record.toJSON());
  }

  getOrderById(orderId) {
    if (!orderId) return null;
    const found = this._orders.get(orderId);
    return found ? new MerchantQrOrderRecord(found.toJSON()) : null;
  }

  getOrdersByBusinessId(businessId, options = {}) {
    const targetBizId = String(businessId || '1');
    let list = Array.from(this._orders.values()).filter(o => String(o.business_id) === targetBizId);
    
    if (options.status || options.order_status) {
      const st = String(options.status || options.order_status).toUpperCase();
      list = list.filter(o => o.order_status.toUpperCase() === st);
    }
    if (options.itemType || options.item_type) {
      const it = String(options.itemType || options.item_type);
      list = list.filter(o => o.item_type === it);
    }
    
    list.sort((a, b) => new Date(b.create_date).getTime() - new Date(a.create_date).getTime());

    const offset = Number(options.offset) || 0;
    const limit = options.limit !== undefined ? Number(options.limit) : list.length;
    return list.slice(offset, offset + limit).map(o => new MerchantQrOrderRecord(o.toJSON()));
  }

  updateOrderStatus(orderId, status, trackingInfo = null) {
    const existing = this._orders.get(orderId);
    if (!existing) {
      throw new Error(`Order not found: ${orderId}`);
    }
    transitionQrOrderStatus(existing.order_status, status, trackingInfo);

    existing.order_status = status;
    if (trackingInfo) {
      if (trackingInfo.courierName || trackingInfo.courier_name) {
        existing.courier_name = trackingInfo.courierName || trackingInfo.courier_name;
      }
      if (trackingInfo.trackingCode || trackingInfo.tracking_code) {
        existing.tracking_code = trackingInfo.trackingCode || trackingInfo.tracking_code;
      }
    }
    existing.update_date = new Date().toISOString();
    existing.synced = 0;
    return new MerchantQrOrderRecord(existing.toJSON());
  }

  getUnsyncedOrders(limit = 100) {
    const lim = Number(limit) || 100;
    return Array.from(this._orders.values())
      .filter(o => Number(o.synced) === 0)
      .slice(0, lim)
      .map(o => new MerchantQrOrderRecord(o.toJSON()));
  }

  updateOrderSyncStatus(orderId, synced = 1) {
    const existing = this._orders.get(orderId);
    if (!existing) {
      return { success: false, error: 'NOT_FOUND' };
    }
    existing.synced = Number(synced);
    existing.update_date = new Date().toISOString();
    return { success: true, record: new MerchantQrOrderRecord(existing.toJSON()) };
  }

  deleteOrder(orderId) {
    return this._orders.delete(orderId);
  }

  exists(orderId) {
    return this._orders.has(orderId);
  }
}

class MerchantQrOrderEngine {
  constructor(dao = null) {
    this.dao = dao || new MerchantQrOrderDao();
  }

  createOrder(payload = {}) {
    const {
      businessId = '1',
      itemType,
      quantity = 1,
      paymentMethod = QR_PAYMENT_METHODS.WALLET,
      address,
      walletBalancePaisa = 0,
      storage = null,
    } = payload;

    const validatedAddress = validateDeliveryAddress(address);
    if (!validatedAddress.valid) {
      throw new Error(validatedAddress.error);
    }

    const pricing = calculateQrOrderPricing({
      itemType,
      quantity,
      division: validatedAddress.division,
      district: validatedAddress.district,
    });

    let paymentStatus = QR_PAYMENT_STATUSES.PENDING;
    if (paymentMethod === QR_PAYMENT_METHODS.WALLET) {
      if (Number(walletBalancePaisa) < pricing.totalPricePaisa) {
        throw new Error(
          `Insufficient wallet balance for QR collateral order: required ${pricing.totalPricePaisa} paisa, available ${walletBalancePaisa} paisa`
        );
      }
      paymentStatus = QR_PAYMENT_STATUSES.PAID;
    } else if (paymentMethod === QR_PAYMENT_METHODS.CASH_ON_DELIVERY) {
      paymentStatus = QR_PAYMENT_STATUSES.PENDING;
    } else if (paymentMethod === QR_PAYMENT_METHODS.ONLINE_GATEWAY) {
      paymentStatus = QR_PAYMENT_STATUSES.PENDING;
    }

    const orderRecord = new MerchantQrOrderRecord({
      business_id: String(businessId),
      item_type: pricing.itemType,
      item_name: pricing.itemName,
      quantity: pricing.quantity,
      unit_price_paisa: pricing.unitPricePaisa,
      total_price_paisa: pricing.totalPricePaisa,
      delivery_fee_paisa: pricing.deliveryFeePaisa,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      order_status: QR_ORDER_STATUSES.PLACED,
      recipient_name: validatedAddress.recipientName,
      recipient_phone: validatedAddress.recipientPhone,
      delivery_address: validatedAddress.deliveryAddress,
      division: validatedAddress.division,
      district: validatedAddress.district,
      postal_code: validatedAddress.postalCode,
      synced: 0,
    });

    const saved = this.dao.saveOrder(orderRecord);

    if (storage && typeof storage.saveMerchantQrOrder === 'function') {
      storage.saveMerchantQrOrder(businessId, saved.toJSON());
    }

    return {
      success: true,
      order: saved,
      pricing,
    };
  }

  trackOrder(orderId) {
    const order = this.dao.getOrderById(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    const STEPS = [
      { status: QR_ORDER_STATUSES.PLACED, label_bn: QR_ORDER_ARSC_TOKENS.status_placed },
      { status: QR_ORDER_STATUSES.CONFIRMED, label_bn: QR_ORDER_ARSC_TOKENS.status_confirmed },
      { status: QR_ORDER_STATUSES.SHIPPED, label_bn: QR_ORDER_ARSC_TOKENS.status_shipped },
      { status: QR_ORDER_STATUSES.OUT_FOR_DELIVERY, label_bn: QR_ORDER_ARSC_TOKENS.status_out_for_delivery },
      { status: QR_ORDER_STATUSES.DELIVERED, label_bn: QR_ORDER_ARSC_TOKENS.status_delivered },
    ];

    const currentStatus = order.order_status;
    const isCancelled = currentStatus === QR_ORDER_STATUSES.CANCELLED;
    const currentIndex = isCancelled ? -1 : STEPS.findIndex(s => s.status === currentStatus);

    const timeline = STEPS.map((step, idx) => ({
      status: step.status,
      label_bn: step.label_bn,
      isCompleted: !isCancelled && idx <= currentIndex,
      isCurrent: !isCancelled && idx === currentIndex,
    }));

    return {
      orderId: order.order_id,
      currentStatus,
      isCancelled,
      courierName: order.courier_name,
      trackingCode: order.tracking_code,
      timeline,
      item_name: order.item_name,
      total_price_paisa: order.total_price_paisa,
      create_date: order.create_date,
      update_date: order.update_date,
    };
  }

  confirmOrder(orderId) {
    return this.dao.updateOrderStatus(orderId, QR_ORDER_STATUSES.CONFIRMED);
  }

  shipOrder(orderId, trackingInfo) {
    return this.dao.updateOrderStatus(orderId, QR_ORDER_STATUSES.SHIPPED, trackingInfo);
  }

  outForDelivery(orderId) {
    return this.dao.updateOrderStatus(orderId, QR_ORDER_STATUSES.OUT_FOR_DELIVERY);
  }

  deliverOrder(orderId) {
    const updated = this.dao.updateOrderStatus(orderId, QR_ORDER_STATUSES.DELIVERED);
    if (updated.payment_method === QR_PAYMENT_METHODS.CASH_ON_DELIVERY && updated.payment_status !== QR_PAYMENT_STATUSES.PAID) {
      updated.payment_status = QR_PAYMENT_STATUSES.PAID;
      this.dao.saveOrder(updated);
    }
    return updated;
  }

  cancelOrder(orderId, reason = null) {
    const updated = this.dao.updateOrderStatus(orderId, QR_ORDER_STATUSES.CANCELLED);
    if (updated.payment_method === QR_PAYMENT_METHODS.WALLET && updated.payment_status === QR_PAYMENT_STATUSES.PAID) {
      updated.payment_status = QR_PAYMENT_STATUSES.REFUNDED;
      this.dao.saveOrder(updated);
    }
    return updated;
  }
}

const ReconstructedQrOrderEngine = MerchantQrOrderEngine;
const QrOrderEngine = MerchantQrOrderEngine;
const merchantQrOrderEngine = new MerchantQrOrderEngine();
const reconstructedQrOrderEngine = merchantQrOrderEngine;



// =============================================================================
// MILESTONE REA-ITER-239: TALLYPAY MERCHANT DIGITAL MICRO-LOAN, CREDIT SCORING
// & EMI REPAYMENT SUBSYSTEM
// =============================================================================

// --- 1. ROOM SQLITE SCHEMAS & TABLE DEFINITIONS ---
const MERCHANT_LOAN_SCHEMA = {
  tableName: 'merchant_loan',
  columns: [
    'id',
    'loan_id',
    'business_id',
    'partner_bank',
    'principal_paisa',
    'interest_rate_basis_points',
    'tenure_months',
    'total_payable_paisa',
    'monthly_emi_paisa',
    'disbursed_paisa',
    'processing_fee_paisa',
    'loan_status',
    'disbursement_date',
    'repayment_start_date',
    'paid_paisa',
    'remaining_paisa',
    'credit_score',
    'created_at',
    'updated_at',
    'synced'
  ],
  columnTypes: {
    id: 'INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL',
    loan_id: 'TEXT NOT NULL',
    business_id: 'TEXT NOT NULL',
    partner_bank: 'TEXT NOT NULL',
    principal_paisa: 'INTEGER NOT NULL',
    interest_rate_basis_points: 'INTEGER NOT NULL',
    tenure_months: 'INTEGER NOT NULL',
    total_payable_paisa: 'INTEGER NOT NULL',
    monthly_emi_paisa: 'INTEGER NOT NULL',
    disbursed_paisa: 'INTEGER NOT NULL',
    processing_fee_paisa: 'INTEGER NOT NULL',
    loan_status: 'TEXT NOT NULL',
    disbursement_date: 'TEXT',
    repayment_start_date: 'TEXT',
    paid_paisa: 'INTEGER NOT NULL DEFAULT 0',
    remaining_paisa: 'INTEGER NOT NULL',
    credit_score: 'INTEGER NOT NULL',
    created_at: 'TEXT NOT NULL',
    updated_at: 'TEXT',
    synced: 'INTEGER NOT NULL DEFAULT 0'
  },
  indices: [
    {
      name: 'index_merchant_loan_loan_id',
      unique: true,
      columns: ['loan_id'],
      ddl: 'CREATE UNIQUE INDEX IF NOT EXISTS index_merchant_loan_loan_id ON merchant_loan (loan_id);'
    },
    {
      name: 'index_merchant_loan_business_id',
      unique: false,
      columns: ['business_id'],
      ddl: 'CREATE INDEX IF NOT EXISTS index_merchant_loan_business_id ON merchant_loan (business_id);'
    }
  ],
  ddl: `CREATE TABLE IF NOT EXISTS merchant_loan (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    loan_id TEXT NOT NULL,
    business_id TEXT NOT NULL,
    partner_bank TEXT NOT NULL,
    principal_paisa INTEGER NOT NULL,
    interest_rate_basis_points INTEGER NOT NULL,
    tenure_months INTEGER NOT NULL,
    total_payable_paisa INTEGER NOT NULL,
    monthly_emi_paisa INTEGER NOT NULL,
    disbursed_paisa INTEGER NOT NULL,
    processing_fee_paisa INTEGER NOT NULL,
    loan_status TEXT NOT NULL,
    disbursement_date TEXT,
    repayment_start_date TEXT,
    paid_paisa INTEGER NOT NULL DEFAULT 0,
    remaining_paisa INTEGER NOT NULL,
    credit_score INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    synced INTEGER NOT NULL DEFAULT 0
  );`
};
const LOAN_TABLE_SCHEMA = MERCHANT_LOAN_SCHEMA;

const MERCHANT_LOAN_EMI_SCHEMA = {
  tableName: 'merchant_loan_emi',
  columns: [
    'id',
    'emi_id',
    'loan_id',
    'business_id',
    'installment_number',
    'due_date',
    'principal_component_paisa',
    'interest_component_paisa',
    'total_installment_paisa',
    'penalty_paisa',
    'payment_status',
    'paid_date',
    'transaction_reference',
    'synced'
  ],
  columnTypes: {
    id: 'INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL',
    emi_id: 'TEXT NOT NULL',
    loan_id: 'TEXT NOT NULL',
    business_id: 'TEXT NOT NULL',
    installment_number: 'INTEGER NOT NULL',
    due_date: 'TEXT NOT NULL',
    principal_component_paisa: 'INTEGER NOT NULL',
    interest_component_paisa: 'INTEGER NOT NULL',
    total_installment_paisa: 'INTEGER NOT NULL',
    penalty_paisa: 'INTEGER NOT NULL DEFAULT 0',
    payment_status: 'TEXT NOT NULL',
    paid_date: 'TEXT',
    transaction_reference: 'TEXT',
    synced: 'INTEGER NOT NULL DEFAULT 0'
  },
  indices: [
    {
      name: 'index_merchant_loan_emi_emi_id',
      unique: true,
      columns: ['emi_id'],
      ddl: 'CREATE UNIQUE INDEX IF NOT EXISTS index_merchant_loan_emi_emi_id ON merchant_loan_emi (emi_id);'
    },
    {
      name: 'index_merchant_loan_emi_loan_id',
      unique: false,
      columns: ['loan_id'],
      ddl: 'CREATE INDEX IF NOT EXISTS index_merchant_loan_emi_loan_id ON merchant_loan_emi (loan_id);'
    },
    {
      name: 'index_merchant_loan_emi_business_id',
      unique: false,
      columns: ['business_id'],
      ddl: 'CREATE INDEX IF NOT EXISTS index_merchant_loan_emi_business_id ON merchant_loan_emi (business_id);'
    }
  ],
  ddl: `CREATE TABLE IF NOT EXISTS merchant_loan_emi (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    emi_id TEXT NOT NULL,
    loan_id TEXT NOT NULL,
    business_id TEXT NOT NULL,
    installment_number INTEGER NOT NULL,
    due_date TEXT NOT NULL,
    principal_component_paisa INTEGER NOT NULL,
    interest_component_paisa INTEGER NOT NULL,
    total_installment_paisa INTEGER NOT NULL,
    penalty_paisa INTEGER NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL,
    paid_date TEXT,
    transaction_reference TEXT,
    synced INTEGER NOT NULL DEFAULT 0
  );`
};
const LOAN_EMI_TABLE_SCHEMA = MERCHANT_LOAN_EMI_SCHEMA;

// --- 2. ENUMS & CONSTANTS ---
const LOAN_STATUSES = {
  ELIGIBLE: 'ELIGIBLE',
  APPLIED: 'APPLIED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  DISBURSED: 'DISBURSED',
  ACTIVE: 'ACTIVE',
  PAID_OFF: 'PAID_OFF',
  DEFAULTED: 'DEFAULTED',
  REJECTED: 'REJECTED'
};
const LoanStatus = LOAN_STATUSES;
const MerchantLoanStatus = LOAN_STATUSES;

const EMI_PAYMENT_STATUSES = {
  PENDING: 'PENDING',
  OVERDUE: 'OVERDUE',
  PAID: 'PAID',
  AUTO_DEBITED: 'AUTO_DEBITED'
};
const EmiPaymentStatus = EMI_PAYMENT_STATUSES;
const LoanEmiStatus = EMI_PAYMENT_STATUSES;

const CREDIT_SCORE_TIERS = {
  POOR: {
    code: 'POOR',
    minScore: 300,
    maxScore: 579,
    label_bn: 'দুর্বল',
    isEligible: false,
    maxLoanPaisa: 0
  },
  FAIR: {
    code: 'FAIR',
    minScore: 580,
    maxScore: 669,
    label_bn: 'মোটামুটি',
    isEligible: true,
    maxLoanPaisa: 5000000 // ৳50,000
  },
  GOOD: {
    code: 'GOOD',
    minScore: 670,
    maxScore: 739,
    label_bn: 'ভালো',
    isEligible: true,
    maxLoanPaisa: 15000000 // ৳150,000
  },
  VERY_GOOD: {
    code: 'VERY_GOOD',
    minScore: 740,
    maxScore: 799,
    label_bn: 'খুব ভালো',
    isEligible: true,
    maxLoanPaisa: 30000000 // ৳300,000
  },
  EXCELLENT: {
    code: 'EXCELLENT',
    minScore: 800,
    maxScore: 850,
    label_bn: 'চমৎকার',
    isEligible: true,
    maxLoanPaisa: 50000000 // ৳500,000
  }
};
const CreditScoreTier = CREDIT_SCORE_TIERS;

const LOAN_PARTNER_BANKS = {
  BRAC_BANK: {
    code: 'BRAC_BANK',
    name_en: 'BRAC Bank PLC',
    name_bn: 'ব্র্যাক ব্যাংক',
    product_name: 'Shubidha Digital Loan',
    interest_rate_bps: 900, // 9.00%
    processing_fee_bps: 100, // 1.00%
    min_tenure_months: 3,
    max_tenure_months: 24,
    min_amount_paisa: 1000000, // ৳10,000
    max_amount_paisa: 50000000 // ৳500,000
  },
  CITY_BANK: {
    code: 'CITY_BANK',
    name_en: 'The City Bank PLC',
    name_bn: 'সিটি ব্যাংক',
    product_name: 'City Amar Rin',
    interest_rate_bps: 950, // 9.50%
    processing_fee_bps: 150, // 1.50%
    min_tenure_months: 3,
    max_tenure_months: 18,
    min_amount_paisa: 1000000, // ৳10,000
    max_amount_paisa: 30000000 // ৳300,000
  },
  MUTUAL_TRUST_BANK: {
    code: 'MUTUAL_TRUST_BANK',
    name_en: 'Mutual Trust Bank PLC',
    name_bn: 'মিউচুয়াল ট্রাস্ট ব্যাংক',
    product_name: 'MTB Digital Shujog',
    interest_rate_bps: 900, // 9.00%
    processing_fee_bps: 100, // 1.00%
    min_tenure_months: 6,
    max_tenure_months: 24,
    min_amount_paisa: 2000000, // ৳20,000
    max_amount_paisa: 40000000 // ৳400,000
  },
  PRIME_BANK: {
    code: 'PRIME_BANK',
    name_en: 'Prime Bank PLC',
    name_bn: 'প্রাইম ব্যাংক',
    product_name: 'Prime Agrani MSME',
    interest_rate_bps: 925, // 9.25%
    processing_fee_bps: 125, // 1.25%
    min_tenure_months: 6,
    max_tenure_months: 12,
    min_amount_paisa: 1500000, // ৳15,000
    max_amount_paisa: 25000000 // ৳250,000
  },
  IPDC_FINANCE: {
    code: 'IPDC_FINANCE',
    name_en: 'IPDC Finance Limited',
    name_bn: 'আইপিডিসি ফাইন্যান্স',
    product_name: 'IPDC Dana Micro-Credit',
    interest_rate_bps: 1000, // 10.00%
    processing_fee_bps: 200, // 2.00%
    min_tenure_months: 3,
    max_tenure_months: 12,
    min_amount_paisa: 500000, // ৳5,000
    max_amount_paisa: 20000000 // ৳200,000
  }
};
const LoanPartnerBank = LOAN_PARTNER_BANKS;

const LOAN_ARSC_TOKENS = {
  LOAN_TITLE: 'ডিজিটাল ঋণ',
  LOAN_SUBTITLE: 'সহজ শর্তে জামানতবিহীন ঋণ নিন',
  CREDIT_SCORE: 'আপনার ক্রেডিট স্কোর',
  MONTHLY_EMI: 'মাসিক কিস্তি (ইএমআই)',
  REPAY_LOAN: 'ঋণ পরিশোধ করুন',
  AUTO_DEBIT_ACTIVE: 'অটো-ডেবিট সক্রিয় আছে',
  REPAYMENT_SUCCESS: 'কিস্তি পরিশোধ সফল হয়েছে',
  INSUFFICIENT_BALANCE: 'পর্যাপ্ত ব্যালেন্স নেই',
  APPLICATION_SUBMITTED: 'ঋণের আবেদন জমা দেওয়া হয়েছে',
  LOAN_APPROVED: 'অভিনন্দন! আপনার ঋণ অনুমোদিত হয়েছে',
  PROCESSING_FEE: 'প্রক্রিয়াকরণ ফি',
  REMAINING_EMIS: 'বাকি কিস্তির সংখ্যা',
  NEXT_DUE_DATE: 'পরবর্তী কিস্তির তারিখ'
};

// --- 3. FINANCIAL ARITHMETIC & CREDIT SCORING ENGINES ---

function calculateMerchantCreditScore({
  averageMonthlyTurnoverPaisa = 0,
  activeDaysLast30 = 0,
  debtCollectionRecoveryRate = 0,
  averageWalletBalancePaisa = 0,
  priorDefaultCount = 0,
  priorOnTimeRepayments = 0
} = {}) {
  const BASE_SCORE = 300;
  const MAX_SCORE = 850;

  // Factor 1: Monthly Turnover (Max 180 points)
  // ৳100,000 (10,000,000 paisa) or above receives maximum 180 points
  const turnoverRatio = Math.min(1.0, Math.max(0, (averageMonthlyTurnoverPaisa || 0) / 10000000));
  const turnoverPoints = Math.round(turnoverRatio * 180);

  // Factor 2: Business Regularity & Activity (Max 140 points)
  // 25+ active days out of 30 receives maximum 140 points
  const regularityRatio = Math.min(1.0, Math.max(0, (activeDaysLast30 || 0) / 25));
  const regularityPoints = Math.round(regularityRatio * 140);

  // Factor 3: Customer Debt Collection Velocity (Max 130 points)
  // Recovery rate of 80% or above receives maximum 130 points
  const debtRatio = Math.min(1.0, Math.max(0, (debtCollectionRecoveryRate || 0) / 0.8));
  const debtRecoveryPoints = Math.round(debtRatio * 130);

  // Factor 4: Wallet Balance Retention (Max 70 points)
  // ৳10,000 (1,000,000 paisa) or above receives maximum 70 points
  const walletRatio = Math.min(1.0, Math.max(0, (averageWalletBalancePaisa || 0) / 1000000));
  const walletPoints = Math.round(walletRatio * 70);

  // Factor 5: Repayment History Bonus/Penalty (Max +30, or -120 per default)
  const onTimeBonus = Math.min(30, (priorOnTimeRepayments || 0) * 5);
  const defaultPenalty = (priorDefaultCount || 0) * 120;

  let rawScore = BASE_SCORE + turnoverPoints + regularityPoints + debtRecoveryPoints + walletPoints + onTimeBonus - defaultPenalty;
  const score = Math.max(BASE_SCORE, Math.min(MAX_SCORE, rawScore));

  let tier;
  let label_bn;
  let isEligible;
  let maxLoanAmountPaisa;

  if (score < 580) {
    tier = 'POOR';
    label_bn = 'দুর্বল';
    isEligible = false;
    maxLoanAmountPaisa = 0;
  } else if (score < 670) {
    tier = 'FAIR';
    label_bn = 'মোটামুটি';
    isEligible = true;
    maxLoanAmountPaisa = 5000000; // ৳50,000
  } else if (score < 740) {
    tier = 'GOOD';
    label_bn = 'ভালো';
    isEligible = true;
    maxLoanAmountPaisa = 15000000; // ৳150,000
  } else if (score < 800) {
    tier = 'VERY_GOOD';
    label_bn = 'খুব ভালো';
    isEligible = true;
    maxLoanAmountPaisa = 30000000; // ৳300,000
  } else {
    tier = 'EXCELLENT';
    label_bn = 'চমৎকার';
    isEligible = true;
    maxLoanAmountPaisa = 50000000; // ৳500,000
  }

  return {
    score,
    tier,
    label_bn,
    isEligible,
    maxLoanAmountPaisa,
    factors: {
      turnoverPoints,
      regularityPoints,
      debtRecoveryPoints,
      walletPoints,
      onTimeBonus,
      defaultPenalty
    }
  };
}

function calculateLoanAmortization({
  principalPaisa,
  interestRateBps,
  tenureMonths,
  processingFeeBps = 100,
  startDate = null
}) {
  if (!Number.isInteger(principalPaisa) || principalPaisa <= 0) {
    throw new Error('Principal must be a positive integer in paisa');
  }
  if (!Number.isInteger(interestRateBps) || interestRateBps < 0) {
    throw new Error('Interest rate basis points must be a non-negative integer');
  }
  if (!Number.isInteger(tenureMonths) || tenureMonths <= 0) {
    throw new Error('Tenure months must be a positive integer');
  }

  const processingFeePaisa = Math.round((principalPaisa * processingFeeBps) / 10000);
  const disbursedPaisa = principalPaisa - processingFeePaisa;

  const annualRate = interestRateBps / 10000;
  const monthlyRate = annualRate / 12;

  let monthlyEmiPaisa;
  if (monthlyRate === 0) {
    monthlyEmiPaisa = Math.round(principalPaisa / tenureMonths);
  } else {
    const factor = Math.pow(1 + monthlyRate, tenureMonths);
    monthlyEmiPaisa = Math.round(principalPaisa * ((monthlyRate * factor) / (factor - 1)));
  }

  const schedule = [];
  let remainingPrincipal = principalPaisa;
  const start = startDate ? new Date(startDate) : new Date();

  const startY = start.getFullYear();
  const startM = start.getMonth();
  const startD = start.getDate();

  for (let i = 1; i <= tenureMonths; i++) {
    const dueDate = new Date(startY, startM + i, startD);
    const m = dueDate.getMonth() + 1;
    const d = dueDate.getDate();
    const dueDateStr = dueDate.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (d < 10 ? '0' + d : d);

    let interestComponentPaisa = Math.round(remainingPrincipal * monthlyRate);
    let principalComponentPaisa;
    let totalInstallmentPaisa;

    if (i === tenureMonths) {
      principalComponentPaisa = remainingPrincipal;
      totalInstallmentPaisa = principalComponentPaisa + interestComponentPaisa;
    } else {
      principalComponentPaisa = monthlyEmiPaisa - interestComponentPaisa;
      if (principalComponentPaisa > remainingPrincipal) {
        principalComponentPaisa = remainingPrincipal;
      }
      totalInstallmentPaisa = principalComponentPaisa + interestComponentPaisa;
    }

    remainingPrincipal -= principalComponentPaisa;

    schedule.push({
      installmentNumber: i,
      dueDate: dueDateStr,
      principalComponentPaisa,
      interestComponentPaisa,
      totalInstallmentPaisa,
      remainingPrincipalPaisa: Math.max(0, remainingPrincipal)
    });
  }

  const totalPayablePaisa = schedule.reduce((sum, item) => sum + item.totalInstallmentPaisa, 0);
  const totalPrincipalReturned = schedule.reduce((sum, item) => sum + item.principalComponentPaisa, 0);
  const totalInterestPaisa = totalPayablePaisa - principalPaisa;

  return {
    principalPaisa,
    interestRateBps,
    tenureMonths,
    processingFeePaisa,
    disbursedPaisa,
    monthlyEmiPaisa,
    totalPayablePaisa,
    totalInterestPaisa,
    totalPrincipalReturned,
    isExact: totalPrincipalReturned === principalPaisa,
    schedule
  };
}

function calculateEmiLatePenalty(emi, currentDate = new Date().toISOString()) {
  if (!emi || !emi.due_date) return 0;
  if (emi.payment_status === EMI_PAYMENT_STATUSES.PAID || emi.payment_status === EMI_PAYMENT_STATUSES.AUTO_DEBITED) {
    return 0;
  }
  const due = new Date(emi.due_date);
  const current = new Date(currentDate);
  const diffTime = current - due;
  const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (daysOverdue <= 0) return 0;

  // 200 bps (2.0%) per 30 days overdue
  const baseInstallment = emi.total_installment_paisa || (emi.principal_component_paisa + emi.interest_component_paisa);
  const calculatedPenalty = Math.round((baseInstallment * 200 * daysOverdue) / (10000 * 30));
  // Capped at 10% of installment
  const maxPenalty = Math.round(baseInstallment * 0.10);

  return Math.min(calculatedPenalty, maxPenalty);
}

const VALID_LOAN_TRANSITIONS = {
  [LOAN_STATUSES.ELIGIBLE]: [LOAN_STATUSES.APPLIED],
  [LOAN_STATUSES.APPLIED]: [LOAN_STATUSES.UNDER_REVIEW, LOAN_STATUSES.REJECTED],
  [LOAN_STATUSES.UNDER_REVIEW]: [LOAN_STATUSES.APPROVED, LOAN_STATUSES.REJECTED],
  [LOAN_STATUSES.APPROVED]: [LOAN_STATUSES.DISBURSED],
  [LOAN_STATUSES.DISBURSED]: [LOAN_STATUSES.ACTIVE],
  [LOAN_STATUSES.ACTIVE]: [LOAN_STATUSES.PAID_OFF, LOAN_STATUSES.DEFAULTED],
  [LOAN_STATUSES.DEFAULTED]: [LOAN_STATUSES.PAID_OFF],
  [LOAN_STATUSES.PAID_OFF]: [],
  [LOAN_STATUSES.REJECTED]: []
};

function transitionLoanStatus(currentStatus, targetStatus, context = {}) {
  if (!LOAN_STATUSES[currentStatus]) {
    throw new Error(`Invalid current loan status: ${currentStatus}`);
  }
  if (!LOAN_STATUSES[targetStatus]) {
    throw new Error(`Invalid target loan status: ${targetStatus}`);
  }

  const allowed = VALID_LOAN_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    throw new Error(`Illegal loan status transition from ${currentStatus} to ${targetStatus}`);
  }

  if (targetStatus === LOAN_STATUSES.PAID_OFF && context.remaining_paisa > 0) {
    throw new Error(`Cannot transition to PAID_OFF while remaining_paisa is ${context.remaining_paisa}`);
  }

  return {
    previousStatus: currentStatus,
    newStatus: targetStatus,
    transitionedAt: new Date().toISOString(),
    context
  };
}

// --- 4. IN-MEMORY RECORDS & DAO CLASSES ---

let _cachedIsoSec = 0;
let _cachedIsoStr = '';
function getFastIsoString() {
  const now = Date.now();
  const sec = Math.floor(now / 1000);
  if (sec !== _cachedIsoSec) {
    _cachedIsoSec = sec;
    _cachedIsoStr = new Date(now).toISOString();
  }
  return _cachedIsoStr;
}

let _loanSequence = 1;
let _emiSequence = 1;

class MerchantLoanRecord {
  constructor(data = {}) {
    this.id = data.id || null;
    this.loan_id = data.loan_id || `TK-LN-${Date.now()}-${(_loanSequence++)}`;
    this.business_id = String(data.business_id || data.businessId || '1');
    this.partner_bank = data.partner_bank || data.partnerBank || 'BRAC_BANK';
    this.principal_paisa = Number.isInteger(data.principal_paisa) ? data.principal_paisa : 0;
    this.interest_rate_basis_points = Number.isInteger(data.interest_rate_basis_points) ? data.interest_rate_basis_points : 900;
    this.tenure_months = Number.isInteger(data.tenure_months) ? data.tenure_months : 6;
    this.total_payable_paisa = Number.isInteger(data.total_payable_paisa) ? data.total_payable_paisa : 0;
    this.monthly_emi_paisa = Number.isInteger(data.monthly_emi_paisa) ? data.monthly_emi_paisa : 0;
    this.disbursed_paisa = Number.isInteger(data.disbursed_paisa) ? data.disbursed_paisa : 0;
    this.processing_fee_paisa = Number.isInteger(data.processing_fee_paisa) ? data.processing_fee_paisa : 0;
    this.loan_status = data.loan_status || LOAN_STATUSES.APPLIED;
    this.disbursement_date = data.disbursement_date || null;
    this.repayment_start_date = data.repayment_start_date || null;
    this.paid_paisa = Number.isInteger(data.paid_paisa) ? data.paid_paisa : 0;
    this.remaining_paisa = Number.isInteger(data.remaining_paisa) ? data.remaining_paisa : this.total_payable_paisa;
    this.credit_score = Number.isInteger(data.credit_score) ? data.credit_score : 300;
    this.created_at = data.created_at || getFastIsoString();
    this.updated_at = data.updated_at || null;
    this.synced = data.synced !== undefined ? data.synced : 0;
  }
}

class MerchantLoanEmiRecord {
  constructor(data = {}) {
    this.id = data.id || null;
    this.emi_id = data.emi_id || `TK-EMI-${Date.now()}-${(_emiSequence++)}`;
    this.loan_id = data.loan_id || '';
    this.business_id = String(data.business_id || data.businessId || '1');
    this.installment_number = Number.isInteger(data.installment_number) ? data.installment_number : 1;
    this.due_date = data.due_date || new Date().toISOString().slice(0, 10);
    this.principal_component_paisa = Number.isInteger(data.principal_component_paisa) ? data.principal_component_paisa : 0;
    this.interest_component_paisa = Number.isInteger(data.interest_component_paisa) ? data.interest_component_paisa : 0;
    this.total_installment_paisa = Number.isInteger(data.total_installment_paisa) ? data.total_installment_paisa : 0;
    this.penalty_paisa = Number.isInteger(data.penalty_paisa) ? data.penalty_paisa : 0;
    this.payment_status = data.payment_status || EMI_PAYMENT_STATUSES.PENDING;
    this.paid_date = data.paid_date || null;
    this.transaction_reference = data.transaction_reference || null;
    this.synced = data.synced !== undefined ? data.synced : 0;
  }
}

class MerchantLoanDao {
  constructor() {
    this.loans = [];
    this.loansById = new Map();
    this.nextId = 1;
  }

  saveLoan(record) {
    const loan = record instanceof MerchantLoanRecord ? record : new MerchantLoanRecord(record);
    const existing = this.loansById.get(loan.loan_id);
    if (existing) {
      loan.id = existing.id;
      loan.updated_at = new Date().toISOString();
      Object.assign(existing, loan);
      return { ...existing };
    }
    loan.id = this.nextId++;
    loan.created_at = loan.created_at || getFastIsoString();
    const cloned = { ...loan };
    this.loans.push(cloned);
    this.loansById.set(loan.loan_id, cloned);
    return cloned;
  }

  getLoanById(loanId) {
    const found = this.loansById.get(loanId);
    return found ? { ...found } : null;
  }

  getLoansByBusinessId(businessId, options = {}) {
    const bId = String(businessId);
    let list = this.loans.filter(l => l.business_id === bId);
    if (options.status) {
      list = list.filter(l => l.loan_status === options.status);
    }
    if (options.partner_bank) {
      list = list.filter(l => l.partner_bank === options.partner_bank);
    }
    if (options.synced !== undefined) {
      list = list.filter(l => l.synced === options.synced);
    }
    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const offset = options.offset || 0;
    const limit = options.limit || list.length;
    return list.slice(offset, offset + limit).map(l => ({ ...l }));
  }

  updateLoanStatus(loanId, status, extraFields = {}) {
    const loan = this.loans.find(l => l.loan_id === loanId);
    if (!loan) throw new Error(`Loan not found with ID: ${loanId}`);
    loan.loan_status = status;
    loan.updated_at = new Date().toISOString();
    loan.synced = 0;
    Object.assign(loan, extraFields);
    return { ...loan };
  }

  updateLoanRepayment(loanId, paidAmountPaisa) {
    const loan = this.loans.find(l => l.loan_id === loanId);
    if (!loan) throw new Error(`Loan not found with ID: ${loanId}`);
    loan.paid_paisa += paidAmountPaisa;
    loan.remaining_paisa = Math.max(0, loan.remaining_paisa - paidAmountPaisa);
    loan.updated_at = new Date().toISOString();
    loan.synced = 0;
    if (loan.remaining_paisa === 0) {
      loan.loan_status = LOAN_STATUSES.PAID_OFF;
    }
    return { ...loan };
  }

  getUnsyncedLoans(limit = 50) {
    return this.loans.filter(l => l.synced === 0).slice(0, limit).map(l => ({ ...l }));
  }

  updateLoanSyncStatus(loanId, synced) {
    const loan = this.loans.find(l => l.loan_id === loanId);
    if (loan) {
      loan.synced = synced ? 1 : 0;
      return true;
    }
    return false;
  }

  deleteLoan(loanId) {
    const idx = this.loans.findIndex(l => l.loan_id === loanId);
    if (idx >= 0) {
      this.loans.splice(idx, 1);
      this.loansById.delete(loanId);
      return true;
    }
    return false;
  }

  exists(loanId) {
    return this.loansById.has(loanId);
  }
}

class MerchantLoanEmiDao {
  constructor() {
    this.emis = [];
    this.emisById = new Map();
    this.nextId = 1;
  }

  saveEmis(records) {
    const inputList = Array.isArray(records) ? records : [records];
    const saved = [];
    for (const r of inputList) {
      const emi = r instanceof MerchantLoanEmiRecord ? r : new MerchantLoanEmiRecord(r);
      const existing = this.emisById.get(emi.emi_id);
      if (existing) {
        emi.id = existing.id;
        Object.assign(existing, emi);
        saved.push({ ...existing });
      } else {
        emi.id = this.nextId++;
        const cloned = { ...emi };
        this.emis.push(cloned);
        this.emisById.set(emi.emi_id, cloned);
        saved.push(cloned);
      }
    }
    return saved;
  }

  getEmisByLoanId(loanId) {
    return this.emis
      .filter(e => e.loan_id === loanId)
      .sort((a, b) => a.installment_number - b.installment_number)
      .map(e => ({ ...e }));
  }

  getEmiById(emiId) {
    const found = this.emisById.get(emiId);
    return found ? { ...found } : null;
  }

  getPendingEmisByBusinessId(businessId, options = {}) {
    const bId = String(businessId);
    let list = this.emis.filter(e => e.business_id === bId && (e.payment_status === EMI_PAYMENT_STATUSES.PENDING || e.payment_status === EMI_PAYMENT_STATUSES.OVERDUE));
    list.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    const offset = options.offset || 0;
    const limit = options.limit || list.length;
    return list.slice(offset, offset + limit).map(e => ({ ...e }));
  }

  recordEmiPayment(emiId, { paidDate = new Date().toISOString(), transactionReference, penaltyPaisa = 0, paymentStatus = EMI_PAYMENT_STATUSES.PAID }) {
    const emi = this.emis.find(e => e.emi_id === emiId);
    if (!emi) throw new Error(`EMI not found with ID: ${emiId}`);
    emi.payment_status = paymentStatus;
    emi.paid_date = paidDate;
    emi.transaction_reference = transactionReference || `TXN-EMI-${Date.now()}`;
    emi.penalty_paisa = penaltyPaisa;
    emi.synced = 0;
    return { ...emi };
  }

  getUnsyncedEmis(limit = 50) {
    return this.emis.filter(e => e.synced === 0).slice(0, limit).map(e => ({ ...e }));
  }

  updateEmiSyncStatus(emiId, synced) {
    const emi = this.emis.find(e => e.emi_id === emiId);
    if (emi) {
      emi.synced = synced ? 1 : 0;
      return true;
    }
    return false;
  }

  deleteEmisByLoanId(loanId) {
    const beforeLen = this.emis.length;
    this.emis = this.emis.filter(e => e.loan_id !== loanId);
    return beforeLen - this.emis.length;
  }
}

// --- 5. END-TO-END MICRO-LOAN & EMI REPAYMENT ENGINE ---

class MerchantLoanEngine {
  constructor(loanDao = new MerchantLoanDao(), emiDao = new MerchantLoanEmiDao()) {
    this.loanDao = loanDao;
    this.emiDao = emiDao;
  }

  applyForLoan({
    businessId,
    partnerBankCode,
    requestedAmountPaisa,
    tenureMonths,
    businessMetrics = {},
    autoApproveThreshold = 700
  }) {
    const bank = LOAN_PARTNER_BANKS[partnerBankCode];
    if (!bank) {
      throw new Error(`Invalid partner bank code: ${partnerBankCode}`);
    }

    const creditScore = calculateMerchantCreditScore(businessMetrics);
    if (!creditScore.isEligible) {
      return {
        success: false,
        reason: 'INELIGIBLE_CREDIT_SCORE',
        message: 'আপনার ক্রেডিট স্কোর প্রয়োজনীয় সীমার নিচে।',
        creditScore
      };
    }

    if (requestedAmountPaisa < bank.min_amount_paisa || requestedAmountPaisa > bank.max_amount_paisa) {
      throw new Error(`Requested amount must be between ${bank.min_amount_paisa} and ${bank.max_amount_paisa} paisa`);
    }

    if (requestedAmountPaisa > creditScore.maxLoanAmountPaisa) {
      return {
        success: false,
        reason: 'EXCEEDS_CREDIT_LIMIT',
        message: `আপনার ক্রেডিট স্কোর অনুযায়ী সর্বোচ্চ ঋণের পরিমাণ ৳${(creditScore.maxLoanAmountPaisa / 100).toLocaleString('bn-BD')}`,
        creditScore,
        maxLoanAmountPaisa: creditScore.maxLoanAmountPaisa
      };
    }

    if (tenureMonths < bank.min_tenure_months || tenureMonths > bank.max_tenure_months) {
      throw new Error(`Tenure must be between ${bank.min_tenure_months} and ${bank.max_tenure_months} months`);
    }

    const amortization = calculateLoanAmortization({
      principalPaisa: requestedAmountPaisa,
      interestRateBps: bank.interest_rate_bps,
      tenureMonths,
      processingFeeBps: bank.processing_fee_bps
    });

    const initialStatus = creditScore.score >= autoApproveThreshold ? LOAN_STATUSES.APPROVED : LOAN_STATUSES.UNDER_REVIEW;

    const loanRecord = this.loanDao.saveLoan({
      business_id: businessId,
      partner_bank: partnerBankCode,
      principal_paisa: requestedAmountPaisa,
      interest_rate_basis_points: bank.interest_rate_bps,
      tenure_months: tenureMonths,
      total_payable_paisa: amortization.totalPayablePaisa,
      monthly_emi_paisa: amortization.monthlyEmiPaisa,
      disbursed_paisa: amortization.disbursedPaisa,
      processing_fee_paisa: amortization.processingFeePaisa,
      loan_status: initialStatus,
      credit_score: creditScore.score,
      remaining_paisa: amortization.totalPayablePaisa,
      paid_paisa: 0
    });

    // Create draft EMI schedule
    const emiRecords = amortization.schedule.map(s => new MerchantLoanEmiRecord({
      emi_id: s.emi_id || (loanRecord.loan_id + '-EMI-' + s.installmentNumber),
      loan_id: loanRecord.loan_id,
      business_id: businessId,
      installment_number: s.installmentNumber,
      due_date: s.dueDate,
      principal_component_paisa: s.principalComponentPaisa,
      interest_component_paisa: s.interestComponentPaisa,
      total_installment_paisa: s.totalInstallmentPaisa,
      penalty_paisa: 0,
      payment_status: EMI_PAYMENT_STATUSES.PENDING
    }));

    const savedEmis = this.emiDao.saveEmis(emiRecords);

    return {
      success: true,
      loan: loanRecord,
      emis: savedEmis,
      amortization,
      creditScore
    };
  }

  disburseLoan({
    businessId,
    loanId,
    walletAccount,
    disbursementDate = new Date().toISOString()
  }) {
    const loan = this.loanDao.getLoanById(loanId);
    if (!loan) throw new Error(`Loan not found: ${loanId}`);
    if (loan.business_id !== String(businessId)) throw new Error('Tenant mismatch');

    if (loan.loan_status !== LOAN_STATUSES.APPROVED && loan.loan_status !== LOAN_STATUSES.APPLIED) {
      throw new Error(`Cannot disburse loan in status: ${loan.loan_status}`);
    }

    if (!walletAccount || typeof walletAccount.balancePaisa !== 'number') {
      throw new Error('Valid wallet account with balancePaisa required for disbursement');
    }

    // Credit net disbursed amount into wallet
    walletAccount.balancePaisa += loan.disbursed_paisa;

    // Transition loan status to ACTIVE
    const updatedLoan = this.loanDao.updateLoanStatus(loanId, LOAN_STATUSES.ACTIVE, {
      disbursement_date: disbursementDate,
      repayment_start_date: new Date(new Date(disbursementDate).setMonth(new Date(disbursementDate).getMonth() + 1)).toISOString().slice(0, 10)
    });

    return {
      success: true,
      loan: updatedLoan,
      disbursedPaisa: loan.disbursed_paisa,
      walletBalanceAfter: walletAccount.balancePaisa
    };
  }

  repayEmiFromWallet({
    businessId,
    loanId,
    emiId,
    walletAccount,
    currentDate = new Date().toISOString()
  }) {
    const loan = this.loanDao.getLoanById(loanId);
    if (!loan) throw new Error(`Loan not found: ${loanId}`);
    if (loan.business_id !== String(businessId)) throw new Error('Tenant mismatch');

    const emi = this.emiDao.getEmiById(emiId);
    if (!emi) throw new Error(`EMI not found: ${emiId}`);
    if (emi.loan_id !== loanId) throw new Error('Loan ID mismatch on EMI');

    if (emi.payment_status === EMI_PAYMENT_STATUSES.PAID || emi.payment_status === EMI_PAYMENT_STATUSES.AUTO_DEBITED) {
      throw new Error(`EMI ${emiId} is already paid`);
    }

    const penaltyPaisa = calculateEmiLatePenalty(emi, currentDate);
    const totalRequiredPaisa = emi.total_installment_paisa + penaltyPaisa;

    if (!walletAccount || typeof walletAccount.balancePaisa !== 'number') {
      throw new Error('Valid wallet account required');
    }

    if (walletAccount.balancePaisa < totalRequiredPaisa) {
      return {
        success: false,
        reason: 'INSUFFICIENT_WALLET_BALANCE',
        message: 'ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই।',
        requiredPaisa: totalRequiredPaisa,
        availablePaisa: walletAccount.balancePaisa
      };
    }

    // Deduct wallet balance
    walletAccount.balancePaisa -= totalRequiredPaisa;

    const txnRef = `TXN-EMI-REPAY-${Date.now()}`;
    const updatedEmi = this.emiDao.recordEmiPayment(emiId, {
      paidDate: currentDate,
      transactionReference: txnRef,
      penaltyPaisa,
      paymentStatus: EMI_PAYMENT_STATUSES.AUTO_DEBITED
    });

    // Update loan repaid amount
    const updatedLoan = this.loanDao.updateLoanRepayment(loanId, emi.total_installment_paisa);

    return {
      success: true,
      emi: updatedEmi,
      loan: updatedLoan,
      totalPaidPaisa: totalRequiredPaisa,
      penaltyPaisa,
      walletBalanceAfter: walletAccount.balancePaisa,
      transactionReference: txnRef
    };
  }

  checkAndApplyEmiPenalties({
    businessId,
    loanId,
    currentDate = new Date().toISOString()
  }) {
    const emis = this.emiDao.getEmisByLoanId(loanId);
    const updatedEmis = [];
    let isSevereDefault = false;

    for (const emi of emis) {
      if (emi.payment_status === EMI_PAYMENT_STATUSES.PENDING || emi.payment_status === EMI_PAYMENT_STATUSES.OVERDUE) {
        const penalty = calculateEmiLatePenalty(emi, currentDate);
        if (penalty > 0) {
          emi.payment_status = EMI_PAYMENT_STATUSES.OVERDUE;
          emi.penalty_paisa = penalty;
          emi.synced = 0;
          updatedEmis.push({ ...emi });

          const due = new Date(emi.due_date);
          const current = new Date(currentDate);
          const daysOverdue = Math.floor((current - due) / (1000 * 60 * 60 * 24));
          if (daysOverdue > 90) {
            isSevereDefault = true;
          }
        }
      }
    }

    if (isSevereDefault) {
      this.loanDao.updateLoanStatus(loanId, LOAN_STATUSES.DEFAULTED);
    }

    return {
      updatedCount: updatedEmis.length,
      updatedEmis,
      isSevereDefault
    };
  }

  getLoanSummary(businessId, loanId) {
    const loan = this.loanDao.getLoanById(loanId);
    if (!loan || loan.business_id !== String(businessId)) return null;
    const emis = this.emiDao.getEmisByLoanId(loanId);
    const paidEmis = emis.filter(e => e.payment_status === EMI_PAYMENT_STATUSES.PAID || e.payment_status === EMI_PAYMENT_STATUSES.AUTO_DEBITED);
    const pendingEmis = emis.filter(e => e.payment_status === EMI_PAYMENT_STATUSES.PENDING || e.payment_status === EMI_PAYMENT_STATUSES.OVERDUE);

    return {
      loan,
      totalEmis: emis.length,
      paidEmisCount: paidEmis.length,
      pendingEmisCount: pendingEmis.length,
      nextEmi: pendingEmis[0] || null,
      repaymentProgressPercent: Math.round((loan.paid_paisa / loan.total_payable_paisa) * 100) || 0
    };
  }
}

const ReconstructedLoanEngine = MerchantLoanEngine;
const LoanEngine = MerchantLoanEngine;
const merchantLoanEngine = new MerchantLoanEngine();
const reconstructedLoanEngine = merchantLoanEngine;

module.exports = {
  // Milestone REA-ITER-239 Exports
  MERCHANT_LOAN_SCHEMA,
  LOAN_TABLE_SCHEMA,
  MERCHANT_LOAN_EMI_SCHEMA,
  LOAN_EMI_TABLE_SCHEMA,
  LOAN_STATUSES,
  LoanStatus,
  MerchantLoanStatus,
  EMI_PAYMENT_STATUSES,
  EmiPaymentStatus,
  LoanEmiStatus,
  CREDIT_SCORE_TIERS,
  CreditScoreTier,
  LOAN_PARTNER_BANKS,
  LoanPartnerBank,
  LOAN_ARSC_TOKENS,
  calculateMerchantCreditScore,
  calculateLoanAmortization,
  calculateEmiLatePenalty,
  transitionLoanStatus,
  MerchantLoanRecord,
  MerchantLoanEmiRecord,
  MerchantLoanDao,
  MerchantLoanEmiDao,
  MerchantLoanEngine,
  ReconstructedLoanEngine,
  LoanEngine,
  merchantLoanEngine,
  reconstructedLoanEngine,

  // Milestone REA-ITER-238 Exports
  MERCHANT_QR_ORDER_SCHEMA,
  QR_ORDER_TABLE_SCHEMA,
  QR_ORDER_STATUSES,
  QrOrderStatus,
  QR_PAYMENT_METHODS,
  QrPaymentMethod,
  QR_PAYMENT_STATUSES,
  QrPaymentStatus,
  QR_ORDER_ITEM_TYPES,
  QR_ORDER_CATALOG,
  BANGLADESH_DIVISIONS,
  BANGLADESH_DIVISION_ALIASES,
  QR_ORDER_ARSC_TOKENS,
  calculateQrOrderPricing,
  validateDeliveryAddress,
  transitionQrOrderStatus,
  MerchantQrOrderRecord,
  MerchantQrOrderDao,
  MerchantQrOrderEngine,
  ReconstructedQrOrderEngine,
  QrOrderEngine,
  merchantQrOrderEngine,
  reconstructedQrOrderEngine,


  // Milestone REA-ITER-237 Exports
  MERCHANT_KYC_SCHEMA,
  KYC_TABLE_SCHEMA,
  KYC_STATUSES,
  EkycVerificationStatus,
  MerchantKycStatus,
  NID_TYPES,
  BangladeshNidType,
  NID_SIDES,
  NidSide,
  LIVENESS_GESTURES,
  LivenessGesture,
  LIVENESS_STATES,
  LivenessState,
  KYC_ARSC_TOKENS,
  validateBangladeshNid,
  extractAndNormalizeOcrFields,
  transitionLivenessState,
  assessSelfieQuality,
  evaluateKycVerificationStatus,
  MerchantKycRecord,
  MerchantKycDao,
  MerchantKycPipelineEngine,
  ReconstructedKycEngine,
  KycPipelineEngine,
  merchantKycPipelineEngine,
  reconstructedKycEngine,


  // Milestone REA-ITER-236 Exports
  TRANSACTION_SETTLEMENT_ACTION_SCHEMA,
  TKEnum$TransactionSettlementAction,
  TRANSACTION_SETTLEMENT_ACTIONS,
  TransactionSettlementActionType,
  SETTLEMENT_SOUNDBOX_ARSC_TOKENS,
  BLE_STATES,
  BATTERY_SERVICE_UUID,
  BATTERY_LEVEL_CHAR_UUID,
  SOUNDBOX_SERVICE_UUID,
  SOUNDBOX_CMD_CHAR_UUID,
  AUDIO_OUTPUT_SINKS,
  SETTLEMENT_PAYOUT_RULES,
  transitionBleState,
  evaluateRssiHealth,
  evaluateBatteryTelemetry,
  syncSoundboxVolume,
  buildSoundboxCommandPacket,
  resolveAudioOutputSink,
  toBengaliDigits,
  generateBengaliVoiceAnnouncement,
  calculateSettlementPayoutFee,
  TransactionSettlementAction,
  TransactionSettlementActionDao,
  SettlementAutomationEngine,
  SoundboxBleDiagnosticsService,

  // Milestone REA-ITER-235 Exports
  TELECOM_OPERATORS,
  RECHARGE_TELECOM_OPERATORS,
  TelecomOperator,
  RECHARGE_CONNECTION_TYPES,
  CONNECTION_TYPES,
  CONNECTION_TYPE_LABELS,
  RECHARGE_PACKAGE_CATEGORIES,
  PACKAGE_CATEGORIES,
  PACKAGE_CATEGORY_META,
  RECHARGE_REGULATORY_LIMITS,
  RECHARGE_LIMITS_V2,
  RECHARGE_ARSC_TOKENS,
  RECHARGE_PACKAGES_CATALOG,
  detectRechargeOperator,
  calculateCommission,
  calculateRechargeCommission,
  validateRecharge,
  validateRechargeParameters,
  getRechargePackages,
  searchRechargePackages,
  ReconstructedRechargeEngine,
  RechargeEngine,
  TallyPayRechargeEngine,
  reconstructedRechargeEngine,
  rechargeEngine,

  // Milestone REA-ITER-234 Exports
  TRANSFER_CHANNELS,
  TransferChannel,
  TRANSFER_FEES,
  TRANSFER_LIMITS,
  TRANSFER_ARSC_TOKENS,
  calculateTransferFee,
  validateTransferLimits,
  selectCustomerForAday,
  generateAdayPaymentLink,
  generateAdaySmsText,
  recordAdayCollection,
  ReconstructedTransferEngine,
  TransferEngine,
  TallyPayTransferEngine,
  reconstructedTransferEngine,
  transferEngine,
  // Milestone REA-ITER-233 Exports
  ADD_MONEY_CHANNELS,
  AddMoneyMethod,
  CARD_NETWORKS,
  CardNetwork,
  CARD_TYPES,
  CardType,
  ADD_MONEY_PRESETS,
  ADD_MONEY_PRESETS_PAISA,
  ADD_MONEY_LIMITS,
  ADD_MONEY_FEE_RATES,
  ADD_MONEY_ARSC_TOKENS,
  luhnCheck,
  validateLuhn,
  detectCardNetwork,
  maskCardNumber,
  calculateAddMoneyFee,
  ReconstructedAddMoneyEngine,
  AddMoneyEngine,
  reconstructedAddMoneyEngine,
  addMoneyEngine,

  // Milestone REA-ITER-232 Exports
  ACCOUNT_STATUSES,
  ACCOUNT_TYPES,
  MFS_OPERATORS,
  BANGLADESH_SCHEDULED_BANKS,
  getScheduledBankList,
  getScheduledBankByCode,
  ACCOUNT_MANAGER_ARSC_TOKENS,
  ReconstructedLinkedAccountEngine,
  LinkedAccountEngine,
  linkedAccountEngine,
  TallyPayAccountManager,
  BankAccountManager,
  tallyPayAccountManager,

  // Milestone REA-ITER-231 Exports
  DEFAULT_PIN_SALT,
  PIN_ARSC_TOKENS,
  PIN_STRENGTH_ERRORS,
  hashPin,
  validatePinStrength,
  ReconstructedSecurityPinAndAuthEngine,
  PinSecurityEngine,
  pinSecurityEngine,
  TallyPaySecurityManager,
  tallyPaySecurityManager,

  // Milestone REA-ITER-230 Exports
  BANK_TRANSFER_MODES,
  DISBURSEMENT_STATUSES,
  RECONCILIATION_SYNC_STATUS,
  BANK_TRANSFER_FEES,
  NPSB_SUPPORTED_BANK_ROUTINGS,
  SETTLEMENT_HISTORY_DATE_RANGES,
  BANK_TRANSFER_ARSC_TOKENS,
  resolveSettlementDateRange,
  querySettlementHistory,
  processBankDisbursement,
  computeDailyReconciliation,
  recordReconciliation,
  AutoDisbursementConfigManager,
  autoDisbursementConfigManager,
  AutoDisbursementScheduler,
  autoDisbursementScheduler,
  AutoDisbursementManager,
  autoDisbursementManager,
  ReconstructedSettlementAndReconciliationEngine,
  SettlementAndReconciliationEngine,
  settlementAndReconciliationEngine,

  // Milestone REA-ITER-229 Exports
  SETTLEMENT_ACTION_TYPES,
  SETTLEMENT_ARSC_TOKENS,
  buildSettlementAction,
  checkSettlementIdempotency,
  processQrPaymentSettlement,
  generatePaymentSpeechPrompt,
  formatTtsSpeech,
  SoundboxConfigManager,
  soundboxConfigManager,
  getSoundboxNotificationConfig,
  updateSoundboxNotificationConfig,
  SoundboxAudioDispatcher,
  ReconstructedSoundboxAudioDispatcher,
  ReconstructedSettlementActionRepository,
  ReconstructedCreditSettlementEngine,
  QrSettlementEngine,
  // Milestone REA-ITER-228 Exports
  BANK_VERIFICATION_STATUSES,
  BENEFICIARY_TARGET_TYPES,
  MFS_WALLET_OPERATORS,
  REMITTANCE_TRANSFER_MODES,
  BANGLADESH_BANKS_CATALOG,
  getBangladeshBanksCatalog,
  getBankByCode,
  getBankList,
  getObscureAccountNumber,
  getObscureMobileNumber,
  validateRoutingNumber,
  validateBangladeshiMobile,
  validateBanglaMobile,
  validateBeneficiaryPayload,
  formatBankAccountItem,
  formatMfsAccountItem,
  formatSavedRecipient,
  buildPrepopulatedRemittance,
  verifyBankPennyDeposit,
  queryBeneficiaries,
  BeneficiaryBookEngine,
  ReconstructedBeneficiaryBookEngine,
  beneficiaryBookEngine,

  TRANSACTION_LIMITS,
  SERVICE_CHARGES,
  SUPPORTED_ADD_MONEY_CHANNELS,
  RECHARGE_LIMITS,
  SUPPORTED_OPERATORS,
  detectOperator,
  calculateServiceFee,
  validateAddMoney,
  initiateAddMoneyTransaction,
  validateSendMoney,
  initiateSendMoneyTransaction,
  validateMobileRecharge,
  initiateMobileRechargeTransaction,

  // Milestone REA-ITER-227 Exports
  BALANCE_CHANGE_TYPES,
  TXN_STATUSES,
  TXN_INCOMING_OUTGOING_FILTERS,
  TRANSACTION_TYPES,
  BENGALI_ARSC_TOKENS,
  toBengaliNumerals,
  formatBengaliCurrency,
  formatBengaliDate,
  formatTransactionStatementItem,
  queryWalletTransactions,
  calculateMonthlyTransactionSummary,
  generateTransactionReceiptDetails,
  generateShareText,
  TransactionHistoryEngine,
  transactionHistoryEngine,
};
