/**
 * src/i18nService.js
 * App-wide Localization Service for TallyKhata (Bangla & English).
 * Ensures full coverage for all screens, navigation, quick actions, settings,
 * modals, Money Manager, and backup/restore dialogs.
 */

const BN_NUMS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

function formatNumber(num, lang = 'bn') {
  if (num === null || num === undefined) return '';
  const str = String(num);
  if (lang === 'bn') {
    return str.replace(/[0-9]/g, (d) => BN_NUMS[parseInt(d, 10)]);
  }
  return str;
}

function formatCurrency(amount, lang = 'bn', symbol = '৳') {
  const n = Number(amount) || 0;
  const parts = Math.abs(n).toLocaleString('en-IN');
  const formatted = lang === 'bn' ? formatNumber(parts, 'bn') : parts;
  const sign = n < 0 ? '-' : '';
  return `${sign}${symbol} ${formatted}`;
}

const STRINGS = {
  bn: {
    // Navigation & Tabs
    tab_home: 'হিসাব',
    tab_cashbox: 'ক্যাশবক্স',
    tab_tallypay: 'টালি-পে',
    tab_menu: 'মেন্যু',

    // Top Header & Search
    header_search_placeholder: 'কাস্টমার বা সাপ্লায়ার খুঁজুন...',
    header_total_due: 'মোট পাবো',
    header_total_owe: 'মোট দেবো',
    header_filter_all: 'সকল',
    header_filter_customer: 'কাস্টমার',
    header_filter_supplier: 'সাপ্লায়ার',

    // Quick Action Grid
    qa_cash_sale: 'নগদ বিক্রি',
    qa_expense: 'দোকান খরচ',
    qa_cash_purchase: 'নগদ ক্রয়',
    qa_owner_cash: 'মালিক জমা/তোলা',
    qa_money_manager: 'মানি ম্যানেজার',
    qa_multi_biz: 'ব্যবসা প্রতিষ্ঠান',
    qa_stock: 'স্টক হিসাব',
    qa_reports: 'রিপোর্টস',

    // Ledger Actions
    btn_give_credit: 'বাকি দিলাম',
    btn_receive_cash: 'টাকা পেলাম',
    btn_purchase: 'মাল ক্রয়',
    btn_payment: 'টাকা দিলাম',
    btn_save: 'সংরক্ষণ করুন',
    btn_cancel: 'বাতিল',
    btn_delete: 'মুছে ফেলুন',
    btn_edit: 'সম্পাদনা',
    btn_confirm: 'নিশ্চিত করুন',
    btn_add_account: 'নতুন হিসাব যোগ করুন',
    btn_back: 'ফিরে যান',

    // Cashbox
    cb_title: 'দৈনিক ক্যাশবক্স',
    cb_cash_in_hand: 'হাতে নগদ ক্যাশ',
    cb_today_in: 'আজকের জমা',
    cb_today_out: 'আজকের খরচ',
    cb_reconcile: 'ক্যাশ মিলান',
    cb_new_entry: 'নতুন এন্ট্রি',

    // Menu & Settings
    menu_title: 'মেন্যু ও সেটিংস',
    menu_sec_business: 'ব্যবসা পরিচালনা',
    menu_sec_features: 'জরুরি ফিচার',
    menu_sec_settings: 'সেটিংস ও অন্যান্য',
    menu_business_management: 'ব্যবসা পরিচালনা',
    menu_business_sub: 'বর্তমান: {name} • একাধিক ব্যবসা ও সুইচ',
    menu_money_manager: 'মানি ম্যানেজার (ব্যক্তিগত হিসাব)',
    menu_money_manager_sub: 'ব্যক্তিগত আয়-ব্যয়, ওয়ালেট ও বাজেট ট্র্যাকার',
    menu_appearance: 'থিম ও প্রদর্শন',
    menu_appearance_sub: 'লাইট ও ডার্ক মোড নির্বাচন করুন',
    theme_light: 'লাইট মোড',
    theme_dark: 'ডার্ক মোড',
    menu_language: 'ভাষা পরিবর্তন',
    menu_language_sub: 'বাংলা ও ইংরেজি ভাষার মধ্যে পরিবর্তন',
    lang_bn: 'বাংলা',
    lang_en: 'English',
    menu_shop_settings: 'দোকান ও ব্যবসা সেটিংস',
    menu_pin_security: 'পিন লক ও নিরাপত্তা',
    menu_backup_restore: 'ডাটা ব্যাকআপ ও রিস্টোর',
    menu_help_support: 'ব্যবহার নির্দেশিকা ও হেল্প',
    menu_refer: 'রেফার করুন',

    // Backup & Restore
    backup_title: 'ডাটা ব্যাকআপ ও ক্লাউড রিস্টোর',
    backup_now: 'এখন ব্যাকআপ নিন',
    backup_now_sub: 'খাতার সকল তথ্য ও লেনদেন গুগল ড্রাইভে নিরাপদ রাখুন',
    restore_online: 'অনলাইন থেকে রিস্টোর',
    restore_online_sub: 'গুগল ড্রাইভ ব্যাকআপ থেকে খাতা পুনরুদ্ধার করুন',
    export_file: 'ব্যাকআপ ফাইল তৈরি',
    export_file_sub: 'অফলাইন ব্যাকআপ JSON ডাটা কপি বা শেয়ার করুন',
    import_file: 'ফাইল থেকে রিস্টোর',
    import_file_sub: 'সংরক্ষিত ব্যাকআপ JSON কোড থেকে তথ্য ফিরিয়ে আনুন',
    backup_preview_title: 'ব্যাকআপ প্রিভিউ ও তথ্য যাচাই',
    backup_restore_all: 'সম্পূর্ণ রিস্টোর (ব্যবসা + ব্যক্তিগত)',
    backup_restore_biz_only: 'শুধু ব্যবসা খাতা',
    backup_restore_mm_only: 'শুধু ব্যক্তিগত হিসাব',
    backup_success: 'ব্যাকআপ সফল!',
    restore_success: 'রিস্টোর সফল!',

    // Money Manager
    mm_title: 'ব্যক্তিগত অর্থ ব্যবস্থাপনা',
    mm_badge_new: 'নতুন',
    mm_tab_txns: 'লেনদেন',
    mm_tab_wallets: 'ওয়ালেট',
    mm_tab_budgets: 'বাজেট',
    mm_tab_goals: 'লক্ষ্য',
    mm_tab_analytics: 'বিশ্লেষণ',
    mm_net_worth: 'মোট ব্যক্তিগত সম্পদ (Net Worth)',
    mm_income: 'মোট আয়',
    mm_expense: 'মোট ব্যয়',
    mm_balance: 'অবশিষ্ট উদ্বৃত্ত',
    mm_savings_rate: 'সঞ্চয়ের হার',
    mm_period_this_month: 'চলতি মাস',
    mm_period_last_month: 'গত মাস',
    mm_period_all_time: 'সব সময়',
    mm_add_txn: 'নতুন লেনদেন',
    mm_transfer: 'স্থানান্তর',
    mm_manage_categories: 'ক্যাটাগরি পরিচালনা',
    mm_recurring: 'পুনরাবৃত্ত লেনদেন',
    mm_preferences: 'পছন্দসমূহ',
    mm_empty_txns: 'এই সময়ে কোনো ব্যক্তিগত লেনদেন নেই',
    mm_empty_goals: 'কোনো সঞ্চয় লক্ষ্য যোগ করা হয়নি',
    mm_empty_recurring: 'কোনো নিয়মিত বিল বা বেতন শিডিউল নেই',
  },
  en: {
    // Navigation & Tabs
    tab_home: 'Tally',
    tab_cashbox: 'Cashbox',
    tab_tallypay: 'TallyPay',
    tab_menu: 'Menu',

    // Top Header & Search
    header_search_placeholder: 'Search customer or supplier...',
    header_total_due: 'Total Receivable',
    header_total_owe: 'Total Payable',
    header_filter_all: 'All',
    header_filter_customer: 'Customer',
    header_filter_supplier: 'Supplier',

    // Quick Action Grid
    qa_cash_sale: 'Cash Sale',
    qa_expense: 'Shop Expense',
    qa_cash_purchase: 'Cash Purchase',
    qa_owner_cash: 'Owner In/Out',
    qa_money_manager: 'Money Manager',
    qa_multi_biz: 'Businesses',
    qa_stock: 'Stock Ledger',
    qa_reports: 'Reports',

    // Ledger Actions
    btn_give_credit: 'Gave Credit',
    btn_receive_cash: 'Received Cash',
    btn_purchase: 'Purchase',
    btn_payment: 'Payment',
    btn_save: 'Save',
    btn_cancel: 'Cancel',
    btn_delete: 'Delete',
    btn_edit: 'Edit',
    btn_confirm: 'Confirm',
    btn_add_account: 'Add New Account',
    btn_back: 'Back',

    // Cashbox
    cb_title: 'Daily Cashbox',
    cb_cash_in_hand: 'Cash in Hand',
    cb_today_in: 'Today Cash In',
    cb_today_out: 'Today Cash Out',
    cb_reconcile: 'Reconcile',
    cb_new_entry: 'New Entry',

    // Menu & Settings
    menu_title: 'Menu & Settings',
    menu_sec_business: 'Business Management',
    menu_sec_features: 'Key Features',
    menu_sec_settings: 'Settings & More',
    menu_business_management: 'Business Management',
    menu_business_sub: 'Current: {name} • Multi-business & Switch',
    menu_money_manager: 'Money Manager (Personal Finance)',
    menu_money_manager_sub: 'Personal Income, Expenses, Wallets & Budgets',
    menu_appearance: 'Appearance & Theme',
    menu_appearance_sub: 'Choose Light or Dark mode',
    theme_light: 'Light Mode',
    theme_dark: 'Dark Mode',
    menu_language: 'Language',
    menu_language_sub: 'Switch between Bangla and English',
    lang_bn: 'বাংলা',
    lang_en: 'English',
    menu_shop_settings: 'Shop & Business Settings',
    menu_pin_security: 'PIN Lock & Security',
    menu_backup_restore: 'Data Backup & Restore',
    menu_help_support: 'Guide & Help Support',
    menu_share: 'Refer App',

    // Backup & Restore
    backup_title: 'Data Backup & Cloud Restore',
    backup_now: 'Backup Now',
    backup_now_sub: 'Safely store all ledgers & transactions in Google Drive',
    restore_online: 'Restore from Online',
    restore_online_sub: 'Restore your records from Google Drive backup',
    export_file: 'Export Backup File',
    export_file_sub: 'Copy or share offline JSON backup data',
    import_file: 'Restore from File',
    import_file_sub: 'Restore records from saved backup JSON text',
    backup_preview_title: 'Backup Preview & Verification',
    backup_restore_all: 'Full Restore (Business + Personal)',
    backup_restore_biz_only: 'Business Records Only',
    backup_restore_mm_only: 'Personal Finance Only',
    backup_success: 'Backup Successful!',
    restore_success: 'Restore Successful!',

    // Money Manager
    mm_title: 'Personal Money Manager',
    mm_badge_new: 'NEW',
    mm_tab_txns: 'Transactions',
    mm_tab_wallets: 'Wallets',
    mm_tab_budgets: 'Budgets',
    mm_tab_goals: 'Goals',
    mm_tab_analytics: 'Analytics',
    mm_net_worth: 'Total Net Worth',
    mm_income: 'Total Income',
    mm_expense: 'Total Expense',
    mm_balance: 'Net Savings',
    mm_savings_rate: 'Savings Rate',
    mm_period_this_month: 'This Month',
    mm_period_last_month: 'Last Month',
    mm_period_all_time: 'All Time',
    mm_add_txn: 'New Transaction',
    mm_transfer: 'Transfer',
    mm_manage_categories: 'Manage Categories',
    mm_recurring: 'Recurring Schedules',
    mm_preferences: 'Preferences',
    mm_empty_txns: 'No personal transactions in this period',
    mm_empty_goals: 'No savings goals set yet',
    mm_empty_recurring: 'No recurring bills or income scheduled',
  },
};

function t(key, lang = 'bn', params = {}) {
  const dictionary = STRINGS[lang] || STRINGS.bn;
  let text = dictionary[key] || STRINGS.bn[key] || key;
  if (params && typeof params === 'object') {
    Object.keys(params).forEach((k) => {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(params[k]));
    });
  }
  return text;
}

module.exports = {
  STRINGS,
  t,
  formatNumber,
  formatCurrency,
};
