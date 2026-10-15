import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('part3_views_and_tabs.js', 'r', encoding='utf-8') as f:
    text = f.read()

p_start = text.find('// VIEW B: MAIN HOME VIEW (WITH 5 AUTHENTIC TABS)')
if p_start == -1:
    p_start = text.find('// VIEW B: MAIN HOME VIEW')

p_cashbox = text.find('{/* ===================================================================\n            TAB 2: CASHBOX')
if p_cashbox == -1:
    p_cashbox = text.find("{activeTab === 'cashbox' && (")

new_home_section = '''// =========================================================================
  // VIEW B: MAIN HOME VIEW (WITH AUTHENTIC 1:1 VISUAL PARITY)
  // =========================================================================
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#991111" />

      {/* --- AUTHENTIC 1:1 TALLYKHATA TOP HEADER BAR (photo_2026-10-15_18-13-34.jpg) --- */}
      <View style={styles.topHeaderBarRed}>
        <View style={styles.headerLeftPillContainer}>
          <TouchableOpacity
            style={styles.headerBizPill}
            onPress={() => setModalBusinessPicker(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.headerBizPillText}>{businessName || 'Mobile Xpress'}</Text>
            <Image
              source={require('./assets/icons/ic_arrow_down.png')}
              style={styles.headerBizPillArrow}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <Text style={styles.headerSubtitleWhite}>স্ট্যান্ডার্ড</Text>
        </View>

        <View style={styles.headerRightActionsRed}>
          {/* Inbox with 99+ Badge and Bangla text */}
          <TouchableOpacity
            style={styles.headerWhiteActionBtn}
            onPress={() => setModalInbox(true)}
            activeOpacity={0.7}
          >
            <View style={{ position: 'relative' }}>
              <Image
                source={require('./assets/icons/tb_inbox_white.png')}
                style={styles.headerWhiteActionIcon}
                resizeMode="contain"
              />
              <View style={styles.headerBadgeWhite}>
                <Text style={styles.headerBadgeWhiteText}>99+</Text>
              </View>
            </View>
            <Text style={styles.headerActionLabelWhite}>ইনবক্স</Text>
          </TouchableOpacity>

          {/* Support with Bangla text */}
          <TouchableOpacity
            style={styles.headerWhiteActionBtn}
            onPress={() => setModalSupport(true)}
            activeOpacity={0.7}
          >
            <Image
              source={require('./assets/icons/tb_support_white.png')}
              style={styles.headerWhiteActionIcon}
              resizeMode="contain"
            />
            <Text style={styles.headerActionLabelWhite}>সাপোর্ট</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* --- TAB CONTENT CONTAINER --- */}
      <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>

        {/* ===================================================================
            TAB 1: HOME / TALLY (টালি - 1:1 Authentic from photo_2026-10-15_18-13-34.jpg)
           =================================================================== */}
        {activeTab === 'home' && (
          <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
            <FlatList
              data={filteredAccounts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 95 }}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <View style={{ backgroundColor: '#F8F9FA' }}>
                  {/* --- 1. PROMO BANNER (মানি ট্রান্সফার চার্জ ফ্রি!*) --- */}
                  <TouchableOpacity
                    style={styles.promoBannerCard}
                    onPress={() => setActiveTab('tallypay')}
                    activeOpacity={0.85}
                  >
                    <Image
                      source={require('./assets/icons/ic_sqr_value_banner.png')}
                      style={styles.promoBannerImg}
                      resizeMode="contain"
                    />
                    <View style={styles.promoBannerTextCol}>
                      <Text style={styles.promoBannerBold}>
                        মানি ট্রান্সফার{'\n'}চার্জ ফ্রি!*
                      </Text>
                      <Text style={styles.promoBannerSub}>*শর্ত প্রযোজ্য</Text>
                    </View>
                  </TouchableOpacity>

                  {/* --- 2. 8-ITEM AUTHENTIC QUICK ACTIONS GRID --- */}
                  <View style={styles.quickGridContainer}>
                    {/* Row 1 */}
                    <View style={styles.quickGridRow}>
                      <TouchableOpacity
                        style={styles.quickGridItem}
                        onPress={() => setModalBusinessPicker(true)}
                        activeOpacity={0.7}
                      >
                        <Image
                          source={require('./assets/icons/grid_multi_biz.png')}
                          style={styles.quickGridIcon}
                          resizeMode="contain"
                        />
                        <Text style={styles.quickGridLabel}>মাল্টি ব্যবসা</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.quickGridItem}
                        onPress={() => setModalAddStock(true)}
                        activeOpacity={0.7}
                      >
                        <Image
                          source={require('./assets/icons/grid_stock.png')}
                          style={styles.quickGridIcon}
                          resizeMode="contain"
                        />
                        <Text style={styles.quickGridLabel}>স্টক হিসাব</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.quickGridItem}
                        onPress={() => setModalNotes(true)}
                        activeOpacity={0.7}
                      >
                        <Image
                          source={require('./assets/icons/grid_note.png')}
                          style={styles.quickGridIcon}
                          resizeMode="contain"
                        />
                        <Text style={styles.quickGridLabel}>ব্যবসার নোট</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.quickGridItem}
                        onPress={() => setModalTagada(true)}
                        activeOpacity={0.7}
                      >
                        <Image
                          source={require('./assets/icons/grid_bulk_tagada.png')}
                          style={styles.quickGridIcon}
                          resizeMode="contain"
                        />
                        <Text style={styles.quickGridLabel}>গ্রুপ তাগাদা</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Row 2 */}
                    <View style={styles.quickGridRow}>
                      <TouchableOpacity
                        style={styles.quickGridItem}
                        onPress={() => setModalBanglaQR(true)}
                        activeOpacity={0.7}
                      >
                        <Image
                          source={require('./assets/icons/grid_qr.png')}
                          style={styles.quickGridIcon}
                          resizeMode="contain"
                        />
                        <Text style={styles.quickGridLabel}>QR কোড</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.quickGridItem}
                        onPress={() => setModalBackupRestore(true)}
                        activeOpacity={0.7}
                      >
                        <Image
                          source={require('./assets/icons/grid_backup.png')}
                          style={styles.quickGridIcon}
                          resizeMode="contain"
                        />
                        <Text style={styles.quickGridLabel}>ডাটা ব্যাকআপ</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.quickGridItem}
                        onPress={() => setModalTallyMessage(true)}
                        activeOpacity={0.7}
                      >
                        <Image
                          source={require('./assets/icons/grid_tally_msg.png')}
                          style={styles.quickGridIcon}
                          resizeMode="contain"
                        />
                        <Text style={styles.quickGridLabel}>টালি-মেসেজ</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.quickGridItem}
                        onPress={() => setActiveTab('cashbox')}
                        activeOpacity={0.7}
                      >
                        <Image
                          source={require('./assets/icons/grid_cashbox.png')}
                          style={styles.quickGridIcon}
                          resizeMode="contain"
                        />
                        <Text style={styles.quickGridLabel}>ক্যাশবক্স</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* --- 3. SUMMARY CARD (১,০৮,৫০০ মোট পাবো | ০ মোট দেবো) --- */}
                  <View style={styles.summaryCardContainer}>
                    <TouchableOpacity
                      style={styles.summaryCardCol}
                      onPress={() => setModalBakiReport(true)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.summaryCardAmountRed}>
                        {toBengaliNumber(totalCustomerDue)}
                      </Text>
                      <Text style={styles.summaryCardLabel}>মোট পাবো</Text>
                    </TouchableOpacity>

                    <View style={styles.summaryCardDivider} />

                    <TouchableOpacity
                      style={styles.summaryCardCol}
                      onPress={() => {
                        setAccountTab('supplier');
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.summaryCardAmountGreen}>
                        {toBengaliNumber(totalSupplierDue)}
                      </Text>
                      <Text style={styles.summaryCardLabel}>মোট দেবো</Text>
                    </TouchableOpacity>
                  </View>

                  {/* --- 4. SEARCH & ACTION BAR --- */}
                  <View style={styles.searchPillBar}>
                    <Image
                      source={require('./assets/icons/ic_search.png')}
                      style={{ width: 18, height: 18, tintColor: '#6B7280', marginRight: 10 }}
                      resizeMode="contain"
                    />
                    <TextInput
                      style={{ flex: 1, fontSize: 15, color: '#111827', paddingVertical: 0 }}
                      placeholder="খোঁজ"
                      placeholderTextColor="#6B7280"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    {searchQuery ? (
                      <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                        <Image
                          source={require('./assets/icons/ic_close.png')}
                          style={{ width: 14, height: 14, tintColor: '#6B7280' }}
                          resizeMode="contain"
                        />
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                      style={{ padding: 6, marginLeft: 4 }}
                      onPress={() => {
                        const nextF = accountFilter === 'all' ? 'due' : accountFilter === 'due' ? 'highest' : 'all';
                        setAccountFilter(nextF);
                      }}
                    >
                      <Image
                        source={require('./assets/icons/ic_filter.png')}
                        style={{ width: 22, height: 22, tintColor: accountFilter !== 'all' ? '#B81414' : '#374151' }}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ padding: 6, marginLeft: 4 }}
                      onPress={() => setModalFullReport(true)}
                    >
                      <Image
                        source={require('./assets/icons/ic_download.png')}
                        style={{ width: 22, height: 22, tintColor: '#374151' }}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  </View>

                  {/* --- 5. COUNTER STRIP (কাস্টমার ১২ / সাপ্লায়ার ০) --- */}
                  <View style={styles.counterStripRow}>
                    <Text style={styles.counterStripText}>
                      কাস্টমার {toBengaliNumber(accounts.filter((a) => a.type === 1).length)} / সাপ্লায়ার {toBengaliNumber(accounts.filter((a) => a.type === 2).length)}
                    </Text>
                  </View>
                </View>
              }
              renderItem={({ item, index }) => {
                const avatar = getAvatarInfo(item.name, index);
                return (
                  <TouchableOpacity
                    style={styles.customerListCard}
                    onPress={() => {
                      setSelectedAccount(item);
                      setCurrentScreen('account_ledger');
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.customerAvatarCircle, { backgroundColor: avatar.bg }]}>
                      <Text style={styles.customerAvatarText}>{avatar.text}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.customerCardName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.customerCardTime}>{item.timeAgo || '৩ মাস'}</Text>
                    </View>
                    <Text style={[styles.customerCardAmount, { color: item.balance > 0 ? '#B81414' : item.balance < 0 ? '#1C7D50' : '#4B5563' }]}>
                      {toBengaliDecimal(item.balance)}
                    </Text>
                    <Text style={styles.customerChevron}>›</Text>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Image
                    source={require('./assets/ic_no_txn_img_customer.png')}
                    style={{ width: 140, height: 140, marginBottom: 12 }}
                    resizeMode="contain"
                  />
                  <Text style={styles.emptyText}>কোনো খাতা পাওয়া যায়নি</Text>
                  <Text style={styles.emptySubText}>নিচের বাটন চেপে নতুন কাস্টমার বা সাপ্লায়ার যোগ করুন</Text>
                </View>
              }
            />

            {/* --- 6. CIRCULAR FLOATING ACTION BUTTON (👤+) --- */}
            <TouchableOpacity
              style={styles.floatingRoundFab}
              onPress={() => {
                setAccType(1);
                setModalAddAccount(true);
              }}
              activeOpacity={0.85}
            >
              <Image
                source={require('./assets/icons/ic_add_user.png')}
                style={{ width: 26, height: 26, tintColor: '#FFFFFF' }}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        )}

        '''

