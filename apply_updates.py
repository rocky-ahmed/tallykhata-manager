import sys

sys.stdout.reconfigure(encoding='utf-8')

# 1. Update part2_state_and_handlers.js
with open('part2_state_and_handlers.js', 'r', encoding='utf-8') as f:
    p2 = f.read()

p2 = p2.replace(
    '  const handleSaveTransaction = () => {\n    const amt = safeEvalCalc(calcExpr);',
    '  const handleSaveTransaction = () => {\n    if (!selectedAccount) return;\n    const amt = safeEvalCalc(calcExpr);'
)

p2 = p2.replace(
    '  const handleUpdateTransaction = () => {\n    const amt = parseFloat(editAmount);',
    '  const handleUpdateTransaction = () => {\n    if (!selectedAccount) return;\n    const amt = parseFloat(editAmount);'
)

p2 = p2.replace(
    '  const handleDeleteTransaction = (txnId) => {\n    Alert.alert(',
    '  const handleDeleteTransaction = (txnId) => {\n    if (!selectedAccount) return;\n    Alert.alert('
)

old_del_acc = """  const handleDeleteAccount = () => {
    Alert.alert("""

new_edit_and_del_acc = """  const handleOpenEditAccount = () => {
    if (!selectedAccount) return;
    setAccName(selectedAccount.name || '');
    setAccPhone(selectedAccount.phone || '');
    setAccAddress(selectedAccount.address || '');
    setModalEditAccount(true);
  };

  const handleUpdateAccount = () => {
    if (!selectedAccount) return;
    if (!accName.trim()) {
      Alert.alert('সতর্কতা', 'দয়া করে নাম লিখুন');
      return;
    }
    const updated = {
      ...selectedAccount,
      name: accName.trim(),
      phone: accPhone.trim(),
      address: accAddress.trim(),
    };
    const updatedList = accounts.map((a) => (a.id === selectedAccount.id ? updated : a));
    setSelectedAccount(updated);
    setAccounts(updatedList);
    persistData({ accounts: updatedList });
    setModalEditAccount(false);
    Alert.alert('সফল', 'হিসাবের তথ্য সফলভাবে আপডেট হয়েছে।');
  };

  const handleDeleteAccount = () => {
    if (!selectedAccount) return;
    Alert.alert("""

p2 = p2.replace(old_del_acc, new_edit_and_del_acc)

p2 = p2.replace(
    "            persistData({ accounts: updatedAccounts, journals: updatedJournals });\n            setCurrentScreen('home');",
    "            setSelectedAccount(null);\n            persistData({ accounts: updatedAccounts, journals: updatedJournals });\n            setCurrentScreen('home');"
)

p2 = p2.replace(
    '  const handleAdjustStock = () => {\n    const qty = parseFloat(stockAdjustQty);',
    '  const handleAdjustStock = () => {\n    if (!selectedProduct) return;\n    const qty = parseFloat(stockAdjustQty);'
)

with open('part2_state_and_handlers.js', 'w', encoding='utf-8') as f:
    f.write(p2)
print('part2_state_and_handlers.js updated successfully!')

# 2. Update part3_views_and_tabs.js
with open('part3_views_and_tabs.js', 'r', encoding='utf-8') as f:
    p3 = f.read()

old_ledger_header_actions = """            {isCustomer ? (
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => setModalTagada(true)}
              >
                <Text style={{ fontSize: 16 }}>📢</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.deleteAccBtn} onPress={handleDeleteAccount}>"""

new_ledger_header_actions = """            {isCustomer ? (
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
            <TouchableOpacity style={styles.deleteAccBtn} onPress={handleDeleteAccount}>"""

p3 = p3.replace(old_ledger_header_actions, new_ledger_header_actions)

with open('part3_views_and_tabs.js', 'w', encoding='utf-8') as f:
    f.write(p3)
print('part3_views_and_tabs.js updated successfully!')

# 3. Update part4_modals_and_screens.js
with open('part4_modals_and_screens.js', 'r', encoding='utf-8') as f:
    p4 = f.read()

p4 = p4.replace(
    'onPress={() => handleDeleteTransaction(selectedVoucherTxn.id)}',
    'onPress={() => { if (selectedVoucherTxn?.id) handleDeleteTransaction(selectedVoucherTxn.id); }}'
)

modal_edit_acc_code = """      {/* ===================================================================
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
          MODAL: CREATE ACCOUNT (CUSTOMER / SUPPLIER)"""

p4 = p4.replace(
    '      {/* ===================================================================\n          MODAL: CREATE ACCOUNT (CUSTOMER / SUPPLIER)',
    modal_edit_acc_code
)

with open('part4_modals_and_screens.js', 'w', encoding='utf-8') as f:
    f.write(p4)
print('part4_modals_and_screens.js updated successfully!')
