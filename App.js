import React, { useState, useEffect, Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Linking,
  StatusBar,
  FlatList,
  Share
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'tallykhata_offline_store_v3';

// =========================================================================
// 1. CRASH-PROOF ERROR BOUNDARY (Expo Go Safety Guard)
// =========================================================================
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.log('App Error caught by boundary:', error, errorInfo);
  }

  handleReset = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.errorSafeContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#b91c1c" />
          <View style={styles.errorCard}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorHeading}>একটি সমস্যা হয়েছে</Text>
            <Text style={styles.errorDetails}>
              {this.state.error ? String(this.state.error.message || this.state.error) : 'Unknown Error'}
            </Text>
            <TouchableOpacity
              style={styles.errorRetryBtn}
              onPress={() => this.setState({ hasError: false, error: null })}
            >
              <Text style={styles.errorRetryBtnText}>পুনরায় চেষ্টা করুন</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.errorRetryBtn, { backgroundColor: '#4b5563', marginTop: 10 }]}
              onPress={this.handleReset}
            >
              <Text style={styles.errorRetryBtnText}>ডাটা রিসেট করে শুরু করুন</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

// =========================================================================
// 2. SAFE UTILS & BENGALI FORMATTERS
// =========================================================================
const formatMoney = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '০';
  const num = Math.round(Number(amount));
  const isNeg = num < 0;
  const absStr = Math.abs(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return isNeg ? '-' + absStr : absStr;
};

const getTodayDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
};

const getTimeString = () => {
  const d = new Date();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return hours + ':' + minutes + ' ' + ampm;
};

// Initial Seed Data (if storage empty)
const INITIAL_ACCOUNTS = [
  { id: '1', name: 'মো: রফিকুল ইসলাম', phone: '01711223344', type: 1, balance: 3200, address: 'বাজার মোড়' },
  { id: '2', name: 'আলমগীর স্টোর', phone: '01812345678', type: 1, balance: 1450, address: 'পশ্চিম পাড়া' },
  { id: '3', name: 'মেসার্স ভাই ভাই ট্রেডার্স', phone: '01911998877', type: 2, balance: 5000, address: 'পাইকারি আড়ৎ' },
];

const INITIAL_JOURNALS = [
  { id: '1', accountId: '1', type: 'given', amount: 3200, desc: 'বাকিতে চাল ও ডাল বিক্রয়', date: getTodayDate(), time: '10:30 AM' },
  { id: '2', accountId: '2', type: 'given', amount: 1450, desc: 'মালামাল বাকি বিক্রি', date: getTodayDate(), time: '11:15 AM' },
  { id: '3', accountId: '3', type: 'given', amount: 5000, desc: 'পাইকারি মাল ক্রয় বাবদ পাওনা', date: getTodayDate(), time: '02:00 PM' },
];

const INITIAL_CASH_ENTRIES = [
  { id: '1', category: 'sale', type: 'in', amount: 4500, desc: 'সকালের নগদ বিক্রি', date: getTodayDate(), time: '09:00 AM' },
  { id: '2', category: 'cost', type: 'out', amount: 250, desc: 'দোকান খরচ ও নাস্তা', date: getTodayDate(), time: '11:00 AM' },
  { id: '3', category: 'malik_in', type: 'in', amount: 2000, desc: 'মালিকের দেওয়া নগদ টাকা', date: getTodayDate(), time: '08:30 AM' },
];

const INITIAL_INVENTORY = [
  { id: '1', name: 'মিনিকেট চাল', unit: 'কেজি', buyPrice: 65, sellPrice: 72, stock: 120 },
  { id: '2', name: 'তীর সয়াবিন তেল', unit: 'লিটার', buyPrice: 175, sellPrice: 190, stock: 45 },
  { id: '3', name: 'চিনি (প্যাকেট)', unit: 'কেজি', buyPrice: 130, sellPrice: 140, stock: 60 },
  { id: '4', name: 'মসুর ডাল (দেশি)', unit: 'কেজি', buyPrice: 135, sellPrice: 150, stock: 8 },
];

const INITIAL_NOTES = [
  { id: '1', text: 'রবিবার সকালে আড়ৎ থেকে চাল ডেলিভারি আনতে হবে', isComplete: false, date: getTodayDate() },
  { id: '2', text: 'বিদ্যুৎ বিল ও দোকান ভাড়া পরিশোধ করা হয়েছে', isComplete: true, date: getTodayDate() },
];

