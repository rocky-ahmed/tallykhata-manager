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
              <Text style={styles.modalCardTitle}>🧾 ডিজিটাল ভাউচার (রশিদ)</Text>
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
                <Text style={styles.voucherBtnText}>📤 শেয়ার</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.voucherBtn, { backgroundColor: COLORS.gold }]}
                onPress={() => handleOpenEditTxn(selectedVoucherTxn)}
              >
                <Text style={styles.voucherBtnText}>✏️ সংশোধন</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.voucherBtn, { backgroundColor: COLORS.red }]}
                onPress={() => { if (selectedVoucherTxn?.id) handleDeleteTransaction(selectedVoucherTxn.id); }}
              >
                <Text style={styles.voucherBtnText}>🗑️ মুছুন</Text>
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
                {selectedAccount?.type === 1 ? '✏️ কাস্টমার তথ্য এডিট' : '✏️ সাপ্লায়ার তথ্য এডিট'}
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
                { key: 'sale', label: '🛒 ক্যাশ বেচা (+)' },
                { key: 'buy', label: '📦 ক্যাশ কেনা (-)' },
                { key: 'cost', label: '🧾 দোকান খরচ (-)' },
                { key: 'malik_in', label: '📥 মালিক দিল (+)' },
                { key: 'malik_out', label: '📤 মালিক নিল (-)' },
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
      <Modal visible={modalReconcileCash} animationType="slide" transparent onRequestClose={() => setModalReconcileCash(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>⚖️ দিনশেষে ক্যাশবক্স মিলানো</Text>
              <TouchableOpacity onPress={() => setModalReconcileCash(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.reconcileBox}>
              <View style={styles.reconcileRow}>
                <Text style={styles.reconcileLabel}>খাতার হিসাব অনুযায়ী ক্যাশ:</Text>
                <Text style={[styles.reconcileVal, { color: COLORS.primary }]}>৳ {formatMoney(totalCash)}</Text>
              </View>
              <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>
                আপনার ড্রয়ারে গুনে পাওয়া আসল ক্যাশ টাকার পরিমাণ নিচে লিখুন:
              </Text>
              <TextInput
                style={[styles.modalBigInput, { marginTop: 10 }]}
                placeholder="ড্রয়ারের আসল ক্যাশ টাকা"
                placeholderTextColor={COLORS.textSubtle}
                keyboardType="numeric"
                autoFocus
                value={countedCash}
                onChangeText={setCountedCash}
              />
              {countedCash ? (
                <View style={styles.reconcileResultBox}>
                  {(() => {
                    const counted = parseFloat(countedCash) || 0;
                    const diff = counted - totalCash;
                    if (diff === 0) {
                      return (
                        <Text style={{ color: COLORS.green, fontWeight: 'bold' }}>
                          ✅ কোনো গরমিল নেই! খাতার হিসাব এবং ড্রয়ারের টাকা পুরোপুরি মিলে গেছে।
                        </Text>
                      );
                    } else if (diff > 0) {
                      return (
                        <Text style={{ color: COLORS.blue, fontWeight: 'bold' }}>
                          ℹ️ ড্রয়ারে ৳ {formatMoney(diff)} টাকা বেশি রয়েছে।
                        </Text>
                      );
                    } else {
                      return (
                        <Text style={{ color: COLORS.red, fontWeight: 'bold' }}>
                          ⚠️ ড্রয়ারে ৳ {formatMoney(Math.abs(diff))} টাকা ঘাটতি রয়েছে!
                        </Text>
                      );
                    }
                  })()}
                </View>
              ) : null}
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalReconcileCash(false)}>
                <Text style={styles.modalBtnCancelText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, { backgroundColor: COLORS.primary }]}
                onPress={handleSaveReconciliation}
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
              <Text style={styles.modalCardTitle}>🔳 বাংলা QR কোড</Text>
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
                <Text style={styles.modalBtnSubmitText}>📤 শেয়ার কিউআর</Text>
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
              <Text style={styles.modalCardTitle}>💳 ওয়ালেটে অ্যাড মানি</Text>
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
              <Text style={styles.modalCardTitle}>📱 মোবাইল রিচার্জ</Text>
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
              <Text style={styles.modalCardTitle}>📦 স্টক ও পণ্য তালিকা</Text>
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
                        <Text style={{ fontSize: 14 }}>🗑️</Text>
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
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCardTitle}>📢 বকেয়া তাগাদা বার্তা</Text>
              <TouchableOpacity onPress={() => setModalTagada(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.tagadaMessageBox}>
              <Text style={styles.tagadaMessageContent}>{generateTagadaMessage(selectedAccount)}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.tagadaShareBtn, { backgroundColor: COLORS.blue }]}
                onPress={() => handleSendTagadaSMS(selectedAccount)}
              >
                <Text style={styles.tagadaShareBtnText}>📱 সাধারণ SMS</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tagadaShareBtn, { backgroundColor: COLORS.green }]}
                onPress={() => handleSendTagadaWhatsApp(selectedAccount)}
              >
                <Text style={styles.tagadaShareBtnText}>💬 WhatsApp</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.modalBtnCancel, { marginTop: 12 }]}
              onPress={() => setModalTagada(false)}
            >
              <Text style={styles.modalBtnCancelText}>বন্ধ করুন</Text>
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
              <Text style={styles.modalCardTitle}>📝 ব্যবসার নোট ও মেমো</Text>
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
                    <Text style={{ fontSize: 18 }}>{n.isComplete ? '✅' : '⬜'}</Text>
                  </TouchableOpacity>
                  <Text style={[styles.noteItemText, n.isComplete && styles.noteItemTextDone]}>
                    {n.text}
                  </Text>
                  <TouchableOpacity onPress={() => handleDeleteNote(n.id)} style={{ paddingLeft: 8 }}>
                    <Text style={{ fontSize: 14 }}>🗑️</Text>
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
              <Text style={styles.modalCardTitle}>📈 লাভ ও ক্ষতির হিসাব</Text>
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
              <Text style={styles.modalCardTitle}>📊 সার্বিক হিসাব স্টেটমেন্ট</Text>
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
                <Text style={styles.modalBtnSubmitText}>📤 সম্পূর্ণ রিপোর্ট শেয়ার করুন</Text>
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
              <Text style={styles.modalCardTitle}>🏪 দোকান ও ব্যবসা সেটিংস</Text>
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
              <Text style={styles.modalCardTitle}>💾 ১০০% অফলাইন ব্যাকআপ ও রিস্টোর</Text>
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
                <Text style={styles.backupBtnText}>📥 ব্যাকআপ তৈরি</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.backupBtn, { backgroundColor: COLORS.blue }]}
                onPress={handleShareBackup}
              >
                <Text style={styles.backupBtnText}>📤 শেয়ার / কপি</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.backupBtn, { backgroundColor: COLORS.gold }]}
                onPress={handleImportBackup}
              >
                <Text style={styles.backupBtnText}>📥 রিস্টোর করুন</Text>
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
              <Text style={styles.modalCardTitle}>🔔 ইনবক্স ও নোটিফিকেশন</Text>
              <TouchableOpacity onPress={() => setModalInbox(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingVertical: 10 }}>
              <View style={styles.inboxItem}>
                <Text style={styles.inboxItemTitle}>🎉 টালিখাতা অফলাইন সংস্করণে স্বাগতম!</Text>
                <Text style={styles.inboxItemBody}>
                  আপনার অ্যাপটি সম্পূর্ণ ইন্টারনেট ছাড়া ১০০% অফলাইনে কাজ করে। কোনো মাসিক ফি বা সাবস্ক্রিপশন ছাড়াই আজীবন ব্যবহার করতে পারবেন।
                </Text>
                <Text style={styles.inboxItemDate}>{getTodayDate()}</Text>
              </View>

              <View style={styles.inboxItem}>
                <Text style={styles.inboxItemTitle}>💾 ব্যাকআপ রাখার পরামর্শ</Text>
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
              <Text style={styles.modalCardTitle}>🎧 হেল্প ও সচরাচর প্রশ্ন</Text>
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
                      📞 হটলাইন: ০৯৬১২-৪৪৬৬৭৭
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
              <Text style={styles.modalCardTitle}>🔒 পিন লক সেটিংস</Text>
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
