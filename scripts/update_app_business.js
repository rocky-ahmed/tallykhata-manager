const fs = require('fs');
let content = fs.readFileSync('App.js', 'utf8').replace(/\r\n/g, '\n');

function replaceOrThrow(find, replace, label) {
  if (!content.includes(find)) {
    throw new Error('Replacement target not found for: ' + label);
  }
  content = content.replace(find, replace);
  console.log('Successfully replaced: ' + label);
}

// 1. activeBusinessId state
replaceOrThrow(
  "  // Business Profile\n  const [businessName, setBusinessName] = useState('Mobile Xpress');",
  "  // Business Profile\n  const [activeBusinessId, setActiveBusinessId] = useState('1');\n  const [businessName, setBusinessName] = useState('Mobile Xpress');",
  'activeBusinessId state'
);

// 2. loadInitialData
replaceOrThrow(
  "        if (d.businessAddress) setBusinessAddress(d.businessAddress);\n        if (Array.isArray(d.businesses)) setBusinesses(d.businesses);",
  "        if (d.businessAddress) setBusinessAddress(d.businessAddress);\n        if (Array.isArray(d.businesses)) setBusinesses(d.businesses);\n        if (d.activeBusinessId) setActiveBusinessId(String(d.activeBusinessId));",
  'loadInitialData activeBusinessId'
);

// 3. applyStateToUi
replaceOrThrow(
  "    if (Array.isArray(state.businesses)) setBusinesses(state.businesses);\n    if (state.businessName) setBusinessName(state.businessName);",
  "    if (Array.isArray(state.businesses)) setBusinesses(state.businesses);\n    if (state.activeBusinessId) setActiveBusinessId(String(state.activeBusinessId));\n    if (state.businessName) setBusinessName(state.businessName);",
  'applyStateToUi activeBusinessId'
);

// 4. backup restore in handleRestoreOnline
replaceOrThrow(
  "      if (Array.isArray(newState.businesses)) setBusinesses(newState.businesses);\n      if (newState.businessName) setBusinessName(newState.businessName);",
  "      if (Array.isArray(newState.businesses)) setBusinesses(newState.businesses);\n      if (newState.activeBusinessId) setActiveBusinessId(String(newState.activeBusinessId));\n      if (newState.businessName) setBusinessName(newState.businessName);",
  'handleRestoreOnline activeBusinessId'
);

// 5 & 6. Business-scoped data collections and calculations
const oldCalcTarget = `  // --- FINANCIAL CALCULATIONS & DOUBLE-ENTRY SYNC ---
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
  });`;

const newCalcTarget = `  // --- BUSINESS-SCOPED DATA COLLECTIONS ---
  const activeBizId = activeBusinessId || '1';
  const businessAccounts = useMemo(() => {
    return (accounts || []).filter((a) => String(a.businessId || '1') === String(activeBizId));
  }, [accounts, activeBizId]);

  const businessCashEntries = useMemo(() => {
    return (cashEntries || []).filter((c) => String(c.businessId || '1') === String(activeBizId));
  }, [cashEntries, activeBizId]);

  const businessInventory = useMemo(() => {
    return (inventory || []).filter((i) => String(i.businessId || '1') === String(activeBizId));
  }, [inventory, activeBizId]);

  const businessNotes = useMemo(() => {
    return (notes || []).filter((n) => String(n.businessId || '1') === String(activeBizId));
  }, [notes, activeBizId]);

  // --- FINANCIAL CALCULATIONS & DOUBLE-ENTRY SYNC (BUSINESS SCOPED) ---
  let totalCustomerDue = 0;
  let totalSupplierDue = 0;
  (businessAccounts || []).forEach((a) => {
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

  (businessCashEntries || []).forEach((c) => {
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
  (businessCashEntries || []).forEach((c) => {
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
  (businessInventory || []).forEach((item) => {
    const qty = Number(item.stock) || 0;
    totalStockCost += qty * (Number(item.buyPrice) || 0);
    totalStockSaleValue += qty * (Number(item.sellPrice) || 0);
  });`;

replaceOrThrow(oldCalcTarget, newCalcTarget, 'business-scoped financial calculations');

