const fs = require('fs');
const babel = require('@babel/core');

let code = fs.readFileSync('App.js', 'utf8');

// --- 1. modalAddTxn ---
const addTxnStartMarker = '<Modal visible={modalAddTxn} animationType="slide" transparent onRequestClose={() => setModalAddTxn(false)}>';
const addTxnEndMarker = `            {/* Modal Action Buttons */}
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
      </Modal>`;

const addStartIdx = code.indexOf(addTxnStartMarker);
const addEndIdx = code.indexOf(addTxnEndMarker);

if (addStartIdx === -1 || addEndIdx === -1) {
  console.error('[FAIL] Could not find modalAddTxn markers');
  process.exit(1);
}

const newModalAddTxn = `<Modal visible={modalAddTxn} animationType="slide" transparent onRequestClose={() => setModalAddTxn(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isDark && tStyles.modalSurface, { maxHeight: '95%' }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalCardTitle, { color: txnType === 'given' ? (isDark ? currentTheme.danger : COLORS.primary) : (isDark ? currentTheme.success : COLORS.green) }]}>
                {isCustomer
                  ? (txnType === 'given' ? tStatic("- দিলাম (টাকা বা পণ্য বাকি)") : tStatic("+ পেলাম (নগদ বা জমা আদায়)"))
                  : (txnType === 'given' ? tStatic("- দিলাম (টাকা পরিশোধ)") : tStatic("+ পেলাম (বাকিতে মাল ক্রয়)"))
                }
              </Text>
              <TouchableOpacity
                onPress={() => setModalAddTxn(false)}
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

            {/* Large 3D Calculator Display */}
            <View style={[
              styles.calcDisplayBox,
              {
                backgroundColor: isDark ? currentTheme.cardBgElevated : '#F8FAFC',
                borderColor: txnType === 'given' ? (isDark ? '#7F1D1D' : '#FCA5A5') : (isDark ? '#065F46' : '#86EFAC'),
                borderTopWidth: 1.5,
                borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
                borderBottomWidth: 3,
                borderBottomColor: txnType === 'given' ? (isDark ? '#991B1B' : '#F87171') : (isDark ? '#047857' : '#4ADE80'),
              }
            ]}>
              <Text style={[styles.calcExprText, isDark && tStyles.textSecondary]}>{calcExpr || tStatic("০")}</Text>
              <Text style={[styles.calcTotalText, { color: txnType === 'given' ? (isDark ? currentTheme.danger : COLORS.primary) : (isDark ? currentTheme.success : COLORS.green) }]}>
                {tStatic("৳ ")}{calcDisplay}
              </Text>
            </View>

            {/* Quick Amount Add Chips (3D tactile pills) */}
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
                  style={[
                    styles.quickChip,
                    isDark && {
                      backgroundColor: currentTheme.cardBgElevated,
                      borderColor: currentTheme.cardBorder,
                      borderTopColor: 'rgba(255,255,255,0.08)',
                      borderBottomColor: '#1E293B',
                    }
                  ]}
                  onPress={() => handleQuickChipAdd(c.val)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={[styles.quickChipText, isDark && tStyles.textPrimary]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Built-in Keypad Grid (3D tactile keys) */}
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
                    const isEqual = btn === '=';

                    let keyBg = isDark ? currentTheme.cardBgElevated : '#FFFFFF';
                    let keyBorderBottom = isDark ? '#1E293B' : '#CBD5E1';
                    let keyBorderTop = isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF';
                    let keyTextColor = isDark ? currentTheme.textPrimary : '#1E293B';

                    if (isOp && !isEqual) {
                      keyBg = isDark ? '#334155' : '#F1F5F9';
                      keyBorderBottom = isDark ? '#1E293B' : '#94A3B8';
                      keyTextColor = isDark ? '#F8FAFC' : '#0F172A';
                    } else if (isSpecial) {
                      keyBg = isDark ? '#450A0A' : '#FEF2F2';
                      keyBorderBottom = isDark ? '#7F1D1D' : '#FCA5A5';
                      keyTextColor = isDark ? '#FCA5A5' : '#DC2626';
                    } else if (isEqual) {
                      keyBg = txnType === 'given' ? (isDark ? currentTheme.danger : COLORS.primary) : (isDark ? currentTheme.success : COLORS.green);
                      keyBorderBottom = txnType === 'given' ? '#7F1D1D' : '#065F06';
                      keyBorderTop = txnType === 'given' ? '#FCA5A5' : '#6EE7B7';
                      keyTextColor = '#FFFFFF';
                    }

                    return (
                      <TouchableOpacity
                        key={btn}
                        style={[
                          styles.keypadBtn,
                          {
                            backgroundColor: keyBg,
                            borderTopWidth: 1.5,
                            borderTopColor: keyBorderTop,
                            borderBottomWidth: 3,
                            borderBottomColor: keyBorderBottom,
                            borderLeftWidth: 1,
                            borderRightWidth: 1,
                            borderColor: isDark ? currentTheme.cardBorder : '#E2E8F0',
                            borderRadius: 10,
                          },
                          isEqual && { flex: 2 },
                        ]}
                        onPress={() => handleCalcPress(btn)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.keypadBtnText,
                            { color: keyTextColor },
                            (isOp || isSpecial || isEqual) && { fontWeight: 'bold' },
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
              style={[styles.modalSimpleInput, isDark && tStyles.input]}
              placeholder={tStatic("বিবরণ (যেমন: চাল, তেল, নগদ ইত্যাদি)")}
              placeholderTextColor={isDark ? currentTheme.textSecondary : COLORS.textSubtle}
              value={txnDesc}
              onChangeText={setTxnDesc}
            />

            {/* Quick Suggestion Chips for Note */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {[tStatic("চাল"), tStatic("ডাল"), tStatic("তেল"), tStatic("চিনি"), tStatic("নগদ বাকি"), tStatic("নগদ জমা"), tStatic("পূর্বের বাকি")].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.descChip, isDark && { backgroundColor: currentTheme.surfaceVariant, borderColor: currentTheme.cardBorder, borderBottomColor: '#1E293B' }]}
                  onPress={() => setTxnDesc((prev) => (prev ? prev + ', ' + s : s))}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.descChipText, isDark && tStyles.textPrimary]}>+{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Modal Action Buttons with 3D tactile buttons */}
            <View style={styles.modalBtnRow}>
              <Button3D
                title={tStatic("বাতিল")}
                variant="secondary"
                size="lg"
                isDark={isDark}
                onPress={() => setModalAddTxn(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button3D
                title={tStatic("নিশ্চিত করি")}
                variant={txnType === 'given' ? "destructive" : "success"}
                size="lg"
                isDark={isDark}
                onPress={handleSaveTransaction}
                style={{ flex: 1.5 }}
              />
            </View>
            </ScrollView>
          </View>
        </View>
      </Modal>`;