// =========================================================================
// 3. MAIN COMPONENT (TallyKhata Offline)
// =========================================================================
function TallyKhataApp() {
  // Navigation Screens: 'home' | 'account_ledger'
  const [currentScreen, setCurrentScreen] = useState('home');
  // Bottom Tabs: 'ledger' | 'cashbox' | 'stock' | 'tagada' | 'reports' | 'settings'
  const [activeTab, setActiveTab] = useState('ledger');

  // Business Metadata
  const [businessName, setBusinessName] = useState('আমার ব্যবসা প্রতিষ্ঠান');
  const [ownerName, setOwnerName] = useState('স্বত্বাধিকারী');
  const [ownerPhone, setOwnerPhone] = useState('01700000000');
  const [businessAddress, setBusinessAddress] = useState('বাজার রোড, ঢাকা');

  // Core Relational Entities
  const [accounts, setAccounts] = useState(INITIAL_ACCOUNTS);
  const [journals, setJournals] = useState(INITIAL_JOURNALS);
  const [cashEntries, setCashEntries] = useState(INITIAL_CASH_ENTRIES);
  const [inventory, setInventory] = useState(INITIAL_INVENTORY);
  const [notes, setNotes] = useState(INITIAL_NOTES);
  const [openingBalance, setOpeningBalance] = useState(3000);

  // Selected State for Detailed Views
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedVoucherTxn, setSelectedVoucherTxn] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', '1' (Customer), '2' (Supplier)
  const [reportPeriod, setReportPeriod] = useState('today');
  const [cashCategoryFilter, setCashCategoryFilter] = useState('all');

  // Modals
  const [modalAddAccount, setModalAddAccount] = useState(false);
  const [modalAddTxn, setModalAddTxn] = useState(false);
  const [modalEditTxn, setModalEditTxn] = useState(false);
  const [modalVoucher, setModalVoucher] = useState(false);
  const [modalAddCash, setModalAddCash] = useState(false);
  const [modalReconcileCash, setModalReconcileCash] = useState(false);
  const [modalAddStock, setModalAddStock] = useState(false);
  const [modalAdjustStock, setModalAdjustStock] = useState(false);
  const [modalTagada, setModalTagada] = useState(false);
  const [modalBackupRestore, setModalBackupRestore] = useState(false);

  // Form Field States
  const [accName, setAccName] = useState('');
  const [accPhone, setAccPhone] = useState('');
  const [accAddress, setAccAddress] = useState('');
  const [accType, setAccType] = useState(1);
  const [accInitialBal, setAccInitialBal] = useState('');

  const [txnType, setTxnType] = useState('given');
  const [txnAmount, setTxnAmount] = useState('');
  const [txnDesc, setTxnDesc] = useState('');

  const [editTxnId, setEditTxnId] = useState(null);
  const [editTxnAmount, setEditTxnAmount] = useState('');
  const [editTxnDesc, setEditTxnDesc] = useState('');

  const [cashCategory, setCashCategory] = useState('sale');
  const [cashAmount, setCashAmount] = useState('');
  const [cashDesc, setCashDesc] = useState('');

  const [countedCash, setCountedCash] = useState('');

  const [prodName, setProdName] = useState('');
  const [prodUnit, setProdUnit] = useState('কেজি');
  const [prodBuyPrice, setProdBuyPrice] = useState('');
  const [prodSellPrice, setProdSellPrice] = useState('');
  const [prodStock, setProdStock] = useState('');

  const [stockAdjustType, setStockAdjustType] = useState('in');
  const [stockAdjustQty, setStockAdjustQty] = useState('');

  const [tempBizName, setTempBizName] = useState(businessName);
  const [tempOwnerName, setTempOwnerName] = useState(ownerName);
  const [tempOwnerPhone, setTempOwnerPhone] = useState(ownerPhone);
  const [tempBizAddress, setTempBizAddress] = useState(businessAddress);
  const [tempOpeningBal, setTempOpeningBal] = useState(String(openingBalance));

  const [backupJsonText, setBackupJsonText] = useState('');

  // --- PERSISTENCE ---
  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      const dataStr = await AsyncStorage.getItem(STORAGE_KEY);
      if (dataStr) {
        const d = JSON.parse(dataStr);
        if (Array.isArray(d.accounts)) setAccounts(d.accounts);
        if (Array.isArray(d.journals)) setJournals(d.journals);
        if (Array.isArray(d.cashEntries)) setCashEntries(d.cashEntries);
        if (Array.isArray(d.inventory)) setInventory(d.inventory);
        if (Array.isArray(d.notes)) setNotes(d.notes);
        if (d.businessName) setBusinessName(d.businessName);
        if (d.ownerName) setOwnerName(d.ownerName);
        if (d.ownerPhone) setOwnerPhone(d.ownerPhone);
        if (d.businessAddress) setBusinessAddress(d.businessAddress);
        if (d.openingBalance !== undefined) setOpeningBalance(Number(d.openingBalance));
      }
    } catch (e) {
      console.log('Error loading saved data:', e);
    }
  };

  const persistData = async (newAcc, newJourn, newCash, newInv, newNts, newBiz, newOwn, newPhn, newAddr, newOpBal) => {
    const payload = {
      accounts: newAcc !== undefined ? newAcc : accounts,
      journals: newJourn !== undefined ? newJourn : journals,
      cashEntries: newCash !== undefined ? newCash : cashEntries,
      inventory: newInv !== undefined ? newInv : inventory,
      notes: newNts !== undefined ? newNts : notes,
      businessName: newBiz !== undefined ? newBiz : businessName,
      ownerName: newOwn !== undefined ? newOwn : ownerName,
      ownerPhone: newPhn !== undefined ? newPhn : ownerPhone,
      businessAddress: newAddr !== undefined ? newAddr : businessAddress,
      openingBalance: newOpBal !== undefined ? newOpBal : openingBalance,
    };
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.log('Error saving data:', e);
    }
  };

  // --- FINANCIAL TOTALS ---
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
  const todayStr = getTodayDate();

  (cashEntries || []).forEach((c) => {
    const amt = Number(c.amount) || 0;
    if (c.type === 'in') {
      totalCash += amt;
      if (c.date === todayStr) todayCashIn += amt;
    } else {
      totalCash -= amt;
      if (c.date === todayStr) todayCashOut += amt;
    }
  });

  let totalStockCost = 0;
  let totalStockSaleValue = 0;
  (inventory || []).forEach((item) => {
    const qty = Number(item.stock) || 0;
    totalStockCost += qty * (Number(item.buyPrice) || 0);
    totalStockSaleValue += qty * (Number(item.sellPrice) || 0);
  });

  // --- HANDLER: ACCOUNT ---
  const handleSaveAccount = () => {
    if (!accName.trim()) {
      Alert.alert('সতর্কতা', 'দয়া করে কাস্টমার বা সাপ্লায়ারের নাম লিখুন');
      return;
    }
    const bal = parseFloat(accInitialBal) || 0;
    const newAcc = {
      id: Date.now().toString(),
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
        accountId: newAcc.id,
        type: 'given',
        amount: bal,
        desc: 'পূর্বের বাকি (জের)',
        date: getTodayDate(),
        time: getTimeString(),
      };
      updatedJournals = [initJ, ...journals];
      setJournals(updatedJournals);
    }

    persistData(updatedAccounts, updatedJournals);
    setAccName('');
    setAccPhone('');
    setAccAddress('');
    setAccInitialBal('');
    setModalAddAccount(false);
  };

  const handleOpenAccount = (acc) => {
    setSelectedAccount(acc);
    setCurrentScreen('account_ledger');
  };

  // --- HANDLER: TRANSACTIONS ---
  const handleSaveTransaction = () => {
    const amt = parseFloat(txnAmount);
    if (!amt || amt <= 0) {
      Alert.alert('সতর্কতা', 'সঠিক টাকার পরিমাণ লিখুন');
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

    const newJ = {
      id: Date.now().toString(),
      accountId: selectedAccount.id,
      type: txnType,
      amount: amt,
      desc: txnDesc.trim() || (txnType === 'given' ? (isCust ? 'বাকি বিক্রি' : 'মাল ক্রয় বাবদ দেনা') : (isCust ? 'বাকি আদায়' : 'টাকা পরিশোধ')),
      date: getTodayDate(),
      time: getTimeString(),
      runningBalance: newBal,
    };
    const updatedJournals = [newJ, ...journals];
    setJournals(updatedJournals);

    let updatedCash = cashEntries;
    if (isCust && txnType === 'received') {
      const cashEntry = {
        id: (Date.now() + 2).toString(),
        category: 'sale',
        type: 'in',
        amount: amt,
        desc: selectedAccount.name + ' (বাকি আদায়)',
        date: getTodayDate(),
        time: getTimeString(),
      };
      updatedCash = [cashEntry, ...cashEntries];
      setCashEntries(updatedCash);
    } else if (!isCust && txnType === 'given') {
      const cashEntry = {
        id: (Date.now() + 2).toString(),
        category: 'buy',
        type: 'out',
        amount: amt,
        desc: selectedAccount.name + ' (সাপ্লায়ার দেনা পরিশোধ)',
        date: getTodayDate(),
        time: getTimeString(),
      };
      updatedCash = [cashEntry, ...cashEntries];
      setCashEntries(updatedCash);
    }

    persistData(updatedAccounts, updatedJournals, updatedCash);
    setTxnAmount('');
    setTxnDesc('');
    setModalAddTxn(false);
  };

  const handleOpenEditTxn = (txn) => {
    setEditTxnId(txn.id);
    setEditTxnAmount(String(txn.amount));
    setEditTxnDesc(txn.desc || '');
    setModalVoucher(false);
    setModalEditTxn(true);
  };

  const handleUpdateTransaction = () => {
    const amt = parseFloat(editTxnAmount);
    if (!amt || amt <= 0) {
      Alert.alert('সতর্কতা', 'সঠিক টাকার পরিমাণ লিখুন');
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
      j.id === editTxnId ? { ...j, amount: amt, desc: editTxnDesc.trim() || j.desc } : j
    );

    setSelectedAccount(updatedAccountObj);
    setAccounts(updatedAccounts);
    setJournals(updatedJournals);
    persistData(updatedAccounts, updatedJournals);

    setModalEditTxn(false);
    setEditTxnId(null);
  };

  const handleDeleteTransaction = (txnId) => {
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

            setSelectedAccount(updatedAccountObj);
            setAccounts(updatedAccounts);
            setJournals(updatedJournals);
            persistData(updatedAccounts, updatedJournals);
            setModalVoucher(false);
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'খাতা মুছে ফেলবেন?',
      (selectedAccount?.name || 'এই কাস্টমার') + '-এর সম্পূর্ণ খাতা এবং সকল লেনদেন মুছে যাবে।',
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
            persistData(updatedAccounts, updatedJournals);
            setCurrentScreen('home');
          },
        },
      ]
    );
  };

  // --- HANDLER: TAGADA & MESSAGES ---
  const generateTagadaMessage = (account) => {
    const acc = account || selectedAccount;
    if (!acc) return '';
    return (
      'আসসালামু আলাইকুম ' +
      (acc.name || 'সম্মানিত গ্রাহক') +
      ',\n' +
      businessName +
      '-এ আপনার বকেয়া হিসাব বাবদ ৳ ' +
      formatMoney(acc.balance) +
      ' টাকা পাওনা রয়েছে। অনুগ্রহ করে বকেয়া পরিশোধ করার জন্য অনুরোধ করা হলো।\nযোগাযোগ: ' +
      ownerPhone +
      '\nধন্যবাদ।'
    );
  };

  const handleSendSMS = (account) => {
    const acc = account || selectedAccount;
    if (!acc) return;
    const text = generateTagadaMessage(acc);
    const phone = acc.phone ? acc.phone.replace(/[^0-9+]/g, '') : '';
    const url = 'sms:' + phone + '?body=' + encodeURIComponent(text);
    Linking.openURL(url).catch(() => {
      Share.share({ message: text });
    });
    setModalTagada(false);
  };

  const handleSendWhatsApp = (account) => {
    const acc = account || selectedAccount;
    if (!acc) return;
    const text = generateTagadaMessage(acc);
    let phone = acc.phone ? acc.phone.replace(/[^0-9]/g, '') : '';
    if (phone.startsWith('01')) phone = '88' + phone;
    const url = 'whatsapp://send?phone=' + phone + '&text=' + encodeURIComponent(text);
    Linking.openURL(url).catch(() => {
      Share.share({ message: text });
    });
    setModalTagada(false);
  };

  const handleMakeCall = (phone) => {
    if (!phone) {
      Alert.alert('সতর্কতা', 'কোনো মোবাইল নম্বর দেওয়া নেই');
      return;
    }
    const clean = phone.replace(/[^0-9+]/g, '');
    Linking.openURL('tel:' + clean).catch(() => {
      Alert.alert('কল ব্যর্থ', 'কল অ্যাপ ওপেন করা যায়নি');
    });
  };

  // --- HANDLER: CASHBOX ---
  const handleSaveCashEntry = () => {
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
    persistData(undefined, undefined, updated);

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
        onPress: () => {
          const updated = cashEntries.filter((c) => c.id !== id);
          setCashEntries(updated);
          persistData(undefined, undefined, updated);
        },
      },
    ]);
  };

  // --- HANDLER: INVENTORY ---
  const handleSaveProduct = () => {
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
    persistData(undefined, undefined, undefined, updated);
    setProdName('');
    setProdBuyPrice('');
    setProdSellPrice('');
    setProdStock('');
    setModalAddStock(false);
  };

  const handleAdjustStock = () => {
    const qty = parseFloat(stockAdjustQty);
    if (!qty || qty <= 0) {
      Alert.alert('সতর্কতা', 'সঠিক পরিমাণ লিখুন');
      return;
    }
    const diff = stockAdjustType === 'in' ? qty : -qty;
    const updated = inventory.map((p) =>
      p.id === selectedProduct.id ? { ...p, stock: Math.max(0, p.stock + diff) } : p
    );
    setInventory(updated);
    persistData(undefined, undefined, undefined, updated);
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
        onPress: () => {
          const updated = inventory.filter((p) => p.id !== id);
          setInventory(updated);
          persistData(undefined, undefined, undefined, updated);
        },
      },
    ]);
  };

  // --- HANDLER: SETTINGS & BACKUP ---
  const handleSaveSettings = () => {
    const bName = tempBizName.trim() || businessName;
    const oName = tempOwnerName.trim() || ownerName;
    const oPhone = tempOwnerPhone.trim() || ownerPhone;
    const bAddr = tempBizAddress.trim() || businessAddress;
    const opBal = parseFloat(tempOpeningBal) || openingBalance;

    setBusinessName(bName);
    setOwnerName(oName);
    setOwnerPhone(oPhone);
    setBusinessAddress(bAddr);
    setOpeningBalance(opBal);

    persistData(undefined, undefined, undefined, undefined, undefined, bName, oName, oPhone, bAddr, opBal);
    Alert.alert('সফল', 'ব্যবসার তথ্য সফলভাবে সংরক্ষিত হয়েছে');
  };

  const handleExportBackup = () => {
    const backupObj = {
      version: '3.0',
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
    };
    const jsonStr = JSON.stringify(backupObj, null, 2);
    setBackupJsonText(jsonStr);
    setModalBackupRestore(true);
  };

  const handleShareBackup = () => {
    Share.share({
      title: 'TallyKhata Backup - ' + businessName,
      message: backupJsonText,
    });
  };

  const handleImportBackup = () => {
    try {
      if (!backupJsonText.trim()) {
        Alert.alert('সতর্কতা', 'দয়া করে পূর্বে সংরক্ষিত ব্যাকআপ JSON টেক্সট পেস্ট করুন');
        return;
      }
      const data = JSON.parse(backupJsonText);
      if (!data.accounts || !Array.isArray(data.accounts)) {
        Alert.alert('ত্রুটি', 'অকার্যকর ব্যাকআপ ফরম্যাট');
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

      persistData(
        data.accounts,
        data.journals,
        data.cashEntries,
        data.inventory,
        data.notes,
        data.businessName,
        data.ownerName,
        data.ownerPhone,
        data.businessAddress,
        data.openingBalance
      );

      setModalBackupRestore(false);
      Alert.alert('সফল', 'ডাটা সফলভাবে ব্যাকআপ থেকে পুনরুদ্ধার করা হয়েছে!');
    } catch (e) {
      Alert.alert('ব্যর্থ', 'JSON ফরম্যাট সঠিক নয়। দয়া করে সঠিক ডাটা পেস্ট করুন।');
    }
  };

  // --- DIGITAL VOUCHER MEMO BUILDER ---
  const renderVoucherText = (txn, account) => {
    if (!txn || !account) return '';
    const isCust = account.type === 1;
    const isGiven = txn.type === 'given';
    return (
      '=================================\n' +
      '       ' + businessName + '\n' +
      '     ' + businessAddress + '\n' +
      '     মোবাইল: ' + ownerPhone + '\n' +
      '=================================\n' +
      'রসিদ নং: TK-' + txn.id.slice(-6) + '\n' +
      'তারিখ: ' + txn.date + '  ' + (txn.time || '') + '\n' +
      '---------------------------------\n' +
      (isCust ? 'কাস্টমার: ' : 'সাপ্লায়ার: ') + account.name + '\n' +
      'মোবাইল: ' + (account.phone || 'দেওয়া নেই') + '\n' +
      '---------------------------------\n' +
      'লেনদেনের ধরন: ' + (isGiven ? (isCust ? 'বাকি বিক্রি' : 'মাল ক্রয়') : (isCust ? 'বাকি আদায় (জমা)' : 'টাকা পরিশোধ')) + '\n' +
      'বিবরণ: ' + (txn.desc || 'সাধারণ লেনদেন') + '\n' +
      'টাকার পরিমাণ: ৳ ' + formatMoney(txn.amount) + '\n' +
      '---------------------------------\n' +
      'বর্তমান সর্বমোট বকেয়া: ৳ ' + formatMoney(account.balance) + '\n' +
      '=================================\n' +
      '১০০% সঠিক ও ডিজিটাল টালিখাতা হিসাব।\nধন্যবাদ, আবার আসবেন।'
    );
  };

  // Filter Accounts
  const filteredAccounts = (accounts || []).filter((a) => {
    const q = searchQuery.toLowerCase();
    const nameMatch = (a.name || '').toLowerCase().includes(q);
    const phoneMatch = (a.phone || '').includes(q);
    const typeMatch = filterType === 'all' || String(a.type) === filterType;
    return (nameMatch || phoneMatch) && typeMatch;
  });

  const dueCustomers = (accounts || []).filter((a) => a.type === 1 && Number(a.balance) > 0);

  const filteredCashEntries = (cashEntries || []).filter((c) => {
    if (cashCategoryFilter === 'all') return true;
    return c.category === cashCategoryFilter;
  });

  // =========================================================================
  // VIEW A: CUSTOMER / SUPPLIER DETAILED LEDGER SCREEN
  // =========================================================================
  if (currentScreen === 'account_ledger' && selectedAccount) {
    const isCustomer = selectedAccount.type === 1;
    const accountJournals = (journals || []).filter((j) => j.accountId === selectedAccount.id);

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#006847" />

        {/* Top Header */}
        <View style={styles.ledgerHeaderNav}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentScreen('home')}>
            <Text style={styles.backBtnText}>← টালি খাতা</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {selectedAccount.phone ? (
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => handleMakeCall(selectedAccount.phone)}
              >
                <Text style={{ fontSize: 16 }}>📞</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => setModalTagada(true)}
            >
              <Text style={{ fontSize: 16 }}>💬</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteAccBtn} onPress={handleDeleteAccount}>
              <Text style={styles.deleteAccBtnText}>মুছুন</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Profile Card */}
        <View style={styles.accountProfileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{(selectedAccount.name || 'খ')[0]}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.profileName}>{selectedAccount.name}</Text>
            <Text style={styles.profilePhone}>
              {selectedAccount.phone ? '📱 ' + selectedAccount.phone : 'মোবাইল নম্বর নেই'}
            </Text>
            {selectedAccount.address ? (
              <Text style={styles.profileAddress}>📍 {selectedAccount.address}</Text>
            ) : null}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.profileDueLabel, { color: isCustomer ? '#dc2626' : '#15803d' }]}>
              {isCustomer ? 'মোট বাকি (পাবো)' : 'মোট দেনা (দেবো)'}
            </Text>
            <Text style={[styles.profileDueAmount, { color: isCustomer ? '#dc2626' : '#15803d' }]}>
              ৳ {formatMoney(selectedAccount.balance)}
            </Text>
          </View>
        </View>

        {/* Quick Actions Bar */}
        <View style={styles.ledgerQuickActions}>
          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => setModalTagada(true)}
          >
            <Text style={styles.quickActionEmoji}>💬</Text>
            <Text style={styles.quickActionLabel}>তাগাদা পাঠান</Text>
          </TouchableOpacity>
          {selectedAccount.phone ? (
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => handleMakeCall(selectedAccount.phone)}
            >
              <Text style={styles.quickActionEmoji}>📞</Text>
              <Text style={styles.quickActionLabel}>কল করুন</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => {
              const fullStatement =
                'খাতা: ' + selectedAccount.name + '\n' +
                'বর্তমান বকেয়া: ৳ ' + formatMoney(selectedAccount.balance) + '\n' +
                'মোট লেনদেন: ' + accountJournals.length + ' টি\n' +
                'দোকান: ' + businessName + ' (' + ownerPhone + ')';
              Share.share({ message: fullStatement });
            }}
          >
            <Text style={styles.quickActionEmoji}>📄</Text>
            <Text style={styles.quickActionLabel}>হিসাব শেয়ার</Text>
          </TouchableOpacity>
        </View>

        {/* Ledger Table Header */}
        <View style={styles.ledgerTableHeader}>
          <Text style={[styles.ledgerColHeader, { flex: 1.4 }]}>তারিখ ও বিবরণ</Text>
          <Text style={[styles.ledgerColHeader, { flex: 1, textAlign: 'right', color: '#dc2626' }]}>
            দিলাম (-)
          </Text>
          <Text style={[styles.ledgerColHeader, { flex: 1, textAlign: 'right', color: '#16a34a' }]}>
            পেলাম (+)
          </Text>
        </View>

        {/* Ledger Transaction Rows */}
        <FlatList
          data={accountJournals}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => {
            const isGiven = item.type === 'given';
            return (
              <TouchableOpacity
                style={styles.ledgerRowCard}
                onPress={() => {
                  setSelectedVoucherTxn(item);
                  setModalVoucher(true);
                }}
              >
                <View style={{ flex: 1.4 }}>
                  <Text style={styles.ledgerRowDesc}>{item.desc || 'সাধারণ লেনদেন'}</Text>
                  <Text style={styles.ledgerRowDate}>
                    {item.date} {item.time ? '• ' + item.time : ''}
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  {isGiven ? (
                    <Text style={styles.ledgerGivenAmount}>৳ {formatMoney(item.amount)}</Text>
                  ) : (
                    <Text style={styles.dashMuted}>-</Text>
                  )}
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  {!isGiven ? (
                    <Text style={styles.ledgerReceivedAmount}>৳ {formatMoney(item.amount)}</Text>
                  ) : (
                    <Text style={styles.dashMuted}>-</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📒</Text>
              <Text style={styles.emptyText}>কোনো লেনদেন রেকর্ড নেই</Text>
              <Text style={styles.emptySubText}>নিচের বাটন চেপে বাকি বা জমা এন্ট্রি দিন</Text>
            </View>
          }
        />

        {/* Bottom Entry Bar */}
        <View style={styles.ledgerBottomBar}>
          <TouchableOpacity
            style={[styles.bigEntryBtn, { backgroundColor: '#dc2626' }]}
            onPress={() => {
              setTxnType('given');
              setModalAddTxn(true);
            }}
          >
            <Text style={styles.bigEntryBtnText}>- দিলাম (বাকি)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bigEntryBtn, { backgroundColor: '#15803d' }]}
            onPress={() => {
              setTxnType('received');
              setModalAddTxn(true);
            }}
          >
            <Text style={styles.bigEntryBtnText}>+ পেলাম (জমা)</Text>
          </TouchableOpacity>
        </View>

        {/* --- MODAL: ADD TRANSACTION --- */}
        <Modal visible={modalAddTxn} animationType="fade" transparent onRequestClose={() => setModalAddTxn(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={[styles.modalCardTitle, { color: txnType === 'given' ? '#dc2626' : '#15803d' }]}>
                {txnType === 'given' ? '- দিলাম (টাকা বা পণ্য বাকি)' : '+ পেলাম (নগদ বা জমা আদায়)'}
              </Text>
              <TextInput
                style={styles.modalBigInput}
                placeholder="৳ টাকার পরিমাণ"
                keyboardType="numeric"
                autoFocus
                value={txnAmount}
                onChangeText={setTxnAmount}
              />
              <View style={styles.quickChipRow}>
                {['১০০', '৫০০', '১০০০', '২০০০'].map((chip, idx) => {
                  const val = [100, 500, 1000, 2000][idx];
                  return (
                    <TouchableOpacity
                      key={chip}
                      style={styles.quickChip}
                      onPress={() => {
                        const cur = parseFloat(txnAmount) || 0;
                        setTxnAmount(String(cur + val));
                      }}
                    >
                      <Text style={styles.quickChipText}>+{chip}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TextInput
                style={styles.modalSimpleInput}
                placeholder="বিবরণ (যেমন: চাল, তেল, নগদ ইত্যাদি)"
                value={txnDesc}
                onChangeText={setTxnDesc}
              />
              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalAddTxn(false)}>
                  <Text style={styles.modalBtnCancelText}>বাতিল</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtnSubmit, { backgroundColor: txnType === 'given' ? '#dc2626' : '#15803d' }]}
                  onPress={handleSaveTransaction}
                >
                  <Text style={styles.modalBtnSubmitText}>নিশ্চিত করুন</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* --- MODAL: EDIT TRANSACTION --- */}
        <Modal visible={modalEditTxn} animationType="fade" transparent onRequestClose={() => setModalEditTxn(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalCardTitle}>লেনদেন সংশোধন (এডিট)</Text>
              <TextInput
                style={styles.modalBigInput}
                placeholder="টাকার পরিমাণ"
                keyboardType="numeric"
                value={editTxnAmount}
                onChangeText={setEditTxnAmount}
              />
              <TextInput
                style={styles.modalSimpleInput}
                placeholder="বিবরণ"
                value={editTxnDesc}
                onChangeText={setEditTxnDesc}
              />
              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalEditTxn(false)}>
                  <Text style={styles.modalBtnCancelText}>বাতিল</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtnSubmit, { backgroundColor: '#006847' }]}
                  onPress={handleUpdateTransaction}
                >
                  <Text style={styles.modalBtnSubmitText}>আপডেট করুন</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* --- MODAL: DIGITAL VOUCHER / RECEIPT MEMO --- */}
        <Modal visible={modalVoucher} animationType="slide" transparent onRequestClose={() => setModalVoucher(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { maxHeight: '90%' }]}>
              <View style={styles.voucherTop}>
                <Text style={styles.voucherTitle}>🧾 ডিজিটাল ভাউচার রসিদ</Text>
                <TouchableOpacity onPress={() => setModalVoucher(false)}>
                  <Text style={{ fontSize: 18, color: '#6b7280' }}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={{ marginVertical: 12 }}>
                <View style={styles.voucherPaper}>
                  <Text style={styles.voucherBizName}>{businessName}</Text>
                  <Text style={styles.voucherBizSub}>{businessAddress}</Text>
                  <Text style={styles.voucherBizSub}>মোবাইল: {ownerPhone}</Text>
                  <View style={styles.voucherDivider} />
                  <View style={styles.voucherDetailRow}>
                    <Text style={styles.voucherLabel}>রসিদ নম্বর:</Text>
                    <Text style={styles.voucherVal}>TK-{selectedVoucherTxn?.id?.slice(-6)}</Text>
                  </View>
                  <View style={styles.voucherDetailRow}>
                    <Text style={styles.voucherLabel}>তারিখ ও সময়:</Text>
                    <Text style={styles.voucherVal}>{selectedVoucherTxn?.date} {selectedVoucherTxn?.time || ''}</Text>
                  </View>
                  <View style={styles.voucherDetailRow}>
                    <Text style={styles.voucherLabel}>গ্রাহকের নাম:</Text>
                    <Text style={styles.voucherVal}>{selectedAccount?.name}</Text>
                  </View>
                  <View style={styles.voucherDetailRow}>
                    <Text style={styles.voucherLabel}>লেনদেনের ধরন:</Text>
                    <Text style={[styles.voucherVal, { color: selectedVoucherTxn?.type === 'given' ? '#dc2626' : '#15803d' }]}>
                      {selectedVoucherTxn?.type === 'given' ? 'দিলাম (বাকি বিক্রি)' : 'পেলাম (জমা আদায়)'}
                    </Text>
                  </View>
                  <View style={styles.voucherDetailRow}>
                    <Text style={styles.voucherLabel}>বিবরণ:</Text>
                    <Text style={styles.voucherVal}>{selectedVoucherTxn?.desc || 'সাধারণ লেনদেন'}</Text>
                  </View>
                  <View style={styles.voucherDivider} />
                  <View style={styles.voucherDetailRow}>
                    <Text style={[styles.voucherLabel, { fontSize: 16, fontWeight: 'bold' }]}>টাকার পরিমাণ:</Text>
                    <Text style={[styles.voucherVal, { fontSize: 18, fontWeight: 'bold', color: selectedVoucherTxn?.type === 'given' ? '#dc2626' : '#15803d' }]}>
                      ৳ {formatMoney(selectedVoucherTxn?.amount)}
                    </Text>
                  </View>
                  <View style={styles.voucherDetailRow}>
                    <Text style={styles.voucherLabel}>বর্তমান সর্বমোট বাকি:</Text>
                    <Text style={[styles.voucherVal, { fontWeight: 'bold' }]}>
                      ৳ {formatMoney(selectedAccount?.balance)}
                    </Text>
                  </View>
                </View>
              </ScrollView>
              <View style={styles.voucherActionRow}>
                <TouchableOpacity
                  style={[styles.voucherBtn, { backgroundColor: '#0284c7' }]}
                  onPress={() => {
                    const txt = renderVoucherText(selectedVoucherTxn, selectedAccount);
                    Share.share({ message: txt });
                  }}
                >
                  <Text style={styles.voucherBtnText}>📤 শেয়ার / কপি</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.voucherBtn, { backgroundColor: '#f59e0b' }]}
                  onPress={() => handleOpenEditTxn(selectedVoucherTxn)}
                >
                  <Text style={styles.voucherBtnText}>✏️ সংশোধন</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.voucherBtn, { backgroundColor: '#ef4444' }]}
                  onPress={() => handleDeleteTransaction(selectedVoucherTxn.id)}
                >
                  <Text style={styles.voucherBtnText}>🗑️ মুছুন</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* --- MODAL: TAGADA REMINDER --- */}
        <Modal visible={modalTagada} animationType="fade" transparent onRequestClose={() => setModalTagada(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalCardTitle}>💬 বকেয়া তাগাদা বার্তা</Text>
              <View style={styles.tagadaMessageBox}>
                <Text style={styles.tagadaMessageContent}>{generateTagadaMessage(selectedAccount)}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <TouchableOpacity
                  style={[styles.tagadaShareBtn, { backgroundColor: '#0284c7' }]}
                  onPress={() => handleSendSMS(selectedAccount)}
                >
                  <Text style={styles.tagadaShareBtnText}>📱 সাধারণ SMS</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tagadaShareBtn, { backgroundColor: '#15803d' }]}
                  onPress={() => handleSendWhatsApp(selectedAccount)}
                >
                  <Text style={styles.tagadaShareBtnText}>💬 WhatsApp</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.modalBtnCancel, { marginTop: 12 }]}
                onPress={() => setModalTagada(false)}
              >
                <Text style={styles.modalBtnCancelText}>বন্ধ করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // VIEW B: MAIN HOME SCREEN
  // =========================================================================
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#006847" />

      {/* Main Top Header Bar */}
      <View style={styles.mainHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>ট</Text>
          </View>
          <View>
            <Text style={styles.appNameTitle}>টালি খাতা</Text>
            <Text style={styles.appSubTitle}>{businessName} • ১০০% অফলাইন</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.settingsHeaderBtn}
          onPress={() => {
            setTempBizName(businessName);
            setTempOwnerName(ownerName);
            setTempOwnerPhone(ownerPhone);
            setTempBizAddress(businessAddress);
            setTempOpeningBal(String(openingBalance));
            setActiveTab('settings');
          }}
        >
          <Text style={styles.settingsHeaderBtnText}>⚙️ দোকান</Text>
        </TouchableOpacity>
      </View>

      {/* Top 3 Metric Cards */}
      <View style={styles.dashboardRow}>
        <View style={[styles.dashboardCard, { borderBottomColor: '#dc2626' }]}>
          <Text style={styles.dashLabel}>মোট পাবো</Text>
          <Text style={[styles.dashAmount, { color: '#dc2626' }]}>
            ৳ {formatMoney(totalCustomerDue)}
          </Text>
        </View>
        <View style={[styles.dashboardCard, { borderBottomColor: '#15803d' }]}>
          <Text style={styles.dashLabel}>মোট দেবো</Text>
          <Text style={[styles.dashAmount, { color: '#15803d' }]}>
            ৳ {formatMoney(totalSupplierDue)}
          </Text>
        </View>
        <View style={[styles.dashboardCard, { borderBottomColor: '#006847' }]}>
          <Text style={styles.dashLabel}>ক্যাশ বাক্স</Text>
          <Text style={[styles.dashAmount, { color: '#006847' }]}>
            ৳ {formatMoney(totalCash)}
          </Text>
        </View>
      </View>

      {/* TAB CONTENT AREA */}
      <View style={{ flex: 1 }}>
        {/* --- TAB 1: LEDGER (খাতা) --- */}
        {activeTab === 'ledger' && (
          <View style={{ flex: 1 }}>
            <View style={styles.searchBarRow}>
              <TextInput
                style={styles.searchTextInput}
                placeholder="🔍 নাম বা মোবাইল নম্বর দিয়ে খুঁজুন..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <View style={styles.filterPillRow}>
              <TouchableOpacity
                style={[styles.filterPill, filterType === 'all' && styles.filterPillActive]}
                onPress={() => setFilterType('all')}
              >
                <Text style={[styles.filterPillText, filterType === 'all' && styles.filterPillTextActive]}>
                  সকল খাতা ({accounts.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterPill, filterType === '1' && styles.filterPillActive]}
                onPress={() => setFilterType('1')}
              >
                <Text style={[styles.filterPillText, filterType === '1' && styles.filterPillTextActive]}>
                  কাস্টমার ({accounts.filter((a) => a.type === 1).length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterPill, filterType === '2' && styles.filterPillActive]}
                onPress={() => setFilterType('2')}
              >
                <Text style={[styles.filterPillText, filterType === '2' && styles.filterPillTextActive]}>
                  সাপ্লায়ার ({accounts.filter((a) => a.type === 2).length})
                </Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={filteredAccounts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 90, paddingHorizontal: 12 }}
              renderItem={({ item }) => {
                const isCust = item.type === 1;
                return (
                  <TouchableOpacity
                    style={styles.accountCardItem}
                    onPress={() => handleOpenAccount(item)}
                  >
                    <View style={[styles.accAvatarCircle, { backgroundColor: isCust ? '#fee2e2' : '#dcfce7' }]}>
                      <Text style={[styles.accAvatarLetter, { color: isCust ? '#dc2626' : '#15803d' }]}>
                        {(item.name || 'খ')[0]}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.accCardName}>{item.name}</Text>
                      <Text style={styles.accCardPhone}>
                        {item.phone ? '📱 ' + item.phone : 'মোবাইল নম্বর নেই'}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.accTypeBadge, { color: isCust ? '#dc2626' : '#15803d' }]}>
                        {isCust ? 'পাবো (বাকি)' : 'দেবো (পাওনা)'}
                      </Text>
                      <Text
                        style={[
                          styles.accBalanceValue,
                          { color: isCust ? '#dc2626' : '#15803d' },
                        ]}
                      >
                        ৳ {formatMoney(item.balance)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIcon}>🔍</Text>
                  <Text style={styles.emptyText}>কোনো খাতা পাওয়া যায়নি</Text>
                  <Text style={styles.emptySubText}>নিচের '+ নতুন খাতা' বাটনে চাপ দিয়ে যোগ করুন</Text>
                </View>
              }
            />

            <TouchableOpacity style={styles.floatingAddBtn} onPress={() => setModalAddAccount(true)}>
              <Text style={styles.floatingAddBtnText}>+ নতুন খাতা খুলুন</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* --- TAB 2: CASHBOX (ক্যাশবক্স) --- */}
        {activeTab === 'cashbox' && (
          <View style={{ flex: 1 }}>
            <View style={styles.cashTopCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={styles.cashTopCardSub}>ক্যাশ বাক্সে বর্তমান টাকা</Text>
                  <Text style={styles.cashTotalDisplay}>৳ {formatMoney(totalCash)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.reconcileBtn}
                  onPress={() => {
                    setCountedCash('');
                    setModalReconcileCash(true);
                  }}
                >
                  <Text style={styles.reconcileBtnText}>⚖️ ক্যাশ মিলাই</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.cashTodayStatsRow}>
                <View style={styles.cashTodayStatItem}>
                  <Text style={styles.cashTodayStatLabel}>আজকের ক্যাশ ইন (+)</Text>
                  <Text style={[styles.cashTodayStatVal, { color: '#15803d' }]}>
                    + ৳ {formatMoney(todayCashIn)}
                  </Text>
                </View>
                <View style={[styles.cashTodayStatItem, { borderLeftWidth: 1, borderColor: '#e5e7eb' }]}>
                  <Text style={styles.cashTodayStatLabel}>আজকের ক্যাশ আউট (-)</Text>
                  <Text style={[styles.cashTodayStatVal, { color: '#dc2626' }]}>
                    - ৳ {formatMoney(todayCashOut)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.cashCategoryPillRow}>
              {[
                { key: 'all', label: 'সকল ক্যাশ' },
                { key: 'sale', label: '🛒 ক্যাশ বেচা' },
                { key: 'buy', label: '📦 ক্যাশ কেনা' },
                { key: 'cost', label: '🧾 খরচ' },
                { key: 'malik_in', label: '📥 মালিক দিল' },
                { key: 'malik_out', label: '📤 মালিক নিল' },
              ].map((c) => (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.filterPill, cashCategoryFilter === c.key && styles.filterPillActive]}
                  onPress={() => setCashCategoryFilter(c.key)}
                >
                  <Text style={[styles.filterPillText, cashCategoryFilter === c.key && styles.filterPillTextActive]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <FlatList
              data={filteredCashEntries}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 90 }}
              renderItem={({ item }) => {
                const isIn = item.type === 'in';
                return (
                  <TouchableOpacity
                    style={styles.cashHistoryCard}
                    onLongPress={() => handleDeleteCashEntry(item.id)}
                  >
                    <View style={[styles.cashTypeCircle, { backgroundColor: isIn ? '#dcfce7' : '#fee2e2' }]}>
                      <Text style={{ fontSize: 16 }}>{isIn ? '📥' : '📤'}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.cashEntryDesc}>{item.desc}</Text>
                      <Text style={styles.cashEntryDate}>
                        {item.date} {item.time ? '• ' + item.time : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text
                        style={[
                          styles.cashEntryAmount,
                          { color: isIn ? '#15803d' : '#dc2626' },
                        ]}
                      >
                        {isIn ? '+' : '-'} ৳ {formatMoney(item.amount)}
                      </Text>
                      <TouchableOpacity onPress={() => handleDeleteCashEntry(item.id)}>
                        <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>মুছুন</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIcon}>💰</Text>
                  <Text style={styles.emptyText}>কোনো ক্যাশ এন্ট্রি নেই</Text>
                  <Text style={styles.emptySubText}>নিচের '+ ক্যাশ এন্ট্রি' বাটনে চাপ দিয়ে যোগ করুন</Text>
                </View>
              }
            />

            <TouchableOpacity
              style={styles.floatingAddBtn}
              onPress={() => {
                setCashCategory('sale');
                setModalAddCash(true);
              }}
            >
              <Text style={styles.floatingAddBtnText}>+ ক্যাশ এন্ট্রি দিন</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* --- TAB 3: STOCK (স্টক) --- */}
        {activeTab === 'stock' && (
          <View style={{ flex: 1 }}>
            <View style={styles.stockSummaryCard}>
              <View style={styles.stockSummaryItem}>
                <Text style={styles.stockSummaryLabel}>পণ্যের ধরন</Text>
                <Text style={styles.stockSummaryVal}>{inventory.length} টি</Text>
              </View>
              <View style={[styles.stockSummaryItem, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#e5e7eb' }]}>
                <Text style={styles.stockSummaryLabel}>মোট স্টক ক্রয়মূল্য</Text>
                <Text style={[styles.stockSummaryVal, { color: '#006847' }]}>৳ {formatMoney(totalStockCost)}</Text>
              </View>
              <View style={styles.stockSummaryItem}>
                <Text style={styles.stockSummaryLabel}>আনুমানিক বিক্রয়মূল্য</Text>
                <Text style={[styles.stockSummaryVal, { color: '#15803d' }]}>৳ {formatMoney(totalStockSaleValue)}</Text>
              </View>
            </View>

            <FlatList
              data={inventory}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 90 }}
              renderItem={({ item }) => {
                const profitPerUnit = (item.sellPrice || 0) - (item.buyPrice || 0);
                const isLow = (item.stock || 0) <= 10;
                return (
                  <View style={styles.stockCardItem}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.stockItemName}>{item.name}</Text>
                        {isLow ? (
                          <View style={styles.lowStockBadge}>
                            <Text style={styles.lowStockBadgeText}>স্বল্প স্টক!</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.stockItemSub}>
                        ক্রয়: ৳ {formatMoney(item.buyPrice)} • বিক্রয়: ৳ {formatMoney(item.sellPrice)} / {item.unit}
                      </Text>
                      <Text style={styles.stockProfitText}>
                        লাভ: ৳ {formatMoney(profitPerUnit)} প্রতি {item.unit}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
                      <Text style={[styles.stockQtyText, isLow && { color: '#dc2626' }]}>
                        {item.stock} {item.unit}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                        <TouchableOpacity
                          style={styles.stockAdjustBtn}
                          onPress={() => {
                            setSelectedProduct(item);
                            setStockAdjustType('in');
                            setModalAdjustStock(true);
                          }}
                        >
                          <Text style={styles.stockAdjustBtnText}>+ ইন</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.stockAdjustBtn, { backgroundColor: '#dc2626' }]}
                          onPress={() => {
                            setSelectedProduct(item);
                            setStockAdjustType('out');
                            setModalAdjustStock(true);
                          }}
                        >
                          <Text style={styles.stockAdjustBtnText}>- আউট</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ padding: 4 }}
                          onPress={() => handleDeleteProduct(item.id)}
                        >
                          <Text style={{ fontSize: 16 }}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIcon}>📦</Text>
                  <Text style={styles.emptyText}>কোনো পণ্য যোগ করা হয়নি</Text>
                  <Text style={styles.emptySubText}>নিচের '+ নতুন পণ্য' বাটনে চাপ দিয়ে পণ্য যোগ করুন</Text>
                </View>
              }
            />

            <TouchableOpacity style={styles.floatingAddBtn} onPress={() => setModalAddStock(true)}>
              <Text style={styles.floatingAddBtnText}>+ নতুন পণ্য যোগ করুন</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* --- TAB 4: TAGADA (তাগাদা) --- */}
        {activeTab === 'tagada' && (
          <View style={{ flex: 1 }}>
            <View style={styles.tagadaHeaderCard}>
              <Text style={styles.tagadaHeaderTitle}>📢 বকেয়া তাগাদা কালেকশন</Text>
              <Text style={styles.tagadaHeaderSub}>
                যেসব কাস্টমারের কাছে বাকি রয়েছে তাদের সরাসরি SMS বা WhatsApp-এ তাগাদা পাঠান।
              </Text>
              <Text style={styles.tagadaHeaderCount}>
                বকেয়া কাস্টমার সংখ্যা: {dueCustomers.length} জন (মোট ৳ {formatMoney(totalCustomerDue)})
              </Text>
            </View>

            <FlatList
              data={dueCustomers}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 30 }}
              renderItem={({ item }) => (
                <View style={styles.tagadaCardItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tagadaCustName}>{item.name}</Text>
                    <Text style={styles.tagadaCustPhone}>📱 {item.phone || 'মোবাইল নেই'}</Text>
                    <Text style={styles.tagadaCustDue}>বকেয়া: ৳ {formatMoney(item.balance)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <TouchableOpacity
                      style={[styles.tagadaActionBtn, { backgroundColor: '#0284c7' }]}
                      onPress={() => handleSendSMS(item)}
                    >
                      <Text style={styles.tagadaActionBtnText}>SMS</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.tagadaActionBtn, { backgroundColor: '#15803d' }]}
                      onPress={() => handleSendWhatsApp(item)}
                    >
                      <Text style={styles.tagadaActionBtnText}>WhatsApp</Text>
                    </TouchableOpacity>
                    {item.phone ? (
                      <TouchableOpacity
                        style={[styles.tagadaActionBtn, { backgroundColor: '#4b5563' }]}
                        onPress={() => handleMakeCall(item.phone)}
                      >
                        <Text style={styles.tagadaActionBtnText}>কল</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIcon}>🎉</Text>
                  <Text style={styles.emptyText}>কোনো কাস্টমারের কাছে বকেয়া নেই</Text>
                  <Text style={styles.emptySubText}>সকল বাকি আদায় হয়েছে!</Text>
                </View>
              }
            />
          </View>
        )}

        {/* --- TAB 5: REPORTS (রিপোর্ট) --- */}
        {activeTab === 'reports' && (
          <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 30 }}>
            <View style={styles.filterPillRow}>
              {[
                { key: 'today', label: 'আজকের' },
                { key: 'week', label: 'এই সপ্তাহের' },
                { key: 'month', label: 'এই মাসের' },
                { key: 'all', label: 'সার্বিক (সব)' },
              ].map((p) => (
                <TouchableOpacity
                  key={p.key}
                  style={[styles.filterPill, reportPeriod === p.key && styles.filterPillActive]}
                  onPress={() => setReportPeriod(p.key)}
                >
                  <Text style={[styles.filterPillText, reportPeriod === p.key && styles.filterPillTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.reportCard}>
              <Text style={styles.reportCardHeading}>📊 আর্থিক সারাংশ বিবরণী</Text>
              <View style={styles.reportDivider} />

              <View style={styles.reportItemRow}>
                <Text style={styles.reportItemTitle}>মোট কাস্টমার বাকি (পাবো):</Text>
                <Text style={[styles.reportItemValue, { color: '#dc2626' }]}>
                  ৳ {formatMoney(totalCustomerDue)}
                </Text>
              </View>

              <View style={styles.reportItemRow}>
                <Text style={styles.reportItemTitle}>মোট সাপ্লায়ার দেনা (দেবো):</Text>
                <Text style={[styles.reportItemValue, { color: '#15803d' }]}>
                  ৳ {formatMoney(totalSupplierDue)}
                </Text>
              </View>

              <View style={styles.reportItemRow}>
                <Text style={styles.reportItemTitle}>ক্যাশ বাক্সে বর্তমান টাকা:</Text>
                <Text style={[styles.reportItemValue, { color: '#006847' }]}>
                  ৳ {formatMoney(totalCash)}
                </Text>
              </View>

              <View style={styles.reportItemRow}>
                <Text style={styles.reportItemTitle}>ইনভেন্টরি স্টকের ক্রয়মূল্য:</Text>
                <Text style={styles.reportItemValue}>
                  ৳ {formatMoney(totalStockCost)}
                </Text>
              </View>

              <View style={styles.reportDivider} />

              <View style={styles.reportItemRow}>
                <Text style={[styles.reportItemTitle, { fontWeight: 'bold' }]}>মোট সম্পদ (ক্যাশ + বাকি + স্টক):</Text>
                <Text style={[styles.reportItemValue, { fontWeight: 'bold', color: '#006847' }]}>
                  ৳ {formatMoney(totalCash + totalCustomerDue + totalStockCost)}
                </Text>
              </View>
            </View>

            <View style={styles.reportCard}>
              <Text style={styles.reportCardHeading}>📁 খাতা ও লেনদেন পরিসংখ্যান</Text>
              <View style={styles.reportDivider} />

              <View style={styles.reportItemRow}>
                <Text style={styles.reportItemTitle}>মোট খাতার সংখ্যা:</Text>
                <Text style={styles.reportItemValue}>{accounts.length} টি</Text>
              </View>
              <View style={styles.reportItemRow}>
                <Text style={styles.reportItemTitle}>মোট কাস্টমার সংখ্যা:</Text>
                <Text style={styles.reportItemValue}>{accounts.filter((a) => a.type === 1).length} জন</Text>
              </View>
              <View style={styles.reportItemRow}>
                <Text style={styles.reportItemTitle}>মোট সাপ্লায়ার সংখ্যা:</Text>
                <Text style={styles.reportItemValue}>{accounts.filter((a) => a.type === 2).length} জন</Text>
              </View>
              <View style={styles.reportItemRow}>
                <Text style={styles.reportItemTitle}>মোট সম্পন্ন লেনদেন:</Text>
                <Text style={styles.reportItemValue}>{journals.length} টি</Text>
              </View>
              <View style={styles.reportItemRow}>
                <Text style={styles.reportItemTitle}>ক্যাশ এন্ট্রি সংখ্যা:</Text>
                <Text style={styles.reportItemValue}>{cashEntries.length} টি</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.shareReportBtn}
              onPress={() => {
                const rep =
                  '=== ' + businessName + ' - সার্বিক হিসাব রিপোর্ট ===\n' +
                  'মোট বাকি পাবো: ৳ ' + formatMoney(totalCustomerDue) + '\n' +
                  'মোট দেনা দেবো: ৳ ' + formatMoney(totalSupplierDue) + '\n' +
                  'ক্যাশ বাক্সে আছে: ৳ ' + formatMoney(totalCash) + '\n' +
                  'স্টক মূল্য: ৳ ' + formatMoney(totalStockCost) + '\n' +
                  'মোট সম্পদ: ৳ ' + formatMoney(totalCash + totalCustomerDue + totalStockCost) + '\n' +
                  'তারিখ: ' + getTodayDate();
                Share.share({ message: rep });
              }}
            >
              <Text style={styles.shareReportBtnText}>📤 সম্পূর্ণ রিপোর্ট শেয়ার করুন</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* --- TAB 6: SETTINGS (দোকান সেটিংস) --- */}
        {activeTab === 'settings' && (
          <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 30 }}>
            <View style={styles.settingsCard}>
              <Text style={styles.settingsHeading}>🏪 ব্যবসার তথ্য</Text>
              <Text style={styles.inputLabel}>দোকান বা ব্যবসা প্রতিষ্ঠানের নাম</Text>
              <TextInput
                style={styles.modalSimpleInput}
                value={tempBizName}
                onChangeText={setTempBizName}
                placeholder="দোকানের নাম"
              />
              <Text style={styles.inputLabel}>মালিক / স্বত্বাধিকারীর নাম</Text>
              <TextInput
                style={styles.modalSimpleInput}
                value={tempOwnerName}
                onChangeText={setTempOwnerName}
                placeholder="মালিকের নাম"
              />
              <Text style={styles.inputLabel}>মোবাইল নম্বর</Text>
              <TextInput
                style={styles.modalSimpleInput}
                value={tempOwnerPhone}
                onChangeText={setTempOwnerPhone}
                keyboardType="phone-pad"
                placeholder="মোবাইল নম্বর"
              />
              <Text style={styles.inputLabel}>দোকানের ঠিকানা</Text>
              <TextInput
                style={styles.modalSimpleInput}
                value={tempBizAddress}
                onChangeText={setTempBizAddress}
                placeholder="দোকানের ঠিকানা"
              />
              <Text style={styles.inputLabel}>প্রারম্ভিক ক্যাশ ব্যালেন্স (৳)</Text>
              <TextInput
                style={styles.modalSimpleInput}
                value={tempOpeningBal}
                onChangeText={setTempOpeningBal}
                keyboardType="numeric"
                placeholder="প্রারম্ভিক ক্যাশ"
              />
              <TouchableOpacity style={styles.saveSettingsBtn} onPress={handleSaveSettings}>
                <Text style={styles.saveSettingsBtnText}>সেভ করুন</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.settingsCard}>
              <Text style={styles.settingsHeading}>💾 ১০০% অফলাইন ডাটা ব্যাকআপ</Text>
              <Text style={styles.settingsSubText}>
                আপনার খাতার সমস্ত হিসাব আপনার ফোনেই সুরক্ষিত থাকে। অন্য ফোনে ডাটা নিতে বা নিরাপদে সেভ রাখতে ব্যাকআপ কপি করে রাখুন।
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity
                  style={[styles.backupActionBtn, { backgroundColor: '#006847' }]}
                  onPress={handleExportBackup}
                >
                  <Text style={styles.backupActionBtnText}>📥 ব্যাকআপ নিন</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.backupActionBtn, { backgroundColor: '#0284c7' }]}
                  onPress={() => {
                    setBackupJsonText('');
                    setModalBackupRestore(true);
                  }}
                >
                  <Text style={styles.backupActionBtnText}>📤 ব্যাকআপ রিস্টোর</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.settingsCard, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
              <Text style={{ fontWeight: 'bold', color: '#166534', fontSize: 14 }}>
                🔒 কোনো লগইন বা সাবস্ক্রিপশন প্রয়োজন নেই
              </Text>
              <Text style={{ fontSize: 12, color: '#15803d', marginTop: 4, lineHeight: 18 }}>
                এই অ্যাপটি সম্পূর্ণ বিজ্ঞাপনমুক্ত ও ১০০% অফলাইন। কোনো ইন্টারনেট সংযোগ ছাড়াও নির্বিঘ্নে আজীবন ব্যবহার করতে পারবেন।
              </Text>
            </View>
          </ScrollView>
        )}
      </View>

      {/* BOTTOM TAB BAR */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'ledger' && styles.tabButtonActive]}
          onPress={() => setActiveTab('ledger')}
        >
          <Text style={styles.tabIcon}>📒</Text>
          <Text style={[styles.tabButtonLabel, activeTab === 'ledger' && styles.tabButtonLabelActive]}>
            খাতা
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'cashbox' && styles.tabButtonActive]}
          onPress={() => setActiveTab('cashbox')}
        >
          <Text style={styles.tabIcon}>💰</Text>
          <Text style={[styles.tabButtonLabel, activeTab === 'cashbox' && styles.tabButtonLabelActive]}>
            ক্যাশবক্স
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'stock' && styles.tabButtonActive]}
          onPress={() => setActiveTab('stock')}
        >
          <Text style={styles.tabIcon}>📦</Text>
          <Text style={[styles.tabButtonLabel, activeTab === 'stock' && styles.tabButtonLabelActive]}>
            স্টক
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'tagada' && styles.tabButtonActive]}
          onPress={() => setActiveTab('tagada')}
        >
          <Text style={styles.tabIcon}>📢</Text>
          <Text style={[styles.tabButtonLabel, activeTab === 'tagada' && styles.tabButtonLabelActive]}>
            তাগাদা
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'reports' && styles.tabButtonActive]}
          onPress={() => setActiveTab('reports')}
        >
          <Text style={styles.tabIcon}>📊</Text>
          <Text style={[styles.tabButtonLabel, activeTab === 'reports' && styles.tabButtonLabelActive]}>
            রিপোর্ট
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'settings' && styles.tabButtonActive]}
          onPress={() => setActiveTab('settings')}
        >
          <Text style={styles.tabIcon}>⚙️</Text>
          <Text style={[styles.tabButtonLabel, activeTab === 'settings' && styles.tabButtonLabelActive]}>
            দোকান
          </Text>
        </TouchableOpacity>
      </View>

      {/* ===================================================================
          GLOBAL MODALS
         =================================================================== */}

      {/* --- MODAL: CREATE ACCOUNT --- */}
      <Modal visible={modalAddAccount} animationType="slide" transparent onRequestClose={() => setModalAddAccount(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalCardTitle}>নতুন খাতা খুলুন</Text>
            <View style={styles.accTypeToggleRow}>
              <TouchableOpacity
                style={[styles.accTypeToggleBtn, accType === 1 && styles.accTypeToggleBtnActiveRed]}
                onPress={() => setAccType(1)}
              >
                <Text style={[styles.accTypeToggleText, accType === 1 && { color: '#fff' }]}>
                  কাস্টমার (বাকি)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.accTypeToggleBtn, accType === 2 && styles.accTypeToggleBtnActiveGreen]}
                onPress={() => setAccType(2)}
              >
                <Text style={[styles.accTypeToggleText, accType === 2 && { color: '#fff' }]}>
                  সাপ্লায়ার (মহাজন)
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalSimpleInput}
              placeholder="কাস্টমার / সাপ্লায়ারের নাম *"
              value={accName}
              onChangeText={setAccName}
            />
            <TextInput
              style={styles.modalSimpleInput}
              placeholder="মোবাইল নম্বর (ঐচ্ছিক)"
              keyboardType="phone-pad"
              value={accPhone}
              onChangeText={setAccPhone}
            />
            <TextInput
              style={styles.modalSimpleInput}
              placeholder="ঠিকানা / এলাকা (ঐচ্ছিক)"
              value={accAddress}
              onChangeText={setAccAddress}
            />
            <TextInput
              style={styles.modalSimpleInput}
              placeholder="পূর্বের বাকি ব্যালেন্স (যদি থাকে)"
              keyboardType="numeric"
              value={accInitialBal}
              onChangeText={setAccInitialBal}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalAddAccount(false)}>
                <Text style={styles.modalBtnCancelText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: '#006847' }]}
                onPress={handleSaveAccount}
              >
                <Text style={styles.modalBtnSubmitText}>খাতা খুলুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- MODAL: CASH ENTRY --- */}
      <Modal visible={modalAddCash} animationType="slide" transparent onRequestClose={() => setModalAddCash(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalCardTitle}>ক্যাশ বাক্সের এন্ট্রি</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {[
                { key: 'sale', label: '🛒 ক্যাশ বেচা (+)' },
                { key: 'buy', label: '📦 ক্যাশ কেনা (-)' },
                { key: 'cost', label: '🧾 খরচ (-)' },
                { key: 'malik_in', label: '📥 মালিক দিল (+)' },
                { key: 'malik_out', label: '📤 মালিক নিল (-)' },
              ].map((c) => (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.categorySelectChip, cashCategory === c.key && styles.categorySelectChipActive]}
                  onPress={() => setCashCategory(c.key)}
                >
                  <Text style={[styles.categorySelectChipText, cashCategory === c.key && styles.categorySelectChipTextActive]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              style={styles.modalBigInput}
              placeholder="৳ টাকার পরিমাণ *"
              keyboardType="numeric"
              autoFocus
              value={cashAmount}
              onChangeText={setCashAmount}
            />
            <TextInput
              style={styles.modalSimpleInput}
              placeholder="বিবরণ (যেমন: নগদ পণ্য বিক্রয়, নাস্তা, কারেন্ট বিল)"
              value={cashDesc}
              onChangeText={setCashDesc}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalAddCash(false)}>
                <Text style={styles.modalBtnCancelText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtnSubmit,
                  { backgroundColor: cashCategory === 'sale' || cashCategory === 'malik_in' ? '#15803d' : '#dc2626' },
                ]}
                onPress={handleSaveCashEntry}
              >
                <Text style={styles.modalBtnSubmitText}>সংরক্ষণ করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- MODAL: RECONCILE CASH --- */}
      <Modal visible={modalReconcileCash} animationType="slide" transparent onRequestClose={() => setModalReconcileCash(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalCardTitle}>⚖️ দিনশেষে ক্যাশবক্স মিলানো</Text>
            <View style={styles.reconcileBox}>
              <View style={styles.reconcileRow}>
                <Text style={styles.reconcileLabel}>খাতার হিসাব অনুযায়ী ক্যাশ:</Text>
                <Text style={[styles.reconcileVal, { color: '#006847' }]}>৳ {formatMoney(totalCash)}</Text>
              </View>
              <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                আপনার ড্রয়ারে গুনে পাওয়া আসল ক্যাশ টাকার পরিমাণ নিচে লিখুন:
              </Text>
              <TextInput
                style={[styles.modalBigInput, { marginTop: 10 }]}
                placeholder="ড্রয়ারের আসল ক্যাশ টাকা"
                keyboardType="numeric"
                autoFocus
                value={countedCash}
                onChangeText={setCountedCash}
              />
              {countedCash ? (
                <View style={styles.reconcileResultBox}>
                  {(() => {
                    const counted = parseFloat(countedCash) || 0;
                    const diff = counted - totalCash;
                    if (diff === 0) {
                      return (
                        <Text style={{ color: '#15803d', fontWeight: 'bold' }}>
                          ✅ কোনো গরমিল নেই! খাতার হিসাব এবং ড্রয়ারের টাকা পুরোপুরি মিলে গেছে।
                        </Text>
                      );
                    } else if (diff > 0) {
                      return (
                        <Text style={{ color: '#0284c7', fontWeight: 'bold' }}>
                          ℹ️ ড্রয়ারে ৳ {formatMoney(diff)} টাকা বেশি রয়েছে।
                        </Text>
                      );
                    } else {
                      return (
                        <Text style={{ color: '#dc2626', fontWeight: 'bold' }}>
                          ⚠️ ড্রয়ারে ৳ {formatMoney(Math.abs(diff))} টাকা ঘাটতি (কম) রয়েছে!
                        </Text>
                      );
                    }
                  })()}
                </View>
              ) : null}
            </View>
            <TouchableOpacity
              style={[styles.modalBtnCancel, { marginTop: 12 }]}
              onPress={() => setModalReconcileCash(false)}
            >
              <Text style={styles.modalBtnCancelText}>বন্ধ করুন</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- MODAL: ADD PRODUCT --- */}
      <Modal visible={modalAddStock} animationType="slide" transparent onRequestClose={() => setModalAddStock(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalCardTitle}>নতুন পণ্য যোগ করুন</Text>
            <TextInput
              style={styles.modalSimpleInput}
              placeholder="পণ্যের নাম * (যেমন: মিনিকেট চাল)"
              value={prodName}
              onChangeText={setProdName}
            />
            <TextInput
              style={styles.modalSimpleInput}
              placeholder="একক (কেজি, লিটার, পিস, বস্তা, প্যাকেট)"
              value={prodUnit}
              onChangeText={setProdUnit}
            />
            <TextInput
              style={styles.modalSimpleInput}
              placeholder="ক্রয়মূল্য (৳)"
              keyboardType="numeric"
              value={prodBuyPrice}
              onChangeText={setProdBuyPrice}
            />
            <TextInput
              style={styles.modalSimpleInput}
              placeholder="বিক্রয়মূল্য (৳)"
              keyboardType="numeric"
              value={prodSellPrice}
              onChangeText={setProdSellPrice}
            />
            <TextInput
              style={styles.modalSimpleInput}
              placeholder="বর্তমান স্টক পরিমাণ"
              keyboardType="numeric"
              value={prodStock}
              onChangeText={setProdStock}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalAddStock(false)}>
                <Text style={styles.modalBtnCancelText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: '#006847' }]}
                onPress={handleSaveProduct}
              >
                <Text style={styles.modalBtnSubmitText}>পণ্য যোগ করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- MODAL: ADJUST STOCK --- */}
      <Modal visible={modalAdjustStock} animationType="fade" transparent onRequestClose={() => setModalAdjustStock(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalCardTitle}>
              {selectedProduct ? selectedProduct.name + ' - স্টক সমন্বয়' : 'স্টক সমন্বয়'}
            </Text>
            <View style={styles.accTypeToggleRow}>
              <TouchableOpacity
                style={[styles.accTypeToggleBtn, stockAdjustType === 'in' && styles.accTypeToggleBtnActiveGreen]}
                onPress={() => setStockAdjustType('in')}
              >
                <Text style={[styles.accTypeToggleText, stockAdjustType === 'in' && { color: '#fff' }]}>
                  + নতুন স্টক এলো
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.accTypeToggleBtn, stockAdjustType === 'out' && styles.accTypeToggleBtnActiveRed]}
                onPress={() => setStockAdjustType('out')}
              >
                <Text style={[styles.accTypeToggleText, stockAdjustType === 'out' && { color: '#fff' }]}>
                  - স্টক কমেছে / নষ্ট
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalBigInput}
              placeholder="পরিমাণ"
              keyboardType="numeric"
              autoFocus
              value={stockAdjustQty}
              onChangeText={setStockAdjustQty}
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalAdjustStock(false)}>
                <Text style={styles.modalBtnCancelText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: '#006847' }]}
                onPress={handleAdjustStock}
              >
                <Text style={styles.modalBtnSubmitText}>আপডেট করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- MODAL: BACKUP & RESTORE --- */}
      <Modal visible={modalBackupRestore} animationType="slide" transparent onRequestClose={() => setModalBackupRestore(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <Text style={styles.modalCardTitle}>💾 ১০০% অফলাইন ব্যাকআপ ও রিস্টোর</Text>
            <Text style={{ fontSize: 12, color: '#4b5563', marginBottom: 8 }}>
              নিচের টেক্সট বক্সে আপনার খাতার সম্পূর্ণ ব্যাকআপ ডাটা রয়েছে:
            </Text>
            <TextInput
              style={styles.backupTextArea}
              multiline
              value={backupJsonText}
              onChangeText={setBackupJsonText}
              placeholder="এখানে ব্যাকআপ JSON ডাটা পেস্ট করুন..."
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <TouchableOpacity style={[styles.backupBtn, { backgroundColor: '#0284c7' }]} onPress={handleShareBackup}>
                <Text style={styles.backupBtnText}>📤 শেয়ার / কপি</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.backupBtn, { backgroundColor: '#f59e0b' }]} onPress={handleImportBackup}>
                <Text style={styles.backupBtnText}>📥 রিস্টোর করুন</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.modalBtnCancel, { marginTop: 12 }]} onPress={() => setModalBackupRestore(false)}>
              <Text style={styles.modalBtnCancelText}>বন্ধ করুন</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Wrap root component with crash-proof ErrorBoundary
