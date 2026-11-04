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
module.exports = {
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