code = code.slice(0, addStartIdx) + newModalAddTxn + code.slice(addEndIdx + addTxnEndMarker.length);
console.log('[PASS] modalAddTxn updated');

// --- 2. modalEditTxn ---
const editTxnStartMarker = '<Modal visible={modalEditTxn} animationType="fade" transparent onRequestClose={() => setModalEditTxn(false)}>';
const editTxnEndMarker = `            <View style={styles.modalBtnRow}>
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
      </Modal>`;

const editStartIdx = code.indexOf(editTxnStartMarker);
const editEndIdx = code.indexOf(editTxnEndMarker);

if (editStartIdx === -1 || editEndIdx === -1) {
  console.error('[FAIL] Could not find modalEditTxn markers');
  process.exit(1);
}

const newModalEditTxn = `<Modal visible={modalEditTxn} animationType="fade" transparent onRequestClose={() => setModalEditTxn(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isDark && tStyles.modalSurface]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalCardTitle, isDark && tStyles.textPrimary]}>{tStatic("লেনদেন সংশোধন (এডিট)")}</Text>
              <TouchableOpacity
                onPress={() => setModalEditTxn(false)}
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
            <TextInput
              style={[styles.modalBigInput, isDark && tStyles.input]}
              placeholder={tStatic("টাকার পরিমাণ")}
              placeholderTextColor={isDark ? currentTheme.textSecondary : COLORS.textSubtle}
              keyboardType="numeric"
              value={editAmount}
              onChangeText={setEditAmount}
            />
            <TextInput
              style={[styles.modalSimpleInput, isDark && tStyles.input]}
              placeholder={tStatic("বিবরণ")}
              placeholderTextColor={isDark ? currentTheme.textSecondary : COLORS.textSubtle}
              value={editDesc}
              onChangeText={setEditDesc}
            />
            <View style={styles.modalBtnRow}>
              <Button3D
                title={tStatic("বাতিল")}
                variant="secondary"
                size="md"
                isDark={isDark}
                onPress={() => setModalEditTxn(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button3D
                title={tStatic("আপডেট করুন")}
                variant="primary"
                size="md"
                isDark={isDark}
                onPress={handleUpdateTransaction}
                style={{ flex: 1.5 }}
              />
            </View>
          </View>
        </View>
      </Modal>`;

code = code.slice(0, editStartIdx) + newModalEditTxn + code.slice(editEndIdx + editTxnEndMarker.length);
console.log('[PASS] modalEditTxn updated');

try {
  babel.parseSync(code, {
    filename: "App.js",
    configFile: false,
    babelrc: false,
    parserOpts: { plugins: ["jsx", "flow"] }
  });
  fs.writeFileSync('App.js', code, 'utf8');
  console.log('[PASS] App.js verified and saved for transaction modals');
} catch (e) {
  console.error('[FAIL] Babel syntax error in transaction modals:', e.message);
  process.exit(1);
}
