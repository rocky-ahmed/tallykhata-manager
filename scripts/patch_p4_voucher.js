const fs = require('fs');
const babel = require('@babel/core');

let code = fs.readFileSync('App.js', 'utf8');

const voucherStartMarker = '<Modal visible={modalVoucher} animationType="slide" transparent onRequestClose={() => setModalVoucher(false)}>';
const voucherEndMarker = `            <View style={styles.voucherActionRow}>
              <TouchableOpacity
                style={[styles.voucherBtn, { backgroundColor: COLORS.blue }]}
                onPress={() => {
                  const txt = renderVoucherText(selectedVoucherTxn, selectedAccount);
                  Share.share({ message: txt });
                }}
              >
                <Image source={require('./assets/icons/ic_share.png')} style={{ width: 16, height: 16, tintColor: '#FFFFFF', marginRight: 6 }} resizeMode="contain" />
                <Text style={styles.voucherBtnText}>{tStatic("শেয়ার")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.voucherBtn, { backgroundColor: COLORS.gold }]}
                onPress={() => handleOpenEditTxn(selectedVoucherTxn)}
              >
                <Image source={require('./assets/icons/ic_edit.png')} style={{ width: 16, height: 16, tintColor: '#FFFFFF', marginRight: 6 }} resizeMode="contain" />
                <Text style={styles.voucherBtnText}>{tStatic("সংশোধন")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.voucherBtn, { backgroundColor: COLORS.red }]}
                onPress={() => { if (selectedVoucherTxn?.id) handleDeleteTransaction(selectedVoucherTxn.id); }}
              >
                <Image source={require('./assets/icons/ic_delete.png')} style={{ width: 16, height: 16, tintColor: '#FFFFFF', marginRight: 6 }} resizeMode="contain" />
                <Text style={styles.voucherBtnText}>{tStatic("মুছুন")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>`;

const vStartIdx = code.indexOf(voucherStartMarker);
const vEndIdx = code.indexOf(voucherEndMarker);

if (vStartIdx === -1 || vEndIdx === -1) {
  console.error('[FAIL] Could not find modalVoucher boundaries. vStartIdx:', vStartIdx, 'vEndIdx:', vEndIdx);
  process.exit(1);
}