text = text[:p_start] + new_home_section + text[p_cashbox:]

# Now replace the bottom navigation bar with exactly 4 tabs (টালি, ক্যাশবক্স, টালিপে, মেনু)
p_bottom = text.find('{/* --- AUTHENTIC 5-TAB BOTTOM NAVIGATION BAR --- */')
if p_bottom == -1:
    p_bottom = text.find('<View style={styles.bottomTabBar}>')

end_bottom = text.find('</View>', p_bottom + 200) + len('</View>')

new_bottom_bar = '''{/* --- AUTHENTIC 4-TAB BOTTOM NAVIGATION BAR (photo_2026-10-15_18-13-34.jpg) --- */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab('home')}
          activeOpacity={0.8}
        >
          {activeTab === 'home' ? (
            <View style={styles.tabActivePill}>
              <Image
                source={require('./assets/nav/nav_home_active.png')}
                style={[styles.tabIconImg, { tintColor: '#B81414', marginBottom: 0 }]}
                resizeMode="contain"
              />
            </View>
          ) : (
            <Image
              source={require('./assets/nav/nav_home.png')}
              style={styles.tabIconImg}
              resizeMode="contain"
            />
          )}
          <Text style={[styles.tabButtonLabel, activeTab === 'home' && styles.tabButtonLabelActive]}>
            টালি
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab('cashbox')}
          activeOpacity={0.8}
        >
          <Image
            source={activeTab === 'cashbox' ? require('./assets/nav/nav_cashbox_active.png') : require('./assets/nav/nav_cashbox.png')}
            style={styles.tabIconImg}
            resizeMode="contain"
          />
          <Text style={[styles.tabButtonLabel, activeTab === 'cashbox' && styles.tabButtonLabelActive]}>
            ক্যাশবক্স
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab('tallypay')}
          activeOpacity={0.8}
        >
          <Image
            source={activeTab === 'tallypay' ? require('./assets/nav/nav_tallypay_active.png') : require('./assets/nav/nav_tallypay.png')}
            style={styles.tabIconImg}
            resizeMode="contain"
          />
          <Text style={[styles.tabButtonLabel, activeTab === 'tallypay' && styles.tabButtonLabelActive]}>
            টালিপে
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab('menu')}
          activeOpacity={0.8}
        >
          <Image
            source={activeTab === 'menu' ? require('./assets/nav/nav_menu_active.png') : require('./assets/nav/nav_menu.png')}
            style={styles.tabIconImg}
            resizeMode="contain"
          />
          <Text style={[styles.tabButtonLabel, activeTab === 'menu' && styles.tabButtonLabelActive]}>
            মেনু
          </Text>
        </TouchableOpacity>
      </View>'''

text = text[:p_bottom] + new_bottom_bar + text[end_bottom:]

with open('part3_views_and_tabs.js', 'w', encoding='utf-8') as f:
    f.write(text)

print('part3_views_and_tabs.js updated successfully!')