export default function App() {
  return (
    <ErrorBoundary>
      <TallyKhataApp />
    </ErrorBoundary>
  );
}

// =========================================================================
// 4. AUTHENTIC TALLYKHATA STYLESHEET
// =========================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  errorSafeContainer: {
    flex: 1,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  errorIcon: {
    fontSize: 44,
    marginBottom: 10,
  },
  errorHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#b91c1c',
    marginBottom: 8,
  },
  errorDetails: {
    fontSize: 13,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorRetryBtn: {
    backgroundColor: '#006847',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  errorRetryBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  // Main Header
  mainHeader: {
    backgroundColor: '#006847',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    backgroundColor: '#ffffff',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  logoBadgeText: {
    color: '#006847',
    fontSize: 22,
    fontWeight: 'bold',
  },
  appNameTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  appSubTitle: {
    color: '#d1fae5',
    fontSize: 11,
  },
  settingsHeaderBtn: {
    backgroundColor: '#005238',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  settingsHeaderBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Dashboard Summary Cards
  dashboardRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  dashboardCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 3,
  },
  dashLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 2,
  },
  dashAmount: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  // Search & Filters
  searchBarRow: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
  searchTextInput: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterPillRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
    flexWrap: 'wrap',
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
  },
  filterPillActive: {
    backgroundColor: '#006847',
  },
  filterPillText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#ffffff',
  },
  // Account List Card
  accountCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  accAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accAvatarLetter: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  accCardName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  accCardPhone: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  accTypeBadge: {
    fontSize: 11,
    fontWeight: '600',
  },
  accBalanceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  // Floating Add Button
  floatingAddBtn: {
    position: 'absolute',
    bottom: 75,
    right: 16,
    backgroundColor: '#006847',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingAddBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  // Ledger View Screen
  ledgerHeaderNav: {
    backgroundColor: '#006847',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  backBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  headerIconBtn: {
    backgroundColor: '#005238',
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteAccBtn: {
    backgroundColor: '#b91c1c',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  deleteAccBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  accountProfileCard: {
    backgroundColor: '#ffffff',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0284c7',
  },
  profileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  profilePhone: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  profileAddress: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 1,
  },
  profileDueLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  profileDueAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 2,
  },
  ledgerQuickActions: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    justifyContent: 'space-around',
  },
  quickActionItem: {
    alignItems: 'center',
  },
  quickActionEmoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  quickActionLabel: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '600',
  },
  ledgerTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  ledgerColHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
  },
  ledgerRowCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    alignItems: 'center',
  },
  ledgerRowDesc: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  ledgerRowDate: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  ledgerGivenAmount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  ledgerReceivedAmount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#15803d',
  },
  dashMuted: {
    color: '#9ca3af',
  },
  ledgerBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    padding: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  bigEntryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  bigEntryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Cashbox View
  cashTopCard: {
    backgroundColor: '#ffffff',
    margin: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cashTopCardSub: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  cashTotalDisplay: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#006847',
    marginTop: 2,
  },
  reconcileBtn: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  reconcileBtnText: {
    fontSize: 13,
    color: '#0284c7',
    fontWeight: 'bold',
  },
  cashTodayStatsRow: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  cashTodayStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  cashTodayStatLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  cashTodayStatVal: {
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 2,
  },
  cashCategoryPillRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 6,
    flexWrap: 'wrap',
  },
  cashHistoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  cashTypeCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cashEntryDesc: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  cashEntryDate: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  cashEntryAmount: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  // Stock View
  stockSummaryCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    margin: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  stockSummaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  stockSummaryLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  stockSummaryVal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 2,
  },
  stockCardItem: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    alignItems: 'center',
  },
  stockItemName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  lowStockBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  lowStockBadgeText: {
    fontSize: 10,
    color: '#dc2626',
    fontWeight: 'bold',
  },
  stockItemSub: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  stockProfitText: {
    fontSize: 11,
    color: '#15803d',
    fontWeight: '600',
    marginTop: 1,
  },
  stockQtyText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  stockAdjustBtn: {
    backgroundColor: '#006847',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stockAdjustBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  // Tagada View
  tagadaHeaderCard: {
    backgroundColor: '#ffffff',
    margin: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tagadaHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  tagadaHeaderSub: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    lineHeight: 18,
  },
  tagadaHeaderCount: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#dc2626',
    marginTop: 8,
  },
  tagadaCardItem: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  tagadaCustName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  tagadaCustPhone: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  tagadaCustDue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#dc2626',
    marginTop: 2,
  },
  tagadaActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  tagadaActionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Reports View
  reportCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  reportCardHeading: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  reportDivider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 10,
  },
  reportItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  reportItemTitle: {
    fontSize: 13,
    color: '#4b5563',
  },
  reportItemValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  shareReportBtn: {
    backgroundColor: '#006847',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  shareReportBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  // Settings View
  settingsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  settingsHeading: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  settingsSubText: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 12,
    color: '#4b5563',
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 4,
  },
  saveSettingsBtn: {
    backgroundColor: '#006847',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 14,
  },
  saveSettingsBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  backupActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  backupActionBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  // Bottom Tab Bar
  bottomTabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingVertical: 6,
    paddingBottom: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  tabButtonActive: {
    borderTopWidth: 2,
    borderTopColor: '#006847',
  },
  tabIcon: {
    fontSize: 18,
  },
  tabButtonLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
    fontWeight: '600',
  },
  tabButtonLabelActive: {
    color: '#006847',
    fontWeight: 'bold',
  },
  // Modals Styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalCardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 14,
    textAlign: 'center',
  },
  accTypeToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 3,
    marginBottom: 12,
  },
  accTypeToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  accTypeToggleBtnActiveRed: {
    backgroundColor: '#dc2626',
  },
  accTypeToggleBtnActiveGreen: {
    backgroundColor: '#15803d',
  },
  accTypeToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b5563',
  },
  modalSimpleInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    marginBottom: 10,
    backgroundColor: '#f9fafb',
  },
  modalBigInput: {
    borderWidth: 2,
    borderColor: '#006847',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    backgroundColor: '#f9fafb',
    textAlign: 'center',
  },
  quickChipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    justifyContent: 'center',
  },
  quickChip: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalBtnCancel: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalBtnCancelText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
  },
  modalBtnSubmit: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalBtnSubmitText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  categorySelectChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  categorySelectChipActive: {
    backgroundColor: '#006847',
    borderColor: '#006847',
  },
  categorySelectChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  categorySelectChipTextActive: {
    color: '#ffffff',
  },
  // Reconcile Modal
  reconcileBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  reconcileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reconcileLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  reconcileVal: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  reconcileResultBox: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  // Digital Voucher Memo Modal
  voucherTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  voucherTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  voucherPaper: {
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  voucherBizName: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1f2937',
  },
  voucherBizSub: {
    fontSize: 11,
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 1,
  },
  voucherDivider: {
    height: 1,
    backgroundColor: '#fde68a',
    marginVertical: 8,
  },
  voucherDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  voucherLabel: {
    fontSize: 12,
    color: '#4b5563',
  },
  voucherVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
  },
  voucherActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  voucherBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  voucherBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Tagada Message Modal
  tagadaMessageBox: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tagadaMessageContent: {
    fontSize: 13,
    color: '#1f2937',
    lineHeight: 20,
  },
  tagadaShareBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  tagadaShareBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  // Backup Text Area
  backupTextArea: {
    height: 160,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#f9fafb',
    fontSize: 11,
    fontFamily: 'monospace',
    textAlignVertical: 'top',
  },
  backupBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  backupBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4b5563',
  },
  emptySubText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
});
