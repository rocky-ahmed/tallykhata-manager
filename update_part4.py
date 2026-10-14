import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('part4_modals_and_screens.js', 'r', encoding='utf-8') as f:
    p4 = f.read()

# 1. Voucher Header
old_vhdr = """                <View style={styles.voucherHeader}>
                  <Text style={styles.voucherBizName}>{businessName}</Text>"""
new_vhdr = """                <View style={styles.voucherHeader}>
                  <Image
                    source={require('./assets/ic_tally_khata_logo_reg.png')}
                    style={{ width: 44, height: 44, marginBottom: 6 }}
                    resizeMode="contain"
                  />
                  <Text style={styles.voucherBizName}>{businessName}</Text>"""
p4 = p4.replace(old_vhdr, new_vhdr)

# 2. QR Display
old_qr = """            {/* QR Visual Card */}
            <View style={styles.qrDisplayContainer}>
              <Text style={{ fontSize: 90 }}>📱</Text>
              <Text style={styles.qrCenterBadge}>বাংলা QR</Text>
            </View>"""
new_qr = """            {/* QR Visual Card */}
            <View style={styles.qrDisplayContainer}>
              <Image
                source={require('./assets/ic_bangla_qr.png')}
                style={{ width: 170, height: 170 }}
                resizeMode="contain"
              />
              <Text style={styles.qrCenterBadge}>বাংলা QR • {businessName}</Text>
            </View>"""
p4 = p4.replace(old_qr, new_qr)

# 3. Add Money Methods
old_add = """            <Text style={styles.inputLabel}>পেমেন্ট মেথড নির্বাচন করুন</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginVertical: 8 }}>
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
            </View>"""
new_add = """            <Text style={styles.inputLabel}>পেমেন্ট মেথড নির্বাচন করুন</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {[
                  { id: 'bKash', name: 'বিকাশ', img: require('./assets/banks/bkash90px.png') },
                  { id: 'Rocket', name: 'রকেট', img: require('./assets/banks/ic_rocket_rounded.png') },
                  { id: 'SureCash', name: 'শিওরক্যাশ', img: require('./assets/banks/ic_sure_cash.png') },
                  { id: 'NexusPay', name: 'নেক্সাস পে', img: require('./assets/banks/ic_dbbl_nexuspay.png') },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.paymentMethodChip,
                      addMoneyMethod === item.id && styles.paymentMethodChipActive,
                      { alignItems: 'center', paddingVertical: 10, minWidth: 90 },
                    ]}
                    onPress={() => setAddMoneyMethod(item.id)}
                  >
                    <Image
                      source={item.img}
                      style={{ width: 34, height: 34, marginBottom: 4 }}
                      resizeMode="contain"
                    />
                    <Text
                      style={[
                        styles.paymentMethodChipText,
                        addMoneyMethod === item.id && styles.paymentMethodChipTextActive,
                      ]}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>"""
p4 = p4.replace(old_add, new_add)

# 4. Mobile Recharge Operators
old_rec = """            <Text style={styles.inputLabel}>মোবাইল অপারেটর</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 8 }}>
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
            </View>"""
new_rec = """            <Text style={styles.inputLabel}>মোবাইল অপারেটর নির্বাচন করুন</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {[
                  { id: 'Grameenphone', name: 'গ্রামীনফোন', img: require('./assets/operators/mobile_operator_grameenphone.webp') },
                  { id: 'Banglalink', name: 'বাংলালিংক', img: require('./assets/operators/mobile_operator_banglalink.png') },
                  { id: 'Robi', name: 'রবি', img: require('./assets/operators/mobile_operator_robi.webp') },
                  { id: 'Airtel', name: 'এয়ারটেল', img: require('./assets/operators/mobile_operator_airtel.png') },
                  { id: 'Teletalk', name: 'টেলিটক', img: require('./assets/operators/mobile_operator_teletalk.webp') },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.paymentMethodChip,
                      rechargeOperator === item.id && styles.paymentMethodChipActive,
                      { alignItems: 'center', paddingVertical: 10, minWidth: 80 },
                    ]}
                    onPress={() => setRechargeOperator(item.id)}
                  >
                    <Image
                      source={item.img}
                      style={{ width: 36, height: 36, marginBottom: 4 }}
                      resizeMode="contain"
                    />
                    <Text
                      style={[
                        styles.paymentMethodChipText,
                        rechargeOperator === item.id && styles.paymentMethodChipTextActive,
                      ]}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>"""
p4 = p4.replace(old_rec, new_rec)

# 5. Support Banner
old_sup = """              <View style={styles.supportBanner}>
                <Text style={styles.supportBannerTitle}>যে কোনো প্রয়োজনে আমরা আছি আপনার পাশে</Text>
                <Text style={styles.supportBannerSub}>টালিখাতা কাস্টমার কেয়ার হেল্পলাইন: ১৬৭২৬ (সকাল ৯টা - রাত ৯টা)</Text>
              </View>"""
new_sup = """              <View style={[styles.supportBanner, { flexDirection: 'row', alignItems: 'center', padding: 14 }]}>
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
              </View>"""
p4 = p4.replace(old_sup, new_sup)

with open('part4_modals_and_screens.js', 'w', encoding='utf-8') as f:
    f.write(p4)
print('part4_modals_and_screens.js updated with authentic assets successfully!')
