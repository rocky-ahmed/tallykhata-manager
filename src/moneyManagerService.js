// src/moneyManagerService.js
// Dedicated backend engine and business logic for TallyKhata Personal Money Manager
// 100% Isolated from business accounting datasets

const MM_STORAGE_KEY = "@tallykhata_personal_money_manager_v2";
const MM_SCHEMA_VERSION = 3;

const DEFAULT_PREFERENCES = {
  defaultPeriod: "this_month", // "this_month" | "last_month" | "all_time"
  currencySymbol: "৳",
  sortOrder: "newest", // "newest" | "oldest" | "amount_high" | "amount_low"
  showNetWorthCard: true,
  showSavingsRateCard: true,
  showTipsCard: true,
  customRange: null,
};

const DEFAULT_ACCOUNTS = [
  { id: "acc_cash", name: "নগদ ক্যাশ (Cash)", type: "cash", balance: 15000, icon: "💵", color: "#10B981", isArchived: false },
  { id: "acc_bank", name: "ব্যাংক অ্যাকাউন্ট (Bank)", type: "bank", balance: 52000, icon: "🏦", color: "#3B82F6", isArchived: false },
  { id: "acc_bkash", name: "বিকাশ ওয়ালেট (bKash)", type: "mfs", balance: 8500, icon: "📱", color: "#EC4899", isArchived: false },
  { id: "acc_nagad", name: "নগদ ওয়ালেট (Nagad)", type: "mfs", balance: 4200, icon: "💳", color: "#F97316", isArchived: false },
];

const DEFAULT_CATEGORIES = [
  { id: "cat_food", name: "খাবার ও মুদি বাজার", type: "expense", icon: "🍲", color: "#EF4444", budget: 15000, isArchived: false },
  { id: "cat_transport", name: "যাতায়াত ও জ্বালানি", type: "expense", icon: "🚌", color: "#F59E0B", budget: 5000, isArchived: false },
  { id: "cat_utility", name: "বিল ও ইউটিলিটি", type: "expense", icon: "💡", color: "#3B82F6", budget: 8000, isArchived: false },
  { id: "cat_shopping", name: "কেনাকাটা ও পরিবার", type: "expense", icon: "🛍️", color: "#EC4899", budget: 10000, isArchived: false },
  { id: "cat_health", name: "চিকিৎসা ও ওষুধ", type: "expense", icon: "💊", color: "#10B981", budget: 4000, isArchived: false },
  { id: "cat_education", name: "শিক্ষা ও পড়াশোনা", type: "expense", icon: "📚", color: "#8B5CF6", budget: 6000, isArchived: false },
  { id: "cat_entertainment", name: "বিনোদন ও নাশতা", type: "expense", icon: "☕", color: "#6366F1", budget: 3000, isArchived: false },
  { id: "cat_other_exp", name: "অন্যান্য ব্যয়", type: "expense", icon: "📦", color: "#6B7280", budget: 4000, isArchived: false },
  { id: "cat_salary", name: "মাসিক বেতন ও সম্মানী", type: "income", icon: "💰", color: "#10B981", budget: 0, isArchived: false },
  { id: "cat_business_profit", name: "ব্যবসার ব্যক্তিগত লভ্যাংশ", type: "income", icon: "📈", color: "#059669", budget: 0, isArchived: false },
  { id: "cat_investment", name: "বিনিয়োগ ও ডিভিডেন্ড", type: "income", icon: "🏛️", color: "#2563EB", budget: 0, isArchived: false },
  { id: "cat_other_inc", name: "অন্যান্য প্রাপ্তি / উপহার", type: "income", icon: "🎁", color: "#14B8A6", budget: 0, isArchived: false },
];


const DEFAULT_RECURRING = [
  {
    id: "rec_rent",
    title: "বাসা ভাড়া (House Rent)",
    type: "expense",
    amount: 15000,
    categoryId: "cat_utility",
    accountId: "acc_bank",
    fromAccountId: null,
    toAccountId: null,
    cadence: "monthly",
    startDate: "2026-10-01",
    nextDueDate: "2026-11-01",
    lastProcessedDate: "2026-10-01",
    isActive: true,
    note: "মাসিক বাসা ভাড়া",
    payee: "বাড়িওয়ালা",
  },
  {
    id: "rec_internet",
    title: "ইন্টারনেট বিল (WiFi)",
    type: "expense",
    amount: 1200,
    categoryId: "cat_utility",
    accountId: "acc_bkash",
    fromAccountId: null,
    toAccountId: null,
    cadence: "monthly",
    startDate: "2026-10-05",
    nextDueDate: "2026-11-05",
    lastProcessedDate: "2026-10-05",
    isActive: true,
    note: "লিংক৩ ফাইবার বিল",
    payee: "লিংক৩",
  },
];

const DEFAULT_GOALS = [
  {
    id: "goal_emergency",
    title: "জরুরি তহবিল (Emergency Fund)",
    targetAmount: 50000,
    savedAmount: 20000,
    targetDate: "2026-12-31",
    icon: "🛡️",
    color: "#10B981",
    note: "৬ মাসের পরিবারের জীবনযাত্রার ব্যয়",
  },
  {
    id: "goal_eid",
    title: "ঈদ ও উৎসব সঞ্চয় (Festival Fund)",
    targetAmount: 25000,
    savedAmount: 12000,
    targetDate: "2027-04-01",
    icon: "🌙",
    color: "#3B82F6",
    note: "পরিবারের উপহার ও কেনাকাটা",
  },
];

function getDefaultState(todayDateStr) {
  const d = todayDateStr || new Date().toISOString().split("T")[0];
  return {
    version: MM_SCHEMA_VERSION,
    overallMonthlyBudget: 40000,
    preferences: { ...DEFAULT_PREFERENCES },
    accounts: [...DEFAULT_ACCOUNTS],
    categories: [...DEFAULT_CATEGORIES],
    goals: [...DEFAULT_GOALS],
    recurring: [...DEFAULT_RECURRING],
    transactions: [
      { id: "mmtxn_1", type: "income", amount: 60000, categoryId: "cat_salary", accountId: "acc_bank", date: d, time: "10:00 AM", note: "মাসিক বেতন জমা", payee: "অফিস বেতন" },
      { id: "mmtxn_2", type: "expense", amount: 1450, categoryId: "cat_food", accountId: "acc_cash", date: d, time: "01:30 PM", note: "সাপ্তাহিক বাজার ও সদাই", payee: "স্বপ্ন সুপারশপ" },
      { id: "mmtxn_3", type: "expense", amount: 1850, categoryId: "cat_utility", accountId: "acc_bkash", date: d, time: "04:15 PM", note: "বিদ্যুৎ ও ওয়াইফাই বিল", payee: "ডেসকো ও লিংক৩" },
      { id: "mmtxn_4", type: "transfer", amount: 5000, fromAccountId: "acc_bank", toAccountId: "acc_bkash", date: d, time: "09:00 AM", note: "ব্যাংক হতে বিকাশে ট্রান্সফার", payee: "" },
      { id: "mmtxn_5", type: "expense", amount: 650, categoryId: "cat_transport", accountId: "acc_cash", date: d, time: "Yesterday", note: "সিএনজি ও যাতায়াত ভাড়া", payee: "যাতায়াত" },
    ],
  };
}

