import zipfile, sys, re
from decode_axml import decode_axml
from parse_arsc import ARSCParser
sys.stdout.reconfigure(encoding='utf-8')

apk_path = r"D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk"
with zipfile.ZipFile(apk_path) as z:
    parser = ARSCParser(z.read("resources.arsc"))
    for target in ["res/layout/layout_cashbook_dashboard_total.xml", "res/layout/layout_cashbook_accounts.xml"]:
        raw_xml = decode_axml(z.read(target))
        print(f"=== {target} ===")
        def repl(m):
            attr = m.group(1)
            val = int(m.group(2))
            info = parser.res_map.get(val)
            if info:
                return f'{attr}="{info[0]}/{info[1]}: {info[2]}"'
            return m.group(0)
        resolved = re.sub(r'(\b[a-zA-Z0-9_]+)="(-?\d{7,10})"', repl, raw_xml)
        for line in resolved.split('\n'):
            if any(k in line for k in ['KohinoorTextView', 'TextView', 'Button', 'text=', 'id=']):
                print(line[:120])
