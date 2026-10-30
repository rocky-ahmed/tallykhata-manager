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
  LogBox,
  Platform,
  BackHandler,
  Appearance,
  AppState,
} from 'react-native';

LogBox.ignoreAllLogs(true);
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { NavigationBar } from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';
import ledgerEngine from './src/ledgerEngine';
import * as moneyManagerService from './src/moneyManagerService';
import * as preferencesService from './src/preferencesService';
import * as themeService from './src/themeService';
import * as i18nService from './src/i18nService';

export const ThemeContext = React.createContext({
  theme: themeService.LIGHT_THEME,
  mode: 'light',
  language: 'bn',
  t: (k, params) => i18nService.t(k, 'bn', params),
});
import { storageRepository, StorageRepository, createDefaultState } from './src/storageRepository';
import {
  googleDriveBackupService,
  orchestrateCloudRestore,
  orchestrateCloudBackup,
  verifyUploadedBackupMatches,
  buildBackupPayload,
  validateBackupIntegrity,
  previewBackup,
  BACKUP_FILENAME,
} from './src/googleDriveBackupService';

// Google OAuth Configuration
// Package: com.progoti.tallykhata.offline
// Local Debug Keystore SHA-1: 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
const GOOGLE_WEB_CLIENT_ID = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) || '1009081420727-rbto5d1l56pm7743cuijuaceps4503gk.apps.googleusercontent.com';

// Initialize production storage repository adapter with AsyncStorage
storageRepository.setStorageAdapter(AsyncStorage);

const {
  generateUniqueId,
  establishAccountOpeningBalance,
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
} = ledgerEngine;

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
let activeUiLanguage = 'bn';

const toBengaliNumber = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '০';
  const num = Math.round(Number(amount));
  if (activeUiLanguage === 'en') return num.toLocaleString('en-IN');
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

const formatMoney = (amount) => {
  return toBengaliNumber(amount);
};

const toBengaliDecimal = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '০.০০';
  const num = Number(amount);
  if (activeUiLanguage === 'en') return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  const textColors = ['#0F8A0F', '#B8860B', '#1A68D1', '#B81414', '#0F8A0F', '#B8860B', '#1A68D1', '#B81414'];
  const bg = colors[index % colors.length];
  const color = textColors[index % textColors.length];
  let text = 'ক';
  if (name) {
    const trimmed = name.trim();
    const words = trimmed.split(/\s+/);
    if (words.length >= 2 && words[0].includes('.') && /[A-Za-z]/.test(words[0][0]) && /[A-Za-z]/.test(words[1][0])) {
      text = (words[0][0] + words[1][0]).toUpperCase();
    } else if (trimmed.includes('★')) {
      const firstWord = words[0];
      text = (firstWord[0] || 'C').toUpperCase() + '★';
    } else if (words.length >= 2 && words[0][0] && words[1][0] && /[A-Za-z]/.test(words[0][0])) {
      text = (words[0][0] + words[1][0]).toUpperCase();
    } else if (words[0]) {
      text = words[0].slice(0, 2);
    }
  }
  return { bg, color, text };
};

const getTodayDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDeviceLanguageTag = () => {
  try {
    const locales = Localization.getLocales();
    const firstLocale = Array.isArray(locales) ? locales[0] : null;
    return (firstLocale && (firstLocale.languageTag || firstLocale.languageCode)) || 'bn';
  } catch (e) {
    return 'bn';
  }
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

const formatDisplayDate = (dateStr, language = 'bn') => {
  if (!dateStr) return '';
  const today = getTodayDate();
  const yest = getYesterdayDate();
  if (dateStr === today) return i18nService.translateStaticText('আজ', language);
  if (dateStr === yest) return i18nService.translateStaticText('গতকাল', language);
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
            <Text style={styles.errorHeading}>{i18nService.translateStaticText("একটি সমস্যা হয়েছে", activeUiLanguage)}</Text>
            <Text style={styles.errorDetails}>
              {this.state.error ? String(this.state.error.message || this.state.error) : 'Unknown Error'}
            </Text>
            <TouchableOpacity
              style={styles.errorRetryBtn}
              onPress={() => this.setState({ hasError: false, error: null })}
            >
              <Text style={styles.errorRetryBtnText}>{i18nService.translateStaticText("পুনরায় চেষ্টা করুন", activeUiLanguage)}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.errorRetryBtn, { backgroundColor: '#4b5563', marginTop: 10 }]}
              onPress={this.handleReset}
            >
              <Text style={styles.errorRetryBtnText}>{i18nService.translateStaticText("ডাটা রিসেট করে শুরু করুন", activeUiLanguage)}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

// =========================================================================
// 3.1. REUSABLE MODERN 3D TACTILE ICON & SECTION DIVIDER SYSTEM
// =========================================================================
const ICON_THEMES = {
  primary: {
    bg: '#FEF2F2',
    borderTop: '#FFFFFF',
    borderBottom: '#FECACA',
    borderSides: '#FEE2E2',
    tint: '#B81414',
  },
  success: {
    bg: '#F0FDF4',
    borderTop: '#FFFFFF',
    borderBottom: '#BBF7D0',
    borderSides: '#DCFCE7',
    tint: '#0F8A0F',
  },
  danger: {
    bg: '#FFF1F2',
    borderTop: '#FFFFFF',
    borderBottom: '#FECDD3',
    borderSides: '#FFE4E6',
    tint: '#DC2626',
  },
  warning: {
    bg: '#FFFBEB',
    borderTop: '#FFFFFF',
    borderBottom: '#FDE68A',
    borderSides: '#FEF3C7',
    tint: '#D97706',
  },
  info: {
    bg: '#F0F9FF',
    borderTop: '#FFFFFF',
    borderBottom: '#BAE6FD',
    borderSides: '#E0F2FE',
    tint: '#0284C7',
  },
  purple: {
    bg: '#FAF5FF',
    borderTop: '#FFFFFF',
    borderBottom: '#E9D5FF',
    borderSides: '#F3E8FF',
    tint: '#7C3AED',
  },
  neutral: {
    bg: '#F8FAFC',
    borderTop: '#FFFFFF',
    borderBottom: '#E2E8F0',
    borderSides: '#EDF2F7',
    tint: '#4B5563',
  },
  white: {
    bg: 'rgba(255, 255, 255, 0.2)',
    borderTop: 'rgba(255, 255, 255, 0.6)',
    borderBottom: 'rgba(0, 0, 0, 0.15)',
    borderSides: 'rgba(255, 255, 255, 0.3)',
    tint: '#FFFFFF',
  },
};

const AppIcon = ({
  source,
  size = 22,
  containerSize = 38,
  variant = 'neutral',
  shape = 'rounded',
  tintColor,
  style,
  imageStyle,
  accessibilityLabel,
  themeMode,
}) => {
  const ctx = React.useContext(ThemeContext);
  const resolvedMode = themeMode || (ctx && ctx.mode) || 'light';
  const theme = themeService.getIconTheme(variant, resolvedMode);
  const resolvedTint = tintColor !== undefined ? tintColor : theme.tint;

  if (shape === 'none') {
    return (
      <Image
        source={source}
        style={[{ width: size, height: size }, resolvedTint ? { tintColor: resolvedTint } : {}, imageStyle]}
        resizeMode="contain"
        accessibilityLabel={accessibilityLabel}
      />
    );
  }

  const isCircle = shape === 'circle';
  const radius = isCircle ? containerSize / 2 : 10;

  return (
    <View
      style={[
        {
          width: containerSize,
          height: containerSize,
          borderRadius: radius,
          backgroundColor: theme.bg,
          borderTopWidth: 1.5,
          borderTopColor: theme.borderTop,
          borderBottomWidth: 2.5,
          borderBottomColor: theme.borderBottom,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: theme.borderSides,
          justifyContent: 'center',
          alignItems: 'center',
          elevation: 2,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.08,
          shadowRadius: 2,
        },
        style,
      ]}
      accessibilityLabel={accessibilityLabel}
    >
      <Image
        source={source}
        style={[{ width: size, height: size }, resolvedTint ? { tintColor: resolvedTint } : {}, imageStyle]}
        resizeMode="contain"
      />
    </View>
  );
};

const TwoToneDivider = ({ style, marginVertical = 6 }) => {
  const ctx = React.useContext(ThemeContext);
  const isDark = ctx && ctx.mode === 'dark';
  return (
    <View style={[{ width: '100%', marginVertical }, style]}>
      <View style={{ height: 1, backgroundColor: isDark ? '#334155' : '#E2E8F0' }} />
      <View style={{ height: 1, backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }} />
    </View>
  );
};

const TwoToneVerticalDivider = ({ height = 32, style }) => {
  const ctx = React.useContext(ThemeContext);
  const isDark = ctx && ctx.mode === 'dark';
  return (
    <View style={[{ flexDirection: 'row', height, alignItems: 'center' }, style]}>
      <View style={{ width: 1, height: '100%', backgroundColor: isDark ? '#334155' : '#E2E8F0' }} />
      <View style={{ width: 1, height: '100%', backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }} />
    </View>
  );
};

const SectionHeader = ({ title, count, badge, actionText, onAction, style }) => {
  const ctx = React.useContext(ThemeContext);
  const isDark = ctx && ctx.mode === 'dark';
  const theme = ctx ? ctx.theme : themeService.LIGHT_THEME;
  return (
    <View style={[styles.sectionHeaderRow, style]}>
      <View style={styles.sectionHeaderLeft}>
        <View style={styles.sectionHeaderAccentPill} />
        <Text style={[styles.sectionHeaderTitle, isDark && { color: theme.textPrimary }]}>{title}</Text>
        {count !== undefined && (
          <View style={[styles.sectionHeaderCountBadge, isDark && { backgroundColor: theme.cardBorder }]}>
            <Text style={[styles.sectionHeaderCountText, isDark && { color: theme.textSecondary }]}>{count}</Text>
          </View>
        )}
        {badge && (
          <View style={styles.sectionHeaderBadge}>
            <Text style={styles.sectionHeaderBadgeText}>{badge}</Text>
          </View>
        )}
      </View>
      {actionText && (
        <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={0.7}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.sectionHeaderAction, isDark && { color: theme.primary }]}>{actionText}</Text>
            <Image
              source={require('./assets/icons/arrow_right.png')}
              style={{ width: 11, height: 11, tintColor: isDark ? theme.primary : COLORS.primary, marginLeft: 3 }}
              resizeMode="contain"
            />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

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
  const [isSaving, setIsSaving] = useState(false);
  // Navigation & Tabs
  const [currentScreen, setCurrentScreen] = useState('home'); // 'home' | 'account_ledger'
  const [activeTab, setActiveTab] = useState('home');         // 'home' | 'cashbox' | 'tagada' | 'tallypay' | 'menu'

  const currentScreenRef = useRef(currentScreen);
  currentScreenRef.current = currentScreen;
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  // Business Profile
  const [activeBusinessId, setActiveBusinessId] = useState('1');
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
  const pinEnabledRef = useRef(pinEnabled);
  pinEnabledRef.current = pinEnabled;

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
  const [modalTxnLimit, setModalTxnLimit] = useState(false);
  const [txnLimitTab, setTxnLimitTab] = useState('limits'); // 'limits' | 'charges'
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

  // --- GOOGLE DRIVE BACKUP & RESTORE STATES ---
  const [backupActiveTab, setBackupActiveTab] = useState('cloud'); // 'cloud' | 'offline'
  const [googleUser, setGoogleUser] = useState(null); // { sub, email, name, picture }
  const [googleAccessToken, setGoogleAccessToken] = useState('');
  const [cloudBackupMetadata, setCloudBackupMetadata] = useState(null);
  const [cloudBackupStatus, setCloudBackupStatus] = useState('idle'); // 'idle' | 'checking' | 'backing_up' | 'restoring' | 'success' | 'error'
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [cloudRestoreConfirmVisible, setCloudRestoreConfirmVisible] = useState(false);
  const [restoreDomain, setRestoreDomain] = useState('all'); // 'all' | 'business' | 'moneyManager'

  const getSelectedRestoreDomains = (dom = restoreDomain) => {
    if (dom === 'business') return ['business'];
    if (dom === 'moneyManager') return ['moneyManager'];
    return ['all'];
  };

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

  // ===================================================================
    // GLOBAL APP PREFERENCES (থিম ও ভাষা)
  const [appTheme, setAppTheme] = useState('light'); // 'light' | 'dark' | 'system'
  const [appLanguage, setAppLanguage] = useState('bn'); // 'bn' | 'en' | 'system'
  const [systemColorScheme, setSystemColorScheme] = useState(() => {
    try {
      return (typeof Appearance !== 'undefined' && Appearance.getColorScheme && Appearance.getColorScheme()) || 'light';
    } catch (e) {
      return 'light';
    }
  });
  const [systemLocale, setSystemLocale] = useState(() => {
    return getDeviceLanguageTag();
  });

  const [modalThemePicker, setModalThemePicker] = useState(false);
  const [modalLanguagePicker, setModalLanguagePicker] = useState(false);

  useEffect(() => {
    const sub = (typeof Appearance !== 'undefined' && Appearance.addChangeListener)
      ? Appearance.addChangeListener(({ colorScheme }) => {
          setSystemColorScheme(colorScheme || 'light');
        })
      : null;
    const appStateSub = (typeof AppState !== 'undefined' && AppState.addEventListener)
      ? AppState.addEventListener('change', (nextState) => {
          if (nextState === 'background' || nextState === 'inactive') {
            if (pinEnabledRef.current) {
              setIsLocked(true);
            }
          } else if (nextState === 'active') {
            try {
              if (typeof Appearance !== 'undefined' && Appearance.getColorScheme) {
                setSystemColorScheme(Appearance.getColorScheme() || 'light');
              }
              setSystemLocale(getDeviceLanguageTag());
            } catch (e) {}
          }
        })
      : null;
    return () => {
      if (sub && typeof sub.remove === 'function') sub.remove();
      if (appStateSub && typeof appStateSub.remove === 'function') appStateSub.remove();
    };
  }, []);

  const effectiveTheme = preferencesService.resolveEffectiveTheme(appTheme, systemColorScheme);
  const isDark = effectiveTheme === 'dark';
  const currentTheme = themeService.getThemeTokens(effectiveTheme);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    try {
      // "light" is a light bar with dark buttons; "dark" is a dark bar with light buttons.
      NavigationBar.setStyle(isDark ? 'dark' : 'light');
    } catch (error) {
      console.warn('Could not apply Android navigation bar theme:', error);
    }
    SystemUI.setBackgroundColorAsync(currentTheme.screenBg).catch((error) => {
      console.warn('Could not apply Android system UI background:', error);
    });
  }, [isDark, currentTheme.screenBg]);

  const effectiveLanguage = preferencesService.resolveEffectiveLanguage(appLanguage, systemLocale);
  activeUiLanguage = effectiveLanguage;
  const t = (k, params) => i18nService.t(k, effectiveLanguage, params);
  const tStatic = (text) => i18nService.translateStaticText(text, effectiveLanguage);
  const tMMSeed = (kind, id, value, field = '') => (
    i18nService.translateMoneyManagerDefaultValue(kind, id, value, effectiveLanguage, field)
  );
  const tStyles = useMemo(() => {
    const base = themeService.getThemedStyles(currentTheme, isDark);
    return {
      ...base,
      text: base.textPrimary,
    };
  }, [currentTheme, isDark]);
  const formatAppNumber = (n) => (effectiveLanguage === "en" ? String(n !== undefined && n !== null ? Number(n).toLocaleString("en-IN") : "0") : toBengaliNumber(n));
  const formatMoney = (amount) => (effectiveLanguage === 'en'
    ? (Number(amount) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })
    : toBengaliNumber(amount));
  const formatMMNumber = (n) => i18nService.formatNumber((Number(n) || 0).toLocaleString('en-US'), effectiveLanguage);
  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    const normalizedDate = moneyManagerService.normalizeToLocalDate(dateStr) || String(dateStr);
    if (normalizedDate === getTodayDate()) return t('mm_today');
    if (normalizedDate === getYesterdayDate()) return t('mm_yesterday');
    if (effectiveLanguage !== 'bn') return normalizedDate;
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return normalizedDate.replace(/[0-9]/g, d => bnDigits[Number(d)]);
  };
  const getMmPeriodLabel = () => {
    if (mmPeriod === 'this_month') return t("mm_period_this_month");
    if (mmPeriod === 'last_month') return t("mm_period_last_month");
    if (mmPeriod === 'custom' && mmCustomRange && mmCustomRange.startDate && mmCustomRange.endDate) {
      return `${formatDisplayDate(mmCustomRange.startDate)} - ${formatDisplayDate(mmCustomRange.endDate)}`;
    }
    return t("mm_period_all_time");
  };
  const themeContextValue = useMemo(() => ({
    theme: currentTheme,
    mode: appTheme,
    effectiveMode: effectiveTheme,
    language: appLanguage,
    effectiveLanguage,
    t,
    tStyles,
  }), [appTheme, effectiveTheme, appLanguage, effectiveLanguage, currentTheme, tStyles]);

  const handleToggleTheme = async (newTheme) => {
    const target = newTheme || (effectiveTheme === 'dark' ? 'light' : 'dark');
    setAppTheme(target);
    try {
      await preferencesService.savePreferences(AsyncStorage, { theme: target, language: appLanguage });
    } catch (e) {
      console.warn('Failed to persist theme:', e);
    }
  };

  const handleSelectLanguage = async (newLang) => {
    setAppLanguage(newLang);
    try {
      await preferencesService.savePreferences(AsyncStorage, { theme: appTheme, language: newLang });
    } catch (e) {
      console.warn('Failed to persist language:', e);
    }
  };

  // PERSONAL MONEY MANAGER (ব্যক্তিগত অর্থ ব্যবস্থাপনা) — 100% ISOLATED
  // ===================================================================
  const [modalMoneyManager, setModalMoneyManager] = useState(false);
  const [modalMMAddTxn, setModalMMAddTxn] = useState(false);
  const [modalMMAddAccount, setModalMMAddAccount] = useState(false);
  const [modalMMSetBudget, setModalMMSetBudget] = useState(false);
  const [modalMMTransfer, setModalMMTransfer] = useState(false);
  const [mmActiveSubTab, setMmActiveSubTab] = useState("transactions"); // "transactions" | "accounts" | "budgets" | "goals" | "analytics"
  const [mmTxnFilter, setMmTxnFilter] = useState("all"); // "all" | "expense" | "income" | "transfer"
  const [mmPeriod, setMmPeriod] = useState("this_month"); // "this_month" | "last_month" | "all_time" | "custom"
  const [mmCustomRange, setMmCustomRange] = useState(null); // { startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD' }
  const [modalMMCustomDateRange, setModalMMCustomDateRange] = useState(false);
  const [mmRangeStartInput, setMmRangeStartInput] = useState('');
  const [mmRangeEndInput, setMmRangeEndInput] = useState('');
  const [mmRangeError, setMmRangeError] = useState('');
  const [mmCalendarMonth, setMmCalendarMonth] = useState(() => moneyManagerService.getLocalDateString().slice(0, 7));
  const [mmCalendarTarget, setMmCalendarTarget] = useState('startDate');
  const [mmSortOrder, setMmSortOrder] = useState("newest"); // "newest" | "oldest" | "amount_high" | "amount_low"
  const [mmSearchQuery, setMmSearchQuery] = useState("");

  const mmCalendarMonthParts = (mmCalendarMonth || getTodayDate().slice(0, 7)).split('-').map(Number);
  const mmCalendarDates = moneyManagerService.getMonthCalendarDates(mmCalendarMonthParts[0], mmCalendarMonthParts[1]);
  const mmCalendarLocale = effectiveLanguage === 'bn' ? 'bn-BD' : 'en-US';
  const mmCalendarMonthTitle = (() => {
    try {
      return new Date(mmCalendarMonthParts[0], mmCalendarMonthParts[1] - 1, 1)
        .toLocaleDateString(mmCalendarLocale, { month: 'long', year: 'numeric' });
    } catch (e) {
      return mmCalendarMonth;
    }
  })();
  const mmCalendarWeekdayKeys = [
    'mm_weekday_sun', 'mm_weekday_mon', 'mm_weekday_tue', 'mm_weekday_wed',
    'mm_weekday_thu', 'mm_weekday_fri', 'mm_weekday_sat',
  ];

  const setMMRangeInputs = (startDate, endDate, target = 'startDate') => {
    setMmRangeStartInput(startDate);
    setMmRangeEndInput(endDate);
    setMmCalendarMonth(String(startDate || moneyManagerService.getLocalDateString()).slice(0, 7));
    setMmCalendarTarget(target);
    setMmRangeError('');
  };

  const handleMMRangeDateInput = (field, value) => {
    if (field === 'startDate') setMmRangeStartInput(value);
    else setMmRangeEndInput(value);
    setMmRangeError('');
    const normalized = moneyManagerService.normalizeToLocalDate(value);
    if (normalized) setMmCalendarMonth(normalized.slice(0, 7));
  };

  const selectMMCalendarDate = (dateStr) => {
    if (mmCalendarTarget === 'startDate') {
      setMmRangeStartInput(dateStr);
      setMmCalendarTarget('endDate');
    } else {
      setMmRangeEndInput(dateStr);
    }
    setMmRangeError('');
  };

  const handleClearMMRange = async () => {
    try {
      const updatedState = moneyManagerService.updatePreferences(moneyManagerState, {
        defaultPeriod: 'this_month',
        customRange: null,
      });
      await AsyncStorage.setItem(MM_STORAGE_KEY, JSON.stringify(updatedState));
      setMoneyManagerState(updatedState);
      setMmCustomRange(null);
      setMmPeriod('this_month');
      setMmPrefDefaultPeriod('this_month');
      setMmRangeError('');
      setModalMMCustomDateRange(false);
    } catch (err) {
      Alert.alert(t('mm_alert_error'), t('mm_error_save_period'));
    }
  };

  const handleApplyMMRange = async () => {
    const result = moneyManagerService.validateCustomDateRange(mmRangeStartInput, mmRangeEndInput);
    if (!result.valid) {
      const errorKey = result.error === 'end_before_start'
        ? 'mm_invalid_date_range'
        : result.error === 'invalid_calendar_date'
          ? 'mm_invalid_calendar_date'
          : 'mm_invalid_date_format';
      setMmRangeError(t(errorKey));
      return;
    }

    const customRange = { startDate: result.startDate, endDate: result.endDate };
    try {
      const updatedState = moneyManagerService.updatePreferences(moneyManagerState, {
        defaultPeriod: 'custom',
        customRange,
      });
      await AsyncStorage.setItem(MM_STORAGE_KEY, JSON.stringify(updatedState));
      setMoneyManagerState(updatedState);
      setMmCustomRange(customRange);
      setMmPeriod('custom');
      setMmPrefDefaultPeriod('custom');
      setMmRangeError('');
      setModalMMCustomDateRange(false);
    } catch (err) {
      Alert.alert(t('mm_alert_error'), t('mm_error_save_period'));
    }
  };

  // Add Transaction Form States
  const [mmNewAmount, setMmNewAmount] = useState("");
  const [mmNewType, setMmNewType] = useState("expense"); // "expense" | "income" | "transfer"
  const [mmNewCat, setMmNewCat] = useState("cat_food");
  const [mmNewAcc, setMmNewAcc] = useState("acc_cash");
  const [mmFromAcc, setMmFromAcc] = useState("acc_bank");
  const [mmToAcc, setMmToAcc] = useState("acc_bkash");
  const [mmNewNote, setMmNewNote] = useState("");
  const [mmNewPayee, setMmNewPayee] = useState("");

  // Edit Transaction Form States
  const [modalMMEditTxn, setModalMMEditTxn] = useState(false);
  const [mmEditTxnId, setMmEditTxnId] = useState(null);
  const [mmEditAmount, setMmEditAmount] = useState("");
  const [mmEditType, setMmEditType] = useState("expense");
  const [mmEditCat, setMmEditCat] = useState("cat_food");
  const [mmEditAcc, setMmEditAcc] = useState("acc_cash");
  const [mmEditFromAcc, setMmEditFromAcc] = useState("acc_bank");
  const [mmEditToAcc, setMmEditToAcc] = useState("acc_bkash");
  const [mmEditNote, setMmEditNote] = useState("");
  const [mmEditPayee, setMmEditPayee] = useState("");

  // Add Account Form States
  const [mmNewAccName, setMmNewAccName] = useState("");
  const [mmNewAccType, setMmNewAccType] = useState("bank");
  const [mmNewAccBal, setMmNewAccBal] = useState("");
  const [mmNewAccIcon, setMmNewAccIcon] = useState("🏦");

  // Set Budget Form States
  const [mmBudgetCat, setMmBudgetCat] = useState("cat_food");
  const [mmBudgetLimit, setMmBudgetLimit] = useState("");

  // Overall Monthly Budget
  const [modalMMOverallBudget, setModalMMOverallBudget] = useState(false);
  const [mmOverallBudgetInput, setMmOverallBudgetInput] = useState("");

  // Add Custom Category Form States
  const [modalMMAddCategory, setModalMMAddCategory] = useState(false);
  const [mmNewCatName, setMmNewCatName] = useState("");
  const [mmNewCatType, setMmNewCatType] = useState("expense");
  const [mmNewCatIcon, setMmNewCatIcon] = useState("🏷️");
  const [mmNewCatColor, setMmNewCatColor] = useState("#3B82F6");
  const [mmNewCatBudget, setMmNewCatBudget] = useState("");

  // Goals Form States
  const [modalMMAddGoal, setModalMMAddGoal] = useState(false);
  const [mmGoalTitle, setMmGoalTitle] = useState("");
  const [mmGoalTarget, setMmGoalTarget] = useState("");
  const [mmGoalInitial, setMmGoalInitial] = useState("");
  const [mmGoalInitialAccount, setMmGoalInitialAccount] = useState("acc_bank");
  const [mmGoalDate, setMmGoalDate] = useState("");
  const [mmGoalIcon, setMmGoalIcon] = useState("🎯");
  const [mmGoalNote, setMmGoalNote] = useState("");

  // Deposit to Goal Form States
  const [modalMMDepositGoal, setModalMMDepositGoal] = useState(false);
  const [mmDepositGoalId, setMmDepositGoalId] = useState(null);
  const [mmDepositAmt, setMmDepositAmt] = useState("");
  const [mmDepositFromAcc, setMmDepositFromAcc] = useState("acc_bank");

  // Withdraw money from a savings goal back to an active wallet.
  const [modalMMWithdrawGoal, setModalMMWithdrawGoal] = useState(false);
  const [mmWithdrawGoalId, setMmWithdrawGoalId] = useState(null);
  const [mmWithdrawAmt, setMmWithdrawAmt] = useState("");
  const [mmWithdrawToAcc, setMmWithdrawToAcc] = useState("acc_bank");
  const [mmWithdrawMode, setMmWithdrawMode] = useState("withdraw"); // withdraw | refund-and-delete

  // Transfer Form States
  const [mmTransferAmt, setMmTransferAmt] = useState("");
  const [mmTransferFrom, setMmTransferFrom] = useState("acc_bank");
  const [mmTransferTo, setMmTransferTo] = useState("acc_bkash");
  const [mmTransferNote, setMmTransferNote] = useState("");

  // User Preferences States
  const [modalMMPreferences, setModalMMPreferences] = useState(false);
  const [mmPrefDefaultPeriod, setMmPrefDefaultPeriod] = useState("this_month");
  const [mmPrefCurrencySymbol, setMmPrefCurrencySymbol] = useState("৳");
  const [mmPrefSortOrder, setMmPrefSortOrder] = useState("newest");
  const [mmPrefShowNetWorth, setMmPrefShowNetWorth] = useState(true);
  const [mmPrefShowSavingsRate, setMmPrefShowSavingsRate] = useState(true);
  const [mmPrefShowTips, setMmPrefShowTips] = useState(true);

  // Category Edit / Archive States
  const [modalMMEditCategory, setModalMMEditCategory] = useState(false);
  const [mmEditCatId, setMmEditCatId] = useState(null);
  const [mmEditCatName, setMmEditCatName] = useState("");
  const [mmEditCatType, setMmEditCatType] = useState("expense");
  const [mmEditCatIcon, setMmEditCatIcon] = useState("🏷️");
  const [mmEditCatColor, setMmEditCatColor] = useState("#3B82F6");
  const [mmEditCatBudget, setMmEditCatBudget] = useState("");
  const [mmEditCatIsArchived, setMmEditCatIsArchived] = useState(false);
  const [mmShowArchivedCats, setMmShowArchivedCats] = useState(false);

  // Recurring Schedules States
  const [modalMMRecurring, setModalMMRecurring] = useState(false);
  const [modalMMAddRecurring, setModalMMAddRecurring] = useState(false);
  const [mmRecEditId, setMmRecEditId] = useState(null);
  const [mmRecTitle, setMmRecTitle] = useState("");
  const [mmRecType, setMmRecType] = useState("expense");
  const [mmRecAmount, setMmRecAmount] = useState("");
  const [mmRecCat, setMmRecCat] = useState("cat_utility");
  const [mmRecAcc, setMmRecAcc] = useState("acc_bank");
  const [mmRecFromAcc, setMmRecFromAcc] = useState("acc_bank");
  const [mmRecToAcc, setMmRecToAcc] = useState("acc_bkash");
  const [mmRecCadence, setMmRecCadence] = useState("monthly");
  const [mmRecNextDue, setMmRecNextDue] = useState("");
  const [mmRecNote, setMmRecNote] = useState("");
  const [mmRecPayee, setMmRecPayee] = useState("");

  const [moneyManagerState, setMoneyManagerState] = useState(() => moneyManagerService.getDefaultState(getTodayDate()));
  const [mmCatSectionTab, setMmCatSectionTab] = useState("expense");
  const mmCurrency = (moneyManagerState.preferences && moneyManagerState.preferences.currencySymbol) || "৳";
  const formatMMCurrency = (amount) => `${mmCurrency} ${formatMMNumber(amount)}`;
  const translateMMCurrencyLabel = (key) => t(key).replace(/৳/g, mmCurrency);
  const isEditingMMGoalTransfer = (moneyManagerState.transactions || []).some(
    (transaction) => transaction.id === mmEditTxnId && moneyManagerService.isGoalAllocationTransaction(transaction)
  );

  const MM_STORAGE_KEY = moneyManagerService.MM_STORAGE_KEY || "@tallykhata_personal_money_manager_v2";
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(MM_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          const sanitized = moneyManagerService.sanitizeState(
            parsed,
            moneyManagerService.getDefaultState(getTodayDate())
          );
          const processed = moneyManagerService.processRecurringTransactions(sanitized, getTodayDate());
          setMoneyManagerState(processed);
          if (sanitized.preferences && sanitized.preferences.defaultPeriod) {
            setMmPeriod(sanitized.preferences.defaultPeriod);
          }
          if (sanitized.preferences && sanitized.preferences.customRange) {
            setMmCustomRange(sanitized.preferences.customRange);
          }
          if (sanitized.preferences && sanitized.preferences.sortOrder) {
            setMmSortOrder(sanitized.preferences.sortOrder);
          }
          if (processed !== sanitized) {
            await AsyncStorage.setItem(MM_STORAGE_KEY, JSON.stringify(processed));
          }
        }
      } catch (e) {
        console.log("Error loading Money Manager state:", e);
      }
    })();
  }, []);

  useEffect(() => {
    if (!modalMoneyManager && !modalMMAddTxn && !modalMMEditTxn && !modalMMAddAccount && !modalMMSetBudget && !modalMMTransfer && !modalMMAddCategory && !modalMMOverallBudget && !modalMMAddGoal && !modalMMDepositGoal && !modalMMWithdrawGoal && !modalMMPreferences && !modalMMRecurring && !modalMMAddRecurring && !modalMMEditCategory && !modalMMCustomDateRange) return;
    const backAction = () => {
      if (modalMMCustomDateRange) { setModalMMCustomDateRange(false); return true; }
      if (modalMMPreferences) { setModalMMPreferences(false); return true; }
      if (modalMMAddRecurring) { setModalMMAddRecurring(false); return true; }
      if (modalMMRecurring) { setModalMMRecurring(false); return true; }
      if (modalMMEditCategory) { setModalMMEditCategory(false); return true; }
      if (modalMMWithdrawGoal) { setModalMMWithdrawGoal(false); return true; }
      if (modalMMDepositGoal) { setModalMMDepositGoal(false); return true; }
      if (modalMMAddGoal) { setModalMMAddGoal(false); return true; }
      if (modalMMOverallBudget) { setModalMMOverallBudget(false); return true; }
      if (modalMMAddCategory) { setModalMMAddCategory(false); return true; }
      if (modalMMEditTxn) { setModalMMEditTxn(false); return true; }
      if (modalMMAddTxn) { setModalMMAddTxn(false); return true; }
      if (modalMMAddAccount) { setModalMMAddAccount(false); return true; }
      if (modalMMSetBudget) { setModalMMSetBudget(false); return true; }
      if (modalMMTransfer) { setModalMMTransfer(false); return true; }
      if (modalMoneyManager) { setModalMoneyManager(false); return true; }
      return false;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [modalMoneyManager, modalMMAddTxn, modalMMEditTxn, modalMMAddAccount, modalMMSetBudget, modalMMTransfer, modalMMAddCategory, modalMMOverallBudget, modalMMAddGoal, modalMMDepositGoal, modalMMWithdrawGoal, modalMMPreferences, modalMMRecurring, modalMMAddRecurring, modalMMEditCategory, modalMMCustomDateRange]);

  const showMMError = (error, fallbackKey = 'mm_error_generic', titleKey = 'mm_alert_error') => {
    const message = i18nService.translateMoneyManagerError(error?.message || error, effectiveLanguage);
    Alert.alert(t(titleKey), message || t(fallbackKey));
  };

  const handleSaveMMTxn = async () => {
    try {
      const updatedState = moneyManagerService.addTransaction(moneyManagerState, {
        type: mmNewType,
        amount: mmNewAmount,
        categoryId: mmNewCat,
        accountId: mmNewAcc,
        fromAccountId: mmFromAcc,
        toAccountId: mmToAcc,
        note: mmNewNote,
        payee: mmNewPayee,
        date: getTodayDate(),
      });
      setMoneyManagerState(updatedState);
      await AsyncStorage.setItem(MM_STORAGE_KEY, JSON.stringify(updatedState));
      setMmNewAmount("");
      setMmNewNote("");
      setMmNewPayee("");
      setModalMMAddTxn(false);
      Alert.alert(t("mm_alert_success"), mmNewType === "transfer" ? t("mm_success_transfer") : t("mm_success_transaction_saved"));
    } catch (err) {
      showMMError(err, 'mm_error_save_transaction', 'mm_alert_invalid_input');
    }
  };

  const handleOpenEditMMTxn = (txn) => {
    if (!txn) return;
    setMmEditTxnId(txn.id);
    setMmEditType(txn.type || "expense");
    setMmEditAmount(String(txn.amount || ""));
    setMmEditCat(txn.categoryId || "cat_food");
    setMmEditAcc(txn.accountId || "acc_cash");
    setMmEditFromAcc(txn.fromAccountId || "acc_bank");
    setMmEditToAcc(txn.toAccountId || "acc_bkash");
    setMmEditNote(txn.note || "");
    setMmEditPayee(txn.payee || "");
    setModalMMEditTxn(true);
  };

  const handleUpdateMMTxn = async () => {
    try {
      const updatedState = moneyManagerService.editTransaction(moneyManagerState, mmEditTxnId, {
        type: mmEditType,
        amount: mmEditAmount,
        categoryId: mmEditCat,
        accountId: mmEditAcc,
        fromAccountId: mmEditFromAcc,
        toAccountId: mmEditToAcc,
        note: mmEditNote,
        payee: mmEditPayee,
      });
      setMoneyManagerState(updatedState);
      await AsyncStorage.setItem(MM_STORAGE_KEY, JSON.stringify(updatedState));
      setModalMMEditTxn(false);
      Alert.alert(t("mm_alert_success"), t("mm_success_transaction_updated"));
    } catch (err) {
      showMMError(err, 'mm_error_update_transaction', 'mm_alert_error');
    }
  };

  const handleDeleteMMTxn = (txnId) => {
    const txn = (moneyManagerState.transactions || []).find(t => t.id === txnId);
    if (!txn) return;

    Alert.alert(
      t("mm_alert_delete_transaction"),
      moneyManagerService.isGoalAllocationTransaction?.(txn)
        ? t('mm_confirm_reverse_goal_allocation')
        : t("mm_alert_confirm_delete_transaction"),
      [
        { text: t("mm_alert_cancel"), style: "cancel" },
        {
          text: t("mm_alert_delete"),
          style: "destructive",
          onPress: async () => {
            try {
              const updatedState = moneyManagerService.deleteTransaction(moneyManagerState, txnId);
              setMoneyManagerState(updatedState);
              await AsyncStorage.setItem(MM_STORAGE_KEY, JSON.stringify(updatedState));
            } catch (err) {
              showMMError(err, 'mm_error_delete_transaction', 'mm_alert_error');
            }
          }
        }
      ]
    );
  };

  const handleSaveMMAccount = async () => {
    try {
      const updatedState = moneyManagerService.addAccount(moneyManagerState, {
        name: mmNewAccName,
        type: mmNewAccType,
        balance: mmNewAccBal,
        icon: mmNewAccIcon,
      });
      setMoneyManagerState(updatedState);
      await AsyncStorage.setItem(MM_STORAGE_KEY, JSON.stringify(updatedState));
      setMmNewAccName("");
      setMmNewAccBal("");
      setModalMMAddAccount(false);
      Alert.alert(t("mm_alert_success"), t("mm_success_account_added"));
    } catch (err) {
      showMMError(err, 'mm_error_save_account', 'mm_alert_invalid_input');
    }
  };

  const handleArchiveMMAccount = async (accId, isArchived) => {
    try {
      const updatedState = moneyManagerService.archiveAccount(moneyManagerState, accId, isArchived);
      setMoneyManagerState(updatedState);
      await AsyncStorage.setItem(MM_STORAGE_KEY, JSON.stringify(updatedState));
      Alert.alert(t("mm_alert_success"), isArchived ? t("mm_success_account_archived") : t("mm_success_account_activated"));
    } catch (err) {
      showMMError(err, 'mm_error_archive_account', 'mm_alert_warning');
    }
  };

  const handleDeleteMMAccount = (accId) => {
    Alert.alert(
      t("mm_alert_delete_account"),
      t("mm_alert_confirm_delete_account"),
      [
        { text: t("mm_alert_cancel"), style: "cancel" },
        {
          text: t("mm_alert_delete"),
          style: "destructive",
          onPress: async () => {
            try {
              const updatedState = moneyManagerService.deleteAccount(moneyManagerState, accId);
              setMoneyManagerState(updatedState);
              await AsyncStorage.setItem(MM_STORAGE_KEY, JSON.stringify(updatedState));
              Alert.alert(t("mm_alert_success"), t("mm_success_account_deleted"));
            } catch (err) {
              showMMError(err, 'mm_error_delete_account', 'mm_alert_warning');
            }
          }
        }
      ]
    );
  };

  const handleSaveMMBudget = async () => {
    try {
      const updatedState = moneyManagerService.setCategoryBudget(moneyManagerState, mmBudgetCat, mmBudgetLimit);
      setMoneyManagerState(updatedState);
      await AsyncStorage.setItem(MM_STORAGE_KEY, JSON.stringify(updatedState));
      setMmBudgetLimit("");
      setModalMMSetBudget(false);
      Alert.alert(t("mm_alert_success"), t("mm_success_budget_saved"));
    } catch (err) {
      showMMError(err, 'mm_error_save_budget', 'mm_alert_invalid_input');
    }
  };

  const handleSaveMMOverallBudget = async () => {
    try {
      const updatedState = moneyManagerService.setOverallBudget(moneyManagerState, mmOverallBudgetInput);
      setMoneyManagerState(updatedState);
      await AsyncStorage.setItem(MM_STORAGE_KEY, JSON.stringify(updatedState));
      setModalMMOverallBudget(false);
      Alert.alert(t("mm_alert_success"), t("mm_success_overall_budget_saved"));
    } catch (err) {
      showMMError(err, 'mm_error_save_budget', 'mm_alert_invalid_input');
    }
  };

  const handleSaveMMCategory = async () => {
    try {
      const updatedState = moneyManagerService.addCategory(moneyManagerState, {
        name: mmNewCatName,
        type: mmNewCatType,
        icon: mmNewCatIcon,
        color: mmNewCatColor,
        budget: mmNewCatBudget,
      });
      setMoneyManagerState(updatedState);
      await AsyncStorage.setItem(MM_STORAGE_KEY, JSON.stringify(updatedState));
      setMmNewCatName("");
      setMmNewCatBudget("");
      setModalMMAddCategory(false);
      Alert.alert(t("mm_alert_success"), t("mm_success_category_added"));
    } catch (err) {
      showMMError(err, 'mm_error_create_category', 'mm_alert_invalid_input');
    }
  };

  const handleSaveMMGoal = async () => {
    try {
      const updatedState = moneyManagerService.addGoal(moneyManagerState, {
        title: mmGoalTitle,
        targetAmount: mmGoalTarget,
        savedAmount: mmGoalInitial,
        initialAccountId: mmGoalInitialAccount,
        targetDate: mmGoalDate,
        icon: mmGoalIcon,
        note: mmGoalNote,
      });
      setMoneyManagerState(updatedState);
      await AsyncStorage.setItem(MM_STORAGE_KEY, JSON.stringify(updatedState));
      setMmGoalTitle("");
      setMmGoalTarget("");
      setMmGoalInitial("");
      setMmGoalDate("");
      setMmGoalNote("");
      setModalMMAddGoal(false);
      Alert.alert(t("mm_alert_success"), t("mm_success_goal_created"));
    } catch (err) {
      showMMError(err, 'mm_error_create_goal', 'mm_alert_invalid_input');
    }
  };

  const handleDepositMMGoal = async () => {
    try {
      const updatedState = moneyManagerService.contributeToGoal(
        moneyManagerState,
        mmDepositGoalId,
        mmDepositAmt,
        mmDepositFromAcc
      );
      setMoneyManagerState(updatedState);
      await AsyncStorage.setItem(MM_STORAGE_KEY, JSON.stringify(updatedState));
      setMmDepositAmt("");
      setModalMMDepositGoal(false);
      Alert.alert(t("mm_alert_success"), t("mm_success_goal_deposit"));
    } catch (err) {
      showMMError(err, 'mm_error_deposit_goal', 'mm_alert_invalid_input');
    }
  };

  const openMMWithdrawGoal = (goalId, mode = 'withdraw') => {
    const goal = (moneyManagerState.goals || []).find(item => item.id === goalId);
    if (!goal) return;
    const fundedAmount = moneyManagerService.getGoalFundedAmount(moneyManagerState, goalId);
    const firstActive = (moneyManagerState.accounts || []).find(account => !account.isArchived);
    setMmWithdrawGoalId(goalId);
    setMmWithdrawMode(mode);
    setMmWithdrawAmt(mode === 'refund-and-delete' ? String(fundedAmount) : '');
    if (firstActive) setMmWithdrawToAcc(firstActive.id);
    setModalMMWithdrawGoal(true);
  };

  const handleWithdrawMMGoal = async () => {
    try {
      const currentGoal = (moneyManagerState.goals || []).find(goal => goal.id === mmWithdrawGoalId);
      if (!currentGoal) throw new Error('লক্ষ্যটি পাওয়া যায়নি');
      const fundedAmount = moneyManagerService.getGoalFundedAmount(moneyManagerState, mmWithdrawGoalId);
      const requestedAmount = Number(moneyManagerService.toEnglishDigits(mmWithdrawAmt));
      if (mmWithdrawMode === 'refund-and-delete' && requestedAmount !== fundedAmount) {
        throw new Error('লক্ষ্যে জমা থাকা পুরো অর্থ ফেরত দিন');
      }
      let updatedState = moneyManagerService.withdrawFromGoal(
        moneyManagerState,
        mmWithdrawGoalId,
        mmWithdrawAmt,
        mmWithdrawToAcc
      );
      if (mmWithdrawMode === 'refund-and-delete') {
        updatedState = moneyManagerService.deleteGoal(updatedState, mmWithdrawGoalId);
      }
      await AsyncStorage.setItem(MM_STORAGE_KEY, JSON.stringify(updatedState));
      setMoneyManagerState(updatedState);
      setMmWithdrawAmt('');
      setModalMMWithdrawGoal(false);
      Alert.alert(
        t('mm_alert_success'),
        mmWithdrawMode === 'refund-and-delete' ? t('mm_success_goal_deleted') : t('mm_success_goal_withdrawal')
      );
    } catch (err) {
      showMMError(err, 'mm_error_withdraw_goal', 'mm_alert_invalid_input');
    }
  };

  const handleDeleteMMGoal = (goalId) => {
    const goal = (moneyManagerState.goals || []).find(item => item.id === goalId);
    const fundedAmount = moneyManagerService.getGoalFundedAmount(moneyManagerState, goalId);
    if (goal && Math.abs(Number(goal.savedAmount || 0) - fundedAmount) > 0.005) {
      const actions = [
        { text: t('mm_alert_cancel'), style: 'cancel' },
        {
          text: t('mm_goal_sync_wallet_amount'),
          onPress: () => handleReconcileMMGoal(goalId, 'use_wallet_allocations'),
        },
      ];
      if (Number(goal.savedAmount || 0) > fundedAmount) {
        actions.push({
          text: t('mm_goal_record_external_savings'),
          onPress: () => handleReconcileMMGoal(goalId, 'record_existing_savings'),
        });
      }
      Alert.alert(
        t('mm_goal_reconcile_title'),
        t('mm_goal_unallocated_warning', {
          amount: formatMMCurrency(Math.abs(Number(goal.savedAmount || 0) - fundedAmount)),
          funded: formatMMCurrency(fundedAmount),
        }),
        actions
      );
      return;
    }
    if (fundedAmount > 0) {
      Alert.alert(
        t('mm_refund_goal_title'),
        t('mm_refund_goal_explainer', { amount: formatMMCurrency(fundedAmount) }),
        [
          { text: t('mm_alert_cancel'), style: 'cancel' },
          { text: t('mm_goal_withdrawal_short'), onPress: () => openMMWithdrawGoal(goalId) },
          { text: t('mm_refund_and_delete_goal'), style: 'destructive', onPress: () => openMMWithdrawGoal(goalId, 'refund-and-delete') },
        ]
      );
      return;
    }
    Alert.alert(
      t("mm_alert_delete_goal"),
      t("mm_goal_delete_confirm_no_funds"),
      [
        { text: t("mm_alert_cancel"), style: "cancel" },
        {
          text: t("mm_alert_delete"),
          style: "destructive",
          onPress: async () => {
            try {
              const updatedState = moneyManagerService.deleteGoal(moneyManagerState, goalId);
              setMoneyManagerState(updatedState);
              await AsyncStorage.setItem(MM_STORAGE_KEY, JSON.stringify(updatedState));
              Alert.alert(t("mm_alert_success"), t("mm_success_goal_deleted"));
            } catch (err) {
              showMMError(err, 'mm_error_delete_goal', 'mm_alert_error');
            }
          }
        }
      ]
    );
  };

  const handleReconcileMMGoal = async (goalId, strategy) => {
    try {
      const updatedState = moneyManagerService.reconcileGoalBalance(moneyManagerState, goalId, strategy);
      await AsyncStorage.setItem(MM_STORAGE_KEY, JSON.stringify(updatedState));
      setMoneyManagerState(updatedState);
      Alert.alert(t('mm_alert_success'), t(strategy === 'record_existing_savings' ? 'mm_goal_external_savings_recorded' : 'mm_goal_wallet_amount_synced'));
    } catch (err) {
      showMMError(err, 'mm_error_goal_untracked_savings', 'mm_alert_error');
    }
  };

  const handleMMTransfer = async () => {
    try {
      const updatedState = moneyManagerService.addTransaction(moneyManagerState, {
        type: "transfer",
        amount: mmTransferAmt,
        fromAccountId: mmTransferFrom,
        toAccountId: mmTransferTo,
        note: mmTransferNote,
        date: getTodayDate(),
      });
      setMoneyManagerState(updatedState);
      await AsyncStorage.setItem(MM_STORAGE_KEY, JSON.stringify(updatedState));
      setMmTransferAmt("");
      setMmTransferNote("");
      setModalMMTransfer(false);
      Alert.alert(t("mm_alert_success"), t("mm_success_transfer"));
    } catch (err) {
      showMMError(err, 'mm_error_transfer', 'mm_alert_invalid_input');
    }
  };

  const handleSaveMMPreferences = async () => {
    if (mmPrefDefaultPeriod === 'custom' && (!mmCustomRange?.startDate || !mmCustomRange?.endDate)) {
      setModalMMPreferences(false);
      setMMRangeInputs(getTodayDate(), getTodayDate());
      setMmRangeError(t('mm_select_valid_range_first'));
      setModalMMCustomDateRange(true);
      return;
    }
    try {
      const updatedState = moneyManagerService.updatePreferences(moneyManagerState, {
        defaultPeriod: mmPrefDefaultPeriod,
        customRange: mmPrefDefaultPeriod === 'custom' ? mmCustomRange : null,
        currencySymbol: mmPrefCurrencySymbol,
        sortOrder: mmPrefSortOrder,
        showNetWorthCard: mmPrefShowNetWorth,
        showSavingsRateCard: mmPrefShowSavingsRate,
        showTipsCard: mmPrefShowTips,
      });
      setMoneyManagerState(updatedState);
      setMmPeriod(mmPrefDefaultPeriod);
      setMmCustomRange(mmPrefDefaultPeriod === 'custom' ? mmCustomRange : null);
      setMmSortOrder(mmPrefSortOrder);
      await AsyncStorage.setItem(MM_STORAGE_KEY, JSON.stringify(updatedState));
      setModalMMPreferences(false);
      Alert.alert(t("mm_alert_success"), t("mm_success_settings_saved"));
    } catch (err) {
      showMMError(err, 'mm_error_save_settings', 'mm_alert_error');
    }
  };

  const handleResetMMPreferences = async () => {
    try {
      const updatedState = moneyManagerService.resetPreferences(moneyManagerState);
      setMoneyManagerState(updatedState);
      await AsyncStorage.setItem(MM_STORAGE_KEY, JSON.stringify(updatedState));
      setMmPrefDefaultPeriod("this_month");
      setMmCustomRange(null);
      setMmPrefCurrencySymbol("৳");
      setMmPrefSortOrder("newest");
      setMmPeriod("this_month");
      setMmSortOrder("newest");
      setMmPrefShowNetWorth(true);
      setMmPrefShowSavingsRate(true);
      setMmPrefShowTips(true);
      Alert.alert(t("mm_alert_success"), t("mm_success_settings_reset"));
    } catch (err) {
      showMMError(err, 'mm_error_reset_settings', 'mm_alert_error');
    }
  };

  const handleSelectMMPeriod = async (period) => {
    try {
      const updatedState = moneyManagerService.updatePreferences(moneyManagerState, {
        defaultPeriod: period,
        customRange: null,
      });
      await AsyncStorage.setItem(MM_STORAGE_KEY, JSON.stringify(updatedState));
      setMoneyManagerState(updatedState);
      setMmPeriod(period);
      setMmPrefDefaultPeriod(period);
      setMmCustomRange(null);
    } catch (err) {
      Alert.alert(t('mm_alert_error'), t('mm_error_save_period'));
    }
  };

  const handleOpenEditMMCategory = (cat) => {
    setMmEditCatId(cat.id);
    setMmEditCatName(cat.name);
    setMmEditCatType(cat.type);
    setMmEditCatIcon(cat.icon || "📦");
    setMmEditCatColor(cat.color || "#3B82F6");
    setMmEditCatBudget(cat.budget ? String(cat.budget) : "");
    setMmEditCatIsArchived(Boolean(cat.isArchived));
    setModalMMEditCategory(true);
  };

  const handleSaveMMEditCategory = async () => {
    try {
      const updatedState = moneyManagerService.updateCategory(moneyManagerState, mmEditCatId, {
        name: mmEditCatName,
        icon: mmEditCatIcon,
        color: mmEditCatColor,
        budget: mmEditCatBudget,
        isArchived: mmEditCatIsArchived,
      });
      setMoneyManagerState(updatedState);
      await AsyncStorage.setItem(MM_STORAGE_KEY, JSON.stringify(updatedState));
      setModalMMEditCategory(false);
      Alert.alert(t("mm_alert_success"), t("mm_success_category_updated"));
    } catch (err) {
      showMMError(err, 'mm_error_update_category', 'mm_alert_invalid_input');
    }
  };

  const handleArchiveMMCategory = async (catId, isArchived) => {
    try {
      const updatedState = moneyManagerService.archiveCategory(moneyManagerState, catId, isArchived);
      setMoneyManagerState(updatedState);
      await AsyncStorage.setItem(MM_STORAGE_KEY, JSON.stringify(updatedState));
      Alert.alert(t("mm_alert_success"), isArchived ? t("mm_success_category_archived") : t("mm_success_category_restored"));
    } catch (err) {
      showMMError(err, 'mm_error_archive_category', 'mm_alert_warning');
    }
  };

  const handleDeleteMMCategory = (catId) => {
    Alert.alert(
      t("mm_alert_delete_category"),
      t("mm_alert_confirm_delete_category"),
      [
        { text: t("mm_alert_cancel"), style: "cancel" },
        {
          text: t("mm_alert_delete"),
          style: "destructive",
          onPress: async () => {
            try {
              const updatedState = moneyManagerService.deleteCategory(moneyManagerState, catId);
              setMoneyManagerState(updatedState);
              await AsyncStorage.setItem(MM_STORAGE_KEY, JSON.stringify(updatedState));
              setModalMMEditCategory(false);
              Alert.alert(t("mm_alert_success"), t("mm_success_category_deleted"));
            } catch (err) {
              showMMError(err, 'mm_error_delete_category', 'mm_alert_warning');
            }
          }
        }
      ]
    );
  };

  const handleSaveMMRecurring = async () => {
    try {
      let updatedState;
      if (mmRecEditId) {
        updatedState = moneyManagerService.updateRecurring(moneyManagerState, mmRecEditId, {
          title: mmRecTitle,
          type: mmRecType,
          amount: mmRecAmount,
          categoryId: mmRecType === "transfer" ? null : mmRecCat,
          accountId: mmRecType === "transfer" ? null : mmRecAcc,
          fromAccountId: mmRecType === "transfer" ? mmRecFromAcc : null,
          toAccountId: mmRecType === "transfer" ? mmRecToAcc : null,
          cadence: mmRecCadence,
          nextDueDate: mmRecNextDue || getTodayDate(),
          note: mmRecNote,
          payee: mmRecPayee,
        });
      } else {
        updatedState = moneyManagerService.addRecurring(moneyManagerState, {
          title: mmRecTitle,
          type: mmRecType,
          amount: mmRecAmount,
          categoryId: mmRecType === "transfer" ? null : mmRecCat,
          accountId: mmRecType === "transfer" ? null : mmRecAcc,
          fromAccountId: mmRecType === "transfer" ? mmRecFromAcc : null,
          toAccountId: mmRecType === "transfer" ? mmRecToAcc : null,
          cadence: mmRecCadence,
          startDate: getTodayDate(),
          nextDueDate: mmRecNextDue || getTodayDate(),
          note: mmRecNote,
          payee: mmRecPayee,
        });
      }
      setMoneyManagerState(updatedState);
      await AsyncStorage.setItem(MM_STORAGE_KEY, JSON.stringify(updatedState));
      setMmRecEditId(null);
      setMmRecTitle("");
      setMmRecAmount("");
      setMmRecNote("");
      setMmRecPayee("");
      setModalMMAddRecurring(false);
      Alert.alert(t("mm_alert_success"), mmRecEditId ? t("mm_success_schedule_updated") : t("mm_success_schedule_added"));
    } catch (err) {
      showMMError(err, 'mm_error_save_schedule', 'mm_alert_invalid_input');
    }
  };

  const handleToggleMMRecurring = async (recId, isActive) => {
    try {
      const updatedState = moneyManagerService.toggleRecurringActive(moneyManagerState, recId, isActive);
      setMoneyManagerState(updatedState);
      await AsyncStorage.setItem(MM_STORAGE_KEY, JSON.stringify(updatedState));
    } catch (err) {
      showMMError(err, 'mm_error_toggle_schedule', 'mm_alert_error');
    }
  };

  const handleDeleteMMRecurring = (recId) => {
    Alert.alert(
      t("mm_alert_delete_schedule"),
      t("mm_alert_confirm_delete_schedule"),
      [
        { text: t("mm_alert_cancel"), style: "cancel" },
        {
          text: t("mm_alert_delete"),
          style: "destructive",
          onPress: async () => {
            try {
              const updatedState = moneyManagerService.deleteRecurring(moneyManagerState, recId);
              setMoneyManagerState(updatedState);
              await AsyncStorage.setItem(MM_STORAGE_KEY, JSON.stringify(updatedState));
              Alert.alert(t("mm_alert_success"), t("mm_success_schedule_deleted"));
            } catch (err) {
              showMMError(err, 'mm_error_delete_schedule', 'mm_alert_error');
            }
          }
        }
      ]
    );
  };

  const handleOpenEditMMRecurring = (rec) => {
    setMmRecEditId(rec.id);
    setMmRecTitle(rec.title);
    setMmRecType(rec.type || "expense");
    setMmRecAmount(String(rec.amount || ""));
    setMmRecCat(rec.categoryId || "cat_utility");
    setMmRecAcc(rec.accountId || "acc_bank");
    setMmRecFromAcc(rec.fromAccountId || "acc_bank");
    setMmRecToAcc(rec.toAccountId || "acc_bkash");
    setMmRecCadence(rec.cadence || "monthly");
    setMmRecNextDue(rec.nextDueDate || getTodayDate());
    setMmRecNote(rec.note || "");
    setMmRecPayee(rec.payee || "");
    setModalMMAddRecurring(true);
  };
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
    initGoogleSignIn();

    const handleUrl = (url) => {
      if (!url) return;
      if (url.includes('tab=cashbox')) setActiveTab('cashbox');
      else if (url.includes('tab=tallypay')) setActiveTab('tallypay');
      else if (url.includes('tab=menu')) setActiveTab('menu');
      else if (url.includes('tab=home')) setActiveTab('home');

      if (url.includes('action=backup')) setModalBackupRestore(true);
      else if (url.includes('action=add_account')) setModalAddAccount(true);
      else if (url.includes('action=tagada')) setModalTagada(true);
      else if (url.includes('action=notes')) setModalNotes(true);
      else if (url.includes('action=stock')) setModalAddStock(true);
      else if (url.includes('action=inbox')) setModalInbox(true);
      else if (url.includes('action=support')) setModalSupport(true);
      else if (url.includes('action=qr')) setModalBanglaQR(true);
    };

    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', (e) => handleUrl(e.url));
    return () => sub && sub.remove && sub.remove();
  }, []);

  // --- HARDWARE BACK HANDLER (Closes modals & navigates back natively) ---
  useEffect(() => {
    const onBackPress = () => {
      if (modalAddTxn) { setModalAddTxn(false); return true; }
      if (modalEditTxn) { setModalEditTxn(false); return true; }
      if (modalAddAccount) { setModalAddAccount(false); return true; }
      if (modalEditAccount) { setModalEditAccount(false); return true; }
      if (modalAddCash) { setModalAddCash(false); return true; }
      if (modalReconcileCash) { setModalReconcileCash(false); return true; }
      if (modalBackupRestore) { setModalBackupRestore(false); return true; }
      if (modalFullReport) { setModalFullReport(false); return true; }
      if (modalNotes) { setModalNotes(false); return true; }
      if (modalAddStock) { setModalAddStock(false); return true; }
      if (modalAdjustStock) { setModalAdjustStock(false); return true; }
      if (modalBanglaQR) { setModalBanglaQR(false); return true; }
      if (modalTallyMessage) { setModalTallyMessage(false); return true; }
      if (modalSettings) { setModalSettings(false); return true; }
      if (modalSupport) { setModalSupport(false); return true; }
      if (modalInbox) { setModalInbox(false); return true; }
      if (modalBusinessPicker) { setModalBusinessPicker(false); return true; }
      if (modalAddBusiness) { setModalAddBusiness(false); return true; }
      if (modalAddMoney) { setModalAddMoney(false); return true; }
      if (modalMobileRecharge) { setModalMobileRecharge(false); return true; }
      if (modalTagada) { setModalTagada(false); return true; }
      if (modalVoucher) { setModalVoucher(false); return true; }
      if (modalPinSetup) { setModalPinSetup(false); return true; }
      if (modalProfitLoss) { setModalProfitLoss(false); return true; }
      if (modalBechaKena) { setModalBechaKena(false); return true; }
      if (modalBakiReport) { setModalBakiReport(false); return true; }
      if (modalCashReport) { setModalCashReport(false); return true; }
      if (modalExpenseReport) { setModalExpenseReport(false); return true; }
      if (modalMalikReport) { setModalMalikReport(false); return true; }
      if (modalMoneyOut) { setModalMoneyOut(false); return true; }
      if (modalTxnLimit) { setModalTxnLimit(false); return true; }
      if (modalThemePicker) { setModalThemePicker(false); return true; }
      if (modalLanguagePicker) { setModalLanguagePicker(false); return true; }

      // Return to home screen from account_ledger
      if (currentScreenRef.current !== 'home') {
        setCurrentScreen('home');
        return true;
      }

      // Return to home tab from non-home tabs (cashbox, tallypay, menu, tagada)
      if (activeTabRef.current !== 'home') {
        setActiveTab('home');
        return true;
      }

      return false;
    };
    const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSub && backSub.remove && backSub.remove();
  }, [
    modalAddTxn, modalEditTxn, modalAddAccount, modalEditAccount, modalAddCash,
    modalReconcileCash, modalBackupRestore, modalFullReport, modalNotes,
    modalAddStock, modalAdjustStock, modalBanglaQR, modalTallyMessage, modalSettings,
    modalSupport, modalInbox, modalBusinessPicker, modalAddBusiness, modalAddMoney,
    modalMobileRecharge, modalTagada, modalVoucher, modalPinSetup, modalProfitLoss,
    modalBechaKena, modalBakiReport, modalCashReport, modalExpenseReport,
    modalMalikReport, modalMoneyOut, modalTxnLimit, modalThemePicker, modalLanguagePicker, currentScreen, activeTab
  ]);

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
        if (d.activeBusinessId) setActiveBusinessId(String(d.activeBusinessId));
        if (d.remainingSmsCount !== undefined) setRemainingSmsCount(Number(d.remainingSmsCount));
        if (d.tallyMessageBalance !== undefined) setTallyMessageBalance(Number(d.tallyMessageBalance));
        if (d.googleUser) setGoogleUser(d.googleUser);
        if (d.autoBackupEnabled !== undefined) setAutoBackupEnabled(Boolean(d.autoBackupEnabled));
        if (d.cloudBackupMetadata) setCloudBackupMetadata(d.cloudBackupMetadata);
        if (d.openingBalance !== undefined) setOpeningBalance(Number(d.openingBalance));
        if (Array.isArray(d.tagadaLogs)) setTagadaLogs(d.tagadaLogs);
        try {
          const storedPrefs = await preferencesService.getStoredPreferences(AsyncStorage);
          if (storedPrefs) {
            if (storedPrefs.theme) setAppTheme(storedPrefs.theme);
            if (storedPrefs.language) setAppLanguage(storedPrefs.language);
          }
        } catch (e) {}
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
      if (typeof overrides === 'function') {
        return await storageRepository.mutateStore(overrides);
      }
      return await storageRepository.mutateStore((prevStore) => {
        const next = { ...prevStore };
        for (const k of Object.keys(overrides)) {
          if (overrides[k] !== undefined) {
            next[k] = overrides[k];
          }
        }
        return next;
      });
    } catch (err) {
      console.error('persistData write error:', err);
      return { success: false, error: err };
    }
  };

  // --- BUSINESS-SCOPED DATA COLLECTIONS ---
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
      Alert.alert(tStatic("সতর্কতা"), valRes.error);
      return;
    }

    const isCust = selectedAccount.type === 1;
    const txnId = generateUniqueId('txn_');
    const defaultDesc = txnType === 'given'
      ? (isCust ? 'বাকি বিক্রি' : 'টাকা পরিশোধ')
      : (isCust ? 'বাকি আদায় (জমা)' : 'মাল ক্রয় বাবদ দেনা');

    const newJournal = {
      id: txnId,
      accountId: selectedAccount.id,
      businessId: selectedAccount.businessId || activeBusinessId || '1',
      type: txnType,
      amount: valRes.amount,
      desc: txnDesc.trim() || defaultDesc,
      date: txnDate,
      time: getTimeString(),
    };

    setIsSaving(true);
    let finalAccount = null;
    const saveRes = await storageRepository.mutateStore((latestStore) => {
      const curAccounts = latestStore.accounts || [];
      const curJournals = latestStore.journals || [];
      const curCash = latestStore.cashEntries || [];

      const accInStore = curAccounts.find((a) => String(a.id) === String(selectedAccount.id)) || selectedAccount;
      const combinedJournals = [newJournal, ...curJournals];
      const { updatedAccount, updatedJournals } = recalculateAccountRunningBalances(
        accInStore,
        combinedJournals
      );
      finalAccount = updatedAccount;

      const updatedCash = syncCashboxForTransaction(newJournal, updatedAccount, curCash);
      const updatedAccounts = curAccounts.map((a) =>
        String(a.id) === String(selectedAccount.id) ? updatedAccount : a
      );

      return {
        ...latestStore,
        accounts: updatedAccounts,
        journals: updatedJournals,
        cashEntries: updatedCash,
      };
    });
    setIsSaving(false);

    if (!saveRes.success) {
      Alert.alert(tStatic("ত্রুটি"), tStatic("লেনদেন সংরক্ষণ করা যায়নি। দয়া করে আবার চেষ্টা করুন।"));
      return;
    }

    if (finalAccount) setSelectedAccount(finalAccount);
    setAccounts(saveRes.data.accounts);
    setJournals(saveRes.data.journals);
    setCashEntries(saveRes.data.cashEntries);

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
      Alert.alert(tStatic("সতর্কতা"), valRes.error);
      return;
    }

    setIsSaving(true);
    let finalAccount = null;
    const saveRes = await storageRepository.mutateStore((latestStore) => {
      const curAccounts = latestStore.accounts || [];
      const curJournals = latestStore.journals || [];
      const curCash = latestStore.cashEntries || [];

      const accInStore = curAccounts.find((a) => String(a.id) === String(selectedAccount.id)) || selectedAccount;
      const existingTxn = curJournals.find((j) => String(j.id) === String(editTxnId));
      if (!existingTxn) return latestStore;

      const updatedTxn = {
        ...existingTxn,
        amount: valRes.amount,
        desc: editDesc.trim() || existingTxn.desc,
      };

      const baseJournals = curJournals.map((j) =>
        String(j.id) === String(editTxnId) ? updatedTxn : j
      );

      const { updatedAccount, updatedJournals } = recalculateAccountRunningBalances(
        accInStore,
        baseJournals
      );
      finalAccount = updatedAccount;

      const updatedCash = syncCashboxForTransaction(updatedTxn, updatedAccount, curCash);
      const updatedAccounts = curAccounts.map((a) =>
        String(a.id) === String(selectedAccount.id) ? updatedAccount : a
      );

      return {
        ...latestStore,
        accounts: updatedAccounts,
        journals: updatedJournals,
        cashEntries: updatedCash,
      };
    });
    setIsSaving(false);

    if (!saveRes.success) {
      Alert.alert(tStatic("ত্রুটি"), tStatic("লেনদেন সংশোধন সংরক্ষণ করা যায়নি।"));
      return;
    }

    if (finalAccount) setSelectedAccount(finalAccount);
    setAccounts(saveRes.data.accounts);
    setJournals(saveRes.data.journals);
    setCashEntries(saveRes.data.cashEntries);

    setModalEditTxn(false);
    setEditTxnId(null);
  };

  // --- HANDLER: DELETE TRANSACTION (WITH RECALCULATION & CASH SYNC) ---
  const handleDeleteTransaction = (txnId) => {
    if (!selectedAccount) return;
    Alert.alert(
      tStatic("লেনদেন মুছবেন?"),
      tStatic("এই লেনদেনটি মুছে ফেললে খাতার ব্যালেন্স স্বয়ংক্রিয়ভাবে পুনর্গণনা হবে।"),
      [
        { text: tStatic("বাতিল"), style: 'cancel' },
        {
          text: tStatic("মুছুন"),
          style: 'destructive',
          onPress: async () => {
            const targetJ = journals.find((j) => j.id === txnId);
            if (!targetJ) return;

            setIsSaving(true);
            let finalAccount = null;
            const saveRes = await storageRepository.mutateStore((latestStore) => {
              const curAccounts = latestStore.accounts || [];
              const curJournals = latestStore.journals || [];
              const curCash = latestStore.cashEntries || [];

              const accInStore = curAccounts.find((a) => String(a.id) === String(selectedAccount.id)) || selectedAccount;
              const remainingJournals = curJournals.filter((j) => String(j.id) !== String(txnId));

              const { updatedAccount, updatedJournals } = recalculateAccountRunningBalances(
                accInStore,
                remainingJournals
              );
              finalAccount = updatedAccount;

              const updatedCash = removeCashEntriesForTransactions([txnId], curCash);
              const updatedAccounts = curAccounts.map((a) =>
                String(a.id) === String(selectedAccount.id) ? updatedAccount : a
              );

              return {
                ...latestStore,
                accounts: updatedAccounts,
                journals: updatedJournals,
                cashEntries: updatedCash,
              };
            });
            setIsSaving(false);

            if (!saveRes.success) {
              Alert.alert(tStatic("ত্রুটি"), tStatic("লেনদেন মুছতে সমস্যা হয়েছে।"));
              return;
            }

            if (finalAccount) setSelectedAccount(finalAccount);
            setAccounts(saveRes.data.accounts);
            setJournals(saveRes.data.journals);
            setCashEntries(saveRes.data.cashEntries);
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
      Alert.alert(tStatic("সতর্কতা"), valRes.error);
      return;
    }

    const newId = generateUniqueId('acc_');
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
    };

    setIsSaving(true);
    const saveRes = await storageRepository.mutateCollection('accounts', (latestAccounts) => {
      return [newAcc, ...latestAccounts];
    });
    setIsSaving(false);

    if (!saveRes.success) {
      Alert.alert(tStatic("ত্রুটি"), tStatic("নতুন হিসাব সংরক্ষণ ব্যর্থ হয়েছে।"));
      return;
    }

    setAccounts(saveRes.collection);
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
    setAccInitialBal(String(selectedAccount.openingBalance || ''));
    setModalEditAccount(true);
  };

  const handleUpdateAccount = async () => {
    if (!selectedAccount) return;
    const valRes = validateAccount(accName, accPhone, accInitialBal || 0);
    if (!valRes.valid) {
      Alert.alert(tStatic("সতর্কতা"), valRes.error);
      return;
    }

    const opening = Number(accInitialBal) || 0;
    let updatedTarget = null;
    setIsSaving(true);
    const saveRes = await storageRepository.mutateCollection('accounts', (latestAccounts) => {
      return latestAccounts.map((a) => {
        if (String(a.id) === String(selectedAccount.id)) {
          const openingDiff = opening - (Number(a.openingBalance) || 0);
          const currentBal = Number(a.balance) || 0;
          const newBal = currentBal + openingDiff;
          updatedTarget = {
            ...a,
            name: valRes.name,
            phone: valRes.phone,
            address: accAddress.trim(),
            openingBalance: opening,
            balance: newBal,
          };
          return updatedTarget;
        }
        return a;
      });
    });
    setIsSaving(false);

    if (!saveRes.success) {
      Alert.alert(tStatic("ত্রুটি"), tStatic("হিসাবের তথ্য আপডেট করা যায়নি।"));
      return;
    }
    if (updatedTarget) setSelectedAccount(updatedTarget);
    setAccounts(saveRes.collection);
    setModalEditAccount(false);
    Alert.alert(tStatic("সফল"), tStatic("হিসাবের তথ্য সফলভাবে আপডেট হয়েছে।"));
  };

  const handleDeleteAccount = () => {
    if (!selectedAccount) return;
    Alert.alert(
      tStatic("খাতা মুছে ফেলবেন?"),
      `${selectedAccount?.name || tStatic("এই হিসাব")}${tStatic("-এর সম্পূর্ণ খাতা এবং সকল লেনদেন মুছে যাবে।")}`,
      [
        { text: tStatic("বাতিল"), style: 'cancel' },
        {
          text: tStatic("মুছে ফেলুন"),
          style: 'destructive',
          onPress: async () => {
            const accId = String(selectedAccount.id);
            setIsSaving(true);
            const saveRes = await storageRepository.mutateStore((latestStore) => {
              const curAccounts = latestStore.accounts || [];
              const curJournals = latestStore.journals || [];
              const curCash = latestStore.cashEntries || [];

              const accTxnIds = curJournals
                .filter((j) => String(j.accountId) === accId)
                .map((j) => String(j.id));

              const updatedAccounts = curAccounts.filter((a) => String(a.id) !== accId);
              const updatedJournals = curJournals.filter((j) => String(j.accountId) !== accId);
              const updatedCash = removeCashEntriesForTransactions(accTxnIds, curCash);

              return {
                ...latestStore,
                accounts: updatedAccounts,
                journals: updatedJournals,
                cashEntries: updatedCash,
              };
            });
            setIsSaving(false);

            if (!saveRes.success) {
              Alert.alert(tStatic("ত্রুটি"), tStatic("খাতা মুছে ফেলা ব্যর্থ হয়েছে।"));
              return;
            }

            setAccounts(saveRes.data.accounts);
            setJournals(saveRes.data.journals);
            setCashEntries(saveRes.data.cashEntries);
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
      Alert.alert(tStatic("সতর্কতা"), tStatic("সঠিক টাকার পরিমাণ লিখুন"));
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
      id: generateUniqueId('cash_'),
      businessId: activeBusinessId || '1',
      category: cashCategory,
      type: type,
      amount: amt,
      desc: cashDesc.trim() || defaultDesc,
      date: getTodayDate(),
      time: getTimeString(),
    };

    setIsSaving(true);
    const saveRes = await storageRepository.mutateCollection('cashEntries', (latestCash) => {
      return [newEntry, ...latestCash];
    });
    setIsSaving(false);

    if (!saveRes.success) {
      Alert.alert(tStatic("ত্রুটি"), tStatic("ক্যাশ এন্ট্রি সংরক্ষণ করা যায়নি।"));
      return;
    }
    setCashEntries(saveRes.collection);
    setCashAmount('');
    setCashDesc('');
    setModalAddCash(false);
  };

  const handleDeleteCashEntry = (id) => {
    Alert.alert(tStatic("ক্যাশ এন্ট্রি মুছবেন?"), tStatic("এই ক্যাশ রেকর্ডটি মুছে ফেলতে চান?"), [
      { text: tStatic("বাতিল"), style: 'cancel' },
      {
        text: tStatic("মুছুন"),
        style: 'destructive',
        onPress: async () => {
          setIsSaving(true);
          const saveRes = await storageRepository.mutateCollection('cashEntries', (latestCash) => {
            return latestCash.filter((c) => String(c.id) !== String(id));
          });
          setIsSaving(false);
          if (!saveRes.success) {
            Alert.alert(tStatic("ত্রুটি"), tStatic("ক্যাশ এন্ট্রি মুছতে সমস্যা হয়েছে।"));
            return;
          }
          setCashEntries(saveRes.collection);
        },
      },
    ]);
  };

  const handleSaveReconciliation = async () => {
    if (!activeBusinessId || typeof activeBusinessId !== 'string' || !activeBusinessId.trim()) {
      Alert.alert(tStatic("ত্রুটি"), tStatic("সক্রিয় ব্যবসার আইডি পাওয়া যায়নি। ক্যাশবক্স সমন্বয় করা সম্ভব নয়।"));
      return;
    }
    const currentBiz = Array.isArray(businesses) ? businesses.find((b) => String(b.id) === String(activeBusinessId) && !b.isArchived) : null;
    if (!currentBiz) {
      Alert.alert(tStatic("ত্রুটি"), tStatic("নির্বাচিত ব্যবসাটি অকার্যকর বা পাওয়া যায়নি। অনুগ্রহ করে সঠিক ব্যবসা নির্বাচন করুন।"));
      return;
    }

    const counted = parseFloat(countedCash);
    if (isNaN(counted)) {
      Alert.alert(tStatic("সতর্কতা"), tStatic("ড্রয়ারের আসল ক্যাশ টাকার পরিমাণ লিখুন"));
      return;
    }
    const diff = counted - totalCash;
    if (diff === 0) {
      Alert.alert(tStatic("সফল"), tStatic("ক্যাশবক্স পুরোপুরি মিলে গেছে! কোনো গরমিল নেই।"));
      setModalReconcileCash(false);
      return;
    }
    // Record adjustment explicitly tagged with active business
    const adjEntry = {
      id: generateUniqueId('adj_'),
      businessId: String(activeBusinessId),
      category: diff > 0 ? 'malik_in' : 'cost',
      type: diff > 0 ? 'in' : 'out',
      amount: Math.abs(diff),
      desc: diff > 0 ? 'ক্যাশ সমন্বয় (উদ্বৃত্ত জমা)' : 'ক্যাশ সমন্বয় (ঘাটতি সমন্বয়)',
      date: getTodayDate(),
      time: getTimeString(),
    };
    setIsSaving(true);
    const saveRes = await storageRepository.mutateCollection('cashEntries', (latestCash) => {
      return [adjEntry, ...latestCash];
    });
    setIsSaving(false);
    if (!saveRes.success) {
      Alert.alert(tStatic("ত্রুটি"), tStatic("ক্যাশবক্স সমন্বয় সংরক্ষণ করা যায়নি।"));
      return;
    }
    setCashEntries(saveRes.collection);
    setModalReconcileCash(false);
    Alert.alert(tStatic("সফল"), tStatic("ক্যাশবক্স সমন্বয় রেকর্ড সম্পন্ন হয়েছে।"));
  };
  const handleReconcileCash = handleSaveReconciliation;

  // --- HANDLER: STOCK INVENTORY ---
  const handleSaveProduct = async () => {
    if (!prodName.trim()) {
      Alert.alert(tStatic("সতর্কতা"), tStatic("পণ্যের নাম লিখুন"));
      return;
    }
    const newP = {
      id: generateUniqueId('prod_'),
      businessId: activeBusinessId || '1',
      name: prodName.trim(),
      unit: prodUnit.trim() || 'পিস',
      buyPrice: parseFloat(prodBuyPrice) || 0,
      sellPrice: parseFloat(prodSellPrice) || 0,
      stock: parseFloat(prodStock) || 0,
    };
    setIsSaving(true);
    const saveRes = await storageRepository.mutateCollection('inventory', (latestInv) => {
      return [newP, ...latestInv];
    });
    setIsSaving(false);
    if (!saveRes.success) {
      Alert.alert(tStatic("ত্রুটি"), tStatic("পণ্য সংরক্ষণ করা যায়নি।"));
      return;
    }
    setInventory(saveRes.collection);
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
      Alert.alert(tStatic("সতর্কতা"), valRes.error);
      return;
    }
    setIsSaving(true);
    const saveRes = await storageRepository.mutateCollection('inventory', (latestInv) => {
      return latestInv.map((p) =>
        String(p.id) === String(selectedProduct.id) ? { ...p, stock: valRes.newStock } : p
      );
    });
    setIsSaving(false);
    if (!saveRes.success) {
      Alert.alert(tStatic("ত্রুটি"), tStatic("স্টক সংরক্ষণ ব্যর্থ হয়েছে।"));
      return;
    }
    setInventory(saveRes.collection);
    setStockAdjustQty('');
    setModalAdjustStock(false);
    setSelectedProduct(null);
  };

  const handleDeleteProduct = (id) => {
    Alert.alert(tStatic("পণ্য মুছবেন?"), tStatic("এই পণ্যটি তালিকা থেকে মুছে ফেলতে চান?"), [
      { text: tStatic("বাতিল"), style: 'cancel' },
      {
        text: tStatic("মুছুন"),
        style: 'destructive',
        onPress: async () => {
          setIsSaving(true);
          const saveRes = await storageRepository.mutateCollection('inventory', (latestInv) => {
            return latestInv.filter((p) => String(p.id) !== String(id));
          });
          setIsSaving(false);
          if (!saveRes.success) {
            Alert.alert(tStatic("ত্রুটি"), tStatic("পণ্য মুছে ফেলা সম্ভব হয়নি।"));
            return;
          }
          setInventory(saveRes.collection);
        },
      },
    ]);
  };

  // --- HANDLER: BUSINESS NOTES ---
  const handleAddNote = async () => {
    if (!newNoteText.trim()) return;
    const newN = {
      id: generateUniqueId('note_'),
      businessId: activeBusinessId || '1',
      text: newNoteText.trim(),
      isComplete: false,
      date: getTodayDate(),
    };
    setIsSaving(true);
    const saveRes = await storageRepository.mutateCollection('notes', (latestNotes) => {
      return [newN, ...latestNotes];
    });
    setIsSaving(false);
    if (!saveRes.success) {
      Alert.alert(tStatic("ত্রুটি"), tStatic("নোট সংরক্ষণ করা যায়নি।"));
      return;
    }
    setNotes(saveRes.collection);
    setNewNoteText('');
  };

  const handleToggleNote = async (id) => {
    setIsSaving(true);
    const saveRes = await storageRepository.mutateCollection('notes', (latestNotes) => {
      return latestNotes.map((n) => (String(n.id) === String(id) ? { ...n, isComplete: !n.isComplete } : n));
    });
    setIsSaving(false);
    if (!saveRes.success) {
      Alert.alert(tStatic("ত্রুটি"), tStatic("নোট আপডেট করা যায়নি।"));
      return;
    }
    setNotes(saveRes.collection);
  };

  const handleDeleteNote = async (id) => {
    setIsSaving(true);
    const saveRes = await storageRepository.mutateCollection('notes', (latestNotes) => {
      return latestNotes.filter((n) => String(n.id) !== String(id));
    });
    setIsSaving(false);
    if (!saveRes.success) {
      Alert.alert(tStatic("ত্রুটি"), tStatic("নোট মুছে ফেলা সম্ভব হয়নি।"));
      return;
    }
    setNotes(saveRes.collection);
  };

  // --- HANDLER: TALLYPAY WALLET ---
  const handleAddMoney = async () => {
    const amt = parseFloat(addMoneyAmount);
    if (!amt || amt <= 0) {
      Alert.alert(tStatic("সতর্কতা"), tStatic("টাকার পরিমাণ দিন"));
      return;
    }
    const newTxn = {
      id: generateUniqueId('w_'),
      title: `অ্যাড মানি (${addMoneyMethod})`,
      amount: amt,
      type: 'in',
      date: getTodayDate(),
      time: getTimeString(),
    };
    setIsSaving(true);
    const saveRes = await storageRepository.mutateStore((latestStore) => {
      const curBal = Number(latestStore.walletBalance) || 0;
      const curTxns = latestStore.walletTxns || [];
      return {
        ...latestStore,
        walletBalance: curBal + amt,
        walletTxns: [newTxn, ...curTxns],
      };
    });
    setIsSaving(false);
    if (!saveRes.success) {
      Alert.alert(tStatic("ত্রুটি"), tStatic("ওয়ালেট আপডেট করা যায়নি।"));
      return;
    }
    setWalletBalance(saveRes.data.walletBalance);
    setWalletTxns(saveRes.data.walletTxns);
    setAddMoneyAmount('');
    setModalAddMoney(false);
    Alert.alert(tStatic("সফল"), `${tStatic("৳ ")}${formatMoney(amt)}${tStatic(" টাকা ওয়ালেটে সফলভাবে যোগ হয়েছে (লোকাল লেজার)।")}`);
  };

  const handleMobileRecharge = async () => {
    const amt = parseFloat(rechargeAmount);
    if (!amt || amt <= 0) {
      Alert.alert(tStatic("সতর্কতা"), tStatic("সঠিক রিচার্জের পরিমাণ দিন"));
      return;
    }
    if (walletBalance < amt) {
      Alert.alert(tStatic("ব্যর্থ"), tStatic("ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই। প্রথমে অ্যাড মানি করুন।"));
      return;
    }
    const cleanPh = rechargePhone.replace(/[^0-9]/g, '');
    if (cleanPh.length < 11) {
      Alert.alert(tStatic("সতর্কতা"), tStatic("সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন"));
      return;
    }
    const newTxn = {
      id: generateUniqueId('w_'),
      title: `রিচার্জ (${rechargeOperator} - ${cleanPh})`,
      amount: amt,
      type: 'out',
      date: getTodayDate(),
      time: getTimeString(),
    };
    setIsSaving(true);
    const saveRes = await storageRepository.mutateStore((latestStore) => {
      const curBal = Number(latestStore.walletBalance) || 0;
      const curTxns = latestStore.walletTxns || [];
      return {
        ...latestStore,
        walletBalance: curBal - amt,
        walletTxns: [newTxn, ...curTxns],
      };
    });
    setIsSaving(false);
    if (!saveRes.success) {
      Alert.alert(tStatic("ত্রুটি"), tStatic("রিচার্জ সংরক্ষণ করা যায়নি।"));
      return;
    }
    setWalletBalance(saveRes.data.walletBalance);
    setWalletTxns(saveRes.data.walletTxns);
    setRechargePhone('');
    setRechargeAmount('');
    setModalMobileRecharge(false);
    Alert.alert(tStatic("সফল"), `${cleanPh}${tStatic(" নম্বরে ৳ ")}${formatMoney(amt)}${tStatic(" রিচার্জ সফল হয়েছে (লোকাল লেজার)।")}`);
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
      Alert.alert(tStatic("সতর্কতা"), tStatic("কোনো মোবাইল নম্বর নেই"));
      return;
    }
    const clean = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${clean}`).catch(() => {
      Alert.alert(tStatic("কল ব্যর্থ"), tStatic("কল অ্যাপ ওপেন করা যায়নি"));
    });
  };

  const initGoogleSignIn = async () => {
    try {
      const mod = require('@react-native-google-signin/google-signin');
      if (mod && mod.GoogleSignin && typeof mod.GoogleSignin.configure === 'function') {
        const config = {
          scopes: ['https://www.googleapis.com/auth/drive.appdata'],
        };
        if (GOOGLE_WEB_CLIENT_ID) {
          config.webClientId = GOOGLE_WEB_CLIENT_ID;
          config.offlineAccess = true;
        }
        mod.GoogleSignin.configure(config);
      }
    } catch (e) {}
  };

  // --- GOOGLE DRIVE BACKUP & RESTORE HANDLERS ---
  const handleNativeGoogleSignIn = async () => {
    try {
      let GoogleSignin = null;
      try {
        const mod = require('@react-native-google-signin/google-signin');
        GoogleSignin = mod.GoogleSignin;
      } catch (e) {}

      if (GoogleSignin && typeof GoogleSignin.signIn === 'function') {
        setCloudBackupStatus('checking');
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const config = {
          scopes: [
            'https://www.googleapis.com/auth/drive.appdata',
          ],
        };
        if (GOOGLE_WEB_CLIENT_ID) {
          config.webClientId = GOOGLE_WEB_CLIENT_ID;
          config.offlineAccess = true;
        }
        GoogleSignin.configure(config);

        console.log('[GoogleSignIn] Calling GoogleSignin.signIn()...');
        const res = await GoogleSignin.signIn();

        if (res && res.type === 'cancelled') {
          setCloudBackupStatus('idle');
          return;
        }

        const userRaw = res && res.data ? res.data.user : (res && res.user ? res.user : null);
        console.log('[GoogleSignIn] signIn completed for account:', userRaw ? userRaw.email : 'unknown');
        if (!userRaw || !userRaw.id || !userRaw.email) {
          throw new Error('গুগল একাউন্ট থেকে ব্যবহারকারীর সঠিক তথ্য পাওয়া যায়নি।');
        }

        const tokens = await GoogleSignin.getTokens();
        if (!tokens || !tokens.accessToken) {
          throw new Error('গুগল ড্রাইভ এক্সেস টোকেন পাওয়া যায়নি।');
        }

        const verifiedUser = {
          sub: String(userRaw.id),
          email: userRaw.email.trim().toLowerCase(),
          name: userRaw.name || userRaw.email.split('@')[0],
          photo: userRaw.photo || null,
          connectedAt: new Date().toISOString(),
        };

        await handleConnectGoogle(verifiedUser, tokens.accessToken);
      } else {
        setCloudBackupStatus('idle');
        Alert.alert(
          tStatic("নেটিভ গুগল সাইন-ইন"),
          tStatic("নেটিভ গুগল সাইন-ইন ব্যবহারের জন্য যথাযথ ডেভেলপমেন্ট বিল্ড APK প্রয়োজন। সাধারণ ফাইল ব্যাকআপের জন্য অফলাইন ফাইল ব্যাকআপ ট্যাব ব্যবহার করতে পারেন।")
        );
      }
    } catch (err) {
      setCloudBackupStatus('idle');
      console.log('[GoogleSignIn] CAUGHT ERROR:', err ? err.code : null, err ? err.message : null);
      if (err.code === 'SIGN_IN_CANCELLED' || (err.message && err.message.toLowerCase().includes('cancel'))) {
        return;
      }
      setCloudBackupStatus('error');
      const rawMsg = (err && err.message) ? String(err.message) : '';
      const errCode = (err && err.code) ? String(err.code) : '';
      if (errCode === '10' || rawMsg.includes('DEVELOPER_ERROR') || rawMsg.includes('statusCode=10')) {
        Alert.alert(
          tStatic("গুগল ক্লাউড কনফিগারেশন ত্রুটি (DEVELOPER_ERROR)"),
          tStatic("গুগল সাইন-ইন সফল করার জন্য Google Cloud Console-এ এই অ্যাপের প্যাকেজ নাম এবং SHA-1 ফিঙ্গারপ্রিন্ট যুক্ত থাকতে হবে।\n\n") +
          tStatic("• প্যাকেজ নাম: com.progoti.tallykhata.offline\n\n") +
          tStatic("• SHA-1 ফিঙ্গারপ্রিন্ট: 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25\n\n") +
          tStatic("Google Cloud Console > Credentials > Create Credentials > OAuth client ID > Android নির্বাচন করে প্যাকেজ ও SHA-1 বসিয়ে দিন।")
        );
      } else {
        Alert.alert(
          tStatic("গুগল সাইন-ইন ত্রুটি"),
          rawMsg || tStatic("গুগল সাইন-ইন সম্পন্ন করা সম্ভব হয়নি।")
        );
      }
    }
  };

  const handleConnectGoogle = async (verifiedUser, token) => {
    try {
      if (!verifiedUser || !verifiedUser.sub || !verifiedUser.email) {
        throw new Error('গুগল একাউন্টের সঠিক পরিচয় যাচাই করা যায়নি।');
      }
      if (!token) {
        throw new Error('গুগল ড্রাইভ এক্সেস টোকেন অনুপস্থিত।');
      }

      setCloudBackupStatus('checking');

      // Verify the token by checking Google Drive AppData folder directly
      let meta = null;
      try {
        const remoteFile = await googleDriveBackupService.findBackupFile(token);
        if (remoteFile) {
          meta = {
            fileId: remoteFile.id,
            name: remoteFile.name,
            size: remoteFile.size,
            modifiedTime: remoteFile.modifiedTime,
            appProperties: remoteFile.appProperties,
          };
        }
      } catch (driveErr) {
        throw new Error('গুগল ড্রাইভে কানেক্ট করা সম্ভব হয়নি: ' + (driveErr.message || ''));
      }

      setGoogleUser(verifiedUser);
      setGoogleAccessToken(token); // in-memory only for security
      setCloudBackupMetadata(meta);
      setCloudBackupStatus('idle');

      // Persist user and metadata, but NEVER persist OAuth access token
      await persistData({
        googleUser: verifiedUser,
        cloudBackupMetadata: meta,
      });

      Alert.alert(tStatic("সফল সংযোগ!"), verifiedUser.email + tStatic(" গুগল একাউন্টটি সফলভাবে সংযুক্ত হয়েছে।"));
    } catch (err) {
      setCloudBackupStatus('error');
      Alert.alert(tStatic("সংযোগ ত্রুটি"), err.message || tStatic("গুগল একাউন্ট যুক্ত করতে সমস্যা হয়েছে।"));
    }
  };

  const handleDisconnectGoogle = async () => {
    Alert.alert(
      tStatic("একাউন্ট ডিসকানেক্ট"),
      tStatic("আপনি কি বর্তমান গুগল একাউন্টটি বিচ্ছিন্ন করতে চান? এতে ক্লাউডের ব্যাকআপ মুছে যাবে না।"),
      [
        { text: tStatic("বাতিল"), style: 'cancel' },
        {
          text: tStatic("হ্যাঁ, ডিসকানেক্ট"),
          style: 'destructive',
          onPress: async () => {
            try {
              const mod = require('@react-native-google-signin/google-signin');
              if (mod && mod.GoogleSignin && typeof mod.GoogleSignin.signOut === 'function') {
                await mod.GoogleSignin.signOut();
              }
            } catch (e) {}

            setGoogleUser(null);
            setGoogleAccessToken('');
            setCloudBackupMetadata(null);
            setCloudBackupStatus('idle');

            await persistData({
              googleUser: null,
              cloudBackupMetadata: null,
            });
            Alert.alert(tStatic("ডিসকানেক্ট সম্পন্ন"), tStatic("গুগল একাউন্ট সংযোগ বিচ্ছিন্ন করা হয়েছে।"));
          },
        },
      ]
    );
  };

  /**
   * Acquire a verified, non-expired Google OAuth access token from native Google Play Services.
   * Clears cached token if forceRefresh is true or when reacquisition is required after 401.
   */
  const getValidGoogleAccessToken = async (forceRefresh = false) => {
    if (!googleUser || !googleUser.sub) {
      return null;
    }

    let GoogleSignin = null;
    try {
      const mod = require('@react-native-google-signin/google-signin');
      GoogleSignin = mod.GoogleSignin;
    } catch (e) {}

    if (!GoogleSignin || typeof GoogleSignin.getTokens !== 'function') {
      return null;
    }

    try {
      let currentToken = googleAccessToken;

      if (forceRefresh && currentToken && typeof GoogleSignin.clearCachedAccessToken === 'function') {
        try {
          await GoogleSignin.clearCachedAccessToken(currentToken);
        } catch (clearErr) {
          console.log('[GoogleToken] clearCachedAccessToken notice:', clearErr ? clearErr.message : clearErr);
        }
        currentToken = '';
        setGoogleAccessToken('');
      }

      if (!currentToken || forceRefresh) {
        const tokens = await GoogleSignin.getTokens();
        if (tokens && tokens.accessToken) {
          currentToken = tokens.accessToken;
          setGoogleAccessToken(currentToken);
        }
      }

      return currentToken || null;
    } catch (err) {
      console.log('[GoogleToken] Error obtaining Google access token:', err ? err.message : err);
      return null;
    }
  };

  const executeCloudBackup = async () => {
    let latestMM = moneyManagerState;
    try {
      const persisted = await AsyncStorage.getItem(MM_STORAGE_KEY);
      if (persisted) {
        const parsed = JSON.parse(persisted);
        if (parsed && typeof parsed === 'object') {
          latestMM = parsed;
        }
      }
    } catch (e) {
      console.warn('[executeCloudBackup] Failed to read persisted Money Manager state:', e);
    }

    return orchestrateCloudBackup({
      storageRepository,
      driveService: googleDriveBackupService,
      getAccessToken: getValidGoogleAccessToken,
      googleUser,
      existingFileId: cloudBackupMetadata ? cloudBackupMetadata.fileId : null,
      extraData: {
        moneyManager: latestMM,
        preferences: { theme: appTheme, language: appLanguage },
      },
      onStatusChange: setCloudBackupStatus,
      onMetaUpdated: async (meta) => {
        setCloudBackupMetadata(meta);
        await persistData({ cloudBackupMetadata: meta });
      },
      alertFn: (title, message) => Alert.alert(title, message),
    });
  };

  const handleCloudBackupNow = async () => {
    if (!googleUser || !googleUser.sub) {
      Alert.alert(
        tStatic("গুগল একাউন্ট প্রয়োজন"),
        tStatic("ক্লাউড ব্যাকআপ নিতে প্রথমে আপনার গুগল একাউন্ট যুক্ত করতে হবে। আপনি কি এখন একাউন্ট যুক্ত করতে চান?"),
        [
          { text: tStatic("বাতিল"), style: 'cancel' },
          { text: tStatic("যুক্ত করুন"), onPress: handleNativeGoogleSignIn },
        ]
      );
      return;
    }

    let token = await getValidGoogleAccessToken(false);
    if (!token) {
      // Attempt fresh token retrieval from native Play Services
      token = await getValidGoogleAccessToken(true);
    }

    if (!token) {
      Alert.alert(
        tStatic("অনুমোদন প্রয়োজন"),
        tStatic("গুগল ড্রাইভ এক্সেস টোকেন পাওয়া যায়নি। অনুগ্রহ করে পুনরায় গুগল একাউন্ট সংযোগ করুন।"),
        [
          { text: tStatic("বাতিল"), style: 'cancel' },
          { text: tStatic("পুনরায় সংযোগ"), onPress: handleNativeGoogleSignIn },
        ]
      );
      return;
    }

    return executeCloudBackup();
  };

  const applyStateToUi = (state, { resetPin = false } = {}) => {
    if (!state) return;
    if (Array.isArray(state.accounts)) setAccounts(state.accounts);
    if (Array.isArray(state.journals)) setJournals(state.journals);
    if (Array.isArray(state.cashEntries)) setCashEntries(state.cashEntries);
    const restoredInv = Array.isArray(state.inventory) ? state.inventory : (Array.isArray(state.stock) ? state.stock : null);
    if (restoredInv) setInventory(restoredInv);
    if (Array.isArray(state.notes)) setNotes(state.notes);
    if (Array.isArray(state.businesses)) setBusinesses(state.businesses);
    if (state.activeBusinessId) setActiveBusinessId(String(state.activeBusinessId));
    if (state.businessName) setBusinessName(state.businessName);
    if (state.ownerName !== undefined) setOwnerName(state.ownerName);
    if (state.ownerPhone !== undefined) setOwnerPhone(state.ownerPhone);
    if (state.businessAddress !== undefined) setBusinessAddress(state.businessAddress);
    if (state.openingBalance !== undefined) setOpeningBalance(Number(state.openingBalance) || 0);
    if (state.walletBalance !== undefined) setWalletBalance(Number(state.walletBalance) || 0);
    if (Array.isArray(state.walletTxns)) setWalletTxns(state.walletTxns);
    if (state.tallyMessageBalance !== undefined) setTallyMessageBalance(Number(state.tallyMessageBalance) || 50);
    if (resetPin) {
      setPinEnabled(false);
      setAppPin('');
    } else {
      if (state.pinEnabled !== undefined) setPinEnabled(Boolean(state.pinEnabled));
      if (state.appPin !== undefined) setAppPin(String(state.appPin));
    }
  };

  const executeCloudRestore = async (domains = ['all']) => {
    return orchestrateCloudRestore({
      storageRepository,
      driveService: googleDriveBackupService,
      getAccessToken: getValidGoogleAccessToken,
      fileId: cloudBackupMetadata ? cloudBackupMetadata.fileId : null,
      userSub: googleUser ? googleUser.sub : null,
      domains,
      extraState: {
        moneyManager: moneyManagerState,
        preferences: { theme: appTheme, language: appLanguage },
      },
      onStatusChange: setCloudBackupStatus,
      onFileDiscovered: async (meta) => {
        setCloudBackupMetadata(meta);
        await persistData({ cloudBackupMetadata: meta });
      },
      onStateCommitted: (newState) => {
        const isBusinessRestored = !domains || domains.includes('all') || domains.includes('business');
        applyStateToUi(newState, { resetPin: isBusinessRestored });
      },
      onMoneyManagerRestored: async (newMM) => {
        if (newMM) {
          let processed = newMM;
          try {
            if (moneyManagerService && typeof moneyManagerService.processRecurringTransactions === 'function') {
              processed = moneyManagerService.processRecurringTransactions(newMM, getTodayDate());
            }
          } catch (_) {}
          setMoneyManagerState(processed);
          try {
            await AsyncStorage.setItem(MM_STORAGE_KEY, JSON.stringify(processed));
          } catch (_) {}
        }
      },
      onPreferencesRestored: (newPrefs) => {
        if (newPrefs) {
          if (newPrefs.theme) setAppTheme(newPrefs.theme);
          if (newPrefs.language) setAppLanguage(newPrefs.language);
        }
      },
      onRollback: (safeState, safeMM, safePrefs) => {
        applyStateToUi(safeState, { resetPin: false });
        if (safeMM) setMoneyManagerState(safeMM);
        if (safePrefs) {
          if (safePrefs.theme) setAppTheme(safePrefs.theme);
          if (safePrefs.language) setAppLanguage(safePrefs.language);
        }
      },
      alertFn: (title, message) => Alert.alert(title, message),
    });
  };

  const handleCloudRestore = async () => {
    if (!googleUser || !googleUser.sub) {
      Alert.alert(
        tStatic("গুগল একাউন্ট প্রয়োজন"),
        tStatic("অনলাইন ব্যাকআপ রিস্টোর করতে প্রথমে আপনার গুগল একাউন্ট যুক্ত করতে হবে। আপনি কি এখন একাউন্ট যুক্ত করতে চান?"),
        [
          { text: tStatic("বাতিল"), style: 'cancel' },
          { text: tStatic("যুক্ত করুন"), onPress: handleNativeGoogleSignIn },
        ]
      );
      return;
    }
    let token = await getValidGoogleAccessToken(false);
    if (!token) {
      token = await getValidGoogleAccessToken(true);
    }
    if (!token) {
      Alert.alert(
        tStatic("অনুমোদন প্রয়োজন"),
        tStatic("গুগল ড্রাইভ এক্সেস টোকেন পাওয়া যায়নি। অনুগ্রহ করে পুনরায় গুগল একাউন্ট সংযোগ করুন।"),
        [
          { text: tStatic("বাতিল"), style: 'cancel' },
          { text: tStatic("পুনরায় সংযোগ"), onPress: handleNativeGoogleSignIn },
        ]
      );
      return;
    }

    let meta = cloudBackupMetadata;
    if (!meta || !meta.fileId) {
      setCloudBackupStatus('checking');
      try {
        const remoteFile = await googleDriveBackupService.findBackupFile(token);
        if (remoteFile) {
          meta = {
            fileId: remoteFile.id,
            name: remoteFile.name,
            size: remoteFile.size,
            modifiedTime: remoteFile.modifiedTime,
            appProperties: remoteFile.appProperties,
          };
          setCloudBackupMetadata(meta);
          await persistData({ cloudBackupMetadata: meta });
        }
      } catch (findErr) {
        const isAuthErr = findErr && findErr.message && (findErr.message.includes('401') || findErr.message.toLowerCase().includes('unauthorized'));
        if (isAuthErr) {
          const freshToken = await getValidGoogleAccessToken(true);
          if (freshToken) {
            token = freshToken;
            try {
              const remoteFile = await googleDriveBackupService.findBackupFile(freshToken);
              if (remoteFile) {
                meta = {
                  fileId: remoteFile.id,
                  name: remoteFile.name,
                  size: remoteFile.size,
                  modifiedTime: remoteFile.modifiedTime,
                  appProperties: remoteFile.appProperties,
                };
                setCloudBackupMetadata(meta);
                await persistData({ cloudBackupMetadata: meta });
              }
            } catch (retryErr) {
              console.log('[CloudRestore] findBackupFile retry notice:', retryErr);
            }
          }
        }
      } finally {
        setCloudBackupStatus('idle');
      }
    }

    if (!meta || !meta.fileId) {
      Alert.alert(tStatic("ব্যাকআপ পাওয়া যায়নি"), tStatic("আপনার এই গুগল ড্রাইভ একাউন্টে কোনো সংরক্ষিত ব্যাকআপ পাওয়া যায়নি। প্রথমে \"এখন ব্যাকআপ নিন\" বাটনে চাপ দিয়ে ব্যাকআপ তৈরি করুন।"));
      return;
    }

    const backupDate = meta.modifiedTime
      ? new Date(meta.modifiedTime).toLocaleDateString('bn-BD', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : 'আজ';
    const accCount = toBengaliNumber(meta.manifest?.recordCounts?.accounts || meta.appProperties?.totalAccounts || 0);
    const jrnCount = toBengaliNumber(meta.manifest?.recordCounts?.journals || meta.appProperties?.totalJournals || 0);

    const domainLabels = {
      all: tStatic("সব ডেটা"),
      business: tStatic("শুধুমাত্র ব্যবসার খাতা"),
      moneyManager: tStatic("ব্যক্তিগত আয়-ব্যয়"),
    };
    const domainText = domainLabels[restoreDomain] || tStatic("সব ডেটা");
    const chosenDomains = getSelectedRestoreDomains(restoreDomain);

    Alert.alert(
      tStatic("অনলাইন ব্যাকআপ রিস্টোর"),
      `${tStatic("গুগল ড্রাইভ থেকে ব্যাকআপ রিস্টোর করার পূর্বে বর্তমান ডাটার একটি লোকাল সেফটি কপি তৈরি করা হবে।\n\n• রিস্টোরের ক্ষেত্র: ")}${domainText}${tStatic("\n• ব্যাকআপের তারিখ: ")}${backupDate}${tStatic("\n• মোট হিসাব: ")}${accCount}${tStatic(" টি\n• মোট লেনদেন: ")}${jrnCount}${tStatic(" টি\n\nআপনি কি নিশ্চিত রিস্টোর করতে চান?")}`,
      [
        { text: tStatic("বাতিল"), style: 'cancel' },
        { text: tStatic("হ্যাঁ, রিস্টোর করুন"), onPress: () => executeCloudRestore(chosenDomains) },
      ]
    );
  };

  const handleExportData = async () => {
    try {
      const currentState = storageRepository.getAuthoritativeState();
      const payload = buildBackupPayload(
        {
          ...currentState,
          moneyManager: moneyManagerState,
          preferences: { theme: appTheme, language: appLanguage },
        },
        googleUser || { sub: 'offline_export', email: '', name: businessName }
      );
      const jsonStr = JSON.stringify(payload, null, 2);
      await Share.share({
        title: `TallyKhata Backup - ${businessName}`,
        message: jsonStr,
      });
    } catch (e) {
      Alert.alert(tStatic("ত্রুটি"), tStatic("ডাটা এক্সপোর্ট করা সম্ভব হয়নি।"));
    }
  };

  const handleChangeGoogleAccount = async () => {
    Alert.alert(
      tStatic("গুগল একাউন্ট পরিবর্তন"),
      tStatic("আপনি কি গুগল একাউন্ট পরিবর্তন করতে চান? বর্তমান একাউন্ট সাইন-আউট করে নতুন একাউন্ট সিলেক্ট করা হবে। আপনার লোকাল ডাটা অক্ষুণ্ণ থাকবে।"),
      [
        { text: tStatic("বাতিল"), style: 'cancel' },
        {
          text: tStatic("পরিবর্তন করুন"),
          onPress: async () => {
            try {
              let GoogleSignin = null;
              try {
                const mod = require('@react-native-google-signin/google-signin');
                GoogleSignin = mod.GoogleSignin;
              } catch (e) {}
              if (GoogleSignin) {
                await GoogleSignin.signOut().catch(() => {});
              }
              setGoogleUser(null);
              setGoogleAccessToken('');
              setCloudBackupMetadata(null);
              await persistData({
                googleUser: null,
                googleAccessToken: '',
                cloudBackupMetadata: null,
              });
              handleNativeGoogleSignIn();
            } catch (err) {
              console.error('Change account error:', err);
            }
          },
        },
      ]
    );
  };

  const handleRemoveGoogleAccount = async () => {
    Alert.alert(
      tStatic("গুগল একাউন্ট সরান"),
      tStatic("আপনি কি গুগল একাউন্ট সংযোগ বিচ্ছিন্ন করতে চান? আপনার বর্তমান মোবাইলের সকল খাতার ডাটা নিরাপদ থাকবে এবং গুগল ড্রাইভে থাকা আগের ব্যাকআপও অক্ষুণ্ণ থাকবে।"),
      [
        { text: tStatic("বাতিল"), style: 'cancel' },
        {
          text: tStatic("সরান"),
          style: 'destructive',
          onPress: async () => {
            try {
              let GoogleSignin = null;
              try {
                const mod = require('@react-native-google-signin/google-signin');
                GoogleSignin = mod.GoogleSignin;
              } catch (e) {}
              if (GoogleSignin) {
                await GoogleSignin.signOut().catch(() => {});
              }
              setGoogleUser(null);
              setGoogleAccessToken('');
              setCloudBackupMetadata(null);
              setAutoBackupEnabled(false);
              await persistData({
                googleUser: null,
                googleAccessToken: '',
                cloudBackupMetadata: null,
                autoBackupEnabled: false,
              });
              Alert.alert(tStatic("সফল"), tStatic("গুগল একাউন্ট সফলভাবে সংযোগ বিচ্ছিন্ন করা হয়েছে।"));
            } catch (err) {
              console.error('Remove account error:', err);
            }
          },
        },
      ]
    );
  };
  // --- HANDLER: BACKUP & RESTORE ---
  const handleExportBackup = () => {
    const currentState = storageRepository.getAuthoritativeState();
    const payload = buildBackupPayload(
      {
        ...currentState,
        moneyManager: moneyManagerState,
        preferences: { theme: appTheme, language: appLanguage },
      },
      googleUser || { sub: 'offline_export', email: '', name: businessName }
    );
    const jsonStr = JSON.stringify(payload, null, 2);
    setBackupJsonText(jsonStr);
    setModalBackupRestore(true);
  };

  const handleShareBackup = () => {
    Share.share({
      title: `TallyKhata Backup - ${businessName}`,
      message: backupJsonText,
    });
  };

  const handleImportBackup = async (overrideDomains = null) => {
    const chosenDomains = overrideDomains || getSelectedRestoreDomains(restoreDomain);
    let restoreSnapshot = null;
    try {
      if (!backupJsonText.trim()) {
        Alert.alert(tStatic("সতর্কতা"), tStatic("দয়া করে ব্যাকআপ JSON ডাটা পেস্ট করুন"));
        return;
      }
      let parsed = null;
      try {
        parsed = JSON.parse(backupJsonText);
      } catch (parseErr) {
        Alert.alert(tStatic("ত্রুটি"), tStatic("অকার্যকর ব্যাকআপ JSON ডাটা। দয়া করে সঠিক ফাইল পেস্ট করুন।"));
        return;
      }

      // Fresh snapshot for this offline import attempt
      restoreSnapshot = await storageRepository.createLocalSafetySnapshot(null, {
        moneyManager: moneyManagerState,
        preferences: { theme: appTheme, language: appLanguage },
      });

      const commitRes = await storageRepository.commitRestorePayload(parsed, {
        snapshotId: restoreSnapshot ? restoreSnapshot.snapshotId : null,
        domains: chosenDomains,
        extraState: {
          moneyManager: moneyManagerState,
          preferences: { theme: appTheme, language: appLanguage },
        },
      });
      if (!commitRes || !commitRes.success) {
        if (restoreSnapshot && restoreSnapshot.snapshotId) {
          try {
            await storageRepository.rollbackToSafetySnapshot(restoreSnapshot.snapshotId);
          } catch (rbErr) {
            console.error('[ImportBackup] Rollback failed:', rbErr);
          }
        }
        Alert.alert(tStatic("ত্রুটি"), (commitRes && commitRes.error) || tStatic("ব্যাকআপ ডাটা সংরক্ষণ ব্যর্থ হয়েছে।"));
        return;
      }

      const shouldRestoreAll = chosenDomains.includes('all');
      const shouldRestoreBusiness = shouldRestoreAll || chosenDomains.includes('business');
      const shouldRestoreMM = shouldRestoreAll || chosenDomains.includes('moneyManager');
      const shouldRestorePrefs = shouldRestoreAll || chosenDomains.includes('preferences');

      if (shouldRestoreBusiness) {
        const newState = commitRes.data;
        if (Array.isArray(newState.accounts)) setAccounts(newState.accounts);
        if (Array.isArray(newState.journals)) setJournals(newState.journals);
        if (Array.isArray(newState.cashEntries)) setCashEntries(newState.cashEntries);
        const restoredInv = Array.isArray(newState.inventory) ? newState.inventory : (Array.isArray(newState.stock) ? newState.stock : null);
        if (restoredInv) setInventory(restoredInv);
        if (Array.isArray(newState.notes)) setNotes(newState.notes);
        if (Array.isArray(newState.businesses)) setBusinesses(newState.businesses);
        if (newState.activeBusinessId) setActiveBusinessId(String(newState.activeBusinessId));
        if (newState.businessName) setBusinessName(newState.businessName);
        if (newState.ownerName !== undefined) setOwnerName(newState.ownerName);
        if (newState.ownerPhone !== undefined) setOwnerPhone(newState.ownerPhone);
        if (newState.businessAddress !== undefined) setBusinessAddress(newState.businessAddress);
        if (newState.openingBalance !== undefined) setOpeningBalance(Number(newState.openingBalance) || 0);
        if (newState.walletBalance !== undefined) setWalletBalance(Number(newState.walletBalance) || 0);
        if (Array.isArray(newState.walletTxns)) setWalletTxns(newState.walletTxns);
        if (newState.tallyMessageBalance !== undefined) setTallyMessageBalance(Number(newState.tallyMessageBalance) || 50);

        setPinEnabled(false);
        setAppPin('');
      }

      if (shouldRestoreMM && commitRes.restoredMoneyManager) {
        setMoneyManagerState(commitRes.restoredMoneyManager);
      }
      if (shouldRestorePrefs && commitRes.restoredPreferences) {
        if (commitRes.restoredPreferences.theme) setAppTheme(commitRes.restoredPreferences.theme);
        if (commitRes.restoredPreferences.language) setAppLanguage(commitRes.restoredPreferences.language);
      }

      setModalBackupRestore(false);
      Alert.alert(tStatic("সফল"), tStatic("ডাটা সফলভাবে ব্যাকআপ থেকে পুনরুদ্ধার করা হয়েছে!"));
    } catch (err) {
      if (restoreSnapshot && restoreSnapshot.snapshotId) {
        try {
          await storageRepository.rollbackToSafetySnapshot(restoreSnapshot.snapshotId);
        } catch (rbErr) {
          console.error('[ImportBackup] Rollback failed:', rbErr);
        }
      }
      Alert.alert(tStatic("রিস্টোর ব্যর্থ"), err.message || tStatic("ব্যাকআপ রিস্টোর করার সময় ত্রুটি ঘটেছে।"));
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
      `লেনদেনের ধরন: ${isCust ? (isGiven ? 'বাকি বিক্রি' : 'বাকি আদায় (জমা)') : (isGiven ? 'টাকা পরিশোধ' : 'বাকিতে মাল ক্রয়')}\n` +
      `বিবরণ: ${txn.desc || 'সাধারণ লেনদেন'}\n` +
      `টাকার পরিমাণ: ৳ ${formatMoney(txn.amount)}\n` +
      `---------------------------------\n` +
      `${isCust ? 'বর্তমান সর্বমোট বকেয়া: ' : 'বর্তমান সর্বমোট দেনা: '}৳ ${formatMoney(account.balance)}\n` +
      `=================================\n` +
      `১০০% সঠিক ও ডিজিটাল টালিখাতা হিসাব।\nধন্যবাদ, আবার আসবেন।`
    );
  };

  // --- BUSINESS PICKER & COMPLETE LIFECYCLE HANDLERS ---
  const handleSelectBusiness = async (biz) => {
    setIsSaving(true);
    const res = await storageRepository.selectBusiness(biz.id);
    setIsSaving(false);
    if (!res.success) {
      Alert.alert(tStatic("ত্রুটি"), res.error?.message || tStatic("ব্যবসা পরিবর্তন ব্যর্থ হয়েছে।"));
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
    Alert.alert(tStatic("ব্যবসা পরিবর্তন"), `${tStatic("বর্তমানে সক্রিয়: ")}${store.businessName || biz.name}`);
  };

  const handleCreateBusiness = async () => {
    if (!newBizName.trim()) {
      Alert.alert(tStatic("সতর্কতা"), tStatic("ব্যবসার নাম লিখুন"));
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
      Alert.alert(tStatic("ত্রুটি"), res.error?.message || tStatic("নতুন ব্যবসা তৈরি ব্যর্থ হয়েছে।"));
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
    Alert.alert(tStatic("সফল"), `${tStatic("নতুন ব্যবসা \"")}${store.businessName || newBizName}${tStatic("\" তৈরি ও সক্রিয় করা হয়েছে।")}`);
  };

  const handleArchiveBusiness = (biz) => {
    Alert.alert(
      tStatic("ব্যবসা আর্কাইভ করবেন?"),
      `"${biz.name}${tStatic("\" আর্কাইভ করা হলে এটি সক্রিয় তালিকা থেকে লুকানো থাকবে, কিন্তু এর সকল আর্থিক হিসাব ও লেনদেন সম্পূর্ণ সুরক্ষিত থাকবে। আপনি যেকোনো সময় এটি পুনরুদ্ধার করতে পারবেন।")}`,
      [
        { text: tStatic("বাতিল"), style: 'cancel' },
        {
          text: tStatic("আর্কাইভ করুন"),
          style: 'destructive',
          onPress: async () => {
            setIsSaving(true);
            const res = await storageRepository.archiveBusiness(biz.id);
            setIsSaving(false);
            if (!res.success) {
              Alert.alert(tStatic("আর্কাইভ ব্যর্থ"), res.error?.message || tStatic("ব্যবসা আর্কাইভ করা সম্ভব হয়নি।"));
              return;
            }
            const store = res.data;
            if (store.activeBusinessId) setActiveBusinessId(String(store.activeBusinessId));
            if (Array.isArray(store.businesses)) setBusinesses(store.businesses);
            if (store.businessName) setBusinessName(store.businessName);
            if (store.ownerName) setOwnerName(store.ownerName);
            if (store.ownerPhone) setOwnerPhone(store.ownerPhone);
            if (store.businessAddress) setBusinessAddress(store.businessAddress);
            Alert.alert(tStatic("সফল"), `"${biz.name}${tStatic("\" সফলভাবে আর্কাইভ করা হয়েছে।")}`);
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
      Alert.alert(tStatic("পুনরুদ্ধার ব্যর্থ"), res.error?.message || tStatic("ব্যবসা পুনরুদ্ধার করা সম্ভব হয়নি।"));
      return;
    }
    const store = res.data;
    if (store.activeBusinessId) setActiveBusinessId(String(store.activeBusinessId));
    if (Array.isArray(store.businesses)) setBusinesses(store.businesses);
    if (store.businessName) setBusinessName(store.businessName);
    if (store.ownerName) setOwnerName(store.ownerName);
    if (store.ownerPhone) setOwnerPhone(store.ownerPhone);
    if (store.businessAddress) setBusinessAddress(store.businessAddress);
    Alert.alert(tStatic("সফল"), `"${biz.name}${tStatic("\" সফলভাবে পুনরুদ্ধার ও সক্রিয় করা হয়েছে।")}`);
  };

  const handlePermanentDeleteBusiness = (biz) => {
    Alert.alert(
      tStatic("স্থায়ীভাবে মুছে ফেলবেন?"),
      `"${biz.name}${tStatic("\" স্থায়ীভাবে মুছে ফেলতে চান? মনে রাখবেন, শুধুমাত্র কোনো লেনদেন বা হিসাব না থাকলেই এটি মুছে ফেলা যাবে।")}`,
      [
        { text: tStatic("বাতিল"), style: 'cancel' },
        {
          text: tStatic("মুছে ফেলুন"),
          style: 'destructive',
          onPress: async () => {
            setIsSaving(true);
            const res = await storageRepository.deleteBusinessPermanently(biz.id);
            setIsSaving(false);
            if (!res.success) {
              Alert.alert(tStatic("মুছে ফেলা সম্ভব নয়"), res.error?.message || tStatic("ব্যবসা মুছে ফেলা সম্ভব হয়নি।"));
              return;
            }
            const store = res.data;
            if (store.activeBusinessId) setActiveBusinessId(String(store.activeBusinessId));
            if (Array.isArray(store.businesses)) setBusinesses(store.businesses);
            if (store.businessName) setBusinessName(store.businessName);
            if (store.ownerName) setOwnerName(store.ownerName);
            if (store.ownerPhone) setOwnerPhone(store.ownerPhone);
            if (store.businessAddress) setBusinessAddress(store.businessAddress);
            Alert.alert(tStatic("সফল"), `"${biz.name}${tStatic("\" স্থায়ীভাবে মুছে ফেলা হয়েছে।")}`);
          },
        },
      ]
    );
  };

  // --- CASH RECONCILIATION WITH DENOMINATIONS HANDLER ---
  const handleSaveDenominations = async () => {
    if (!activeBusinessId || typeof activeBusinessId !== 'string' || !activeBusinessId.trim()) {
      Alert.alert(tStatic("ত্রুটি"), tStatic("সক্রিয় ব্যবসার আইডি পাওয়া যায়নি। ক্যাশবক্স সমন্বয় করা সম্ভব নয়।"));
      return;
    }
    const currentBiz = Array.isArray(businesses) ? businesses.find((b) => String(b.id) === String(activeBusinessId) && !b.isArchived) : null;
    if (!currentBiz) {
      Alert.alert(tStatic("ত্রুটি"), tStatic("নির্বাচিত ব্যবসাটি অকার্যকর বা পাওয়া যায়নি।"));
      return;
    }
    const totalCounted = countedFromNotes > 0 ? countedFromNotes : (Number(countedCash) || 0);
    const diff = totalCounted - totalCash;
    if (diff === 0) {
      setModalReconcileCash(false);
      resetDenominations();
      Alert.alert(tStatic("সফল"), tStatic("ক্যাশবক্স পুরোপুরি মিলে গেছে! কোনো গরমিল নেই।"));
      return;
    }
    const adjEntry = {
      id: generateUniqueId('adj_'),
      businessId: String(activeBusinessId),
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
    setIsSaving(true);
    const saveRes = await storageRepository.mutateCollection('cashEntries', (latestCash) => {
      return [adjEntry, ...latestCash];
    });
    setIsSaving(false);
    if (!saveRes.success) {
      Alert.alert(tStatic("ত্রুটি"), tStatic("ক্যাশবক্স মিলানো তথ্য সংরক্ষণ করা যায়নি।"));
      return;
    }
    setCashEntries(saveRes.collection);
    setModalReconcileCash(false);
    Alert.alert(
      tStatic("ক্যাশবক্স মিলানো সম্পন্ন"),
      diff === 0
        ? tStatic("ক্যাশ ১০০% মিলেছে।")
        : `${tStatic("ক্যাশ সমন্বয় রেকর্ড সেভ হয়েছে। পার্থক্য: ৳ ")}${formatMoney(Math.abs(diff))}`
    );
  };

  // --- TAGADA HANDLERS (SMS & BULK TAGADA) ---
  const handleSendSingleTagada = async (account) => {
    if (remainingSmsCount <= 0) {
      Alert.alert(tStatic("ফ্রি এসএমএস সমাপ্ত"), tStatic("আপনার ফ্রি টালি-মেসেজ শেষ হয়ে গেছে। ফোনের স্বাভাবিক এসএমএস বা WhatsApp ব্যবহার করুন।"));
      return;
    }
    const newCount = remainingSmsCount - 1;
    const log = {
      id: generateUniqueId('tag_'),
      customerName: account.name,
      phone: account.phone,
      amount: account.balance,
      date: getTodayDate(),
      time: getTimeString(),
    };
    setIsSaving(true);
    const saveRes = await storageRepository.mutateStore((latestStore) => {
      const curCount = Number(latestStore.remainingSmsCount) || 0;
      const curLogs = latestStore.tagadaLogs || [];
      return {
        ...latestStore,
        remainingSmsCount: Math.max(0, curCount - 1),
        tagadaLogs: [log, ...curLogs],
      };
    });
    setIsSaving(false);
    if (!saveRes.success) {
      Alert.alert(tStatic("ত্রুটি"), tStatic("তাগাদা মেসেজ রেকর্ড সংরক্ষণ করা যায়নি।"));
      return;
    }
    setRemainingSmsCount(saveRes.data.remainingSmsCount);
    setTagadaLogs(saveRes.data.tagadaLogs);
    setModalTagada(false);
    Alert.alert(
      tStatic("মেসেজ পাঠানো হয়েছে"),
      `${account.name}${tStatic(" (বকেয়া ৳ ")}${formatMoney(account.balance)}${tStatic(")-কে সফলভাবে টালি-মেসেজ পাঠানো হয়েছে।\nঅবশিষ্ট ফ্রি এসএমএস: ")}${newCount}${tStatic(" টি")}`
    );
  };

  const handleSendBulkTagada = () => {
    if (dueCustomers.length === 0) {
      Alert.alert(tStatic("তথ্য"), tStatic("কোনো কাস্টমারের কাছে বকেয়া বাকি নেই।"));
      return;
    }
    if (remainingSmsCount <= 0) {
      Alert.alert(tStatic("ফ্রি এসএমএস সমাপ্ত"), tStatic("আপনার কোনো ফ্রি মেসেজ বা এসএমএস কোটা অবশিষ্ট নেই।"));
      return;
    }
    Alert.alert(
      tStatic("গ্রুপ তাগাদা পাঠান"),
      `${tStatic("মোট ")}${dueCustomers.length}${tStatic(" জন বাকি কাস্টমারকে একসাথে টালি-মেসেজ পাঠাতে চান? মোট বকেয়া ৳ ")}${formatMoney(totalCustomerDue)}।`,
      [
        { text: tStatic("বাতিল"), style: 'cancel' },
        {
          text: tStatic("পাঠান"),
          onPress: async () => {
            if (remainingSmsCount <= 0) {
              Alert.alert(tStatic("ফ্রি এসএমএস সমাপ্ত"), tStatic("আপনার কোনো ফ্রি মেসেজ বা এসএমএস কোটা অবশিষ্ট নেই।"));
              return;
            }
            const todayStr = getTodayDate();
            const timeStr = getTimeString();
            const newLogs = dueCustomers.map((cust) => ({
              id: generateUniqueId('tag_'),
              customerName: cust.name,
              phone: cust.phone || '',
              amount: cust.balance,
              date: todayStr,
              time: timeStr,
            }));
            setIsSaving(true);
            const saveRes = await storageRepository.mutateStore((latestStore) => {
              const curCount = Number(latestStore.remainingSmsCount) || 0;
              const curLogs = latestStore.tagadaLogs || [];
              return {
                ...latestStore,
                remainingSmsCount: Math.max(0, curCount - 1),
                tagadaLogs: [...newLogs, ...curLogs],
              };
            });
            setIsSaving(false);
            if (!saveRes.success) {
              Alert.alert(tStatic("ত্রুটি"), tStatic("গ্রুপ তাগাদা সংরক্ষণ ব্যর্থ হয়েছে।"));
              return;
            }
            setRemainingSmsCount(saveRes.data.remainingSmsCount);
            setTagadaLogs(saveRes.data.tagadaLogs);
            Alert.alert(
              tStatic("সফল"),
              `${tStatic("সকল ")}${dueCustomers.length}${tStatic(" জন বকেয়া কাস্টমারকে গ্রুপ তাগাদা মেসেজ সফলভাবে পাঠানো হয়েছে!")}`
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
      Alert.alert(tStatic("সতর্কতা"), tStatic("সঠিক টাকার পরিমাণ দিন"));
      return;
    }
    if (amt > walletBalance) {
      Alert.alert(tStatic("ব্যর্থ"), tStatic("পর্যাপ্ত ওয়ালেট ব্যালেন্স নেই"));
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
      id: generateUniqueId('w_'),
      title: `মানি আউট (${methodLabel})`,
      amount: amt,
      type: 'out',
      date: getTodayDate(),
      time: getTimeString(),
    };
    const updatedTxns = [newTxn, ...walletTxns];
    const saveRes = await persistData({ walletBalance: newBal, walletTxns: updatedTxns });
    if (!saveRes.success) {
      Alert.alert(tStatic("ত্রুটি"), tStatic("মানি আউট সংরক্ষণ করা যায়নি।"));
      return;
    }
    setWalletBalance(newBal);
    setWalletTxns(updatedTxns);
    setMoneyOutAmount('');
    setMoneyOutAccNumber('');
    setModalMoneyOut(false);
    Alert.alert(tStatic("সফল"), `${tStatic("৳ ")}${formatMoney(amt)}${tStatic(" টাকা সফলভাবে ")}${methodLabel}${tStatic("-এ স্থানান্তর (লোকাল লেজার) করা হয়েছে।")}`);
  };

  // --- FILTERED ACCOUNTS FOR TAB 1 (BUSINESS SCOPED) ---
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
  }, [businessCashEntries, cashFilter]);


  // =========================================================================
  // VIEW: PIN SECURITY LOCK SCREEN
  // =========================================================================
  if (pinEnabled && isLocked) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: COLORS.primary }]}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />
        <View style={styles.pinLockContainer}>
          <Image source={require("./assets/icons/ic_lock.png")} style={{ width: 56, height: 56, marginBottom: 16, tintColor: "#FFFFFF" }} resizeMode="contain" />
          <Text style={styles.pinLockTitle}>{tStatic("টালিখাতা লক")}</Text>
          <Text style={styles.pinLockSub}>{tStatic("অ্যাপটি খুলতে আপনার ৪ ডিজিটের পিন দিন")}</Text>

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
                          Alert.alert(tStatic("ভুল PIN"), tStatic("সঠিক PIN দিয়ে চেষ্টা করুন।"));
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
  const isCustomer = selectedAccount ? selectedAccount.type === 1 : true;
  const rawJournals = selectedAccount ? (journals || []).filter((j) => j.accountId === selectedAccount.id) : [];
  const openingBal = Number(selectedAccount?.openingBalance) || 0;
  const openingEntry = (selectedAccount && openingBal > 0) ? [{
    id: 'opening_' + selectedAccount.id,
    isOpening: true,
    desc: isCustomer ? 'পূর্বের বাকি (শুরুর জের)' : 'পূর্বের দেনা (শুরুর জের)',
    amount: openingBal,
    date: selectedAccount.createDate || '২০২৬-১০-১৫',
    time: '',
    type: isCustomer ? 'given' : 'received',
  }] : [];
  const accountJournals = [...openingEntry, ...rawJournals];
  const totalGiven = accountJournals
    .filter((j) => j.type === 'given')
    .reduce((sum, j) => sum + Number(j.amount || 0), 0);
  const totalReceived = accountJournals
    .filter((j) => j.type === 'received')
    .reduce((sum, j) => sum + Number(j.amount || 0), 0);

  return (
    <ThemeContext.Provider value={themeContextValue}>
    <SafeAreaView style={[styles.container, isDark && { backgroundColor: currentTheme.screenBg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : (currentScreen === 'account_ledger' ? 'dark-content' : 'light-content')}
        backgroundColor={isDark ? currentTheme.headerBg : (currentScreen === 'account_ledger' ? '#FFFFFF' : '#B81414')}
      />
      {currentScreen === 'account_ledger' && selectedAccount ? (
        <View style={[{ flex: 1 }, isDark && tStyles.screenBg]}>

        {/* Ledger Top Header (matching authentic activity_customer_report_v2.xml toolbar) */}
        <View style={[styles.ledgerHeaderNav, isDark && tStyles.headerNav]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setCurrentScreen('home')}
            activeOpacity={0.7}
          >
            <Image
              source={require("./assets/icons/arrow_left.png")}
              style={{ width: 22, height: 22, tintColor: isDark ? currentTheme.textPrimary : '#1A1A1A' }}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <View style={styles.ledgerHeaderTitleBox}>
            <Text style={[styles.ledgerHeaderName, isDark && tStyles.textPrimary]} numberOfLines={1}>{selectedAccount.name}</Text>
            <Text style={[styles.ledgerHeaderSub, isDark && tStyles.textSecondary]}>
              {isCustomer ? tStatic("কাস্টমার হিসাব") : tStatic("সাপ্লায়ার হিসাব")}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {selectedAccount.phone ? (
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => handleMakeCall(selectedAccount.phone)}
                activeOpacity={0.7}
              >
                <AppIcon source={require("./assets/icons/ic_call.png")} variant="success" shape="circle" size={16} containerSize={32} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={handleOpenEditAccount}
              activeOpacity={0.7}
            >
              <AppIcon source={require("./assets/icons/ic_edit.png")} variant="neutral" shape="circle" size={16} containerSize={32} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={handleDeleteAccount}
              activeOpacity={0.7}
            >
              <AppIcon source={require("./assets/icons/ic_delete.png")} variant="danger" shape="circle" size={16} containerSize={32} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Profile Card (layout_customer_info_holder.xml) */}
        <View style={[styles.accountProfileCard, isDark && tStyles.card]}>
          <View style={[styles.profileAvatar, { backgroundColor: isCustomer ? (isDark ? '#450A0A' : COLORS.redLight) : (isDark ? '#064E3B' : COLORS.greenLight) }]}>
            <Text style={[styles.profileAvatarText, { color: isCustomer ? (isDark ? '#F87171' : COLORS.primary) : (isDark ? '#34D399' : COLORS.green) }]}>
              {(selectedAccount.name || tStatic("খ"))[0]}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.profileName, isDark && tStyles.textPrimary]}>{selectedAccount.name}</Text>
            <Text style={[styles.profilePhone, isDark && tStyles.textSecondary]}>
              {selectedAccount.phone || tStatic("মোবাইল নম্বর নেই")}
            </Text>
            {selectedAccount.address ? (
              <Text style={[styles.profileAddress, isDark && tStyles.textMuted]} numberOfLines={1}>{selectedAccount.address}</Text>
            ) : null}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.profileDueLabel, { color: isCustomer ? COLORS.primary : COLORS.green }]}>
              {isCustomer ? tStatic("মোট পাবো (বাকি)") : tStatic("মোট দেবো (দেনা)")}
            </Text>
            <Text style={[styles.profileDueAmount, { color: isCustomer ? COLORS.primary : COLORS.green }]}>{tStatic("৳                ৳ ")}{formatMoney(selectedAccount.balance)}
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
              <AppIcon source={require('./assets/icons/ic_sms.png')} variant="primary" shape="circle" size={20} containerSize={42} style={{ marginBottom: 6 }} tintColor={null} />
              <Text style={styles.quickActionLabel}>{t('tagada_send_sms')}</Text>
            </TouchableOpacity>
          ) : null}
          {selectedAccount.phone ? (
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => handleMakeCall(selectedAccount.phone)}
              activeOpacity={0.7}
            >
              <AppIcon source={require('./assets/icons/ic_call.png')} variant="success" shape="circle" size={20} containerSize={42} style={{ marginBottom: 6 }} />
              <Text style={styles.quickActionLabel}>{t('ledger_call')}</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => {
              const fullStatement =
                `=== ${businessName} ===\n` +
                `${tStatic("হিসাব খাতা: ")}${selectedAccount.name}\n` +
                `${tStatic("মোবাইল: ")}${selectedAccount.phone || tStatic("দেওয়া নেই")}\n` +
                `${tStatic("বর্তমান বকেয়া: ৳ ")}${formatMoney(selectedAccount.balance)}\n` +
                `${tStatic("মোট লেনদেন: ")}${accountJournals.length}${tStatic(" টি\n")}` +
                `${tStatic("দিলাম মোট: ৳ ")}${formatMoney(totalGiven)}\n` +
                `${tStatic("পেলাম মোট: ৳ ")}${formatMoney(totalReceived)}\n` +
                `${tStatic("যোগাযোগ: ")}${ownerPhone}`;
              Share.share({ message: fullStatement });
            }}
            activeOpacity={0.7}
          >
            <AppIcon source={require('./assets/icons/ic_pdf.png')} variant="purple" shape="circle" size={20} containerSize={42} style={{ marginBottom: 6 }} />
            <Text style={styles.quickActionLabel}>{t('ledger_share_statement')}</Text>
          </TouchableOpacity>
        </View>

        <TwoToneDivider marginVertical={8} />

        {/* Ledger Table Column Headers (layout_credit_details_table_head: লেনদেনের বিবরণ, দিলাম, পেলাম) */}
        <View style={[styles.ledgerTableHeader, isDark && { backgroundColor: currentTheme.cardBgElevated }]}>
          <Text style={[styles.ledgerColHeader, isDark && tStyles.textSecondary, { flex: 1.6 }]}>{t("ledger_col_desc")}</Text>
          <Text style={[styles.ledgerColHeader, { flex: 1, textAlign: 'right', color: isDark ? currentTheme.danger : COLORS.red }]}>
            {t('ledger_col_gave')}
          </Text>
          <Text style={[styles.ledgerColHeader, { flex: 1, textAlign: 'right', color: isDark ? currentTheme.success : COLORS.green }]}>
            {t('ledger_col_got')}
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
                style={[styles.ledgerRowCard, isDark && tStyles.card, item.isOpening && { backgroundColor: isDark ? currentTheme.cardBgElevated : '#F9FAFB' }]}
                onPress={() => {
                  if (item.isOpening) {
                    Alert.alert(tStatic("শুরুর জের"), tStatic("এই খাতার প্রারম্ভিক জের: ৳ ") + formatMoney(item.amount) + tStatic("।\nহিসাবের তথ্য বা জের পরিবর্তন করতে এডিট বোতাম ব্যবহার করুন।"), [
                      { text: tStatic("ঠিক আছে"), style: 'cancel' },
                      { text: tStatic("এডিট করুন"), onPress: handleOpenEditAccount },
                    ]);
                    return;
                  }
                  setSelectedVoucherTxn(item);
                  setModalVoucher(true);
                }}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1.6 }}>
                  <Text style={[styles.ledgerRowDesc, isDark && tStyles.textPrimary, item.isOpening && { color: isDark ? currentTheme.textSecondary : '#4B5563', fontWeight: 'bold' }]}>
                    {item.desc || tStatic("সাধারণ লেনদেন")}
                  </Text>
                  <Text style={[styles.ledgerRowDate, isDark && tStyles.textSecondary]}>
                    {formatDisplayDate(item.date)} {item.time ? '• ' + item.time : ''}
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end', justifyContent: 'center' }}>
                  {isGiven ? (
                    <Text style={styles.ledgerGivenAmount}>{tStatic("৳ ")}{formatMoney(item.amount)}</Text>
                  ) : (
                    <Text style={styles.dashMuted}>-</Text>
                  )}
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end', justifyContent: 'center' }}>
                  {!isGiven ? (
                    <Text style={styles.ledgerReceivedAmount}>{tStatic("৳ ")}{formatMoney(item.amount)}</Text>
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
              <Text style={styles.emptyText}>{tStatic("কোনো লেনদেন রেকর্ড নেই")}</Text>
              <Text style={styles.emptySubText}>{tStatic("নিচের বাটন চেপে বাকি বা জমা এন্ট্রি দিন")}</Text>
            </View>
          }
        />

        {/* Bottom Summary Totals Strip (bottomLinearLayout from activity_customer_report_v2.xml) */}
        <View style={styles.ledgerBottomTotalsStrip}>
          <Text style={styles.ledgerBottomTotalLabel}>{t('ledger_total')}</Text>
          <View style={styles.ledgerBottomTotalCreditBox}>
            <Text style={styles.ledgerBottomTotalCreditVal}>{tStatic("৳ ")}{formatMoney(totalGiven)}</Text>
          </View>
          <View style={styles.ledgerBottomTotalReceivedBox}>
            <Text style={styles.ledgerBottomTotalReceivedVal}>{tStatic("৳ ")}{formatMoney(totalReceived)}</Text>
          </View>
        </View>

        {/* Bottom Dual Entry Bar (দিলাম / পেলাম) */}
        <View style={[styles.ledgerBottomBar, isDark && tStyles.card]}>
          <TouchableOpacity
            style={[styles.bigEntryBtn, { backgroundColor: COLORS.primary, borderBottomColor: "#7F0C0C" }]}
            onPress={() => handleOpenAddTxn('given')}
            activeOpacity={0.85}
          >
            <Text style={styles.bigEntryBtnText}>{isCustomer ? t('btn_gave_due') : t('btn_gave_payment')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bigEntryBtn, { backgroundColor: COLORS.green, borderBottomColor: "#065F06" }]}
            onPress={() => handleOpenAddTxn('received')}
            activeOpacity={0.85}
          >
            <Text style={styles.bigEntryBtnText}>{isCustomer ? t('btn_got_deposit') : t('btn_got_due_product')}</Text>
          </TouchableOpacity>
        </View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>

      {/* --- AUTHENTIC 1:1 TALLYKHATA TOP HEADER BAR (photo_2026-10-15_18-13-34.jpg) --- */}
      <View style={[styles.topHeaderBarRed, isDark && tStyles.topHeaderBar]}>
        <View style={styles.headerLeftPillContainer}>
          <TouchableOpacity
            style={[styles.headerBizPill, isDark && { backgroundColor: currentTheme.cardBgElevated, borderColor: currentTheme.cardBorder }]}
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
          <Text style={[styles.headerSubtitleWhite, isDark && { color: currentTheme.textSecondary }]}>{tStatic("স্ট্যান্ডার্ড")}</Text>
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
            <Text style={styles.headerActionLabelWhite}>{t('header_inbox')}</Text>
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
            <Text style={styles.headerActionLabelWhite}>{t('header_support')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* --- TAB CONTENT CONTAINER --- */}
      <View style={[{ flex: 1, backgroundColor: '#F5F6F8' }, isDark && tStyles.screenBg]}>

        {/* ===================================================================
            TAB 1: HOME / TALLY (টালি - 1:1 Authentic from photo_2026-10-15_18-13-34.jpg)
           =================================================================== */}
        {activeTab === 'home' && (
          <View style={[{ flex: 1, backgroundColor: '#F5F6F8' }, isDark && tStyles.screenBg]}>
            <FlatList
              data={filteredAccounts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 95 }}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <View style={[{ backgroundColor: '#F5F6F8' }, isDark && tStyles.screenBg]}>
                  {/* --- 8-ITEM AUTHENTIC QUICK ACTIONS GRID --- */}
                  <View style={styles.quickGridContainer}>
                    {/* Row 1 */}
                    <View style={styles.quickGridRow}>
                      <TouchableOpacity
                        style={styles.quickGridItem}
                        onPress={() => setModalBusinessPicker(true)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={tStatic("ব্যবসা প্রতিষ্ঠান")}
                      >
                        <AppIcon
                          source={require('./assets/icons/grid_multi_biz.png')}
                          variant="primary"
                          shape="rounded"
                          size={26}
                          containerSize={46}
                          tintColor={null}
                          style={styles.quickGrid3DIcon}
                        />
                        <Text style={[styles.quickGridLabel, isDark && tStyles.textPrimary]}>{t("qa_multi_biz")}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.quickGridItem}
                        onPress={() => setModalAddStock(true)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={tStatic("স্টক হিসাব")}
                      >
                        <AppIcon
                          source={require('./assets/icons/grid_stock.png')}
                          variant="warning"
                          shape="rounded"
                          size={26}
                          containerSize={46}
                          tintColor={null}
                          style={styles.quickGrid3DIcon}
                        />
                        <Text style={[styles.quickGridLabel, isDark && tStyles.textPrimary]}>{t("qa_stock")}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.quickGridItem}
                        onPress={() => setModalNotes(true)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={tStatic("ব্যবসার নোট")}
                      >
                        <AppIcon
                          source={require('./assets/icons/grid_note.png')}
                          variant="info"
                          shape="rounded"
                          size={26}
                          containerSize={46}
                          tintColor={null}
                          style={styles.quickGrid3DIcon}
                        />
                        <Text style={[styles.quickGridLabel, isDark && tStyles.textPrimary]}>{t("qa_biz_note")}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.quickGridItem}
                        onPress={() => setActiveTab('tagada')}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={tStatic("গ্রুপ তাগাদা")}
                      >
                        <AppIcon
                          source={require('./assets/icons/grid_bulk_tagada.png')}
                          variant="danger"
                          shape="rounded"
                          size={26}
                          containerSize={46}
                          tintColor={null}
                          style={styles.quickGrid3DIcon}
                        />
                        <Text style={[styles.quickGridLabel, isDark && tStyles.textPrimary]}>{t("qa_group_tagada")}</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Row 2 */}
                    <View style={styles.quickGridRow}>
                      <TouchableOpacity
                        style={styles.quickGridItem}
                        onPress={() => setModalMoneyManager(true)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={tStatic("মানি ম্যানেজার")}
                      >
                        <AppIcon
                          source={require('./assets/icons/grid_money_manager.png')}
                          variant="secondary"
                          shape="rounded"
                          size={26}
                          containerSize={46}
                          tintColor={null}
                          style={styles.quickGrid3DIcon}
                        />
                        <Text style={[styles.quickGridLabel, isDark && tStyles.textPrimary]}>{t("qa_money_manager")}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.quickGridItem}
                        onPress={() => setModalBackupRestore(true)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={tStatic("ডাটা ব্যাকআপ")}
                      >
                        <AppIcon
                          source={require('./assets/icons/grid_backup.png')}
                          variant="success"
                          shape="rounded"
                          size={26}
                          containerSize={46}
                          tintColor={null}
                          style={styles.quickGrid3DIcon}
                        />
                        <Text style={[styles.quickGridLabel, isDark && tStyles.textPrimary]}>{t("qa_backup")}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.quickGridItem}
                        onPress={() => setModalTallyMessage(true)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={tStatic("টালি-মেসেজ")}
                      >
                        <AppIcon
                          source={require('./assets/icons/grid_tally_msg.png')}
                          variant="purple"
                          shape="rounded"
                          size={26}
                          containerSize={46}
                          tintColor={null}
                          style={styles.quickGrid3DIcon}
                        />
                        <Text style={[styles.quickGridLabel, isDark && tStyles.textPrimary]}>{t("qa_tally_msg")}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.quickGridItem}
                        onPress={() => setActiveTab('cashbox')}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={tStatic("ক্যাশবক্স")}
                      >
                        <AppIcon
                          source={require('./assets/icons/grid_cashbox.png')}
                          variant="neutral"
                          shape="rounded"
                          size={26}
                          containerSize={46}
                          tintColor={null}
                          style={styles.quickGrid3DIcon}
                        />
                        <Text style={[styles.quickGridLabel, isDark && tStyles.textPrimary]}>{t("qa_cashbox")}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* --- 3. SUMMARY CARD (১,০৮,৫০০ মোট পাবো | ০ মোট দেবো) --- */}
                  <View style={[styles.summaryCardContainer, isDark && tStyles.card]}>
                    <TouchableOpacity
                      style={styles.summaryCardCol}
                      onPress={() => setModalBakiReport(true)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.summaryCardAmountRed, isDark && { color: currentTheme.danger }]}>
                        {formatAppNumber(totalCustomerDue)}
                      </Text>
                      <Text style={[styles.summaryCardLabel, isDark && tStyles.textSecondary]}>{t("header_total_due")}</Text>
                    </TouchableOpacity>

                    <View style={[styles.summaryCardDivider, isDark && tStyles.divider]} />

                    <TouchableOpacity
                      style={styles.summaryCardCol}
                      onPress={() => {
                        setAccountTab('supplier');
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.summaryCardAmountGreen, isDark && { color: currentTheme.success }]}>
                        {formatAppNumber(totalSupplierDue)}
                      </Text>
                      <Text style={[styles.summaryCardLabel, isDark && tStyles.textSecondary]}>{t("header_total_owe")}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* --- 4. SEARCH & ACTION BAR --- */}
                  <View style={[styles.searchPillBar, isDark && tStyles.searchBar]}>
                    <Image
                      source={require('./assets/icons/ic_search.png')}
                      style={{ width: 18, height: 18, tintColor: isDark ? currentTheme.textSecondary : '#6B7280', marginRight: 10 }}
                      resizeMode="contain"
                    />
                    <TextInput
                      style={{ flex: 1, fontSize: 15, color: isDark ? currentTheme.inputText : '#111827', paddingVertical: 0 }}
                      placeholder={tStatic("খোঁজ")}
                      placeholderTextColor={isDark ? currentTheme.inputPlaceholder : '#6B7280'}
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
                  <View style={[styles.counterStripRow, isDark && { backgroundColor: currentTheme.cardBgElevated }]}>
                    <TouchableOpacity
                      onPress={() => {
                        setAccountTab('customer');
                        setAccType(1);
                      }}
                      activeOpacity={0.7}
                      style={[styles.counterTabPill, accountTab === 'customer' && (isDark ? { backgroundColor: currentTheme.cardBg } : styles.counterTabPillActive)]}
                    >
                      <Text style={[styles.counterTabText, isDark && { color: currentTheme.textSecondary }, accountTab === 'customer' && { color: currentTheme.primary, fontWeight: 'bold' }]}>
                        {t('header_filter_customer')} {formatAppNumber(businessAccounts.filter((a) => a.type === 1).length)}
                      </Text>
                    </TouchableOpacity>
                    <Text style={[styles.counterStripDivider, isDark && tStyles.textSecondary]}>/</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setAccountTab('supplier');
                        setAccType(2);
                      }}
                      activeOpacity={0.7}
                      style={[styles.counterTabPill, accountTab === 'supplier' && (isDark ? { backgroundColor: currentTheme.cardBg } : styles.counterTabPillActive)]}
                    >
                      <Text style={[styles.counterTabText, isDark && { color: currentTheme.textSecondary }, accountTab === 'supplier' && { color: currentTheme.primary, fontWeight: 'bold' }]}>
                        {t('header_filter_supplier')} {formatAppNumber(businessAccounts.filter((a) => a.type === 2).length)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              }
              renderItem={({ item, index }) => {
                const avatar = getAvatarInfo(item.name, index);
                return (
                  <TouchableOpacity
                    style={[styles.customerListCard, isDark && tStyles.customerListCard]}
                    onPress={() => {
                      setSelectedAccount(item);
                      setCurrentScreen('account_ledger');
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.customerAvatarCircle, { backgroundColor: avatar.bg }]}>
                      <Text style={[styles.customerAvatarText, { color: avatar.color }]}>{avatar.text}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.customerCardName, isDark && tStyles.textPrimary]} numberOfLines={1}>{item.name}</Text>
                      <Text style={[styles.customerCardTime, isDark && tStyles.textSecondary]}>{item.timeAgo || tStatic("৩ মাস")}</Text>
                    </View>
                    <Text style={[styles.customerCardAmount, { color: item.balance > 0 ? (isDark ? currentTheme.danger : '#B81414') : item.balance < 0 ? (isDark ? currentTheme.success : '#1C7D50') : (isDark ? currentTheme.textPrimary : '#111827') }]}>
                      {toBengaliDecimal(item.balance)}
                    </Text>
                    <Image source={require('./assets/icons/arrow_right.png')} style={[styles.customerChevron, isDark && { tintColor: currentTheme.textSecondary }]} resizeMode="contain" />
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
                  <Text style={styles.emptyText}>{t('empty_accounts_title')}</Text>
                  <Text style={styles.emptySubText}>{t('empty_accounts_sub')}</Text>
                </View>
              }
            />

            {/* --- 6. CIRCULAR FLOATING ACTION BUTTON (👤+) --- */}
            <TouchableOpacity
              style={styles.floatingRoundFab}
              collapsable={false}
              onPress={() => {
                setAccType(accountTab === 'supplier' ? 2 : 1);
                setModalAddAccount(true);
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={tStatic("নতুন কাস্টমার বা সাপ্লায়ার যুক্ত করুন")}
            >
              <Image
                source={require('./assets/icons/ic_add_user.png')}
                style={{ width: 28, height: 28, tintColor: '#FFFFFF' }}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        )}

        {/* ===================================================================
            TAB 2: CASHBOX (ক্যাশবক্স - layout_cashbook_dashboard_total.xml)
           =================================================================== */}
        {activeTab === 'cashbox' && (
          <View style={[{ flex: 1, backgroundColor: '#F8F9FA', borderTopLeftRadius: 18, borderTopRightRadius: 18, overflow: 'hidden' }, isDark && tStyles.screenBg]}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 95 }}>
            {/* Cash Dashboard Card (layout_cashbook_dashboard_total.xml) */}
            <View style={[styles.cashTopCard, isDark && tStyles.card]}>
              {/* Upper Box: আজকের বেচা & বর্তমান ক্যাশ */}
              <View style={styles.cashTopDashboardUpper}>
                <View style={styles.cashTopCol}>
                  <Text style={[styles.cashTopAmount, isDark && tStyles.textPrimary]}>{tStatic("৳                      ৳ ")}{hideCashAmounts ? '***' : formatMoney(todaySales || todayCashIn)}
                  </Text>
                  <Text style={[styles.cashTopLabel, isDark && tStyles.textSecondary]}>{t("cb_today_sale")}</Text>
                </View>

                <View style={[styles.cashTopDivider, isDark && tStyles.divider]} />

                <View style={styles.cashTopCol}>
                  <Text style={[styles.cashTopAmount, { color: isDark ? currentTheme.textPrimary : '#09101D' }]}>{tStatic("৳                      ৳ ")}{hideCashAmounts ? '***' : formatMoney(totalCash)}
                  </Text>
                  <Text style={[styles.cashTopLabel, isDark && tStyles.textSecondary]}>{t("cb_current_cash")}</Text>
                </View>
              </View>

              {/* Lower Strip: আজ পেলাম & আজ দিলাম (aj_pelam_bg) */}
              <View style={[styles.cashTopDashboardLower, isDark && { backgroundColor: currentTheme.cardBgElevated }]}>
                <View style={styles.cashSubCol}>
                  <Text style={[styles.cashSubLabel, isDark && tStyles.textSecondary]}>{t("cb_today_got")}</Text>
                  <Text style={[styles.cashSubAmount, { color: isDark ? currentTheme.success : '#0F8A0F' }]}>{tStatic("+ ৳                      + ৳ ")}{hideCashAmounts ? '***' : formatMoney(todayCashIn)}
                  </Text>
                </View>

                <View style={[styles.cashSubDivider, isDark && tStyles.divider]} />

                <View style={styles.cashSubCol}>
                  <Text style={[styles.cashSubLabel, isDark && tStyles.textSecondary]}>{t("cb_today_gave")}</Text>
                  <Text style={[styles.cashSubAmount, { color: isDark ? currentTheme.danger : '#C4161C' }]}>{tStatic("- ৳                      - ৳ ")}{hideCashAmounts ? '***' : formatMoney(todayCashOut)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Action Bar (container_report: রিপোর্ট, ক্যাশবক্স মিলাই, ভিউ আইকন) */}
            <View style={styles.cashActionBarRow}>
              <TouchableOpacity
                style={[styles.cashActionBarBtn, isDark && tStyles.card]}
                onPress={() => setModalCashReport(true)}
              >
                <Image
                  source={require('./assets/icons/ic_menu_report.png')}
                  style={{ width: 18, height: 18, marginRight: 6 }}
                  resizeMode="contain"
                />
                <Text style={[styles.cashActionBarBtnText, isDark && tStyles.textPrimary]}>{t('cb_report')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cashActionBarBtn, styles.cashAdjustBtnActive, isDark && { backgroundColor: currentTheme.cardBgElevated, borderColor: currentTheme.cardBorder }]}
                onPress={() => {
                  setCountedCash('');
                  setModalReconcileCash(true);
                }}
              >
                <Image
                  source={require('./assets/icons/ic_cash_milai.png')}
                  style={{ width: 18, height: 18, marginRight: 6, tintColor: isDark ? currentTheme.primary : '#B81414' }}
                  resizeMode="contain"
                />
                <Text style={[styles.cashActionBarBtnText, { color: isDark ? currentTheme.primary : '#B81414', fontWeight: 'bold' }]}>
                  {t('cb_reconcile')}
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
                <Text style={styles.cashBakiAdayLabel}>{t('cb_baki_aday')}</Text>
                <Text style={[styles.cashBakiAdayVal, { color: '#34C759' }]}>{tStatic("৳                    ৳ ")}{hideCashAmounts ? '***' : formatMoney(todayBakiAday || (todayCashIn > todaySales ? todayCashIn - todaySales : 0))}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.cashBakiAdayLabel}>{t('cb_payment_given')}</Text>
                <Text style={[styles.cashBakiAdayVal, { color: '#B81414' }]}>{tStatic("৳                    ৳ ")}{hideCashAmounts ? '***' : formatMoney(todaySupplierPay || (todayCashOut > todayCosts ? todayCashOut - todayCosts : 0))}
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
                <Text style={styles.cashActionBigBtnText}>{tStatic("+ ক্যাশ বেচা")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cashActionBigBtn, { backgroundColor: '#B81414' }]}
                onPress={() => {
                  setCashCategory('cost');
                  setModalAddCash(true);
                }}
              >
                <Text style={styles.cashActionBigBtnText}>{tStatic("- দোকান খরচ")}</Text>
              </TouchableOpacity>
            </View>

            {/* Cash Categories Breakdown List (layout_cashbook_accounts.xml) */}
            <View style={[styles.cashAccountsSection, isDark && tStyles.card]}>
              <SectionHeader title={tStatic("ক্যাশবক্সের হিসাব সমূহ")} count={(cashEntries || []).length} />

              {[
                { cat: 'sale', label: tStatic("ক্যাশ বেচা"), icon: require('./assets/icons/ic_cash_sale.png'), isIn: true, variant: 'success', color: '#0F8A0F' },
                { cat: 'buy', label: tStatic("ক্যাশ কেনা"), icon: require('./assets/icons/ic_cash_buy.png'), isIn: false, variant: 'danger', color: '#B81414' },
                { cat: 'cost', label: tStatic("খরচ"), icon: require('./assets/icons/ic_menu_cost.png'), isIn: false, variant: 'danger', color: '#B81414' },
                { cat: 'malik_in', label: tStatic("মালিক দিল"), icon: require('./assets/icons/ic_menu_malik_report.png'), isIn: true, variant: 'success', color: '#0F8A0F' },
                { cat: 'malik_out', label: tStatic("মালিক নিল"), icon: require('./assets/icons/ic_malik_out.png'), isIn: false, variant: 'danger', color: '#B81414' },
              ].map((item, index) => {
                const catEntries = (cashEntries || []).filter((c) => c.category === item.cat);
                const sum = catEntries.reduce((acc, cur) => acc + (Number(cur.amount) || 0), 0);
                return (
                  <View key={item.cat}>
                    <TouchableOpacity
                      style={styles.cashAccountRow}
                      onPress={() => {
                        if (item.cat === 'sale' || item.cat === 'buy') setModalBechaKena(true);
                        else if (item.cat === 'cost') setModalExpenseReport(true);
                        else if (item.cat === 'malik_in' || item.cat === 'malik_out') setModalMalikReport(true);
                        else setCashFilter(item.cat);
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <AppIcon
                          source={item.icon}
                          variant={item.variant}
                          shape="rounded"
                          size={18}
                          containerSize={34}
                          style={{ marginRight: 12 }}
                        />
                        <Text style={[styles.cashAccountRowLabel, isDark && tStyles.textPrimary]}>{item.label}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.cashAccountRowVal, { color: item.color }]}>
                          {hideCashAmounts ? '***' : `${item.isIn ? '+' : '-'}${tStatic(" ৳ ")}${formatMoney(sum)}`}
                        </Text>
                        <Image source={require('./assets/icons/arrow_right.png')} style={styles.cashAccountChevron} resizeMode="contain" />
                      </View>
                    </TouchableOpacity>
                    {index < 4 ? <TwoToneDivider marginVertical={3} /> : null}
                  </View>
                );
              })}
            </View>

            {/* Category Filter Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 12, marginTop: 14 }}>
              {[
                { key: 'all', label: tStatic("সকল এন্ট্রি") },
                { key: 'sale', label: tStatic("বেচা") },
                { key: 'buy', label: tStatic("কেনা") },
                { key: 'cost', label: tStatic("খরচ") },
                { key: 'malik_in', label: tStatic("মালিক দিল") },
                { key: 'malik_out', label: tStatic("মালিক নিল") },
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
                  <View key={item.id} style={[styles.cashItemRow, isDark && tStyles.card]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cashItemDesc, isDark && tStyles.textPrimary]}>{item.desc || (item.category === 'sale' ? tStatic("ক্যাশ বেচা") : tStatic("দোকান খরচ"))}</Text>
                      <Text style={[styles.cashItemDate, isDark && tStyles.textSecondary]}>
                        {formatDisplayDate(item.date)} {item.time ? '• ' + item.time : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.cashItemAmount, { color: isIn ? '#0F8A0F' : '#B81414' }]}>
                        {hideCashAmounts ? '***' : `${isIn ? '+' : '-'}${tStatic(" ৳ ")}${formatMoney(item.amount)}`}
                      </Text>
                      <TouchableOpacity onPress={() => handleDeleteCashEntry(item.id)}>
                        <Text style={styles.cashDeleteText}>{tStatic("মুছুন")}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
          </View>
        )}

        {/* ===================================================================
            TAB 3: TAGADA (তাগাদা বার্তা কালেকশন - activity_tagada.xml)
           =================================================================== */}
        {activeTab === 'tagada' && (
          <View style={[{ flex: 1, backgroundColor: '#F8F9FA', borderTopLeftRadius: 18, borderTopRightRadius: 18, overflow: 'hidden' }, isDark && tStyles.screenBg]}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 95 }}>
            {/* Tagada Top Header Bar with Back navigation */}
            <View style={[{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }, isDark && tStyles.headerNav]}>
              <TouchableOpacity
                onPress={() => setActiveTab('home')}
                style={{ flexDirection: 'row', alignItems: 'center' }}
                activeOpacity={0.7}
              >
                <Image
                  source={require('./assets/icons/arrow_left.png')}
                  style={{ width: 20, height: 20, tintColor: '#1F2937', marginRight: 8 }}
                  resizeMode="contain"
                />
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1F2937' }}>{tStatic("গ্রুপ তাগাদা")}</Text>
              </TouchableOpacity>
            </View>
            {/* Tagada Header Card with SMS Quota Badge */}
            <View style={styles.tagadaHeaderCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tagadaHeaderTitle}>{tStatic("বকেয়া তাগাদা কালেকশন")}</Text>
                  <Text style={styles.tagadaHeaderSub}>{tStatic("বকেয়া কাস্টমারদের সরাসরি টালি-মেসেজ ও WhatsApp তাগাদা পাঠান।                     বকেয়া কাস্টমারদের সরাসরি টালি-মেসেজ ও WhatsApp তাগাদা পাঠান।")}</Text>
                </View>
                <View style={styles.tagadaQuotaBadge}>
                  <Text style={styles.tagadaQuotaText}>{tStatic("ফ্রি এসএমএস")}</Text>
                  <Text style={styles.tagadaQuotaCount}>{tStatic("অবশিষ্ট: ")}{remainingSmsCount < 10 ? tStatic("০") + remainingSmsCount : remainingSmsCount}{tStatic(" টি")}</Text>
                </View>
              </View>

              <View style={styles.tagadaSummaryStrip}>
                <Text style={styles.tagadaSummaryText}>{tStatic("বকেয়া কাস্টমার:                    বকেয়া কাস্টমার: ")}<Text style={{ fontWeight: 'bold' }}>{dueCustomers.length}{tStatic(" জন")}</Text>
                </Text>
                <Text style={styles.tagadaSummaryText}>{tStatic("মোট বাকি:                    মোট বাকি: ")}<Text style={{ fontWeight: 'bold', color: '#B81414' }}>{tStatic("৳ ")}{formatMoney(totalCustomerDue)}</Text>
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
                <Text style={styles.bulkTagadaTitle}>{tStatic("গ্রুপ তাগাদা পাঠান")}</Text>
                <Text style={styles.bulkTagadaSub}>{tStatic("একসাথে সব ")}{dueCustomers.length}{tStatic(" জন বাকি কাস্টমারকে এসএমএস পাঠান")}</Text>
              </View>
              <Image source={require('./assets/icons/arrow_right.png')} style={styles.bulkTagadaArrow} resizeMode="contain" />
            </TouchableOpacity>

            {/* Due Customers List */}
            <View style={{ paddingHorizontal: 12, marginTop: 12 }}>
              <Text style={styles.sectionHeading}>{tStatic("বাকি কাস্টমারের তালিকা (")}{dueCustomers.length})</Text>

              {dueCustomers.map((item) => (
                <View key={item.id} style={styles.tagadaCardItem}>
                  <View style={[styles.profileAvatar, { backgroundColor: '#FEE2E2', width: 44, height: 44, borderRadius: 22 }]}>
                    <Text style={[styles.profileAvatarText, { color: '#B81414', fontSize: 18 }]}>
                      {(item.name || tStatic("ক"))[0]}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.tagadaCustName}>{item.name}</Text>
                    <Text style={styles.tagadaCustPhone}>{item.phone || tStatic("মোবাইল নম্বর নেই")}</Text>
                    <Text style={styles.tagadaCustDue}>{tStatic("বকেয়া বাকি: ৳ ")}{formatMoney(item.balance)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <TouchableOpacity
                      style={[styles.tagadaActionBtn, { backgroundColor: '#B81414' }]}
                      onPress={() => {
                        setTagadaCustomer(item);
                        setModalTagada(true);
                      }}
                    >
                      <Text style={styles.tagadaActionBtnText}>{tStatic("টালি-মেসেজ")}</Text>
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
                  <Text style={styles.emptyText}>{tStatic("কোনো কাস্টমারের কাছে বাকি নেই!")}</Text>
                  <Text style={styles.emptySubText}>{tStatic("সব কাস্টমারের বকেয়া পরিশোধ রয়েছে।")}</Text>
                </View>
              )}

              {/* Tagada History / Sent Logs (পাঠানো তাগাদার হিস্ট্রি) */}
              <View style={{ marginTop: 24, marginBottom: 12 }}>
                <Text style={styles.sectionHeading}>{tStatic("পাঠানো তাগাদার হিস্ট্রি (")}{tagadaLogs.length})</Text>

                {tagadaLogs.map((log) => (
                  <View key={log.id} style={styles.tagadaCardItem}>
                    <View style={[styles.profileAvatar, { backgroundColor: '#E0F2FE', width: 44, height: 44, borderRadius: 22 }]}>
                      <Text style={[styles.profileAvatarText, { color: '#0284C7', fontSize: 18 }]}>
                        {(log.customerName || tStatic("ত"))[0]}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.tagadaCustName}>{log.customerName}</Text>
                      <Text style={styles.tagadaCustPhone}>{log.phone || tStatic("মোবাইল নম্বর নেই")}</Text>
                      <Text style={[styles.tagadaCustDue, { color: '#6B7280' }]}>{tStatic("পাঠানোর তারিখ:                          পাঠানোর তারিখ: ")}{log.date} • {log.time}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#B81414' }}>{tStatic("৳                          ৳ ")}{formatMoney(log.amount)}
                      </Text>
                      <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 }}>
                        <Text style={{ fontSize: 10, color: '#166534', fontWeight: 'bold' }}>{tStatic("পাঠানো হয়েছে")}</Text>
                      </View>
                    </View>
                  </View>
                ))}

                {tagadaLogs.length === 0 && (
                  <View style={[styles.emptyContainer, { paddingVertical: 18 }]}>
                    <Text style={styles.emptySubText}>{tStatic("এখনো কোনো তাগাদা মেসেজ পাঠানো হয়নি।")}</Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
          </View>
        )}

        {/* ===================================================================
            TAB 4: TALLYPAY (টালিপে ডিজিটাল ওয়ালেট ও বাংলা কিউআর)
           =================================================================== */}
        {activeTab === 'tallypay' && (
          <View style={[{ flex: 1, backgroundColor: '#F8F9FA', borderTopLeftRadius: 18, borderTopRightRadius: 18, overflow: 'hidden' }, isDark && tStyles.screenBg]}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 95 }}>
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
                    <Text style={[styles.walletCardSub, { marginTop: 0 }]}>{tStatic("মার্চেন্ট ওয়ালেট")}</Text>
                  </View>
                  <Text style={styles.walletBalanceDisplay}>{tStatic("৳ ")}{formatMoney(walletBalance)}</Text>
                  <Text style={styles.walletMerchantId}>{tStatic("মার্চেন্ট আইডি: TP-")}{ownerPhone}</Text>
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
                  <Text style={styles.qrCodeBtnText}>{tStatic("বাংলা QR")}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Service Actions */}
            <View style={styles.walletActionRow}>
              <TouchableOpacity
                style={styles.walletServiceBtn}
                onPress={() => setModalAddMoney(true)}
                activeOpacity={0.75}
              >
                <AppIcon
                  source={require("./assets/icons/ic_menu_accounts.png")}
                  variant="info"
                  shape="circle"
                  size={24}
                  containerSize={50}
                  accessibilityLabel={tStatic("অ্যাড মানি")}
                />
                <Text style={styles.walletServiceLabel}>{tStatic("অ্যাড মানি")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.walletServiceBtn}
                onPress={() => setModalMoneyOut(true)}
                activeOpacity={0.75}
              >
                <AppIcon
                  source={require("./assets/icons/ic_cash_sale.png")}
                  variant="success"
                  shape="circle"
                  size={24}
                  containerSize={50}
                  accessibilityLabel={tStatic("মানি আউট")}
                />
                <Text style={styles.walletServiceLabel}>{tStatic("মানি আউট")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.walletServiceBtn}
                onPress={() => setModalMobileRecharge(true)}
                activeOpacity={0.75}
              >
                <AppIcon
                  source={require("./assets/icons/ic_call.png")}
                  variant="danger"
                  shape="circle"
                  size={24}
                  containerSize={50}
                  accessibilityLabel={tStatic("মোবাইল রিচার্জ")}
                />
                <Text style={styles.walletServiceLabel}>{tStatic("মোবাইল রিচার্জ")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.walletServiceBtn}
                onPress={() => setModalBanglaQR(true)}
                activeOpacity={0.75}
              >
                <AppIcon
                  source={require("./assets/icons/grid_qr.png")}
                  tintColor={null}
                  shape="circle"
                  size={28}
                  containerSize={50}
                  accessibilityLabel={tStatic("কিউআর পেমেন্ট")}
                />
                <Text style={styles.walletServiceLabel}>{tStatic("কিউআর পেমেন্ট")}</Text>
              </TouchableOpacity>
            </View>

            {/* Wallet Transaction History */}
            <View style={{ paddingHorizontal: 12, marginTop: 16 }}>
              <SectionHeader title={tStatic("সাম্প্রতিক ওয়ালেট লেনদেন")} count={walletTxns.length} />
              {walletTxns.map((w) => (
                <View key={w.id} style={styles.cashItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cashItemDesc, isDark && tStyles.textPrimary]}>{w.title}</Text>
                    <Text style={[styles.cashItemDate, isDark && tStyles.textSecondary]}>{formatDisplayDate(w.date)} • {w.time}</Text>
                  </View>
                  <Text style={[styles.cashItemAmount, { color: w.type === 'in' ? COLORS.green : COLORS.red }]}>
                    {w.type === 'in' ? '+' : '-'}{tStatic(" ৳ ")}{formatMoney(w.amount)}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
          </View>
        )}

        {/* ===================================================================
            TAB 5: MENU / MORE (মেনু / ড্রয়ার - activity_main_drawer.xml)
           =================================================================== */}
        {activeTab === 'menu' && (
          <View style={[{ flex: 1, backgroundColor: '#F8F9FA', borderTopLeftRadius: 18, borderTopRightRadius: 18, overflow: 'hidden' }, isDark && tStyles.screenBg]}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 95 }}>
            {/* Merchant Shop Profile Header (nav_header_main.xml) */}
            <View style={[styles.menuProfileHeader, isDark && tStyles.card]}>
              <View style={styles.menuStoreAvatar}>
                <Image
                  source={require('./assets/ic_tally_khata_logo_reg.png')}
                  style={{ width: 44, height: 44 }}
                  resizeMode="contain"
                />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.menuBizName, isDark && tStyles.textPrimary]}>{businessName}</Text>
                <Text style={[styles.menuOwnerInfo, isDark && tStyles.textSecondary]}>{ownerName} • {ownerPhone}</Text>
                <Text style={[styles.menuBizAddress, isDark && tStyles.textMuted]} numberOfLines={1}>{businessAddress}</Text>
              </View>
              <TouchableOpacity
                style={[styles.menuEditBizBtn, isDark && { backgroundColor: currentTheme.cardBgElevated }]}
                onPress={() => setModalSettings(true)}
              >
                <Text style={[styles.menuEditBizBtnText, isDark && { color: currentTheme.primary }]}>{tStatic("এডিট")}</Text>
              </TouchableOpacity>
            </View>

            {/* Group 1: টালিপে ওয়ালেট (nav_group_tp_wallet) */}
            <SectionHeader title={tStatic("টালিপে ওয়ালেট")} count={3} />
            <View style={[styles.menuListContainer, isDark && tStyles.card]}>
              <TouchableOpacity
                style={[styles.menuListItem, isDark && tStyles.menuListItem]}
                onPress={() => setModalAddMoney(true)}
              >
                <AppIcon source={require('./assets/icons/ic_menu_accounts.png')} variant="info" shape="rounded" size={22} containerSize={38} />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.menuListTitle, isDark && tStyles.textPrimary]}>{tStatic("একাউন্ট সমূহ")}</Text>
                  <Text style={[styles.menuListSub, isDark && tStyles.textSecondary]}>{tStatic("ব্যালেন্স ৳ ")}{formatMoney(walletBalance)}{tStatic(" • সংযুক্ত ব্যাংক ও MFS")}</Text>
                </View>
                <Image source={require('./assets/icons/arrow_right.png')} style={[styles.menuListArrow, isDark && { tintColor: currentTheme.textSecondary }]} resizeMode="contain" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuListItem, isDark && tStyles.menuListItem]}
                onPress={() => setActiveTab('tallypay')}
              >
                <AppIcon source={require('./assets/icons/ic_menu_payment_messaging.png')} variant="primary" shape="rounded" size={22} containerSize={38} />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.menuListTitle, isDark && tStyles.textPrimary]}>{tStatic("লেনদেন বিবরণী")}</Text>
                  <Text style={[styles.menuListSub, isDark && tStyles.textSecondary]}>{tStatic("মোট ")}{walletTxns.length}{tStatic(" টি ওয়ালেট লেনদেন")}</Text>
                </View>
                <Image source={require('./assets/icons/arrow_right.png')} style={[styles.menuListArrow, isDark && { tintColor: currentTheme.textSecondary }]} resizeMode="contain" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuListItem, isDark && tStyles.menuListItem]}
                onPress={() => setModalTxnLimit(true)}
              >
                <AppIcon source={require('./assets/icons/ic_menu_lock.png')} variant="warning" shape="rounded" size={22} containerSize={38} />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.menuListTitle, isDark && tStyles.textPrimary]}>{tStatic("লেনদেনের লিমিট ও চার্জ")}</Text>
                  <Text style={[styles.menuListSub, isDark && tStyles.textSecondary]}>{tStatic("১০০% ফ্রি লেনদেন • কোনো চার্জ নেই")}</Text>
                </View>
                <Image source={require('./assets/icons/arrow_right.png')} style={[styles.menuListArrow, isDark && { tintColor: currentTheme.textSecondary }]} resizeMode="contain" />
              </TouchableOpacity>
            </View>

            {/* Group 2: টালিখাতা হিসাব ও রিপোর্ট (nav_tallykhata) */}
            <SectionHeader title={t('menu_sec_tallykhata')} count={7} />
            <View style={[styles.menuListContainer, isDark && tStyles.card]}>
              <TouchableOpacity
                style={[styles.menuListItem, isDark && tStyles.menuListItem]}
                onPress={() => setModalBechaKena(true)}
              >
                <AppIcon source={require('./assets/icons/ic_menu_profit.png')} variant="success" shape="rounded" size={22} containerSize={38} />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.menuListTitle, isDark && tStyles.textPrimary]}>{t('menu_item_bechakena')}</Text>
                  <Text style={[styles.menuListSub, isDark && tStyles.textSecondary]}>{tStatic("দৈনিক বেচা-কেনা ও লাভের হিসাব")}</Text>
                </View>
                <Image source={require('./assets/icons/arrow_right.png')} style={[styles.menuListArrow, isDark && { tintColor: currentTheme.textSecondary }]} resizeMode="contain" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuListItem, isDark && tStyles.menuListItem]}
                onPress={() => setModalExpenseReport(true)}
              >
                <AppIcon source={require('./assets/icons/ic_menu_cost.png')} variant="danger" shape="rounded" size={22} containerSize={38} />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.menuListTitle, isDark && tStyles.textPrimary]}>{t('menu_item_expense')}</Text>
                  <Text style={[styles.menuListSub, isDark && tStyles.textSecondary]}>{tStatic("দোকানের সকল যাবতীয় খরচের তালিকা")}</Text>
                </View>
                <Image source={require('./assets/icons/arrow_right.png')} style={[styles.menuListArrow, isDark && { tintColor: currentTheme.textSecondary }]} resizeMode="contain" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuListItem, isDark && tStyles.menuListItem]}
                onPress={() => setModalBakiReport(true)}
              >
                <AppIcon source={require('./assets/icons/ic_menu_baki_hisab.png')} variant="primary" shape="rounded" size={22} containerSize={38} />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.menuListTitle, isDark && tStyles.textPrimary]}>{t('menu_item_baki')}</Text>
                  <Text style={[styles.menuListSub, isDark && tStyles.textSecondary]}>{tStatic("মোট বাকি ৳ ")}{formatMoney(totalCustomerDue)}</Text>
                </View>
                <Image source={require('./assets/icons/arrow_right.png')} style={[styles.menuListArrow, isDark && { tintColor: currentTheme.textSecondary }]} resizeMode="contain" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuListItem, isDark && tStyles.menuListItem]}
                onPress={() => setModalFullReport(true)}
              >
                <AppIcon source={require('./assets/icons/ic_menu_report.png')} variant="purple" shape="rounded" size={22} containerSize={38} />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.menuListTitle, isDark && tStyles.textPrimary]}>{t('menu_item_full_report')}</Text>
                  <Text style={[styles.menuListSub, isDark && tStyles.textSecondary]}>{tStatic("দৈনিক, মাসিক ও বার্ষিক স্টেটমেন্ট তৈরি ও শেয়ার")}</Text>
                </View>
                <Image source={require('./assets/icons/arrow_right.png')} style={[styles.menuListArrow, isDark && { tintColor: currentTheme.textSecondary }]} resizeMode="contain" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuListItem, isDark && tStyles.menuListItem]}
                onPress={() => setModalMalikReport(true)}
              >
                <AppIcon source={require('./assets/icons/ic_menu_malik_report.png')} variant="success" shape="rounded" size={22} containerSize={38} />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.menuListTitle, isDark && tStyles.textPrimary]}>{t('menu_item_malik')}</Text>
                  <Text style={[styles.menuListSub, isDark && tStyles.textSecondary]}>{tStatic("মালিকের বিনিয়োগ ও ব্যক্তিগত উত্তোলন স্টেটমেন্ট")}</Text>
                </View>
                <Image source={require('./assets/icons/arrow_right.png')} style={[styles.menuListArrow, isDark && { tintColor: currentTheme.textSecondary }]} resizeMode="contain" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuListItem, isDark && tStyles.menuListItem]}
                onPress={() => setModalAddStock(true)}
              >
                <AppIcon source={require('./assets/icons/ic_menu_stock.png')} variant="warning" shape="rounded" size={22} containerSize={38} />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.menuListTitle, isDark && tStyles.textPrimary]}>{t('menu_item_stock')}</Text>
                  <Text style={[styles.menuListSub, isDark && tStyles.textSecondary]}>{tStatic("মোট ")}{businessInventory.length}{tStatic(" টি পণ্য • স্টক মূল্য ৳ ")}{formatMoney(totalStockCost)}</Text>
                </View>
                <Image source={require('./assets/icons/arrow_right.png')} style={[styles.menuListArrow, isDark && { tintColor: currentTheme.textSecondary }]} resizeMode="contain" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuListItem, isDark && tStyles.menuListItem]}
                onPress={() => setModalNotes(true)}
              >
                <AppIcon source={require('./assets/icons/ic_menu_note.png')} variant="info" shape="rounded" size={22} containerSize={38} tintColor={null} />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.menuListTitle, isDark && tStyles.textPrimary]}>{t('menu_item_notes')}</Text>
                  <Text style={[styles.menuListSub, isDark && tStyles.textSecondary]}>{tStatic("প্রয়োজনীয় কাজ ও জরুরি মেমো")}</Text>
                </View>
                <Image source={require('./assets/icons/arrow_right.png')} style={[styles.menuListArrow, isDark && { tintColor: currentTheme.textSecondary }]} resizeMode="contain" />
              </TouchableOpacity>
            </View>

            {/* Group 3: সেটিংস ও অন্যান্য (nav_group_others) */}
            <SectionHeader title={t('menu_sec_settings')} count={7} />
            <View style={[styles.menuListContainer, isDark && tStyles.card]}>
              <TouchableOpacity
                style={[styles.menuListItem, isDark && tStyles.menuListItem]}
                onPress={() => setModalBusinessPicker(true)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={tStatic("ব্যবসা পরিচালনা")}
              >
                <AppIcon source={require('./assets/icons/grid_multi_biz.png')} variant="primary" shape="rounded" size={22} containerSize={38} />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.menuListTitle, isDark && tStyles.textPrimary]}>{t('menu_business_management')}</Text>
                  <Text style={[styles.menuListSub, isDark && tStyles.textSecondary]}>{tStatic("বর্তমান: ")}{businessName || 'Mobile Xpress'}{tStatic(" • একাধিক ব্যবসা ও সুইচ")}</Text>
                </View>
                <Image source={require('./assets/icons/arrow_right.png')} style={[styles.menuListArrow, isDark && { tintColor: currentTheme.textSecondary }]} resizeMode="contain" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.menuListItem, isDark && tStyles.menuListItem]}
                onPress={() => setModalMoneyManager(true)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={tStatic("মানি ম্যানেজার (ব্যক্তিগত অর্থ ব্যবস্থাপনা)")}
              >
                <AppIcon source={require('./assets/icons/grid_money_manager.png')} variant="secondary" shape="rounded" size={22} containerSize={38} />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[styles.menuListTitle, isDark && tStyles.textPrimary]}>{t('menu_money_manager') || tStatic("মানি ম্যানেজার (ব্যক্তিগত হিসাব)")}</Text>
                    <View style={styles.mmNewBadge}>
                      <Text style={styles.mmNewBadgeText}>{t('mm_badge_new')}</Text>
                    </View>
                  </View>
                  <Text style={[styles.menuListSub, isDark && tStyles.textSecondary]}>{t('menu_money_manager_sub') || tStatic("ব্যক্তিগত আয়-ব্যয়, ওয়ালেট ও বাজেট ট্র্যাকার")}</Text>
                </View>
                <Image source={require('./assets/icons/arrow_right.png')} style={[styles.menuListArrow, isDark && { tintColor: currentTheme.textSecondary }]} resizeMode="contain" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuListItem, isDark && tStyles.menuListItem]}
                onPress={() => setModalThemePicker(true)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={tStatic("থিম ও প্রদর্শন")}
              >
                <AppIcon source={require('./assets/icons/ic_eye_open.png')} variant="purple" shape="rounded" size={22} containerSize={38} />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.menuListTitle, isDark && tStyles.textPrimary]}>{t('menu_appearance')}</Text>
                  <Text style={[styles.menuListSub, isDark && tStyles.textSecondary]}>
                    {appTheme === 'system' ? `${t('theme_system')} (${isDark ? t('theme_dark') : t('theme_light')})` : appTheme === 'dark' ? t('theme_dark') : t('theme_light')} • {t('menu_appearance_sub')}
                  </Text>
                </View>
                <Image source={require('./assets/icons/arrow_right.png')} style={[styles.menuListArrow, isDark && { tintColor: currentTheme.textSecondary }]} resizeMode="contain" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuListItem, isDark && tStyles.menuListItem]}
                onPress={() => setModalLanguagePicker(true)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={tStatic("ভাষা পরিবর্তন")}
              >
                <AppIcon source={require('./assets/icons/ic_crown.png')} variant="warning" shape="rounded" size={22} containerSize={38} />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.menuListTitle, isDark && tStyles.textPrimary]}>{t('menu_language')}</Text>
                  <Text style={[styles.menuListSub, isDark && tStyles.textSecondary]}>
                    {appLanguage === 'system' ? `${t('lang_system')} (${effectiveLanguage === 'en' ? 'English' : tStatic("বাংলা")})` : appLanguage === 'bn' ? tStatic("বাংলা") : 'English'} • {t('menu_language_sub')}
                  </Text>
                </View>
                <Image source={require('./assets/icons/arrow_right.png')} style={[styles.menuListArrow, isDark && { tintColor: currentTheme.textSecondary }]} resizeMode="contain" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuListItem, isDark && tStyles.menuListItem]}
                onPress={() => setModalSettings(true)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={tStatic("দোকান ও ব্যবসা সেটিংস")}
              >
                <AppIcon source={require('./assets/icons/ic_menu_settings.png')} variant="neutral" shape="rounded" size={22} containerSize={38} />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.menuListTitle, isDark && tStyles.textPrimary]}>{tStatic("দোকান ও ব্যবসা সেটিংস")}</Text>
                  <Text style={[styles.menuListSub, isDark && tStyles.textSecondary]}>{tStatic("দোকানের নাম, ফোন, ঠিকানা ও প্রারম্ভিক ক্যাশ")}</Text>
                </View>
                <Image source={require('./assets/icons/arrow_right.png')} style={[styles.menuListArrow, isDark && { tintColor: currentTheme.textSecondary }]} resizeMode="contain" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuListItem, isDark && tStyles.menuListItem]}
                onPress={() => setModalPinSetup(true)}
              >
                <AppIcon source={require('./assets/icons/ic_menu_lock.png')} variant="danger" shape="rounded" size={22} containerSize={38} />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.menuListTitle, isDark && tStyles.textPrimary]}>{tStatic("পিন লক ও নিরাপত্তা")}</Text>
                  <Text style={[styles.menuListSub, isDark && tStyles.textSecondary]}>{pinEnabled ? tStatic("PIN লক সক্রিয় রয়েছে") : tStatic("৪ ডিজিটের গোপন PIN সেট করুন")}</Text>
                </View>
                <Image source={require('./assets/icons/arrow_right.png')} style={[styles.menuListArrow, isDark && { tintColor: currentTheme.textSecondary }]} resizeMode="contain" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuListItem, isDark && tStyles.menuListItem]}
                onPress={() => {
                  setBackupJsonText('');
                  setModalBackupRestore(true);
                }}
              >
                <AppIcon source={require('./assets/icons/ic_menu_backup.png')} variant="success" shape="rounded" size={22} containerSize={38} />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.menuListTitle, isDark && tStyles.textPrimary]}>{t('menu_backup_restore')}</Text>
                  <Text style={[styles.menuListSub, isDark && tStyles.textSecondary]}>{tStatic("১০০% অফলাইন ডাটা সেভ ও নতুন ফোনে ট্রান্সফার")}</Text>
                </View>
                <Image source={require('./assets/icons/arrow_right.png')} style={[styles.menuListArrow, isDark && { tintColor: currentTheme.textSecondary }]} resizeMode="contain" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuListItem, isDark && tStyles.menuListItem]}
                onPress={() => {
                  Share.share({
                    message: tStatic("টালিখাতা অ্যাপ দিয়ে আপনার দোকানের সব হিসাব সহজে ও নিরাপদে রাখুন। সম্পূর্ণ ফ্রি ও অফলাইন: https://tallykhata.com"),
                  });
                }}
              >
                <AppIcon source={require('./assets/icons/ic_share.png')} variant="primary" shape="rounded" size={22} containerSize={38} />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.menuListTitle, isDark && tStyles.textPrimary]}>{t('menu_refer')}</Text>
                  <Text style={[styles.menuListSub, isDark && tStyles.textSecondary]}>{tStatic("অন্যান্য ব্যবসায়ীদের টালিখাতা শেয়ার করুন")}</Text>
                </View>
                <Image source={require('./assets/icons/arrow_right.png')} style={[styles.menuListArrow, isDark && { tintColor: currentTheme.textSecondary }]} resizeMode="contain" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuListItem, isDark && tStyles.menuListItem]}
                onPress={() => setModalSupport(true)}
              >
                <AppIcon source={require('./assets/icons/ic_menu_support.png')} variant="purple" shape="rounded" size={22} containerSize={38} />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.menuListTitle, isDark && tStyles.textPrimary]}>{t('menu_help_support')}</Text>
                  <Text style={[styles.menuListSub, isDark && tStyles.textSecondary]}>{tStatic("সচরাচর জিজ্ঞাসিত প্রশ্ন ও হেল্পলাইন")}</Text>
                </View>
                <Image source={require('./assets/icons/arrow_right.png')} style={[styles.menuListArrow, isDark && { tintColor: currentTheme.textSecondary }]} resizeMode="contain" />
              </TouchableOpacity>
            </View>

            {/* Offline Guarantee Notice */}
            <View style={styles.offlineNoticeCard}>
              <Text style={styles.offlineNoticeTitle}>{tStatic("১০০% অফলাইন ও নিরাপদ")}</Text>
              <Text style={styles.offlineNoticeSub}>{tStatic("আপনার ব্যবসার তথ্য আপনার ফোনেই সুরক্ষিত। কোনো ইন্টারনেট কানেকশন বা সাবস্ক্রিপশন ছাড়াই আজীবন ব্যবহার করতে পারবেন।                 আপনার ব্যবসার তথ্য আপনার ফোনেই সুরক্ষিত। কোনো ইন্টারনেট কানেকশন বা সাবস্ক্রিপশন ছাড়াই আজীবন ব্যবহার করতে পারবেন।")}</Text>
            </View>
          </ScrollView>
          </View>
        )}

      </View>

      {/* --- AUTHENTIC 4-TAB BOTTOM NAVIGATION BAR (photo_2026-10-15_18-13-34.jpg) --- */}
      <View style={[styles.bottomTabBar, isDark && tStyles.tabBar]}>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab('home')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={tStatic("টালি ট্যাব")}
        >
          {activeTab === 'home' ? (
            <View style={[styles.tabActivePill, isDark && { backgroundColor: currentTheme.primaryLight }]}>
              <Image
                source={require('./assets/nav/nav_home_active.png')}
                style={[styles.tabIconImg, { marginBottom: 0 }]}
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
          <Text style={[styles.tabButtonLabel, isDark && { color: currentTheme.tabInactive }, activeTab === 'home' && (isDark ? { color: currentTheme.tabActive } : styles.tabButtonLabelActive)]}>
            {t('tab_home')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab('cashbox')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={tStatic("ক্যাশবাক্স ট্যাব")}
        >
          {activeTab === 'cashbox' ? (
            <View style={[styles.tabActivePill, isDark && { backgroundColor: currentTheme.primaryLight }]}>
              <Image
                source={require('./assets/nav/nav_cashbox_active.png')}
                style={[styles.tabIconImg, { marginBottom: 0 }]}
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
          <Text style={[styles.tabButtonLabel, isDark && { color: currentTheme.tabInactive }, activeTab === 'cashbox' && (isDark ? { color: currentTheme.tabActive } : styles.tabButtonLabelActive)]}>
            {t('tab_cashbox')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab('tallypay')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={tStatic("টালিপে ট্যাব")}
        >
          {activeTab === 'tallypay' ? (
            <View style={[styles.tabActivePill, isDark && { backgroundColor: currentTheme.primaryLight }]}>
              <Image
                source={require('./assets/nav/nav_tallypay_active.png')}
                style={[styles.tabIconImg, { marginBottom: 0 }]}
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
          <Text style={[styles.tabButtonLabel, isDark && { color: currentTheme.tabInactive }, activeTab === 'tallypay' && (isDark ? { color: currentTheme.tabActive } : styles.tabButtonLabelActive)]}>
            {t('tab_tallypay')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab('menu')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={tStatic("মেন্যু ট্যাব")}
        >
          {activeTab === 'menu' ? (
            <View style={[styles.tabActivePill, isDark && { backgroundColor: currentTheme.primaryLight }]}>
              <Image
                source={require('./assets/nav/nav_menu_active.png')}
                style={[styles.tabIconImg, { marginBottom: 0 }]}
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
          <Text style={[styles.tabButtonLabel, isDark && { color: currentTheme.tabInactive }, activeTab === 'menu' && (isDark ? { color: currentTheme.tabActive } : styles.tabButtonLabelActive)]}>
            {t('tab_menu')}
          </Text>
        </TouchableOpacity>
      </View>


        </View>
      )}

      {/* ===================================================================
          MODAL: ADD TRANSACTION WITH AUTHENTIC BUILT-IN CALCULATOR KEYPAD
         =================================================================== */}
      {/* ===================================================================
          MODAL: THEME SELECTION (Light / Dark Appearance)
         =================================================================== */}
      <Modal
        visible={modalThemePicker}
        animationType="slide"
        transparent
        onRequestClose={() => setModalThemePicker(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          <View style={[styles.bottomSheetCard, isDark && { backgroundColor: currentTheme.modalSurface }]}>
            <View style={styles.bottomSheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.bottomSheetTitle, isDark && { color: currentTheme.textPrimary }]}>
                  {t('menu_appearance')}
                </Text>
                <Text style={[styles.bottomSheetSub, isDark && { color: currentTheme.textSecondary }]}>
                  {t('menu_appearance_sub')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalThemePicker(false)}
                style={[styles.modalCloseCircle, isDark && { backgroundColor: currentTheme.cardBorder }]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Image
                  source={require('./assets/icons/ic_close.png')}
                  style={[styles.modalCloseIcon, isDark && { tintColor: currentTheme.textSecondary }]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

            <View style={{ paddingVertical: 12 }}>
              <TouchableOpacity
                style={[
                  styles.themeOptionCard,
                  appTheme === 'light' && styles.themeOptionCardActive,
                  isDark && { backgroundColor: currentTheme.cardBgElevated, borderColor: currentTheme.cardBorder },
                  appTheme === 'light' && isDark && { borderColor: currentTheme.primary }
                ]}
                onPress={() => {
                  handleToggleTheme('light');
                  setModalThemePicker(false);
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${t('theme_light')}. ${t('theme_light_sub')}`}
              >
                <View style={[styles.themeOptionIconCircle, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={{ fontSize: 20 }}>☀️</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.themeOptionTitle, isDark && { color: currentTheme.textPrimary }]}>
                    {t('theme_light')}
                  </Text>
                  <Text style={[styles.themeOptionSub, isDark && { color: currentTheme.textSecondary }]}>{t('theme_light_sub')}</Text>
                </View>
                {appTheme === 'light' ? (
                  <View style={[styles.themeCheckCircle, { backgroundColor: COLORS.primary }]}>
                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' }}>✓</Text>
                  </View>
                ) : (
                  <View style={[styles.themeUncheckCircle, isDark && { borderColor: currentTheme.textMuted }]} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.themeOptionCard,
                  appTheme === 'dark' && styles.themeOptionCardActive,
                  isDark && { backgroundColor: currentTheme.cardBgElevated, borderColor: currentTheme.cardBorder },
                  appTheme === 'dark' && { borderColor: isDark ? currentTheme.primary : COLORS.primary }
                ]}
                onPress={() => {
                  handleToggleTheme('dark');
                  setModalThemePicker(false);
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${t('theme_dark')}. ${t('theme_dark_sub')}`}
              >
                <View style={[styles.themeOptionIconCircle, { backgroundColor: '#1E293B' }]}>
                  <Text style={{ fontSize: 20 }}>🌙</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.themeOptionTitle, isDark && { color: currentTheme.textPrimary }]}>
                    {t('theme_dark')}
                  </Text>
                  <Text style={[styles.themeOptionSub, isDark && { color: currentTheme.textSecondary }]}>{t('theme_dark_sub')}</Text>
                </View>
                {appTheme === 'dark' ? (
                  <View style={[styles.themeCheckCircle, { backgroundColor: isDark ? currentTheme.primary : COLORS.primary }]}>
                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' }}>✓</Text>
                  </View>
                ) : (
                  <View style={[styles.themeUncheckCircle, isDark && { borderColor: currentTheme.textMuted }]} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.themeOptionCard,
                  appTheme === 'system' && styles.themeOptionCardActive,
                  isDark && { backgroundColor: currentTheme.cardBgElevated, borderColor: currentTheme.cardBorder },
                  appTheme === 'system' && { borderColor: isDark ? currentTheme.primary : COLORS.primary }
                ]}
                onPress={() => {
                  handleToggleTheme('system');
                  setModalThemePicker(false);
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${t('theme_system')}. ${t('theme_system_sub')}`}
              >
                <View style={[styles.themeOptionIconCircle, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}>
                  <Text style={{ fontSize: 20 }}>📱</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.themeOptionTitle, isDark && { color: currentTheme.textPrimary }]}>
                    {t('theme_system')}
                  </Text>
                  <Text style={[styles.themeOptionSub, isDark && { color: currentTheme.textSecondary }]}>
                    {t('theme_system_sub')}
                  </Text>
                </View>
                {appTheme === 'system' ? (
                  <View style={[styles.themeCheckCircle, { backgroundColor: isDark ? currentTheme.primary : COLORS.primary }]}>
                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' }}>✓</Text>
                  </View>
                ) : (
                  <View style={[styles.themeUncheckCircle, isDark && { borderColor: currentTheme.textMuted }]} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: LANGUAGE SELECTION (Bangla / English)
         =================================================================== */}
      <Modal
        visible={modalLanguagePicker}
        animationType="slide"
        transparent
        onRequestClose={() => setModalLanguagePicker(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          <View style={[styles.bottomSheetCard, isDark && { backgroundColor: currentTheme.modalSurface }]}>
            <View style={styles.bottomSheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.bottomSheetTitle, isDark && { color: currentTheme.textPrimary }]}>
                  {t('menu_language')}
                </Text>
                <Text style={[styles.bottomSheetSub, isDark && { color: currentTheme.textSecondary }]}>
                  {t('menu_language_sub')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalLanguagePicker(false)}
                style={[styles.modalCloseCircle, isDark && { backgroundColor: currentTheme.cardBorder }]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Image
                  source={require('./assets/icons/ic_close.png')}
                  style={[styles.modalCloseIcon, isDark && { tintColor: currentTheme.textSecondary }]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

            <View style={{ paddingVertical: 12 }}>
              <TouchableOpacity
                style={[
                  styles.themeOptionCard,
                  appLanguage === 'bn' && styles.themeOptionCardActive,
                  isDark && { backgroundColor: currentTheme.cardBgElevated, borderColor: currentTheme.cardBorder },
                  appLanguage === 'bn' && isDark && { borderColor: currentTheme.primary }
                ]}
                onPress={() => {
                  handleSelectLanguage('bn');
                  setModalLanguagePicker(false);
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${t('lang_bn')}. ${t('lang_bn_sub')}`}
              >
                <View style={[styles.themeOptionIconCircle, { backgroundColor: '#F0FDF4' }]}>
                  <Text style={{ fontSize: 20 }}>🇧🇩</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.themeOptionTitle, isDark && { color: currentTheme.textPrimary }]}>{t('lang_bn')}</Text>
                  <Text style={[styles.themeOptionSub, isDark && { color: currentTheme.textSecondary }]}>{t('lang_bn_sub')}</Text>
                </View>
                {appLanguage === 'bn' ? (
                  <View style={[styles.themeCheckCircle, { backgroundColor: COLORS.primary }]}>
                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' }}>✓</Text>
                  </View>
                ) : (
                  <View style={[styles.themeUncheckCircle, isDark && { borderColor: currentTheme.textMuted }]} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.themeOptionCard,
                  appLanguage === 'en' && styles.themeOptionCardActive,
                  isDark && { backgroundColor: currentTheme.cardBgElevated, borderColor: currentTheme.cardBorder },
                  appLanguage === 'en' && { borderColor: isDark ? currentTheme.primary : COLORS.primary }
                ]}
                onPress={() => {
                  handleSelectLanguage('en');
                  setModalLanguagePicker(false);
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${t('lang_en')}. ${t('lang_english_sub')}`}
              >
                <View style={[styles.themeOptionIconCircle, { backgroundColor: '#EFF6FF' }]}>
                  <Text style={{ fontSize: 20 }}>🇬🇧</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.themeOptionTitle, isDark && { color: currentTheme.textPrimary }]}>
                    English
                  </Text>
                  <Text style={[styles.themeOptionSub, isDark && { color: currentTheme.textSecondary }]}>
                    {t('lang_english_sub')}
                  </Text>
                </View>
                {appLanguage === 'en' ? (
                  <View style={[styles.themeCheckCircle, { backgroundColor: isDark ? currentTheme.primary : COLORS.primary }]}>
                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' }}>✓</Text>
                  </View>
                ) : (
                  <View style={[styles.themeUncheckCircle, isDark && { borderColor: currentTheme.textMuted }]} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.themeOptionCard,
                  appLanguage === 'system' && styles.themeOptionCardActive,
                  isDark && { backgroundColor: currentTheme.cardBgElevated, borderColor: currentTheme.cardBorder },
                  appLanguage === 'system' && { borderColor: isDark ? currentTheme.primary : COLORS.primary }
                ]}
                onPress={() => {
                  handleSelectLanguage('system');
                  setModalLanguagePicker(false);
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${t('lang_system')}. ${t('lang_system_sub')}`}
              >
                <View style={[styles.themeOptionIconCircle, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}>
                  <Text style={{ fontSize: 20 }}>📱</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.themeOptionTitle, isDark && { color: currentTheme.textPrimary }]}>
                    {t('lang_system')}
                  </Text>
                  <Text style={[styles.themeOptionSub, isDark && { color: currentTheme.textSecondary }]}>
                    {t('lang_system_sub')}
                  </Text>
                </View>
                {appLanguage === 'system' ? (
                  <View style={[styles.themeCheckCircle, { backgroundColor: isDark ? currentTheme.primary : COLORS.primary }]}>
                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' }}>✓</Text>
                  </View>
                ) : (
                  <View style={[styles.themeUncheckCircle, isDark && { borderColor: currentTheme.textMuted }]} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalAddTxn} animationType="slide" transparent onRequestClose={() => setModalAddTxn(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '95%' }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalCardTitle, { color: txnType === 'given' ? COLORS.primary : COLORS.green }]}>
                {isCustomer
                  ? (txnType === 'given' ? tStatic("- দিলাম (টাকা বা পণ্য বাকি)") : tStatic("+ পেলাম (নগদ বা জমা আদায়)"))
                  : (txnType === 'given' ? tStatic("- দিলাম (টাকা পরিশোধ)") : tStatic("+ পেলাম (বাকিতে মাল ক্রয়)"))
                }
              </Text>
              <TouchableOpacity
                onPress={() => setModalAddTxn(false)}
                style={styles.modalCloseCircle}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Image
                source={require('./assets/icons/ic_close.png')}
                style={styles.modalCloseIcon}
                resizeMode="contain"
              />
              </TouchableOpacity>
            </View>

            {/* Large Calculator Display */}
            <View style={[styles.calcDisplayBox, { borderColor: txnType === 'given' ? COLORS.primary : COLORS.green }]}>
              <Text style={styles.calcExprText}>{calcExpr || tStatic("০")}</Text>
              <Text style={[styles.calcTotalText, { color: txnType === 'given' ? COLORS.primary : COLORS.green }]}>{tStatic("৳                  ৳ ")}{calcDisplay}
              </Text>
            </View>

            {/* Quick Amount Add Chips */}
            <View style={styles.quickChipRow}>
              {[
                { label: tStatic("+১০০"), val: 100 },
                { label: tStatic("+৫০০"), val: 500 },
                { label: tStatic("+১,০০০"), val: 1000 },
                { label: tStatic("+২,০০০"), val: 2000 },
                { label: tStatic("+৫,০০০"), val: 5000 },
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
              placeholder={tStatic("বিবরণ (যেমন: চাল, তেল, নগদ ইত্যাদি)")}
              placeholderTextColor={COLORS.textSubtle}
              value={txnDesc}
              onChangeText={setTxnDesc}
            />

            {/* Quick Suggestion Chips for Note */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {[tStatic("চাল"), tStatic("ডাল"), tStatic("তেল"), tStatic("চিনি"), tStatic("নগদ বাকি"), tStatic("নগদ জমা"), tStatic("পূর্বের বাকি")].map((s) => (
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
                <Text style={styles.modalBtnCancelText}>{tStatic("বাতিল")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: txnType === 'given' ? COLORS.primary : COLORS.green }]}
                onPress={handleSaveTransaction}
              >
                <Text style={styles.modalBtnSubmitText}>{tStatic("নিশ্চিত করি")}</Text>
              </TouchableOpacity>
            </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: EDIT TRANSACTION
         =================================================================== */}
      <Modal visible={modalEditTxn} animationType="fade" transparent onRequestClose={() => setModalEditTxn(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalCardTitle}>{tStatic("লেনদেন সংশোধন (এডিট)")}</Text>
            <TextInput
              style={styles.modalBigInput}
              placeholder={tStatic("টাকার পরিমাণ")}
              keyboardType="numeric"
              value={editAmount}
              onChangeText={setEditAmount}
            />
            <TextInput
              style={styles.modalSimpleInput}
              placeholder={tStatic("বিবরণ")}
              value={editDesc}
              onChangeText={setEditDesc}
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalEditTxn(false)}>
                <Text style={styles.modalBtnCancelText}>{tStatic("বাতিল")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.primary }]}
                onPress={handleUpdateTransaction}
              >
                <Text style={styles.modalBtnSubmitText}>{tStatic("আপডেট করুন")}</Text>
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
              <Text style={styles.modalCardTitle}>{tStatic("ডিজিটাল ভাউচার (রশিদ)")}</Text>
              <TouchableOpacity
                onPress={() => setModalVoucher(false)}
                style={styles.modalCloseCircle}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Image
                source={require('./assets/icons/ic_close.png')}
                style={styles.modalCloseIcon}
                resizeMode="contain"
              />
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
                  <Text style={styles.voucherBizSub}>{tStatic("মোবাইল: ")}{ownerPhone}</Text>
                  <View style={styles.voucherBadge}>
                    <Text style={styles.voucherBadgeText}>{tStatic("১০০% ডিজিটাল হিসাব রশিদ")}</Text>
                  </View>
                </View>

                <View style={styles.voucherDivider} />

                <View style={styles.voucherDetailRow}>
                  <Text style={styles.voucherLabel}>{tStatic("রশিদ নং:")}</Text>
                  <Text style={styles.voucherVal}>TK-{selectedVoucherTxn?.id ? selectedVoucherTxn.id.slice(-6) : '000000'}</Text>
                </View>
                <View style={styles.voucherDetailRow}>
                  <Text style={styles.voucherLabel}>{tStatic("তারিখ ও সময়:")}</Text>
                  <Text style={styles.voucherVal}>
                    {selectedVoucherTxn?.date} {selectedVoucherTxn?.time ? '• ' + selectedVoucherTxn.time : ''}
                  </Text>
                </View>

                <View style={styles.voucherDivider} />

                <View style={styles.voucherDetailRow}>
                  <Text style={styles.voucherLabel}>
                    {selectedAccount?.type === 1 ? tStatic("কাস্টমার:") : tStatic("সাপ্লায়ার:")}
                  </Text>
                  <Text style={[styles.voucherVal, { fontWeight: 'bold' }]}>{selectedAccount?.name}</Text>
                </View>
                <View style={styles.voucherDetailRow}>
                  <Text style={styles.voucherLabel}>{tStatic("মোবাইল:")}</Text>
                  <Text style={styles.voucherVal}>{selectedAccount?.phone || tStatic("দেওয়া নেই")}</Text>
                </View>

                <View style={styles.voucherDivider} />

                <View style={styles.voucherDetailRow}>
                  <Text style={styles.voucherLabel}>{tStatic("লেনদেনের ধরন:")}</Text>
                  <Text style={[styles.voucherVal, { color: selectedVoucherTxn?.type === 'given' ? COLORS.primary : COLORS.green, fontWeight: 'bold' }]}>
                    {selectedAccount?.type === 1
                      ? (selectedVoucherTxn?.type === 'given' ? tStatic("দিলাম (বাকি বিক্রি)") : tStatic("পেলাম (জমা আদায়)"))
                      : (selectedVoucherTxn?.type === 'given' ? tStatic("দিলাম (টাকা পরিশোধ)") : tStatic("পেলাম (বাকিতে মাল ক্রয়)"))
                    }
                  </Text>
                </View>
                <View style={styles.voucherDetailRow}>
                  <Text style={styles.voucherLabel}>{tStatic("বিবরণ:")}</Text>
                  <Text style={styles.voucherVal}>{selectedVoucherTxn?.desc || tStatic("সাধারণ লেনদেন")}</Text>
                </View>

                <View style={styles.voucherDivider} />

                <View style={styles.voucherDetailRow}>
                  <Text style={[styles.voucherLabel, { fontSize: 16, fontWeight: 'bold' }]}>{tStatic("টাকার পরিমাণ:")}</Text>
                  <Text style={[styles.voucherVal, { fontSize: 18, fontWeight: 'bold', color: selectedVoucherTxn?.type === 'given' ? COLORS.primary : COLORS.green }]}>{tStatic("৳                      ৳ ")}{formatMoney(selectedVoucherTxn?.amount)}
                  </Text>
                </View>
                <View style={styles.voucherDetailRow}>
                  <Text style={styles.voucherLabel}>{selectedAccount?.type === 1 ? tStatic("সর্বমোট বর্তমান বাকি:") : tStatic("সর্বমোট বর্তমান দেনা:")}</Text>
                  <Text style={[styles.voucherVal, { fontWeight: 'bold' }]}>{tStatic("৳                      ৳ ")}{formatMoney(selectedAccount?.balance)}
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
                <Text style={styles.voucherBtnText}>{tStatic("শেয়ার")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.voucherBtn, { backgroundColor: COLORS.gold }]}
                onPress={() => handleOpenEditTxn(selectedVoucherTxn)}
              >
                <Image source={require('./assets/icons/ic_edit.png')} style={{ width: 16, height: 16, tintColor: '#FFFFFF', marginRight: 6 }} resizeMode="contain" />
                <Text style={styles.voucherBtnText}>{tStatic("সংশোধন")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.voucherBtn, { backgroundColor: COLORS.red }]}
                onPress={() => { if (selectedVoucherTxn?.id) handleDeleteTransaction(selectedVoucherTxn.id); }}
              >
                <Image source={require('./assets/icons/ic_delete.png')} style={{ width: 16, height: 16, tintColor: '#FFFFFF', marginRight: 6 }} resizeMode="contain" />
                <Text style={styles.voucherBtnText}>{tStatic("মুছুন")}</Text>
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
                {selectedAccount?.type === 1 ? tStatic("কাস্টমার তথ্য এডিট") : tStatic("সাপ্লায়ার তথ্য এডিট")}
              </Text>
              <TouchableOpacity
                onPress={() => setModalEditAccount(false)}
                style={styles.modalCloseCircle}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Image
                source={require('./assets/icons/ic_close.png')}
                style={styles.modalCloseIcon}
                resizeMode="contain"
              />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>{tStatic("নাম *")}</Text>
            <TextInput
              style={styles.modalSimpleInput}
              value={accName}
              onChangeText={setAccName}
              placeholder={tStatic("নাম লিখুন")}
              placeholderTextColor={COLORS.textSubtle}
            />

            <Text style={styles.inputLabel}>{tStatic("মোবাইল নম্বর")}</Text>
            <TextInput
              style={styles.modalSimpleInput}
              value={accPhone}
              onChangeText={setAccPhone}
              placeholder="01XXXXXXXXX"
              placeholderTextColor={COLORS.textSubtle}
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>{tStatic("ঠিকানা / এলাকা")}</Text>
            <TextInput
              style={styles.modalSimpleInput}
              value={accAddress}
              onChangeText={setAccAddress}
              placeholder={tStatic("ঠিকানা (ঐচ্ছিক)")}
              placeholderTextColor={COLORS.textSubtle}
            />

            <Text style={styles.inputLabel}>{selectedAccount?.type === 1 ? tStatic("পূর্বের বাকি (শুরুর জের)") : tStatic("পূর্বের দেনা (শুরুর জের)")}</Text>
            <TextInput
              style={styles.modalSimpleInput}
              value={accInitialBal}
              onChangeText={setAccInitialBal}
              placeholder={tStatic("০.০০")}
              placeholderTextColor={COLORS.textSubtle}
              keyboardType="numeric"
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalEditAccount(false)}>
                <Text style={styles.modalBtnCancelText}>{tStatic("বাতিল")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSubmit} onPress={handleUpdateAccount}>
                <Text style={styles.modalBtnSubmitText}>{tStatic("সংরক্ষণ করুন")}</Text>
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
          <View style={[styles.modalCard, isDark && tStyles.modalSurface]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalCardTitle, isDark && tStyles.text]}>{tStatic("নতুন খাতা খুলুন")}</Text>
              <TouchableOpacity
                onPress={() => setModalAddAccount(false)}
                style={[styles.modalCloseCircle, isDark && tStyles.modalCloseCircle]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Image
                source={require('./assets/icons/ic_close.png')}
                style={[styles.modalCloseIcon, isDark && tStyles.modalCloseIcon]}
                resizeMode="contain"
              />
              </TouchableOpacity>
            </View>

            <View style={styles.accTypeToggleRow}>
              <TouchableOpacity
                style={[styles.accTypeToggleBtn, accType === 1 && styles.accTypeToggleBtnActiveRed]}
                onPress={() => setAccType(1)}
              >
                <Text style={[styles.accTypeToggleText, accType === 1 && { color: COLORS.white }]}>{tStatic("কাস্টমার (বাকি)                   কাস্টমার (বাকি)")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.accTypeToggleBtn, accType === 2 && styles.accTypeToggleBtnActiveGreen]}
                onPress={() => setAccType(2)}
              >
                <Text style={[styles.accTypeToggleText, accType === 2 && { color: COLORS.white }]}>{tStatic("সাপ্লায়ার (মহাজন)                   সাপ্লায়ার (মহাজন)")}</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.modalSimpleInput, isDark && tStyles.input]}
              placeholder={tStatic("কাস্টমার / সাপ্লায়ারের নাম *")}
              placeholderTextColor={isDark ? currentTheme.textSecondary : COLORS.textSubtle}
              value={accName}
              onChangeText={setAccName}
            />
            <TextInput
              style={[styles.modalSimpleInput, isDark && tStyles.input]}
              placeholder={tStatic("মোবাইল নম্বর (ঐচ্ছিক)")}
              placeholderTextColor={isDark ? currentTheme.textSecondary : COLORS.textSubtle}
              keyboardType="phone-pad"
              value={accPhone}
              onChangeText={setAccPhone}
            />
            <TextInput
              style={[styles.modalSimpleInput, isDark && tStyles.input]}
              placeholder={tStatic("ঠিকানা / এলাকা (ঐচ্ছিক)")}
              placeholderTextColor={isDark ? currentTheme.textSecondary : COLORS.textSubtle}
              value={accAddress}
              onChangeText={setAccAddress}
            />
            <TextInput
              style={[styles.modalSimpleInput, isDark && tStyles.input]}
              placeholder={accType === 1 ? tStatic("পূর্বের বাকি ব্যালেন্স (যদি থাকে)") : tStatic("পূর্বের দেনা ব্যালেন্স (যদি থাকে)")}
              placeholderTextColor={isDark ? currentTheme.textSecondary : COLORS.textSubtle}
              keyboardType="numeric"
              value={accInitialBal}
              onChangeText={setAccInitialBal}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalAddAccount(false)}>
                <Text style={styles.modalBtnCancelText}>{tStatic("বাতিল")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.primary }]}
                onPress={handleSaveAccount}
              >
                <Text style={styles.modalBtnSubmitText}>{tStatic("খাতা খুলুন")}</Text>
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
          <View style={[styles.modalCard, isDark && tStyles.modalSurface]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalCardTitle, isDark && tStyles.text]}>{tStatic("ক্যাশ বাক্সের এন্ট্রি")}</Text>
              <TouchableOpacity
                onPress={() => setModalAddCash(false)}
                style={[styles.modalCloseCircle, isDark && tStyles.modalCloseCircle]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Image
                source={require('./assets/icons/ic_close.png')}
                style={[styles.modalCloseIcon, isDark && tStyles.modalCloseIcon]}
                resizeMode="contain"
              />
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {[
                { key: 'sale', label: tStatic("ক্যাশ বেচা (+)") },
                { key: 'buy', label: tStatic("ক্যাশ কেনা (-)") },
                { key: 'cost', label: tStatic("দোকান খরচ (-)") },
                { key: 'malik_in', label: tStatic("মালিক দিল (+)") },
                { key: 'malik_out', label: tStatic("মালিক নিল (-)") },
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
              style={[styles.modalBigInput, isDark && tStyles.input]}
              placeholder={tStatic("৳ টাকার পরিমাণ *")}
              placeholderTextColor={isDark ? currentTheme.textSecondary : COLORS.textSubtle}
              keyboardType="numeric"
              autoFocus
              value={cashAmount}
              onChangeText={setCashAmount}
            />
            <TextInput
              style={[styles.modalSimpleInput, isDark && tStyles.input]}
              placeholder={tStatic("বিবরণ (যেমন: পণ্য বিক্রয়, নাস্তা, কারেন্ট বিল)")}
              placeholderTextColor={isDark ? currentTheme.textSecondary : COLORS.textSubtle}
              value={cashDesc}
              onChangeText={setCashDesc}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalAddCash(false)}>
                <Text style={styles.modalBtnCancelText}>{tStatic("বাতিল")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtnSubmit,
                  { backgroundColor: cashCategory === 'sale' || cashCategory === 'malik_in' ? COLORS.green : COLORS.primary },
                ]}
                onPress={handleSaveCashEntry}
              >
                <Text style={styles.modalBtnSubmitText}>{tStatic("সংরক্ষণ করুন")}</Text>
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
          <View style={[styles.modalCard, { maxHeight: '90%', padding: 16 }, isDark && tStyles.modalSurface]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>{tStatic("ক্যাশবক্স মিলানো (নোট গণনা)")}</Text>
                <Text style={{ fontSize: 11, color: COLORS.textMuted }}>{tStatic("খাতার ক্যাশ: ৳ ")}{formatMoney(totalCash)}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalReconcileCash(false)}
                style={styles.modalCloseCircle}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Image
                source={require('./assets/icons/ic_close.png')}
                style={styles.modalCloseIcon}
                resizeMode="contain"
              />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ marginVertical: 8 }}>
              <View style={styles.denomContainer}>
                <View style={styles.denomHeaderRow}>
                  <Text style={styles.denomHeaderCol}>{tStatic("নোটের মান")}</Text>
                  <Text style={styles.denomHeaderCol}>{tStatic("সংখ্যা (টি)")}</Text>
                  <Text style={styles.denomHeaderCol}>{tStatic("মোট টাকা")}</Text>
                </View>

                {[
                  { label: tStatic("৳ ১০০০"), value: 1000, state: notes1000, setter: setNotes1000 },
                  { label: tStatic("৳ ৫০০"), value: 500, state: notes500, setter: setNotes500 },
                  { label: tStatic("৳ ২০০"), value: 200, state: notes200, setter: setNotes200 },
                  { label: tStatic("৳ ১০০"), value: 100, state: notes100, setter: setNotes100 },
                  { label: tStatic("৳ ৫০"), value: 50, state: notes50, setter: setNotes50 },
                  { label: tStatic("৳ ২০"), value: 20, state: notes20, setter: setNotes20 },
                  { label: tStatic("৳ ১০"), value: 10, state: notes10, setter: setNotes10 },
                  { label: tStatic("৳ ৫"), value: 5, state: notes5, setter: setNotes5 },
                  { label: tStatic("৳ ২"), value: 2, state: notes2, setter: setNotes2 },
                  { label: tStatic("৳ ১"), value: 1, state: notes1, setter: setNotes1 },
                ].map((row) => {
                  const qty = Number(row.state) || 0;
                  const subtotal = qty * row.value;
                  return (
                    <View key={row.label} style={styles.denomItemRow}>
                      <Text style={styles.denomNoteTag}>{row.label}</Text>
                      <Text style={styles.denomX}>×</Text>
                      <TextInput
                        style={styles.denomQtyInput}
                        placeholder={tStatic("০")}
                        placeholderTextColor={COLORS.textSubtle}
                        keyboardType="numeric"
                        value={row.state}
                        onChangeText={row.setter}
                      />
                      <Text style={styles.denomEq}>=</Text>
                      <Text style={styles.denomSubtotal}>{tStatic("৳ ")}{formatMoney(subtotal)}</Text>
                    </View>
                  );
                })}
              </View>

              <View style={styles.denomSummaryBox}>
                <View style={styles.denomSummaryRow}>
                  <Text style={styles.denomSummaryLabel}>{tStatic("মোট গুনে পাওয়া ক্যাশ:")}</Text>
                  <Text style={[styles.denomSummaryVal, { color: COLORS.green }]}>{tStatic("৳                      ৳ ")}{formatMoney(countedFromNotes)}
                  </Text>
                </View>
                <View style={styles.denomSummaryRow}>
                  <Text style={styles.denomSummaryLabel}>{tStatic("খাতায় বর্তমান ক্যাশ:")}</Text>
                  <Text style={styles.denomSummaryVal}>{tStatic("৳                      ৳ ")}{formatMoney(totalCash)}
                  </Text>
                </View>
                <View style={[styles.denomSummaryRow, { borderTopWidth: 1, borderColor: '#E5E7EB', paddingTop: 6, marginTop: 4 }]}>
                  {(() => {
                    const diff = countedFromNotes - totalCash;
                    if (countedFromNotes === 0) {
                      return (
                        <Text style={{ fontSize: 12, color: COLORS.textMuted }}>{tStatic("নোটের সংখ্যা লিখে ড্রয়ারের সঠিক ক্যাশ মিলান।                           নোটের সংখ্যা লিখে ড্রয়ারের সঠিক ক্যাশ মিলান।")}</Text>
                      );
                    }
                    if (diff === 0) {
                      return (
                        <Text style={{ fontSize: 13, color: COLORS.green, fontWeight: 'bold' }}>{tStatic("ক্যাশ পুরোপুরি মিলে গেছে! কোনো গরমিল নেই।                           ক্যাশ পুরোপুরি মিলে গেছে! কোনো গরমিল নেই।")}</Text>
                      );
                    } else if (diff > 0) {
                      return (
                        <Text style={{ fontSize: 13, color: COLORS.blue, fontWeight: 'bold' }}>{tStatic("ℹ️ ড্রয়ারে ৳                            ℹ️ ড্রয়ারে ৳ ")}{formatMoney(diff)}{tStatic(" অতিরিক্ত ক্যাশ রয়েছে।")}</Text>
                      );
                    } else {
                      return (
                        <Text style={{ fontSize: 13, color: COLORS.red, fontWeight: 'bold' }}>{tStatic("ড্রয়ারে ৳                            ড্রয়ারে ৳ ")}{formatMoney(Math.abs(diff))}{tStatic(" ক্যাশ ঘাটতি রয়েছে!")}</Text>
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
                <Text style={styles.modalBtnCancelText}>{tStatic("বাতিল")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.primary }]}
                onPress={handleSaveDenominations}
              >
                <Text style={styles.modalBtnSubmitText}>{tStatic("সমন্বয় সংরক্ষণ")}</Text>
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
          <View style={[styles.modalCard, { alignItems: 'center' }, isDark && tStyles.modalSurface]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalCardTitle, isDark && tStyles.text]}>{tStatic("বাংলা QR কোড")}</Text>
              <TouchableOpacity
                onPress={() => setModalBanglaQR(false)}
                style={[styles.modalCloseCircle, isDark && tStyles.modalCloseCircle]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Image
                source={require('./assets/icons/ic_close.png')}
                style={[styles.modalCloseIcon, isDark && tStyles.modalCloseIcon]}
                resizeMode="contain"
              />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.primary, marginTop: 8 }}>
              {businessName}
            </Text>
            <Text style={[{ fontSize: 12, color: COLORS.textMuted, marginBottom: 16 }, isDark && tStyles.textSecondary]}>{tStatic("মার্চেন্ট আইডি: TP-               মার্চেন্ট আইডি: TP-")}{ownerPhone}
            </Text>

            {/* QR Visual Card */}
            <View style={styles.qrDisplayContainer}>
              <Image
                source={require('./assets/ic_bangla_qr.png')}
                style={{ width: 170, height: 170 }}
                resizeMode="contain"
              />
              <Text style={styles.qrCenterBadge}>{tStatic("বাংলা QR • ")}{businessName}</Text>
            </View>

            <Text style={[{ fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginTop: 12, lineHeight: 18 }, isDark && tStyles.textSecondary]}>{tStatic("কাস্টমার তার বিকাশ, নগদ, রকেট বা যেকোনো ব্যাংক অ্যাপ দিয়ে এই কিউআর স্ক্যান করে সরাসরি পেমেন্ট করতে পারবেন।               কাস্টমার তার বিকাশ, নগদ, রকেট বা যেকোনো ব্যাংক অ্যাপ দিয়ে এই কিউআর স্ক্যান করে সরাসরি পেমেন্ট করতে পারবেন।")}</Text>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, width: '100%' }}>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.blue, flex: 1 }]}
                onPress={() => {
                  Share.share({
                    message: `=== ${businessName}${tStatic(" (বাংলা QR) ===\nমার্চেন্ট আইডি: TP-")}${ownerPhone}${tStatic("\nবিকাশ/নগদ/রকেট বা ব্যাংক দিয়ে পেমেন্ট করুন।")}`,
                  });
                }}
              >
                <Text style={styles.modalBtnSubmitText}>{tStatic("শেয়ার কিউআর")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnCancel, { flex: 1 }]}
                onPress={() => setModalBanglaQR(false)}
              >
                <Text style={styles.modalBtnCancelText}>{tStatic("বন্ধ করুন")}</Text>
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
              <Text style={styles.modalCardTitle}>{tStatic("ওয়ালেটে অ্যাড মানি")}</Text>
              <TouchableOpacity
                onPress={() => setModalAddMoney(false)}
                style={styles.modalCloseCircle}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Image
                source={require('./assets/icons/ic_close.png')}
                style={styles.modalCloseIcon}
                resizeMode="contain"
              />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>{tStatic("পেমেন্ট মাধ্যম বেছে নিন:")}</Text>
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
              placeholder={tStatic("৳ টাকার পরিমাণ")}
              keyboardType="numeric"
              autoFocus
              value={addMoneyAmount}
              onChangeText={setAddMoneyAmount}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalAddMoney(false)}>
                <Text style={styles.modalBtnCancelText}>{tStatic("বাতিল")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.green }]}
                onPress={handleAddMoney}
              >
                <Text style={styles.modalBtnSubmitText}>{tStatic("অ্যাড মানি করুন")}</Text>
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
              <Text style={styles.modalCardTitle}>{tStatic("মোবাইল রিচার্জ")}</Text>
              <TouchableOpacity
                onPress={() => setModalMobileRecharge(false)}
                style={styles.modalCloseCircle}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Image
                source={require('./assets/icons/ic_close.png')}
                style={styles.modalCloseIcon}
                resizeMode="contain"
              />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>{tStatic("অপারেটর নির্বাচন করুন:")}</Text>
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
              placeholder={tStatic("মোবাইল নম্বর (01XXXXXXXXX)")}
              keyboardType="phone-pad"
              value={rechargePhone}
              onChangeText={setRechargePhone}
            />
            <TextInput
              style={styles.modalBigInput}
              placeholder={tStatic("৳ রিচার্জ পরিমাণ")}
              keyboardType="numeric"
              value={rechargeAmount}
              onChangeText={setRechargeAmount}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalMobileRecharge(false)}>
                <Text style={styles.modalBtnCancelText}>{tStatic("বাতিল")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.primary }]}
                onPress={handleMobileRecharge}
              >
                <Text style={styles.modalBtnSubmitText}>{tStatic("রিচার্জ করুন")}</Text>
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
              <Text style={styles.modalCardTitle}>{tStatic("স্টক ও পণ্য তালিকা")}</Text>
              <TouchableOpacity
                onPress={() => setModalAddStock(false)}
                style={styles.modalCloseCircle}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Image
                source={require('./assets/icons/ic_close.png')}
                style={styles.modalCloseIcon}
                resizeMode="contain"
              />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 10 }}>
              <View style={styles.stockSummaryRow}>
                <View style={styles.stockSummaryBox}>
                  <Text style={styles.stockSummaryBoxLabel}>{tStatic("মোট পণ্য")}</Text>
                  <Text style={styles.stockSummaryBoxVal}>{businessInventory.length}{tStatic(" টি")}</Text>
                </View>
                <View style={[styles.stockSummaryBox, { borderColor: COLORS.primary }]}>
                  <Text style={styles.stockSummaryBoxLabel}>{tStatic("স্টক ক্রয়মূল্য")}</Text>
                  <Text style={[styles.stockSummaryBoxVal, { color: COLORS.primary }]}>{tStatic("৳ ")}{formatMoney(totalStockCost)}</Text>
                </View>
                <View style={[styles.stockSummaryBox, { borderColor: COLORS.green }]}>
                  <Text style={styles.stockSummaryBoxLabel}>{tStatic("আনুমানিক বিক্রয়")}</Text>
                  <Text style={[styles.stockSummaryBoxVal, { color: COLORS.green }]}>{tStatic("৳ ")}{formatMoney(totalStockSaleValue)}</Text>
                </View>
              </View>

              <Text style={[styles.sectionHeading, { marginTop: 12 }]}>{tStatic("নতুন পণ্য যোগ করুন")}</Text>
              <TextInput
                style={styles.modalSimpleInput}
                placeholder={tStatic("পণ্যের নাম (যেমন: মিনিকেট চাল)")}
                value={prodName}
                onChangeText={setProdName}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={[styles.modalSimpleInput, { flex: 1 }]}
                  placeholder={tStatic("একক (কেজি/লিটার/পিস)")}
                  value={prodUnit}
                  onChangeText={setProdUnit}
                />
                <TextInput
                  style={[styles.modalSimpleInput, { flex: 1 }]}
                  placeholder={tStatic("বর্তমান স্টক")}
                  keyboardType="numeric"
                  value={prodStock}
                  onChangeText={setProdStock}
                />
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={[styles.modalSimpleInput, { flex: 1 }]}
                  placeholder={tStatic("ক্রয়মূল্য (৳)")}
                  keyboardType="numeric"
                  value={prodBuyPrice}
                  onChangeText={setProdBuyPrice}
                />
                <TextInput
                  style={[styles.modalSimpleInput, { flex: 1 }]}
                  placeholder={tStatic("বিক্রয়মূল্য (৳)")}
                  keyboardType="numeric"
                  value={prodSellPrice}
                  onChangeText={setProdSellPrice}
                />
              </View>

              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.primary, marginTop: 4 }]}
                onPress={handleSaveProduct}
              >
                <Text style={styles.modalBtnSubmitText}>{tStatic("+ পণ্য যোগ করুন")}</Text>
              </TouchableOpacity>

              <Text style={[styles.sectionHeading, { marginTop: 16 }]}>{tStatic("বিদ্যমান পণ্যসমূহ (")}{businessInventory.length})</Text>
              {businessInventory.map((item) => (
                <View key={item.id} style={styles.stockItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stockItemName}>{item.name}</Text>
                    <Text style={styles.stockItemSub}>{tStatic("ক্রয়: ৳                        ক্রয়: ৳ ")}{formatMoney(item.buyPrice)}{tStatic(" • বিক্রয়: ৳ ")}{formatMoney(item.sellPrice)} / {item.unit}
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
                        <Text style={styles.stockAdjustMiniBtnText}>{tStatic("+ ইন")}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.stockAdjustMiniBtn, { backgroundColor: COLORS.red }]}
                        onPress={() => {
                          setSelectedProduct(item);
                          setStockAdjustType('out');
                          setModalAdjustStock(true);
                        }}
                      >
                        <Text style={styles.stockAdjustMiniBtnText}>{tStatic("- আউট")}</Text>
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
              {selectedProduct ? selectedProduct.name + tStatic(" - স্টক সমন্বয়") : tStatic("স্টক সমন্বয়")}
            </Text>
            <View style={styles.accTypeToggleRow}>
              <TouchableOpacity
                style={[styles.accTypeToggleBtn, stockAdjustType === 'in' && styles.accTypeToggleBtnActiveGreen]}
                onPress={() => setStockAdjustType('in')}
              >
                <Text style={[styles.accTypeToggleText, stockAdjustType === 'in' && { color: COLORS.white }]}>{tStatic("+ নতুন স্টক এলো                   + নতুন স্টক এলো")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.accTypeToggleBtn, stockAdjustType === 'out' && styles.accTypeToggleBtnActiveRed]}
                onPress={() => setStockAdjustType('out')}
              >
                <Text style={[styles.accTypeToggleText, stockAdjustType === 'out' && { color: COLORS.white }]}>{tStatic("- স্টক কমেছে / নষ্ট                   - স্টক কমেছে / নষ্ট")}</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalBigInput}
              placeholder={tStatic("পরিমাণ")}
              keyboardType="numeric"
              autoFocus
              value={stockAdjustQty}
              onChangeText={setStockAdjustQty}
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalAdjustStock(false)}>
                <Text style={styles.modalBtnCancelText}>{tStatic("বাতিল")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.primary }]}
                onPress={handleAdjustStock}
              >
                <Text style={styles.modalBtnSubmitText}>{tStatic("আপডেট করুন")}</Text>
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
          <View style={[styles.modalCard, { padding: 18, elevation: 12, backgroundColor: '#FFFFFF' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>{tStatic("তাগাদা মেসেজ")}</Text>
              <TouchableOpacity
                onPress={() => setModalTagada(false)}
                style={styles.modalCloseCircle}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Image
                source={require('./assets/icons/ic_close.png')}
                style={styles.modalCloseIcon}
                resizeMode="contain"
              />
              </TouchableOpacity>
            </View>

            {(tagadaCustomer || selectedAccount) ? (
              <View style={styles.tagadaReceiverCard}>
                <View style={styles.tagadaReceiverAvatar}>
                  <Text style={styles.tagadaReceiverAvatarText}>
                    {((tagadaCustomer || selectedAccount).name || tStatic("খ"))[0]}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.tagadaReceiverName}>{(tagadaCustomer || selectedAccount).name}</Text>
                  <Text style={styles.tagadaReceiverPhone}>{(tagadaCustomer || selectedAccount).phone || tStatic("মোবাইল নম্বর নেই")}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.tagadaReceiverDueLabel}>{tStatic("বকেয়া")}</Text>
                  <Text style={styles.tagadaReceiverDueAmount}>{tStatic("৳ ")}{formatMoney((tagadaCustomer || selectedAccount).balance)}</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.tagadaDottedBox}>
              <Text style={styles.tagadaMessageContent}>
                {generateTagadaMessage(tagadaCustomer || selectedAccount)}
              </Text>
            </View>

            <Text style={styles.tagadaActionPrompt}>{tStatic("তাগাদা পাঠাতে ট্যাপ করুন।")}</Text>

            <View style={styles.tagadaDualBtnRow}>
              <TouchableOpacity
                style={styles.tagadaTallyMsgBtn}
                onPress={() => handleSendSingleTagada(tagadaCustomer || selectedAccount)}
                activeOpacity={0.85}
              >
                <Image
                  source={require('./assets/icons/ic_sms.png')}
                  style={{ width: 22, height: 22, marginRight: 8, tintColor: '#FFFFFF' }}
                  resizeMode="contain"
                />
                <View>
                  <Text style={styles.tagadaTallyMsgText}>{tStatic("টালি-মেসেজ পাঠাই")}</Text>
                  <Text style={styles.tagadaTallyMsgSub}>{tStatic("অবশিষ্ট:                      অবশিষ্ট: ")}{remainingSmsCount < 10 ? tStatic("০") + remainingSmsCount : remainingSmsCount}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.tagadaShareAppBtn}
                onPress={() => handleSendTagadaWhatsApp(tagadaCustomer || selectedAccount)}
                activeOpacity={0.85}
              >
                <Image
                  source={require('./assets/icons/ic_share.png')}
                  style={{ width: 20, height: 20, marginRight: 6, tintColor: '#1A1A1A' }}
                  resizeMode="contain"
                />
                <Text style={styles.tagadaShareAppText}>{tStatic("WhatsApp শেয়ার")}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.modalBtnCancel, { marginTop: 14 }]}
              onPress={() => setModalTagada(false)}
            >
              <Text style={styles.modalBtnCancelText}>{tStatic("বাতিল")}</Text>
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
              <Text style={styles.modalCardTitle}>{tStatic("ব্যবসার নোট ও মেমো")}</Text>
              <TouchableOpacity
                onPress={() => setModalNotes(false)}
                style={styles.modalCloseCircle}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Image
                source={require('./assets/icons/ic_close.png')}
                style={styles.modalCloseIcon}
                resizeMode="contain"
              />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 12 }}>
              <TextInput
                style={[styles.modalSimpleInput, { flex: 1, marginBottom: 0 }]}
                placeholder={tStatic("নতুন নোট বা জরুরি কাজ লিখুন...")}
                value={newNoteText}
                onChangeText={setNewNoteText}
              />
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.primary, width: 70 }]}
                onPress={handleAddNote}
              >
                <Text style={styles.modalBtnSubmitText}>{tStatic("যোগ")}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 10 }}>
              {businessNotes.map((n) => (
                <View key={n.id} style={styles.noteItemRow}>
                  <TouchableOpacity onPress={() => handleToggleNote(n.id)} style={{ paddingRight: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: n.isComplete ? '#ECFDF5' : '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                      {n.isComplete ? (
                        <>
                          <Image
                            source={require('./assets/icons/ic_check.png')}
                            style={{ width: 12, height: 12, tintColor: COLORS.green, marginRight: 4 }}
                            resizeMode="contain"
                          />
                          <Text style={{ fontSize: 12, color: COLORS.green, fontWeight: 'bold' }}>{tStatic("সম্পন্ন")}</Text>
                        </>
                      ) : (
                        <>
                          <View style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: '#9CA3AF', marginRight: 4 }} />
                          <Text style={{ fontSize: 12, color: '#6B7280' }}>{tStatic("বাকি")}</Text>
                        </>
                      )}
                    </View>
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
              <Text style={styles.modalCardTitle}>{tStatic("লাভ ও ক্ষতির হিসাব")}</Text>
              <TouchableOpacity
                onPress={() => setModalProfitLoss(false)}
                style={styles.modalCloseCircle}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Image
                source={require('./assets/icons/ic_close.png')}
                style={styles.modalCloseIcon}
                resizeMode="contain"
              />
              </TouchableOpacity>
            </View>

            <View style={styles.profitLossContainer}>
              <View style={styles.plRow}>
                <Text style={styles.plLabel}>{tStatic("মোট বিক্রয় (নগদ + বাকি):")}</Text>
                <Text style={[styles.plVal, { color: COLORS.green }]}>{tStatic("৳ ")}{formatMoney(todaySales + totalCustomerDue)}</Text>
              </View>
              <View style={styles.plRow}>
                <Text style={styles.plLabel}>{tStatic("মাল ক্রয় বাবদ দেনা/ব্যয়:")}</Text>
                <Text style={[styles.plVal, { color: COLORS.red }]}>{tStatic("৳ ")}{formatMoney(totalSupplierDue)}</Text>
              </View>
              <View style={styles.plRow}>
                <Text style={styles.plLabel}>{tStatic("মোট দোকান পরিচালনা খরচ:")}</Text>
                <Text style={[styles.plVal, { color: COLORS.red }]}>{tStatic("৳ ")}{formatMoney(todayCosts)}</Text>
              </View>
              <View style={styles.voucherDivider} />
              <View style={styles.plRow}>
                <Text style={[styles.plLabel, { fontSize: 16, fontWeight: 'bold' }]}>{tStatic("আনুমানিক নিট লাভ:")}</Text>
                <Text style={[styles.plVal, { fontSize: 18, fontWeight: 'bold', color: COLORS.primary }]}>{tStatic("৳                    ৳ ")}{formatMoney(Math.max(0, todaySales + totalCustomerDue - totalSupplierDue - todayCosts))}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={[styles.modalBtnCancel, { marginTop: 12 }]} onPress={() => setModalProfitLoss(false)}>
              <Text style={styles.modalBtnCancelText}>{tStatic("বন্ধ করুন")}</Text>
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
              <Text style={styles.modalCardTitle}>{tStatic("সার্বিক হিসাব স্টেটমেন্ট")}</Text>
              <TouchableOpacity
                onPress={() => setModalFullReport(false)}
                style={styles.modalCloseCircle}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Image
                source={require('./assets/icons/ic_close.png')}
                style={styles.modalCloseIcon}
                resizeMode="contain"
              />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingVertical: 10 }}>
              <View style={styles.reportSummaryBox}>
                <View style={styles.reportItemRow}>
                  <Text style={styles.reportItemTitle}>{tStatic("মোট বাকি পাবো (কাস্টমার):")}</Text>
                  <Text style={[styles.reportItemValue, { color: COLORS.primary }]}>{tStatic("৳ ")}{formatMoney(totalCustomerDue)}</Text>
                </View>
                <View style={styles.reportItemRow}>
                  <Text style={styles.reportItemTitle}>{tStatic("মোট দেনা দিবো (সাপ্লায়ার):")}</Text>
                  <Text style={[styles.reportItemValue, { color: COLORS.green }]}>{tStatic("৳ ")}{formatMoney(totalSupplierDue)}</Text>
                </View>
                <View style={styles.reportItemRow}>
                  <Text style={styles.reportItemTitle}>{tStatic("ক্যাশ বাক্সে বর্তমান টাকা:")}</Text>
                  <Text style={[styles.reportItemValue, { color: COLORS.primary }]}>{tStatic("৳ ")}{formatMoney(totalCash)}</Text>
                </View>
                <View style={styles.reportItemRow}>
                  <Text style={styles.reportItemTitle}>{tStatic("বিদ্যমান পণ্যের মোট স্টক মূল্য:")}</Text>
                  <Text style={[styles.reportItemValue, { color: COLORS.green }]}>{tStatic("৳ ")}{formatMoney(totalStockCost)}</Text>
                </View>
                <View style={styles.voucherDivider} />
                <View style={styles.reportItemRow}>
                  <Text style={[styles.reportItemTitle, { fontWeight: 'bold' }]}>{tStatic("মোট ব্যবসা সম্পদ:")}</Text>
                  <Text style={[styles.reportItemValue, { fontWeight: 'bold', color: COLORS.primary }]}>{tStatic("৳                      ৳ ")}{formatMoney(totalCash + totalCustomerDue + totalStockCost)}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.blue, marginTop: 12 }]}
                onPress={() => {
                  const rep =
                    `=== ${businessName}${tStatic(" - সার্বিক হিসাব রিপোর্ট ===\n")}` +
                    `${tStatic("তারিখ: ")}${getTodayDate()}\n` +
                    `---------------------------------\n` +
                    `${tStatic("মোট বাকি পাবো: ৳ ")}${formatMoney(totalCustomerDue)}\n` +
                    `${tStatic("মোট দেনা দিবো: ৳ ")}${formatMoney(totalSupplierDue)}\n` +
                    `${tStatic("ক্যাশ বাক্সে আছে: ৳ ")}${formatMoney(totalCash)}\n` +
                    `${tStatic("স্টক পণ্যের মূল্য: ৳ ")}${formatMoney(totalStockCost)}\n` +
                    `${tStatic("মোট ব্যবসার মোট সম্পদ: ৳ ")}${formatMoney(totalCash + totalCustomerDue + totalStockCost)}\n` +
                    `${tStatic("কাস্টমার সংখ্যা: ")}${accounts.filter((a) => a.type === 1).length}${tStatic(" জন\n")}` +
                    `${tStatic("সাপ্লায়ার সংখ্যা: ")}${accounts.filter((a) => a.type === 2).length}${tStatic(" জন\n")}` +
                    `${tStatic("যোগাযোগ: ")}${ownerPhone}`;
                  Share.share({ message: rep });
                }}
              >
                <Text style={styles.modalBtnSubmitText}>{tStatic("সম্পূর্ণ রিপোর্ট শেয়ার করুন")}</Text>
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
              <Text style={styles.modalCardTitle}>{tStatic("দোকান ও ব্যবসা সেটিংস")}</Text>
              <TouchableOpacity
                onPress={() => setModalSettings(false)}
                style={styles.modalCloseCircle}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Image
                source={require('./assets/icons/ic_close.png')}
                style={styles.modalCloseIcon}
                resizeMode="contain"
              />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingVertical: 10 }}>
              <Text style={styles.inputLabel}>{tStatic("ব্যবসা প্রতিষ্ঠান বা দোকানের নাম")}</Text>
              <TextInput
                style={styles.modalSimpleInput}
                value={businessName}
                onChangeText={setBusinessName}
              />
              <Text style={styles.inputLabel}>{tStatic("মালিকের নাম")}</Text>
              <TextInput
                style={styles.modalSimpleInput}
                value={ownerName}
                onChangeText={setOwnerName}
              />
              <Text style={styles.inputLabel}>{tStatic("মোবাইল নম্বর")}</Text>
              <TextInput
                style={styles.modalSimpleInput}
                value={ownerPhone}
                onChangeText={setOwnerPhone}
                keyboardType="phone-pad"
              />
              <Text style={styles.inputLabel}>{tStatic("দোকানের ঠিকানা")}</Text>
              <TextInput
                style={styles.modalSimpleInput}
                value={businessAddress}
                onChangeText={setBusinessAddress}
              />
              <Text style={styles.inputLabel}>{tStatic("প্রারম্ভিক ক্যাশ ব্যালেন্স (৳)")}</Text>
              <TextInput
                style={styles.modalSimpleInput}
                value={String(openingBalance)}
                onChangeText={(v) => setOpeningBalance(parseFloat(v) || 0)}
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.primary, marginTop: 10 }]}
                onPress={async () => {
                  const saveRes = await persistData({
                    businessName,
                    ownerName,
                    ownerPhone,
                    businessAddress,
                    openingBalance,
                  });
                  if (!saveRes.success) {
                    Alert.alert(tStatic("ত্রুটি"), tStatic("ব্যবসার তথ্য সংরক্ষণ করা যায়নি।"));
                    return;
                  }
                  setModalSettings(false);
                  Alert.alert(tStatic("সফল"), tStatic("ব্যবসার তথ্য সফলভাবে সংরক্ষিত হয়েছে"));
                }}
              >
                <Text style={styles.modalBtnSubmitText}>{tStatic("সংরক্ষণ করুন")}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: USER-SPECIFIC GOOGLE DRIVE BACKUP & RESTORE
          Full isolation, manifest verification, and safety snapshots
         =================================================================== */}
      <Modal visible={modalBackupRestore} animationType="slide" transparent onRequestClose={() => setModalBackupRestore(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '92%', padding: 0, overflow: 'hidden' }, isDark && tStyles.modalSurface]}>
            {/* Modal Header */}
            <View style={styles.cloudBackupHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Image
                  source={require('./assets/icons/grid_backup.png')}
                  style={{ width: 24, height: 24, marginRight: 8, tintColor: '#FFFFFF' }}
                  resizeMode="contain"
                />
                <Text style={styles.cloudBackupHeaderTitle}>{tStatic("ডাটা ব্যাকআপ ও রিস্টোর")}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalBackupRestore(false)} style={{ padding: 6 }}>
                <Image
                  source={require('./assets/icons/ic_close.png')}
                  style={{ width: 14, height: 14, tintColor: '#FFFFFF' }}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

            {/* Top Navigation Tabs */}
            <View style={styles.cloudBackupTabBar}>
              <TouchableOpacity
                style={[styles.cloudBackupTabBtn, backupActiveTab === 'cloud' && styles.cloudBackupTabBtnActive]}
                onPress={() => setBackupActiveTab('cloud')}
                activeOpacity={0.8}
              >
                <Text style={[styles.cloudBackupTabLabel, backupActiveTab === 'cloud' && styles.cloudBackupTabLabelActive]}>{tStatic("Google Drive ক্লাউড                   Google Drive ক্লাউড")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cloudBackupTabBtn, backupActiveTab === 'offline' && styles.cloudBackupTabBtnActive]}
                onPress={() => {
                  setBackupActiveTab('offline');
                  if (!backupJsonText) handleExportBackup();
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.cloudBackupTabLabel, backupActiveTab === 'offline' && styles.cloudBackupTabLabelActive]}>{tStatic("অফলাইন ফাইল                   অফলাইন ফাইল")}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {/* Domain Selection UI for Restore */}
              <View style={{ marginBottom: 14, backgroundColor: isDark ? currentTheme.cardBgElevated : '#F3F4F6', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: isDark ? currentTheme.cardBorder : '#E5E7EB' }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: isDark ? currentTheme.textPrimary : '#374151', marginBottom: 6 }}>
                  {tStatic("রিস্টোর করার ক্ষেত্র নির্বাচন করুন:")}
                </Text>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    { key: 'all', label: tStatic("সব ডেটা") },
                    { key: 'business', label: tStatic("শুধুমাত্র ব্যবসার খাতা") },
                    { key: 'moneyManager', label: tStatic("ব্যক্তিগত আয়-ব্যয়") },
                  ].map((dItem) => {
                    const isSelected = restoreDomain === dItem.key;
                    return (
                      <TouchableOpacity
                        key={dItem.key}
                        style={{
                          paddingVertical: 6,
                          paddingHorizontal: 10,
                          borderRadius: 6,
                          backgroundColor: isSelected ? (isDark ? '#064E3B' : '#ECFDF5') : (isDark ? currentTheme.cardBg : '#FFFFFF'),
                          borderWidth: 1.5,
                          borderColor: isSelected ? '#10B981' : (isDark ? currentTheme.cardBorder : '#D1D5DB'),
                        }}
                        onPress={() => setRestoreDomain(dItem.key)}
                        activeOpacity={0.7}
                      >
                        <Text style={{ fontSize: 11, fontWeight: isSelected ? 'bold' : 'normal', color: isSelected ? (isDark ? '#34D399' : '#047857') : (isDark ? currentTheme.textSecondary : '#4B5563') }}>
                          {isSelected ? '✓ ' : ''}{dItem.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {backupActiveTab === 'cloud' ? (
                <View>
                  {/* Account Connection Status Header */}
                  {googleUser ? (
                    <View style={styles.cloudAccountBanner}>
                      <View style={styles.cloudAvatarCircle}>
                        <Text style={styles.cloudAvatarText}>
                          {(googleUser.name || googleUser.email || 'G').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={styles.cloudAccountName}>{googleUser.name || tStatic("গুগল ব্যবহারকারী")}</Text>
                          <View style={styles.cloudVerifiedBadge}>
                            <Text style={styles.cloudVerifiedBadgeText}>{tStatic("সংযুক্ত")}</Text>
                          </View>
                        </View>
                        <Text style={styles.cloudAccountEmail}>{googleUser.email}</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.cloudNotConnectedMiniBanner}>
                      <View style={styles.cloudGoogleIconCircleSmall}>
                        <Image
                          source={require('./assets/icons/ic_cloud.png')}
                          style={{ width: 24, height: 24, tintColor: '#0F8A0F' }}
                          resizeMode="contain"
                        />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#111827' }}>{tStatic("গুগল ড্রাইভ কানেক্টেড নেই                           গুগল ড্রাইভ কানেক্টেড নেই")}</Text>
                        <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{tStatic("অনলাইন ব্যাকআপ ও রিস্টোরের জন্য জিমেইল একাউন্ট যুক্ত করুন                           অনলাইন ব্যাকআপ ও রিস্টোরের জন্য জিমেইল একাউন্ট যুক্ত করুন")}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.cloudConnectBtnSmall}
                        onPress={handleNativeGoogleSignIn}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.cloudConnectBtnSmallText}>{tStatic("কানেক্ট")}</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* 5 ALWAYS VISIBLE CORE ACTIONS (PHASE 4 SPECIFICATION) */}
                  <View style={styles.cloudControlsSection}>
                    <SectionHeader title={tStatic("ক্লাউড ব্যাকআপ ও রিস্টোর অপশন")} />

                    {/* CONTROL 1: এখন ব্যাকআপ নিন */}
                    <TouchableOpacity
                      style={[styles.cloudControlCard, { borderColor: '#FECACA' }]}
                      onPress={handleCloudBackupNow}
                      disabled={cloudBackupStatus === 'backing_up'}
                      activeOpacity={0.75}
                    >
                      <AppIcon source={require('./assets/icons/grid_backup.png')} variant="danger" shape="circle" size={22} containerSize={44} style={{ marginRight: 12 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cloudControlTitle, { color: '#B81414' }]}>
                          {cloudBackupStatus === 'backing_up' ? tStatic("গুগল ড্রাইভে ব্যাকআপ হচ্ছে...") : tStatic("এখন ব্যাকআপ নিন")}
                        </Text>
                        <Text style={styles.cloudControlSub}>{tStatic("খাতার সকল তথ্য ও লেনদেন গুগল ড্রাইভে নিরাপদ রাখুন                           খাতার সকল তথ্য ও লেনদেন গুগল ড্রাইভে নিরাপদ রাখুন")}</Text>
                      </View>
                      <Image source={require('./assets/icons/arrow_right_red.png')} style={{ width: 14, height: 14 }} resizeMode="contain" />
                    </TouchableOpacity>

                    {/* CONTROL 2: অনলাইন ব্যাকআপ রিস্টোর করুন */}
                    <TouchableOpacity
                      style={[styles.cloudControlCard, { borderColor: '#BBF7D0' }]}
                      onPress={handleCloudRestore}
                      disabled={cloudBackupStatus === 'restoring'}
                      activeOpacity={0.75}
                    >
                      <AppIcon source={require('./assets/icons/ic_cloud.png')} variant="success" shape="circle" size={22} containerSize={44} style={{ marginRight: 12 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cloudControlTitle, { color: '#0F8A0F' }]}>
                          {cloudBackupStatus === 'restoring' ? tStatic("ড্রাইভ থেকে রিস্টোর হচ্ছে...") : tStatic("অনলাইন ব্যাকআপ রিস্টোর করুন")}
                        </Text>
                        <Text style={styles.cloudControlSub}>{tStatic("গুগল ড্রাইভ থেকে আগের সংরক্ষিত ডাটা মোবাইলে ফেরত আনুন                           গুগল ড্রাইভ থেকে আগের সংরক্ষিত ডাটা মোবাইলে ফেরত আনুন")}</Text>
                      </View>
                      <Image source={require('./assets/icons/arrow_right.png')} style={{ width: 14, height: 14, tintColor: '#0F8A0F' }} resizeMode="contain" />
                    </TouchableOpacity>

                    {/* CONTROL 3: ডাটা এক্সপোর্ট করুন */}
                    <TouchableOpacity
                      style={styles.cloudControlCard}
                      onPress={handleExportData}
                      activeOpacity={0.75}
                    >
                      <AppIcon source={require('./assets/icons/ic_share.png')} variant="info" shape="circle" size={22} containerSize={44} style={{ marginRight: 12 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cloudControlTitle, { color: '#1E40AF' }]}>{tStatic("ডাটা এক্সপোর্ট করুন                           ডাটা এক্সপোর্ট করুন")}</Text>
                        <Text style={styles.cloudControlSub}>{tStatic("সম্পূর্ণ খাতার ব্যাকআপ ফাইল (JSON) শেয়ার বা সেভ করুন                           সম্পূর্ণ খাতার ব্যাকআপ ফাইল (JSON) শেয়ার বা সেভ করুন")}</Text>
                      </View>
                      <Image source={require('./assets/icons/arrow_right.png')} style={{ width: 14, height: 14, tintColor: '#2563EB' }} resizeMode="contain" />
                    </TouchableOpacity>

                    {/* CONTROL 4: Google Drive Account পরিবর্তন করুন */}
                    <TouchableOpacity
                      style={styles.cloudControlCard}
                      onPress={handleChangeGoogleAccount}
                      activeOpacity={0.75}
                    >
                      <AppIcon source={require('./assets/icons/ic_menu_accounts.png')} variant="warning" shape="circle" size={22} containerSize={44} style={{ marginRight: 12 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cloudControlTitle, { color: '#B45309' }]}>{tStatic("Google Drive Account পরিবর্তন করুন                           Google Drive Account পরিবর্তন করুন")}</Text>
                        <Text style={styles.cloudControlSub}>{tStatic("অন্য কোনো জিমেইল একাউন্ট নির্বাচন করতে এখানে ট্যাপ করুন                           অন্য কোনো জিমেইল একাউন্ট নির্বাচন করতে এখানে ট্যাপ করুন")}</Text>
                      </View>
                      <Image source={require('./assets/icons/arrow_right.png')} style={{ width: 14, height: 14, tintColor: '#D97706' }} resizeMode="contain" />
                    </TouchableOpacity>

                    {/* CONTROL 5: Google Account সরান */}
                    <TouchableOpacity
                      style={[styles.cloudControlCard, { borderColor: '#FEE2E2', backgroundColor: '#FEF2F2' }]}
                      onPress={handleRemoveGoogleAccount}
                      activeOpacity={0.75}
                    >
                      <AppIcon source={require('./assets/icons/ic_delete.png')} variant="danger" shape="circle" size={22} containerSize={44} style={{ marginRight: 12 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cloudControlTitle, { color: '#DC2626' }]}>{tStatic("Google Account সরান                           Google Account সরান")}</Text>
                        <Text style={styles.cloudControlSub}>{tStatic("গুগল ড্রাইভ সংযোগ বিচ্ছিন্ন করুন (লোকাল ডাটা অপরিবর্তিত থাকবে)                           গুগল ড্রাইভ সংযোগ বিচ্ছিন্ন করুন (লোকাল ডাটা অপরিবর্তিত থাকবে)")}</Text>
                      </View>
                      <Image source={require('./assets/icons/arrow_right_red.png')} style={{ width: 14, height: 14 }} resizeMode="contain" />
                    </TouchableOpacity>
                  </View>

                  {/* Cloud Backup Metadata Details if exists */}
                  {cloudBackupMetadata && (
                    <View style={styles.cloudBackupMetaCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                        <View style={[styles.statusDot, { backgroundColor: '#16A34A' }]} />
                        <Text style={styles.cloudMetaHeaderTitle}>{tStatic("সংরক্ষিত ক্লাউড ব্যাকআপ বিবরণ")}</Text>
                      </View>

                      <View style={styles.cloudMetaRow}>
                        <Text style={styles.cloudMetaLabel}>{tStatic("সর্বশেষ ব্যাকআপ:")}</Text>
                        <Text style={styles.cloudMetaValue}>
                          {cloudBackupMetadata.modifiedTime ? new Date(cloudBackupMetadata.modifiedTime).toLocaleDateString('bn-BD', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : tStatic("আজ")}
                        </Text>
                      </View>

                      {cloudBackupMetadata.manifest && cloudBackupMetadata.manifest.recordCounts && (
                        <View style={styles.cloudStatsGrid}>
                          <View style={styles.cloudStatBox}>
                            <Text style={styles.cloudStatNumber}>
                              {toBengaliNumber(cloudBackupMetadata.manifest.recordCounts.accounts || 0)}
                            </Text>
                            <Text style={styles.cloudStatLabel}>{tStatic("মোট হিসাব")}</Text>
                          </View>
                          <View style={styles.cloudStatBox}>
                            <Text style={styles.cloudStatNumber}>
                              {toBengaliNumber(cloudBackupMetadata.manifest.recordCounts.journals || 0)}
                            </Text>
                            <Text style={styles.cloudStatLabel}>{tStatic("লেনদেন")}</Text>
                          </View>
                          <View style={styles.cloudStatBox}>
                            <Text style={styles.cloudStatNumber}>
                              {toBengaliNumber(cloudBackupMetadata.manifest.recordCounts.cashEntries || 0)}
                            </Text>
                            <Text style={styles.cloudStatLabel}>{tStatic("ক্যাশবক্স")}</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Auto Backup Toggle */}
                  <View style={styles.cloudAutoBackupRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cloudAutoBackupTitle}>{tStatic("অটো-ক্লাউড ব্যাকআপ")}</Text>
                      <Text style={styles.cloudAutoBackupSub}>{tStatic("প্রতিটি হিসাব বা লেনদেন এন্ট্রির পর স্বয়ংক্রিয়ভাবে ড্রাইভে সেভ হবে")}</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.toggleSwitch, autoBackupEnabled && styles.toggleSwitchActive]}
                      onPress={async () => {
                        const next = !autoBackupEnabled;
                        setAutoBackupEnabled(next);
                        await persistData({ autoBackupEnabled: next });
                      }}
                    >
                      <View style={[styles.toggleThumb, autoBackupEnabled && styles.toggleThumbActive]} />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* --- TAB 2: OFFLINE FILE BACKUP --- */
                <View>
                  <Text style={{ fontSize: 13, color: '#4B5563', marginBottom: 8, lineHeight: 18 }}>{tStatic("ইন্টারনেট ছাড়াই খাতার সম্পূর্ণ ডাটা লোকাল টেক্সট ফাইল আকারে ব্যাকআপ নিতে বা রিস্টোর করতে নিচের অপশন ব্যবহার করুন:                     ইন্টারনেট ছাড়াই খাতার সম্পূর্ণ ডাটা লোকাল টেক্সট ফাইল আকারে ব্যাকআপ নিতে বা রিস্টোর করতে নিচের অপশন ব্যবহার করুন:")}</Text>
                  <TextInput
                    style={styles.backupTextArea}
                    multiline
                    value={backupJsonText}
                    onChangeText={setBackupJsonText}
                    placeholder={tStatic("এখানে ব্যাকআপ JSON টেক্সট পেস্ট করুন...")}
                    placeholderTextColor="#9CA3AF"
                  />
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <TouchableOpacity
                      style={[styles.backupBtn, { backgroundColor: '#B81414' }]}
                      onPress={handleExportBackup}
                    >
                      <Text style={styles.backupBtnText}>{tStatic("তৈরি করুন")}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.backupBtn, { backgroundColor: '#2563EB' }]}
                      onPress={handleShareBackup}
                    >
                      <Text style={styles.backupBtnText}>{tStatic("শেয়ার / কপি")}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.backupBtn, { backgroundColor: '#0F8A0F' }]}
                      onPress={() => {
                        const domainLabels = {
                          all: tStatic("সব ডেটা"),
                          business: tStatic("শুধুমাত্র ব্যবসার খাতা"),
                          moneyManager: tStatic("ব্যক্তিগত আয়-ব্যয়"),
                        };
                        const domainText = domainLabels[restoreDomain] || tStatic("সব ডেটা");
                        Alert.alert(
                          tStatic("অফলাইন ব্যাকআপ রিস্টোর"),
                          `${tStatic("নির্বাচিত ক্ষেত্র: ")}${domainText}\n${tStatic("আপনি কি নিশ্চিত অফলাইন ব্যাকআপ রিস্টোর করতে চান?")}`,
                          [
                            { text: tStatic("বাতিল"), style: 'cancel' },
                            { text: tStatic("হ্যাঁ, রিস্টোর করুন"), onPress: () => handleImportBackup() },
                          ]
                        );
                      }}
                    >
                      <Text style={styles.backupBtnText}>{tStatic("রিস্টোর")}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Native Google Account Sign-In handled by GoogleSignin SDK */}
      {/* ===================================================================
          MODAL: INBOX (ইনবক্স নোটিফিকেশন)
         =================================================================== */}
      <Modal visible={modalInbox} animationType="slide" transparent onRequestClose={() => setModalInbox(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '80%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>{tStatic("ইনবক্স ও নোটিফিকেশন")}</Text>
              <TouchableOpacity
                onPress={() => setModalInbox(false)}
                style={styles.modalCloseCircle}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Image
                source={require('./assets/icons/ic_close.png')}
                style={styles.modalCloseIcon}
                resizeMode="contain"
              />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingVertical: 10 }}>
              <View style={styles.inboxItem}>
                <Text style={styles.inboxItemTitle}>{tStatic("টালিখাতা অফলাইন সংস্করণে স্বাগতম!")}</Text>
                <Text style={styles.inboxItemBody}>{tStatic("আপনার অ্যাপটি সম্পূর্ণ ইন্টারনেট ছাড়া ১০০% অফলাইনে কাজ করে। কোনো মাসিক ফি বা সাবস্ক্রিপশন ছাড়াই আজীবন ব্যবহার করতে পারবেন।                   আপনার অ্যাপটি সম্পূর্ণ ইন্টারনেট ছাড়া ১০০% অফলাইনে কাজ করে। কোনো মাসিক ফি বা সাবস্ক্রিপশন ছাড়াই আজীবন ব্যবহার করতে পারবেন।")}</Text>
                <Text style={styles.inboxItemDate}>{getTodayDate()}</Text>
              </View>

              <View style={styles.inboxItem}>
                <Text style={styles.inboxItemTitle}>{tStatic("ব্যাকআপ রাখার পরামর্শ")}</Text>
                <Text style={styles.inboxItemBody}>{tStatic("প্রতি সপ্তাহে একবার মেনু থেকে \"ডাটা ব্যাকআপ ও রিস্টোর\" চেপে ব্যাকআপ কপি করে আপনার হোয়াটসঅ্যাপ বা ড্রাইভে রেখে দিন।                   প্রতি সপ্তাহে একবার মেনু থেকে \"ডাটা ব্যাকআপ ও রিস্টোর\" চেপে ব্যাকআপ কপি করে আপনার হোয়াটসঅ্যাপ বা ড্রাইভে রেখে দিন।")}</Text>
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
              <Text style={styles.modalCardTitle}>{tStatic("হেল্প ও সচরাচর প্রশ্ন")}</Text>
              <TouchableOpacity
                onPress={() => setModalSupport(false)}
                style={styles.modalCloseCircle}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Image
                source={require('./assets/icons/ic_close.png')}
                style={styles.modalCloseIcon}
                resizeMode="contain"
              />
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
                  <Text style={styles.supportBannerTitle}>{tStatic("টালিখাতা কাস্টমার সাপোর্ট")}</Text>
                  <TouchableOpacity onPress={() => Linking.openURL('tel:09612446677')}>
                    <Text style={{ fontSize: 15, color: COLORS.primary, fontWeight: 'bold', marginTop: 3 }}>{tStatic("হটলাইন: ০৯৬১২-৪৪৬৬৭৭                       হটলাইন: ০৯৬১২-৪৪৬৬৭৭")}</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{tStatic("সকাল ৯টা - রাত ৯টা (ছুটির দিনসহ)                     সকাল ৯টা - রাত ৯টা (ছুটির দিনসহ)")}</Text>
                </View>
              </View>

              <Text style={[styles.sectionHeading, { marginTop: 14 }]}>{tStatic("ব্যবহার নির্দেশিকা (FAQ)")}</Text>
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
          <View style={[styles.modalCard, isDark && tStyles.modalSurface]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalCardTitle, isDark && tStyles.text]}>{tStatic("পিন লক সেটিংস")}</Text>
              <TouchableOpacity
                onPress={() => setModalPinSetup(false)}
                style={[styles.modalCloseCircle, isDark && tStyles.modalCloseCircle]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Image
                source={require('./assets/icons/ic_close.png')}
                style={[styles.modalCloseIcon, isDark && tStyles.modalCloseIcon]}
                resizeMode="contain"
              />
              </TouchableOpacity>
            </View>

            <Text style={[{ fontSize: 13, color: COLORS.textMuted, marginVertical: 8 }, isDark && tStyles.textSecondary]}>{tStatic("অ্যাপটি সুরক্ষিত রাখতে ৪ ডিজিটের গোপন পিন কোড সেট করুন:               অ্যাপটি সুরক্ষিত রাখতে ৪ ডিজিটের গোপন পিন কোড সেট করুন:")}</Text>

            <TextInput
              style={[styles.modalBigInput, isDark && tStyles.input]}
              placeholder={tStatic("৪ ডিজিটের পিন")}
              placeholderTextColor={isDark ? currentTheme.textSecondary : COLORS.textSubtle}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry={true}
              value={appPin}
              onChangeText={setAppPin}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: pinEnabled ? COLORS.red : COLORS.primary, flex: 1 }]}
                onPress={async () => {
                  if (!pinEnabled) {
                    if (appPin.length !== 4) {
                      Alert.alert(tStatic("সতর্কতা"), tStatic("সঠিক ৪ ডিজিটের পিন দিন"));
                      return;
                    }
                    const saveRes = await persistData({ pinEnabled: true, appPin });
                    if (!saveRes.success) {
                      Alert.alert(tStatic("ত্রুটি"), tStatic("পিন লক চালু করা যায়নি।"));
                      return;
                    }
                    setPinEnabled(true);
                    Alert.alert(tStatic("সফল"), tStatic("পিন লক চালু করা হয়েছে।"));
                  } else {
                    const saveRes = await persistData({ pinEnabled: false, appPin: '' });
                    if (!saveRes.success) {
                      Alert.alert(tStatic("ত্রুটি"), tStatic("পিন লক বন্ধ করা যায়নি।"));
                      return;
                    }
                    setPinEnabled(false);
                    setAppPin('');
                    Alert.alert(tStatic("বন্ধ"), tStatic("পিন লক বন্ধ করা হয়েছে।"));
                  }
                  setModalPinSetup(false);
                }}
              >
                <Text style={styles.modalBtnSubmitText}>
                  {pinEnabled ? tStatic("পিন লক বন্ধ করুন") : tStatic("পিন লক চালু করুন")}
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
              <Text style={styles.modalCardTitle}>{tStatic("ব্যবসা প্রতিষ্ঠান পরিবর্তন")}</Text>
              <TouchableOpacity
                onPress={() => setModalBusinessPicker(false)}
                style={styles.modalCloseCircle}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Image
                source={require('./assets/icons/ic_close.png')}
                style={styles.modalCloseIcon}
                resizeMode="contain"
              />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380, marginVertical: 8 }}>
              <Text style={styles.bizSectionTitle}>{tStatic("সক্রিয় প্রতিষ্ঠানসমূহ")}</Text>
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
                        <Text style={styles.bizPickerSub}>{biz.owner || tStatic("স্বত্বাধিকারী")} • {biz.phone || '01700000000'}</Text>
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
                        <Text style={styles.bizArchiveBtnText}>{tStatic("আর্কাইভ")}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })}

              {(businesses || []).some((b) => Boolean(b.isArchived)) ? (
                <>
                  <Text style={[styles.bizSectionTitle, { marginTop: 16 }]}>{tStatic("আর্কাইভকৃত প্রতিষ্ঠান")}</Text>
                  {(businesses || []).filter((b) => Boolean(b.isArchived)).map((biz) => (
                    <View key={biz.id} style={styles.bizArchivedCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.bizPickerName, { color: '#6B7280' }]}>{biz.name}{tStatic(" (আর্কাইভ)")}</Text>
                        <Text style={styles.bizPickerSub}>{biz.owner || tStatic("স্বত্বাধিকারী")} • {biz.phone || ''}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity
                          style={styles.bizRestoreBtn}
                          onPress={() => handleRestoreBusiness(biz)}
                        >
                          <Text style={styles.bizRestoreBtnText}>{tStatic("পুনরুদ্ধার")}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.bizDeleteBtn}
                          onPress={() => handlePermanentDeleteBusiness(biz)}
                        >
                          <Text style={styles.bizDeleteBtnText}>{tStatic("মুছুন")}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </>
              ) : null}
            </ScrollView>

            <TouchableOpacity
              style={styles.bizAddBtn}
              onPress={() => {
                setModalBusinessPicker(false);
                setModalAddBusiness(true);
              }}
            >
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', marginRight: 8 }}>
                <Text style={{ fontSize: 16, color: '#FFFFFF', fontWeight: 'bold', marginTop: -2 }}>+</Text>
              </View>
              <Text style={styles.bizAddBtnText}>{tStatic("নতুন ব্যবসা প্রতিষ্ঠান যোগ করুন")}</Text>
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
              <Text style={styles.modalCardTitle}>{tStatic("নতুন ব্যবসা প্রতিষ্ঠান")}</Text>
              <TouchableOpacity
                onPress={() => setModalAddBusiness(false)}
                style={styles.modalCloseCircle}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Image
                source={require('./assets/icons/ic_close.png')}
                style={styles.modalCloseIcon}
                resizeMode="contain"
              />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>{tStatic("ব্যবসার নাম *")}</Text>
            <TextInput
              style={styles.modalSimpleInput}
              placeholder={tStatic("যেমন: মেসার্স ভাই ভাই ট্রেডার্স")}
              placeholderTextColor={COLORS.textSubtle}
              value={newBizName}
              onChangeText={setNewBizName}
            />

            <Text style={styles.inputLabel}>{tStatic("স্বত্বাধিকারীর নাম")}</Text>
            <TextInput
              style={styles.modalSimpleInput}
              placeholder={tStatic("স্বত্বাধিকারীর নাম")}
              placeholderTextColor={COLORS.textSubtle}
              value={newBizOwner}
              onChangeText={setNewBizOwner}
            />

            <Text style={styles.inputLabel}>{tStatic("মোবাইল নম্বর")}</Text>
            <TextInput
              style={styles.modalSimpleInput}
              placeholder={tStatic("০১৭১১...")}
              placeholderTextColor={COLORS.textSubtle}
              keyboardType="phone-pad"
              value={newBizPhone}
              onChangeText={setNewBizPhone}
            />

            <Text style={styles.inputLabel}>{tStatic("ব্যবসার ঠিকানা")}</Text>
            <TextInput
              style={styles.modalSimpleInput}
              placeholder={tStatic("দোকান/বাজারের ঠিকানা")}
              placeholderTextColor={COLORS.textSubtle}
              value={newBizAddress}
              onChangeText={setNewBizAddress}
            />

            <View style={[styles.modalBtnRow, { marginTop: 14 }]}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setModalAddBusiness(false)}
              >
                <Text style={styles.modalBtnCancelText}>{tStatic("বাতিল")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.primary }]}
                onPress={handleCreateBusiness}
              >
                <Text style={styles.modalBtnSubmitText}>{tStatic("সংরক্ষণ করুন")}</Text>
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
            <TouchableOpacity onPress={() => setModalBechaKena(false)} style={styles.reportHeaderBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={tStatic("পেছনে যান")}>
              <Image
                source={require('./assets/icons/arrow_left.png')}
                style={{ width: 22, height: 22, tintColor: '#FFFFFF' }}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <Text style={styles.reportHeaderTitle}>{tStatic("বেচাকেনা রিপোর্ট")}</Text>
            <TouchableOpacity
              style={styles.reportHeaderAction}
              onPress={() => {
                Share.share({
                  message: `${businessName}${tStatic(" - বেচাকেনা রিপোর্ট")}`,
                });
              }}
              activeOpacity={0.7}
            >
              <Image
                source={require('./assets/icons/ic_share.png')}
                style={{ width: 14, height: 14, tintColor: '#FFFFFF', marginRight: 4 }}
                resizeMode="contain"
              />
              <Text style={styles.reportHeaderActionText}>{tStatic("শেয়ার")}</Text>
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
                title: e.desc || (e.category === 'sale' ? tStatic("ক্যাশ বেচা") : tStatic("ক্যাশ কেনা")),
                amount: e.amount,
                date: e.date,
                time: e.time,
                isSale: e.category === 'sale',
                tag: tStatic("ক্যাশ"),
              }));

            return (
              <ScrollView style={{ flex: 1 }}>
                <View style={styles.reportKpiRow}>
                  <View style={styles.reportKpiCard}>
                    <Text style={styles.reportKpiLabel}>{tStatic("মোট বেচা (ক্যাশ+বাকি)")}</Text>
                    <Text style={[styles.reportKpiValue, { color: COLORS.green }]}>{tStatic("৳                        ৳ ")}{formatMoney(totalBecha)}
                    </Text>
                  </View>
                  <View style={styles.reportKpiCard}>
                    <Text style={styles.reportKpiLabel}>{tStatic("মোট কেনা (ক্যাশ+বাকি)")}</Text>
                    <Text style={[styles.reportKpiValue, { color: COLORS.red }]}>{tStatic("৳                        ৳ ")}{formatMoney(totalKena)}
                    </Text>
                  </View>
                </View>

                <View style={styles.reportSubKpiRow}>
                  <View style={styles.reportSubKpiCard}>
                    <Text style={styles.reportSubKpiLabel}>{tStatic("ক্যাশ বেচা")}</Text>
                    <Text style={styles.reportSubKpiValue}>{tStatic("৳ ")}{formatMoney(cashBecha)}</Text>
                  </View>
                  <View style={styles.reportSubKpiCard}>
                    <Text style={styles.reportSubKpiLabel}>{tStatic("বাকি বেচা")}</Text>
                    <Text style={styles.reportSubKpiValue}>{tStatic("৳ ")}{formatMoney(bakiBecha)}</Text>
                  </View>
                  <View style={styles.reportSubKpiCard}>
                    <Text style={styles.reportSubKpiLabel}>{tStatic("নীট লাভ")}</Text>
                    <Text style={[styles.reportSubKpiValue, { color: totalBecha >= totalKena ? COLORS.green : COLORS.red }]}>{tStatic("৳                        ৳ ")}{formatMoney(totalBecha - totalKena)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.reportSectionTitle}>{tStatic("লেনদেন তালিকা")}</Text>
                {salesList.length === 0 ? (
                  <View style={{ alignItems: 'center', padding: 30 }}>
                    <Text style={{ color: COLORS.textMuted }}>{tStatic("কোনো লেনদেন রেকর্ড নেই")}</Text>
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
                          {item.isSale ? '+' : '-'}{tStatic(" ৳ ")}{formatMoney(item.amount)}
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
                          {item.isSale ? tStatic("বেচা") : tStatic("কেনা")}
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
            <TouchableOpacity onPress={() => setModalBakiReport(false)} style={styles.reportHeaderBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={tStatic("পেছনে যান")}>
              <Image
                source={require('./assets/icons/arrow_left.png')}
                style={{ width: 22, height: 22, tintColor: '#FFFFFF' }}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <Text style={styles.reportHeaderTitle}>{tStatic("বাকি রিপোর্ট (পাওনা ও দেনা)")}</Text>
            <TouchableOpacity
              style={styles.reportHeaderAction}
              onPress={() => {
                Share.share({
                  message: `${businessName}${tStatic(" - বাকি রিপোর্ট\nমোট পাওনা: ৳ ")}${formatMoney(totalCustomerDue)}${tStatic("\nমোট দেনা: ৳ ")}${formatMoney(totalSupplierDue)}`,
                });
              }}
              activeOpacity={0.7}
            >
              <Image
                source={require('./assets/icons/ic_share.png')}
                style={{ width: 14, height: 14, tintColor: '#FFFFFF', marginRight: 4 }}
                resizeMode="contain"
              />
              <Text style={styles.reportHeaderActionText}>{tStatic("শেয়ার")}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.reportKpiRow}>
            <View style={styles.reportKpiCard}>
              <Text style={styles.reportKpiLabel}>{tStatic("মোট পাবো (কাস্টমার বাকি)")}</Text>
              <Text style={[styles.reportKpiValue, { color: COLORS.primary }]}>{tStatic("৳                  ৳ ")}{formatMoney(totalCustomerDue)}
              </Text>
            </View>
            <View style={styles.reportKpiCard}>
              <Text style={styles.reportKpiLabel}>{tStatic("মোট দেবো (সাপ্লায়ার বাকি)")}</Text>
              <Text style={[styles.reportKpiValue, { color: COLORS.green }]}>{tStatic("৳                  ৳ ")}{formatMoney(totalSupplierDue)}
              </Text>
            </View>
          </View>

          <View style={[styles.reportSubKpiRow, { paddingBottom: 6 }]}>
            <View style={styles.reportSubKpiCard}>
              <Text style={styles.reportSubKpiLabel}>{tStatic("বাকি কাস্টমার")}</Text>
              <Text style={styles.reportSubKpiValue}>
                {(accounts || []).filter((a) => a.type === 1 && a.balance > 0).length}{tStatic(" জন")}</Text>
            </View>
            <View style={styles.reportSubKpiCard}>
              <Text style={styles.reportSubKpiLabel}>{tStatic("বকেয়া সাপ্লায়ার")}</Text>
              <Text style={styles.reportSubKpiValue}>
                {(accounts || []).filter((a) => a.type === 2 && a.balance > 0).length}{tStatic(" জন")}</Text>
            </View>
            <View style={styles.reportSubKpiCard}>
              <Text style={styles.reportSubKpiLabel}>{tStatic("নীট পাওনা")}</Text>
              <Text style={[styles.reportSubKpiValue, { color: totalCustomerDue >= totalSupplierDue ? COLORS.primary : COLORS.green }]}>{tStatic("৳                  ৳ ")}{formatMoney(totalCustomerDue - totalSupplierDue)}
              </Text>
            </View>
          </View>

          <ScrollView style={{ flex: 1 }}>
            <Text style={styles.reportSectionTitle}>{tStatic("কাস্টমারদের বকেয়া তালিকা")}</Text>
            {(accounts || []).filter((a) => a.type === 1 && a.balance > 0).length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: COLORS.textMuted }}>{tStatic("কোনো কাস্টমারের বাকি নেই")}</Text>
              </View>
            ) : (
              (accounts || [])
                .filter((a) => a.type === 1 && a.balance > 0)
                .map((a) => (
                  <View key={a.id} style={styles.reportRowCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reportRowName}>{a.name}</Text>
                      <Text style={styles.reportRowSub}>{a.phone || tStatic("ফোন নম্বর নেই")} • {a.address || tStatic("ঠিকানা নেই")}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.reportRowAmt, { color: COLORS.primary }]}>{tStatic("৳                          ৳ ")}{formatMoney(a.balance)}
                      </Text>
                      <TouchableOpacity
                        style={{ marginTop: 4, backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}
                        onPress={() => {
                          setSelectedAccount(a);
                          setModalBakiReport(false);
                          setModalTagada(true);
                        }}
                      >
                        <Text style={{ fontSize: 11, color: COLORS.primary, fontWeight: 'bold' }}>{tStatic("তাগাদা পাঠান")}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
            )}

            <Text style={[styles.reportSectionTitle, { marginTop: 10 }]}>{tStatic("সাপ্লায়ারদের বকেয়া তালিকা")}</Text>
            {(accounts || []).filter((a) => a.type === 2 && a.balance > 0).length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: COLORS.textMuted }}>{tStatic("কোনো সাপ্লায়ারের বকেয়া নেই")}</Text>
              </View>
            ) : (
              (accounts || [])
                .filter((a) => a.type === 2 && a.balance > 0)
                .map((a) => (
                  <View key={a.id} style={styles.reportRowCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reportRowName}>{a.name}</Text>
                      <Text style={styles.reportRowSub}>{a.phone || tStatic("ফোন নম্বর নেই")} • {a.address || tStatic("ঠিকানা নেই")}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.reportRowAmt, { color: COLORS.green }]}>{tStatic("৳                          ৳ ")}{formatMoney(a.balance)}
                      </Text>
                      <Text style={[styles.reportRowBadge, { backgroundColor: '#DCFCE7', color: COLORS.green }]}>{tStatic("দেবো")}</Text>
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
            <TouchableOpacity onPress={() => setModalCashReport(false)} style={styles.reportHeaderBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={tStatic("পেছনে যান")}>
              <Image
                source={require('./assets/icons/arrow_left.png')}
                style={{ width: 22, height: 22, tintColor: '#FFFFFF' }}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <Text style={styles.reportHeaderTitle}>{tStatic("ক্যাশ রিপোর্ট (ক্যাশবক্স হিসাব)")}</Text>
            <TouchableOpacity
              style={styles.reportHeaderAction}
              onPress={() => {
                Share.share({
                  message: `${businessName}${tStatic(" - ক্যাশ রিপোর্ট\nবর্তমান ক্যাশ ব্যালেন্স: ৳ ")}${formatMoney(totalCash)}`,
                });
              }}
              activeOpacity={0.7}
            >
              <Image
                source={require('./assets/icons/ic_share.png')}
                style={{ width: 14, height: 14, tintColor: '#FFFFFF', marginRight: 4 }}
                resizeMode="contain"
              />
              <Text style={styles.reportHeaderActionText}>{tStatic("শেয়ার")}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }}>
            <View style={styles.reportKpiRow}>
              <View style={[styles.reportKpiCard, { backgroundColor: currentTheme.cardBgElevated }]}>
                <Text style={[styles.reportKpiLabel, { color: currentTheme.textSecondary }]}>{tStatic("বর্তমান ক্যাশবক্স ব্যালেন্স")}</Text>
                <Text style={[styles.reportKpiValue, { color: currentTheme.textPrimary, fontSize: 22 }]}>{tStatic("৳                    ৳ ")}{formatMoney(totalCash)}
                </Text>
              </View>
            </View>

            <View style={styles.reportKpiRow}>
              <View style={styles.reportKpiCard}>
                <Text style={styles.reportKpiLabel}>{tStatic("আজকের ক্যাশ ইন (+)")}</Text>
                <Text style={[styles.reportKpiValue, { color: COLORS.green }]}>{tStatic("৳                    ৳ ")}{formatMoney(todayCashIn)}
                </Text>
              </View>
              <View style={styles.reportKpiCard}>
                <Text style={styles.reportKpiLabel}>{tStatic("আজকের ক্যাশ আউট (-)")}</Text>
                <Text style={[styles.reportKpiValue, { color: COLORS.red }]}>{tStatic("৳                    ৳ ")}{formatMoney(todayCashOut)}
                </Text>
              </View>
            </View>

            <Text style={styles.reportSectionTitle}>{tStatic("ক্যাশবক্স খাত অনুযায়ী হিসাব")}</Text>
            <View style={{ paddingHorizontal: 14 }}>
              {[
                { name: tStatic("ক্যাশ বেচা"), type: 'in', cat: 'sale', color: COLORS.green },
                { name: tStatic("ক্যাশ কেনা"), type: 'out', cat: 'buy', color: COLORS.red },
                { name: tStatic("দোকান খরচ"), type: 'out', cat: 'cost', color: COLORS.red },
                { name: tStatic("মালিক দিল (মূলধন)"), type: 'in', cat: 'malik_in', color: COLORS.blue },
                { name: tStatic("মালিক নিল (উত্তোলন)"), type: 'out', cat: 'malik_out', color: '#D97706' },
              ].map((acc) => {
                const totalAcc = (cashEntries || [])
                  .filter((e) => e.category === acc.cat)
                  .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
                return (
                  <View key={acc.name} style={[styles.reportRowCard, { borderRadius: 8, marginVertical: 4 }]}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A' }}>{acc.name}</Text>
                    <Text style={{ fontSize: 15, fontWeight: 'bold', color: acc.color }}>
                      {acc.type === 'in' ? '+' : '-'}{tStatic(" ৳ ")}{formatMoney(totalAcc)}
                    </Text>
                  </View>
                );
              })}
            </View>

            <Text style={[styles.reportSectionTitle, { marginTop: 12 }]}>{tStatic("সর্বশেষ ক্যাশ লেনদেন")}</Text>
            {(cashEntries || []).length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: COLORS.textMuted }}>{tStatic("কোনো ক্যাশ এন্ট্রি নেই")}</Text>
              </View>
            ) : (
              (cashEntries || []).slice(0, 30).map((entry, index) => (
                <View key={entry.id || index} style={styles.reportRowCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reportRowName}>{entry.desc || entry.category || tStatic("ক্যাশ লেনদেন")}</Text>
                    <Text style={styles.reportRowSub}>{entry.date} • {entry.time || ''}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.reportRowAmt, { color: entry.type === 'in' ? COLORS.green : COLORS.red }]}>
                      {entry.type === 'in' ? '+' : '-'}{tStatic(" ৳ ")}{formatMoney(entry.amount)}
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
                      {entry.type === 'in' ? tStatic("ক্যাশ ইন") : tStatic("ক্যাশ আউট")}
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
            <TouchableOpacity onPress={() => setModalExpenseReport(false)} style={styles.reportHeaderBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={tStatic("পেছনে যান")}>
              <Image
                source={require('./assets/icons/arrow_left.png')}
                style={{ width: 22, height: 22, tintColor: '#FFFFFF' }}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <Text style={styles.reportHeaderTitle}>{tStatic("দোকান খরচ রিপোর্ট")}</Text>
            <TouchableOpacity
              style={styles.reportHeaderAction}
              onPress={() => {
                setCashCategory('cost');
                setCashType('out');
                setModalExpenseReport(false);
                setModalAddCash(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.reportHeaderActionText}>{tStatic("+ খরচ লিখুন")}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.reportKpiRow}>
            <View style={[styles.reportKpiCard, { backgroundColor: '#DC2626' }]}>
              <Text style={[styles.reportKpiLabel, { color: '#FEE2E2' }]}>{tStatic("মোট দোকান খরচ")}</Text>
              <Text style={[styles.reportKpiValue, { color: '#FFFFFF', fontSize: 24 }]}>{tStatic("৳                  ৳ ")}{formatMoney(
                  (cashEntries || [])
                    .filter((e) => e.category === 'cost')
                    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
                )}
              </Text>
            </View>
          </View>

          <ScrollView style={{ flex: 1 }}>
            <Text style={styles.reportSectionTitle}>{tStatic("খরচের তালিকা")}</Text>
            {(cashEntries || []).filter((e) => e.category === 'cost').length === 0 ? (
              <View style={{ padding: 30, alignItems: 'center' }}>
                <Text style={{ color: COLORS.textMuted }}>{tStatic("কোনো খরচের হিসাব নেই")}</Text>
              </View>
            ) : (
              (cashEntries || [])
                .filter((e) => e.category === 'cost')
                .map((costItem, idx) => (
                  <View key={costItem.id || idx} style={styles.reportRowCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reportRowName}>{costItem.desc || tStatic("দোকান খরচ")}</Text>
                      <Text style={styles.reportRowSub}>{costItem.date} • {costItem.time || ''}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.reportRowAmt, { color: COLORS.red }]}>{tStatic("- ৳                          - ৳ ")}{formatMoney(costItem.amount)}
                      </Text>
                      <Text style={[styles.reportRowBadge, { backgroundColor: '#FEE2E2', color: COLORS.red }]}>{tStatic("খরচ                         খরচ")}</Text>
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
            <TouchableOpacity onPress={() => setModalMalikReport(false)} style={styles.reportHeaderBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={tStatic("পেছনে যান")}>
              <Image
                source={require('./assets/icons/arrow_left.png')}
                style={{ width: 22, height: 22, tintColor: '#FFFFFF' }}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <Text style={styles.reportHeaderTitle}>{tStatic("মালিকের হিসাব (মূলধন ও ব্যক্তিগত)")}</Text>
            <TouchableOpacity
              style={styles.reportHeaderAction}
              onPress={() => {
                Share.share({
                  message: `${businessName}${tStatic(" - মালিকের হিসাব")}`,
                });
              }}
              activeOpacity={0.7}
            >
              <Image
                source={require('./assets/icons/ic_share.png')}
                style={{ width: 14, height: 14, tintColor: '#FFFFFF', marginRight: 4 }}
                resizeMode="contain"
              />
              <Text style={styles.reportHeaderActionText}>{tStatic("শেয়ার")}</Text>
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
                    <Text style={styles.reportKpiLabel}>{tStatic("মালিক দিল (মূলধন যোগ)")}</Text>
                    <Text style={[styles.reportKpiValue, { color: COLORS.blue }]}>{tStatic("৳                        ৳ ")}{formatMoney(malikIn)}
                    </Text>
                  </View>
                  <View style={styles.reportKpiCard}>
                    <Text style={styles.reportKpiLabel}>{tStatic("মালিক নিল (উত্তোলন)")}</Text>
                    <Text style={[styles.reportKpiValue, { color: '#D97706' }]}>{tStatic("৳                        ৳ ")}{formatMoney(malikOut)}
                    </Text>
                  </View>
                </View>

                <View style={[styles.reportSubKpiRow, { paddingBottom: 6 }]}>
                  <View style={[styles.reportSubKpiCard, { flex: 1 }]}>
                    <Text style={styles.reportSubKpiLabel}>{tStatic("মালিকের নীট ব্যালেন্স")}</Text>
                    <Text style={[styles.reportSubKpiValue, { fontSize: 16, color: malikNet >= 0 ? COLORS.blue : '#D97706' }]}>{tStatic("৳                        ৳ ")}{formatMoney(malikNet)} {malikNet >= 0 ? tStatic("(ব্যবসায় বিনিয়োগ)") : tStatic("(উত্তোলন)")}
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
                    <Text style={styles.modalBtnSubmitText}>{tStatic("+ মালিক দিল (মূলধন)")}</Text>
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
                    <Text style={styles.modalBtnSubmitText}>{tStatic("- মালিক নিল (উত্তোলন)")}</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.reportSectionTitle}>{tStatic("মালিকের লেনদেন ইতিহাস")}</Text>
                {(cashEntries || []).filter((e) => e.category === 'malik_in' || e.category === 'malik_out').length === 0 ? (
                  <View style={{ padding: 30, alignItems: 'center' }}>
                    <Text style={{ color: COLORS.textMuted }}>{tStatic("কোনো লেনদেন রেকর্ড নেই")}</Text>
                  </View>
                ) : (
                  (cashEntries || [])
                    .filter((e) => e.category === 'malik_in' || e.category === 'malik_out')
                    .map((mItem, idx) => (
                      <View key={mItem.id || idx} style={styles.reportRowCard}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.reportRowName}>
                            {mItem.category === 'malik_in' ? tStatic("মালিক দিল (মূলধন)") : tStatic("মালিক নিল (উত্তোলন)")}
                          </Text>
                          <Text style={styles.reportRowSub}>{mItem.date} • {mItem.time || ''} {mItem.desc ? `• ${mItem.desc}` : ''}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[styles.reportRowAmt, { color: mItem.category === 'malik_in' ? COLORS.blue : '#D97706' }]}>
                            {mItem.category === 'malik_in' ? '+' : '-'}{tStatic(" ৳ ")}{formatMoney(mItem.amount)}
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
                            {mItem.category === 'malik_in' ? tStatic("মূলধন") : tStatic("উত্তোলন")}
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
              <Text style={styles.modalCardTitle}>{tStatic("টাকা উত্তোলন / ট্রান্সফার")}</Text>
              <TouchableOpacity
                onPress={() => setModalMoneyOut(false)}
                style={styles.modalCloseCircle}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Image
                source={require('./assets/icons/ic_close.png')}
                style={styles.modalCloseIcon}
                resizeMode="contain"
              />
              </TouchableOpacity>
            </View>

            <View style={styles.moneyOutBalCard}>
              <Text style={styles.moneyOutBalLabel}>{tStatic("বর্তমান টালিপে ব্যালেন্স")}</Text>
              <Text style={styles.moneyOutBalValue}>{tStatic("৳ ")}{formatMoney(walletBalance)}</Text>
            </View>

            <Text style={styles.inputLabel}>{tStatic("ট্রান্সফার মেথড নির্বাচন করুন")}</Text>
            <View style={styles.moneyOutMethodGrid}>
              {[
                { id: 'bank', name: tStatic("ব্যাংক একাউন্ট"), iconSource: require('./assets/icons/ic_menu_accounts.png') },
                { id: 'bkash', name: tStatic("বিকাশ"), iconSource: require('./assets/banks/bkash90px.png') },
                { id: 'nagad', name: tStatic("নগদ"), iconSource: require('./assets/icons/ic_cash_sale.png') },
              ].map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.moneyOutMethodCard, moneyOutMethod === m.id && styles.moneyOutMethodCardActive]}
                  onPress={() => setMoneyOutMethod(m.id)}
                >
                  <Image
                    source={m.iconSource}
                    style={{ width: 26, height: 26, marginBottom: 4 }}
                    resizeMode="contain"
                  />
                  <Text style={[styles.moneyOutMethodText, moneyOutMethod === m.id && styles.moneyOutMethodTextActive]}>
                    {m.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>
              {moneyOutMethod === 'bank' ? tStatic("ব্যাংক একাউন্ট নম্বর") : tStatic("মোবাইল একাউন্ট নম্বর")}
            </Text>
            <TextInput
              style={styles.modalSimpleInput}
              placeholder={moneyOutMethod === 'bank' ? tStatic("যেমন: ২০৫.১২০.XXXX") : tStatic("যেমন: ০১৭XXXXXXXX")}
              placeholderTextColor={COLORS.textSubtle}
              keyboardType="numeric"
              value={moneyOutAccNumber}
              onChangeText={setMoneyOutAccNumber}
            />

            <Text style={styles.inputLabel}>{tStatic("উত্তোলনের পরিমাণ (টাকা) *")}</Text>
            <TextInput
              style={styles.modalBigInput}
              placeholder={tStatic("৳ ০")}
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
                <Text style={styles.modalBtnCancelText}>{tStatic("বাতিল")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.primary }]}
                onPress={handleMoneyOut}
              >
                <Text style={styles.modalBtnSubmitText}>{tStatic("ট্রান্সফার নিশ্চিত করুন")}</Text>
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
                <Text style={styles.modalCardTitle}>{tStatic("টালি-মেসেজ সার্ভিস")}</Text>
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
                <Text style={{ fontSize: 13, color: '#991B1B', fontWeight: '600' }}>{tStatic("আপনার ফ্রি এসএমএস ব্যালেন্স")}</Text>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#B81414', marginVertical: 4 }}>
                  {toBengaliNumber(tallyMessageBalance)}{tStatic(" টি অবশিষ্ট")}</Text>
                <Text style={{ fontSize: 12, color: '#6B7280' }}>{tStatic("প্রতিটি লেনদেন ও তাগাদার সাথে স্বয়ংক্রিয়ভাবে কাস্টমারকে ফ্রি মেসেজ পাঠানো হয়।                   প্রতিটি লেনদেন ও তাগাদার সাথে স্বয়ংক্রিয়ভাবে কাস্টমারকে ফ্রি মেসেজ পাঠানো হয়।")}</Text>
              </View>

              {/* Message Bundles */}
              <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#111827', marginBottom: 10 }}>{tStatic("এসএমএস প্যাকেজ")}</Text>
              {[
                { count: 100, price: 50, tag: tStatic("জনপ্রিয়") },
                { count: 250, price: 120, tag: tStatic("বেস্ট ভ্যালু") },
                { count: 500, price: 220, tag: tStatic("সুপার সেভার") },
                { count: 1000, price: 400, tag: tStatic("বিগ সেভিং") },
              ].map((pkg, idx) => (
                <View
                  key={idx}
                  style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 8 }}
                >
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#111827' }}>{toBengaliNumber(pkg.count)}{tStatic(" এসএমএস")}</Text>
                      <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 8 }}>
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#B45309' }}>{pkg.tag}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{tStatic("মেয়াদ আজীবন • কোনো মেয়াদ নেই")}</Text>
                  </View>
                  <TouchableOpacity
                    style={{ backgroundColor: '#B81414', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 }}
                    onPress={async () => {
                      const newBal = tallyMessageBalance + pkg.count;
                      setTallyMessageBalance(newBal);
                      await persistData({ tallyMessageBalance: newBal });
                      Alert.alert(tStatic("অভিনন্দন!"), `${toBengaliNumber(pkg.count)}${tStatic(" টি এসএমএস সফলভাবে আপনার অ্যাকাউন্টে যোগ হয়েছে।")}`);
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 }}>{tStatic("৳ ")}{toBengaliNumber(pkg.price)}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
      {/* ===================================================================
          AUTHENTIC MODAL: TRANSACTION LIMIT (লেনদেনের লিমিট ও চার্জ)
          Layout: res/layout/activity_transaction_limit.xml
         =================================================================== */}
      <Modal
        visible={modalTxnLimit}
        animationType="slide"
        onRequestClose={() => setModalTxnLimit(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
          {/* Toolbar matching activity_transaction_limit.xml */}
          <View style={styles.txnLimitHeader}>
            <TouchableOpacity
              onPress={() => setModalTxnLimit(false)}
              style={styles.txnLimitBackBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={tStatic("পেছনে যান")}
            >
              <Image
                source={require('./assets/icons/arrow_left.png')}
                style={{ width: 22, height: 22, tintColor: '#FFFFFF' }}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <Text style={styles.txnLimitHeaderTitle}>{tStatic("লেনদেনের লিমিট ও চার্জ")}</Text>
            <View style={{ width: 22 }} />
          </View>

          {/* Tab Bar matching TabLayout id=2131364239 */}
          <View style={styles.txnLimitTabBar}>
            <TouchableOpacity
              style={[styles.txnLimitTabBtn, txnLimitTab === 'limits' && styles.txnLimitTabBtnActive]}
              onPress={() => setTxnLimitTab('limits')}
              activeOpacity={0.8}
            >
              <Text style={[styles.txnLimitTabLabel, txnLimitTab === 'limits' && styles.txnLimitTabLabelActive]}>{tStatic("লিমিট                 লিমিট")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.txnLimitTabBtn, txnLimitTab === 'charges' && styles.txnLimitTabBtnActive]}
              onPress={() => setTxnLimitTab('charges')}
              activeOpacity={0.8}
            >
              <Text style={[styles.txnLimitTabLabel, txnLimitTab === 'charges' && styles.txnLimitTabLabelActive]}>{tStatic("চার্জ                 চার্জ")}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            {txnLimitTab === 'limits' ? (
              <View>
                {/* Account Status Card */}
                <View style={styles.txnLimitStatusCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Image
                      source={require('./assets/icons/ic_check.png')}
                      style={{ width: 22, height: 22, tintColor: '#0F8A0F', marginRight: 10 }}
                      resizeMode="contain"
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#111827' }}>{tStatic("স্ট্যান্ডার্ড একাউন্ট                         স্ট্যান্ডার্ড একাউন্ট")}</Text>
                      <Text style={{ fontSize: 12, color: '#4B5563', marginTop: 2 }}>{tStatic("জাতীয় পরিচয়পত্র ও ফেস ভেরিফিকেশন সম্পন্ন                         জাতীয় পরিচয়পত্র ও ফেস ভেরিফিকেশন সম্পন্ন")}</Text>
                    </View>
                    <View style={styles.txnLimitVerifiedBadge}>
                      <Text style={styles.txnLimitVerifiedText}>{tStatic("ভেরিফাইড")}</Text>
                    </View>
                  </View>
                  <View style={styles.txnLimitDivider} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: '#4B5563' }}>{tStatic("সর্বোচ্চ ওয়ালেট ব্যালেন্স")}</Text>
                    <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#0F8A0F' }}>{tStatic("৳ ৩,০০,০০০")}</Text>
                  </View>
                </View>

                {/* Daily Limits Card */}
                <Text style={styles.txnLimitSectionTitle}>{tStatic("দৈনিক লিমিট")}</Text>
                <View style={styles.txnLimitCard}>
                  <View style={styles.txnLimitRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txnLimitRowTitle}>{tStatic("ক্যাশ-ইন (টাকা লোড)")}</Text>
                      <Text style={styles.txnLimitRowSub}>{tStatic("সর্বোচ্চ ৫ বার")}</Text>
                    </View>
                    <Text style={styles.txnLimitRowAmount}>{tStatic("৳ ৫০,০০০")}</Text>
                  </View>
                  <View style={styles.txnLimitRowDivider} />
                  <View style={styles.txnLimitRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txnLimitRowTitle}>{tStatic("ক্যাশ-আউট (টাকা উত্তোলন)")}</Text>
                      <Text style={styles.txnLimitRowSub}>{tStatic("সর্বোচ্চ ৩ বার")}</Text>
                    </View>
                    <Text style={styles.txnLimitRowAmount}>{tStatic("৳ ২৫,০০০")}</Text>
                  </View>
                  <View style={styles.txnLimitRowDivider} />
                  <View style={styles.txnLimitRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txnLimitRowTitle}>{tStatic("সেন্ড মানি (কাস্টমার/সাপ্লায়ার)")}</Text>
                      <Text style={styles.txnLimitRowSub}>{tStatic("সর্বোচ্চ ১০ বার")}</Text>
                    </View>
                    <Text style={styles.txnLimitRowAmount}>{tStatic("৳ ৫০,০০০")}</Text>
                  </View>
                  <View style={styles.txnLimitRowDivider} />
                  <View style={styles.txnLimitRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txnLimitRowTitle}>{tStatic("মোবাইল রিচার্জ")}</Text>
                      <Text style={styles.txnLimitRowSub}>{tStatic("সর্বোচ্চ ৫০ বার")}</Text>
                    </View>
                    <Text style={styles.txnLimitRowAmount}>{tStatic("৳ ১০,০০০")}</Text>
                  </View>
                </View>

                {/* Monthly Limits Card */}
                <Text style={styles.txnLimitSectionTitle}>{tStatic("মাসিক লিমিট")}</Text>
                <View style={styles.txnLimitCard}>
                  <View style={styles.txnLimitRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txnLimitRowTitle}>{tStatic("মাসিক ক্যাশ-ইন")}</Text>
                      <Text style={styles.txnLimitRowSub}>{tStatic("সর্বোচ্চ ৫০ বার")}</Text>
                    </View>
                    <Text style={styles.txnLimitRowAmount}>{tStatic("৳ ৫,০০,০০০")}</Text>
                  </View>
                  <View style={styles.txnLimitRowDivider} />
                  <View style={styles.txnLimitRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txnLimitRowTitle}>{tStatic("মাসিক ক্যাশ-আউট")}</Text>
                      <Text style={styles.txnLimitRowSub}>{tStatic("সর্বোচ্চ ৩০ বার")}</Text>
                    </View>
                    <Text style={styles.txnLimitRowAmount}>{tStatic("৳ ২,০০,০০০")}</Text>
                  </View>
                  <View style={styles.txnLimitRowDivider} />
                  <View style={styles.txnLimitRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txnLimitRowTitle}>{tStatic("মাসিক সর্বমোট লেনদেন")}</Text>
                      <Text style={styles.txnLimitRowSub}>{tStatic("সর্বোচ্চ ১০০ বার")}</Text>
                    </View>
                    <Text style={styles.txnLimitRowAmount}>{tStatic("৳ ৫,০০,০০০")}</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View>
                {/* Charges List Card */}
                <Text style={styles.txnLimitSectionTitle}>{tStatic("সার্ভিস চার্জ তালিকা")}</Text>
                <View style={styles.txnLimitCard}>
                  <View style={styles.txnLimitRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txnLimitRowTitle}>{tStatic("ক্যাশ-ইন (ব্যাংক / কার্ড)")}</Text>
                      <Text style={styles.txnLimitRowSub}>{tStatic("যেকোনো ভিসা বা মাস্টারকার্ড")}</Text>
                    </View>
                    <Text style={[styles.txnLimitRowAmount, { color: '#0F8A0F' }]}>{tStatic("ফ্রি (০%)")}</Text>
                  </View>
                  <View style={styles.txnLimitRowDivider} />
                  <View style={styles.txnLimitRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txnLimitRowTitle}>{tStatic("সেন্ড মানি")}</Text>
                      <Text style={styles.txnLimitRowSub}>{tStatic("টালিপে থেকে টালিপে একাউন্ট")}</Text>
                    </View>
                    <Text style={[styles.txnLimitRowAmount, { color: '#0F8A0F' }]}>{tStatic("ফ্রি (০%)")}</Text>
                  </View>
                  <View style={styles.txnLimitRowDivider} />
                  <View style={styles.txnLimitRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txnLimitRowTitle}>{tStatic("মোবাইল রিচার্জ")}</Text>
                      <Text style={styles.txnLimitRowSub}>{tStatic("সব মোবাইল অপারেটরে")}</Text>
                    </View>
                    <Text style={[styles.txnLimitRowAmount, { color: '#0F8A0F' }]}>{tStatic("ফ্রি (০%)")}</Text>
                  </View>
                  <View style={styles.txnLimitRowDivider} />
                  <View style={styles.txnLimitRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txnLimitRowTitle}>{tStatic("বাংলা QR পেমেন্ট রিসিভ")}</Text>
                      <Text style={styles.txnLimitRowSub}>{tStatic("যেকোনো ব্যাংক বা MFS অ্যাপ থেকে")}</Text>
                    </View>
                    <Text style={[styles.txnLimitRowAmount, { color: '#0F8A0F' }]}>{tStatic("ফ্রি (০%)")}</Text>
                  </View>
                  <View style={styles.txnLimitRowDivider} />
                  <View style={styles.txnLimitRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txnLimitRowTitle}>{tStatic("ক্যাশ-আউট (ব্যাংক একাউন্ট)")}</Text>
                      <Text style={styles.txnLimitRowSub}>{tStatic("সংযুক্ত ব্যাংক একাউন্টে ট্রান্সফার")}</Text>
                    </View>
                    <Text style={styles.txnLimitRowAmount}>{tStatic("১.৫%")}</Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>






            {/* ===================================================================
          PERSONAL MONEY MANAGER (ব্যক্তিগত অর্থ ব্যবস্থাপনা) — 100% ISOLATED
          Features: Multi-Account Wallets, Budgets, Analytics, Income/Expense/Transfer
         =================================================================== */}
      <Modal
        visible={modalMoneyManager}
        animationType="slide"
        onRequestClose={() => setModalMoneyManager(false)}
      >
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? currentTheme.headerBg : '#FFFFFF'} translucent={false} />
        <SafeAreaView style={[{ flex: 1 }, tStyles.mmScreen]}>
          {/* Header */}
          <View style={[styles.mmHeader, tStyles.mmHeader, { flexDirection: 'column', alignItems: 'stretch', gap: 10 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity
                style={[styles.mmBackBtn, tStyles.mmBackBtn]}
                onPress={() => setModalMoneyManager(false)}
                accessibilityRole="button"
                accessibilityLabel={t('mm_access_back')}
              >
                <Text style={[styles.mmBackIcon, tStyles.mmBackIcon]}>←</Text>
              </TouchableOpacity>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Text style={[styles.mmHeaderTitle, tStyles.mmHeaderTitle, { flexShrink: 1 }]}>{t("mm_title")}</Text>
                  <View style={[styles.mmBadge, tStyles.mmBadge]}>
                    <Text style={[styles.mmBadgeText, tStyles.mmBadgeText]}>{t("mm_badge")}</Text>
                  </View>
                </View>
                <Text style={[styles.mmHeaderSub, tStyles.mmHeaderSub]} numberOfLines={2}>{t("mm_sub")}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
              <TouchableOpacity
                style={[[styles.mmHeaderIconBtn, tStyles.mmHeaderIconBtn], tStyles.mmIconBtn]}
                onPress={() => {
                  const prefs = moneyManagerState.preferences || {};
                  setMmPrefDefaultPeriod(prefs.defaultPeriod || "this_month");
                  setMmPrefCurrencySymbol(prefs.currencySymbol || tStatic("৳"));
                  setMmPrefSortOrder(prefs.sortOrder || "newest");
                  setMmPrefShowNetWorth(prefs.showNetWorthCard !== false);
                  setMmPrefShowSavingsRate(prefs.showSavingsRateCard !== false);
                  setMmPrefShowTips(prefs.showTipsCard !== false);
                  setModalMMPreferences(true);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('mm_access_settings')}
              >
                <Text style={{ fontSize: 16 }}>⚙️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[[styles.mmHeaderIconBtn, tStyles.mmHeaderIconBtn], tStyles.mmIconBtn]}
                onPress={() => setModalMMRecurring(true)}
                accessibilityRole="button"
                accessibilityLabel={t('mm_schedules_title')}
              >
                <Text style={{ fontSize: 16 }}>⏱️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mmAddHeaderBtn, tStyles.mmAddHeaderBtn, { minHeight: 42, paddingHorizontal: 14 }]}
                onPress={() => {
                  setMmNewType('expense');
                  setMmNewAmount('');
                  setMmNewNote('');
                  setMmNewPayee('');
                  setModalMMAddTxn(true);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('mm_access_new_txn')}
              >
                <Text style={[styles.mmAddHeaderBtnText, tStyles.mmAddHeaderBtnText]}>{t("mm_new_txn")}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Period Selector Pills Bar */}
          <View style={[styles.mmPeriodContainer, tStyles.mmPeriodContainer, { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, paddingHorizontal: 12 }]}>
            <TouchableOpacity
              style={[styles.mmPeriodPill, tStyles.mmPeriodPill, { flex: 0, width: '48%', marginHorizontal: 0 }, mmPeriod === 'this_month' && [styles.mmPeriodPillActive, tStyles.mmPeriodPillActive]]}
              onPress={() => handleSelectMMPeriod('this_month')}
              accessibilityRole="button"
              accessibilityLabel={`${t('mm_period_this_month')} ${t('mm_period_accessibility_suffix')}`}
            >
              <Text style={[styles.mmPeriodPillText, tStyles.mmPeriodPillText, mmPeriod === 'this_month' && [styles.mmPeriodPillTextActive, tStyles.mmPeriodPillTextActive]]}>
                📅 {t("mm_period_this_month")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.mmPeriodPill, tStyles.mmPeriodPill, { flex: 0, width: '48%', marginHorizontal: 0 }, mmPeriod === 'last_month' && [styles.mmPeriodPillActive, tStyles.mmPeriodPillActive]]}
              onPress={() => handleSelectMMPeriod('last_month')}
              accessibilityRole="button"
              accessibilityLabel={`${t('mm_period_last_month')} ${t('mm_period_accessibility_suffix')}`}
            >
              <Text style={[styles.mmPeriodPillText, tStyles.mmPeriodPillText, mmPeriod === 'last_month' && [styles.mmPeriodPillTextActive, tStyles.mmPeriodPillTextActive]]}>
                🗓️ {t("mm_period_last_month")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.mmPeriodPill, tStyles.mmPeriodPill, { flex: 0, width: '48%', marginHorizontal: 0 }, mmPeriod === 'all_time' && [styles.mmPeriodPillActive, tStyles.mmPeriodPillActive]]}
              onPress={() => handleSelectMMPeriod('all_time')}
              accessibilityRole="button"
              accessibilityLabel={`${t('mm_period_all_time')} ${t('mm_period_accessibility_suffix')}`}
            >
              <Text style={[styles.mmPeriodPillText, tStyles.mmPeriodPillText, mmPeriod === 'all_time' && [styles.mmPeriodPillTextActive, tStyles.mmPeriodPillTextActive]]}>
                ⏱️ {t("mm_period_all_time")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.mmPeriodPill, tStyles.mmPeriodPill, { flex: 0, width: '48%', marginHorizontal: 0 }, mmPeriod === 'custom' && [styles.mmPeriodPillActive, tStyles.mmPeriodPillActive]]}
              onPress={() => {
                if (mmCustomRange && mmCustomRange.startDate && mmCustomRange.endDate) {
                  setMMRangeInputs(mmCustomRange.startDate, mmCustomRange.endDate);
                } else {
                  const today = moneyManagerService.getLocalDateString();
                  setMMRangeInputs(today, today);
                }
                setModalMMCustomDateRange(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('mm_custom_range_title')}
            >
              <Text style={[styles.mmPeriodPillText, tStyles.mmPeriodPillText, mmPeriod === 'custom' && [styles.mmPeriodPillTextActive, tStyles.mmPeriodPillTextActive]]}>
                📊 {t("mm_period_custom")}
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1, paddingHorizontal: 16 }} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Top Net Worth & Period Flow Card */}
            {moneyManagerState.preferences?.showNetWorthCard !== false && (() => {
              const periodMetrics = moneyManagerService.calculatePeriodMetrics(moneyManagerState, mmPeriod, mmCustomRange);
              const totalNetWorth = periodMetrics.netWorth;
              const periodTxns = moneyManagerService.filterAndSortTransactions(moneyManagerState, { period: mmPeriod, customRange: mmCustomRange });
              const cashflowTxns = periodTxns.filter(transaction => !moneyManagerService.isGoalAllocationTransaction(transaction));
              const pIncome = cashflowTxns.filter(t => t.type === 'income').reduce((acc, t) => acc + (t.amount || 0), 0);
              const pExpense = cashflowTxns.filter(t => t.type === 'expense').reduce((acc, t) => acc + (t.amount || 0), 0);
              const pSavings = pIncome - pExpense;
              const savingsRate = pIncome > 0 ? Math.round((pSavings / pIncome) * 100) : 0;
              const periodLabel = getMmPeriodLabel();

              return (
                <View style={[styles.mmTotalCard, tStyles.mmTotalCard]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.mmTotalCardLabel, tStyles.mmTotalCardLabel]}>{t("mm_net_worth")}</Text>
                    <View style={[[styles.mmPeriodBadge, tStyles.mmPeriodBadge], !isDark && { backgroundColor: currentTheme.cardBgElevated }]}>
                      <Text style={[[styles.mmPeriodBadgeText, tStyles.mmPeriodBadgeText], !isDark && { color: currentTheme.textSecondary }]}>{periodLabel}</Text>
                    </View>
                  </View>
                  <Text style={[styles.mmTotalCardAmount, tStyles.mmTotalCardAmount]}>{mmCurrency} {formatMMNumber(totalNetWorth)}</Text>
                  <Text style={[styles.mmTotalCardSub, tStyles.mmTotalCardSub]}>{t('mm_active_wallet_balances')}</Text>

                  <View style={[styles.mmStatRow, !isDark && { borderTopColor: currentTheme.divider }]}>
                    <View style={styles.mmStatCol}>
                      <Text style={[styles.mmStatLabel, tStyles.mmStatLabel]}>{t('mm_income_prefix')}{periodLabel})</Text>
                      <Text style={[styles.mmStatIncome, tStyles.mmStatIncome]}>+{mmCurrency} {formatMMNumber(pIncome)}</Text>
                    </View>
                    <View style={[styles.mmStatDivider, tStyles.mmStatDivider]} />
                    <View style={styles.mmStatCol}>
                      <Text style={[styles.mmStatLabel, tStyles.mmStatLabel]}>{t('mm_expense_prefix')}{periodLabel})</Text>
                      <Text style={[styles.mmStatExpense, tStyles.mmStatExpense]}>-{mmCurrency} {formatMMNumber(pExpense)}</Text>
                    </View>
                    <View style={[styles.mmStatDivider, tStyles.mmStatDivider]} />
                    <View style={styles.mmStatCol}>
                      <Text style={[styles.mmStatLabel, tStyles.mmStatLabel]}>{t('mm_net_savings')}</Text>
                      <Text style={[[styles.mmStatSavings, tStyles.mmStatSavings], pSavings < 0 && { color: '#EF4444' }]}>
                        {pSavings >= 0 ? '+' : ''}{mmCurrency} {formatMMNumber(pSavings)}
                      </Text>
                    </View>
                  </View>
                  {pIncome > 0 && moneyManagerState.preferences?.showSavingsRateCard !== false && (
                    <View style={[styles.mmSavingsRateRow, tStyles.mmSavingsRateRow]}>
                      <Text style={[styles.mmSavingsRateText, tStyles.mmSavingsRateText]}>
                        {t('mm_savings_rate_prefix')} <Text style={{ color: pSavings >= 0 ? '#10B981' : '#EF4444', fontWeight: 'bold' }}>{savingsRate}%</Text> ({pSavings >= 0 ? t('mm_savings_positive') : t('mm_savings_negative')})
                      </Text>
                    </View>
                  )}
                </View>
              );
            })()}

            {/* Sub-Tab Navigation Bar (5 tabs) */}
            <View style={[styles.mmSubTabsContainer, tStyles.mmSubTabsContainer]}>
              <TouchableOpacity
                style={[styles.mmSubTabBtn, tStyles.mmSubTabBtn, mmActiveSubTab === 'transactions' && [styles.mmSubTabBtnActive, tStyles.mmSubTabBtnActive]]}
                onPress={() => setMmActiveSubTab('transactions')}
                accessibilityRole="button"
                accessibilityLabel={t('mm_access_tab_transactions')}
              >
                <Text style={[styles.mmSubTabLabel, tStyles.mmSubTabLabel, mmActiveSubTab === 'transactions' && [styles.mmSubTabLabelActive, tStyles.mmSubTabLabelActive]]}>
                  📋 {t("mm_tab_txns")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mmSubTabBtn, tStyles.mmSubTabBtn, mmActiveSubTab === 'accounts' && [styles.mmSubTabBtnActive, tStyles.mmSubTabBtnActive]]}
                onPress={() => setMmActiveSubTab('accounts')}
                accessibilityRole="button"
                accessibilityLabel={t('mm_access_tab_wallets')}
              >
                <Text style={[styles.mmSubTabLabel, tStyles.mmSubTabLabel, mmActiveSubTab === 'accounts' && [styles.mmSubTabLabelActive, tStyles.mmSubTabLabelActive]]}>
                  👛 {t("mm_tab_wallets")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mmSubTabBtn, tStyles.mmSubTabBtn, mmActiveSubTab === 'budgets' && [styles.mmSubTabBtnActive, tStyles.mmSubTabBtnActive]]}
                onPress={() => setMmActiveSubTab('budgets')}
                accessibilityRole="button"
                accessibilityLabel={t('mm_access_tab_budgets')}
              >
                <Text style={[styles.mmSubTabLabel, tStyles.mmSubTabLabel, mmActiveSubTab === 'budgets' && [styles.mmSubTabLabelActive, tStyles.mmSubTabLabelActive]]}>
                  🎯 {t("mm_tab_budgets")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mmSubTabBtn, tStyles.mmSubTabBtn, mmActiveSubTab === 'goals' && [styles.mmSubTabBtnActive, tStyles.mmSubTabBtnActive]]}
                onPress={() => setMmActiveSubTab('goals')}
                accessibilityRole="button"
                accessibilityLabel={t('mm_access_tab_goals')}
              >
                <Text style={[styles.mmSubTabLabel, tStyles.mmSubTabLabel, mmActiveSubTab === 'goals' && [styles.mmSubTabLabelActive, tStyles.mmSubTabLabelActive]]}>
                  🏆 {t("mm_tab_goals")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mmSubTabBtn, tStyles.mmSubTabBtn, mmActiveSubTab === 'analytics' && [styles.mmSubTabBtnActive, tStyles.mmSubTabBtnActive]]}
                onPress={() => setMmActiveSubTab('analytics')}
                accessibilityRole="button"
                accessibilityLabel={t('mm_access_tab_analytics')}
              >
                <Text style={[styles.mmSubTabLabel, tStyles.mmSubTabLabel, mmActiveSubTab === 'analytics' && [styles.mmSubTabLabelActive, tStyles.mmSubTabLabelActive]]}>
                  📊 {t("mm_tab_analytics")}
                </Text>
              </TouchableOpacity>
            </View>

            {/* SUB-TAB 1: TRANSACTIONS LIST */}
            {mmActiveSubTab === 'transactions' && (
              <View style={{ marginTop: 14 }}>
                {/* Search Bar */}
                <View style={[styles.mmSearchBox, tStyles.mmSearchBox]}>
                  <Text style={[styles.mmSearchIcon, tStyles.mmSearchIcon]}>🔍</Text>
                  <TextInput
                    style={[styles.mmSearchInput, tStyles.mmSearchInput]}
                    placeholder={t("mm_search_placeholder")}
                    placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                    value={mmSearchQuery}
                    onChangeText={setMmSearchQuery}
                  />
                  {mmSearchQuery ? (
                    <TouchableOpacity onPress={() => setMmSearchQuery('')} style={{ padding: 4 }}>
                      <Text style={{ color: currentTheme.textSecondary, fontSize: 14 }}>✕</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Filter Pills (All / Expense / Income / Transfer) */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 12, paddingRight: 28 }}
                  style={{ marginBottom: 10 }}
                >
                  <TouchableOpacity
                    style={[styles.mmFilterChip, tStyles.mmFilterChip, mmTxnFilter === 'all' && [styles.mmFilterChipActive, tStyles.mmFilterChipActive]]}
                    onPress={() => setMmTxnFilter('all')}
                  >
                    <Text style={[styles.mmFilterChipText, tStyles.mmFilterChipText, mmTxnFilter === 'all' && [styles.mmFilterChipTextActive, tStyles.mmFilterChipTextActive]]}>
                      {t('mm_filter_all')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.mmFilterChip, tStyles.mmFilterChip, mmTxnFilter === 'expense' && [styles.mmFilterChipActive, tStyles.mmFilterChipActive]]}
                    onPress={() => setMmTxnFilter('expense')}
                  >
                    <Text style={[styles.mmFilterChipText, tStyles.mmFilterChipText, mmTxnFilter === 'expense' && [styles.mmFilterChipTextActive, tStyles.mmFilterChipTextActive]]}>
                      {t('mm_filter_expense')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.mmFilterChip, tStyles.mmFilterChip, mmTxnFilter === 'income' && [styles.mmFilterChipActive, tStyles.mmFilterChipActive]]}
                    onPress={() => setMmTxnFilter('income')}
                  >
                    <Text style={[styles.mmFilterChipText, tStyles.mmFilterChipText, mmTxnFilter === 'income' && [styles.mmFilterChipTextActive, tStyles.mmFilterChipTextActive]]}>
                      {t('mm_filter_income')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.mmFilterChip, tStyles.mmFilterChip, mmTxnFilter === 'transfer' && [styles.mmFilterChipActive, tStyles.mmFilterChipActive]]}
                    onPress={() => setMmTxnFilter('transfer')}
                  >
                    <Text style={[styles.mmFilterChipText, tStyles.mmFilterChipText, mmTxnFilter === 'transfer' && [styles.mmFilterChipTextActive, tStyles.mmFilterChipTextActive]]}>
                      {t('mm_filter_transfer')}
                    </Text>
                  </TouchableOpacity>
                </ScrollView>

                {/* Sort Order Chips */}
                <View style={styles.mmSortRow}>
                  <Text style={[styles.mmSortLabel, tStyles.mmSortLabel]}>{t('mm_sort_label')}</Text>
                  <TouchableOpacity
                    style={[styles.mmSortChip, tStyles.mmSortChip, mmSortOrder === 'newest' && [styles.mmSortChipActive, tStyles.mmSortChipActive]]}
                    onPress={() => setMmSortOrder('newest')}
                  >
                    <Text style={[styles.mmSortChipText, tStyles.mmSortChipText, mmSortOrder === 'newest' && [styles.mmSortChipTextActive, tStyles.mmSortChipTextActive]]}>
                      {t('mm_sort_newest')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.mmSortChip, tStyles.mmSortChip, mmSortOrder === 'oldest' && [styles.mmSortChipActive, tStyles.mmSortChipActive]]}
                    onPress={() => setMmSortOrder('oldest')}
                  >
                    <Text style={[styles.mmSortChipText, tStyles.mmSortChipText, mmSortOrder === 'oldest' && [styles.mmSortChipTextActive, tStyles.mmSortChipTextActive]]}>
                      {t('mm_sort_oldest')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.mmSortChip, tStyles.mmSortChip, mmSortOrder === 'amount_high' && [styles.mmSortChipActive, tStyles.mmSortChipActive]]}
                    onPress={() => setMmSortOrder('amount_high')}
                  >
                    <Text style={[styles.mmSortChipText, tStyles.mmSortChipText, mmSortOrder === 'amount_high' && [styles.mmSortChipTextActive, tStyles.mmSortChipTextActive]]}>
                      {t('mm_sort_high')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.mmSortChip, tStyles.mmSortChip, mmSortOrder === 'amount_low' && [styles.mmSortChipActive, tStyles.mmSortChipActive]]}
                    onPress={() => setMmSortOrder('amount_low')}
                  >
                    <Text style={[styles.mmSortChipText, tStyles.mmSortChipText, mmSortOrder === 'amount_low' && [styles.mmSortChipTextActive, tStyles.mmSortChipTextActive]]}>
                      {t('mm_sort_low')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Filtered & Sorted Transactions List */}
                {(() => {
                  const filteredTxns = moneyManagerService.filterAndSortTransactions(moneyManagerState, {
                    filterType: mmTxnFilter,
                    period: mmPeriod,
                    customRange: mmCustomRange,
                    searchQuery: mmSearchQuery,
                    sortOrder: mmSortOrder,
                  });

                  if (filteredTxns.length === 0) {
                    return (
                      <View style={[styles.mmEmptyBox, tStyles.mmEmptyBox]}>
                        <Text style={styles.mmEmptyIcon}>📝</Text>
                        <Text style={[styles.mmEmptyText, tStyles.mmEmptyText]}>
                          {mmSearchQuery ? t('mm_empty_filtered') : t('mm_empty_period')}
                        </Text>
                        <TouchableOpacity
                            style={[styles.mmEmptyBtn, tStyles.mmEmptyBtn]}
                          onPress={() => {
                            setMmNewType('expense');
                            setMmNewAmount('');
                            setMmNewNote('');
                            setMmNewPayee('');
                            setModalMMAddTxn(true);
                          }}
                        >
                          <Text style={[styles.mmEmptyBtnText, tStyles.mmEmptyBtnText]}>{t('mm_first_txn')}</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  }

                  return filteredTxns.map((txn) => {
                    const isIncome = txn.type === 'income';
                    const isExpense = txn.type === 'expense';
                    const isTransfer = txn.type === 'transfer';
                    const isGoalAllocation = moneyManagerService.isGoalAllocationTransaction(txn);
                    const linkedGoal = isGoalAllocation ? (moneyManagerState.goals || []).find((goal) => goal.id === txn.goalId) : null;

                    const cat = (moneyManagerState.categories || []).find((c) => c.id === txn.categoryId);
                    const acc = (moneyManagerState.accounts || []).find((a) => a.id === txn.accountId);
                    const fromAcc = isTransfer ? (moneyManagerState.accounts || []).find((a) => a.id === txn.fromAccountId) : null;
                    const toAcc = isTransfer ? (moneyManagerState.accounts || []).find((a) => a.id === txn.toAccountId) : null;

                    const title = isGoalAllocation
                      ? `${t(txn.goalAction === 'withdrawal' ? 'mm_goal_withdrawal_short' : 'mm_goal_deposit_short')}: ${linkedGoal ? tMMSeed('goal', linkedGoal.id, linkedGoal.title) : txn.payee || t('mm_goal_fallback')}`
                      : isTransfer
                      ? `${fromAcc ? tMMSeed('account', fromAcc.id, fromAcc.name) : t('mm_account')} ➔ ${toAcc ? tMMSeed('account', toAcc.id, toAcc.name) : t('mm_account')}`
                      : cat
                      ? tMMSeed('category', cat.id, cat.name)
                      : t('mm_generic_txn');

                    const icon = isGoalAllocation ? '🎯' : isTransfer ? '🔄' : cat ? cat.icon : '💵';
                    const color = isGoalAllocation ? '#8B5CF6' : isTransfer ? '#3B82F6' : isIncome ? '#10B981' : '#EF4444';

                    return (
                      <View key={txn.id} style={[[styles.mmTxnCard, tStyles.mmTxnCard], tStyles.mmTxnItem]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={[styles.mmTxnIconBox, { backgroundColor: color + '22', borderColor: color + '55' }]}>
                            <Text style={styles.mmTxnIcon}>{icon}</Text>
                          </View>
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={[styles.mmTxnCat, tStyles.mmTxnTitle]} numberOfLines={1}>
                              {title}
                            </Text>
                            {txn.payee ? (
                              <Text style={[styles.mmTxnPayee, tStyles.mmTxnPayee]} numberOfLines={1}>
                                🏷️ {tMMSeed('transaction', txn.id, txn.payee, 'payee')}
                              </Text>
                            ) : null}
                            {txn.note ? (
                              <Text style={[[styles.mmTxnNote, tStyles.mmTxnNote], tStyles.mmTxnSub]} numberOfLines={2}>
                                {tMMSeed('transaction', txn.id, txn.note, 'note')}
                              </Text>
                            ) : null}
                            <Text style={[[styles.mmTxnMeta, tStyles.mmTxnMeta], tStyles.mmTxnSub]}>
                              {formatDisplayDate(txn.date)}{txn.time && !/^(today|yesterday)$/i.test(String(txn.time).trim()) ? ` • ${txn.time}` : ''}{acc && !isTransfer ? ` • ${tMMSeed('account', acc.id, acc.name)}` : ''}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                            <Text style={[styles.mmTxnAmount, { color }]}>
            {isGoalAllocation ? (txn.goalAction === 'withdrawal' ? '↗ ' : '↘ ') : isIncome ? '+' : isExpense ? '-' : ''}{mmCurrency}{' '}
                              {formatMMNumber((txn.amount || 0))}
                            </Text>
                          </View>
                        </View>

                        {/* Transaction Actions: Edit & Delete */}
                        <View style={[styles.mmTxnActionRow, tStyles.mmTxnActionRow]}>
                          {!isGoalAllocation && (
                            <TouchableOpacity
                              style={[styles.mmTxnActionBtn, tStyles.mmTxnActionBtn]}
                              onPress={() => handleOpenEditMMTxn(txn)}
                              accessibilityRole="button"
                              accessibilityLabel={t('mm_access_edit_txn')}
                            >
                              <Text style={[styles.mmTxnActionBtnText, tStyles.mmTxnActionBtnText]}>✏️ {t('btn_edit')}</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={[styles.mmTxnDeleteBtn, tStyles.mmTxnDeleteBtn]}
                            onPress={() => handleDeleteMMTxn(txn.id)}
                            accessibilityRole="button"
                            accessibilityLabel={t('mm_access_delete_txn')}
                          >
                            <Text style={[styles.mmTxnDeleteBtnText, tStyles.mmTxnDeleteBtnText]}>🗑️ {t('btn_delete')}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  });
                })()}
              </View>
            )}

            {/* SUB-TAB 2: ACCOUNTS & WALLETS */}
            {mmActiveSubTab === 'accounts' && (
              <View style={{ marginTop: 14 }}>
                <View style={styles.mmSectionHeader}>
                  <Text style={[styles.mmSectionTitle, tStyles.mmSectionTitle]}>{t("mm_wallets_title")}</Text>
                  <TouchableOpacity
                    style={[styles.mmAddSmallBtn, tStyles.mmAddSmallBtn]}
                    onPress={() => {
                      setMmNewAccName('');
                      setMmNewAccBal('');
                      setMmNewAccType('bank');
                      setModalMMAddAccount(true);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('mm_add_wallet')}
                  >
                    <Text style={[styles.mmAddSmallBtnText, tStyles.mmAddSmallBtnText]}>{t('mm_add_wallet_short')}</Text>
                  </TouchableOpacity>
                </View>

                {(moneyManagerState.accounts || []).map((acc) => {
                  const typeLabel =
                    acc.type === 'cash'
                      ? t('mm_account_cash')
                      : acc.type === 'bank'
                      ? t('mm_account_bank')
                      : acc.type === 'mfs'
                      ? t('mm_account_mfs')
                      : t('mm_account_other');

                  return (
                    <View key={acc.id} style={[styles.mmAccountCard, tStyles.mmAccountCard, acc.isArchived && styles.mmAccountCardArchived]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.mmAccountIconBox, { backgroundColor: (acc.color || '#3B82F6') + '22', borderColor: (acc.color || '#3B82F6') + '55' }]}>
                          <Text style={styles.mmAccountIcon}>{acc.icon || '💼'}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={[styles.mmAccountName, tStyles.mmAccountName]} numberOfLines={1}>
                              {acc.name}
                            </Text>
                            {acc.isArchived && (
                              <View style={[styles.mmArchivedBadge, tStyles.mmArchivedBadge]}>
                                <Text style={[styles.mmArchivedBadgeText, tStyles.mmArchivedBadgeText]}>{t('mm_archived')}</Text>
                              </View>
                            )}
                          </View>
                          <Text style={[[styles.mmAccountType, tStyles.mmAccountType], tStyles.mmCardSub]}>{typeLabel}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                          <Text style={[[styles.mmAccountBalance, tStyles.mmAccountBalance], tStyles.mmCardTitle]}>{mmCurrency} {formatMMNumber((acc.balance || 0))}</Text>
                        </View>
                      </View>

                      {/* Account Action Buttons */}
                      <View style={[styles.mmAccountActions, tStyles.mmAccountActions]}>
                        <TouchableOpacity
                          style={[[styles.mmAccountActionBtn, tStyles.mmAccountActionBtn], acc.isArchived && { opacity: 0.5 }]}
                          onPress={() => {
                            if (acc.isArchived) {
                              Alert.alert(t("mm_alert_warning"), t("mm_archived_wallet_transfer_error"));
                              return;
                            }
                            setMmTransferFrom(acc.id);
                            const other = (moneyManagerState.accounts || []).find((a) => a.id !== acc.id && !a.isArchived);
                            if (other) setMmTransferTo(other.id);
                            setMmTransferAmt('');
                            setMmTransferNote('');
                            setModalMMTransfer(true);
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={t('mm_access_transfer')}
                        >
                          <Text style={[styles.mmAccountActionText, tStyles.mmAccountActionText]}>{t('mm_transfer_btn')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.mmAccountArchiveBtn, tStyles.mmAccountArchiveBtn]}
                          onPress={() => handleArchiveMMAccount(acc.id, !acc.isArchived)}
                          accessibilityRole="button"
                          accessibilityLabel={acc.isArchived ? t('mm_access_activate') : t('mm_access_archive')}
                        >
                          <Text style={[styles.mmAccountArchiveText, tStyles.mmAccountArchiveText]}>
                            {acc.isArchived ? t('mm_unarchive_btn') : t('mm_archive_btn')}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.mmAccountDeleteBtn, tStyles.mmAccountDeleteBtn]}
                          onPress={() => handleDeleteMMAccount(acc.id)}
                          accessibilityRole="button"
                          accessibilityLabel={t('mm_access_delete_account')}
                        >
                          <Text style={[styles.mmAccountDeleteText, tStyles.mmAccountDeleteText]}>{t('mm_delete')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}

                <TouchableOpacity
                  style={[styles.mmAddAccBigBtn, tStyles.mmAddAccBigBtn]}
                  onPress={() => {
                    setMmNewAccName('');
                    setMmNewAccBal('');
                    setMmNewAccType('bank');
                    setModalMMAddAccount(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t('mm_add_wallet')}
                >
                  <Text style={[styles.mmAddAccBigBtnText, tStyles.mmAddAccBigBtnText]}>{t('mm_add_wallet')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* SUB-TAB 3: BUDGETS */}
            {mmActiveSubTab === 'budgets' && (
              <View style={{ marginTop: 14 }}>
                {/* Overall Monthly Budget Ceiling Card */}
                {(() => {
                  const overallLimit = moneyManagerState.overallMonthlyBudget || 40000;
                  // Budget ceilings stay on the calendar month even when dashboard analytics use a custom interval.
                  const periodTxns = moneyManagerService.filterAndSortTransactions(moneyManagerState, { period: 'this_month' });
                  const totalSpent = periodTxns
                    .filter((transaction) => transaction.type === 'expense' && !moneyManagerService.isGoalAllocationTransaction(transaction))
                    .reduce((acc, transaction) => acc + (transaction.amount || 0), 0);
                  const remaining = overallLimit - totalSpent;
                  const pct = overallLimit > 0 ? Math.min(100, Math.round((totalSpent / overallLimit) * 100)) : 0;
                  const isOver = totalSpent > overallLimit;

                  return (
                    <View style={[[styles.mmOverallBudgetCard, tStyles.mmOverallBudgetCard], tStyles.mmCard]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={[styles.mmOverallBudgetTitle, tStyles.mmOverallBudgetTitle]}>{t('mm_overall_budget')}</Text>
                        <View style={[styles.mmOverallBudgetBadge, tStyles.mmOverallBudgetBadge, isOver && { backgroundColor: '#EF4444' }]}>
                          <Text style={[styles.mmOverallBudgetBadgeText, tStyles.mmOverallBudgetBadgeText, isOver && { color: '#FFFFFF' }]}>
                            {isOver ? t('mm_budget_over') : t('mm_budget_ok')}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.mmOverallBudgetStats}>
                        <View>
                          <Text style={[styles.mmStatLabel, tStyles.mmStatLabel]}>{t('mm_spent_prefix')}{t('mm_period_this_month')})</Text>
                          <Text style={[styles.mmOverallBudgetSpent, tStyles.mmOverallBudgetSpent, isOver && { color: '#EF4444' }]}>
                            {mmCurrency} {formatMMNumber(totalSpent)}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[styles.mmStatLabel, tStyles.mmStatLabel]}>{t('mm_max_limit')}</Text>
                          <Text style={[styles.mmOverallBudgetLimit, tStyles.mmOverallBudgetLimit]}>{mmCurrency} {formatMMNumber(overallLimit)}</Text>
                        </View>
                      </View>

                      {/* Progress Bar */}
                      <View style={[styles.mmProgressBarBg, tStyles.mmProgressBarBg]}>
                        <View
                          style={[
                            styles.mmProgressBarFill,
                            {
                              width: `${pct}%`,
                              backgroundColor: isOver ? '#EF4444' : pct > 80 ? '#F59E0B' : '#10B981',
                            },
                          ]}
                        />
                      </View>

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                            <Text style={{ color: currentTheme.textMuted, fontSize: 12 }}>{t('mm_budget_used')} {pct}%</Text>
                        <Text style={{ color: isOver ? '#EF4444' : '#10B981', fontSize: 12, fontWeight: 'bold' }}>
                          {isOver ? `${t('mm_over_budget_short')} ${mmCurrency} ${formatMMNumber(Math.abs(remaining))}` : `${t('mm_remaining_short')} ${mmCurrency} ${formatMMNumber(remaining)}`}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[styles.mmOverallBudgetBtn, tStyles.mmOverallBudgetBtn]}
                        onPress={() => {
                          setMmOverallBudgetInput(String(overallLimit));
                          setModalMMOverallBudget(true);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={t('mm_edit_overall_budget')}
                      >
                        <Text style={[styles.mmOverallBudgetBtnText, tStyles.mmOverallBudgetBtnText]}>{t('mm_edit_overall_budget')}</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })()}

                {/* Category Section Header */}
                <View style={[styles.mmSectionHeader, { marginTop: 16 }]}>
                  <Text style={[styles.mmSectionTitle, tStyles.mmSectionTitle]}>
                    {mmCatSectionTab === 'expense' ? t('mm_category_budget_heading') : t('mm_income_category_heading')}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <TouchableOpacity
                      style={[styles.mmAddSmallBtn, tStyles.mmAddSmallBtn, { backgroundColor: mmShowArchivedCats ? currentTheme.cardBorder : currentTheme.primary }]}
                      onPress={() => setMmShowArchivedCats(!mmShowArchivedCats)}
                      accessibilityRole="button"
                      accessibilityLabel={t('mm_access_archived_filter')}
                    >
                      <Text style={[styles.mmAddSmallBtnText, tStyles.mmAddSmallBtnText]}>
                        {mmShowArchivedCats ? t('mm_hide_archived') : t('mm_show_archived')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.mmAddSmallBtn, tStyles.mmAddSmallBtn]}
                      onPress={() => {
                        setMmNewCatName('');
                        setMmNewCatBudget('');
                        setMmNewCatType(mmCatSectionTab);
                        setModalMMAddCategory(true);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={t('mm_access_new_category')}
                    >
                      <Text style={[styles.mmAddSmallBtnText, tStyles.mmAddSmallBtnText]}>{t('mm_new_cat_btn')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Category Type Filter Pills (Expense / Income) */}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 12 }}>
                  <TouchableOpacity
                    style={[[styles.mmPrefPill, tStyles.mmPrefPill], mmCatSectionTab === 'expense' && [styles.mmPrefPillActive, tStyles.mmPrefPillActive]]}
                    onPress={() => setMmCatSectionTab('expense')}
                    accessibilityRole="button"
                    accessibilityLabel={t('mm_access_expense_categories')}
                  >
                    <Text style={[[styles.mmPrefPillText, tStyles.mmPrefPillText], mmCatSectionTab === 'expense' && [styles.mmPrefPillTextActive, tStyles.mmPrefPillTextActive]]}>
                      {t('mm_expense_budget')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[[styles.mmPrefPill, tStyles.mmPrefPill], mmCatSectionTab === 'income' && [styles.mmPrefPillActive, tStyles.mmPrefPillActive]]}
                    onPress={() => setMmCatSectionTab('income')}
                    accessibilityRole="button"
                    accessibilityLabel={t('mm_access_income_categories')}
                  >
                    <Text style={[[styles.mmPrefPillText, tStyles.mmPrefPillText], mmCatSectionTab === 'income' && [styles.mmPrefPillTextActive, tStyles.mmPrefPillTextActive]]}>
                      {t('mm_income_category')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {mmCatSectionTab === 'expense' ? (
                  (() => {
                    // Per-category budget progress is monthly; custom ranges are reserved for transaction analytics.
                    const categoryBudgets = moneyManagerService.calculateCategoryBudgets(moneyManagerState, 'this_month');
                    const expenseCats = (moneyManagerState.categories || []).filter((c) => c.type === 'expense' && (mmShowArchivedCats || !c.isArchived));

                    if (expenseCats.length === 0) {
                      return (
                        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                          <Text style={{ color: currentTheme.textSecondary, fontSize: 13 }}>{t('mm_empty_expense_categories')}</Text>
                        </View>
                      );
                    }

                    return expenseCats.map((cat) => {
                      const budgetInfo = categoryBudgets.find((b) => b.categoryId === cat.id || b.id === cat.id);
                      const spent = budgetInfo ? budgetInfo.spent : 0;
                      const limit = cat.budget || 0;
                      const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
                      const remaining = limit - spent;
                      const isOver = limit > 0 && spent > limit;

                      return (
                        <View key={cat.id} style={[styles.mmCatBudgetCard, tStyles.mmCatBudgetCard]}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={[styles.mmCatBudgetIconBox, { backgroundColor: (cat.color || '#3B82F6') + '22', borderColor: (cat.color || '#3B82F6') + '55' }]}>
                              <Text style={{ fontSize: 18 }}>{cat.icon || '🏷️'}</Text>
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={[styles.mmCatBudgetName, tStyles.mmCatBudgetName]}>{tMMSeed('category', cat.id, cat.name)}</Text>
                                {cat.isArchived && (
                                  <View style={[styles.mmArchivedBadge, tStyles.mmArchivedBadge]}>
                                    <Text style={[styles.mmArchivedBadgeText, tStyles.mmArchivedBadgeText]}>{t('mm_archived')}</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={[styles.mmCatBudgetAmounts, tStyles.mmCatBudgetAmounts]}>
                                {t('mm_spent')} {mmCurrency} {formatMMNumber(spent)} {limit > 0 ? `${t('mm_budget_limit_prefix')}${mmCurrency} ${formatMMNumber(limit)}` : t('mm_no_limit')}
                              </Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                              <TouchableOpacity
                                style={[styles.mmCatBudgetBtn, tStyles.mmCatBudgetBtn]}
                                onPress={() => {
                                  setMmBudgetCat(cat.id);
                                  setMmBudgetLimit(limit > 0 ? String(limit) : '');
                                  setModalMMSetBudget(true);
                                }}
                                accessibilityRole="button"
                                accessibilityLabel={t('mm_access_set_budget')}
                              >
                                <Text style={[styles.mmCatBudgetBtnText, tStyles.mmCatBudgetBtnText]}>{t('mm_budget_btn')}</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.mmCatBudgetBtn, tStyles.mmCatBudgetBtn]}
                                onPress={() => handleOpenEditMMCategory(cat)}
                                accessibilityRole="button"
                                accessibilityLabel={t('mm_access_edit_category')}
                              >
                                <Text style={[styles.mmCatBudgetBtnText, tStyles.mmCatBudgetBtnText]}>⚙️</Text>
                              </TouchableOpacity>
                            </View>
                          </View>

                          {limit > 0 && (
                            <View style={{ marginTop: 10 }}>
                              <View style={[styles.mmProgressBarBg, tStyles.mmProgressBarBg]}>
                                <View
                                  style={[
                                    styles.mmProgressBarFill,
                                    {
                                      width: `${pct}%`,
                                      backgroundColor: isOver ? '#EF4444' : pct > 80 ? '#F59E0B' : '#10B981',
                                    },
                                  ]}
                                />
                              </View>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                          <Text style={{ color: currentTheme.textMuted, fontSize: 11 }}>{t('mm_used')} {pct}%</Text>
                                <Text style={{ color: isOver ? '#EF4444' : '#10B981', fontSize: 11, fontWeight: 'bold' }}>
                                  {isOver ? `${t('mm_over_by_short')} ${mmCurrency} ${formatMMNumber(Math.abs(remaining))}` : `${t('mm_remaining_short')} ${mmCurrency} ${formatMMNumber(remaining)}`}
                                </Text>
                              </View>
                            </View>
                          )}
                        </View>
                      );
                    });
                  })()
                ) : (
                  (() => {
                    const incomeCats = (moneyManagerState.categories || []).filter((c) => c.type === 'income' && (mmShowArchivedCats || !c.isArchived));
                    const periodTxns = moneyManagerService.filterAndSortTransactions(moneyManagerState, { period: mmPeriod, customRange: mmCustomRange });

                    if (incomeCats.length === 0) {
                      return (
                        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                          <Text style={{ color: currentTheme.textSecondary, fontSize: 13 }}>{t('mm_empty_income_categories')}</Text>
                        </View>
                      );
                    }

                    return incomeCats.map((cat) => {
                      const earned = periodTxns
                        .filter((t) => t.type === 'income' && t.categoryId === cat.id)
                        .reduce((sum, t) => sum + (t.amount || 0), 0);

                      return (
                        <View key={cat.id} style={[styles.mmCatBudgetCard, tStyles.mmCatBudgetCard]}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={[styles.mmCatBudgetIconBox, { backgroundColor: (cat.color || '#10B981') + '22', borderColor: (cat.color || '#10B981') + '55' }]}>
                              <Text style={{ fontSize: 18 }}>{cat.icon || '💰'}</Text>
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={[styles.mmCatBudgetName, tStyles.mmCatBudgetName]}>{tMMSeed('category', cat.id, cat.name)}</Text>
                                {cat.isArchived && (
                                  <View style={[styles.mmArchivedBadge, tStyles.mmArchivedBadge]}>
                                    <Text style={[styles.mmArchivedBadgeText, tStyles.mmArchivedBadgeText]}>{t('mm_archived')}</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={[[styles.mmCatBudgetAmounts, tStyles.mmCatBudgetAmounts], { color: '#10B981' }]}>
                                {t('mm_received_prefix')}{getMmPeriodLabel()}): +{mmCurrency} {formatMMNumber(earned)}
                              </Text>
                            </View>
                            <TouchableOpacity
                            style={[styles.mmCatBudgetBtn, tStyles.mmCatBudgetBtn]}
                              onPress={() => handleOpenEditMMCategory(cat)}
                              accessibilityRole="button"
                              accessibilityLabel={t('mm_access_edit_category')}
                            >
                              <Text style={[styles.mmCatBudgetBtnText, tStyles.mmCatBudgetBtnText]}>{t('mm_edit')}</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    });
                  })()
                )}
              </View>
            )}

            {/* SUB-TAB 4: SAVINGS GOALS */}
            {mmActiveSubTab === 'goals' && (
              <View style={{ marginTop: 14 }}>
                <View style={styles.mmSectionHeader}>
                  <Text style={[styles.mmSectionTitle, tStyles.mmSectionTitle]}>{t('mm_savings_goals_title')}</Text>
                  <TouchableOpacity
                    style={[styles.mmAddSmallBtn, tStyles.mmAddSmallBtn]}
                    onPress={() => {
                      setMmGoalTitle('');
                      setMmGoalTarget('');
                      setMmGoalInitial('');
                      const firstActive = (moneyManagerState.accounts || []).find((account) => !account.isArchived);
                      if (firstActive) setMmGoalInitialAccount(firstActive.id);
                      setMmGoalDate('');
                      setMmGoalNote('');
                      setModalMMAddGoal(true);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('mm_create_goal_title')}
                  >
                    <Text style={[styles.mmAddSmallBtnText, tStyles.mmAddSmallBtnText]}>{t('mm_add_goal')}</Text>
                  </TouchableOpacity>
                </View>

                {(() => {
                  const goals = moneyManagerState.goals || [];
                  if (goals.length === 0) {
                    return (
                      <View style={[styles.mmEmptyBox, tStyles.mmEmptyBox]}>
                        <Text style={styles.mmEmptyIcon}>🎯</Text>
                        <Text style={[styles.mmEmptyText, tStyles.mmEmptyText]}>{t('mm_empty_goals')}</Text>
                        <TouchableOpacity
                          style={[styles.mmEmptyBtn, tStyles.mmEmptyBtn]}
                          onPress={() => {
                            setMmGoalTitle('');
                            setMmGoalTarget('');
                            setMmGoalInitial('');
                            const firstActive = (moneyManagerState.accounts || []).find((account) => !account.isArchived);
                            if (firstActive) setMmGoalInitialAccount(firstActive.id);
                            setMmGoalDate('');
                            setMmGoalNote('');
                            setModalMMAddGoal(true);
                          }}
                        >
                          <Text style={[styles.mmEmptyBtnText, tStyles.mmEmptyBtnText]}>{t('mm_first_goal_btn')}</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  }

                  return goals.map((g) => {
                    const target = g.targetAmount || 1;
                    const saved = g.savedAmount || 0;
                    const pct = Math.min(100, Math.round((saved / target) * 100));
                    const fundedAmount = moneyManagerService.getGoalFundedAmount(moneyManagerState, g.id);

                    return (
                      <View key={g.id} style={[[styles.mmGoalCard, tStyles.mmGoalCard], tStyles.mmCard]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={[styles.mmGoalIconBox, { backgroundColor: (g.color || '#10B981') + '22', borderColor: (g.color || '#10B981') + '55' }]}>
                            <Text style={{ fontSize: 22 }}>{g.icon || '🎯'}</Text>
                          </View>
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={[styles.mmGoalTitle, tStyles.mmGoalTitle]} numberOfLines={1}>
                              {tMMSeed('goal', g.id, g.title)}
                            </Text>
                            {g.targetDate ? <Text style={[styles.mmGoalTargetDate, tStyles.mmGoalTargetDate]}>{t('mm_target_prefix')} {g.targetDate}</Text> : null}
                            {g.note ? <Text style={[styles.mmGoalNote, tStyles.mmGoalNote]} numberOfLines={1}>{g.note}</Text> : null}
                          </View>
                        </View>

                        <View style={styles.mmGoalProgressRow}>
                          <Text style={[[styles.mmGoalSaved, tStyles.mmGoalSaved], tStyles.mmCardTitle]}>{t('mm_saved_prefix')} {formatMMNumber(saved)}</Text>
                          <Text style={[[styles.mmGoalTarget, tStyles.mmGoalTarget], tStyles.mmCardSub]}>{t('mm_target_amount_prefix')} {formatMMNumber(target)}</Text>
                        </View>

                        {/* Progress Bar */}
                        <View style={[styles.mmProgressBarBg, tStyles.mmProgressBarBg]}>
                          <View
                            style={[
                              styles.mmProgressBarFill,
                              {
                                width: `${pct}%`,
                                backgroundColor: pct >= 100 ? '#10B981' : g.color || '#3B82F6',
                              },
                            ]}
                          />
                        </View>
                        <Text style={{ color: currentTheme.textMuted, fontSize: 11, marginTop: 4 }}>
                          {t('mm_progress_prefix')} {pct}% {pct >= 100 ? t('mm_goal_achieved') : ''}
                        </Text>

                        {/* Goal Actions */}
                        <Text style={[styles.mmGoalNote, tStyles.mmGoalNote]}>
                          {t('mm_goal_wallet_funded')}: {formatMMCurrency(fundedAmount)}
                        </Text>
                        {saved !== fundedAmount ? (
                          <View style={{ marginTop: 4 }}>
                            <Text style={[styles.mmGoalNote, tStyles.mmGoalNote, { color: currentTheme.textSecondary }]}>
                              {t('mm_goal_unallocated_warning', {
                                amount: formatMMCurrency(Math.abs(saved - fundedAmount)),
                                funded: formatMMCurrency(fundedAmount),
                              })}
                            </Text>
                            <TouchableOpacity
                              onPress={() => handleDeleteMMGoal(g.id)}
                              accessibilityRole="button"
                              accessibilityLabel={t('mm_goal_review_balance')}
                              style={{ alignSelf: 'flex-start', marginTop: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: currentTheme.cardBorder }}
                            >
                              <Text style={{ color: currentTheme.textPrimary, fontWeight: '600', fontSize: 12 }}>{t('mm_goal_review_balance')}</Text>
                            </TouchableOpacity>
                          </View>
                        ) : null}

                        <View style={[styles.mmGoalActions, tStyles.mmGoalActions, { flexWrap: 'wrap', gap: 8 }]}>
                          <TouchableOpacity
                            style={[styles.mmGoalDepositBtn, tStyles.mmGoalDepositBtn]}
                            onPress={() => {
                              setMmDepositGoalId(g.id);
                              setMmDepositAmt('');
                              const firstActive = (moneyManagerState.accounts || []).find((a) => !a.isArchived);
                              if (firstActive) setMmDepositFromAcc(firstActive.id);
                              setModalMMDepositGoal(true);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={t('mm_access_deposit')}
                          >
                            <Text style={[styles.mmGoalDepositBtnText, tStyles.mmGoalDepositBtnText]}>{t('mm_deposit_btn')}</Text>
                          </TouchableOpacity>
                          {fundedAmount > 0 ? (
                            <TouchableOpacity
                              style={[styles.mmGoalDepositBtn, tStyles.mmGoalDepositBtn, { backgroundColor: '#2563EB' }]}
                              onPress={() => openMMWithdrawGoal(g.id)}
                              accessibilityRole="button"
                              accessibilityLabel={t('mm_access_withdraw_goal')}
                            >
                              <Text style={[styles.mmGoalDepositBtnText, tStyles.mmGoalDepositBtnText]}>{t('mm_goal_withdrawal_short')}</Text>
                            </TouchableOpacity>
                          ) : null}
                          <TouchableOpacity
                            style={[styles.mmGoalDeleteBtn, tStyles.mmGoalDeleteBtn]}
                            onPress={() => handleDeleteMMGoal(g.id)}
                            accessibilityRole="button"
                            accessibilityLabel={t('mm_access_delete_goal')}
                          >
                            <Text style={[styles.mmGoalDeleteBtnText, tStyles.mmGoalDeleteBtnText]}>{t('mm_delete')}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  });
                })()}
              </View>
            )}

            {/* SUB-TAB 5: ANALYTICS & INSIGHTS */}
            {mmActiveSubTab === 'analytics' && (
              <View style={{ marginTop: 14 }}>
                {(() => {
                  const periodMetrics = moneyManagerService.calculatePeriodMetrics(moneyManagerState, mmPeriod, mmCustomRange);
                  const distribution = moneyManagerService.calculateCategoryDistribution(moneyManagerState, mmPeriod, mmCustomRange);
                  const periodLabel = getMmPeriodLabel();

                  return (
                    <View>
                      {/* Period Overview Card */}
                      <View style={[styles.mmAnalyticsCard, tStyles.mmAnalyticsCard]}>
                        <Text style={[[styles.mmAnalyticsTitle, tStyles.mmAnalyticsTitle], tStyles.mmCardTitle]}>{t('mm_cash_flow_title')}{periodLabel})</Text>
                        <View style={[styles.mmStatRow, tStyles.mmStatRow]}>
                          <View style={styles.mmStatCol}>
                            <Text style={[styles.mmStatLabel, tStyles.mmStatLabel]}>{t('mm_total_income')}</Text>
                            <Text style={[styles.mmStatIncome, tStyles.mmStatIncome]}>+{mmCurrency} {formatMMNumber(periodMetrics.income)}</Text>
                          </View>
                          <View style={[styles.mmStatDivider, tStyles.mmStatDivider]} />
                          <View style={styles.mmStatCol}>
                            <Text style={[styles.mmStatLabel, tStyles.mmStatLabel]}>{t('mm_total_expense')}</Text>
                            <Text style={[styles.mmStatExpense, tStyles.mmStatExpense]}>-{mmCurrency} {formatMMNumber(periodMetrics.expense)}</Text>
                          </View>
                          <View style={[styles.mmStatDivider, tStyles.mmStatDivider]} />
                          <View style={styles.mmStatCol}>
                            <Text style={[styles.mmStatLabel, tStyles.mmStatLabel]}>{t('mm_net_savings')}</Text>
                            <Text style={[[styles.mmStatSavings, tStyles.mmStatSavings], periodMetrics.netSavings < 0 && { color: '#EF4444' }]}>
                              {periodMetrics.netSavings >= 0 ? '+' : ''}{mmCurrency} {formatMMNumber(periodMetrics.netSavings)}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Category Expense Distribution Card */}
                      <View style={[[styles.mmAnalyticsCard, tStyles.mmAnalyticsCard], { marginTop: 14 }]}>
                        <Text style={[[styles.mmAnalyticsTitle, tStyles.mmAnalyticsTitle], tStyles.mmCardTitle]}>{t('mm_category_distribution_title')}{periodLabel})</Text>
                        {distribution.length === 0 ? (
                          <Text style={{ color: currentTheme.textMuted, fontSize: 13, marginTop: 10, textAlign: 'center' }}>
                            {t('mm_empty_expenses_period')}
                          </Text>
                        ) : (
                          distribution.map((item) => (
                            <View key={item.categoryId} style={styles.mmDistributionRow}>
                              <View style={styles.mmDistributionLeft}>
                                <Text style={styles.mmDistributionIcon}>{item.icon}</Text>
                                <Text style={[styles.mmDistributionName, tStyles.mmDistributionName]} numberOfLines={1}>
                                  {tMMSeed('category', item.categoryId, item.categoryName)}
                                </Text>
                              </View>
                              <View style={styles.mmDistributionRight}>
                                <Text style={[styles.mmDistributionAmount, tStyles.mmDistributionAmount]}>{mmCurrency} {formatMMNumber(item.amount)}</Text>
                                <Text style={[styles.mmDistributionPct, tStyles.mmDistributionPct]}>({item.percentage}%)</Text>
                              </View>
                              <View style={[styles.mmProgressBarBg, tStyles.mmProgressBarBg]}>
                                <View
                                  style={[
                                    styles.mmProgressBarFill,
                                    {
                                      width: `${item.percentage}%`,
                                      backgroundColor: item.color || '#3B82F6',
                                    },
                                  ]}
                                />
                              </View>
                            </View>
                          ))
                        )}
                      </View>

                      {/* Smart Financial Tips Card */}
                      {moneyManagerState.preferences?.showTipsCard !== false && (
                      <View style={[[styles.mmTipsCard, tStyles.mmTipsCard], { marginTop: 14 }]}>
                        <Text style={[styles.mmTipsTitle, tStyles.mmTipsTitle]}>{t('mm_tips_title')}</Text>
                        <View style={styles.mmTipRow}>
                          <Text style={[styles.mmTipText, tStyles.mmTipText]}>
                            • <Text style={{ fontWeight: 'bold' }}>{t('mm_tip_503020_label')}</Text> {t('mm_tip_503020')}
                          </Text>
                        </View>
                        <View style={styles.mmTipRow}>
                          <Text style={[styles.mmTipText, tStyles.mmTipText]}>
                            • <Text style={{ fontWeight: 'bold' }}>{t('mm_tip_emergency_label')}</Text> {t('mm_tip_emergency')}
                          </Text>
                        </View>
                        <View style={styles.mmTipRow}>
                          <Text style={[styles.mmTipText, tStyles.mmTipText]}>
                            • <Text style={{ fontWeight: 'bold' }}>{t('mm_tip_budget_label')}</Text> {t('mm_tip_budget')}
                          </Text>
                        </View>
                      </View>
                      )}
                    </View>
                  );
                })()}
              </View>
            )}

          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* 1. MODAL: ADD TRANSACTION */}
      <Modal
        visible={modalMMAddTxn}
        transparent
        animationType="slide"
        onRequestClose={() => setModalMMAddTxn(false)}
      >
        <View style={styles.mmModalOverlay}>
          <View style={[styles.mmModalSheet, tStyles.mmModalSheet]}>
            <View style={[styles.mmModalHeader, tStyles.mmModalHeader]}>
              <Text style={[styles.mmModalTitle, tStyles.mmModalTitle]}>{t('mm_add_txn_title')}</Text>
              <TouchableOpacity style={[styles.mmModalCloseBtn, tStyles.mmModalCloseBtn]} onPress={() => setModalMMAddTxn(false)}>
                <Text style={{ color: currentTheme.textSecondary, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
              {/* Type Selector (Expense / Income / Transfer) */}
              <View style={{ flexDirection: 'row', marginBottom: 14 }}>
                <TouchableOpacity
                  style={[[styles.mmTypeBtn, tStyles.mmTypeBtn], mmNewType === 'expense' && [styles.mmTypeBtnExpense, tStyles.mmTypeBtnExpense]]}
                  onPress={() => { setMmNewType('expense'); setMmNewCat('cat_food'); }}
                >
                  <Text style={[[styles.mmTypeBtnText, tStyles.mmTypeBtnText], mmNewType === 'expense' && [styles.mmTypeBtnTextActive, tStyles.mmTypeBtnTextActive]]}>{t('mm_type_expense')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[[styles.mmTypeBtn, tStyles.mmTypeBtn], mmNewType === 'income' && [styles.mmTypeBtnIncome, tStyles.mmTypeBtnIncome]]}
                  onPress={() => { setMmNewType('income'); setMmNewCat('cat_salary'); }}
                >
                  <Text style={[[styles.mmTypeBtnText, tStyles.mmTypeBtnText], mmNewType === 'income' && [styles.mmTypeBtnTextActive, tStyles.mmTypeBtnTextActive]]}>{t('mm_type_income')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[[styles.mmTypeBtn, tStyles.mmTypeBtn], mmNewType === 'transfer' && [styles.mmTypeBtnTransfer, tStyles.mmTypeBtnTransfer]]}
                  onPress={() => setMmNewType('transfer')}
                >
                  <Text style={[[styles.mmTypeBtnText, tStyles.mmTypeBtnText], mmNewType === 'transfer' && [styles.mmTypeBtnTextActive, tStyles.mmTypeBtnTextActive]]}>{t('mm_type_transfer')}</Text>
                </TouchableOpacity>
              </View>

              {/* Amount */}
              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_amount_label')}</Text>
              <TextInput
                style={[styles.mmInput, tStyles.mmInput]}
                placeholder="0.00"
                placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                keyboardType="numeric"
                value={mmNewAmount}
                onChangeText={setMmNewAmount}
              />

              {mmNewType !== 'transfer' ? (
                <>
                  {/* Category Chips with + New Category Button */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_choose_category')}</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setMmNewCatName('');
                        setMmNewCatBudget('');
                        setMmNewCatType(mmNewType);
                        setModalMMAddCategory(true);
                      }}
                    >
                      <Text style={{ color: '#3B82F6', fontSize: 12, fontWeight: 'bold' }}>{t('mm_add_category_short')}</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    {(moneyManagerState.categories || []).filter((c) => c.type === mmNewType && !c.isArchived).map((cat) => {
                      const sel = mmNewCat === cat.id;
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          style={[[styles.mmCatChip, tStyles.mmCatChip], sel && [styles.mmCatChipActive, tStyles.mmCatChipActive]]}
                          onPress={() => setMmNewCat(cat.id)}
                        >
                          <Text style={{ fontSize: 16, marginRight: 6 }}>{cat.icon}</Text>
                          <Text style={[[styles.mmCatChipText, tStyles.mmCatChipText], sel && [styles.mmCatChipTextActive, tStyles.mmCatChipTextActive]]}>{tMMSeed('category', cat.id, cat.name)}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* Account / Wallet Chips */}
                  <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_wallet_or_account')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    {(moneyManagerState.accounts || []).filter((a) => !a.isArchived).map((acc) => {
                      const sel = mmNewAcc === acc.id;
                      return (
                        <TouchableOpacity
                          key={acc.id}
                          style={[[styles.mmCatChip, tStyles.mmCatChip], sel && [styles.mmCatChipActive, tStyles.mmCatChipActive]]}
                          onPress={() => setMmNewAcc(acc.id)}
                        >
                          <Text style={{ fontSize: 16, marginRight: 6 }}>{acc.icon}</Text>
                          <Text style={[[styles.mmCatChipText, tStyles.mmCatChipText], sel && [styles.mmCatChipTextActive, tStyles.mmCatChipTextActive]]}>{acc.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              ) : (
                <>
                  {/* Source Wallet */}
                  <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_from_account')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    {(moneyManagerState.accounts || []).filter((a) => !a.isArchived).map((acc) => {
                      const sel = mmFromAcc === acc.id;
                      return (
                        <TouchableOpacity
                          key={acc.id}
                          style={[[styles.mmCatChip, tStyles.mmCatChip], sel && [styles.mmCatChipActive, tStyles.mmCatChipActive]]}
                          onPress={() => setMmFromAcc(acc.id)}
                        >
                          <Text style={{ fontSize: 16, marginRight: 6 }}>{acc.icon}</Text>
                          <Text style={[[styles.mmCatChipText, tStyles.mmCatChipText], sel && [styles.mmCatChipTextActive, tStyles.mmCatChipTextActive]]}>{acc.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* Destination Wallet */}
                  <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_to_account')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    {(moneyManagerState.accounts || []).filter((a) => !a.isArchived).map((acc) => {
                      const sel = mmToAcc === acc.id;
                      return (
                        <TouchableOpacity
                          key={acc.id}
                          style={[[styles.mmCatChip, tStyles.mmCatChip], sel && [styles.mmCatChipActive, tStyles.mmCatChipActive]]}
                          onPress={() => setMmToAcc(acc.id)}
                        >
                          <Text style={{ fontSize: 16, marginRight: 6 }}>{acc.icon}</Text>
                          <Text style={[[styles.mmCatChipText, tStyles.mmCatChipText], sel && [styles.mmCatChipTextActive, tStyles.mmCatChipTextActive]]}>{acc.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              )}

              {/* Payee / Merchant */}
              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_payee_optional')}</Text>
              <TextInput
                style={[styles.mmInput, tStyles.mmInput]}
                placeholder={t('mm_placeholder_payee_example')}
                placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                value={mmNewPayee}
                onChangeText={setMmNewPayee}
              />

              {/* Note */}
              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_note_description')}</Text>
              <TextInput
                style={[styles.mmInput, tStyles.mmInput]}
                placeholder={t('mm_placeholder_txn_note')}
                placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                value={mmNewNote}
                onChangeText={setMmNewNote}
              />

              <TouchableOpacity style={styles.mmSubmitBtn} onPress={handleSaveMMTxn}>
                <Text style={styles.mmSubmitBtnText}>{t('mm_save_transaction')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 2. MODAL: EDIT TRANSACTION */}
      <Modal
        visible={modalMMEditTxn}
        transparent
        animationType="slide"
        onRequestClose={() => setModalMMEditTxn(false)}
      >
        <View style={styles.mmModalOverlay}>
          <View style={[styles.mmModalSheet, tStyles.mmModalSheet]}>
            <View style={[styles.mmModalHeader, tStyles.mmModalHeader]}>
              <Text style={[styles.mmModalTitle, tStyles.mmModalTitle]}>{t('mm_edit_transaction_title')}</Text>
              <TouchableOpacity style={[styles.mmModalCloseBtn, tStyles.mmModalCloseBtn]} onPress={() => setModalMMEditTxn(false)}>
                <Text style={{ color: currentTheme.textSecondary, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_amount_label')}</Text>
              <TextInput
                style={[styles.mmInput, tStyles.mmInput]}
                placeholder="0.00"
                placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                keyboardType="numeric"
                value={mmEditAmount}
                onChangeText={setMmEditAmount}
              />

              {mmEditType !== 'transfer' ? (
                <>
                  <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_category')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    {(moneyManagerState.categories || []).filter((c) => c.type === mmEditType && (!c.isArchived || c.id === mmEditCat)).map((cat) => {
                      const sel = mmEditCat === cat.id;
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          style={[[styles.mmCatChip, tStyles.mmCatChip], sel && [styles.mmCatChipActive, tStyles.mmCatChipActive]]}
                          onPress={() => setMmEditCat(cat.id)}
                        >
                          <Text style={{ fontSize: 16, marginRight: 6 }}>{cat.icon}</Text>
                          <Text style={[[styles.mmCatChipText, tStyles.mmCatChipText], sel && [styles.mmCatChipTextActive, tStyles.mmCatChipTextActive]]}>{tMMSeed('category', cat.id, cat.name)}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_account')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    {(moneyManagerState.accounts || []).filter((a) => !a.isArchived).map((acc) => {
                      const sel = mmEditAcc === acc.id;
                      return (
                        <TouchableOpacity
                          key={acc.id}
                          style={[[styles.mmCatChip, tStyles.mmCatChip], sel && [styles.mmCatChipActive, tStyles.mmCatChipActive]]}
                          onPress={() => setMmEditAcc(acc.id)}
                        >
                          <Text style={{ fontSize: 16, marginRight: 6 }}>{acc.icon}</Text>
                          <Text style={[[styles.mmCatChipText, tStyles.mmCatChipText], sel && [styles.mmCatChipTextActive, tStyles.mmCatChipTextActive]]}>{acc.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              ) : null}

              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_payee')}</Text>
              <TextInput
                style={[styles.mmInput, tStyles.mmInput]}
                placeholder={t('mm_placeholder_payee_short')}
                placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                value={mmEditPayee}
                onChangeText={setMmEditPayee}
              />

              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_note_description')}</Text>
              <TextInput
                style={[styles.mmInput, tStyles.mmInput]}
                placeholder={t('mm_placeholder_txn_note')}
                placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                value={mmEditNote}
                onChangeText={setMmEditNote}
              />

              <TouchableOpacity style={styles.mmSubmitBtn} onPress={handleUpdateMMTxn}>
                <Text style={styles.mmSubmitBtnText}>{t('mm_save_changes')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 3. MODAL: ADD ACCOUNT */}
      <Modal
        visible={modalMMAddAccount}
        transparent
        animationType="slide"
        onRequestClose={() => setModalMMAddAccount(false)}
      >
        <View style={styles.mmModalOverlay}>
          <View style={[styles.mmModalSheet, tStyles.mmModalSheet]}>
            <View style={[styles.mmModalHeader, tStyles.mmModalHeader]}>
              <Text style={[styles.mmModalTitle, tStyles.mmModalTitle]}>{t('mm_new_wallet_title')}</Text>
              <TouchableOpacity style={[styles.mmModalCloseBtn, tStyles.mmModalCloseBtn]} onPress={() => setModalMMAddAccount(false)}>
                <Text style={{ color: currentTheme.textSecondary, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_account_name')}</Text>
              <TextInput
                style={[styles.mmInput, tStyles.mmInput]}
                placeholder={t('mm_placeholder_account_example')}
                placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                value={mmNewAccName}
                onChangeText={setMmNewAccName}
              />

              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_account_type')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
                {[
                  { id: 'cash', label: t('mm_account_cash_short') },
                  { id: 'bank', label: t('mm_account_bank_short') },
                  { id: 'mfs', label: t('mm_account_mfs_short') },
                  { id: 'other', label: t('mm_account_other_short') },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[[styles.mmFilterChip, tStyles.mmFilterChip], mmNewAccType === item.id && [styles.mmFilterChipActive, tStyles.mmFilterChipActive], { marginRight: 8, marginBottom: 8 }]}
                    onPress={() => setMmNewAccType(item.id)}
                  >
                    <Text style={[[styles.mmFilterChipText, tStyles.mmFilterChipText], mmNewAccType === item.id && [styles.mmFilterChipTextActive, tStyles.mmFilterChipTextActive]]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_initial_balance')}</Text>
              <TextInput
                style={[styles.mmInput, tStyles.mmInput]}
                placeholder="0.00"
                placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                keyboardType="numeric"
                value={mmNewAccBal}
                onChangeText={setMmNewAccBal}
              />

              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_choose_icon')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
                {['💵', '🏦', '📱', '💳', '💰', '🪙', '💼', '🏷️'].map((ic) => (
                  <TouchableOpacity
                    key={ic}
                    style={[[styles.mmIconChip, tStyles.mmIconChip], mmNewAccIcon === ic && [styles.mmIconChipActive, tStyles.mmIconChipActive]]}
                    onPress={() => setMmNewAccIcon(ic)}
                  >
                    <Text style={{ fontSize: 20 }}>{ic}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.mmSubmitBtn} onPress={handleSaveMMAccount}>
                <Text style={styles.mmSubmitBtnText}>{t('mm_add_account')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 4. MODAL: SET CATEGORY BUDGET */}
      <Modal
        visible={modalMMSetBudget}
        transparent
        animationType="slide"
        onRequestClose={() => setModalMMSetBudget(false)}
      >
        <View style={styles.mmModalOverlay}>
          <View style={[styles.mmModalSheet, tStyles.mmModalSheet]}>
            <View style={[styles.mmModalHeader, tStyles.mmModalHeader]}>
              <Text style={[styles.mmModalTitle, tStyles.mmModalTitle]}>{t('mm_set_category_budget_title')}</Text>
              <TouchableOpacity style={[styles.mmModalCloseBtn, tStyles.mmModalCloseBtn]} onPress={() => setModalMMSetBudget(false)}>
                <Text style={{ color: currentTheme.textSecondary, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_category')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {(moneyManagerState.categories || []).filter((c) => c.type === 'expense').map((cat) => {
                  const sel = mmBudgetCat === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[[styles.mmCatChip, tStyles.mmCatChip], sel && [styles.mmCatChipActive, tStyles.mmCatChipActive]]}
                      onPress={() => setMmBudgetCat(cat.id)}
                    >
                      <Text style={{ fontSize: 16, marginRight: 6 }}>{cat.icon}</Text>
                      <Text style={[[styles.mmCatChipText, tStyles.mmCatChipText], sel && [styles.mmCatChipTextActive, tStyles.mmCatChipTextActive]]}>{tMMSeed('category', cat.id, cat.name)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_monthly_budget_zero_hint')}</Text>
              <TextInput
                style={[styles.mmInput, tStyles.mmInput]}
                placeholder={t('mm_placeholder_5000')}
                placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                keyboardType="numeric"
                value={mmBudgetLimit}
                onChangeText={setMmBudgetLimit}
              />

              <TouchableOpacity style={styles.mmSubmitBtn} onPress={handleSaveMMBudget}>
                <Text style={styles.mmSubmitBtnText}>{t('mm_save_budget')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 5. MODAL: OVERALL MONTHLY BUDGET */}
      <Modal
        visible={modalMMOverallBudget}
        transparent
        animationType="slide"
        onRequestClose={() => setModalMMOverallBudget(false)}
      >
        <View style={styles.mmModalOverlay}>
          <View style={[styles.mmModalSheet, tStyles.mmModalSheet]}>
            <View style={[styles.mmModalHeader, tStyles.mmModalHeader]}>
              <Text style={[styles.mmModalTitle, tStyles.mmModalTitle]}>{t('mm_overall_budget_title')}</Text>
              <TouchableOpacity style={[styles.mmModalCloseBtn, tStyles.mmModalCloseBtn]} onPress={() => setModalMMOverallBudget(false)}>
                <Text style={{ color: currentTheme.textSecondary, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
              <Text style={{ color: currentTheme.textSecondary, fontSize: 13, marginBottom: 12 }}>
                {t('mm_overall_budget_explainer')}
              </Text>

              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_monthly_expense_limit')}</Text>
              <TextInput
                style={[styles.mmInput, tStyles.mmInput]}
                placeholder={t('mm_placeholder_40000')}
                placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                keyboardType="numeric"
                value={mmOverallBudgetInput}
                onChangeText={setMmOverallBudgetInput}
              />

              <TouchableOpacity style={styles.mmSubmitBtn} onPress={handleSaveMMOverallBudget}>
                <Text style={styles.mmSubmitBtnText}>{t('mm_save_monthly_budget')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 6. MODAL: ADD CUSTOM CATEGORY */}
      <Modal
        visible={modalMMAddCategory}
        transparent
        animationType="slide"
        onRequestClose={() => setModalMMAddCategory(false)}
      >
        <View style={styles.mmModalOverlay}>
          <View style={[styles.mmModalSheet, tStyles.mmModalSheet]}>
            <View style={[styles.mmModalHeader, tStyles.mmModalHeader]}>
              <Text style={[styles.mmModalTitle, tStyles.mmModalTitle]}>{t('mm_create_category_title')}</Text>
              <TouchableOpacity style={[styles.mmModalCloseBtn, tStyles.mmModalCloseBtn]} onPress={() => setModalMMAddCategory(false)}>
                <Text style={{ color: currentTheme.textSecondary, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_category_name')}</Text>
              <TextInput
                style={[styles.mmInput, tStyles.mmInput]}
                placeholder={t('mm_placeholder_category_example')}
                placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                value={mmNewCatName}
                onChangeText={setMmNewCatName}
              />

              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_category_type')}</Text>
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <TouchableOpacity
                  style={[[styles.mmTypeBtn, tStyles.mmTypeBtn], mmNewCatType === 'expense' && [styles.mmTypeBtnExpense, tStyles.mmTypeBtnExpense]]}
                  onPress={() => setMmNewCatType('expense')}
                >
                  <Text style={[[styles.mmTypeBtnText, tStyles.mmTypeBtnText], mmNewCatType === 'expense' && [styles.mmTypeBtnTextActive, tStyles.mmTypeBtnTextActive]]}>{t('mm_type_expense')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[[styles.mmTypeBtn, tStyles.mmTypeBtn], mmNewCatType === 'income' && [styles.mmTypeBtnIncome, tStyles.mmTypeBtnIncome]]}
                  onPress={() => setMmNewCatType('income')}
                >
                  <Text style={[[styles.mmTypeBtnText, tStyles.mmTypeBtnText], mmNewCatType === 'income' && [styles.mmTypeBtnTextActive, tStyles.mmTypeBtnTextActive]]}>{t('mm_type_income')}</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_choose_icon')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
                {['🛒', '🍜', '🚗', '🏥', '📚', '🎬', '👕', '💡', '✈️', '🏷️', '🎁', '💰'].map((ic) => (
                  <TouchableOpacity
                    key={ic}
                    style={[[styles.mmIconChip, tStyles.mmIconChip], mmNewCatIcon === ic && [styles.mmIconChipActive, tStyles.mmIconChipActive]]}
                    onPress={() => setMmNewCatIcon(ic)}
                  >
                    <Text style={{ fontSize: 20 }}>{ic}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_choose_color')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
                {['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#64748B'].map((col) => (
                  <TouchableOpacity
                    key={col}
                    style={[styles.mmColorChip, { backgroundColor: col }, mmNewCatColor === col && styles.mmColorChipActive]}
                    onPress={() => setMmNewCatColor(col)}
                  />
                ))}
              </View>

              {mmNewCatType === 'expense' && (
                <>
                  <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_optional_monthly_budget')}</Text>
                  <TextInput
                    style={[styles.mmInput, tStyles.mmInput]}
                    placeholder={t('mm_placeholder_3000')}
                    placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                    keyboardType="numeric"
                    value={mmNewCatBudget}
                    onChangeText={setMmNewCatBudget}
                  />
                </>
              )}

              <TouchableOpacity style={styles.mmSubmitBtn} onPress={handleSaveMMCategory}>
                <Text style={styles.mmSubmitBtnText}>{t('mm_save_category')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 7. MODAL: ADD SAVINGS GOAL */}
      <Modal
        visible={modalMMAddGoal}
        transparent
        animationType="slide"
        onRequestClose={() => setModalMMAddGoal(false)}
      >
        <View style={styles.mmModalOverlay}>
          <View style={[styles.mmModalSheet, tStyles.mmModalSheet]}>
            <View style={[styles.mmModalHeader, tStyles.mmModalHeader]}>
              <Text style={[styles.mmModalTitle, tStyles.mmModalTitle]}>{t('mm_create_goal_title')}</Text>
              <TouchableOpacity style={[styles.mmModalCloseBtn, tStyles.mmModalCloseBtn]} onPress={() => setModalMMAddGoal(false)}>
                <Text style={{ color: currentTheme.textSecondary, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_goal_title')}</Text>
              <TextInput
                style={[styles.mmInput, tStyles.mmInput]}
                placeholder={t('mm_placeholder_goal_examples')}
                placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                value={mmGoalTitle}
                onChangeText={setMmGoalTitle}
              />

              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_goal_amount')}</Text>
              <TextInput
                style={[styles.mmInput, tStyles.mmInput]}
                placeholder={t('mm_placeholder_75000')}
                placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                keyboardType="numeric"
                value={mmGoalTarget}
                onChangeText={setMmGoalTarget}
              />

              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_initial_savings')}</Text>
              <TextInput
                style={[styles.mmInput, tStyles.mmInput]}
                placeholder="0.00"
                placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                keyboardType="numeric"
                value={mmGoalInitial}
                onChangeText={setMmGoalInitial}
              />
              {Number(moneyManagerService.toEnglishDigits(mmGoalInitial)) > 0 ? (
                <>
                  <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_initial_savings_wallet_question')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    {(moneyManagerState.accounts || []).filter(account => !account.isArchived).map(account => {
                      const selected = mmGoalInitialAccount === account.id;
                      return (
                        <TouchableOpacity
                          key={account.id}
                          style={[[styles.mmCatChip, tStyles.mmCatChip], selected && [styles.mmCatChipActive, tStyles.mmCatChipActive]]}
                          onPress={() => setMmGoalInitialAccount(account.id)}
                        >
                          <Text style={{ fontSize: 16, marginRight: 6 }}>{account.icon}</Text>
                          <Text style={[[styles.mmCatChipText, tStyles.mmCatChipText], selected && [styles.mmCatChipTextActive, tStyles.mmCatChipTextActive]]}>
                            {tMMSeed('account', account.id, account.name)} ({formatMMCurrency(account.balance || 0)})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              ) : null}

              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_optional_target_date')}</Text>
              <TextInput
                style={[styles.mmInput, tStyles.mmInput]}
                placeholder={t('mm_placeholder_date_example')}
                placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                value={mmGoalDate}
                onChangeText={setMmGoalDate}
              />

              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_choose_icon')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
                {['🎯', '🛡️', '🌙', '🏠', '🚗', '💍', '🎓', '💻'].map((ic) => (
                  <TouchableOpacity
                    key={ic}
                    style={[[styles.mmIconChip, tStyles.mmIconChip], mmGoalIcon === ic && [styles.mmIconChipActive, tStyles.mmIconChipActive]]}
                    onPress={() => setMmGoalIcon(ic)}
                  >
                    <Text style={{ fontSize: 20 }}>{ic}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_short_note')}</Text>
              <TextInput
                style={[styles.mmInput, tStyles.mmInput]}
                placeholder={t('mm_placeholder_goal_note')}
                placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                value={mmGoalNote}
                onChangeText={setMmGoalNote}
              />

              <TouchableOpacity style={styles.mmSubmitBtn} onPress={handleSaveMMGoal}>
                <Text style={styles.mmSubmitBtnText}>{t('mm_save_goal')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 8. MODAL: DEPOSIT TO GOAL */}
      <Modal
        visible={modalMMDepositGoal}
        transparent
        animationType="slide"
        onRequestClose={() => setModalMMDepositGoal(false)}
      >
        <View style={styles.mmModalOverlay}>
          <View style={[styles.mmModalSheet, tStyles.mmModalSheet]}>
            <View style={[styles.mmModalHeader, tStyles.mmModalHeader]}>
              <Text style={[styles.mmModalTitle, tStyles.mmModalTitle]}>{t('mm_deposit_to_goal_title')}</Text>
              <TouchableOpacity style={[styles.mmModalCloseBtn, tStyles.mmModalCloseBtn]} onPress={() => setModalMMDepositGoal(false)}>
                <Text style={{ color: currentTheme.textSecondary, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
              {(() => {
                const targetGoal = (moneyManagerState.goals || []).find((g) => g.id === mmDepositGoalId);
                return (
                  <View style={[[styles.mmGoalCard, tStyles.mmCard], { marginBottom: 12, padding: 12 }]}>
                    <Text style={[styles.mmGoalTitle, tStyles.mmCardTitle, { fontWeight: 'bold', fontSize: 15 }]}>
                      {targetGoal ? targetGoal.title : t('mm_goal_fallback')}
                    </Text>
                    <Text style={[styles.mmGoalTarget, tStyles.mmCardSub, { fontSize: 13, marginTop: 4 }]}>
                      {t('mm_current_saved').replace(/৳/g, '').trim()} {formatMMCurrency(targetGoal ? targetGoal.savedAmount || 0 : 0)} {t('mm_target_label').replace(/৳/g, '').trim()} {formatMMCurrency(targetGoal ? targetGoal.targetAmount || 0 : 0)}
                    </Text>
                  </View>
                );
              })()}

              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_deposit_amount')}</Text>
              <TextInput
                style={[styles.mmInput, tStyles.mmInput]}
                placeholder={t('mm_placeholder_5000')}
                placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                keyboardType="numeric"
                value={mmDepositAmt}
                onChangeText={setMmDepositAmt}
              />

              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_deposit_wallet_question')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {(moneyManagerState.accounts || []).filter((a) => !a.isArchived).map((acc) => {
                  const sel = mmDepositFromAcc === acc.id;
                  return (
                    <TouchableOpacity
                      key={acc.id}
                      style={[[styles.mmCatChip, tStyles.mmCatChip], sel && [styles.mmCatChipActive, tStyles.mmCatChipActive]]}
                      onPress={() => setMmDepositFromAcc(acc.id)}
                    >
                      <Text style={{ fontSize: 16, marginRight: 6 }}>{acc.icon}</Text>
                      <Text style={[[styles.mmCatChipText, tStyles.mmCatChipText], sel && [styles.mmCatChipTextActive, tStyles.mmCatChipTextActive]]}>
                        {acc.name} ({formatMMCurrency(acc.balance || 0)})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TouchableOpacity style={styles.mmSubmitBtn} onPress={handleDepositMMGoal}>
                <Text style={styles.mmSubmitBtnText}>{t('mm_confirm_deposit')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 9. MODAL: WITHDRAW OR REFUND SAVINGS GOAL */}
      <Modal
        visible={modalMMWithdrawGoal}
        transparent
        animationType="slide"
        onRequestClose={() => setModalMMWithdrawGoal(false)}
      >
        <View style={styles.mmModalOverlay}>
          <View style={[styles.mmModalSheet, tStyles.mmModalSheet]}>
            <View style={[styles.mmModalHeader, tStyles.mmModalHeader]}>
              <Text style={[styles.mmModalTitle, tStyles.mmModalTitle]}>
                {t(mmWithdrawMode === 'refund-and-delete' ? 'mm_refund_goal_title' : 'mm_withdraw_to_goal_title')}
              </Text>
              <TouchableOpacity
                style={[styles.mmModalCloseBtn, tStyles.mmModalCloseBtn]}
                onPress={() => setModalMMWithdrawGoal(false)}
                accessibilityRole="button"
                accessibilityLabel={t('mm_close')}
              >
                <Text style={{ color: currentTheme.textSecondary, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
              {(() => {
                const targetGoal = (moneyManagerState.goals || []).find(goal => goal.id === mmWithdrawGoalId);
                const fundedAmount = moneyManagerService.getGoalFundedAmount(moneyManagerState, mmWithdrawGoalId);
                const untrackedAmount = targetGoal ? Math.abs(Number(targetGoal.savedAmount || 0) - fundedAmount) : 0;
                return (
                  <View style={[[styles.mmGoalCard, tStyles.mmGoalCard], { marginBottom: 12, padding: 12 }]}>
                    <Text style={[styles.mmGoalTitle, tStyles.mmGoalTitle]} numberOfLines={2}>
                      {targetGoal ? targetGoal.title : t('mm_goal_fallback')}
                    </Text>
                    <Text style={[styles.mmGoalNote, tStyles.mmGoalNote, { marginTop: 6 }]}>
                      {t('mm_goal_wallet_funded')}: {formatMMCurrency(fundedAmount)}
                    </Text>
                    {untrackedAmount > 0.005 ? (
                      <Text style={[styles.mmGoalNote, tStyles.mmGoalNote, { color: currentTheme.textSecondary, marginTop: 6 }]}>
                        {t('mm_goal_unallocated_warning', {
                          amount: formatMMCurrency(untrackedAmount),
                          funded: formatMMCurrency(fundedAmount),
                        })}
                      </Text>
                    ) : null}
                    {mmWithdrawMode === 'refund-and-delete' ? (
                      <Text style={[styles.mmGoalNote, tStyles.mmGoalNote, { marginTop: 6 }]}>
                        {t('mm_refund_goal_explainer', { amount: formatMMCurrency(fundedAmount) })}
                      </Text>
                    ) : null}
                  </View>
                );
              })()}

              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{translateMMCurrencyLabel('mm_withdraw_amount')}</Text>
              <TextInput
                style={[styles.mmInput, tStyles.mmInput]}
                placeholder={t('mm_placeholder_5000')}
                placeholderTextColor={currentTheme.textMuted}
                keyboardType="numeric"
                value={mmWithdrawAmt}
                onChangeText={setMmWithdrawAmt}
                editable={mmWithdrawMode !== 'refund-and-delete'}
                accessibilityLabel={t('mm_withdraw_amount')}
              />

              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_withdraw_wallet_question')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {(moneyManagerState.accounts || []).filter(account => !account.isArchived).map(account => {
                  const selected = mmWithdrawToAcc === account.id;
                  return (
                    <TouchableOpacity
                      key={account.id}
                      style={[[styles.mmCatChip, tStyles.mmCatChip], selected && [styles.mmCatChipActive, tStyles.mmCatChipActive]]}
                      onPress={() => setMmWithdrawToAcc(account.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`${tMMSeed('account', account.id, account.name)}, ${formatMMCurrency(account.balance || 0)}`}
                    >
                      <Text style={{ fontSize: 16, marginRight: 6 }}>{account.icon}</Text>
                      <Text style={[[styles.mmCatChipText, tStyles.mmCatChipText], selected && [styles.mmCatChipTextActive, tStyles.mmCatChipTextActive]]}>
                        {tMMSeed('account', account.id, account.name)} ({formatMMCurrency(account.balance || 0)})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {(moneyManagerState.accounts || []).every(account => account.isArchived) ? (
                <Text style={[styles.mmGoalNote, tStyles.mmGoalNote, { marginBottom: 12 }]}>{t('mm_no_active_wallets')}</Text>
              ) : null}

              <TouchableOpacity
                style={[styles.mmSubmitBtn, tStyles.mmSubmitBtn]}
                onPress={handleWithdrawMMGoal}
                accessibilityRole="button"
                accessibilityLabel={t(mmWithdrawMode === 'refund-and-delete' ? 'mm_refund_and_delete_goal' : 'mm_confirm_withdraw')}
              >
                <Text style={[styles.mmSubmitBtnText, tStyles.mmSubmitBtnText]}>
                  {t(mmWithdrawMode === 'refund-and-delete' ? 'mm_refund_and_delete_goal' : 'mm_confirm_withdraw')}
                </Text>
              </TouchableOpacity>
              {mmWithdrawMode === 'refund-and-delete' ? (
                <TouchableOpacity
                  style={[styles.mmResetBtn, tStyles.mmResetBtn, { marginTop: 10 }]}
                  onPress={() => setModalMMWithdrawGoal(false)}
                  accessibilityRole="button"
                  accessibilityLabel={t('mm_alert_cancel')}
                >
                  <Text style={[styles.mmResetBtnText, tStyles.mmResetBtnText]}>{t('mm_alert_cancel')}</Text>
                </TouchableOpacity>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 9. MODAL: QUICK TRANSFER */}
      <Modal
        visible={modalMMTransfer}
        transparent
        animationType="slide"
        onRequestClose={() => setModalMMTransfer(false)}
      >
        <View style={styles.mmModalOverlay}>
          <View style={[styles.mmModalSheet, tStyles.mmModalSheet]}>
            <View style={[styles.mmModalHeader, tStyles.mmModalHeader]}>
              <Text style={[styles.mmModalTitle, tStyles.mmModalTitle]}>{t('mm_transfer_funds_title')}</Text>
              <TouchableOpacity style={[styles.mmModalCloseBtn, tStyles.mmModalCloseBtn]} onPress={() => setModalMMTransfer(false)}>
                <Text style={{ color: currentTheme.textSecondary, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_from_account')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {(moneyManagerState.accounts || []).filter((a) => !a.isArchived).map((acc) => {
                  const sel = mmTransferFrom === acc.id;
                  return (
                    <TouchableOpacity
                      key={acc.id}
                      style={[[styles.mmCatChip, tStyles.mmCatChip], sel && [styles.mmCatChipActive, tStyles.mmCatChipActive]]}
                      onPress={() => setMmTransferFrom(acc.id)}
                    >
                      <Text style={{ fontSize: 16, marginRight: 6 }}>{acc.icon}</Text>
                      <Text style={[[styles.mmCatChipText, tStyles.mmCatChipText], sel && [styles.mmCatChipTextActive, tStyles.mmCatChipTextActive]]}>{acc.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_to_account')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {(moneyManagerState.accounts || []).filter((a) => !a.isArchived).map((acc) => {
                  const sel = mmTransferTo === acc.id;
                  return (
                    <TouchableOpacity
                      key={acc.id}
                      style={[[styles.mmCatChip, tStyles.mmCatChip], sel && [styles.mmCatChipActive, tStyles.mmCatChipActive]]}
                      onPress={() => setMmTransferTo(acc.id)}
                    >
                      <Text style={{ fontSize: 16, marginRight: 6 }}>{acc.icon}</Text>
                      <Text style={[[styles.mmCatChipText, tStyles.mmCatChipText], sel && [styles.mmCatChipTextActive, tStyles.mmCatChipTextActive]]}>{acc.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_transfer_amount')}</Text>
              <TextInput
                style={[styles.mmInput, tStyles.mmInput]}
                placeholder="0.00"
                placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                keyboardType="numeric"
                value={mmTransferAmt}
                onChangeText={setMmTransferAmt}
              />

              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_note_purpose')}</Text>
              <TextInput
                style={[styles.mmInput, tStyles.mmInput]}
                placeholder={t('mm_placeholder_atm_transfer')}
                placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                value={mmTransferNote}
                onChangeText={setMmTransferNote}
              />

              <TouchableOpacity style={styles.mmSubmitBtn} onPress={handleMMTransfer}>
                <Text style={styles.mmSubmitBtnText}>{t('mm_transfer_money')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 10. MODAL: USER PREFERENCES / SETTINGS */}
      <Modal
        visible={modalMMPreferences}
        transparent
        animationType="slide"
        onRequestClose={() => setModalMMPreferences(false)}
      >
        <View style={styles.mmModalOverlay}>
          <View style={[styles.mmModalSheet, tStyles.mmModalSheet]}>
            <View style={[styles.mmModalHeader, tStyles.mmModalHeader]}>
              <Text style={[styles.mmModalTitle, tStyles.mmModalTitle]}>{t('mm_settings_title')}</Text>
              <TouchableOpacity style={[styles.mmModalCloseBtn, tStyles.mmModalCloseBtn]} onPress={() => setModalMMPreferences(false)}>
                <Text style={{ color: currentTheme.textSecondary, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {/* Default Period */}
              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_default_period')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {[
                  { id: 'this_month', label: t('mm_period_this_month') },
                  { id: 'last_month', label: t('mm_period_last_month') },
                  { id: 'all_time', label: t('mm_period_all_time') },
                  { id: 'custom', label: t('mm_period_custom') },
                ].map((p) => {
                  const sel = mmPrefDefaultPeriod === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.mmPrefPill, tStyles.mmPrefPill, sel && [styles.mmPrefPillActive, tStyles.mmPrefPillActive]]}
                      onPress={() => {
                        setMmPrefDefaultPeriod(p.id);
                        if (p.id === 'custom') {
                          const today = getTodayDate();
                          setMMRangeInputs(mmCustomRange?.startDate || today, mmCustomRange?.endDate || today);
                          setModalMMPreferences(false);
                          setModalMMCustomDateRange(true);
                        }
                      }}
                    >
                      <Text style={[styles.mmPrefPillText, tStyles.mmPrefPillText, sel && [styles.mmPrefPillTextActive, tStyles.mmPrefPillTextActive]]}>{p.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Default Sort Order */}
              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_default_sort')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {[
                  { id: 'newest', label: t('mm_sort_newest_short') },
                  { id: 'oldest', label: t('mm_sort_oldest_short') },
                  { id: 'amount_high', label: t('mm_sort_amount_high') },
                  { id: 'amount_low', label: t('mm_sort_amount_low') },
                ].map((s) => {
                  const sel = mmPrefSortOrder === s.id;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.mmPrefPill, tStyles.mmPrefPill, sel && [styles.mmPrefPillActive, tStyles.mmPrefPillActive]]}
                      onPress={() => setMmPrefSortOrder(s.id)}
                    >
                      <Text style={[styles.mmPrefPillText, tStyles.mmPrefPillText, sel && [styles.mmPrefPillTextActive, tStyles.mmPrefPillTextActive]]}>{s.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Currency Symbol */}
              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_currency_symbol')}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {[tStatic("৳"), 'BDT'].map((c) => {
                  const sel = mmPrefCurrencySymbol === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[styles.mmPrefPill, tStyles.mmPrefPill, sel && [styles.mmPrefPillActive, tStyles.mmPrefPillActive]]}
                      onPress={() => setMmPrefCurrencySymbol(c)}
                    >
                      <Text style={[styles.mmPrefPillText, tStyles.mmPrefPillText, sel && [styles.mmPrefPillTextActive, tStyles.mmPrefPillTextActive]]}>{c}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Card Visibility Toggles */}
              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_dashboard_visibility')}</Text>
              <TouchableOpacity
                style={[styles.mmToggleRow, tStyles.mmToggleRow]}
                onPress={() => setMmPrefShowNetWorth(!mmPrefShowNetWorth)}
              >
                <Text style={[styles.mmToggleLabel, tStyles.mmToggleLabel]}>{t('mm_total_net_worth_card')}</Text>
                <Text style={[styles.mmToggleBadge, mmPrefShowNetWorth ? [styles.mmToggleOn, tStyles.mmToggleOn] : [styles.mmToggleOff, tStyles.mmToggleOff]]}>
                  {mmPrefShowNetWorth ? t('mm_visible') : t('mm_hidden')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.mmToggleRow, tStyles.mmToggleRow]}
                onPress={() => setMmPrefShowSavingsRate(!mmPrefShowSavingsRate)}
              >
                <Text style={[styles.mmToggleLabel, tStyles.mmToggleLabel]}>{t('mm_savings_rate_card')}</Text>
                <Text style={[styles.mmToggleBadge, mmPrefShowSavingsRate ? [styles.mmToggleOn, tStyles.mmToggleOn] : [styles.mmToggleOff, tStyles.mmToggleOff]]}>
                  {mmPrefShowSavingsRate ? t('mm_visible') : t('mm_hidden')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.mmToggleRow, tStyles.mmToggleRow]}
                onPress={() => setMmPrefShowTips(!mmPrefShowTips)}
              >
                <Text style={[styles.mmToggleLabel, tStyles.mmToggleLabel]}>{t('mm_financial_tips_card')}</Text>
                <Text style={[styles.mmToggleBadge, mmPrefShowTips ? [styles.mmToggleOn, tStyles.mmToggleOn] : [styles.mmToggleOff, tStyles.mmToggleOff]]}>
                  {mmPrefShowTips ? t('mm_visible') : t('mm_hidden')}
                </Text>
              </TouchableOpacity>

              <View style={{ marginTop: 20, flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={[styles.mmResetBtn, tStyles.mmResetBtn, { flex: 1 }]}
                  onPress={handleResetMMPreferences}
                >
                  <Text style={[styles.mmResetBtnText, tStyles.mmResetBtnText]}>{t('mm_reset')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.mmSubmitBtn, { flex: 2, marginTop: 0 }]}
                  onPress={handleSaveMMPreferences}
                >
                  <Text style={styles.mmSubmitBtnText}>{t('mm_save_settings')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 11. MODAL: RECURRING SCHEDULES LIST */}
      <Modal
        visible={modalMMRecurring}
        transparent
        animationType="slide"
        onRequestClose={() => setModalMMRecurring(false)}
      >
        <View style={styles.mmModalOverlay}>
          <View style={[styles.mmModalSheet, tStyles.mmModalSheet]}>
            <View style={[styles.mmModalHeader, tStyles.mmModalHeader]}>
              <Text style={[styles.mmModalTitle, tStyles.mmModalTitle]}>{t('mm_schedules_title')}</Text>
              <TouchableOpacity style={[styles.mmModalCloseBtn, tStyles.mmModalCloseBtn]} onPress={() => setModalMMRecurring(false)}>
                <Text style={{ color: currentTheme.textSecondary, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ color: currentTheme.textSecondary, fontSize: 13 }}>{t('mm_schedule_subtitle')}</Text>
                <TouchableOpacity
                  style={[styles.mmAddSmallBtn, tStyles.mmAddSmallBtn]}
                  onPress={() => {
                    setMmRecEditId(null);
                    setMmRecTitle('');
                    setMmRecType('expense');
                    setMmRecAmount('');
                    setMmRecCadence('monthly');
                    setMmRecNextDue(getTodayDate());
                    setMmRecNote('');
                    setMmRecPayee('');
                    setModalMMAddRecurring(true);
                  }}
                >
                  <Text style={[styles.mmAddSmallBtnText, tStyles.mmAddSmallBtnText]}>{t('mm_add_schedule')}</Text>
                </TouchableOpacity>
              </View>

              {(moneyManagerState.recurring || []).length === 0 ? (
                <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                  <Text style={{ color: currentTheme.textSecondary, fontSize: 14 }}>{t('mm_no_schedules')}</Text>
                  <Text style={{ color: currentTheme.textMuted, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                    {t('mm_schedule_empty_hint')}
                  </Text>
                </View>
              ) : (
                (moneyManagerState.recurring || []).map((rec) => {
                  const isExp = rec.type === 'expense';
                  const isInc = rec.type === 'income';
                  const cadenceBn = rec.cadence === 'daily' ? t('mm_cadence_daily') : rec.cadence === 'weekly' ? t('mm_cadence_weekly') : t('mm_cadence_monthly');
                  const targetAcc = (moneyManagerState.accounts || []).find(a => a.id === rec.accountId);

                  return (
                    <View key={rec.id} style={[styles.mmScheduleCard, tStyles.mmScheduleCard]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[styles.mmScheduleTitle, tStyles.mmScheduleTitle]}>{tMMSeed('schedule', rec.id, rec.title)}</Text>
                            <View style={[styles.mmStatusBadge, rec.isActive ? [styles.mmStatusActive, tStyles.mmStatusActive] : [styles.mmStatusPaused, tStyles.mmStatusPaused]]}>
                              <Text style={[styles.mmStatusBadgeText, rec.isActive ? [styles.mmStatusActiveText, tStyles.mmStatusActiveText] : [styles.mmStatusPausedText, tStyles.mmStatusPausedText]]}>
                                {rec.isActive ? t('mm_active') : t('mm_paused')}
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.mmScheduleMeta, tStyles.mmScheduleMeta]}>
                            🔄 {cadenceBn} {t('mm_next_due_prefix')} {rec.nextDueDate || t('mm_not_set')}
                          </Text>
                          {targetAcc ? (
                            <Text style={[styles.mmScheduleMeta, tStyles.mmScheduleMeta]}>
                              {t('mm_account_prefix')} {tMMSeed('account', targetAcc.id, targetAcc.name)}
                            </Text>
                          ) : null}
                          {rec.note ? (
                            <Text style={[styles.mmScheduleNote, tStyles.mmScheduleNote]}>{rec.note}</Text>
                          ) : null}
                        </View>
                        <Text style={[[styles.mmScheduleAmount, tStyles.mmScheduleAmount], isInc ? { color: '#10B981' } : isExp ? { color: '#EF4444' } : { color: '#3B82F6' }]}>
                          {isInc ? '+' : isExp ? '-' : ''}{mmCurrency} {formatMMNumber(rec.amount || 0)}
                        </Text>
                      </View>

                    <View style={[styles.mmScheduleActionRow, tStyles.mmScheduleActionRow]}>
                        <TouchableOpacity
                          style={[[styles.mmScheduleActionBtn, tStyles.mmScheduleActionBtn], !rec.isActive && tStyles.mmScheduleResumeBtn]}
                          onPress={() => handleToggleMMRecurring(rec.id, !rec.isActive)}
                        >
                          <Text style={[tStyles.mmScheduleActionText, !rec.isActive && tStyles.mmScheduleResumeText, { fontSize: 12, fontWeight: '600' }]}>
                            {rec.isActive ? t('mm_pause_schedule') : t('mm_resume_schedule')}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.mmScheduleActionBtn, tStyles.mmScheduleActionBtn]}
                          onPress={() => handleOpenEditMMRecurring(rec)}
                        >
                          <Text style={[tStyles.mmScheduleActionText, { fontSize: 12, fontWeight: '600' }]}>{t('mm_schedule_edit')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.mmScheduleActionBtn, tStyles.mmScheduleDeleteBtn]}
                          onPress={() => handleDeleteMMRecurring(rec.id)}
                        >
                          <Text style={[tStyles.mmScheduleDeleteText, { fontSize: 12, fontWeight: '600' }]}>{t('mm_delete')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 12. MODAL: ADD / EDIT RECURRING SCHEDULE */}
      <Modal
        visible={modalMMAddRecurring}
        transparent
        animationType="slide"
        onRequestClose={() => setModalMMAddRecurring(false)}
      >
        <View style={styles.mmModalOverlay}>
          <View style={[styles.mmModalSheet, tStyles.mmModalSheet]}>
            <View style={[styles.mmModalHeader, tStyles.mmModalHeader]}>
              <Text style={[styles.mmModalTitle, tStyles.mmModalTitle]}>
                {mmRecEditId ? t('mm_add_edit_schedule_title') : t('mm_new_schedule_title')}
              </Text>
              <TouchableOpacity style={[styles.mmModalCloseBtn, tStyles.mmModalCloseBtn]} onPress={() => setModalMMAddRecurring(false)}>
                <Text style={{ color: currentTheme.textSecondary, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {/* Type Selector Chips */}
              <View style={styles.mmTypeChipContainer}>
                <TouchableOpacity
                  style={[styles.mmTypeChip, tStyles.mmTypeBtn, mmRecType === 'expense' && tStyles.mmTypeBtnExpense]}
                  onPress={() => { setMmRecType('expense'); setMmRecCat('cat_utility'); }}
                >
                  <Text style={[styles.mmTypeChipText, tStyles.mmTypeBtnText, mmRecType === 'expense' && tStyles.mmTypeBtnTextActive]}>{t('mm_type_expense')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.mmTypeChip, tStyles.mmTypeBtn, mmRecType === 'income' && tStyles.mmTypeBtnIncome]}
                  onPress={() => { setMmRecType('income'); setMmRecCat('cat_salary'); }}
                >
                  <Text style={[styles.mmTypeChipText, tStyles.mmTypeBtnText, mmRecType === 'income' && tStyles.mmTypeBtnTextActive]}>{t('mm_type_income')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.mmTypeChip, tStyles.mmTypeBtn, mmRecType === 'transfer' && tStyles.mmTypeBtnTransfer]}
                  onPress={() => setMmRecType('transfer')}
                >
                  <Text style={[styles.mmTypeChipText, tStyles.mmTypeBtnText, mmRecType === 'transfer' && tStyles.mmTypeBtnTextActive]}>{t('mm_type_transfer')}</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_schedule_title')}</Text>
              <TextInput
                style={[styles.mmInput, tStyles.mmInput]}
                placeholder={t('mm_placeholder_schedule_title')}
                placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                value={mmRecTitle}
                onChangeText={setMmRecTitle}
              />

              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{translateMMCurrencyLabel('mm_amount_label')}</Text>
              <TextInput
                style={[styles.mmInput, tStyles.mmInput]}
                placeholder="0.00"
                placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                keyboardType="numeric"
                value={mmRecAmount}
                onChangeText={setMmRecAmount}
              />

              {/* Cadence Selection */}
              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_cadence_label')}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {[
                  { id: 'daily', label: t('mm_cadence_daily') },
                  { id: 'weekly', label: t('mm_cadence_weekly') },
                  { id: 'monthly', label: t('mm_cadence_monthly') },
                ].map((c) => {
                  const sel = mmRecCadence === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[[styles.mmPrefPill, tStyles.mmPrefPill], sel && [styles.mmPrefPillActive, tStyles.mmPrefPillActive]]}
                      onPress={() => setMmRecCadence(c.id)}
                    >
                      <Text style={[[styles.mmPrefPillText, tStyles.mmPrefPillText], sel && [styles.mmPrefPillTextActive, tStyles.mmPrefPillTextActive]]}>{c.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_next_due_label')}</Text>
              <TextInput
                style={[styles.mmInput, tStyles.mmInput]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                value={mmRecNextDue}
                onChangeText={setMmRecNextDue}
              />

              {mmRecType !== 'transfer' ? (
                <>
                  <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_wallet_or_account')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    {(moneyManagerState.accounts || []).filter(a => !a.isArchived).map((acc) => {
                      const sel = mmRecAcc === acc.id;
                      return (
                        <TouchableOpacity
                          key={acc.id}
                          style={[[styles.mmCatChip, tStyles.mmCatChip], sel && [styles.mmCatChipActive, tStyles.mmCatChipActive]]}
                          onPress={() => setMmRecAcc(acc.id)}
                        >
                          <Text style={{ fontSize: 16, marginRight: 6 }}>{acc.icon}</Text>
                          <Text style={[[styles.mmCatChipText, tStyles.mmCatChipText], sel && [styles.mmCatChipTextActive, tStyles.mmCatChipTextActive]]}>{acc.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_category')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    {(moneyManagerState.categories || []).filter(c => c.type === (mmRecType === 'income' ? 'income' : 'expense') && !c.isArchived).map((cat) => {
                      const sel = mmRecCat === cat.id;
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          style={[[styles.mmCatChip, tStyles.mmCatChip], sel && [styles.mmCatChipActive, tStyles.mmCatChipActive]]}
                          onPress={() => setMmRecCat(cat.id)}
                        >
                          <Text style={{ fontSize: 16, marginRight: 6 }}>{cat.icon}</Text>
                          <Text style={[[styles.mmCatChipText, tStyles.mmCatChipText], sel && [styles.mmCatChipTextActive, tStyles.mmCatChipTextActive]]}>{tMMSeed('category', cat.id, cat.name)}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              ) : (
                <>
                  <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_from_account')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    {(moneyManagerState.accounts || []).filter(a => !a.isArchived).map((acc) => {
                      const sel = mmRecFromAcc === acc.id;
                      return (
                        <TouchableOpacity
                          key={acc.id}
                          style={[[styles.mmCatChip, tStyles.mmCatChip], sel && [styles.mmCatChipActive, tStyles.mmCatChipActive]]}
                          onPress={() => setMmRecFromAcc(acc.id)}
                        >
                          <Text style={{ fontSize: 16, marginRight: 6 }}>{acc.icon}</Text>
                          <Text style={[[styles.mmCatChipText, tStyles.mmCatChipText], sel && [styles.mmCatChipTextActive, tStyles.mmCatChipTextActive]]}>{acc.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_to_account')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    {(moneyManagerState.accounts || []).filter(a => !a.isArchived).map((acc) => {
                      const sel = mmRecToAcc === acc.id;
                      return (
                        <TouchableOpacity
                          key={acc.id}
                          style={[[styles.mmCatChip, tStyles.mmCatChip], sel && [styles.mmCatChipActive, tStyles.mmCatChipActive]]}
                          onPress={() => setMmRecToAcc(acc.id)}
                        >
                          <Text style={{ fontSize: 16, marginRight: 6 }}>{acc.icon}</Text>
                          <Text style={[[styles.mmCatChipText, tStyles.mmCatChipText], sel && [styles.mmCatChipTextActive, tStyles.mmCatChipTextActive]]}>{acc.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              )}

              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_payee_source')}</Text>
              <TextInput
                style={[styles.mmInput, tStyles.mmInput]}
                placeholder={t('mm_placeholder_schedule_payee')}
                placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                value={mmRecPayee}
                onChangeText={setMmRecPayee}
              />

              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_note_purpose')}</Text>
              <TextInput
                style={[styles.mmInput, tStyles.mmInput]}
                placeholder={t('mm_extra_info')}
                placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                value={mmRecNote}
                onChangeText={setMmRecNote}
              />

              <TouchableOpacity style={styles.mmSubmitBtn} onPress={handleSaveMMRecurring}>
                <Text style={styles.mmSubmitBtnText}>
                  {mmRecEditId ? t('mm_update_schedule') : t('mm_save_schedule')}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 13. MODAL: EDIT / ARCHIVE CATEGORY */}
      <Modal
        visible={modalMMEditCategory}
        transparent
        animationType="slide"
        onRequestClose={() => setModalMMEditCategory(false)}
      >
        <View style={styles.mmModalOverlay}>
          <View style={[styles.mmModalSheet, tStyles.mmModalSheet]}>
            <View style={[styles.mmModalHeader, tStyles.mmModalHeader]}>
              <Text style={[styles.mmModalTitle, tStyles.mmModalTitle]}>{t('mm_manage_category_title')}</Text>
              <TouchableOpacity style={[styles.mmModalCloseBtn, tStyles.mmModalCloseBtn]} onPress={() => setModalMMEditCategory(false)}>
                <Text style={{ color: currentTheme.textSecondary, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_category_name')}</Text>
              <TextInput
                style={[styles.mmInput, tStyles.mmInput]}
                placeholder={t('mm_placeholder_category_name')}
                placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                value={mmEditCatName}
                onChangeText={setMmEditCatName}
              />

              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_choose_icon_verb')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                {['🍲', '🚌', '💡', '🛍️', '💊', '📚', '☕', '📦', '💰', '📈', '🏦', '🎁', '📱', '🎮'].map((ic) => {
                  const sel = mmEditCatIcon === ic;
                  return (
                    <TouchableOpacity
                      key={ic}
                      style={[[styles.mmIconPickerItem, tStyles.mmIconPickerItem], sel && [styles.mmIconPickerItemActive, tStyles.mmIconPickerItemActive]]}
                      onPress={() => setMmEditCatIcon(ic)}
                    >
                      <Text style={{ fontSize: 20 }}>{ic}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_color_label')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                {['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#6366F1', '#6B7280'].map((col) => {
                  const sel = mmEditCatColor === col;
                  return (
                    <TouchableOpacity
                      key={col}
                      style={[styles.mmColorPickerItem, { backgroundColor: col }, sel && styles.mmColorPickerItemActive]}
                      onPress={() => setMmEditCatColor(col)}
                    />
                  );
                })}
              </View>

              {mmEditCatType === 'expense' && (
                <>
                  <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{translateMMCurrencyLabel('mm_monthly_expense_limit')}</Text>
                  <TextInput
                    style={[styles.mmInput, tStyles.mmInput]}
                    placeholder="0.00"
                    placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                    keyboardType="numeric"
                    value={mmEditCatBudget}
                    onChangeText={setMmEditCatBudget}
                  />
                </>
              )}

              {/* Archive / Restore Button */}
              <TouchableOpacity
                style={[styles.mmArchiveBtn, mmEditCatIsArchived ? tStyles.mmScheduleResumeBtn : tStyles.mmArchiveActionBtn, { marginTop: 10 }]}
                onPress={async () => {
                  await handleArchiveMMCategory(mmEditCatId, !mmEditCatIsArchived);
                  setMmEditCatIsArchived(!mmEditCatIsArchived);
                }}
              >
                <Text style={[mmEditCatIsArchived ? tStyles.mmScheduleResumeText : tStyles.mmArchiveActionText, { fontSize: 13, fontWeight: '600' }]}>
                  {mmEditCatIsArchived ? t('mm_restore_category') : t('mm_archive_category')}
                </Text>
              </TouchableOpacity>

              {/* Delete Button */}
              <TouchableOpacity
                style={[styles.mmArchiveBtn, tStyles.mmScheduleDeleteBtn, { marginTop: 8 }]}
                onPress={() => handleDeleteMMCategory(mmEditCatId)}
              >
                <Text style={[tStyles.mmScheduleDeleteText, { fontSize: 13, fontWeight: '600' }]}>
                  {t('mm_delete_category')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.mmSubmitBtn} onPress={handleSaveMMEditCategory}>
                <Text style={styles.mmSubmitBtnText}>{t('mm_save_changes')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>




      {/* 14. MODAL: CUSTOM DATE RANGE SELECTOR */}
      <Modal
        visible={modalMMCustomDateRange}
        transparent
        animationType="slide"
        onRequestClose={() => setModalMMCustomDateRange(false)}
      >
        <View style={styles.mmModalOverlay}>
          <View style={[styles.mmModalSheet, tStyles.mmModalSheet]}>
            <View style={[styles.mmModalHeader, tStyles.mmModalHeader]}>
              <Text style={[styles.mmModalTitle, tStyles.mmModalTitle]}>{t("mm_custom_range_title")}</Text>
              <TouchableOpacity
                style={[[styles.mmModalCloseBtn, tStyles.mmModalCloseBtn], isDark && { backgroundColor: currentTheme.cardBorder }]}
                onPress={() => setModalMMCustomDateRange(false)}
                accessibilityRole="button"
                accessibilityLabel={t('mm_close')}
              >
                <Text style={{ color: currentTheme.textSecondary, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
              {/* Quick Presets */}
              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel, { marginTop: 6 }]}>{t('mm_quick_options')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 }}>
                <TouchableOpacity
                  style={[styles.mmPrefPill, tStyles.mmPrefPill, { width: '48%', paddingHorizontal: 6 }]}
                  onPress={() => {
                    const range = moneyManagerService.getQuickDateRange('today');
                    if (range.valid) setMMRangeInputs(range.startDate, range.endDate);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t('mm_quick_today')}
                >
                  <Text style={[styles.mmPrefPillText, tStyles.mmPrefPillText, { fontSize: 11 }]}>{t("mm_quick_today")}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.mmPrefPill, tStyles.mmPrefPill, { width: '48%', paddingHorizontal: 6 }]}
                  onPress={() => {
                    const range = moneyManagerService.getQuickDateRange('last_7_days');
                    if (range.valid) setMMRangeInputs(range.startDate, range.endDate);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t('mm_quick_last_7_days')}
                >
                  <Text style={[styles.mmPrefPillText, tStyles.mmPrefPillText, { fontSize: 11 }]}>{t("mm_quick_last_7_days")}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.mmPrefPill, tStyles.mmPrefPill, { width: '48%', paddingHorizontal: 6 }]}
                  onPress={() => {
                    const range = moneyManagerService.getQuickDateRange('last_30_days');
                    if (range.valid) setMMRangeInputs(range.startDate, range.endDate);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t('mm_quick_last_30_days')}
                >
                  <Text style={[styles.mmPrefPillText, tStyles.mmPrefPillText]}>{t("mm_quick_last_30_days")}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.mmPrefPill, tStyles.mmPrefPill, { width: '48%', paddingHorizontal: 6 }]}
                  onPress={() => {
                    const range = moneyManagerService.getQuickDateRange('this_year');
                    if (range.valid) setMMRangeInputs(range.startDate, range.endDate);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t('mm_quick_this_year')}
                >
                  <Text style={[styles.mmPrefPillText, tStyles.mmPrefPillText]}>{t("mm_quick_this_year")}</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.mmInputLabel, tStyles.mmInputLabel]}>{t('mm_calendar_choose_field')}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                {[
                  { id: 'startDate', label: t('mm_start_date_short') },
                  { id: 'endDate', label: t('mm_end_date_short') },
                ].map((item) => {
                  const selected = mmCalendarTarget === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.mmPrefPill, tStyles.mmPrefPill, { flex: 1, alignItems: 'center' }, selected && [styles.mmPrefPillActive, tStyles.mmPrefPillActive]]}
                      onPress={() => setMmCalendarTarget(item.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <Text style={[styles.mmPrefPillText, tStyles.mmPrefPillText, selected && [styles.mmPrefPillTextActive, tStyles.mmPrefPillTextActive]]}>{item.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <TouchableOpacity
                  style={[styles.mmPrefPill, tStyles.mmPrefPill, { paddingHorizontal: 14 }]}
                  onPress={() => setMmCalendarMonth((month) => moneyManagerService.shiftMonthStr(month, -1))}
                  accessibilityRole="button"
                  accessibilityLabel={t('mm_calendar_previous_month')}
                >
                  <Text style={[styles.mmPrefPillText, tStyles.mmPrefPillText]}>‹</Text>
                </TouchableOpacity>
                <Text style={{ color: currentTheme.textPrimary, fontSize: 15, fontWeight: '700' }} accessibilityRole="header">
                  {mmCalendarMonthTitle}
                </Text>
                <TouchableOpacity
                  style={[styles.mmPrefPill, tStyles.mmPrefPill, { paddingHorizontal: 14 }]}
                  onPress={() => setMmCalendarMonth((month) => moneyManagerService.shiftMonthStr(month, 1))}
                  accessibilityRole="button"
                  accessibilityLabel={t('mm_calendar_next_month')}
                >
                  <Text style={[styles.mmPrefPillText, tStyles.mmPrefPillText]}>›</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                {mmCalendarWeekdayKeys.map((key) => (
                  <Text key={key} style={{ width: '14.2857%', textAlign: 'center', color: currentTheme.textSecondary, fontSize: 11, fontWeight: '600', paddingVertical: 5 }}>
                    {t(key)}
                  </Text>
                ))}
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
                {mmCalendarDates.map((dateStr) => {
                  const startDate = moneyManagerService.normalizeToLocalDate(mmRangeStartInput);
                  const endDate = moneyManagerService.normalizeToLocalDate(mmRangeEndInput);
                  const isStart = dateStr === startDate;
                  const isEnd = dateStr === endDate;
                  const isSelected = isStart || isEnd;
                  const isInSelectedRange = Boolean(startDate && endDate && dateStr >= startDate && dateStr <= endDate);
                  const isCurrentMonth = dateStr.slice(0, 7) === mmCalendarMonth;
                  return (
                    <TouchableOpacity
                      key={dateStr}
                      style={{
                        width: '14.2857%', height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20,
                        backgroundColor: isSelected ? currentTheme.primary : isInSelectedRange ? (isDark ? '#3F1D24' : '#FEF2F2') : 'transparent',
                      }}
                      onPress={() => {
                        selectMMCalendarDate(dateStr);
                        setMmCalendarMonth(dateStr.slice(0, 7));
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={t('mm_calendar_choose_date', { date: formatDisplayDate(dateStr) })}
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text style={{
                        color: isSelected ? '#FFFFFF' : isCurrentMonth ? currentTheme.textPrimary : currentTheme.textMuted,
                        fontSize: 13, fontWeight: isSelected ? '700' : '500',
                      }}>
                        {formatAppNumber(Number(dateStr.slice(-2)))}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Start Date Input */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <Text style={[styles.mmInputLabel, tStyles.mmInputLabel, { marginTop: 0 }]}>{t("mm_start_date")}</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    style={[[styles.mmPrefPill, tStyles.mmPrefPill], { paddingHorizontal: 6, paddingVertical: 2 }]}
                    onPress={() => {
                      handleMMRangeDateInput('startDate', moneyManagerService.shiftDateStr(mmRangeStartInput, -1));
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('mm_access_decrease_start')}
                  >
                    <Text style={[[styles.mmPrefPillText, tStyles.mmPrefPillText], [styles.mmPeriodPillText, tStyles.mmPeriodPillText], { fontSize: 11 }]}>{t("mm_step_prev_day")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[[styles.mmPrefPill, tStyles.mmPrefPill], { paddingHorizontal: 6, paddingVertical: 2 }]}
                    onPress={() => {
                      handleMMRangeDateInput('startDate', moneyManagerService.shiftDateStr(mmRangeStartInput, 1));
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('mm_access_increase_start')}
                  >
                    <Text style={[[styles.mmPrefPillText, tStyles.mmPrefPillText], [styles.mmPeriodPillText, tStyles.mmPeriodPillText], { fontSize: 11 }]}>{t("mm_step_next_day")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[[styles.mmPrefPill, tStyles.mmPrefPill], { paddingHorizontal: 6, paddingVertical: 2 }]}
                    onPress={() => {
                      handleMMRangeDateInput('startDate', getTodayDate());
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('mm_access_start_today')}
                  >
                    <Text style={[[styles.mmPrefPillText, tStyles.mmPrefPillText], [styles.mmPeriodPillText, tStyles.mmPeriodPillText], { fontSize: 11 }]}>{t("mm_step_today")}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <TextInput
                style={[styles.mmInput, tStyles.mmInput]}
                value={mmRangeStartInput}
                onChangeText={(val) => handleMMRangeDateInput('startDate', val)}
                placeholder={t('mm_date_format_placeholder')}
                placeholderTextColor={currentTheme.textMuted}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />

              {/* End Date Input */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <Text style={[styles.mmInputLabel, tStyles.mmInputLabel, { marginTop: 0 }]}>{t("mm_end_date")}</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    style={[[styles.mmPrefPill, tStyles.mmPrefPill], { paddingHorizontal: 6, paddingVertical: 2 }]}
                    onPress={() => {
                      handleMMRangeDateInput('endDate', moneyManagerService.shiftDateStr(mmRangeEndInput, -1));
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('mm_access_decrease_end')}
                  >
                    <Text style={[[styles.mmPrefPillText, tStyles.mmPrefPillText], [styles.mmPeriodPillText, tStyles.mmPeriodPillText], { fontSize: 11 }]}>{t("mm_step_prev_day")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[[styles.mmPrefPill, tStyles.mmPrefPill], { paddingHorizontal: 6, paddingVertical: 2 }]}
                    onPress={() => {
                      handleMMRangeDateInput('endDate', moneyManagerService.shiftDateStr(mmRangeEndInput, 1));
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('mm_access_increase_end')}
                  >
                    <Text style={[[styles.mmPrefPillText, tStyles.mmPrefPillText], [styles.mmPeriodPillText, tStyles.mmPeriodPillText], { fontSize: 11 }]}>{t("mm_step_next_day")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[[styles.mmPrefPill, tStyles.mmPrefPill], { paddingHorizontal: 6, paddingVertical: 2 }]}
                    onPress={() => {
                      handleMMRangeDateInput('endDate', getTodayDate());
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('mm_access_end_today')}
                  >
                    <Text style={[[styles.mmPrefPillText, tStyles.mmPrefPillText], [styles.mmPeriodPillText, tStyles.mmPeriodPillText], { fontSize: 11 }]}>{t("mm_step_today")}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <TextInput
                style={[styles.mmInput, tStyles.mmInput]}
                value={mmRangeEndInput}
                onChangeText={(val) => handleMMRangeDateInput('endDate', val)}
                placeholder={t('mm_date_format_placeholder')}
                placeholderTextColor={currentTheme.textMuted}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />

              {/* Error message */}
              {!!mmRangeError && (
                <View style={{ marginTop: 10, padding: 10, backgroundColor: isDark ? '#7F1D1D33' : '#FEE2E2', borderRadius: 8, borderWidth: 1, borderColor: '#EF4444' }}>
                  <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '600' }}>⚠️ {mmRangeError}</Text>
                </View>
              )}

              {/* Action Buttons */}
              <View style={{ marginTop: 20, flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={[[styles.mmResetBtn, tStyles.mmResetBtn], { flex: 1 }]}
                  onPress={handleClearMMRange}
                  accessibilityRole="button"
                  accessibilityLabel={t('mm_clear_range')}
                >
                  <Text style={[styles.mmResetBtnText, tStyles.mmResetBtnText]}>{t("mm_clear_range")}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[[styles.mmSubmitBtn, tStyles.mmSubmitBtn], { flex: 2, marginTop: 0 }]}
                  onPress={handleApplyMMRange}
                  accessibilityRole="button"
                  accessibilityLabel={t('mm_apply_range')}
                >
                  <Text style={styles.mmSubmitBtnText}>{t("mm_apply_range")}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
    </ThemeContext.Provider>
  );
}



// =========================================================================
// 5. AUTHENTIC TALLYKHATA STYLESHEET (All 255 Keys Verified)
// =========================================================================
const styles = StyleSheet.create({
  // --- THEME & LANGUAGE PICKER STYLES ---
  themeOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  themeOptionCardActive: {
    borderColor: '#B81414',
    backgroundColor: '#FEF2F2',
  },
  themeOptionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeOptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  themeOptionSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  themeCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeUncheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },

  // --- AUTHENTIC 1:1 VISUAL PARITY STYLES (photo_2026-10-15_18-13-34.jpg) ---
  topHeaderBarRed: {
    backgroundColor: '#B81414',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 4 : 10,
    paddingBottom: 8,
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

  // 8-Item Quick Grid
  quickGridContainer: {
    marginHorizontal: 10,
    marginTop: 12,
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
    paddingVertical: 2,
  },
  quickGrid3DIcon: {
    marginBottom: 3,
  },
  quickGridIcon: {
    width: 42,
    height: 42,
  },
  quickGridLabel: {
    fontSize: 12,
    color: '#1F2937',
    marginTop: 4,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Summary Card
  summaryCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginHorizontal: 16,
    marginVertical: 4,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFEFEF',
    borderTopWidth: 1.5,
    borderTopColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  summaryCardCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryCardAmountRed: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#B81414',
  },
  summaryCardAmountGreen: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#1C7D50',
  },
  summaryCardLabel: {
    fontSize: 12,
    color: '#616161',
    marginTop: 2,
    fontWeight: '500',
  },
  summaryCardDivider: {
    width: 1,
    height: 34,
    backgroundColor: '#E5E7EB',
  },

  // Search Pill & Counter Strip
  searchPillBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    marginHorizontal: 16,
    marginTop: 5,
    marginBottom: 4,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  counterStripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    marginTop: 8,
    marginBottom: 4,
  },
  counterTabPill: {
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  counterTabPillActive: {
    backgroundColor: 'transparent',
  },
  counterTabText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '500',
  },
  counterTabTextActive: {
    color: '#111827',
    fontWeight: 'bold',
  },
  counterStripDivider: {
    color: '#9CA3AF',
    fontSize: 13,
    marginHorizontal: 4,
  },

  // Customer List Rows
  customerListCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  customerAvatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  customerAvatarText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
  },
  customerCardName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  customerCardTime: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  customerCardAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#B81414',
    marginRight: 6,
  },
  customerChevron: {
    width: 14,
    height: 14,
    tintColor: '#9CA3AF',
    marginLeft: 6,
  },

  // Floating Round FAB
  floatingRoundFab: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#B81414',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1.5,
    borderTopColor: '#FF6B6B',
    borderBottomWidth: 2.5,
    borderBottomColor: '#8A0E0E',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    zIndex: 999,
  },

  // Active Pill on Bottom Nav
  tabActivePill: {
    backgroundColor: '#FCE8E8',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 16,
    borderTopWidth: 1.5,
    borderTopColor: '#FFFFFF',
    borderBottomWidth: 2,
    borderBottomColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
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
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 6 : 10,
    paddingBottom: 10,
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
    borderRadius: 14,
    borderTopWidth: 1.5,
    borderTopColor: '#FFFFFF',
    borderBottomWidth: 3,
    borderBottomColor: '#E2E8F0',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#EDF2F7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
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
    borderRadius: 12,
    borderTopWidth: 1.5,
    borderTopColor: '#FFFFFF',
    borderBottomWidth: 3,
    borderBottomColor: '#E2E8F0',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#EDF2F7',
    elevation: 2,
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
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 12,
    borderRadius: 8,
    borderTopWidth: 1,
    borderTopColor: '#FFFFFF',
    borderBottomWidth: 1.5,
    borderBottomColor: '#CBD5E1',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E2E8F0',
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
    paddingTop: 10,
    paddingBottom: Platform.OS === 'android' ? 46 : 12,
    gap: 12,
  },
  bigEntryBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255, 255, 255, 0.4)',
    borderBottomWidth: 3.5,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  bigEntryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // --- CASHBOX TAB & SCREEN ---
  cashTopCard: {
    backgroundColor: '#FFFFFF',
    padding: 0,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderTopWidth: 1.5,
    borderTopColor: '#FFFFFF',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
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
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255, 255, 255, 0.35)',
    borderBottomWidth: 3.5,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
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

  tagadaQuotaBadge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  tagadaQuotaText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '600',
  },
  tagadaQuotaCount: {
    fontSize: 12,
    color: '#B81414',
    fontWeight: 'bold',
    marginTop: 2,
  },
  tagadaSummaryStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#FECACA',
  },
  tagadaSummaryText: {
    fontSize: 13,
    color: '#374151',
  },
  bulkTagadaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B81414',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#B81414',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  bulkTagadaTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  bulkTagadaSub: {
    fontSize: 12,
    color: '#FEE2E2',
    marginTop: 2,
  },
  bulkTagadaArrow: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
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
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginVertical: 5,
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
    fontSize: 13,
    fontWeight: 'bold',
    color: '#DC2626',
    marginTop: 3,
    textAlign: 'left',
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
    borderRadius: 16,
    borderTopWidth: 1.5,
    borderTopColor: '#FF6B6B',
    borderBottomWidth: 4,
    borderBottomColor: '#7F0C0C',
    elevation: 6,
    shadowColor: '#7F0C0C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
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
    borderRadius: 14,
    borderTopWidth: 1.5,
    borderTopColor: '#FFFFFF',
    borderBottomWidth: 3,
    borderBottomColor: '#E2E8F0',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#EDF2F7',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
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
    marginHorizontal: 12,
    marginTop: 12,
    padding: 18,
    borderRadius: 14,
    borderTopWidth: 1.5,
    borderTopColor: '#FFFFFF',
    borderBottomWidth: 3,
    borderBottomColor: '#FBD5D5',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#FED7D7',
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#B81414',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
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
    marginTop: 10,
    borderRadius: 14,
    borderTopWidth: 1.5,
    borderTopColor: '#FFFFFF',
    borderBottomWidth: 3,
    borderBottomColor: '#E2E8F0',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#EDF2F7',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
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
    width: 14,
    height: 14,
    tintColor: '#9CA3AF',
  },

  // --- 5-BUTTON BOTTOM NAVIGATION BAR ---
  bottomTabBar: {
    flexDirection: 'row',
    height: Platform.OS === 'android' ? 104 : 64,
    paddingBottom: Platform.OS === 'android' ? 44 : 6,
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
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 6,
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
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
    marginTop: 2,
  },
  tabButtonLabelActive: {
    color: '#B81414',
    fontWeight: 'bold',
  },

  // --- CALCULATOR KEYPAD & QUICK CHIPS ---
  calcDisplayBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    marginVertical: 6,
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
    height: 46,
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1.5,
    borderTopColor: '#FFFFFF',
    borderBottomWidth: 3,
    borderBottomColor: '#D1D5DB',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  keypadBtnOp: {
    backgroundColor: '#FEF3C7',
    borderTopColor: '#FFFBEB',
    borderBottomColor: '#D97706',
    borderColor: '#FDE68A',
  },
  keypadBtnSpecial: {
    backgroundColor: '#FEE2E2',
    borderTopColor: '#FEF2F2',
    borderBottomColor: '#DC2626',
    borderColor: '#FECACA',
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
    borderRadius: 20,
    padding: 20,
    maxHeight: '90%',
    borderTopWidth: 1.5,
    borderTopColor: '#FFFFFF',
    borderBottomWidth: 3.5,
    borderBottomColor: '#E2E8F0',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#EDF2F7',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  modalTitleBar: {
    width: 4,
    height: 18,
    backgroundColor: '#B81414',
    borderRadius: 2,
    marginRight: 8,
  },
  modalCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseIcon: {
    width: 14,
    height: 14,
    tintColor: '#4B5563',
  },
  modalCloseCircleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4B5563',
    lineHeight: 18,
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
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderTopColor: '#D1D5DB',
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1A1A1A',
  },
  modalBigInput: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderTopColor: '#D1D5DB',
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
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
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
    borderTopWidth: 1,
    borderTopColor: '#FFFFFF',
    borderBottomWidth: 3,
    borderBottomColor: '#CBD5E1',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  modalBtnCancelText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4B5563',
  },
  modalBtnSubmit: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#B81414',
    borderTopWidth: 1,
    borderTopColor: '#FF6B6B',
    borderBottomWidth: 3.5,
    borderBottomColor: '#7F0C0C',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#7F0C0C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
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
    height: 2,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    borderBottomWidth: 1,
    borderBottomColor: '#FFFFFF',
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
    borderRadius: 10,
    paddingVertical: 9,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
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
    width: 14,
    height: 14,
    tintColor: '#9CA3AF',
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
    paddingBottom: Platform.OS === 'android' ? 52 : 30,
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
  },

  // --- AUTHENTIC FULLSCREEN REPORT SCREENS ---
  reportContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B81414',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 12,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
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

  // Transaction Limit Modal Styles (activity_transaction_limit.xml)
  txnLimitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#B81414',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 14,
    paddingBottom: 14,
  },
  txnLimitBackBtn: {
    padding: 4,
  },
  txnLimitHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  txnLimitTabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  txnLimitTabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  txnLimitTabBtnActive: {
    borderBottomColor: '#B81414',
  },
  txnLimitTabLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  txnLimitTabLabelActive: {
    color: '#B81414',
    fontWeight: 'bold',
  },
  txnLimitStatusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  txnLimitVerifiedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  txnLimitVerifiedText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: 'bold',
  },
  txnLimitDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  txnLimitSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
    marginLeft: 4,
  },
  txnLimitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  txnLimitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  txnLimitRowDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  txnLimitRowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  txnLimitRowSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  txnLimitRowAmount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
  },
  // Cloud Backup & Restore Styles
  cloudBackupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F8A0F',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cloudBackupHeaderTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  cloudBackupTabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  cloudBackupTabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  cloudBackupTabBtnActive: {
    borderBottomColor: '#0F8A0F',
  },
  cloudBackupTabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  cloudBackupTabLabelActive: {
    color: '#0F8A0F',
    fontWeight: 'bold',
  },

  cloudNotConnectedMiniBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 14,
  },
  cloudGoogleIconCircleSmall: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cloudConnectBtnSmall: {
    backgroundColor: '#0F8A0F',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  cloudConnectBtnSmallText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cloudControlsSection: {
    marginTop: 4,
    marginBottom: 14,
  },
  cloudControlsSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 10,
  },
  cloudControlCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderTopWidth: 1.5,
    borderTopColor: '#FFFFFF',
    borderBottomWidth: 3,
    borderBottomColor: '#E2E8F0',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#EDF2F7',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
  },
  cloudControlIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cloudControlTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  cloudControlSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 16,
  },

  cloudNotConnectedCard: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 4,
  },
  cloudGoogleIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cloudCardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 6,
    textAlign: 'center',
  },
  cloudCardSub: {
    fontSize: 13,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  cloudBenefitList: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
    gap: 6,
  },
  cloudBenefitItem: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  cloudConnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F8A0F',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: '100%',
  },
  cloudConnectBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cloudAccountBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 14,
  },
  cloudAvatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cloudAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cloudAccountName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
  },
  cloudAccountEmail: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2,
  },
  cloudVerifiedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  cloudVerifiedBadgeText: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cloudDisconnectBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  cloudDisconnectBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  cloudBackupMetaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 14,
  },
  cloudMetaHeaderTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cloudMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cloudMetaLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  cloudMetaValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  cloudStatsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  cloudStatBox: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cloudStatNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  cloudStatLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  cloudActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cloudActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  cloudNoBackupCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 14,
  },
  cloudNoBackupTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 4,
  },
  cloudNoBackupSub: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 18,
  },
  cloudAutoBackupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cloudAutoBackupTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  cloudAutoBackupSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  toggleSwitch: {
    width: 48,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E5E7EB',
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: '#0F8A0F',
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },

  // 3D Section Headers & Dynamic Dividers
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 8,
    marginBottom: 4,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeaderAccentPill: {
    width: 4,
    height: 16,
    borderRadius: 2,
    backgroundColor: '#B81414',
    marginRight: 8,
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    letterSpacing: 0.2,
  },
  sectionHeaderCountBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionHeaderCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  sectionHeaderBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  sectionHeaderBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
  },
  sectionHeaderAction: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B81414',
  },
  // --- PERSONAL MONEY MANAGER STYLES (100% ISOLATED & MODERN 3D) ---
  mmBadge: {
    backgroundColor: '#065F46',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  mmBadgeText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: 'bold',
  },
  mmNewBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  mmNewBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  mmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 14,
    paddingBottom: 14,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  mmBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  mmBackIcon: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: 'bold',
  },
  mmHeaderTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: 'bold',
  },
  mmBadge: {
    backgroundColor: '#3B82F6',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  mmBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  mmHeaderSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  mmAddHeaderBtn: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mmAddHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },

  /* Period Selector Pills Bar */
  mmPeriodContainer: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  mmPeriodPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  mmPeriodPillActive: {
    backgroundColor: '#2563EB',
  },
  mmPeriodPillText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  mmPeriodPillTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  /* Top Summary Card */
  mmTotalCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  mmTotalCardLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
  mmPeriodBadge: {
    backgroundColor: '#334155',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  mmPeriodBadgeText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: 'bold',
  },
  mmTotalCardAmount: {
    color: '#F8FAFC',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 4,
  },
  mmTotalCardSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  mmStatRow: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  mmStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  mmStatLabel: {
    color: '#94A3B8',
    fontSize: 11,
    marginBottom: 4,
  },
  mmStatIncome: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: 'bold',
  },
  mmHeaderIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  mmPrefPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  mmPrefPillActive: {
    backgroundColor: '#2563EB',
    borderColor: '#3B82F6',
  },
  mmPrefPillText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  mmPrefPillTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  mmToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  mmToggleLabel: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '500',
  },
  mmToggleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 'bold',
  },
  mmToggleOn: {
    backgroundColor: '#065F46',
    color: '#34D399',
  },
  mmToggleOff: {
    backgroundColor: '#374151',
    color: '#9CA3AF',
  },
  mmResetBtn: {
    backgroundColor: '#334155',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mmResetBtnText: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: 'bold',
  },
  mmScheduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mmScheduleTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: 'bold',
  },
  mmScheduleMeta: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  mmScheduleNote: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
  mmScheduleAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  mmStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mmStatusActive: {
    backgroundColor: '#065F46',
  },
  mmStatusPaused: {
    backgroundColor: '#475569',
  },
  mmStatusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  mmStatusActiveText: {
    color: '#34D399',
  },
  mmStatusPausedText: {
    color: '#94A3B8',
  },
  mmScheduleActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  mmScheduleActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#334155',
  },
  mmIconPickerItem: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mmIconPickerItemActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#1E3A8A',
  },
  mmColorPickerItem: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  mmColorPickerItemActive: {
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.15 }],
  },
  mmArchiveBtn: {
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mmStatExpense: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: 'bold',
  },
  mmStatSavings: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: 'bold',
  },
  mmStatDivider: {
    width: 1,
    backgroundColor: '#334155',
    marginHorizontal: 4,
  },
  mmSavingsRateRow: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    alignItems: 'center',
  },
  mmSavingsRateText: {
    color: '#94A3B8',
    fontSize: 12,
  },

  /* Sub-Tabs */
  mmSubTabsContainer: {
    flexDirection: 'row',
    marginTop: 14,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
  },
  mmSubTabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8,
  },
  mmSubTabBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  mmSubTabLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
  },
  mmSubTabLabelActive: {
    color: '#0F172A',
    fontWeight: 'bold',
  },

  /* Search & Filter & Sort */
  mmSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mmSearchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  mmSearchInput: {
    flex: 1,
    color: '#0F172A',
    fontSize: 13,
    paddingVertical: 9,
  },
  mmFilterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mmFilterChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#3B82F6',
  },
  mmFilterChipText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  mmFilterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  mmSortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  mmSortLabel: {
    color: '#64748B',
    fontSize: 11,
    marginRight: 8,
  },
  mmSortChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
  },
  mmSortChipActive: {
    backgroundColor: '#2563EB',
  },
  mmSortChipText: {
    color: '#64748B',
    fontSize: 11,
  },
  mmSortChipTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  /* Transactions List */
  mmTxnCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mmTxnIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  mmTxnIcon: {
    fontSize: 18,
  },
  mmTxnCat: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
  },
  mmTxnPayee: {
    color: '#38BDF8',
    fontSize: 12,
    marginTop: 1,
  },
  mmTxnNote: {
    color: '#475569',
    fontSize: 12,
    marginTop: 2,
  },
  mmTxnMeta: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 3,
  },
  mmTxnAmount: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  mmTxnActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  mmTxnActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    marginRight: 8,
  },
  mmTxnActionBtnText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '500',
  },
  mmTxnDeleteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#7F1D1D',
    borderRadius: 6,
  },
  mmTxnDeleteBtnText: {
    color: '#FECACA',
    fontSize: 11,
    fontWeight: '500',
  },

  /* Accounts / Wallets */
  mmSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  mmSectionTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: 'bold',
  },
  mmAddSmallBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  mmAddSmallBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  mmAccountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mmAccountCardArchived: {
    opacity: 0.6,
  },
  mmAccountIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  mmAccountIcon: {
    fontSize: 22,
  },
  mmAccountName: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '600',
  },
  mmAccountType: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  mmAccountBalance: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: 'bold',
  },
  mmArchivedBadge: {
    backgroundColor: '#475569',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  mmArchivedBadgeText: {
    color: '#CBD5E1',
    fontSize: 10,
  },
  mmAccountActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  mmAccountActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    marginRight: 8,
  },
  mmAccountActionText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '500',
  },
  mmAccountArchiveBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 6,
    marginRight: 8,
  },
  mmAccountArchiveText: {
    color: '#64748B',
    fontSize: 11,
  },
  mmAccountDeleteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#7F1D1D',
    borderRadius: 6,
  },
  mmAccountDeleteText: {
    color: '#FECACA',
    fontSize: 11,
  },
  mmAddAccBigBtn: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
    marginTop: 6,
    marginBottom: 14,
  },
  mmAddAccBigBtnText: {
    color: '#60A5FA',
    fontSize: 14,
    fontWeight: 'bold',
  },

  /* Budgets */
  mmOverallBudgetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mmOverallBudgetTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: 'bold',
  },
  mmOverallBudgetBadge: {
    backgroundColor: '#10B981',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  mmOverallBudgetBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  mmOverallBudgetStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 8,
  },
  mmOverallBudgetSpent: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 2,
  },
  mmOverallBudgetLimit: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  mmProgressBarBg: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 6,
  },
  mmProgressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  mmOverallBudgetBtn: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  mmOverallBudgetBtnText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: 'bold',
  },
  mmCatBudgetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mmCatBudgetIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  mmCatBudgetName: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
  },
  mmCatBudgetAmounts: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  mmCatBudgetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
  },
  mmCatBudgetBtnText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '500',
  },

  /* Savings Goals */
  mmGoalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mmGoalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  mmGoalTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: 'bold',
  },
  mmGoalTargetDate: {
    color: '#38BDF8',
    fontSize: 11,
    marginTop: 1,
  },
  mmGoalNote: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 1,
  },
  mmGoalProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  mmGoalSaved: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: 'bold',
  },
  mmGoalTarget: {
    color: '#94A3B8',
    fontSize: 13,
  },
  mmGoalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  mmGoalDepositBtn: {
    backgroundColor: '#10B981',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  mmGoalDepositBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  mmGoalDeleteBtn: {
    backgroundColor: '#7F1D1D',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  mmGoalDeleteBtnText: {
    color: '#FECACA',
    fontSize: 11,
  },

  /* Analytics & Insights */
  mmAnalyticsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mmAnalyticsTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  mmDistributionRow: {
    marginTop: 10,
  },
  mmDistributionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  mmDistributionIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  mmDistributionName: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  mmDistributionRight: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  mmDistributionAmount: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: 'bold',
    marginRight: 4,
  },
  mmDistributionPct: {
    color: '#94A3B8',
    fontSize: 12,
  },
  mmTipsCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  mmTipsTitle: {
    color: '#60A5FA',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  mmTipRow: {
    marginBottom: 6,
  },
  mmTipText: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 18,
  },

  /* Empty State */
  mmEmptyBox: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  mmEmptyIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  mmEmptyText: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 14,
    textAlign: 'center',
  },
  mmEmptyBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  mmEmptyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },

  /* Modals Common */
  mmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  mmModalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  mmModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  mmModalTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: 'bold',
  },
  mmModalCloseBtn: {
    padding: 4,
  },
  mmInputLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
    marginTop: 6,
  },
  mmInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#0F172A',
    fontSize: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  mmCatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mmCatChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#3B82F6',
  },
  mmCatChipText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  mmCatChipTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  mmTypeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mmTypeBtnExpense: {
    backgroundColor: '#7F1D1D',
    borderColor: '#EF4444',
  },
  mmTypeBtnIncome: {
    backgroundColor: '#064E3B',
    borderColor: '#10B981',
  },
  mmTypeBtnTransfer: {
    backgroundColor: '#1E3A8A',
    borderColor: '#3B82F6',
  },
  mmTypeBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
  mmTypeBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  mmIconChip: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mmIconChipActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#2563EB',
  },
  mmColorChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    marginBottom: 8,
  },
  mmColorChipActive: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  mmSubmitBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  mmSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
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





