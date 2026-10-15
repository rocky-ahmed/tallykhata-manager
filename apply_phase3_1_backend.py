import sys

sys.stdout.reconfigure(encoding='utf-8')

# =========================================================================
# 1. UPDATE part1_header_and_utils.js
# =========================================================================
with open('part1_header_and_utils.js', 'r', encoding='utf-8') as f:
    p1 = f.read()

import_target = "import AsyncStorage from '@react-native-async-storage/async-storage';"
new_import = """import AsyncStorage from '@react-native-async-storage/async-storage';
import ledgerEngine from './src/ledgerEngine';

const {
  validateTransaction,
  validateAccount,
  validateStockAdjustment,
  recalculateAccountRunningBalances,
  syncCashboxForTransaction,
  removeCashEntriesForTransactions,
  migrateV5toV6,
  V5_KEY,
  V6_KEY,
  V5_BACKUP_KEY,
} = ledgerEngine;"""

if import_target in p1 and "import ledgerEngine from './src/ledgerEngine';" not in p1:
    p1 = p1.replace(import_target, new_import, 1)
    print("Added ledgerEngine import to part1_header_and_utils.js")
else:
    print("ledgerEngine import already in part1 or import target differed")

with open('part1_header_and_utils.js', 'w', encoding='utf-8') as f:
    f.write(p1)

# =========================================================================
# 2. UPDATE part3_views_and_tabs.js (Labels 1:1 with photo_2026-10-15_18-13-34.jpg)
# =========================================================================
with open('part3_views_and_tabs.js', 'r', encoding='utf-8') as f:
    p3 = f.read()

# Quick grid item 8
p3 = p3.replace(
    "<Text style={styles.quickGridLabel}>ক্যাশবাক্স</Text>",
    "<Text style={styles.quickGridLabel}>ক্যাশবক্স</Text>"
)

# Bottom tab 2
p3 = p3.replace(
    "<Text style={[styles.tabButtonLabel, activeTab === 'cashbox' && styles.tabButtonLabelActive]}>\n            ক্যাশবাক্স\n          </Text>",
    "<Text style={[styles.tabButtonLabel, activeTab === 'cashbox' && styles.tabButtonLabelActive]}>\n            ক্যাশবক্স\n          </Text>"
)

# Bottom tab 3
p3 = p3.replace(
    "<Text style={[styles.tabButtonLabel, activeTab === 'tallypay' && styles.tabButtonLabelActive]}>\n            টালি পে\n          </Text>",
    "<Text style={[styles.tabButtonLabel, activeTab === 'tallypay' && styles.tabButtonLabelActive]}>\n            টালিপে\n          </Text>"
)

with open('part3_views_and_tabs.js', 'w', encoding='utf-8') as f:
    f.write(p3)
print("Updated part3_views_and_tabs.js labels successfully")

# =========================================================================
# 3. UPDATE part2_state_and_handlers.js
# =========================================================================
with open('part2_state_and_handlers.js', 'r', encoding='utf-8') as f:
    p2 = f.read()

# 3.A: Add isSaving state
if "const [isSaving, setIsSaving] = useState(false);" not in p2:
    p2 = p2.replace(
        "function TallyKhataApp() {",
        "function TallyKhataApp() {\n  const [isSaving, setIsSaving] = useState(false);",
        1
    )
    print("Added isSaving state to part2_state_and_handlers.js")

