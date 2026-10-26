const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

// --- 1. TALLYPAY UPGRADE ---
// Replace the walletActionRow items
const oldWalletActionRow = `<View style={styles.walletActionRow}>
              <TouchableOpacity
                style={styles.walletServiceBtn}
                onPress={() => setModalAddMoney(true)}
              >
                <View style={[styles.walletServiceIconBg, { backgroundColor: COLORS.blueLight }]}>
                  <Image source={require("./assets/nav/nav_tallypay.png")} style={{ width: 24, height: 24, tintColor: COLORS.blue }} resizeMode="contain" />
                </View>
                <Text style={styles.walletServiceLabel}>অ্যাড মানি</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.walletServiceBtn}
                onPress={() => setModalMoneyOut(true)}
              >
                <View style={[styles.walletServiceIconBg, { backgroundColor: COLORS.greenLight }]}>
                  <Image source={require("./assets/icons/ic_cash_sale.png")} style={{ width: 24, height: 24, tintColor: COLORS.green }} resizeMode="contain" />
                </View>
                <Text style={styles.walletServiceLabel}>মানি আউট</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.walletServiceBtn}
                onPress={() => setModalMobileRecharge(true)}
              >
                <View style={[styles.walletServiceIconBg, { backgroundColor: COLORS.redLight }]}>
                  <Image source={require("./assets/icons/ic_call.png")} style={{ width: 24, height: 24, tintColor: COLORS.primary }} resizeMode="contain" />
                </View>
                <Text style={styles.walletServiceLabel}>মোবাইল রিচার্জ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.walletServiceBtn}
                onPress={() => setModalBanglaQR(true)}
              >
                <View style={[styles.walletServiceIconBg, { backgroundColor: COLORS.goldLight }]}>
                  <Image source={require("./assets/ic_bangla_qr.png")} style={{ width: 24, height: 24 }} resizeMode="contain" />
                </View>
                <Text style={styles.walletServiceLabel}>কিউআর পেমেন্ট</Text>
              </TouchableOpacity>
            </View>`;

const newWalletActionRow = `<View style={styles.walletActionRow}>
              <TouchableOpacity
                style={styles.walletServiceBtn}
                onPress={() => setModalAddMoney(true)}
                activeOpacity={0.75}
              >
                <AppIcon
                  source={require("./assets/icons/ic_menu_accounts.png")}
                  variant="info"
                  shape="circle"
                  size={24}
                  containerSize={50}
                  accessibilityLabel="অ্যাড মানি"
                />
                <Text style={styles.walletServiceLabel}>অ্যাড মানি</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.walletServiceBtn}
                onPress={() => setModalMoneyOut(true)}
                activeOpacity={0.75}
              >
                <AppIcon
                  source={require("./assets/icons/ic_cash_sale.png")}
                  variant="success"
                  shape="circle"
                  size={24}
                  containerSize={50}
                  accessibilityLabel="মানি আউট"
                />
                <Text style={styles.walletServiceLabel}>মানি আউট</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.walletServiceBtn}
                onPress={() => setModalMobileRecharge(true)}
                activeOpacity={0.75}
              >
                <AppIcon
                  source={require("./assets/icons/ic_call.png")}
                  variant="danger"
                  shape="circle"
                  size={24}
                  containerSize={50}
                  accessibilityLabel="মোবাইল রিচার্জ"
                />
                <Text style={styles.walletServiceLabel}>মোবাইল রিচার্জ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.walletServiceBtn}
                onPress={() => setModalBanglaQR(true)}
                activeOpacity={0.75}
              >
                <AppIcon
                  source={require("./assets/ic_bangla_qr.png")}
                  variant="warning"
                  shape="circle"
                  size={24}
                  containerSize={50}
                  accessibilityLabel="কিউআর পেমেন্ট"
                />
                <Text style={styles.walletServiceLabel}>কিউআর পেমেন্ট</Text>
              </TouchableOpacity>
            </View>`;

code = code.replace(oldWalletActionRow.replace(/\r\n/g, '\n'), newWalletActionRow);
code = code.replace(oldWalletActionRow, newWalletActionRow);

// TallyPay section heading
code = code.replace(
  `<Text style={styles.sectionHeading}>সাম্প্রতিক ওয়ালেট লেনদেন</Text>`,
  `<SectionHeader title="সাম্প্রতিক ওয়ালেট লেনদেন" count={walletTxns.length} />`
);

// --- 2. CASHBOX UPGRADE ---
code = code.replace(
  `<Text style={styles.sectionHeading}>ক্যাশবক্সের হিসাব সমূহ</Text>`,
  `<SectionHeader title="ক্যাশবক্সের হিসাব সমূহ" count={recentCashEntries.length} />`
);

