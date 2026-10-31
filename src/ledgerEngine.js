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
    return { valid: false, error: 'টাকার পরিমাণ অস্বাভাবিক বেশি (১০ কোটির বেশি অনুমোদিত নয়)।' };
  }
  if (type !== 'given' && type !== 'received') {
    return { valid: false, error: 'লেনদেনের ধরন সঠিক নয় (দিলাম অথবা পেলাম হতে হবে)।' };
  }
  return { valid: true, amount: Math.round(num * 100) / 100 };
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

  const targetBizId = account.businessId !== undefined && account.businessId !== null ? String(account.businessId) : null;
  const isBizMatch = (j) => {
    const jBizId = j && j.businessId !== undefined && j.businessId !== null ? String(j.businessId) : null;
    if (targetBizId && jBizId) return targetBizId === jBizId;
    if (targetBizId && !jBizId) return targetBizId === '1' || targetBizId === 'default';
    if (!targetBizId && jBizId) return jBizId === '1' || jBizId === 'default';
    return true;
  };

  for (const j of allJournals) {
    if (j && String(j.accountId) === targetAccId && isBizMatch(j)) {
      const numAmt = Number(j.amount);
      if (isNaN(numAmt)) {
        hasInvalid = true;
        break;
      }
      const amtPaisa = Math.round(numAmt * 100);
      if (isCust) {
        if (j.type === 'given') jNetPaisa += amtPaisa;
        else if (j.type === 'received') jNetPaisa -= amtPaisa;
        else hasInvalid = true;
      } else {
        if (j.type === 'received') jNetPaisa += amtPaisa;
        else if (j.type === 'given') jNetPaisa -= amtPaisa;
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
    const dA = a.date || '';
    const dB = b.date || '';
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

  // 1. Index all journals by accountId in O(M) time
  const journalMap = new Map();
  for (let i = 0; i < allJournals.length; i++) {
    const j = allJournals[i];
    if (!j || j.accountId === undefined || j.accountId === null) continue;
    if (businessId && j.businessId && String(j.businessId) !== String(businessId)) {
      continue;
    }
    const accKey = String(j.accountId);
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

    if (businessId && account.businessId && String(account.businessId) !== String(businessId)) {
      updatedAccounts.push(account);
      continue;
    }

    const isCustomer = account.type === 1;
    const targetAccId = String(account.id);
    const targetBizId = account.businessId !== undefined && account.businessId !== null ? String(account.businessId) : null;
    const rawTargetJournals = journalMap.get(targetAccId) || [];
    const targetJournals = rawTargetJournals.filter(j => {
      const jBizId = j.businessId !== undefined && j.businessId !== null ? String(j.businessId) : null;
      if (targetBizId && jBizId) return targetBizId === jBizId;
      if (targetBizId && !jBizId) return targetBizId === '1' || targetBizId === 'default';
      if (!targetBizId && jBizId) return jBizId === '1' || jBizId === 'default';
      return true;
    });

    let openingBal = 0;
    if (account.openingBalance !== undefined && account.openingBalance !== null) {
      openingBal = Number(account.openingBalance) || 0;
    } else if (account.initialBalance !== undefined && account.initialBalance !== null) {
      openingBal = Number(account.initialBalance) || 0;
    }

    if (targetJournals.length > 0) {
      sortJournalsChronologically(targetJournals);

      let runningPaisa = Math.round(openingBal * 100);
      for (let k = 0; k < targetJournals.length; k++) {
        const j = targetJournals[k];
        const numAmt = Number(j.amount) || 0;
        const amtPaisa = Math.round(numAmt * 100);
        if (isCustomer) {
          if (j.type === 'given') runningPaisa += amtPaisa;
          else if (j.type === 'received') runningPaisa -= amtPaisa;
        } else {
          if (j.type === 'received') runningPaisa += amtPaisa;
          else if (j.type === 'given') runningPaisa -= amtPaisa;
        }
        j.runningBalance = runningPaisa / 100;
        updatedJournalsMap.set(String(j.id), j);
      }

      const finalBalance = runningPaisa / 100;
      updatedAccounts.push({
        ...account,
        balance: finalBalance,
        openingBalance: Math.round(openingBal * 100) / 100,
      });
    } else {
      const finalBalance = Math.round(openingBal * 100) / 100;
      updatedAccounts.push({
        ...account,
        balance: finalBalance,
        openingBalance: finalBalance,
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

  // If optionsOrIndex is a Map (pre-indexed journals), do O(1) lookup
  let targetJournals = [];
  const targetBizId = account.businessId !== undefined && account.businessId !== null ? String(account.businessId) : null;
  const isBizMatch = (j) => {
    const jBizId = j && j.businessId !== undefined && j.businessId !== null ? String(j.businessId) : null;
    if (targetBizId && jBizId) return targetBizId === jBizId;
    if (targetBizId && !jBizId) return targetBizId === '1' || targetBizId === 'default';
    if (!targetBizId && jBizId) return jBizId === '1' || jBizId === 'default';
    return true;
  };

  if (optionsOrIndex instanceof Map) {
    const effectiveBiz = targetBizId || 'default';
    const list = optionsOrIndex.get(`${effectiveBiz}:${targetAccId}`) || optionsOrIndex.get(targetAccId);
    if (list) {
      targetJournals = list.filter(isBizMatch).map(j => ({ ...j }));
    }
  } else {
    for (let i = 0; i < allJournals.length; i++) {
      const j = allJournals[i];
      if (j && String(j.accountId) === targetAccId && isBizMatch(j)) {
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
  } else if (account.initialBalance !== undefined && account.initialBalance !== null) {
    openingBal = Number(account.initialBalance) || 0;
  }

  // Calculate sequential running balance starting from openingBal baseline in integer paisa
  let runningPaisa = Math.round(openingBal * 100);
  for (let i = 0; i < targetJournals.length; i++) {
    const j = targetJournals[i];
    const numAmt = Number(j.amount) || 0;
    const amtPaisa = Math.round(numAmt * 100);
    if (isCustomer) {
      if (j.type === 'given') runningPaisa += amtPaisa;
      else if (j.type === 'received') runningPaisa -= amtPaisa;
    } else {
      if (j.type === 'received') runningPaisa += amtPaisa;
      else if (j.type === 'given') runningPaisa -= amtPaisa;
    }
    j.runningBalance = runningPaisa / 100;
  }

  const finalBalance = runningPaisa / 100;
  const updatedAccount = {
    ...account,
    balance: finalBalance,
    openingBalance: Math.round(openingBal * 100) / 100,
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
  if (!txn || !account) return cashEntries;

  const isCust = account.type === 1;
  const requiresCashIn = isCust && txn.type === 'received'; // Customer gave cash to me -> cash in (baki aday)
  const requiresCashOut = !isCust && txn.type === 'given'; // I gave cash to supplier -> cash out (supplier pay)
  const requiresEntry = requiresCashIn || requiresCashOut;

  const strTxnId = String(txn.id);
  const existingIdx = cashEntries.findIndex((c) => String(c.linkedTxnId) === strTxnId);

  if (requiresEntry) {
    const entryType = requiresCashIn ? 'in' : 'out';
    const entryCategory = requiresCashIn ? 'baki_aday' : 'supplier_pay';
    const entryDesc = `${account.name} (${requiresCashIn ? 'বাকি আদায়' : 'পাওনা পরিশোধ'})`;

    const linkedEntry = {
      id: existingIdx >= 0 ? cashEntries[existingIdx].id : 'c_' + strTxnId,
      businessId: account.businessId || txn.businessId || '1',
      linkedTxnId: strTxnId,
      category: entryCategory,
      type: entryType,
      amount: Number(txn.amount) || 0,
      desc: txn.desc && txn.desc.trim() ? txn.desc.trim() : entryDesc,
      date: txn.date,
      time: txn.time || '',
    };

    if (existingIdx >= 0) {
      const copy = [...cashEntries];
      copy[existingIdx] = linkedEntry;
      return copy;
    } else {
      return [linkedEntry, ...cashEntries];
    }
  } else {
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


function calculateAggregateMetrics(accounts = [], journals = [], businessId = null) {
  let totalReceivablePaisa = 0;
  let totalPayablePaisa = 0;
  let customerCount = 0;
  let supplierCount = 0;

  for (const acc of accounts) {
    if (!acc) continue;
    if (businessId && acc.businessId && String(acc.businessId) !== String(businessId)) {
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

  return {
    totalReceivable: totalReceivablePaisa / 100,
    totalPayable: totalPayablePaisa / 100,
    netBalance: (totalReceivablePaisa - totalPayablePaisa) / 100,
    customerCount,
    supplierCount,
  };
}

function deriveCashBoxSummary(cashEntries = [], businessId = null) {
  let totalInPaisa = 0;
  let totalOutPaisa = 0;

  for (const entry of cashEntries) {
    if (!entry) continue;
    if (businessId && entry.businessId && String(entry.businessId) !== String(businessId)) {
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

  return {
    cashIn,
    cashOut,
    balance,
    netCash: balance,
  };
}

function indexJournalsByAccount(allJournals = [], businessId = null) {
  const map = new Map();
  for (const j of allJournals) {
    if (!j || j.accountId === undefined || j.accountId === null) continue;
    const effectiveBizId = j.businessId || businessId || 'default';
    if (businessId && j.businessId && String(j.businessId) !== String(businessId)) {
      continue;
    }
    const key = `${effectiveBizId}:${j.accountId}`;
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(j);
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
    if (type !== 'all' && a.type !== type) continue;
    const bal = Number(a.balance) || 0;
    if (filter === 'due' && bal <= 0) continue;
    if (q) {
      const mName = (a.name || '').toLowerCase().includes(q);
      const mPhone = (a.phone || '').includes(q);
      if (!mName && !mPhone) continue;
    }
    results.push(a);
  }

  if (filter === 'highest') {
    results.sort((a, b) => (Number(b.balance) || 0) - (Number(a.balance) || 0));
  }
  return results;
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
  indexJournalsByAccount,
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
}