# 3.B: Replace loadSavedData and persistData
old_persist_block = """  const loadSavedData = async () => {
    try {
      const dataStr = await AsyncStorage.getItem(STORAGE_KEY);
      if (dataStr) {
        const d = JSON.parse(dataStr);
        if (Array.isArray(d.accounts)) setAccounts(d.accounts);
        if (Array.isArray(d.journals)) setJournals(d.journals);
        if (Array.isArray(d.cashEntries)) setCashEntries(d.cashEntries);
        if (Array.isArray(d.inventory)) setInventory(d.inventory);
        if (Array.isArray(d.notes)) setNotes(d.notes);
        if (Array.isArray(d.walletTxns)) setWalletTxns(d.walletTxns);
        if (d.walletBalance !== undefined) setWalletBalance(Number(d.walletBalance));
        if (d.businessName) { setBusinessName(d.businessName === 'আমার ব্যবসা প্রতিষ্ঠান' ? 'Mobile Xpress' : d.businessName); }
        if (d.ownerName) setOwnerName(d.ownerName);
        if (d.ownerPhone) setOwnerPhone(d.ownerPhone);
        if (d.businessAddress) setBusinessAddress(d.businessAddress);
        if (Array.isArray(d.businesses)) setBusinesses(d.businesses);
        if (d.remainingSmsCount !== undefined) setRemainingSmsCount(Number(d.remainingSmsCount));
        if (d.openingBalance !== undefined) setOpeningBalance(Number(d.openingBalance));
        if (d.pinEnabled && d.appPin) {
          setPinEnabled(true);
          setAppPin(d.appPin);
          setIsLocked(true);
        }
      }
    } catch (e) {
      console.log('Error loading saved data:', e);
    }
  };

  const persistData = async (overrides = {}) => {
    const payload = {
      accounts: overrides.accounts !== undefined ? overrides.accounts : accounts,
      journals: overrides.journals !== undefined ? overrides.journals : journals,
      cashEntries: overrides.cashEntries !== undefined ? overrides.cashEntries : cashEntries,
      inventory: overrides.inventory !== undefined ? overrides.inventory : inventory,
      notes: overrides.notes !== undefined ? overrides.notes : notes,
      walletBalance: overrides.walletBalance !== undefined ? overrides.walletBalance : walletBalance,
      walletTxns: overrides.walletTxns !== undefined ? overrides.walletTxns : walletTxns,
      businessName: overrides.businessName !== undefined ? overrides.businessName : businessName,
      ownerName: overrides.ownerName !== undefined ? overrides.ownerName : ownerName,
      ownerPhone: overrides.ownerPhone !== undefined ? overrides.ownerPhone : ownerPhone,
      businessAddress: overrides.businessAddress !== undefined ? overrides.businessAddress : businessAddress,
      businesses: overrides.businesses !== undefined ? overrides.businesses : businesses,
      remainingSmsCount: overrides.remainingSmsCount !== undefined ? overrides.remainingSmsCount : remainingSmsCount,
      openingBalance: overrides.openingBalance !== undefined ? overrides.openingBalance : openingBalance,
      pinEnabled: overrides.pinEnabled !== undefined ? overrides.pinEnabled : pinEnabled,
      appPin: overrides.appPin !== undefined ? overrides.appPin : appPin,
    };
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.log('Error saving data:', e);
    }
  };"""