// 7. filteredAccounts, dueCustomers, filteredCashEntries
const oldFilterTarget = `  // --- FILTERED ACCOUNTS FOR TAB 1 ---
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
  }, [cashEntries, cashFilter]);`;

const newFilterTarget = `  // --- FILTERED ACCOUNTS FOR TAB 1 (BUSINESS SCOPED) ---
  const filteredAccounts = useMemo(() => {
    return (businessAccounts || []).filter((a) => {
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
  }, [businessAccounts, accountTab, accountFilter, searchQuery]);

  const dueCustomers = useMemo(() => {
    return (businessAccounts || []).filter((a) => a.type === 1 && (Number(a.balance) || 0) > 0);
  }, [businessAccounts]);

  const filteredCashEntries = useMemo(() => {
    if (cashFilter === 'all') return businessCashEntries || [];
    return (businessCashEntries || []).filter((c) => c.category === cashFilter);
  }, [businessCashEntries, cashFilter]);`;

replaceOrThrow(oldFilterTarget, newFilterTarget, 'business-scoped filtered accounts and cash');

// 8. Tab 1 counter badges
replaceOrThrow(
  "কাস্টমার {toBengaliNumber(accounts.filter((a) => a.type === 1).length)}",
  "কাস্টমার {toBengaliNumber(businessAccounts.filter((a) => a.type === 1).length)}",
  'customer count in counter tab'
);
replaceOrThrow(
  "সাপ্লায়ার {toBengaliNumber(accounts.filter((a) => a.type === 2).length)}",
  "সাপ্লায়ার {toBengaliNumber(businessAccounts.filter((a) => a.type === 2).length)}",
  'supplier count in counter tab'
);

// 9. handleSaveAccount tagging
const oldAccSave = `    const newId = generateUniqueId('acc_');
    const newAcc = {
      id: newId,
      name: valRes.name,
      phone: valRes.phone,
      address: accAddress.trim(),
      type: accType,
      openingBalance: valRes.initialBalance || 0,
      balance: valRes.initialBalance || 0,
      createDate: getTodayDate(),
    };`;

const newAccSave = `    const newId = generateUniqueId('acc_');
    const newAcc = {
      id: newId,
      businessId: activeBusinessId || '1',
      name: valRes.name,
      phone: valRes.phone,
      address: accAddress.trim(),
      type: accType,
      openingBalance: valRes.initialBalance || 0,
      balance: valRes.initialBalance || 0,
      createDate: getTodayDate(),
    };`;

replaceOrThrow(oldAccSave, newAccSave, 'handleSaveAccount businessId');

// 10. handleSaveTransaction tagging
const oldTxnSave = `    const newJournal = {
      id: txnId,
      accountId: selectedAccount.id,
      type: txnType,
      amount: valRes.amount,
      desc: txnDesc.trim() || defaultDesc,
      date: txnDate,
      time: getTimeString(),
    };`;

const newTxnSave = `    const newJournal = {
      id: txnId,
      accountId: selectedAccount.id,
      businessId: selectedAccount.businessId || activeBusinessId || '1',
      type: txnType,
      amount: valRes.amount,
      desc: txnDesc.trim() || defaultDesc,
      date: txnDate,
      time: getTimeString(),
    };`;

replaceOrThrow(oldTxnSave, newTxnSave, 'handleSaveTransaction businessId');

// 11. handleSaveCashEntry tagging
const oldCashSave = `    const newEntry = {
      id: generateUniqueId('cash_'),
      category: cashCategory,
      type: type,
      amount: amt,
      desc: cashDesc.trim() || defaultDesc,
      date: getTodayDate(),
      time: getTimeString(),
    };`;

const newCashSave = `    const newEntry = {
      id: generateUniqueId('cash_'),
      businessId: activeBusinessId || '1',
      category: cashCategory,
      type: type,
      amount: amt,
      desc: cashDesc.trim() || defaultDesc,
      date: getTodayDate(),
      time: getTimeString(),
    };`;

replaceOrThrow(oldCashSave, newCashSave, 'handleSaveCashEntry businessId');

