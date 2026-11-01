/**
 * src/themeService.js
 * App-wide Light and Dark theme token definition and icon palettes for TallyKhata.
 */

const LIGHT_THEME = {
  mode: 'light',
  isDark: false,
  primary: '#B81414',
  onPrimary: '#FFFFFF',
  primaryContainer: '#FEF2F2',
  onPrimaryContainer: '#7F1D1D',
  primaryLight: '#FEF2F2',
  secondary: '#4F46E5',
  onSecondary: '#FFFFFF',
  accent: '#D97706',
  screenBg: '#F4F6F8',
  headerBg: '#B81414',
  headerText: '#FFFFFF',
  cardBg: '#FFFFFF',
  cardBgElevated: '#FFFFFF',
  surfaceContainer: '#F1F5F9',
  surfaceVariant: '#E2E8F0',
  modalSurface: '#FFFFFF',
  modalHandle: '#CBD5E1',
  modalOverlay: 'rgba(0, 0, 0, 0.55)',
  inputSurface: '#F8FAFC',
  inputBg: '#F8FAFC',
  inputBorder: '#CBD5E1',
  inputText: '#1E293B',
  inputPlaceholder: '#94A3B8',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textMuted: '#475569',
  textDisabled: '#94A3B8',
  textInverse: '#FFFFFF',
  textInverted: '#FFFFFF',
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#E2E8F0',
  tabActive: '#B81414',
  tabInactive: '#64748B',
  cardBorder: '#E2E8F0',
  outline: '#CBD5E1',
  outlineVariant: '#E2E8F0',
  divider: '#E2E8F0',
  income: '#047857',
  incomeContainer: '#D1FAE5',
  expense: '#DC2626',
  expenseContainer: '#FEE2E2',
  transfer: '#2563EB',
  transferContainer: '#DBEAFE',
  due: '#B45309',
  dueContainer: '#FEF3C7',
  paid: '#10B981',
  savings: '#0D9488',
  profit: '#047857',
  loss: '#DC2626',
  stockIn: '#047857',
  stockInContainer: '#DCFCE7',
  stockOut: '#DC2626',
  stockOutContainer: '#FEE2E2',
  stockLow: '#D97706',
  stockLowContainer: '#FEF3C7',
  subtleTint: 0.08,
  selectedOverlay: 0.12,
  scrim: 0.5,
  cardTint: 0.15,
  disabledOpacity: 0.38,
  pressedOpacity: 0.7,
  success: '#10B981',
  successLight: '#F0FDF4',
  green: '#10B981',
  danger: '#EF4444',
  dangerLight: '#FFF1F2',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  info: '#3B82F6',
  infoLight: '#F0F9FF',
  purple: '#8B5CF6',
  purpleLight: '#FAF5FF',
  neutral: '#4B5563',
  neutralLight: '#F8FAFC',
  statusBar: 'light-content',
};

const DARK_THEME = {
  mode: 'dark',
  isDark: true,
  primary: '#EF4444',
  onPrimary: '#FFFFFF',
  primaryContainer: '#3F1212',
  onPrimaryContainer: '#FCA5A5',
  primaryLight: '#3F1212',
  secondary: '#818CF8',
  onSecondary: '#0F172A',
  accent: '#FBBF24',
  screenBg: '#0F172A',
  headerBg: '#1C1917',
  headerText: '#F8FAFC',
  cardBg: '#1E293B',
  cardBgElevated: '#334155',
  surfaceContainer: '#1E293B',
  surfaceVariant: '#334155',
  modalSurface: '#1E293B',
  modalHandle: '#475569',
  modalOverlay: 'rgba(0, 0, 0, 0.75)',
  inputSurface: '#0F172A',
  inputBg: '#0F172A',
  inputBorder: '#475569',
  inputText: '#F8FAFC',
  inputPlaceholder: '#64748B',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textDisabled: '#475569',
  textInverse: '#0F172A',
  textInverted: '#0F172A',
  tabBarBg: '#1E293B',
  tabBarBorder: '#334155',
  tabActive: '#EF4444',
  tabInactive: '#94A3B8',
  cardBorder: '#334155',
  outline: '#475569',
  outlineVariant: '#334155',
  divider: '#334155',
  income: '#34D399',
  incomeContainer: '#064E3B',
  expense: '#F87171',
  expenseContainer: '#450A0A',
  transfer: '#60A5FA',
  transferContainer: '#172554',
  due: '#FBBF24',
  dueContainer: '#451A03',
  paid: '#34D399',
  savings: '#2DD4BF',
  profit: '#34D399',
  loss: '#F87171',
  stockIn: '#10B981',
  stockInContainer: '#064E3B',
  stockOut: '#EF4444',
  stockOutContainer: '#7F1D1D',
  stockLow: '#F59E0B',
  stockLowContainer: '#713F12',
  subtleTint: 0.08,
  selectedOverlay: 0.12,
  scrim: 0.5,
  cardTint: 0.15,
  disabledOpacity: 0.38,
  pressedOpacity: 0.7,
  success: '#34D399',
  successLight: '#064E3B',
  green: '#34D399',
  danger: '#F87171',
  dangerLight: '#450A0A',
  warning: '#FBBF24',
  warningLight: '#451A03',
  info: '#60A5FA',
  infoLight: '#172554',
  purple: '#C084FC',
  purpleLight: '#3B0764',
  neutral: '#CBD5E1',
  neutralLight: '#1E293B',
  statusBar: 'light-content',
};

function getThemeTokens(mode = 'light') {
  return mode === 'dark' ? DARK_THEME : LIGHT_THEME;
}

const LIGHT_ICON_THEMES = {
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
  teal: {
    bg: '#F0FDFA',
    borderTop: '#FFFFFF',
    borderBottom: '#99F6E4',
    borderSides: '#CCFBF1',
    tint: '#0D9488',
    shadowColor: '#0D9488',
  },
  neutral: {
    bg: '#F8FAFC',
    borderTop: '#FFFFFF',
    borderBottom: '#E2E8F0',
    borderSides: '#EDF2F7',
    tint: '#4B5563',
    shadowColor: '#64748B',
  },
  secondary: {
    bg: "#EEF2FF",
    borderTop: "#FFFFFF",
    borderBottom: "#C7D2FE",
    borderSides: "#E0E7FF",
    tint: "#4F46E5",
  },
  white: {
    bg: 'rgba(255, 255, 255, 0.2)',
    borderTop: 'rgba(255, 255, 255, 0.6)',
    borderBottom: 'rgba(0, 0, 0, 0.15)',
    borderSides: 'rgba(255, 255, 255, 0.3)',
    tint: '#FFFFFF',
  },
};