new_persist_block = """  const loadSavedData = async () => {
    try {
      const v6DataStr = await AsyncStorage.getItem(STORAGE_KEY);
      if (v6DataStr) {
        const d = JSON.parse(v6DataStr);
        if (Array.isArray(d.accounts)) setAccounts(d.accounts);
        if (Array.isArray(d.journals)) setJournals(d.journals);
        if (Array.isArray(d.cashEntries)) setCashEntries(d.cashEntries);
        if (Array.isArray(d.inventory)) setInventory(d.inventory);
        if (Array.isArray(d.notes)) setNotes(d.notes);
        if (Array.isArray(d.walletTxns)) setWalletTxns(d.walletTxns);
        if (d.walletBalance !== undefined) setWalletBalance(Number(d.walletBalance));
        if (d.businessName) { setBusinessName(d.businessName === 'আমার ব্যবসা প্রতিষ্ঠান' ? 'Mobile Xpress' : d.businessName); }
        if (d.ownerName) setOwnerName(d.ownerName);
        if (d.ownerPhone) setOwnerPhone(d.ownerPhone);
        if (d.businessAddress) setBusinessAddress(d.businessAddress);
        if (Array.isArray(d.businesses)) setBusinesses(d.businesses);
        if (d.remainingSmsCount !== undefined) setRemainingSmsCount(Number(d.remainingSmsCount));
        if (d.openingBalance !== undefined) setOpeningBalance(Number(d.openingBalance));
        if (Array.isArray(d.tagadaLogs)) setTagadaLogs(d.tagadaLogs);
        if (d.pinEnabled && d.appPin) {
          setPinEnabled(true);
          setAppPin(d.appPin);
          setIsLocked(true);
        }
        return;
      }

      // Safe Data Migration from V5 if V6 not found
      const v5DataStr = await AsyncStorage.getItem(V5_KEY);
      if (v5DataStr) {
        console.log('Detected v5 store. Migrating safely to v6...');
        const mig = migrateV5toV6(v5DataStr);
        if (mig.success && mig.data) {
          const d = mig.data;
          await AsyncStorage.setItem(V5_BACKUP_KEY, v5DataStr);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(d));
          setAccounts(d.accounts);
          setJournals(d.journals);
          setCashEntries(d.cashEntries);
          setInventory(d.inventory);
          setNotes(d.notes);
          setWalletTxns(d.walletTxns);
          setWalletBalance(d.walletBalance);
          setBusinessName(d.businessName);
          setOwnerName(d.ownerName);
          setOwnerPhone(d.ownerPhone);
          setBusinessAddress(d.businessAddress);
          setBusinesses(d.businesses);
          setRemainingSmsCount(d.remainingSmsCount);
          setOpeningBalance(d.openingBalance);
          setTagadaLogs(d.tagadaLogs);
          if (d.pinEnabled && d.appPin) {
            setPinEnabled(true);
            setAppPin(d.appPin);
            setIsLocked(true);
          }
          return;
        }
      }

      // First time initialization
      await persistData();
    } catch (e) {
      console.log('Error loading saved data:', e);
    }
  };

  let persistenceQueue = Promise.resolve();
  const persistData = (overrides = {}) => {
    return new Promise((resolve) => {
      persistenceQueue = persistenceQueue.then(async () => {
        try {
          const payload = {
            accounts: overrides.accounts !== undefined ? overrides.accounts : accounts,
            journals: overrides.journals !== undefined ? overrides.journals : journals,
            cashEntries: overrides.cashEntries !== undefined ? overrides.cashEntries : cashEntries,
            inventory: overrides.inventory !== undefined ? overrides.inventory : inventory,
            notes: overrides.notes !== undefined ? overrides.notes : notes,
            walletBalance: overrides.walletBalance !== undefined ? overrides.walletBalance : walletBalance,
            walletTxns: overrides.walletTxns !== undefined ? overrides.walletTxns : walletTxns,
            businessName: overrides.businessName !== undefined ? overrides.businessName : businessName,
            ownerName: overrides.ownerName !== undefined ? overrides.ownerName : ownerName,
            ownerPhone: overrides.ownerPhone !== undefined ? overrides.ownerPhone : ownerPhone,
            businessAddress: overrides.businessAddress !== undefined ? overrides.businessAddress : businessAddress,
            businesses: overrides.businesses !== undefined ? overrides.businesses : businesses,
            remainingSmsCount: overrides.remainingSmsCount !== undefined ? overrides.remainingSmsCount : remainingSmsCount,
            openingBalance: overrides.openingBalance !== undefined ? overrides.openingBalance : openingBalance,
            pinEnabled: overrides.pinEnabled !== undefined ? overrides.pinEnabled : pinEnabled,
            appPin: overrides.appPin !== undefined ? overrides.appPin : appPin,
            tagadaLogs: overrides.tagadaLogs !== undefined ? overrides.tagadaLogs : tagadaLogs,
          };
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
          resolve({ success: true, payload });
        } catch (err) {
          console.error('persistData write error:', err);
          resolve({ success: false, error: err });
        }
      });
    });
  };"""

if old_persist_block in p2:
    p2 = p2.replace(old_persist_block, new_persist_block, 1)
    print("Replaced loadSavedData and persistData with safe queue mutex & v5 migration")
else:
    print("Warning: old_persist_block not found exactly in p2")

