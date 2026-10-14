  // =========================================================================
  // VIEW: PIN SECURITY LOCK SCREEN
  // =========================================================================
  if (pinEnabled && isLocked) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: COLORS.primary }]}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />
        <View style={styles.pinLockContainer}>
          <Text style={styles.pinLockIcon}>🔒</Text>
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
                <Text style={{ fontSize: 16 }}>📞</Text>
              </TouchableOpacity>
            ) : null}
            {isCustomer ? (
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => setModalTagada(true)}
              >
                <Text style={{ fontSize: 16 }}>📢</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.headerIconBtn} onPress={handleOpenEditAccount}>
              <Text style={{ fontSize: 16 }}>✏️</Text>
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
              {selectedAccount.phone ? '📱 ' + selectedAccount.phone : 'মোবাইল নম্বর নেই'}
            </Text>
            {selectedAccount.address ? (
              <Text style={styles.profileAddress}>📍 {selectedAccount.address}</Text>
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
              <Text style={styles.quickActionEmoji}>📢</Text>
              <Text style={styles.quickActionLabel}>তাগাদা পাঠান</Text>
            </TouchableOpacity>
          ) : null}
          {selectedAccount.phone ? (
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => handleMakeCall(selectedAccount.phone)}
            >
              <Text style={styles.quickActionEmoji}>📞</Text>
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
            <Text style={styles.quickActionEmoji}>📄</Text>
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
              <Text style={styles.emptyIcon}>📒</Text>
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

      {/* --- AUTHENTIC TALLYKHATA TOP HEADER BAR --- */}
      <View style={styles.topHeaderBar}>
        <TouchableOpacity
          style={styles.headerLeftBiz}
          onPress={() => setModalSettings(true)}
        >
          <View style={styles.headerStoreIcon}>
            <Image
              source={require('./assets/ic_tally_khata_logo_reg.png')}
              style={{ width: 24, height: 24 }}
              resizeMode="contain"
            />
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.headerBizName} numberOfLines={1}>{businessName}</Text>
              {isGold ? (
                <View style={styles.headerGoldBadge}>
                  <Image
                    source={require('./assets/ic_premium_users.png')}
                    style={{ width: 14, height: 14, marginRight: 3 }}
                    resizeMode="contain"
                  />
                  <Text style={styles.headerGoldBadgeText}>গোল্ড</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.headerBizPhone}>{ownerPhone}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.headerVerifyBtn}
            onPress={() => Alert.alert('ভেরিফাইড মার্চেন্ট', 'আপনার টালিখাতা অ্যাকাউন্ট ১০০% ভেরিফাইড ও সুরক্ষিত।')}
          >
            <Text style={styles.headerVerifyText}>✓ ভেরিফাই</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerIconTouch}
            onPress={() => setModalInbox(true)}
          >
            <Text style={styles.headerActionIcon}>🔔</Text>
            <View style={styles.headerRedDot} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerIconTouch}
            onPress={() => setModalSupport(true)}
          >
            <Text style={styles.headerActionIcon}>🎧</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* --- DASHBOARD SUMMARY CARDS (পাবো ও দিবো) --- */}
      <View style={styles.dashboardRow}>
        <View style={[styles.dashboardCard, { borderBottomColor: COLORS.primary }]}>
          <Text style={styles.dashLabel}>মোট পাবো (বাকি)</Text>
          <Text style={[styles.dashAmount, { color: COLORS.primary }]}>
            ৳ {formatMoney(totalCustomerDue)}
          </Text>
        </View>
        <View style={[styles.dashboardCard, { borderBottomColor: COLORS.green }]}>
          <Text style={styles.dashLabel}>মোট দেবো (দেনা)</Text>
          <Text style={[styles.dashAmount, { color: COLORS.green }]}>
            ৳ {formatMoney(totalSupplierDue)}
          </Text>
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

            {/* Search & Filter Bar */}
            <View style={styles.searchBarRow}>
              <TextInput
                style={styles.searchTextInput}
                placeholder="🔍 নাম বা মোবাইল নম্বর দিয়ে খুঁজুন..."
                placeholderTextColor={COLORS.textSubtle}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 6 }}>
                  <Text style={{ fontSize: 16, color: COLORS.textMuted }}>✕</Text>
                </TouchableOpacity>
              ) : null}
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
                        {item.phone ? '📱 ' + item.phone : 'মোবাইল নেই'}
                      </Text>
                      {item.address ? (
                        <Text style={styles.accCardAddress} numberOfLines={1}>📍 {item.address}</Text>
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

            {/* Floating Action Button: New Account */}
            <TouchableOpacity
              style={styles.floatingAddBtn}
              onPress={() => {
                setAccType(accountTab === 'supplier' ? 2 : 1);
                setModalAddAccount(true);
              }}
            >
              <Text style={styles.floatingAddBtnText}>
                {accountTab === 'supplier' ? '+ নতুন সাপ্লায়ার' : '+ নতুন কাস্টমার'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ===================================================================
            TAB 2: CASHBOX (ক্যাশবক্স)
           =================================================================== */}
        {activeTab === 'cashbox' && (
          <ScrollView contentContainerStyle={{ paddingBottom: 95 }}>
            {/* Cash Dashboard Card */}
            <View style={styles.cashTopCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={styles.cashTopCardSub}>ক্যাশ বাক্সে বর্তমান নগদ টাকা</Text>
                  <Text style={styles.cashTotalDisplay}>৳ {formatMoney(totalCash)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.reconcileBtn}
                  onPress={() => {
                    setCountedCash('');
                    setModalReconcileCash(true);
                  }}
                >
                  <Text style={styles.reconcileBtnText}>⚖️ ক্যাশ মিলাই</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.cashTodayStatsRow}>
                <View style={styles.cashTodayStatItem}>
                  <Text style={styles.cashTodayStatLabel}>আজকের ক্যাশ ইন (+)</Text>
                  <Text style={[styles.cashTodayStatVal, { color: COLORS.green }]}>
                    + ৳ {formatMoney(todayCashIn)}
                  </Text>
                </View>
                <View style={[styles.cashTodayStatItem, { borderLeftWidth: 1, borderColor: COLORS.border }]}>
                  <Text style={styles.cashTodayStatLabel}>আজকের ক্যাশ আউট (-)</Text>
                  <Text style={[styles.cashTodayStatVal, { color: COLORS.red }]}>
                    - ৳ {formatMoney(todayCashOut)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 12, marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.cashActionBigBtn, { backgroundColor: COLORS.green }]}
                onPress={() => {
                  setCashCategory('sale');
                  setModalAddCash(true);
                }}
              >
                <Text style={styles.cashActionBigBtnText}>+ ক্যাশ বেচা</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cashActionBigBtn, { backgroundColor: COLORS.primary }]}
                onPress={() => {
                  setCashCategory('cost');
                  setModalAddCash(true);
                }}
              >
                <Text style={styles.cashActionBigBtnText}>- দোকান খরচ</Text>
              </TouchableOpacity>
            </View>

            {/* Cash Categories Breakdown List (Matching Authentic Layout) */}
            <View style={styles.cashAccountsSection}>
              <Text style={styles.sectionHeading}>ক্যাশবক্সের হিসাব সমূহ</Text>

              {[
                { cat: 'sale', label: '🛒 ক্যাশ বেচা', isIn: true, color: COLORS.green },
                { cat: 'buy', label: '📦 ক্যাশ কেনা', isIn: false, color: COLORS.red },
                { cat: 'cost', label: '🧾 দোকানের খরচ', isIn: false, color: COLORS.red },
                { cat: 'malik_in', label: '📥 মালিক দিল (ক্যাশ জমা)', isIn: true, color: COLORS.green },
                { cat: 'malik_out', label: '📤 মালিক নিল (ক্যাশ উত্তোলন)', isIn: false, color: COLORS.red },
                { cat: 'baki_aday', label: '💰 বাকি আদায়', isIn: true, color: COLORS.green },
                { cat: 'supplier_pay', label: '🤝 পাওনাদার পরিশোধ', isIn: false, color: COLORS.red },
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
                    <Text style={styles.cashAccountRowLabel}>{item.label}</Text>
                    <Text style={[styles.cashAccountRowVal, { color: item.color }]}>
                      {item.isIn ? '+' : '-'} ৳ {formatMoney(sum)}
                    </Text>
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
                      <Text style={styles.cashItemDesc}>{item.desc}</Text>
                      <Text style={styles.cashItemDate}>
                        {formatDisplayDate(item.date)} {item.time ? '• ' + item.time : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.cashItemAmount, { color: isIn ? COLORS.green : COLORS.red }]}>
                        {isIn ? '+' : '-'} ৳ {formatMoney(item.amount)}
                      </Text>
                      <TouchableOpacity onPress={() => handleDeleteCashEntry(item.id)}>
                        <Text style={{ fontSize: 11, color: COLORS.textSubtle, marginTop: 2 }}>মুছুন</Text>
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
              <Text style={styles.tagadaHeaderTitle}>📢 বকেয়া তাগাদা কালেকশন</Text>
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
                    <Text style={styles.tagadaCustPhone}>📱 {item.phone || 'মোবাইল নেই'}</Text>
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
                  <Text style={styles.emptyIcon}>🎉</Text>
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
                  <Text style={{ fontSize: 22 }}>💳</Text>
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
                  <Text style={{ fontSize: 22 }}>🏦</Text>
                </View>
                <Text style={styles.walletServiceLabel}>মানি আউট</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.walletServiceBtn}
                onPress={() => setModalMobileRecharge(true)}
              >
                <View style={[styles.walletServiceIconBg, { backgroundColor: COLORS.redLight }]}>
                  <Text style={{ fontSize: 22 }}>📱</Text>
                </View>
                <Text style={styles.walletServiceLabel}>মোবাইল রিচার্জ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.walletServiceBtn}
                onPress={() => setModalBanglaQR(true)}
              >
                <View style={[styles.walletServiceIconBg, { backgroundColor: COLORS.goldLight }]}>
                  <Text style={{ fontSize: 22 }}>📷</Text>
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
            TAB 5: MENU / MORE (মেনু / আরও - সেটিংস ও টুলস)
           =================================================================== */}
        {activeTab === 'menu' && (
          <ScrollView contentContainerStyle={{ paddingBottom: 95 }}>
            {/* Merchant Shop Profile Header */}
            <View style={styles.menuProfileHeader}>
              <View style={styles.menuStoreAvatar}>
                <Text style={{ fontSize: 32 }}>🏪</Text>
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

            {/* Menu List of Authentic Features */}
            <View style={styles.menuListContainer}>
              <TouchableOpacity
                style={styles.menuListItem}
                onPress={() => setModalAddStock(true)}
              >
                <Text style={styles.menuListEmoji}>📦</Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.menuListTitle}>স্টক ও পণ্য হিসাব</Text>
                  <Text style={styles.menuListSub}>মোট {inventory.length} টি পণ্য • স্টক মূল্য ৳ {formatMoney(totalStockCost)}</Text>
                </View>
                <Text style={styles.menuListArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuListItem}
                onPress={() => setModalNotes(true)}
              >
                <Text style={styles.menuListEmoji}>📝</Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.menuListTitle}>ব্যবসার নোট ও রিমাইন্ডার</Text>
                  <Text style={styles.menuListSub}>প্রয়োজনীয় কাজ ও মেমো লিখে রাখুন</Text>
                </View>
                <Text style={styles.menuListArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuListItem}
                onPress={() => setModalProfitLoss(true)}
              >
                <Text style={styles.menuListEmoji}>📈</Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.menuListTitle}>লাভ / ক্ষতির হিসাব</Text>
                  <Text style={styles.menuListSub}>বেচা-কেনা ও খরচের নিট লাভ দেখুন</Text>
                </View>
                <Text style={styles.menuListArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuListItem}
                onPress={() => setModalFullReport(true)}
              >
                <Text style={styles.menuListEmoji}>📊</Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.menuListTitle}>সার্বিক হিসাব রিপোর্ট</Text>
                  <Text style={styles.menuListSub}>দৈনিক, মাসিক ও বার্ষিক স্টেটমেন্ট তৈরি ও শেয়ার</Text>
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
                <Text style={styles.menuListEmoji}>💾</Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.menuListTitle}>ডাটা ব্যাকআপ ও রিস্টোর</Text>
                  <Text style={styles.menuListSub}>১০০% অফলাইন ডাটা সেভ ও নতুন ফোনে ট্রান্সফার</Text>
                </View>
                <Text style={styles.menuListArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuListItem}
                onPress={() => setModalPinSetup(true)}
              >
                <Text style={styles.menuListEmoji}>🔒</Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.menuListTitle}>পিন লক ও নিরাপত্তা</Text>
                  <Text style={styles.menuListSub}>{pinEnabled ? 'PIN লক সক্রিয় রয়েছে' : '৪ ডিজিটের গোপন PIN সেট করুন'}</Text>
                </View>
                <Text style={styles.menuListArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuListItem}
                onPress={() => setModalSettings(true)}
              >
                <Text style={styles.menuListEmoji}>⚙️</Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.menuListTitle}>দোকান ও ব্যবসা সেটিংস</Text>
                  <Text style={styles.menuListSub}>দোকানের নাম, ফোন, ঠিকানা ও প্রারম্ভিক ক্যাশ</Text>
                </View>
                <Text style={styles.menuListArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuListItem}
                onPress={() => setModalSupport(true)}
              >
                <Text style={styles.menuListEmoji}>❓</Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.menuListTitle}>ব্যবহার নির্দেশিকা ও হেল্প</Text>
                  <Text style={styles.menuListSub}>সচরাচর জিজ্ঞাসিত প্রশ্ন ও হেল্পলাইন</Text>
                </View>
                <Text style={styles.menuListArrow}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Offline Guarantee Notice */}
            <View style={styles.offlineNoticeCard}>
              <Text style={styles.offlineNoticeTitle}>🔒 ১০০% অফলাইন ও নিরাপদ</Text>
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
          <Text style={styles.tabIcon}>📖</Text>
          <Text style={[styles.tabButtonLabel, activeTab === 'home' && styles.tabButtonLabelActive]}>
            খাতা
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'cashbox' && styles.tabButtonActive]}
          onPress={() => setActiveTab('cashbox')}
        >
          <Text style={styles.tabIcon}>💰</Text>
          <Text style={[styles.tabButtonLabel, activeTab === 'cashbox' && styles.tabButtonLabelActive]}>
            ক্যাশবক্স
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'tagada' && styles.tabButtonActive]}
          onPress={() => setActiveTab('tagada')}
        >
          <Text style={styles.tabIcon}>📢</Text>
          <Text style={[styles.tabButtonLabel, activeTab === 'tagada' && styles.tabButtonLabelActive]}>
            তাগাদা
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'tallypay' && styles.tabButtonActive]}
          onPress={() => setActiveTab('tallypay')}
        >
          <Text style={styles.tabIcon}>💳</Text>
          <Text style={[styles.tabButtonLabel, activeTab === 'tallypay' && styles.tabButtonLabelActive]}>
            টালিপে
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'menu' && styles.tabButtonActive]}
          onPress={() => setActiveTab('menu')}
        >
          <Text style={styles.tabIcon}>☰</Text>
          <Text style={[styles.tabButtonLabel, activeTab === 'menu' && styles.tabButtonLabelActive]}>
            মেনু
          </Text>
        </TouchableOpacity>
      </View>
