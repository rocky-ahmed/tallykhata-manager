import zipfile, sys
sys.stdout.reconfigure(encoding="utf-8")
from decode_axml import decode_axml
apk = r"D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk"
z = zipfile.ZipFile(apk)
print("=== nav_header_main.xml ===")
print(decode_axml(z.read("res/layout/nav_header_main.xml")))
print("=== layout_drawer_item.xml ===")
print(decode_axml(z.read("res/layout/layout_drawer_item.xml")))