import sys, re
sys.stdout.reconfigure(encoding="utf-8")

with open("App.js", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Replace modalBackupRestore's Google Drive Tab JSX
old_cloud_tab_pattern = r'\{backupActiveTab === \'cloud\' \? \(.*?\n              \) : \(\n                /\* --- TAB 2: OFFLINE FILE BACKUP --- \*/'

new_cloud_tab_jsx = """{backupActiveTab === 'cloud' ? (
                <View>
                  {/* Account Connection Status Header */}
                  {googleUser ? (
                    <View style={styles.cloudAccountBanner}>
                      <View style={styles.cloudAvatarCircle}>
                        <Text style={styles.cloudAvatarText}>
                          {(googleUser.name || googleUser.email || 'G').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={styles.cloudAccountName}>{googleUser.name || 'গুগল ব্যবহারকারী'}</Text>
                          <View style={styles.cloudVerifiedBadge}>
                            <Text style={styles.cloudVerifiedBadgeText}>সংযুক্ত</Text>
                          </View>
                        </View>
                        <Text style={styles.cloudAccountEmail}>{googleUser.email}</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.cloudNotConnectedMiniBanner}>
                      <View style={styles.cloudGoogleIconCircleSmall}>
                        <Image
                          source={require('./assets/icons/ic_cloud.png')}
                          style={{ width: 24, height: 24, tintColor: '#0F8A0F' }}
                          resizeMode="contain"
                        />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#111827' }}>
                          গুগল ড্রাইভ কানেক্টেড নেই
                        </Text>
                        <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                          অনলাইন ব্যাকআপ ও রিস্টোরের জন্য জিমেইল একাউন্ট যুক্ত করুন
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.cloudConnectBtnSmall}
                        onPress={handleNativeGoogleSignIn}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.cloudConnectBtnSmallText}>কানেক্ট</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* 5 ALWAYS VISIBLE CORE ACTIONS (PHASE 4 SPECIFICATION) */}
                  <View style={styles.cloudControlsSection}>
                    <Text style={styles.cloudControlsSectionTitle}>ক্লাউড ব্যাকআপ ও রিস্টোর অপশন</Text>

                    {/* CONTROL 1: এখন ব্যাকআপ নিন */}
                    <TouchableOpacity
                      style={[styles.cloudControlCard, { borderColor: '#FECACA' }]}
                      onPress={handleCloudBackupNow}
                      disabled={cloudBackupStatus === 'backing_up'}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.cloudControlIconCircle, { backgroundColor: '#FEE2E2' }]}>
                        <Image
                          source={require('./assets/icons/grid_backup.png')}
                          style={{ width: 22, height: 22, tintColor: '#B81414' }}
                          resizeMode="contain"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cloudControlTitle, { color: '#B81414' }]}>
                          {cloudBackupStatus === 'backing_up' ? 'গুগল ড্রাইভে ব্যাকআপ হচ্ছে...' : 'এখন ব্যাকআপ নিন'}
                        </Text>
                        <Text style={styles.cloudControlSub}>
                          খাতার সকল তথ্য ও লেনদেন গুগল ড্রাইভে নিরাপদ রাখুন
                        </Text>
                      </View>
                      <Text style={{ fontSize: 18, color: '#B81414', fontWeight: 'bold' }}>›</Text>
                    </TouchableOpacity>

                    {/* CONTROL 2: অনলাইন ব্যাকআপ রিস্টোর করুন */}
                    <TouchableOpacity
                      style={[styles.cloudControlCard, { borderColor: '#BBF7D0' }]}
                      onPress={handleCloudRestore}
                      disabled={cloudBackupStatus === 'restoring'}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.cloudControlIconCircle, { backgroundColor: '#DCFCE7' }]}>
                        <Image
                          source={require('./assets/icons/ic_cloud.png')}
                          style={{ width: 22, height: 22, tintColor: '#0F8A0F' }}
                          resizeMode="contain"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cloudControlTitle, { color: '#0F8A0F' }]}>
                          {cloudBackupStatus === 'restoring' ? 'ড্রাইভ থেকে রিস্টোর হচ্ছে...' : 'অনলাইন ব্যাকআপ রিস্টোর করুন'}
                        </Text>
                        <Text style={styles.cloudControlSub}>
                          গুগল ড্রাইভ থেকে আগের সংরক্ষিত ডাটা মোবাইলে ফেরত আনুন
                        </Text>
                      </View>
                      <Text style={{ fontSize: 18, color: '#0F8A0F', fontWeight: 'bold' }}>›</Text>
                    </TouchableOpacity>

                    {/* CONTROL 3: ডাটা এক্সপোর্ট করুন */}
                    <TouchableOpacity
                      style={styles.cloudControlCard}
                      onPress={handleExportData}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.cloudControlIconCircle, { backgroundColor: '#DBEAFE' }]}>
                        <Image
                          source={require('./assets/icons/ic_share.png')}
                          style={{ width: 20, height: 20, tintColor: '#2563EB' }}
                          resizeMode="contain"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cloudControlTitle, { color: '#1E40AF' }]}>
                          ডাটা এক্সপোর্ট করুন
                        </Text>
                        <Text style={styles.cloudControlSub}>
                          সম্পূর্ণ খাতার ব্যাকআপ ফাইল (JSON) শেয়ার বা সেভ করুন
                        </Text>
                      </View>
                      <Text style={{ fontSize: 18, color: '#2563EB', fontWeight: 'bold' }}>›</Text>
                    </TouchableOpacity>

                    {/* CONTROL 4: Google Drive Account পরিবর্তন করুন */}
                    <TouchableOpacity
                      style={styles.cloudControlCard}
                      onPress={handleChangeGoogleAccount}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.cloudControlIconCircle, { backgroundColor: '#FEF3C7' }]}>
                        <Image
                          source={require('./assets/icons/ic_menu_accounts.png')}
                          style={{ width: 20, height: 20, tintColor: '#D97706' }}
                          resizeMode="contain"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cloudControlTitle, { color: '#B45309' }]}>
                          Google Drive Account পরিবর্তন করুন
                        </Text>
                        <Text style={styles.cloudControlSub}>
                          অন্য কোনো জিমেইল একাউন্ট নির্বাচন করতে এখানে ট্যাপ করুন
                        </Text>
                      </View>
                      <Text style={{ fontSize: 18, color: '#D97706', fontWeight: 'bold' }}>›</Text>
                    </TouchableOpacity>

                    {/* CONTROL 5: Google Account সরান */}
                    <TouchableOpacity
                      style={[styles.cloudControlCard, { borderColor: '#FEE2E2', backgroundColor: '#FEF2F2' }]}
                      onPress={handleRemoveGoogleAccount}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.cloudControlIconCircle, { backgroundColor: '#FEE2E2' }]}>
                        <Image
                          source={require('./assets/icons/ic_delete.png')}
                          style={{ width: 20, height: 20, tintColor: '#DC2626' }}
                          resizeMode="contain"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cloudControlTitle, { color: '#DC2626' }]}>
                          Google Account সরান
                        </Text>
                        <Text style={styles.cloudControlSub}>
                          গুগল ড্রাইভ সংযোগ বিচ্ছিন্ন করুন (লোকাল ডাটা অপরিবর্তিত থাকবে)
                        </Text>
                      </View>
                      <Text style={{ fontSize: 18, color: '#DC2626', fontWeight: 'bold' }}>›</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Cloud Backup Metadata Details if exists */}
                  {cloudBackupMetadata && (
                    <View style={styles.cloudBackupMetaCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                        <View style={[styles.statusDot, { backgroundColor: '#16A34A' }]} />
                        <Text style={styles.cloudMetaHeaderTitle}>সংরক্ষিত ক্লাউড ব্যাকআপ বিবরণ</Text>
                      </View>

                      <View style={styles.cloudMetaRow}>
                        <Text style={styles.cloudMetaLabel}>সর্বশেষ ব্যাকআপ:</Text>
                        <Text style={styles.cloudMetaValue}>
                          {cloudBackupMetadata.modifiedTime ? new Date(cloudBackupMetadata.modifiedTime).toLocaleDateString('bn-BD', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'আজ'}
                        </Text>
                      </View>

                      {cloudBackupMetadata.manifest && cloudBackupMetadata.manifest.recordCounts && (
                        <View style={styles.cloudStatsGrid}>
                          <View style={styles.cloudStatBox}>
                            <Text style={styles.cloudStatNumber}>
                              {toBengaliNumber(cloudBackupMetadata.manifest.recordCounts.accounts || 0)}
                            </Text>
                            <Text style={styles.cloudStatLabel}>মোট হিসাব</Text>
                          </View>
                          <View style={styles.cloudStatBox}>
                            <Text style={styles.cloudStatNumber}>
                              {toBengaliNumber(cloudBackupMetadata.manifest.recordCounts.journals || 0)}
                            </Text>
                            <Text style={styles.cloudStatLabel}>লেনদেন</Text>
                          </View>
                          <View style={styles.cloudStatBox}>
                            <Text style={styles.cloudStatNumber}>
                              {toBengaliNumber(cloudBackupMetadata.manifest.recordCounts.cashEntries || 0)}
                            </Text>
                            <Text style={styles.cloudStatLabel}>ক্যাশবক্স</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Auto Backup Toggle */}
                  <View style={styles.cloudAutoBackupRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cloudAutoBackupTitle}>অটো-ক্লাউড ব্যাকআপ</Text>
                      <Text style={styles.cloudAutoBackupSub}>প্রতিটি হিসাব বা লেনদেন এন্ট্রির পর স্বয়ংক্রিয়ভাবে ড্রাইভে সেভ হবে</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.toggleSwitch, autoBackupEnabled && styles.toggleSwitchActive]}
                      onPress={async () => {
                        const next = !autoBackupEnabled;
                        setAutoBackupEnabled(next);
                        await persistData({ autoBackupEnabled: next });
                      }}
                    >
                      <View style={[styles.toggleThumb, autoBackupEnabled && styles.toggleThumbActive]} />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* --- TAB 2: OFFLINE FILE BACKUP --- */"""

if not re.search(old_cloud_tab_pattern, code, re.DOTALL):
    print("Could not match old cloud tab pattern!")
    sys.exit(1)

code = re.sub(old_cloud_tab_pattern, new_cloud_tab_jsx, code, count=1, flags=re.DOTALL)
print("Updated modalBackupRestore JSX successfully!")

# 2. Update bottomTabBar images to remove flattening tintColor
code = code.replace(
    'style={[styles.tabIconImg, { tintColor: \'#B81414\', marginBottom: 0 }]}',
    'style={[styles.tabIconImg, { marginBottom: 0 }]}'
)

# 3. Add styles for the new cloud backup controls
new_styles = """
  cloudNotConnectedMiniBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 14,
  },
  cloudGoogleIconCircleSmall: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cloudConnectBtnSmall: {
    backgroundColor: '#0F8A0F',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  cloudConnectBtnSmallText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cloudControlsSection: {
    marginTop: 4,
    marginBottom: 14,
  },
  cloudControlsSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 10,
  },
  cloudControlCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  cloudControlIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cloudControlTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  cloudControlSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 16,
  },
"""

code = code.replace("  cloudNotConnectedCard: {", new_styles + "\n  cloudNotConnectedCard: {")

# 4. Update bottomTabBar height and padding
code = re.sub(
    r"bottomTabBar:\s*\{\s*flexDirection:\s*'row',\s*height:\s*Platform\.OS === 'android' \? \d+ : \d+,\s*paddingBottom:\s*Platform\.OS === 'android' \? \d+ : \d+,",
    "bottomTabBar: {\n    flexDirection: 'row',\n    height: Platform.OS === 'android' ? 68 : 60,\n    paddingBottom: Platform.OS === 'android' ? 8 : 4,",
    code
)

# 5. Update tabActivePill
code = re.sub(
    r"tabActivePill:\s*\{\s*backgroundColor:\s*'#[^']+',\s*paddingHorizontal:\s*\d+,\s*paddingVertical:\s*\d+,\s*borderRadius:\s*\d+,\s*alignItems:\s*'center',\s*marginBottom:\s*\d+,",
    "tabActivePill: {\n    backgroundColor: '#FCE8E8',\n    paddingHorizontal: 16,\n    paddingVertical: 3,\n    borderRadius: 16,\n    alignItems: 'center',\n    marginBottom: 2,",
    code
)

with open("App.js", "w", encoding="utf-8") as f:
    f.write(code)

print("Applied all UI improvements successfully!")
