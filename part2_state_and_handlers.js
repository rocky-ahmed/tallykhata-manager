function TallyKhataApp() {
  const [isSaving, setIsSaving] = useState(false);
  // Navigation & Tabs
  const [currentScreen, setCurrentScreen] = useState('home'); // 'home' | 'account_ledger'
  const [activeTab, setActiveTab] = useState('home');         // 'home' | 'cashbox' | 'tagada' | 'tallypay' | 'menu'

  // Business Profile
  const [businessName, setBusinessName] = useState('Mobile Xpress');
  const [ownerName, setOwnerName] = useState('স্বত্বাধিকারী');
  const [ownerPhone, setOwnerPhone] = useState('01700000000');
  const [businessAddress, setBusinessAddress] = useState('বাজার রোড, ঢাকা');
  const [openingBalance, setOpeningBalance] = useState(3000);
  const [isGold] = useState(true);

  // Core Data Collections
  const [accounts, setAccounts] = useState(INITIAL_ACCOUNTS);
  const [journals, setJournals] = useState(INITIAL_JOURNALS);
  const [cashEntries, setCashEntries] = useState(INITIAL_CASH_ENTRIES);
  const [inventory, setInventory] = useState(INITIAL_INVENTORY);
  const [notes, setNotes] = useState(INITIAL_NOTES);
  const [walletBalance, setWalletBalance] = useState(1500);
  const [walletTxns, setWalletTxns] = useState(INITIAL_WALLET_TXNS);
  const [tagadaLogs, setTagadaLogs] = useState([]);

  // App Security (PIN Lock)
  const [pinEnabled, setPinEnabled] = useState(false);
  const [appPin, setAppPin] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [pinInput, setPinInput] = useState('');

  // Selected Entities
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedVoucherTxn, setSelectedVoucherTxn] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Search, Filters & Tabs on Home
  const [accountTab, setAccountTab] = useState('customer'); // 'customer' | 'supplier' | 'all'
  const [accountFilter, setAccountFilter] = useState('all'); // 'all' | 'due' | 'highest' | 'recent'
  const [searchQuery, setSearchQuery] = useState('');
  const [cashFilter, setCashFilter] = useState('all');
  const [hideCashAmounts, setHideCashAmounts] = useState(false);
  const [modalFilter, setModalFilter] = useState(false);

  // Calculator & Transaction Entry State
  const [txnType, setTxnType] = useState('given'); // 'given' (দিলাম / লাল) | 'received' (পেলাম / সবুজ)
  const [calcExpr, setCalcExpr] = useState('');
  const [calcDisplay, setCalcDisplay] = useState('০');
  const [txnDesc, setTxnDesc] = useState('');
  const [txnDate, setTxnDate] = useState(getTodayDate());

  // Edit Transaction State
  const [editTxnId, setEditTxnId] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Account Form State
  const [accName, setAccName] = useState('');
  const [accPhone, setAccPhone] = useState('');
  const [accAddress, setAccAddress] = useState('');
  const [accType, setAccType] = useState(1); // 1 = Customer, 2 = Supplier
  const [accInitialBal, setAccInitialBal] = useState('');

  // Cashbox Form State
  const [cashCategory, setCashCategory] = useState('sale');
  const [cashAmount, setCashAmount] = useState('');
  const [cashDesc, setCashDesc] = useState('');
  const [countedCash, setCountedCash] = useState('');

  // Stock Form State
  const [prodName, setProdName] = useState('');
  const [prodUnit, setProdUnit] = useState('কেজি');
  const [prodBuyPrice, setProdBuyPrice] = useState('');
  const [prodSellPrice, setProdSellPrice] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [stockAdjustType, setStockAdjustType] = useState('in');
  const [stockAdjustQty, setStockAdjustQty] = useState('');

  // Business Notes Form
  const [newNoteText, setNewNoteText] = useState('');

  // TallyPay Wallet Forms
  const [addMoneyAmount, setAddMoneyAmount] = useState('');
  const [addMoneyMethod, setAddMoneyMethod] = useState('bKash');
  const [rechargePhone, setRechargePhone] = useState('');
  const [rechargeOperator, setRechargeOperator] = useState('Grameenphone');
  const [rechargeAmount, setRechargeAmount] = useState('');

  // Modals Visibility
  const [modalAddAccount, setModalAddAccount] = useState(false);
  const [modalEditAccount, setModalEditAccount] = useState(false);
  const [modalAddTxn, setModalAddTxn] = useState(false);
  const [modalEditTxn, setModalEditTxn] = useState(false);
  const [modalVoucher, setModalVoucher] = useState(false);
  const [modalAddCash, setModalAddCash] = useState(false);
  const [modalReconcileCash, setModalReconcileCash] = useState(false);
  const [modalAddStock, setModalAddStock] = useState(false);
  const [modalAdjustStock, setModalAdjustStock] = useState(false);
  const [modalTagada, setModalTagada] = useState(false);
  const [modalTallyMessage, setModalTallyMessage] = useState(false);
  const [tallyMessageBalance, setTallyMessageBalance] = useState(50);
  const [modalBanglaQR, setModalBanglaQR] = useState(false);
  const [modalAddMoney, setModalAddMoney] = useState(false);
  const [modalMobileRecharge, setModalMobileRecharge] = useState(false);
  const [modalNotes, setModalNotes] = useState(false);
  const [modalProfitLoss, setModalProfitLoss] = useState(false);
  const [modalFullReport, setModalFullReport] = useState(false);
  const [modalSettings, setModalSettings] = useState(false);
  const [modalBackupRestore, setModalBackupRestore] = useState(false);
  const [modalInbox, setModalInbox] = useState(false);
  const [modalSupport, setModalSupport] = useState(false);
  const [modalPinSetup, setModalPinSetup] = useState(false);
  const [backupJsonText, setBackupJsonText] = useState('');

  // Business Picker State (BusinessPickerBottomSheet)
  const [businesses, setBusinesses] = useState([
    { id: '1', name: 'Mobile Xpress', owner: 'স্বত্বাধিকারী', phone: '01700000000', address: 'বাজার রোড, ঢাকা', isSelected: true },
    { id: '2', name: 'মেসার্স ভাই ভাই এন্টারপ্রাইজ', owner: 'হাজী মো: করিম', phone: '01811223344', address: 'পাইকারি আড়ৎ, ঢাকা', isSelected: false },
    { id: '3', name: 'সোনালী ফ্যাশন ও বস্ত্রালয়', owner: 'আহমেদ উল্লাহ', phone: '01911334455', address: 'নিউ মার্কেট, ঢাকা', isSelected: false },
  ]);
  const [modalBusinessPicker, setModalBusinessPicker] = useState(false);
  const [modalAddBusiness, setModalAddBusiness] = useState(false);
  const [newBizName, setNewBizName] = useState('');
  const [newBizOwner, setNewBizOwner] = useState('');
  const [newBizPhone, setNewBizPhone] = useState('');
  const [newBizAddress, setNewBizAddress] = useState('');

  // Authentic Report Modals
  const [modalBechaKena, setModalBechaKena] = useState(false);
  const [modalBakiReport, setModalBakiReport] = useState(false);
  const [modalCashReport, setModalCashReport] = useState(false);
  const [modalExpenseReport, setModalExpenseReport] = useState(false);
  const [modalMalikReport, setModalMalikReport] = useState(false);
  const [modalMoneyOut, setModalMoneyOut] = useState(false);
  const [reportDateTab, setReportDateTab] = useState('daily'); // 'daily' | 'monthly'
  const [selectedReportDate, setSelectedReportDate] = useState(getTodayDate());
  const [reportSummaryOnly, setReportSummaryOnly] = useState(false);

  // Cash Reconcile Denominations (activity_cash_adjustment.xml)
  const [notes1000, setNotes1000] = useState('');
  const [notes500, setNotes500] = useState('');
  const [notes200, setNotes200] = useState('');
  const [notes100, setNotes100] = useState('');
  const [notes50, setNotes50] = useState('');
  const [notes20, setNotes20] = useState('');
  const [notes10, setNotes10] = useState('');
  const [notes5, setNotes5] = useState('');
  const [notes2, setNotes2] = useState('');
  const [notes1, setNotes1] = useState('');

  // Tagada State
  const [remainingSmsCount, setRemainingSmsCount] = useState(5);
  const [tagadaCustomer, setTagadaCustomer] = useState(null);
  const [tagadaCustomMsg, setTagadaCustomMsg] = useState('');

  // Money Out State
  const [moneyOutAmount, setMoneyOutAmount] = useState('');
  const [moneyOutMethod, setMoneyOutMethod] = useState('bank'); // 'bank' | 'bkash' | 'nagad'
  const [moneyOutAccNumber, setMoneyOutAccNumber] = useState('');

  // --- PERSISTENCE: LOAD & SAVE ---
  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      const res = await storageRepository.loadInitialData();
      if (res.success && res.data) {
        const d = res.data;
        if (Array.isArray(d.accounts)) setAccounts(d.accounts);
        if (Array.isArray(d.journals)) setJournals(d.journals);
        if (Array.isArray(d.cashEntries)) setCashEntries(d.cashEntries);
        if (Array.isArray(d.inventory)) setInventory(d.inventory);
        if (Array.isArray(d.notes)) setNotes(d.notes);
        if (Array.isArray(d.walletTxns)) setWalletTxns(d.walletTxns);
        if (d.walletBalance !== undefined) setWalletBalance(Number(d.walletBalance));
        if (d.businessName) {
          setBusinessName(d.businessName === 'আমার ব্যবসা প্রতিষ্ঠান' ? 'Mobile Xpress' : d.businessName);
        }
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
      } else {
        console.warn('Failed to load initial data from storageRepository:', res.error);
      }
    } catch (e) {
      console.log('Error loading saved data:', e);
    }
  };

  const persistData = async (overrides = {}) => {
    try {
      const saveRes = await storageRepository.persistData((prevStore) => {
        return {
          ...prevStore,
          accounts: overrides.accounts !== undefined ? overrides.accounts : (prevStore.accounts || accounts),
          journals: overrides.journals !== undefined ? overrides.journals : (prevStore.journals || journals),
          cashEntries: overrides.cashEntries !== undefined ? overrides.cashEntries : (prevStore.cashEntries || cashEntries),
          inventory: overrides.inventory !== undefined ? overrides.inventory : (prevStore.inventory || inventory),
          notes: overrides.notes !== undefined ? overrides.notes : (prevStore.notes || notes),
          walletBalance: overrides.walletBalance !== undefined ? overrides.walletBalance : (prevStore.walletBalance ?? walletBalance),
          walletTxns: overrides.walletTxns !== undefined ? overrides.walletTxns : (prevStore.walletTxns || walletTxns),
          businessName: overrides.businessName !== undefined ? overrides.businessName : (prevStore.businessName || businessName),
          ownerName: overrides.ownerName !== undefined ? overrides.ownerName : (prevStore.ownerName || ownerName),
          ownerPhone: overrides.ownerPhone !== undefined ? overrides.ownerPhone : (prevStore.ownerPhone || ownerPhone),
          businessAddress: overrides.businessAddress !== undefined ? overrides.businessAddress : (prevStore.businessAddress || businessAddress),
          businesses: overrides.businesses !== undefined ? overrides.businesses : (prevStore.businesses || businesses),
          remainingSmsCount: overrides.remainingSmsCount !== undefined ? overrides.remainingSmsCount : (prevStore.remainingSmsCount ?? remainingSmsCount),
          openingBalance: overrides.openingBalance !== undefined ? overrides.openingBalance : (prevStore.openingBalance ?? openingBalance),
          pinEnabled: overrides.pinEnabled !== undefined ? overrides.pinEnabled : (prevStore.pinEnabled ?? pinEnabled),
          appPin: overrides.appPin !== undefined ? overrides.appPin : (prevStore.appPin || appPin),
          tagadaLogs: overrides.tagadaLogs !== undefined ? overrides.tagadaLogs : (prevStore.tagadaLogs || tagadaLogs),
        };
      });
      return saveRes;
    } catch (err) {
      console.error('persistData write error:', err);
      return { success: false, error: err };
    }
  };

  // --- FINANCIAL CALCULATIONS & DOUBLE-ENTRY SYNC ---
  let totalCustomerDue = 0;
  let totalSupplierDue = 0;
  (accounts || []).forEach((a) => {
    const bal = Number(a.balance) || 0;
    if (a.type === 1 && bal > 0) totalCustomerDue += bal;
    if (a.type === 2 && bal > 0) totalSupplierDue += bal;
  });

  let totalCash = Number(openingBalance) || 0;
  let todayCashIn = 0;
  let todayCashOut = 0;
  let todaySales = 0;
  let todayCosts = 0;
  const todayStr = getTodayDate();

  (cashEntries || []).forEach((c) => {
    const amt = Number(c.amount) || 0;
    if (c.type === 'in') {
      totalCash += amt;
      if (c.date === todayStr) {
        todayCashIn += amt;
        if (c.category === 'sale') todaySales += amt;
      }
    } else {
      totalCash -= amt;
      if (c.date === todayStr) {
        todayCashOut += amt;
        if (c.category === 'cost') todayCosts += amt;
      }
    }
  });

  let todayBakiAday = 0;
  let todaySupplierPay = 0;
  (cashEntries || []).forEach((c) => {
    const amt = Number(c.amount) || 0;
    if (c.date === todayStr) {
      if (c.category === 'baki_aday') todayBakiAday += amt;
      if (c.category === 'supplier_pay') todaySupplierPay += amt;
    }
  });

  const countedFromNotes =
    (Number(notes1000) || 0) * 1000 +
    (Number(notes500) || 0) * 500 +
    (Number(notes200) || 0) * 200 +
    (Number(notes100) || 0) * 100 +
    (Number(notes50) || 0) * 50 +
    (Number(notes20) || 0) * 20 +
    (Number(notes10) || 0) * 10 +
    (Number(notes5) || 0) * 5 +
    (Number(notes2) || 0) * 2 +
    (Number(notes1) || 0) * 1;

  let totalStockCost = 0;
  let totalStockSaleValue = 0;
  (inventory || []).forEach((item) => {
    const qty = Number(item.stock) || 0;
    totalStockCost += qty * (Number(item.buyPrice) || 0);
    totalStockSaleValue += qty * (Number(item.sellPrice) || 0);
  });

  // --- CALCULATOR ENGINE HANDLER ---
  const handleCalcPress = (btn) => {
    if (btn === 'C') {
      setCalcExpr('');
      setCalcDisplay('০');
      return;
    }
    if (btn === '⌫') {
      if (!calcExpr) return;
      const nextExpr = calcExpr.slice(0, -1);
      setCalcExpr(nextExpr);
      const res = safeEvalCalc(nextExpr);
      setCalcDisplay(res ? formatMoney(res) : '০');
      return;
    }
    if (btn === '=') {
      const res = safeEvalCalc(calcExpr);
      setCalcExpr(String(res));
      setCalcDisplay(formatMoney(res));
      return;
    }
    const nextExpr = calcExpr + btn;
    setCalcExpr(nextExpr);
    const res = safeEvalCalc(nextExpr);
    setCalcDisplay(res ? formatMoney(res) : '০');
  };

  const handleQuickChipAdd = (val) => {
    const currentNum = safeEvalCalc(calcExpr) || 0;
    const nextTotal = currentNum + val;
    setCalcExpr(String(nextTotal));
    setCalcDisplay(formatMoney(nextTotal));
  };

  // --- HANDLER: OPEN TRANSACTION ENTRY MODAL ---
  const handleOpenAddTxn = (type) => {
    setTxnType(type);
    setCalcExpr('');
    setCalcDisplay('০');
    setTxnDesc('');
    setTxnDate(getTodayDate());
    setModalAddTxn(true);
  };

  // --- HANDLER: SAVE TRANSACTION (WITH AUTHORITATIVE LEDGER ENGINE) ---
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
        type: accType === 1 ? 'given' : 'received',
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
  };

  // --- HANDLER: CASHBOX ENTRY & RECONCILE ---
  const handleSaveCashEntry = async () => {
    const amt = parseFloat(cashAmount);
    if (!amt || amt <= 0) {
      Alert.alert('সতর্কতা', 'সঠিক টাকার পরিমাণ লিখুন');
      return;
    }
    const isIn = cashCategory === 'sale' || cashCategory === 'malik_in';
    const type = isIn ? 'in' : 'out';

    let defaultDesc = 'নগদ এন্ট্রি';
    if (cashCategory === 'sale') defaultDesc = 'নগদ পণ্য বিক্রয়';
    else if (cashCategory === 'buy') defaultDesc = 'নগদ মালামাল ক্রয়';
    else if (cashCategory === 'cost') defaultDesc = 'দোকান পরিচালনা খরচ';
    else if (cashCategory === 'malik_in') defaultDesc = 'মালিক দিল (ক্যাশ জমা)';
    else if (cashCategory === 'malik_out') defaultDesc = 'মালিক নিল (ক্যাশ উত্তোলন)';

    const newEntry = {
      id: Date.now().toString(),
      category: cashCategory,
      type: type,
      amount: amt,
      desc: cashDesc.trim() || defaultDesc,
      date: getTodayDate(),
      time: getTimeString(),
    };

    const updated = [newEntry, ...cashEntries];
    const saveRes = await persistData({ cashEntries: updated });
    if (!saveRes.success) {
      Alert.alert('ত্রুটি', 'ক্যাশ এন্ট্রি সংরক্ষণ করা যায়নি।');
      return;
    }
    setCashEntries(updated);
    setCashAmount('');
    setCashDesc('');
    setModalAddCash(false);
  };

  const handleDeleteCashEntry = (id) => {
    Alert.alert('ক্যাশ এন্ট্রি মুছবেন?', 'এই ক্যাশ রেকর্ডটি মুছে ফেলতে চান?', [
      { text: 'বাতিল', style: 'cancel' },
      {
        text: 'মুছুন',
        style: 'destructive',
        onPress: async () => {
          const updated = cashEntries.filter((c) => c.id !== id);
          const saveRes = await persistData({ cashEntries: updated });
          if (!saveRes.success) {
            Alert.alert('ত্রুটি', 'ক্যাশ এন্ট্রি মুছতে সমস্যা হয়েছে।');
            return;
          }
          setCashEntries(updated);
        },
      },
    ]);
  };

  const handleSaveReconciliation = async () => {
    const counted = parseFloat(countedCash);
    if (isNaN(counted)) {
      Alert.alert('সতর্কতা', 'ড্রয়ারের আসল ক্যাশ টাকার পরিমাণ লিখুন');
      return;
    }
    const diff = counted - totalCash;
    if (diff === 0) {
      Alert.alert('সফল', 'ক্যাশবক্স পুরোপুরি মিলে গেছে! কোনো গরমিল নেই।');
      setModalReconcileCash(false);
      return;
    }
    // Record adjustment
    const adjEntry = {
      id: Date.now().toString(),
      category: diff > 0 ? 'malik_in' : 'cost',
      type: diff > 0 ? 'in' : 'out',
      amount: Math.abs(diff),
      desc: diff > 0 ? 'ক্যাশ সমন্বয় (উদ্বৃত্ত জমা)' : 'ক্যাশ সমন্বয় (ঘাটতি সমন্বয়)',
      date: getTodayDate(),
      time: getTimeString(),
    };
    const updated = [adjEntry, ...cashEntries];
    const saveRes = await persistData({ cashEntries: updated });
    if (!saveRes.success) {
      Alert.alert('ত্রুটি', 'ক্যাশবক্স সমন্বয় সংরক্ষণ করা যায়নি।');
      return;
    }
    setCashEntries(updated);
    setModalReconcileCash(false);
    Alert.alert('সফল', 'ক্যাশবক্স সমন্বয় রেকর্ড সম্পন্ন হয়েছে।');
  };

  // --- HANDLER: STOCK INVENTORY ---
  const handleSaveProduct = async () => {
    if (!prodName.trim()) {
      Alert.alert('সতর্কতা', 'পণ্যের নাম লিখুন');
      return;
    }
    const newP = {
      id: Date.now().toString(),
      name: prodName.trim(),
      unit: prodUnit.trim() || 'পিস',
      buyPrice: parseFloat(prodBuyPrice) || 0,
      sellPrice: parseFloat(prodSellPrice) || 0,
      stock: parseFloat(prodStock) || 0,
    };
    const updated = [newP, ...inventory];
    const saveRes = await persistData({ inventory: updated });
    if (!saveRes.success) {
      Alert.alert('ত্রুটি', 'পণ্য সংরক্ষণ করা যায়নি।');
      return;
    }
    setInventory(updated);
    setProdName('');
    setProdBuyPrice('');
    setProdSellPrice('');
    setProdStock('');
    setModalAddStock(false);
  };

  const handleAdjustStock = async () => {
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
  };

  const handleDeleteProduct = (id) => {
    Alert.alert('পণ্য মুছবেন?', 'এই পণ্যটি তালিকা থেকে মুছে ফেলতে চান?', [
      { text: 'বাতিল', style: 'cancel' },
      {
        text: 'মুছুন',
        style: 'destructive',
        onPress: async () => {
          const updated = inventory.filter((p) => p.id !== id);
          const saveRes = await persistData({ inventory: updated });
          if (!saveRes.success) {
            Alert.alert('ত্রুটি', 'পণ্য মুছে ফেলা সম্ভব হয়নি।');
            return;
          }
          setInventory(updated);
        },
      },
    ]);
  };

  // --- HANDLER: BUSINESS NOTES ---
  const handleAddNote = async () => {
    if (!newNoteText.trim()) return;
    const newN = {
      id: Date.now().toString(),
      text: newNoteText.trim(),
      isComplete: false,
      date: getTodayDate(),
    };
    const updated = [newN, ...notes];
    const saveRes = await persistData({ notes: updated });
    if (!saveRes.success) {
      Alert.alert('ত্রুটি', 'নোট সংরক্ষণ করা যায়নি।');
      return;
    }
    setNotes(updated);
    setNewNoteText('');
  };

  const handleToggleNote = async (id) => {
    const updated = notes.map((n) => (n.id === id ? { ...n, isComplete: !n.isComplete } : n));
    const saveRes = await persistData({ notes: updated });
    if (!saveRes.success) {
      Alert.alert('ত্রুটি', 'নোট আপডেট করা যায়নি।');
      return;
    }
    setNotes(updated);
  };

  const handleDeleteNote = async (id) => {
    const updated = notes.filter((n) => n.id !== id);
    const saveRes = await persistData({ notes: updated });
    if (!saveRes.success) {
      Alert.alert('ত্রুটি', 'নোট মুছে ফেলা সম্ভব হয়নি।');
      return;
    }
    setNotes(updated);
  };

  // --- HANDLER: TALLYPAY WALLET ---
  const handleAddMoney = async () => {
    const amt = parseFloat(addMoneyAmount);
    if (!amt || amt <= 0) {
      Alert.alert('সতর্কতা', 'টাকার পরিমাণ দিন');
      return;
    }
    const newBal = walletBalance + amt;
    const newTxn = {
      id: 'w_' + Date.now(),
      title: `অ্যাড মানি (${addMoneyMethod})`,
      amount: amt,
      type: 'in',
      date: getTodayDate(),
      time: getTimeString(),
    };
    const updatedTxns = [newTxn, ...walletTxns];
    const saveRes = await persistData({ walletBalance: newBal, walletTxns: updatedTxns });
    if (!saveRes.success) {
      Alert.alert('ত্রুটি', 'ওয়ালেট আপডেট করা যায়নি।');
      return;
    }
    setWalletBalance(newBal);
    setWalletTxns(updatedTxns);
    setAddMoneyAmount('');
    setModalAddMoney(false);
    Alert.alert('সফল', `৳ ${formatMoney(amt)} টাকা ওয়ালেটে সফলভাবে যোগ হয়েছে (লোকাল লেজার)।`);
  };

  const handleMobileRecharge = async () => {
    const amt = parseFloat(rechargeAmount);
    if (!amt || amt <= 0) {
      Alert.alert('সতর্কতা', 'সঠিক রিচার্জের পরিমাণ দিন');
      return;
    }
    if (walletBalance < amt) {
      Alert.alert('ব্যর্থ', 'ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই। প্রথমে অ্যাড মানি করুন।');
      return;
    }
    const cleanPh = rechargePhone.replace(/[^0-9]/g, '');
    if (cleanPh.length < 11) {
      Alert.alert('সতর্কতা', 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন');
      return;
    }
    const newBal = walletBalance - amt;
    const newTxn = {
      id: 'w_' + Date.now(),
      title: `রিচার্জ (${rechargeOperator} - ${cleanPh})`,
      amount: amt,
      type: 'out',
      date: getTodayDate(),
      time: getTimeString(),
    };
    const updatedTxns = [newTxn, ...walletTxns];
    const saveRes = await persistData({ walletBalance: newBal, walletTxns: updatedTxns });
    if (!saveRes.success) {
      Alert.alert('ত্রুটি', 'রিচার্জ সংরক্ষণ করা যায়নি।');
      return;
    }
    setWalletBalance(newBal);
    setWalletTxns(updatedTxns);
    setRechargePhone('');
    setRechargeAmount('');
    setModalMobileRecharge(false);
    Alert.alert('সফল', `${cleanPh} নম্বরে ৳ ${formatMoney(amt)} রিচার্জ সফল হয়েছে (লোকাল লেজার)।`);
  };

  // --- HANDLER: TAGADA REMINDER TEMPLATES ---
  const generateTagadaMessage = (account) => {
    const acc = account || selectedAccount;
    if (!acc) return '';
    return (
      `আসসালামু আলাইকুম ${(acc.name || 'সম্মানিত গ্রাহক')},\n` +
      `${businessName}-এ আপনার বকেয়া হিসাব বাবদ মোট ৳ ${formatMoney(acc.balance)} টাকা পাওনা রয়েছে। ` +
      `অনুগ্রহ করে বকেয়া পরিশোধ করার জন্য অনুরোধ করা হলো। ধন্যবাদ।\n` +
      `যোগাযোগ: ${ownerPhone}`
    );
  };

  const handleSendTagadaSMS = (account) => {
    const acc = account || selectedAccount;
    if (!acc) return;
    const text = generateTagadaMessage(acc);
    const phone = acc.phone ? acc.phone.replace(/[^0-9+]/g, '') : '';
    const url = `sms:${phone}?body=${encodeURIComponent(text)}`;
    Linking.openURL(url).catch(() => {
      Share.share({ message: text });
    });
    setModalTagada(false);
  };

  const handleSendTagadaWhatsApp = (account) => {
    const acc = account || selectedAccount;
    if (!acc) return;
    const text = generateTagadaMessage(acc);
    let phone = acc.phone ? acc.phone.replace(/[^0-9]/g, '') : '';
    if (phone.startsWith('01')) phone = '88' + phone;
    const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(text)}`;
    Linking.openURL(url).catch(() => {
      Share.share({ message: text });
    });
    setModalTagada(false);
  };

  const handleMakeCall = (phone) => {
    if (!phone) {
      Alert.alert('সতর্কতা', 'কোনো মোবাইল নম্বর নেই');
      return;
    }
    const clean = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${clean}`).catch(() => {
      Alert.alert('কল ব্যর্থ', 'কল অ্যাপ ওপেন করা যায়নি');
    });
  };

  // --- HANDLER: BACKUP & RESTORE ---
  const handleExportBackup = () => {
    const backupObj = {
      version: '4.0',
      appName: 'TallyKhata Offline',
      exportDate: new Date().toISOString(),
      businessName,
      ownerName,
      ownerPhone,
      businessAddress,
      openingBalance,
      accounts,
      journals,
      cashEntries,
      inventory,
      notes,
      walletBalance,
      walletTxns,
    };
    const jsonStr = JSON.stringify(backupObj, null, 2);
    setBackupJsonText(jsonStr);
    setModalBackupRestore(true);
  };

  const handleShareBackup = () => {
    Share.share({
      title: `TallyKhata Backup - ${businessName}`,
      message: backupJsonText,
    });
  };

  const handleImportBackup = async () => {
    try {
      if (!backupJsonText.trim()) {
        Alert.alert('সতর্কতা', 'দয়া করে ব্যাকআপ JSON ডাটা পেস্ট করুন');
        return;
      }
      const data = JSON.parse(backupJsonText);
      if (!data.accounts || !Array.isArray(data.accounts)) {
        Alert.alert('ত্রুটি', 'অকার্যকর ব্যাকআপ ফরম্যাট');
        return;
      }

      const saveRes = await persistData({
        accounts: data.accounts,
        journals: data.journals || [],
        cashEntries: data.cashEntries || [],
        inventory: data.inventory || [],
        notes: data.notes || [],
        businessName: data.businessName,
        ownerName: data.ownerName,
        ownerPhone: data.ownerPhone,
        businessAddress: data.businessAddress,
        openingBalance: data.openingBalance,
        walletBalance: data.walletBalance,
      });

      if (!saveRes.success) {
        Alert.alert('ত্রুটি', 'ব্যাকআপ ডাটা সংরক্ষণ ব্যর্থ হয়েছে।');
        return;
      }

      setAccounts(data.accounts || []);
      setJournals(data.journals || []);
      setCashEntries(data.cashEntries || []);
      setInventory(data.inventory || []);
      setNotes(data.notes || []);
      if (data.businessName) setBusinessName(data.businessName);
      if (data.ownerName) setOwnerName(data.ownerName);
      if (data.ownerPhone) setOwnerPhone(data.ownerPhone);
      if (data.businessAddress) setBusinessAddress(data.businessAddress);
      if (data.openingBalance !== undefined) setOpeningBalance(data.openingBalance);
      if (data.walletBalance !== undefined) setWalletBalance(data.walletBalance);

      setModalBackupRestore(false);
      Alert.alert('সফল', 'ডাটা সফলভাবে ব্যাকআপ থেকে পুনরুদ্ধার করা হয়েছে!');
    } catch (e) {
      Alert.alert('ব্যর্থ', 'JSON ফরম্যাট সঠিক নয়। সঠিক ডাটা পেস্ট করুন।');
    }
  };

  // --- DIGITAL VOUCHER MEMO BUILDER ---
  const renderVoucherText = (txn, account) => {
    if (!txn || !account) return '';
    const isCust = account.type === 1;
    const isGiven = txn.type === 'given';
    return (
      `=================================\n` +
      `       ${businessName}\n` +
      `     ${businessAddress}\n` +
      `     মোবাইল: ${ownerPhone}\n` +
      `=================================\n` +
      `রসিদ নং: TK-${txn.id.slice(-6)}\n` +
      `তারিখ: ${txn.date}  ${txn.time || ''}\n` +
      `---------------------------------\n` +
      `${isCust ? 'কাস্টমার: ' : 'সাপ্লায়ার: '} ${account.name}\n` +
      `মোবাইল: ${account.phone || 'দেওয়া নেই'}\n` +
      `---------------------------------\n` +
      `লেনদেনের ধরন: ${isGiven ? (isCust ? 'বাকি বিক্রি' : 'মাল ক্রয়') : (isCust ? 'বাকি আদায় (জমা)' : 'টাকা পরিশোধ')}\n` +
      `বিবরণ: ${txn.desc || 'সাধারণ লেনদেন'}\n` +
      `টাকার পরিমাণ: ৳ ${formatMoney(txn.amount)}\n` +
      `---------------------------------\n` +
      `বর্তমান সর্বমোট বকেয়া: ৳ ${formatMoney(account.balance)}\n` +
      `=================================\n` +
      `১০০% সঠিক ও ডিজিটাল টালিখাতা হিসাব।\nধন্যবাদ, আবার আসবেন।`
    );
  };

  // --- BUSINESS PICKER & CREATION HANDLERS ---
  const handleSelectBusiness = async (biz) => {
    const updated = businesses.map((b) => ({ ...b, isSelected: b.id === biz.id }));
    const saveRes = await persistData({
      businessName: biz.name,
      ownerName: biz.owner || ownerName,
      ownerPhone: biz.phone || ownerPhone,
      businessAddress: biz.address || businessAddress,
      businesses: updated,
    });
    if (!saveRes.success) {
      Alert.alert('ত্রুটি', 'ব্যবসা পরিবর্তন সংরক্ষণ ব্যর্থ হয়েছে।');
      return;
    }
    setBusinessName(biz.name);
    if (biz.owner) setOwnerName(biz.owner);
    if (biz.phone) setOwnerPhone(biz.phone);
    if (biz.address) setBusinessAddress(biz.address);
    setBusinesses(updated);
    setModalBusinessPicker(false);
    Alert.alert('ব্যবসা পরিবর্তন', `বর্তমানে সক্রিয়: ${biz.name}`);
  };

  const handleCreateBusiness = async () => {
    if (!newBizName.trim()) {
      Alert.alert('সতর্কতা', 'ব্যবসার নাম লিখুন');
      return;
    }
    const newBiz = {
      id: Date.now().toString(),
      name: newBizName.trim(),
      owner: newBizOwner.trim() || ownerName,
      phone: newBizPhone.trim() || ownerPhone,
      address: newBizAddress.trim() || 'ঢাকা, বাংলাদেশ',
      isSelected: true,
    };
    const updated = [...businesses.map((b) => ({ ...b, isSelected: false })), newBiz];
    const saveRes = await persistData({
      businessName: newBiz.name,
      ownerName: newBiz.owner,
      ownerPhone: newBiz.phone,
      businessAddress: newBiz.address,
      businesses: updated,
    });
    if (!saveRes.success) {
      Alert.alert('ত্রুটি', 'নতুন ব্যবসা তৈরি ও সংরক্ষণ ব্যর্থ হয়েছে।');
      return;
    }
    setBusinesses(updated);
    setBusinessName(newBiz.name);
    if (newBiz.owner) setOwnerName(newBiz.owner);
    if (newBiz.phone) setOwnerPhone(newBiz.phone);
    if (newBiz.address) setBusinessAddress(newBiz.address);
    setNewBizName('');
    setNewBizOwner('');
    setNewBizPhone('');
    setNewBizAddress('');
    setModalAddBusiness(false);
    setModalBusinessPicker(false);
    Alert.alert('সফল', `নতুন ব্যবসা "${newBiz.name}" তৈরি ও সক্রিয় করা হয়েছে।`);
  };

  // --- CASH RECONCILIATION WITH DENOMINATIONS HANDLER ---
  const handleSaveDenominations = async () => {
    const totalCounted = countedFromNotes > 0 ? countedFromNotes : (Number(countedCash) || 0);
    const diff = totalCounted - totalCash;
    const adjEntry = {
      id: 'adj_' + Date.now(),
      category: diff >= 0 ? 'malik_in' : 'cost',
      type: diff >= 0 ? 'in' : 'out',
      amount: Math.abs(diff),
      desc:
        diff === 0
          ? 'ক্যাশবক্স মিলানো (কোনো গরমিল নেই)'
          : diff > 0
          ? `ক্যাশবক্স সমন্বয় (অতিরিক্ত ক্যাশ ৳ ${formatMoney(diff)})`
          : `ক্যাশবক্স সমন্বয় (ক্যাশ ঘাটতি ৳ ${formatMoney(Math.abs(diff))})`,
      date: getTodayDate(),
      time: getTimeString(),
    };
    const updatedCash = [adjEntry, ...cashEntries];
    const saveRes = await persistData({ cashEntries: updatedCash });
    if (!saveRes.success) {
      Alert.alert('ত্রুটি', 'ক্যাশবক্স মিলানো তথ্য সংরক্ষণ করা যায়নি।');
      return;
    }
    setCashEntries(updatedCash);
    setModalReconcileCash(false);
    Alert.alert(
      'ক্যাশবক্স মিলানো সম্পন্ন',
      diff === 0
        ? 'ক্যাশ ১০০% মিলেছে।'
        : `ক্যাশ সমন্বয় রেকর্ড সেভ হয়েছে। পার্থক্য: ৳ ${formatMoney(Math.abs(diff))}`
    );
  };

  // --- TAGADA HANDLERS (SMS & BULK TAGADA) ---
  const handleSendSingleTagada = async (account) => {
    if (remainingSmsCount <= 0) {
      Alert.alert('ফ্রি এসএমএস সমাপ্ত', 'আপনার ফ্রি টালি-মেসেজ শেষ হয়ে গেছে। ফোনের স্বাভাবিক এসএমএস বা WhatsApp ব্যবহার করুন।');
      return;
    }
    const newCount = remainingSmsCount - 1;
    const log = {
      id: 'tag_' + Date.now(),
      customerName: account.name,
      phone: account.phone,
      amount: account.balance,
      date: getTodayDate(),
      time: getTimeString(),
    };
    const updatedLogs = [log, ...tagadaLogs];
    const saveRes = await persistData({ remainingSmsCount: newCount, tagadaLogs: updatedLogs });
    if (!saveRes.success) {
      Alert.alert('ত্রুটি', 'তাগাদা মেসেজ রেকর্ড সংরক্ষণ করা যায়নি।');
      return;
    }
    setRemainingSmsCount(newCount);
    setTagadaLogs(updatedLogs);
    setModalTagada(false);
    Alert.alert(
      'মেসেজ পাঠানো হয়েছে',
      `${account.name} (বকেয়া ৳ ${formatMoney(account.balance)})-কে সফলভাবে টালি-মেসেজ পাঠানো হয়েছে।\nঅবশিষ্ট ফ্রি এসএমএস: ${newCount} টি`
    );
  };

  const handleSendBulkTagada = () => {
    if (dueCustomers.length === 0) {
      Alert.alert('তথ্য', 'কোনো কাস্টমারের কাছে বকেয়া বাকি নেই।');
      return;
    }
    Alert.alert(
      'গ্রুপ তাগাদা পাঠান',
      `মোট ${dueCustomers.length} জন বাকি কাস্টমারকে একসাথে টালি-মেসেজ পাঠাতে চান? মোট বকেয়া ৳ ${formatMoney(totalCustomerDue)}।`,
      [
        { text: 'বাতিল', style: 'cancel' },
        {
          text: 'পাঠান',
          onPress: async () => {
            const newCount = Math.max(0, remainingSmsCount - 1);
            const saveRes = await persistData({ remainingSmsCount: newCount });
            if (!saveRes.success) {
              Alert.alert('ত্রুটি', 'গ্রুপ তাগাদা সংরক্ষণ ব্যর্থ হয়েছে।');
              return;
            }
            setRemainingSmsCount(newCount);
            Alert.alert(
              'সফল',
              `সকল ${dueCustomers.length} জন বকেয়া কাস্টমারকে গ্রুপ তাগাদা মেসেজ সফলভাবে পাঠানো হয়েছে!`
            );
          },
        },
      ]
    );
  };

  // --- MONEY OUT HANDLER ---
  const handleMoneyOut = async () => {
    const amt = parseFloat(moneyOutAmount) || 0;
    if (!amt || amt <= 0) {
      Alert.alert('সতর্কতা', 'সঠিক টাকার পরিমাণ দিন');
      return;
    }
    if (amt > walletBalance) {
      Alert.alert('ব্যর্থ', 'পর্যাপ্ত ওয়ালেট ব্যালেন্স নেই');
      return;
    }
    const newBal = walletBalance - amt;
    const methodLabel =
      moneyOutMethod === 'bank'
        ? 'ব্যাংক একাউন্ট'
        : moneyOutMethod === 'bkash'
        ? 'বিকাশ'
        : 'নগদ';
    const newTxn = {
      id: 'w_' + Date.now(),
      title: `মানি আউট (${methodLabel})`,
      amount: amt,
      type: 'out',
      date: getTodayDate(),
      time: getTimeString(),
    };
    const updatedTxns = [newTxn, ...walletTxns];
    const saveRes = await persistData({ walletBalance: newBal, walletTxns: updatedTxns });
    if (!saveRes.success) {
      Alert.alert('ত্রুটি', 'মানি আউট সংরক্ষণ করা যায়নি।');
      return;
    }
    setWalletBalance(newBal);
    setWalletTxns(updatedTxns);
    setMoneyOutAmount('');
    setMoneyOutAccNumber('');
    setModalMoneyOut(false);
    Alert.alert('সফল', `৳ ${formatMoney(amt)} টাকা সফলভাবে ${methodLabel}-এ স্থানান্তর (লোকাল লেজার) করা হয়েছে।`);
  };

  // --- FILTERED ACCOUNTS FOR TAB 1 ---
  const filteredAccounts = useMemo(() => {
    return (accounts || []).filter((a) => {
      // Type matching
      if (accountTab === 'customer' && a.type !== 1) return false;
      if (accountTab === 'supplier' && a.type !== 2) return false;

      // Filter matching
      if (accountFilter === 'due' && (Number(a.balance) || 0) <= 0) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const mName = (a.name || '').toLowerCase().includes(q);
        const mPhone = (a.phone || '').includes(q);
        if (!mName && !mPhone) return false;
      }
      return true;
    }).sort((a, b) => {
      if (accountFilter === 'highest') {
        return (Number(b.balance) || 0) - (Number(a.balance) || 0);
      }
      return 0; // default order
    });
  }, [accounts, accountTab, accountFilter, searchQuery]);

  const dueCustomers = useMemo(() => {
    return (accounts || []).filter((a) => a.type === 1 && (Number(a.balance) || 0) > 0);
  }, [accounts]);

  const filteredCashEntries = useMemo(() => {
    if (cashFilter === 'all') return cashEntries || [];
    return (cashEntries || []).filter((c) => c.category === cashFilter);
  }, [cashEntries, cashFilter]);