function sanitizeState(parsed, defaultState) {
  const def = defaultState || getDefaultState();
  if (!parsed || typeof parsed !== "object") return def;
  const accounts = Array.isArray(parsed.accounts) && parsed.accounts.length > 0
    ? parsed.accounts.map(acc => ({
        ...acc,
        isArchived: Boolean(acc.isArchived),
      }))
    : def.accounts;

  const existingCatMap = new Map();
  if (Array.isArray(parsed.categories)) {
    parsed.categories.forEach(c => {
      if (c && c.id) existingCatMap.set(c.id, c);
    });
  }
  const mergedCategories = def.categories.map(defCat => {
    const existing = existingCatMap.get(defCat.id);
    if (!existing) return defCat;
    return {
      ...defCat,
      ...existing,
      budget: existing.budget !== undefined ? Math.max(0, parseFloat(existing.budget) || 0) : 0,
      isArchived: Boolean(existing.isArchived),
    };
  });
  existingCatMap.forEach((cat, id) => {
    if (!mergedCategories.some(c => c.id === id)) {
      mergedCategories.push({
        ...cat,
        budget: cat.budget !== undefined ? Math.max(0, parseFloat(cat.budget) || 0) : 0,
        isArchived: Boolean(cat.isArchived),
      });
    }
  });

  const transactions = Array.isArray(parsed.transactions)
    ? parsed.transactions.map(t => ({
        ...t,
        payee: t.payee || "",
      }))
    : def.transactions;

  const goals = Array.isArray(parsed.goals)
    ? parsed.goals
    : (def.goals || []);

  const recurring = Array.isArray(parsed.recurring)
    ? parsed.recurring.map(r => ({
        ...r,
        isActive: r.isActive !== undefined ? Boolean(r.isActive) : true,
      }))
    : (def.recurring || []);

  const validPeriods = ["this_month", "last_month", "all_time", "custom"];
  const validSortOrders = ["newest", "oldest", "amount_high", "amount_low"];
  const rawPrefs = parsed.preferences && typeof parsed.preferences === "object" ? parsed.preferences : {};
  const customRange = rawPrefs.customRange && typeof rawPrefs.customRange === "object" ? { startDate: typeof rawPrefs.customRange.startDate === "string" ? rawPrefs.customRange.startDate.trim() : "", endDate: typeof rawPrefs.customRange.endDate === "string" ? rawPrefs.customRange.endDate.trim() : "" } : null;
  const preferences = {
    ...DEFAULT_PREFERENCES,
    ...rawPrefs,
    defaultPeriod: validPeriods.includes(rawPrefs.defaultPeriod) ? rawPrefs.defaultPeriod : DEFAULT_PREFERENCES.defaultPeriod,
    sortOrder: validSortOrders.includes(rawPrefs.sortOrder) ? rawPrefs.sortOrder : DEFAULT_PREFERENCES.sortOrder,
    currencySymbol: typeof rawPrefs.currencySymbol === "string" && rawPrefs.currencySymbol.trim() ? rawPrefs.currencySymbol.trim() : DEFAULT_PREFERENCES.currencySymbol,
    showNetWorthCard: rawPrefs.showNetWorthCard !== false,
    showSavingsRateCard: rawPrefs.showSavingsRateCard !== false,
    showTipsCard: rawPrefs.showTipsCard !== false,
  };

  const overallMonthlyBudget = typeof parsed.overallMonthlyBudget === "number" && parsed.overallMonthlyBudget >= 0
    ? parsed.overallMonthlyBudget
    : (def.overallMonthlyBudget || 0);

  return {
    version: MM_SCHEMA_VERSION,
    overallMonthlyBudget,
    preferences,
    accounts,
    categories: mergedCategories,
    goals,
    recurring,
    transactions,
  };
}

function calculateNetWorth(accountsOrState) {
  const accounts = Array.isArray(accountsOrState)
    ? accountsOrState
    : accountsOrState && Array.isArray(accountsOrState.accounts)
    ? accountsOrState.accounts
    : [];
  return accounts
    .filter(a => !a.isArchived)
    .reduce((sum, acc) => sum + Number(acc.balance || 0), 0);
}

function toEnglishDigits(str) {
  if (!str) return '';
  const bnToEn = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
  return String(str).replace(/[০-৯]/g, d => bnToEn[d] || d);
}

function isValidCalendarDate(year, month, day) {
  if (isNaN(year) || isNaN(month) || isNaN(day)) return false;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const dt = new Date(Date.UTC(year, month - 1, day));
  return dt.getUTCFullYear() === year && (dt.getUTCMonth() + 1) === month && dt.getUTCDate() === day;
}

function shiftDateStr(dateStr, days = 0) {
  const norm = normalizeToLocalDate(dateStr) || new Date().toISOString().split('T')[0];
  const parts = norm.split('-').map(Number);
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + Number(days || 0)));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function normalizeToLocalDate(dateStr) {
  if (!dateStr) return '';
  const str = toEnglishDigits(String(dateStr)).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  const dt = new Date(str);
  if (!isNaN(dt.getTime())) {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }
  return str;
}

function validateCustomDateRange(startDate, endDate) {
  if (!startDate || !endDate) {
    return { valid: false, error: 'missing_dates' };
  }
  const sStr = toEnglishDigits(String(startDate)).trim();
  const eStr = toEnglishDigits(String(endDate)).trim();
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(sStr) || !dateRegex.test(eStr)) {
    return { valid: false, error: 'invalid_format' };
  }
  const sParts = sStr.split('-').map(Number);
  const eParts = eStr.split('-').map(Number);
  if (sParts[1] < 1 || sParts[1] > 12 || sParts[2] < 1 || sParts[2] > 31) {
    return { valid: false, error: 'invalid_format' };
  }
  if (eParts[1] < 1 || eParts[1] > 12 || eParts[2] < 1 || eParts[2] > 31) {
    return { valid: false, error: 'invalid_format' };
  }
  if (!isValidCalendarDate(sParts[0], sParts[1], sParts[2]) || !isValidCalendarDate(eParts[0], eParts[1], eParts[2])) {
    return { valid: false, error: 'invalid_calendar_date' };
  }
  if (sStr > eStr) {
    return { valid: false, error: 'end_before_start' };
  }
  return { valid: true, startDate: sStr, endDate: eStr };
}

function isDateInPeriod(dateStr, period, customRange = null) {
  if (!dateStr || period === "all_time") return true;
  const normalizedDate = normalizeToLocalDate(dateStr);
  if (period === "custom") {
    if (!customRange || !customRange.startDate || !customRange.endDate) return true;
    return normalizedDate >= customRange.startDate && normalizedDate <= customRange.endDate;
  }
  const now = new Date();
  const parts = normalizedDate.split("-").map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return true;
  const y = parts[0];
  const m = parts[1]; // 1-12

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (period === "this_month") {
    return y === currentYear && m === currentMonth;
  }
  if (period === "last_month") {
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    return y === prevYear && m === prevMonth;
  }
  return true;
}

function calculateCashFlow(transactions, period, customRange = null) {
  if (!Array.isArray(transactions)) {
    return { totalIncome: 0, totalExpense: 0, totalTransfer: 0, netSavings: 0, savingsRate: 0 };
  }
  let totalIncome = 0;
  let totalExpense = 0;
  let totalTransfer = 0;

  for (const t of transactions) {
    if (period && !isDateInPeriod(t.date, period, customRange)) continue;
    const amt = Number(t.amount || 0);
    if (t.type === "income") totalIncome += amt;
    else if (t.type === "expense") totalExpense += amt;
    else if (t.type === "transfer") totalTransfer += amt;
  }

  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((netSavings / totalIncome) * 100)) : 0;

  return { totalIncome, totalExpense, totalTransfer, netSavings, savingsRate };
}

function calculateCategoryBudgets(arg1, arg2, arg3, arg4) {
  let categories = [];
  let transactions = [];
  let period = null;
  let customRange = null;

  if (Array.isArray(arg1)) {
    categories = arg1;
    transactions = Array.isArray(arg2) ? arg2 : [];
    period = arg3;
    customRange = arg4 || null;
  } else if (arg1 && typeof arg1 === "object") {
    categories = Array.isArray(arg1.categories) ? arg1.categories : [];
    transactions = Array.isArray(arg1.transactions) ? arg1.transactions : [];
    period = arg2;
    customRange = arg3 || null;
  } else {
    return [];
  }

  const expTransactions = (transactions || []).filter(t => {
    if (t.type !== "expense") return false;
    if (period && !isDateInPeriod(t.date, period, customRange)) return false;
    return true;
  });

  const spentMap = new Map();
  for (const t of expTransactions) {
    if (t.categoryId) {
      spentMap.set(t.categoryId, (spentMap.get(t.categoryId) || 0) + Number(t.amount || 0));
    }
  }

  return categories
    .filter(cat => cat.type === "expense")
    .map(cat => {
      const budget = Number(cat.budget || 0);
      const spent = spentMap.get(cat.id) || 0;
      const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
      const remaining = Math.max(0, budget - spent);
      const isOver = budget > 0 && spent > budget;
      return {
        ...cat,
        categoryId: cat.id,
        spent,
        pct,
        remaining,
        isOver,
        hasBudget: budget > 0,
      };
    });
}

