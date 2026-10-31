const fs = require('fs');
const babel = require('@babel/core');

let code = fs.readFileSync('App.js', 'utf8');

// 1. Cashbox big buttons in activeTab === 'cashbox'
const oldCashButtons = `            {/* Cash Entry Big Buttons (+ ক্যাশ বেচা, - দোকান খরচ) */}
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
            </View>`;

const newCashButtons = `            {/* Cash Entry Big Buttons (+ ক্যাশ বেচা, - দোকান খরচ) */}
            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 12, marginTop: 12 }}>
              <Button3D
                title={tStatic("+ ক্যাশ বেচা")}
                variant="success"
                size="lg"
                isDark={isDark}
                onPress={() => {
                  setCashCategory('sale');
                  setModalAddCash(true);
                }}
                style={{ flex: 1 }}
              />
              <Button3D
                title={tStatic("- দোকান খরচ")}
                variant="destructive"
                size="lg"
                isDark={isDark}
                onPress={() => {
                  setCashCategory('cost');
                  setModalAddCash(true);
                }}
                style={{ flex: 1 }}
              />
            </View>`;

if (code.includes(oldCashButtons)) {
  code = code.replace(oldCashButtons, newCashButtons);
  console.log('[PASS] Replaced Cash Entry Big Buttons with Button3D');
} else {
  console.log('[WARN] oldCashButtons not found');
}

// 2. modalAddCash action buttons
const oldAddCashBtns = `            <View style={styles.modalBtnRow}>
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
            </View>`;

const newAddCashBtns = `            <View style={styles.modalBtnRow}>
              <Button3D
                title={tStatic("বাতিল")}
                variant="secondary"
                size="md"
                isDark={isDark}
                onPress={() => setModalAddCash(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button3D
                title={tStatic("সংরক্ষণ করুন")}
                variant={cashCategory === 'sale' || cashCategory === 'malik_in' ? "success" : "destructive"}
                size="md"
                isDark={isDark}
                onPress={handleSaveCashEntry}
                style={{ flex: 1.5 }}
              />
            </View>`;

if (code.includes(oldAddCashBtns)) {
  code = code.replace(oldAddCashBtns, newAddCashBtns);
  console.log('[PASS] Replaced modalAddCash buttons with Button3D');
} else {
  console.log('[WARN] oldAddCashBtns not found');
}

// 3. modalReconcileCash action buttons
const oldReconcileBtns = `            <View style={styles.modalBtnRow}>
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
            </View>`;

const newReconcileBtns = `            <View style={styles.modalBtnRow}>
              <Button3D
                title={tStatic("বাতিল")}
                variant="secondary"
                size="md"
                isDark={isDark}
                onPress={() => setModalReconcileCash(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button3D
                title={tStatic("সমন্বয় সংরক্ষণ")}
                variant="primary"
                size="md"
                isDark={isDark}
                onPress={handleSaveDenominations}
                style={{ flex: 1.5 }}
              />
            </View>`;

if (code.includes(oldReconcileBtns)) {
  code = code.replace(oldReconcileBtns, newReconcileBtns);
  console.log('[PASS] Replaced modalReconcileCash buttons with Button3D');
} else {
  console.log('[WARN] oldReconcileBtns not found');
}

// 4. modalBanglaQR action buttons
const oldBanglaQRBtns = `            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, width: '100%' }}>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.blue, flex: 1 }]}
                onPress={() => {
                  Share.share({
                    message: \`=== \${businessName}\${tStatic(" (বাংলা QR) ===\\nমার্চেন্ট আইডি: TP-")}\${ownerPhone}\${tStatic("\\nবিকাশ/নগদ/রকেট বা ব্যাংক দিয়ে পেমেন্ট করুন।")}\`,
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
            </View>`;

const newBanglaQRBtns = `            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, width: '100%' }}>
              <Button3D
                title={tStatic("শেয়ার কিউআর")}
                variant="info"
                size="md"
                isDark={isDark}
                onPress={() => {
                  Share.share({
                    message: \`=== \${businessName}\${tStatic(" (বাংলা QR) ===\\nমার্চেন্ট আইডি: TP-")}\${ownerPhone}\${tStatic("\\nবিকাশ/নগদ/রকেট বা ব্যাংক দিয়ে পেমেন্ট করুন।")}\`,
                  });
                }}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button3D
                title={tStatic("বন্ধ করুন")}
                variant="secondary"
                size="md"
                isDark={isDark}
                onPress={() => setModalBanglaQR(false)}
                style={{ flex: 1 }}
              />
            </View>`;

if (code.includes(oldBanglaQRBtns)) {
  code = code.replace(oldBanglaQRBtns, newBanglaQRBtns);
  console.log('[PASS] Replaced modalBanglaQR buttons with Button3D');
} else {
  console.log('[WARN] oldBanglaQRBtns not found');
}

// 5. modalAddMoney action buttons
const oldAddMoneyBtns = `            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalAddMoney(false)}>
                <Text style={styles.modalBtnCancelText}>{tStatic("বাতিল")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.green }]}
                onPress={handleAddMoney}
              >
                <Text style={styles.modalBtnSubmitText}>{tStatic("অ্যাড মানি করুন")}</Text>
              </TouchableOpacity>
            </View>`;

const newAddMoneyBtns = `            <View style={styles.modalBtnRow}>
              <Button3D
                title={tStatic("বাতিল")}
                variant="secondary"
                size="md"
                isDark={isDark}
                onPress={() => setModalAddMoney(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button3D
                title={tStatic("অ্যাড মানি করুন")}
                variant="success"
                size="md"
                isDark={isDark}
                onPress={handleAddMoney}
                style={{ flex: 1.5 }}
              />
            </View>`;

if (code.includes(oldAddMoneyBtns)) {
  code = code.replace(oldAddMoneyBtns, newAddMoneyBtns);
  console.log('[PASS] Replaced modalAddMoney buttons with Button3D');
} else {
  console.log('[WARN] oldAddMoneyBtns not found');
}

// 6. modalMoneyOut action buttons
const oldMoneyOutBtns = `            <View style={[styles.modalBtnRow, { marginTop: 14 }]}>
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
            </View>`;

const newMoneyOutBtns = `            <View style={[styles.modalBtnRow, { marginTop: 14 }]}>
              <Button3D
                title={tStatic("বাতিল")}
                variant="secondary"
                size="md"
                isDark={isDark}
                onPress={() => setModalMoneyOut(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button3D
                title={tStatic("ট্রান্সফার নিশ্চিত করুন")}
                variant="primary"
                size="md"
                isDark={isDark}
                onPress={handleMoneyOut}
                style={{ flex: 1.5 }}
              />
            </View>`;

if (code.includes(oldMoneyOutBtns)) {
  code = code.replace(oldMoneyOutBtns, newMoneyOutBtns);
  console.log('[PASS] Replaced modalMoneyOut buttons with Button3D');
} else {
  console.log('[WARN] oldMoneyOutBtns not found');
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
  console.log('[SUCCESS] All Phase 5 Button3D upgrades applied and verified with Babel successfully!');
} catch (e) {
  console.error('[FAIL] Babel syntax error:', e.message);
  process.exit(1);
}
