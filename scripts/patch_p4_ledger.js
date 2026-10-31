const fs = require('fs');
const babel = require('@babel/core');

let code = fs.readFileSync('App.js', 'utf8');

const startMarker = "      {currentScreen === 'account_ledger' && selectedAccount ? (";
const endMarker = `        {/* Bottom Dual Entry Bar (দিলাম / পেলাম) */}
        <View style={[styles.ledgerBottomBar, isDark && tStyles.card]}>
          <TouchableOpacity
            style={[styles.bigEntryBtn, { backgroundColor: COLORS.primary, borderBottomColor: "#7F0C0C" }]}
            onPress={() => handleOpenAddTxn('given')}
            activeOpacity={0.85}
          >
            <Text style={styles.bigEntryBtnText}>{isCustomer ? t('btn_gave_due') : t('btn_gave_payment')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bigEntryBtn, { backgroundColor: COLORS.green, borderBottomColor: "#065F06" }]}
            onPress={() => handleOpenAddTxn('received')}
            activeOpacity={0.85}
          >
            <Text style={styles.bigEntryBtnText}>{isCustomer ? t('btn_got_deposit') : t('btn_got_due_product')}</Text>
          </TouchableOpacity>
        </View>
        </View>
      ) : (`;

const startIdx = code.indexOf(startMarker);
const endIdx = code.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.error('[FAIL] Could not find ledger boundaries. startIdx:', startIdx, 'endIdx:', endIdx);
  process.exit(1);
}

