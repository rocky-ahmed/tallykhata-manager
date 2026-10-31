const fs = require('fs');
const babel = require('@babel/core');

let code = fs.readFileSync('App.js', 'utf8');

// --- 1. modalEditAccount ---
const oldModalEditAccount = `<Modal visible={modalEditAccount} animationType="slide" transparent onRequestClose={() => setModalEditAccount(false)}>
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
      </Modal>`;

const newModalEditAccount = `<Modal visible={modalEditAccount} animationType="slide" transparent onRequestClose={() => setModalEditAccount(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isDark && tStyles.modalSurface]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalCardTitle, isDark && tStyles.textPrimary]}>
                {selectedAccount?.type === 1 ? tStatic("কাস্টমার তথ্য এডিট") : tStatic("সাপ্লায়ার তথ্য এডিট")}
              </Text>
              <TouchableOpacity
                onPress={() => setModalEditAccount(false)}
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

            <Text style={[styles.inputLabel, isDark && tStyles.textSecondary]}>{tStatic("নাম *")}</Text>
            <TextInput
              style={[styles.modalSimpleInput, isDark && tStyles.input]}
              value={accName}
              onChangeText={setAccName}
              placeholder={tStatic("নাম লিখুন")}
              placeholderTextColor={isDark ? currentTheme.textSecondary : COLORS.textSubtle}
            />

            <Text style={[styles.inputLabel, isDark && tStyles.textSecondary]}>{tStatic("মোবাইল নম্বর")}</Text>
            <TextInput
              style={[styles.modalSimpleInput, isDark && tStyles.input]}
              value={accPhone}
              onChangeText={setAccPhone}
              placeholder="01XXXXXXXXX"
              placeholderTextColor={isDark ? currentTheme.textSecondary : COLORS.textSubtle}
              keyboardType="phone-pad"
            />

            <Text style={[styles.inputLabel, isDark && tStyles.textSecondary]}>{tStatic("ঠিকানা / এলাকা")}</Text>
            <TextInput
              style={[styles.modalSimpleInput, isDark && tStyles.input]}
              value={accAddress}
              onChangeText={setAccAddress}
              placeholder={tStatic("ঠিকানা (ঐচ্ছিক)")}
              placeholderTextColor={isDark ? currentTheme.textSecondary : COLORS.textSubtle}
            />

            <Text style={[styles.inputLabel, isDark && tStyles.textSecondary]}>{selectedAccount?.type === 1 ? tStatic("পূর্বের বাকি (শুরুর জের)") : tStatic("পূর্বের দেনা (শুরুর জের)")}</Text>
            <TextInput
              style={[styles.modalSimpleInput, isDark && tStyles.input]}
              value={accInitialBal}
              onChangeText={setAccInitialBal}
              placeholder={tStatic("০.০০")}
              placeholderTextColor={isDark ? currentTheme.textSecondary : COLORS.textSubtle}
              keyboardType="numeric"
            />

            <View style={styles.modalBtnRow}>
              <Button3D
                title={tStatic("বাতিল")}
                variant="secondary"
                size="md"
                isDark={isDark}
                onPress={() => setModalEditAccount(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button3D
                title={tStatic("সংরক্ষণ করুন")}
                variant="primary"
                size="md"
                isDark={isDark}
                onPress={handleUpdateAccount}
                style={{ flex: 1.5 }}
              />
            </View>
          </View>
        </View>
      </Modal>`;

if (code.includes(oldModalEditAccount)) {
  code = code.replace(oldModalEditAccount, newModalEditAccount);
  console.log('[PASS] SCR-05 modalEditAccount updated');
} else {
  console.error('[FAIL] Could not find oldModalEditAccount');
  process.exit(1);
}

// --- 2. modalAddAccount ---
const oldModalAddAccount = `<Modal visible={modalAddAccount} animationType="slide" transparent onRequestClose={() => setModalAddAccount(false)}>
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
      </Modal>`;

const newModalAddAccount = `<Modal visible={modalAddAccount} animationType="slide" transparent onRequestClose={() => setModalAddAccount(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isDark && tStyles.modalSurface]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalCardTitle, isDark && tStyles.textPrimary]}>{tStatic("নতুন খাতা খুলুন")}</Text>
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
                style={[
                  styles.accTypeToggleBtn,
                  accType === 1
                    ? [styles.accTypeToggleBtnActiveRed, { borderBottomWidth: 3, borderBottomColor: '#7F0C0C' }]
                    : (isDark && { backgroundColor: currentTheme.surfaceVariant, borderColor: currentTheme.cardBorder })
                ]}
                onPress={() => setAccType(1)}
                activeOpacity={0.8}
              >
                <Text style={[styles.accTypeToggleText, accType === 1 ? { color: COLORS.white, fontWeight: 'bold' } : (isDark && tStyles.textSecondary)]}>
                  {tStatic("কাস্টমার (বাকি)")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.accTypeToggleBtn,
                  accType === 2
                    ? [styles.accTypeToggleBtnActiveGreen, { borderBottomWidth: 3, borderBottomColor: '#065F06' }]
                    : (isDark && { backgroundColor: currentTheme.surfaceVariant, borderColor: currentTheme.cardBorder })
                ]}
                onPress={() => setAccType(2)}
                activeOpacity={0.8}
              >
                <Text style={[styles.accTypeToggleText, accType === 2 ? { color: COLORS.white, fontWeight: 'bold' } : (isDark && tStyles.textSecondary)]}>
                  {tStatic("সাপ্লায়ার (মহাজন)")}
                </Text>
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
              <Button3D
                title={tStatic("বাতিল")}
                variant="secondary"
                size="md"
                isDark={isDark}
                onPress={() => setModalAddAccount(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button3D
                title={tStatic("খাতা খুলুন")}
                variant={accType === 1 ? "primary" : "success"}
                size="md"
                isDark={isDark}
                onPress={handleSaveAccount}
                style={{ flex: 1.5 }}
              />
            </View>
          </View>
        </View>
      </Modal>`;

if (code.includes(oldModalAddAccount)) {
  code = code.replace(oldModalAddAccount, newModalAddAccount);
  console.log('[PASS] SCR-06 modalAddAccount updated');
} else {
  console.error('[FAIL] Could not find oldModalAddAccount');
  process.exit(1);
}

try {
  babel.parseSync(code, {
    filename: "App.js",
    configFile: false,
    babelrc: false,
    parserOpts: { plugins: ["jsx", "flow"] }
  });
  fs.writeFileSync('App.js', code, 'utf8');
  console.log('[PASS] modalEditAccount and modalAddAccount updated and verified with Babel successfully');
} catch (e) {
  console.error('[FAIL] Babel syntax error in account modals:', e.message);
  process.exit(1);
}
