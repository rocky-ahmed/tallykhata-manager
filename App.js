import React, { useState, useEffect, useMemo, useRef, Component } from 'react';
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
  Share,
  Dimensions,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// =========================================================================
// 1. AUTHENTIC TALLYKHATA BRAND IDENTITY & CONSTANTS
// =========================================================================
const STORAGE_KEY = 'tallykhata_offline_store_v6';

const COLORS = {
  primary: '#B81414',        // Authentic TallyKhata Crimson Red
  primaryDark: '#991111',
  primaryLight: '#FFF0F1',   // Soft peach-red header tint
  accent: '#B82329',
  green: '#0F8A0F',          // Authentic TallyKhata India Green (পেলাম / জমা)
  greenLight: '#EEF6F3',
  red: '#DC2626',            // Authentic TallyKhata Red (দিলাম / বাকি)
  redLight: '#FEF2F2',
  gold: '#F59E0B',           // Gold Member / Verification Badge
  goldLight: '#FEF3C7',
  blue: '#0284C7',
  blueLight: '#E0F2FE',
  purple: '#7C3AED',
  bg: '#F5F6F8',
  card: '#FFFFFF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  text: '#1A1A1A',
  textMuted: '#6B7280',
  textSubtle: '#9CA3AF',
  white: '#FFFFFF',
};

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


const toBengaliNumber = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '০';
  const num = Math.round(Number(amount));
  const isNeg = num < 0;
  const absStr = Math.abs(num).toString();
  let formatted = '';
  if (absStr.length > 3) {
    const last3 = absStr.substring(absStr.length - 3);
    const rest = absStr.substring(0, absStr.length - 3);
    const withCommas = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    formatted = withCommas + ',' + last3;
  } else {
    formatted = absStr;
  }
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const bnStr = formatted.split('').map(c => (c >= '0' && c <= '9') ? bnDigits[parseInt(c, 10)] : c).join('');
  return isNeg ? '-' + bnStr : bnStr;
};

const toBengaliDecimal = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '০.০০';
  const num = Number(amount);
  const isNeg = num < 0;
  const absNum = Math.abs(num);
  const intPart = Math.floor(absNum);
  const decPart = Math.round((absNum - intPart) * 100).toString().padStart(2, '0');
  
  const absStr = intPart.toString();
  let formatted = '';
  if (absStr.length > 3) {
    const last3 = absStr.substring(absStr.length - 3);
    const rest = absStr.substring(0, absStr.length - 3);
    const withCommas = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    formatted = withCommas + ',' + last3;
  } else {
    formatted = absStr;
  }
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const bnInt = formatted.split('').map(c => (c >= '0' && c <= '9') ? bnDigits[parseInt(c, 10)] : c).join('');
  const bnDec = decPart.split('').map(c => (c >= '0' && c <= '9') ? bnDigits[parseInt(c, 10)] : c).join('');
  const res = bnInt + '.' + bnDec;
  return isNeg ? '-' + res : res;
};

const getAvatarInfo = (name, index) => {
  const colors = ['#DCFCE7', '#FEF08A', '#DBEAFE', '#FFE4E6', '#DCFCE7', '#FEF08A', '#DBEAFE', '#FFE4E6'];
  const bg = colors[index % colors.length];
  let text = 'ক';
  if (name) {
    const trimmed = name.trim();
    if (trimmed.includes('★')) {
      const firstWord = trimmed.split(/\s+/)[0];
      text = (firstWord[0] || 'C').toUpperCase() + '★';
    } else {
      const words = trimmed.split(/\s+/);
      if (words.length >= 2 && words[0][0] && words[1][0] && /[A-Za-z]/.test(words[0][0])) {
        text = (words[0][0] + words[1][0]).toUpperCase();
      } else if (words[0]) {
        text = words[0].slice(0, 2);
      }
    }
  }
  return { bg, text };
};

const getTodayDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getYesterdayDate = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTimeString = () => {
  const d = new Date();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
};

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '';
  const today = getTodayDate();
  const yest = getYesterdayDate();
  if (dateStr === today) return 'আজ';
  if (dateStr === yest) return 'গতকাল';
  return dateStr;
};

// Built-in Calculator Evaluator for Transaction Screen
const safeEvalCalc = (expr) => {
  if (!expr) return 0;
  try {
    const clean = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/[^0-9+\-*/.]/g, '');
    if (!clean) return 0;
    // Tokenize
    const tokens = clean.match(/(\d+\.?\d*|[+\-*/])/g);
    if (!tokens) return 0;
    let total = parseFloat(tokens[0]) || 0;
    for (let i = 1; i < tokens.length; i += 2) {
      const op = tokens[i];
      const val = parseFloat(tokens[i + 1]) || 0;
      if (op === '+') total += val;
      else if (op === '-') total -= val;
      else if (op === '*') total *= val;
      else if (op === '/') total = val !== 0 ? total / val : total;
    }
    return isNaN(total) ? 0 : Math.round(total * 100) / 100;
  } catch (e) {
    return 0;
  }
};

// =========================================================================
// 3. ERROR BOUNDARY (Expo Go Safety Guard)
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
          <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
          <View style={styles.errorCard}>
            <Image source={require("./assets/icons/ic_notification.png")} style={{ width: 48, height: 48, marginBottom: 12, tintColor: COLORS.primary }} resizeMode="contain" />
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
// 4. SEED DATA & AUTHENTIC TALLYKHATA FAQS
// =========================================================================
const INITIAL_ACCOUNTS = [
  { id: '1', name: 'Raihan ★ khoksha', phone: '01711223344', type: 1, balance: 7000, address: 'খোকসা বাজার', createDate: getTodayDate(), timeAgo: '৩ মাস' },
  { id: '2', name: 'Faysal ★★', phone: '01812345678', type: 1, balance: 10000, address: 'পশ্চিম পাড়া', createDate: getTodayDate(), timeAgo: '৩ মাস' },
  { id: '3', name: 'Abd. Samad ★ Jv', phone: '01911998877', type: 1, balance: 8000, address: 'জেভি মোড়', createDate: getTodayDate(), timeAgo: '৩ মাস' },
  { id: '4', name: 'Tanvir ★ Al Baraka', phone: '01622334455', type: 1, balance: 0, address: 'আল বারাকা মার্কেট', createDate: getTodayDate(), timeAgo: '৪ মাস' },
  { id: '5', name: 'Jwel Vai Gk', phone: '01733445566', type: 1, balance: 500, address: 'জিকে কলোনি', createDate: getTodayDate(), timeAgo: '৫ মাস' },
  { id: '6', name: 'Shamim Telecom', phone: '01744556677', type: 1, balance: 12000, address: 'স্টেশন রোড', createDate: getTodayDate(), timeAgo: '৬ মাস' },
  { id: '7', name: 'Kabir Hardware', phone: '01755667788', type: 1, balance: 15000, address: 'মেইন রোড', createDate: getTodayDate(), timeAgo: '২ মাস' },
  { id: '8', name: 'Babul Enterprise', phone: '01766778899', type: 1, balance: 18000, address: 'চকবাজার', createDate: getTodayDate(), timeAgo: '১ মাস' },
  { id: '9', name: 'Rubel Electronics', phone: '01777889900', type: 1, balance: 14000, address: 'নিউ মার্কেট', createDate: getTodayDate(), timeAgo: '৩ মাস' },
  { id: '10', name: 'Shuvo Mobile Store', phone: '01788990011', type: 1, balance: 9000, address: 'কলেজ গেট', createDate: getTodayDate(), timeAgo: '৪ মাস' },
  { id: '11', name: 'Ripon Telecom', phone: '01799001122', type: 1, balance: 7000, address: 'থানা মোড়', createDate: getTodayDate(), timeAgo: '৫ মাস' },
  { id: '12', name: 'Monir Store', phone: '01712341234', type: 1, balance: 8000, address: 'হাসপাতাল রোড', createDate: getTodayDate(), timeAgo: '২ মাস' },
];

const INITIAL_JOURNALS = [
  { id: '1', accountId: '1', type: 'given', amount: 3200, desc: 'বাকিতে চাল ও ডাল বিক্রয়', date: getTodayDate(), time: '10:30 AM', runningBalance: 3200 },
  { id: '2', accountId: '2', type: 'given', amount: 1450, desc: 'মালামাল বাকি বিক্রি', date: getTodayDate(), time: '11:15 AM', runningBalance: 1450 },
  { id: '3', accountId: '3', type: 'given', amount: 5000, desc: 'পাইকারি মাল ক্রয় বাবদ দেনা', date: getTodayDate(), time: '02:00 PM', runningBalance: 5000 },
];

const INITIAL_CASH_ENTRIES = [
  { id: '1', category: 'sale', type: 'in', amount: 4500, desc: 'সকালের নগদ বিক্রি', date: getTodayDate(), time: '09:00 AM' },
  { id: '2', category: 'cost', type: 'out', amount: 250, desc: 'দোকান খরচ ও নাস্তা', date: getTodayDate(), time: '11:00 AM' },
  { id: '3', category: 'malik_in', type: 'in', amount: 2000, desc: 'মালিকের দেওয়া নগদ টাকা (জমা)', date: getTodayDate(), time: '08:30 AM' },
];

const INITIAL_INVENTORY = [
  { id: '1', name: 'মিনিকেট চাল (৫০ কেজি)', unit: 'বস্তা', buyPrice: 3200, sellPrice: 3450, stock: 25 },
  { id: '2', name: 'তীর সয়াবিন তেল (৫ লিটার)', unit: 'বোতল', buyPrice: 820, sellPrice: 875, stock: 40 },
  { id: '3', name: 'চিনি (প্যাকেট)', unit: 'কেজি', buyPrice: 130, sellPrice: 140, stock: 65 },
  { id: '4', name: 'মসুর ডাল (দেশি)', unit: 'কেজি', buyPrice: 135, sellPrice: 150, stock: 8 },
];

const INITIAL_NOTES = [
  { id: '1', text: 'রবিবার সকালে আড়ৎ থেকে চাল ও তেল ডেলিভারি আসবে', isComplete: false, date: getTodayDate() },
  { id: '2', text: 'বিদ্যুৎ বিল ও দোকান ভাড়া পরিশোধ করা হয়েছে', isComplete: true, date: getTodayDate() },
];

const INITIAL_WALLET_TXNS = [
  { id: 'w1', title: 'অ্যাড মানি (বিকাশ)', amount: 2500, type: 'in', date: getTodayDate(), time: '10:00 AM' },
  { id: 'w2', title: 'মোবাইল রিচার্জ (01711223344)', amount: 100, type: 'out', date: getTodayDate(), time: '12:30 PM' },
];

const AUTHENTIC_FAQS = [
  {
    q: '১. টালিখাতা কি?',
    a: 'টালিখাতা ব্যবসার হিসাব রাখার সহজ ও নিরাপদ মোবাইল অ্যাপ। এতে কাস্টমার-সাপ্লায়ারের বাকি, ক্যাশবক্সের হিসাব, স্টক ও ডিজিটাল ভাউচার ১০০% অফলাইনে রাখা যায়। কোনো ইন্টারনেট বা মাসিক ফি ছাড়াই আজীবন ফ্রি।'
  },
  {
    q: '২. ক্যাশবক্স কি ও কীভাবে কাজ করে?',
    a: 'ক্যাশবক্স হলো দোকানের নগদ টাকার ডিজিটাল ক্যাশ ড্রয়ার। সারাদিনের নগদ বেচা, কেনা, দোকানের খরচ এবং মালিক দিল/মালিক নিল এন্ট্রি দিয়ে দিনশেষে আসল ক্যাশের সাথে হিসাব মিলিয়ে ফেলা যায়।'
  },
  {
    q: '৩. মালিক দিল এবং মালিক নিল বলতে কি বুঝি?',
    a: 'ব্যবসার ক্যাশে মালিক যখন ব্যক্তিগত টাকা দেন তা হলো "মালিক দিল" (ক্যাশ বৃদ্ধি)। আর দোকান থেকে ব্যক্তিগত প্রয়োজনে টাকা নিলে তা হলো "মালিক নিল" (ক্যাশ হ্রাস)।'
  },
  {
    q: '৪. বাকির কাস্টমার কীভাবে যোগ করবো?',
    a: 'হোম পেজের নিচে "+ নতুন কাস্টমার" বাটনে চাপ দিন। কাস্টমারের নাম, মোবাইল নম্বর এবং পূর্বের বাকি থাকলে তা লিখে "খাতা খুলুন" চাপলেই নতুন খাতা তৈরি হবে।'
  },
  {
    q: '৫. এন্ট্রি দিতে গিয়ে ভুল হলে কীভাবে সংশোধন করবো?',
    a: 'যেকোনো লেনদেনের ওপর ট্যাপ করলে ডিজিটাল রশিদ ওপেন হবে। সেখান থেকে "সংশোধন" চেপে টাকার পরিমাণ বা বিবরণ পরিবর্তন করা যাবে অথবা "মুছুন" চেপে ডিলিট করা যাবে।'
  },
  {
    q: '৬. তাগাদা মেসেজ কীভাবে পাঠাবো?',
    a: 'তাগাদা ট্যাবে গিয়ে বকেয়া কাস্টমারের নামের পাশে "SMS" বা "WhatsApp" বাটনে চাপ দিন। স্বয়ংক্রিয়ভাবে দোকানের নাম ও বকেয়া টাকাসহ মেসেজ প্রস্তুত হয়ে যাবে।'
  },
  {
    q: '৭. ডাটা ব্যাকআপ কীভাবে হয় ও ফোন হারালে কি হবে?',
    a: 'মেনু থেকে "ডাটা ব্যাকআপ ও রিস্টোর"-এ গিয়ে "ব্যাকআপ কপি করুন" চেপে ব্যাকআপটি আপনার জিমেইল, ড্রাইভ বা হোয়াটসঅ্যাপে সেভ করে রাখুন। নতুন ফোনে সেই টেক্সট পেস্ট করে ১ সেকেন্ডে সব খাতা ফেরত পাবেন।'
  },
  {
    q: '৮. অ্যাপটি ব্যবহারের জন্য ইন্টারনেট সংযোগ দরকার কি?',
    a: 'না, টালিখাতা ১০০% সম্পূর্ণ অফলাইন অ্যাপ। কোনো ইন্টারনেট কানেকশন ছাড়াও সব হিসাব, ক্যালকুলেটর ও রশিদ ব্যবহার করা যায়।'
  }
];


