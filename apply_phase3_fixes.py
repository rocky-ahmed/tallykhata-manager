import sys

sys.stdout.reconfigure(encoding='utf-8')

# --- 1. PART 1: STORAGE KEY & SETTINGS ---
with open('part1_header_and_utils.js', 'r', encoding='utf-8') as f:
    p1 = f.read()

p1 = p1.replace("const STORAGE_KEY = 'tallykhata_offline_store_v5';", "const STORAGE_KEY = 'tallykhata_offline_store_v6';")

with open('part1_header_and_utils.js', 'w', encoding='utf-8') as f:
    f.write(p1)
print("Updated part1_header_and_utils.js successfully")

# --- 2. PART 2: BUSINESS NAME & STATE ---
with open('part2_state_and_handlers.js', 'r', encoding='utf-8') as f:
    p2 = f.read()

p2 = p2.replace("{ id: '1', name: 'আমার ব্যবসা প্রতিষ্ঠান',", "{ id: '1', name: 'Mobile Xpress',")

# If stored name is old placeholder, normalize to Mobile Xpress
old_load = "if (d.businessName) setBusinessName(d.businessName);"
new_load = "if (d.businessName) { setBusinessName(d.businessName === 'আমার ব্যবসা প্রতিষ্ঠান' ? 'Mobile Xpress' : d.businessName); }"
p2 = p2.replace(old_load, new_load)

with open('part2_state_and_handlers.js', 'w', encoding='utf-8') as f:
    f.write(p2)
print("Updated part2_state_and_handlers.js successfully")

# --- 3. PART 3: LABELS, TABS & BUTTONS ---
with open('part3_views_and_tabs.js', 'r', encoding='utf-8') as f:
    p3 = f.read()

# Fix grid item 8 label
p3 = p3.replace(
    "<Text style={styles.quickGridLabel}>ক্যাশবক্স</Text>",
    "<Text style={styles.quickGridLabel}>ক্যাশবাক্স</Text>"
)

# Fix Money Out button in TallyPay tab
old_money_out = """              <TouchableOpacity
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
              >"""

new_money_out = """              <TouchableOpacity
                style={styles.walletServiceBtn}
                onPress={() => setModalMoneyOut(true)}
              >"""

if old_money_out in p3:
    p3 = p3.replace(old_money_out, new_money_out)
    print("Replaced old Money Out alert with setModalMoneyOut(true)")
else:
    print("Money Out button already updated or slightly different")

# Fix Bottom Navigation Bar: Labels and active pills for all 4 tabs
old_bottom_nav = """      {/* --- AUTHENTIC 4-TAB BOTTOM NAVIGATION BAR (photo_2026-10-15_18-13-34.jpg) --- */}
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
            টালি
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab('cashbox')}
          activeOpacity={0.8}
        >
          <Image
            source={activeTab === 'cashbox' ? require('./assets/nav/nav_cashbox_active.png') : require('./assets/nav/nav_cashbox.png')}
            style={styles.tabIconImg}
            resizeMode="contain"
          />
          <Text style={[styles.tabButtonLabel, activeTab === 'cashbox' && styles.tabButtonLabelActive]}>
            ক্যাশবক্স
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab('tallypay')}
          activeOpacity={0.8}
        >
          <Image
            source={activeTab === 'tallypay' ? require('./assets/nav/nav_tallypay_active.png') : require('./assets/nav/nav_tallypay.png')}
            style={styles.tabIconImg}
            resizeMode="contain"
          />
          <Text style={[styles.tabButtonLabel, activeTab === 'tallypay' && styles.tabButtonLabelActive]}>
            টালিপে
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab('menu')}
          activeOpacity={0.8}
        >
          <Image
            source={activeTab === 'menu' ? require('./assets/nav/nav_menu_active.png') : require('./assets/nav/nav_menu.png')}
            style={styles.tabIconImg}
            resizeMode="contain"
          />
          <Text style={[styles.tabButtonLabel, activeTab === 'menu' && styles.tabButtonLabelActive]}>
            মেনু
          </Text>
        </TouchableOpacity>
      </View>"""

new_bottom_nav = """      {/* --- AUTHENTIC 4-TAB BOTTOM NAVIGATION BAR (photo_2026-10-15_18-13-34.jpg) --- */}
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
            টালি
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
            ক্যাশবাক্স
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
            টালি পে
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
      </View>"""

if old_bottom_nav in p3:
    p3 = p3.replace(old_bottom_nav, new_bottom_nav)
    print("Replaced Bottom Navigation with authentic pills and labels")
else:
    print("Notice: old_bottom_nav not exact match, checking line by line replacement")

with open('part3_views_and_tabs.js', 'w', encoding='utf-8') as f:
    f.write(p3)
print("Updated part3_views_and_tabs.js successfully")

# --- 4. REBUILD App.js ---
import subprocess
ret = subprocess.run([r"C:\Users\Lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe", "build_full_app.py"], capture_output=True, text=True)
print("build_full_app output:", ret.stdout, ret.stderr)

