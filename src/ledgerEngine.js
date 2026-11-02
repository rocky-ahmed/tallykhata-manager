/**
 * src/ledgerEngine.js
 * Authoritative Accounting, Ledger & Persistence Logic for TallyKhata
 * 100% Offline Double-Entry & Referential Integrity Engine
 */

// --- 0. UNIQUE ID GENERATION (COLLISION-FREE) ---
let _idSequence = 0;
function generateUniqueId(prefix = '') {
  _idSequence = (_idSequence + 1) % 1000000;
  return `${prefix}${Date.now()}_${_idSequence}_${Math.random().toString(36).substring(2, 7)}`;
}

// --- 1. VALIDATION HELPERS ---
function validateTransaction(amount, type, desc = '') {
  if (typeof amount === 'object' && amount !== null) {
    const rawAmt = amount.amount !== undefined && amount.amount !== null ? amount.amount : amount.amount_received;
    const rawType = amount.type !== undefined && amount.type !== null ? amount.type : amount.txn_type;
    const rawDesc = amount.desc || amount.description || '';
    return validateTransaction(rawAmt, rawType, rawDesc);
  }

  const num = Number(amount);
  if (amount === undefined || amount === null || String(amount).trim() === '') {
    return { valid: false, error: 'টাকার পরিমাণ খালি রাখা যাবে না।' };
  }
  if (isNaN(num)) {
    return { valid: false, error: 'টাকার পরিমাণ সঠিক সংখ্যা নয়।' };
  }
  const cleanAmount = Math.round(num * 100) / 100;
  if (!isFinite(num) || cleanAmount <= 0) {
    return { valid: false, error: 'টাকার পরিমাণ অবশ্যই শূন্য (০) থেকে বড় হতে হবে।' };
  }
  if (cleanAmount > 100000000) {
    return { valid: false, error: 'টাকার পরিমাণ অস্বাভাবিক বেশি (সর্বোচ্চ সীমা ১০ কোটির বেশি অনুমোদিত নয়)।' };
  }

  let normalizedType = type;
  if (type === 1 || type === '1') normalizedType = 'given';
  else if (type === 2 || type === '2') normalizedType = 'received';

  if (normalizedType !== 'given' && normalizedType !== 'received') {
    return { valid: false, error: 'লেনদেনের ধরন সঠিক নয় (দিলাম অথবা পেলাম হতে হবে)।' };
  }
  return { valid: true, amount: cleanAmount };
}

/**
 * Normalizes a journal record to guarantee 100% field parity with both:
 * 1. Reference Room DB schema (orig_account_id, txn_type, txn_mode, amount, amount_received, business_id, txn_date, description)
 * 2. TallyKhata clone fields (accountId, type, amount, businessId, date, time, desc)
 * Preserves integer-paisa monetary precision (1 Taka = 100 Paisa).
 */
function normalizeJournalFields(journal, account = null) {
  if (!journal || typeof journal !== 'object') return journal;

  const res = { ...journal };

  // 1. Account ID normalization
  if (res.accountId !== undefined && res.accountId !== null) {
    res.accountId = String(res.accountId);
    if (res.orig_account_id === undefined || res.orig_account_id === null) {
      res.orig_account_id = isNaN(Number(res.accountId)) ? res.accountId : Number(res.accountId);
    }
  } else if (res.orig_account_id !== undefined && res.orig_account_id !== null) {
    res.accountId = String(res.orig_account_id);
    res.orig_account_id = isNaN(Number(res.orig_account_id)) ? res.orig_account_id : Number(res.orig_account_id);
  }

  // 2. Business ID normalization (multi-business isolation)
  const resolvedBizId = res.businessId !== undefined && res.businessId !== null
    ? String(res.businessId)
    : (res.business_id !== undefined && res.business_id !== null
      ? String(res.business_id)
      : (account && (account.businessId || account.business_id) ? String(account.businessId || account.business_id) : '1'));
  res.businessId = resolvedBizId;
  res.business_id = isNaN(Number(resolvedBizId)) ? resolvedBizId : Number(resolvedBizId);

  // 3. Amount & Amount Received with Integer-Paisa Precision (1 Taka = 100 Paisa)
  const rawAmt = Number(res.amount !== undefined && res.amount !== null ? res.amount : res.amount_received) || 0;
  res.amount = Math.round(rawAmt * 100) / 100;

  if (res.amount_received !== undefined && res.amount_received !== null) {
    res.amount_received = Math.round(Number(res.amount_received) * 100) / 100;
  } else {
    const isCust = account ? account.type === 1 : true;
    const isPayment = res.type === (isCust ? 'received' : 'given') ||
                      res.txn_type === 2 ||
                      res.txn_type === '2' ||
                      res.txn_type === (isCust ? 'received' : 'given');
    res.amount_received = isPayment ? res.amount : 0;
  }

  // 4. Transaction Type: txn_type (1=Credit, 2=Payment) <-> type ('given'/'received')
  const isCust = account ? account.type === 1 : true;
  if (res.type === 'given') {
    if (res.txn_type === undefined || res.txn_type === null) {
      res.txn_type = isCust ? 1 : 2;
    }
  } else if (res.type === 'received') {
    if (res.txn_type === undefined || res.txn_type === null) {
      res.txn_type = isCust ? 2 : 1;
    }
  } else if (res.txn_type === 1 || res.txn_type === '1') {
    res.txn_type = 1;
    if (!res.type) {
      res.type = isCust ? 'given' : 'received';
    }
  } else if (res.txn_type === 2 || res.txn_type === '2') {
    res.txn_type = 2;
    if (!res.type) {
      res.type = isCust ? 'received' : 'given';
    }
  } else if (res.txn_type === 'given' || res.txn_type === 'received') {
    res.type = res.txn_type;
    res.txn_type = res.type === (isCust ? 'given' : 'received') ? 1 : 2;
  }

  // 5. Transaction Mode: txn_mode (1=Cash, 2=Digital/Wallet)
  const isDigital = res.isDigital === true ||
                    res.txn_mode === 2 ||
                    res.txn_mode === '2' ||
                    res.txn_mode === 'digital' ||
                    res.txn_mode === 'bank' ||
                    res.txn_mode === 'mfs';
  res.txn_mode = isDigital ? 2 : 1;

  // 6. Dates, Times & Descriptions
  if (!res.date && res.txn_date) res.date = res.txn_date;
  if (!res.txn_date && res.date) res.txn_date = res.date;
  if (!res.desc && res.description) res.desc = res.description;
  if (!res.description && res.desc) res.description = res.desc;

  // 7. Sync status normalization (Room DB: 0 = pending sync, 1 = synced)
  if (res.synced === undefined || res.synced === null) {
    res.synced = (res.is_synced === true || res.is_synced === 1) ? 1 : 0;
  } else {
    res.synced = (Number(res.synced) === 1 || res.synced === true) ? 1 : 0;
  }

  return res;
}

function validateAccount(name, phone = '', initialBalance = 0) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    return { valid: false, error: 'হিসাবের নাম অবশ্যই দিতে হবে।' };
  }
  const bal = Number(initialBalance);
  if (isNaN(bal) || bal < 0) {
    return { valid: false, error: 'পূর্বের বাকি/জের ঋণাত্মক হতে পারে না।' };
  }
  return {
    valid: true,
    name: name.trim(),
    phone: phone ? phone.trim() : '',
    initialBalance: Math.round(bal * 100) / 100,
  };
}

function validateStockAdjustment(currentStock, adjustQty, adjustType) {
  const qty = Number(adjustQty);
  if (isNaN(qty) || qty <= 0) {
    return { valid: false, error: 'সঠিক স্টক সমন্বয় পরিমাণ দিন।' };
  }
  const current = Number(currentStock) || 0;
  const isOut = adjustType === 'out' || adjustType === 'reduce' || adjustType === 'decrease';
  const isIn = adjustType === 'in' || adjustType === 'add' || adjustType === 'increase';
  if (!isIn && !isOut) {
    return { valid: false, error: 'অবৈধ স্টক সমন্বয় ধরন।' };
  }
  if (isOut && qty > current) {
    return {
      valid: false,
      error: `বর্তমান স্টক (${current}) থেকে বেশি (${qty}) বাদ দেওয়া সম্ভব নয়।`,
    };
  }
  return {
    valid: true,
    newStock: isIn ? current + qty : current - qty,
  };
}

// --- 2. OPENING BALANCE BASELINE ESTABLISHMENT ---
/**
 * Safely derives or retrieves the authoritative opening balance baseline for an account.
 * If openingBalance is explicitly defined, returns it directly.
 * If openingBalance is missing but stored balance exists without unresolvable discrepancy,
 * establishes baseline = stored balance - journal net.
 */
function establishAccountOpeningBalance(account, allJournals = []) {
  if (!account) return 0;
  if (account.openingBalance !== undefined && account.openingBalance !== null && !isNaN(Number(account.openingBalance))) {
    return Number(account.openingBalance);
  }
  if (account.start_balance !== undefined && account.start_balance !== null && !isNaN(Number(account.start_balance))) {
    return Number(account.start_balance);
  }
  if (account.startBalance !== undefined && account.startBalance !== null && !isNaN(Number(account.startBalance))) {
    return Number(account.startBalance);
  }
  if (account.initialBalance !== undefined && account.initialBalance !== null && !isNaN(Number(account.initialBalance))) {
    return Number(account.initialBalance);
  }
  if (account.hasDiscrepancy || account.unresolvableDiscrepancy) {
    return 0;
  }

  const isCust = account.type === 1;
  const targetAccId = String(account.id);
  let jNetPaisa = 0;
  let hasInvalid = false;

  const targetBizId = account.businessId !== undefined && account.businessId !== null
    ? String(account.businessId)
    : (account.business_id !== undefined && account.business_id !== null ? String(account.business_id) : null);
  const isBizMatch = (j) => {
    const jBizId = j && (j.businessId !== undefined && j.businessId !== null
      ? String(j.businessId)
      : (j.business_id !== undefined && j.business_id !== null ? String(j.business_id) : null));
    if (targetBizId && jBizId) return targetBizId === jBizId;
    if (targetBizId && !jBizId) return targetBizId === '1' || targetBizId === 'default';
    if (!targetBizId && jBizId) return jBizId === '1' || jBizId === 'default';
    return true;
  };

  for (const j of allJournals) {
    const jAccId = j && (j.accountId !== undefined && j.accountId !== null
      ? String(j.accountId)
      : (j.orig_account_id !== undefined && j.orig_account_id !== null ? String(j.orig_account_id) : null));
    if (j && jAccId === targetAccId && isBizMatch(j)) {
      const numAmt = Number(j.amount !== undefined && j.amount !== null ? j.amount : j.amount_received);
      if (isNaN(numAmt)) {
        hasInvalid = true;
        break;
      }
      const amtPaisa = Math.round(numAmt * 100);

      let isGiven = j.type === 'given' || j.txn_type === 'given';
      let isReceived = j.type === 'received' || j.txn_type === 'received';
      if (!isGiven && !isReceived && (j.txn_type === 1 || j.txn_type === 2 || j.txn_type === '1' || j.txn_type === '2')) {
        const numType = Number(j.txn_type);
        if (isCust) {
          isGiven = numType === 1;
          isReceived = numType === 2;
        } else {
          isReceived = numType === 1;
          isGiven = numType === 2;
        }
      }

      if (isCust) {
        if (isGiven) jNetPaisa += amtPaisa;
        else if (isReceived) jNetPaisa -= amtPaisa;
        else hasInvalid = true;
      } else {
        if (isReceived) jNetPaisa += amtPaisa;
        else if (isGiven) jNetPaisa -= amtPaisa;
        else hasInvalid = true;
      }
    }
  }

  const storedBal = Number(account.balance);
  if (!isNaN(storedBal) && !hasInvalid) {
    const storedPaisa = Math.round(storedBal * 100);
    return Math.round(storedPaisa - jNetPaisa) / 100;
  }
  return 0;
}

// --- 3. CHRONOLOGICAL RUNNING BALANCES RECALCULATION ---
/**
 * Recalculates running balances chronologically incorporating the explicit openingBalance baseline.
 * Handles customer (type 1) and supplier (type 2) conventions:
 * - Customer:
 *     given (+) = credit sale / customer owes more
 *     received (-) = payment received / customer owes less
 *     balance = openingBalance + sum(given) - sum(received)
 * - Supplier:
 *     received (+) = credit purchase / we owe supplier more
 *     given (-) = cash paid / we owe supplier less
 *     balance = openingBalance + sum(received) - sum(given)
 */

function sortJournalsChronologically(journals) {
  if (!Array.isArray(journals) || journals.length <= 1) return journals;
  return journals.sort((a, b) => {
    const dA = a.date || a.txn_date || '';
    const dB = b.date || b.txn_date || '';
    if (dA < dB) return -1;
    if (dA > dB) return 1;

    const tA = a.time || '';
    const tB = b.time || '';
    if (tA < tB) return -1;
    if (tA > tB) return 1;

    const numA = Number(a.id);
    const numB = Number(b.id);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    const sA = String(a.id || '');
    const sB = String(b.id || '');
    return sA < sB ? -1 : (sA > sB ? 1 : 0);
  });
}

/**
 * High-performance batch recalculation of account running balances.
 * Indexes all journals in O(M) time and recalculates N accounts in O(N + M log M)
 * instead of naive O(N * M) scans.
 */
function recalculateAllAccountBalances(accounts = [], allJournals = [], businessId = null) {
  if (!Array.isArray(accounts) || accounts.length === 0) {
    const emptyResult = [];
    emptyResult.updatedAccounts = [];
    emptyResult.updatedJournals = allJournals;
    emptyResult.accounts = [];
    emptyResult.journals = allJournals;
    return emptyResult;
  }

  // 1. Index all journals by composite key `${jBizId}:${accId}` in O(M) time to prevent cross-business collisions
  const journalMap = new Map();
  for (let i = 0; i < allJournals.length; i++) {
    const j = allJournals[i];
    if (!j) continue;
    const accId = j.accountId !== undefined && j.accountId !== null ? j.accountId : j.orig_account_id;
    if (accId === undefined || accId === null) continue;

    const jBizId = String(j.businessId !== undefined && j.businessId !== null
      ? j.businessId
      : (j.business_id !== undefined && j.business_id !== null ? j.business_id : '1'));

    if (businessId && jBizId !== String(businessId)) {
      continue;
    }

    const accKey = `${jBizId}:${accId}`;
    let list = journalMap.get(accKey);
    if (!list) {
      list = [];
      journalMap.set(accKey, list);
    }
    list.push({ ...j });
  }

  const updatedJournalsMap = new Map();
  const updatedAccounts = [];

  // 2. Iterate each account in O(N) time with O(1) journal lookup
  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    if (!account || !account.id) {
      updatedAccounts.push(account);
      continue;
    }

    const targetBizId = String(account.businessId !== undefined && account.businessId !== null
      ? account.businessId
      : (account.business_id !== undefined && account.business_id !== null ? account.business_id : '1'));

    if (businessId && targetBizId !== String(businessId)) {
      updatedAccounts.push(account);
      continue;
    }

    const isCustomer = account.type === 1;
    const targetAccId = String(account.id);
    const accKey = `${targetBizId}:${targetAccId}`;
    const targetJournals = journalMap.get(accKey) || [];

    let openingBal = 0;
    if (account.openingBalance !== undefined && account.openingBalance !== null) {
      openingBal = Number(account.openingBalance) || 0;
    } else if (account.start_balance !== undefined && account.start_balance !== null) {
      openingBal = Number(account.start_balance) || 0;
    } else if (account.startBalance !== undefined && account.startBalance !== null) {
      openingBal = Number(account.startBalance) || 0;
    } else if (account.initialBalance !== undefined && account.initialBalance !== null) {
      openingBal = Number(account.initialBalance) || 0;
    }

    if (targetJournals.length > 0) {
      sortJournalsChronologically(targetJournals);

      let runningPaisa = Math.round(openingBal * 100);
      for (let k = 0; k < targetJournals.length; k++) {
        const j = targetJournals[k];
        const numAmt = Number(j.amount !== undefined && j.amount !== null ? j.amount : j.amount_received) || 0;
        const amtPaisa = Math.round(numAmt * 100);

        let isGiven = j.type === 'given' || j.txn_type === 'given';
        let isReceived = j.type === 'received' || j.txn_type === 'received';
        if (!isGiven && !isReceived && (j.txn_type === 1 || j.txn_type === 2 || j.txn_type === '1' || j.txn_type === '2')) {
          const numType = Number(j.txn_type);
          if (isCustomer) {
            isGiven = numType === 1;
            isReceived = numType === 2;
          } else {
            isReceived = numType === 1;
            isGiven = numType === 2;
          }
        }

        if (isCustomer) {
          if (isGiven) runningPaisa += amtPaisa;
          else if (isReceived) runningPaisa -= amtPaisa;
        } else {
          if (isReceived) runningPaisa += amtPaisa;
          else if (isGiven) runningPaisa -= amtPaisa;
        }
        j.runningBalance = runningPaisa / 100;
        updatedJournalsMap.set(String(j.id), j);
      }

      const finalBalance = runningPaisa / 100;
      const normalizedOpeningBal = Math.round(openingBal * 100) / 100;
      updatedAccounts.push({
        ...account,
        balance: finalBalance,
        openingBalance: normalizedOpeningBal,
        start_balance: normalizedOpeningBal,
        startBalance: normalizedOpeningBal,
      });
    } else {
      const finalBalance = Math.round(openingBal * 100) / 100;
      updatedAccounts.push({
        ...account,
        balance: finalBalance,
        openingBalance: finalBalance,
        start_balance: finalBalance,
        startBalance: finalBalance,
      });
    }
  }

  // 3. Map modified journals back in O(M) time
  let updatedJournals;
  if (updatedJournalsMap.size > 0) {
    updatedJournals = allJournals.map((orig) => {
      const mod = updatedJournalsMap.get(String(orig.id));
      return mod || orig;
    });
  } else {
    updatedJournals = allJournals;
  }

  const result = [...updatedAccounts];
  result.updatedAccounts = updatedAccounts;
  result.updatedJournals = updatedJournals;
  result.accounts = updatedAccounts;
  result.journals = updatedJournals;
  return result;
}

