import zipfile, re, sys
sys.stdout.reconfigure(encoding='utf-8')
from decode_axml import decode_axml
from parse_arsc import ARSCParser

apk = r"D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk"
z = zipfile.ZipFile(apk)
parser = ARSCParser(z.read("resources.arsc"))

layouts = [
    'res/layout/layout_sale_cash_total.xml',
    'res/layout/layout_cashbook_dashboard_total.xml',
    'res/layout/layout_cashbook_accounts.xml',
    'res/layout/layout_bottom_navigation.xml',
    'res/layout/layout_banner_tk_premium.xml',
    'res/layout/layout_content_main.xml',
    'res/layout/nav_header_main.xml',
    'res/layout/layout_main_add_customer_supplier.xml'
]

for l in layouts:
    print('=== LAYOUT:', l)
    if l not in z.namelist():
        print("NOT FOUND")
        continue
    xml = decode_axml(z.read(l))
    for line in xml.splitlines():
        m_id = re.search(r'id="(\d+)"', line)
        m_text = re.search(r'text="(\d+)"', line)
        m_src = re.search(r'src(?:Compat)?="(\d+)"', line)
        id_name = parser.res_map.get(int(m_id.group(1))) if m_id else None
        text_val = parser.res_map.get(int(m_text.group(1))) if m_text else None
        src_val = parser.res_map.get(int(m_src.group(1))) if m_src else None
        parts = []
        if id_name: parts.append(f'id={id_name[1]}')
        if text_val: parts.append(f'text={text_val[2]}')
        if src_val: parts.append(f'src={src_val[1]}')
        tag = re.search(r'<([A-Za-z0-9_\.]+)', line)
        tag_name = tag.group(1).split('.')[-1] if tag else ''
        if parts:
            indent = ' ' * (len(line) - len(line.lstrip()))
            print(f'{indent}<{tag_name} {" ".join(parts)}>')