function calculateCategoryDistribution(arg1, arg2, arg3, arg4) {
  let categories = [];
  let transactions = [];
  let period = null;
  let customRange = null;

  if (Array.isArray(arg1)) {
    categories = arg1;
    transactions = Array.isArray(arg2) ? arg2 : [];
    period = arg3;
    customRange = arg4 || null;
  } else if (arg1 && typeof arg1 === "object") {
    categories = Array.isArray(arg1.categories) ? arg1.categories : [];
    transactions = Array.isArray(arg1.transactions) ? arg1.transactions : [];
    period = arg2;
    customRange = arg3 || null;
  }

  const budgets = calculateCategoryBudgets(categories, transactions, period, customRange);
  const totalExpense = budgets.reduce((sum, b) => sum + b.spent, 0);

  const distributionList = budgets
    .filter(b => b.spent > 0)
    .map(b => {
      const share = totalExpense > 0 ? Math.round((b.spent / totalExpense) * 100) : 0;
      return {
        categoryId: b.id,
        categoryName: b.name,
        icon: b.icon,
        color: b.color,
        amount: b.spent,
        percentage: share,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  // Return dual interface: array-like that also has .totalExpense and .distribution properties
  const res = [...distributionList];
  res.totalExpense = totalExpense;
  res.distribution = distributionList;
  return res;
}

function filterAndSortTransactions(txnsOrState, filterParams = {}) {
  const transactions = Array.isArray(txnsOrState)
    ? txnsOrState
    : txnsOrState && Array.isArray(txnsOrState.transactions)
    ? txnsOrState.transactions
    : [];
  const { filterType, accountId, categoryId, searchQuery, period, sortOrder, customRange } = filterParams;

  let result = transactions.filter(t => {
    if (filterType && filterType !== "all" && t.type !== filterType) {
      return false;
    }
    if (accountId && accountId !== "all") {
      if (t.type === "transfer") {
        if (t.fromAccountId !== accountId && t.toAccountId !== accountId) return false;
      } else {
        if (t.accountId !== accountId) return false;
      }
    }
    if (categoryId && categoryId !== "all" && t.categoryId !== categoryId) {
      return false;
    }
    if (period && !isDateInPeriod(t.date, period, customRange)) {
      return false;
    }
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const noteMatch = (t.note || "").toLowerCase().includes(q);
      const payeeMatch = (t.payee || "").toLowerCase().includes(q);
      const amtMatch = String(t.amount || "").includes(q);
      if (!noteMatch && !payeeMatch && !amtMatch) return false;
    }
    return true;
  });

  const order = sortOrder || "newest";
  result.sort((a, b) => {
    if (order === "newest") {
      const dateA = a.date || "";
      const dateB = b.date || "";
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      return (b.id || "").localeCompare(a.id || "");
    }
    if (order === "oldest") {
      const dateA = a.date || "";
      const dateB = b.date || "";
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return (a.id || "").localeCompare(b.id || "");
    }
    if (order === "amount_high") {
      return (b.amount || 0) - (a.amount || 0);
    }
    if (order === "amount_low") {
      return (a.amount || 0) - (b.amount || 0);
    }
    return 0;
  });

  return result;
}

function filterTransactions(transactions, filterParams) {
  return filterAndSortTransactions(transactions, filterParams);
}

function calculatePeriodMetrics(state, period = "this_month", customRange = null) {
  const txns = filterAndSortTransactions(state.transactions || [], { period, customRange });
  const totalIncome = txns.filter(t => t.type === "income").reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalExpense = txns.filter(t => t.type === "expense").reduce((sum, t) => sum + (t.amount || 0), 0);
  const netSavings = totalIncome - totalExpense;

  const categoryExpenses = {};
  txns.forEach(t => {
    if (t.type === "expense" && t.categoryId) {
      categoryExpenses[t.categoryId] = (categoryExpenses[t.categoryId] || 0) + t.amount;
    }
  });

  const categoryBreakdown = Object.keys(categoryExpenses).map(catId => {
    const cat = (state.categories || []).find(c => c.id === catId) || { name: "অন্যান্য", icon: "📦", color: "#6B7280" };
    const amount = categoryExpenses[catId];
    const percent = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
    return { catId, cat, amount, percent };
  }).sort((a, b) => b.amount - a.amount);

  const overallBudget = state.overallMonthlyBudget || 0;
  const overallBudgetPercent = overallBudget > 0 ? Math.min(100, Math.round((totalExpense / overallBudget) * 100)) : 0;
  const isOverallBudgetOver = overallBudget > 0 && totalExpense > overallBudget;
  const overallBudgetRemaining = overallBudget > 0 ? overallBudget - totalExpense : 0;

  const netWorth = calculateNetWorth(state);
  return {
    period,
    netWorth,
    income: totalIncome,
    expense: totalExpense,
    totalIncome,
    totalExpense,
    netSavings,
    savingsRate: totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0,
    categoryBreakdown,
    overallBudget,
    overallBudgetLimit: overallBudget,
    overallBudgetPercent,
    overallBudgetPct: overallBudgetPercent,
    isOverallBudgetOver,
    overallBudgetRemaining,
  };
}

function addTransaction(state, params) {
  const { type, amount, categoryId, accountId, fromAccountId, toAccountId, note, payee, date, time } = params;
  const amt = parseFloat(amount);
  if (!amt || isNaN(amt) || amt <= 0) {
    throw new Error("দয়া করে সঠিক ইতিবাচক পরিমাণ দিন");
  }

  const d = date || new Date().toISOString().split("T")[0];
  const t = time || new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  if (type === "transfer") {
    if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) {
      throw new Error("উৎস এবং গন্তব্য অ্যাকাউন্ট ভিন্ন ও নির্দিষ্ট হতে হবে");
    }
    const fromAcc = (state.accounts || []).find(a => a.id === fromAccountId);
    const toAcc = (state.accounts || []).find(a => a.id === toAccountId);
    if (!fromAcc || !toAcc) {
      throw new Error("উৎস বা গন্তব্য অ্যাকাউন্ট পাওয়া যায়নি");
    }
    if (fromAcc.isArchived || toAcc.isArchived) {
      throw new Error("আর্কাইভ করা ওয়ালেটের মধ্যে স্থানান্তর সম্ভব নয়");
    }
    if ((fromAcc.balance || 0) < amt) {
      throw new Error("উৎস অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই");
    }

    const newTxn = {
      id: "mmtxn_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      type: "transfer",
      amount: amt,
      fromAccountId,
      toAccountId,
      date: d,
      time: t,
      note: (note || "").trim() || "অ্যাকাউন্ট স্থানান্তর",
      payee: (payee || "").trim(),
    };

    const updatedAccounts = (state.accounts || []).map(acc => {
      if (acc.id === fromAccountId) return { ...acc, balance: (acc.balance || 0) - amt };
      if (acc.id === toAccountId) return { ...acc, balance: (acc.balance || 0) + amt };
      return acc;
    });

    return {
      ...state,
      accounts: updatedAccounts,
      transactions: [newTxn, ...(state.transactions || [])],
    };
  }

  if (!accountId) {
    throw new Error("দয়া করে একটি অ্যাকাউন্ট নির্বাচন করুন");
  }
  const acc = (state.accounts || []).find(a => a.id === accountId);
  if (!acc) {
    throw new Error("নির্বাচিত অ্যাকাউন্ট পাওয়া যায়নি");
  }
  if (acc.isArchived) {
    throw new Error("আর্কাইভ করা ওয়ালেটে লেনদেন যোগ করা যাবে না");
  }

  if (categoryId) {
    const cat = (state.categories || []).find(c => c.id === categoryId);
    if (cat && cat.isArchived) {
      throw new Error("আর্কাইভ করা ক্যাটাগরিতে নতুন লেনদেন যুক্ত করা যাবে না");
    }
    if (cat && cat.type !== type) {
      throw new Error("ক্যাটাগরির ধরন এবং লেনদেনের ধরন সামঞ্জস্যপূর্ণ নয়");
    }
  }

  const newTxn = {
    id: "mmtxn_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    type,
    amount: amt,
    categoryId: categoryId || (type === "income" ? "cat_other_inc" : "cat_other_exp"),
    accountId,
    date: d,
    time: t,
    note: (note || "").trim() || (type === "income" ? "আয় প্রাপ্তি" : "ব্যক্তিগত ব্যয়"),
    payee: (payee || "").trim(),
  };

  const updatedAccounts = (state.accounts || []).map(a => {
    if (a.id === accountId) {
      const diff = type === "income" ? amt : -amt;
      return { ...a, balance: (a.balance || 0) + diff };
    }
    return a;
  });

  return {
    ...state,
    accounts: updatedAccounts,
    transactions: [newTxn, ...(state.transactions || [])],
  };
}

function editTransaction(state, txnId, newParams) {
  const txn = (state.transactions || []).find(t => t.id === txnId);
  if (!txn) {
    throw new Error("সম্পাদনার জন্য লেনদেনটি পাওয়া যায়নি");
  }

  // 1. Revert previous impact of old txn
  let tempAccounts = [...(state.accounts || [])];
  const oldAmt = Number(txn.amount || 0);
  if (txn.type === "expense") {
    tempAccounts = tempAccounts.map(a => a.id === txn.accountId ? { ...a, balance: (a.balance || 0) + oldAmt } : a);
  } else if (txn.type === "income") {
    tempAccounts = tempAccounts.map(a => a.id === txn.accountId ? { ...a, balance: (a.balance || 0) - oldAmt } : a);
  } else if (txn.type === "transfer") {
    tempAccounts = tempAccounts.map(a => {
      if (a.id === txn.fromAccountId) return { ...a, balance: (a.balance || 0) + oldAmt };
      if (a.id === txn.toAccountId) return { ...a, balance: (a.balance || 0) - oldAmt };
      return a;
    });
  }

  // 2. Validate new params with fallback to existing transaction
  const type = newParams.type || txn.type;
  const amt = newParams.amount !== undefined ? parseFloat(newParams.amount) : parseFloat(txn.amount);
  if (!amt || isNaN(amt) || amt <= 0) {
    throw new Error("দয়া করে সঠিক ইতিবাচক পরিমাণ দিন");
  }
  const accountId = newParams.accountId !== undefined ? newParams.accountId : txn.accountId;
  const fromAccountId = newParams.fromAccountId !== undefined ? newParams.fromAccountId : txn.fromAccountId;
  const toAccountId = newParams.toAccountId !== undefined ? newParams.toAccountId : txn.toAccountId;
  const categoryId = newParams.categoryId !== undefined ? newParams.categoryId : txn.categoryId;
  const d = newParams.date || txn.date || new Date().toISOString().split("T")[0];
  const t = newParams.time || txn.time || new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const note = newParams.note !== undefined ? newParams.note : txn.note;
  const payee = newParams.payee !== undefined ? newParams.payee : txn.payee;

  if (type === "transfer") {
    if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) {
      throw new Error("উৎস এবং গন্তব্য অ্যাকাউন্ট ভিন্ন ও নির্দিষ্ট হতে হবে");
    }
    const fromAcc = tempAccounts.find(a => a.id === fromAccountId);
    const toAcc = tempAccounts.find(a => a.id === toAccountId);
    if (!fromAcc || !toAcc) {
      throw new Error("উৎস বা গন্তব্য অ্যাকাউন্ট পাওয়া যায়নি");
    }
    if (fromAcc.isArchived || toAcc.isArchived) {
      throw new Error("আর্কাইভ করা ওয়ালেটের মধ্যে স্থানান্তর সম্ভব নয়");
    }
    if ((fromAcc.balance || 0) < amt) {
      throw new Error("উৎস অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই");
    }

    tempAccounts = tempAccounts.map(acc => {
      if (acc.id === fromAccountId) return { ...acc, balance: (acc.balance || 0) - amt };
      if (acc.id === toAccountId) return { ...acc, balance: (acc.balance || 0) + amt };
      return acc;
    });
  } else {
    if (!accountId) {
      throw new Error("দয়া করে একটি অ্যাকাউন্ট নির্বাচন করুন");
    }
    const acc = tempAccounts.find(a => a.id === accountId);
    if (!acc) {
      throw new Error("নির্বাচিত অ্যাকাউন্ট পাওয়া যায়নি");
    }
    if (acc.isArchived) {
      throw new Error("আর্কাইভ করা ওয়ালেটে লেনদেন যোগ করা যাবে না");
    }
    if (categoryId) {
      const cat = (state.categories || []).find(c => c.id === categoryId);
      if (cat && cat.isArchived) {
        throw new Error("আর্কাইভ করা ক্যাটাগরিতে নতুন লেনদেন যুক্ত করা যাবে না");
      }
      if (cat && cat.type !== type) {
        throw new Error("ক্যাটাগরির ধরন এবং লেনদেনের ধরন সামঞ্জস্যপূর্ণ নয়");
      }
    }

    tempAccounts = tempAccounts.map(a => {
      if (a.id === accountId) {
        const diff = type === "income" ? amt : -amt;
        return { ...a, balance: (a.balance || 0) + diff };
      }
      return a;
    });
  }

  let updatedGoals = state.goals || [];
  if (txn.goalId) {
    const diff = amt - oldAmt;
    updatedGoals = updatedGoals.map(g => {
      if (g.id === txn.goalId) {
        if (type === "expense") {
          return { ...g, savedAmount: Math.max(0, (g.savedAmount || 0) + diff) };
        } else if (type === "income") {
          return { ...g, savedAmount: Math.max(0, (g.savedAmount || 0) - diff) };
        }
      }
      return g;
    });
  }

  const updatedTxn = {
    ...txn,
    type,
    amount: amt,
    categoryId: type === "transfer" ? null : (categoryId || (type === "income" ? "cat_other_inc" : "cat_other_exp")),
    accountId: type === "transfer" ? null : accountId,
    fromAccountId: type === "transfer" ? fromAccountId : null,
    toAccountId: type === "transfer" ? toAccountId : null,
    goalId: txn.goalId || null,
    date: d,
    time: t,
    note: (note !== undefined ? note : txn.note || "").trim() || (type === "transfer" ? "অ্যাকাউন্ট স্থানান্তর" : type === "income" ? "আয় প্রাপ্তি" : "ব্যক্তিগত ব্যয়"),
    payee: (payee !== undefined ? payee : (txn.payee || "")).trim(),
  };

  const updatedTransactions = (state.transactions || []).map(t => t.id === txnId ? updatedTxn : t);

  return {
    ...state,
    accounts: tempAccounts,
    goals: updatedGoals,
    transactions: updatedTransactions,
  };
}