const DARK_ICON_THEMES = {
  secondary: {
    bg: "#1E1B4B",
    borderTop: "#3730A3",
    borderBottom: "#0F0E2A",
    borderSides: "#312E81",
    tint: "#818CF8",
  },
  primary: {
    bg: '#3B1818',
    borderTop: '#552222',
    borderBottom: '#220808',
    borderSides: '#441414',
    tint: '#EF4444',
  },
  success: {
    bg: '#064E3B',
    borderTop: '#047857',
    borderBottom: '#022C22',
    borderSides: '#065F46',
    tint: '#34D399',
  },
  danger: {
    bg: '#450A0A',
    borderTop: '#7F1D1D',
    borderBottom: '#280505',
    borderSides: '#5C0D0D',
    tint: '#F87171',
  },
  warning: {
    bg: '#451A03',
    borderTop: '#78350F',
    borderBottom: '#270E02',
    borderSides: '#5E2405',
    tint: '#FBBF24',
  },
  info: {
    bg: '#172554',
    borderTop: '#1E40AF',
    borderBottom: '#0F172A',
    borderSides: '#1D4ED8',
    tint: '#60A5FA',
  },
  purple: {
    bg: '#3B0764',
    borderTop: '#581C87',
    borderBottom: '#200538',
    borderSides: '#4C1D95',
    tint: '#C084FC',
  },
  teal: {
    bg: '#042F2E',
    borderTop: '#115E59',
    borderBottom: '#021B1A',
    borderSides: '#0F766E',
    tint: '#2DD4BF',
    shadowColor: '#000000',
  },
  neutral: {
    bg: '#1E293B',
    borderTop: '#334155',
    borderBottom: '#0F172A',
    borderSides: '#293548',
    tint: '#CBD5E1',
    shadowColor: '#000000',
  },
  white: {
    bg: 'rgba(255, 255, 255, 0.15)',
    borderTop: 'rgba(255, 255, 255, 0.4)',
    borderBottom: 'rgba(0, 0, 0, 0.3)',
    borderSides: 'rgba(255, 255, 255, 0.2)',
    tint: '#F8FAFC',
  },
};

function getIconTheme(variant = 'neutral', mode = 'light') {
  const table = mode === 'dark' ? DARK_ICON_THEMES : LIGHT_ICON_THEMES;
  return table[variant] || table.neutral;
}