// Cash Category Rows in Cashbox
const oldCashCategoryBlock = `              {[
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
                      setCashCategory(item.cat);
                      setModalAddCash(true);
                    }}
                  >
                    <Image source={item.icon} style={{ width: 22, height: 22 }} resizeMode="contain" />
                    <Text style={[styles.cashAccountLabel, { marginLeft: 12 }]}>{item.label}</Text>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                      <Text style={[styles.cashAccountAmount, { color: item.isIn ? '#0F8A0F' : '#B81414' }]}>
                        {hideCashAmounts ? '***' : (item.isIn ? '+ ' : '- ') + '৳ ' + formatMoney(sum)}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 16, color: '#9CA3AF', marginLeft: 8 }}>›</Text>
                  </TouchableOpacity>
                );
              })}`;

const newCashCategoryBlock = `              {[
                { cat: 'sale', label: 'ক্যাশ বেচা', icon: require('./assets/icons/ic_cash_sale.png'), isIn: true, variant: 'success' },
                { cat: 'buy', label: 'ক্যাশ কেনা', icon: require('./assets/icons/ic_cash_buy.png'), isIn: false, variant: 'danger' },
                { cat: 'cost', label: 'খরচ', icon: require('./assets/icons/ic_menu_cost.png'), isIn: false, variant: 'danger' },
                { cat: 'malik_in', label: 'মালিক দিল', icon: require('./assets/icons/ic_menu_malik_report.png'), isIn: true, variant: 'success' },
                { cat: 'malik_out', label: 'মালিক নিল', icon: require('./assets/icons/ic_malik_out.png'), isIn: false, variant: 'danger' },
              ].map((item, idx) => {
                const catEntries = (cashEntries || []).filter((c) => c.category === item.cat);
                const sum = catEntries.reduce((acc, cur) => acc + (Number(cur.amount) || 0), 0);
                return (
                  <React.Fragment key={item.cat}>
                    {idx > 0 && <TwoToneDivider marginVertical={0} />}
                    <TouchableOpacity
                      style={styles.cashAccountRow}
                      onPress={() => {
                        setCashCategory(item.cat);
                        setModalAddCash(true);
                      }}
                      activeOpacity={0.75}
                    >
                      <AppIcon
                        source={item.icon}
                        variant={item.variant}
                        shape="rounded"
                        size={20}
                        containerSize={36}
                      />
                      <Text style={[styles.cashAccountLabel, { marginLeft: 12 }]}>{item.label}</Text>
                      <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={[styles.cashAccountAmount, { color: item.isIn ? '#0F8A0F' : '#B81414' }]}>
                          {hideCashAmounts ? '***' : (item.isIn ? '+ ' : '- ') + '৳ ' + formatMoney(sum)}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 16, color: '#9CA3AF', marginLeft: 8 }}>›</Text>
                    </TouchableOpacity>
                  </React.Fragment>
                );
              })}`;

code = code.replace(oldCashCategoryBlock.replace(/\r\n/g, '\n'), newCashCategoryBlock);
code = code.replace(oldCashCategoryBlock, newCashCategoryBlock);

// --- 3. MENU SCREEN UPGRADE ---
// Group 1
code = code.replace(
  `<View style={styles.menuGroupHeader}>
              <Text style={styles.menuGroupTitle}>টালিপে ওয়ালেট</Text>
            </View>`,
  `<SectionHeader title="টালিপে ওয়ালেট" count={3} />`
);

// Group 2
code = code.replace(
  `<View style={styles.menuGroupHeader}>
              <Text style={styles.menuGroupTitle}>টালিখাতা হিসাব ও রিপোর্ট</Text>
            </View>`,
  `<SectionHeader title="টালিখাতা হিসাব ও রিপোর্ট" count={7} />`
);

// Group 3
code = code.replace(
  `<View style={styles.menuGroupHeader}>
              <Text style={styles.menuGroupTitle}>সেটিংস ও অন্যান্য</Text>
            </View>`,
  `<SectionHeader title="সেটিংস ও অন্যান্য" count={5} />`
);

// Update Menu items to AppIcon with TwoToneDivider
code = code.replace(
  `<Image source={require('./assets/icons/ic_menu_accounts.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />`,
  `<AppIcon source={require('./assets/icons/ic_menu_accounts.png')} variant="info" shape="rounded" size={22} containerSize={38} />`
);

code = code.replace(
  `<Image source={require('./assets/icons/ic_menu_payment_messaging.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />`,
  `<AppIcon source={require('./assets/icons/ic_menu_payment_messaging.png')} variant="primary" shape="rounded" size={22} containerSize={38} />`
);

code = code.replace(
  `<Image source={require('./assets/icons/ic_menu_profit.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />`,
  `<AppIcon source={require('./assets/icons/ic_menu_profit.png')} variant="success" shape="rounded" size={22} containerSize={38} />`
);

