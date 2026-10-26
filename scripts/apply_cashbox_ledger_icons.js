const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

// 1. Update Menu Note icon to pass tintColor={null} so the authentic multi-color note icon renders
code = code.replace(
  `<AppIcon source={require('./assets/icons/ic_menu_note.png')} variant="info" shape="rounded" size={22} containerSize={38} />`,
  `<AppIcon source={require('./assets/icons/ic_menu_note.png')} variant="info" shape="rounded" size={22} containerSize={38} tintColor={null} />`
);

// 2. Upgrade Cashbox 5 category rows with AppIcon and TwoToneDivider
const oldCashAccounts = `              {[
                { cat: 'sale', label: 'ক্যাশ বেচা', icon: require('./assets/icons/ic_cash_sale.png'), isIn: true, color: '#0F8A0F' },
                { cat: 'buy', label: 'ক্যাশ কেনা', icon: require('./assets/icons/ic_cash_buy.png'), isIn: false, color: '#B81414' },
                { cat: 'cost', label: 'খরচ', icon: require('./assets/icons/ic_menu_cost.png'), isIn: false, color: '#B81414' },
                { cat: 'malik_in', label: 'মালিক দিল', icon: require('./assets/icons/ic_menu_malik_report.png'), isIn: true, color: '#0F8A0F' },
                { cat: 'malik_out', label: 'মালিক নিল', icon: require('./assets/icons/ic_malik_out.png'), isIn: false, color: '#B81414' },
              ].map((item) => {
                const catEntries = (cashEntries || []).filter((c) => c.category === item.cat);
                const sum = catEntries.reduce((acc, cur) => acc + (Number(cur.amount) || 0), 0);
                return (
                  <TouchableOpacity
                    key={item.cat}
                    style={styles.cashAccountRow}
                    onPress={() => {
                      if (item.cat === 'sale' || item.cat === 'buy') setModalBechaKena(true);
                      else if (item.cat === 'cost') setModalExpenseReport(true);
                      else if (item.cat === 'malik_in' || item.cat === 'malik_out') setModalMalikReport(true);
                      else setCashFilter(item.cat);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Image source={item.icon} style={{ width: 22, height: 22, marginRight: 10 }} resizeMode="contain" />
                      <Text style={styles.cashAccountRowLabel}>{item.label}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.cashAccountRowVal, { color: item.color }]}>
                        {hideCashAmounts ? '***' : \`\${item.isIn ? '+' : '-'} ৳ \${formatMoney(sum)}\`}
                      </Text>
                      <Text style={styles.cashAccountChevron}>›</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}`;

const newCashAccounts = `              {[
                { cat: 'sale', label: 'ক্যাশ বেচা', icon: require('./assets/icons/ic_cash_sale.png'), isIn: true, variant: 'success', color: '#0F8A0F' },
                { cat: 'buy', label: 'ক্যাশ কেনা', icon: require('./assets/icons/ic_cash_buy.png'), isIn: false, variant: 'danger', color: '#B81414' },
                { cat: 'cost', label: 'খরচ', icon: require('./assets/icons/ic_menu_cost.png'), isIn: false, variant: 'danger', color: '#B81414' },
                { cat: 'malik_in', label: 'মালিক দিল', icon: require('./assets/icons/ic_menu_malik_report.png'), isIn: true, variant: 'success', color: '#0F8A0F' },
                { cat: 'malik_out', label: 'মালিক নিল', icon: require('./assets/icons/ic_malik_out.png'), isIn: false, variant: 'danger', color: '#B81414' },
              ].map((item, index) => {
                const catEntries = (cashEntries || []).filter((c) => c.category === item.cat);
                const sum = catEntries.reduce((acc, cur) => acc + (Number(cur.amount) || 0), 0);
                return (
                  <View key={item.cat}>
                    <TouchableOpacity
                      style={styles.cashAccountRow}
                      onPress={() => {
                        if (item.cat === 'sale' || item.cat === 'buy') setModalBechaKena(true);
                        else if (item.cat === 'cost') setModalExpenseReport(true);
                        else if (item.cat === 'malik_in' || item.cat === 'malik_out') setModalMalikReport(true);
                        else setCashFilter(item.cat);
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <AppIcon
                          source={item.icon}
                          variant={item.variant}
                          shape="rounded"
                          size={18}
                          containerSize={34}
                          style={{ marginRight: 12 }}
                        />
                        <Text style={styles.cashAccountRowLabel}>{item.label}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.cashAccountRowVal, { color: item.color }]}>
                          {hideCashAmounts ? '***' : \`\${item.isIn ? '+' : '-'} ৳ \${formatMoney(sum)}\`}
                        </Text>
                        <Text style={styles.cashAccountChevron}>›</Text>
                      </View>
                    </TouchableOpacity>
                    {index < 4 ? <TwoToneDivider marginVertical={3} /> : null}
                  </View>
                );
              })}`;

