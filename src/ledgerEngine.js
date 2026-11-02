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
  if (!isFinite(num) || num <= 0) {
    return { valid: false, error: 'টাকার পরিমাণ অবশ্যই শূন্য (০) থেকে বড় হতে হবে।' };
  }
  if (num > 100000000) {
    return { valid: false, error: 'টাকার পরিমাণ অস্বাভাবিক বেশি (সর্বোচ্চ সীমা ১০ কোটির বেশি অনুমোদিত নয়)।' };
  }

  let normalizedType = type;
  if (type === 1 || type === '1') normalizedType = 'given';
  else if (type === 2 || type === '2') normalizedType = 'received';

  if (normalizedType !== 'given' && normalizedType !== 'received') {
    return { valid: false, error: 'লেনদেনের ধরন সঠিক নয় (দিলাম অথবা পেলাম হতে হবে)।' };
  }
  return { valid: true, amount: Math.round(num * 100) / 100 };
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
}