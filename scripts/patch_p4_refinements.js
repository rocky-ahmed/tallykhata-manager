const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

// 1. Account profile card dark mode fix
const cardOld = '<Card3D variant="financial" isDark={isDark} style={styles.accountProfileCard}>';
const cardNew = '<Card3D variant="financial" isDark={isDark} style={[styles.accountProfileCard, isDark && { backgroundColor: currentTheme.cardBg, borderColor: currentTheme.cardBorder, borderBottomColor: "#1E293B", borderTopColor: "rgba(255,255,255,0.08)" }]}>';

if (code.includes(cardOld)) {
  code = code.replace(cardOld, cardNew);
  console.log('Fixed accountProfileCard dark mode styling');
} else {
  console.log('cardOld not found');
}

// 2. Running balance calculation in accountJournals
const targetOld = 'return { accountJournals: list, totalGiven: given, totalReceived: received };';
const targetNew = `    let runningPaisa = Math.round(openingBal * 100);
    const listWithBalance = list.map((item) => {
      if (item.isOpening) {
        return { ...item, balance: openingBal };
      }
      const amtPaisa = Math.round(Number(item.amount || 0) * 100);
      if (isCust) {
        if (item.type === 'given') runningPaisa += amtPaisa;
        else if (item.type === 'received') runningPaisa -= amtPaisa;
      } else {
        if (item.type === 'received') runningPaisa += amtPaisa;
        else if (item.type === 'given') runningPaisa -= amtPaisa;
      }
      return { ...item, balance: runningPaisa / 100 };
    });
    return { accountJournals: listWithBalance, totalGiven: given, totalReceived: received };`;

if (code.includes(targetOld)) {
  code = code.replace(targetOld, targetNew);
  console.log('Successfully added running balance calculation to accountJournals');
} else {
  console.log('targetOld not found');
}

// 3. Fix duplicate currency strings in modalVoucher and modalAddTxn
code = code.replace(/tStatic\("৳\s+৳ "\)/g, 'tStatic("৳ ")');

fs.writeFileSync('App.js', code, 'utf8');
console.log('App.js updated successfully');