function deleteTransaction(state, txnId) {
  const txn = (state.transactions || []).find(t => t.id === txnId);
  if (!txn) {
    throw new Error("মুছে ফেলার জন্য লেনদেনটি পাওয়া যায়নি");
  }

  let updatedAccounts = [...(state.accounts || [])];
  const amt = Number(txn.amount || 0);

  if (txn.type === "expense") {
    updatedAccounts = updatedAccounts.map(acc =>
      acc.id === txn.accountId ? { ...acc, balance: (acc.balance || 0) + amt } : acc
    );
  } else if (txn.type === "income") {
    updatedAccounts = updatedAccounts.map(acc =>
      acc.id === txn.accountId ? { ...acc, balance: (acc.balance || 0) - amt } : acc
    );
  } else if (txn.type === "transfer") {
    updatedAccounts = updatedAccounts.map(acc => {
      if (acc.id === txn.fromAccountId) return { ...acc, balance: (acc.balance || 0) + amt };
      if (acc.id === txn.toAccountId) return { ...acc, balance: (acc.balance || 0) - amt };
      return acc;
    });
  }

  let updatedGoals = state.goals || [];
  if (txn.goalId) {
    updatedGoals = updatedGoals.map(g => {
      if (g.id === txn.goalId) {
        if (txn.type === "expense") {
          return { ...g, savedAmount: Math.max(0, (g.savedAmount || 0) - amt) };
        } else if (txn.type === "income") {
          return { ...g, savedAmount: (g.savedAmount || 0) + amt };
        }
      }
      return g;
    });
  }

  const updatedTransactions = (state.transactions || []).filter(t => t.id !== txnId);

  return {
    ...state,
    accounts: updatedAccounts,
    goals: updatedGoals,
    transactions: updatedTransactions,
  };
}

