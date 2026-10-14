import zipfile, re, sys
sys.stdout.reconfigure(encoding='utf-8')
from decode_axml import decode_axml
from parse_arsc import ARSCParser

apk = r"D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk"
z = zipfile.ZipFile(apk)
parser = ARSCParser(z.read("resources.arsc"))

def inspect(layout_name):
    print("=== INSPECTING:", layout_name)
    raw = decode_axml(z.read(layout_name))
    def repl(m):
        val = int(m.group(1))
        r = parser.res_map.get(val)
        if r:
            return f'"{r[1]}={r[2] if r[2] else r[0]}"'
        return m.group(0)
    out = re.sub(r'"(\d{9,10})"', repl, raw)
    print(out)

if len(sys.argv) > 1:
    inspect(sys.argv[1])
else:
    inspect('res/layout/layout_sale_cash_total.xml')