function TallyKhataApp() {
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

  // --- HANDLER: SAVE TRANSACTION (WITH CASHBOX SYNC) ---
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
  };

  // --- HANDLER: CASHBOX ENTRY & RECONCILE ---
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
    persistData({ cashEntries: updated });
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
          persistData({ cashEntries: updated });
        },
      },
    ]);
  };

  const handleSaveReconciliation = () => {
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
    setCashEntries(updated);
    persistData({ cashEntries: updated });
    setModalReconcileCash(false);
    Alert.alert('সফল', 'ক্যাশবক্স সমন্বয় রেকর্ড সম্পন্ন হয়েছে।');
  };

  // --- HANDLER: STOCK INVENTORY ---
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
    persistData({ inventory: updated });
    setProdName('');
    setProdBuyPrice('');
    setProdSellPrice('');
    setProdStock('');
    setModalAddStock(false);
  };

  const handleAdjustStock = () => {
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
          persistData({ inventory: updated });
        },
      },
    ]);
  };

  // --- HANDLER: BUSINESS NOTES ---
  const handleAddNote = () => {
    if (!newNoteText.trim()) return;
    const newN = {
      id: Date.now().toString(),
      text: newNoteText.trim(),
      isComplete: false,
      date: getTodayDate(),
    };
    const updated = [newN, ...notes];
    setNotes(updated);
    persistData({ notes: updated });
    setNewNoteText('');
  };

  const handleToggleNote = (id) => {
    const updated = notes.map((n) => (n.id === id ? { ...n, isComplete: !n.isComplete } : n));
    setNotes(updated);
    persistData({ notes: updated });
  };

  const handleDeleteNote = (id) => {
    const updated = notes.filter((n) => n.id !== id);
    setNotes(updated);
    persistData({ notes: updated });
  };

  // --- HANDLER: TALLYPAY WALLET ---
  const handleAddMoney = () => {
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
  };

  const handleMobileRecharge = () => {
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

  const handleImportBackup = () => {
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

      persistData({
        accounts: data.accounts,
        journals: data.journals,
        cashEntries: data.cashEntries,
        inventory: data.inventory,
        notes: data.notes,
        businessName: data.businessName,
        ownerName: data.ownerName,
        ownerPhone: data.ownerPhone,
        businessAddress: data.businessAddress,
        openingBalance: data.openingBalance,
        walletBalance: data.walletBalance,
      });

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
  const handleSelectBusiness = (biz) => {
    setBusinessName(biz.name);
    if (biz.owner) setOwnerName(biz.owner);
    if (biz.phone) setOwnerPhone(biz.phone);
    if (biz.address) setBusinessAddress(biz.address);
    const updated = businesses.map((b) => ({ ...b, isSelected: b.id === biz.id }));
    setBusinesses(updated);
    persistData({
      businessName: biz.name,
      ownerName: biz.owner || ownerName,
      ownerPhone: biz.phone || ownerPhone,
      businessAddress: biz.address || businessAddress,
      businesses: updated,
    });
    setModalBusinessPicker(false);
    Alert.alert('ব্যবসা পরিবর্তন', `বর্তমানে সক্রিয়: ${biz.name}`);
  };

  const handleCreateBusiness = () => {
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
    setBusinesses(updated);
    setBusinessName(newBiz.name);
    if (newBiz.owner) setOwnerName(newBiz.owner);
    if (newBiz.phone) setOwnerPhone(newBiz.phone);
    if (newBiz.address) setBusinessAddress(newBiz.address);
    persistData({
      businessName: newBiz.name,
      ownerName: newBiz.owner,
      ownerPhone: newBiz.phone,
      businessAddress: newBiz.address,
      businesses: updated,
    });
    setNewBizName('');
    setNewBizOwner('');
    setNewBizPhone('');
    setNewBizAddress('');
    setModalAddBusiness(false);
    setModalBusinessPicker(false);
    Alert.alert('সফল', `নতুন ব্যবসা "${newBiz.name}" তৈরি ও সক্রিয় করা হয়েছে।`);
  };

  // --- CASH RECONCILIATION WITH DENOMINATIONS HANDLER ---
  const handleSaveDenominations = () => {
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
    setCashEntries(updatedCash);
    persistData({ cashEntries: updatedCash });
    setModalReconcileCash(false);
    Alert.alert(
      'ক্যাশবক্স মিলানো সম্পন্ন',
      diff === 0
        ? 'ক্যাশ ১০০% মিলেছে।'
        : `ক্যাশ সমন্বয় রেকর্ড সেভ হয়েছে। পার্থক্য: ৳ ${formatMoney(Math.abs(diff))}`
    );
  };

  // --- TAGADA HANDLERS (SMS & BULK TAGADA) ---
  const handleSendSingleTagada = (account) => {
    if (remainingSmsCount <= 0) {
      Alert.alert('ফ্রি এসএমএস সমাপ্ত', 'আপনার ফ্রি টালি-মেসেজ শেষ হয়ে গেছে। ফোনের স্বাভাবিক এসএমএস বা WhatsApp ব্যবহার করুন।');
      return;
    }
    const newCount = remainingSmsCount - 1;
    setRemainingSmsCount(newCount);
    const log = {
      id: 'tag_' + Date.now(),
      customerName: account.name,
      phone: account.phone,
      amount: account.balance,
      date: getTodayDate(),
      time: getTimeString(),
    };
    const updatedLogs = [log, ...tagadaLogs];
    setTagadaLogs(updatedLogs);
    persistData({ remainingSmsCount: newCount, tagadaLogs: updatedLogs });
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
          onPress: () => {
            setRemainingSmsCount(Math.max(0, remainingSmsCount - 1));
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
  const handleMoneyOut = () => {
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


  // =========================================================================
  // VIEW: PIN SECURITY LOCK SCREEN
  // =========================================================================
  if (pinEnabled && isLocked) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: COLORS.primary }]}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />
        <View style={styles.pinLockContainer}>
          <Image source={require("./assets/icons/ic_lock.png")} style={{ width: 56, height: 56, marginBottom: 16, tintColor: "#FFFFFF" }} resizeMode="contain" />
          <Text style={styles.pinLockTitle}>টালিখাতা লক</Text>
          <Text style={styles.pinLockSub}>অ্যাপটি খুলতে আপনার ৪ ডিজিটের পিন দিন</Text>

          <View style={styles.pinDotsRow}>
            {[0, 1, 2, 3].map((idx) => (
              <View
                key={idx}
                style={[
                  styles.pinDot,
                  pinInput.length > idx && styles.pinDotFilled,
                ]}
              />
            ))}
          </View>

          <View style={styles.pinKeypad}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
              <TouchableOpacity
                key={k}
                style={styles.pinKeyBtn}
                onPress={() => {
                  if (k === 'C') {
                    setPinInput('');
                  } else if (k === '⌫') {
                    setPinInput((prev) => prev.slice(0, -1));
                  } else {
                    if (pinInput.length < 4) {
                      const next = pinInput + k;
                      setPinInput(next);
                      if (next.length === 4) {
                        if (next === appPin) {
                          setIsLocked(false);
                          setPinInput('');
                        } else {
                          Alert.alert('ভুল PIN', 'সঠিক PIN দিয়ে চেষ্টা করুন।');
                          setPinInput('');
                        }
                      }
                    }
                  }
                }}
              >
                <Text style={styles.pinKeyText}>{k}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // VIEW A: CUSTOMER / SUPPLIER ACCOUNT LEDGER SCREEN (activity_customer_report_v2.xml)
  // =========================================================================
  if (currentScreen === 'account_ledger' && selectedAccount) {
    const isCustomer = selectedAccount.type === 1;
    const accountJournals = (journals || []).filter((j) => j.accountId === selectedAccount.id);
    const totalGiven = accountJournals
      .filter((j) => j.type === 'given')
      .reduce((sum, j) => sum + Number(j.amount || 0), 0);
    const totalReceived = accountJournals
      .filter((j) => j.type === 'received')
      .reduce((sum, j) => sum + Number(j.amount || 0), 0);

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* Ledger Top Header (matching authentic activity_customer_report_v2.xml toolbar) */}
        <View style={styles.ledgerHeaderNav}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setCurrentScreen('home')}
            activeOpacity={0.7}
          >
            <Image
              source={require("./assets/icons/arrow_left.png")}
              style={{ width: 22, height: 22, tintColor: '#1A1A1A' }}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <View style={styles.ledgerHeaderTitleBox}>
            <Text style={styles.ledgerHeaderName} numberOfLines={1}>{selectedAccount.name}</Text>
            <Text style={styles.ledgerHeaderSub}>
              {isCustomer ? 'কাস্টমার হিসাব' : 'সাপ্লায়ার হিসাব'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {selectedAccount.phone ? (
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => handleMakeCall(selectedAccount.phone)}
                activeOpacity={0.7}
              >
                <Image source={require("./assets/icons/ic_call.png")} style={{ width: 20, height: 20, tintColor: '#0F8A0F' }} resizeMode="contain" />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={handleOpenEditAccount}
              activeOpacity={0.7}
            >
              <Image source={require("./assets/icons/ic_edit.png")} style={{ width: 20, height: 20, tintColor: '#4D4D4D' }} resizeMode="contain" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={handleDeleteAccount}
              activeOpacity={0.7}
            >
              <Image source={require("./assets/icons/ic_delete.png")} style={{ width: 20, height: 20, tintColor: '#B81414' }} resizeMode="contain" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Profile Card (layout_customer_info_holder.xml) */}
        <View style={styles.accountProfileCard}>
          <View style={[styles.profileAvatar, { backgroundColor: isCustomer ? COLORS.redLight : COLORS.greenLight }]}>
            <Text style={[styles.profileAvatarText, { color: isCustomer ? COLORS.primary : COLORS.green }]}>
              {(selectedAccount.name || 'খ')[0]}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.profileName}>{selectedAccount.name}</Text>
            <Text style={styles.profilePhone}>
              {selectedAccount.phone || 'মোবাইল নম্বর নেই'}
            </Text>
            {selectedAccount.address ? (
              <Text style={styles.profileAddress} numberOfLines={1}>{selectedAccount.address}</Text>
            ) : null}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.profileDueLabel, { color: isCustomer ? COLORS.primary : COLORS.green }]}>
              {isCustomer ? 'মোট পাবো (বাকি)' : 'মোট দেবো (দেনা)'}
            </Text>
            <Text style={[styles.profileDueAmount, { color: isCustomer ? COLORS.primary : COLORS.green }]}>
              ৳ {formatMoney(selectedAccount.balance)}
            </Text>
          </View>
        </View>

        {/* Quick Action Chips: তাগাদা পাঠান, কল করুন, স্টেটমেন্ট শেয়ার */}
        <View style={styles.ledgerQuickActions}>
          {isCustomer ? (
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => setModalTagada(true)}
              activeOpacity={0.7}
            >
              <Image source={require('./assets/icons/ic_sms.png')} style={{ width: 20, height: 20, marginBottom: 4 }} resizeMode="contain" />
              <Text style={styles.quickActionLabel}>তাগাদা পাঠান</Text>
            </TouchableOpacity>
          ) : null}
          {selectedAccount.phone ? (
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => handleMakeCall(selectedAccount.phone)}
              activeOpacity={0.7}
            >
              <Image source={require('./assets/icons/ic_call.png')} style={{ width: 20, height: 20, marginBottom: 4, tintColor: '#0F8A0F' }} resizeMode="contain" />
              <Text style={styles.quickActionLabel}>কল করুন</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => {
              const fullStatement =
                `=== ${businessName} ===\n` +
                `হিসাব খাতা: ${selectedAccount.name}\n` +
                `মোবাইল: ${selectedAccount.phone || 'দেওয়া নেই'}\n` +
                `বর্তমান বকেয়া: ৳ ${formatMoney(selectedAccount.balance)}\n` +
                `মোট লেনদেন: ${accountJournals.length} টি\n` +
                `দিলাম মোট: ৳ ${formatMoney(totalGiven)}\n` +
                `পেলাম মোট: ৳ ${formatMoney(totalReceived)}\n` +
                `যোগাযোগ: ${ownerPhone}`;
              Share.share({ message: fullStatement });
            }}
            activeOpacity={0.7}
          >
            <Image source={require('./assets/icons/ic_pdf.png')} style={{ width: 20, height: 20, marginBottom: 4 }} resizeMode="contain" />
            <Text style={styles.quickActionLabel}>স্টেটমেন্ট শেয়ার</Text>
          </TouchableOpacity>
        </View>

        {/* Ledger Table Column Headers (layout_credit_details_table_head: লেনদেনের বিবরণ, দিলাম, পেলাম) */}
        <View style={styles.ledgerTableHeader}>
          <Text style={[styles.ledgerColHeader, { flex: 1.6 }]}>লেনদেনের বিবরণ</Text>
          <Text style={[styles.ledgerColHeader, { flex: 1, textAlign: 'right', color: COLORS.red }]}>
            দিলাম
          </Text>
          <Text style={[styles.ledgerColHeader, { flex: 1, textAlign: 'right', color: COLORS.green }]}>
            পেলাম
          </Text>
        </View>

        {/* Ledger Transactions List (rvCustomerCreditDetails) */}
        <FlatList
          data={accountJournals}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 110 }}
          renderItem={({ item }) => {
            const isGiven = item.type === 'given';
            return (
              <TouchableOpacity
                style={styles.ledgerRowCard}
                onPress={() => {
                  setSelectedVoucherTxn(item);
                  setModalVoucher(true);
                }}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1.6 }}>
                  <Text style={styles.ledgerRowDesc}>{item.desc || 'সাধারণ লেনদেন'}</Text>
                  <Text style={styles.ledgerRowDate}>
                    {formatDisplayDate(item.date)} {item.time ? '• ' + item.time : ''}
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end', justifyContent: 'center' }}>
                  {isGiven ? (
                    <Text style={styles.ledgerGivenAmount}>৳ {formatMoney(item.amount)}</Text>
                  ) : (
                    <Text style={styles.dashMuted}>-</Text>
                  )}
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end', justifyContent: 'center' }}>
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
              <Image source={require('./assets/ic_no_txn_img_customer.png')} style={{ width: 80, height: 80, marginBottom: 8 }} resizeMode="contain" />
              <Text style={styles.emptyText}>কোনো লেনদেন রেকর্ড নেই</Text>
              <Text style={styles.emptySubText}>নিচের বাটন চেপে বাকি বা জমা এন্ট্রি দিন</Text>
            </View>
          }
        />

        {/* Bottom Summary Totals Strip (bottomLinearLayout from activity_customer_report_v2.xml) */}
        <View style={styles.ledgerBottomTotalsStrip}>
          <Text style={styles.ledgerBottomTotalLabel}>মোট</Text>
          <View style={styles.ledgerBottomTotalCreditBox}>
            <Text style={styles.ledgerBottomTotalCreditVal}>৳ {formatMoney(totalGiven)}</Text>
          </View>
          <View style={styles.ledgerBottomTotalReceivedBox}>
            <Text style={styles.ledgerBottomTotalReceivedVal}>৳ {formatMoney(totalReceived)}</Text>
          </View>
        </View>

        {/* Bottom Dual Entry Bar (দিলাম / পেলাম) */}
        <View style={styles.ledgerBottomBar}>
          <TouchableOpacity
            style={[styles.bigEntryBtn, { backgroundColor: COLORS.primary }]}
            onPress={() => handleOpenAddTxn('given')}
            activeOpacity={0.85}
          >
            <Text style={styles.bigEntryBtnText}>- দিলাম (বাকি)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bigEntryBtn, { backgroundColor: COLORS.green }]}
            onPress={() => handleOpenAddTxn('received')}
            activeOpacity={0.85}
          >
            <Text style={styles.bigEntryBtnText}>+ পেলাম (জমা)</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // =========================================================================
  // VIEW B: MAIN HOME VIEW (WITH AUTHENTIC 1:1 VISUAL PARITY)
  // =========================================================================
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#991111" />

      {/* --- AUTHENTIC 1:1 TALLYKHATA TOP HEADER BAR (photo_2026-10-15_18-13-34.jpg) --- */}
      <View style={styles.topHeaderBarRed}>
        <View style={styles.headerLeftPillContainer}>
          <TouchableOpacity
            style={styles.headerBizPill}
            onPress={() => setModalBusinessPicker(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.headerBizPillText}>{businessName || 'Mobile Xpress'}</Text>
            <Image
              source={require('./assets/icons/ic_arrow_down.png')}
              style={styles.headerBizPillArrow}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <Text style={styles.headerSubtitleWhite}>স্ট্যান্ডার্ড</Text>
        </View>

        <View style={styles.headerRightActionsRed}>
          {/* Inbox with 99+ Badge and Bangla text */}
          <TouchableOpacity
            style={styles.headerWhiteActionBtn}
            onPress={() => setModalInbox(true)}
            activeOpacity={0.7}
          >
            <View style={{ position: 'relative' }}>
              <Image
                source={require('./assets/icons/tb_inbox_white.png')}
                style={styles.headerWhiteActionIcon}
                resizeMode="contain"
              />
              <View style={styles.headerBadgeWhite}>
                <Text style={styles.headerBadgeWhiteText}>99+</Text>
              </View>
            </View>
            <Text style={styles.headerActionLabelWhite}>ইনবক্স</Text>
          </TouchableOpacity>

          {/* Support with Bangla text */}
          <TouchableOpacity
            style={styles.headerWhiteActionBtn}
            onPress={() => setModalSupport(true)}
            activeOpacity={0.7}
          >
            <Image
              source={require('./assets/icons/tb_support_white.png')}
              style={styles.headerWhiteActionIcon}
              resizeMode="contain"
            />
            <Text style={styles.headerActionLabelWhite}>সাপোর্ট</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* --- TAB CONTENT CONTAINER --- */}
      <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>

        {/* ===================================================================
            TAB 1: HOME / TALLY (টালি - 1:1 Authentic from photo_2026-10-15_18-13-34.jpg)
           =================================================================== */}
        {activeTab === 'home' && (
          <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
            <FlatList
              data={filteredAccounts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 95 }}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <View style={{ backgroundColor: '#F8F9FA' }}>
                  {/* --- 1. PROMO BANNER (মানি ট্রান্সফার চার্জ ফ্রি!*) --- */}
                  <TouchableOpacity
                    style={styles.promoBannerCard}
                    onPress={() => setActiveTab('tallypay')}
                    activeOpacity={0.85}
                  >
                    <Image
                      source={require('./assets/icons/ic_sqr_value_banner.png')}
                      style={styles.promoBannerImg}
                      resizeMode="contain"
                    />
                    <View style={styles.promoBannerTextCol}>
                      <Text style={styles.promoBannerBold}>মানি ট্রান্সফার</Text>
                      <Text style={styles.promoBannerBold}>চার্জ ফ্রি!*</Text>
                      <Text style={styles.promoBannerSub}>*শর্ত প্রযোজ্য</Text>
                    </View>
                  </TouchableOpacity>

                  {/* --- 2. 8-ITEM AUTHENTIC QUICK ACTIONS GRID --- */}
                  <View style={styles.quickGridContainer}>
                    {/* Row 1 */}
                    <View style={styles.quickGridRow}>
                      <TouchableOpacity
                        style={styles.quickGridItem}
                        onPress={() => setModalBusinessPicker(true)}
                        activeOpacity={0.7}
                      >
                        <Image
                          source={require('./assets/icons/grid_multi_biz.png')}
                          style={styles.quickGridIcon}
                          resizeMode="contain"
                        />
                        <Text style={styles.quickGridLabel}>মাল্টি ব্যবসা</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.quickGridItem}
                        onPress={() => setModalAddStock(true)}
                        activeOpacity={0.7}
                      >
                        <Image
                          source={require('./assets/icons/grid_stock.png')}
                          style={styles.quickGridIcon}
                          resizeMode="contain"
                        />
                        <Text style={styles.quickGridLabel}>স্টক হিসাব</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.quickGridItem}
                        onPress={() => setModalNotes(true)}
                        activeOpacity={0.7}
                      >
                        <Image
                          source={require('./assets/icons/grid_note.png')}
                          style={styles.quickGridIcon}
                          resizeMode="contain"
                        />
                        <Text style={styles.quickGridLabel}>ব্যবসার নোট</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.quickGridItem}
                        onPress={() => setModalTagada(true)}
                        activeOpacity={0.7}
                      >
                        <Image
                          source={require('./assets/icons/grid_bulk_tagada.png')}
                          style={styles.quickGridIcon}
                          resizeMode="contain"
                        />
                        <Text style={styles.quickGridLabel}>গ্রুপ তাগাদা</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Row 2 */}
                    <View style={styles.quickGridRow}>
                      <TouchableOpacity
                        style={styles.quickGridItem}
                        onPress={() => setModalBanglaQR(true)}
                        activeOpacity={0.7}
                      >
                        <Image
                          source={require('./assets/icons/grid_qr.png')}
                          style={styles.quickGridIcon}
                          resizeMode="contain"
                        />
                        <Text style={styles.quickGridLabel}>QR কোড</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.quickGridItem}
                        onPress={() => setModalBackupRestore(true)}
                        activeOpacity={0.7}
                      >
                        <Image
                          source={require('./assets/icons/grid_backup.png')}
                          style={styles.quickGridIcon}
                          resizeMode="contain"
                        />
                        <Text style={styles.quickGridLabel}>ডাটা ব্যাকআপ</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.quickGridItem}
                        onPress={() => setModalTallyMessage(true)}
                        activeOpacity={0.7}
                      >
                        <Image
                          source={require('./assets/icons/grid_tally_msg.png')}
                          style={styles.quickGridIcon}
                          resizeMode="contain"
                        />
                        <Text style={styles.quickGridLabel}>টালি-মেসেজ</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.quickGridItem}
                        onPress={() => setActiveTab('cashbox')}
                        activeOpacity={0.7}
                      >
                        <Image
                          source={require('./assets/icons/grid_cashbox.png')}
                          style={styles.quickGridIcon}
                          resizeMode="contain"
                        />
                        <Text style={styles.quickGridLabel}>ক্যাশবাক্স</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* --- 3. SUMMARY CARD (১,০৮,৫০০ মোট পাবো | ০ মোট দেবো) --- */}
                  <View style={styles.summaryCardContainer}>
                    <TouchableOpacity
                      style={styles.summaryCardCol}
                      onPress={() => setModalBakiReport(true)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.summaryCardAmountRed}>
                        {toBengaliNumber(totalCustomerDue)}
                      </Text>
                      <Text style={styles.summaryCardLabel}>মোট পাবো</Text>
                    </TouchableOpacity>

                    <View style={styles.summaryCardDivider} />

                    <TouchableOpacity
                      style={styles.summaryCardCol}
                      onPress={() => {
                        setAccountTab('supplier');
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.summaryCardAmountGreen}>
                        {toBengaliNumber(totalSupplierDue)}
                      </Text>
                      <Text style={styles.summaryCardLabel}>মোট দেবো</Text>
                    </TouchableOpacity>
                  </View>

                  {/* --- 4. SEARCH & ACTION BAR --- */}
                  <View style={styles.searchPillBar}>
                    <Image
                      source={require('./assets/icons/ic_search.png')}
                      style={{ width: 18, height: 18, tintColor: '#6B7280', marginRight: 10 }}
                      resizeMode="contain"
                    />
                    <TextInput
                      style={{ flex: 1, fontSize: 15, color: '#111827', paddingVertical: 0 }}
                      placeholder="খোঁজ"
                      placeholderTextColor="#6B7280"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    {searchQuery ? (
                      <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                        <Image
                          source={require('./assets/icons/ic_close.png')}
                          style={{ width: 14, height: 14, tintColor: '#6B7280' }}
                          resizeMode="contain"
                        />
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                      style={{ padding: 6, marginLeft: 4 }}
                      onPress={() => {
                        const nextF = accountFilter === 'all' ? 'due' : accountFilter === 'due' ? 'highest' : 'all';
                        setAccountFilter(nextF);
                      }}
                    >
                      <Image
                        source={require('./assets/icons/ic_filter.png')}
                        style={{ width: 22, height: 22, tintColor: accountFilter !== 'all' ? '#B81414' : '#374151' }}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ padding: 6, marginLeft: 4 }}
                      onPress={() => setModalFullReport(true)}
                    >
                      <Image
                        source={require('./assets/icons/ic_download.png')}
                        style={{ width: 22, height: 22, tintColor: '#374151' }}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  </View>

                  {/* --- 5. COUNTER STRIP (কাস্টমার ১২ / সাপ্লায়ার ০) --- */}
                  <View style={styles.counterStripRow}>
                    <Text style={styles.counterStripText}>
                      কাস্টমার {toBengaliNumber(accounts.filter((a) => a.type === 1).length)} / সাপ্লায়ার {toBengaliNumber(accounts.filter((a) => a.type === 2).length)}
                    </Text>
                  </View>
                </View>
              }
              renderItem={({ item, index }) => {
                const avatar = getAvatarInfo(item.name, index);
                return (
                  <TouchableOpacity
                    style={styles.customerListCard}
                    onPress={() => {
                      setSelectedAccount(item);
                      setCurrentScreen('account_ledger');
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.customerAvatarCircle, { backgroundColor: avatar.bg }]}>
                      <Text style={styles.customerAvatarText}>{avatar.text}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.customerCardName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.customerCardTime}>{item.timeAgo || '৩ মাস'}</Text>
                    </View>
                    <Text style={[styles.customerCardAmount, { color: item.balance > 0 ? '#B81414' : item.balance < 0 ? '#1C7D50' : '#4B5563' }]}>
                      {toBengaliDecimal(item.balance)}
                    </Text>
                    <Text style={styles.customerChevron}>›</Text>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Image
                    source={require('./assets/ic_no_txn_img_customer.png')}
                    style={{ width: 140, height: 140, marginBottom: 12 }}
                    resizeMode="contain"
                  />
                  <Text style={styles.emptyText}>কোনো খাতা পাওয়া যায়নি</Text>
                  <Text style={styles.emptySubText}>নিচের বাটন চেপে নতুন কাস্টমার বা সাপ্লায়ার যোগ করুন</Text>
                </View>
              }
            />

            {/* --- 6. CIRCULAR FLOATING ACTION BUTTON (👤+) --- */}
            <TouchableOpacity
              style={styles.floatingRoundFab}
              onPress={() => {
                setAccType(1);
                setModalAddAccount(true);
              }}
              activeOpacity={0.85}
            >
              <Image
                source={require('./assets/icons/ic_add_user.png')}
                style={{ width: 26, height: 26, tintColor: '#FFFFFF' }}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        )}

        {/* ===================================================================
            TAB 2: CASHBOX (ক্যাশবক্স - layout_cashbook_dashboard_total.xml)
           =================================================================== */}
        {activeTab === 'cashbox' && (
          <ScrollView contentContainerStyle={{ paddingBottom: 95 }}>
            {/* Cash Dashboard Card (layout_cashbook_dashboard_total.xml) */}
            <View style={styles.cashTopCard}>
              {/* Upper Box: আজকের বেচা & বর্তমান ক্যাশ */}
              <View style={styles.cashTopDashboardUpper}>
                <View style={styles.cashTopCol}>
                  <Text style={styles.cashTopAmount}>
                    ৳ {hideCashAmounts ? '***' : formatMoney(todaySales || todayCashIn)}
                  </Text>
                  <Text style={styles.cashTopLabel}>আজকের বেচা</Text>
                </View>

                <View style={styles.cashTopDivider} />

                <View style={styles.cashTopCol}>
                  <Text style={[styles.cashTopAmount, { color: '#09101D' }]}>
                    ৳ {hideCashAmounts ? '***' : formatMoney(totalCash)}
                  </Text>
                  <Text style={styles.cashTopLabel}>বর্তমান ক্যাশ</Text>
                </View>
              </View>

              {/* Lower Strip: আজ পেলাম & আজ দিলাম (aj_pelam_bg) */}
              <View style={styles.cashTopDashboardLower}>
                <View style={styles.cashSubCol}>
                  <Text style={styles.cashSubLabel}>আজ পেলাম</Text>
                  <Text style={[styles.cashSubAmount, { color: '#0F8A0F' }]}>
                    + ৳ {hideCashAmounts ? '***' : formatMoney(todayCashIn)}
                  </Text>
                </View>

                <View style={styles.cashSubDivider} />

                <View style={styles.cashSubCol}>
                  <Text style={styles.cashSubLabel}>আজ দিলাম</Text>
                  <Text style={[styles.cashSubAmount, { color: '#C4161C' }]}>
                    - ৳ {hideCashAmounts ? '***' : formatMoney(todayCashOut)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Action Bar (container_report: রিপোর্ট, ক্যাশবক্স মিলাই, ভিউ আইকন) */}
            <View style={styles.cashActionBarRow}>
              <TouchableOpacity
                style={styles.cashActionBarBtn}
                onPress={() => setModalCashReport(true)}
              >
                <Image
                  source={require('./assets/icons/ic_menu_report.png')}
                  style={{ width: 18, height: 18, marginRight: 6 }}
                  resizeMode="contain"
                />
                <Text style={styles.cashActionBarBtnText}>রিপোর্ট</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cashActionBarBtn, styles.cashAdjustBtnActive]}
                onPress={() => {
                  setCountedCash('');
                  setModalReconcileCash(true);
                }}
              >
                <Image
                  source={require('./assets/icons/ic_cash_milai.png')}
                  style={{ width: 18, height: 18, marginRight: 6, tintColor: '#B81414' }}
                  resizeMode="contain"
                />
                <Text style={[styles.cashActionBarBtnText, { color: '#B81414', fontWeight: 'bold' }]}>
                  ক্যাশবক্স মিলাই
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cashEyeToggleBtn}
                onPress={() => setHideCashAmounts((prev) => !prev)}
              >
                <Image
                  source={hideCashAmounts ? require('./assets/icons/ic_eye_closed.png') : require('./assets/icons/ic_eye_open.png')}
                  style={{ width: 20, height: 20, tintColor: '#4D4D4D' }}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

            {/* Baki Aday & Supplier Payment Strip (layout_baki_aday) */}
            <View style={styles.cashBakiAdayStrip}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.cashBakiAdayLabel}>বাকি আদায়</Text>
                <Text style={[styles.cashBakiAdayVal, { color: '#34C759' }]}>
                  ৳ {hideCashAmounts ? '***' : formatMoney(todayBakiAday || (todayCashIn > todaySales ? todayCashIn - todaySales : 0))}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.cashBakiAdayLabel}>পেমেন্ট দেয়া</Text>
                <Text style={[styles.cashBakiAdayVal, { color: '#B81414' }]}>
                  ৳ {hideCashAmounts ? '***' : formatMoney(todaySupplierPay || (todayCashOut > todayCosts ? todayCashOut - todayCosts : 0))}
                </Text>
              </View>
            </View>

            {/* Cash Entry Big Buttons (+ ক্যাশ বেচা, - দোকান খরচ) */}
            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 12, marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.cashActionBigBtn, { backgroundColor: '#0F8A0F' }]}
                onPress={() => {
                  setCashCategory('sale');
                  setModalAddCash(true);
                }}
              >
                <Text style={styles.cashActionBigBtnText}>+ ক্যাশ বেচা</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cashActionBigBtn, { backgroundColor: '#B81414' }]}
                onPress={() => {
                  setCashCategory('cost');
                  setModalAddCash(true);
                }}
              >
                <Text style={styles.cashActionBigBtnText}>- দোকান খরচ</Text>
              </TouchableOpacity>
            </View>

            {/* Cash Categories Breakdown List (layout_cashbook_accounts.xml) */}
            <View style={styles.cashAccountsSection}>
              <Text style={styles.sectionHeading}>ক্যাশবক্সের হিসাব সমূহ</Text>

              {[
                { cat: 'sale', label: 'ক্যাশ বেচা', icon: require('./assets/icons/ic_cash_sale.png'), isIn: true, color: '#0F8A0F' },
                { cat: 'buy', label: 'ক্যাশ কেনা', icon: require('./assets/icons/ic_cash_buy.png'), isIn: false, color: '#B81414' },
                { cat: 'cost', label: 'খরচ', icon: require('./assets/icons/ic_menu_cost.png'), isIn: false, color: '#B81414' },
                { cat: 'malik_in', label: 'মালিক দিল', icon: require('./assets/icons/ic_menu_malik_report.png'), isIn: true, color: '#0F8A0F' },
                { cat: 'malik_out', label: 'মালিক নিল', icon: require('./assets/icons/ic_malik_out.png'), isIn: false, color: '#B81414' },
              ].map((item) => {
                const catEntries = (cashEntries || []).filter((c) => c.category === item.cat);
                const sum = catEntries.reduce((acc, cur) => acc + (Number(cur.amount) || 0), 0);
                return (
                  <TouchableOpacity
                    key={item.cat}
                    style={styles.cashAccountRow}
                    onPress={() => {
                      if (item.cat === 'sale' || item.cat === 'buy') setModalBechaKena(true);
                      else if (item.cat === 'cost') setModalExpenseReport(true);
                      else if (item.cat === 'malik_in' || item.cat === 'malik_out') setModalMalikReport(true);
                      else setCashFilter(item.cat);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Image source={item.icon} style={{ width: 22, height: 22, marginRight: 10 }} resizeMode="contain" />
                      <Text style={styles.cashAccountRowLabel}>{item.label}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.cashAccountRowVal, { color: item.color }]}>
                        {hideCashAmounts ? '***' : `${item.isIn ? '+' : '-'} ৳ ${formatMoney(sum)}`}
                      </Text>
                      <Text style={styles.cashAccountChevron}>›</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Category Filter Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 12, marginTop: 14 }}>
              {[
                { key: 'all', label: 'সকল এন্ট্রি' },
                { key: 'sale', label: 'বেচা' },
                { key: 'buy', label: 'কেনা' },
                { key: 'cost', label: 'খরচ' },
                { key: 'malik_in', label: 'মালিক দিল' },
                { key: 'malik_out', label: 'মালিক নিল' },
              ].map((c) => (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.filterPill, cashFilter === c.key && styles.filterPillActive]}
                  onPress={() => setCashFilter(c.key)}
                >
                  <Text style={[styles.filterPillText, cashFilter === c.key && styles.filterPillTextActive]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Cash Transactions List */}
            <View style={{ paddingHorizontal: 12, marginTop: 10 }}>
              {filteredCashEntries.map((item) => {
                const isIn = item.type === 'in';
                return (
                  <View key={item.id} style={styles.cashItemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cashItemDesc}>{item.desc || (item.category === 'sale' ? 'ক্যাশ বেচা' : 'দোকান খরচ')}</Text>
                      <Text style={styles.cashItemDate}>
                        {formatDisplayDate(item.date)} {item.time ? '• ' + item.time : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.cashItemAmount, { color: isIn ? '#0F8A0F' : '#B81414' }]}>
                        {hideCashAmounts ? '***' : `${isIn ? '+' : '-'} ৳ ${formatMoney(item.amount)}`}
                      </Text>
                      <TouchableOpacity onPress={() => handleDeleteCashEntry(item.id)}>
                        <Text style={styles.cashDeleteText}>মুছুন</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* ===================================================================
            TAB 3: TAGADA (তাগাদা বার্তা কালেকশন - activity_tagada.xml)
           =================================================================== */}
        {activeTab === 'tagada' && (
          <ScrollView contentContainerStyle={{ paddingBottom: 95 }}>
            {/* Tagada Header Card with SMS Quota Badge */}
            <View style={styles.tagadaHeaderCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tagadaHeaderTitle}>বকেয়া তাগাদা কালেকশন</Text>
                  <Text style={styles.tagadaHeaderSub}>
                    বকেয়া কাস্টমারদের সরাসরি টালি-মেসেজ ও WhatsApp তাগাদা পাঠান।
                  </Text>
                </View>
                <View style={styles.tagadaQuotaBadge}>
                  <Text style={styles.tagadaQuotaText}>ফ্রি এসএমএস</Text>
                  <Text style={styles.tagadaQuotaCount}>অবশিষ্ট: {remainingSmsCount < 10 ? '০' + remainingSmsCount : remainingSmsCount} টি</Text>
                </View>
              </View>

              <View style={styles.tagadaSummaryStrip}>
                <Text style={styles.tagadaSummaryText}>
                  বকেয়া কাস্টমার: <Text style={{ fontWeight: 'bold' }}>{dueCustomers.length} জন</Text>
                </Text>
                <Text style={styles.tagadaSummaryText}>
                  মোট বাকি: <Text style={{ fontWeight: 'bold', color: '#B81414' }}>৳ {formatMoney(totalCustomerDue)}</Text>
                </Text>
              </View>
            </View>

            {/* Bulk Tagada Action Banner (গ্রুপ তাগাদা) */}
            <TouchableOpacity
              style={styles.bulkTagadaBanner}
              onPress={handleSendBulkTagada}
              activeOpacity={0.85}
            >
              <Image source={require('./assets/icons/ic_sms.png')} style={{ width: 22, height: 22, tintColor: '#FFFFFF', marginRight: 10 }} resizeMode="contain" />
              <View style={{ flex: 1 }}>
                <Text style={styles.bulkTagadaTitle}>গ্রুপ তাগাদা পাঠান</Text>
                <Text style={styles.bulkTagadaSub}>একসাথে সব {dueCustomers.length} জন বাকি কাস্টমারকে এসএমএস পাঠান</Text>
              </View>
              <Text style={styles.bulkTagadaArrow}>›</Text>
            </TouchableOpacity>

            {/* Due Customers List */}
            <View style={{ paddingHorizontal: 12, marginTop: 12 }}>
              <Text style={styles.sectionHeading}>বাকি কাস্টমারের তালিকা ({dueCustomers.length})</Text>

              {dueCustomers.map((item) => (
                <View key={item.id} style={styles.tagadaCardItem}>
                  <View style={[styles.profileAvatar, { backgroundColor: '#FEE2E2', width: 44, height: 44, borderRadius: 22 }]}>
                    <Text style={[styles.profileAvatarText, { color: '#B81414', fontSize: 18 }]}>
                      {(item.name || 'ক')[0]}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.tagadaCustName}>{item.name}</Text>
                    <Text style={styles.tagadaCustPhone}>{item.phone || 'মোবাইল নম্বর নেই'}</Text>
                    <Text style={styles.tagadaCustDue}>বকেয়া বাকি: ৳ {formatMoney(item.balance)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <TouchableOpacity
                      style={[styles.tagadaActionBtn, { backgroundColor: '#B81414' }]}
                      onPress={() => {
                        setTagadaCustomer(item);
                        setModalTagada(true);
                      }}
                    >
                      <Text style={styles.tagadaActionBtnText}>টালি-মেসেজ</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.tagadaActionBtn, { backgroundColor: '#25D366' }]}
                      onPress={() => handleSendTagadaWhatsApp(item)}
                    >
                      <Text style={styles.tagadaActionBtnText}>WhatsApp</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {dueCustomers.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Image source={require('./assets/ic_done.webp')} style={{ width: 64, height: 64, marginBottom: 8 }} resizeMode="contain" />
                  <Text style={styles.emptyText}>কোনো কাস্টমারের কাছে বাকি নেই!</Text>
                  <Text style={styles.emptySubText}>সব কাস্টমারের বকেয়া পরিশোধ রয়েছে।</Text>
                </View>
              )}
            </View>
          </ScrollView>
        )}

        {/* ===================================================================
            TAB 4: TALLYPAY (টালিপে ডিজিটাল ওয়ালেট ও বাংলা কিউআর)
           =================================================================== */}
        {activeTab === 'tallypay' && (
          <ScrollView contentContainerStyle={{ paddingBottom: 95 }}>
            {/* Wallet Balance Card */}
            <View style={styles.walletCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Image
                      source={require('./assets/ic_tally_pay_bn_png.png')}
                      style={{ width: 85, height: 26, tintColor: '#FFFFFF' }}
                      resizeMode="contain"
                    />
                    <Text style={[styles.walletCardSub, { marginTop: 0 }]}>মার্চেন্ট ওয়ালেট</Text>
                  </View>
                  <Text style={styles.walletBalanceDisplay}>৳ {formatMoney(walletBalance)}</Text>
                  <Text style={styles.walletMerchantId}>মার্চেন্ট আইডি: TP-{ownerPhone}</Text>
                </View>
                <TouchableOpacity
                  style={styles.qrCodeBtn}
                  onPress={() => setModalBanglaQR(true)}
                >
                  <Image
                    source={require('./assets/ic_bangla_qr.png')}
                    style={{ width: 32, height: 32, marginBottom: 4 }}
                    resizeMode="contain"
                  />
                  <Text style={styles.qrCodeBtnText}>বাংলা QR</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Service Actions */}
            <View style={styles.walletActionRow}>
              <TouchableOpacity
                style={styles.walletServiceBtn}
                onPress={() => setModalAddMoney(true)}
              >
                <View style={[styles.walletServiceIconBg, { backgroundColor: COLORS.blueLight }]}>
                  <Image source={require("./assets/nav/nav_tallypay.png")} style={{ width: 24, height: 24, tintColor: COLORS.blue }} resizeMode="contain" />
                </View>
                <Text style={styles.walletServiceLabel}>অ্যাড মানি</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.walletServiceBtn}
                onPress={() => setModalMoneyOut(true)}
              >
                <View style={[styles.walletServiceIconBg, { backgroundColor: COLORS.greenLight }]}>
                  <Image source={require("./assets/icons/ic_cash_sale.png")} style={{ width: 24, height: 24, tintColor: COLORS.green }} resizeMode="contain" />
                </View>
                <Text style={styles.walletServiceLabel}>মানি আউট</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.walletServiceBtn}
                onPress={() => setModalMobileRecharge(true)}
              >
                <View style={[styles.walletServiceIconBg, { backgroundColor: COLORS.redLight }]}>
                  <Image source={require("./assets/icons/ic_call.png")} style={{ width: 24, height: 24, tintColor: COLORS.primary }} resizeMode="contain" />
                </View>
                <Text style={styles.walletServiceLabel}>মোবাইল রিচার্জ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.walletServiceBtn}
                onPress={() => setModalBanglaQR(true)}
              >
                <View style={[styles.walletServiceIconBg, { backgroundColor: COLORS.goldLight }]}>
                  <Image source={require("./assets/ic_bangla_qr.png")} style={{ width: 24, height: 24 }} resizeMode="contain" />
                </View>
                <Text style={styles.walletServiceLabel}>কিউআর পেমেন্ট</Text>
              </TouchableOpacity>
            </View>

            {/* Authentic SQR Promo Banner (layoutSqrPromo from fragment_tp_wallet_main.xml) */}
            <View style={styles.walletPromoCard}>
              <Image
                source={require('./assets/ic_qr_support_all_apps.png')}
                style={{ width: '100%', height: 75, marginBottom: 12 }}
                resizeMode="contain"
              />
              <Text style={styles.walletPromoTitle}>
                টালিপে QR — ব্যবসায়ীদের জন্য সেরা বাংলা QR
              </Text>
              <View style={styles.walletPromoBenefitRow}>
                <Image
                  source={require('./assets/icons/ic_check.png')}
                  style={{ width: 16, height: 16, tintColor: '#0F8A0F', marginRight: 8, marginTop: 2 }}
                  resizeMode="contain"
                />
                <Text style={styles.walletPromoBenefitText}>
                  টালিপে QR-এ পেমেন্ট নিন নগদ, বিকাশ, রকেট সহ সকল ব্যাংক অ্যাপ থেকে।
                </Text>
              </View>
              <View style={styles.walletPromoBenefitRow}>
                <Image
                  source={require('./assets/icons/ic_check.png')}
                  style={{ width: 16, height: 16, tintColor: '#0F8A0F', marginRight: 8, marginTop: 2 }}
                  resizeMode="contain"
                />
                <Text style={styles.walletPromoBenefitText}>
                  ইনস্ট্যান্ট পেমেন্ট বা টাকা ট্রান্সফার করুন ব্যাংক বা MFS একাউন্টে।
                </Text>
              </View>
              <TouchableOpacity
                style={styles.walletPromoCtaBtn}
                onPress={() => setModalBanglaQR(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.walletPromoCtaText}>টালিপে QR নিন</Text>
              </TouchableOpacity>
            </View>

            {/* Wallet Transaction History */}
            <View style={{ paddingHorizontal: 12, marginTop: 16 }}>
              <Text style={styles.sectionHeading}>সাম্প্রতিক ওয়ালেট লেনদেন</Text>
              {walletTxns.map((w) => (
                <View key={w.id} style={styles.cashItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cashItemDesc}>{w.title}</Text>
                    <Text style={styles.cashItemDate}>{formatDisplayDate(w.date)} • {w.time}</Text>
                  </View>
                  <Text style={[styles.cashItemAmount, { color: w.type === 'in' ? COLORS.green : COLORS.red }]}>
                    {w.type === 'in' ? '+' : '-'} ৳ {formatMoney(w.amount)}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        {/* ===================================================================
            TAB 5: MENU / MORE (মেনু / ড্রয়ার - activity_main_drawer.xml)
           =================================================================== */}
        {activeTab === 'menu' && (
          <ScrollView contentContainerStyle={{ paddingBottom: 95 }}>
            {/* Merchant Shop Profile Header (nav_header_main.xml) */}
            <View style={styles.menuProfileHeader}>
              <View style={styles.menuStoreAvatar}>
                <Image
                  source={require('./assets/ic_tally_khata_logo_reg.png')}
                  style={{ width: 44, height: 44 }}
                  resizeMode="contain"
                />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.menuBizName}>{businessName}</Text>
                <Text style={styles.menuOwnerInfo}>{ownerName} • {ownerPhone}</Text>
                <Text style={styles.menuBizAddress} numberOfLines={1}>{businessAddress}</Text>
              </View>
              <TouchableOpacity
                style={styles.menuEditBizBtn}
                onPress={() => setModalSettings(true)}
              >
                <Text style={styles.menuEditBizBtnText}>এডিট</Text>
              </TouchableOpacity>
            </View>

            {/* Group 1: টালিপে ওয়ালেট (nav_group_tp_wallet) */}
            <View style={styles.menuGroupHeader}>
              <Text style={styles.menuGroupTitle}>টালিপে ওয়ালেট</Text>
            </View>
            <View style={styles.menuListContainer}>
              <TouchableOpacity
                style={styles.menuListItem}
                onPress={() => setModalAddMoney(true)}
              >
                <Image source={require('./assets/icons/ic_menu_accounts.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.menuListTitle}>একাউন্ট সমূহ</Text>
                  <Text style={styles.menuListSub}>ব্যালেন্স ৳ {formatMoney(walletBalance)} • সংযুক্ত ব্যাংক ও MFS</Text>
                </View>
                <Text style={styles.menuListArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuListItem}
                onPress={() => setActiveTab('tallypay')}
              >
                <Image source={require('./assets/icons/ic_menu_payment_messaging.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.menuListTitle}>লেনদেন বিবরণী</Text>
                  <Text style={styles.menuListSub}>মোট {walletTxns.length} টি ওয়ালেট লেনদেন</Text>
                </View>
                <Text style={styles.menuListArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuListItem}
                onPress={() => Alert.alert('লেনদেনের লিমিট', 'দৈনিক ক্যাশ-ইন লিমিট: ৳ ৫০,০০০ | দৈনিক ক্যাশ-আউট: ৳ ২৫,০০০ | মাসিক লিমিট: ৳ ৫,০০,০০০')}
              >
                <Image source={require('./assets/icons/ic_menu_lock.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.menuListTitle}>লেনদেনের লিমিট ও চার্জ</Text>
                  <Text style={styles.menuListSub}>১০০% ফ্রি লেনদেন • কোনো চার্জ নেই</Text>
                </View>
                <Text style={styles.menuListArrow}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Group 2: টালিখাতা হিসাব ও রিপোর্ট (nav_tallykhata) */}
            <View style={styles.menuGroupHeader}>
              <Text style={styles.menuGroupTitle}>টালিখাতা হিসাব ও রিপোর্ট</Text>
            </View>
            <View style={styles.menuListContainer}>
              <TouchableOpacity
                style={styles.menuListItem}
                onPress={() => setModalBechaKena(true)}
              >
                <Image source={require('./assets/icons/ic_menu_profit.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.menuListTitle}>বেচা কেনা হিসাব</Text>
                  <Text style={styles.menuListSub}>দৈনিক বেচা-কেনা ও লাভের হিসাব</Text>
                </View>
                <Text style={styles.menuListArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuListItem}
                onPress={() => setModalExpenseReport(true)}
              >
                <Image source={require('./assets/icons/ic_menu_cost.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.menuListTitle}>খরচ রিপোর্ট</Text>
                  <Text style={styles.menuListSub}>দোকানের সকল যাবতীয় খরচের তালিকা</Text>
                </View>
                <Text style={styles.menuListArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuListItem}
                onPress={() => setModalBakiReport(true)}
              >
                <Image source={require('./assets/icons/ic_share.png')} style={{ width: 22, height: 22, tintColor: '#B81414' }} resizeMode="contain" />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.menuListTitle}>বাকি হিসাব ও তাগাদা</Text>
                  <Text style={styles.menuListSub}>মোট বাকি ৳ {formatMoney(totalCustomerDue)}</Text>
                </View>
                <Text style={styles.menuListArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuListItem}
                onPress={() => setModalFullReport(true)}
              >
                <Image source={require('./assets/icons/ic_menu_report.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.menuListTitle}>সার্বিক হিসাব রিপোর্ট</Text>
                  <Text style={styles.menuListSub}>দৈনিক, মাসিক ও বার্ষিক স্টেটমেন্ট তৈরি ও শেয়ার</Text>
                </View>
                <Text style={styles.menuListArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuListItem}
                onPress={() => setModalMalikReport(true)}
              >
                <Image source={require('./assets/icons/ic_menu_malik_report.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.menuListTitle}>মালিকের হিসাব</Text>
                  <Text style={styles.menuListSub}>মালিকের বিনিয়োগ ও ব্যক্তিগত উত্তোলন স্টেটমেন্ট</Text>
                </View>
                <Text style={styles.menuListArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuListItem}
                onPress={() => setModalAddStock(true)}
              >
                <Image source={require('./assets/icons/ic_menu_stock.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.menuListTitle}>স্টক ও পণ্য হিসাব</Text>
                  <Text style={styles.menuListSub}>মোট {inventory.length} টি পণ্য • স্টক মূল্য ৳ {formatMoney(totalStockCost)}</Text>
                </View>
                <Text style={styles.menuListArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuListItem}
                onPress={() => setModalNotes(true)}
              >
                <Image source={require('./assets/icons/ic_menu_note.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.menuListTitle}>ব্যবসার নোট ও মেমো</Text>
                  <Text style={styles.menuListSub}>প্রয়োজনীয় কাজ ও জরুরি মেমো</Text>
                </View>
                <Text style={styles.menuListArrow}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Group 3: সেটিংস ও অন্যান্য (nav_group_others) */}
            <View style={styles.menuGroupHeader}>
              <Text style={styles.menuGroupTitle}>সেটিংস ও অন্যান্য</Text>
            </View>
            <View style={styles.menuListContainer}>
              <TouchableOpacity
                style={styles.menuListItem}
                onPress={() => setModalSettings(true)}
              >
                <Image source={require('./assets/icons/ic_menu_settings.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.menuListTitle}>দোকান ও ব্যবসা সেটিংস</Text>
                  <Text style={styles.menuListSub}>দোকানের নাম, ফোন, ঠিকানা ও প্রারম্ভিক ক্যাশ</Text>
                </View>
                <Text style={styles.menuListArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuListItem}
                onPress={() => setModalPinSetup(true)}
              >
                <Image source={require('./assets/icons/ic_menu_lock.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.menuListTitle}>পিন লক ও নিরাপত্তা</Text>
                  <Text style={styles.menuListSub}>{pinEnabled ? 'PIN লক সক্রিয় রয়েছে' : '৪ ডিজিটের গোপন PIN সেট করুন'}</Text>
                </View>
                <Text style={styles.menuListArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuListItem}
                onPress={() => {
                  setBackupJsonText('');
                  setModalBackupRestore(true);
                }}
              >
                <Image source={require('./assets/icons/ic_menu_backup.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.menuListTitle}>ডাটা ব্যাকআপ ও রিস্টোর</Text>
                  <Text style={styles.menuListSub}>১০০% অফলাইন ডাটা সেভ ও নতুন ফোনে ট্রান্সফার</Text>
                </View>
                <Text style={styles.menuListArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuListItem}
                onPress={() => {
                  Share.share({
                    message: 'টালিখাতা অ্যাপ দিয়ে আপনার দোকানের সব হিসাব সহজে ও নিরাপদে রাখুন। সম্পূর্ণ ফ্রি ও অফলাইন: https://tallykhata.com',
                  });
                }}
              >
                <Image source={require('./assets/icons/ic_share.png')} style={{ width: 22, height: 22, tintColor: COLORS.primary }} resizeMode="contain" />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.menuListTitle}>রেফার করুন</Text>
                  <Text style={styles.menuListSub}>অন্যান্য ব্যবসায়ীদের টালিখাতা শেয়ার করুন</Text>
                </View>
                <Text style={styles.menuListArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuListItem}
                onPress={() => setModalSupport(true)}
              >
                <Image source={require('./assets/icons/ic_menu_support.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.menuListTitle}>ব্যবহার নির্দেশিকা ও হেল্প</Text>
                  <Text style={styles.menuListSub}>সচরাচর জিজ্ঞাসিত প্রশ্ন ও হেল্পলাইন</Text>
                </View>
                <Text style={styles.menuListArrow}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Offline Guarantee Notice */}
            <View style={styles.offlineNoticeCard}>
              <Text style={styles.offlineNoticeTitle}>১০০% অফলাইন ও নিরাপদ</Text>
              <Text style={styles.offlineNoticeSub}>
                আপনার ব্যবসার তথ্য আপনার ফোনেই সুরক্ষিত। কোনো ইন্টারনেট কানেকশন বা সাবস্ক্রিপশন ছাড়াই আজীবন ব্যবহার করতে পারবেন।
              </Text>
            </View>
          </ScrollView>
        )}

      </View>

      {/* --- AUTHENTIC 4-TAB BOTTOM NAVIGATION BAR (photo_2026-10-15_18-13-34.jpg) --- */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab('home')}
          activeOpacity={0.8}
        >
          {activeTab === 'home' ? (
            <View style={styles.tabActivePill}>
              <Image
                source={require('./assets/nav/nav_home_active.png')}
                style={[styles.tabIconImg, { tintColor: '#B81414', marginBottom: 0 }]}
                resizeMode="contain"
              />
            </View>
          ) : (
            <Image
              source={require('./assets/nav/nav_home.png')}
              style={styles.tabIconImg}
              resizeMode="contain"
            />
          )}
          <Text style={[styles.tabButtonLabel, activeTab === 'home' && styles.tabButtonLabelActive]}>
            টালি
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab('cashbox')}
          activeOpacity={0.8}
        >
          {activeTab === 'cashbox' ? (
            <View style={styles.tabActivePill}>
              <Image
                source={require('./assets/nav/nav_cashbox_active.png')}
                style={[styles.tabIconImg, { tintColor: '#B81414', marginBottom: 0 }]}
                resizeMode="contain"
              />
            </View>
          ) : (
            <Image
              source={require('./assets/nav/nav_cashbox.png')}
              style={styles.tabIconImg}
              resizeMode="contain"
            />
          )}
          <Text style={[styles.tabButtonLabel, activeTab === 'cashbox' && styles.tabButtonLabelActive]}>
            ক্যাশবাক্স
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab('tallypay')}
          activeOpacity={0.8}
        >
          {activeTab === 'tallypay' ? (
            <View style={styles.tabActivePill}>
              <Image
                source={require('./assets/nav/nav_tallypay_active.png')}
                style={[styles.tabIconImg, { tintColor: '#B81414', marginBottom: 0 }]}
                resizeMode="contain"
              />
            </View>
          ) : (
            <Image
              source={require('./assets/nav/nav_tallypay.png')}
              style={styles.tabIconImg}
              resizeMode="contain"
            />
          )}
          <Text style={[styles.tabButtonLabel, activeTab === 'tallypay' && styles.tabButtonLabelActive]}>
            টালি পে
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab('menu')}
          activeOpacity={0.8}
        >
          {activeTab === 'menu' ? (
            <View style={styles.tabActivePill}>
              <Image
                source={require('./assets/nav/nav_menu_active.png')}
                style={[styles.tabIconImg, { tintColor: '#B81414', marginBottom: 0 }]}
                resizeMode="contain"
              />
            </View>
          ) : (
            <Image
              source={require('./assets/nav/nav_menu.png')}
              style={styles.tabIconImg}
              resizeMode="contain"
            />
          )}
          <Text style={[styles.tabButtonLabel, activeTab === 'menu' && styles.tabButtonLabelActive]}>
            মেন্যু
          </Text>
        </TouchableOpacity>
      </View>


      {/* ===================================================================
          MODAL: ADD TRANSACTION WITH AUTHENTIC BUILT-IN CALCULATOR KEYPAD
         =================================================================== */}
      <Modal visible={modalAddTxn} animationType="slide" transparent onRequestClose={() => setModalAddTxn(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '95%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalCardTitle, { color: txnType === 'given' ? COLORS.primary : COLORS.green }]}>
                {txnType === 'given' ? '- দিলাম (টাকা বা পণ্য বাকি)' : '+ পেলাম (নগদ বা জমা আদায়)'}
              </Text>
              <TouchableOpacity onPress={() => setModalAddTxn(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Large Calculator Display */}
            <View style={[styles.calcDisplayBox, { borderColor: txnType === 'given' ? COLORS.primary : COLORS.green }]}>
              <Text style={styles.calcExprText}>{calcExpr || '০'}</Text>
              <Text style={[styles.calcTotalText, { color: txnType === 'given' ? COLORS.primary : COLORS.green }]}>
                ৳ {calcDisplay}
              </Text>
            </View>

            {/* Quick Amount Add Chips */}
            <View style={styles.quickChipRow}>
              {[
                { label: '+১০০', val: 100 },
                { label: '+৫০০', val: 500 },
                { label: '+১,০০০', val: 1000 },
                { label: '+২,০০০', val: 2000 },
                { label: '+৫,০০০', val: 5000 },
              ].map((c) => (
                <TouchableOpacity
                  key={c.label}
                  style={styles.quickChip}
                  onPress={() => handleQuickChipAdd(c.val)}
                >
                  <Text style={styles.quickChipText}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Built-in Keypad Grid */}
            <View style={styles.keypadGrid}>
              {[
                ['7', '8', '9', '÷'],
                ['4', '5', '6', '×'],
                ['1', '2', '3', '-'],
                ['C', '0', '.', '+'],
                ['⌫', '00', '='],
              ].map((row, rIdx) => (
                <View key={rIdx} style={styles.keypadRow}>
                  {row.map((btn) => {
                    const isOp = ['÷', '×', '-', '+', '='].includes(btn);
                    const isSpecial = ['C', '⌫'].includes(btn);
                    return (
                      <TouchableOpacity
                        key={btn}
                        style={[
                          styles.keypadBtn,
                          isOp && styles.keypadBtnOp,
                          isSpecial && styles.keypadBtnSpecial,
                          btn === '=' && { backgroundColor: txnType === 'given' ? COLORS.primary : COLORS.green, flex: 2 },
                        ]}
                        onPress={() => handleCalcPress(btn)}
                      >
                        <Text
                          style={[
                            styles.keypadBtnText,
                            isOp && styles.keypadBtnTextOp,
                            isSpecial && styles.keypadBtnTextSpecial,
                            btn === '=' && { color: COLORS.white },
                          ]}
                        >
                          {btn}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>

            {/* Transaction Note / Description Input */}
            <TextInput
              style={styles.modalSimpleInput}
              placeholder="বিবরণ (যেমন: চাল, তেল, নগদ ইত্যাদি)"
              placeholderTextColor={COLORS.textSubtle}
              value={txnDesc}
              onChangeText={setTxnDesc}
            />

            {/* Quick Suggestion Chips for Note */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {['চাল', 'ডাল', 'তেল', 'চিনি', 'নগদ বাকি', 'নগদ জমা', 'পূর্বের বাকি'].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={styles.descChip}
                  onPress={() => setTxnDesc((prev) => (prev ? prev + ', ' + s : s))}
                >
                  <Text style={styles.descChipText}>+{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Modal Action Buttons */}
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalAddTxn(false)}>
                <Text style={styles.modalBtnCancelText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: txnType === 'given' ? COLORS.primary : COLORS.green }]}
                onPress={handleSaveTransaction}
              >
                <Text style={styles.modalBtnSubmitText}>নিশ্চিত করি</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: EDIT TRANSACTION
         =================================================================== */}
      <Modal visible={modalEditTxn} animationType="fade" transparent onRequestClose={() => setModalEditTxn(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalCardTitle}>লেনদেন সংশোধন (এডিট)</Text>
            <TextInput
              style={styles.modalBigInput}
              placeholder="টাকার পরিমাণ"
              keyboardType="numeric"
              value={editAmount}
              onChangeText={setEditAmount}
            />
            <TextInput
              style={styles.modalSimpleInput}
              placeholder="বিবরণ"
              value={editDesc}
              onChangeText={setEditDesc}
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalEditTxn(false)}>
                <Text style={styles.modalBtnCancelText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.primary }]}
                onPress={handleUpdateTransaction}
              >
                <Text style={styles.modalBtnSubmitText}>আপডেট করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: DIGITAL VOUCHER / MEMO (ডিজিটাল রশিদ)
         =================================================================== */}
      <Modal visible={modalVoucher} animationType="slide" transparent onRequestClose={() => setModalVoucher(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>ডিজিটাল ভাউচার (রশিদ)</Text>
              <TouchableOpacity onPress={() => setModalVoucher(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingVertical: 10 }}>
              <View style={styles.voucherContainer}>
                <View style={styles.voucherHeader}>
                  <Image
                    source={require('./assets/ic_tally_khata_logo_reg.png')}
                    style={{ width: 44, height: 44, marginBottom: 6 }}
                    resizeMode="contain"
                  />
                  <Text style={styles.voucherBizName}>{businessName}</Text>
                  <Text style={styles.voucherBizSub}>{businessAddress}</Text>
                  <Text style={styles.voucherBizSub}>মোবাইল: {ownerPhone}</Text>
                  <View style={styles.voucherBadge}>
                    <Text style={styles.voucherBadgeText}>১০০% ডিজিটাল হিসাব রশিদ</Text>
                  </View>
                </View>

                <View style={styles.voucherDivider} />

                <View style={styles.voucherDetailRow}>
                  <Text style={styles.voucherLabel}>রশিদ নং:</Text>
                  <Text style={styles.voucherVal}>TK-{selectedVoucherTxn?.id ? selectedVoucherTxn.id.slice(-6) : '000000'}</Text>
                </View>
                <View style={styles.voucherDetailRow}>
                  <Text style={styles.voucherLabel}>তারিখ ও সময়:</Text>
                  <Text style={styles.voucherVal}>
                    {selectedVoucherTxn?.date} {selectedVoucherTxn?.time ? '• ' + selectedVoucherTxn.time : ''}
                  </Text>
                </View>

                <View style={styles.voucherDivider} />

                <View style={styles.voucherDetailRow}>
                  <Text style={styles.voucherLabel}>
                    {selectedAccount?.type === 1 ? 'কাস্টমার:' : 'সাপ্লায়ার:'}
                  </Text>
                  <Text style={[styles.voucherVal, { fontWeight: 'bold' }]}>{selectedAccount?.name}</Text>
                </View>
                <View style={styles.voucherDetailRow}>
                  <Text style={styles.voucherLabel}>মোবাইল:</Text>
                  <Text style={styles.voucherVal}>{selectedAccount?.phone || 'দেওয়া নেই'}</Text>
                </View>

                <View style={styles.voucherDivider} />

                <View style={styles.voucherDetailRow}>
                  <Text style={styles.voucherLabel}>লেনদেনের ধরন:</Text>
                  <Text style={[styles.voucherVal, { color: selectedVoucherTxn?.type === 'given' ? COLORS.primary : COLORS.green, fontWeight: 'bold' }]}>
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
                  <Text style={[styles.voucherVal, { fontSize: 18, fontWeight: 'bold', color: selectedVoucherTxn?.type === 'given' ? COLORS.primary : COLORS.green }]}>
                    ৳ {formatMoney(selectedVoucherTxn?.amount)}
                  </Text>
                </View>
                <View style={styles.voucherDetailRow}>
                  <Text style={styles.voucherLabel}>সর্বমোট বর্তমান বাকি:</Text>
                  <Text style={[styles.voucherVal, { fontWeight: 'bold' }]}>
                    ৳ {formatMoney(selectedAccount?.balance)}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.voucherActionRow}>
              <TouchableOpacity
                style={[styles.voucherBtn, { backgroundColor: COLORS.blue }]}
                onPress={() => {
                  const txt = renderVoucherText(selectedVoucherTxn, selectedAccount);
                  Share.share({ message: txt });
                }}
              >
                <Image source={require('./assets/icons/ic_share.png')} style={{ width: 16, height: 16, tintColor: '#FFFFFF', marginRight: 6 }} resizeMode="contain" />
                <Text style={styles.voucherBtnText}>শেয়ার</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.voucherBtn, { backgroundColor: COLORS.gold }]}
                onPress={() => handleOpenEditTxn(selectedVoucherTxn)}
              >
                <Image source={require('./assets/icons/ic_edit.png')} style={{ width: 16, height: 16, tintColor: '#FFFFFF', marginRight: 6 }} resizeMode="contain" />
                <Text style={styles.voucherBtnText}>সংশোধন</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.voucherBtn, { backgroundColor: COLORS.red }]}
                onPress={() => { if (selectedVoucherTxn?.id) handleDeleteTransaction(selectedVoucherTxn.id); }}
              >
                <Image source={require('./assets/icons/ic_delete.png')} style={{ width: 16, height: 16, tintColor: '#FFFFFF', marginRight: 6 }} resizeMode="contain" />
                <Text style={styles.voucherBtnText}>মুছুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: EDIT ACCOUNT (CUSTOMER / SUPPLIER)
         =================================================================== */}
      <Modal visible={modalEditAccount} animationType="slide" transparent onRequestClose={() => setModalEditAccount(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>
                {selectedAccount?.type === 1 ? 'কাস্টমার তথ্য এডিট' : 'সাপ্লায়ার তথ্য এডিট'}
              </Text>
              <TouchableOpacity onPress={() => setModalEditAccount(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>নাম *</Text>
            <TextInput
              style={styles.modalSimpleInput}
              value={accName}
              onChangeText={setAccName}
              placeholder="নাম লিখুন"
              placeholderTextColor={COLORS.textSubtle}
            />

            <Text style={styles.inputLabel}>মোবাইল নম্বর</Text>
            <TextInput
              style={styles.modalSimpleInput}
              value={accPhone}
              onChangeText={setAccPhone}
              placeholder="01XXXXXXXXX"
              placeholderTextColor={COLORS.textSubtle}
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>ঠিকানা / এলাকা</Text>
            <TextInput
              style={styles.modalSimpleInput}
              value={accAddress}
              onChangeText={setAccAddress}
              placeholder="ঠিকানা (ঐচ্ছিক)"
              placeholderTextColor={COLORS.textSubtle}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalEditAccount(false)}>
                <Text style={styles.modalBtnCancelText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSubmit} onPress={handleUpdateAccount}>
                <Text style={styles.modalBtnSubmitText}>সংরক্ষণ করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: CREATE ACCOUNT (CUSTOMER / SUPPLIER)
         =================================================================== */}
      <Modal visible={modalAddAccount} animationType="slide" transparent onRequestClose={() => setModalAddAccount(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>নতুন খাতা খুলুন</Text>
              <TouchableOpacity onPress={() => setModalAddAccount(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.accTypeToggleRow}>
              <TouchableOpacity
                style={[styles.accTypeToggleBtn, accType === 1 && styles.accTypeToggleBtnActiveRed]}
                onPress={() => setAccType(1)}
              >
                <Text style={[styles.accTypeToggleText, accType === 1 && { color: COLORS.white }]}>
                  কাস্টমার (বাকি)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.accTypeToggleBtn, accType === 2 && styles.accTypeToggleBtnActiveGreen]}
                onPress={() => setAccType(2)}
              >
                <Text style={[styles.accTypeToggleText, accType === 2 && { color: COLORS.white }]}>
                  সাপ্লায়ার (মহাজন)
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalSimpleInput}
              placeholder="কাস্টমার / সাপ্লায়ারের নাম *"
              placeholderTextColor={COLORS.textSubtle}
              value={accName}
              onChangeText={setAccName}
            />
            <TextInput
              style={styles.modalSimpleInput}
              placeholder="মোবাইল নম্বর (ঐচ্ছিক)"
              placeholderTextColor={COLORS.textSubtle}
              keyboardType="phone-pad"
              value={accPhone}
              onChangeText={setAccPhone}
            />
            <TextInput
              style={styles.modalSimpleInput}
              placeholder="ঠিকানা / এলাকা (ঐচ্ছিক)"
              placeholderTextColor={COLORS.textSubtle}
              value={accAddress}
              onChangeText={setAccAddress}
            />
            <TextInput
              style={styles.modalSimpleInput}
              placeholder="পূর্বের বাকি ব্যালেন্স (যদি থাকে)"
              placeholderTextColor={COLORS.textSubtle}
              keyboardType="numeric"
              value={accInitialBal}
              onChangeText={setAccInitialBal}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalAddAccount(false)}>
                <Text style={styles.modalBtnCancelText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.primary }]}
                onPress={handleSaveAccount}
              >
                <Text style={styles.modalBtnSubmitText}>খাতা খুলুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: CASH ENTRY (CASHBOX)
         =================================================================== */}
      <Modal visible={modalAddCash} animationType="slide" transparent onRequestClose={() => setModalAddCash(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>ক্যাশ বাক্সের এন্ট্রি</Text>
              <TouchableOpacity onPress={() => setModalAddCash(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {[
                { key: 'sale', label: 'ক্যাশ বেচা (+)' },
                { key: 'buy', label: 'ক্যাশ কেনা (-)' },
                { key: 'cost', label: 'দোকান খরচ (-)' },
                { key: 'malik_in', label: 'মালিক দিল (+)' },
                { key: 'malik_out', label: 'মালিক নিল (-)' },
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
              placeholderTextColor={COLORS.textSubtle}
              keyboardType="numeric"
              autoFocus
              value={cashAmount}
              onChangeText={setCashAmount}
            />
            <TextInput
              style={styles.modalSimpleInput}
              placeholder="বিবরণ (যেমন: পণ্য বিক্রয়, নাস্তা, কারেন্ট বিল)"
              placeholderTextColor={COLORS.textSubtle}
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
                  { backgroundColor: cashCategory === 'sale' || cashCategory === 'malik_in' ? COLORS.green : COLORS.primary },
                ]}
                onPress={handleSaveCashEntry}
              >
                <Text style={styles.modalBtnSubmitText}>সংরক্ষণ করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: RECONCILE CASH (ক্যাশবক্স মিলানো)
         =================================================================== */}
      <Modal
        visible={modalReconcileCash}
        animationType="slide"
        transparent
        onRequestClose={() => setModalReconcileCash(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%', padding: 16 }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>ক্যাশবক্স মিলানো (নোট গণনা)</Text>
                <Text style={{ fontSize: 11, color: COLORS.textMuted }}>খাতার ক্যাশ: ৳ {formatMoney(totalCash)}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalReconcileCash(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ marginVertical: 8 }}>
              <View style={styles.denomContainer}>
                <View style={styles.denomHeaderRow}>
                  <Text style={styles.denomHeaderCol}>নোটের মান</Text>
                  <Text style={styles.denomHeaderCol}>সংখ্যা (টি)</Text>
                  <Text style={styles.denomHeaderCol}>মোট টাকা</Text>
                </View>

                {[
                  { label: '৳ ১০০০', value: 1000, state: notes1000, setter: setNotes1000 },
                  { label: '৳ ৫০০', value: 500, state: notes500, setter: setNotes500 },
                  { label: '৳ ২০০', value: 200, state: notes200, setter: setNotes200 },
                  { label: '৳ ১০০', value: 100, state: notes100, setter: setNotes100 },
                  { label: '৳ ৫০', value: 50, state: notes50, setter: setNotes50 },
                  { label: '৳ ২০', value: 20, state: notes20, setter: setNotes20 },
                  { label: '৳ ১০', value: 10, state: notes10, setter: setNotes10 },
                  { label: '৳ ৫', value: 5, state: notes5, setter: setNotes5 },
                  { label: '৳ ২', value: 2, state: notes2, setter: setNotes2 },
                  { label: '৳ ১', value: 1, state: notes1, setter: setNotes1 },
                ].map((row) => {
                  const qty = Number(row.state) || 0;
                  const subtotal = qty * row.value;
                  return (
                    <View key={row.label} style={styles.denomItemRow}>
                      <Text style={styles.denomNoteTag}>{row.label}</Text>
                      <Text style={styles.denomX}>×</Text>
                      <TextInput
                        style={styles.denomQtyInput}
                        placeholder="০"
                        placeholderTextColor={COLORS.textSubtle}
                        keyboardType="numeric"
                        value={row.state}
                        onChangeText={row.setter}
                      />
                      <Text style={styles.denomEq}>=</Text>
                      <Text style={styles.denomSubtotal}>৳ {formatMoney(subtotal)}</Text>
                    </View>
                  );
                })}
              </View>

              <View style={styles.denomSummaryBox}>
                <View style={styles.denomSummaryRow}>
                  <Text style={styles.denomSummaryLabel}>মোট গুনে পাওয়া ক্যাশ:</Text>
                  <Text style={[styles.denomSummaryVal, { color: COLORS.green }]}>
                    ৳ {formatMoney(countedFromNotes)}
                  </Text>
                </View>
                <View style={styles.denomSummaryRow}>
                  <Text style={styles.denomSummaryLabel}>খাতায় বর্তমান ক্যাশ:</Text>
                  <Text style={styles.denomSummaryVal}>
                    ৳ {formatMoney(totalCash)}
                  </Text>
                </View>
                <View style={[styles.denomSummaryRow, { borderTopWidth: 1, borderColor: '#E5E7EB', paddingTop: 6, marginTop: 4 }]}>
                  {(() => {
                    const diff = countedFromNotes - totalCash;
                    if (countedFromNotes === 0) {
                      return (
                        <Text style={{ fontSize: 12, color: COLORS.textMuted }}>
                          নোটের সংখ্যা লিখে ড্রয়ারের সঠিক ক্যাশ মিলান।
                        </Text>
                      );
                    }
                    if (diff === 0) {
                      return (
                        <Text style={{ fontSize: 13, color: COLORS.green, fontWeight: 'bold' }}>
                          ✓ ক্যাশ পুরোপুরি মিলে গেছে! কোনো গরমিল নেই।
                        </Text>
                      );
                    } else if (diff > 0) {
                      return (
                        <Text style={{ fontSize: 13, color: COLORS.blue, fontWeight: 'bold' }}>
                          ℹ️ ড্রয়ারে ৳ {formatMoney(diff)} অতিরিক্ত ক্যাশ রয়েছে।
                        </Text>
                      );
                    } else {
                      return (
                        <Text style={{ fontSize: 13, color: COLORS.red, fontWeight: 'bold' }}>
                          ⚠️ ড্রয়ারে ৳ {formatMoney(Math.abs(diff))} ক্যাশ ঘাটতি রয়েছে!
                        </Text>
                      );
                    }
                  })()}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setModalReconcileCash(false)}
              >
                <Text style={styles.modalBtnCancelText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.primary }]}
                onPress={handleSaveDenominations}
              >
                <Text style={styles.modalBtnSubmitText}>সমন্বয় সংরক্ষণ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: BANGLA QR (বাংলা কিউআর)
         =================================================================== */}
      <Modal visible={modalBanglaQR} animationType="slide" transparent onRequestClose={() => setModalBanglaQR(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { alignItems: 'center' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>বাংলা QR কোড</Text>
              <TouchableOpacity onPress={() => setModalBanglaQR(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.primary, marginTop: 8 }}>
              {businessName}
            </Text>
            <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 16 }}>
              মার্চেন্ট আইডি: TP-{ownerPhone}
            </Text>

            {/* QR Visual Card */}
            <View style={styles.qrDisplayContainer}>
              <Image
                source={require('./assets/ic_bangla_qr.png')}
                style={{ width: 170, height: 170 }}
                resizeMode="contain"
              />
              <Text style={styles.qrCenterBadge}>বাংলা QR • {businessName}</Text>
            </View>

            <Text style={{ fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginTop: 12, lineHeight: 18 }}>
              কাস্টমার তার বিকাশ, নগদ, রকেট বা যেকোনো ব্যাংক অ্যাপ দিয়ে এই কিউআর স্ক্যান করে সরাসরি পেমেন্ট করতে পারবেন।
            </Text>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, width: '100%' }}>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.blue, flex: 1 }]}
                onPress={() => {
                  Share.share({
                    message: `=== ${businessName} (বাংলা QR) ===\nমার্চেন্ট আইডি: TP-${ownerPhone}\nবিকাশ/নগদ/রকেট বা ব্যাংক দিয়ে পেমেন্ট করুন।`,
                  });
                }}
              >
                <Text style={styles.modalBtnSubmitText}>শেয়ার কিউআর</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnCancel, { flex: 1 }]}
                onPress={() => setModalBanglaQR(false)}
              >
                <Text style={styles.modalBtnCancelText}>বন্ধ করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: TALLYPAY ADD MONEY
         =================================================================== */}
      <Modal visible={modalAddMoney} animationType="slide" transparent onRequestClose={() => setModalAddMoney(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>ওয়ালেটে অ্যাড মানি</Text>
              <TouchableOpacity onPress={() => setModalAddMoney(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>পেমেন্ট মাধ্যম বেছে নিন:</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {['bKash', 'Nagad', 'Rocket', 'Bank Card'].map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.paymentMethodChip, addMoneyMethod === m && styles.paymentMethodChipActive]}
                  onPress={() => setAddMoneyMethod(m)}
                >
                  <Text style={[styles.paymentMethodChipText, addMoneyMethod === m && styles.paymentMethodChipTextActive]}>
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.modalBigInput}
              placeholder="৳ টাকার পরিমাণ"
              keyboardType="numeric"
              autoFocus
              value={addMoneyAmount}
              onChangeText={setAddMoneyAmount}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalAddMoney(false)}>
                <Text style={styles.modalBtnCancelText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.green }]}
                onPress={handleAddMoney}
              >
                <Text style={styles.modalBtnSubmitText}>অ্যাড মানি করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: TALLYPAY MOBILE RECHARGE
         =================================================================== */}
      <Modal visible={modalMobileRecharge} animationType="slide" transparent onRequestClose={() => setModalMobileRecharge(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>মোবাইল রিচার্জ</Text>
              <TouchableOpacity onPress={() => setModalMobileRecharge(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>অপারেটর নির্বাচন করুন:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {['Grameenphone', 'Banglalink', 'Robi', 'Airtel', 'Teletalk'].map((op) => (
                <TouchableOpacity
                  key={op}
                  style={[styles.paymentMethodChip, rechargeOperator === op && styles.paymentMethodChipActive]}
                  onPress={() => setRechargeOperator(op)}
                >
                  <Text style={[styles.paymentMethodChipText, rechargeOperator === op && styles.paymentMethodChipTextActive]}>
                    {op}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              style={styles.modalSimpleInput}
              placeholder="মোবাইল নম্বর (01XXXXXXXXX)"
              keyboardType="phone-pad"
              value={rechargePhone}
              onChangeText={setRechargePhone}
            />
            <TextInput
              style={styles.modalBigInput}
              placeholder="৳ রিচার্জ পরিমাণ"
              keyboardType="numeric"
              value={rechargeAmount}
              onChangeText={setRechargeAmount}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalMobileRecharge(false)}>
                <Text style={styles.modalBtnCancelText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.primary }]}
                onPress={handleMobileRecharge}
              >
                <Text style={styles.modalBtnSubmitText}>রিচার্জ করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: STOCK INVENTORY (পণ্য ও স্টক)
         =================================================================== */}
      <Modal visible={modalAddStock} animationType="slide" transparent onRequestClose={() => setModalAddStock(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>স্টক ও পণ্য তালিকা</Text>
              <TouchableOpacity onPress={() => setModalAddStock(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 10 }}>
              <View style={styles.stockSummaryRow}>
                <View style={styles.stockSummaryBox}>
                  <Text style={styles.stockSummaryBoxLabel}>মোট পণ্য</Text>
                  <Text style={styles.stockSummaryBoxVal}>{inventory.length} টি</Text>
                </View>
                <View style={[styles.stockSummaryBox, { borderColor: COLORS.primary }]}>
                  <Text style={styles.stockSummaryBoxLabel}>স্টক ক্রয়মূল্য</Text>
                  <Text style={[styles.stockSummaryBoxVal, { color: COLORS.primary }]}>৳ {formatMoney(totalStockCost)}</Text>
                </View>
                <View style={[styles.stockSummaryBox, { borderColor: COLORS.green }]}>
                  <Text style={styles.stockSummaryBoxLabel}>আনুমানিক বিক্রয়</Text>
                  <Text style={[styles.stockSummaryBoxVal, { color: COLORS.green }]}>৳ {formatMoney(totalStockSaleValue)}</Text>
                </View>
              </View>

              <Text style={[styles.sectionHeading, { marginTop: 12 }]}>নতুন পণ্য যোগ করুন</Text>
              <TextInput
                style={styles.modalSimpleInput}
                placeholder="পণ্যের নাম (যেমন: মিনিকেট চাল)"
                value={prodName}
                onChangeText={setProdName}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={[styles.modalSimpleInput, { flex: 1 }]}
                  placeholder="একক (কেজি/লিটার/পিস)"
                  value={prodUnit}
                  onChangeText={setProdUnit}
                />
                <TextInput
                  style={[styles.modalSimpleInput, { flex: 1 }]}
                  placeholder="বর্তমান স্টক"
                  keyboardType="numeric"
                  value={prodStock}
                  onChangeText={setProdStock}
                />
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={[styles.modalSimpleInput, { flex: 1 }]}
                  placeholder="ক্রয়মূল্য (৳)"
                  keyboardType="numeric"
                  value={prodBuyPrice}
                  onChangeText={setProdBuyPrice}
                />
                <TextInput
                  style={[styles.modalSimpleInput, { flex: 1 }]}
                  placeholder="বিক্রয়মূল্য (৳)"
                  keyboardType="numeric"
                  value={prodSellPrice}
                  onChangeText={setProdSellPrice}
                />
              </View>

              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.primary, marginTop: 4 }]}
                onPress={handleSaveProduct}
              >
                <Text style={styles.modalBtnSubmitText}>+ পণ্য যোগ করুন</Text>
              </TouchableOpacity>

              <Text style={[styles.sectionHeading, { marginTop: 16 }]}>বিদ্যমান পণ্যসমূহ</Text>
              {inventory.map((item) => (
                <View key={item.id} style={styles.stockItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stockItemName}>{item.name}</Text>
                    <Text style={styles.stockItemSub}>
                      ক্রয়: ৳ {formatMoney(item.buyPrice)} • বিক্রয়: ৳ {formatMoney(item.sellPrice)} / {item.unit}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.stockQtyText, item.stock <= 5 && { color: COLORS.red }]}>
                      {item.stock} {item.unit}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                      <TouchableOpacity
                        style={styles.stockAdjustMiniBtn}
                        onPress={() => {
                          setSelectedProduct(item);
                          setStockAdjustType('in');
                          setModalAdjustStock(true);
                        }}
                      >
                        <Text style={styles.stockAdjustMiniBtnText}>+ ইন</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.stockAdjustMiniBtn, { backgroundColor: COLORS.red }]}
                        onPress={() => {
                          setSelectedProduct(item);
                          setStockAdjustType('out');
                          setModalAdjustStock(true);
                        }}
                      >
                        <Text style={styles.stockAdjustMiniBtnText}>- আউট</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteProduct(item.id)} style={{ padding: 2 }}>
                        <Image source={require('./assets/icons/ic_delete.png')} style={{ width: 16, height: 16 }} resizeMode="contain" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: ADJUST PRODUCT STOCK
         =================================================================== */}
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
                <Text style={[styles.accTypeToggleText, stockAdjustType === 'in' && { color: COLORS.white }]}>
                  + নতুন স্টক এলো
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.accTypeToggleBtn, stockAdjustType === 'out' && styles.accTypeToggleBtnActiveRed]}
                onPress={() => setStockAdjustType('out')}
              >
                <Text style={[styles.accTypeToggleText, stockAdjustType === 'out' && { color: COLORS.white }]}>
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
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.primary }]}
                onPress={handleAdjustStock}
              >
                <Text style={styles.modalBtnSubmitText}>আপডেট করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: TAGADA REMINDER TEMPLATE
         =================================================================== */}
      <Modal visible={modalTagada} animationType="fade" transparent onRequestClose={() => setModalTagada(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { padding: 18 }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>তাগাদা মেসেজ</Text>
              <TouchableOpacity onPress={() => setModalTagada(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedAccount ? (
              <View style={styles.tagadaReceiverCard}>
                <View style={styles.tagadaReceiverAvatar}>
                  <Text style={styles.tagadaReceiverAvatarText}>
                    {(selectedAccount.name || 'খ')[0]}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.tagadaReceiverName}>{selectedAccount.name}</Text>
                  <Text style={styles.tagadaReceiverPhone}>{selectedAccount.phone || 'মোবাইল নম্বর নেই'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.tagadaReceiverDueLabel}>বকেয়া</Text>
                  <Text style={styles.tagadaReceiverDueAmount}>৳ {formatMoney(selectedAccount.balance)}</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.tagadaDottedBox}>
              <Text style={styles.tagadaMessageContent}>
                {generateTagadaMessage(selectedAccount)}
              </Text>
            </View>

            <Text style={styles.tagadaActionPrompt}>তাগাদা পাঠাতে ট্যাপ করুন।</Text>

            <View style={styles.tagadaDualBtnRow}>
              <TouchableOpacity
                style={styles.tagadaTallyMsgBtn}
                onPress={() => handleSendSingleTagada(selectedAccount)}
                activeOpacity={0.85}
              >
                <Image
                  source={require('./assets/icons/ic_sms.png')}
                  style={{ width: 22, height: 22, marginRight: 8, tintColor: '#FFFFFF' }}
                  resizeMode="contain"
                />
                <View>
                  <Text style={styles.tagadaTallyMsgText}>টালি-মেসেজ পাঠাই</Text>
                  <Text style={styles.tagadaTallyMsgSub}>
                    অবশিষ্ট: {remainingSmsCount < 10 ? '০' + remainingSmsCount : remainingSmsCount}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.tagadaShareAppBtn}
                onPress={() => handleSendTagadaWhatsApp(selectedAccount)}
                activeOpacity={0.85}
              >
                <Image
                  source={require('./assets/icons/ic_share.png')}
                  style={{ width: 20, height: 20, marginRight: 6, tintColor: '#1A1A1A' }}
                  resizeMode="contain"
                />
                <Text style={styles.tagadaShareAppText}>WhatsApp শেয়ার</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.modalBtnCancel, { marginTop: 14 }]}
              onPress={() => setModalTagada(false)}
            >
              <Text style={styles.modalBtnCancelText}>বাতিল</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: BUSINESS NOTES & CHECKLIST
         =================================================================== */}
      <Modal visible={modalNotes} animationType="slide" transparent onRequestClose={() => setModalNotes(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>ব্যবসার নোট ও মেমো</Text>
              <TouchableOpacity onPress={() => setModalNotes(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 12 }}>
              <TextInput
                style={[styles.modalSimpleInput, { flex: 1, marginBottom: 0 }]}
                placeholder="নতুন নোট বা জরুরি কাজ লিখুন..."
                value={newNoteText}
                onChangeText={setNewNoteText}
              />
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.primary, width: 70 }]}
                onPress={handleAddNote}
              >
                <Text style={styles.modalBtnSubmitText}>যোগ</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 10 }}>
              {notes.map((n) => (
                <View key={n.id} style={styles.noteItemRow}>
                  <TouchableOpacity onPress={() => handleToggleNote(n.id)} style={{ paddingRight: 8 }}>
                    <Text style={{ fontSize: 18 }}>{n.isComplete ? '✓ সম্পন্ন' : '○ বাকি'}</Text>
                  </TouchableOpacity>
                  <Text style={[styles.noteItemText, n.isComplete && styles.noteItemTextDone]}>
                    {n.text}
                  </Text>
                  <TouchableOpacity onPress={() => handleDeleteNote(n.id)} style={{ paddingLeft: 8 }}>
                    <Image source={require('./assets/icons/ic_delete.png')} style={{ width: 16, height: 16 }} resizeMode="contain" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: PROFIT & LOSS CALCULATION
         =================================================================== */}
      <Modal visible={modalProfitLoss} animationType="slide" transparent onRequestClose={() => setModalProfitLoss(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>লাভ ও ক্ষতির হিসাব</Text>
              <TouchableOpacity onPress={() => setModalProfitLoss(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.profitLossContainer}>
              <View style={styles.plRow}>
                <Text style={styles.plLabel}>মোট বিক্রয় (নগদ + বাকি):</Text>
                <Text style={[styles.plVal, { color: COLORS.green }]}>৳ {formatMoney(todaySales + totalCustomerDue)}</Text>
              </View>
              <View style={styles.plRow}>
                <Text style={styles.plLabel}>মাল ক্রয় বাবদ দেনা/ব্যয়:</Text>
                <Text style={[styles.plVal, { color: COLORS.red }]}>৳ {formatMoney(totalSupplierDue)}</Text>
              </View>
              <View style={styles.plRow}>
                <Text style={styles.plLabel}>মোট দোকান পরিচালনা খরচ:</Text>
                <Text style={[styles.plVal, { color: COLORS.red }]}>৳ {formatMoney(todayCosts)}</Text>
              </View>
              <View style={styles.voucherDivider} />
              <View style={styles.plRow}>
                <Text style={[styles.plLabel, { fontSize: 16, fontWeight: 'bold' }]}>আনুমানিক নিট লাভ:</Text>
                <Text style={[styles.plVal, { fontSize: 18, fontWeight: 'bold', color: COLORS.primary }]}>
                  ৳ {formatMoney(Math.max(0, todaySales + totalCustomerDue - totalSupplierDue - todayCosts))}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={[styles.modalBtnCancel, { marginTop: 12 }]} onPress={() => setModalProfitLoss(false)}>
              <Text style={styles.modalBtnCancelText}>বন্ধ করুন</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: FULL ACCOUNTING REPORT
         =================================================================== */}
      <Modal visible={modalFullReport} animationType="slide" transparent onRequestClose={() => setModalFullReport(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>সার্বিক হিসাব স্টেটমেন্ট</Text>
              <TouchableOpacity onPress={() => setModalFullReport(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingVertical: 10 }}>
              <View style={styles.reportSummaryBox}>
                <View style={styles.reportItemRow}>
                  <Text style={styles.reportItemTitle}>মোট বাকি পাবো (কাস্টমার):</Text>
                  <Text style={[styles.reportItemValue, { color: COLORS.primary }]}>৳ {formatMoney(totalCustomerDue)}</Text>
                </View>
                <View style={styles.reportItemRow}>
                  <Text style={styles.reportItemTitle}>মোট দেনা দিবো (সাপ্লায়ার):</Text>
                  <Text style={[styles.reportItemValue, { color: COLORS.green }]}>৳ {formatMoney(totalSupplierDue)}</Text>
                </View>
                <View style={styles.reportItemRow}>
                  <Text style={styles.reportItemTitle}>ক্যাশ বাক্সে বর্তমান টাকা:</Text>
                  <Text style={[styles.reportItemValue, { color: COLORS.primary }]}>৳ {formatMoney(totalCash)}</Text>
                </View>
                <View style={styles.reportItemRow}>
                  <Text style={styles.reportItemTitle}>বিদ্যমান পণ্যের মোট স্টক মূল্য:</Text>
                  <Text style={[styles.reportItemValue, { color: COLORS.green }]}>৳ {formatMoney(totalStockCost)}</Text>
                </View>
                <View style={styles.voucherDivider} />
                <View style={styles.reportItemRow}>
                  <Text style={[styles.reportItemTitle, { fontWeight: 'bold' }]}>মোট ব্যবসা সম্পদ:</Text>
                  <Text style={[styles.reportItemValue, { fontWeight: 'bold', color: COLORS.primary }]}>
                    ৳ {formatMoney(totalCash + totalCustomerDue + totalStockCost)}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.blue, marginTop: 12 }]}
                onPress={() => {
                  const rep =
                    `=== ${businessName} - সার্বিক হিসাব রিপোর্ট ===\n` +
                    `তারিখ: ${getTodayDate()}\n` +
                    `---------------------------------\n` +
                    `মোট বাকি পাবো: ৳ ${formatMoney(totalCustomerDue)}\n` +
                    `মোট দেনা দিবো: ৳ ${formatMoney(totalSupplierDue)}\n` +
                    `ক্যাশ বাক্সে আছে: ৳ ${formatMoney(totalCash)}\n` +
                    `স্টক পণ্যের মূল্য: ৳ ${formatMoney(totalStockCost)}\n` +
                    `মোট ব্যবসার মোট সম্পদ: ৳ ${formatMoney(totalCash + totalCustomerDue + totalStockCost)}\n` +
                    `কাস্টমার সংখ্যা: ${accounts.filter((a) => a.type === 1).length} জন\n` +
                    `সাপ্লায়ার সংখ্যা: ${accounts.filter((a) => a.type === 2).length} জন\n` +
                    `যোগাযোগ: ${ownerPhone}`;
                  Share.share({ message: rep });
                }}
              >
                <Text style={styles.modalBtnSubmitText}>সম্পূর্ণ রিপোর্ট শেয়ার করুন</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: STORE & BUSINESS SETTINGS
         =================================================================== */}
      <Modal visible={modalSettings} animationType="slide" transparent onRequestClose={() => setModalSettings(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>দোকান ও ব্যবসা সেটিংস</Text>
              <TouchableOpacity onPress={() => setModalSettings(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingVertical: 10 }}>
              <Text style={styles.inputLabel}>ব্যবসা প্রতিষ্ঠান বা দোকানের নাম</Text>
              <TextInput
                style={styles.modalSimpleInput}
                value={businessName}
                onChangeText={setBusinessName}
              />
              <Text style={styles.inputLabel}>মালিকের নাম</Text>
              <TextInput
                style={styles.modalSimpleInput}
                value={ownerName}
                onChangeText={setOwnerName}
              />
              <Text style={styles.inputLabel}>মোবাইল নম্বর</Text>
              <TextInput
                style={styles.modalSimpleInput}
                value={ownerPhone}
                onChangeText={setOwnerPhone}
                keyboardType="phone-pad"
              />
              <Text style={styles.inputLabel}>দোকানের ঠিকানা</Text>
              <TextInput
                style={styles.modalSimpleInput}
                value={businessAddress}
                onChangeText={setBusinessAddress}
              />
              <Text style={styles.inputLabel}>প্রারম্ভিক ক্যাশ ব্যালেন্স (৳)</Text>
              <TextInput
                style={styles.modalSimpleInput}
                value={String(openingBalance)}
                onChangeText={(v) => setOpeningBalance(parseFloat(v) || 0)}
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.primary, marginTop: 10 }]}
                onPress={() => {
                  persistData();
                  setModalSettings(false);
                  Alert.alert('সফল', 'ব্যবসার তথ্য সফলভাবে সংরক্ষিত হয়েছে');
                }}
              >
                <Text style={styles.modalBtnSubmitText}>সংরক্ষণ করুন</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: OFFLINE BACKUP & RESTORE
         =================================================================== */}
      <Modal visible={modalBackupRestore} animationType="slide" transparent onRequestClose={() => setModalBackupRestore(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>১০০% অফলাইন ব্যাকআপ ও রিস্টোর</Text>
              <TouchableOpacity onPress={() => setModalBackupRestore(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>
              নিচের টেক্সট বক্সে আপনার খাতার সম্পূর্ণ ডাটা সংরক্ষিত আছে:
            </Text>
            <TextInput
              style={styles.backupTextArea}
              multiline
              value={backupJsonText}
              onChangeText={setBackupJsonText}
              placeholder="এখানে ব্যাকআপ JSON টেক্সট পেস্ট করুন..."
              placeholderTextColor={COLORS.textSubtle}
            />

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <TouchableOpacity
                style={[styles.backupBtn, { backgroundColor: COLORS.primary }]}
                onPress={handleExportBackup}
              >
                <Text style={styles.backupBtnText}>ব্যাকআপ তৈরি</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.backupBtn, { backgroundColor: COLORS.blue }]}
                onPress={handleShareBackup}
              >
                <Text style={styles.backupBtnText}>শেয়ার / কপি</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.backupBtn, { backgroundColor: COLORS.gold }]}
                onPress={handleImportBackup}
              >
                <Text style={styles.backupBtnText}>রিস্টোর করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: INBOX (ইনবক্স নোটিফিকেশন)
         =================================================================== */}
      <Modal visible={modalInbox} animationType="slide" transparent onRequestClose={() => setModalInbox(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '80%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>ইনবক্স ও নোটিফিকেশন</Text>
              <TouchableOpacity onPress={() => setModalInbox(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingVertical: 10 }}>
              <View style={styles.inboxItem}>
                <Text style={styles.inboxItemTitle}>টালিখাতা অফলাইন সংস্করণে স্বাগতম!</Text>
                <Text style={styles.inboxItemBody}>
                  আপনার অ্যাপটি সম্পূর্ণ ইন্টারনেট ছাড়া ১০০% অফলাইনে কাজ করে। কোনো মাসিক ফি বা সাবস্ক্রিপশন ছাড়াই আজীবন ব্যবহার করতে পারবেন।
                </Text>
                <Text style={styles.inboxItemDate}>{getTodayDate()}</Text>
              </View>

              <View style={styles.inboxItem}>
                <Text style={styles.inboxItemTitle}>ব্যাকআপ রাখার পরামর্শ</Text>
                <Text style={styles.inboxItemBody}>
                  প্রতি সপ্তাহে একবার মেনু থেকে "ডাটা ব্যাকআপ ও রিস্টোর" চেপে ব্যাকআপ কপি করে আপনার হোয়াটসঅ্যাপ বা ড্রাইভে রেখে দিন।
                </Text>
                <Text style={styles.inboxItemDate}>{getYesterdayDate()}</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: SUPPORT & AUTHENTIC APK FAQS
         =================================================================== */}
      <Modal visible={modalSupport} animationType="slide" transparent onRequestClose={() => setModalSupport(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>হেল্প ও সচরাচর প্রশ্ন</Text>
              <TouchableOpacity onPress={() => setModalSupport(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingVertical: 10 }}>
              <View style={[styles.supportBanner, { flexDirection: 'row', alignItems: 'center', padding: 14 }]}>
                <Image
                  source={require('./assets/customer_care_lady.png')}
                  style={{ width: 56, height: 56, borderRadius: 28, marginRight: 14 }}
                  resizeMode="contain"
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.supportBannerTitle}>টালিখাতা কাস্টমার সাপোর্ট</Text>
                  <TouchableOpacity onPress={() => Linking.openURL('tel:09612446677')}>
                    <Text style={{ fontSize: 15, color: COLORS.primary, fontWeight: 'bold', marginTop: 3 }}>
                      হটলাইন: ০৯৬১২-৪৪৬৬৭৭
                    </Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                    সকাল ৯টা - রাত ৯টা (ছুটির দিনসহ)
                  </Text>
                </View>
              </View>

              <Text style={[styles.sectionHeading, { marginTop: 14 }]}>ব্যবহার নির্দেশিকা (FAQ)</Text>
              {AUTHENTIC_FAQS.map((faq, idx) => (
                <View key={idx} style={styles.faqCard}>
                  <Text style={styles.faqQues}>{faq.q}</Text>
                  <Text style={styles.faqAns}>{faq.a}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: PIN SECURITY SETUP
         =================================================================== */}
      <Modal visible={modalPinSetup} animationType="slide" transparent onRequestClose={() => setModalPinSetup(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>পিন লক সেটিংস</Text>
              <TouchableOpacity onPress={() => setModalPinSetup(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: COLORS.textMuted, marginVertical: 8 }}>
              অ্যাপটি সুরক্ষিত রাখতে ৪ ডিজিটের গোপন পিন কোড সেট করুন:
            </Text>

            <TextInput
              style={styles.modalBigInput}
              placeholder="৪ ডিজিটের পিন"
              placeholderTextColor={COLORS.textSubtle}
              keyboardType="numeric"
              maxLength={4}
              value={appPin}
              onChangeText={setAppPin}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: pinEnabled ? COLORS.red : COLORS.primary, flex: 1 }]}
                onPress={() => {
                  if (!pinEnabled) {
                    if (appPin.length !== 4) {
                      Alert.alert('সতর্কতা', 'সঠিক ৪ ডিজিটের পিন দিন');
                      return;
                    }
                    setPinEnabled(true);
                    persistData({ pinEnabled: true, appPin });
                    Alert.alert('সফল', 'পিন লক চালু করা হয়েছে।');
                  } else {
                    setPinEnabled(false);
                    setAppPin('');
                    persistData({ pinEnabled: false, appPin: '' });
                    Alert.alert('বন্ধ', 'পিন লক বন্ধ করা হয়েছে।');
                  }
                  setModalPinSetup(false);
                }}
              >
                <Text style={styles.modalBtnSubmitText}>
                  {pinEnabled ? 'পিন লক বন্ধ করুন' : 'পিন লক চালু করুন'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 1. BUSINESS PICKER */}
      <Modal
        visible={modalBusinessPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setModalBusinessPicker(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.bottomSheetCard}>
            <View style={styles.bottomSheetHandle} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>ব্যবসা প্রতিষ্ঠান পরিবর্তন</Text>
              <TouchableOpacity onPress={() => setModalBusinessPicker(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 340, marginVertical: 8 }}>
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
            </ScrollView>

            <TouchableOpacity
              style={styles.bizAddBtn}
              onPress={() => {
                setModalBusinessPicker(false);
                setModalAddBusiness(true);
              }}
            >
              <Text style={{ fontSize: 18, color: '#FFFFFF' }}>➕</Text>
              <Text style={styles.bizAddBtnText}>নতুন ব্যবসা প্রতিষ্ঠান যোগ করুন</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 2. ADD BUSINESS */}
      <Modal
        visible={modalAddBusiness}
        animationType="slide"
        transparent
        onRequestClose={() => setModalAddBusiness(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { padding: 18 }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>নতুন ব্যবসা প্রতিষ্ঠান</Text>
              <TouchableOpacity onPress={() => setModalAddBusiness(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>ব্যবসার নাম *</Text>
            <TextInput
              style={styles.modalSimpleInput}
              placeholder="যেমন: মেসার্স ভাই ভাই ট্রেডার্স"
              placeholderTextColor={COLORS.textSubtle}
              value={newBizName}
              onChangeText={setNewBizName}
            />

            <Text style={styles.inputLabel}>স্বত্বাধিকারীর নাম</Text>
            <TextInput
              style={styles.modalSimpleInput}
              placeholder="স্বত্বাধিকারীর নাম"
              placeholderTextColor={COLORS.textSubtle}
              value={newBizOwner}
              onChangeText={setNewBizOwner}
            />

            <Text style={styles.inputLabel}>মোবাইল নম্বর</Text>
            <TextInput
              style={styles.modalSimpleInput}
              placeholder="০১৭১১..."
              placeholderTextColor={COLORS.textSubtle}
              keyboardType="phone-pad"
              value={newBizPhone}
              onChangeText={setNewBizPhone}
            />

            <Text style={styles.inputLabel}>ব্যবসার ঠিকানা</Text>
            <TextInput
              style={styles.modalSimpleInput}
              placeholder="দোকান/বাজারের ঠিকানা"
              placeholderTextColor={COLORS.textSubtle}
              value={newBizAddress}
              onChangeText={setNewBizAddress}
            />

            <View style={[styles.modalBtnRow, { marginTop: 14 }]}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setModalAddBusiness(false)}
              >
                <Text style={styles.modalBtnCancelText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.primary }]}
                onPress={handleCreateBusiness}
              >
                <Text style={styles.modalBtnSubmitText}>সংরক্ষণ করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      {/* 3. BECHA KENA REPORT */}
      <Modal
        visible={modalBechaKena}
        animationType="slide"
        onRequestClose={() => setModalBechaKena(false)}
      >
        <SafeAreaView style={styles.reportContainer}>
          <View style={styles.reportHeader}>
            <TouchableOpacity onPress={() => setModalBechaKena(false)} style={styles.reportHeaderBack}>
              <Text style={styles.reportHeaderBackText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.reportHeaderTitle}>বেচাকেনা রিপোর্ট</Text>
            <TouchableOpacity
              style={styles.reportHeaderAction}
              onPress={() => {
                Share.share({
                  message: `${businessName} - বেচাকেনা রিপোর্ট`,
                });
              }}
            >
              <Text style={styles.reportHeaderActionText}>শেয়ার</Text>
            </TouchableOpacity>
          </View>

          {(() => {
            const cashBecha = (cashEntries || [])
              .filter((e) => e.category === 'sale')
              .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
            const cashKena = (cashEntries || [])
              .filter((e) => e.category === 'buy')
              .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
            const bakiBecha = (journals || [])
              .filter((j) => j.type === 'give')
              .reduce((sum, j) => sum + (Number(j.amount) || 0), 0);
            const bakiKena = (journals || [])
              .filter((j) => j.type === 'got')
              .reduce((sum, j) => sum + (Number(j.amount) || 0), 0);
            const totalBecha = cashBecha + bakiBecha;
            const totalKena = cashKena + bakiKena;

            const salesList = (cashEntries || [])
              .filter((e) => e.category === 'sale' || e.category === 'buy')
              .map((e) => ({
                id: e.id,
                title: e.desc || (e.category === 'sale' ? 'ক্যাশ বেচা' : 'ক্যাশ কেনা'),
                amount: e.amount,
                date: e.date,
                time: e.time,
                isSale: e.category === 'sale',
                tag: 'ক্যাশ',
              }));

            return (
              <ScrollView style={{ flex: 1 }}>
                <View style={styles.reportKpiRow}>
                  <View style={styles.reportKpiCard}>
                    <Text style={styles.reportKpiLabel}>মোট বেচা (ক্যাশ+বাকি)</Text>
                    <Text style={[styles.reportKpiValue, { color: COLORS.green }]}>
                      ৳ {formatMoney(totalBecha)}
                    </Text>
                  </View>
                  <View style={styles.reportKpiCard}>
                    <Text style={styles.reportKpiLabel}>মোট কেনা (ক্যাশ+বাকি)</Text>
                    <Text style={[styles.reportKpiValue, { color: COLORS.red }]}>
                      ৳ {formatMoney(totalKena)}
                    </Text>
                  </View>
                </View>

                <View style={styles.reportSubKpiRow}>
                  <View style={styles.reportSubKpiCard}>
                    <Text style={styles.reportSubKpiLabel}>ক্যাশ বেচা</Text>
                    <Text style={styles.reportSubKpiValue}>৳ {formatMoney(cashBecha)}</Text>
                  </View>
                  <View style={styles.reportSubKpiCard}>
                    <Text style={styles.reportSubKpiLabel}>বাকি বেচা</Text>
                    <Text style={styles.reportSubKpiValue}>৳ {formatMoney(bakiBecha)}</Text>
                  </View>
                  <View style={styles.reportSubKpiCard}>
                    <Text style={styles.reportSubKpiLabel}>নীট লাভ</Text>
                    <Text style={[styles.reportSubKpiValue, { color: totalBecha >= totalKena ? COLORS.green : COLORS.red }]}>
                      ৳ {formatMoney(totalBecha - totalKena)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.reportSectionTitle}>লেনদেন তালিকা</Text>
                {salesList.length === 0 ? (
                  <View style={{ alignItems: 'center', padding: 30 }}>
                    <Text style={{ color: COLORS.textMuted }}>কোনো লেনদেন রেকর্ড নেই</Text>
                  </View>
                ) : (
                  salesList.map((item, idx) => (
                    <View key={item.id || idx} style={styles.reportRowCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reportRowName}>{item.title}</Text>
                        <Text style={styles.reportRowSub}>{item.date} • {item.time || ''} • {item.tag}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.reportRowAmt, { color: item.isSale ? COLORS.green : COLORS.red }]}>
                          {item.isSale ? '+' : '-'} ৳ {formatMoney(item.amount)}
                        </Text>
                        <Text
                          style={[
                            styles.reportRowBadge,
                            {
                              backgroundColor: item.isSale ? '#DCFCE7' : '#FEE2E2',
                              color: item.isSale ? COLORS.green : COLORS.red,
                            },
                          ]}
                        >
                          {item.isSale ? 'বেচা' : 'কেনা'}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            );
          })()}
        </SafeAreaView>
      </Modal>

      {/* 4. BAKI REPORT */}
      <Modal
        visible={modalBakiReport}
        animationType="slide"
        onRequestClose={() => setModalBakiReport(false)}
      >
        <SafeAreaView style={styles.reportContainer}>
          <View style={styles.reportHeader}>
            <TouchableOpacity onPress={() => setModalBakiReport(false)} style={styles.reportHeaderBack}>
              <Text style={styles.reportHeaderBackText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.reportHeaderTitle}>বাকি রিপোর্ট (পাওনা ও দেনা)</Text>
            <TouchableOpacity
              style={styles.reportHeaderAction}
              onPress={() => {
                Share.share({
                  message: `${businessName} - বাকি রিপোর্ট\nমোট পাওনা: ৳ ${formatMoney(totalCustomerDue)}\nমোট দেনা: ৳ ${formatMoney(totalSupplierDue)}`,
                });
              }}
            >
              <Text style={styles.reportHeaderActionText}>শেয়ার</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.reportKpiRow}>
            <View style={styles.reportKpiCard}>
              <Text style={styles.reportKpiLabel}>মোট পাবো (কাস্টমার বাকি)</Text>
              <Text style={[styles.reportKpiValue, { color: COLORS.primary }]}>
                ৳ {formatMoney(totalCustomerDue)}
              </Text>
            </View>
            <View style={styles.reportKpiCard}>
              <Text style={styles.reportKpiLabel}>মোট দেবো (সাপ্লায়ার বাকি)</Text>
              <Text style={[styles.reportKpiValue, { color: COLORS.green }]}>
                ৳ {formatMoney(totalSupplierDue)}
              </Text>
            </View>
          </View>

          <View style={[styles.reportSubKpiRow, { paddingBottom: 6 }]}>
            <View style={styles.reportSubKpiCard}>
              <Text style={styles.reportSubKpiLabel}>বাকি কাস্টমার</Text>
              <Text style={styles.reportSubKpiValue}>
                {(accounts || []).filter((a) => a.type === 1 && a.balance > 0).length} জন
              </Text>
            </View>
            <View style={styles.reportSubKpiCard}>
              <Text style={styles.reportSubKpiLabel}>বকেয়া সাপ্লায়ার</Text>
              <Text style={styles.reportSubKpiValue}>
                {(accounts || []).filter((a) => a.type === 2 && a.balance > 0).length} জন
              </Text>
            </View>
            <View style={styles.reportSubKpiCard}>
              <Text style={styles.reportSubKpiLabel}>নীট পাওনা</Text>
              <Text style={[styles.reportSubKpiValue, { color: totalCustomerDue >= totalSupplierDue ? COLORS.primary : COLORS.green }]}>
                ৳ {formatMoney(totalCustomerDue - totalSupplierDue)}
              </Text>
            </View>
          </View>

          <ScrollView style={{ flex: 1 }}>
            <Text style={styles.reportSectionTitle}>কাস্টমারদের বকেয়া তালিকা</Text>
            {(accounts || []).filter((a) => a.type === 1 && a.balance > 0).length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: COLORS.textMuted }}>কোনো কাস্টমারের বাকি নেই</Text>
              </View>
            ) : (
              (accounts || [])
                .filter((a) => a.type === 1 && a.balance > 0)
                .map((a) => (
                  <View key={a.id} style={styles.reportRowCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reportRowName}>{a.name}</Text>
                      <Text style={styles.reportRowSub}>{a.phone || 'ফোন নম্বর নেই'} • {a.address || 'ঠিকানা নেই'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.reportRowAmt, { color: COLORS.primary }]}>
                        ৳ {formatMoney(a.balance)}
                      </Text>
                      <TouchableOpacity
                        style={{ marginTop: 4, backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}
                        onPress={() => {
                          setSelectedAccount(a);
                          setModalBakiReport(false);
                          setModalTagada(true);
                        }}
                      >
                        <Text style={{ fontSize: 11, color: COLORS.primary, fontWeight: 'bold' }}>তাগাদা পাঠান</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
            )}

            <Text style={[styles.reportSectionTitle, { marginTop: 10 }]}>সাপ্লায়ারদের বকেয়া তালিকা</Text>
            {(accounts || []).filter((a) => a.type === 2 && a.balance > 0).length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: COLORS.textMuted }}>কোনো সাপ্লায়ারের বকেয়া নেই</Text>
              </View>
            ) : (
              (accounts || [])
                .filter((a) => a.type === 2 && a.balance > 0)
                .map((a) => (
                  <View key={a.id} style={styles.reportRowCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reportRowName}>{a.name}</Text>
                      <Text style={styles.reportRowSub}>{a.phone || 'ফোন নম্বর নেই'} • {a.address || 'ঠিকানা নেই'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.reportRowAmt, { color: COLORS.green }]}>
                        ৳ {formatMoney(a.balance)}
                      </Text>
                      <Text style={[styles.reportRowBadge, { backgroundColor: '#DCFCE7', color: COLORS.green }]}>দেবো</Text>
                    </View>
                  </View>
                ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>


      {/* 5. CASH REPORT */}
      <Modal
        visible={modalCashReport}
        animationType="slide"
        onRequestClose={() => setModalCashReport(false)}
      >
        <SafeAreaView style={styles.reportContainer}>
          <View style={styles.reportHeader}>
            <TouchableOpacity onPress={() => setModalCashReport(false)} style={styles.reportHeaderBack}>
              <Text style={styles.reportHeaderBackText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.reportHeaderTitle}>ক্যাশ রিপোর্ট (ক্যাশবক্স হিসাব)</Text>
            <TouchableOpacity
              style={styles.reportHeaderAction}
              onPress={() => {
                Share.share({
                  message: `${businessName} - ক্যাশ রিপোর্ট\nবর্তমান ক্যাশ ব্যালেন্স: ৳ ${formatMoney(totalCash)}`,
                });
              }}
            >
              <Text style={styles.reportHeaderActionText}>শেয়ার</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }}>
            <View style={styles.reportKpiRow}>
              <View style={[styles.reportKpiCard, { backgroundColor: '#1E293B' }]}>
                <Text style={[styles.reportKpiLabel, { color: '#94A3B8' }]}>বর্তমান ক্যাশবক্স ব্যালেন্স</Text>
                <Text style={[styles.reportKpiValue, { color: '#FFFFFF', fontSize: 22 }]}>
                  ৳ {formatMoney(totalCash)}
                </Text>
              </View>
            </View>

            <View style={styles.reportKpiRow}>
              <View style={styles.reportKpiCard}>
                <Text style={styles.reportKpiLabel}>আজকের ক্যাশ ইন (+)</Text>
                <Text style={[styles.reportKpiValue, { color: COLORS.green }]}>
                  ৳ {formatMoney(todayCashIn)}
                </Text>
              </View>
              <View style={styles.reportKpiCard}>
                <Text style={styles.reportKpiLabel}>আজকের ক্যাশ আউট (-)</Text>
                <Text style={[styles.reportKpiValue, { color: COLORS.red }]}>
                  ৳ {formatMoney(todayCashOut)}
                </Text>
              </View>
            </View>

            <Text style={styles.reportSectionTitle}>ক্যাশবক্স খাত অনুযায়ী হিসাব</Text>
            <View style={{ paddingHorizontal: 14 }}>
              {[
                { name: 'ক্যাশ বেচা', type: 'in', cat: 'sale', color: COLORS.green },
                { name: 'ক্যাশ কেনা', type: 'out', cat: 'buy', color: COLORS.red },
                { name: 'দোকান খরচ', type: 'out', cat: 'cost', color: COLORS.red },
                { name: 'মালিক দিল (মূলধন)', type: 'in', cat: 'malik_in', color: COLORS.blue },
                { name: 'মালিক নিল (উত্তোলন)', type: 'out', cat: 'malik_out', color: '#D97706' },
              ].map((acc) => {
                const totalAcc = (cashEntries || [])
                  .filter((e) => e.category === acc.cat)
                  .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
                return (
                  <View key={acc.name} style={[styles.reportRowCard, { borderRadius: 8, marginVertical: 4 }]}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A' }}>{acc.name}</Text>
                    <Text style={{ fontSize: 15, fontWeight: 'bold', color: acc.color }}>
                      {acc.type === 'in' ? '+' : '-'} ৳ {formatMoney(totalAcc)}
                    </Text>
                  </View>
                );
              })}
            </View>

            <Text style={[styles.reportSectionTitle, { marginTop: 12 }]}>সর্বশেষ ক্যাশ লেনদেন</Text>
            {(cashEntries || []).length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: COLORS.textMuted }}>কোনো ক্যাশ এন্ট্রি নেই</Text>
              </View>
            ) : (
              (cashEntries || []).slice(0, 30).map((entry, index) => (
                <View key={entry.id || index} style={styles.reportRowCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reportRowName}>{entry.desc || entry.category || 'ক্যাশ লেনদেন'}</Text>
                    <Text style={styles.reportRowSub}>{entry.date} • {entry.time || ''}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.reportRowAmt, { color: entry.type === 'in' ? COLORS.green : COLORS.red }]}>
                      {entry.type === 'in' ? '+' : '-'} ৳ {formatMoney(entry.amount)}
                    </Text>
                    <Text
                      style={[
                        styles.reportRowBadge,
                        {
                          backgroundColor: entry.type === 'in' ? '#DCFCE7' : '#FEE2E2',
                          color: entry.type === 'in' ? COLORS.green : COLORS.red,
                        },
                      ]}
                    >
                      {entry.type === 'in' ? 'ক্যাশ ইন' : 'ক্যাশ আউট'}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* 6. EXPENSE REPORT */}
      <Modal
        visible={modalExpenseReport}
        animationType="slide"
        onRequestClose={() => setModalExpenseReport(false)}
      >
        <SafeAreaView style={styles.reportContainer}>
          <View style={styles.reportHeader}>
            <TouchableOpacity onPress={() => setModalExpenseReport(false)} style={styles.reportHeaderBack}>
              <Text style={styles.reportHeaderBackText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.reportHeaderTitle}>দোকান খরচ রিপোর্ট</Text>
            <TouchableOpacity
              style={styles.reportHeaderAction}
              onPress={() => {
                setCashCategory('cost');
                setCashType('out');
                setModalExpenseReport(false);
                setModalAddCash(true);
              }}
            >
              <Text style={styles.reportHeaderActionText}>+ খরচ লিখুন</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.reportKpiRow}>
            <View style={[styles.reportKpiCard, { backgroundColor: '#DC2626' }]}>
              <Text style={[styles.reportKpiLabel, { color: '#FEE2E2' }]}>মোট দোকান খরচ</Text>
              <Text style={[styles.reportKpiValue, { color: '#FFFFFF', fontSize: 24 }]}>
                ৳ {formatMoney(
                  (cashEntries || [])
                    .filter((e) => e.category === 'cost')
                    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
                )}
              </Text>
            </View>
          </View>

          <ScrollView style={{ flex: 1 }}>
            <Text style={styles.reportSectionTitle}>খরচের তালিকা</Text>
            {(cashEntries || []).filter((e) => e.category === 'cost').length === 0 ? (
              <View style={{ padding: 30, alignItems: 'center' }}>
                <Text style={{ color: COLORS.textMuted }}>কোনো খরচের হিসাব নেই</Text>
              </View>
            ) : (
              (cashEntries || [])
                .filter((e) => e.category === 'cost')
                .map((costItem, idx) => (
                  <View key={costItem.id || idx} style={styles.reportRowCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reportRowName}>{costItem.desc || 'দোকান খরচ'}</Text>
                      <Text style={styles.reportRowSub}>{costItem.date} • {costItem.time || ''}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.reportRowAmt, { color: COLORS.red }]}>
                        - ৳ {formatMoney(costItem.amount)}
                      </Text>
                      <Text style={[styles.reportRowBadge, { backgroundColor: '#FEE2E2', color: COLORS.red }]}>
                        খরচ
                      </Text>
                    </View>
                  </View>
                ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>


      {/* 7. MALIK REPORT */}
      <Modal
        visible={modalMalikReport}
        animationType="slide"
        onRequestClose={() => setModalMalikReport(false)}
      >
        <SafeAreaView style={styles.reportContainer}>
          <View style={styles.reportHeader}>
            <TouchableOpacity onPress={() => setModalMalikReport(false)} style={styles.reportHeaderBack}>
              <Text style={styles.reportHeaderBackText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.reportHeaderTitle}>মালিকের হিসাব (মূলধন ও ব্যক্তিগত)</Text>
            <TouchableOpacity
              style={styles.reportHeaderAction}
              onPress={() => {
                Share.share({
                  message: `${businessName} - মালিকের হিসাব`,
                });
              }}
            >
              <Text style={styles.reportHeaderActionText}>শেয়ার</Text>
            </TouchableOpacity>
          </View>

          {(() => {
            const malikIn = (cashEntries || [])
              .filter((e) => e.category === 'malik_in')
              .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
            const malikOut = (cashEntries || [])
              .filter((e) => e.category === 'malik_out')
              .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
            const malikNet = malikIn - malikOut;
            return (
              <ScrollView style={{ flex: 1 }}>
                <View style={styles.reportKpiRow}>
                  <View style={styles.reportKpiCard}>
                    <Text style={styles.reportKpiLabel}>মালিক দিল (মূলধন যোগ)</Text>
                    <Text style={[styles.reportKpiValue, { color: COLORS.blue }]}>
                      ৳ {formatMoney(malikIn)}
                    </Text>
                  </View>
                  <View style={styles.reportKpiCard}>
                    <Text style={styles.reportKpiLabel}>মালিক নিল (উত্তোলন)</Text>
                    <Text style={[styles.reportKpiValue, { color: '#D97706' }]}>
                      ৳ {formatMoney(malikOut)}
                    </Text>
                  </View>
                </View>

                <View style={[styles.reportSubKpiRow, { paddingBottom: 6 }]}>
                  <View style={[styles.reportSubKpiCard, { flex: 1 }]}>
                    <Text style={styles.reportSubKpiLabel}>মালিকের নীট ব্যালেন্স</Text>
                    <Text style={[styles.reportSubKpiValue, { fontSize: 16, color: malikNet >= 0 ? COLORS.blue : '#D97706' }]}>
                      ৳ {formatMoney(malikNet)} {malikNet >= 0 ? '(ব্যবসায় বিনিয়োগ)' : '(উত্তোলন)'}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 14, marginVertical: 8 }}>
                  <TouchableOpacity
                    style={[styles.modalBtnSubmit, { flex: 1, backgroundColor: COLORS.blue }]}
                    onPress={() => {
                      setCashCategory('malik_in');
                      setCashType('in');
                      setModalMalikReport(false);
                      setModalAddCash(true);
                    }}
                  >
                    <Text style={styles.modalBtnSubmitText}>+ মালিক দিল (মূলধন)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtnSubmit, { flex: 1, backgroundColor: '#D97706' }]}
                    onPress={() => {
                      setCashCategory('malik_out');
                      setCashType('out');
                      setModalMalikReport(false);
                      setModalAddCash(true);
                    }}
                  >
                    <Text style={styles.modalBtnSubmitText}>- মালিক নিল (উত্তোলন)</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.reportSectionTitle}>মালিকের লেনদেন ইতিহাস</Text>
                {(cashEntries || []).filter((e) => e.category === 'malik_in' || e.category === 'malik_out').length === 0 ? (
                  <View style={{ padding: 30, alignItems: 'center' }}>
                    <Text style={{ color: COLORS.textMuted }}>কোনো লেনদেন রেকর্ড নেই</Text>
                  </View>
                ) : (
                  (cashEntries || [])
                    .filter((e) => e.category === 'malik_in' || e.category === 'malik_out')
                    .map((mItem, idx) => (
                      <View key={mItem.id || idx} style={styles.reportRowCard}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.reportRowName}>
                            {mItem.category === 'malik_in' ? 'মালিক দিল (মূলধন)' : 'মালিক নিল (উত্তোলন)'}
                          </Text>
                          <Text style={styles.reportRowSub}>{mItem.date} • {mItem.time || ''} {mItem.desc ? `• ${mItem.desc}` : ''}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[styles.reportRowAmt, { color: mItem.category === 'malik_in' ? COLORS.blue : '#D97706' }]}>
                            {mItem.category === 'malik_in' ? '+' : '-'} ৳ {formatMoney(mItem.amount)}
                          </Text>
                          <Text
                            style={[
                              styles.reportRowBadge,
                              {
                                backgroundColor: mItem.category === 'malik_in' ? '#DBEAFE' : '#FEF3C7',
                                color: mItem.category === 'malik_in' ? COLORS.blue : '#D97706',
                              },
                            ]}
                          >
                            {mItem.category === 'malik_in' ? 'মূলধন' : 'উত্তোলন'}
                          </Text>
                        </View>
                      </View>
                    ))
                )}
              </ScrollView>
            );
          })()}
        </SafeAreaView>
      </Modal>

      {/* 8. MONEY OUT */}
      <Modal
        visible={modalMoneyOut}
        animationType="slide"
        transparent
        onRequestClose={() => setModalMoneyOut(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { padding: 18 }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>টাকা উত্তোলন / ট্রান্সফার</Text>
              <TouchableOpacity onPress={() => setModalMoneyOut(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.moneyOutBalCard}>
              <Text style={styles.moneyOutBalLabel}>বর্তমান টালিপে ব্যালেন্স</Text>
              <Text style={styles.moneyOutBalValue}>৳ {formatMoney(walletBalance)}</Text>
            </View>

            <Text style={styles.inputLabel}>ট্রান্সফার মেথড নির্বাচন করুন</Text>
            <View style={styles.moneyOutMethodGrid}>
              {[
                { id: 'bank', name: 'ব্যাংক একাউন্ট', icon: '🏦' },
                { id: 'bkash', name: 'বিকাশ', icon: '📱' },
                { id: 'nagad', name: 'নগদ', icon: '💸' },
              ].map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.moneyOutMethodCard, moneyOutMethod === m.id && styles.moneyOutMethodCardActive]}
                  onPress={() => setMoneyOutMethod(m.id)}
                >
                  <Text style={{ fontSize: 22 }}>{m.icon}</Text>
                  <Text style={[styles.moneyOutMethodText, moneyOutMethod === m.id && styles.moneyOutMethodTextActive]}>
                    {m.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>
              {moneyOutMethod === 'bank' ? 'ব্যাংক একাউন্ট নম্বর' : 'মোবাইল একাউন্ট নম্বর'}
            </Text>
            <TextInput
              style={styles.modalSimpleInput}
              placeholder={moneyOutMethod === 'bank' ? 'যেমন: ২০৫.১২০.XXXX' : 'যেমন: ০১৭XXXXXXXX'}
              placeholderTextColor={COLORS.textSubtle}
              keyboardType="numeric"
              value={moneyOutAccNumber}
              onChangeText={setMoneyOutAccNumber}
            />

            <Text style={styles.inputLabel}>উত্তোলনের পরিমাণ (টাকা) *</Text>
            <TextInput
              style={styles.modalBigInput}
              placeholder="৳ ০"
              placeholderTextColor={COLORS.textSubtle}
              keyboardType="numeric"
              value={moneyOutAmount}
              onChangeText={setMoneyOutAmount}
            />

            <View style={[styles.modalBtnRow, { marginTop: 14 }]}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setModalMoneyOut(false)}
              >
                <Text style={styles.modalBtnCancelText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.primary }]}
                onPress={handleMoneyOut}
              >
                <Text style={styles.modalBtnSubmitText}>ট্রান্সফার নিশ্চিত করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      {/* ===================================================================
          AUTHENTIC MODAL: TALLY MESSAGE (টালি-মেসেজ)
         =================================================================== */}
      <Modal
        visible={modalTallyMessage}
        animationType="slide"
        transparent
        onRequestClose={() => setModalTallyMessage(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Image
                  source={require('./assets/icons/grid_tally_msg.png')}
                  style={{ width: 28, height: 28, marginRight: 8 }}
                  resizeMode="contain"
                />
                <Text style={styles.modalCardTitle}>টালি-মেসেজ সার্ভিস</Text>
              </View>
              <TouchableOpacity onPress={() => setModalTallyMessage(false)}>
                <Image
                  source={require('./assets/icons/ic_close.png')}
                  style={{ width: 20, height: 20, tintColor: '#6B7280' }}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingVertical: 12 }}>
              {/* Quota Card */}
              <View style={{ backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#FCA5A5' }}>
                <Text style={{ fontSize: 13, color: '#991B1B', fontWeight: '600' }}>আপনার ফ্রি এসএমএস ব্যালেন্স</Text>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#B81414', marginVertical: 4 }}>
                  {toBengaliNumber(tallyMessageBalance)} টি অবশিষ্ট
                </Text>
                <Text style={{ fontSize: 12, color: '#6B7280' }}>
                  প্রতিটি লেনদেন ও তাগাদার সাথে স্বয়ংক্রিয়ভাবে কাস্টমারকে ফ্রি মেসেজ পাঠানো হয়।
                </Text>
              </View>

              {/* Message Bundles */}
              <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#111827', marginBottom: 10 }}>এসএমএস প্যাকেজ</Text>
              {[
                { count: 100, price: 50, tag: 'জনপ্রিয়' },
                { count: 250, price: 120, tag: 'বেস্ট ভ্যালু' },
                { count: 500, price: 220, tag: 'সুপার সেভার' },
                { count: 1000, price: 400, tag: 'বিগ সেভিং' },
              ].map((pkg, idx) => (
                <View
                  key={idx}
                  style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 8 }}
                >
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#111827' }}>{toBengaliNumber(pkg.count)} এসএমএস</Text>
                      <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 8 }}>
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#B45309' }}>{pkg.tag}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>মেয়াদ আজীবন • কোনো মেয়াদ নেই</Text>
                  </View>
                  <TouchableOpacity
                    style={{ backgroundColor: '#B81414', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 }}
                    onPress={() => {
                      setTallyMessageBalance(prev => prev + pkg.count);
                      Alert.alert('অভিনন্দন!', `${toBengaliNumber(pkg.count)} টি এসএমএস সফলভাবে আপনার অ্যাকাউন্টে যোগ হয়েছে।`);
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 }}>৳ {toBengaliNumber(pkg.price)}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>





    </SafeAreaView>
  );
}



