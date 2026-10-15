      {/* ===================================================================
          MODAL: ADD TRANSACTION WITH AUTHENTIC BUILT-IN CALCULATOR KEYPAD
         =================================================================== */}
      <Modal visible={modalAddTxn} animationType="slide" transparent onRequestClose={() => setModalAddTxn(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '95%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalCardTitle, { color: txnType === 'given' ? COLORS.primary : COLORS.green }]}>
                {txnType === 'given' ? '- দিলাম (টাকা বা পণ্য বাকি)' : '+ পেলাম (নগদ বা জমা আদায়)'}
              </Text>
              <TouchableOpacity onPress={() => setModalAddTxn(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Large Calculator Display */}
            <View style={[styles.calcDisplayBox, { borderColor: txnType === 'given' ? COLORS.primary : COLORS.green }]}>
              <Text style={styles.calcExprText}>{calcExpr || '০'}</Text>
              <Text style={[styles.calcTotalText, { color: txnType === 'given' ? COLORS.primary : COLORS.green }]}>
                ৳ {calcDisplay}
              </Text>
            </View>

            {/* Quick Amount Add Chips */}
            <View style={styles.quickChipRow}>
              {[
                { label: '+১০০', val: 100 },
                { label: '+৫০০', val: 500 },
                { label: '+১,০০০', val: 1000 },
                { label: '+২,০০০', val: 2000 },
                { label: '+৫,০০০', val: 5000 },
              ].map((c) => (
                <TouchableOpacity
                  key={c.label}
                  style={styles.quickChip}
                  onPress={() => handleQuickChipAdd(c.val)}
                >
                  <Text style={styles.quickChipText}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Built-in Keypad Grid */}
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
                    return (
                      <TouchableOpacity
                        key={btn}
                        style={[
                          styles.keypadBtn,
                          isOp && styles.keypadBtnOp,
                          isSpecial && styles.keypadBtnSpecial,
                          btn === '=' && { backgroundColor: txnType === 'given' ? COLORS.primary : COLORS.green, flex: 2 },
                        ]}
                        onPress={() => handleCalcPress(btn)}
                      >
                        <Text
                          style={[
                            styles.keypadBtnText,
                            isOp && styles.keypadBtnTextOp,
                            isSpecial && styles.keypadBtnTextSpecial,
                            btn === '=' && { color: COLORS.white },
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
              style={styles.modalSimpleInput}
              placeholder="বিবরণ (যেমন: চাল, তেল, নগদ ইত্যাদি)"
              placeholderTextColor={COLORS.textSubtle}
              value={txnDesc}
              onChangeText={setTxnDesc}
            />

            {/* Quick Suggestion Chips for Note */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {['চাল', 'ডাল', 'তেল', 'চিনি', 'নগদ বাকি', 'নগদ জমা', 'পূর্বের বাকি'].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={styles.descChip}
                  onPress={() => setTxnDesc((prev) => (prev ? prev + ', ' + s : s))}
                >
                  <Text style={styles.descChipText}>+{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Modal Action Buttons */}
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalAddTxn(false)}>
                <Text style={styles.modalBtnCancelText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: txnType === 'given' ? COLORS.primary : COLORS.green }]}
                onPress={handleSaveTransaction}
              >
                <Text style={styles.modalBtnSubmitText}>নিশ্চিত করি</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: EDIT TRANSACTION
         =================================================================== */}
      <Modal visible={modalEditTxn} animationType="fade" transparent onRequestClose={() => setModalEditTxn(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalCardTitle}>লেনদেন সংশোধন (এডিট)</Text>
            <TextInput
              style={styles.modalBigInput}
              placeholder="টাকার পরিমাণ"
              keyboardType="numeric"
              value={editAmount}
              onChangeText={setEditAmount}
            />
            <TextInput
              style={styles.modalSimpleInput}
              placeholder="বিবরণ"
              value={editDesc}
              onChangeText={setEditDesc}
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalEditTxn(false)}>
                <Text style={styles.modalBtnCancelText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.primary }]}
                onPress={handleUpdateTransaction}
              >
                <Text style={styles.modalBtnSubmitText}>আপডেট করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: DIGITAL VOUCHER / MEMO (ডিজিটাল রশিদ)
         =================================================================== */}
      <Modal visible={modalVoucher} animationType="slide" transparent onRequestClose={() => setModalVoucher(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>ডিজিটাল ভাউচার (রশিদ)</Text>
              <TouchableOpacity onPress={() => setModalVoucher(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingVertical: 10 }}>
              <View style={styles.voucherContainer}>
                <View style={styles.voucherHeader}>
                  <Image
                    source={require('./assets/ic_tally_khata_logo_reg.png')}
                    style={{ width: 44, height: 44, marginBottom: 6 }}
                    resizeMode="contain"
                  />
                  <Text style={styles.voucherBizName}>{businessName}</Text>
                  <Text style={styles.voucherBizSub}>{businessAddress}</Text>
                  <Text style={styles.voucherBizSub}>মোবাইল: {ownerPhone}</Text>
                  <View style={styles.voucherBadge}>
                    <Text style={styles.voucherBadgeText}>১০০% ডিজিটাল হিসাব রশিদ</Text>
                  </View>
                </View>

                <View style={styles.voucherDivider} />

                <View style={styles.voucherDetailRow}>
                  <Text style={styles.voucherLabel}>রশিদ নং:</Text>
                  <Text style={styles.voucherVal}>TK-{selectedVoucherTxn?.id ? selectedVoucherTxn.id.slice(-6) : '000000'}</Text>
                </View>
                <View style={styles.voucherDetailRow}>
                  <Text style={styles.voucherLabel}>তারিখ ও সময়:</Text>
                  <Text style={styles.voucherVal}>
                    {selectedVoucherTxn?.date} {selectedVoucherTxn?.time ? '• ' + selectedVoucherTxn.time : ''}
                  </Text>
                </View>

                <View style={styles.voucherDivider} />

                <View style={styles.voucherDetailRow}>
                  <Text style={styles.voucherLabel}>
                    {selectedAccount?.type === 1 ? 'কাস্টমার:' : 'সাপ্লায়ার:'}
                  </Text>
                  <Text style={[styles.voucherVal, { fontWeight: 'bold' }]}>{selectedAccount?.name}</Text>
                </View>
                <View style={styles.voucherDetailRow}>
                  <Text style={styles.voucherLabel}>মোবাইল:</Text>
                  <Text style={styles.voucherVal}>{selectedAccount?.phone || 'দেওয়া নেই'}</Text>
                </View>

                <View style={styles.voucherDivider} />

                <View style={styles.voucherDetailRow}>
                  <Text style={styles.voucherLabel}>লেনদেনের ধরন:</Text>
                  <Text style={[styles.voucherVal, { color: selectedVoucherTxn?.type === 'given' ? COLORS.primary : COLORS.green, fontWeight: 'bold' }]}>
                    {selectedVoucherTxn?.type === 'given' ? 'দিলাম (বাকি বিক্রি)' : 'পেলাম (জমা আদায়)'}
                  </Text>
                </View>
                <View style={styles.voucherDetailRow}>
                  <Text style={styles.voucherLabel}>বিবরণ:</Text>
                  <Text style={styles.voucherVal}>{selectedVoucherTxn?.desc || 'সাধারণ লেনদেন'}</Text>
                </View>

                <View style={styles.voucherDivider} />

                <View style={styles.voucherDetailRow}>
                  <Text style={[styles.voucherLabel, { fontSize: 16, fontWeight: 'bold' }]}>টাকার পরিমাণ:</Text>
                  <Text style={[styles.voucherVal, { fontSize: 18, fontWeight: 'bold', color: selectedVoucherTxn?.type === 'given' ? COLORS.primary : COLORS.green }]}>
                    ৳ {formatMoney(selectedVoucherTxn?.amount)}
                  </Text>
                </View>
                <View style={styles.voucherDetailRow}>
                  <Text style={styles.voucherLabel}>সর্বমোট বর্তমান বাকি:</Text>
                  <Text style={[styles.voucherVal, { fontWeight: 'bold' }]}>
                    ৳ {formatMoney(selectedAccount?.balance)}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.voucherActionRow}>
              <TouchableOpacity
                style={[styles.voucherBtn, { backgroundColor: COLORS.blue }]}
                onPress={() => {
                  const txt = renderVoucherText(selectedVoucherTxn, selectedAccount);
                  Share.share({ message: txt });
                }}
              >
                <Image source={require('./assets/icons/ic_share.png')} style={{ width: 16, height: 16, tintColor: '#FFFFFF', marginRight: 6 }} resizeMode="contain" />
                <Text style={styles.voucherBtnText}>শেয়ার</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.voucherBtn, { backgroundColor: COLORS.gold }]}
                onPress={() => handleOpenEditTxn(selectedVoucherTxn)}
              >
                <Image source={require('./assets/icons/ic_edit.png')} style={{ width: 16, height: 16, tintColor: '#FFFFFF', marginRight: 6 }} resizeMode="contain" />
                <Text style={styles.voucherBtnText}>সংশোধন</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.voucherBtn, { backgroundColor: COLORS.red }]}
                onPress={() => { if (selectedVoucherTxn?.id) handleDeleteTransaction(selectedVoucherTxn.id); }}
              >
                <Image source={require('./assets/icons/ic_delete.png')} style={{ width: 16, height: 16, tintColor: '#FFFFFF', marginRight: 6 }} resizeMode="contain" />
                <Text style={styles.voucherBtnText}>মুছুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: EDIT ACCOUNT (CUSTOMER / SUPPLIER)
         =================================================================== */}
      <Modal visible={modalEditAccount} animationType="slide" transparent onRequestClose={() => setModalEditAccount(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>
                {selectedAccount?.type === 1 ? 'কাস্টমার তথ্য এডিট' : 'সাপ্লায়ার তথ্য এডিট'}
              </Text>
              <TouchableOpacity onPress={() => setModalEditAccount(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>নাম *</Text>
            <TextInput
              style={styles.modalSimpleInput}
              value={accName}
              onChangeText={setAccName}
              placeholder="নাম লিখুন"
              placeholderTextColor={COLORS.textSubtle}
            />

            <Text style={styles.inputLabel}>মোবাইল নম্বর</Text>
            <TextInput
              style={styles.modalSimpleInput}
              value={accPhone}
              onChangeText={setAccPhone}
              placeholder="01XXXXXXXXX"
              placeholderTextColor={COLORS.textSubtle}
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>ঠিকানা / এলাকা</Text>
            <TextInput
              style={styles.modalSimpleInput}
              value={accAddress}
              onChangeText={setAccAddress}
              placeholder="ঠিকানা (ঐচ্ছিক)"
              placeholderTextColor={COLORS.textSubtle}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalEditAccount(false)}>
                <Text style={styles.modalBtnCancelText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSubmit} onPress={handleUpdateAccount}>
                <Text style={styles.modalBtnSubmitText}>সংরক্ষণ করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: CREATE ACCOUNT (CUSTOMER / SUPPLIER)
         =================================================================== */}
      <Modal visible={modalAddAccount} animationType="slide" transparent onRequestClose={() => setModalAddAccount(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>নতুন খাতা খুলুন</Text>
              <TouchableOpacity onPress={() => setModalAddAccount(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.accTypeToggleRow}>
              <TouchableOpacity
                style={[styles.accTypeToggleBtn, accType === 1 && styles.accTypeToggleBtnActiveRed]}
                onPress={() => setAccType(1)}
              >
                <Text style={[styles.accTypeToggleText, accType === 1 && { color: COLORS.white }]}>
                  কাস্টমার (বাকি)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.accTypeToggleBtn, accType === 2 && styles.accTypeToggleBtnActiveGreen]}
                onPress={() => setAccType(2)}
              >
                <Text style={[styles.accTypeToggleText, accType === 2 && { color: COLORS.white }]}>
                  সাপ্লায়ার (মহাজন)
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalSimpleInput}
              placeholder="কাস্টমার / সাপ্লায়ারের নাম *"
              placeholderTextColor={COLORS.textSubtle}
              value={accName}
              onChangeText={setAccName}
            />
            <TextInput
              style={styles.modalSimpleInput}
              placeholder="মোবাইল নম্বর (ঐচ্ছিক)"
              placeholderTextColor={COLORS.textSubtle}
              keyboardType="phone-pad"
              value={accPhone}
              onChangeText={setAccPhone}
            />
            <TextInput
              style={styles.modalSimpleInput}
              placeholder="ঠিকানা / এলাকা (ঐচ্ছিক)"
              placeholderTextColor={COLORS.textSubtle}
              value={accAddress}
              onChangeText={setAccAddress}
            />
            <TextInput
              style={styles.modalSimpleInput}
              placeholder="পূর্বের বাকি ব্যালেন্স (যদি থাকে)"
              placeholderTextColor={COLORS.textSubtle}
              keyboardType="numeric"
              value={accInitialBal}
              onChangeText={setAccInitialBal}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalAddAccount(false)}>
                <Text style={styles.modalBtnCancelText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.primary }]}
                onPress={handleSaveAccount}
              >
                <Text style={styles.modalBtnSubmitText}>খাতা খুলুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: CASH ENTRY (CASHBOX)
         =================================================================== */}
      <Modal visible={modalAddCash} animationType="slide" transparent onRequestClose={() => setModalAddCash(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>ক্যাশ বাক্সের এন্ট্রি</Text>
              <TouchableOpacity onPress={() => setModalAddCash(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {[
                { key: 'sale', label: 'ক্যাশ বেচা (+)' },
                { key: 'buy', label: 'ক্যাশ কেনা (-)' },
                { key: 'cost', label: 'দোকান খরচ (-)' },
                { key: 'malik_in', label: 'মালিক দিল (+)' },
                { key: 'malik_out', label: 'মালিক নিল (-)' },
              ].map((c) => (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.categorySelectChip, cashCategory === c.key && styles.categorySelectChipActive]}
                  onPress={() => setCashCategory(c.key)}
                >
                  <Text style={[styles.categorySelectChipText, cashCategory === c.key && styles.categorySelectChipTextActive]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              style={styles.modalBigInput}
              placeholder="৳ টাকার পরিমাণ *"
              placeholderTextColor={COLORS.textSubtle}
              keyboardType="numeric"
              autoFocus
              value={cashAmount}
              onChangeText={setCashAmount}
            />
            <TextInput
              style={styles.modalSimpleInput}
              placeholder="বিবরণ (যেমন: পণ্য বিক্রয়, নাস্তা, কারেন্ট বিল)"
              placeholderTextColor={COLORS.textSubtle}
              value={cashDesc}
              onChangeText={setCashDesc}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalAddCash(false)}>
                <Text style={styles.modalBtnCancelText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtnSubmit,
                  { backgroundColor: cashCategory === 'sale' || cashCategory === 'malik_in' ? COLORS.green : COLORS.primary },
                ]}
                onPress={handleSaveCashEntry}
              >
                <Text style={styles.modalBtnSubmitText}>সংরক্ষণ করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: RECONCILE CASH (ক্যাশবক্স মিলানো)
         =================================================================== */}
      <Modal
        visible={modalReconcileCash}
        animationType="slide"
        transparent
        onRequestClose={() => setModalReconcileCash(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%', padding: 16 }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>ক্যাশবক্স মিলানো (নোট গণনা)</Text>
                <Text style={{ fontSize: 11, color: COLORS.textMuted }}>খাতার ক্যাশ: ৳ {formatMoney(totalCash)}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalReconcileCash(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ marginVertical: 8 }}>
              <View style={styles.denomContainer}>
                <View style={styles.denomHeaderRow}>
                  <Text style={styles.denomHeaderCol}>নোটের মান</Text>
                  <Text style={styles.denomHeaderCol}>সংখ্যা (টি)</Text>
                  <Text style={styles.denomHeaderCol}>মোট টাকা</Text>
                </View>

                {[
                  { label: '৳ ১০০০', value: 1000, state: notes1000, setter: setNotes1000 },
                  { label: '৳ ৫০০', value: 500, state: notes500, setter: setNotes500 },
                  { label: '৳ ২০০', value: 200, state: notes200, setter: setNotes200 },
                  { label: '৳ ১০০', value: 100, state: notes100, setter: setNotes100 },
                  { label: '৳ ৫০', value: 50, state: notes50, setter: setNotes50 },
                  { label: '৳ ২০', value: 20, state: notes20, setter: setNotes20 },
                  { label: '৳ ১০', value: 10, state: notes10, setter: setNotes10 },
                  { label: '৳ ৫', value: 5, state: notes5, setter: setNotes5 },
                  { label: '৳ ২', value: 2, state: notes2, setter: setNotes2 },
                  { label: '৳ ১', value: 1, state: notes1, setter: setNotes1 },
                ].map((row) => {
                  const qty = Number(row.state) || 0;
                  const subtotal = qty * row.value;
                  return (
                    <View key={row.label} style={styles.denomItemRow}>
                      <Text style={styles.denomNoteTag}>{row.label}</Text>
                      <Text style={styles.denomX}>×</Text>
                      <TextInput
                        style={styles.denomQtyInput}
                        placeholder="০"
                        placeholderTextColor={COLORS.textSubtle}
                        keyboardType="numeric"
                        value={row.state}
                        onChangeText={row.setter}
                      />
                      <Text style={styles.denomEq}>=</Text>
                      <Text style={styles.denomSubtotal}>৳ {formatMoney(subtotal)}</Text>
                    </View>
                  );
                })}
              </View>

              <View style={styles.denomSummaryBox}>
                <View style={styles.denomSummaryRow}>
                  <Text style={styles.denomSummaryLabel}>মোট গুনে পাওয়া ক্যাশ:</Text>
                  <Text style={[styles.denomSummaryVal, { color: COLORS.green }]}>
                    ৳ {formatMoney(countedFromNotes)}
                  </Text>
                </View>
                <View style={styles.denomSummaryRow}>
                  <Text style={styles.denomSummaryLabel}>খাতায় বর্তমান ক্যাশ:</Text>
                  <Text style={styles.denomSummaryVal}>
                    ৳ {formatMoney(totalCash)}
                  </Text>
                </View>
                <View style={[styles.denomSummaryRow, { borderTopWidth: 1, borderColor: '#E5E7EB', paddingTop: 6, marginTop: 4 }]}>
                  {(() => {
                    const diff = countedFromNotes - totalCash;
                    if (countedFromNotes === 0) {
                      return (
                        <Text style={{ fontSize: 12, color: COLORS.textMuted }}>
                          নোটের সংখ্যা লিখে ড্রয়ারের সঠিক ক্যাশ মিলান।
                        </Text>
                      );
                    }
                    if (diff === 0) {
                      return (
                        <Text style={{ fontSize: 13, color: COLORS.green, fontWeight: 'bold' }}>
                          ✓ ক্যাশ পুরোপুরি মিলে গেছে! কোনো গরমিল নেই।
                        </Text>
                      );
                    } else if (diff > 0) {
                      return (
                        <Text style={{ fontSize: 13, color: COLORS.blue, fontWeight: 'bold' }}>
                          ℹ️ ড্রয়ারে ৳ {formatMoney(diff)} অতিরিক্ত ক্যাশ রয়েছে।
                        </Text>
                      );
                    } else {
                      return (
                        <Text style={{ fontSize: 13, color: COLORS.red, fontWeight: 'bold' }}>
                          ⚠️ ড্রয়ারে ৳ {formatMoney(Math.abs(diff))} ক্যাশ ঘাটতি রয়েছে!
                        </Text>
                      );
                    }
                  })()}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setModalReconcileCash(false)}
              >
                <Text style={styles.modalBtnCancelText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.primary }]}
                onPress={handleSaveDenominations}
              >
                <Text style={styles.modalBtnSubmitText}>সমন্বয় সংরক্ষণ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: BANGLA QR (বাংলা কিউআর)
         =================================================================== */}
      <Modal visible={modalBanglaQR} animationType="slide" transparent onRequestClose={() => setModalBanglaQR(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { alignItems: 'center' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>বাংলা QR কোড</Text>
              <TouchableOpacity onPress={() => setModalBanglaQR(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.primary, marginTop: 8 }}>
              {businessName}
            </Text>
            <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 16 }}>
              মার্চেন্ট আইডি: TP-{ownerPhone}
            </Text>

            {/* QR Visual Card */}
            <View style={styles.qrDisplayContainer}>
              <Image
                source={require('./assets/ic_bangla_qr.png')}
                style={{ width: 170, height: 170 }}
                resizeMode="contain"
              />
              <Text style={styles.qrCenterBadge}>বাংলা QR • {businessName}</Text>
            </View>

            <Text style={{ fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginTop: 12, lineHeight: 18 }}>
              কাস্টমার তার বিকাশ, নগদ, রকেট বা যেকোনো ব্যাংক অ্যাপ দিয়ে এই কিউআর স্ক্যান করে সরাসরি পেমেন্ট করতে পারবেন।
            </Text>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, width: '100%' }}>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.blue, flex: 1 }]}
                onPress={() => {
                  Share.share({
                    message: `=== ${businessName} (বাংলা QR) ===\nমার্চেন্ট আইডি: TP-${ownerPhone}\nবিকাশ/নগদ/রকেট বা ব্যাংক দিয়ে পেমেন্ট করুন।`,
                  });
                }}
              >
                <Text style={styles.modalBtnSubmitText}>শেয়ার কিউআর</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnCancel, { flex: 1 }]}
                onPress={() => setModalBanglaQR(false)}
              >
                <Text style={styles.modalBtnCancelText}>বন্ধ করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: TALLYPAY ADD MONEY
         =================================================================== */}
      <Modal visible={modalAddMoney} animationType="slide" transparent onRequestClose={() => setModalAddMoney(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>ওয়ালেটে অ্যাড মানি</Text>
              <TouchableOpacity onPress={() => setModalAddMoney(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>পেমেন্ট মাধ্যম বেছে নিন:</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {['bKash', 'Nagad', 'Rocket', 'Bank Card'].map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.paymentMethodChip, addMoneyMethod === m && styles.paymentMethodChipActive]}
                  onPress={() => setAddMoneyMethod(m)}
                >
                  <Text style={[styles.paymentMethodChipText, addMoneyMethod === m && styles.paymentMethodChipTextActive]}>
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.modalBigInput}
              placeholder="৳ টাকার পরিমাণ"
              keyboardType="numeric"
              autoFocus
              value={addMoneyAmount}
              onChangeText={setAddMoneyAmount}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalAddMoney(false)}>
                <Text style={styles.modalBtnCancelText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.green }]}
                onPress={handleAddMoney}
              >
                <Text style={styles.modalBtnSubmitText}>অ্যাড মানি করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: TALLYPAY MOBILE RECHARGE
         =================================================================== */}
      <Modal visible={modalMobileRecharge} animationType="slide" transparent onRequestClose={() => setModalMobileRecharge(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>মোবাইল রিচার্জ</Text>
              <TouchableOpacity onPress={() => setModalMobileRecharge(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>অপারেটর নির্বাচন করুন:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {['Grameenphone', 'Banglalink', 'Robi', 'Airtel', 'Teletalk'].map((op) => (
                <TouchableOpacity
                  key={op}
                  style={[styles.paymentMethodChip, rechargeOperator === op && styles.paymentMethodChipActive]}
                  onPress={() => setRechargeOperator(op)}
                >
                  <Text style={[styles.paymentMethodChipText, rechargeOperator === op && styles.paymentMethodChipTextActive]}>
                    {op}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              style={styles.modalSimpleInput}
              placeholder="মোবাইল নম্বর (01XXXXXXXXX)"
              keyboardType="phone-pad"
              value={rechargePhone}
              onChangeText={setRechargePhone}
            />
            <TextInput
              style={styles.modalBigInput}
              placeholder="৳ রিচার্জ পরিমাণ"
              keyboardType="numeric"
              value={rechargeAmount}
              onChangeText={setRechargeAmount}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalMobileRecharge(false)}>
                <Text style={styles.modalBtnCancelText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.primary }]}
                onPress={handleMobileRecharge}
              >
                <Text style={styles.modalBtnSubmitText}>রিচার্জ করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: STOCK INVENTORY (পণ্য ও স্টক)
         =================================================================== */}
      <Modal visible={modalAddStock} animationType="slide" transparent onRequestClose={() => setModalAddStock(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>স্টক ও পণ্য তালিকা</Text>
              <TouchableOpacity onPress={() => setModalAddStock(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 10 }}>
              <View style={styles.stockSummaryRow}>
                <View style={styles.stockSummaryBox}>
                  <Text style={styles.stockSummaryBoxLabel}>মোট পণ্য</Text>
                  <Text style={styles.stockSummaryBoxVal}>{inventory.length} টি</Text>
                </View>
                <View style={[styles.stockSummaryBox, { borderColor: COLORS.primary }]}>
                  <Text style={styles.stockSummaryBoxLabel}>স্টক ক্রয়মূল্য</Text>
                  <Text style={[styles.stockSummaryBoxVal, { color: COLORS.primary }]}>৳ {formatMoney(totalStockCost)}</Text>
                </View>
                <View style={[styles.stockSummaryBox, { borderColor: COLORS.green }]}>
                  <Text style={styles.stockSummaryBoxLabel}>আনুমানিক বিক্রয়</Text>
                  <Text style={[styles.stockSummaryBoxVal, { color: COLORS.green }]}>৳ {formatMoney(totalStockSaleValue)}</Text>
                </View>
              </View>

              <Text style={[styles.sectionHeading, { marginTop: 12 }]}>নতুন পণ্য যোগ করুন</Text>
              <TextInput
                style={styles.modalSimpleInput}
                placeholder="পণ্যের নাম (যেমন: মিনিকেট চাল)"
                value={prodName}
                onChangeText={setProdName}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={[styles.modalSimpleInput, { flex: 1 }]}
                  placeholder="একক (কেজি/লিটার/পিস)"
                  value={prodUnit}
                  onChangeText={setProdUnit}
                />
                <TextInput
                  style={[styles.modalSimpleInput, { flex: 1 }]}
                  placeholder="বর্তমান স্টক"
                  keyboardType="numeric"
                  value={prodStock}
                  onChangeText={setProdStock}
                />
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={[styles.modalSimpleInput, { flex: 1 }]}
                  placeholder="ক্রয়মূল্য (৳)"
                  keyboardType="numeric"
                  value={prodBuyPrice}
                  onChangeText={setProdBuyPrice}
                />
                <TextInput
                  style={[styles.modalSimpleInput, { flex: 1 }]}
                  placeholder="বিক্রয়মূল্য (৳)"
                  keyboardType="numeric"
                  value={prodSellPrice}
                  onChangeText={setProdSellPrice}
                />
              </View>

              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.primary, marginTop: 4 }]}
                onPress={handleSaveProduct}
              >
                <Text style={styles.modalBtnSubmitText}>+ পণ্য যোগ করুন</Text>
              </TouchableOpacity>

              <Text style={[styles.sectionHeading, { marginTop: 16 }]}>বিদ্যমান পণ্যসমূহ</Text>
              {inventory.map((item) => (
                <View key={item.id} style={styles.stockItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stockItemName}>{item.name}</Text>
                    <Text style={styles.stockItemSub}>
                      ক্রয়: ৳ {formatMoney(item.buyPrice)} • বিক্রয়: ৳ {formatMoney(item.sellPrice)} / {item.unit}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.stockQtyText, item.stock <= 5 && { color: COLORS.red }]}>
                      {item.stock} {item.unit}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                      <TouchableOpacity
                        style={styles.stockAdjustMiniBtn}
                        onPress={() => {
                          setSelectedProduct(item);
                          setStockAdjustType('in');
                          setModalAdjustStock(true);
                        }}
                      >
                        <Text style={styles.stockAdjustMiniBtnText}>+ ইন</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.stockAdjustMiniBtn, { backgroundColor: COLORS.red }]}
                        onPress={() => {
                          setSelectedProduct(item);
                          setStockAdjustType('out');
                          setModalAdjustStock(true);
                        }}
                      >
                        <Text style={styles.stockAdjustMiniBtnText}>- আউট</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteProduct(item.id)} style={{ padding: 2 }}>
                        <Image source={require('./assets/icons/ic_delete.png')} style={{ width: 16, height: 16 }} resizeMode="contain" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: ADJUST PRODUCT STOCK
         =================================================================== */}
      <Modal visible={modalAdjustStock} animationType="fade" transparent onRequestClose={() => setModalAdjustStock(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalCardTitle}>
              {selectedProduct ? selectedProduct.name + ' - স্টক সমন্বয়' : 'স্টক সমন্বয়'}
            </Text>
            <View style={styles.accTypeToggleRow}>
              <TouchableOpacity
                style={[styles.accTypeToggleBtn, stockAdjustType === 'in' && styles.accTypeToggleBtnActiveGreen]}
                onPress={() => setStockAdjustType('in')}
              >
                <Text style={[styles.accTypeToggleText, stockAdjustType === 'in' && { color: COLORS.white }]}>
                  + নতুন স্টক এলো
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.accTypeToggleBtn, stockAdjustType === 'out' && styles.accTypeToggleBtnActiveRed]}
                onPress={() => setStockAdjustType('out')}
              >
                <Text style={[styles.accTypeToggleText, stockAdjustType === 'out' && { color: COLORS.white }]}>
                  - স্টক কমেছে / নষ্ট
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalBigInput}
              placeholder="পরিমাণ"
              keyboardType="numeric"
              autoFocus
              value={stockAdjustQty}
              onChangeText={setStockAdjustQty}
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalAdjustStock(false)}>
                <Text style={styles.modalBtnCancelText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.primary }]}
                onPress={handleAdjustStock}
              >
                <Text style={styles.modalBtnSubmitText}>আপডেট করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: TAGADA REMINDER TEMPLATE
         =================================================================== */}
      <Modal visible={modalTagada} animationType="fade" transparent onRequestClose={() => setModalTagada(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { padding: 18 }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>তাগাদা মেসেজ</Text>
              <TouchableOpacity onPress={() => setModalTagada(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedAccount ? (
              <View style={styles.tagadaReceiverCard}>
                <View style={styles.tagadaReceiverAvatar}>
                  <Text style={styles.tagadaReceiverAvatarText}>
                    {(selectedAccount.name || 'খ')[0]}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.tagadaReceiverName}>{selectedAccount.name}</Text>
                  <Text style={styles.tagadaReceiverPhone}>{selectedAccount.phone || 'মোবাইল নম্বর নেই'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.tagadaReceiverDueLabel}>বকেয়া</Text>
                  <Text style={styles.tagadaReceiverDueAmount}>৳ {formatMoney(selectedAccount.balance)}</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.tagadaDottedBox}>
              <Text style={styles.tagadaMessageContent}>
                {generateTagadaMessage(selectedAccount)}
              </Text>
            </View>

            <Text style={styles.tagadaActionPrompt}>তাগাদা পাঠাতে ট্যাপ করুন।</Text>

            <View style={styles.tagadaDualBtnRow}>
              <TouchableOpacity
                style={styles.tagadaTallyMsgBtn}
                onPress={() => handleSendSingleTagada(selectedAccount)}
                activeOpacity={0.85}
              >
                <Image
                  source={require('./assets/icons/ic_sms.png')}
                  style={{ width: 22, height: 22, marginRight: 8, tintColor: '#FFFFFF' }}
                  resizeMode="contain"
                />
                <View>
                  <Text style={styles.tagadaTallyMsgText}>টালি-মেসেজ পাঠাই</Text>
                  <Text style={styles.tagadaTallyMsgSub}>
                    অবশিষ্ট: {remainingSmsCount < 10 ? '০' + remainingSmsCount : remainingSmsCount}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.tagadaShareAppBtn}
                onPress={() => handleSendTagadaWhatsApp(selectedAccount)}
                activeOpacity={0.85}
              >
                <Image
                  source={require('./assets/icons/ic_share.png')}
                  style={{ width: 20, height: 20, marginRight: 6, tintColor: '#1A1A1A' }}
                  resizeMode="contain"
                />
                <Text style={styles.tagadaShareAppText}>WhatsApp শেয়ার</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.modalBtnCancel, { marginTop: 14 }]}
              onPress={() => setModalTagada(false)}
            >
              <Text style={styles.modalBtnCancelText}>বাতিল</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: BUSINESS NOTES & CHECKLIST
         =================================================================== */}
      <Modal visible={modalNotes} animationType="slide" transparent onRequestClose={() => setModalNotes(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>ব্যবসার নোট ও মেমো</Text>
              <TouchableOpacity onPress={() => setModalNotes(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 12 }}>
              <TextInput
                style={[styles.modalSimpleInput, { flex: 1, marginBottom: 0 }]}
                placeholder="নতুন নোট বা জরুরি কাজ লিখুন..."
                value={newNoteText}
                onChangeText={setNewNoteText}
              />
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.primary, width: 70 }]}
                onPress={handleAddNote}
              >
                <Text style={styles.modalBtnSubmitText}>যোগ</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 10 }}>
              {notes.map((n) => (
                <View key={n.id} style={styles.noteItemRow}>
                  <TouchableOpacity onPress={() => handleToggleNote(n.id)} style={{ paddingRight: 8 }}>
                    <Text style={{ fontSize: 18 }}>{n.isComplete ? '✓ সম্পন্ন' : '○ বাকি'}</Text>
                  </TouchableOpacity>
                  <Text style={[styles.noteItemText, n.isComplete && styles.noteItemTextDone]}>
                    {n.text}
                  </Text>
                  <TouchableOpacity onPress={() => handleDeleteNote(n.id)} style={{ paddingLeft: 8 }}>
                    <Image source={require('./assets/icons/ic_delete.png')} style={{ width: 16, height: 16 }} resizeMode="contain" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: PROFIT & LOSS CALCULATION
         =================================================================== */}
      <Modal visible={modalProfitLoss} animationType="slide" transparent onRequestClose={() => setModalProfitLoss(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>লাভ ও ক্ষতির হিসাব</Text>
              <TouchableOpacity onPress={() => setModalProfitLoss(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.profitLossContainer}>
              <View style={styles.plRow}>
                <Text style={styles.plLabel}>মোট বিক্রয় (নগদ + বাকি):</Text>
                <Text style={[styles.plVal, { color: COLORS.green }]}>৳ {formatMoney(todaySales + totalCustomerDue)}</Text>
              </View>
              <View style={styles.plRow}>
                <Text style={styles.plLabel}>মাল ক্রয় বাবদ দেনা/ব্যয়:</Text>
                <Text style={[styles.plVal, { color: COLORS.red }]}>৳ {formatMoney(totalSupplierDue)}</Text>
              </View>
              <View style={styles.plRow}>
                <Text style={styles.plLabel}>মোট দোকান পরিচালনা খরচ:</Text>
                <Text style={[styles.plVal, { color: COLORS.red }]}>৳ {formatMoney(todayCosts)}</Text>
              </View>
              <View style={styles.voucherDivider} />
              <View style={styles.plRow}>
                <Text style={[styles.plLabel, { fontSize: 16, fontWeight: 'bold' }]}>আনুমানিক নিট লাভ:</Text>
                <Text style={[styles.plVal, { fontSize: 18, fontWeight: 'bold', color: COLORS.primary }]}>
                  ৳ {formatMoney(Math.max(0, todaySales + totalCustomerDue - totalSupplierDue - todayCosts))}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={[styles.modalBtnCancel, { marginTop: 12 }]} onPress={() => setModalProfitLoss(false)}>
              <Text style={styles.modalBtnCancelText}>বন্ধ করুন</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: FULL ACCOUNTING REPORT
         =================================================================== */}
      <Modal visible={modalFullReport} animationType="slide" transparent onRequestClose={() => setModalFullReport(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>সার্বিক হিসাব স্টেটমেন্ট</Text>
              <TouchableOpacity onPress={() => setModalFullReport(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingVertical: 10 }}>
              <View style={styles.reportSummaryBox}>
                <View style={styles.reportItemRow}>
                  <Text style={styles.reportItemTitle}>মোট বাকি পাবো (কাস্টমার):</Text>
                  <Text style={[styles.reportItemValue, { color: COLORS.primary }]}>৳ {formatMoney(totalCustomerDue)}</Text>
                </View>
                <View style={styles.reportItemRow}>
                  <Text style={styles.reportItemTitle}>মোট দেনা দিবো (সাপ্লায়ার):</Text>
                  <Text style={[styles.reportItemValue, { color: COLORS.green }]}>৳ {formatMoney(totalSupplierDue)}</Text>
                </View>
                <View style={styles.reportItemRow}>
                  <Text style={styles.reportItemTitle}>ক্যাশ বাক্সে বর্তমান টাকা:</Text>
                  <Text style={[styles.reportItemValue, { color: COLORS.primary }]}>৳ {formatMoney(totalCash)}</Text>
                </View>
                <View style={styles.reportItemRow}>
                  <Text style={styles.reportItemTitle}>বিদ্যমান পণ্যের মোট স্টক মূল্য:</Text>
                  <Text style={[styles.reportItemValue, { color: COLORS.green }]}>৳ {formatMoney(totalStockCost)}</Text>
                </View>
                <View style={styles.voucherDivider} />
                <View style={styles.reportItemRow}>
                  <Text style={[styles.reportItemTitle, { fontWeight: 'bold' }]}>মোট ব্যবসা সম্পদ:</Text>
                  <Text style={[styles.reportItemValue, { fontWeight: 'bold', color: COLORS.primary }]}>
                    ৳ {formatMoney(totalCash + totalCustomerDue + totalStockCost)}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.blue, marginTop: 12 }]}
                onPress={() => {
                  const rep =
                    `=== ${businessName} - সার্বিক হিসাব রিপোর্ট ===\n` +
                    `তারিখ: ${getTodayDate()}\n` +
                    `---------------------------------\n` +
                    `মোট বাকি পাবো: ৳ ${formatMoney(totalCustomerDue)}\n` +
                    `মোট দেনা দিবো: ৳ ${formatMoney(totalSupplierDue)}\n` +
                    `ক্যাশ বাক্সে আছে: ৳ ${formatMoney(totalCash)}\n` +
                    `স্টক পণ্যের মূল্য: ৳ ${formatMoney(totalStockCost)}\n` +
                    `মোট ব্যবসার মোট সম্পদ: ৳ ${formatMoney(totalCash + totalCustomerDue + totalStockCost)}\n` +
                    `কাস্টমার সংখ্যা: ${accounts.filter((a) => a.type === 1).length} জন\n` +
                    `সাপ্লায়ার সংখ্যা: ${accounts.filter((a) => a.type === 2).length} জন\n` +
                    `যোগাযোগ: ${ownerPhone}`;
                  Share.share({ message: rep });
                }}
              >
                <Text style={styles.modalBtnSubmitText}>সম্পূর্ণ রিপোর্ট শেয়ার করুন</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: STORE & BUSINESS SETTINGS
         =================================================================== */}
      <Modal visible={modalSettings} animationType="slide" transparent onRequestClose={() => setModalSettings(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>দোকান ও ব্যবসা সেটিংস</Text>
              <TouchableOpacity onPress={() => setModalSettings(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingVertical: 10 }}>
              <Text style={styles.inputLabel}>ব্যবসা প্রতিষ্ঠান বা দোকানের নাম</Text>
              <TextInput
                style={styles.modalSimpleInput}
                value={businessName}
                onChangeText={setBusinessName}
              />
              <Text style={styles.inputLabel}>মালিকের নাম</Text>
              <TextInput
                style={styles.modalSimpleInput}
                value={ownerName}
                onChangeText={setOwnerName}
              />
              <Text style={styles.inputLabel}>মোবাইল নম্বর</Text>
              <TextInput
                style={styles.modalSimpleInput}
                value={ownerPhone}
                onChangeText={setOwnerPhone}
                keyboardType="phone-pad"
              />
              <Text style={styles.inputLabel}>দোকানের ঠিকানা</Text>
              <TextInput
                style={styles.modalSimpleInput}
                value={businessAddress}
                onChangeText={setBusinessAddress}
              />
              <Text style={styles.inputLabel}>প্রারম্ভিক ক্যাশ ব্যালেন্স (৳)</Text>
              <TextInput
                style={styles.modalSimpleInput}
                value={String(openingBalance)}
                onChangeText={(v) => setOpeningBalance(parseFloat(v) || 0)}
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.primary, marginTop: 10 }]}
                onPress={() => {
                  persistData();
                  setModalSettings(false);
                  Alert.alert('সফল', 'ব্যবসার তথ্য সফলভাবে সংরক্ষিত হয়েছে');
                }}
              >
                <Text style={styles.modalBtnSubmitText}>সংরক্ষণ করুন</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: OFFLINE BACKUP & RESTORE
         =================================================================== */}
      <Modal visible={modalBackupRestore} animationType="slide" transparent onRequestClose={() => setModalBackupRestore(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>১০০% অফলাইন ব্যাকআপ ও রিস্টোর</Text>
              <TouchableOpacity onPress={() => setModalBackupRestore(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>
              নিচের টেক্সট বক্সে আপনার খাতার সম্পূর্ণ ডাটা সংরক্ষিত আছে:
            </Text>
            <TextInput
              style={styles.backupTextArea}
              multiline
              value={backupJsonText}
              onChangeText={setBackupJsonText}
              placeholder="এখানে ব্যাকআপ JSON টেক্সট পেস্ট করুন..."
              placeholderTextColor={COLORS.textSubtle}
            />

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <TouchableOpacity
                style={[styles.backupBtn, { backgroundColor: COLORS.primary }]}
                onPress={handleExportBackup}
              >
                <Text style={styles.backupBtnText}>ব্যাকআপ তৈরি</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.backupBtn, { backgroundColor: COLORS.blue }]}
                onPress={handleShareBackup}
              >
                <Text style={styles.backupBtnText}>শেয়ার / কপি</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.backupBtn, { backgroundColor: COLORS.gold }]}
                onPress={handleImportBackup}
              >
                <Text style={styles.backupBtnText}>রিস্টোর করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: INBOX (ইনবক্স নোটিফিকেশন)
         =================================================================== */}
      <Modal visible={modalInbox} animationType="slide" transparent onRequestClose={() => setModalInbox(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '80%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>ইনবক্স ও নোটিফিকেশন</Text>
              <TouchableOpacity onPress={() => setModalInbox(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingVertical: 10 }}>
              <View style={styles.inboxItem}>
                <Text style={styles.inboxItemTitle}>টালিখাতা অফলাইন সংস্করণে স্বাগতম!</Text>
                <Text style={styles.inboxItemBody}>
                  আপনার অ্যাপটি সম্পূর্ণ ইন্টারনেট ছাড়া ১০০% অফলাইনে কাজ করে। কোনো মাসিক ফি বা সাবস্ক্রিপশন ছাড়াই আজীবন ব্যবহার করতে পারবেন।
                </Text>
                <Text style={styles.inboxItemDate}>{getTodayDate()}</Text>
              </View>

              <View style={styles.inboxItem}>
                <Text style={styles.inboxItemTitle}>ব্যাকআপ রাখার পরামর্শ</Text>
                <Text style={styles.inboxItemBody}>
                  প্রতি সপ্তাহে একবার মেনু থেকে "ডাটা ব্যাকআপ ও রিস্টোর" চেপে ব্যাকআপ কপি করে আপনার হোয়াটসঅ্যাপ বা ড্রাইভে রেখে দিন।
                </Text>
                <Text style={styles.inboxItemDate}>{getYesterdayDate()}</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: SUPPORT & AUTHENTIC APK FAQS
         =================================================================== */}
      <Modal visible={modalSupport} animationType="slide" transparent onRequestClose={() => setModalSupport(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>হেল্প ও সচরাচর প্রশ্ন</Text>
              <TouchableOpacity onPress={() => setModalSupport(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingVertical: 10 }}>
              <View style={[styles.supportBanner, { flexDirection: 'row', alignItems: 'center', padding: 14 }]}>
                <Image
                  source={require('./assets/customer_care_lady.png')}
                  style={{ width: 56, height: 56, borderRadius: 28, marginRight: 14 }}
                  resizeMode="contain"
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.supportBannerTitle}>টালিখাতা কাস্টমার সাপোর্ট</Text>
                  <TouchableOpacity onPress={() => Linking.openURL('tel:09612446677')}>
                    <Text style={{ fontSize: 15, color: COLORS.primary, fontWeight: 'bold', marginTop: 3 }}>
                      হটলাইন: ০৯৬১২-৪৪৬৬৭৭
                    </Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                    সকাল ৯টা - রাত ৯টা (ছুটির দিনসহ)
                  </Text>
                </View>
              </View>

              <Text style={[styles.sectionHeading, { marginTop: 14 }]}>ব্যবহার নির্দেশিকা (FAQ)</Text>
              {AUTHENTIC_FAQS.map((faq, idx) => (
                <View key={idx} style={styles.faqCard}>
                  <Text style={styles.faqQues}>{faq.q}</Text>
                  <Text style={styles.faqAns}>{faq.a}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: PIN SECURITY SETUP
         =================================================================== */}
      <Modal visible={modalPinSetup} animationType="slide" transparent onRequestClose={() => setModalPinSetup(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>পিন লক সেটিংস</Text>
              <TouchableOpacity onPress={() => setModalPinSetup(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: COLORS.textMuted, marginVertical: 8 }}>
              অ্যাপটি সুরক্ষিত রাখতে ৪ ডিজিটের গোপন পিন কোড সেট করুন:
            </Text>

            <TextInput
              style={styles.modalBigInput}
              placeholder="৪ ডিজিটের পিন"
              placeholderTextColor={COLORS.textSubtle}
              keyboardType="numeric"
              maxLength={4}
              value={appPin}
              onChangeText={setAppPin}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: pinEnabled ? COLORS.red : COLORS.primary, flex: 1 }]}
                onPress={() => {
                  if (!pinEnabled) {
                    if (appPin.length !== 4) {
                      Alert.alert('সতর্কতা', 'সঠিক ৪ ডিজিটের পিন দিন');
                      return;
                    }
                    setPinEnabled(true);
                    persistData({ pinEnabled: true, appPin });
                    Alert.alert('সফল', 'পিন লক চালু করা হয়েছে।');
                  } else {
                    setPinEnabled(false);
                    setAppPin('');
                    persistData({ pinEnabled: false, appPin: '' });
                    Alert.alert('বন্ধ', 'পিন লক বন্ধ করা হয়েছে।');
                  }
                  setModalPinSetup(false);
                }}
              >
                <Text style={styles.modalBtnSubmitText}>
                  {pinEnabled ? 'পিন লক বন্ধ করুন' : 'পিন লক চালু করুন'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 1. BUSINESS PICKER */}
      <Modal
        visible={modalBusinessPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setModalBusinessPicker(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.bottomSheetCard}>
            <View style={styles.bottomSheetHandle} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>ব্যবসা প্রতিষ্ঠান পরিবর্তন</Text>
              <TouchableOpacity onPress={() => setModalBusinessPicker(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 340, marginVertical: 8 }}>
              {(businesses || []).map((biz) => {
                const isSelected = biz.isSelected || biz.name === businessName;
                return (
                  <TouchableOpacity
                    key={biz.id}
                    style={[styles.bizPickerItem, isSelected && styles.bizPickerItemActive]}
                    onPress={() => {
                      handleSelectBusiness(biz);
                      setModalBusinessPicker(false);
                    }}
                  >
                    <View style={styles.bizPickerAvatar}>
                      <Image
                        source={require('./assets/ic_tally_khata_logo_reg.png')}
                        style={{ width: 28, height: 28 }}
                        resizeMode="contain"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bizPickerName}>{biz.name}</Text>
                      <Text style={styles.bizPickerSub}>{biz.owner || 'স্বত্বাধিকারী'} • {biz.phone || '01700000000'}</Text>
                      {biz.address ? <Text style={[styles.bizPickerSub, { fontSize: 11 }]}>{biz.address}</Text> : null}
                    </View>
                    <View style={[styles.bizPickerRadio, isSelected && styles.bizPickerRadioActive]}>
                      {isSelected ? <View style={styles.bizPickerRadioInner} /> : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.bizAddBtn}
              onPress={() => {
                setModalBusinessPicker(false);
                setModalAddBusiness(true);
              }}
            >
              <Text style={{ fontSize: 18, color: '#FFFFFF' }}>➕</Text>
              <Text style={styles.bizAddBtnText}>নতুন ব্যবসা প্রতিষ্ঠান যোগ করুন</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 2. ADD BUSINESS */}
      <Modal
        visible={modalAddBusiness}
        animationType="slide"
        transparent
        onRequestClose={() => setModalAddBusiness(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { padding: 18 }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>নতুন ব্যবসা প্রতিষ্ঠান</Text>
              <TouchableOpacity onPress={() => setModalAddBusiness(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>ব্যবসার নাম *</Text>
            <TextInput
              style={styles.modalSimpleInput}
              placeholder="যেমন: মেসার্স ভাই ভাই ট্রেডার্স"
              placeholderTextColor={COLORS.textSubtle}
              value={newBizName}
              onChangeText={setNewBizName}
            />

            <Text style={styles.inputLabel}>স্বত্বাধিকারীর নাম</Text>
            <TextInput
              style={styles.modalSimpleInput}
              placeholder="স্বত্বাধিকারীর নাম"
              placeholderTextColor={COLORS.textSubtle}
              value={newBizOwner}
              onChangeText={setNewBizOwner}
            />

            <Text style={styles.inputLabel}>মোবাইল নম্বর</Text>
            <TextInput
              style={styles.modalSimpleInput}
              placeholder="০১৭১১..."
              placeholderTextColor={COLORS.textSubtle}
              keyboardType="phone-pad"
              value={newBizPhone}
              onChangeText={setNewBizPhone}
            />

            <Text style={styles.inputLabel}>ব্যবসার ঠিকানা</Text>
            <TextInput
              style={styles.modalSimpleInput}
              placeholder="দোকান/বাজারের ঠিকানা"
              placeholderTextColor={COLORS.textSubtle}
              value={newBizAddress}
              onChangeText={setNewBizAddress}
            />

            <View style={[styles.modalBtnRow, { marginTop: 14 }]}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setModalAddBusiness(false)}
              >
                <Text style={styles.modalBtnCancelText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.primary }]}
                onPress={handleCreateBusiness}
              >
                <Text style={styles.modalBtnSubmitText}>সংরক্ষণ করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      {/* 3. BECHA KENA REPORT */}
      <Modal
        visible={modalBechaKena}
        animationType="slide"
        onRequestClose={() => setModalBechaKena(false)}
      >
        <SafeAreaView style={styles.reportContainer}>
          <View style={styles.reportHeader}>
            <TouchableOpacity onPress={() => setModalBechaKena(false)} style={styles.reportHeaderBack}>
              <Text style={styles.reportHeaderBackText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.reportHeaderTitle}>বেচাকেনা রিপোর্ট</Text>
            <TouchableOpacity
              style={styles.reportHeaderAction}
              onPress={() => {
                Share.share({
                  message: `${businessName} - বেচাকেনা রিপোর্ট`,
                });
              }}
            >
              <Text style={styles.reportHeaderActionText}>শেয়ার</Text>
            </TouchableOpacity>
          </View>

          {(() => {
            const cashBecha = (cashEntries || [])
              .filter((e) => e.category === 'sale')
              .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
            const cashKena = (cashEntries || [])
              .filter((e) => e.category === 'buy')
              .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
            const bakiBecha = (journals || [])
              .filter((j) => j.type === 'give')
              .reduce((sum, j) => sum + (Number(j.amount) || 0), 0);
            const bakiKena = (journals || [])
              .filter((j) => j.type === 'got')
              .reduce((sum, j) => sum + (Number(j.amount) || 0), 0);
            const totalBecha = cashBecha + bakiBecha;
            const totalKena = cashKena + bakiKena;

            const salesList = (cashEntries || [])
              .filter((e) => e.category === 'sale' || e.category === 'buy')
              .map((e) => ({
                id: e.id,
                title: e.desc || (e.category === 'sale' ? 'ক্যাশ বেচা' : 'ক্যাশ কেনা'),
                amount: e.amount,
                date: e.date,
                time: e.time,
                isSale: e.category === 'sale',
                tag: 'ক্যাশ',
              }));

            return (
              <ScrollView style={{ flex: 1 }}>
                <View style={styles.reportKpiRow}>
                  <View style={styles.reportKpiCard}>
                    <Text style={styles.reportKpiLabel}>মোট বেচা (ক্যাশ+বাকি)</Text>
                    <Text style={[styles.reportKpiValue, { color: COLORS.green }]}>
                      ৳ {formatMoney(totalBecha)}
                    </Text>
                  </View>
                  <View style={styles.reportKpiCard}>
                    <Text style={styles.reportKpiLabel}>মোট কেনা (ক্যাশ+বাকি)</Text>
                    <Text style={[styles.reportKpiValue, { color: COLORS.red }]}>
                      ৳ {formatMoney(totalKena)}
                    </Text>
                  </View>
                </View>

                <View style={styles.reportSubKpiRow}>
                  <View style={styles.reportSubKpiCard}>
                    <Text style={styles.reportSubKpiLabel}>ক্যাশ বেচা</Text>
                    <Text style={styles.reportSubKpiValue}>৳ {formatMoney(cashBecha)}</Text>
                  </View>
                  <View style={styles.reportSubKpiCard}>
                    <Text style={styles.reportSubKpiLabel}>বাকি বেচা</Text>
                    <Text style={styles.reportSubKpiValue}>৳ {formatMoney(bakiBecha)}</Text>
                  </View>
                  <View style={styles.reportSubKpiCard}>
                    <Text style={styles.reportSubKpiLabel}>নীট লাভ</Text>
                    <Text style={[styles.reportSubKpiValue, { color: totalBecha >= totalKena ? COLORS.green : COLORS.red }]}>
                      ৳ {formatMoney(totalBecha - totalKena)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.reportSectionTitle}>লেনদেন তালিকা</Text>
                {salesList.length === 0 ? (
                  <View style={{ alignItems: 'center', padding: 30 }}>
                    <Text style={{ color: COLORS.textMuted }}>কোনো লেনদেন রেকর্ড নেই</Text>
                  </View>
                ) : (
                  salesList.map((item, idx) => (
                    <View key={item.id || idx} style={styles.reportRowCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reportRowName}>{item.title}</Text>
                        <Text style={styles.reportRowSub}>{item.date} • {item.time || ''} • {item.tag}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.reportRowAmt, { color: item.isSale ? COLORS.green : COLORS.red }]}>
                          {item.isSale ? '+' : '-'} ৳ {formatMoney(item.amount)}
                        </Text>
                        <Text
                          style={[
                            styles.reportRowBadge,
                            {
                              backgroundColor: item.isSale ? '#DCFCE7' : '#FEE2E2',
                              color: item.isSale ? COLORS.green : COLORS.red,
                            },
                          ]}
                        >
                          {item.isSale ? 'বেচা' : 'কেনা'}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            );
          })()}
        </SafeAreaView>
      </Modal>

      {/* 4. BAKI REPORT */}
      <Modal
        visible={modalBakiReport}
        animationType="slide"
        onRequestClose={() => setModalBakiReport(false)}
      >
        <SafeAreaView style={styles.reportContainer}>
          <View style={styles.reportHeader}>
            <TouchableOpacity onPress={() => setModalBakiReport(false)} style={styles.reportHeaderBack}>
              <Text style={styles.reportHeaderBackText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.reportHeaderTitle}>বাকি রিপোর্ট (পাওনা ও দেনা)</Text>
            <TouchableOpacity
              style={styles.reportHeaderAction}
              onPress={() => {
                Share.share({
                  message: `${businessName} - বাকি রিপোর্ট\nমোট পাওনা: ৳ ${formatMoney(totalCustomerDue)}\nমোট দেনা: ৳ ${formatMoney(totalSupplierDue)}`,
                });
              }}
            >
              <Text style={styles.reportHeaderActionText}>শেয়ার</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.reportKpiRow}>
            <View style={styles.reportKpiCard}>
              <Text style={styles.reportKpiLabel}>মোট পাবো (কাস্টমার বাকি)</Text>
              <Text style={[styles.reportKpiValue, { color: COLORS.primary }]}>
                ৳ {formatMoney(totalCustomerDue)}
              </Text>
            </View>
            <View style={styles.reportKpiCard}>
              <Text style={styles.reportKpiLabel}>মোট দেবো (সাপ্লায়ার বাকি)</Text>
              <Text style={[styles.reportKpiValue, { color: COLORS.green }]}>
                ৳ {formatMoney(totalSupplierDue)}
              </Text>
            </View>
          </View>

          <View style={[styles.reportSubKpiRow, { paddingBottom: 6 }]}>
            <View style={styles.reportSubKpiCard}>
              <Text style={styles.reportSubKpiLabel}>বাকি কাস্টমার</Text>
              <Text style={styles.reportSubKpiValue}>
                {(accounts || []).filter((a) => a.type === 1 && a.balance > 0).length} জন
              </Text>
            </View>
            <View style={styles.reportSubKpiCard}>
              <Text style={styles.reportSubKpiLabel}>বকেয়া সাপ্লায়ার</Text>
              <Text style={styles.reportSubKpiValue}>
                {(accounts || []).filter((a) => a.type === 2 && a.balance > 0).length} জন
              </Text>
            </View>
            <View style={styles.reportSubKpiCard}>
              <Text style={styles.reportSubKpiLabel}>নীট পাওনা</Text>
              <Text style={[styles.reportSubKpiValue, { color: totalCustomerDue >= totalSupplierDue ? COLORS.primary : COLORS.green }]}>
                ৳ {formatMoney(totalCustomerDue - totalSupplierDue)}
              </Text>
            </View>
          </View>

          <ScrollView style={{ flex: 1 }}>
            <Text style={styles.reportSectionTitle}>কাস্টমারদের বকেয়া তালিকা</Text>
            {(accounts || []).filter((a) => a.type === 1 && a.balance > 0).length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: COLORS.textMuted }}>কোনো কাস্টমারের বাকি নেই</Text>
              </View>
            ) : (
              (accounts || [])
                .filter((a) => a.type === 1 && a.balance > 0)
                .map((a) => (
                  <View key={a.id} style={styles.reportRowCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reportRowName}>{a.name}</Text>
                      <Text style={styles.reportRowSub}>{a.phone || 'ফোন নম্বর নেই'} • {a.address || 'ঠিকানা নেই'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.reportRowAmt, { color: COLORS.primary }]}>
                        ৳ {formatMoney(a.balance)}
                      </Text>
                      <TouchableOpacity
                        style={{ marginTop: 4, backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}
                        onPress={() => {
                          setSelectedAccount(a);
                          setModalBakiReport(false);
                          setModalTagada(true);
                        }}
                      >
                        <Text style={{ fontSize: 11, color: COLORS.primary, fontWeight: 'bold' }}>তাগাদা পাঠান</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
            )}

            <Text style={[styles.reportSectionTitle, { marginTop: 10 }]}>সাপ্লায়ারদের বকেয়া তালিকা</Text>
            {(accounts || []).filter((a) => a.type === 2 && a.balance > 0).length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: COLORS.textMuted }}>কোনো সাপ্লায়ারের বকেয়া নেই</Text>
              </View>
            ) : (
              (accounts || [])
                .filter((a) => a.type === 2 && a.balance > 0)
                .map((a) => (
                  <View key={a.id} style={styles.reportRowCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reportRowName}>{a.name}</Text>
                      <Text style={styles.reportRowSub}>{a.phone || 'ফোন নম্বর নেই'} • {a.address || 'ঠিকানা নেই'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.reportRowAmt, { color: COLORS.green }]}>
                        ৳ {formatMoney(a.balance)}
                      </Text>
                      <Text style={[styles.reportRowBadge, { backgroundColor: '#DCFCE7', color: COLORS.green }]}>দেবো</Text>
                    </View>
                  </View>
                ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>


      {/* 5. CASH REPORT */}
      <Modal
        visible={modalCashReport}
        animationType="slide"
        onRequestClose={() => setModalCashReport(false)}
      >
        <SafeAreaView style={styles.reportContainer}>
          <View style={styles.reportHeader}>
            <TouchableOpacity onPress={() => setModalCashReport(false)} style={styles.reportHeaderBack}>
              <Text style={styles.reportHeaderBackText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.reportHeaderTitle}>ক্যাশ রিপোর্ট (ক্যাশবক্স হিসাব)</Text>
            <TouchableOpacity
              style={styles.reportHeaderAction}
              onPress={() => {
                Share.share({
                  message: `${businessName} - ক্যাশ রিপোর্ট\nবর্তমান ক্যাশ ব্যালেন্স: ৳ ${formatMoney(totalCash)}`,
                });
              }}
            >
              <Text style={styles.reportHeaderActionText}>শেয়ার</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }}>
            <View style={styles.reportKpiRow}>
              <View style={[styles.reportKpiCard, { backgroundColor: '#1E293B' }]}>
                <Text style={[styles.reportKpiLabel, { color: '#94A3B8' }]}>বর্তমান ক্যাশবক্স ব্যালেন্স</Text>
                <Text style={[styles.reportKpiValue, { color: '#FFFFFF', fontSize: 22 }]}>
                  ৳ {formatMoney(totalCash)}
                </Text>
              </View>
            </View>

            <View style={styles.reportKpiRow}>
              <View style={styles.reportKpiCard}>
                <Text style={styles.reportKpiLabel}>আজকের ক্যাশ ইন (+)</Text>
                <Text style={[styles.reportKpiValue, { color: COLORS.green }]}>
                  ৳ {formatMoney(todayCashIn)}
                </Text>
              </View>
              <View style={styles.reportKpiCard}>
                <Text style={styles.reportKpiLabel}>আজকের ক্যাশ আউট (-)</Text>
                <Text style={[styles.reportKpiValue, { color: COLORS.red }]}>
                  ৳ {formatMoney(todayCashOut)}
                </Text>
              </View>
            </View>

            <Text style={styles.reportSectionTitle}>ক্যাশবক্স খাত অনুযায়ী হিসাব</Text>
            <View style={{ paddingHorizontal: 14 }}>
              {[
                { name: 'ক্যাশ বেচা', type: 'in', cat: 'sale', color: COLORS.green },
                { name: 'ক্যাশ কেনা', type: 'out', cat: 'buy', color: COLORS.red },
                { name: 'দোকান খরচ', type: 'out', cat: 'cost', color: COLORS.red },
                { name: 'মালিক দিল (মূলধন)', type: 'in', cat: 'malik_in', color: COLORS.blue },
                { name: 'মালিক নিল (উত্তোলন)', type: 'out', cat: 'malik_out', color: '#D97706' },
              ].map((acc) => {
                const totalAcc = (cashEntries || [])
                  .filter((e) => e.category === acc.cat)
                  .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
                return (
                  <View key={acc.name} style={[styles.reportRowCard, { borderRadius: 8, marginVertical: 4 }]}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A' }}>{acc.name}</Text>
                    <Text style={{ fontSize: 15, fontWeight: 'bold', color: acc.color }}>
                      {acc.type === 'in' ? '+' : '-'} ৳ {formatMoney(totalAcc)}
                    </Text>
                  </View>
                );
              })}
            </View>

            <Text style={[styles.reportSectionTitle, { marginTop: 12 }]}>সর্বশেষ ক্যাশ লেনদেন</Text>
            {(cashEntries || []).length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: COLORS.textMuted }}>কোনো ক্যাশ এন্ট্রি নেই</Text>
              </View>
            ) : (
              (cashEntries || []).slice(0, 30).map((entry, index) => (
                <View key={entry.id || index} style={styles.reportRowCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reportRowName}>{entry.desc || entry.category || 'ক্যাশ লেনদেন'}</Text>
                    <Text style={styles.reportRowSub}>{entry.date} • {entry.time || ''}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.reportRowAmt, { color: entry.type === 'in' ? COLORS.green : COLORS.red }]}>
                      {entry.type === 'in' ? '+' : '-'} ৳ {formatMoney(entry.amount)}
                    </Text>
                    <Text
                      style={[
                        styles.reportRowBadge,
                        {
                          backgroundColor: entry.type === 'in' ? '#DCFCE7' : '#FEE2E2',
                          color: entry.type === 'in' ? COLORS.green : COLORS.red,
                        },
                      ]}
                    >
                      {entry.type === 'in' ? 'ক্যাশ ইন' : 'ক্যাশ আউট'}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* 6. EXPENSE REPORT */}
      <Modal
        visible={modalExpenseReport}
        animationType="slide"
        onRequestClose={() => setModalExpenseReport(false)}
      >
        <SafeAreaView style={styles.reportContainer}>
          <View style={styles.reportHeader}>
            <TouchableOpacity onPress={() => setModalExpenseReport(false)} style={styles.reportHeaderBack}>
              <Text style={styles.reportHeaderBackText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.reportHeaderTitle}>দোকান খরচ রিপোর্ট</Text>
            <TouchableOpacity
              style={styles.reportHeaderAction}
              onPress={() => {
                setCashCategory('cost');
                setCashType('out');
                setModalExpenseReport(false);
                setModalAddCash(true);
              }}
            >
              <Text style={styles.reportHeaderActionText}>+ খরচ লিখুন</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.reportKpiRow}>
            <View style={[styles.reportKpiCard, { backgroundColor: '#DC2626' }]}>
              <Text style={[styles.reportKpiLabel, { color: '#FEE2E2' }]}>মোট দোকান খরচ</Text>
              <Text style={[styles.reportKpiValue, { color: '#FFFFFF', fontSize: 24 }]}>
                ৳ {formatMoney(
                  (cashEntries || [])
                    .filter((e) => e.category === 'cost')
                    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
                )}
              </Text>
            </View>
          </View>

          <ScrollView style={{ flex: 1 }}>
            <Text style={styles.reportSectionTitle}>খরচের তালিকা</Text>
            {(cashEntries || []).filter((e) => e.category === 'cost').length === 0 ? (
              <View style={{ padding: 30, alignItems: 'center' }}>
                <Text style={{ color: COLORS.textMuted }}>কোনো খরচের হিসাব নেই</Text>
              </View>
            ) : (
              (cashEntries || [])
                .filter((e) => e.category === 'cost')
                .map((costItem, idx) => (
                  <View key={costItem.id || idx} style={styles.reportRowCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reportRowName}>{costItem.desc || 'দোকান খরচ'}</Text>
                      <Text style={styles.reportRowSub}>{costItem.date} • {costItem.time || ''}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.reportRowAmt, { color: COLORS.red }]}>
                        - ৳ {formatMoney(costItem.amount)}
                      </Text>
                      <Text style={[styles.reportRowBadge, { backgroundColor: '#FEE2E2', color: COLORS.red }]}>
                        খরচ
                      </Text>
                    </View>
                  </View>
                ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>


      {/* 7. MALIK REPORT */}
      <Modal
        visible={modalMalikReport}
        animationType="slide"
        onRequestClose={() => setModalMalikReport(false)}
      >
        <SafeAreaView style={styles.reportContainer}>
          <View style={styles.reportHeader}>
            <TouchableOpacity onPress={() => setModalMalikReport(false)} style={styles.reportHeaderBack}>
              <Text style={styles.reportHeaderBackText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.reportHeaderTitle}>মালিকের হিসাব (মূলধন ও ব্যক্তিগত)</Text>
            <TouchableOpacity
              style={styles.reportHeaderAction}
              onPress={() => {
                Share.share({
                  message: `${businessName} - মালিকের হিসাব`,
                });
              }}
            >
              <Text style={styles.reportHeaderActionText}>শেয়ার</Text>
            </TouchableOpacity>
          </View>

          {(() => {
            const malikIn = (cashEntries || [])
              .filter((e) => e.category === 'malik_in')
              .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
            const malikOut = (cashEntries || [])
              .filter((e) => e.category === 'malik_out')
              .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
            const malikNet = malikIn - malikOut;
            return (
              <ScrollView style={{ flex: 1 }}>
                <View style={styles.reportKpiRow}>
                  <View style={styles.reportKpiCard}>
                    <Text style={styles.reportKpiLabel}>মালিক দিল (মূলধন যোগ)</Text>
                    <Text style={[styles.reportKpiValue, { color: COLORS.blue }]}>
                      ৳ {formatMoney(malikIn)}
                    </Text>
                  </View>
                  <View style={styles.reportKpiCard}>
                    <Text style={styles.reportKpiLabel}>মালিক নিল (উত্তোলন)</Text>
                    <Text style={[styles.reportKpiValue, { color: '#D97706' }]}>
                      ৳ {formatMoney(malikOut)}
                    </Text>
                  </View>
                </View>

                <View style={[styles.reportSubKpiRow, { paddingBottom: 6 }]}>
                  <View style={[styles.reportSubKpiCard, { flex: 1 }]}>
                    <Text style={styles.reportSubKpiLabel}>মালিকের নীট ব্যালেন্স</Text>
                    <Text style={[styles.reportSubKpiValue, { fontSize: 16, color: malikNet >= 0 ? COLORS.blue : '#D97706' }]}>
                      ৳ {formatMoney(malikNet)} {malikNet >= 0 ? '(ব্যবসায় বিনিয়োগ)' : '(উত্তোলন)'}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 14, marginVertical: 8 }}>
                  <TouchableOpacity
                    style={[styles.modalBtnSubmit, { flex: 1, backgroundColor: COLORS.blue }]}
                    onPress={() => {
                      setCashCategory('malik_in');
                      setCashType('in');
                      setModalMalikReport(false);
                      setModalAddCash(true);
                    }}
                  >
                    <Text style={styles.modalBtnSubmitText}>+ মালিক দিল (মূলধন)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtnSubmit, { flex: 1, backgroundColor: '#D97706' }]}
                    onPress={() => {
                      setCashCategory('malik_out');
                      setCashType('out');
                      setModalMalikReport(false);
                      setModalAddCash(true);
                    }}
                  >
                    <Text style={styles.modalBtnSubmitText}>- মালিক নিল (উত্তোলন)</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.reportSectionTitle}>মালিকের লেনদেন ইতিহাস</Text>
                {(cashEntries || []).filter((e) => e.category === 'malik_in' || e.category === 'malik_out').length === 0 ? (
                  <View style={{ padding: 30, alignItems: 'center' }}>
                    <Text style={{ color: COLORS.textMuted }}>কোনো লেনদেন রেকর্ড নেই</Text>
                  </View>
                ) : (
                  (cashEntries || [])
                    .filter((e) => e.category === 'malik_in' || e.category === 'malik_out')
                    .map((mItem, idx) => (
                      <View key={mItem.id || idx} style={styles.reportRowCard}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.reportRowName}>
                            {mItem.category === 'malik_in' ? 'মালিক দিল (মূলধন)' : 'মালিক নিল (উত্তোলন)'}
                          </Text>
                          <Text style={styles.reportRowSub}>{mItem.date} • {mItem.time || ''} {mItem.desc ? `• ${mItem.desc}` : ''}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[styles.reportRowAmt, { color: mItem.category === 'malik_in' ? COLORS.blue : '#D97706' }]}>
                            {mItem.category === 'malik_in' ? '+' : '-'} ৳ {formatMoney(mItem.amount)}
                          </Text>
                          <Text
                            style={[
                              styles.reportRowBadge,
                              {
                                backgroundColor: mItem.category === 'malik_in' ? '#DBEAFE' : '#FEF3C7',
                                color: mItem.category === 'malik_in' ? COLORS.blue : '#D97706',
                              },
                            ]}
                          >
                            {mItem.category === 'malik_in' ? 'মূলধন' : 'উত্তোলন'}
                          </Text>
                        </View>
                      </View>
                    ))
                )}
              </ScrollView>
            );
          })()}
        </SafeAreaView>
      </Modal>

      {/* 8. MONEY OUT */}
      <Modal
        visible={modalMoneyOut}
        animationType="slide"
        transparent
        onRequestClose={() => setModalMoneyOut(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { padding: 18 }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>টাকা উত্তোলন / ট্রান্সফার</Text>
              <TouchableOpacity onPress={() => setModalMoneyOut(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.moneyOutBalCard}>
              <Text style={styles.moneyOutBalLabel}>বর্তমান টালিপে ব্যালেন্স</Text>
              <Text style={styles.moneyOutBalValue}>৳ {formatMoney(walletBalance)}</Text>
            </View>

            <Text style={styles.inputLabel}>ট্রান্সফার মেথড নির্বাচন করুন</Text>
            <View style={styles.moneyOutMethodGrid}>
              {[
                { id: 'bank', name: 'ব্যাংক একাউন্ট', icon: '🏦' },
                { id: 'bkash', name: 'বিকাশ', icon: '📱' },
                { id: 'nagad', name: 'নগদ', icon: '💸' },
              ].map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.moneyOutMethodCard, moneyOutMethod === m.id && styles.moneyOutMethodCardActive]}
                  onPress={() => setMoneyOutMethod(m.id)}
                >
                  <Text style={{ fontSize: 22 }}>{m.icon}</Text>
                  <Text style={[styles.moneyOutMethodText, moneyOutMethod === m.id && styles.moneyOutMethodTextActive]}>
                    {m.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>
              {moneyOutMethod === 'bank' ? 'ব্যাংক একাউন্ট নম্বর' : 'মোবাইল একাউন্ট নম্বর'}
            </Text>
            <TextInput
              style={styles.modalSimpleInput}
              placeholder={moneyOutMethod === 'bank' ? 'যেমন: ২০৫.১২০.XXXX' : 'যেমন: ০১৭XXXXXXXX'}
              placeholderTextColor={COLORS.textSubtle}
              keyboardType="numeric"
              value={moneyOutAccNumber}
              onChangeText={setMoneyOutAccNumber}
            />

            <Text style={styles.inputLabel}>উত্তোলনের পরিমাণ (টাকা) *</Text>
            <TextInput
              style={styles.modalBigInput}
              placeholder="৳ ০"
              placeholderTextColor={COLORS.textSubtle}
              keyboardType="numeric"
              value={moneyOutAmount}
              onChangeText={setMoneyOutAmount}
            />

            <View style={[styles.modalBtnRow, { marginTop: 14 }]}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setModalMoneyOut(false)}
              >
                <Text style={styles.modalBtnCancelText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.primary }]}
                onPress={handleMoneyOut}
              >
                <Text style={styles.modalBtnSubmitText}>ট্রান্সফার নিশ্চিত করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      {/* ===================================================================
          AUTHENTIC MODAL: TALLY MESSAGE (টালি-মেসেজ)
         =================================================================== */}
      <Modal
        visible={modalTallyMessage}
        animationType="slide"
        transparent
        onRequestClose={() => setModalTallyMessage(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Image
                  source={require('./assets/icons/grid_tally_msg.png')}
                  style={{ width: 28, height: 28, marginRight: 8 }}
                  resizeMode="contain"
                />
                <Text style={styles.modalCardTitle}>টালি-মেসেজ সার্ভিস</Text>
              </View>
              <TouchableOpacity onPress={() => setModalTallyMessage(false)}>
                <Image
                  source={require('./assets/icons/ic_close.png')}
                  style={{ width: 20, height: 20, tintColor: '#6B7280' }}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingVertical: 12 }}>
              {/* Quota Card */}
              <View style={{ backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#FCA5A5' }}>
                <Text style={{ fontSize: 13, color: '#991B1B', fontWeight: '600' }}>আপনার ফ্রি এসএমএস ব্যালেন্স</Text>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#B81414', marginVertical: 4 }}>
                  {toBengaliNumber(tallyMessageBalance)} টি অবশিষ্ট
                </Text>
                <Text style={{ fontSize: 12, color: '#6B7280' }}>
                  প্রতিটি লেনদেন ও তাগাদার সাথে স্বয়ংক্রিয়ভাবে কাস্টমারকে ফ্রি মেসেজ পাঠানো হয়।
                </Text>
              </View>

              {/* Message Bundles */}
              <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#111827', marginBottom: 10 }}>এসএমএস প্যাকেজ</Text>
              {[
                { count: 100, price: 50, tag: 'জনপ্রিয়' },
                { count: 250, price: 120, tag: 'বেস্ট ভ্যালু' },
                { count: 500, price: 220, tag: 'সুপার সেভার' },
                { count: 1000, price: 400, tag: 'বিগ সেভিং' },
              ].map((pkg, idx) => (
                <View
                  key={idx}
                  style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 8 }}
                >
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#111827' }}>{toBengaliNumber(pkg.count)} এসএমএস</Text>
                      <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 8 }}>
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#B45309' }}>{pkg.tag}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>মেয়াদ আজীবন • কোনো মেয়াদ নেই</Text>
                  </View>
                  <TouchableOpacity
                    style={{ backgroundColor: '#B81414', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 }}
                    onPress={() => {
                      setTallyMessageBalance(prev => prev + pkg.count);
                      Alert.alert('অভিনন্দন!', `${toBengaliNumber(pkg.count)} টি এসএমএস সফলভাবে আপনার অ্যাকাউন্টে যোগ হয়েছে।`);
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 }}>৳ {toBengaliNumber(pkg.price)}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>





    </SafeAreaView>
  );
}

// Wrap root component with crash-proof ErrorBoundary
export default function App() {
  return (
    <ErrorBoundary>
      <TallyKhataApp />
    </ErrorBoundary>
  );
}