code = code.replace(
  `<Image source={require('./assets/icons/ic_menu_cost.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />`,
  `<AppIcon source={require('./assets/icons/ic_menu_cost.png')} variant="danger" shape="rounded" size={22} containerSize={38} />`
);

code = code.replace(
  `<Image source={require('./assets/icons/ic_share.png')} style={{ width: 22, height: 22, tintColor: '#B81414' }} resizeMode="contain" />`,
  `<AppIcon source={require('./assets/icons/ic_menu_baki_hisab.png')} variant="primary" shape="rounded" size={22} containerSize={38} />`
);

code = code.replace(
  `<Image source={require('./assets/icons/ic_menu_report.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />`,
  `<AppIcon source={require('./assets/icons/ic_menu_report.png')} variant="purple" shape="rounded" size={22} containerSize={38} />`
);

code = code.replace(
  `<Image source={require('./assets/icons/ic_menu_malik_report.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />`,
  `<AppIcon source={require('./assets/icons/ic_menu_malik_report.png')} variant="success" shape="rounded" size={22} containerSize={38} />`
);

code = code.replace(
  `<Image source={require('./assets/icons/ic_menu_stock.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />`,
  `<AppIcon source={require('./assets/icons/ic_menu_stock.png')} variant="warning" shape="rounded" size={22} containerSize={38} />`
);

code = code.replace(
  `<Image source={require('./assets/icons/ic_menu_note.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />`,
  `<AppIcon source={require('./assets/icons/ic_menu_note.png')} variant="info" shape="rounded" size={22} containerSize={38} />`
);

code = code.replace(
  `<Image source={require('./assets/icons/ic_menu_settings.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />`,
  `<AppIcon source={require('./assets/icons/ic_menu_settings.png')} variant="neutral" shape="rounded" size={22} containerSize={38} />`
);

code = code.replace(
  `<Image source={require('./assets/icons/ic_menu_backup.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />`,
  `<AppIcon source={require('./assets/icons/ic_menu_backup.png')} variant="success" shape="rounded" size={22} containerSize={38} />`
);

code = code.replace(
  `<Image source={require('./assets/icons/ic_share.png')} style={{ width: 22, height: 22, tintColor: COLORS.primary }} resizeMode="contain" />`,
  `<AppIcon source={require('./assets/icons/ic_share.png')} variant="primary" shape="rounded" size={22} containerSize={38} />`
);

code = code.replace(
  `<Image source={require('./assets/icons/ic_menu_support.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />`,
  `<AppIcon source={require('./assets/icons/ic_menu_support.png')} variant="purple" shape="rounded" size={22} containerSize={38} />`
);

// Two ic_menu_lock instances in Menu
let lockCount = 0;
code = code.replace(/<Image source=\{require\('\.\/assets\/icons\/ic_menu_lock\.png'\)\} style=\{\{ width: 2[24], height: 2[24] \}\} resizeMode="contain" \/>/g, (match) => {
  lockCount++;
  if (lockCount === 1) {
    return `<AppIcon source={require('./assets/icons/ic_menu_lock.png')} variant="warning" shape="rounded" size={22} containerSize={38} />`;
  }
  return `<AppIcon source={require('./assets/icons/ic_menu_lock.png')} variant="danger" shape="rounded" size={22} containerSize={38} />`;
});

// --- 4. BACKUP CONTROLS 3D TACTILE UPGRADE ---
code = code.replace(
  `<Text style={styles.cloudControlsSectionTitle}>ক্লাউড ব্যাকআপ ও রিস্টোর অপশন</Text>`,
  `<SectionHeader title="ক্লাউড ব্যাকআপ ও রিস্টোর অপশন" />`
);

// Control 1: এখন ব্যাকআপ নিন
code = code.replace(
  `<View style={[styles.cloudControlIconCircle, { backgroundColor: '#FEE2E2' }]}>
                        <Image
                          source={require('./assets/icons/grid_backup.png')}
                          style={{ width: 22, height: 22, tintColor: '#B81414' }}
                          resizeMode="contain"
                        />
                      </View>`,
  `<AppIcon source={require('./assets/icons/grid_backup.png')} variant="danger" shape="circle" size={22} containerSize={44} style={{ marginRight: 12 }} />`
);

// Control 2: অনলাইন ব্যাকআপ রিস্টোর করুন
code = code.replace(
  `<View style={[styles.cloudControlIconCircle, { backgroundColor: '#DCFCE7' }]}>
                        <Image
                          source={require('./assets/icons/ic_cloud.png')}
                          style={{ width: 22, height: 22, tintColor: '#0F8A0F' }}
                          resizeMode="contain"
                        />
                      </View>`,
  `<AppIcon source={require('./assets/icons/ic_cloud.png')} variant="success" shape="circle" size={22} containerSize={44} style={{ marginRight: 12 }} />`
);