# 3.C: Replace handleSaveTransaction, handleUpdateTransaction, handleDeleteTransaction, handleSaveAccount, handleDeleteAccount
old_tx_block = """  // --- HANDLER: SAVE TRANSACTION (WITH CASHBOX SYNC) ---
  const handleSaveTransaction = () => {
    if (!selectedAccount) return;
    const amt = safeEvalCalc(calcExpr);
    if (!amt || amt <= 0) {
      Alert.alert('সতর্কতা', 'সঠিক টাকার পরিমাণ দিন');
      return;
    }

    const isCust = selectedAccount.type === 1;
    let newBal = Number(selectedAccount.balance) || 0;
    if (isCust) {
      newBal = txnType === 'given' ? newBal + amt : newBal - amt;
    } else {
      newBal = txnType === 'given' ? newBal - amt : newBal + amt;
    }

    const updatedAccountObj = { ...selectedAccount, balance: newBal };
    const updatedAccounts = accounts.map((a) =>
      a.id === selectedAccount.id ? updatedAccountObj : a
    );
    setSelectedAccount(updatedAccountObj);
    setAccounts(updatedAccounts);

    const txnId = Date.now().toString();
    const defaultDesc = txnType === 'given'
      ? (isCust ? 'বাকি বিক্রি' : 'মাল ক্রয় বাবদ দেনা')
      : (isCust ? 'বাকি আদায় (জমা)' : 'টাকা পরিশোধ');

    const newJournal = {
      id: txnId,
      accountId: selectedAccount.id,
      type: txnType,
      amount: amt,
      desc: txnDesc.trim() || defaultDesc,
      date: txnDate,
      time: getTimeString(),
      runningBalance: newBal,
    };
    const updatedJournals = [newJournal, ...journals];
    setJournals(updatedJournals);

    // Automatic Cashbox Double-Entry
    let updatedCash = cashEntries;
    if (isCust && txnType === 'received') {
      // Customer paid cash -> Cash In
      const cashEntry = {
        id: 'c_' + txnId,
        linkedTxnId: txnId,
        category: 'baki_aday',
        type: 'in',
        amount: amt,
        desc: `${selectedAccount.name} (বাকি আদায়)`,
        date: txnDate,
        time: getTimeString(),
      };
      updatedCash = [cashEntry, ...cashEntries];
      setCashEntries(updatedCash);
    } else if (!isCust && txnType === 'given') {
      // Supplier paid cash -> Cash Out
      const cashEntry = {
        id: 'c_' + txnId,
        linkedTxnId: txnId,
        category: 'supplier_pay',
        type: 'out',
        amount: amt,
        desc: `${selectedAccount.name} (পাওনা পরিশোধ)`,
        date: txnDate,
        time: getTimeString(),
      };
      updatedCash = [cashEntry, ...cashEntries];
      setCashEntries(updatedCash);
    }

    persistData({ accounts: updatedAccounts, journals: updatedJournals, cashEntries: updatedCash });
    setModalAddTxn(false);
  };

  // --- HANDLER: EDIT TRANSACTION (WITH RECALCULATION & CASH SYNC) ---
  const handleOpenEditTxn = (txn) => {
    setEditTxnId(txn.id);
    setEditAmount(String(txn.amount));
    setEditDesc(txn.desc || '');
    setModalVoucher(false);
    setModalEditTxn(true);
  };

  const handleUpdateTransaction = () => {
    if (!selectedAccount) return;
    const amt = parseFloat(editAmount);
    if (!amt || amt <= 0) {
      Alert.alert('সতর্কতা', 'সঠিক টাকার পরিমাণ দিন');
      return;
    }
    const targetTxn = journals.find((j) => j.id === editTxnId);
    if (!targetTxn) return;

    const diff = amt - targetTxn.amount;
    const isCust = selectedAccount.type === 1;
    let newBal = selectedAccount.balance;
    if (isCust) {
      newBal = targetTxn.type === 'given' ? newBal + diff : newBal - diff;
    } else {
      newBal = targetTxn.type === 'given' ? newBal - diff : newBal + diff;
    }

    const updatedAccountObj = { ...selectedAccount, balance: newBal };
    const updatedAccounts = accounts.map((a) =>
      a.id === selectedAccount.id ? updatedAccountObj : a
    );
    const updatedJournals = journals.map((j) =>
      j.id === editTxnId ? { ...j, amount: amt, desc: editDesc.trim() || j.desc } : j
    );

    // Update synced cash entry if present
    const updatedCash = cashEntries.map((c) =>
      c.linkedTxnId === editTxnId ? { ...c, amount: amt } : c
    );

    setSelectedAccount(updatedAccountObj);
    setAccounts(updatedAccounts);
    setJournals(updatedJournals);
    setCashEntries(updatedCash);
    persistData({ accounts: updatedAccounts, journals: updatedJournals, cashEntries: updatedCash });

    setModalEditTxn(false);
    setEditTxnId(null);
  };

  // --- HANDLER: DELETE TRANSACTION (WITH CASH SYNC) ---
  const handleDeleteTransaction = (txnId) => {
    if (!selectedAccount) return;
    Alert.alert(
      'লেনদেন মুছবেন?',
      'এই লেনদেনটি মুছে ফেললে খাতার ব্যালেন্স স্বয়ংক্রিয়ভাবে পুনর্গণনা হবে।',
      [
        { text: 'বাতিল', style: 'cancel' },
        {
          text: 'মুছুন',
          style: 'destructive',
          onPress: () => {
            const targetJ = journals.find((j) => j.id === txnId);
            if (!targetJ) return;

            const isCust = selectedAccount.type === 1;
            let newBal = selectedAccount.balance;
            if (isCust) {
              newBal = targetJ.type === 'given' ? newBal - targetJ.amount : newBal + targetJ.amount;
            } else {
              newBal = targetJ.type === 'given' ? newBal + targetJ.amount : newBal - targetJ.amount;
            }

            const updatedAccountObj = { ...selectedAccount, balance: newBal };
            const updatedAccounts = accounts.map((a) =>
              a.id === selectedAccount.id ? updatedAccountObj : a
            );
            const updatedJournals = journals.filter((j) => j.id !== txnId);
            const updatedCash = cashEntries.filter((c) => c.linkedTxnId !== txnId);

            setSelectedAccount(updatedAccountObj);
            setAccounts(updatedAccounts);
            setJournals(updatedJournals);
            setCashEntries(updatedCash);
            persistData({ accounts: updatedAccounts, journals: updatedJournals, cashEntries: updatedCash });
            setModalVoucher(false);
          },
        },
      ]
    );
  };

  // --- HANDLER: CREATE / EDIT / DELETE ACCOUNT ---
  const handleSaveAccount = () => {
    if (!accName.trim()) {
      Alert.alert('সতর্কতা', 'দয়া করে নাম লিখুন');
      return;
    }
    const bal = parseFloat(accInitialBal) || 0;
    const newId = Date.now().toString();
    const newAcc = {
      id: newId,
      name: accName.trim(),
      phone: accPhone.trim(),
      address: accAddress.trim(),
      type: accType,
      balance: bal,
      createDate: getTodayDate(),
    };
    const updatedAccounts = [newAcc, ...accounts];
    setAccounts(updatedAccounts);

    let updatedJournals = journals;
    if (bal > 0) {
      const initJ = {
        id: (Date.now() + 1).toString(),
        accountId: newId,
        type: 'given',
        amount: bal,
        desc: 'পূর্বের বাকি (জের)',
        date: getTodayDate(),
        time: getTimeString(),
        runningBalance: bal,
      };
      updatedJournals = [initJ, ...journals];
      setJournals(updatedJournals);
    }

    persistData({ accounts: updatedAccounts, journals: updatedJournals });
    setAccName('');
    setAccPhone('');
    setAccAddress('');
    setAccInitialBal('');
    setModalAddAccount(false);
  };

  const handleOpenEditAccount = () => {
    if (!selectedAccount) return;
    setAccName(selectedAccount.name || '');
    setAccPhone(selectedAccount.phone || '');
    setAccAddress(selectedAccount.address || '');
    setModalEditAccount(true);
  };

  const handleUpdateAccount = () => {
    if (!selectedAccount) return;
    if (!accName.trim()) {
      Alert.alert('সতর্কতা', 'দয়া করে নাম লিখুন');
      return;
    }
    const updated = {
      ...selectedAccount,
      name: accName.trim(),
      phone: accPhone.trim(),
      address: accAddress.trim(),
    };
    const updatedList = accounts.map((a) => (a.id === selectedAccount.id ? updated : a));
    setSelectedAccount(updated);
    setAccounts(updatedList);
    persistData({ accounts: updatedList });
    setModalEditAccount(false);
    Alert.alert('সফল', 'হিসাবের তথ্য সফলভাবে আপডেট হয়েছে।');
  };

  const handleDeleteAccount = () => {
    if (!selectedAccount) return;
    Alert.alert(
      'খাতা মুছে ফেলবেন?',
      `${selectedAccount?.name || 'এই হিসাব'}-এর সম্পূর্ণ খাতা এবং সকল লেনদেন মুছে যাবে।`,
      [
        { text: 'বাতিল', style: 'cancel' },
        {
          text: 'মুছে ফেলুন',
          style: 'destructive',
          onPress: () => {
            const updatedAccounts = accounts.filter((a) => a.id !== selectedAccount.id);
            const updatedJournals = journals.filter((j) => j.accountId !== selectedAccount.id);
            setAccounts(updatedAccounts);
            setJournals(updatedJournals);
            setSelectedAccount(null);
            persistData({ accounts: updatedAccounts, journals: updatedJournals });
            setCurrentScreen('home');
          },
        },
      ]
    );
  };"""