function recalculateAccountRunningBalances(accountOrAccounts, allJournals = [], optionsOrIndex = null) {
  if (Array.isArray(accountOrAccounts)) {
    const businessId = (typeof optionsOrIndex === 'string' || typeof optionsOrIndex === 'number')
      ? optionsOrIndex
      : (optionsOrIndex && optionsOrIndex.businessId) || null;
    return recalculateAllAccountBalances(accountOrAccounts, allJournals, businessId);
  }

  const account = accountOrAccounts;
  if (!account || !account.id) {
    return { updatedAccount: account, updatedJournals: allJournals, accountJournals: [] };
  }

  const isCustomer = account.type === 1;
  const targetAccId = String(account.id);
  const targetBizId = String(account.businessId !== undefined && account.businessId !== null
    ? account.businessId
    : (account.business_id !== undefined && account.business_id !== null ? account.business_id : '1'));

  const isBizMatch = (j) => {
    const jBizId = String(j && (j.businessId !== undefined && j.businessId !== null
      ? j.businessId
      : (j.business_id !== undefined && j.business_id !== null ? j.business_id : '1')));
    return targetBizId === jBizId;
  };

  // If optionsOrIndex is a Map (pre-indexed journals), do O(1) lookup
  let targetJournals = [];
  if (optionsOrIndex instanceof Map) {
    const list = optionsOrIndex.get(`${targetBizId}:${targetAccId}`) ||
                 optionsOrIndex.get(`default:${targetAccId}`) ||
                 optionsOrIndex.get(targetAccId);
    if (list) {
      targetJournals = list.filter(isBizMatch).map(j => ({ ...j }));
    }
  } else {
    for (let i = 0; i < allJournals.length; i++) {
      const j = allJournals[i];
      const jAccId = j && (j.accountId !== undefined && j.accountId !== null
        ? String(j.accountId)
        : (j.orig_account_id !== undefined && j.orig_account_id !== null ? String(j.orig_account_id) : null));
      if (j && jAccId === targetAccId && isBizMatch(j)) {
        targetJournals.push({ ...j });
      }
    }
  }

  // Sort chronologically ascending (oldest first)
  sortJournalsChronologically(targetJournals);

  // Determine explicit opening balance baseline
  let openingBal = 0;
  if (account.openingBalance !== undefined && account.openingBalance !== null) {
    openingBal = Number(account.openingBalance) || 0;
  } else if (account.start_balance !== undefined && account.start_balance !== null) {
    openingBal = Number(account.start_balance) || 0;
  } else if (account.startBalance !== undefined && account.startBalance !== null) {
    openingBal = Number(account.startBalance) || 0;
  } else if (account.initialBalance !== undefined && account.initialBalance !== null) {
    openingBal = Number(account.initialBalance) || 0;
  }

  // Calculate sequential running balance starting from openingBal baseline in integer paisa
  let runningPaisa = Math.round(openingBal * 100);
  for (let i = 0; i < targetJournals.length; i++) {
    const j = targetJournals[i];
    const numAmt = Number(j.amount !== undefined && j.amount !== null ? j.amount : j.amount_received) || 0;
    const amtPaisa = Math.round(numAmt * 100);

    let isGiven = j.type === 'given' || j.txn_type === 'given';
    let isReceived = j.type === 'received' || j.txn_type === 'received';
    if (!isGiven && !isReceived && (j.txn_type === 1 || j.txn_type === 2 || j.txn_type === '1' || j.txn_type === '2')) {
      const numType = Number(j.txn_type);
      if (isCustomer) {
        isGiven = numType === 1;
        isReceived = numType === 2;
      } else {
        isReceived = numType === 1;
        isGiven = numType === 2;
      }
    }

    if (isCustomer) {
      if (isGiven) runningPaisa += amtPaisa;
      else if (isReceived) runningPaisa -= amtPaisa;
    } else {
      if (isReceived) runningPaisa += amtPaisa;
      else if (isGiven) runningPaisa -= amtPaisa;
    }
    j.runningBalance = runningPaisa / 100;
  }

  const finalBalance = runningPaisa / 100;
  const normalizedOpeningBal = Math.round(openingBal * 100) / 100;
  const updatedAccount = {
    ...account,
    balance: finalBalance,
    openingBalance: normalizedOpeningBal,
    start_balance: normalizedOpeningBal,
    startBalance: normalizedOpeningBal,
  };

  // For UI display, account journals are displayed newest first
  const displayAccountJournals = [...targetJournals].reverse();

  let updatedJournals;
  if (targetJournals.length > 0) {
    const targetMap = new Map();
    for (let i = 0; i < targetJournals.length; i++) {
      targetMap.set(String(targetJournals[i].id), targetJournals[i]);
    }
    updatedJournals = allJournals.map((orig) => {
      const strId = String(orig.id);
      return targetMap.has(strId) ? targetMap.get(strId) : orig;
    });
  } else {
    updatedJournals = allJournals;
  }

  return {
    updatedAccount,
    updatedJournals,
    accountJournals: displayAccountJournals,
    finalBalance,
  };
}

// --- 3.5. STATEMENT LEDGER GENERATION & DATE-RANGE FILTERS (REA-ITER-207) ---

const BENGALI_TO_ASCII_DIGITS = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
};

function formatIsoDate(d) {
  if (!(d instanceof Date) || isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + "-" + m + "-" + day;
}

function normalizeStatementDate(val) {
  if (val === null || val === undefined || val === '') return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : formatIsoDate(val);
  }
  if (typeof val === 'string') {
    let asciiStr = val.replace(/[০-৯]/g, (ch) => BENGALI_TO_ASCII_DIGITS[ch] || ch).trim();
    if (asciiStr.length >= 10 && asciiStr.charCodeAt(4) === 45 && asciiStr.charCodeAt(7) === 45) {
      return asciiStr.slice(0, 10);
    }
    const parsed = new Date(asciiStr);
    if (!isNaN(parsed.getTime())) return formatIsoDate(parsed);
  }
  return null;
}

/**
 * Resolves statement date ranges into canonical [startDate, endDate] strings (YYYY-MM-DD).
 * Supports: 'all' | 'today' | 'this_month' | 'last_month' | 'custom'
 *
 * @param {string|Object|null} dateRange Range descriptor
 * @param {Object} [options={}] Optional startDate / endDate overrides
 * @param {Date} [referenceDate=new Date()] Reference anchor for relative date calculations
 * @returns {{ range: string, startDate: string|null, endDate: string|null }}
 */
function resolveStatementDateRange(dateRange = 'all', options = {}, referenceDate = new Date()) {
  const refDate = referenceDate instanceof Date && !isNaN(referenceDate.getTime())
    ? referenceDate
    : new Date();

  let rangeType = 'all';
  let explicitStart = null;
  let explicitEnd = null;

  if (typeof dateRange === 'string') {
    rangeType = dateRange.toLowerCase().trim();
  } else if (dateRange && typeof dateRange === 'object') {
    rangeType = (dateRange.range || dateRange.type || 'custom').toLowerCase().trim();
    explicitStart = dateRange.startDate || dateRange.start || dateRange.from;
    explicitEnd = dateRange.endDate || dateRange.end || dateRange.to;
  }

  if (options && typeof options === 'object') {
    if (options.startDate || options.start || options.from) explicitStart = options.startDate || options.start || options.from;
    if (options.endDate || options.end || options.to) explicitEnd = options.endDate || options.end || options.to;
  }

  const todayStr = formatIsoDate(refDate);

  if (rangeType === 'today') {
    return { range: 'today', startDate: todayStr, endDate: todayStr };
  }

  if (rangeType === 'this_month') {
    const y = refDate.getFullYear();
    const m = refDate.getMonth();
    const firstDay = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);
    return {
      range: 'this_month',
      startDate: formatIsoDate(firstDay),
      endDate: formatIsoDate(lastDay)
    };
  }

  if (rangeType === 'last_month') {
    const y = refDate.getFullYear();
    const m = refDate.getMonth();
    const firstDay = new Date(y, m - 1, 1);
    const lastDay = new Date(y, m, 0);
    return {
      range: 'last_month',
      startDate: formatIsoDate(firstDay),
      endDate: formatIsoDate(lastDay)
    };
  }

  if (rangeType === 'custom') {
    const startStr = normalizeStatementDate(explicitStart);
    const endStr = normalizeStatementDate(explicitEnd);
    return {
      range: 'custom',
      startDate: startStr,
      endDate: endStr
    };
  }

  return { range: 'all', startDate: null, endDate: null };
}

/**
 * Generates an account statement with exact integer-paisa opening balance,
 * filtered transactions within dateRange, step-by-step running balance,
 * and closing balance satisfying all mathematical invariants with 0.00 Paisa float drift.
 *
 * Invariant 1 (Customer): closingBalance = openingBalance + totalGiven - totalReceived
 * Invariant 2 (Supplier): closingBalance = openingBalance + totalReceived - totalGiven
 * Invariant 3: When dateRange is 'all' or endDate >= now, closingBalance === account.balance
 * Invariant 4: Zero cross-tenant data leakage under colliding account IDs.
 *
 * @param {Object|string|number} accountOrId Account object or accountId
 * @param {Array|string|number} journalsOrBizId Journals array or businessId
 * @param {string|Object} [dateRange='all'] 'all' | 'today' | 'this_month' | 'last_month' | 'custom'
 * @param {Object} [options={}] Additional options ({ businessId, accounts, journals, referenceDate })
 * @returns {Object} Statement result with openingBalance, closingBalance, journals, metrics
 */
function resolveAccountTxnDirection(j, isCustomer) {
  let isGiven = j.type === 'given' || j.txn_type === 'given';
  let isReceived = j.type === 'received' || j.txn_type === 'received';
  if (!isGiven && !isReceived && (j.txn_type === 1 || j.txn_type === 2 || j.txn_type === '1' || j.txn_type === '2')) {
    const numType = Number(j.txn_type);
    if (isCustomer) {
      isGiven = numType === 1;
      isReceived = numType === 2;
    } else {
      isReceived = numType === 1;
      isGiven = numType === 2;
    }
  }
  return { isGiven, isReceived };
}

function generateAccountStatement(accountOrId, journalsOrBizId, dateRange = 'all', options = {}) {
  let account = null;
  let allJournals = [];
  let businessId = null;

  if (accountOrId && typeof accountOrId === 'object' && !Array.isArray(accountOrId)) {
    account = accountOrId;
    allJournals = Array.isArray(journalsOrBizId) ? journalsOrBizId : (options.journals || []);
    businessId = String(account.businessId !== undefined && account.businessId !== null
      ? account.businessId
      : (account.business_id !== undefined && account.business_id !== null ? account.business_id : (options.businessId || '1')));
  } else {
    const targetAccId = String(accountOrId);
    businessId = (typeof journalsOrBizId === 'string' || typeof journalsOrBizId === 'number')
      ? String(journalsOrBizId)
      : String(options.businessId || '1');
    allJournals = Array.isArray(options.journals) ? options.journals : (Array.isArray(journalsOrBizId) ? journalsOrBizId : []);
    if (Array.isArray(options.accounts)) {
      account = options.accounts.find(a => String(a.id) === targetAccId && String(a.businessId || a.business_id || '1') === businessId) || null;
    }
    if (!account) {
      account = { id: targetAccId, name: options.name || 'Account', type: options.type || 1, businessId };
    }
  }

  const targetAccId = String(account.id);
  const targetBizId = String(businessId || '1');
  const isCustomer = (Number(account.type) || 1) === 1;

  // Filter journals strictly scoped to target account and target business
  const targetJournals = [];
  for (let i = 0; i < allJournals.length; i++) {
    const j = allJournals[i];
    if (!j) continue;
    const jAccId = String(j.accountId !== undefined && j.accountId !== null
      ? j.accountId
      : (j.orig_account_id !== undefined && j.orig_account_id !== null ? j.orig_account_id : ''));
    const jBizId = String(j.businessId !== undefined && j.businessId !== null
      ? j.businessId
      : (j.business_id !== undefined && j.business_id !== null ? j.business_id : '1'));

    if (jAccId === targetAccId && jBizId === targetBizId) {
      targetJournals.push({ ...j });
    }
  }

  // Sort chronologically ascending
  sortJournalsChronologically(targetJournals);

  // Resolve date range
  const refDate = options.referenceDate || new Date();
  const resolvedRange = resolveStatementDateRange(dateRange, options, refDate);
  const { startDate, endDate } = resolvedRange;

  // Partition into prior, in-range, and future
  const priorJournals = [];
  const rangeJournals = [];
  const futureJournals = [];

  for (let i = 0; i < targetJournals.length; i++) {
    const j = targetJournals[i];
    const jDate = normalizeStatementDate(j.date || j.txn_date || j.createdAt || j.create_date) || '';

    if (startDate && jDate < startDate) {
      priorJournals.push(j);
    } else if (endDate && jDate > endDate) {
      futureJournals.push(j);
    } else {
      rangeJournals.push(j);
    }
  }

  // Initial account opening balance in integer paisa
  let initialOpeningBal = 0;
  if (account.openingBalance !== undefined && account.openingBalance !== null) {
    initialOpeningBal = Number(account.openingBalance) || 0;
  } else if (account.opening_balance !== undefined && account.opening_balance !== null) {
    initialOpeningBal = Number(account.opening_balance) || 0;
  } else if (account.start_balance !== undefined && account.start_balance !== null) {
    initialOpeningBal = Number(account.start_balance) || 0;
  } else if (account.startBalance !== undefined && account.startBalance !== null) {
    initialOpeningBal = Number(account.startBalance) || 0;
  } else if (account.initialBalance !== undefined && account.initialBalance !== null) {
    initialOpeningBal = Number(account.initialBalance) || 0;
  }

  let runningPaisa = Math.round(initialOpeningBal * 100);
  const getTxnDirection = (j) => resolveAccountTxnDirection(j, isCustomer);

  // 1. Roll forward running balance through prior transactions to compute exact opening balance
  for (let i = 0; i < priorJournals.length; i++) {
    const j = priorJournals[i];
    const numAmt = Number(j.amount !== undefined && j.amount !== null ? j.amount : j.amount_received) || 0;
    const amtPaisa = Math.round(numAmt * 100);
    const { isGiven, isReceived } = getTxnDirection(j);

    if (isCustomer) {
      if (isGiven) runningPaisa += amtPaisa;
      else if (isReceived) runningPaisa -= amtPaisa;
    } else {
      if (isReceived) runningPaisa += amtPaisa;
      else if (isGiven) runningPaisa -= amtPaisa;
    }
  }

  const openingBalancePaisa = runningPaisa;
  const openingBalance = openingBalancePaisa / 100;

  // 2. Roll forward through range transactions
  let periodGivenPaisa = 0;
  let periodReceivedPaisa = 0;
  const statementJournals = [];

  for (let i = 0; i < rangeJournals.length; i++) {
    const j = rangeJournals[i];
    const numAmt = Number(j.amount !== undefined && j.amount !== null ? j.amount : j.amount_received) || 0;
    const amtPaisa = Math.round(numAmt * 100);
    const { isGiven, isReceived } = getTxnDirection(j);

    if (isCustomer) {
      if (isGiven) {
        runningPaisa += amtPaisa;
        periodGivenPaisa += amtPaisa;
      } else if (isReceived) {
        runningPaisa -= amtPaisa;
        periodReceivedPaisa += amtPaisa;
      }
    } else {
      if (isReceived) {
        runningPaisa += amtPaisa;
        periodReceivedPaisa += amtPaisa;
      } else if (isGiven) {
        runningPaisa -= amtPaisa;
        periodGivenPaisa += amtPaisa;
      }
    }

    statementJournals.push({
      ...j,
      runningBalance: runningPaisa / 100,
      amount: amtPaisa / 100,
    });
  }

  const closingBalancePaisa = runningPaisa;
  const closingBalance = closingBalancePaisa / 100;

  // Roll forward future journals to compute total full account balance
  let fullAccountBalancePaisa = closingBalancePaisa;
  for (let i = 0; i < futureJournals.length; i++) {
    const j = futureJournals[i];
    const numAmt = Number(j.amount !== undefined && j.amount !== null ? j.amount : j.amount_received) || 0;
    const amtPaisa = Math.round(numAmt * 100);
    const { isGiven, isReceived } = getTxnDirection(j);
    if (isCustomer) {
      if (isGiven) fullAccountBalancePaisa += amtPaisa;
      else if (isReceived) fullAccountBalancePaisa -= amtPaisa;
    } else {
      if (isReceived) fullAccountBalancePaisa += amtPaisa;
      else if (isGiven) fullAccountBalancePaisa -= amtPaisa;
    }
  }
  const currentAccountBalance = fullAccountBalancePaisa / 100;

  const netChangePaisa = isCustomer
    ? (periodGivenPaisa - periodReceivedPaisa)
    : (periodReceivedPaisa - periodGivenPaisa);

  return {
    accountId: targetAccId,
    businessId: targetBizId,
    accountName: account.name || '',
    accountPhone: account.phone || '',
    accountType: Number(account.type) || 1,
    isCustomer,
    dateRange: {
      range: resolvedRange.range,
      startDate: resolvedRange.startDate,
      endDate: resolvedRange.endDate,
    },
    openingBalance,
    closingBalance,
    currentAccountBalance,
    netChange: netChangePaisa / 100,
    totalGiven: periodGivenPaisa / 100,
    totalReceived: periodReceivedPaisa / 100,
    transactionCount: statementJournals.length,
    journals: statementJournals,
    priorCount: priorJournals.length,
    futureCount: futureJournals.length,
    floatDriftPaisa: 0,
  };
}

// --- 3.6. BULK TAGADA BATCH ENGINE & STATEMENT DOCUMENT GENERATOR (REA-ITER-208) ---

/**
 * Calculates telecom SMS segments according to GSM 03.38 & UCS-2 telecom standards:
 * - UCS-2 (Unicode / Bengali): <= 70 chars = 1 segment; > 70 chars = Math.ceil(len / 67) segments
 * - GSM-7 (ASCII): <= 160 chars = 1 segment; > 160 chars = Math.ceil(len / 153) segments
 *
 * @param {string} text Input SMS text
 * @returns {{ charCount: number, segments: number, encoding: 'UCS-2'|'GSM-7', maxSingleSegment: number, maxMultipartSegment: number }}
 */
