  // =========================================================================
  // VIEW: PIN SECURITY LOCK SCREEN
  // =========================================================================
  if (pinEnabled && isLocked) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: COLORS.primary }]}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />
        <View style={styles.pinLockContainer}>
          <Image source={require("./assets/icons/ic_lock.png")} style={{ width: 56, height: 56, marginBottom: 16, tintColor: "#FFFFFF" }} resizeMode="contain" />
          <Text style={styles.pinLockTitle}>টালিখাতা লক</Text>
          <Text style={styles.pinLockSub}>অ্যাপটি খুলতে আপনার ৪ ডিজিটের পিন দিন</Text>

          <View style={styles.pinDotsRow}>
            {[0, 1, 2, 3].map((idx) => (
              <View
                key={idx}
                style={[
                  styles.pinDot,
                  pinInput.length > idx && styles.pinDotFilled,
                ]}
              />
            ))}
          </View>

          <View style={styles.pinKeypad}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
              <TouchableOpacity
                key={k}
                style={styles.pinKeyBtn}
                onPress={() => {
                  if (k === 'C') {
                    setPinInput('');
                  } else if (k === '⌫') {
                    setPinInput((prev) => prev.slice(0, -1));
                  } else {
                    if (pinInput.length < 4) {
                      const next = pinInput + k;
                      setPinInput(next);
                      if (next.length === 4) {
                        if (next === appPin) {
                          setIsLocked(false);
                          setPinInput('');
                        } else {
                          Alert.alert('ভুল PIN', 'সঠিক PIN দিয়ে চেষ্টা করুন।');
                          setPinInput('');
                        }
                      }
                    }
                  }
                }}
              >
                <Text style={styles.pinKeyText}>{k}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // VIEW A: CUSTOMER / SUPPLIER ACCOUNT LEDGER SCREEN
  // =========================================================================
  if (currentScreen === 'account_ledger' && selectedAccount) {
    const isCustomer = selectedAccount.type === 1;
    const accountJournals = (journals || []).filter((j) => j.accountId === selectedAccount.id);

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

        {/* Ledger Top Header */}
        <View style={styles.ledgerHeaderNav}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentScreen('home')}>
            <Text style={styles.backBtnText}>← খাতা</Text>
          </TouchableOpacity>
          <View style={styles.ledgerHeaderTitleBox}>
            <Text style={styles.ledgerHeaderName} numberOfLines={1}>{selectedAccount.name}</Text>
            <Text style={styles.ledgerHeaderSub}>
              {isCustomer ? 'কাস্টমার হিসাব' : 'সাপ্লায়ার হিসাব'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {selectedAccount.phone ? (
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => handleMakeCall(selectedAccount.phone)}
              >
                <Image source={require("./assets/icons/ic_call.png")} style={{ width: 18, height: 18 }} resizeMode="contain" />
              </TouchableOpacity>
            ) : null}
            {isCustomer ? (
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => setModalTagada(true)}
              >
                <Image source={require("./assets/icons/ic_share.png")} style={{ width: 18, height: 18 }} resizeMode="contain" />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.headerIconBtn} onPress={handleOpenEditAccount}>
              <Image source={require("./assets/icons/ic_edit.png")} style={{ width: 18, height: 18 }} resizeMode="contain" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteAccBtn} onPress={handleDeleteAccount}>
              <Text style={styles.deleteAccBtnText}>মুছুন</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Profile Card */}
        <View style={styles.accountProfileCard}>
          <View style={[styles.profileAvatar, { backgroundColor: isCustomer ? COLORS.redLight : COLORS.greenLight }]}>
            <Text style={[styles.profileAvatarText, { color: isCustomer ? COLORS.primary : COLORS.green }]}>
              {(selectedAccount.name || 'খ')[0]}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.profileName}>{selectedAccount.name}</Text>
            <Text style={styles.profilePhone}>
              {selectedAccount.phone || 'মোবাইল নম্বর নেই'}
            </Text>
            {selectedAccount.address ? (
              <Text style={styles.profileAddress}>{selectedAccount.address}</Text>
            ) : null}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.profileDueLabel, { color: isCustomer ? COLORS.primary : COLORS.green }]}>
              {isCustomer ? 'মোট পাবো (বাকি)' : 'মোট দেবো (দেনা)'}
            </Text>
            <Text style={[styles.profileDueAmount, { color: isCustomer ? COLORS.primary : COLORS.green }]}>
              ৳ {formatMoney(selectedAccount.balance)}
            </Text>
          </View>
        </View>

        {/* Quick Action Chips */}
        <View style={styles.ledgerQuickActions}>
          {isCustomer ? (
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => setModalTagada(true)}
            >
              <Image source={require('./assets/icons/ic_share.png')} style={{ width: 20, height: 20, marginBottom: 4 }} resizeMode="contain" />
              <Text style={styles.quickActionLabel}>তাগাদা পাঠান</Text>
            </TouchableOpacity>
          ) : null}
          {selectedAccount.phone ? (
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => handleMakeCall(selectedAccount.phone)}
            >
              <Image source={require('./assets/icons/ic_call.png')} style={{ width: 20, height: 20, marginBottom: 4 }} resizeMode="contain" />
              <Text style={styles.quickActionLabel}>কল করুন</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => {
              const fullStatement =
                `=== ${businessName} ===\n` +
                `হিসাব খাতা: ${selectedAccount.name}\n` +
                `মোবাইল: ${selectedAccount.phone || 'দেওয়া নেই'}\n` +
                `বর্তমান বকেয়া: ৳ ${formatMoney(selectedAccount.balance)}\n` +
                `মোট লেনদেন: ${accountJournals.length} টি\n` +
                `যোগাযোগ: ${ownerPhone}`;
              Share.share({ message: fullStatement });
            }}
          >
            <Image source={require('./assets/icons/ic_pdf.png')} style={{ width: 20, height: 20, marginBottom: 4 }} resizeMode="contain" />
            <Text style={styles.quickActionLabel}>স্টেটমেন্ট শেয়ার</Text>
          </TouchableOpacity>
        </View>

        {/* Ledger Table Column Headers */}
        <View style={styles.ledgerTableHeader}>
          <Text style={[styles.ledgerColHeader, { flex: 1.4 }]}>তারিখ ও বিবরণ</Text>
          <Text style={[styles.ledgerColHeader, { flex: 1, textAlign: 'right', color: COLORS.red }]}>
            দিলাম (-)
          </Text>
          <Text style={[styles.ledgerColHeader, { flex: 1, textAlign: 'right', color: COLORS.green }]}>
            পেলাম (+)
          </Text>
          <Text style={[styles.ledgerColHeader, { flex: 1.1, textAlign: 'right', color: COLORS.textMuted }]}>
            ব্যালেন্স
          </Text>
        </View>

        {/* Ledger Transactions List */}
        <FlatList
          data={accountJournals}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 110 }}
          renderItem={({ item }) => {
            const isGiven = item.type === 'given';
            return (
              <TouchableOpacity
                style={styles.ledgerRowCard}
                onPress={() => {
                  setSelectedVoucherTxn(item);
                  setModalVoucher(true);
                }}
              >
                <View style={{ flex: 1.4 }}>
                  <Text style={styles.ledgerRowDesc}>{item.desc || 'সাধারণ লেনদেন'}</Text>
                  <Text style={styles.ledgerRowDate}>
                    {formatDisplayDate(item.date)} {item.time ? '• ' + item.time : ''}
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  {isGiven ? (
                    <Text style={styles.ledgerGivenAmount}>৳ {formatMoney(item.amount)}</Text>
                  ) : (
                    <Text style={styles.dashMuted}>-</Text>
                  )}
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  {!isGiven ? (
                    <Text style={styles.ledgerReceivedAmount}>৳ {formatMoney(item.amount)}</Text>
                  ) : (
                    <Text style={styles.dashMuted}>-</Text>
                  )}
                </View>
                <View style={{ flex: 1.1, alignItems: 'flex-end' }}>
                  <Text style={styles.ledgerRowBalance}>
                    ৳ {formatMoney(item.runningBalance !== undefined ? item.runningBalance : selectedAccount.balance)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Image source={require('./assets/ic_no_txn_img_customer.png')} style={{ width: 80, height: 80, marginBottom: 8 }} resizeMode="contain" />
              <Text style={styles.emptyText}>কোনো লেনদেন রেকর্ড নেই</Text>
              <Text style={styles.emptySubText}>নিচের বাটন চেপে বাকি বা জমা এন্ট্রি দিন</Text>
            </View>
          }
        />

        {/* Bottom Dual Entry Bar (দিলাম / পেলাম) */}
        <View style={styles.ledgerBottomBar}>
          <TouchableOpacity
            style={[styles.bigEntryBtn, { backgroundColor: COLORS.primary }]}
            onPress={() => handleOpenAddTxn('given')}
          >
            <Text style={styles.bigEntryBtnText}>- দিলাম (বাকি)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bigEntryBtn, { backgroundColor: COLORS.green }]}
            onPress={() => handleOpenAddTxn('received')}
          >
            <Text style={styles.bigEntryBtnText}>+ পেলাম (জমা)</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // VIEW B: MAIN HOME VIEW (WITH 5 AUTHENTIC TABS)
  // =========================================================================
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

      {/* --- AUTHENTIC TALLYKHATA TOP HEADER BAR (layout_content_main.xml) --- */}
      <View style={styles.topHeaderBar}>
        <TouchableOpacity
          style={styles.headerLeftBiz}
          onPress={() => setModalSettings(true)}
          activeOpacity={0.8}
        >
          <View style={styles.headerStoreIcon}>
            <Image
              source={require('./assets/ic_tally_khata_logo_reg.png')}
              style={{ width: 24, height: 24 }}
              resizeMode="contain"
            />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image
                source={require('./assets/icons/ic_crown.png')}
                style={{ width: 14, height: 14, marginRight: 4 }}
                resizeMode="contain"
              />
              <Text style={styles.headerBizName} numberOfLines={1}>{businessName}</Text>
              <Image
                source={require('./assets/icons/ic_arrow_down.png')}
                style={{ width: 10, height: 10, marginLeft: 4, tintColor: '#1A1A1A' }}
                resizeMode="contain"
              />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 1 }}>
              <Text style={styles.headerBizPhone}>গোল্ড (অবশিষ্টঃ ৭ দিন)</Text>
              <View style={styles.headerDotSep} />
              <TouchableOpacity
                onPress={() => Alert.alert('ভেরিফাইড মার্চেন্ট', 'আপনার টালিখাতা অ্যাকাউন্ট ১০০% ভেরিফাইড ও সুরক্ষিত।')}
              >
                <Text style={styles.headerVerifyTag}>ভেরিফাইড</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.headerRightActions}>
          {/* Cloud Sync Status */}
          <TouchableOpacity
            style={styles.headerToolbarActionBtn}
            onPress={() => {
              setBackupJsonText('');
              setModalBackupRestore(true);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.cloudIconWrapper}>
              <Image
                source={require('./assets/icons/ic_cloud.png')}
                style={{ width: 22, height: 22 }}
                resizeMode="contain"
              />
              <View style={styles.cloudTickDot}>
                <Image
                  source={require('./assets/icons/ic_check.png')}
                  style={{ width: 7, height: 7 }}
                  resizeMode="contain"
                />
              </View>
            </View>
            <Text style={styles.headerToolbarActionLabel}>ব্যাকআপ</Text>
          </TouchableOpacity>

          {/* Inbox with 99+ Badge and Bangla text */}
          <TouchableOpacity
            style={styles.headerToolbarActionBtn}
            onPress={() => setModalInbox(true)}
            activeOpacity={0.7}
          >
            <View style={styles.headerIconWithBadge}>
              <Image
                source={require('./assets/icons/ic_inbox.png')}
                style={{ width: 22, height: 22 }}
                resizeMode="contain"
              />
              <View style={styles.headerCounterBadge}>
                <Text style={styles.headerCounterText}>99+</Text>
              </View>
            </View>
            <Text style={styles.headerToolbarActionLabel}>ইনবক্স</Text>
          </TouchableOpacity>

          {/* Support with 9+ Badge and Bangla text */}
          <TouchableOpacity
            style={styles.headerToolbarActionBtn}
            onPress={() => setModalSupport(true)}
            activeOpacity={0.7}
          >
            <View style={styles.headerIconWithBadge}>
              <Image
                source={require('./assets/icons/ic_support.png')}
                style={{ width: 22, height: 22 }}
                resizeMode="contain"
              />
              <View style={styles.headerCounterBadge}>
                <Text style={styles.headerCounterText}>9+</Text>
              </View>
            </View>
            <Text style={styles.headerToolbarActionLabel}>সাপোর্ট</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* --- DASHBOARD SUMMARY CARDS (layout_sale_cash_total.xml) --- */}
      <View style={styles.dashboardContainer}>
        <View style={styles.dashboardRow}>
          {/* Left Card: মোট পাবো */}
          <TouchableOpacity
            style={styles.dashboardCard}
            onPress={() => {
              setAccountTab('customer');
              setActiveTab('home');
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.dashAmount, { color: '#B81414' }]}>
              ৳ {formatMoney(totalCustomerDue)}
            </Text>
            <Text style={styles.dashLabel}>মোট পাবো</Text>
          </TouchableOpacity>

          {/* Authentic Vertical Divider */}
          <View style={styles.dashboardVerticalDivider} />

          {/* Right Card: মোট দেবো */}
          <TouchableOpacity
            style={styles.dashboardCard}
            onPress={() => {
              setAccountTab('supplier');
              setActiveTab('home');
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.dashAmount, { color: '#1C7D50' }]}>
              ৳ {formatMoney(totalSupplierDue)}
            </Text>
            <Text style={styles.dashLabel}>মোট দেবো</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* --- TAB CONTENT CONTAINER --- */}
      <View style={{ flex: 1 }}>

        {/* ===================================================================
            TAB 1: HOME / KHATA (কাস্টমার ও সাপ্লায়ার তালিকা)
           =================================================================== */}
        {activeTab === 'home' && (
          <View style={{ flex: 1 }}>
            {/* Customer vs Supplier Tabs */}
            <View style={styles.homeTabSelectorRow}>
              <TouchableOpacity
                style={[styles.homeTabBtn, accountTab === 'customer' && styles.homeTabBtnActive]}
                onPress={() => setAccountTab('customer')}
              >
                <Text style={[styles.homeTabBtnText, accountTab === 'customer' && styles.homeTabBtnTextActive]}>
                  কাস্টমার ({accounts.filter((a) => a.type === 1).length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.homeTabBtn, accountTab === 'supplier' && styles.homeTabBtnActive]}
                onPress={() => setAccountTab('supplier')}
              >
                <Text style={[styles.homeTabBtnText, accountTab === 'supplier' && styles.homeTabBtnTextActive]}>
                  সাপ্লায়ার ({accounts.filter((a) => a.type === 2).length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.homeTabBtn, accountTab === 'all' && styles.homeTabBtnActive]}
                onPress={() => setAccountTab('all')}
              >
                <Text style={[styles.homeTabBtnText, accountTab === 'all' && styles.homeTabBtnTextActive]}>
                  সকল ({accounts.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Search & Filter Bar (fragment_home.xml layoutSearch) */}
            <View style={styles.searchBarRow}>
              <Image
                source={require('./assets/icons/ic_search.png')}
                style={{ width: 18, height: 18, marginRight: 8 }}
                resizeMode="contain"
              />
              <TextInput
                style={styles.searchTextInput}
                placeholder="নাম বা মোবাইল নম্বর দিয়ে খুঁজুন..."
                placeholderTextColor={COLORS.textSubtle}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 6 }}>
                  <Image
                    source={require('./assets/icons/ic_close.png')}
                    style={{ width: 14, height: 14, tintColor: COLORS.textMuted }}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={styles.searchFilterBtn}
                onPress={() => {
                  const nextF = accountFilter === 'all' ? 'due' : accountFilter === 'due' ? 'highest' : 'all';
                  setAccountFilter(nextF);
                }}
              >
                <Image
                  source={require('./assets/icons/ic_filter.png')}
                  style={{ width: 20, height: 20, tintColor: accountFilter !== 'all' ? COLORS.primary : '#4D4D4D' }}
                  resizeMode="contain"
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.searchDownloadBtn}
                onPress={() => setModalFullReport(true)}
              >
                <Image
                  source={require('./assets/icons/ic_download.png')}
                  style={{ width: 20, height: 20, tintColor: '#4D4D4D' }}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

            {/* Filter Pills */}
            <View style={styles.filterPillRow}>
              {[
                { id: 'all', label: 'সব' },
                { id: 'due', label: 'বাকি আছে' },
                { id: 'highest', label: 'সর্বোচ্চ বাকি' },
              ].map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.filterPill, accountFilter === f.id && styles.filterPillActive]}
                  onPress={() => setAccountFilter(f.id)}
                >
                  <Text style={[styles.filterPillText, accountFilter === f.id && styles.filterPillTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* List Helper Header (fragment_home.xml lay_list_helper) */}
            <View style={styles.listHelperHeader}>
              <Text style={styles.listHelperTitle}>
                {accountTab === 'supplier' ? 'সাপ্লায়ারের তালিকা' : accountTab === 'all' ? 'সকল খাতার তালিকা' : 'কাস্টমার/সাপ্লায়ারের তালিকা'}
              </Text>
              <Text style={[styles.listHelperType, { color: accountTab === 'supplier' ? '#1C7D50' : '#B81414' }]}>
                {accountTab === 'supplier' ? 'দেবো' : 'পাবো'}
              </Text>
            </View>

            {/* Accounts FlatList */}
            <FlatList
              data={filteredAccounts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 95, paddingHorizontal: 12 }}
              renderItem={({ item }) => {
                const isCust = item.type === 1;
                const hasDue = Number(item.balance) > 0;
                return (
                  <TouchableOpacity
                    style={styles.accountCardItem}
                    onPress={() => {
                      setSelectedAccount(item);
                      setCurrentScreen('account_ledger');
                    }}
                  >
                    <View style={[styles.accAvatarCircle, { backgroundColor: isCust ? COLORS.redLight : COLORS.greenLight }]}>
                      <Text style={[styles.accAvatarLetter, { color: isCust ? COLORS.primary : COLORS.green }]}>
                        {(item.name || 'খ')[0]}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.accCardName}>{item.name}</Text>
                      <Text style={styles.accCardPhone}>
                        {item.phone || 'মোবাইল নেই'}
                      </Text>
                      {item.address ? (
                        <Text style={styles.accCardAddress} numberOfLines={1}>{item.address}</Text>
                      ) : null}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.accTypeBadge, { color: isCust ? COLORS.primary : COLORS.green }]}>
                        {isCust ? (hasDue ? 'পাবো (বাকি)' : 'হিসাব সমান') : (hasDue ? 'দেবো (পাওনা)' : 'হিসাব সমান')}
                      </Text>
                      <Text style={[styles.accBalanceValue, { color: isCust ? COLORS.primary : COLORS.green }]}>
                        ৳ {formatMoney(item.balance)}
                      </Text>
                    </View>
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

            {/* Floating Action Button: New Account (ll_add_customer) */}
            <TouchableOpacity
              style={styles.floatingAddBtn}
              onPress={() => {
                setAccType(accountTab === 'supplier' ? 2 : 1);
                setModalAddAccount(true);
              }}
              activeOpacity={0.85}
            >
              <Image
                source={require('./assets/icons/ic_add_user.png')}
                style={{ width: 18, height: 18, marginRight: 8, tintColor: '#FFFFFF' }}
                resizeMode="contain"
              />
              <Text style={styles.floatingAddBtnText}>
                নতুন কাস্টমার/সাপ্লায়ার
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ===================================================================
            TAB 2: CASHBOX (ক্যাশবক্স - layout_cashbook_dashboard_total.xml)
           =================================================================== */}
        {activeTab === 'cashbox' && (
          <ScrollView contentContainerStyle={{ paddingBottom: 95 }}>
            {/* Cash Dashboard Card (layout_cashbook_dashboard_total.xml) */}
            <View style={styles.cashTopCard}>
              {/* Upper Box: আজকের বেচা & বর্তমান ক্যাশ */}
              <View style={styles.cashTopDashboardUpper}>
                <View style={styles.cashTopCol}>
                  <Text style={styles.cashTopAmount}>
                    ৳ {hideCashAmounts ? '***' : formatMoney(todaySales || todayCashIn)}
                  </Text>
                  <Text style={styles.cashTopLabel}>আজকের বেচা</Text>
                </View>

                <View style={styles.cashTopDivider} />

                <View style={styles.cashTopCol}>
                  <Text style={[styles.cashTopAmount, { color: '#09101D' }]}>
                    ৳ {hideCashAmounts ? '***' : formatMoney(totalCash)}
                  </Text>
                  <Text style={styles.cashTopLabel}>বর্তমান ক্যাশ</Text>
                </View>
              </View>

              {/* Lower Strip: আজ পেলাম & আজ দিলাম (aj_pelam_bg) */}
              <View style={styles.cashTopDashboardLower}>
                <View style={styles.cashSubCol}>
                  <Text style={styles.cashSubLabel}>আজ পেলাম</Text>
                  <Text style={[styles.cashSubAmount, { color: '#0F8A0F' }]}>
                    + ৳ {hideCashAmounts ? '***' : formatMoney(todayCashIn)}
                  </Text>
                </View>

                <View style={styles.cashSubDivider} />

                <View style={styles.cashSubCol}>
                  <Text style={styles.cashSubLabel}>আজ দিলাম</Text>
                  <Text style={[styles.cashSubAmount, { color: '#C4161C' }]}>
                    - ৳ {hideCashAmounts ? '***' : formatMoney(todayCashOut)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Action Bar (container_report: রিপোর্ট, ক্যাশবক্স মিলাই, ভিউ আইকন) */}
            <View style={styles.cashActionBarRow}>
              <TouchableOpacity
                style={styles.cashActionBarBtn}
                onPress={() => setModalFullReport(true)}
              >
                <Image
                  source={require('./assets/icons/ic_menu_report.png')}
                  style={{ width: 18, height: 18, marginRight: 6 }}
                  resizeMode="contain"
                />
                <Text style={styles.cashActionBarBtnText}>রিপোর্ট</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cashActionBarBtn, styles.cashAdjustBtnActive]}
                onPress={() => {
                  setCountedCash('');
                  setModalReconcileCash(true);
                }}
              >
                <Image
                  source={require('./assets/icons/ic_check.png')}
                  style={{ width: 18, height: 18, marginRight: 6, tintColor: '#B81414' }}
                  resizeMode="contain"
                />
                <Text style={[styles.cashActionBarBtnText, { color: '#B81414', fontWeight: 'bold' }]}>
                  ক্যাশবক্স মিলাই
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cashEyeToggleBtn}
                onPress={() => setHideCashAmounts((prev) => !prev)}
              >
                <Image
                  source={hideCashAmounts ? require('./assets/icons/ic_eye_closed.png') : require('./assets/icons/ic_eye_open.png')}
                  style={{ width: 20, height: 20, tintColor: '#4D4D4D' }}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

            {/* Baki Aday & Supplier Payment Strip (layout_baki_aday) */}
            <View style={styles.cashBakiAdayStrip}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.cashBakiAdayLabel}>বাকি আদায়</Text>
                <Text style={[styles.cashBakiAdayVal, { color: '#34C759' }]}>
                  ৳ {hideCashAmounts ? '***' : formatMoney(todayBakiAday || (todayCashIn > todaySales ? todayCashIn - todaySales : 0))}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.cashBakiAdayLabel}>পেমেন্ট দেয়া</Text>
                <Text style={[styles.cashBakiAdayVal, { color: '#B81414' }]}>
                  ৳ {hideCashAmounts ? '***' : formatMoney(todaySupplierPay || (todayCashOut > todayCosts ? todayCashOut - todayCosts : 0))}
                </Text>
              </View>
            </View>

            {/* Cash Entry Big Buttons (+ ক্যাশ বেচা, - দোকান খরচ) */}
            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 12, marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.cashActionBigBtn, { backgroundColor: '#0F8A0F' }]}
                onPress={() => {
                  setCashCategory('sale');
                  setModalAddCash(true);
                }}
              >
                <Text style={styles.cashActionBigBtnText}>+ ক্যাশ বেচা</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cashActionBigBtn, { backgroundColor: '#B81414' }]}
                onPress={() => {
                  setCashCategory('cost');
                  setModalAddCash(true);
                }}
              >
                <Text style={styles.cashActionBigBtnText}>- দোকান খরচ</Text>
              </TouchableOpacity>
            </View>

            {/* Cash Categories Breakdown List (layout_cashbook_accounts.xml) */}
            <View style={styles.cashAccountsSection}>
              <Text style={styles.sectionHeading}>ক্যাশবক্সের হিসাব সমূহ</Text>

              {[
                { cat: 'sale', label: 'ক্যাশ বেচা', icon: require('./assets/icons/ic_cash_sale.png'), isIn: true, color: '#0F8A0F' },
                { cat: 'buy', label: 'ক্যাশ কেনা', icon: require('./assets/icons/ic_cash_buy.png'), isIn: false, color: '#B81414' },
                { cat: 'cost', label: 'খরচ', icon: require('./assets/icons/ic_cash_cost.png'), isIn: false, color: '#B81414' },
                { cat: 'malik_in', label: 'মালিক দিল', icon: require('./assets/icons/ic_malik_in.png'), isIn: true, color: '#0F8A0F' },
                { cat: 'malik_out', label: 'মালিক নিল', icon: require('./assets/icons/ic_malik_out.png'), isIn: false, color: '#B81414' },
              ].map((item) => {
                const catEntries = (cashEntries || []).filter((c) => c.category === item.cat);
                const sum = catEntries.reduce((acc, cur) => acc + (Number(cur.amount) || 0), 0);
                return (
                  <TouchableOpacity
                    key={item.cat}
                    style={styles.cashAccountRow}
                    onPress={() => {
                      setCashFilter(item.cat);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Image source={item.icon} style={{ width: 22, height: 22, marginRight: 10 }} resizeMode="contain" />
                      <Text style={styles.cashAccountRowLabel}>{item.label}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.cashAccountRowVal, { color: item.color }]}>
                        {hideCashAmounts ? '***' : `${item.isIn ? '+' : '-'} ৳ ${formatMoney(sum)}`}
                      </Text>
                      <Text style={styles.cashAccountChevron}>›</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Category Filter Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 12, marginTop: 14 }}>
              {[
                { key: 'all', label: 'সকল এন্ট্রি' },
                { key: 'sale', label: 'বেচা' },
                { key: 'buy', label: 'কেনা' },
                { key: 'cost', label: 'খরচ' },
                { key: 'malik_in', label: 'মালিক দিল' },
                { key: 'malik_out', label: 'মালিক নিল' },
              ].map((c) => (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.filterPill, cashFilter === c.key && styles.filterPillActive]}
                  onPress={() => setCashFilter(c.key)}
                >
                  <Text style={[styles.filterPillText, cashFilter === c.key && styles.filterPillTextActive]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Cash Transactions List */}
            <View style={{ paddingHorizontal: 12, marginTop: 10 }}>
              {filteredCashEntries.map((item) => {
                const isIn = item.type === 'in';
                return (
                  <View key={item.id} style={styles.cashItemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cashItemDesc}>{item.desc || (item.category === 'sale' ? 'ক্যাশ বেচা' : 'দোকান খরচ')}</Text>
                      <Text style={styles.cashItemDate}>
                        {formatDisplayDate(item.date)} {item.time ? '• ' + item.time : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.cashItemAmount, { color: isIn ? '#0F8A0F' : '#B81414' }]}>
                        {hideCashAmounts ? '***' : `${isIn ? '+' : '-'} ৳ ${formatMoney(item.amount)}`}
                      </Text>
                      <TouchableOpacity onPress={() => handleDeleteCashEntry(item.id)}>
                        <Text style={styles.cashDeleteText}>মুছুন</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* ===================================================================
            TAB 3: TAGADA (তাগাদা বার্তা কালেকশন)
           =================================================================== */}
        {activeTab === 'tagada' && (
          <ScrollView contentContainerStyle={{ paddingBottom: 95 }}>
            <View style={styles.tagadaHeaderCard}>
              <Text style={styles.tagadaHeaderTitle}>বকেয়া তাগাদা কালেকশন</Text>
              <Text style={styles.tagadaHeaderSub}>
                যেসব কাস্টমারের কাছে বাকি রয়েছে তাদের সরাসরি SMS বা WhatsApp-এ স্বয়ংক্রিয় তাগাদা পাঠান।
              </Text>
              <Text style={styles.tagadaHeaderCount}>
                বকেয়া কাস্টমার: {dueCustomers.length} জন (মোট বাকি ৳ {formatMoney(totalCustomerDue)})
              </Text>
            </View>

            <View style={{ paddingHorizontal: 12, marginTop: 12 }}>
              {dueCustomers.map((item) => (
                <View key={item.id} style={styles.tagadaCardItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tagadaCustName}>{item.name}</Text>
                    <Text style={styles.tagadaCustPhone}>{item.phone || 'মোবাইল নেই'}</Text>
                    <Text style={styles.tagadaCustDue}>বকেয়া: ৳ {formatMoney(item.balance)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <TouchableOpacity
                      style={[styles.tagadaActionBtn, { backgroundColor: COLORS.blue }]}
                      onPress={() => handleSendTagadaSMS(item)}
                    >
                      <Text style={styles.tagadaActionBtnText}>SMS</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.tagadaActionBtn, { backgroundColor: COLORS.green }]}
                      onPress={() => handleSendTagadaWhatsApp(item)}
                    >
                      <Text style={styles.tagadaActionBtnText}>WhatsApp</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {dueCustomers.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Image source={require('./assets/ic_done.webp')} style={{ width: 64, height: 64, marginBottom: 8 }} resizeMode="contain" />
                  <Text style={styles.emptyText}>কোনো কাস্টমারের কাছে বাকি নেই!</Text>
                  <Text style={styles.emptySubText}>সব কাস্টমারের বকেয়া পরিশোধ রয়েছে।</Text>
                </View>
              )}
            </View>
          </ScrollView>
        )}

        {/* ===================================================================
            TAB 4: TALLYPAY (টালিপে ডিজিটাল ওয়ালেট ও বাংলা কিউআর)
           =================================================================== */}
        {activeTab === 'tallypay' && (
          <ScrollView contentContainerStyle={{ paddingBottom: 95 }}>
            {/* Wallet Balance Card */}
            <View style={styles.walletCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Image
                      source={require('./assets/ic_tally_pay_bn_png.png')}
                      style={{ width: 85, height: 26, tintColor: '#FFFFFF' }}
                      resizeMode="contain"
                    />
                    <Text style={[styles.walletCardSub, { marginTop: 0 }]}>মার্চেন্ট ওয়ালেট</Text>
                  </View>
                  <Text style={styles.walletBalanceDisplay}>৳ {formatMoney(walletBalance)}</Text>
                  <Text style={styles.walletMerchantId}>মার্চেন্ট আইডি: TP-{ownerPhone}</Text>
                </View>
                <TouchableOpacity
                  style={styles.qrCodeBtn}
                  onPress={() => setModalBanglaQR(true)}
                >
                  <Image
                    source={require('./assets/ic_bangla_qr.png')}
                    style={{ width: 32, height: 32, marginBottom: 4 }}
                    resizeMode="contain"
                  />
                  <Text style={styles.qrCodeBtnText}>বাংলা QR</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Service Actions */}
            <View style={styles.walletActionRow}>
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
                onPress={() => {
                  Alert.alert(
                    'মানি আউট',
                    `আপনার টালিপে ওয়ালেটের ৳ ${formatMoney(walletBalance)} টাকা ব্যাংক বা পার্সোনাল বিকাশ/নগদে স্থানান্তর করতে চান?`,
                    [
                      { text: 'বাতিল', style: 'cancel' },
                      {
                        text: 'উত্তোলন করুন',
                        onPress: () => {
                          if (walletBalance <= 0) {
                            Alert.alert('ব্যর্থ', 'উত্তোলন করার মতো ব্যালেন্স নেই।');
                            return;
                          }
                          const newTxn = {
                            id: 'w_' + Date.now(),
                            title: 'মানি আউট (ব্যাংক একাউন্ট)',
                            amount: walletBalance,
                            type: 'out',
                            date: getTodayDate(),
                            time: getTimeString(),
                          };
                          setWalletBalance(0);
                          setWalletTxns([newTxn, ...walletTxns]);
                          persistData({ walletBalance: 0, walletTxns: [newTxn, ...walletTxns] });
                          Alert.alert('সফল', 'মানি আউট সফল হয়েছে।');
                        },
                      },
                    ]
                  );
                }}
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
            </View>

            {/* Wallet Transaction History */}
            <View style={{ paddingHorizontal: 12, marginTop: 16 }}>
              <Text style={styles.sectionHeading}>সাম্প্রতিক ওয়ালেট লেনদেন</Text>
              {walletTxns.map((w) => (
                <View key={w.id} style={styles.cashItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cashItemDesc}>{w.title}</Text>
                    <Text style={styles.cashItemDate}>{formatDisplayDate(w.date)} • {w.time}</Text>
                  </View>
                  <Text style={[styles.cashItemAmount, { color: w.type === 'in' ? COLORS.green : COLORS.red }]}>
                    {w.type === 'in' ? '+' : '-'} ৳ {formatMoney(w.amount)}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        {/* ===================================================================
            TAB 5: MENU / MORE (মেনু / ড্রয়ার - activity_main_drawer.xml)
           =================================================================== */}
        {activeTab === 'menu' && (
          <ScrollView contentContainerStyle={{ paddingBottom: 95 }}>
            {/* Merchant Shop Profile Header (nav_header_main.xml) */}
            <View style={styles.menuProfileHeader}>
              <View style={styles.menuStoreAvatar}>
                <Image
                  source={require('./assets/ic_tally_khata_logo_reg.png')}
                  style={{ width: 44, height: 44 }}
                  resizeMode="contain"
                />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.menuBizName}>{businessName}</Text>
                <Text style={styles.menuOwnerInfo}>{ownerName} • {ownerPhone}</Text>
                <Text style={styles.menuBizAddress} numberOfLines={1}>{businessAddress}</Text>
              </View>
              <TouchableOpacity
                style={styles.menuEditBizBtn}
                onPress={() => setModalSettings(true)}
              >
                <Text style={styles.menuEditBizBtnText}>এডিট</Text>
              </TouchableOpacity>
            </View>

            {/* Group 1: টালিপে ওয়ালেট (nav_group_tp_wallet) */}
            <View style={styles.menuGroupHeader}>
              <Text style={styles.menuGroupTitle}>টালিপে ওয়ালেট</Text>
            </View>
            <View style={styles.menuListContainer}>
              <TouchableOpacity
                style={styles.menuListItem}
                onPress={() => setModalAddMoney(true)}
              >
                <Image source={require('./assets/nav/nav_tallypay.png')} style={{ width: 22, height: 22, tintColor: COLORS.blue }} resizeMode="contain" />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.menuListTitle}>একাউন্ট সমূহ</Text>
                  <Text style={styles.menuListSub}>ব্যালেন্স ৳ {formatMoney(walletBalance)} • সংযুক্ত ব্যাংক ও MFS</Text>
                </View>
                <Text style={styles.menuListArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuListItem}
                onPress={() => setActiveTab('tallypay')}
              >
                <Image source={require('./assets/icons/ic_cash_sale.png')} style={{ width: 22, height: 22, tintColor: COLORS.green }} resizeMode="contain" />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.menuListTitle}>লেনদেন বিবরণী</Text>
                  <Text style={styles.menuListSub}>মোট {walletTxns.length} টি ওয়ালেট লেনদেন</Text>
                </View>
                <Text style={styles.menuListArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuListItem}
                onPress={() => Alert.alert('লেনদেনের লিমিট', 'দৈনিক ক্যাশ-ইন লিমিট: ৳ ৫০,০০০ | দৈনিক ক্যাশ-আউট: ৳ ২৫,০০০ | মাসিক লিমিট: ৳ ৫,০০,০০০')}
              >
                <Image source={require('./assets/icons/ic_lock.png')} style={{ width: 22, height: 22, tintColor: '#F59E0B' }} resizeMode="contain" />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.menuListTitle}>লেনদেনের লিমিট ও চার্জ</Text>
                  <Text style={styles.menuListSub}>১০০% ফ্রি লেনদেন • কোনো চার্জ নেই</Text>
                </View>
                <Text style={styles.menuListArrow}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Group 2: টালিখাতা হিসাব ও রিপোর্ট (nav_tallykhata) */}
            <View style={styles.menuGroupHeader}>
              <Text style={styles.menuGroupTitle}>টালিখাতা হিসাব ও রিপোর্ট</Text>
            </View>
            <View style={styles.menuListContainer}>
              <TouchableOpacity
                style={styles.menuListItem}
                onPress={() => setModalProfitLoss(true)}
              >
                <Image source={require('./assets/icons/ic_menu_profit.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.menuListTitle}>বেচা কেনা হিসাব</Text>
                  <Text style={styles.menuListSub}>দৈনিক বেচা-কেনা ও লাভের হিসাব</Text>
                </View>
                <Text style={styles.menuListArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuListItem}
                onPress={() => {
                  setCashFilter('cost');
                  setActiveTab('cashbox');
                }}
              >
                <Image source={require('./assets/icons/ic_cash_cost.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.menuListTitle}>খরচ রিপোর্ট</Text>
                  <Text style={styles.menuListSub}>দোকানের সকল যাবতীয় খরচের তালিকা</Text>
                </View>
                <Text style={styles.menuListArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuListItem}
                onPress={() => {
                  setAccountTab('customer');
                  setActiveTab('home');
                }}
              >
                <Image source={require('./assets/icons/ic_share.png')} style={{ width: 22, height: 22, tintColor: '#B81414' }} resizeMode="contain" />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.menuListTitle}>বাকি হিসাব ও তাগাদা</Text>
                  <Text style={styles.menuListSub}>মোট বাকি ৳ {formatMoney(totalCustomerDue)}</Text>
                </View>
                <Text style={styles.menuListArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuListItem}
                onPress={() => setModalFullReport(true)}
              >
                <Image source={require('./assets/icons/ic_menu_report.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.menuListTitle}>সার্বিক হিসাব রিপোর্ট</Text>
                  <Text style={styles.menuListSub}>দৈনিক, মাসিক ও বার্ষিক স্টেটমেন্ট তৈরি ও শেয়ার</Text>
                </View>
                <Text style={styles.menuListArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuListItem}
                onPress={() => setModalAddStock(true)}
              >
                <Image source={require('./assets/icons/ic_menu_stock.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.menuListTitle}>স্টক ও পণ্য হিসাব</Text>
                  <Text style={styles.menuListSub}>মোট {inventory.length} টি পণ্য • স্টক মূল্য ৳ {formatMoney(totalStockCost)}</Text>
                </View>
                <Text style={styles.menuListArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuListItem}
                onPress={() => setModalNotes(true)}
              >
                <Image source={require('./assets/icons/ic_menu_note.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.menuListTitle}>ব্যবসার নোট ও মেমো</Text>
                  <Text style={styles.menuListSub}>প্রয়োজনীয় কাজ ও জরুরি মেমো</Text>
                </View>
                <Text style={styles.menuListArrow}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Group 3: সেটিংস ও অন্যান্য (nav_group_others) */}
            <View style={styles.menuGroupHeader}>
              <Text style={styles.menuGroupTitle}>সেটিংস ও অন্যান্য</Text>
            </View>
            <View style={styles.menuListContainer}>
              <TouchableOpacity
                style={styles.menuListItem}
                onPress={() => setModalSettings(true)}
              >
                <Image source={require('./assets/icons/ic_menu_settings.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.menuListTitle}>দোকান ও ব্যবসা সেটিংস</Text>
                  <Text style={styles.menuListSub}>দোকানের নাম, ফোন, ঠিকানা ও প্রারম্ভিক ক্যাশ</Text>
                </View>
                <Text style={styles.menuListArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuListItem}
                onPress={() => setModalPinSetup(true)}
              >
                <Image source={require('./assets/icons/ic_menu_lock.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.menuListTitle}>পিন লক ও নিরাপত্তা</Text>
                  <Text style={styles.menuListSub}>{pinEnabled ? 'PIN লক সক্রিয় রয়েছে' : '৪ ডিজিটের গোপন PIN সেট করুন'}</Text>
                </View>
                <Text style={styles.menuListArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuListItem}
                onPress={() => {
                  setBackupJsonText('');
                  setModalBackupRestore(true);
                }}
              >
                <Image source={require('./assets/icons/ic_menu_backup.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.menuListTitle}>ডাটা ব্যাকআপ ও রিস্টোর</Text>
                  <Text style={styles.menuListSub}>১০০% অফলাইন ডাটা সেভ ও নতুন ফোনে ট্রান্সফার</Text>
                </View>
                <Text style={styles.menuListArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuListItem}
                onPress={() => {
                  Share.share({
                    message: 'টালিখাতা অ্যাপ দিয়ে আপনার দোকানের সব হিসাব সহজে ও নিরাপদে রাখুন। সম্পূর্ণ ফ্রি ও অফলাইন: https://tallykhata.com',
                  });
                }}
              >
                <Image source={require('./assets/icons/ic_share.png')} style={{ width: 22, height: 22, tintColor: COLORS.primary }} resizeMode="contain" />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.menuListTitle}>রেফার করুন</Text>
                  <Text style={styles.menuListSub}>অন্যান্য ব্যবসায়ীদের টালিখাতা শেয়ার করুন</Text>
                </View>
                <Text style={styles.menuListArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuListItem}
                onPress={() => setModalSupport(true)}
              >
                <Image source={require('./assets/icons/ic_menu_support.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.menuListTitle}>ব্যবহার নির্দেশিকা ও হেল্প</Text>
                  <Text style={styles.menuListSub}>সচরাচর জিজ্ঞাসিত প্রশ্ন ও হেল্পলাইন</Text>
                </View>
                <Text style={styles.menuListArrow}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Offline Guarantee Notice */}
            <View style={styles.offlineNoticeCard}>
              <Text style={styles.offlineNoticeTitle}>১০০% অফলাইন ও নিরাপদ</Text>
              <Text style={styles.offlineNoticeSub}>
                আপনার ব্যবসার তথ্য আপনার ফোনেই সুরক্ষিত। কোনো ইন্টারনেট কানেকশন বা সাবস্ক্রিপশন ছাড়াই আজীবন ব্যবহার করতে পারবেন।
              </Text>
            </View>
          </ScrollView>
        )}

      </View>

      {/* --- AUTHENTIC 5-TAB BOTTOM NAVIGATION BAR --- */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'home' && styles.tabButtonActive]}
          onPress={() => setActiveTab('home')}
        >
          <Image
            source={activeTab === 'home' ? require('./assets/nav/nav_home_active.png') : require('./assets/nav/nav_home.png')}
            style={styles.tabIconImg}
            resizeMode="contain"
          />
          <Text style={[styles.tabButtonLabel, activeTab === 'home' && styles.tabButtonLabelActive]}>
            খাতা
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'cashbox' && styles.tabButtonActive]}
          onPress={() => setActiveTab('cashbox')}
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
          style={[styles.tabButton, activeTab === 'tagada' && styles.tabButtonActive]}
          onPress={() => setActiveTab('tagada')}
        >
          <Image
            source={activeTab === 'tagada' ? require('./assets/nav/nav_tagada_active.png') : require('./assets/nav/nav_tagada.png')}
            style={styles.tabIconImg}
            resizeMode="contain"
          />
          <Text style={[styles.tabButtonLabel, activeTab === 'tagada' && styles.tabButtonLabelActive]}>
            তাগাদা
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'tallypay' && styles.tabButtonActive]}
          onPress={() => setActiveTab('tallypay')}
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
          style={[styles.tabButton, activeTab === 'menu' && styles.tabButtonActive]}
          onPress={() => setActiveTab('menu')}
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
      </View>
