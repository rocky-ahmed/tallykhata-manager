import zipfile, sys
from decode_axml import decode_axml
from parse_arsc import ARSCParser
sys.stdout.reconfigure(encoding='utf-8')

apk_path = r"D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk"
with zipfile.ZipFile(apk_path) as z:
    parser = ARSCParser(z.read("resources.arsc"))
    raw_xml = decode_axml(z.read("res/layout/fragment_home.xml"))
    
    # replace resource IDs with names where possible
    import re
    def repl(m):
        val = int(m.group(1))
        info = parser.res_map.get(val)
        if info:
            return f"{info[0]}/{info[1]} ({info[2]})"
        return m.group(0)
    
    print(raw_xml[:4000])