function addAccount(state, params) {
  const { name, type, balance, icon, color } = params;
  if (!name || !name.trim()) {
    throw new Error("অ্যাকাউন্টের নাম আবশ্যক");
  }
  const initBal = parseFloat(balance) || 0;
  const newAcc = {
    id: "acc_" + Date.now(),
    name: name.trim(),
    type: type || "bank",
    balance: initBal,
    icon: icon || (type === "cash" ? "💵" : type === "mfs" ? "📱" : "🏦"),
    color: color || (type === "cash" ? "#10B981" : type === "bank" ? "#3B82F6" : "#EC4899"),
    isArchived: false,
  };

  return {
    ...state,
    accounts: [...(state.accounts || []), newAcc],
  };
}

function updateAccount(state, accountId, params) {
  const { name, icon, color } = params;
  const acc = (state.accounts || []).find(a => a.id === accountId);
  if (!acc) throw new Error("অ্যাকাউন্ট পাওয়া যায়নি");

  const updatedAccounts = (state.accounts || []).map(a => {
    if (a.id === accountId) {
      return {
        ...a,
        name: name ? name.trim() : a.name,
        icon: icon || a.icon,
        color: color || a.color,
      };
    }
    return a;
  });

  return {
    ...state,
    accounts: updatedAccounts,
  };
}

function archiveAccount(state, accountId, isArchived = true) {
  const acc = (state.accounts || []).find(a => a.id === accountId);
  if (!acc) throw new Error("অ্যাকাউন্ট পাওয়া যায়নি");

  if (isArchived) {
    const active = (state.accounts || []).filter(a => a.id !== accountId && !a.isArchived);
    if (active.length === 0) {
      throw new Error("কমপক্ষে একটি সক্রিয় অ্যাকাউন্ট বিদ্যমান থাকতে হবে");
    }
  }

  const updatedAccounts = (state.accounts || []).map(a => {
    if (a.id === accountId) {
      return { ...a, isArchived: Boolean(isArchived) };
    }
    return a;
  });

  return {
    ...state,
    accounts: updatedAccounts,
  };
}

function deleteAccount(state, accountId) {
  if ((state.accounts || []).length <= 1) {
    throw new Error("কমপক্ষে একটি অ্যাকাউন্ট বিদ্যমান থাকতে হবে");
  }
  const hasTxns = (state.transactions || []).some(
    t => t.accountId === accountId || t.fromAccountId === accountId || t.toAccountId === accountId
  );
  if (hasTxns) {
    throw new Error("এই অ্যাকাউন্টের সাথে লেনদেনের ইতিহাস যুক্ত থাকায় এটি সরাসরি মুছে ফেলা যাবে না");
  }
  const hasRecurring = (state.recurring || []).some(
    r => r.accountId === accountId || r.fromAccountId === accountId || r.toAccountId === accountId
  );
  if (hasRecurring) {
    throw new Error("এই অ্যাকাউন্টের সাথে অটো-শিডিউল যুক্ত থাকায় এটি সরাসরি মুছে ফেলা যাবে না");
  }

  const updatedAccounts = (state.accounts || []).filter(a => a.id !== accountId);
  return {
    ...state,
    accounts: updatedAccounts,
  };
}

function addCategory(state, params) {
  const { name, type, icon, color, budget } = params;
  if (!name || !name.trim()) {
    throw new Error("ক্যাটাগরির নাম আবশ্যক");
  }
  const catType = type === "income" ? "income" : "expense";
  const numBudget = parseFloat(budget) || 0;
  if (numBudget < 0) {
    throw new Error("সঠিক বাজেট সীমা প্রদান করুন");
  }

  const newCat = {
    id: "cat_" + Date.now(),
    name: name.trim(),
    type: catType,
    icon: icon || (catType === "income" ? "💰" : "📦"),
    color: color || (catType === "income" ? "#10B981" : "#EF4444"),
    budget: numBudget,
    isArchived: false,
  };

  return {
    ...state,
    categories: [...(state.categories || []), newCat],
  };
}

function updateCategory(state, categoryId, params) {
  const cat = (state.categories || []).find(c => c.id === categoryId);
  if (!cat) throw new Error("ক্যাটাগরি পাওয়া যায়নি");

  const { name, icon, color, budget, isArchived } = params;
  const numBudget = budget !== undefined ? parseFloat(budget) : cat.budget;
  if (isNaN(numBudget) || numBudget < 0) {
    throw new Error("সঠিক বাজেট সীমা প্রদান করুন");
  }

  const updatedCategories = (state.categories || []).map(c => {
    if (c.id === categoryId) {
      return {
        ...c,
        name: name ? name.trim() : c.name,
        icon: icon || c.icon,
        color: color || c.color,
        budget: numBudget,
        isArchived: isArchived !== undefined ? Boolean(isArchived) : Boolean(c.isArchived),
      };
    }
    return c;
  });

  return {
    ...state,
    categories: updatedCategories,
  };
}

function archiveCategory(state, categoryId, isArchived = true) {
  const cat = (state.categories || []).find(c => c.id === categoryId);
  if (!cat) throw new Error("ক্যাটাগরি পাওয়া যায়নি");

  if (isArchived) {
    const activeSameType = (state.categories || []).filter(c => c.id !== categoryId && c.type === cat.type && !c.isArchived);
    if (activeSameType.length === 0) {
      throw new Error("কমপক্ষে একটি সক্রিয় ক্যাটাগরি থাকতে হবে");
    }
  }

  const updatedCategories = (state.categories || []).map(c => {
    if (c.id === categoryId) {
      return { ...c, isArchived: Boolean(isArchived) };
    }
    return c;
  });

  return {
    ...state,
    categories: updatedCategories,
  };
}

function deleteCategory(state, categoryId) {
  const cat = (state.categories || []).find(c => c.id === categoryId);
  if (!cat) throw new Error("ক্যাটাগরি পাওয়া যায়নি");

  const isDefault = DEFAULT_CATEGORIES.some(dc => dc.id === categoryId);
  if (isDefault) {
    throw new Error("ডিফল্ট সিস্টেম ক্যাটাগরি মুছে ফেলা যাবে না। প্রয়োজনে এটি আর্কাইভ করতে পারেন");
  }

  const hasTxns = (state.transactions || []).some(t => t.categoryId === categoryId);
  if (hasTxns) {
    throw new Error("এই ক্যাটাগরির সাথে লেনদেন যুক্ত থাকায় এটি সরাসরি মুছে ফেলা যাবে না");
  }
  const hasRecurring = (state.recurring || []).some(r => r.categoryId === categoryId);
  if (hasRecurring) {
    throw new Error("এই ক্যাটাগরির সাথে অটো-শিডিউল যুক্ত থাকায় এটি সরাসরি মুছে ফেলা যাবে না");
  }

  const updatedCategories = (state.categories || []).filter(c => c.id !== categoryId);
  return {
    ...state,
    categories: updatedCategories,
  };
}

