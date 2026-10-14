import zipfile, sys
sys.stdout.reconfigure(encoding="utf-8")
from decode_axml import decode_axml
apk = r"D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk"
z = zipfile.ZipFile(apk)
print(decode_axml(z.read("res/layout/item_customer_supplier_account.xml")))