const replacement = `      {currentScreen === 'account_ledger' && selectedAccount ? (
        <View style={[{ flex: 1 }, isDark && tStyles.screenBg]}>

        {/* Ledger Top Header (matching authentic activity_customer_report_v2.xml toolbar) */}
        <View style={[styles.ledgerHeaderNav, isDark && tStyles.headerNav]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setCurrentScreen('home')}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Image
              source={require("./assets/icons/arrow_left.png")}
              style={{ width: 22, height: 22, tintColor: isDark ? currentTheme.textPrimary : '#1A1A1A' }}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <View style={styles.ledgerHeaderTitleBox}>
            <Text style={[styles.ledgerHeaderName, isDark && tStyles.textPrimary]} numberOfLines={1}>{selectedAccount.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <View style={[styles.ledgerTypePill, { backgroundColor: isCustomer ? (isDark ? '#450A0A' : '#FEE2E2') : (isDark ? '#064E3B' : '#DCFCE7'), borderColor: isCustomer ? (isDark ? '#7F1D1D' : '#FECACA') : (isDark ? '#065F46' : '#BBF7D0') }]}>
                <Text style={[styles.ledgerTypePillText, { color: isCustomer ? (isDark ? '#FCA5A5' : currentTheme.primary) : (isDark ? '#6EE7B7' : currentTheme.income) }]}>
                  {isCustomer ? tStatic("কাস্টমার হিসাব") : tStatic("সাপ্লায়ার হিসাব")}
                </Text>
              </View>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {selectedAccount.phone ? (
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => handleMakeCall(selectedAccount.phone)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <AppIcon source={require("./assets/icons/ic_call.png")} variant="success" shape="rounded" size={20} containerSize={38} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={handleOpenEditAccount}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <AppIcon source={require("./assets/icons/ic_edit.png")} iconKey='ic_edit' variant="neutral" shape="rounded" size={20} containerSize={38} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={handleDeleteAccount}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <AppIcon source={require("./assets/icons/ic_delete.png")} iconKey='ic_delete' variant="danger" shape="rounded" size={20} containerSize={38} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Profile Card (layout_customer_info_holder.xml) */}
        <Card3D variant="financial" isDark={isDark} style={styles.accountProfileCard}>
          <View style={[styles.profileAvatar, {
            backgroundColor: isCustomer ? (isDark ? '#450A0A' : COLORS.redLight) : (isDark ? '#064E3B' : COLORS.greenLight),
            borderColor: isCustomer ? (isDark ? '#7F1D1D' : '#FECACA') : (isDark ? '#065F46' : '#BBF7D0'),
            borderTopColor: isCustomer ? (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)') : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)'),
            borderBottomColor: isCustomer ? (isDark ? '#991B1B' : '#F87171') : (isDark ? '#047857' : '#86EFAC'),
          }]}>
            <Text style={[styles.profileAvatarText, { color: isCustomer ? (isDark ? '#F87171' : COLORS.primary) : (isDark ? '#34D399' : COLORS.green) }]}>
              {(selectedAccount.name || tStatic("খ"))[0]}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.profileName, isDark && tStyles.textPrimary]}>{selectedAccount.name}</Text>
            <Text style={[styles.profilePhone, isDark && tStyles.textSecondary]}>
              {selectedAccount.phone || tStatic("মোবাইল নম্বর নেই")}
            </Text>
            {selectedAccount.address ? (
              <Text style={[styles.profileAddress, isDark && tStyles.textMuted]} numberOfLines={1}>{selectedAccount.address}</Text>
            ) : null}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.profileDueLabel, { color: isCustomer ? (isDark ? currentTheme.danger : COLORS.primary) : (isDark ? currentTheme.success : COLORS.green) }]}>
              {isCustomer ? tStatic("মোট পাবো (বাকি)") : tStatic("মোট দেবো (দেনা)")}
            </Text>
            <Text style={[styles.profileDueAmount, { color: isCustomer ? (isDark ? currentTheme.danger : COLORS.primary) : (isDark ? currentTheme.success : COLORS.green) }]}>{tStatic("৳ ")}{formatMoney(selectedAccount.balance)}
            </Text>
          </View>
        </Card3D>

        {/* Quick Action Chips: তাগাদা পাঠান, কল করুন, স্টেটমেন্ট শেয়ার */}
        <View style={[styles.ledgerQuickActions, isDark && { backgroundColor: currentTheme.cardBg, borderColor: currentTheme.cardBorder, borderBottomColor: isDark ? currentTheme.outline : '#E2E8F0' }]}>
          {isCustomer ? (
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => setModalTagada(true)}
              activeOpacity={0.7}
            >
              <AppIcon source={require('./assets/icons/ic_sms.png')} variant="primary" shape="rounded" size={24} containerSize={48} style={{ marginBottom: 6 }} tintColor={null} />
              <Text style={[styles.quickActionLabel, isDark && tStyles.textSecondary]}>{t('tagada_send_sms')}</Text>
            </TouchableOpacity>
          ) : null}
          {selectedAccount.phone ? (
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => handleMakeCall(selectedAccount.phone)}
              activeOpacity={0.7}
            >
              <AppIcon source={require('./assets/icons/ic_call.png')} variant="success" shape="rounded" size={24} containerSize={48} style={{ marginBottom: 6 }} />
              <Text style={[styles.quickActionLabel, isDark && tStyles.textSecondary]}>{t('ledger_call')}</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => {
              const fullStatement =
                \`=== \${businessName} ===\\n\` +
                \`\${tStatic("হিসাব খাতা: ")}\${selectedAccount.name}\\n\` +
                \`\${tStatic("মোবাইল: ")}\${selectedAccount.phone || tStatic("দেওয়া নেই")}\\n\` +
                \`\${tStatic("বর্তমান বকেয়া: ৳ ")}\${formatMoney(selectedAccount.balance)}\\n\` +
                \`\${tStatic("মোট লেনদেন: ")}\${accountJournals.length}\${tStatic(" টি\\n")}\` +
                \`\${tStatic("দিলাম মোট: ৳ ")}\${formatMoney(totalGiven)}\\n\` +
                \`\${tStatic("পেলাম মোট: ৳ ")}\${formatMoney(totalReceived)}\\n\` +
                \`\${tStatic("যোগাযোগ: ")}\${ownerPhone}\`;
              Share.share({ message: fullStatement });
            }}
            activeOpacity={0.7}
          >
            <AppIcon source={require('./assets/icons/ic_pdf.png')} variant="purple" shape="rounded" size={24} containerSize={48} style={{ marginBottom: 6 }} />
            <Text style={[styles.quickActionLabel, isDark && tStyles.textSecondary]}>{t('ledger_share_statement')}</Text>
          </TouchableOpacity>
        </View>

        <TwoToneDivider marginVertical={8} />

        {/* Ledger Table Column Headers (layout_credit_details_table_head: লেনদেনের বিবরণ, দিলাম, পেলাম) */}
        <View style={[styles.ledgerTableHeader, isDark && { backgroundColor: currentTheme.cardBgElevated, borderColor: currentTheme.cardBorder, borderBottomColor: '#1E293B', borderTopColor: 'rgba(255,255,255,0.08)' }]}>
          <Text style={[styles.ledgerColHeader, isDark && tStyles.textSecondary, { flex: 1.6 }]}>{t("ledger_col_desc")}</Text>
          <Text style={[styles.ledgerColHeader, { flex: 1, textAlign: 'right', color: isDark ? currentTheme.danger : COLORS.red }]}>
            {t('ledger_col_gave')}
          </Text>
          <Text style={[styles.ledgerColHeader, { flex: 1, textAlign: 'right', color: isDark ? currentTheme.success : COLORS.green }]}>
            {t('ledger_col_got')}
          </Text>
        </View>

        {/* Ledger Transactions List (rvCustomerCreditDetails) */}
        <FlatList
          data={accountJournals}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 110 }}
          initialNumToRender={20}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          renderItem={({ item }) => {
            const isGiven = item.type === 'given';
            return (
              <TouchableOpacity
                style={[styles.ledgerRowCard, isDark && tStyles.card, item.isOpening && { backgroundColor: isDark ? currentTheme.cardBgElevated : '#F9FAFB' }]}
                onPress={() => {
                  if (item.isOpening) {
                    Alert.alert(tStatic("শুরুর জের"), tStatic("এই খাতার প্রারম্ভিক জের: ৳ ") + formatMoney(item.amount) + tStatic("।\\nহিসাবের তথ্য বা জের পরিবর্তন করতে এডিট বোতাম ব্যবহার করুন।"), [
                      { text: tStatic("ঠিক আছে"), style: 'cancel' },
                      { text: tStatic("এডিট করুন"), onPress: handleOpenEditAccount },
                    ]);
                    return;
                  }
                  setSelectedVoucherTxn(item);
                  setModalVoucher(true);
                }}
                activeOpacity={0.7}
              >
                {/* 3D Squircle Indicator */}
                <View style={[styles.ledgerRowIndicatorSquircle, {
                  backgroundColor: item.isOpening
                    ? (isDark ? '#334155' : '#F1F5F9')
                    : isGiven
                    ? (isDark ? '#450A0A' : '#FEE2E2')
                    : (isDark ? '#064E3B' : '#DCFCE7'),
                  borderColor: item.isOpening
                    ? (isDark ? '#475569' : '#CBD5E1')
                    : isGiven
                    ? (isDark ? '#7F1D1D' : '#FECACA')
                    : (isDark ? '#065F46' : '#BBF7D0'),
                  borderBottomColor: item.isOpening
                    ? (isDark ? '#1E293B' : '#94A3B8')
                    : isGiven
                    ? (isDark ? '#991B1B' : '#F87171')
                    : (isDark ? '#047857' : '#86EFAC'),
                }]}>
                  <Text style={[styles.ledgerRowIndicatorText, {
                    color: item.isOpening
                      ? (isDark ? '#CBD5E1' : '#475569')
                      : isGiven
                      ? (isDark ? '#FCA5A5' : '#DC2626')
                      : (isDark ? '#6EE7B7' : '#059669'),
                  }]}>
                    {item.isOpening ? '🏁' : isGiven ? '—' : '+'}
                  </Text>
                </View>
                <View style={{ flex: 1.6, marginLeft: 8 }}>
                  <Text style={[styles.ledgerRowDesc, isDark && tStyles.textPrimary, item.isOpening && { color: isDark ? currentTheme.textSecondary : '#4B5563', fontWeight: 'bold' }]}>
                    {item.desc || tStatic("সাধারণ লেনদেন")}
                  </Text>
                  <Text style={[styles.ledgerRowDate, isDark && tStyles.textSecondary]}>
                    {formatDisplayDate(item.date)} {item.time ? '• ' + item.time : ''}
                  </Text>
                  {/* Running Balance */}
                  <Text style={[styles.ledgerRowBalance, isDark && tStyles.textMuted]}>
                    {tStatic("জের: ৳ ")}{formatMoney(item.balance)}
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end', justifyContent: 'center' }}>
                  {isGiven ? (
                    <Text style={[styles.ledgerGivenAmount, isDark && { color: currentTheme.danger }]}>{tStatic("৳ ")}{formatMoney(item.amount)}</Text>
                  ) : (
                    <Text style={[styles.dashMuted, isDark && tStyles.textMuted]}>-</Text>
                  )}
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end', justifyContent: 'center' }}>
                  {!isGiven ? (
                    <Text style={[styles.ledgerReceivedAmount, isDark && { color: currentTheme.success }]}>{tStatic("৳ ")}{formatMoney(item.amount)}</Text>
                  ) : (
                    <Text style={[styles.dashMuted, isDark && tStyles.textMuted]}>-</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Image source={require('./assets/ic_no_txn_img_customer.png')} style={{ width: 80, height: 80, marginBottom: 8 }} resizeMode="contain" />
              <Text style={[styles.emptyText, isDark && tStyles.textPrimary]}>{tStatic("কোনো লেনদেন রেকর্ড নেই")}</Text>
              <Text style={[styles.emptySubText, isDark && tStyles.textSecondary]}>{tStatic("নিচের বাটন চেপে বাকি বা জমা এন্ট্রি দিন")}</Text>
            </View>
          }
        />

        {/* Bottom Summary Totals Strip (bottomLinearLayout from activity_customer_report_v2.xml) */}
        <View style={[styles.ledgerBottomTotalsStrip, isDark && { backgroundColor: currentTheme.cardBgElevated, borderTopColor: currentTheme.cardBorder }]}>
          <Text style={[styles.ledgerBottomTotalLabel, isDark && tStyles.textPrimary]}>{t('ledger_total')}</Text>
          <View style={[styles.ledgerBottomTotalCreditBox, isDark && { backgroundColor: '#450A0A', borderColor: '#7F1D1D', borderBottomColor: '#991B1B' }]}>
            <Text style={[styles.ledgerBottomTotalCreditVal, isDark && { color: '#FCA5A5' }]}>{tStatic("৳ ")}{formatMoney(totalGiven)}</Text>
          </View>
          <View style={[styles.ledgerBottomTotalReceivedBox, isDark && { backgroundColor: '#064E3B', borderColor: '#065F46', borderBottomColor: '#047857' }]}>
            <Text style={[styles.ledgerBottomTotalReceivedVal, isDark && { color: '#6EE7B7' }]}>{tStatic("৳ ")}{formatMoney(totalReceived)}</Text>
          </View>
        </View>

        {/* Bottom Dual Entry Bar (দিলাম / পেলাম) with tactile 3D buttons */}
        <View style={[styles.ledgerBottomBar, isDark && tStyles.card]}>
          <Button3D
            title={isCustomer ? t('btn_gave_due') : t('btn_gave_payment')}
            variant="destructive"
            size="lg"
            isDark={isDark}
            onPress={() => handleOpenAddTxn('given')}
            style={{ flex: 1 }}
          />
          <Button3D
            title={isCustomer ? t('btn_got_deposit') : t('btn_got_due_product')}
            variant="success"
            size="lg"
            isDark={isDark}
            onPress={() => handleOpenAddTxn('received')}
            style={{ flex: 1 }}
          />
        </View>
        </View>
      ) : (`;

const newCode = code.slice(0, startIdx) + replacement + code.slice(endIdx + endMarker.length);

try {
  babel.parseSync(newCode, {
    filename: "App.js",
    configFile: false,
    babelrc: false,
    parserOpts: { plugins: ["jsx", "flow"] }
  });
  fs.writeFileSync('App.js', newCode, 'utf8');
  console.log('[PASS] SCR-04 Account Ledger updated and verified with Babel successfully');
} catch (e) {
  console.error('[FAIL] Babel syntax error in SCR-04:', e.message);
  process.exit(1);
}