function calculateSmsSegments(text = '') {
  const str = String(text || '');
  const charCount = str.length;
  if (charCount === 0) {
    return {
      charCount: 0,
      segments: 0,
      encoding: 'GSM-7',
      maxSingleSegment: 160,
      maxMultipartSegment: 153,
    };
  }

  // Detect non-ASCII / Unicode characters (e.g. Bengali Unicode \u0980-\u09FF or any charCode > 127)
  const isUnicode = /[^\u0020-\u007E\r\n\t]/.test(str);

  if (isUnicode) {
    const segments = charCount <= 70 ? 1 : Math.ceil(charCount / 67);
    return {
      charCount,
      segments,
      encoding: 'UCS-2',
      maxSingleSegment: 70,
      maxMultipartSegment: 67,
    };
  }

  const segments = charCount <= 160 ? 1 : Math.ceil(charCount / 153);
  return {
    charCount,
    segments,
    encoding: 'GSM-7',
    maxSingleSegment: 160,
    maxMultipartSegment: 153,
  };
}

/**
 * Retrieves all active customers (type === 1) with positive outstanding debt (balance > 0)
 * strictly scoped to target businessId, sorted descending by balance (highest debt first).
 *
 * @param {string|number} [businessId='1']
 * @param {Array} [accounts=[]]
 * @returns {Array<Object>} Eligible customers sorted descending by balance
 */
function getBulkTagadaEligibleCustomers(businessId = '1', accounts = []) {
  let targetBizId = '1';
  let accList = [];
  if (Array.isArray(businessId)) {
    accList = businessId;
    targetBizId = String(accounts !== undefined && accounts !== null ? accounts : '1');
  } else {
    targetBizId = String(businessId !== undefined && businessId !== null ? businessId : '1');
    accList = Array.isArray(accounts) ? accounts : [];
  }

  const eligible = [];
  for (let i = 0; i < accList.length; i++) {
    const acc = accList[i];
    if (!acc) continue;

    const accBizId = String(acc.businessId !== undefined && acc.businessId !== null
      ? acc.businessId
      : (acc.business_id !== undefined && acc.business_id !== null ? acc.business_id : '1'));

    if (accBizId !== targetBizId) continue;

    // Check account type: customer (type === 1)
    const isCustomer = (Number(acc.type) || 1) === 1 || acc.type === '1' || acc.type === 'customer';
    if (!isCustomer) continue;

    // Check active status
    const isArchived = acc.isArchived === true || acc.is_active === 0 || acc.is_active === '0' || acc.isActive === false;
    if (isArchived) continue;

    // Positive outstanding debt (balance > 0)
    const rawBal = Number(acc.balance !== undefined && acc.balance !== null
      ? acc.balance
      : (acc.current_balance !== undefined && acc.current_balance !== null ? acc.current_balance : (acc.currentBalance || 0))) || 0;

    const cleanBal = Math.round(rawBal * 100) / 100;
    if (cleanBal > 0) {
      eligible.push({
        ...acc,
        balance: cleanBal,
        creditAmount: cleanBal,
      });
    }
  }

  // Sort descending by outstanding balance (highest debt first)
  eligible.sort((a, b) => {
    const balA = Number(a.balance) || 0;
    const balB = Number(b.balance) || 0;
    return balB - balA;
  });

  return eligible;
}

/**
 * Prepares a bulk Tagada batch:
 * - Generates authentic localized Bengali SMS reminders
 * - Calculates telecom SMS character counts & UCS-2 segments
 * - Computes total required quota and compares against available quota
 * - Returns structured batch items with multi-tenant scoping
 *
 * @param {Array<Object|string|number>} customerIdsOrCustomers Customer objects or account IDs
 * @param {Object} [options={}] Options ({ businessId, accounts, businessName, businessPhone, remainingSmsCount, customTemplate, countBySegments })
 * @returns {Object} Batch compilation result
 */
function prepareBulkTagadaBatch(customerIdsOrCustomers = [], options = {}) {
  const targetBizId = String(options.businessId !== undefined && options.businessId !== null ? options.businessId : '1');
  const allAccounts = Array.isArray(options.accounts) ? options.accounts : [];
  const businessName = String(options.businessName || options.business?.name || 'টালিখাতা ডিজিটাল');
  const tagadaType = String(options.tagadaType || 'TAGADA_BY_FREE_SMS');
  const businessPhone = String(options.businessPhone || options.business?.phone || options.ownerPhone || '');
  const remainingQuota = Number(options.remainingSmsCount !== undefined && options.remainingSmsCount !== null
    ? options.remainingSmsCount
    : (options.remainingQuota !== undefined && options.remainingQuota !== null ? options.remainingQuota : 0));

  // Resolve customer objects
  let targetCustomers = [];
  if (Array.isArray(customerIdsOrCustomers)) {
    for (let i = 0; i < customerIdsOrCustomers.length; i++) {
      const item = customerIdsOrCustomers[i];
      if (!item) continue;
      if (typeof item === 'object') {
        targetCustomers.push(item);
      } else {
        const strId = String(item);
        const found = allAccounts.find(a => String(a.id) === strId && String(a.businessId || a.business_id || '1') === targetBizId);
        if (found) {
          targetCustomers.push(found);
        } else {
          targetCustomers.push({ id: strId, name: 'গ্রাহক', balance: 0, businessId: targetBizId });
        }
      }
    }
  }

  let totalDebtPaisa = 0;
  let totalSegments = 0;
  const batchItems = [];

  for (let i = 0; i < targetCustomers.length; i++) {
    const cust = targetCustomers[i];
    const rawBal = Number(cust.balance !== undefined && cust.balance !== null
      ? cust.balance
      : (cust.creditAmount !== undefined && cust.creditAmount !== null
          ? cust.creditAmount
          : (cust.current_balance !== undefined ? cust.current_balance : (cust.currentBalance || 0)))) || 0;
    const cleanBal = Math.round(rawBal * 100) / 100;
    const balPaisa = Math.round(cleanBal * 100);
    totalDebtPaisa += balPaisa;

    const custName = String(cust.name || 'গ্রাহক');
    const custPhone = String(cust.phone || cust.mobile || '');
    const accId = String(cust.id || '');

    // Formulate message
    let message = '';
    if (typeof options.customTemplate === 'function') {
      message = options.customTemplate(cust, { businessName, businessPhone, balance: cleanBal });
    } else if (typeof options.customTemplate === 'string') {
      message = options.customTemplate
        .replace(/\$\{customerName\}/g, custName)
        .replace(/\$\{businessName\}/g, businessName)
        .replace(/\$\{balance\}/g, cleanBal.toFixed(2))
        .replace(/\$\{businessPhone\}/g, businessPhone);
    } else {
      const phoneSnippet = businessPhone ? ` যোগাযোগ: ${businessPhone}` : '';
      message = `আসসালামু আলাইকুম ${custName}, ${businessName}-এ আপনার বকেয়া হিসাব বাবদ মোট ৳ ${cleanBal.toFixed(2)} টাকা পাওনা রয়েছে। অনুগ্রহ করে বকেয়া পরিশোধ করার জন্য অনুরোধ করা হলো। ধন্যবাদ।${phoneSnippet}`;
    }

    const smsInfo = calculateSmsSegments(message);
    totalSegments += smsInfo.segments;

    const itemId = typeof options.generateId === 'function'
      ? options.generateId(cust, i)
      : (cust._tagadaId || generateUniqueId('tag_'));

    batchItems.push({
      id: itemId,
      account_id: isNaN(Number(accId)) ? accId : Number(accId),
      accountId: accId,
      customerName: custName,
      name: custName,
      phone: custPhone,
      credit_amount: cleanBal,
      creditAmount: cleanBal,
      balance: cleanBal,
      message,
      text: message,
      charCount: smsInfo.charCount,
      segments: smsInfo.segments,
      encoding: smsInfo.encoding,
      tagada_type: tagadaType,
      tagadaType,
      synced: 0,
      business_id: isNaN(Number(targetBizId)) ? targetBizId : Number(targetBizId),
      businessId: targetBizId,
      create_date: options.createDate || new Date().toISOString(),
      createDate: options.createDate || new Date().toISOString(),
    });
  }

  const countBySegments = options.countBySegments === true;
  const requiredQuota = countBySegments ? totalSegments : batchItems.length;
  const hasSufficientQuota = remainingQuota >= requiredQuota;
  const quotaShortfall = Math.max(0, requiredQuota - remainingQuota);

  return {
    businessId: targetBizId,
    businessName,
    businessPhone,
    totalRecipients: batchItems.length,
    totalDebtAmount: totalDebtPaisa / 100,
    totalSegmentsRequired: totalSegments,
    availableQuota: remainingQuota,
    requiredQuota,
    hasSufficientQuota,
    quotaShortfall,
    countBySegments,
    batchItems,
    items: batchItems,
  };
}

/**
 * Compiles a comprehensive printable/exportable receipt structure with business metadata,
 * merchant phone, customer profile, date-range headers, itemized transaction list
 * with running balances (0.00 Paisa float drift), aggregate metrics, and localized Bengali summary copy.
 *
 * @param {Object|string|number} accountOrId Account object or accountId
 * @param {Array|string|number} journalsOrBizId Journals array or businessId
 * @param {string|Object} [dateRange='all'] 'all' | 'today' | 'this_month' | 'last_month' | 'custom'
 * @param {Object} [options={}] Additional presentation options ({ businessName, businessPhone, businessAddress, referenceDate })
 * @returns {Object} Comprehensive statement document payload
 */
function generateStatementDocumentPayload(accountOrId, journalsOrBizId, dateRange = 'all', options = {}) {
  const stmt = generateAccountStatement(accountOrId, journalsOrBizId, dateRange, options);

  const refDate = options.referenceDate instanceof Date && !isNaN(options.referenceDate.getTime())
    ? options.referenceDate
    : new Date();

  const businessName = String(options.businessName || options.business?.name || 'টালিখাতা ডিজিটাল');
  const businessOwner = String(options.businessOwner || options.business?.owner || '');
  const businessPhone = String(options.businessPhone || options.business?.phone || '');
  const businessAddress = String(options.businessAddress || options.business?.address || '');

  const accountName = String(stmt.accountName || options.accountName || 'গ্রাহক');
  const accountPhone = String(stmt.accountPhone || options.accountPhone || '');
  const accountAddress = String(options.accountAddress || '');

  // Bengali range label mapping
  let rangeLabel = 'সকল লেনদেন';
  if (stmt.dateRange.range === 'today') {
    rangeLabel = `আজ (${stmt.dateRange.startDate || ''})`;
  } else if (stmt.dateRange.range === 'this_month') {
    rangeLabel = `চলতি মাস (${stmt.dateRange.startDate || ''} থেকে ${stmt.dateRange.endDate || ''})`;
  } else if (stmt.dateRange.range === 'last_month') {
    rangeLabel = `গত মাস (${stmt.dateRange.startDate || ''} থেকে ${stmt.dateRange.endDate || ''})`;
  } else if (stmt.dateRange.range === 'custom') {
    rangeLabel = `${stmt.dateRange.startDate || 'শুরু'} থেকে ${stmt.dateRange.endDate || 'বর্তমান'}`;
  }

  // Balance status label
  let balanceStatusLabel = 'পরিশোধিত';
  if (stmt.closingBalance > 0) {
    balanceStatusLabel = stmt.isCustomer ? 'মোট পাওনা বকেয়া' : 'মোট দেনা বকেয়া';
  } else if (stmt.closingBalance < 0) {
    balanceStatusLabel = stmt.isCustomer ? 'অগ্রিম জমা' : 'অগ্রিম পাওনা';
  }

  const title = stmt.isCustomer ? 'বকেয়া হিসাব বিবরণী' : 'দেনা হিসাব বিবরণী';

  // Itemized entries
  const entries = (stmt.journals || []).map((j, idx) => {
    let isGiven = j.type === 'given' || j.txn_type === 'given';
    let isReceived = j.type === 'received' || j.txn_type === 'received';
    if (!isGiven && !isReceived && (j.txn_type === 1 || j.txn_type === 2 || j.txn_type === '1' || j.txn_type === '2')) {
      const numType = Number(j.txn_type);
      if (stmt.isCustomer) {
        isGiven = numType === 1;
        isReceived = numType === 2;
      } else {
        isReceived = numType === 1;
        isGiven = numType === 2;
      }
    }

    const numAmt = Number(j.amount !== undefined && j.amount !== null ? j.amount : j.amount_received) || 0;
    const cleanAmt = Math.round(numAmt * 100) / 100;
    const runningBal = Number(j.runningBalance !== undefined ? j.runningBalance : 0);

    const debit = (stmt.isCustomer && isGiven) || (!stmt.isCustomer && isReceived) ? cleanAmt : 0;
    const credit = (stmt.isCustomer && isReceived) || (!stmt.isCustomer && isGiven) ? cleanAmt : 0;

    const directionLabel = isGiven ? 'দিলাম' : 'পেলাম';
    const desc = j.description || j.desc || j.notes || (isGiven
      ? (stmt.isCustomer ? 'বাকি দিলাম' : 'পাওনা শোধ')
      : (stmt.isCustomer ? 'বাকি আদায়' : 'বাকি নিলাম'));

    return {
      index: idx + 1,
      id: j.id || `entry_${idx + 1}`,
      date: j.date || j.txn_date || j.createdAt || '',
      formattedDate: j.date || j.txn_date || '',
      description: String(desc),
      type: isGiven ? 'given' : 'received',
      directionLabel,
      debit,
      credit,
      amount: cleanAmt,
      amountFormatted: `৳ ${cleanAmt.toFixed(2)}`,
      runningBalance: runningBal,
      runningBalanceFormatted: `৳ ${runningBal.toFixed(2)}`,
    };
  });

  const summaryBanner = `${businessName} | ${title} | ${accountName} | সমাপনী জের: ৳ ${stmt.closingBalance.toFixed(2)} (${balanceStatusLabel})`;

  const sep = '--------------------------------';
  const shareLines = [
    `📋 *${title}*`,
    `দোকান: ${businessName}`,
    businessPhone ? `মোবাইল: ${businessPhone}` : null,
    `নাম: ${accountName}${accountPhone ? ' (' + accountPhone + ')' : ''}`,
    `সময়কাল: ${rangeLabel}`,
    sep,
    `শুরুর জের: ৳ ${stmt.openingBalance.toFixed(2)}`,
    `মোট দিলাম: ৳ ${stmt.totalGiven.toFixed(2)}`,
    `মোট পেলাম: ৳ ${stmt.totalReceived.toFixed(2)}`,
    sep,
    `সমাপনী জের: ৳ ${stmt.closingBalance.toFixed(2)} (${balanceStatusLabel})`,
    sep,
    `ধন্যবাদ, ${businessName}`,
    businessPhone ? `যোগাযোগ: ${businessPhone}` : null,
  ].filter(Boolean);
  const shareableText = shareLines.join('\n');

  return {
    documentId: options.documentId || generateUniqueId('stmt_doc_'),
    docType: 'ACCOUNT_STATEMENT',
    version: '1.0',
    generatedAt: refDate.toISOString(),
    generatedDate: formatIsoDate(refDate),
    generatedTime: refDate.toTimeString().slice(0, 8),
    business: {
      id: String(stmt.businessId),
      name: businessName,
      owner: businessOwner,
      phone: businessPhone,
      address: businessAddress,
    },
    account: {
      id: stmt.accountId,
      name: accountName,
      phone: accountPhone,
      address: accountAddress,
      type: stmt.accountType,
      isCustomer: stmt.isCustomer,
      typeLabel: stmt.isCustomer ? 'গ্রাহক' : 'সরবরাহকারী',
      businessId: String(stmt.businessId),
    },
    dateRange: {
      range: stmt.dateRange.range,
      startDate: stmt.dateRange.startDate,
      endDate: stmt.dateRange.endDate,
      label: rangeLabel,
    },
    summary: {
      openingBalance: stmt.openingBalance,
      closingBalance: stmt.closingBalance,
      currentAccountBalance: stmt.currentAccountBalance,
      netChange: stmt.netChange,
      totalGiven: stmt.totalGiven,
      totalReceived: stmt.totalReceived,
      transactionCount: stmt.transactionCount,
      floatDriftPaisa: 0,
      currencySymbol: '৳',
      balanceStatusLabel,
    },
    itemizedEntries: entries,
    itemizedLedger: entries,
    shareableText,
    title,
    presentation: {
      title,
      balanceStatusLabel,
      summaryBanner,
      shareableText,
    },
    rawStatement: stmt,
  };
}

// --- 4. CASHBOX SYNCHRONIZATION & REFERENTIAL INTEGRITY ---
function syncCashboxForTransaction(txn, account, cashEntries = []) {
  if (!txn || !account) return Array.isArray(cashEntries) ? cashEntries : [];
  if (!Array.isArray(cashEntries)) cashEntries = [];

  const isCust = account.type === 1;

  // Determine transaction mode: 1 = Cash (নগদ), 2 = Digital/Wallet (ডিজিটাল)
  // Non-cash / digital adjustments bypass cashbox entry
  const isDigital = txn.isDigital === true ||
                    txn.txn_mode === 2 ||
                    txn.txn_mode === '2' ||
                    txn.txn_mode === 'digital' ||
                    txn.txn_mode === 'bank' ||
                    txn.txn_mode === 'mfs';
  const isCash = !isDigital && (
    txn.txn_mode === 1 ||
    txn.txn_mode === '1' ||
    txn.txn_mode === 'cash' ||
    txn.txn_mode === 'CASH' ||
    txn.txn_mode === undefined ||
    txn.txn_mode === null
  );

  // Determine transaction nature: payment vs credit
  // Customer: type 'received' or txn_type 2 is payment collection (baki aday) -> cash in
  // Supplier: type 'given' or txn_type 2 is supplier payment (powna porishodh) -> cash out
  // Credit entries (txn_type === 1 / baki dewa/neya) do not affect cashbox
  let isPayment = false;
  if (txn.type === 'received') {
    isPayment = isCust;
  } else if (txn.type === 'given') {
    isPayment = !isCust;
  } else if (txn.txn_type === 2 || txn.txn_type === '2') {
    isPayment = true;
  } else if (txn.txn_type === (isCust ? 'received' : 'given')) {
    isPayment = true;
  }

  const requiresCashIn = isCash && isCust && isPayment;
  const requiresCashOut = isCash && !isCust && isPayment;
  const requiresEntry = requiresCashIn || requiresCashOut;

  const strTxnId = String(txn.id);
  const existingIdx = cashEntries.findIndex((c) => String(c.linkedTxnId) === strTxnId);

  if (requiresEntry) {
    const entryType = requiresCashIn ? 'in' : 'out';
    const entryCategory = requiresCashIn ? 'baki_aday' : 'supplier_pay';
    const entryDesc = `${account.name || ''} (${requiresCashIn ? 'বাকি আদায়' : 'পাওনা পরিশোধ'})`;

    const rawAmt = (txn.amount_received !== undefined && txn.amount_received !== null && Number(txn.amount_received) > 0)
      ? Number(txn.amount_received)
      : (Number(txn.amount) || 0);
    const cleanAmount = Math.round(rawAmt * 100) / 100;

    const bizId = String(
      account.businessId ||
      account.business_id ||
      txn.businessId ||
      txn.business_id ||
      '1'
    );

    const linkedEntry = {
      id: existingIdx >= 0 ? cashEntries[existingIdx].id : 'c_' + strTxnId,
      businessId: bizId,
      business_id: isNaN(Number(bizId)) ? bizId : Number(bizId),
      linkedTxnId: strTxnId,
      category: entryCategory,
      type: entryType,
      amount: cleanAmount,
      desc: (txn.desc && txn.desc.trim()) ? txn.desc.trim() : ((txn.description && txn.description.trim()) ? txn.description.trim() : entryDesc),
      date: txn.date || txn.txn_date || '',
      txn_date: txn.txn_date || txn.date || '',
      time: txn.time || '',
      txn_mode: 1,
    };

    if (existingIdx >= 0) {
      const copy = [...cashEntries];
      copy[existingIdx] = linkedEntry;
      return copy;
    } else {
      return [linkedEntry, ...cashEntries];
    }
  } else {
    // Non-cash mode (digital, bank, mfs) or credit entry:
    // If an existing linked cashbox entry exists, safely remove it to maintain referential integrity.
    if (existingIdx >= 0) {
      return cashEntries.filter((c) => String(c.linkedTxnId) !== strTxnId);
    }
    return cashEntries;
  }
}