new_tx_block = """  // --- HANDLER: SAVE TRANSACTION (WITH AUTHORITATIVE LEDGER ENGINE) ---
  const handleSaveTransaction = async () => {
    if (!selectedAccount) return;
    if (isSaving) return;

    const amt = safeEvalCalc(calcExpr);
    const valRes = validateTransaction(amt, txnType, txnDesc);
    if (!valRes.valid) {
      Alert.alert('সতর্কতা', valRes.error);
      return;
    }

    const isCust = selectedAccount.type === 1;
    const txnId = Date.now().toString();
    const defaultDesc = txnType === 'given'
      ? (isCust ? 'বাকি বিক্রি' : 'মাল ক্রয় বাবদ দেনা')
      : (isCust ? 'বাকি আদায় (জমা)' : 'টাকা পরিশোধ');

    const newJournal = {
      id: txnId,
      accountId: selectedAccount.id,
      type: txnType,
      amount: valRes.amount,
      desc: txnDesc.trim() || defaultDesc,
      date: txnDate,
      time: getTimeString(),
    };

    const combinedJournals = [newJournal, ...journals];
    const { updatedAccount, updatedJournals } = recalculateAccountRunningBalances(
      selectedAccount,
      combinedJournals
    );

    const updatedCash = syncCashboxForTransaction(newJournal, selectedAccount, cashEntries);
    const updatedAccounts = accounts.map((a) =>
      a.id === selectedAccount.id ? updatedAccount : a
    );

    setIsSaving(true);
    const saveRes = await persistData({
      accounts: updatedAccounts,
      journals: updatedJournals,
      cashEntries: updatedCash,
    });
    setIsSaving(false);

    if (!saveRes.success) {
      Alert.alert('ত্রুটি', 'লেনদেন সংরক্ষণ করা যায়নি। দয়া করে আবার চেষ্টা করুন।');
      return;
    }

    setSelectedAccount(updatedAccount);
    setAccounts(updatedAccounts);
    setJournals(updatedJournals);
    setCashEntries(updatedCash);

    setCalcExpr('');
    setCalcDisplay('০');
    setTxnDesc('');
    setModalAddTxn(false);
  };

  // --- HANDLER: EDIT TRANSACTION (WITH CHRONOLOGICAL RECALCULATION & CASH SYNC) ---
  const handleOpenEditTxn = (txn) => {
    setEditTxnId(txn.id);
    setEditAmount(String(txn.amount));
    setEditDesc(txn.desc || '');
    setModalVoucher(false);
    setModalEditTxn(true);
  };

  const handleUpdateTransaction = async () => {
    if (!selectedAccount) return;
    if (isSaving) return;

    const targetTxn = journals.find((j) => j.id === editTxnId);
    if (!targetTxn) return;

    const valRes = validateTransaction(editAmount, targetTxn.type, editDesc);
    if (!valRes.valid) {
      Alert.alert('সতর্কতা', valRes.error);
      return;
    }

    const updatedTxn = {
      ...targetTxn,
      amount: valRes.amount,
      desc: editDesc.trim() || targetTxn.desc,
    };

    const baseJournals = journals.map((j) =>
      j.id === editTxnId ? updatedTxn : j
    );

    const { updatedAccount, updatedJournals } = recalculateAccountRunningBalances(
      selectedAccount,
      baseJournals
    );

    const updatedCash = syncCashboxForTransaction(updatedTxn, selectedAccount, cashEntries);
    const updatedAccounts = accounts.map((a) =>
      a.id === selectedAccount.id ? updatedAccount : a
    );

    setIsSaving(true);
    const saveRes = await persistData({
      accounts: updatedAccounts,
      journals: updatedJournals,
      cashEntries: updatedCash,
    });
    setIsSaving(false);

    if (!saveRes.success) {
      Alert.alert('ত্রুটি', 'লেনদেন সংশোধন সংরক্ষণ করা যায়নি।');
      return;
    }

    setSelectedAccount(updatedAccount);
    setAccounts(updatedAccounts);
    setJournals(updatedJournals);
    setCashEntries(updatedCash);

    setModalEditTxn(false);
    setEditTxnId(null);
  };

  // --- HANDLER: DELETE TRANSACTION (WITH RECALCULATION & CASH SYNC) ---
  const handleDeleteTransaction = (txnId) => {
    if (!selectedAccount) return;
    Alert.alert(
      'লেনদেন মুছবেন?',
      'এই লেনদেনটি মুছে ফেললে খাতার ব্যালেন্স স্বয়ংক্রিয়ভাবে পুনর্গণনা হবে।',
      [
        { text: 'বাতিল', style: 'cancel' },
        {
          text: 'মুছুন',
          style: 'destructive',
          onPress: async () => {
            const targetJ = journals.find((j) => j.id === txnId);
            if (!targetJ) return;

            const remainingJournals = journals.filter((j) => j.id !== txnId);
            const { updatedAccount, updatedJournals } = recalculateAccountRunningBalances(
              selectedAccount,
              remainingJournals
            );

            const updatedCash = removeCashEntriesForTransactions([txnId], cashEntries);
            const updatedAccounts = accounts.map((a) =>
              a.id === selectedAccount.id ? updatedAccount : a
            );

            const saveRes = await persistData({
              accounts: updatedAccounts,
              journals: updatedJournals,
              cashEntries: updatedCash,
            });

            if (!saveRes.success) {
              Alert.alert('ত্রুটি', 'লেনদেন মুছতে সমস্যা হয়েছে।');
              return;
            }

            setSelectedAccount(updatedAccount);
            setAccounts(updatedAccounts);
            setJournals(updatedJournals);
            setCashEntries(updatedCash);
            setModalVoucher(false);
          },
        },
      ]
    );
  };

  // --- HANDLER: CREATE / EDIT / DELETE ACCOUNT (CASCADE INTEGRITY) ---
  const handleSaveAccount = async () => {
    const valRes = validateAccount(accName, accPhone, accInitialBal || 0);
    if (!valRes.valid) {
      Alert.alert('সতর্কতা', valRes.error);
      return;
    }

    const newId = Date.now().toString();
    const newAcc = {
      id: newId,
      name: valRes.name,
      phone: valRes.phone,
      address: accAddress.trim(),
      type: accType,
      balance: valRes.initialBalance,
      createDate: getTodayDate(),
    };

    let updatedJournals = journals;
    if (valRes.initialBalance > 0) {
      const initJ = {
        id: (Date.now() + 1).toString(),
        accountId: newId,
        type: 'given',
        amount: valRes.initialBalance,
        desc: 'পূর্বের বাকি (জের)',
        date: getTodayDate(),
        time: getTimeString(),
        runningBalance: valRes.initialBalance,
      };
      updatedJournals = [initJ, ...journals];
    }

    const updatedAccounts = [newAcc, ...accounts];
    const saveRes = await persistData({ accounts: updatedAccounts, journals: updatedJournals });

    if (!saveRes.success) {
      Alert.alert('ত্রুটি', 'নতুন হিসাব সংরক্ষণ ব্যর্থ হয়েছে।');
      return;
    }

    setAccounts(updatedAccounts);
    setJournals(updatedJournals);
    setAccName('');
    setAccPhone('');
    setAccAddress('');
    setAccInitialBal('');
    setModalAddAccount(false);
  };

  const handleOpenEditAccount = () => {
    if (!selectedAccount) return;
    setAccName(selectedAccount.name || '');
    setAccPhone(selectedAccount.phone || '');
    setAccAddress(selectedAccount.address || '');
    setModalEditAccount(true);
  };

  const handleUpdateAccount = async () => {
    if (!selectedAccount) return;
    const valRes = validateAccount(accName, accPhone, 0);
    if (!valRes.valid) {
      Alert.alert('সতর্কতা', valRes.error);
      return;
    }
    const updated = {
      ...selectedAccount,
      name: valRes.name,
      phone: valRes.phone,
      address: accAddress.trim(),
    };
    const updatedList = accounts.map((a) => (a.id === selectedAccount.id ? updated : a));
    const saveRes = await persistData({ accounts: updatedList });
    if (!saveRes.success) {
      Alert.alert('ত্রুটি', 'হিসাবের তথ্য আপডেট করা যায়নি।');
      return;
    }
    setSelectedAccount(updated);
    setAccounts(updatedList);
    setModalEditAccount(false);
    Alert.alert('সফল', 'হিসাবের তথ্য সফলভাবে আপডেট হয়েছে।');
  };

  const handleDeleteAccount = () => {
    if (!selectedAccount) return;
    Alert.alert(
      'খাতা মুছে ফেলবেন?',
      `${selectedAccount?.name || 'এই হিসাব'}-এর সম্পূর্ণ খাতা এবং সকল লেনদেন মুছে যাবে।`,
      [
        { text: 'বাতিল', style: 'cancel' },
        {
          text: 'মুছে ফেলুন',
          style: 'destructive',
          onPress: async () => {
            const accTxnIds = journals
              .filter((j) => String(j.accountId) === String(selectedAccount.id))
              .map((j) => j.id);

            const updatedAccounts = accounts.filter((a) => a.id !== selectedAccount.id);
            const updatedJournals = journals.filter((j) => String(j.accountId) !== String(selectedAccount.id));
            const updatedCash = removeCashEntriesForTransactions(accTxnIds, cashEntries);

            const saveRes = await persistData({
              accounts: updatedAccounts,
              journals: updatedJournals,
              cashEntries: updatedCash,
            });

            if (!saveRes.success) {
              Alert.alert('ত্রুটি', 'খাতা মুছে ফেলা ব্যর্থ হয়েছে।');
              return;
            }

            setAccounts(updatedAccounts);
            setJournals(updatedJournals);
            setCashEntries(updatedCash);
            setSelectedAccount(null);
            setCurrentScreen('home');
          },
        },
      ]
    );
  };"""

