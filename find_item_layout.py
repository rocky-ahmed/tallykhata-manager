import zipfile, sys
sys.stdout.reconfigure(encoding="utf-8")
apk = r"D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk"
z = zipfile.ZipFile(apk)
for n in z.namelist():
    if "item_customer" in n or "item_supplier" in n or "row_customer" in n or "item_account" in n or "item_txn" in n or "item_journal" in n:
        print(n)