const newModalVoucher = `<Modal visible={modalVoucher} animationType="slide" transparent onRequestClose={() => setModalVoucher(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isDark && tStyles.modalSurface, { maxHeight: '90%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalCardTitle, isDark && tStyles.textPrimary]}>{tStatic("ডিজিটাল ভাউচার (রশিদ)")}</Text>
              <TouchableOpacity
                onPress={() => setModalVoucher(false)}
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

            <ScrollView contentContainerStyle={{ paddingVertical: 10 }} showsVerticalScrollIndicator={false}>
              <View style={[styles.voucherContainer, isDark && { backgroundColor: currentTheme.cardBgElevated, borderColor: currentTheme.cardBorder, borderBottomColor: '#1E293B' }]}>
                <View style={styles.voucherHeader}>
                  <Image
                    source={require('./assets/ic_tally_khata_logo_reg.png')}
                    style={{ width: 44, height: 44, marginBottom: 6 }}
                    resizeMode="contain"
                  />
                  <Text style={[styles.voucherBizName, isDark && tStyles.textPrimary]}>{businessName}</Text>
                  <Text style={[styles.voucherBizSub, isDark && tStyles.textSecondary]}>{businessAddress}</Text>
                  <Text style={[styles.voucherBizSub, isDark && tStyles.textSecondary]}>{tStatic("মোবাইল: ")}{ownerPhone}</Text>
                  <View style={[styles.voucherBadge, isDark && { backgroundColor: '#064E3B', borderColor: '#065F46' }]}>
                    <Text style={[styles.voucherBadgeText, isDark && { color: '#6EE7B7' }]}>{tStatic("১০০% ডিজিটাল হিসাব রশিদ")}</Text>
                  </View>
                </View>

                <View style={[styles.voucherDivider, isDark && { borderBottomColor: currentTheme.divider }]} />

                <View style={styles.voucherDetailRow}>
                  <Text style={[styles.voucherLabel, isDark && tStyles.textSecondary]}>{tStatic("রশিদ নং:")}</Text>
                  <Text style={[styles.voucherVal, isDark && tStyles.textPrimary]}>TK-{selectedVoucherTxn?.id ? selectedVoucherTxn.id.slice(-6) : '000000'}</Text>
                </View>
                <View style={styles.voucherDetailRow}>
                  <Text style={[styles.voucherLabel, isDark && tStyles.textSecondary]}>{tStatic("তারিখ ও সময়:")}</Text>
                  <Text style={[styles.voucherVal, isDark && tStyles.textPrimary]}>
                    {selectedVoucherTxn?.date} {selectedVoucherTxn?.time ? '• ' + selectedVoucherTxn.time : ''}
                  </Text>
                </View>

                <View style={[styles.voucherDivider, isDark && { borderBottomColor: currentTheme.divider }]} />

                <View style={styles.voucherDetailRow}>
                  <Text style={[styles.voucherLabel, isDark && tStyles.textSecondary]}>
                    {selectedAccount?.type === 1 ? tStatic("কাস্টমার:") : tStatic("সাপ্লায়ার:")}
                  </Text>
                  <Text style={[styles.voucherVal, isDark && tStyles.textPrimary, { fontWeight: 'bold' }]}>{selectedAccount?.name}</Text>
                </View>
                <View style={styles.voucherDetailRow}>
                  <Text style={[styles.voucherLabel, isDark && tStyles.textSecondary]}>{tStatic("মোবাইল:")}</Text>
                  <Text style={[styles.voucherVal, isDark && tStyles.textPrimary]}>{selectedAccount?.phone || tStatic("দেওয়া নেই")}</Text>
                </View>

                <View style={[styles.voucherDivider, isDark && { borderBottomColor: currentTheme.divider }]} />

                <View style={styles.voucherDetailRow}>
                  <Text style={[styles.voucherLabel, isDark && tStyles.textSecondary]}>{tStatic("লেনদেনের ধরন:")}</Text>
                  <Text style={[styles.voucherVal, { color: selectedVoucherTxn?.type === 'given' ? (isDark ? currentTheme.danger : COLORS.primary) : (isDark ? currentTheme.success : COLORS.green), fontWeight: 'bold' }]}>
                    {selectedAccount?.type === 1
                      ? (selectedVoucherTxn?.type === 'given' ? tStatic("দিলাম (বাকি বিক্রি)") : tStatic("পেলাম (জমা আদায়)"))
                      : (selectedVoucherTxn?.type === 'given' ? tStatic("দিলাম (টাকা পরিশোধ)") : tStatic("পেলাম (বাকিতে মাল ক্রয়)"))
                    }
                  </Text>
                </View>
                <View style={styles.voucherDetailRow}>
                  <Text style={[styles.voucherLabel, isDark && tStyles.textSecondary]}>{tStatic("বিবরণ:")}</Text>
                  <Text style={[styles.voucherVal, isDark && tStyles.textPrimary]}>{selectedVoucherTxn?.desc || tStatic("সাধারণ লেনদেন")}</Text>
                </View>

                <View style={[styles.voucherDivider, isDark && { borderBottomColor: currentTheme.divider }]} />

                <View style={styles.voucherDetailRow}>
                  <Text style={[styles.voucherLabel, isDark && tStyles.textPrimary, { fontSize: 16, fontWeight: 'bold' }]}>{tStatic("টাকার পরিমাণ:")}</Text>
                  <Text style={[styles.voucherVal, { fontSize: 20, fontWeight: 'bold', color: selectedVoucherTxn?.type === 'given' ? (isDark ? currentTheme.danger : COLORS.primary) : (isDark ? currentTheme.success : COLORS.green) }]}>
                    {tStatic("৳ ")}{formatMoney(selectedVoucherTxn?.amount)}
                  </Text>
                </View>
                <View style={styles.voucherDetailRow}>
                  <Text style={[styles.voucherLabel, isDark && tStyles.textSecondary]}>{selectedAccount?.type === 1 ? tStatic("সর্বমোট বর্তমান বাকি:") : tStatic("সর্বমোট বর্তমান দেনা:")}</Text>
                  <Text style={[styles.voucherVal, isDark && tStyles.textPrimary, { fontWeight: 'bold', fontSize: 16 }]}>
                    {tStatic("৳ ")}{formatMoney(selectedAccount?.balance)}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.voucherActionRow}>
              <Button3D
                title={tStatic("শেয়ার")}
                variant="info"
                size="md"
                isDark={isDark}
                icon={<Image source={require('./assets/icons/ic_share.png')} style={{ width: 16, height: 16, tintColor: '#FFFFFF', marginRight: 6 }} resizeMode="contain" />}
                onPress={() => {
                  const txt = renderVoucherText(selectedVoucherTxn, selectedAccount);
                  Share.share({ message: txt });
                }}
                style={{ flex: 1, marginRight: 6 }}
              />
              <Button3D
                title={tStatic("সংশোধন")}
                variant="warning"
                size="md"
                isDark={isDark}
                icon={<Image source={require('./assets/icons/ic_edit.png')} style={{ width: 16, height: 16, tintColor: '#FFFFFF', marginRight: 6 }} resizeMode="contain" />}
                onPress={() => handleOpenEditTxn(selectedVoucherTxn)}
                style={{ flex: 1, marginRight: 6 }}
              />
              <Button3D
                title={tStatic("মুছুন")}
                variant="destructive"
                size="md"
                isDark={isDark}
                icon={<Image source={require('./assets/icons/ic_delete.png')} style={{ width: 16, height: 16, tintColor: '#FFFFFF', marginRight: 6 }} resizeMode="contain" />}
                onPress={() => { if (selectedVoucherTxn?.id) handleDeleteTransaction(selectedVoucherTxn.id); }}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>`;

code = code.slice(0, vStartIdx) + newModalVoucher + code.slice(vEndIdx + voucherEndMarker.length);

try {
  babel.parseSync(code, {
    filename: "App.js",
    configFile: false,
    babelrc: false,
    parserOpts: { plugins: ["jsx", "flow"] }
  });
  fs.writeFileSync('App.js', code, 'utf8');
  console.log('[PASS] modalVoucher updated and verified with Babel successfully');
} catch (e) {
  console.error('[FAIL] Babel syntax error in modalVoucher:', e.message);
  process.exit(1);
}
