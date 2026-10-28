// src/moneyManagerService.js
// Dedicated backend engine and business logic for TallyKhata Personal Money Manager
// 100% Isolated from business accounting datasets

const MM_STORAGE_KEY = "@tallykhata_personal_money_manager_v2";
const MM_SCHEMA_VERSION = 2;

const DEFAULT_ACCOUNTS = [
  { id: "acc_cash", name: "নগদ ক্যাশ (Cash)", type: "cash", balance: 15000, icon: "💵", color: "#10B981" },
  { id: "acc_bank", name: "ব্যাংক অ্যাকাউন্ট (Bank)", type: "bank", balance: 52000, icon: "🏦", color: "#3B82F6" },
  { id: "acc_bkash", name: "বিকাশ ওয়ালেট (bKash)", type: "mfs", balance: 8500, icon: "📱", color: "#EC4899" },
  { id: "acc_nagad", name: "নগদ ওয়ালেট (Nagad)", type: "mfs", balance: 4200, icon: "💳", color: "#F97316" },
];

const DEFAULT_CATEGORIES = [
  { id: "cat_food", name: "খাবার ও মুদি বাজার", type: "expense", icon: "🍲", color: "#EF4444", budget: 15000 },
  { id: "cat_transport", name: "যাতায়াত ও জ্বালানি", type: "expense", icon: "🚌", color: "#F59E0B", budget: 5000 },
  { id: "cat_utility", name: "বিল ও ইউটিলিটি", type: "expense", icon: "💡", color: "#3B82F6", budget: 8000 },
  { id: "cat_shopping", name: "কেনাকাটা ও পরিবার", type: "expense", icon: "🛍️", color: "#EC4899", budget: 10000 },
  { id: "cat_health", name: "চিকিৎসা ও ওষুধ", type: "expense", icon: "💊", color: "#10B981", budget: 4000 },
  { id: "cat_education", name: "শিক্ষা ও পড়াশোনা", type: "expense", icon: "📚", color: "#8B5CF6", budget: 6000 },
  { id: "cat_entertainment", name: "বিনোদন ও নাশতা", type: "expense", icon: "☕", color: "#6366F1", budget: 3000 },
  { id: "cat_other_exp", name: "অন্যান্য ব্যয়", type: "expense", icon: "📦", color: "#6B7280", budget: 4000 },
  { id: "cat_salary", name: "মাসিক বেতন ও সম্মানী", type: "income", icon: "💰", color: "#10B981", budget: 0 },
  { id: "cat_business_profit", name: "ব্যবসার ব্যক্তিগত লভ্যাংশ", type: "income", icon: "📈", color: "#059669", budget: 0 },
  { id: "cat_investment", name: "বিনিয়োগ ও ডিভিডেন্ড", type: "income", icon: "🏛️", color: "#2563EB", budget: 0 },
  { id: "cat_other_inc", name: "অন্যান্য প্রাপ্তি / উপহার", type: "income", icon: "🎁", color: "#14B8A6", budget: 0 },
];

function getDefaultState(todayDateStr) {
  const d = todayDateStr || new Date().toISOString().split("T")[0];
  return {
    version: MM_SCHEMA_VERSION,
    accounts: [...DEFAULT_ACCOUNTS],
    categories: [...DEFAULT_CATEGORIES],
    transactions: [
      { id: "mmtxn_1", type: "income", amount: 60000, categoryId: "cat_salary", accountId: "acc_bank", date: d, time: "10:00 AM", note: "মাসিক বেতন জমা" },
      { id: "mmtxn_2", type: "expense", amount: 1450, categoryId: "cat_food", accountId: "acc_cash", date: d, time: "01:30 PM", note: "সাপ্তাহিক বাজার ও সদাই" },
      { id: "mmtxn_3", type: "expense", amount: 1850, categoryId: "cat_utility", accountId: "acc_bkash", date: d, time: "04:15 PM", note: "বিদ্যুৎ ও ওয়াইফাই বিল" },
      { id: "mmtxn_4", type: "transfer", amount: 5000, fromAccountId: "acc_bank", toAccountId: "acc_bkash", date: d, time: "09:00 AM", note: "ব্যাংক হতে বিকাশে ট্রান্সফার" },
      { id: "mmtxn_5", type: "expense", amount: 650, categoryId: "cat_transport", accountId: "acc_cash", date: d, time: "Yesterday", note: "সিএনজি ও যাতায়াত ভাড়া" },
    ]
  };
}

