import zipfile, re, sys
sys.stdout.reconfigure(encoding="utf-8")
from decode_axml import decode_axml
from parse_arsc import ARSCParser

z = zipfile.ZipFile(r"D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk")
parser = ARSCParser(z.read("resources.arsc"))

for path in z.namelist():
    if "cash" in path.lower() and path.startswith("res/layout/") and not "item" in path:
        print(path)