// =========================================================================
// 5. AUTHENTIC TALLYKHATA STYLESHEET (All 255 Keys Verified)
// =========================================================================
const styles = StyleSheet.create({
  // --- AUTHENTIC 1:1 VISUAL PARITY STYLES (photo_2026-10-15_18-13-34.jpg) ---
  topHeaderBarRed: {
    backgroundColor: '#B81414',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeftPillContainer: {
    alignItems: 'flex-start',
  },
  headerBizPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBizPillText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginRight: 6,
  },
  headerBizPillArrow: {
    width: 10,
    height: 10,
    tintColor: '#000000',
  },
  headerSubtitleWhite: {
    fontSize: 13,
    color: '#FFFFFF',
    marginTop: 4,
    marginLeft: 6,
    fontWeight: '500',
  },
  headerRightActionsRed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerWhiteActionBtn: {
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  headerWhiteActionIcon: {
    width: 24,
    height: 24,
  },
  headerActionLabelWhite: {
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 3,
    fontWeight: '500',
  },
  headerBadgeWhite: {
    position: 'absolute',
    top: -5,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: '#B81414',
  },
  headerBadgeWhiteText: {
    color: '#B81414',
    fontSize: 9,
    fontWeight: 'bold',
  },

  // Yellow Promo Banner
  promoBannerCard: {
    backgroundColor: '#FFFED402',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEF08A',
  },
  promoBannerImg: {
    width: 66,
    height: 76,
  },
  promoBannerTextCol: {
    flex: 1,
    marginLeft: 14,
  },
  promoBannerBold: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000',
    lineHeight: 28,
  },
  promoBannerSub: {
    fontSize: 10,
    color: '#374151',
    alignSelf: 'flex-end',
    marginTop: 2,
  },

  // 8-Item Quick Grid
  quickGridContainer: {
    marginHorizontal: 8,
    marginTop: 8,
    marginBottom: 6,
  },
  quickGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  quickGridItem: {
    width: '24%',
    alignItems: 'center',
    paddingVertical: 6,
  },
  quickGridIcon: {
    width: 44,
    height: 44,
  },
  quickGridLabel: {
    fontSize: 12,
    color: '#1F2937',
    marginTop: 6,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Summary Card
  summaryCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  summaryCardCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryCardAmountRed: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#B81414',
  },
  summaryCardAmountGreen: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C7D50',
  },
  summaryCardLabel: {
    fontSize: 13,
    color: '#111827',
    marginTop: 4,
  },
  summaryCardDivider: {
    width: 1,
    height: 38,
    backgroundColor: '#E5E7EB',
  },

  // Search Pill & Counter Strip
  searchPillBar: {
    backgroundColor: '#F5F5F5',
    borderRadius: 24,
    marginHorizontal: 16,
    marginTop: 6,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  counterStripRow: {
    paddingHorizontal: 20,
    marginTop: 14,
    marginBottom: 8,
  },
  counterStripText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '500',
  },

  // Customer List Rows
  customerListCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  customerAvatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  customerAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  customerCardName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  customerCardTime: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 3,
  },
  customerCardAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#B81414',
    marginRight: 8,
  },
  customerChevron: {
    fontSize: 18,
    color: '#9CA3AF',
    fontWeight: 'bold',
  },

  // Floating Round FAB
  floatingRoundFab: {
    position: 'absolute',
    bottom: 20,
    right: 18,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#B81414',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    zIndex: 10,
  },

  // Active Pill on Bottom Nav
  tabActivePill: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },

  // --- BASE & APP CONTAINER ---
  container: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },

  // --- CRASH SAFETY & ERROR BOUNDARY ---
  errorSafeContainer: {
    flex: 1,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    maxWidth: 420,
    width: '100%',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#B81414',
    marginBottom: 8,
  },
  errorDetails: {
    fontSize: 13,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorRetryBtn: {
    backgroundColor: '#B81414',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  errorRetryBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },

  // --- PIN SECURITY LOCK SCREEN ---
  pinLockContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  pinLockIcon: {
    fontSize: 54,
    marginBottom: 16,
  },
  pinLockTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  pinLockSub: {
    fontSize: 14,
    color: '#FFF0F1',
    textAlign: 'center',
    marginBottom: 32,
  },
  pinDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    gap: 16,
  },
  pinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: '#FFFFFF',
  },
  pinKeypad: {
    width: '100%',
    maxWidth: 320,
  },
  pinKeyBtn: {
    flex: 1,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 6,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  pinKeyText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // --- AUTHENTIC TOP HEADER BAR ---
  topHeaderBar: {
    backgroundColor: '#FFF0F1',
    borderBottomWidth: 1,
    borderBottomColor: '#FBD5D5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeftBiz: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerStoreIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#B81414',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerBizName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  headerBizPhone: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  headerGoldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  headerGoldBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#92400E',
  },
  headerVerifyBtn: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  headerVerifyText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconTouch: {
    position: 'relative',
    padding: 6,
  },
  headerActionIcon: {
    fontSize: 20,
    color: '#B81414',
  },
  headerRedDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
  },

  // --- HOME TAB SELECTOR (কাস্টমার / সাপ্লায়ার) ---
  homeTabSelectorRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  homeTabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  homeTabBtnActive: {
    borderBottomColor: '#B81414',
  },
  homeTabBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  homeTabBtnTextActive: {
    color: '#B81414',
    fontWeight: 'bold',
  },

  // --- METRIC DASHBOARD CARDS (পাবো / দিবো) ---
  dashboardRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 6,
    gap: 10,
  },
  dashboardCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  dashLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 4,
  },
  dashAmount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  dashMuted: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },

  // --- FILTER PILLS ---
  filterPillRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
  },
  filterPillActive: {
    backgroundColor: '#B81414',
  },
  filterPillText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  // --- SEARCH BAR ---
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchTextInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: '#1A1A1A',
  },

  // --- FLOATING ADD BUTTON ---
  floatingAddBtn: {
    position: 'absolute',
    bottom: 74,
    right: 18,
    backgroundColor: '#B81414',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 28,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  floatingAddBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },

  // --- ACCOUNT LIST ITEMS ---
  accountCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  accAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF0F1',
    borderWidth: 1,
    borderColor: '#FBD5D5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accAvatarLetter: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#B81414',
  },
  accCardName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  accCardPhone: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  accCardAddress: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
  accBalanceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  accTypeBadge: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 2,
  },

  // --- EMPTY STATES ---
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4B5563',
    marginBottom: 4,
  },
  emptySubText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },

  // --- ACCOUNT LEDGER SCREEN ---
  ledgerHeaderNav: {
    backgroundColor: '#FFF0F1',
    borderBottomWidth: 1,
    borderBottomColor: '#FBD5D5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    padding: 6,
  },
  backBtnText: {
    fontSize: 22,
    color: '#B81414',
    fontWeight: 'bold',
  },
  ledgerHeaderTitleBox: {
    flex: 1,
    marginLeft: 10,
  },
  ledgerHeaderName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  ledgerHeaderSub: {
    fontSize: 12,
    color: '#6B7280',
  },
  headerIconBtn: {
    padding: 6,
  },
  accountProfileCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    margin: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF0F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#B81414',
  },
  profileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  profilePhone: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  profileAddress: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
  profileDueLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
  },
  profileDueAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'right',
    marginTop: 2,
  },

  // Ledger Quick Actions (কল, তাগাদা, মেসেজ)
  ledgerQuickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginBottom: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickActionItem: {
    alignItems: 'center',
  },
  quickActionEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  quickActionLabel: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },

  // Ledger Table
  ledgerTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 12,
    borderRadius: 6,
  },
  ledgerColHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4B5563',
  },
  ledgerRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  ledgerRowDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  ledgerRowDesc: {
    fontSize: 13,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  ledgerRowBalance: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  ledgerGivenAmount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#DC2626',
    textAlign: 'right',
  },
  ledgerReceivedAmount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F8A0F',
    textAlign: 'right',
  },

  // Bottom Fixed Ledger Action Bar (- দিলাম / + পেলাম)
  ledgerBottomBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
  bigEntryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bigEntryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // --- CASHBOX TAB & SCREEN ---
  cashTopCard: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    margin: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  cashTotalDisplay: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0F8A0F',
    marginVertical: 6,
  },
  cashTopCardSub: {
    fontSize: 13,
    color: '#6B7280',
  },
  cashActionBigBtn: {
    backgroundColor: '#0F8A0F',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 12,
  },
  cashActionBigBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cashTodayStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 12,
    marginBottom: 10,
  },
  cashTodayStatItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cashTodayStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  cashTodayStatVal: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  cashAccountsSection: {
    backgroundColor: '#FFFFFF',
    margin: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cashAccountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cashAccountRowLabel: {
    fontSize: 14,
    color: '#1A1A1A',
  },
  cashAccountRowVal: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  cashItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 12,
    marginVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cashItemDesc: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  cashItemDate: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  cashItemAmount: {
    fontSize: 15,
    fontWeight: 'bold',
  },

  // --- TAGADA TAB ---
  tagadaHeaderCard: {
    backgroundColor: '#FFF0F1',
    borderWidth: 1,
    borderColor: '#FBD5D5',
    padding: 16,
    margin: 12,
    borderRadius: 12,
  },
  tagadaHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#B81414',
  },
  tagadaHeaderCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#B81414',
    marginVertical: 4,
  },
  tagadaHeaderSub: {
    fontSize: 12,
    color: '#6B7280',
  },
  tagadaCardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tagadaCustName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  tagadaCustPhone: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  tagadaCustDue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#DC2626',
    textAlign: 'right',
  },
  tagadaActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 4,
  },
  tagadaActionBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // --- TALLYPAY TAB ---
  walletCard: {
    backgroundColor: '#B81414',
    margin: 12,
    padding: 20,
    borderRadius: 14,
    elevation: 3,
  },
  walletCardSub: {
    fontSize: 13,
    color: '#FFF0F1',
  },
  walletBalanceDisplay: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginVertical: 8,
  },
  walletMerchantId: {
    fontSize: 12,
    color: '#FFF0F1',
    opacity: 0.9,
  },
  walletActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginBottom: 12,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  walletServiceBtn: {
    alignItems: 'center',
  },
  walletServiceIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF0F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  walletServiceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1A1A',
  },

  // --- MENU TAB (আরও) ---
  menuProfileHeader: {
    backgroundColor: '#FFF0F1',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#FBD5D5',
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuStoreAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#B81414',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuBizName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  menuBizAddress: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  menuOwnerInfo: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 1,
  },
  menuEditBizBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#B81414',
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  menuEditBizBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  menuListContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  menuListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuListEmoji: {
    fontSize: 22,
    marginRight: 14,
  },
  menuListTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  menuListSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  menuListArrow: {
    fontSize: 18,
    color: '#9CA3AF',
  },

  // --- 5-BUTTON BOTTOM NAVIGATION BAR ---
  bottomTabBar: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 4,
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
  },
  tabButtonActive: {
    borderTopWidth: 2,
    borderTopColor: '#B81414',
  },
  tabIconImg: {
    width: 24,
    height: 24,
    marginBottom: 3,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  tabButtonLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  tabButtonLabelActive: {
    color: '#B81414',
    fontWeight: 'bold',
  },

  // --- CALCULATOR KEYPAD & QUICK CHIPS ---
  calcDisplayBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    marginVertical: 10,
    alignItems: 'flex-end',
  },
  calcExprText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  calcTotalText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  quickChipRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 8,
  },
  quickChip: {
    flex: 1,
    backgroundColor: '#FFF0F1',
    borderWidth: 1,
    borderColor: '#FBD5D5',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickChipText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#B81414',
  },
  keypadGrid: {
    marginTop: 8,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  keypadBtn: {
    flex: 1,
    height: 52,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keypadBtnOp: {
    backgroundColor: '#FEF3C7',
  },
  keypadBtnSpecial: {
    backgroundColor: '#FEE2E2',
  },
  keypadBtnText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  keypadBtnTextOp: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#D97706',
  },
  keypadBtnTextSpecial: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  descChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    marginRight: 6,
    marginBottom: 6,
  },
  descChipText: {
    fontSize: 12,
    color: '#4B5563',
  },

  // --- MODALS COMMON STYLES ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalCardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginTop: 10,
    marginBottom: 4,
  },
  modalSimpleInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1A1A1A',
  },
  modalBigInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1A1A1A',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
  },
  modalBtnCancelText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4B5563',
  },
  modalBtnSubmit: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#B81414',
    alignItems: 'center',
  },
  modalBtnSubmitText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // Toggle & Filter Chips in Modals
  categorySelectChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 6,
    marginBottom: 6,
  },
  categorySelectChipActive: {
    backgroundColor: '#FFF0F1',
    borderColor: '#B81414',
  },
  categorySelectChipText: {
    fontSize: 12,
    color: '#4B5563',
  },
  categorySelectChipTextActive: {
    color: '#B81414',
    fontWeight: 'bold',
  },
  paymentMethodChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  paymentMethodChipActive: {
    backgroundColor: '#FFF0F1',
    borderColor: '#B81414',
  },
  paymentMethodChipText: {
    fontSize: 13,
    color: '#4B5563',
  },
  paymentMethodChipTextActive: {
    color: '#B81414',
    fontWeight: 'bold',
  },
  accTypeToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 10,
  },
  accTypeToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  accTypeToggleBtnActiveRed: {
    backgroundColor: '#B81414',
    borderColor: '#B81414',
  },
  accTypeToggleBtnActiveGreen: {
    backgroundColor: '#0F8A0F',
    borderColor: '#0F8A0F',
  },
  accTypeToggleText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4B5563',
  },
  deleteAccBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  deleteAccBtnText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },

  // --- DIGITAL VOUCHER MEMO ---
  voucherContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  voucherHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 12,
    marginBottom: 12,
  },
  voucherBizName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  voucherBizSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  voucherBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  voucherBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  voucherDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 10,
  },
  voucherDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  voucherLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  voucherVal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  voucherActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  voucherBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  voucherBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#374151',
  },

  // --- BANGLA QR MODAL ---
  qrDisplayContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginVertical: 12,
  },
  qrCenterBadge: {
    marginTop: 10,
    backgroundColor: '#B81414',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
  },
  qrCodeBtn: {
    backgroundColor: '#B81414',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  qrCodeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // --- STOCK & INVENTORY ---
  stockSummaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  stockSummaryBox: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  stockSummaryBoxLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  stockSummaryBoxVal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  stockItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  stockItemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  stockItemSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  stockQtyText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#B81414',
  },
  stockAdjustMiniBtn: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 6,
  },
  stockAdjustMiniBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
  },

  // --- BUSINESS NOTES & CHECKLIST ---
  noteItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  noteItemText: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
    marginLeft: 10,
  },
  noteItemTextDone: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },

  // --- RECONCILE CASH ---
  reconcileBox: {
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  reconcileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  reconcileLabel: {
    fontSize: 13,
    color: '#4B5563',
  },
  reconcileVal: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  reconcileBtn: {
    backgroundColor: '#0F8A0F',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  reconcileBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  reconcileResultBox: {
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },

  // --- TAGADA MESSAGE MODAL ---
  tagadaMessageBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginVertical: 12,
  },
  tagadaMessageContent: {
    fontSize: 13,
    color: '#1A1A1A',
    lineHeight: 20,
  },
  tagadaShareBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  tagadaShareBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // --- PROFIT & LOSS & FULL ACCOUNTING REPORT ---
  profitLossContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  plRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  plLabel: {
    fontSize: 14,
    color: '#374151',
  },
  plVal: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  reportSummaryBox: {
    backgroundColor: '#FFF0F1',
    borderWidth: 1,
    borderColor: '#FBD5D5',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
  },
  reportItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  reportItemTitle: {
    fontSize: 13,
    color: '#4B5563',
  },
  reportItemValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 12,
    marginBottom: 8,
  },

  // --- OFFLINE BACKUP & RESTORE ---
  backupTextArea: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    height: 110,
    fontSize: 12,
    color: '#1A1A1A',
    textAlignVertical: 'top',
    backgroundColor: '#F9FAFB',
    fontFamily: 'monospace',
  },
  backupBtn: {
    backgroundColor: '#B81414',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 6,
  },
  backupBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  offlineNoticeCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
  },
  offlineNoticeTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1D4ED8',
    marginBottom: 2,
  },
  offlineNoticeSub: {
    fontSize: 11,
    color: '#3B82F6',
    lineHeight: 16,
  },

  // --- INBOX NOTIFICATIONS ---
  inboxItem: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  inboxItemTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  inboxItemBody: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  inboxItemDate: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 6,
  },

  // --- SUPPORT & AUTHENTIC APK FAQS ---
  supportBanner: {
    backgroundColor: '#FFF0F1',
    borderWidth: 1,
    borderColor: '#FBD5D5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 14,
    alignItems: 'center',
  },
  supportBannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#B81414',
  },
  supportBannerSub: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 4,
    textAlign: 'center',
  },
  faqCard: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  faqQues: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  faqAns: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 19,
  },

  // --- AUTHENTIC REA TOOLBAR & DASHBOARD STYLES ---
  headerDotSep: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#9CA3AF',
    marginHorizontal: 6,
  },
  headerVerifyTag: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
  },
  headerToolbarActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 38,
  },
  headerToolbarActionLabel: {
    fontSize: 10,
    color: '#4D4D4D',
    fontWeight: '500',
    marginTop: 2,
  },
  cloudIconWrapper: {
    position: 'relative',
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cloudTickDot: {
    position: 'absolute',
    bottom: -1,
    right: -2,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#0F8A0F',
  },
  headerIconWithBadge: {
    position: 'relative',
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCounterBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#B81414',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCounterText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  dashboardContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dashboardVerticalDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#E6E6E6',
    marginHorizontal: 8,
  },
  searchFilterBtn: {
    padding: 6,
    marginLeft: 4,
  },
  searchDownloadBtn: {
    padding: 6,
    marginLeft: 2,
  },
  listHelperHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  listHelperTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4D4D4D',
  },
  listHelperType: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  cashTopDashboardUpper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
  },
  cashTopCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cashTopAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  cashTopLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4D4D4D',
    marginTop: 4,
  },
  cashTopDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#E6E6E6',
  },
  cashTopDashboardLower: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6FAF7',
    borderTopWidth: 1,
    borderTopColor: '#EBF3ED',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  cashSubCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cashSubLabel: {
    fontSize: 12,
    color: '#4D4D4D',
    fontWeight: '500',
  },
  cashSubAmount: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  cashSubDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#DFECE2',
  },
  cashActionBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginTop: 8,
    gap: 8,
  },
  cashActionBarBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 9,
  },
  cashAdjustBtnActive: {
    borderColor: '#FBD5D5',
    backgroundColor: '#FFF0F1',
  },
  cashActionBarBtnText: {
    fontSize: 13,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  cashEyeToggleBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cashBakiAdayStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cashBakiAdayLabel: {
    fontSize: 13,
    color: '#4D4D4D',
    fontWeight: '500',
    marginRight: 6,
  },
  cashBakiAdayVal: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  cashAccountChevron: {
    fontSize: 18,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  menuGroupHeader: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 12,
    marginBottom: 4,
  },
  menuGroupTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4B5563',
    textTransform: 'uppercase',
  },

  cashDeleteText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },

  // --- AUTHENTIC CUSTOMER LEDGER BOTTOM TOTALS (bottomLinearLayout) ---
  ledgerBottomTotalsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  ledgerBottomTotalLabel: {
    flex: 1.6,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  ledgerBottomTotalCreditBox: {
    flex: 1,
    backgroundColor: '#FFF0F1',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'flex-end',
    marginRight: 6,
  },
  ledgerBottomTotalCreditVal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#B81414',
  },
  ledgerBottomTotalReceivedBox: {
    flex: 1,
    backgroundColor: '#F0FFF4',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'flex-end',
  },
  ledgerBottomTotalReceivedVal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F8A0F',
  },

  // --- AUTHENTIC TALLYPAY WALLET PROMO CARD (layoutSqrPromo) ---
  walletPromoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  walletPromoTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 10,
  },
  walletPromoBenefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  walletPromoBenefitText: {
    fontSize: 12,
    color: '#4B5563',
    flex: 1,
    lineHeight: 18,
  },
  walletPromoCtaBtn: {
    backgroundColor: '#B81414',
    borderRadius: 24,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  walletPromoCtaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // --- AUTHENTIC TAGADA MODAL & RECEIVER CARD (layout_tagada_receiver_user_info) ---
  tagadaReceiverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tagadaReceiverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagadaReceiverAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#B81414',
  },
  tagadaReceiverName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  tagadaReceiverPhone: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  tagadaReceiverDueLabel: {
    fontSize: 11,
    color: '#B81414',
    fontWeight: '500',
  },
  tagadaReceiverDueAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#B81414',
  },
  tagadaDottedBox: {
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderStyle: 'dashed',
    backgroundColor: '#FFFBEA',
    borderRadius: 8,
    padding: 14,
    marginVertical: 8,
  },
  tagadaActionPrompt: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#374151',
    textAlign: 'center',
    marginVertical: 10,
  },
  tagadaDualBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  tagadaTallyMsgBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B81414',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  tagadaTallyMsgText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  tagadaTallyMsgSub: {
    color: '#FEE2E2',
    fontSize: 10,
    marginTop: 1,
  },
  tagadaShareAppBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  tagadaShareAppText: {
    color: '#1A1A1A',
    fontSize: 13,
    fontWeight: 'bold',
  },


  // --- BOTTOM SHEET & BUSINESS PICKER (BusinessPickerBottomSheet) ---
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
    maxHeight: '80%',
  },
  bottomSheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#D1D5DB',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 14,
  },
  bizPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    marginBottom: 10,
  },
  bizPickerItemActive: {
    borderColor: '#D32F2F',
    backgroundColor: '#FFF5F5',
  },
  bizPickerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bizPickerName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  bizPickerSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  bizPickerRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bizPickerRadioActive: {
    borderColor: '#D32F2F',
  },
  bizPickerRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#D32F2F',
  },
  bizAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#D32F2F',
    marginTop: 10,
  },
  bizAddBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 8,
  },

  // --- AUTHENTIC FULLSCREEN REPORT SCREENS ---
  reportContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D32F2F',
    paddingTop: 12,
    paddingBottom: 14,
    paddingHorizontal: 16,
    elevation: 3,
  },
  reportHeaderBack: {
    padding: 6,
    marginRight: 12,
  },
  reportHeaderBackText: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  reportHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  reportHeaderAction: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
  },
  reportHeaderActionText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  // Date Filter Segment
  reportDateBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  reportDateTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  reportDateTabActive: {
    backgroundColor: '#FEE2E2',
  },
  reportDateTabText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  reportDateTabTextActive: {
    color: '#D32F2F',
    fontWeight: 'bold',
  },

  // Authentic Report KPI Cards
  reportKpiRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  reportKpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  reportKpiLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  reportKpiValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  reportSubKpiRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
  },
  reportSubKpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  reportSubKpiLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  reportSubKpiValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 2,
  },

  // Authentic Report Ledger List
  reportSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  reportRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  reportRowName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  reportRowSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  reportRowAmt: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  reportRowBadge: {
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
    alignSelf: 'flex-end',
  },

  // --- DENOMINATIONS (activity_cash_adjustment.xml) ---
  denomContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  denomHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 6,
  },
  denomHeaderCol: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  denomItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderColor: '#F9FAFB',
  },
  denomNoteTag: {
    width: 65,
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  denomX: {
    fontSize: 12,
    color: '#9CA3AF',
    marginRight: 8,
  },
  denomQtyInput: {
    width: 65,
    height: 34,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A1A1A',
    backgroundColor: '#F9FAFB',
    padding: 0,
  },
  denomEq: {
    fontSize: 12,
    color: '#9CA3AF',
    marginHorizontal: 8,
  },
  denomSubtotal: {
    flex: 1,
    fontSize: 13,
    fontWeight: 'bold',
    color: '#374151',
    textAlign: 'right',
  },
  denomSummaryBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  denomSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  denomSummaryLabel: {
    fontSize: 13,
    color: '#4B5563',
  },
  denomSummaryVal: {
    fontSize: 14,
    fontWeight: 'bold',
  },

  // --- MONEY OUT / WALLET TRANSFER (TpTransferActivity) ---
  moneyOutBalCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  moneyOutBalLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  moneyOutBalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  moneyOutMethodGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  moneyOutMethodCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  moneyOutMethodCardActive: {
    borderColor: '#D32F2F',
    backgroundColor: '#FFF5F5',
  },
  moneyOutMethodText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 6,
  },
  moneyOutMethodTextActive: {
    color: '#D32F2F',
    fontWeight: 'bold',
  },

});

// Wrap root component with crash-proof ErrorBoundary
export default function App() {
  return (
    <ErrorBoundary>
      <TallyKhataApp />
    </ErrorBoundary>
  );
}