function getThemedStyles(theme, isDark) {
  const t = theme || (isDark ? DARK_THEME : LIGHT_THEME);
  const dark = isDark !== undefined ? isDark : t.isDark;
  return {
    screenBg: { backgroundColor: t.screenBg },
    container: { backgroundColor: t.screenBg },
    card: { backgroundColor: t.cardBg, borderColor: t.cardBorder },
    cardElevated: { backgroundColor: t.cardBgElevated, borderColor: t.cardBorder },
    textPrimary: { color: t.textPrimary },
    textSecondary: { color: t.textSecondary },
    textMuted: { color: t.textMuted },
    textInverted: { color: t.textInverted },
    textInverse: { color: t.textInverse },
    textDisabled: { color: t.textDisabled },
    surfaceContainer: { backgroundColor: t.surfaceContainer },
    surfaceVariant: { backgroundColor: t.surfaceVariant },
    inputSurface: { backgroundColor: t.inputSurface },
    incomeText: { color: t.income },
    incomeBg: { backgroundColor: t.incomeContainer },
    expenseText: { color: t.expense },
    expenseBg: { backgroundColor: t.expenseContainer },
    transferText: { color: t.transfer },
    transferBg: { backgroundColor: t.transferContainer },
    dueText: { color: t.due },
    dueBg: { backgroundColor: t.dueContainer },
    divider: { backgroundColor: t.divider },
    input: { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.inputText },
    modalSurface: { backgroundColor: t.modalSurface, borderColor: t.cardBorder },
    modalCloseCircle: { backgroundColor: dark ? t.cardBorder : '#F3F4F6' },
    modalCloseIcon: { tintColor: dark ? t.textSecondary : '#6B7280' },
    tabBar: { backgroundColor: t.tabBarBg, borderTopColor: t.tabBarBorder },
    tabLabel: { color: t.tabInactive },
    tabLabelActive: { color: t.tabActive },
    headerNav: { backgroundColor: dark ? t.headerBg : '#FFFFFF', borderBottomColor: dark ? t.divider : '#F3F4F6' },
    topHeaderBar: { backgroundColor: dark ? t.headerBg : '#B81414' },
    searchBar: { backgroundColor: dark ? t.inputBg : '#FFFFFF', borderColor: dark ? t.inputBorder : '#E5E7EB' },
    summaryCard: { backgroundColor: t.cardBg, borderColor: t.cardBorder },
    summaryLabel: { color: t.textSecondary },
    counterStrip: { backgroundColor: dark ? t.cardBgElevated : '#F3F4F6' },
    customerCard: { backgroundColor: t.cardBg, borderColor: t.cardBorder },
    customerListCard: { backgroundColor: t.cardBg, borderBottomColor: t.divider },
    customerName: { color: t.textPrimary },
    customerTime: { color: t.textSecondary },
    customerChevron: { tintColor: t.textSecondary },
    menuProfileHeader: { backgroundColor: t.cardBg, borderColor: t.cardBorder },
    menuListContainer: { backgroundColor: t.cardBg, borderColor: t.cardBorder },
    menuListItem: { borderBottomColor: t.divider },
    menuListTitle: { color: t.textPrimary },
    menuListSub: { color: t.textSecondary },
    menuListArrow: { tintColor: t.textSecondary },
    cashTopCard: { backgroundColor: t.cardBg, borderColor: t.cardBorder },
    cashTopAmount: { color: t.textPrimary },
    cashTopLabel: { color: t.textSecondary },
    cashDashboardLower: { backgroundColor: dark ? t.cardBgElevated : '#EEF6F3' },
    cashActionBarBtn: { backgroundColor: t.cardBg, borderColor: t.cardBorder },
    cashActionText: { color: t.textPrimary },
    ledgerRow: { backgroundColor: t.cardBg, borderColor: t.cardBorder },
    ledgerRowDesc: { color: t.textPrimary },
    ledgerRowDate: { color: t.textSecondary },
    ledgerBottomBar: { backgroundColor: t.cardBg, borderTopColor: t.cardBorder },
    tagadaCard: { backgroundColor: t.cardBg, borderColor: t.cardBorder },
    walletActionBtn: { backgroundColor: t.cardBg, borderColor: t.cardBorder },
    walletActionText: { color: t.textPrimary },
    sectionHeaderTitle: { color: t.textPrimary },
    // Money Manager tokens
    mmScreen: { backgroundColor: dark ? '#0B1120' : '#F8FAFC' },
    mmHeader: { backgroundColor: dark ? '#0F172A' : '#FFFFFF', borderBottomColor: dark ? '#1E293B' : '#E2E8F0' },
    mmHeaderTitle: { color: dark ? '#F8FAFC' : '#0F172A' },
    mmHeaderSub: { color: dark ? '#94A3B8' : '#64748B' },
    mmBackBtn: { backgroundColor: dark ? '#1E293B' : '#F1F5F9' },
    mmBackIcon: { color: dark ? '#F8FAFC' : '#0F172A' },
    mmIconBtn: { backgroundColor: dark ? '#1E293B' : '#F1F5F9' },
    mmHeaderIconBtn: { backgroundColor: dark ? '#1E293B' : '#F1F5F9', borderColor: dark ? '#334155' : '#CBD5E1' },
    mmBadge: { backgroundColor: dark ? '#1E3A8A' : '#DBEAFE' },
    mmBadgeText: { color: dark ? '#BFDBFE' : '#1D4ED8' },
    mmAddHeaderBtn: { backgroundColor: dark ? '#059669' : '#059669' },
    mmAddHeaderBtnText: { color: '#FFFFFF' },
    mmAddSmallBtn: { backgroundColor: dark ? '#2563EB' : '#2563EB' },
    mmAddSmallBtnText: { color: '#FFFFFF' },
    mmAddAccBigBtn: { backgroundColor: dark ? '#1E293B' : '#EFF6FF', borderColor: dark ? '#3B82F6' : '#93C5FD' },
    mmAddAccBigBtnText: { color: dark ? '#60A5FA' : '#2563EB' },
    mmPeriodContainer: { backgroundColor: dark ? '#0F172A' : '#FFFFFF', borderBottomColor: dark ? '#1E293B' : '#E2E8F0' },
    mmPeriodPill: { backgroundColor: dark ? '#1E293B' : '#F1F5F9' },
    mmPeriodPillActive: { backgroundColor: dark ? '#EF4444' : '#B81414' },
    mmPeriodPillText: { color: dark ? '#94A3B8' : '#64748B' },
    mmPeriodPillTextActive: { color: '#FFFFFF' },
    mmTotalCard: { backgroundColor: dark ? '#1E293B' : '#FFFFFF', borderColor: dark ? '#334155' : '#E2E8F0' },
    mmTotalCardLabel: { color: dark ? '#94A3B8' : '#64748B' },
    mmTotalCardAmount: { color: dark ? '#F8FAFC' : '#0F172A' },
    mmTotalCardSub: { color: dark ? '#64748B' : '#94A3B8' },
    mmPeriodBadge: { backgroundColor: dark ? '#334155' : '#F1F5F9' },
    mmPeriodBadgeText: { color: dark ? '#CBD5E1' : '#64748B' },
    mmStatIncome: { color: dark ? '#34D399' : '#059669' },
    mmStatExpense: { color: dark ? '#F87171' : '#DC2626' },
    mmStatSavings: { color: dark ? '#60A5FA' : '#2563EB' },
    mmSavingsRateRow: { borderTopColor: dark ? '#334155' : '#E2E8F0' },
    mmSavingsRateText: { color: dark ? '#CBD5E1' : '#475569' },
    mmStatDivider: { backgroundColor: dark ? '#334155' : '#E2E8F0' },
    mmStatRow: { borderTopColor: dark ? '#334155' : '#E2E8F0' },
    mmStatLabel: { color: dark ? '#94A3B8' : '#64748B' },
    mmSubTabsContainer: { backgroundColor: dark ? '#1E293B' : '#F1F5F9' },
    mmSubTabBtn: { backgroundColor: 'transparent' },
    mmSubTabBtnActive: { backgroundColor: dark ? '#334155' : '#FFFFFF' },
    mmSubTabLabel: { color: dark ? '#94A3B8' : '#64748B' },
    mmSubTabLabelActive: { color: dark ? '#F8FAFC' : '#0F172A' },
    mmCard: { backgroundColor: dark ? '#1E293B' : '#FFFFFF', borderColor: dark ? '#334155' : '#E2E8F0' },
    mmCardTitle: { color: dark ? '#F8FAFC' : '#0F172A' },
    mmCardSub: { color: dark ? '#94A3B8' : '#64748B' },
    mmModalSheet: { backgroundColor: dark ? '#0F172A' : '#FFFFFF' },
    mmModalTitle: { color: dark ? '#F8FAFC' : '#0F172A' },
    mmModalClose: { backgroundColor: dark ? '#1E293B' : '#F1F5F9' },
    mmInput: { backgroundColor: dark ? '#0B1120' : '#F8FAFC', borderColor: dark ? '#334155' : '#CBD5E1', color: dark ? '#F8FAFC' : '#0F172A' },
    mmInputLabel: { color: dark ? '#CBD5E1' : '#334155' },
    mmTxnItem: { backgroundColor: dark ? '#1E293B' : '#FFFFFF', borderColor: dark ? '#334155' : '#E2E8F0' },
    mmTxnTitle: { color: dark ? '#F8FAFC' : '#0F172A' },
    mmTxnSub: { color: dark ? '#94A3B8' : '#64748B' },
    mmSectionTitle: { color: dark ? '#F8FAFC' : '#0F172A' },
    mmSearchBox: { backgroundColor: dark ? '#1E293B' : '#FFFFFF', borderColor: dark ? '#334155' : '#E2E8F0' },
    mmSearchInput: { color: dark ? '#F8FAFC' : '#0F172A' },
    mmSearchIcon: { color: dark ? '#94A3B8' : '#64748B' },
    mmAccountCard: { backgroundColor: dark ? '#1E293B' : '#FFFFFF', borderColor: dark ? '#334155' : '#E2E8F0' },
    mmAccountName: { color: dark ? '#F8FAFC' : '#0F172A' },
    mmAccountType: { color: dark ? '#94A3B8' : '#64748B' },
    mmAccountBalance: { color: dark ? '#F8FAFC' : '#0F172A' },
    mmAccountActionBtn: { backgroundColor: dark ? '#334155' : '#F1F5F9' },
    mmAccountActionText: { color: dark ? '#F8FAFC' : '#0F172A' },
    mmAccountDeleteBtn: { backgroundColor: dark ? '#450A0A' : '#FEE2E2' },
    mmAccountDeleteText: { color: dark ? '#FCA5A5' : '#DC2626' },
    mmAccountArchiveBtn: { backgroundColor: dark ? '#334155' : '#F1F5F9' },
    mmAccountArchiveText: { color: dark ? '#94A3B8' : '#64748B' },
    mmCatBudgetCard: { backgroundColor: dark ? '#1E293B' : '#FFFFFF', borderColor: dark ? '#334155' : '#E2E8F0' },
    mmCatBudgetName: { color: dark ? '#F8FAFC' : '#0F172A' },
    mmCatBudgetAmounts: { color: dark ? '#94A3B8' : '#64748B' },
    mmCatBudgetBtn: { backgroundColor: dark ? '#334155' : '#F1F5F9' },
    mmCatBudgetBtnText: { color: dark ? '#F8FAFC' : '#0F172A' },
    mmOverallBudgetCard: { backgroundColor: dark ? '#1E293B' : '#FFFFFF', borderColor: dark ? '#334155' : '#E2E8F0' },
    mmOverallBudgetBadge: { backgroundColor: dark ? '#065F46' : '#D1FAE5' },
    mmOverallBudgetBadgeText: { color: dark ? '#A7F3D0' : '#047857' },
    mmOverallBudgetTitle: { color: dark ? '#F8FAFC' : '#0F172A' },
    mmOverallBudgetLimit: { color: dark ? '#94A3B8' : '#64748B' },
    mmOverallBudgetSpent: { color: dark ? '#F8FAFC' : '#0F172A' },
    mmOverallBudgetBtn: { backgroundColor: dark ? '#334155' : '#F1F5F9' },
    mmOverallBudgetBtnText: { color: dark ? '#F8FAFC' : '#0F172A' },
    mmGoalCard: { backgroundColor: dark ? '#1E293B' : '#FFFFFF', borderColor: dark ? '#334155' : '#E2E8F0' },
    mmGoalTitle: { color: dark ? '#F8FAFC' : '#0F172A' },
    mmGoalSaved: { color: dark ? '#F8FAFC' : '#0F172A' },
    mmGoalTarget: { color: dark ? '#94A3B8' : '#64748B' },
    mmGoalTargetDate: { color: dark ? '#94A3B8' : '#64748B' },
    mmGoalNote: { color: dark ? '#94A3B8' : '#64748B' },
    mmGoalDepositBtn: { backgroundColor: '#10B981' },
    mmGoalDepositBtnText: { color: '#FFFFFF' },
    mmGoalDeleteBtn: { backgroundColor: dark ? '#450A0A' : '#FEE2E2' },
    mmGoalDeleteBtnText: { color: dark ? '#FCA5A5' : '#DC2626' },
    mmAnalyticsCard: { backgroundColor: dark ? '#1E293B' : '#FFFFFF', borderColor: dark ? '#334155' : '#E2E8F0' },
    mmAnalyticsTitle: { color: dark ? '#F8FAFC' : '#0F172A' },
    mmDistributionName: { color: dark ? '#F8FAFC' : '#0F172A' },
    mmDistributionAmount: { color: dark ? '#F8FAFC' : '#0F172A' },
    mmDistributionPct: { color: dark ? '#94A3B8' : '#64748B' },
    mmScheduleCard: { backgroundColor: dark ? '#1E293B' : '#FFFFFF', borderColor: dark ? '#334155' : '#E2E8F0' },
    mmScheduleTitle: { color: dark ? '#F8FAFC' : '#0F172A' },
    mmScheduleAmount: { color: dark ? '#F8FAFC' : '#0F172A' },
    mmScheduleMeta: { color: dark ? '#94A3B8' : '#64748B' },
    mmScheduleNote: { color: dark ? '#94A3B8' : '#64748B' },
    mmScheduleActionBtn: { backgroundColor: dark ? '#334155' : '#F1F5F9' },
    mmScheduleActionText: { color: dark ? '#F8FAFC' : '#334155' },
    mmScheduleResumeBtn: { backgroundColor: dark ? '#065F46' : '#D1FAE5' },
    mmScheduleResumeText: { color: dark ? '#A7F3D0' : '#047857' },
    mmScheduleDeleteBtn: { backgroundColor: dark ? '#7F1D1D' : '#FEE2E2' },
    mmScheduleDeleteText: { color: dark ? '#FECACA' : '#DC2626' },
    mmArchiveActionBtn: { backgroundColor: dark ? '#334155' : '#F1F5F9' },
    mmArchiveActionText: { color: dark ? '#F8FAFC' : '#334155' },
    mmScheduleActionRow: { borderTopColor: dark ? '#334155' : '#E2E8F0' },
    mmTipsCard: { backgroundColor: dark ? '#1E293B' : '#FFFFFF', borderColor: dark ? '#334155' : '#E2E8F0' },
    mmTipsTitle: { color: dark ? '#F8FAFC' : '#0F172A' },
    mmTipText: { color: dark ? '#CBD5E1' : '#475569' },
    mmTxnCard: { backgroundColor: dark ? '#1E293B' : '#FFFFFF', borderColor: dark ? '#334155' : '#E2E8F0' },
    mmTxnMeta: { color: dark ? '#94A3B8' : '#64748B' },
    mmTxnNote: { color: dark ? '#CBD5E1' : '#475569' },
    mmTxnPayee: { color: dark ? '#94A3B8' : '#64748B' },
    mmTxnActionRow: { borderTopColor: dark ? '#334155' : '#E2E8F0' },
    mmTxnActionBtn: { backgroundColor: dark ? '#334155' : '#F1F5F9' },
    mmTxnActionBtnText: { color: dark ? '#F8FAFC' : '#334155' },
    mmTxnDeleteBtn: { backgroundColor: dark ? '#7F1D1D' : '#FEE2E2' },
    mmTxnDeleteBtnText: { color: dark ? '#FECACA' : '#DC2626' },
    mmAccountActions: { borderTopColor: dark ? '#334155' : '#E2E8F0' },
    mmGoalActions: { borderTopColor: dark ? '#334155' : '#E2E8F0' },
    mmFilterChip: { backgroundColor: dark ? '#1E293B' : '#F1F5F9' },
    mmFilterChipActive: { backgroundColor: dark ? '#3B82F6' : '#2563EB' },
    mmFilterChipText: { color: dark ? '#94A3B8' : '#64748B' },
    mmFilterChipTextActive: { color: '#FFFFFF' },
    mmSortChip: { backgroundColor: dark ? '#1E293B' : '#F1F5F9' },
    mmSortChipActive: { backgroundColor: dark ? '#3B82F6' : '#2563EB' },
    mmSortChipText: { color: dark ? '#94A3B8' : '#64748B' },
    mmSortChipTextActive: { color: '#FFFFFF' },
    mmSortLabel: { color: dark ? '#94A3B8' : '#64748B' },
    mmCatChip: { backgroundColor: dark ? '#1E293B' : '#F1F5F9', borderColor: dark ? '#334155' : '#E2E8F0' },
    mmCatChipActive: { backgroundColor: dark ? '#3B82F6' : '#2563EB', borderColor: dark ? '#60A5FA' : '#1D4ED8' },
    mmCatChipText: { color: dark ? '#94A3B8' : '#64748B' },
    mmCatChipTextActive: { color: '#FFFFFF' },
    mmPrefPill: { backgroundColor: dark ? '#1E293B' : '#F1F5F9', borderColor: dark ? '#334155' : '#E2E8F0' },
    mmPrefPillActive: { backgroundColor: dark ? '#3B82F6' : '#2563EB', borderColor: dark ? '#60A5FA' : '#1D4ED8' },
    mmPrefPillText: { color: dark ? '#94A3B8' : '#64748B' },
    mmPrefPillTextActive: { color: '#FFFFFF' },
    mmToggleRow: { backgroundColor: dark ? '#1E293B' : '#FFFFFF', borderColor: dark ? '#334155' : '#E2E8F0' },
    mmToggleOn: { backgroundColor: dark ? '#064E3B' : '#D1FAE5', color: dark ? '#34D399' : '#047857' },
    mmToggleOff: { backgroundColor: dark ? '#374151' : '#F1F5F9', color: dark ? '#9CA3AF' : '#64748B' },
    mmTypeBtn: { backgroundColor: dark ? '#1E293B' : '#F1F5F9' },
    mmTypeBtnExpense: { backgroundColor: dark ? '#7F1D1D' : '#FEE2E2', borderColor: dark ? '#EF4444' : '#FCA5A5' },
    mmTypeBtnIncome: { backgroundColor: dark ? '#064E3B' : '#D1FAE5', borderColor: dark ? '#10B981' : '#6EE7B7' },
    mmTypeBtnTransfer: { backgroundColor: dark ? '#1E3A8A' : '#DBEAFE', borderColor: dark ? '#3B82F6' : '#93C5FD' },
    mmTypeBtnText: { color: dark ? '#94A3B8' : '#64748B' },
    mmTypeBtnTextActive: { color: dark ? '#FFFFFF' : '#1E293B' },
    mmIconChip: { backgroundColor: dark ? '#1E293B' : '#F1F5F9', borderColor: dark ? '#334155' : '#E2E8F0' },
    mmIconChipActive: { backgroundColor: dark ? '#1D4ED8' : '#DBEAFE', borderColor: dark ? '#60A5FA' : '#2563EB' },
    mmIconPickerItem: { backgroundColor: dark ? '#1E293B' : '#F8FAFC', borderColor: dark ? '#334155' : '#E2E8F0' },
    mmIconPickerItemActive: { backgroundColor: dark ? '#1E3A8A' : '#DBEAFE', borderColor: dark ? '#3B82F6' : '#2563EB' },
    mmColorChipActive: { borderColor: dark ? '#F8FAFC' : '#1D4ED8' },
    mmArchivedBadge: { backgroundColor: dark ? '#475569' : '#E2E8F0' },
    mmArchivedBadgeText: { color: dark ? '#CBD5E1' : '#475569' },
    mmStatusActive: { backgroundColor: dark ? '#065F46' : '#D1FAE5' },
    mmStatusPaused: { backgroundColor: dark ? '#475569' : '#F1F5F9' },
    mmStatusActiveText: { color: dark ? '#34D399' : '#047857' },
    mmStatusPausedText: { color: dark ? '#94A3B8' : '#64748B' },
    mmResetBtn: { backgroundColor: dark ? '#334155' : '#E2E8F0' },
    mmResetBtnText: { color: dark ? '#CBD5E1' : '#334155' },
    mmEmptyBtn: { backgroundColor: dark ? '#3B82F6' : '#2563EB' },
    mmEmptyBtnText: { color: '#FFFFFF' },
    mmSubmitBtn: { backgroundColor: dark ? '#059669' : '#059669' },
    mmSubmitBtnText: { color: '#FFFFFF' },
    mmModalHeader: { borderBottomColor: dark ? '#334155' : '#E2E8F0' },
    mmModalCloseBtn: { backgroundColor: dark ? '#334155' : '#F1F5F9' },
    mmProgressBarBg: { backgroundColor: dark ? '#334155' : '#E2E8F0' },
    mmEmptyBox: { backgroundColor: dark ? '#1E293B' : '#FFFFFF', borderColor: dark ? '#334155' : '#E2E8F0' },
    mmEmptyText: { color: dark ? '#94A3B8' : '#64748B' },
        mmToggleLabel: { color: dark ? '#F8FAFC' : '#0F172A' },
    // Theme & Language settings section tokens
    themeOptionCard: {
      backgroundColor: dark ? t.cardBgElevated : '#F8FAFC',
      borderColor: dark ? t.cardBorder : '#E2E8F0',
    },
    themeOptionCardActive: {
      borderColor: dark ? t.primary : '#B81414',
      backgroundColor: dark ? '#2B1212' : '#FEF2F2',
    },
    themeOptionTitle: { color: t.textPrimary },
    themeOptionSub: { color: t.textSecondary },
    themePreviewBox: {
      backgroundColor: t.cardBg,
      borderColor: t.cardBorder,
    },
    themePreviewSectionLabel: { color: t.textSecondary },
    themePreviewTitle: { color: t.textPrimary },
    themePreviewSub: { color: t.textSecondary },
    themePreviewAmount: { color: t.primary },
    themePreviewAmountLabel: { color: t.textMuted },
    themeCheckCircle: { backgroundColor: t.primary },
    themeUncheckCircle: { borderColor: dark ? t.textMuted : '#CBD5E1' },
    themeModeBadge: {
      backgroundColor: dark ? t.primaryLight : '#FEE2E2',
      borderColor: dark ? t.primary : '#FECACA',
    },
    themeModeBadgeText: {
      color: dark ? t.primary : '#B81414',
    },
    themeDoneBtn: {
      backgroundColor: t.primary,
    },
    themeDoneBtnText: {
      color: '#FFFFFF',
    },
    bottomSheetCard: {
      backgroundColor: t.modalSurface,
      borderColor: t.cardBorder,
    },
    bottomSheetHeader: {
      borderBottomColor: t.divider,
    },
    bottomSheetTitle: { color: t.textPrimary },
    bottomSheetSub: { color: t.textSecondary },
    bizPickerItem: {
      backgroundColor: dark ? t.cardBgElevated : '#F9FAFB',
      borderColor: dark ? t.cardBorder : '#E5E7EB',
      borderBottomColor: dark ? t.outline : '#E2E8F0',
    },
    bizPickerItemActive: {
      backgroundColor: dark ? '#2A1215' : '#FFF5F5',
      borderColor: t.primary,
      borderBottomColor: dark ? '#7F0C0C' : '#B81414',
    },
    bizPickerAvatar: {
      backgroundColor: dark ? t.surfaceVariant : '#FEE2E2',
      borderBottomColor: dark ? t.outline : '#FECACA',
    },
    bizPickerName: { color: t.textPrimary },
    bizPickerSub: { color: t.textSecondary },
    bizSectionTitle: { color: t.textSecondary },
    bizArchivedCard: {
      backgroundColor: dark ? t.cardBgElevated : '#F9FAFB',
      borderColor: dark ? t.cardBorder : '#E5E7EB',
      borderBottomColor: dark ? t.outline : '#E2E8F0',
    },
    bizArchiveBtn: {
      backgroundColor: dark ? t.surfaceVariant : '#F3F4F6',
      borderColor: dark ? t.cardBorder : '#E5E7EB',
      borderBottomColor: dark ? t.outline : '#D1D5DB',
    },
    bizArchiveBtnText: { color: t.textSecondary },
    activeBizBadge: {
      backgroundColor: dark ? '#064E3B' : '#DCFCE7',
      borderColor: dark ? '#065F46' : '#BBF7D0',
      borderBottomColor: dark ? '#047857' : '#86EFAC',
    },
    activeBizBadgeText: {
      color: dark ? '#6EE7B7' : '#047857',
    },
    // --- INVENTORY & STOCK THEMED STYLES (PHASE 7) ---
    stockMetricCard: {
      backgroundColor: dark ? '#1E293B' : '#FFFFFF',
      borderColor: dark ? '#334155' : '#E2E8F0',
      borderBottomColor: dark ? '#0F172A' : '#CBD5E1',
    },
    stockItemRow: {
      backgroundColor: dark ? '#1E293B' : '#FFFFFF',
      borderColor: dark ? '#334155' : '#E2E8F0',
      borderBottomColor: dark ? '#0F172A' : '#F1F5F9',
    },
    stockItemName: {
      color: t.textPrimary,
    },
    stockItemSub: {
      color: t.textSecondary,
    },
    stockFilterChip: {
      backgroundColor: dark ? '#1E293B' : '#F1F5F9',
      borderColor: dark ? '#334155' : '#E2E8F0',
    },
    stockFilterChipActive: {
      backgroundColor: dark ? '#3F1212' : '#FEF2F2',
      borderColor: t.primary,
    },
    stockFilterChipText: {
      color: t.textSecondary,
    },
    stockFilterChipTextActive: {
      color: t.primary,
    },
    stockBadgeLow: {
      backgroundColor: dark ? '#713F12' : '#FEF3C7',
      borderColor: dark ? '#92400E' : '#FDE68A',
      color: dark ? '#FBBF24' : '#B45309',
    },
    stockBadgeZero: {
      backgroundColor: dark ? '#7F1D1D' : '#FEE2E2',
      borderColor: dark ? '#991B1B' : '#FECACA',
      color: dark ? '#F87171' : '#DC2626',
    },
    stockBadgeOk: {
      backgroundColor: dark ? '#064E3B' : '#DCFCE7',
      borderColor: dark ? '#065F46' : '#BBF7D0',
      color: dark ? '#34D399' : '#047857',
    },
    stockAdjustToggleIn: {
      backgroundColor: dark ? '#064E3B' : '#DCFCE7',
      borderColor: dark ? '#047857' : '#86EFAC',
    },
    stockAdjustToggleOut: {
      backgroundColor: dark ? '#7F1D1D' : '#FEE2E2',
      borderColor: dark ? '#DC2626' : '#FECACA',
    },
    stockAdjustMiniBtnIn: {
      backgroundColor: dark ? '#065F46' : '#10B981',
      borderColor: dark ? '#047857' : '#059669',
    },
    stockAdjustMiniBtnOut: {
      backgroundColor: dark ? '#991B1B' : '#EF4444',
      borderColor: dark ? '#7F1D1D' : '#DC2626',
    },
    // --- TAGADA THEMED STYLES (PHASE 8) ---
    tagadaMetricCard: {
      backgroundColor: dark ? '#1E293B' : '#FFFFFF',
      borderColor: dark ? '#334155' : '#E2E8F0',
      borderBottomColor: dark ? '#0F172A' : '#CBD5E1',
    },
    tagadaCardItem: {
      backgroundColor: dark ? '#1E293B' : '#FFFFFF',
      borderColor: dark ? '#334155' : '#E2E8F0',
      borderBottomColor: dark ? '#0F172A' : '#F1F5F9',
    },
    tagadaCustName: {
      color: t.textPrimary,
    },
    tagadaCustPhone: {
      color: t.textSecondary,
    },
    tagadaCustDue: {
      color: dark ? '#F87171' : '#B81414',
    },
    tagadaFilterChip: {
      backgroundColor: dark ? '#1E293B' : '#F1F5F9',
      borderColor: dark ? '#334155' : '#E2E8F0',
    },
    tagadaFilterChipActive: {
      backgroundColor: dark ? '#3F1212' : '#FEF2F2',
      borderColor: t.primary,
    },
    tagadaFilterChipText: {
      color: t.textSecondary,
    },
    tagadaFilterChipTextActive: {
      color: t.primary,
    },
    tagadaHistoryLog: {
      backgroundColor: dark ? '#1E293B' : '#FFFFFF',
      borderColor: dark ? '#334155' : '#E2E8F0',
      borderBottomColor: dark ? '#0F172A' : '#F1F5F9',
    },
    // --- NOTES THEMED STYLES (PHASE 8) ---
    noteCardItem: {
      backgroundColor: dark ? '#1E293B' : '#FFFFFF',
      borderColor: dark ? '#334155' : '#E2E8F0',
      borderBottomColor: dark ? '#0F172A' : '#F1F5F9',
    },
    noteItemText: {
      color: t.textPrimary,
    },
    noteItemTextDone: {
      color: t.textMuted,
    },
    noteDateText: {
      color: t.textSecondary,
    },
    noteFilterChip: {
      backgroundColor: dark ? '#1E293B' : '#F1F5F9',
      borderColor: dark ? '#334155' : '#E2E8F0',
    },
    noteFilterChipActive: {
      backgroundColor: dark ? '#3F1212' : '#FEF2F2',
      borderColor: t.primary,
    },
    noteFilterChipText: {
      color: t.textSecondary,
    },
    noteFilterChipTextActive: {
      color: t.primary,
    },
    // --- REPORTS THEMED STYLES (PHASE 8) ---
    reportContainer: {
      backgroundColor: t.screenBg,
    },
    reportHeader: {
      backgroundColor: dark ? t.headerBg : '#B81414',
      borderBottomColor: dark ? t.divider : '#B81414',
    },
    reportKpiCard: {
      backgroundColor: dark ? '#1E293B' : '#FFFFFF',
      borderColor: dark ? '#334155' : '#E5E7EB',
      borderBottomColor: dark ? '#0F172A' : '#CBD5E1',
    },
    reportKpiLabel: {
      color: t.textSecondary,
    },
    reportKpiValue: {
      color: t.textPrimary,
    },
    reportSubKpiCard: {
      backgroundColor: dark ? '#1E293B' : '#FFFFFF',
      borderColor: dark ? '#334155' : '#F3F4F6',
    },
    reportSubKpiLabel: {
      color: t.textMuted,
    },
    reportSubKpiValue: {
      color: t.textPrimary,
    },
    reportRowCard: {
      backgroundColor: dark ? '#1E293B' : '#FFFFFF',
      borderColor: dark ? '#334155' : '#F3F4F6',
      borderBottomColor: dark ? '#0F172A' : '#F3F4F6',
    },
    reportRowName: {
      color: t.textPrimary,
    },
    reportRowSub: {
      color: t.textSecondary,
    },
    reportRowAmt: {
      color: t.textPrimary,
    },
    reportSectionTitle: {
      color: t.textPrimary,
    },
  };
}

