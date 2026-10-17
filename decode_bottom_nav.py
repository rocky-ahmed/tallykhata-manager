import zipfile, sys
sys.stdout.reconfigure(encoding="utf-8")
from decode_axml import decode_axml

z = zipfile.ZipFile(r"D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk")
for name in [
    "res/drawable/ic_nav_tally_selected.xml",
    "res/drawable/ic_nav_tally_un_selected.xml",
    "res/drawable/ic_nav_cash_box_selected.xml",
    "res/drawable/ic_nav_cash_box_un_selected.xml",
    "res/drawable/ic_nav_wallet_selected.xml",
    "res/drawable/ic_nav_wallet_un_selected.xml",
    "res/layout/layout_bottom_navigation.xml"
]:
    print("="*40)
    print(name)
    print("="*40)
    try:
        print(decode_axml(z.read(name)))
    except Exception as e:
        print("Error:", e)