function sanitizeState(parsed, defaultState) {
  if (!parsed || typeof parsed !== "object") return defaultState;
  const accounts = Array.isArray(parsed.accounts) && parsed.accounts.length > 0
    ? parsed.accounts
    : defaultState.accounts;
  
  const existingCatMap = new Map();
  if (Array.isArray(parsed.categories)) {
    parsed.categories.forEach(c => {
      if (c && c.id) existingCatMap.set(c.id, c);
    });
  }
  const mergedCategories = defaultState.categories.map(defCat => {
    return existingCatMap.get(defCat.id) || defCat;
  });
  existingCatMap.forEach((cat, id) => {
    if (!mergedCategories.some(c => c.id === id)) {
      mergedCategories.push(cat);
    }
  });

  const transactions = Array.isArray(parsed.transactions)
    ? parsed.transactions
    : defaultState.transactions;

  return {
    version: parsed.version || MM_SCHEMA_VERSION,
    accounts,
    categories: mergedCategories,
    transactions,
  };
}

function calculateNetWorth(accounts) {
  if (!Array.isArray(accounts)) return 0;
  return accounts.reduce((sum, acc) => sum + Number(acc.balance || 0), 0);
}

function calculateCashFlow(transactions) {
  if (!Array.isArray(transactions)) {
    return { totalIncome: 0, totalExpense: 0, totalTransfer: 0, netSavings: 0, savingsRate: 0 };
  }
  let totalIncome = 0;
  let totalExpense = 0;
  let totalTransfer = 0;

  for (const t of transactions) {
    const amt = Number(t.amount || 0);
    if (t.type === "income") totalIncome += amt;
    else if (t.type === "expense") totalExpense += amt;
    else if (t.type === "transfer") totalTransfer += amt;
  }

  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((netSavings / totalIncome) * 100)) : 0;

  return { totalIncome, totalExpense, totalTransfer, netSavings, savingsRate };
}

function calculateCategoryBudgets(categories, transactions) {
  if (!Array.isArray(categories)) return [];
  const expTransactions = (transactions || []).filter(t => t.type === "expense");

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
        spent,
        pct,
        remaining,
        isOver,
        hasBudget: budget > 0,
      };
    });
}

function calculateCategoryDistribution(categories, transactions) {
  const budgets = calculateCategoryBudgets(categories, transactions);
  const totalExpense = budgets.reduce((sum, b) => sum + b.spent, 0);

  const distribution = budgets
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

  return { totalExpense, distribution };
}

function addTransaction(state, params) {
  const { type, amount, categoryId, accountId, fromAccountId, toAccountId, note, date, time } = params;
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

  const newTxn = {
    id: "mmtxn_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    type,
    amount: amt,
    categoryId: categoryId || (type === "income" ? "cat_other_inc" : "cat_other_exp"),
    accountId,
    date: d,
    time: t,
    note: (note || "").trim() || (type === "income" ? "আয় প্রাপ্তি" : "ব্যক্তিগত ব্যয়"),
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

  const updatedTransactions = (state.transactions || []).filter(t => t.id !== txnId);

  return {
    ...state,
    accounts: updatedAccounts,
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

  const updatedAccounts = (state.accounts || []).filter(a => a.id !== accountId);
  return {
    ...state,
    accounts: updatedAccounts,
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

function filterTransactions(transactions, filterParams) {
  if (!Array.isArray(transactions)) return [];
  const { filterType, accountId, categoryId, searchQuery } = filterParams;

  return transactions.filter(t => {
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
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const noteMatch = (t.note || "").toLowerCase().includes(q);
      const amtMatch = String(t.amount || "").includes(q);
      if (!noteMatch && !amtMatch) return false;
    }
    return true;
  });
}

module.exports = {
  MM_STORAGE_KEY,
  MM_SCHEMA_VERSION,
  DEFAULT_ACCOUNTS,
  DEFAULT_CATEGORIES,
  getDefaultState,
  sanitizeState,
  calculateNetWorth,
  calculateCashFlow,
  calculateCategoryBudgets,
  calculateCategoryDistribution,
  addTransaction,
  deleteTransaction,
  addAccount,
  updateAccount,
  deleteAccount,
  setCategoryBudget,
  filterTransactions,
};