// 12. handleSaveProduct tagging
const oldProdSave = `    const newP = {
      id: generateUniqueId('prod_'),
      name: prodName.trim(),
      unit: prodUnit.trim() || 'পিস',
      buyPrice: parseFloat(prodBuyPrice) || 0,
      sellPrice: parseFloat(prodSellPrice) || 0,
      stock: parseFloat(prodStock) || 0,
    };`;

const newProdSave = `    const newP = {
      id: generateUniqueId('prod_'),
      businessId: activeBusinessId || '1',
      name: prodName.trim(),
      unit: prodUnit.trim() || 'পিস',
      buyPrice: parseFloat(prodBuyPrice) || 0,
      sellPrice: parseFloat(prodSellPrice) || 0,
      stock: parseFloat(prodStock) || 0,
    };`;

replaceOrThrow(oldProdSave, newProdSave, 'handleSaveProduct businessId');

// 13. handleAddNote tagging
const oldNoteSave = `    const newN = {
      id: generateUniqueId('note_'),
      text: newNoteText.trim(),
      isComplete: false,
      date: getTodayDate(),
    };`;

const newNoteSave = `    const newN = {
      id: generateUniqueId('note_'),
      businessId: activeBusinessId || '1',
      text: newNoteText.trim(),
      isComplete: false,
      date: getTodayDate(),
    };`;

replaceOrThrow(oldNoteSave, newNoteSave, 'handleAddNote businessId');

// 14. Stock & Notes lists in modals and menus
replaceOrThrow(
  "<Text style={styles.stockSummaryBoxVal}>{inventory.length} টি</Text>",
  "<Text style={styles.stockSummaryBoxVal}>{businessInventory.length} টি</Text>",
  'stock total count'
);
replaceOrThrow(
  "              <Text style={[styles.sectionHeading, { marginTop: 16 }]}>বিদ্যমান পণ্যসমূহ</Text>\n              {inventory.map((item) => (",
  "              <Text style={[styles.sectionHeading, { marginTop: 16 }]}>বিদ্যমান পণ্যসমূহ ({businessInventory.length})</Text>\n              {businessInventory.map((item) => (",
  'stock list map'
);
replaceOrThrow(
  "<Text style={styles.menuListSub}>মোট {inventory.length} টি পণ্য • স্টক মূল্য ৳ {formatMoney(totalStockCost)}</Text>",
  "<Text style={styles.menuListSub}>মোট {businessInventory.length} টি পণ্য • স্টক মূল্য ৳ {formatMoney(totalStockCost)}</Text>",
  'menu stock list subtitle'
);
replaceOrThrow(
  "            <ScrollView contentContainerStyle={{ paddingBottom: 10 }}>\n              {notes.map((n) => (",
  "            <ScrollView contentContainerStyle={{ paddingBottom: 10 }}>\n              {businessNotes.map((n) => (",
  'notes list map'
);

// 15. Business Lifecycle Handlers
const oldBizHandlers = `  // --- BUSINESS PICKER & CREATION HANDLERS ---
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
    Alert.alert('ব্যবসা পরিবর্তন', \`বর্তমানে সক্রিয়: \${biz.name}\`);
  };

  const handleCreateBusiness = async () => {
    if (!newBizName.trim()) {
      Alert.alert('সতর্কতা', 'ব্যবসার নাম লিখুন');
      return;
    }
    const newBiz = {
      id: generateUniqueId('biz_'),
      name: newBizName.trim(),
      owner: newBizOwner.trim() || ownerName,
      phone: newBizPhone.trim() || ownerPhone,
      address: newBizAddress.trim() || 'ঢাকা, বাংলাদেশ',
      isSelected: true,
    };
    setIsSaving(true);
    const saveRes = await storageRepository.mutateStore((latestStore) => {
      const curBusinesses = latestStore.businesses || [];
      const updated = [...curBusinesses.map((b) => ({ ...b, isSelected: false })), newBiz];
      return {
        ...latestStore,
        businessName: newBiz.name,
        ownerName: newBiz.owner,
        ownerPhone: newBiz.phone,
        businessAddress: newBiz.address,
        businesses: updated,
      };
    });
    setIsSaving(false);
    if (!saveRes.success) {
      Alert.alert('ত্রুটি', 'নতুন ব্যবসা তৈরি ও সংরক্ষণ ব্যর্থ হয়েছে।');
      return;
    }
    setBusinesses(saveRes.data.businesses);
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
    Alert.alert('সফল', \`নতুন ব্যবসা "\${newBiz.name}" তৈরি ও সক্রিয় করা হয়েছে।\`);
  };`;

