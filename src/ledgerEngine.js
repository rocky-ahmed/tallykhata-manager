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
  let jNet = 0;
  let hasInvalid = false;

  for (const j of allJournals) {
    if (String(j.accountId) === targetAccId) {
      const amt = Number(j.amount);
      if (isNaN(amt)) {
        hasInvalid = true;
        break;
      }
      if (isCust) {
        if (j.type === 'given') jNet += amt;
        else if (j.type === 'received') jNet -= amt;
        else hasInvalid = true;
      } else {
        if (j.type === 'received') jNet += amt;
        else if (j.type === 'given') jNet -= amt;
        else hasInvalid = true;
      }
    }
  }

  const storedBal = Number(account.balance);
  if (!isNaN(storedBal) && !hasInvalid) {
    return Math.round((storedBal - jNet) * 100) / 100;
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
function recalculateAccountRunningBalances(account, allJournals = []) {
  if (!account || !account.id) {
    return { updatedAccount: account, updatedJournals: allJournals, accountJournals: [] };
  }

  const isCustomer = account.type === 1;
  const targetAccId = String(account.id);

  // Extract journals belonging to this account and others
  const targetJournals = [];
  const otherJournals = [];

  for (const j of allJournals) {
    if (String(j.accountId) === targetAccId) {
      targetJournals.push({ ...j });
    } else {
      otherJournals.push(j);
    }
  }

  // Sort chronologically ascending (oldest first)
  targetJournals.sort((a, b) => {
    const dateComp = (a.date || '').localeCompare(b.date || '');
    if (dateComp !== 0) return dateComp;

    if (a.time && b.time) {
      const timeComp = a.time.localeCompare(b.time);
      if (timeComp !== 0) return timeComp;
    }

    const idA = isNaN(Number(a.id)) ? a.id : Number(a.id);
    const idB = isNaN(Number(b.id)) ? b.id : Number(b.id);
    if (typeof idA === 'number' && typeof idB === 'number') {
      return idA - idB;
    }
    return String(a.id).localeCompare(String(b.id));
  });

  // Determine explicit opening balance baseline
  let openingBal = 0;
  if (account.openingBalance !== undefined && account.openingBalance !== null) {
    openingBal = Number(account.openingBalance) || 0;
  } else if (account.initialBalance !== undefined && account.initialBalance !== null) {
    openingBal = Number(account.initialBalance) || 0;
  }

  // Calculate sequential running balance starting from openingBal baseline
  let running = openingBal;
  for (const j of targetJournals) {
    const amt = Number(j.amount) || 0;
    if (isCustomer) {
      if (j.type === 'given') running += amt;
      else if (j.type === 'received') running -= amt;
    } else {
      if (j.type === 'received') running += amt;
      else if (j.type === 'given') running -= amt;
    }
    j.runningBalance = Math.round(running * 100) / 100;
  }

  const finalBalance = Math.round(running * 100) / 100;
  const updatedAccount = {
    ...account,
    balance: finalBalance,
    openingBalance: Math.round(openingBal * 100) / 100,
  };

  // For UI display, account journals are displayed newest first
  const displayAccountJournals = [...targetJournals].reverse();

  // Combine back into allJournals, replacing modified items by ID
  const targetMap = new Map();
  for (const tj of targetJournals) {
    targetMap.set(String(tj.id), tj);
  }

  const updatedJournals = allJournals.map((orig) => {
    const strId = String(orig.id);
    if (targetMap.has(strId)) {
      return targetMap.get(strId);
    }
    return orig;
  });

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

const ledgerEngine = {
  generateUniqueId,
  validateTransaction,
  validateAccount,
  validateStockAdjustment,
  establishAccountOpeningBalance,
  recalculateAccountRunningBalances,
  syncCashboxForTransaction,
  removeCashEntriesForTransactions,
  migrateV5toV6,
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