function setCategoryBudget(state, categoryId, limit) {
  const numLimit = parseFloat(limit);
  if (isNaN(numLimit) || numLimit < 0) {
    throw new Error("সঠিক বাজেট সীমা প্রদান করুন");
  }

  const updatedCategories = (state.categories || []).map(cat => {
    if (cat.id === categoryId) {
      return { ...cat, budget: numLimit };
    }
    return cat;
  });

  return {
    ...state,
    categories: updatedCategories,
  };
}

function setOverallBudget(state, limit) {
  const numLimit = parseFloat(limit);
  if (isNaN(numLimit) || numLimit < 0) {
    throw new Error("সঠিক সামগ্রিক বাজেট সীমা প্রদান করুন");
  }
  return {
    ...state,
    overallMonthlyBudget: numLimit,
  };
}

function addGoal(state, params) {
  const { title, targetAmount, savedAmount, targetDate, icon, color, note } = params;
  if (!title || !title.trim()) {
    throw new Error("লক্ষ্যের নাম আবশ্যক");
  }
  const numTarget = parseFloat(targetAmount);
  if (isNaN(numTarget) || numTarget <= 0) {
    throw new Error("সঠিক লক্ষ্যমাত্রা (Target Amount) প্রদান করুন");
  }
  const initSaved = parseFloat(savedAmount) || 0;

  const newGoal = {
    id: "goal_" + Date.now(),
    title: title.trim(),
    targetAmount: numTarget,
    savedAmount: initSaved,
    targetDate: targetDate || "",
    icon: icon || "🎯",
    color: color || "#3B82F6",
    note: note ? note.trim() : "",
  };

  return {
    ...state,
    goals: [...(state.goals || []), newGoal],
  };
}

function updateGoal(state, goalId, params) {
  const goal = (state.goals || []).find(g => g.id === goalId);
  if (!goal) throw new Error("লক্ষ্যটি পাওয়া যায়নি");

  const { title, targetAmount, targetDate, icon, color, note } = params;
  const numTarget = targetAmount !== undefined ? parseFloat(targetAmount) : goal.targetAmount;
  if (isNaN(numTarget) || numTarget <= 0) {
    throw new Error("সঠিক লক্ষ্যমাত্রা প্রদান করুন");
  }

  const updatedGoals = (state.goals || []).map(g => {
    if (g.id === goalId) {
      return {
        ...g,
        title: title ? title.trim() : g.title,
        targetAmount: numTarget,
        targetDate: targetDate !== undefined ? targetDate : g.targetDate,
        icon: icon || g.icon,
        color: color || g.color,
        note: note !== undefined ? note.trim() : g.note,
      };
    }
    return g;
  });

  return {
    ...state,
    goals: updatedGoals,
  };
}

function contributeToGoal(state, goalId, amount, fromAccountId) {
  const goal = (state.goals || []).find(g => g.id === goalId);
  if (!goal) throw new Error("লক্ষ্যটি পাওয়া যায়নি");

  const numAmt = parseFloat(amount);
  if (isNaN(numAmt) || numAmt <= 0) {
    throw new Error("সঠিক জমার পরিমাণ প্রদান করুন");
  }

  if (!fromAccountId) {
    throw new Error("দয়া করে টাকা কর্তনের জন্য একটি সক্রিয় ওয়ালেট নির্বাচন করুন");
  }

  let updatedAccounts = state.accounts || [];
  let updatedTxns = state.transactions || [];

  const acc = updatedAccounts.find(a => a.id === fromAccountId);
  if (!acc) throw new Error("নির্বাচিত অ্যাকাউন্ট পাওয়া যায়নি");
  if (acc.isArchived) throw new Error("আর্কাইভ করা ওয়ালেট হতে টাকা জমা করা যাবে না");
  if ((acc.balance || 0) < numAmt) {
    throw new Error("নির্বাচিত অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই");
  }
  updatedAccounts = updatedAccounts.map(a => a.id === fromAccountId ? { ...a, balance: (a.balance || 0) - numAmt } : a);

  const newTxn = {
    id: "mmtxn_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    type: "expense",
    amount: numAmt,
    accountId: fromAccountId,
    categoryId: "cat_investment",
    goalId: goalId,
    date: new Date().toISOString().split("T")[0],
    time: "Goal Deposit",
    note: "সঞ্চয় জমা: " + goal.title,
    payee: goal.title,
  };
  updatedTxns = [newTxn, ...updatedTxns];

  const updatedGoals = (state.goals || []).map(g => {
    if (g.id === goalId) {
      return {
        ...g,
        savedAmount: (g.savedAmount || 0) + numAmt,
      };
    }
    return g;
  });

  return {
    ...state,
    accounts: updatedAccounts,
    transactions: updatedTxns,
    goals: updatedGoals,
  };
}

function withdrawFromGoal(state, goalId, amount, toAccountId) {
  const goal = (state.goals || []).find(g => g.id === goalId);
  if (!goal) throw new Error("লক্ষ্যটি পাওয়া যায়নি");

  const numAmt = parseFloat(amount);
  if (isNaN(numAmt) || numAmt <= 0) {
    throw new Error("সঠিক উত্তোলনের পরিমাণ প্রদান করুন");
  }

  if ((goal.savedAmount || 0) < numAmt) {
    throw new Error("লক্ষ্যে পর্যাপ্ত সঞ্চিত অর্থ নেই");
  }

  if (!toAccountId) {
    throw new Error("দয়া করে টাকা জমার জন্য একটি সক্রিয় ওয়ালেট নির্বাচন করুন");
  }

  let updatedAccounts = state.accounts || [];
  const acc = updatedAccounts.find(a => a.id === toAccountId);
  if (!acc) throw new Error("নির্বাচিত অ্যাকাউন্ট পাওয়া যায়নি");
  if (acc.isArchived) throw new Error("আর্কাইভ করা ওয়ালেটে টাকা উত্তোলন করা যাবে না");

  updatedAccounts = updatedAccounts.map(a => a.id === toAccountId ? { ...a, balance: (a.balance || 0) + numAmt } : a);

  const newTxn = {
    id: "mmtxn_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    type: "income",
    amount: numAmt,
    accountId: toAccountId,
    categoryId: "cat_investment",
    goalId: goalId,
    date: new Date().toISOString().split("T")[0],
    time: "Goal Withdrawal",
    note: "লক্ষ্য হতে উত্তোলন: " + goal.title,
    payee: goal.title,
  };

  const updatedGoals = (state.goals || []).map(g => {
    if (g.id === goalId) {
      return {
        ...g,
        savedAmount: Math.max(0, (g.savedAmount || 0) - numAmt),
      };
    }
    return g;
  });

  return {
    ...state,
    accounts: updatedAccounts,
    transactions: [newTxn, ...(state.transactions || [])],
    goals: updatedGoals,
  };
}

function deleteGoal(state, goalId, refundToAccountId = null) {
  const goal = (state.goals || []).find(g => g.id === goalId);
  if (!goal) return state;

  let updatedAccounts = state.accounts || [];
  let updatedTxns = state.transactions || [];

  if (refundToAccountId && (goal.savedAmount || 0) > 0) {
    const acc = updatedAccounts.find(a => a.id === refundToAccountId);
    if (acc && !acc.isArchived) {
      const refundAmt = Number(goal.savedAmount);
      updatedAccounts = updatedAccounts.map(a => a.id === refundToAccountId ? { ...a, balance: (a.balance || 0) + refundAmt } : a);
      const refundTxn = {
        id: "mmtxn_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        type: "income",
        amount: refundAmt,
        accountId: refundToAccountId,
        categoryId: "cat_investment",
        date: new Date().toISOString().split("T")[0],
        time: "Goal Refund",
        note: "লক্ষ্য বাতিলজনিত অর্থ ফেরত: " + goal.title,
        payee: goal.title,
      };
      updatedTxns = [refundTxn, ...updatedTxns];
    }
  }

  return {
    ...state,
    accounts: updatedAccounts,
    transactions: updatedTxns,
    goals: (state.goals || []).filter(g => g.id !== goalId),
  };
}