if (code.includes(oldCashAccounts)) {
  code = code.replace(oldCashAccounts, newCashAccounts);
  console.log('Successfully upgraded Cashbox 5 category rows with AppIcon & TwoToneDivider!');
} else {
  console.log('Warning: oldCashAccounts exact match not found');
}

// 3. Upgrade Ledger Header buttons (Call, Edit, Delete)
const oldHeaderIcons = `          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {selectedAccount.phone ? (
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => handleMakeCall(selectedAccount.phone)}
                activeOpacity={0.7}
              >
                <Image source={require("./assets/icons/ic_call.png")} style={{ width: 20, height: 20, tintColor: '#0F8A0F' }} resizeMode="contain" />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={handleOpenEditAccount}
              activeOpacity={0.7}
            >
              <Image source={require("./assets/icons/ic_edit.png")} style={{ width: 20, height: 20, tintColor: '#4D4D4D' }} resizeMode="contain" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={handleDeleteAccount}
              activeOpacity={0.7}
            >
              <Image source={require("./assets/icons/ic_delete.png")} style={{ width: 20, height: 20, tintColor: '#B81414' }} resizeMode="contain" />
            </TouchableOpacity>
          </View>`;

const newHeaderIcons = `          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {selectedAccount.phone ? (
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => handleMakeCall(selectedAccount.phone)}
                activeOpacity={0.7}
              >
                <AppIcon source={require("./assets/icons/ic_call.png")} variant="success" shape="circle" size={16} containerSize={32} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={handleOpenEditAccount}
              activeOpacity={0.7}
            >
              <AppIcon source={require("./assets/icons/ic_edit.png")} variant="neutral" shape="circle" size={16} containerSize={32} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={handleDeleteAccount}
              activeOpacity={0.7}
            >
              <AppIcon source={require("./assets/icons/ic_delete.png")} variant="danger" shape="circle" size={16} containerSize={32} />
            </TouchableOpacity>
          </View>`;

if (code.includes(oldHeaderIcons)) {
  code = code.replace(oldHeaderIcons, newHeaderIcons);
  console.log('Successfully upgraded Ledger Header action buttons with AppIcon!');
} else {
  console.log('Warning: oldHeaderIcons exact match not found');
}

// 4. Upgrade Ledger Quick Action Chips (তাগাদা পাঠান, কল করুন, স্টেটমেন্ট শেয়ার)
const oldQuickActions = `        {/* Quick Action Chips: তাগাদা পাঠান, কল করুন, স্টেটমেন্ট শেয়ার */}
        <View style={styles.ledgerQuickActions}>
          {isCustomer ? (
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => setModalTagada(true)}
              activeOpacity={0.7}
            >
              <Image source={require('./assets/icons/ic_sms.png')} style={{ width: 20, height: 20, marginBottom: 4 }} resizeMode="contain" />
              <Text style={styles.quickActionLabel}>তাগাদা পাঠান</Text>
            </TouchableOpacity>
          ) : null}
          {selectedAccount.phone ? (
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => handleMakeCall(selectedAccount.phone)}
              activeOpacity={0.7}
            >
              <Image source={require('./assets/icons/ic_call.png')} style={{ width: 20, height: 20, marginBottom: 4, tintColor: '#0F8A0F' }} resizeMode="contain" />
              <Text style={styles.quickActionLabel}>কল করুন</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => {
              const fullStatement =
                \`=== \${businessName} ===\\n\` +
                \`হিসাব খাতা: \${selectedAccount.name}\\n\` +
                \`মোবাইল: \${selectedAccount.phone || 'দেওয়া নেই'}\\n\` +
                \`বর্তমান বকেয়া: ৳ \${formatMoney(selectedAccount.balance)}\\n\` +
                \`মোট লেনদেন: \${accountJournals.length} টি\\n\` +
                \`দিলাম মোট: ৳ \${formatMoney(totalGiven)}\\n\` +
                \`পেলাম মোট: ৳ \${formatMoney(totalReceived)}\\n\` +
                \`যোগাযোগ: \${ownerPhone}\`;
              Share.share({ message: fullStatement });
            }}
            activeOpacity={0.7}
          >
            <Image source={require('./assets/icons/ic_pdf.png')} style={{ width: 20, height: 20, marginBottom: 4 }} resizeMode="contain" />
            <Text style={styles.quickActionLabel}>স্টেটমেন্ট শেয়ার</Text>
          </TouchableOpacity>
        </View>`;

