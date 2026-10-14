import sys
sys.stdout.reconfigure(encoding="utf-8")
from render_authentic_icons import render_vector_xml, decode_axml, z

cash_drawables = [
    ("res/drawable/ic_menu_buy_sell.xml", "assets/icons/ic_cash_sale.png", "#0F8A0F"),
    ("res/drawable/ic_menu_cost.xml", "assets/icons/ic_cash_cost.png", "#B81414"),
    ("res/drawable/ic_menu_cash_report.xml", "assets/icons/ic_cash_buy.png", "#B81414"),
    ("res/drawable/ic_menu_malik_report.xml", "assets/icons/ic_malik_in.png", "#0F8A0F"),
    ("res/drawable/ic_menu_accounts.xml", "assets/icons/ic_malik_out.png", "#B81414"),
    ("res/drawable/ic_lock.xml", "assets/icons/ic_lock.png", "#B81414"),
    ("res/drawable/ic_shield.xml", "assets/icons/ic_shield.png", "#0F8A0F"),
]

for xml_name, icon_path, col in cash_drawables:
    found = None
    if xml_name in z.namelist():
        found = xml_name
    else:
        base = xml_name.split('/')[-1].replace('.xml', '').replace('ic_', '')
        for n in z.namelist():
            if n.startswith("res/drawable") and n.endswith(".xml") and base in n:
                found = n
                break
    if found:
        print(f"Rendering {found} -> {icon_path}")
        raw = decode_axml(z.read(found))
        render_vector_xml(raw, icon_path, override_color=col)
    else:
        print(f"Not found: {xml_name}")
