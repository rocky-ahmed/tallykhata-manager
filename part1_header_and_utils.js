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
const STORAGE_KEY = 'tallykhata_offline_store_v4';

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
  { id: '1', name: 'মো: রফিকুল ইসলাম', phone: '01711223344', type: 1, balance: 3200, address: 'বাজার মোড়', createDate: getTodayDate() },
  { id: '2', name: 'আলমগীর স্টোর', phone: '01812345678', type: 1, balance: 1450, address: 'পশ্চিম পাড়া', createDate: getTodayDate() },
  { id: '3', name: 'মেসার্স ভাই ভাই ট্রেডার্স', phone: '01911998877', type: 2, balance: 5000, address: 'পাইকারি আড়ৎ', createDate: getTodayDate() },
  { id: '4', name: 'হাজী জেনারেল স্টোর', phone: '01622334455', type: 1, balance: 0, address: 'দক্ষিণ বাজার', createDate: getTodayDate() },
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
