import sys

sys.stdout.reconfigure(encoding='utf-8')

# 1. Update part3_views_and_tabs.js
with open('part3_views_and_tabs.js', 'r', encoding='utf-8') as f:
    p3 = f.read()

# Header store icon with authentic TallyKhata registered logo
old_header_icon = """          <Text style={styles.headerStoreIcon}>🏪</Text>"""
new_header_icon = """          <View style={styles.headerStoreIcon}>
            <Image
              source={require('./assets/ic_tally_khata_logo_reg.png')}
              style={{ width: 24, height: 24 }}
              resizeMode="contain"
            />
          </View>"""
p3 = p3.replace(old_header_icon, new_header_icon)

# Header gold badge with authentic premium user badge
old_gold_badge = """              {isGold ? (
                <View style={styles.headerGoldBadge}>
                  <Text style={styles.headerGoldBadgeText}>গোল্ড</Text>
                </View>
              ) : null}"""
new_gold_badge = """              {isGold ? (
                <View style={styles.headerGoldBadge}>
                  <Image
                    source={require('./assets/ic_premium_users.png')}
                    style={{ width: 14, height: 14, marginRight: 3 }}
                    resizeMode="contain"
                  />
                  <Text style={styles.headerGoldBadgeText}>গোল্ড</Text>
                </View>
              ) : null}"""
p3 = p3.replace(old_gold_badge, new_gold_badge)

# Empty home accounts illustration with authentic APK illustration
old_empty_accounts = """                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIcon}>🔍</Text>
                  <Text style={styles.emptyText}>কোনো খাতা পাওয়া যায়নি</Text>
                  <Text style={styles.emptySubText}>নিচের বাটন চেপে নতুন কাস্টমার বা সাপ্লায়ার যোগ করুন</Text>
                </View>"""
new_empty_accounts = """                <View style={styles.emptyContainer}>
                  <Image
                    source={require('./assets/ic_no_txn_img_customer.png')}
                    style={{ width: 140, height: 140, marginBottom: 12 }}
                    resizeMode="contain"
                  />
                  <Text style={styles.emptyText}>কোনো খাতা পাওয়া যায়নি</Text>
                  <Text style={styles.emptySubText}>নিচের বাটন চেপে নতুন কাস্টমার বা সাপ্লায়ার যোগ করুন</Text>
                </View>"""
p3 = p3.replace(old_empty_accounts, new_empty_accounts)

# TallyPay Wallet Card with authentic TallyPay logo & Bangla QR icon
old_tp_wallet_card = """            {/* Wallet Balance Card */}
            <View style={styles.walletCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={styles.walletCardSub}>টালিপে মার্চেন্ট ওয়ালেট</Text>
                  <Text style={styles.walletBalanceDisplay}>৳ {formatMoney(walletBalance)}</Text>
                  <Text style={styles.walletMerchantId}>মার্চেন্ট আইডি: TP-{ownerPhone}</Text>
                </View>
                <TouchableOpacity
                  style={styles.qrCodeBtn}
                  onPress={() => setModalBanglaQR(true)}
                >
                  <Text style={{ fontSize: 28 }}>🔳</Text>
                  <Text style={styles.qrCodeBtnText}>বাংলা QR</Text>
                </TouchableOpacity>
              </View>
            </View>"""

new_tp_wallet_card = """            {/* Wallet Balance Card */}
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
            </View>"""
p3 = p3.replace(old_tp_wallet_card, new_tp_wallet_card)

# Menu profile store avatar
old_menu_avatar = """              <View style={styles.menuStoreAvatar}>
                <Text style={{ fontSize: 24, color: COLORS.white }}>🏪</Text>
              </View>"""
new_menu_avatar = """              <View style={styles.menuStoreAvatar}>
                <Image
                  source={require('./assets/ic_tally_khata_logo_reg.png')}
                  style={{ width: 34, height: 34 }}
                  resizeMode="contain"
                />
              </View>"""
p3 = p3.replace(old_menu_avatar, new_menu_avatar)

with open('part3_views_and_tabs.js', 'w', encoding='utf-8') as f:
    f.write(p3)
print('part3_views_and_tabs.js updated with authentic UI assets!')


# 2. Update part4_modals_and_screens.js
with open('part4_modals_and_screens.js', 'r', encoding='utf-8') as f:
    p4 = f.read()

