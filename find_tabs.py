import zipfile, sys
from parse_arsc import ARSCParser
sys.stdout.reconfigure(encoding='utf-8')

apk_path = r"D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk"
with zipfile.ZipFile(apk_path) as z:
    parser = ARSCParser(z.read("resources.arsc"))
    for k, v in parser.string_map.items():
        k_lower = k.lower()
        if any(x in k_lower for x in ["nav_", "bottom_", "tab_"]) or v in ["হোম", "ক্যাশবক্স", "ক্যাশ বাক্স", "তাগাদা", "টালি’পে", "টালিপে", "আরও", "খাতা", "হিসাব", "রিপোর্ট", "কাস্টমার", "সাপ্লায়ার"]:
            print(f"{k} = \"{v}\"")