function removeCashEntriesForTransactions(txnIds = [], cashEntries = []) {
  if (!txnIds || txnIds.length === 0) return cashEntries;
  const idSet = new Set(txnIds.map(String));
  return cashEntries.filter((c) => !c.linkedTxnId || !idSet.has(String(c.linkedTxnId)));
}

// --- 5. DATA MIGRATION: V5 TO V6 ---
const V5_KEY = 'tallykhata_offline_store_v5';
const V6_KEY = 'tallykhata_offline_store_v6';
const V5_BACKUP_KEY = 'tallykhata_offline_store_v5_backup';

function migrateV5toV6(rawV5Data) {
  try {
    let v5 = typeof rawV5Data === 'string' ? JSON.parse(rawV5Data) : rawV5Data;
    if (!v5 || typeof v5 !== 'object') {
      return { success: false, error: 'Invalid v5 data structure: expected object' };
    }

    const rawAccounts = Array.isArray(v5.accounts) ? [...v5.accounts] : [];
    let journals = Array.isArray(v5.journals) ? [...v5.journals] : [];
    let cashEntries = Array.isArray(v5.cashEntries) ? [...v5.cashEntries] : [];
    const inventory = Array.isArray(v5.inventory) ? [...v5.inventory] : [];
    const notes = Array.isArray(v5.notes) ? [...v5.notes] : [];
    const walletTxns = Array.isArray(v5.walletTxns) ? [...v5.walletTxns] : [];
    const businesses = Array.isArray(v5.businesses) ? [...v5.businesses] : [];

    const updatedAccounts = [];
    for (let rawAcc of rawAccounts) {
      const acc = { ...rawAcc };

      // 1. If openingBalance is already explicitly defined, preserve it
      if (acc.openingBalance !== undefined && acc.openingBalance !== null && !isNaN(Number(acc.openingBalance))) {
        acc.openingBalance = Number(acc.openingBalance);
      } else {
        // 2. Establish baseline if stored balance is present
        if (acc.hasDiscrepancy || acc.unresolvableDiscrepancy) {
          acc.openingBalance = 0;
          acc.legacyStoredBalance = acc.balance;
          acc.hasDiscrepancy = true;
          acc.discrepancyReason = 'Unresolvable difference between stored balance and journal history';
        } else {
          acc.openingBalance = establishAccountOpeningBalance(acc, journals);
        }
      }

      const { updatedAccount, updatedJournals } = recalculateAccountRunningBalances(acc, journals);
      updatedAccounts.push(updatedAccount);
      journals = updatedJournals;
    }

    const v6Data = {
      accounts: updatedAccounts,
      journals,
      cashEntries,
      inventory,
      notes,
      walletTxns,
      walletBalance: Number(v5.walletBalance) || 0,
      businessName: v5.businessName === 'আমার ব্যবসা প্রতিষ্ঠান' ? 'Mobile Xpress' : (v5.businessName || 'Mobile Xpress'),
      ownerName: v5.ownerName || 'স্বত্বাধিকারী',
      ownerPhone: v5.ownerPhone || '01700000000',
      businessAddress: v5.businessAddress || 'বাজার রোড, ঢাকা',
      businesses: businesses.length > 0 ? businesses : [
        { id: '1', name: 'Mobile Xpress', owner: 'স্বত্বাধিকারী', phone: '01700000000', address: 'বাজার রোড, ঢাকা', isSelected: true },
        { id: '2', name: 'মেসার্স ভাই ভাই এন্টারপ্রাইজ', owner: 'হাজী মো: করিম', phone: '01811223344', address: 'পাইকারি আড়ৎ, ঢাকা', isSelected: false },
        { id: '3', name: 'সোনালী ফ্যাশন ও বস্ত্রালয়', owner: 'আহমেদ উল্লাহ', phone: '01911334455', address: 'নিউ মার্কেট, ঢাকা', isSelected: false },
      ],
      remainingSmsCount: v5.remainingSmsCount !== undefined ? Number(v5.remainingSmsCount) : 5,
      openingBalance: v5.openingBalance !== undefined ? Number(v5.openingBalance) : 3000,
      pinEnabled: Boolean(v5.pinEnabled),
      appPin: v5.appPin || '',
      tagadaLogs: Array.isArray(v5.tagadaLogs) ? v5.tagadaLogs : [],
      version: 6,
      migrationVersion: 6,
      migratedAt: new Date().toISOString(),
    };

    return {
      success: true,
      data: v6Data,
      stats: {
        accountsCount: updatedAccounts.length,
        journalsCount: journals.length,
        cashEntriesCount: cashEntries.length,
        inventoryCount: inventory.length,
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}


// Calculation memoization caches (Phase 11 Performance Optimization)
let _aggregateMetricsCache = new WeakMap();
let _cashboxSummaryCache = new WeakMap();

function clearLedgerCalculationCaches() {
  _aggregateMetricsCache = new WeakMap();
  _cashboxSummaryCache = new WeakMap();
}

function resetCache() {
  clearLedgerCalculationCaches();
}

function calculateAggregateMetrics(accounts = [], journals = [], businessId = null) {
  if (typeof journals === 'string' && businessId === null) {
    businessId = journals;
    journals = [];
  }
  if (Array.isArray(accounts)) {
    let bizCache = _aggregateMetricsCache.get(accounts);
    const key = String(businessId || 'all');
    if (bizCache && bizCache.has(key)) {
      const entry = bizCache.get(key);
      if (entry && entry.__len === accounts.length) {
        return entry.result;
      }
    }
  }

  let totalReceivablePaisa = 0;
  let totalPayablePaisa = 0;
  let customerCount = 0;
  let supplierCount = 0;

  for (const acc of accounts) {
    if (!acc) continue;
    const accBiz = acc.businessId !== undefined && acc.businessId !== null ? acc.businessId : acc.business_id;
    if (businessId && accBiz && String(accBiz) !== String(businessId)) {
      continue;
    }
    const bal = Number(acc.balance) || 0;
    const balPaisa = Math.round(bal * 100);
    if (acc.type === 1) {
      customerCount++;
      if (balPaisa > 0) totalReceivablePaisa += balPaisa;
    } else if (acc.type === 2) {
      supplierCount++;
      if (balPaisa > 0) totalPayablePaisa += balPaisa;
    }
  }

  const result = {
    totalReceivable: totalReceivablePaisa / 100,
    totalPayable: totalPayablePaisa / 100,
    netBalance: (totalReceivablePaisa - totalPayablePaisa) / 100,
    customerCount,
    supplierCount,
  };

  if (Array.isArray(accounts)) {
    let bizCache = _aggregateMetricsCache.get(accounts);
    if (!bizCache) {
      bizCache = new Map();
      _aggregateMetricsCache.set(accounts, bizCache);
    }
    bizCache.set(String(businessId || 'all'), { result, __len: accounts.length });
  }

  return result;
}

function deriveCashBoxSummary(cashEntries = [], businessId = null) {
  if (Array.isArray(cashEntries)) {
    let bizCache = _cashboxSummaryCache.get(cashEntries);
    const key = String(businessId || 'all');
    if (bizCache && bizCache.has(key)) {
      const entry = bizCache.get(key);
      if (entry && entry.__len === cashEntries.length) {
        return entry.result;
      }
    }
  }

  let totalInPaisa = 0;
  let totalOutPaisa = 0;

  for (const entry of cashEntries) {
    if (!entry) continue;
    const entryBiz = entry.businessId !== undefined && entry.businessId !== null ? entry.businessId : entry.business_id;
    if (businessId && entryBiz && String(entryBiz) !== String(businessId)) {
      continue;
    }
    const numAmt = Number(entry.amount) || 0;
    const amtPaisa = Math.round(numAmt * 100);
    if (entry.type === 'in') {
      totalInPaisa += amtPaisa;
    } else if (entry.type === 'out') {
      totalOutPaisa += amtPaisa;
    }
  }

  const cashIn = totalInPaisa / 100;
  const cashOut = totalOutPaisa / 100;
  const balance = (totalInPaisa - totalOutPaisa) / 100;

  const result = {
    cashIn,
    cashOut,
    balance,
    netCash: balance,
  };

  if (Array.isArray(cashEntries)) {
    let bizCache = _cashboxSummaryCache.get(cashEntries);
    if (!bizCache) {
      bizCache = new Map();
      _cashboxSummaryCache.set(cashEntries, bizCache);
    }
    bizCache.set(String(businessId || 'all'), { result, __len: cashEntries.length });
  }

  return result;
}

function indexJournalsByAccount(allJournals = [], businessId = null) {
  const map = new Map();
  for (const j of allJournals) {
    if (!j) continue;
    const accId = j.accountId !== undefined && j.accountId !== null ? j.accountId : j.orig_account_id;
    if (accId === undefined || accId === null) continue;
    const effectiveBizId = j.businessId !== undefined && j.businessId !== null
      ? j.businessId
      : (j.business_id !== undefined && j.business_id !== null ? j.business_id : (businessId || '1'));
    if (businessId && String(effectiveBizId) !== String(businessId)) {
      continue;
    }
    const key = `${effectiveBizId}:${accId}`;
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(j);

    if (businessId) {
      const plainKey = String(accId);
      if (!map.has(plainKey)) {
        map.set(plainKey, []);
      }
      map.get(plainKey).push(j);
    }
  }
  return map;
}


/**
 * Creates an O(1) account lookup Map by string ID.
 */
function createAccountLookupMap(accounts = []) {
  const map = new Map();
  for (let i = 0; i < accounts.length; i++) {
    const a = accounts[i];
    if (a && a.id !== undefined && a.id !== null) {
      map.set(String(a.id), a);
    }
  }
  return map;
}

/**
 * Fast single-pass customer query with filtering and search.
 */
function queryCustomerAccounts(accounts = [], options = {}) {
  const { type = 1, filter = 'all', searchQuery = '', businessId = null } = options;
  const q = searchQuery ? searchQuery.toLowerCase().trim() : '';

  const results = [];
  for (let i = 0; i < accounts.length; i++) {
    const a = accounts[i];
    if (!a) continue;
    if (businessId && a.businessId && String(a.businessId) !== String(businessId)) continue;
    if (type !== 'all' && a.type !== type && a.account_type !== type) continue;
    const bal = Number(a.balance) || 0;
    if (filter === 'due' && bal <= 0) continue;
    if (q) {
      const mName = (a.name || '').toLowerCase().includes(q);
      const mPhone = (a.phone || a.contact || a.mobile || '').includes(q);
      if (!mName && !mPhone) continue;
    }
    results.push(a);
  }

  if (filter === 'highest') {
    results.sort((a, b) => (Number(b.balance) || 0) - (Number(a.balance) || 0));
  }
  return results;
}

/**
 * Normalizes Tagada audit log records across Room DB schema and React Native state.
 * Reference Room DB: CREATE TABLE tagada_log (id, account_id, create_date, credit_amount, tagada_type, synced)
 * 
 * @param {Object} rawLog Raw Tagada log record (snake_case or camelCase)
 * @returns {Object} Canonical normalized log object preserving both field conventions
 */
function normalizeTagadaLogFields(rawLog = {}) {
  if (!rawLog || typeof rawLog !== 'object') return null;

  const accId = rawLog.account_id !== undefined && rawLog.account_id !== null
    ? rawLog.account_id
    : (rawLog.accountId !== undefined && rawLog.accountId !== null ? rawLog.accountId : null);

  const rawAmt = rawLog.credit_amount !== undefined && rawLog.credit_amount !== null
    ? Number(rawLog.credit_amount)
    : (rawLog.creditAmount !== undefined && rawLog.creditAmount !== null
        ? Number(rawLog.creditAmount)
        : (rawLog.amount !== undefined && rawLog.amount !== null ? Number(rawLog.amount) : 0));
  const cleanAmt = Math.round((Number.isFinite(rawAmt) ? rawAmt : 0) * 100) / 100;

  const rawDate = rawLog.create_date || rawLog.createDate || rawLog.date || new Date().toISOString();
  const rawType = rawLog.tagada_type || rawLog.tagadaType || rawLog.type || 'TAGADA_BY_FREE_SMS';
  const synced = rawLog.synced !== undefined && rawLog.synced !== null ? Number(rawLog.synced) : 0;

  const bizId = rawLog.business_id !== undefined && rawLog.business_id !== null
    ? String(rawLog.business_id)
    : (rawLog.businessId !== undefined && rawLog.businessId !== null ? String(rawLog.businessId) : '1');

  const strDate = rawDate.includes('T') ? rawDate.split('T')[0] : (rawDate.split(' ')[0] || rawDate);

  return {
    ...rawLog,
    id: rawLog.id !== undefined && rawLog.id !== null ? rawLog.id : generateUniqueId('tag_'),
    account_id: isNaN(Number(accId)) ? accId : Number(accId),
    accountId: String(accId || ''),
    create_date: rawDate,
    createDate: rawDate,
    date: rawLog.date || strDate,
    time: rawLog.time || (rawDate.includes('T') ? rawDate.split('T')[1].slice(0, 5) : ''),
    credit_amount: cleanAmt,
    creditAmount: cleanAmt,
    amount: cleanAmt,
    tagada_type: String(rawType),
    tagadaType: String(rawType),
    synced: synced === 1 ? 1 : 0,
    business_id: isNaN(Number(bizId)) ? bizId : Number(bizId),
    businessId: bizId,
  };
}

function normalizeBusinessFields(rawBiz) {
  if (!rawBiz || typeof rawBiz !== 'object') return null;

  const rawId = rawBiz.id !== undefined && rawBiz.id !== null ? rawBiz.id : '1';
  const name = rawBiz.business_name || rawBiz.businessName || rawBiz.name || '';
  const address = rawBiz.business_address || rawBiz.businessAddress || rawBiz.address || '';
  const type = rawBiz.business_type || rawBiz.businessType || rawBiz.type || 'RETAIL';
  const age = rawBiz.business_age !== undefined && rawBiz.business_age !== null
    ? Number(rawBiz.business_age)
    : (rawBiz.businessAge !== undefined ? Number(rawBiz.businessAge) : 0);

  const isActive = rawBiz.is_active !== undefined && rawBiz.is_active !== null
    ? (Number(rawBiz.is_active) === 1 ? 1 : 0)
    : (rawBiz.isArchived ? 0 : 1);

  const isCurrent = rawBiz.is_current !== undefined && rawBiz.is_current !== null
    ? (Number(rawBiz.is_current) === 1 ? 1 : 0)
    : (rawBiz.isSelected ? 1 : 0);

  const isPrimary = rawBiz.is_primary !== undefined && rawBiz.is_primary !== null
    ? (Number(rawBiz.is_primary) === 1 ? 1 : 0)
    : (rawBiz.isPrimary ? 1 : (String(rawId) === '1' ? 1 : 0));

  const synced = rawBiz.synced !== undefined && rawBiz.synced !== null ? Number(rawBiz.synced) : 0;
  const createDate = rawBiz.create_date || rawBiz.createDate || rawBiz.createdAt || new Date().toISOString();
  const updateDate = rawBiz.update_date || rawBiz.updateDate || rawBiz.updatedAt || null;
  const syncDate = rawBiz.sync_date || rawBiz.syncDate || null;
  const owner = rawBiz.owner || rawBiz.ownerName || 'স্বত্বাধিকারী';
  const phone = rawBiz.phone || rawBiz.ownerPhone || '';
  const comment = rawBiz.comment || null;

  return {
    ...rawBiz,
    id: String(rawId),
    business_id: isNaN(Number(rawId)) ? rawId : Number(rawId),
    business_name: String(name),
    businessName: String(name),
    name: String(name),
    business_address: String(address),
    businessAddress: String(address),
    address: String(address),
    business_type: String(type),
    businessType: String(type),
    business_age: Number.isFinite(age) ? age : 0,
    businessAge: Number.isFinite(age) ? age : 0,
    synced: synced === 1 ? 1 : 0,
    is_active: isActive,
    isArchived: isActive === 0,
    is_current: isCurrent,
    isSelected: isCurrent === 1,
    is_primary: isPrimary,
    isPrimary: isPrimary === 1,
    owner: String(owner),
    phone: String(phone),
    create_date: createDate,
    createDate: createDate,
    createdAt: createDate,
    update_date: updateDate,
    updateDate: updateDate,
    updatedAt: updateDate,
    sync_date: syncDate,
    syncDate: syncDate,
    comment: comment,
  };
}
function normalizeAccountFields(rawAccount, defaultBusinessId = '1') {
  if (!rawAccount || typeof rawAccount !== 'object') return null;

  const rawId = rawAccount.id !== undefined && rawAccount.id !== null ? rawAccount.id : '';
  const strId = String(rawId);

  // 1. Account Name
  const name = rawAccount.name ? String(rawAccount.name).trim() : '';

  // 2. Contact / Phone / Mobile normalization
  const contact = rawAccount.contact || rawAccount.phone || rawAccount.mobile || '';
  const strContact = String(contact).trim();

  // 3. Account Type: 1 = Customer, 2 = Supplier
  let accountType = 1;
  if (rawAccount.type === 2 || rawAccount.type === '2' || String(rawAccount.type).toLowerCase() === 'supplier') {
    accountType = 2;
  } else if (rawAccount.type === 1 || rawAccount.type === '1' || String(rawAccount.type).toLowerCase() === 'customer') {
    accountType = 1;
  } else if (Number.isFinite(Number(rawAccount.type))) {
    accountType = Number(rawAccount.type);
  }

  // 4. Multi-business Tenancy Isolation (businessId / business_id)
  const resolvedBizId = rawAccount.businessId !== undefined && rawAccount.businessId !== null
    ? String(rawAccount.businessId)
    : (rawAccount.business_id !== undefined && rawAccount.business_id !== null
      ? String(rawAccount.business_id)
      : String(defaultBusinessId));

  // 5. Monetary Baseline with Integer-Paisa Precision (1 Taka = 100 Paisa)
  const rawStart = rawAccount.start_balance !== undefined && rawAccount.start_balance !== null
    ? rawAccount.start_balance
    : (rawAccount.startBalance !== undefined && rawAccount.startBalance !== null
        ? rawAccount.startBalance
        : (rawAccount.openingBalance !== undefined && rawAccount.openingBalance !== null
            ? rawAccount.openingBalance
            : (rawAccount.initialBalance !== undefined && rawAccount.initialBalance !== null
                ? rawAccount.initialBalance
                : 0)));
  const cleanStart = Math.round((Number(rawStart) || 0) * 100) / 100;

  // Stored / Current balance
  let cleanBalance = cleanStart;
  if (rawAccount.balance !== undefined && rawAccount.balance !== null && !isNaN(Number(rawAccount.balance))) {
    cleanBalance = Math.round(Number(rawAccount.balance) * 100) / 100;
  }

  // 6. Dates & Timeline
  const acDate = rawAccount.ac_date || rawAccount.date || rawAccount.create_date || rawAccount.createdAt || new Date().toISOString().split('T')[0];
  const createDate = rawAccount.create_date || rawAccount.createDate || rawAccount.createdAt || acDate;
  const updateDate = rawAccount.last_update_date || rawAccount.lastUpdateDate || rawAccount.update_date || rawAccount.updatedAt || null;
  const syncDate = rawAccount.synced_date || rawAccount.syncedDate || null;

  // 7. Active / Archived Status (Room DB is_active = 1 means active)
  let isActive = 1;
  if (rawAccount.is_active !== undefined && rawAccount.is_active !== null) {
    isActive = Number(rawAccount.is_active) === 1 ? 1 : 0;
  } else if (rawAccount.isArchived !== undefined) {
    isActive = rawAccount.isArchived ? 0 : 1;
  } else if (rawAccount.isActive !== undefined) {
    isActive = rawAccount.isActive ? 1 : 0;
  }

  // 8. Update & Sync status
  const isUpdated = rawAccount.is_updated !== undefined && rawAccount.is_updated !== null
    ? (Number(rawAccount.is_updated) === 1 ? 1 : 0)
    : (rawAccount.isUpdated ? 1 : 0);
  const synced = (rawAccount.synced === 1 || rawAccount.synced === true) ? 1 : 0;
  const serverId = rawAccount.server_id !== undefined ? rawAccount.server_id : null;

  // 9. Visibility & Description
  const reportVisibility = (rawAccount.report_visibility === 0 || rawAccount.report_visibility === false || rawAccount.reportVisibility === false) ? 0 : 1;
  const description = rawAccount.description || rawAccount.desc || rawAccount.notes || '';

  // 10. Media & Sharing Links
  const shareLink = rawAccount.share_link || rawAccount.shareLink || null;
  const lastShareMedia = rawAccount.last_share_media || rawAccount.lastShareMedia || null;
  const profileImage = rawAccount.profile_image || rawAccount.profileImage || null;
  const profileImageDevice = rawAccount.profile_image_device || rawAccount.profileImageDevice || null;

  return {
    ...rawAccount,
    // Primary Key & Foreign Keys
    id: strId,
    account_id: isNaN(Number(rawId)) ? strId : Number(rawId),
    businessId: resolvedBizId,
    business_id: isNaN(Number(resolvedBizId)) ? resolvedBizId : Number(resolvedBizId),

    // Identity & Contact
    name,
    contact: strContact,
    phone: strContact,
    mobile: strContact,
    type: accountType,
    account_type: accountType,

    // Monetary Balances
    start_balance: cleanStart,
    startBalance: cleanStart,
    openingBalance: cleanStart,
    initialBalance: cleanStart,
    balance: cleanBalance,

    // Temporal fields
    ac_date: acDate,
    date: acDate,
    create_date: createDate,
    createDate: createDate,
    createdAt: createDate,
    is_updated: isUpdated,
    last_update_date: updateDate,
    lastUpdateDate: updateDate,
    updatedAt: updateDate,
    synced,
    synced_date: syncDate,
    server_id: serverId,

    // Flags & Presentation
    is_active: isActive,
    isArchived: isActive === 0,
    isActive: isActive === 1,
    report_visibility: reportVisibility,
    reportVisibility: reportVisibility === 1,
    description: String(description),
    desc: String(description),
    notes: String(description),

    // Media & Sharing
    share_link: shareLink,
    last_share_media: lastShareMedia,
    profile_image: profileImage,
    profile_image_device: profileImageDevice,
  };
}

// --- 7. PRINTABLE HTML CANVASES & CONSOLIDATED REPORT EXPORT ENGINES (ITERATION 209) ---

const REPORT_TYPES = Object.freeze({
  DAILY_BAKI: 'DAILY_BAKI',
  MONTHLY_BAKI: 'MONTHLY_BAKI',
  CASHBOX_SUMMARY: 'CASHBOX_SUMMARY',
  BECHA_KENA_SUMMARY: 'BECHA_KENA_SUMMARY',
});

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generates standalone, print-ready HTML5/CSS3 styled to standard A4 (794px x 1123px at 96 DPI / 210mm x 297mm)
 * for an account statement document payload.
 *
 * @param {Object|string} statementPayload Statement payload from generateStatementDocumentPayload, or account
 * @param {Object} [options={}] Additional formatting and override options
 * @returns {string} Standalone HTML5 document string
 */
function generatePrintableHtmlStatement(statementPayload, options = {}) {
  // If a consolidated report document payload was passed, delegate to report HTML generator
  if (statementPayload && (statementPayload.docType === 'CONSOLIDATED_REPORT' || statementPayload.reportType)) {
    return generatePrintableHtmlReport(statementPayload, options);
  }

  let payload = statementPayload;
  if (!payload || !payload.summary || !payload.account) {
    if (typeof statementPayload === 'object' && statementPayload.id && statementPayload.type !== undefined) {
      payload = generateStatementDocumentPayload(statementPayload, options.journals || options.businessId, options.dateRange || 'all', options);
    } else if (typeof statementPayload === 'string') {
      payload = generateStatementDocumentPayload(statementPayload, options.journals || options.businessId, options.dateRange || 'all', options);
    } else {
      payload = {
        documentId: options.documentId || generateUniqueId('stmt_doc_'),
        docType: 'ACCOUNT_STATEMENT',
        business: { name: options.businessName || 'টালিখাতা ডিজিটাল', phone: options.businessPhone || '', address: options.businessAddress || '' },
        account: { name: options.accountName || 'গ্রাহক', phone: options.accountPhone || '', isCustomer: true, typeLabel: 'গ্রাহক' },
        dateRange: { label: 'সকল লেনদেন' },
        summary: { openingBalance: 0, totalGiven: 0, totalReceived: 0, closingBalance: 0, balanceStatusLabel: 'পরিশোধিত' },
        itemizedEntries: [],
        generatedDate: formatIsoDate(new Date()),
        generatedTime: new Date().toTimeString().slice(0, 8),
        title: 'বকেয়া হিসাব বিবরণী',
      };
    }
  }

  const business = payload.business || {};
  const businessName = String(business.name || options.businessName || 'টালিখাতা ডিজিটাল');
  const businessOwner = String(business.owner || options.businessOwner || '');
  const businessPhone = String(business.phone || options.businessPhone || '');
  const businessAddress = String(business.address || options.businessAddress || '');

  const account = payload.account || {};
  const accountName = String(account.name || options.accountName || 'গ্রাহক');
  const accountPhone = String(account.phone || options.accountPhone || '');
  const accountAddress = String(account.address || options.accountAddress || '');
  const isCustomer = account.isCustomer !== false;
  const accountTypeLabel = account.typeLabel || (isCustomer ? 'গ্রাহক' : 'সরবরাহকারী');

  const title = payload.title || (isCustomer ? 'বকেয়া হিসাব বিবরণী' : 'দেনা হিসাব বিবরণী');
  const dateRange = payload.dateRange || {};
  const rangeLabel = String(dateRange.label || options.rangeLabel || 'সকল লেনদেন');
  const generatedDate = String(payload.generatedDate || formatIsoDate(new Date()));
  const generatedTime = String(payload.generatedTime || new Date().toTimeString().slice(0, 8));
  const documentId = String(payload.documentId || options.documentId || 'STMT-001');

  const summary = payload.summary || {
    openingBalance: 0,
    totalGiven: 0,
    totalReceived: 0,
    closingBalance: 0,
    balanceStatusLabel: 'পরিশোধিত',
  };

  const entries = Array.isArray(payload.itemizedEntries)
    ? payload.itemizedEntries
    : (Array.isArray(payload.itemizedLedger) ? payload.itemizedLedger : []);

  const fmt = (num) => {
    const n = Number(num) || 0;
    return (Math.round(n * 100) / 100).toFixed(2);
  };

  let entriesHtml = '';
  if (entries.length === 0) {
    entriesHtml = `
      <tr class="empty-row page-break-avoid">
        <td colspan="3" class="text-center text-muted" style="padding: 24px; text-align: center; color: #64748b;">
          উক্ত সময়সীমার মধ্যে কোনো লেনদেন পাওয়া যায়নি।
        </td>
      </tr>`;
  } else {
    entriesHtml = entries.map((e, idx) => {
      const isGiven = e.type === 'given' || e.txn_type === 'given' || (e.directionLabel && e.directionLabel.includes('দিলাম'));
      const badgeClass = isGiven ? 'badge-given' : 'badge-received';
      const dirText = e.directionLabel || (isGiven ? 'দিলাম' : 'পেলাম');
      const amtStr = fmt(e.amount);
      const balStr = fmt(e.runningBalance);
      const rowClass = idx % 2 === 0 ? 'even-row' : 'odd-row';

      return `
      <tr class="ledger-row page-break-avoid zebra-row ${rowClass}">
        <td class="col-date-desc">
          <div class="entry-date font-bold">${escapeHtml(e.formattedDate || e.date || '')}</div>
          <div class="entry-desc">${escapeHtml(e.description || '-')}</div>
        </td>
        <td class="col-txn text-right">
          <span class="badge ${badgeClass}">${escapeHtml(dirText)} ৳ ${amtStr}</span>
        </td>
        <td class="col-balance text-right font-bold">
          ৳ ${balStr}
        </td>
      </tr>`;
    }).join('\n');
  }

  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - ${escapeHtml(businessName)}</title>
  <style>
    /* Standard A4 Print & Canvas Sizing (794px x 1123px at 96 DPI / 210mm x 297mm) */
    @page {
      size: A4 portrait;
      margin: 12mm;
    }
    @media print {
      body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .a4-container {
        width: 100% !important;
        max-width: none !important;
        min-height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
        border: none !important;
        border-radius: 0 !important;
      }
      .page-break-avoid {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .page-break-before {
        page-break-before: always !important;
        break-before: always !important;
      }
      .no-print {
        display: none !important;
      }
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Hind Siliguri', 'Kalpurush', 'SolaimanLipi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      padding: 24px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    .a4-container {
      width: 100%;
      max-width: 794px;
      min-height: 1123px;
      margin: 0 auto;
      background: #ffffff;
      padding: 36px 40px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .content-area {
      flex: 1;
    }
    .font-bold { font-weight: 700; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .text-muted { color: #64748b; }
    .monospace { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }

    /* Merchant Branding Header */
    .merchant-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .merchant-brand {
      flex: 1;
    }
    .merchant-name {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .merchant-owner, .merchant-phone, .merchant-address {
      font-size: 13px;
      color: #475569;
      line-height: 1.4;
    }
    .header-badge {
      text-align: right;
    }
    .app-tag {
      font-size: 11px;
      font-weight: 700;
      color: #0284c7;
      text-transform: uppercase;
      letter-spacing: 1px;
      background: #e0f2fe;
      padding: 3px 8px;
      border-radius: 4px;
      display: inline-block;
      margin-bottom: 6px;
    }
    .doc-badge {
      font-size: 18px;
      font-weight: 800;
      color: #0369a1;
    }

    /* Account Metadata Card */
    .account-card {
      display: flex;
      justify-content: space-between;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 14px 18px;
      margin-bottom: 20px;
    }
    .account-info, .statement-meta {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .info-row, .meta-row {
      font-size: 13px;
      display: flex;
      gap: 6px;
    }
    .info-label, .meta-label {
      color: #64748b;
      min-width: 100px;
    }
    .info-value, .meta-value {
      color: #1e293b;
    }

    /* Summary Financial Boxes */
    .summary-boxes {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .summary-box {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 12px 14px;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .summary-box .box-label {
      font-size: 12px;
      color: #64748b;
      margin-bottom: 4px;
      font-weight: 600;
    }
    .summary-box .box-amount {
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
    }
    .summary-box.box-given {
      border-color: #fdba74;
      background: #fff7ed;
    }
    .summary-box.box-given .box-amount {
      color: #c2410c;
    }
    .summary-box.box-received {
      border-color: #86efac;
      background: #f0fdf4;
    }
    .summary-box.box-received .box-amount {
      color: #15803d;
    }
    .summary-box.box-closing {
      border-color: #93c5fd;
      background: #eff6ff;
    }
    .summary-box.box-closing .box-amount {
      color: #1d4ed8;
    }
    .box-sublabel {
      font-size: 11px;
      font-weight: 700;
      color: #2563eb;
      margin-top: 2px;
    }

    /* 3-Column Structured Ledger Table */
    .ledger-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      page-break-inside: auto;
    }
    .ledger-table thead tr {
      background: #0f172a;
      color: #ffffff;
    }
    .ledger-table th {
      padding: 10px 14px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.2px;
      border: 1px solid #0f172a;
    }
    .ledger-table td {
      padding: 10px 14px;
      font-size: 13px;
      border: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    .ledger-table.zebra tbody tr:nth-child(even),
    .ledger-table .zebra-row.even-row {
      background-color: #f8fafc;
    }
    .ledger-table tbody tr:hover {
      background-color: #f1f5f9;
    }
    .opening-row {
      background-color: #f1f5f9 !important;
      font-weight: 600;
    }
    .closing-row {
      background-color: #e2e8f0 !important;
      font-weight: 700;
      border-top: 2px solid #94a3b8;
    }
    .entry-date {
      font-size: 13px;
      color: #0f172a;
    }
    .entry-desc {
      font-size: 12px;
      color: #64748b;
      margin-top: 2px;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 700;
    }
    .badge-given {
      background: #ffedd5;
      color: #c2410c;
      border: 1px solid #fed7aa;
    }
    .badge-received {
      background: #dcfce7;
      color: #15803d;
      border: 1px solid #bbf7d0;
    }

    /* Standard Footer */
    .statement-footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
      margin-top: 24px;
    }
    .footer-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .page-counter {
      font-size: 12px;
      font-weight: 700;
      color: #475569;
    }
    .footer-watermark {
      font-size: 13px;
      font-weight: 700;
      color: #0284c7;
      letter-spacing: 0.5px;
    }
    .legal-disclaimer {
      font-size: 11px;
      color: #64748b;
      line-height: 1.4;
      margin-bottom: 6px;
    }
    .generation-timestamp {
      font-size: 10px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="a4-container">
    <div class="content-area">
      <header class="merchant-header page-break-avoid">
        <div class="merchant-brand">
          <h1 class="merchant-name">${escapeHtml(businessName)}</h1>
          ${businessOwner ? `<div class="merchant-owner">স্বত্বাধিকারী: ${escapeHtml(businessOwner)}</div>` : ''}
          ${businessPhone ? `<div class="merchant-phone">মোবাইল: ${escapeHtml(businessPhone)}</div>` : ''}
          ${businessAddress ? `<div class="merchant-address">ঠিকানা: ${escapeHtml(businessAddress)}</div>` : ''}
        </div>
        <div class="header-badge">
          <div class="app-tag">টালিখাতা - ডিজিটাল হিসাব খাতা</div>
          <div class="doc-badge">${escapeHtml(title)}</div>
        </div>
      </header>

      <section class="account-card page-break-avoid">
        <div class="account-info">
          <div class="info-row">
            <span class="info-label">${isCustomer ? 'গ্রাহকের নাম:' : 'সরবরাহকারীর নাম:'}</span>
            <span class="info-value font-bold">${escapeHtml(accountName)}</span>
          </div>
          ${accountPhone ? `
          <div class="info-row">
            <span class="info-label">মোবাইল:</span>
            <span class="info-value">${escapeHtml(accountPhone)}</span>
          </div>` : ''}
          ${accountAddress ? `
          <div class="info-row">
            <span class="info-label">ঠিকানা:</span>
            <span class="info-value">${escapeHtml(accountAddress)}</span>
          </div>` : ''}
          <div class="info-row">
            <span class="info-label">হিসাবের ধরন:</span>
            <span class="info-value font-bold">${escapeHtml(accountTypeLabel)}</span>
          </div>
        </div>
        <div class="statement-meta">
          <div class="meta-row">
            <span class="meta-label">হিসাবের সময়কাল:</span>
            <span class="meta-value font-bold">${escapeHtml(rangeLabel)}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">বিবরণী আইডি:</span>
            <span class="meta-value monospace">${escapeHtml(documentId)}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">প্রস্তুতের সময়:</span>
            <span class="meta-value">${escapeHtml(generatedDate)} ${escapeHtml(generatedTime)}</span>
          </div>
        </div>
      </section>

      <section class="summary-boxes page-break-avoid">
        <div class="summary-box">
          <div class="box-label">শুরুর জের (Opening)</div>
          <div class="box-amount">৳ ${fmt(summary.openingBalance)}</div>
        </div>
        <div class="summary-box box-given">
          <div class="box-label">মোট দিলাম (Debit)</div>
          <div class="box-amount">৳ ${fmt(summary.totalGiven)}</div>
        </div>
        <div class="summary-box box-received">
          <div class="box-label">মোট পেলাম (Credit)</div>
          <div class="box-amount">৳ ${fmt(summary.totalReceived)}</div>
        </div>
        <div class="summary-box box-closing">
          <div class="box-label">সমাপনী জের (Closing)</div>
          <div class="box-amount font-bold">৳ ${fmt(summary.closingBalance)}</div>
          <div class="box-sublabel">${escapeHtml(summary.balanceStatusLabel || '')}</div>
        </div>
      </section>

      <table class="ledger-table zebra 3-column-ledger">
        <thead>
          <tr class="page-break-avoid">
            <th class="col-date-desc" style="width: 44%; text-align: left;">তারিখ ও বিবরণ</th>
            <th class="col-txn" style="width: 28%; text-align: right;">লেনদেন (দিলাম / পেলাম)</th>
            <th class="col-balance" style="width: 28%; text-align: right;">চলমান জের (৳)</th>
          </tr>
        </thead>
        <tbody>
          <tr class="opening-row page-break-avoid">
            <td class="col-date-desc">
              <div class="entry-date font-bold">প্রারম্ভিক জের (Opening Balance)</div>
              <div class="entry-desc text-muted">হিসাব শুরুর পূর্ববর্তী স্থিতি</div>
            </td>
            <td class="col-txn text-right text-muted">-</td>
            <td class="col-balance text-right font-bold">৳ ${fmt(summary.openingBalance)}</td>
          </tr>
          ${entriesHtml}
          <tr class="closing-row page-break-avoid font-bold">
            <td class="col-date-desc">সমাপনী মোট জের (${escapeHtml(summary.balanceStatusLabel || '')})</td>
            <td class="col-txn text-right">মোট লেনদেন: ${entries.length} টি</td>
            <td class="col-balance text-right">৳ ${fmt(summary.closingBalance)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <footer class="statement-footer page-break-avoid">
      <div class="footer-top">
        <div class="page-counter">Page no. 1 of 1 (পৃষ্ঠা ১ / ১)</div>
        <div class="footer-watermark">TallyKhata - ডিজিটাল হিসাব খাতা</div>
      </div>
      <div class="legal-disclaimer">
        এটি টালিখাতা অ্যাপ দ্বারা স্বয়ংক্রিয়ভাবে তৈরি হিসাব বিবরণী। কোনো অমিল বা অসঙ্গতি পরিলক্ষিত হলে অনুগ্রহ করে সংশ্লিষ্ট ব্যবসায় যোগাযোগ করুন।
      </div>
      <div class="generation-timestamp">
        তৈরির তারিখ ও সময়: ${escapeHtml(generatedDate)} ${escapeHtml(generatedTime)} | TallyKhata - ডিজিটাল হিসাব খাতা
      </div>
    </footer>
  </div>
</body>
</html>`;
}

/**
 * Generates standalone, print-ready HTML5/CSS3 styled to standard A4 (794px x 1123px at 96 DPI / 210mm x 297mm)
 * for a consolidated business report document payload.
 *
 * @param {Object} reportPayload Report payload from generateConsolidatedReportDocument
 * @param {Object} [options={}] Formatting and presentation overrides
 * @returns {string} Standalone HTML5 document string
 */
function generatePrintableHtmlReport(reportPayload, options = {}) {
  let doc = reportPayload;
  if (!doc || !doc.reportType || !doc.summary) {
    doc = generateConsolidatedReportDocument(options.reportType || REPORT_TYPES.DAILY_BAKI, options.dateRange || 'all', options);
  }

  const business = doc.business || {};
  const businessName = String(business.name || options.businessName || 'টালিখাতা ডিজিটাল');
  const businessOwner = String(business.owner || options.businessOwner || '');
  const businessPhone = String(business.phone || options.businessPhone || '');
  const businessAddress = String(business.address || options.businessAddress || '');

  const title = String(doc.presentation?.title || 'ব্যবসায়িক রিপোর্ট');
  const reportLabel = String(doc.presentation?.reportLabel || doc.reportType);
  const dateRange = doc.dateRange || {};
  const rangeLabel = String(dateRange.label || 'সকল রেকর্ড');
  const generatedDate = String(doc.generatedDate || '');
  const generatedTime = String(doc.generatedTime || '');
  const documentId = String(doc.documentId || 'REP-001');

  const summary = doc.summary || {};
  const data = Array.isArray(doc.data) ? doc.data : [];

  const fmt = (num) => {
    const n = Number(num) || 0;
    return (Math.round(n * 100) / 100).toFixed(2);
  };

  let summaryCardsHtml = '';
  let tableHeaderHtml = '';
  let tableRowsHtml = '';

  if (doc.reportType === REPORT_TYPES.DAILY_BAKI) {
    summaryCardsHtml = `
      <div class="summary-box box-given">
        <div class="box-label">নতুন বাকি দেওয়া (Debit)</div>
        <div class="box-amount">৳ ${fmt(summary.totalNewDueGiven)}</div>
      </div>
      <div class="summary-box box-received">
        <div class="box-label">মোট বাকি আদায় (Credit)</div>
        <div class="box-amount">৳ ${fmt(summary.totalDueCollected)}</div>
      </div>
      <div class="summary-box">
        <div class="box-label">নিট বাকি পরিবর্তন</div>
        <div class="box-amount">৳ ${fmt(summary.netChange)}</div>
      </div>
      <div class="summary-box box-closing">
        <div class="box-label">মোট বর্তমান বকেয়া (Due)</div>
        <div class="box-amount font-bold">৳ ${fmt(summary.totalOutstandingDue)}</div>
        <div class="box-sublabel">${summary.customersWithDueCount || 0} জন কাস্টমার</div>
      </div>`;

    tableHeaderHtml = `
      <tr class="page-break-avoid">
        <th class="col-name" style="width: 44%; text-align: left;">গ্রাহকের নাম ও মোবাইল</th>
        <th class="col-txn" style="width: 28%; text-align: right;">আজকের লেনদেন (দিলাম / পেলাম)</th>
        <th class="col-balance" style="width: 28%; text-align: right;">অবশিষ্ট বকেয়া জের (৳)</th>
      </tr>`;

    if (data.length === 0) {
      tableRowsHtml = `<tr class="empty-row"><td colspan="3" class="text-center text-muted" style="padding: 24px;">কোনো গ্রাহকের বাকি হিসাব পাওয়া যায়নি।</td></tr>`;
    } else {
      tableRowsHtml = data.map((c, idx) => {
        let txnDetail = '-';
        if (c.givenInPeriod > 0 && c.collectedInPeriod > 0) {
          txnDetail = `<span class="badge badge-given">দিলাম ৳ ${fmt(c.givenInPeriod)}</span> <span class="badge badge-received">পেলাম ৳ ${fmt(c.collectedInPeriod)}</span>`;
        } else if (c.givenInPeriod > 0) {
          txnDetail = `<span class="badge badge-given">বাকি দিলাম ৳ ${fmt(c.givenInPeriod)}</span>`;
        } else if (c.collectedInPeriod > 0) {
          txnDetail = `<span class="badge badge-received">আদায় পেলাম ৳ ${fmt(c.collectedInPeriod)}</span>`;
        }
        const rowClass = idx % 2 === 0 ? 'even-row' : 'odd-row';
        return `
        <tr class="ledger-row page-break-avoid zebra-row ${rowClass}">
          <td class="col-name">
            <div class="font-bold">${escapeHtml(c.name)}</div>
            <div class="text-muted" style="font-size: 11px;">${escapeHtml(c.phone || c.address || 'কাস্টমার')}</div>
          </td>
          <td class="col-txn text-right">${txnDetail}</td>
          <td class="col-balance text-right font-bold">৳ ${fmt(c.closingDue)}</td>
        </tr>`;
      }).join('\n');
    }

  } else if (doc.reportType === REPORT_TYPES.MONTHLY_BAKI) {
    summaryCardsHtml = `
      <div class="summary-box">
        <div class="box-label">প্রারম্ভিক মোট বাকি</div>
        <div class="box-amount">৳ ${fmt(summary.openingReceivables)}</div>
      </div>
      <div class="summary-box box-given">
        <div class="box-label">নতুন বাকি প্রদান</div>
        <div class="box-amount">৳ ${fmt(summary.totalNewDueGiven)}</div>
      </div>
      <div class="summary-box box-received">
        <div class="box-label">মোট বাকি আদায়</div>
        <div class="box-amount">৳ ${fmt(summary.totalDueCollected)}</div>
      </div>
      <div class="summary-box box-closing">
        <div class="box-label">সমাপনী মোট দেনা / বাকি</div>
        <div class="box-amount font-bold">৳ ${fmt(summary.closingReceivables)}</div>
        <div class="box-sublabel">${summary.customersWithDueCount || 0} জন গ্রাহক</div>
      </div>`;

    tableHeaderHtml = `
      <tr class="page-break-avoid">
        <th class="col-name" style="width: 40%; text-align: left;">গ্রাহকের নাম</th>
        <th class="col-txn" style="width: 32%; text-align: right;">মাসের লেনদেন (দিলাম / পেলাম)</th>
        <th class="col-balance" style="width: 28%; text-align: right;">সমাপনী বাকি জের (৳)</th>
      </tr>`;

    if (data.length === 0) {
      tableRowsHtml = `<tr class="empty-row"><td colspan="3" class="text-center text-muted" style="padding: 24px;">চলতি মাসে কোনো বাকি লেনদেন নেই।</td></tr>`;
    } else {
      tableRowsHtml = data.map((c, idx) => {
        let txnDetail = '-';
        if (c.givenInMonth > 0 || c.collectedInMonth > 0) {
          txnDetail = `<span class="badge badge-given">+৳ ${fmt(c.givenInMonth)}</span> / <span class="badge badge-received">-৳ ${fmt(c.collectedInMonth)}</span>`;
        }
        const rowClass = idx % 2 === 0 ? 'even-row' : 'odd-row';
        return `
        <tr class="ledger-row page-break-avoid zebra-row ${rowClass}">
          <td class="col-name">
            <div class="font-bold">${escapeHtml(c.name)}</div>
            <div class="text-muted" style="font-size: 11px;">শুরুর জের: ৳ ${fmt(c.openingDue)}</div>
          </td>
          <td class="col-txn text-right">${txnDetail}</td>
          <td class="col-balance text-right font-bold">৳ ${fmt(c.closingDue)}</td>
        </tr>`;
      }).join('\n');
    }

  } else if (doc.reportType === REPORT_TYPES.CASHBOX_SUMMARY) {
    summaryCardsHtml = `
      <div class="summary-box">
        <div class="box-label">প্রারম্ভিক ক্যাশ</div>
        <div class="box-amount">৳ ${fmt(summary.openingCash)}</div>
      </div>
      <div class="summary-box box-received">
        <div class="box-label">মোট ক্যাশ ইন (জমা)</div>
        <div class="box-amount">৳ ${fmt(summary.cashIn)}</div>
      </div>
      <div class="summary-box box-given">
        <div class="box-label">মোট ক্যাশ আউট (খরচ)</div>
        <div class="box-amount">৳ ${fmt(summary.cashOut)}</div>
      </div>
      <div class="summary-box box-closing">
        <div class="box-label">ক্যাশড্রয়ার স্থিতি (Closing)</div>
        <div class="box-amount font-bold">৳ ${fmt(summary.closingCash)}</div>
        <div class="box-sublabel">${summary.isReconciled ? 'মিল আছে (Reconciled)' : 'অসমাপ্ত'}</div>
      </div>`;

    tableHeaderHtml = `
      <tr class="page-break-avoid">
        <th class="col-date-desc" style="width: 44%; text-align: left;">সময় ও বিবরণ</th>
        <th class="col-txn" style="width: 28%; text-align: right;">ক্যাশ লেনদেন (ইন / আউট)</th>
        <th class="col-balance" style="width: 28%; text-align: right;">ক্যাটাগরি</th>
      </tr>`;

    if (data.length === 0) {
      tableRowsHtml = `<tr class="empty-row"><td colspan="3" class="text-center text-muted" style="padding: 24px;">উক্ত সময়ে কোনো ক্যাশ এন্ট্রি নেই।</td></tr>`;
    } else {
      tableRowsHtml = data.map((entry, idx) => {
        const isCashIn = entry.type === 'in';
        const badgeClass = isCashIn ? 'badge-received' : 'badge-given';
        const rowClass = idx % 2 === 0 ? 'even-row' : 'odd-row';
        return `
        <tr class="ledger-row page-break-avoid zebra-row ${rowClass}">
          <td class="col-date-desc">
            <div class="font-bold">${escapeHtml(entry.date)} ${escapeHtml(entry.time || '')}</div>
            <div class="entry-desc">${escapeHtml(entry.note || '-')}</div>
          </td>
          <td class="col-txn text-right">
            <span class="badge ${badgeClass}">${isCashIn ? 'জমা +' : 'খরচ -'} ৳ ${fmt(entry.amount)}</span>
          </td>
          <td class="col-balance text-right">
            <span class="text-muted">${escapeHtml(entry.categoryLabel || entry.category)}</span>
          </td>
        </tr>`;
      }).join('\n');
    }

  } else if (doc.reportType === REPORT_TYPES.BECHA_KENA_SUMMARY) {
    summaryCardsHtml = `
      <div class="summary-box box-received">
        <div class="box-label">মোট বেচা / বিক্রয় (Sales)</div>
        <div class="box-amount">৳ ${fmt(summary.totalSales)}</div>
        <div class="box-sublabel">নগদ: ৳ ${fmt(summary.cashSales)} | বাকি: ৳ ${fmt(summary.creditSales)}</div>
      </div>
      <div class="summary-box box-given">
        <div class="box-label">মোট কেনা / ক্রয় (Purchases)</div>
        <div class="box-amount">৳ ${fmt(summary.totalPurchases)}</div>
        <div class="box-sublabel">নগদ: ৳ ${fmt(summary.cashPurchases)} | দেনা: ৳ ${fmt(summary.creditPurchases)}</div>
      </div>
      <div class="summary-box box-closing">
        <div class="box-label">ট্রেড সারপ্লাস / মার্জিন</div>
        <div class="box-amount font-bold">৳ ${fmt(summary.grossTradeMargin)}</div>
        <div class="box-sublabel">লাভ হার: ${fmt(summary.marginPercentage)}%</div>
      </div>
      <div class="summary-box">
        <div class="box-label">বর্তমান স্টক মূল্য</div>
        <div class="box-amount font-bold">৳ ${fmt(summary.totalStockValuation)}</div>
        <div class="box-sublabel">${summary.totalProducts || 0} টি পণ্য (${summary.totalStockQuantity || 0} একক)</div>
      </div>`;

    tableHeaderHtml = `
      <tr class="page-break-avoid">
        <th class="col-name" style="width: 44%; text-align: left;">পণ্যের নাম ও বিবরণ</th>
        <th class="col-txn" style="width: 28%; text-align: right;">মজুদ পরিমাণ ও একক দর</th>
        <th class="col-balance" style="width: 28%; text-align: right;">মোট মজুদ মূল্য (৳)</th>
      </tr>`;

    if (data.length === 0) {
      tableRowsHtml = `<tr class="empty-row"><td colspan="3" class="text-center text-muted" style="padding: 24px;">কোনো ইনভেন্টরি পণ্য পাওয়া যায়নি।</td></tr>`;
    } else {
      tableRowsHtml = data.map((item, idx) => {
        const rowClass = idx % 2 === 0 ? 'even-row' : 'odd-row';
        return `
        <tr class="ledger-row page-break-avoid zebra-row ${rowClass}">
          <td class="col-name">
            <div class="font-bold">${escapeHtml(item.name)}</div>
            <div class="text-muted" style="font-size: 11px;">ক্যাটাগরি: ${escapeHtml(item.category)} ${item.isLowStock ? '<span style="color:#e11d48;font-weight:700;">(কম স্টক)</span>' : ''}</div>
          </td>
          <td class="col-txn text-right">
            ${item.quantity} ${escapeHtml(item.unit)} × ৳ ${fmt(item.buyingPrice)}
          </td>
          <td class="col-balance text-right font-bold">৳ ${fmt(item.totalValuation)}</td>
        </tr>`;
      }).join('\n');
    }
  }

  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - ${escapeHtml(businessName)}</title>
  <style>
    /* Standard A4 Print & Canvas Sizing (794px x 1123px at 96 DPI / 210mm x 297mm) */
    @page {
      size: A4 portrait;
      margin: 12mm;
    }
    @media print {
      body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .a4-container {
        width: 100% !important;
        max-width: none !important;
        min-height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
        border: none !important;
        border-radius: 0 !important;
      }
      .page-break-avoid {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .page-break-before {
        page-break-before: always !important;
        break-before: always !important;
      }
      .no-print {
        display: none !important;
      }
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Hind Siliguri', 'Kalpurush', 'SolaimanLipi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      padding: 24px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    .a4-container {
      width: 100%;
      max-width: 794px;
      min-height: 1123px;
      margin: 0 auto;
      background: #ffffff;
      padding: 36px 40px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .content-area {
      flex: 1;
    }
    .font-bold { font-weight: 700; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .text-muted { color: #64748b; }
    .monospace { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }

    /* Merchant Branding Header */
    .merchant-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .merchant-brand {
      flex: 1;
    }
    .merchant-name {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .merchant-owner, .merchant-phone, .merchant-address {
      font-size: 13px;
      color: #475569;
      line-height: 1.4;
    }
    .header-badge {
      text-align: right;
    }
    .app-tag {
      font-size: 11px;
      font-weight: 700;
      color: #0284c7;
      text-transform: uppercase;
      letter-spacing: 1px;
      background: #e0f2fe;
      padding: 3px 8px;
      border-radius: 4px;
      display: inline-block;
      margin-bottom: 6px;
    }
    .doc-badge {
      font-size: 18px;
      font-weight: 800;
      color: #0369a1;
    }

    /* Report Metadata Card */
    .report-card {
      display: flex;
      justify-content: space-between;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 14px 18px;
      margin-bottom: 20px;
    }
    .report-info, .report-meta {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .info-row, .meta-row {
      font-size: 13px;
      display: flex;
      gap: 6px;
    }
    .info-label, .meta-label {
      color: #64748b;
      min-width: 100px;
    }
    .info-value, .meta-value {
      color: #1e293b;
    }

    /* Summary Financial Boxes */
    .summary-boxes {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .summary-box {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 12px 14px;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .summary-box .box-label {
      font-size: 12px;
      color: #64748b;
      margin-bottom: 4px;
      font-weight: 600;
    }
    .summary-box .box-amount {
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
    }
    .summary-box.box-given {
      border-color: #fdba74;
      background: #fff7ed;
    }
    .summary-box.box-given .box-amount {
      color: #c2410c;
    }
    .summary-box.box-received {
      border-color: #86efac;
      background: #f0fdf4;
    }
    .summary-box.box-received .box-amount {
      color: #15803d;
    }
    .summary-box.box-closing {
      border-color: #93c5fd;
      background: #eff6ff;
    }
    .summary-box.box-closing .box-amount {
      color: #1d4ed8;
    }
    .box-sublabel {
      font-size: 11px;
      font-weight: 700;
      color: #2563eb;
      margin-top: 2px;
    }

    /* Structured Ledger Table */
    .ledger-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      page-break-inside: auto;
    }
    .ledger-table thead tr {
      background: #0f172a;
      color: #ffffff;
    }
    .ledger-table th {
      padding: 10px 14px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.2px;
      border: 1px solid #0f172a;
    }
    .ledger-table td {
      padding: 10px 14px;
      font-size: 13px;
      border: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    .ledger-table.zebra tbody tr:nth-child(even),
    .ledger-table .zebra-row.even-row {
      background-color: #f8fafc;
    }
    .ledger-table tbody tr:hover {
      background-color: #f1f5f9;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 700;
    }
    .badge-given {
      background: #ffedd5;
      color: #c2410c;
      border: 1px solid #fed7aa;
    }
    .badge-received {
      background: #dcfce7;
      color: #15803d;
      border: 1px solid #bbf7d0;
    }

    /* Standard Footer */
    .report-footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
      margin-top: 24px;
    }
    .footer-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .page-counter {
      font-size: 12px;
      font-weight: 700;
      color: #475569;
    }
    .footer-watermark {
      font-size: 13px;
      font-weight: 700;
      color: #0284c7;
      letter-spacing: 0.5px;
    }
    .legal-disclaimer {
      font-size: 11px;
      color: #64748b;
      line-height: 1.4;
      margin-bottom: 6px;
    }
    .generation-timestamp {
      font-size: 10px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="a4-container">
    <div class="content-area">
      <!-- Merchant Branding Header -->
      <header class="merchant-header page-break-avoid">
        <div class="merchant-brand">
          <h1 class="merchant-name">${escapeHtml(businessName)}</h1>
          ${businessOwner ? `<div class="merchant-owner">স্বত্বাধিকারী: ${escapeHtml(businessOwner)}</div>` : ''}
          ${businessPhone ? `<div class="merchant-phone">মোবাইল: ${escapeHtml(businessPhone)}</div>` : ''}
          ${businessAddress ? `<div class="merchant-address">ঠিকানা: ${escapeHtml(businessAddress)}</div>` : ''}
        </div>
        <div class="header-badge">
          <div class="app-tag">টালিখাতা - ডিজিটাল হিসাব খাতা</div>
          <div class="doc-badge">${escapeHtml(title)}</div>
        </div>
      </header>

      <!-- Report Metadata Card -->
      <section class="report-card page-break-avoid">
        <div class="report-info">
          <div class="info-row">
            <span class="info-label">রিপোর্টের ধরন:</span>
            <span class="info-value font-bold">${escapeHtml(reportLabel)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">সময়কাল:</span>
            <span class="info-value font-bold">${escapeHtml(rangeLabel)}</span>
          </div>
        </div>
        <div class="report-meta">
          <div class="meta-row">
            <span class="meta-label">রিপোর্ট আইডি:</span>
            <span class="meta-value monospace">${escapeHtml(documentId)}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">প্রস্তুতের সময়:</span>
            <span class="meta-value">${escapeHtml(generatedDate)} ${escapeHtml(generatedTime)}</span>
          </div>
        </div>
      </section>

      <!-- Summary Financial Boxes -->
      <section class="summary-boxes page-break-avoid">
        ${summaryCardsHtml}
      </section>

      <!-- Structured Ledger Table with Zebra Striping -->
      <table class="ledger-table zebra 3-column-ledger">
        <thead>
          ${tableHeaderHtml}
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>
    </div>

    <!-- Standard Footer -->
    <footer class="report-footer page-break-avoid">
      <div class="footer-top">
        <div class="page-counter">Page no. 1 of 1 (পৃষ্ঠা ১ / ১)</div>
        <div class="footer-watermark">TallyKhata - ডিজিটাল হিসাব খাতা</div>
      </div>
      <div class="legal-disclaimer">
        এটি টালিখাতা অ্যাপ দ্বারা স্বয়ংক্রিয়ভাবে প্রস্তুতকৃত ব্যবসায়িক রিপোর্ট। কোনো অমিল বা অসঙ্গতি পরিলক্ষিত হলে অনুগ্রহ করে সংশ্লিষ্ট ব্যবসায় যোগাযোগ করুন।
      </div>
      <div class="generation-timestamp">
        তৈরির তারিখ ও সময়: ${escapeHtml(generatedDate)} ${escapeHtml(generatedTime)} | TallyKhata - ডিজিটাল হিসাব খাতা
      </div>
    </footer>
  </div>
</body>
</html>`;
}

/**
 * Generates structured document payload for consolidated business reports:
 * - REPORT_TYPES.DAILY_BAKI
 * - REPORT_TYPES.MONTHLY_BAKI
 * - REPORT_TYPES.CASHBOX_SUMMARY
 * - REPORT_TYPES.BECHA_KENA_SUMMARY
 *
 * @param {string} reportType One of REPORT_TYPES
 * @param {string|Object} [dateRange='all'] Date range ('today', 'this_month', 'last_month', 'all', 'custom')
 * @param {Object} [options={}] Storage collections, businessId, and metadata
 * @returns {Object} Structured report document payload with embedded print-ready HTML
 */
function generateConsolidatedReportDocument(reportType, dateRange = 'all', options = {}) {
  const refDate = options.referenceDate instanceof Date && !isNaN(options.referenceDate.getTime())
    ? options.referenceDate
    : new Date();

  const businessId = String(options.businessId || options.business?.id || '1');
  const businesses = Array.isArray(options.businesses) ? options.businesses : [];
  let foundBiz = businesses.find(b => String(b.id || b.business_id) === businessId) || options.business || null;

  const businessName = String(options.businessName || foundBiz?.name || foundBiz?.business_name || 'টালিখাতা ডিজিটাল');
  const businessPhone = String(options.businessPhone || foundBiz?.phone || '');
  const businessAddress = String(options.businessAddress || foundBiz?.address || foundBiz?.business_address || '');
  const businessOwner = String(options.businessOwner || foundBiz?.owner || '');

  const validReportType = Object.values(REPORT_TYPES).includes(reportType)
    ? reportType
    : REPORT_TYPES.DAILY_BAKI;

  const range = resolveStatementDateRange(
    dateRange || (validReportType === REPORT_TYPES.MONTHLY_BAKI ? 'this_month' : 'today'),
    options,
    refDate
  );

  let rangeLabel = 'সকল রেকর্ড';
  if (range.range === 'today') {
    rangeLabel = `আজ (${range.startDate || ''})`;
  } else if (range.range === 'this_month') {
    rangeLabel = `চলতি মাস (${range.startDate || ''} থেকে ${range.endDate || ''})`;
  } else if (range.range === 'last_month') {
    rangeLabel = `গত মাস (${range.startDate || ''} থেকে ${range.endDate || ''})`;
  } else if (range.range === 'custom') {
    rangeLabel = `${range.startDate || 'শুরু'} থেকে ${range.endDate || 'বর্তমান'}`;
  }

  const allAccounts = Array.isArray(options.accounts) ? options.accounts : [];
  const allJournals = Array.isArray(options.journals) ? options.journals : [];
  const allCashEntries = Array.isArray(options.cashEntries) ? options.cashEntries : [];
  const allInventory = Array.isArray(options.inventory) ? options.inventory : (Array.isArray(options.stock) ? options.stock : []);

  const bizAccounts = allAccounts.filter(a => String(a.businessId !== undefined && a.businessId !== null ? a.businessId : (a.business_id || '1')) === businessId);
  const bizJournals = allJournals.filter(j => String(j.businessId !== undefined && j.businessId !== null ? j.businessId : (j.business_id || '1')) === businessId);
  const bizCashEntries = allCashEntries.filter(c => String(c.businessId !== undefined && c.businessId !== null ? c.businessId : (c.business_id || '1')) === businessId);
  const bizInventory = allInventory.filter(i => String(i.businessId !== undefined && i.businessId !== null ? i.businessId : (i.business_id || '1')) === businessId);

  let summary = {};
  let data = [];
  let title = '';
  let reportLabel = '';

  const roundMoney = (val) => Math.round((Number(val) || 0) * 100) / 100;

  if (validReportType === REPORT_TYPES.DAILY_BAKI) {
    title = 'দৈনিক বাকি বিবরণী';
    reportLabel = 'দৈনিক কাস্টমার বাকি ও আদায় হিসাব';

    const custAccounts = bizAccounts.filter(a => a.type === 1);
    let totalNewDueGiven = 0;
    let totalDueCollected = 0;
    let totalOutstandingDue = 0;
    let activeCustomersInPeriod = 0;

    const customerRows = custAccounts.map(cust => {
      const targetAccId = String(cust.id);
      const custJournals = bizJournals.filter(j => {
        const jAccId = String(j.accountId !== undefined ? j.accountId : (j.account_id !== undefined ? j.account_id : (j.orig_account_id || '')));
        return jAccId === targetAccId;
      });

      let openingDue = roundMoney(cust.opening_balance || cust.openingBalance || 0);
      let givenInPeriod = 0;
      let collectedInPeriod = 0;

      custJournals.forEach(j => {
        const jDate = j.date || j.txn_date || '';
        let isGiven = j.type === 'given' || j.txn_type === 'given';
        let isReceived = j.type === 'received' || j.txn_type === 'received';
        if (!isGiven && !isReceived && (j.txn_type === 1 || j.txn_type === '1' || j.txn_type === 2 || j.txn_type === '2')) {
          isGiven = Number(j.txn_type) === 1;
          isReceived = Number(j.txn_type) === 2;
        }

        const amt = roundMoney(j.amount !== undefined && j.amount !== null ? j.amount : j.amount_received);

        if (range.startDate && jDate < range.startDate) {
          if (isGiven) openingDue = roundMoney(openingDue + amt);
          if (isReceived) openingDue = roundMoney(openingDue - amt);
        } else if ((!range.startDate || jDate >= range.startDate) && (!range.endDate || jDate <= range.endDate)) {
          if (isGiven) givenInPeriod = roundMoney(givenInPeriod + amt);
          if (isReceived) collectedInPeriod = roundMoney(collectedInPeriod + amt);
        }
      });

      const netChange = roundMoney(givenInPeriod - collectedInPeriod);
      const closingDue = roundMoney(openingDue + netChange);

      if (givenInPeriod > 0 || collectedInPeriod > 0) {
        activeCustomersInPeriod++;
      }
      totalNewDueGiven = roundMoney(totalNewDueGiven + givenInPeriod);
      totalDueCollected = roundMoney(totalDueCollected + collectedInPeriod);
      if (closingDue > 0) {
        totalOutstandingDue = roundMoney(totalOutstandingDue + closingDue);
      }

      return {
        customerId: cust.id,
        name: String(cust.name || 'গ্রাহক'),
        phone: String(cust.phone || ''),
        address: String(cust.address || ''),
        openingDue,
        givenInPeriod,
        collectedInPeriod,
        netChange,
        closingDue,
        statusLabel: closingDue > 0 ? 'বাকি আছে' : (closingDue < 0 ? 'জমা আছে' : 'পরিশোধিত'),
      };
    });

    customerRows.sort((a, b) => {
      const aActive = a.givenInPeriod > 0 || a.collectedInPeriod > 0;
      const bActive = b.givenInPeriod > 0 || b.collectedInPeriod > 0;
      if (aActive !== bActive) return aActive ? -1 : 1;
      return b.closingDue - a.closingDue;
    });

    summary = {
      totalNewDueGiven,
      totalDueCollected,
      netChange: roundMoney(totalNewDueGiven - totalDueCollected),
      totalOutstandingDue,
      customerCount: custAccounts.length,
      customersWithDueCount: customerRows.filter(c => c.closingDue > 0).length,
      activeCustomersInPeriod,
      floatDriftPaisa: 0,
      currencySymbol: '৳',
    };
    data = customerRows;

  } else if (validReportType === REPORT_TYPES.MONTHLY_BAKI) {
    title = 'মাসিক কাস্টমার দেনা রিপোর্ট';
    reportLabel = 'মাসভিত্তিক বকেয়া ও আদায় সারসংক্ষেপ';

    const custAccounts = bizAccounts.filter(a => a.type === 1);
    let openingReceivables = 0;
    let totalNewDueGiven = 0;
    let totalDueCollected = 0;

    const customerRows = custAccounts.map(cust => {
      const targetAccId = String(cust.id);
      const custJournals = bizJournals.filter(j => {
        const jAccId = String(j.accountId !== undefined ? j.accountId : (j.account_id !== undefined ? j.account_id : (j.orig_account_id || '')));
        return jAccId === targetAccId;
      });

      let openingDue = roundMoney(cust.opening_balance || cust.openingBalance || 0);
      let givenInMonth = 0;
      let collectedInMonth = 0;

      custJournals.forEach(j => {
        const jDate = j.date || j.txn_date || '';
        let isGiven = j.type === 'given' || j.txn_type === 'given';
        let isReceived = j.type === 'received' || j.txn_type === 'received';
        if (!isGiven && !isReceived && (j.txn_type === 1 || j.txn_type === '1' || j.txn_type === 2 || j.txn_type === '2')) {
          isGiven = Number(j.txn_type) === 1;
          isReceived = Number(j.txn_type) === 2;
        }
        const amt = roundMoney(j.amount !== undefined && j.amount !== null ? j.amount : j.amount_received);

        if (range.startDate && jDate < range.startDate) {
          if (isGiven) openingDue = roundMoney(openingDue + amt);
          if (isReceived) openingDue = roundMoney(openingDue - amt);
        } else if ((!range.startDate || jDate >= range.startDate) && (!range.endDate || jDate <= range.endDate)) {
          if (isGiven) givenInMonth = roundMoney(givenInMonth + amt);
          if (isReceived) collectedInMonth = roundMoney(collectedInMonth + amt);
        }
      });

      const closingDue = roundMoney(openingDue + givenInMonth - collectedInMonth);
      openingReceivables = roundMoney(openingReceivables + openingDue);
      totalNewDueGiven = roundMoney(totalNewDueGiven + givenInMonth);
      totalDueCollected = roundMoney(totalDueCollected + collectedInMonth);

      return {
        customerId: cust.id,
        name: String(cust.name || 'গ্রাহক'),
        phone: String(cust.phone || ''),
        openingDue,
        givenInMonth,
        collectedInMonth,
        closingDue,
        statusLabel: closingDue > 0 ? 'বাকি আছে' : (closingDue < 0 ? 'জমা আছে' : 'পরিশোধিত'),
      };
    });

    customerRows.sort((a, b) => b.closingDue - a.closingDue);

    const netReceivablesChange = roundMoney(totalNewDueGiven - totalDueCollected);
    const closingReceivables = roundMoney(openingReceivables + netReceivablesChange);

    summary = {
      openingReceivables,
      totalNewDueGiven,
      totalDueCollected,
      netReceivablesChange,
      closingReceivables,
      customerCount: custAccounts.length,
      customersWithDueCount: customerRows.filter(c => c.closingDue > 0).length,
      floatDriftPaisa: 0,
      currencySymbol: '৳',
    };
    data = customerRows;

  } else if (validReportType === REPORT_TYPES.CASHBOX_SUMMARY) {
    title = 'ক্যাশবাক্স ও ক্যাশড্রয়ার বিবরণী';
    reportLabel = 'দৈনিক ক্যাশ হিসাব ও ড্রয়ার রিকনসিলিয়েশন';

    let openingCash = roundMoney(options.openingCashBalance || 0);
    let cashIn = 0;
    let cashOut = 0;

    const periodEntries = [];

    bizCashEntries.forEach(entry => {
      const eDate = entry.date || entry.create_date || '';
      const amt = roundMoney(entry.amount);
      const isCashIn = entry.type === 'in' || entry.type === 'cash_in' || entry.cash_type === 1 || entry.txn_type === 1;
      const isCashOut = entry.type === 'out' || entry.type === 'cash_out' || entry.cash_type === 2 || entry.txn_type === 2;

      if (range.startDate && eDate < range.startDate) {
        if (isCashIn) openingCash = roundMoney(openingCash + amt);
        if (isCashOut) openingCash = roundMoney(openingCash - amt);
      } else if ((!range.startDate || eDate >= range.startDate) && (!range.endDate || eDate <= range.endDate)) {
        if (isCashIn) cashIn = roundMoney(cashIn + amt);
        if (isCashOut) cashOut = roundMoney(cashOut + amt);
        periodEntries.push({
          id: entry.id,
          date: eDate,
          time: entry.time || entry.create_time || '',
          type: isCashIn ? 'in' : 'out',
          directionLabel: isCashIn ? 'জমা (ক্যাশ ইন)' : 'খরচ (ক্যাশ আউট)',
          category: entry.category || 'সাধারণ',
          categoryLabel: entry.category || (isCashIn ? 'নগদ জমা' : 'নগদ খরচ'),
          amount: amt,
          note: entry.note || entry.notes || entry.description || '-',
        });
      }
    });

    const netCash = roundMoney(cashIn - cashOut);
    const closingCash = roundMoney(openingCash + netCash);
    const physicalCashDrawer = options.physicalCashDrawer !== undefined
      ? roundMoney(options.physicalCashDrawer)
      : closingCash;
    const discrepancy = roundMoney(physicalCashDrawer - closingCash);
    const isReconciled = Math.abs(discrepancy) < 0.001;

    summary = {
      openingCash,
      cashIn,
      cashOut,
      netCash,
      closingCash,
      physicalCashDrawer,
      discrepancy,
      isReconciled,
      entryCount: periodEntries.length,
      floatDriftPaisa: 0,
      currencySymbol: '৳',
    };
    data = periodEntries;

  } else if (validReportType === REPORT_TYPES.BECHA_KENA_SUMMARY) {
    title = 'বেচা-কেনা ও স্টক সারসংক্ষেপ';
    reportLabel = 'সার্বিক ক্রয়-বিক্রয় ও ইনভেন্টরি মূল্যায়ন';

    let cashSales = 0;
    let cashPurchases = 0;

    bizCashEntries.forEach(entry => {
      const eDate = entry.date || entry.create_date || '';
      if ((!range.startDate || eDate >= range.startDate) && (!range.endDate || eDate <= range.endDate)) {
        const cat = String(entry.category || '').toLowerCase();
        const amt = roundMoney(entry.amount);
        const isCashIn = entry.type === 'in' || entry.type === 'cash_in' || entry.cash_type === 1;
        const isCashOut = entry.type === 'out' || entry.type === 'cash_out' || entry.cash_type === 2;

        if (isCashIn && (cat.includes('sales') || cat.includes('বেচা') || cat.includes('বিক্রি') || cat === 'general' || !cat)) {
          cashSales = roundMoney(cashSales + amt);
        }
        if (isCashOut && (cat.includes('purchase') || cat.includes('কেনা') || cat.includes('ক্রয়') || cat.includes('stock'))) {
          cashPurchases = roundMoney(cashPurchases + amt);
        }
      }
    });

    let creditSales = 0;
    let creditPurchases = 0;

    const custAccountIds = new Set(bizAccounts.filter(a => a.type === 1).map(a => String(a.id)));
    const suppAccountIds = new Set(bizAccounts.filter(a => a.type === 2).map(a => String(a.id)));

    bizJournals.forEach(j => {
      const jDate = j.date || j.txn_date || '';
      if ((!range.startDate || jDate >= range.startDate) && (!range.endDate || jDate <= range.endDate)) {
        const jAccId = String(j.accountId !== undefined ? j.accountId : (j.account_id !== undefined ? j.account_id : (j.orig_account_id || '')));
        let isGiven = j.type === 'given' || j.txn_type === 'given' || j.txn_type === 1 || j.txn_type === '1';
        let isReceived = j.type === 'received' || j.txn_type === 'received' || j.txn_type === 2 || j.txn_type === '2';
        const amt = roundMoney(j.amount !== undefined && j.amount !== null ? j.amount : j.amount_received);

        if (custAccountIds.has(jAccId) && isGiven) {
          creditSales = roundMoney(creditSales + amt);
        }
        if (suppAccountIds.has(jAccId) && isReceived) {
          creditPurchases = roundMoney(creditPurchases + amt);
        }
      }
    });

    const totalSales = roundMoney(cashSales + creditSales);
    const totalPurchases = roundMoney(cashPurchases + creditPurchases);
    const grossTradeMargin = roundMoney(totalSales - totalPurchases);
    const marginPercentage = totalSales > 0 ? roundMoney((grossTradeMargin / totalSales) * 100) : 0;

    let totalStockQuantity = 0;
    let totalStockValuation = 0;
    let lowStockCount = 0;

    const stockRows = bizInventory.map(item => {
      const qty = Number(item.quantity !== undefined ? item.quantity : (item.stock || 0)) || 0;
      const bPrice = Number(item.buyingPrice !== undefined ? item.buyingPrice : (item.purchasePrice || item.rate || 0)) || 0;
      const sPrice = Number(item.sellingPrice !== undefined ? item.sellingPrice : (item.salePrice || 0)) || 0;
      const val = roundMoney(qty * bPrice);
      const isLow = qty <= (Number(item.alertQuantity || item.lowStockAlert || 5));

      totalStockQuantity = roundMoney(totalStockQuantity + qty);
      totalStockValuation = roundMoney(totalStockValuation + val);
      if (isLow) lowStockCount++;

      return {
        id: item.id,
        name: String(item.name || item.product_name || 'পণ্য'),
        sku: String(item.sku || item.code || ''),
        category: String(item.category || 'সাধারণ'),
        quantity: qty,
        unit: String(item.unit || 'টি'),
        buyingPrice: bPrice,
        sellingPrice: sPrice,
        totalValuation: val,
        isLowStock: isLow,
      };
    });

    summary = {
      totalSales,
      cashSales,
      creditSales,
      totalPurchases,
      cashPurchases,
      creditPurchases,
      grossTradeMargin,
      marginPercentage,
      totalStockValuation,
      totalStockQuantity,
      totalProducts: bizInventory.length,
      lowStockCount,
      floatDriftPaisa: 0,
      currencySymbol: '৳',
    };
    data = stockRows;
  }

  const documentId = options.documentId || generateUniqueId('rep_doc_');
  const generatedDate = formatIsoDate(refDate);
  const generatedTime = refDate.toTimeString().slice(0, 8);

  const docPayload = {
    documentId,
    docType: 'CONSOLIDATED_REPORT',
    reportType: validReportType,
    version: '1.0',
    generatedAt: refDate.toISOString(),
    generatedDate,
    generatedTime,
    business: {
      id: businessId,
      name: businessName,
      phone: businessPhone,
      address: businessAddress,
      owner: businessOwner,
    },
    dateRange: {
      range: range.range,
      startDate: range.startDate,
      endDate: range.endDate,
      label: rangeLabel,
    },
    summary,
    data,
    presentation: {
      title,
      reportLabel,
      summaryBanner: `${businessName} | ${title} | ${rangeLabel}`,
    },
  };

  const html = generatePrintableHtmlReport(docPayload, options);
  docPayload.html = html;
  docPayload.printableHtml = html;

  return docPayload;
}

// --- 8. MULTI-PAGE PDF PAGINATION & SHARE INTENT PIPELINE (ITERATION 209) ---

const ASCII_TO_BENGALI_DIGITS = Object.freeze({
  '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
  '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
});

const BENGALI_NUMERAL_CACHE = Object.freeze(Array.from({ length: 101 }, (_, i) => {
  return String(i).replace(/[0-9]/g, (ch) => ASCII_TO_BENGALI_DIGITS[ch] || ch);
}));

function toBengaliNumeral(num) {
  if (num === null || num === undefined) return '';
  if (typeof num === 'number' && Number.isInteger(num) && num >= 0 && num <= 100) {
    return BENGALI_NUMERAL_CACHE[num];
  }
  return String(num).replace(/[0-9]/g, (ch) => ASCII_TO_BENGALI_DIGITS[ch] || ch);
}

const REPORT_PREFIXES = Object.freeze({
  DAILY_BAKI: 'TK_credit_report_',
  MONTHLY_BAKI: 'TK_credit_report_',
  CUSTOMER_LIST: 'TK_CS_',
  SALES_SUMMARY: 'TK_sales_report_',
  CASHBOX_DETAIL: 'TK_cashbox_report_',
  CASHBOX_SUMMARY: 'TK_cashbox_report_',
  CASH_REPORT: 'TK_cash_report_',
  DAILY_EXPENSE: 'TK_exp_report_',
  MONTHLY_EXPENSE: 'TK_exp_report_',
  MALIK_REPORT: 'TK_malik_report_',
  TRANSACTION_LIST: 'TK_TXN_',
  DEFAULT: 'TK-Report-',
});

function paginateStatementDocument(statementPayload, options = {}) {
  let doc = statementPayload;
  if (!doc || !doc.summary || !doc.account) {
    doc = generateStatementDocumentPayload(statementPayload, options.journals || null, options.dateRange || 'all', options);
  }

  const rowsPerPage = Math.max(1, parseInt(options.rowsPerPage, 10) || 25);
  const entries = Array.isArray(doc.itemizedEntries)
    ? doc.itemizedEntries
    : (Array.isArray(doc.itemizedLedger) ? doc.itemizedLedger : []);
  const totalRows = entries.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));

  const pages = [];
  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const pageNumber = pageIdx + 1;
    const startIdx = pageIdx * rowsPerPage;
    const endIdx = Math.min(totalRows, startIdx + rowsPerPage);
    const slice = entries.slice(startIdx, endIdx);

    let pageDebitSum = 0;
    let pageCreditSum = 0;
    for (const e of slice) {
      pageDebitSum += Math.round((Number(e.debit) || 0) * 100);
      pageCreditSum += Math.round((Number(e.credit) || 0) * 100);
    }
    pageDebitSum = pageDebitSum / 100;
    pageCreditSum = pageCreditSum / 100;

    const pageStamp = `Page no. ${pageNumber} of ${totalPages}`;
    const pageStampBn = `পৃষ্ঠা ${toBengaliNumeral(pageNumber)} এর ${toBengaliNumeral(totalPages)}`;

    pages.push({
      pageNumber,
      totalPages,
      pageStamp,
      pageStampBn,
      isFirstPage: pageNumber === 1,
      isLastPage: pageNumber === totalPages,
      startIndex: startIdx,
      endIndex: endIdx,
      rowCount: slice.length,
      entries: slice,
      pageDebitSum,
      pageCreditSum,
      tableHeaders: [
        { key: 'description', label: 'বিবরণ', widthPercent: 40, align: 'left' },
        { key: 'debit', label: 'দিলাম', widthPercent: 20, align: 'right' },
        { key: 'credit', label: 'পেলাম', widthPercent: 20, align: 'right' },
        { key: 'balance', label: 'বাকি', widthPercent: 20, align: 'right' },
      ],
    });
  }

  return {
    documentId: doc.documentId || generateUniqueId('stmt_doc_'),
    docType: 'PAGINATED_ACCOUNT_STATEMENT',
    version: '1.0',
    generatedAt: doc.generatedAt || new Date().toISOString(),
    generatedDate: doc.generatedDate,
    generatedTime: doc.generatedTime,
    business: doc.business,
    account: doc.account,
    dateRange: doc.dateRange,
    summary: doc.summary,
    pagination: {
      rowsPerPage,
      totalRows,
      totalPages,
      pageStampTemplate: 'Page no. %d of %d',
      pageStampTemplateBn: 'পৃষ্ঠা %s এর %s',
    },
    pages,
    closingTotals: {
      openingBalance: doc.summary.openingBalance,
      totalGiven: doc.summary.totalGiven,
      totalReceived: doc.summary.totalReceived,
      closingBalance: doc.summary.closingBalance,
      balanceStatusLabel: doc.summary.balanceStatusLabel,
      floatDriftPaisa: 0,
    },
    tableHeaders: ['বিবরণ', 'দিলাম', 'পেলাম', 'বাকি'],
    shareableText: doc.shareableText,
    title: doc.title,
    presentation: doc.presentation,
    rawStatement: doc.rawStatement || doc,
  };
}

function paginateConsolidatedReportDocument(reportPayload, options = {}) {
  let doc = reportPayload;
  if (!doc || !doc.reportType || !doc.summary) {
    doc = generateConsolidatedReportDocument(options.reportType || REPORT_TYPES.DAILY_BAKI, options.dateRange || 'all', options);
  }

  const rowsPerPage = Math.max(1, parseInt(options.rowsPerPage, 10) || 25);
  const data = Array.isArray(doc.data) ? doc.data : [];
  const totalRows = data.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));

  const pages = [];
  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const pageNumber = pageIdx + 1;
    const startIdx = pageIdx * rowsPerPage;
    const endIdx = Math.min(totalRows, startIdx + rowsPerPage);
    const slice = data.slice(startIdx, endIdx);

    const pageStamp = `Page no. ${pageNumber} of ${totalPages}`;
    const pageStampBn = `পৃষ্ঠা ${toBengaliNumeral(pageNumber)} এর ${toBengaliNumeral(totalPages)}`;

    pages.push({
      pageNumber,
      totalPages,
      pageStamp,
      pageStampBn,
      isFirstPage: pageNumber === 1,
      isLastPage: pageNumber === totalPages,
      startIndex: startIdx,
      endIndex: endIdx,
      rowCount: slice.length,
      data: slice,
    });
  }

  return {
    documentId: doc.documentId || generateUniqueId('rep_doc_'),
    docType: 'PAGINATED_CONSOLIDATED_REPORT',
    reportType: doc.reportType,
    version: '1.0',
    generatedAt: doc.generatedAt || new Date().toISOString(),
    generatedDate: doc.generatedDate,
    generatedTime: doc.generatedTime,
    business: doc.business,
    dateRange: doc.dateRange,
    summary: doc.summary,
    pagination: {
      rowsPerPage,
      totalRows,
      totalPages,
      pageStampTemplate: 'Page no. %d of %d',
      pageStampTemplateBn: 'পৃষ্ঠা %s এর %s',
    },
    pages,
    presentation: doc.presentation,
    rawReport: doc,
  };
}

function generatePdfShareIntentPayload(documentPayload, options = {}) {
  const doc = documentPayload || {};
  const isStatement = doc.docType === 'ACCOUNT_STATEMENT' || doc.docType === 'PAGINATED_ACCOUNT_STATEMENT' || doc.account;
  const repType = options.reportType || doc.reportType || (isStatement ? 'DAILY_BAKI' : 'DEFAULT');
  const prefix = options.prefix || REPORT_PREFIXES[repType] || REPORT_PREFIXES.DEFAULT;

  const targetId = String(options.id || (doc.account && doc.account.id) || (doc.business && doc.business.id) || 'doc');
  const now = options.timestamp ? new Date(options.timestamp).getTime() : Date.now();
  const fileName = `${prefix}${targetId}_${now}.pdf`;

  const authority = 'com.progoti.tallykhata.fileprovider';
  const relativeDir = 'external_files/Documents/TallyKhata';
  const contentUri = `content://${authority}/${relativeDir}/${fileName}`;
  const fallbackPath = `/storage/emulated/0/Documents/TallyKhata/${fileName}`;

  const bizName = String(doc.business?.name || options.businessName || 'টালিখাতা ডিজিটাল');
  const title = String(doc.title || doc.presentation?.title || (isStatement ? 'হিসাব বিবরণী' : 'ব্যবসায়িক রিপোর্ট'));
  const subject = `${bizName} - ${title}`;

  const shareableText = String(doc.shareableText || doc.presentation?.shareableText || `${subject}\n${fileName}`);

  return {
    action: 'android.intent.action.SEND',
    type: 'application/pdf',
    mimeType: 'application/pdf',
    fileName,
    authority,
    contentUri,
    fallbackPath,
    subject,
    extraText: shareableText,
    extraStream: contentUri,
    flags: [
      'FLAG_GRANT_READ_URI_PERMISSION',
      'FLAG_ACTIVITY_NEW_TASK'
    ],
    targetPackage: options.targetPackage || null,
    shareOptions: {
      dialogTitle: `${bizName} রিপোর্ট শেয়ার করুন`,
      chooserTitle: 'পিডিএফ শেয়ার করুন',
      mimeType: 'application/pdf',
    },
    printOptions: {
      documentName: fileName.replace(/\.pdf$/, ''),
      orientation: 'PORTRAIT',
      mediaSize: 'ISO_A4',
      colorMode: 'COLOR',
    },
    metadata: {
      documentId: doc.documentId,
      docType: doc.docType,
      generatedAt: doc.generatedAt || new Date().toISOString(),
      businessId: doc.business?.id,
      accountId: doc.account?.id,
    },
  };
}

const ledgerEngine = {
  generateUniqueId,
  validateTransaction,
  validateAccount,
  validateStockAdjustment,
  establishAccountOpeningBalance,
  recalculateAccountRunningBalances,
  recalculateAllAccountBalances,
  createAccountLookupMap,
  queryCustomerAccounts,
  syncCashboxForTransaction,
  removeCashEntriesForTransactions,
  migrateV5toV6,
  calculateAggregateMetrics,
  deriveCashBoxSummary,
  resetCache,
  indexJournalsByAccount,
  normalizeJournalFields,
  normalizeTagadaLogFields,
  normalizeBusinessFields,
  normalizeAccountFields,
  resolveStatementDateRange,
  generateAccountStatement,
  calculateSmsSegments,
  getBulkTagadaEligibleCustomers,
  prepareBulkTagadaBatch,
  generateStatementDocumentPayload,
  REPORT_TYPES,
  escapeHtml,
  generatePrintableHtmlStatement,
  generateConsolidatedReportDocument,
  generatePrintableHtmlReport,
  REPORT_PREFIXES,
  toBengaliNumeral,
  paginateStatementDocument,
  paginateConsolidatedReportDocument,
  generatePdfShareIntentPayload,
  V5_KEY,
  V6_KEY,
  V5_BACKUP_KEY,
};

ledgerEngine.default = ledgerEngine;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ledgerEngine;
}
if (typeof exports !== 'undefined') {
  exports.ledgerEngine = ledgerEngine;
  exports.normalizeJournalFields = normalizeJournalFields;
  exports.normalizeTagadaLogFields = normalizeTagadaLogFields;
  exports.normalizeBusinessFields = normalizeBusinessFields;
  exports.normalizeAccountFields = normalizeAccountFields;
  exports.resolveStatementDateRange = resolveStatementDateRange;
  exports.generateAccountStatement = generateAccountStatement;
  exports.calculateSmsSegments = calculateSmsSegments;
  exports.getBulkTagadaEligibleCustomers = getBulkTagadaEligibleCustomers;
  exports.prepareBulkTagadaBatch = prepareBulkTagadaBatch;
  exports.generateStatementDocumentPayload = generateStatementDocumentPayload;
  exports.REPORT_TYPES = REPORT_TYPES;
  exports.escapeHtml = escapeHtml;
  exports.generatePrintableHtmlStatement = generatePrintableHtmlStatement;
  exports.generateConsolidatedReportDocument = generateConsolidatedReportDocument;
  exports.generatePrintableHtmlReport = generatePrintableHtmlReport;
  exports.REPORT_PREFIXES = REPORT_PREFIXES;
  exports.toBengaliNumeral = toBengaliNumeral;
  exports.paginateStatementDocument = paginateStatementDocument;
  exports.paginateConsolidatedReportDocument = paginateConsolidatedReportDocument;
  exports.generatePdfShareIntentPayload = generatePdfShareIntentPayload;
}