# Bangla QR Modal: Authentic Bangla QR graphic
old_qr_box = """            {/* QR Code Container */}
            <View style={styles.qrDisplayContainer}>
              <Text style={{ fontSize: 130 }}>🔳</Text>
              <View style={styles.qrCenterBadge}>
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 }}>
                  বাংলা QR • {businessName}
                </Text>
              </View>
              <Text style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 8 }}>
                মার্চেন্ট আইডি: TP-{ownerPhone}
              </Text>
            </View>"""

new_qr_box = """            {/* QR Code Container */}
            <View style={styles.qrDisplayContainer}>
              <Image
                source={require('./assets/ic_bangla_qr.png')}
                style={{ width: 170, height: 170 }}
                resizeMode="contain"
              />
              <View style={styles.qrCenterBadge}>
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 }}>
                  বাংলা QR • {businessName}
                </Text>
              </View>
              <Text style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 8 }}>
                মার্চেন্ট আইডি: TP-{ownerPhone}
              </Text>
              <Text style={{ fontSize: 12, color: COLORS.green, fontWeight: 'bold', marginTop: 4 }}>
                ✓ বাংলাদেশ ব্যাংক অনুমোদিত সুপার কিউআর
              </Text>
            </View>"""
p4 = p4.replace(old_qr_box, new_qr_box)

# Add Money Modal: Real Bank & MFS logos
old_add_money_methods = """            <Text style={styles.inputLabel}>পেমেন্ট মেথড নির্বাচন করুন</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginVertical: 8 }}>
              {['bKash', 'Nagad', 'Rocket', 'Bank Card'].map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.paymentMethodChip,
                    addMoneyMethod === m && styles.paymentMethodChipActive,
                  ]}
                  onPress={() => setAddMoneyMethod(m)}
                >
                  <Text
                    style={[
                      styles.paymentMethodChipText,
                      addMoneyMethod === m && styles.paymentMethodChipTextActive,
                    ]}
                  >
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>"""

new_add_money_methods = """            <Text style={styles.inputLabel}>পেমেন্ট মেথড নির্বাচন করুন</Text>
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
p4 = p4.replace(old_add_money_methods, new_add_money_methods)

# Mobile Recharge Modal: Real Operator logos
old_recharge_ops = """            <Text style={styles.inputLabel}>মোবাইল অপারেটর</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 8 }}>
              {['Grameenphone', 'Banglalink', 'Robi', 'Airtel', 'Teletalk'].map((op) => (
                <TouchableOpacity
                  key={op}
                  style={[
                    styles.paymentMethodChip,
                    rechargeOperator === op && styles.paymentMethodChipActive,
                  ]}
                  onPress={() => setRechargeOperator(op)}
                >
                  <Text
                    style={[
                      styles.paymentMethodChipText,
                      rechargeOperator === op && styles.paymentMethodChipTextActive,
                    ]}
                  >
                    {op}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>"""

new_recharge_ops = """            <Text style={styles.inputLabel}>মোবাইল অপারেটর নির্বাচন করুন</Text>
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
p4 = p4.replace(old_recharge_ops, new_recharge_ops)

# Support & FAQs: Real Customer Care representative & Hotline
old_support_banner = """            <View style={styles.supportBanner}>
              <Text style={styles.supportBannerTitle}>২৪/৭ কাস্টমার সাপোর্ট</Text>
              <Text style={styles.supportBannerSub}>
                যে কোনো সহায়তায় আমাদের টোল-ফ্রি হেল্পলাইনে কল করুন: 09612-446677
              </Text>
            </View>"""

new_support_banner = """            <View style={[styles.supportBanner, { flexDirection: 'row', alignItems: 'center', padding: 14 }]}>
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
p4 = p4.replace(old_support_banner, new_support_banner)

# Digital Voucher: Authentic TallyKhata logo in header
old_voucher_hdr = """              <View style={styles.voucherHeader}>
                <Text style={styles.voucherBizName}>{businessName}</Text>"""
new_voucher_hdr = """              <View style={styles.voucherHeader}>
                <Image
                  source={require('./assets/ic_tally_khata_logo_reg.png')}
                  style={{ width: 44, height: 44, marginBottom: 6 }}
                  resizeMode="contain"
                />
                <Text style={styles.voucherBizName}>{businessName}</Text>"""
p4 = p4.replace(old_voucher_hdr, new_voucher_hdr)

with open('part4_modals_and_screens.js', 'w', encoding='utf-8') as f:
    f.write(p4)
print('part4_modals_and_screens.js updated with authentic UI assets!')
