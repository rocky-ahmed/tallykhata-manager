import zipfile, sys, re
sys.stdout.reconfigure(encoding="utf-8")
from decode_axml import decode_axml
from parse_arsc import ARSCParser
apk = r"D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk"
z = zipfile.ZipFile(apk)
parser = ARSCParser(z.read("resources.arsc"))
xml = decode_axml(z.read("res/layout/fragment_home.xml"))
for line in xml.splitlines():
    if "layoutCashSaleTotal" in line or "include" in line:
        print(line)