const newBizHandlers = `  // --- BUSINESS PICKER & COMPLETE LIFECYCLE HANDLERS ---
  const handleSelectBusiness = async (biz) => {
    setIsSaving(true);
    const res = await storageRepository.selectBusiness(biz.id);
    setIsSaving(false);
    if (!res.success) {
      Alert.alert('ত্রুটি', res.error?.message || 'ব্যবসা পরিবর্তন ব্যর্থ হয়েছে।');
      return;
    }
    const store = res.data;
    if (store.activeBusinessId) setActiveBusinessId(String(store.activeBusinessId));
    if (Array.isArray(store.businesses)) setBusinesses(store.businesses);
    if (store.businessName) setBusinessName(store.businessName);
    if (store.ownerName) setOwnerName(store.ownerName);
    if (store.ownerPhone) setOwnerPhone(store.ownerPhone);
    if (store.businessAddress) setBusinessAddress(store.businessAddress);
    setModalBusinessPicker(false);
    Alert.alert('ব্যবসা পরিবর্তন', \`বর্তমানে সক্রিয়: \${store.businessName || biz.name}\`);
  };

  const handleCreateBusiness = async () => {
    if (!newBizName.trim()) {
      Alert.alert('সতর্কতা', 'ব্যবসার নাম লিখুন');
      return;
    }
    setIsSaving(true);
    const res = await storageRepository.createBusiness({
      name: newBizName.trim(),
      owner: newBizOwner.trim() || ownerName,
      phone: newBizPhone.trim() || ownerPhone,
      address: newBizAddress.trim() || 'ঢাকা, বাংলাদেশ',
      selectImmediately: true,
    });
    setIsSaving(false);
    if (!res.success) {
      Alert.alert('ত্রুটি', res.error?.message || 'নতুন ব্যবসা তৈরি ব্যর্থ হয়েছে।');
      return;
    }
    const store = res.data;
    if (store.activeBusinessId) setActiveBusinessId(String(store.activeBusinessId));
    if (Array.isArray(store.businesses)) setBusinesses(store.businesses);
    if (store.businessName) setBusinessName(store.businessName);
    if (store.ownerName) setOwnerName(store.ownerName);
    if (store.ownerPhone) setOwnerPhone(store.ownerPhone);
    if (store.businessAddress) setBusinessAddress(store.businessAddress);
    setNewBizName('');
    setNewBizOwner('');
    setNewBizPhone('');
    setNewBizAddress('');
    setModalAddBusiness(false);
    setModalBusinessPicker(false);
    Alert.alert('সফল', \`নতুন ব্যবসা "\${store.businessName || newBizName}" তৈরি ও সক্রিয় করা হয়েছে।\`);
  };

  const handleArchiveBusiness = (biz) => {
    Alert.alert(
      'ব্যবসা আর্কাইভ করবেন?',
      \`"\${biz.name}" আর্কাইভ করা হলে এটি সক্রিয় তালিকা থেকে লুকানো থাকবে, কিন্তু এর সকল আর্থিক হিসাব ও লেনদেন সম্পূর্ণ সুরক্ষিত থাকবে। আপনি যেকোনো সময় এটি পুনরুদ্ধার করতে পারবেন।\`,
      [
        { text: 'বাতিল', style: 'cancel' },
        {
          text: 'আর্কাইভ করুন',
          style: 'destructive',
          onPress: async () => {
            setIsSaving(true);
            const res = await storageRepository.archiveBusiness(biz.id);
            setIsSaving(false);
            if (!res.success) {
              Alert.alert('আর্কাইভ ব্যর্থ', res.error?.message || 'ব্যবসা আর্কাইভ করা সম্ভব হয়নি।');
              return;
            }
            const store = res.data;
            if (store.activeBusinessId) setActiveBusinessId(String(store.activeBusinessId));
            if (Array.isArray(store.businesses)) setBusinesses(store.businesses);
            if (store.businessName) setBusinessName(store.businessName);
            if (store.ownerName) setOwnerName(store.ownerName);
            if (store.ownerPhone) setOwnerPhone(store.ownerPhone);
            if (store.businessAddress) setBusinessAddress(store.businessAddress);
            Alert.alert('সফল', \`"\${biz.name}" সফলভাবে আর্কাইভ করা হয়েছে।\`);
          },
        },
      ]
    );
  };

  const handleRestoreBusiness = async (biz) => {
    setIsSaving(true);
    const res = await storageRepository.restoreBusiness(biz.id, { selectImmediately: true });
    setIsSaving(false);
    if (!res.success) {
      Alert.alert('পুনরুদ্ধার ব্যর্থ', res.error?.message || 'ব্যবসা পুনরুদ্ধার করা সম্ভব হয়নি।');
      return;
    }
    const store = res.data;
    if (store.activeBusinessId) setActiveBusinessId(String(store.activeBusinessId));
    if (Array.isArray(store.businesses)) setBusinesses(store.businesses);
    if (store.businessName) setBusinessName(store.businessName);
    if (store.ownerName) setOwnerName(store.ownerName);
    if (store.ownerPhone) setOwnerPhone(store.ownerPhone);
    if (store.businessAddress) setBusinessAddress(store.businessAddress);
    Alert.alert('সফল', \`"\${biz.name}" সফলভাবে পুনরুদ্ধার ও সক্রিয় করা হয়েছে।\`);
  };

  const handlePermanentDeleteBusiness = (biz) => {
    Alert.alert(
      'স্থায়ীভাবে মুছে ফেলবেন?',
      \`"\${biz.name}" স্থায়ীভাবে মুছে ফেলতে চান? মনে রাখবেন, শুধুমাত্র কোনো লেনদেন বা হিসাব না থাকলেই এটি মুছে ফেলা যাবে।\`,
      [
        { text: 'বাতিল', style: 'cancel' },
        {
          text: 'মুছে ফেলুন',
          style: 'destructive',
          onPress: async () => {
            setIsSaving(true);
            const res = await storageRepository.deleteBusinessPermanently(biz.id);
            setIsSaving(false);
            if (!res.success) {
              Alert.alert('মুছে ফেলা সম্ভব নয়', res.error?.message || 'ব্যবসা মুছে ফেলা সম্ভব হয়নি।');
              return;
            }
            const store = res.data;
            if (store.activeBusinessId) setActiveBusinessId(String(store.activeBusinessId));
            if (Array.isArray(store.businesses)) setBusinesses(store.businesses);
            if (store.businessName) setBusinessName(store.businessName);
            if (store.ownerName) setOwnerName(store.ownerName);
            if (store.ownerPhone) setOwnerPhone(store.ownerPhone);
            if (store.businessAddress) setBusinessAddress(store.businessAddress);
            Alert.alert('সফল', \`"\${biz.name}" স্থায়ীভাবে মুছে ফেলা হয়েছে।\`);
          },
        },
      ]
    );
  };`;

