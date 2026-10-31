const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

const oldCustomerRenderItem = `              renderItem={({ item, index }) => {
                const avatar = getAvatarInfo(item.name, index);
                return (
                  <TouchableOpacity
                    style={[styles.customerListCard, isDark && tStyles.customerListCard]}
                    onPress={() => {
                      setSelectedAccount(item);
                      setCurrentScreen('account_ledger');
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.customerAvatarCircle, { backgroundColor: avatar.bg }]}>
                      <Text style={[styles.customerAvatarText, { color: avatar.color }]}>{avatar.text}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.customerCardName, isDark && tStyles.textPrimary]} numberOfLines={1}>{item.name}</Text>
                      <Text style={[styles.customerCardTime, isDark && tStyles.textSecondary]}>{item.timeAgo || tStatic("৩ মাস")}</Text>
                    </View>
                    <Text style={[styles.customerCardAmount, { color: item.balance > 0 ? (isDark ? currentTheme.danger : '#B81414') : item.balance < 0 ? (isDark ? currentTheme.success : '#1C7D50') : (isDark ? currentTheme.textPrimary : '#111827') }]}>
                      {toBengaliDecimal(item.balance)}
                    </Text>
                    <Image source={require('./assets/icons/arrow_right.png')} style={[styles.customerChevron, isDark && { tintColor: currentTheme.textSecondary }]} resizeMode="contain" />
                  </TouchableOpacity>
                );
              }}`;

const newCustomerRenderItem = `              renderItem={({ item, index }) => {
                const avatar = getAvatarInfo(item.name, index);
                return (
                  <TouchableOpacity
                    style={[styles.customerListCard, isDark && tStyles.customerListCard]}
                    onPress={() => {
                      setSelectedAccount(item);
                      setCurrentScreen('account_ledger');
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.customerAvatarCircle, { backgroundColor: avatar.bg }]}>
                      <Text style={[styles.customerAvatarText, { color: avatar.color }]}>{avatar.text}</Text>
                    </View>
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                      <Text style={[styles.customerCardName, isDark && tStyles.textPrimary]} numberOfLines={1}>{item.name}</Text>
                      <Text style={[styles.customerCardTime, isDark && tStyles.textSecondary]}>{item.timeAgo || tStatic("৩ মাস")}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', justifyContent: 'center', marginRight: 4 }}>
                      <Text style={[styles.customerCardAmount, { color: item.balance > 0 ? (isDark ? currentTheme.danger : '#B81414') : item.balance < 0 ? (isDark ? currentTheme.success : '#059669') : (isDark ? currentTheme.textPrimary : '#111827') }]}>
                        {toBengaliDecimal(item.balance)}
                      </Text>
                      {item.balance > 0 ? (
                        <View style={[styles.dueTagBadge, { backgroundColor: isDark ? '#450A0A' : '#FEE2E2', borderColor: isDark ? '#7F1D1D' : '#FECACA' }]}>
                          <Text style={[styles.dueTagText, { color: isDark ? '#FCA5A5' : '#B81414' }]}>{tStatic("বাকি")}</Text>
                        </View>
                      ) : item.balance < 0 ? (
                        <View style={[styles.dueTagBadge, { backgroundColor: isDark ? '#064E3B' : '#DCFCE7', borderColor: isDark ? '#065F46' : '#BBF7D0' }]}>
                          <Text style={[styles.dueTagText, { color: isDark ? '#6EE7B7' : '#059669' }]}>{tStatic("অগ্রিম")}</Text>
                        </View>
                      ) : (
                        <View style={[styles.dueTagBadge, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: isDark ? '#334155' : '#CBD5E1' }]}>
                          <Text style={[styles.dueTagText, { color: isDark ? '#94A3B8' : '#64748B' }]}>{tStatic("পরিশোধ")}</Text>
                        </View>
                      )}
                    </View>
                    <Image source={require('./assets/icons/arrow_right.png')} style={[styles.customerChevron, isDark && { tintColor: currentTheme.textSecondary }]} resizeMode="contain" />
                  </TouchableOpacity>
                );
              }}`;

if (code.includes(oldCustomerRenderItem)) {
  code = code.replace(oldCustomerRenderItem, newCustomerRenderItem);
  fs.writeFileSync('App.js', code, 'utf8');
  console.log('[PASS] SCR-02 & SCR-03 Customer list updated successfully');
} else {
  console.error('[FAIL] Could not match oldCustomerRenderItem');
  process.exit(1);
}