// ===================================================================
// MONEY MANAGER CUSTOMIZATION ENGINE & SECTION RESOLUTION (PHASE 9)
// ===================================================================

const MM_THEME_PRESETS = {
  emerald: {
    id: 'emerald',
    name: 'এমারেল্ড',
    nameEn: 'Emerald',
    color: '#10B981',
    accent: '#10B981',
    light: { accent: '#10B981', cardBg: '#FFFFFF', textPrimary: '#064E3B', border: '#A7F3D0' },
    dark: { accent: '#34D399', cardBg: '#064E3B', textPrimary: '#ECFDF5', border: '#047857' },
  },
  sapphire: {
    id: 'sapphire',
    name: 'স্যাফায়ার',
    nameEn: 'Sapphire',
    color: '#2563EB',
    accent: '#2563EB',
    light: { accent: '#2563EB', cardBg: '#FFFFFF', textPrimary: '#1E3A8A', border: '#BFDBFE' },
    dark: { accent: '#60A5FA', cardBg: '#1E3A8A', textPrimary: '#EFF6FF', border: '#1D4ED8' },
  },
  obsidian: {
    id: 'obsidian',
    name: 'ওবসিডিয়ান',
    nameEn: 'Obsidian',
    color: '#334155',
    accent: '#334155',
    light: { accent: '#334155', cardBg: '#FFFFFF', textPrimary: '#0F172A', border: '#CBD5E1' },
    dark: { accent: '#94A3B8', cardBg: '#0F172A', textPrimary: '#F8FAFC', border: '#334155' },
  },
  rose: {
    id: 'rose',
    name: 'রোজ গোল্ড',
    nameEn: 'Rose Gold',
    color: '#EC4899',
    accent: '#EC4899',
    light: { accent: '#EC4899', cardBg: '#FFFFFF', textPrimary: '#831843', border: '#FBCFE8' },
    dark: { accent: '#F472B6', cardBg: '#831843', textPrimary: '#FDF2F8', border: '#BE185D' },
  },
  amber: {
    id: 'amber',
    name: 'অ্যাম্বার',
    nameEn: 'Amber',
    color: '#F59E0B',
    accent: '#F59E0B',
    light: { accent: '#F59E0B', cardBg: '#FFFFFF', textPrimary: '#78350F', border: '#FDE68A' },
    dark: { accent: '#FBBF24', cardBg: '#78350F', textPrimary: '#FFFBEB', border: '#B45309' },
  },
  amethyst: {
    id: 'amethyst',
    name: 'অ্যামিথিস্ট',
    nameEn: 'Deep Amethyst',
    color: '#8B5CF6',
    accent: '#8B5CF6',
    light: { accent: '#8B5CF6', cardBg: '#FFFFFF', textPrimary: '#4C1D95', border: '#DDD6FE' },
    dark: { accent: '#A78BFA', cardBg: '#4C1D95', textPrimary: '#F5F3FF', border: '#6D28D9' },
  },
  custom: {
    id: 'custom',
    name: 'কাস্টম',
    nameEn: 'Custom',
    color: '#B81414',
    accent: '#B81414',
    light: { accent: '#B81414', cardBg: '#FFFFFF', textPrimary: '#1E293B', border: '#E2E8F0' },
    dark: { accent: '#EF4444', cardBg: '#1E293B', textPrimary: '#F8FAFC', border: '#334155' },
  },
};