// Control 3: ডাটা এক্সপোর্ট করুন
code = code.replace(
  `<View style={[styles.cloudControlIconCircle, { backgroundColor: '#DBEAFE' }]}>
                        <Image
                          source={require('./assets/icons/ic_share.png')}
                          style={{ width: 20, height: 20, tintColor: '#2563EB' }}
                          resizeMode="contain"
                        />
                      </View>`,
  `<AppIcon source={require('./assets/icons/ic_share.png')} variant="info" shape="circle" size={22} containerSize={44} style={{ marginRight: 12 }} />`
);

// Control 4: Google Drive Account পরিবর্তন করুন
code = code.replace(
  `<View style={[styles.cloudControlIconCircle, { backgroundColor: '#FEF3C7' }]}>
                        <Image
                          source={require('./assets/icons/ic_menu_accounts.png')}
                          style={{ width: 20, height: 20, tintColor: '#D97706' }}
                          resizeMode="contain"
                        />
                      </View>`,
  `<AppIcon source={require('./assets/icons/ic_menu_accounts.png')} variant="warning" shape="circle" size={22} containerSize={44} style={{ marginRight: 12 }} />`
);

// Control 5: Google Account সরান
code = code.replace(
  `<View style={[styles.cloudControlIconCircle, { backgroundColor: '#FEE2E2' }]}>
                        <Image
                          source={require('./assets/icons/ic_delete.png')}
                          style={{ width: 20, height: 20, tintColor: '#DC2626' }}
                          resizeMode="contain"
                        />
                      </View>`,
  `<AppIcon source={require('./assets/icons/ic_delete.png')} variant="danger" shape="circle" size={22} containerSize={44} style={{ marginRight: 12 }} />`
);

// Update cloudControlCard in styles to 3D tactile card
code = code.replace(
  `  cloudControlCard: {\r\n    flexDirection: 'row',\r\n    alignItems: 'center',\r\n    backgroundColor: '#FFFFFF',\r\n    borderRadius: 12,\r\n    padding: 12,\r\n    borderWidth: 1,\r\n    borderColor: '#E5E7EB',\r\n    marginBottom: 10,\r\n    elevation: 1,\r\n    shadowColor: '#000',\r\n    shadowOpacity: 0.04,\r\n    shadowOffset: { width: 0, height: 1 },\r\n    shadowRadius: 2,\r\n  },`,
  `  cloudControlCard: {\r\n    flexDirection: 'row',\r\n    alignItems: 'center',\r\n    backgroundColor: '#FFFFFF',\r\n    borderRadius: 14,\r\n    padding: 14,\r\n    borderTopWidth: 1.5,\r\n    borderTopColor: '#FFFFFF',\r\n    borderBottomWidth: 3,\r\n    borderBottomColor: '#E2E8F0',\r\n    borderLeftWidth: 1,\r\n    borderRightWidth: 1,\r\n    borderColor: '#EDF2F7',\r\n    marginBottom: 12,\r\n    elevation: 2,\r\n    shadowColor: '#000',\r\n    shadowOpacity: 0.06,\r\n    shadowOffset: { width: 0, height: 2 },\r\n    shadowRadius: 3,\r\n  },`
);
code = code.replace(
  `  cloudControlCard: {\n    flexDirection: 'row',\n    alignItems: 'center',\n    backgroundColor: '#FFFFFF',\n    borderRadius: 12,\n    padding: 12,\n    borderWidth: 1,\n    borderColor: '#E5E7EB',\n    marginBottom: 10,\n    elevation: 1,\n    shadowColor: '#000',\n    shadowOpacity: 0.04,\n    shadowOffset: { width: 0, height: 1 },\n    shadowRadius: 2,\n  },`,
  `  cloudControlCard: {\n    flexDirection: 'row',\n    alignItems: 'center',\n    backgroundColor: '#FFFFFF',\n    borderRadius: 14,\n    padding: 14,\n    borderTopWidth: 1.5,\n    borderTopColor: '#FFFFFF',\n    borderBottomWidth: 3,\n    borderBottomColor: '#E2E8F0',\n    borderLeftWidth: 1,\n    borderRightWidth: 1,\n    borderColor: '#EDF2F7',\n    marginBottom: 12,\n    elevation: 2,\n    shadowColor: '#000',\n    shadowOpacity: 0.06,\n    shadowOffset: { width: 0, height: 2 },\n    shadowRadius: 3,\n  },`
);

fs.writeFileSync('App.js', code, 'utf8');
console.log('App.js successfully upgraded with modern 3D icons & dividers in Menu, Cashbox, TallyPay, and Backup!');
