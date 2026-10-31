const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

// 1. Add dueTagBadge after customerChevron
const chevronTarget = `  customerChevron: {
    width: 14,
    height: 14,
    tintColor: '#9CA3AF',
    marginLeft: 6,
  },`;

const chevronAddition = chevronTarget + `
  dueTagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 2,
    alignSelf: 'flex-end',
  },
  dueTagText: {
    fontSize: 10,
    fontWeight: 'bold',
  },`;

if (code.includes(chevronTarget) && !code.includes('dueTagBadge: {')) {
  code = code.replace(chevronTarget, chevronAddition);
  console.log('[PASS] Added dueTagBadge styles');
}

// 2. Add ledgerTypePill & ledgerRowIndicator before ledgerHeaderNav
const ledgerNavTarget = `  // --- ACCOUNT LEDGER SCREEN ---
  ledgerHeaderNav: {`;

const ledgerNavAddition = `  // --- ACCOUNT LEDGER SCREEN ---
  ledgerTypePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  ledgerTypePillText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  ledgerRowIndicatorSquircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255, 255, 255, 0.4)',
    borderBottomWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ledgerRowIndicatorText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  ledgerHeaderNav: {`;

if (code.includes(ledgerNavTarget) && !code.includes('ledgerTypePill: {')) {
  code = code.replace(ledgerNavTarget, ledgerNavAddition);
  console.log('[PASS] Added ledgerTypePill and ledgerRowIndicator styles');
}

fs.writeFileSync('App.js', code, 'utf8');
console.log('[PASS] Styles updated in App.js');
