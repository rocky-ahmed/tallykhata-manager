import sys, re
sys.stdout.reconfigure(encoding="utf-8")

with open("App.js", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update/Add Handlers: handleCloudBackupNow, handleCloudRestore, executeCloudRestore, handleExportData, handleChangeGoogleAccount, handleRemoveGoogleAccount
handlers_replacement = """
  const handleCloudBackupNow = async () => {
    if (!googleUser || !googleUser.sub) {
      Alert.alert(
        'গুগল একাউন্ট প্রয়োজন',
        'ক্লাউড ব্যাকআপ নিতে প্রথমে আপনার গুগল একাউন্ট যুক্ত করতে হবে। আপনি কি এখন একাউন্ট যুক্ত করতে চান?',
        [
          { text: 'বাতিল', style: 'cancel' },
          { text: 'যুক্ত করুন', onPress: handleNativeGoogleSignIn },
        ]
      );
      return;
    }
    if (!googleAccessToken) {
      Alert.alert('অনুমোদন প্রয়োজন', 'গুগল ড্রাইভ এক্সেস টোকেন পাওয়া যায়নি। অনুগ্রহ করে পুনরায় গুগল একাউন্ট সংযোগ করুন।');
      return;
    }

    try {
      setCloudBackupStatus('backing_up');
      const currentState = storageRepository.getAuthoritativeState();
      if (!currentState || !Array.isArray(currentState.accounts)) {
        throw new Error('লোকাল ডাটাবেজ থেকে নির্ভরযোগ্য ডাটা প্রস্তুত করা যায়নি।');
      }

      const payload = buildBackupPayload(currentState, googleUser);
      let fileId = cloudBackupMetadata ? cloudBackupMetadata.fileId : null;

      // Real upload to Google Drive REST API
      const uploadRes = await googleDriveBackupService.uploadBackup(googleAccessToken, payload, fileId);
      if (!uploadRes || !uploadRes.fileId) {
        throw new Error('গুগল ড্রাইভ সার্ভার থেকে ফাইল আইডি পাওয়া যায়নি। আপলোড ব্যর্থ হয়েছে।');
      }

      // Verify the uploaded remote file immediately via real download
      const verifyDownload = await googleDriveBackupService.downloadBackup(
        googleAccessToken,
        uploadRes.fileId,
        googleUser.sub
      );
      if (!verifyDownload || !verifyDownload.data) {
        throw new Error('গুগল ড্রাইভ থেকে আপলোডকৃত ফাইল যাচাই করা সম্ভব হয়নি।');
      }

      const updatedMeta = {
        fileId: uploadRes.fileId,
        name: BACKUP_FILENAME,
        modifiedTime: uploadRes.modifiedTime || new Date().toISOString(),
        manifest: payload.manifest,
      };

      setCloudBackupMetadata(updatedMeta);
      await persistData({ cloudBackupMetadata: updatedMeta });
      setCloudBackupStatus('success');

      Alert.alert(
        'ব্যাকআপ সফল!',
        "আপনার সম্পূর্ণ খাতার ব্যাকআপ সফলভাবে গুগল ড্রাইভে সংরক্ষিত ও যাচাইকৃত হয়েছে।\\n\\n" +
        'মোট হিসাব: ' + toBengaliNumber(payload.manifest.recordCounts.accounts) + ' টি\\n' +
        'মোট লেনদেন: ' + toBengaliNumber(payload.manifest.recordCounts.journals) + ' টি\\n' +
        'ক্যাশবক্স এন্ট্রি: ' + toBengaliNumber(payload.manifest.recordCounts.cashEntries) + ' টি'
      );
    } catch (err) {
      setCloudBackupStatus('error');
      Alert.alert('ব্যাকআপ ত্রুটি', err.message || 'গুগল ড্রাইভে ব্যাকআপ নিতে সমস্যা হয়েছে।');
    }
  };

  const executeCloudRestore = async () => {
    try {
      setCloudBackupStatus('restoring');

      const downloadRes = await googleDriveBackupService.downloadBackup(
        googleAccessToken,
        cloudBackupMetadata.fileId,
        googleUser.sub
      );

      if (!downloadRes || !downloadRes.data) {
        throw new Error('গুগল ড্রাইভ থেকে ব্যাকআপ ডাটা ডাউনলোড ব্যর্থ হয়েছে।');
      }

      const commitRes = await storageRepository.commitRestorePayload(downloadRes);
      if (!commitRes.success) {
        throw new Error(commitRes.error || 'রিস্টোর ডাটাবেজ কমিট ব্যর্থ হয়েছে।');
      }

      const newState = commitRes.data;
      if (Array.isArray(newState.accounts)) setAccounts(newState.accounts);
      if (Array.isArray(newState.journals)) setJournals(newState.journals);
      if (Array.isArray(newState.cashEntries)) setCashEntries(newState.cashEntries);
      if (Array.isArray(newState.stock)) setInventory(newState.stock);
      if (Array.isArray(newState.notes)) setNotes(newState.notes);
      if (Array.isArray(newState.businesses)) setBusinesses(newState.businesses);
      if (newState.businessName) setBusinessName(newState.businessName);
      if (newState.ownerName) setOwnerName(newState.ownerName);
      if (newState.ownerPhone) setOwnerPhone(newState.ownerPhone);
      if (newState.businessAddress) setBusinessAddress(newState.businessAddress);
      if (newState.openingBalance !== undefined) setOpeningBalance(Number(newState.openingBalance));
      if (newState.walletBalance !== undefined) setWalletBalance(Number(newState.walletBalance));
      if (Array.isArray(newState.walletTxns)) setWalletTxns(newState.walletTxns);
      if (newState.tallyMessageBalance !== undefined) setTallyMessageBalance(Number(newState.tallyMessageBalance));

      setCloudBackupStatus('success');
      Alert.alert(
        'রিস্টোর সফল!',
        'গুগল ড্রাইভ থেকে আপনার সম্পূর্ণ খাতা সফলভাবে রিস্টোর হয়েছে। পূর্ববর্তী লোকাল ডাটার একটি সেফটি কপি রাখা হয়েছে।'
      );
    } catch (err) {
      setCloudBackupStatus('error');
      await storageRepository.rollbackToSafetySnapshot();
      Alert.alert('রিস্টোর ব্যর্থ', err.message || 'ব্যাকআপ রিস্টোর করার সময় ত্রুটি ঘটেছে। পূর্ববর্তী ডাটা অক্ষুণ্ণ রয়েছে।');
    }
  };

  const handleCloudRestore = async () => {
    if (!googleUser || !googleUser.sub) {
      Alert.alert(
        'গুগল একাউন্ট প্রয়োজন',
        'অনলাইন ব্যাকআপ রিস্টোর করতে প্রথমে আপনার গুগল একাউন্ট যুক্ত করতে হবে। আপনি কি এখন একাউন্ট যুক্ত করতে চান?',
        [
          { text: 'বাতিল', style: 'cancel' },
          { text: 'যুক্ত করুন', onPress: handleNativeGoogleSignIn },
        ]
      );
      return;
    }
    if (!googleAccessToken) {
      Alert.alert('অনুমোদন প্রয়োজন', 'গুগল ড্রাইভ এক্সেস টোকেন পাওয়া যায়নি। অনুগ্রহ করে পুনরায় গুগল একাউন্ট সংযোগ করুন।');
      return;
    }
    if (!cloudBackupMetadata || !cloudBackupMetadata.fileId) {
      Alert.alert('ব্যাকআপ পাওয়া যায়নি', 'আপনার এই গুগল ড্রাইভ একাউন্টে কোনো সংরক্ষিত ব্যাকআপ পাওয়া যায়নি। প্রথমে "এখন ব্যাকআপ নিন" বাটনে চাপ দিয়ে ব্যাকআপ তৈরি করুন।');
      return;
    }

    const backupDate = cloudBackupMetadata.modifiedTime
      ? new Date(cloudBackupMetadata.modifiedTime).toLocaleDateString('bn-BD', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : 'আজ';
    const accCount = toBengaliNumber(cloudBackupMetadata.manifest?.recordCounts?.accounts || 0);
    const jrnCount = toBengaliNumber(cloudBackupMetadata.manifest?.recordCounts?.journals || 0);

    Alert.alert(
      'অনলাইন ব্যাকআপ রিস্টোর',
      `গুগল ড্রাইভ থেকে ব্যাকআপ রিস্টোর করার পূর্বে বর্তমান ডাটার একটি লোকাল সেফটি কপি তৈরি করা হবে।\\n\\n• ব্যাকআপের তারিখ: ${backupDate}\\n• মোট হিসাব: ${accCount} টি\\n• মোট লেনদেন: ${jrnCount} টি\\n\\nআপনি কি নিশ্চিত রিস্টোর করতে চান?`,
      [
        { text: 'বাতিল', style: 'cancel' },
        { text: 'হ্যাঁ, রিস্টোর করুন', onPress: executeCloudRestore },
      ]
    );
  };

  const handleExportData = async () => {
    try {
      const currentState = storageRepository.getAuthoritativeState();
      const payload = buildBackupPayload(currentState, googleUser || { sub: 'offline_export', email: '', name: businessName });
      const jsonStr = JSON.stringify(payload, null, 2);
      await Share.share({
        title: `TallyKhata Backup - ${businessName}`,
        message: jsonStr,
      });
    } catch (e) {
      Alert.alert('ত্রুটি', 'ডাটা এক্সপোর্ট করা সম্ভব হয়নি।');
    }
  };

  const handleChangeGoogleAccount = async () => {
    Alert.alert(
      'গুগল একাউন্ট পরিবর্তন',
      'আপনি কি গুগল একাউন্ট পরিবর্তন করতে চান? বর্তমান একাউন্ট সাইন-আউট করে নতুন একাউন্ট সিলেক্ট করা হবে। আপনার লোকাল ডাটা অক্ষুণ্ণ থাকবে।',
      [
        { text: 'বাতিল', style: 'cancel' },
        {
          text: 'পরিবর্তন করুন',
          onPress: async () => {
            try {
              let GoogleSignin = null;
              try {
                const mod = require('@react-native-google-signin/google-signin');
                GoogleSignin = mod.GoogleSignin;
              } catch (e) {}
              if (GoogleSignin) {
                await GoogleSignin.signOut().catch(() => {});
              }
              setGoogleUser(null);
              setGoogleAccessToken('');
              setCloudBackupMetadata(null);
              await persistData({
                googleUser: null,
                googleAccessToken: '',
                cloudBackupMetadata: null,
              });
              handleNativeGoogleSignIn();
            } catch (err) {
              console.error('Change account error:', err);
            }
          },
        },
      ]
    );
  };

  const handleRemoveGoogleAccount = async () => {
    Alert.alert(
      'গুগল একাউন্ট সরান',
      'আপনি কি গুগল একাউন্ট সংযোগ বিচ্ছিন্ন করতে চান? আপনার বর্তমান মোবাইলের সকল খাতার ডাটা নিরাপদ থাকবে এবং গুগল ড্রাইভে থাকা আগের ব্যাকআপও অক্ষুণ্ণ থাকবে।',
      [
        { text: 'বাতিল', style: 'cancel' },
        {
          text: 'সরান',
          style: 'destructive',
          onPress: async () => {
            try {
              let GoogleSignin = null;
              try {
                const mod = require('@react-native-google-signin/google-signin');
                GoogleSignin = mod.GoogleSignin;
              } catch (e) {}
              if (GoogleSignin) {
                await GoogleSignin.signOut().catch(() => {});
              }
              setGoogleUser(null);
              setGoogleAccessToken('');
              setCloudBackupMetadata(null);
              setAutoBackupEnabled(false);
              await persistData({
                googleUser: null,
                googleAccessToken: '',
                cloudBackupMetadata: null,
                autoBackupEnabled: false,
              });
              Alert.alert('সফল', 'গুগল একাউন্ট সফলভাবে সংযোগ বিচ্ছিন্ন করা হয়েছে।');
            } catch (err) {
              console.error('Remove account error:', err);
            }
          },
        },
      ]
    );
  };
"""

# Replace from const handleCloudBackupNow to before const handleExportBackup
old_handler_pattern = r'const handleCloudBackupNow = async \(\) => \{.+?(?=\n  // --- HANDLER: BACKUP & RESTORE ---)'
if not re.search(old_handler_pattern, code, re.DOTALL):
    print("Could not match old handlers pattern!")
    sys.exit(1)

code = re.sub(old_handler_pattern, handlers_replacement.strip(), code, count=1, flags=re.DOTALL)
print("Updated handlers successfully!")

with open("App.js", "w", encoding="utf-8") as f:
    f.write(code)
