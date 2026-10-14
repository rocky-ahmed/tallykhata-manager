import zipfile, sys
apk_path = r"D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk"
with zipfile.ZipFile(apk_path) as z:
    for n in z.namelist():
        if n.startswith("res/layout/") and any(x in n for x in ["customer_detail", "credit_entry", "account_detail", "each_transaction", "customer_report"]):
            print(n)
