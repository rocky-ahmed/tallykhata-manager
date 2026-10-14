import zipfile, re, sys
sys.stdout.reconfigure(encoding='utf-8')
from parse_arsc import ARSCParser

apk = r"D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk"
z = zipfile.ZipFile(apk)
parser = ARSCParser(z.read("resources.arsc"))

# Search DEX for drawer setup
dexes = [n for n in z.namelist() if n.endswith('.dex')]
for d in dexes:
    data = z.read(d)
    for m in ['nav_account_manager', 'nav_group_tp_wallet', 'nav_lenden_biboron', 'nav_buy_sales', 'nav_credit_report', 'nav_settings']:
        if m.encode() in data:
            print(f"Found {m} in {d}")