function updatePreferences(state, newPrefs) {
  const validPeriods = ["this_month", "last_month", "all_time", "custom"];
  const validSortOrders = ["newest", "oldest", "amount_high", "amount_low"];
  const raw = {
    ...(state.preferences || DEFAULT_PREFERENCES),
    ...(newPrefs || {}),
  };
  return {
    ...state,
    preferences: {
      ...raw,
      defaultPeriod: validPeriods.includes(raw.defaultPeriod) ? raw.defaultPeriod : DEFAULT_PREFERENCES.defaultPeriod,
      sortOrder: validSortOrders.includes(raw.sortOrder) ? raw.sortOrder : DEFAULT_PREFERENCES.sortOrder,
      currencySymbol: typeof raw.currencySymbol === "string" && raw.currencySymbol.trim() ? raw.currencySymbol.trim() : DEFAULT_PREFERENCES.currencySymbol,
      showNetWorthCard: raw.showNetWorthCard !== false,
      showSavingsRateCard: raw.showSavingsRateCard !== false,
      showTipsCard: raw.showTipsCard !== false,
    },
  };
}

function resetPreferences(state) {
  return {
    ...state,
    preferences: { ...DEFAULT_PREFERENCES },
  };
}


function calculateNextDueDate(dateStr, cadence) {
  if (!dateStr) return new Date().toISOString().split("T")[0];
  const parts = String(dateStr).split("-").map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return new Date().toISOString().split("T")[0];
  }
  const [y, m, d] = parts;
  if (cadence === "daily") {
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + 1);
    return dt.toISOString().split("T")[0];
  }
  if (cadence === "weekly") {
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + 7);
    return dt.toISOString().split("T")[0];
  }
  if (cadence === "monthly") {
    let nextYear = y;
    let nextMonth = m + 1;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    const daysInNextMonth = new Date(Date.UTC(nextYear, nextMonth, 0)).getUTCDate();
    const nextDay = Math.min(d, daysInNextMonth);
    const mmStr = String(nextMonth).padStart(2, "0");
    const ddStr = String(nextDay).padStart(2, "0");
    return nextYear + "-" + mmStr + "-" + ddStr;
  }
  return dateStr;
}

function processRecurringTransactions(state, todayDateStr) {
  if (!state || typeof state !== "object") return state;
  const today = todayDateStr || new Date().toISOString().split("T")[0];
  const recurringList = Array.isArray(state.recurring) ? state.recurring : [];
  if (recurringList.length === 0) return state;

  let hasChanges = false;
  let currentAccounts = [...(state.accounts || [])];
  let currentTransactions = [...(state.transactions || [])];
  let updatedRecurring = [];

  for (const rec of recurringList) {
    if (!rec || !rec.isActive || !rec.nextDueDate) {
      updatedRecurring.push(rec);
      continue;
    }

    let recCopy = { ...rec };
    if (recCopy.nextDueDate <= today) {
      const expectedTxnId = "mmtxn_rec_" + recCopy.id + "_" + recCopy.nextDueDate.replace(/-/g, "");
      const alreadyPosted = currentTransactions.some(
        t => t.id === expectedTxnId || (t.recurringId === recCopy.id && t.date === recCopy.nextDueDate)
      );

      if (!alreadyPosted && recCopy.lastProcessedDate !== recCopy.nextDueDate) {
        const amt = parseFloat(recCopy.amount) || 0;
        if (amt > 0) {
          if (recCopy.type === "transfer") {
            const fromAcc = currentAccounts.find(a => a.id === recCopy.fromAccountId);
            const toAcc = currentAccounts.find(a => a.id === recCopy.toAccountId);
            if (fromAcc && toAcc && !fromAcc.isArchived && !toAcc.isArchived && fromAcc.balance >= amt) {
              currentAccounts = currentAccounts.map(a => {
                if (a.id === recCopy.fromAccountId) return { ...a, balance: (a.balance || 0) - amt };
                if (a.id === recCopy.toAccountId) return { ...a, balance: (a.balance || 0) + amt };
                return a;
              });
              const newTxn = {
                id: expectedTxnId,
                recurringId: recCopy.id,
                type: "transfer",
                amount: amt,
                fromAccountId: recCopy.fromAccountId,
                toAccountId: recCopy.toAccountId,
                date: recCopy.nextDueDate,
                time: "09:00 AM",
                note: (recCopy.note || "").trim() || ("[অটো-শিডিউল] " + recCopy.title),
                payee: (recCopy.payee || "").trim(),
                isRecurringGenerated: true,
              };
              currentTransactions = [newTxn, ...currentTransactions];
              recCopy.lastProcessedDate = recCopy.nextDueDate;
              recCopy.nextDueDate = calculateNextDueDate(recCopy.nextDueDate, recCopy.cadence);
              hasChanges = true;
            }
          } else {
            const targetAccId = recCopy.accountId;
            const acc = currentAccounts.find(a => a.id === targetAccId);
            const cat = recCopy.categoryId ? (state.categories || []).find(c => c.id === recCopy.categoryId) : null;
            if (acc && !acc.isArchived && (!cat || !cat.isArchived)) {
              const diff = recCopy.type === "income" ? amt : -amt;
              currentAccounts = currentAccounts.map(a => {
                if (a.id === targetAccId) return { ...a, balance: (a.balance || 0) + diff };
                return a;
              });
              const newTxn = {
                id: expectedTxnId,
                recurringId: recCopy.id,
                type: recCopy.type,
                amount: amt,
                categoryId: recCopy.categoryId || (recCopy.type === "income" ? "cat_other_inc" : "cat_other_exp"),
                accountId: targetAccId,
                date: recCopy.nextDueDate,
                time: "09:00 AM",
                note: (recCopy.note || "").trim() || ("[অটো-শিডিউল] " + recCopy.title),
                payee: (recCopy.payee || "").trim(),
                isRecurringGenerated: true,
              };
              currentTransactions = [newTxn, ...currentTransactions];
              recCopy.lastProcessedDate = recCopy.nextDueDate;
              recCopy.nextDueDate = calculateNextDueDate(recCopy.nextDueDate, recCopy.cadence);
              hasChanges = true;
            }
          }
        }
      }
    }
    updatedRecurring.push(recCopy);
  }

  if (!hasChanges) return state;

  return {
    ...state,
    accounts: currentAccounts,
    transactions: currentTransactions,
    recurring: updatedRecurring,
  };
}

