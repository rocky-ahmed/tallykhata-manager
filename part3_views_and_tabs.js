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
  // VIEW A: CUSTOMER / SUPPLIER ACCOUNT LEDGER SCREEN (activity_customer_report_v2.xml)
  // =========================================================================
  if (currentScreen === 'account_ledger' && selectedAccount) {
    const isCustomer = selectedAccount.type === 1;
    const accountJournals = (journals || []).filter((j) => j.accountId === selectedAccount.id);
    const totalGiven = accountJournals
      .filter((j) => j.type === 'given')
      .reduce((sum, j) => sum + Number(j.amount || 0), 0);
    const totalReceived = accountJournals
      .filter((j) => j.type === 'received')
      .reduce((sum, j) => sum + Number(j.amount || 0), 0);

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* Ledger Top Header (matching authentic activity_customer_report_v2.xml toolbar) */}
        <View style={styles.ledgerHeaderNav}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setCurrentScreen('home')}
            activeOpacity={0.7}
          >
            <Image
              source={require("./assets/icons/arrow_left.png")}
              style={{ width: 22, height: 22, tintColor: '#1A1A1A' }}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <View style={styles.ledgerHeaderTitleBox}>
            <Text style={styles.ledgerHeaderName} numberOfLines={1}>{selectedAccount.name}</Text>
            <Text style={styles.ledgerHeaderSub}>
              {isCustomer ? 'কাস্টমার হিসাব' : 'সাপ্লায়ার হিসাব'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
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
          </View>
        </View>

        {/* Account Profile Card (layout_customer_info_holder.xml) */}
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
              <Text style={styles.profileAddress} numberOfLines={1}>{selectedAccount.address}</Text>
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

        {/* Quick Action Chips: তাগাদা পাঠান, কল করুন, স্টেটমেন্ট শেয়ার */}
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
                `=== ${businessName} ===\n` +
                `হিসাব খাতা: ${selectedAccount.name}\n` +
                `মোবাইল: ${selectedAccount.phone || 'দেওয়া নেই'}\n` +
                `বর্তমান বকেয়া: ৳ ${formatMoney(selectedAccount.balance)}\n` +
                `মোট লেনদেন: ${accountJournals.length} টি\n` +
                `দিলাম মোট: ৳ ${formatMoney(totalGiven)}\n` +
                `পেলাম মোট: ৳ ${formatMoney(totalReceived)}\n` +
                `যোগাযোগ: ${ownerPhone}`;
              Share.share({ message: fullStatement });
            }}
            activeOpacity={0.7}
          >
            <Image source={require('./assets/icons/ic_pdf.png')} style={{ width: 20, height: 20, marginBottom: 4 }} resizeMode="contain" />
            <Text style={styles.quickActionLabel}>স্টেটমেন্ট শেয়ার</Text>
          </TouchableOpacity>
        </View>

        {/* Ledger Table Column Headers (layout_credit_details_table_head: লেনদেনের বিবরণ, দিলাম, পেলাম) */}
        <View style={styles.ledgerTableHeader}>
          <Text style={[styles.ledgerColHeader, { flex: 1.6 }]}>লেনদেনের বিবরণ</Text>
          <Text style={[styles.ledgerColHeader, { flex: 1, textAlign: 'right', color: COLORS.red }]}>
            দিলাম
          </Text>
          <Text style={[styles.ledgerColHeader, { flex: 1, textAlign: 'right', color: COLORS.green }]}>
            পেলাম
          </Text>
        </View>

        {/* Ledger Transactions List (rvCustomerCreditDetails) */}
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
                activeOpacity={0.7}
              >
                <View style={{ flex: 1.6 }}>
                  <Text style={styles.ledgerRowDesc}>{item.desc || 'সাধারণ লেনদেন'}</Text>
                  <Text style={styles.ledgerRowDate}>
                    {formatDisplayDate(item.date)} {item.time ? '• ' + item.time : ''}
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end', justifyContent: 'center' }}>
                  {isGiven ? (
                    <Text style={styles.ledgerGivenAmount}>৳ {formatMoney(item.amount)}</Text>
                  ) : (
                    <Text style={styles.dashMuted}>-</Text>
                  )}
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end', justifyContent: 'center' }}>
                  {!isGiven ? (
                    <Text style={styles.ledgerReceivedAmount}>৳ {formatMoney(item.amount)}</Text>
                  ) : (
                    <Text style={styles.dashMuted}>-</Text>
                  )}
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

        {/* Bottom Summary Totals Strip (bottomLinearLayout from activity_customer_report_v2.xml) */}
        <View style={styles.ledgerBottomTotalsStrip}>
          <Text style={styles.ledgerBottomTotalLabel}>মোট</Text>
          <View style={styles.ledgerBottomTotalCreditBox}>
            <Text style={styles.ledgerBottomTotalCreditVal}>৳ {formatMoney(totalGiven)}</Text>
          </View>
          <View style={styles.ledgerBottomTotalReceivedBox}>
            <Text style={styles.ledgerBottomTotalReceivedVal}>৳ {formatMoney(totalReceived)}</Text>
          </View>
        </View>

        {/* Bottom Dual Entry Bar (দিলাম / পেলাম) */}
        <View style={styles.ledgerBottomBar}>
          <TouchableOpacity
            style={[styles.bigEntryBtn, { backgroundColor: COLORS.primary }]}
            onPress={() => handleOpenAddTxn('given')}
            activeOpacity={0.85}
          >
            <Text style={styles.bigEntryBtnText}>- দিলাম (বাকি)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bigEntryBtn, { backgroundColor: COLORS.green }]}
            onPress={() => handleOpenAddTxn('received')}
            activeOpacity={0.85}
          >
            <Text style={styles.bigEntryBtnText}>+ পেলাম (জমা)</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // =========================================================================
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
                        <Text style={styles.quickGridLabel}>ট্যালি-মেসেজ</Text>
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
                    <TouchableOpacity
                      onPress={() => {
                        setAccountTab('customer');
                        setAccType(1);
                      }}
                      activeOpacity={0.7}
                      style={[styles.counterTabPill, accountTab === 'customer' && styles.counterTabPillActive]}
                    >
                      <Text style={[styles.counterTabText, accountTab === 'customer' && styles.counterTabTextActive]}>
                        কাস্টমার {toBengaliNumber(accounts.filter((a) => a.type === 1).length)}
                      </Text>
                    </TouchableOpacity>
                    <Text style={styles.counterStripDivider}>/</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setAccountTab('supplier');
                        setAccType(2);
                      }}
                      activeOpacity={0.7}
                      style={[styles.counterTabPill, accountTab === 'supplier' && styles.counterTabPillActive]}
                    >
                      <Text style={[styles.counterTabText, accountTab === 'supplier' && styles.counterTabTextActive]}>
                        সাপ্লায়ার {toBengaliNumber(accounts.filter((a) => a.type === 2).length)}
                      </Text>
                    </TouchableOpacity>
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
                setAccType(accountTab === 'supplier' ? 2 : 1);
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
                onPress={() => setModalCashReport(true)}
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
                  source={require('./assets/icons/ic_cash_milai.png')}
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
            TAB 3: TAGADA (তাগাদা বার্তা কালেকশন - activity_tagada.xml)
           =================================================================== */}
        {activeTab === 'tagada' && (
          <ScrollView contentContainerStyle={{ paddingBottom: 95 }}>
            {/* Tagada Header Card with SMS Quota Badge */}
            <View style={styles.tagadaHeaderCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tagadaHeaderTitle}>বকেয়া তাগাদা কালেকশন</Text>
                  <Text style={styles.tagadaHeaderSub}>
                    বকেয়া কাস্টমারদের সরাসরি টালি-মেসেজ ও WhatsApp তাগাদা পাঠান।
                  </Text>
                </View>
                <View style={styles.tagadaQuotaBadge}>
                  <Text style={styles.tagadaQuotaText}>ফ্রি এসএমএস</Text>
                  <Text style={styles.tagadaQuotaCount}>অবশিষ্ট: {remainingSmsCount < 10 ? '০' + remainingSmsCount : remainingSmsCount} টি</Text>
                </View>
              </View>

              <View style={styles.tagadaSummaryStrip}>
                <Text style={styles.tagadaSummaryText}>
                  বকেয়া কাস্টমার: <Text style={{ fontWeight: 'bold' }}>{dueCustomers.length} জন</Text>
                </Text>
                <Text style={styles.tagadaSummaryText}>
                  মোট বাকি: <Text style={{ fontWeight: 'bold', color: '#B81414' }}>৳ {formatMoney(totalCustomerDue)}</Text>
                </Text>
              </View>
            </View>

            {/* Bulk Tagada Action Banner (গ্রুপ তাগাদা) */}
            <TouchableOpacity
              style={styles.bulkTagadaBanner}
              onPress={handleSendBulkTagada}
              activeOpacity={0.85}
            >
              <Image source={require('./assets/icons/ic_sms.png')} style={{ width: 22, height: 22, tintColor: '#FFFFFF', marginRight: 10 }} resizeMode="contain" />
              <View style={{ flex: 1 }}>
                <Text style={styles.bulkTagadaTitle}>গ্রুপ তাগাদা পাঠান</Text>
                <Text style={styles.bulkTagadaSub}>একসাথে সব {dueCustomers.length} জন বাকি কাস্টমারকে এসএমএস পাঠান</Text>
              </View>
              <Text style={styles.bulkTagadaArrow}>›</Text>
            </TouchableOpacity>

            {/* Due Customers List */}
            <View style={{ paddingHorizontal: 12, marginTop: 12 }}>
              <Text style={styles.sectionHeading}>বাকি কাস্টমারের তালিকা ({dueCustomers.length})</Text>

              {dueCustomers.map((item) => (
                <View key={item.id} style={styles.tagadaCardItem}>
                  <View style={[styles.profileAvatar, { backgroundColor: '#FEE2E2', width: 44, height: 44, borderRadius: 22 }]}>
                    <Text style={[styles.profileAvatarText, { color: '#B81414', fontSize: 18 }]}>
                      {(item.name || 'ক')[0]}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.tagadaCustName}>{item.name}</Text>
                    <Text style={styles.tagadaCustPhone}>{item.phone || 'মোবাইল নম্বর নেই'}</Text>
                    <Text style={styles.tagadaCustDue}>বকেয়া বাকি: ৳ {formatMoney(item.balance)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <TouchableOpacity
                      style={[styles.tagadaActionBtn, { backgroundColor: '#B81414' }]}
                      onPress={() => {
                        setTagadaCustomer(item);
                        setModalTagada(true);
                      }}
                    >
                      <Text style={styles.tagadaActionBtnText}>টালি-মেসেজ</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.tagadaActionBtn, { backgroundColor: '#25D366' }]}
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
                <Image source={require('./assets/icons/ic_menu_accounts.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />
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
                <Image source={require('./assets/icons/ic_menu_payment_messaging.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.menuListTitle}>লেনদেন বিবরণী</Text>
                  <Text style={styles.menuListSub}>মোট {walletTxns.length} টি ওয়ালেট লেনদেন</Text>
                </View>
                <Text style={styles.menuListArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuListItem}
                onPress={() => setModalTxnLimit(true)}
              >
                <Image source={require('./assets/icons/ic_menu_lock.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />
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
                onPress={() => setModalBechaKena(true)}
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
                onPress={() => setModalExpenseReport(true)}
              >
                <Image source={require('./assets/icons/ic_menu_cost.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.menuListTitle}>খরচ রিপোর্ট</Text>
                  <Text style={styles.menuListSub}>দোকানের সকল যাবতীয় খরচের তালিকা</Text>
                </View>
                <Text style={styles.menuListArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuListItem}
                onPress={() => setModalBakiReport(true)}
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
                onPress={() => setModalMalikReport(true)}
              >
                <Image source={require('./assets/icons/ic_menu_malik_report.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.menuListTitle}>মালিকের হিসাব</Text>
                  <Text style={styles.menuListSub}>মালিকের বিনিয়োগ ও ব্যক্তিগত উত্তোলন স্টেটমেন্ট</Text>
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

      {/* --- AUTHENTIC 4-TAB BOTTOM NAVIGATION BAR (photo_2026-10-15_18-13-34.jpg) --- */}
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
            ট্যালি
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab('cashbox')}
          activeOpacity={0.8}
        >
          {activeTab === 'cashbox' ? (
            <View style={styles.tabActivePill}>
              <Image
                source={require('./assets/nav/nav_cashbox_active.png')}
                style={[styles.tabIconImg, { tintColor: '#B81414', marginBottom: 0 }]}
                resizeMode="contain"
              />
            </View>
          ) : (
            <Image
              source={require('./assets/nav/nav_cashbox.png')}
              style={styles.tabIconImg}
              resizeMode="contain"
            />
          )}
          <Text style={[styles.tabButtonLabel, activeTab === 'cashbox' && styles.tabButtonLabelActive]}>
            ক্যাশবক্স
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab('tallypay')}
          activeOpacity={0.8}
        >
          {activeTab === 'tallypay' ? (
            <View style={styles.tabActivePill}>
              <Image
                source={require('./assets/nav/nav_tallypay_active.png')}
                style={[styles.tabIconImg, { tintColor: '#B81414', marginBottom: 0 }]}
                resizeMode="contain"
              />
            </View>
          ) : (
            <Image
              source={require('./assets/nav/nav_tallypay.png')}
              style={styles.tabIconImg}
              resizeMode="contain"
            />
          )}
          <Text style={[styles.tabButtonLabel, activeTab === 'tallypay' && styles.tabButtonLabelActive]}>
            টালিপে
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab('menu')}
          activeOpacity={0.8}
        >
          {activeTab === 'menu' ? (
            <View style={styles.tabActivePill}>
              <Image
                source={require('./assets/nav/nav_menu_active.png')}
                style={[styles.tabIconImg, { tintColor: '#B81414', marginBottom: 0 }]}
                resizeMode="contain"
              />
            </View>
          ) : (
            <Image
              source={require('./assets/nav/nav_menu.png')}
              style={styles.tabIconImg}
              resizeMode="contain"
            />
          )}
          <Text style={[styles.tabButtonLabel, activeTab === 'menu' && styles.tabButtonLabelActive]}>
            মেন্যু
          </Text>
        </TouchableOpacity>
      </View>
