const fs = require('fs');
const babel = require('@babel/core');

let code = fs.readFileSync('App.js', 'utf8');

// 1. modalAddMoney modalCard & inputs
const oldAddMoneyCard = `      {/* ===================================================================
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
            </View>`;

const newAddMoneyCard = `      {/* ===================================================================
          MODAL: TALLYPAY ADD MONEY
         =================================================================== */}
      <Modal visible={modalAddMoney} animationType="slide" transparent onRequestClose={() => setModalAddMoney(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isDark && tStyles.modalSurface]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalCardTitle, isDark && tStyles.textPrimary]}>{tStatic("ওয়ালেটে অ্যাড মানি")}</Text>
              <TouchableOpacity
                onPress={() => setModalAddMoney(false)}
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
            </View>`;

if (code.includes(oldAddMoneyCard)) {
  code = code.replace(oldAddMoneyCard, newAddMoneyCard);
  console.log('[PASS] Updated modalAddMoney card header');
}

const oldAddMoneyInput = `            <TextInput
              style={styles.modalBigInput}
              placeholder={tStatic("৳ টাকার পরিমাণ")}
              keyboardType="numeric"
              autoFocus
              value={addMoneyAmount}
              onChangeText={setAddMoneyAmount}
            />`;

const newAddMoneyInput = `            <TextInput
              style={[styles.modalBigInput, isDark && tStyles.input]}
              placeholder={tStatic("৳ টাকার পরিমাণ")}
              placeholderTextColor={isDark ? currentTheme.textSecondary : COLORS.textSubtle}
              keyboardType="numeric"
              autoFocus
              value={addMoneyAmount}
              onChangeText={setAddMoneyAmount}
            />`;

if (code.includes(oldAddMoneyInput)) {
  code = code.replace(oldAddMoneyInput, newAddMoneyInput);
  console.log('[PASS] Updated modalAddMoney input styling');
}

// 2. modalMoneyOut modalCard & inputs
const oldMoneyOutCard = `      {/* 8. MONEY OUT */}
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
            </View>`;

const newMoneyOutCard = `      {/* 8. MONEY OUT */}
      <Modal
        visible={modalMoneyOut}
        animationType="slide"
        transparent
        onRequestClose={() => setModalMoneyOut(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { padding: 18 }, isDark && tStyles.modalSurface]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalCardTitle, isDark && tStyles.textPrimary]}>{tStatic("টাকা উত্তোলন / ট্রান্সফার")}</Text>
              <TouchableOpacity
                onPress={() => setModalMoneyOut(false)}
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
            </View>`;

if (code.includes(oldMoneyOutCard)) {
  code = code.replace(oldMoneyOutCard, newMoneyOutCard);
  console.log('[PASS] Updated modalMoneyOut card header');
}

// 3. modalTxnLimit dark mode background
const oldTxnLimitSafe = `      <Modal
        visible={modalTxnLimit}
        animationType="slide"
        onRequestClose={() => setModalTxnLimit(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FA' }}>`;

const newTxnLimitSafe = `      <Modal
        visible={modalTxnLimit}
        animationType="slide"
        onRequestClose={() => setModalTxnLimit(false)}
      >
        <SafeAreaView style={[{ flex: 1, backgroundColor: '#F8F9FA' }, isDark && tStyles.screenBg]}>`;

if (code.includes(oldTxnLimitSafe)) {
  code = code.replace(oldTxnLimitSafe, newTxnLimitSafe);
  console.log('[PASS] Updated modalTxnLimit SafeAreaView');
}

// Validate with Babel parser
try {
  babel.parseSync(code, {
    filename: 'App.js',
    configFile: false,
    babelrc: false,
    parserOpts: { plugins: ['jsx', 'flow'] }
  });
  fs.writeFileSync('App.js', code, 'utf8');
  console.log('[SUCCESS] Dark mode polish applied and verified with Babel successfully!');
} catch (e) {
  console.error('[FAIL] Babel syntax error:', e.message);
  process.exit(1);
}