replaceOrThrow(oldBizHandlers, newBizHandlers, 'complete business lifecycle handlers');

// 16. modalBusinessPicker Content
const oldPickerContent = `            <ScrollView style={{ maxHeight: 340, marginVertical: 8 }}>
              {(businesses || []).map((biz) => {
                const isSelected = biz.isSelected || biz.name === businessName;
                return (
                  <TouchableOpacity
                    key={biz.id}
                    style={[styles.bizPickerItem, isSelected && styles.bizPickerItemActive]}
                    onPress={() => {
                      handleSelectBusiness(biz);
                      setModalBusinessPicker(false);
                    }}
                  >
                    <View style={styles.bizPickerAvatar}>
                      <Image
                        source={require('./assets/ic_tally_khata_logo_reg.png')}
                        style={{ width: 28, height: 28 }}
                        resizeMode="contain"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bizPickerName}>{biz.name}</Text>
                      <Text style={styles.bizPickerSub}>{biz.owner || 'স্বত্বাধিকারী'} • {biz.phone || '01700000000'}</Text>
                      {biz.address ? <Text style={[styles.bizPickerSub, { fontSize: 11 }]}>{biz.address}</Text> : null}
                    </View>
                    <View style={[styles.bizPickerRadio, isSelected && styles.bizPickerRadioActive]}>
                      {isSelected ? <View style={styles.bizPickerRadioInner} /> : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>`;