function addRecurring(state, params) {
  const { title, type, amount, categoryId, accountId, fromAccountId, toAccountId, cadence, startDate, nextDueDate, note, payee } = params;
  if (!title || !title.trim()) {
    throw new Error("শিডিউলের শিরোনাম আবশ্যক");
  }
  const amt = parseFloat(amount);
  if (!amt || isNaN(amt) || amt <= 0) {
    throw new Error("দয়া করে সঠিক ইতিবাচক পরিমাণ দিন");
  }
  const cad = ["daily", "weekly", "monthly"].includes(cadence) ? cadence : "monthly";
  const start = startDate || new Date().toISOString().split("T")[0];
  const nextDue = nextDueDate || start;

  if (type === "transfer") {
    if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) {
      throw new Error("উৎস এবং গন্তব্য অ্যাকাউন্ট ভিন্ন ও নির্দিষ্ট হতে হবে");
    }
    const fromAcc = (state.accounts || []).find(a => a.id === fromAccountId);
    const toAcc = (state.accounts || []).find(a => a.id === toAccountId);
    if (!fromAcc || !toAcc) {
      throw new Error("উৎস বা গন্তব্য অ্যাকাউন্ট পাওয়া যায়নি");
    }
    if (fromAcc.isArchived || toAcc.isArchived) {
      throw new Error("আর্কাইভ করা ওয়ালেটের মধ্যে স্থানান্তর সম্ভব নয়");
    }
  } else {
    if (!accountId) {
      throw new Error("দয়া করে একটি অ্যাকাউন্ট নির্বাচন করুন");
    }
    const acc = (state.accounts || []).find(a => a.id === accountId);
    if (!acc) {
      throw new Error("নির্বাচিত অ্যাকাউন্ট পাওয়া যায়নি");
    }
    if (acc.isArchived) {
      throw new Error("আর্কাইভ করা ওয়ালেটে লেনদেন যোগ করা যাবে না");
    }
    if (categoryId) {
      const cat = (state.categories || []).find(c => c.id === categoryId);
      if (cat && cat.isArchived) {
        throw new Error("আর্কাইভ করা ক্যাটাগরিতে নতুন লেনদেন যুক্ত করা যাবে না");
      }
      if (cat && cat.type !== (type || "expense")) {
        throw new Error("ক্যাটাগরির ধরন এবং লেনদেনের ধরন সামঞ্জস্যপূর্ণ নয়");
      }
    }
  }

  const newRec = {
    id: "rec_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    title: title.trim(),
    type: type || "expense",
    amount: amt,
    categoryId: type === "transfer" ? null : (categoryId || (type === "income" ? "cat_other_inc" : "cat_other_exp")),
    accountId: type === "transfer" ? null : accountId,
    fromAccountId: type === "transfer" ? fromAccountId : null,
    toAccountId: type === "transfer" ? toAccountId : null,
    cadence: cad,
    startDate: start,
    nextDueDate: nextDue,
    lastProcessedDate: null,
    isActive: true,
    note: (note || "").trim(),
    payee: (payee || "").trim(),
  };

  return {
    ...state,
    recurring: [...(state.recurring || []), newRec],
  };
}

function updateRecurring(state, recurringId, params) {
  const rec = (state.recurring || []).find(r => r.id === recurringId);
  if (!rec) throw new Error("শিডিউল পাওয়া যায়নি");

  const { title, type, amount, categoryId, accountId, fromAccountId, toAccountId, cadence, nextDueDate, note, payee, isActive } = params;
  const amt = amount !== undefined ? parseFloat(amount) : rec.amount;
  if (isNaN(amt) || amt <= 0) {
    throw new Error("দয়া করে সঠিক ইতিবাচক পরিমাণ দিন");
  }
  const recType = type || rec.type;
  if (recType === "transfer") {
    const f = fromAccountId !== undefined ? fromAccountId : rec.fromAccountId;
    const t = toAccountId !== undefined ? toAccountId : rec.toAccountId;
    if (!f || !t || f === t) {
      throw new Error("উৎস এবং গন্তব্য অ্যাকাউন্ট ভিন্ন ও নির্দিষ্ট হতে হবে");
    }
    const fromAcc = (state.accounts || []).find(a => a.id === f);
    const toAcc = (state.accounts || []).find(a => a.id === t);
    if (!fromAcc || !toAcc) {
      throw new Error("উৎস বা গন্তব্য অ্যাকাউন্ট পাওয়া যায়নি");
    }
    if (fromAcc.isArchived || toAcc.isArchived) {
      throw new Error("আর্কাইভ করা ওয়ালেটের মধ্যে স্থানান্তর সম্ভব নয়");
    }
  } else {
    const targetAccId = accountId !== undefined ? accountId : rec.accountId;
    if (!targetAccId) {
      throw new Error("দয়া করে একটি অ্যাকাউন্ট নির্বাচন করুন");
    }
    const acc = (state.accounts || []).find(a => a.id === targetAccId);
    if (!acc) {
      throw new Error("নির্বাচিত অ্যাকাউন্ট পাওয়া যায়নি");
    }
    if (acc.isArchived) {
      throw new Error("আর্কাইভ করা ওয়ালেটে লেনদেন যোগ করা যাবে না");
    }
    const targetCatId = categoryId !== undefined ? categoryId : rec.categoryId;
    if (targetCatId) {
      const cat = (state.categories || []).find(c => c.id === targetCatId);
      if (cat && cat.isArchived) {
        throw new Error("আর্কাইভ করা ক্যাটাগরিতে নতুন লেনদেন যুক্ত করা যাবে না");
      }
      if (cat && cat.type !== recType) {
        throw new Error("ক্যাটাগরির ধরন এবং লেনদেনের ধরন সামঞ্জস্যপূর্ণ নয়");
      }
    }
  }

  const updatedRecurring = (state.recurring || []).map(r => {
    if (r.id === recurringId) {
      return {
        ...r,
        title: title ? title.trim() : r.title,
        type: recType,
        amount: amt,
        categoryId: recType === "transfer" ? null : (categoryId !== undefined ? categoryId : r.categoryId),
        accountId: recType === "transfer" ? null : (accountId !== undefined ? accountId : r.accountId),
        fromAccountId: recType === "transfer" ? (fromAccountId !== undefined ? fromAccountId : r.fromAccountId) : null,
        toAccountId: recType === "transfer" ? (toAccountId !== undefined ? toAccountId : r.toAccountId) : null,
        cadence: cadence !== undefined ? cadence : r.cadence,
        nextDueDate: nextDueDate !== undefined ? nextDueDate : r.nextDueDate,
        note: note !== undefined ? note.trim() : r.note,
        payee: payee !== undefined ? payee.trim() : r.payee,
        isActive: isActive !== undefined ? Boolean(isActive) : r.isActive,
      };
    }
    return r;
  });

  return {
    ...state,
    recurring: updatedRecurring,
  };
}

function toggleRecurringActive(state, recurringId, isActive) {
  const rec = (state.recurring || []).find(r => r.id === recurringId);
  if (!rec) throw new Error("শিডিউল পাওয়া যায়নি");
  const targetActive = isActive !== undefined ? Boolean(isActive) : !rec.isActive;

  const updatedRecurring = (state.recurring || []).map(r => {
    if (r.id === recurringId) {
      return { ...r, isActive: targetActive };
    }
    return r;
  });

  return {
    ...state,
    recurring: updatedRecurring,
  };
}

function deleteRecurring(state, recurringId) {
  return {
    ...state,
    recurring: (state.recurring || []).filter(r => r.id !== recurringId),
  };
}

module.exports = {
  MM_STORAGE_KEY,
  MM_SCHEMA_VERSION,
  DEFAULT_PREFERENCES,
  DEFAULT_ACCOUNTS,
  DEFAULT_CATEGORIES,
  DEFAULT_GOALS,
  getDefaultState,
  sanitizeState,
  calculateNetWorth,
  calculateCashFlow,
  calculateCategoryBudgets,
  calculateCategoryDistribution,
  calculatePeriodMetrics,
  toEnglishDigits,
  isValidCalendarDate,
  normalizeToLocalDate,
  shiftDateStr,
  validateCustomDateRange,
  isDateInPeriod,
  filterAndSortTransactions,
  filterTransactions,
  addTransaction,
  editTransaction,
  deleteTransaction,
  addAccount,
  updateAccount,
  archiveAccount,
  deleteAccount,
  addCategory,
  updateCategory,
  deleteCategory,
  setCategoryBudget,
  setOverallBudget,
  addGoal,
  updateGoal,
  contributeToGoal,
  withdrawFromGoal,
  deleteGoal,
  updatePreferences,
  resetPreferences,
  DEFAULT_RECURRING,
  calculateNextDueDate,
  processRecurringTransactions,
  addRecurring,
  updateRecurring,
  toggleRecurringActive,
  deleteRecurring,
  archiveCategory,
};
