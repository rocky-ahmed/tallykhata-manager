import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('part4_modals_and_screens.js', 'r', encoding='utf-8') as f:
    content = f.read()

modal_tally_msg_code = '''
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
'''

if 'modalTallyMessage' not in content:
    idx = content.rfind('modalMoneyOut')
    end_modal = content.find('</Modal>', idx) + len('</Modal>')
    content = content[:end_modal] + '\n\n' + modal_tally_msg_code + content[end_modal:]

with open('part4_modals_and_screens.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('part4_modals_and_screens.js updated successfully!')