const newPickerContent = `            <ScrollView style={{ maxHeight: 380, marginVertical: 8 }}>
              <Text style={styles.bizSectionTitle}>সক্রিয় প্রতিষ্ঠানসমূহ</Text>
              {(businesses || []).filter((b) => !b.isArchived).map((biz) => {
                const isSelected = String(biz.id) === String(activeBusinessId) || biz.isSelected || biz.name === businessName;
                const activeCount = (businesses || []).filter((b) => !b.isArchived).length;
                return (
                  <View
                    key={biz.id}
                    style={[styles.bizPickerItem, isSelected && styles.bizPickerItemActive]}
                  >
                    <TouchableOpacity
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                      onPress={() => handleSelectBusiness(biz)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.bizPickerAvatar}>
                        <Image
                          source={require('./assets/ic_tally_khata_logo_reg.png')}
                          style={{ width: 28, height: 28 }}
                          resizeMode="contain"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.bizPickerName}>{biz.name}</Text>
                        <Text style={styles.bizPickerSub}>{biz.owner || 'স্বত্বাধিকারী'} • {biz.phone || '01700000000'}</Text>
                        {biz.address ? <Text style={[styles.bizPickerSub, { fontSize: 11 }]}>{biz.address}</Text> : null}
                      </View>
                      <View style={[styles.bizPickerRadio, isSelected && styles.bizPickerRadioActive]}>
                        {isSelected ? <View style={styles.bizPickerRadioInner} /> : null}
                      </View>
                    </TouchableOpacity>

                    {activeCount > 1 ? (
                      <TouchableOpacity
                        style={styles.bizArchiveBtn}
                        onPress={() => handleArchiveBusiness(biz)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.bizArchiveBtnText}>আর্কাইভ</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })}

              {(businesses || []).some((b) => Boolean(b.isArchived)) ? (
                <>
                  <Text style={[styles.bizSectionTitle, { marginTop: 16 }]}>আর্কাইভকৃত প্রতিষ্ঠান</Text>
                  {(businesses || []).filter((b) => Boolean(b.isArchived)).map((biz) => (
                    <View key={biz.id} style={styles.bizArchivedCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.bizPickerName, { color: '#6B7280' }]}>{biz.name} (আর্কাইভ)</Text>
                        <Text style={styles.bizPickerSub}>{biz.owner || 'স্বত্বাধিকারী'} • {biz.phone || ''}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity
                          style={styles.bizRestoreBtn}
                          onPress={() => handleRestoreBusiness(biz)}
                        >
                          <Text style={styles.bizRestoreBtnText}>পুনরুদ্ধার</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.bizDeleteBtn}
                          onPress={() => handlePermanentDeleteBusiness(biz)}
                        >
                          <Text style={styles.bizDeleteBtnText}>মুছুন</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </>
              ) : null}
            </ScrollView>`;

replaceOrThrow(oldPickerContent, newPickerContent, 'modalBusinessPicker active and archived list');

// 17. Styles for business management
const oldStyleTarget = `  bizAddBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 8,
  },`;

const newStyleTarget = `  bizAddBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  bizSectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#6B7280',
    marginBottom: 8,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bizArchiveBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginLeft: 8,
  },
  bizArchiveBtnText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '600',
  },
  bizArchivedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  bizRestoreBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#DEF7EC',
  },
  bizRestoreBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#03543F',
  },
  bizDeleteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#FDE8E8',
  },
  bizDeleteBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#9B1C1C',
  },`;

replaceOrThrow(oldStyleTarget, newStyleTarget, 'styles for business management');

fs.writeFileSync('App.js', content, 'utf8');
console.log('App.js successfully updated!');