const MM_CUSTOMIZATION_SECTIONS = [
  { id: 'dashboard', labelBn: 'ড্যাশবোর্ড', labelEn: 'Dashboard', icon: '📊', subsections: ['hero', 'inout', 'actions', 'carousel'] },
  { id: 'transactions', labelBn: 'লেনদেন তালিকা', labelEn: 'Transactions', icon: '📝', subsections: ['list', 'header', 'amount', 'filter'] },
  { id: 'wallets', labelBn: 'হিসাব ও ওয়ালেট', labelEn: 'Wallets & Accounts', icon: '💳', subsections: ['cards', 'balance', 'summary', 'add_btn'] },
  { id: 'budgets', labelBn: 'বাজেট', labelEn: 'Budgets', icon: '🎯', subsections: ['overall', 'tiles', 'progress', 'alerts'] },
  { id: 'goals', labelBn: 'সঞ্চয় লক্ষ্য', labelEn: 'Savings Goals', icon: '🏆', subsections: ['cards', 'progress', 'metrics', 'action_btns'] },
  { id: 'analytics', labelBn: 'অ্যানালিটিক্স', labelEn: 'Analytics', icon: '📈', subsections: ['kpi', 'chart', 'breakdown', 'ranking'] },
  { id: 'categories', labelBn: 'ক্যাটাগরি সমূহ', labelEn: 'Categories', icon: '🏷️', subsections: ['tiles', 'icon', 'type_badge', 'archive'] },
  { id: 'reports', labelBn: 'রিপোর্ট ও বিবরণী', labelEn: 'Reports & Statements', icon: '📑', subsections: ['summary', 'table', 'export_btn', 'statement'] },
];