const newQuickActions = `        {/* Quick Action Chips: তাগাদা পাঠান, কল করুন, স্টেটমেন্ট শেয়ার */}
        <View style={styles.ledgerQuickActions}>
          {isCustomer ? (
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => setModalTagada(true)}
              activeOpacity={0.7}
            >
              <AppIcon source={require('./assets/icons/ic_sms.png')} variant="primary" shape="circle" size={20} containerSize={42} style={{ marginBottom: 6 }} />
              <Text style={styles.quickActionLabel}>তাগাদা পাঠান</Text>
            </TouchableOpacity>
          ) : null}
          {selectedAccount.phone ? (
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => handleMakeCall(selectedAccount.phone)}
              activeOpacity={0.7}
            >
              <AppIcon source={require('./assets/icons/ic_call.png')} variant="success" shape="circle" size={20} containerSize={42} style={{ marginBottom: 6 }} />
              <Text style={styles.quickActionLabel}>কল করুন</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => {
              const fullStatement =
                \`=== \${businessName} ===\\n\` +
                \`হিসাব খাতা: \${selectedAccount.name}\\n\` +
                \`মোবাইল: \${selectedAccount.phone || 'দেওয়া নেই'}\\n\` +
                \`বর্তমান বকেয়া: ৳ \${formatMoney(selectedAccount.balance)}\\n\` +
                \`মোট লেনদেন: \${accountJournals.length} টি\\n\` +
                \`দিলাম মোট: ৳ \${formatMoney(totalGiven)}\\n\` +
                \`পেলাম মোট: ৳ \${formatMoney(totalReceived)}\\n\` +
                \`যোগাযোগ: \${ownerPhone}\`;
              Share.share({ message: fullStatement });
            }}
            activeOpacity={0.7}
          >
            <AppIcon source={require('./assets/icons/ic_pdf.png')} variant="purple" shape="circle" size={20} containerSize={42} style={{ marginBottom: 6 }} />
            <Text style={styles.quickActionLabel}>স্টেটমেন্ট শেয়ার</Text>
          </TouchableOpacity>
        </View>

        <TwoToneDivider marginVertical={8} />`;

if (code.includes(oldQuickActions)) {
  code = code.replace(oldQuickActions, newQuickActions);
  console.log('Successfully upgraded Ledger Quick Action Chips with AppIcon & TwoToneDivider!');
} else {
  console.log('Warning: oldQuickActions exact match not found');
}

// 5. Upgrade ledgerTableHeader style to 3D engraved look
const oldLedgerHeaderStyle = `  ledgerTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 12,
    borderRadius: 6,
  },`;

const newLedgerHeaderStyle = `  ledgerTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 12,
    borderRadius: 8,
    borderTopWidth: 1,
    borderTopColor: '#FFFFFF',
    borderBottomWidth: 1.5,
    borderBottomColor: '#CBD5E1',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E2E8F0',
  },`;

if (code.includes(oldLedgerHeaderStyle)) {
  code = code.replace(oldLedgerHeaderStyle, newLedgerHeaderStyle);
  console.log('Successfully upgraded ledgerTableHeader style!');
} else {
  console.log('Warning: oldLedgerHeaderStyle exact match not found');
}

fs.writeFileSync('App.js', code, 'utf8');
console.log('App.js updated successfully!');
