import sys

with open("App.js", "r", encoding="utf-8") as f:
    code = f.read()

# Replace the broken string in handleCloudBackupNow
broken = """      Alert.alert(
        'ব্যাকআপ সফল!',
        "আপনার সম্পূর্ণ খাতার ব্যাকআপ সফলভাবে গুগল ড্রাইভে সংরক্ষিত ও যাচাইকৃত হয়েছে।

" +
        'মোট হিসাব: ' + toBengaliNumber(payload.manifest.recordCounts.accounts) + ' টি
' +
        'মোট লেনদেন: ' + toBengaliNumber(payload.manifest.recordCounts.journals) + ' টি
' +
        'ক্যাশবক্স এন্ট্রি: ' + toBengaliNumber(payload.manifest.recordCounts.cashEntries) + ' টি'
      );"""

fixed = """      Alert.alert(
        'ব্যাকআপ সফল!',
        `আপনার সম্পূর্ণ খাতার ব্যাকআপ সফলভাবে গুগল ড্রাইভে সংরক্ষিত ও যাচাইকৃত হয়েছে।\\n\\n` +
        `মোট হিসাব: ${toBengaliNumber(payload.manifest.recordCounts.accounts)} টি\\n` +
        `মোট লেনদেন: ${toBengaliNumber(payload.manifest.recordCounts.journals)} টি\\n` +
        `ক্যাশবক্স এন্ট্রি: ${toBengaliNumber(payload.manifest.recordCounts.cashEntries)} টি`
      );"""

if broken in code:
    code = code.replace(broken, fixed)
    print("Replaced exact broken block!")
else:
    # Use regex
    import re
    code = re.sub(
        r"Alert\.alert\(\s*'ব্যাকআপ সফল!',\s*\"আপনার সম্পূর্ণ খাতার ব্যাকআপ সফলভাবে গুগল ড্রাইভে সংরক্ষিত ও যাচাইকৃত হয়েছে\..*?\);",
        fixed,
        code,
        flags=re.DOTALL
    )
    print("Replaced with regex!")

with open("App.js", "w", encoding="utf-8") as f:
    f.write(code)