function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return { r: 184, g: 20, b: 20 };
  const clean = hex.replace('#', '');
  const num = parseInt(clean.slice(0, 6), 16);
  if (isNaN(num)) return { r: 184, g: 20, b: 20 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map((c) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(hex1, hex2) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function blendColors(fgHex, alpha, bgHex) {
  const fg = hexToRgb(fgHex);
  const bg = hexToRgb(bgHex);
  const r = Math.round(fg.r * alpha + bg.r * (1 - alpha));
  const g = Math.round(fg.g * alpha + bg.g * (1 - alpha));
  const b = Math.round(fg.b * alpha + bg.b * (1 - alpha));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

function isValidHex(hex) {
  return typeof hex === 'string' && /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(hex.trim());
}

function coerceFloat(val, fallback, min, max) {
  const p = parseFloat(val);
  if (isNaN(p)) return fallback;
  return Math.min(max, Math.max(min, Math.round(p * 100) / 100));
}

function computeTintBackground(accentHex, tintOpacity, isDark, surfaceHex) {
  const alphaVal = Math.min(255, Math.max(0, Math.round(tintOpacity * 255)));
  const hexAlpha = alphaVal.toString(16).padStart(2, '0').toUpperCase();

  if (isDark) {
    const rgb = hexToRgb(accentHex);
    return 'rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', ' + Math.min(0.25, tintOpacity) + ')';
  }
  const cleanHex = accentHex.startsWith('#') ? accentHex.slice(0, 7) : '#' + accentHex.slice(0, 6);
  return cleanHex + hexAlpha;
}

function getCanonicalDefaultCustomization() {
  return {
    schemaVersion: 3,
    updatedAt: '2026-11-01T00:00:00.000Z',
    global: {
      preset: 'classic_red',
      accent: '#B81414',
      tint: 0.1,
      textScale: 1.0,
      surfaceMode: 'subtle_tint',
      borderStyle: 'thin',
      elevation: 'medium',
    },
    sections: {},
    accessibility: {
      minContrastRatio: 4.5,
      minTextScale: 0.85,
      maxTextScale: 1.3,
      minTouchTargetDp: 48,
      enforceContrastGuard: true,
    },
  };
}

function migrateCustomizationToV3(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return getCanonicalDefaultCustomization();
  }
  if (raw.schemaVersion === 3 && raw.global && raw.sections && raw.accessibility) {
    return raw;
  }

  const rawGlobal = raw.global && typeof raw.global === 'object' ? raw.global : {};
  const globalConfig = {
    preset: rawGlobal.preset || 'classic_red',
    accent: isValidHex(rawGlobal.accent) ? rawGlobal.accent : '#B81414',
    tint: coerceFloat(rawGlobal.tint, 0.1, 0.05, 0.4),
    textScale: coerceFloat(rawGlobal.textScale, 1.0, 0.85, 1.3),
    surfaceMode: rawGlobal.surfaceMode || 'subtle_tint',
    borderStyle: rawGlobal.borderStyle || 'thin',
    elevation: rawGlobal.elevation || 'medium',
  };

  const VALID_SECTIONS = [
    'dashboard', 'transactions', 'wallets', 'budgets',
    'goals', 'analytics', 'reports', 'categories',
  ];

  const sourceSections = raw.sections && typeof raw.sections === 'object' ? raw.sections : raw;
  const migratedSections = {};

  VALID_SECTIONS.forEach((secKey) => {
    const sec = sourceSections[secKey];
    if (sec && typeof sec === 'object' && !Array.isArray(sec)) {
      migratedSections[secKey] = {
        preset: sec.preset || globalConfig.preset,
        accent: isValidHex(sec.accent) ? sec.accent : globalConfig.accent,
        tint: coerceFloat(sec.tint, globalConfig.tint, 0.05, 0.4),
        textScale: coerceFloat(sec.textScale, globalConfig.textScale, 0.85, 1.3),
        surfaceMode: sec.surfaceMode || globalConfig.surfaceMode,
        borderStyle: sec.borderStyle || globalConfig.borderStyle,
        elevation: sec.elevation || globalConfig.elevation,
        ...(sec.subsections && typeof sec.subsections === 'object' ? { subsections: sec.subsections } : {}),
      };
    }
  });

  return {
    schemaVersion: 3,
    updatedAt: raw.updatedAt || new Date().toISOString(),
    global: globalConfig,
    sections: migratedSections,
    accessibility: {
      minContrastRatio: 4.5,
      minTextScale: 0.85,
      maxTextScale: 1.3,
      minTouchTargetDp: 48,
      enforceContrastGuard: raw.accessibility?.enforceContrastGuard !== false,
    },
  };
}

function resolveMMSectionStyle(sectionId, arg2, arg3, arg4, arg5) {
  const isConsumerStyleCall = typeof arg2 === 'string';

  let mmCustomization = isConsumerStyleCall ? (arg5 || {}) : (arg2 || {});
  let isDark = isConsumerStyleCall ? !!arg4 : !!arg3;
  let currentTheme = (!isConsumerStyleCall && arg4) ? arg4 : (isDark ? DARK_THEME : LIGHT_THEME);
  let subsectionId = !isConsumerStyleCall ? arg5 : null;
  let elementType = isConsumerStyleCall ? arg2 : null;
  let fallbackStyle = isConsumerStyleCall ? arg3 : null;

  // Layer 1: Base Design System Tokens
  let accent = isDark ? currentTheme.primary : (currentTheme.primary || '#B81414');
  let tint = 0.1;
  let textScale = 1.0;
  let surfaceMode = 'subtle_tint';
  let borderStyle = 'thin';
  let elevation = 'medium';

  // Layer 2: Global Money Manager Customization Overrides
  const globalConf = mmCustomization?.global;
  if (globalConf && typeof globalConf === 'object') {
    if (isValidHex(globalConf.accent)) accent = globalConf.accent;
    if (!isNaN(parseFloat(globalConf.tint))) tint = parseFloat(globalConf.tint);
    if (!isNaN(parseFloat(globalConf.textScale))) textScale = parseFloat(globalConf.textScale);
    if (globalConf.surfaceMode) surfaceMode = globalConf.surfaceMode;
    if (globalConf.borderStyle) borderStyle = globalConf.borderStyle;
    if (globalConf.elevation) elevation = globalConf.elevation;
  }

  // Layer 3: Section-Specific Overrides
  const secConf = mmCustomization?.sections?.[sectionId] || mmCustomization?.[sectionId];
  if (secConf && typeof secConf === 'object') {
    if (secConf.preset && MM_THEME_PRESETS[secConf.preset]) {
      accent = MM_THEME_PRESETS[secConf.preset].color;
    }
    if (isValidHex(secConf.accent)) accent = secConf.accent;
    if (!isNaN(parseFloat(secConf.tint))) tint = parseFloat(secConf.tint);
    if (!isNaN(parseFloat(secConf.textScale))) textScale = parseFloat(secConf.textScale);
    if (secConf.surfaceMode) surfaceMode = secConf.surfaceMode;
    if (secConf.borderStyle) borderStyle = secConf.borderStyle;
    if (secConf.elevation) elevation = secConf.elevation;
  }

  // Layer 4: Subsection Overrides
  if (subsectionId && secConf?.subsections?.[subsectionId]) {
    const subConf = secConf.subsections[subsectionId];
    if (isValidHex(subConf.accent)) accent = subConf.accent;
    if (!isNaN(parseFloat(subConf.tint))) tint = parseFloat(subConf.tint);
    if (!isNaN(parseFloat(subConf.textScale))) textScale = parseFloat(subConf.textScale);
  }

  // Layer 5: Accessibility Clamping & Contrast Guard
  const clampedScale = Math.min(1.3, Math.max(0.85, Math.round(textScale * 100) / 100));
  const clampedTint = Math.min(0.4, Math.max(0.05, Math.round(tint * 100) / 100));

  const cardSurface = isDark ? currentTheme.cardBgElevated : currentTheme.cardBg;
  const cardBackground = surfaceMode === 'solid_card'
    ? cardSurface
    : computeTintBackground(accent, clampedTint, isDark, cardSurface);

  let cardBorder = currentTheme.cardBorder;
  if (borderStyle === 'accent_colored') cardBorder = accent;
  else if (borderStyle === 'bold') cardBorder = isDark ? '#475569' : '#CBD5E1';
  else if (borderStyle === 'none') cardBorder = 'transparent';

  // Contrast auto-correction
  let accessibleAccent = accent;
  const effectiveBg = cardBackground.startsWith('#') && cardBackground.length === 9
    ? blendColors(cardBackground.slice(0, 7), clampedTint, cardSurface)
    : cardSurface;
  const contrastRatio = getContrastRatio(accent, effectiveBg);
  if (contrastRatio < 4.5) {
    accessibleAccent = isDark ? '#FCA5A5' : '#7F1D1D';
  }

  const descriptor = {
    sectionId,
    accentColor: accessibleAccent,
    cardBackground,
    cardBorder,
    primaryText: currentTheme.textPrimary,
    secondaryText: currentTheme.textSecondary,
    fontScale: clampedScale,
    badgeBackground: computeTintBackground(accessibleAccent, 0.15, isDark, cardSurface),
    badgeText: accessibleAccent,
    elevation,
    getScaledFontSize: (base) => Math.round(base * clampedScale),
  };

  if (!isConsumerStyleCall) {
    return descriptor;
  }

  // Consumer style mapping
  const base = Array.isArray(fallbackStyle)
    ? Object.assign({}, ...fallbackStyle.filter(Boolean))
    : (fallbackStyle || {});

  switch (elementType) {
    case 'card': {
      const cardResult = { ...base };
      if (cardBackground) cardResult.backgroundColor = cardBackground;
      if (cardBorder) {
        cardResult.borderColor = cardBorder;
        cardResult.borderBottomColor = cardBorder;
      }
      return cardResult;
    }
    case 'header':
    case 'text': {
      const textResult = { ...base };
      if (textResult.fontSize) {
        textResult.fontSize = descriptor.getScaledFontSize(textResult.fontSize);
      }
      return textResult;
    }
    case 'amount': {
      const amtResult = { ...base };
      if (accessibleAccent) amtResult.color = accessibleAccent;
      if (amtResult.fontSize) {
        amtResult.fontSize = descriptor.getScaledFontSize(amtResult.fontSize);
      }
      return amtResult;
    }
    case 'accent':
      return accessibleAccent;
    case 'border': {
      const borderResult = { ...base };
      if (cardBorder) borderResult.borderColor = cardBorder;
      return borderResult;
    }
    case 'progressBar': {
      const pbResult = { ...base };
      if (accessibleAccent) pbResult.backgroundColor = accessibleAccent;
      return pbResult;
    }
    case 'pill': {
      const pillResult = { ...base };
      if (accessibleAccent) {
        pillResult.borderColor = accessibleAccent;
        pillResult.backgroundColor = computeTintBackground(accessibleAccent, 0.15, isDark, cardSurface);
      }
      return pillResult;
    }
    default:
      return base;
  }
}

module.exports = {
  MM_THEME_PRESETS,
  MM_CUSTOMIZATION_SECTIONS,
  resolveMMSectionStyle,
  migrateCustomizationToV3,
  getCanonicalDefaultCustomization,
  computeTintBackground,
  hexToRgb,
  getContrastRatio,
  blendColors,
  isValidHex,
  getThemedStyles,
  LIGHT_THEME,
  DARK_THEME,
  getThemeTokens,
  LIGHT_ICON_THEMES,
  DARK_ICON_THEMES,
  getIconTheme,
};
