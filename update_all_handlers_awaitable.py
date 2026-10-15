import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('part2_state_and_handlers.js', 'r', encoding='utf-8') as f:
    p2 = f.read()

# 1. handleSaveCashEntry
old_save_cash = """  const handleSaveCashEntry = () => {
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
    setCashEntries(updated);
    persistData({ cashEntries: updated });
    setCashAmount('');
    setCashDesc('');
    setModalAddCash(false);
  };"""

new_save_cash = """  const handleSaveCashEntry = async () => {
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
  };"""

p2 = p2.replace(old_save_cash, new_save_cash, 1)

# 2. handleSaveProduct
old_save_prod = """  const handleSaveProduct = () => {
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
    setInventory(updated);
    persistData({ inventory: updated });
    setProdName('');
    setProdBuyPrice('');
    setProdSellPrice('');
    setProdStock('');
    setModalAddStock(false);
  };"""

new_save_prod = """  const handleSaveProduct = async () => {
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
  };"""

p2 = p2.replace(old_save_prod, new_save_prod, 1)

# 3. handleAddMoney
old_add_money = """  const handleAddMoney = () => {
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
    setWalletBalance(newBal);
    setWalletTxns(updatedTxns);
    persistData({ walletBalance: newBal, walletTxns: updatedTxns });
    setAddMoneyAmount('');
    setModalAddMoney(false);
    Alert.alert('সফল', `৳ ${formatMoney(amt)} টাকা ওয়ালেটে সফলভাবে যোগ হয়েছে!`);
  };"""

new_add_money = """  const handleAddMoney = async () => {
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
  };"""

p2 = p2.replace(old_add_money, new_add_money, 1)

# 4. handleMobileRecharge
old_recharge = """  const handleMobileRecharge = () => {
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
    setWalletBalance(newBal);
    setWalletTxns(updatedTxns);
    persistData({ walletBalance: newBal, walletTxns: updatedTxns });
    setRechargePhone('');
    setRechargeAmount('');
    setModalMobileRecharge(false);
    Alert.alert('সফল', `${cleanPh} নম্বরে ৳ ${formatMoney(amt)} রিচার্জ সফল হয়েছে!`);
  };"""

new_recharge = """  const handleMobileRecharge = async () => {
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
  };"""

p2 = p2.replace(old_recharge, new_recharge, 1)

# 5. handleMoneyOut
old_money_out = """  const handleMoneyOut = () => {
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
    setWalletBalance(newBal);
    setWalletTxns(updatedTxns);
    persistData({ walletBalance: newBal, walletTxns: updatedTxns });
    setMoneyOutAmount('');
    setMoneyOutAccNumber('');
    setModalMoneyOut(false);
    Alert.alert('সফল', `৳ ${formatMoney(amt)} টাকা সফলভাবে ${methodLabel}-এ স্থানান্তর করা হয়েছে।`);
  };"""

new_money_out = """  const handleMoneyOut = async () => {
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
  };"""

p2 = p2.replace(old_money_out, new_money_out, 1)

with open('part2_state_and_handlers.js', 'w', encoding='utf-8') as f:
    f.write(p2)
print("Updated all handlers to await persistData and verify write success")