if old_tx_block in p2:
    p2 = p2.replace(old_tx_block, new_tx_block, 1)
    print("Replaced transaction and account handlers with authoritative engine calls")
else:
    print("Warning: old_tx_block not found exactly in p2")

# 3.D: Update handleAdjustStock
old_adjust = """  const handleAdjustStock = () => {
    if (!selectedProduct) return;
    const qty = parseFloat(stockAdjustQty);
    if (!qty || qty <= 0) {
      Alert.alert('সতর্কতা', 'সঠিক পরিমাণ দিন');
      return;
    }
    const diff = stockAdjustType === 'in' ? qty : -qty;
    const updated = inventory.map((p) =>
      p.id === selectedProduct.id ? { ...p, stock: Math.max(0, p.stock + diff) } : p
    );
    setInventory(updated);
    persistData({ inventory: updated });
    setStockAdjustQty('');
    setModalAdjustStock(false);
    setSelectedProduct(null);
  };"""

new_adjust = """  const handleAdjustStock = async () => {
    if (!selectedProduct) return;
    const valRes = validateStockAdjustment(selectedProduct.stock, stockAdjustQty, stockAdjustType);
    if (!valRes.valid) {
      Alert.alert('সতর্কতা', valRes.error);
      return;
    }
    const updated = inventory.map((p) =>
      p.id === selectedProduct.id ? { ...p, stock: valRes.newStock } : p
    );
    const saveRes = await persistData({ inventory: updated });
    if (!saveRes.success) {
      Alert.alert('ত্রুটি', 'স্টক সংরক্ষণ ব্যর্থ হয়েছে।');
      return;
    }
    setInventory(updated);
    setStockAdjustQty('');
    setModalAdjustStock(false);
    setSelectedProduct(null);
  };"""

if old_adjust in p2:
    p2 = p2.replace(old_adjust, new_adjust, 1)
    print("Updated handleAdjustStock with authoritative validation")
else:
    print("Warning: old_adjust not found exactly in p2")

with open('part2_state_and_handlers.js', 'w', encoding='utf-8') as f:
    f.write(p2)
print("Updated part2_state_and_handlers.js successfully")
