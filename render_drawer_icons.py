import sys
sys.stdout.reconfigure(encoding="utf-8")
from render_authentic_icons import render_vector_xml, decode_axml, z

menu_drawables = [
    ("res/drawable/ic_stock_new.xml", "assets/icons/ic_menu_stock.png", "#B81414"),
    ("res/drawable/ic_new_business_note.xml", "assets/icons/ic_menu_note.png", "#0284C7"),
    ("res/drawable/ic_menu_malik_report.xml", "assets/icons/ic_menu_profit.png", "#0F8A0F"),
    ("res/drawable/ic_menu_cash_report.xml", "assets/icons/ic_menu_report.png", "#7C3AED"),
    ("res/drawable/icon_backup.xml", "assets/icons/ic_menu_backup.png", "#0F8A0F"),
    ("res/drawable/ic_menu_settings.xml", "assets/icons/ic_menu_settings.png", "#4B5563"),
    ("res/drawable/ic_support.xml", "assets/icons/ic_menu_support.png", "#B81414"),
    ("res/drawable/ic_lock.xml", "assets/icons/ic_menu_lock.png", "#D97706"),
]

for xml_name, icon_path, col in menu_drawables:
    found = None
    if xml_name in z.namelist():
        found = xml_name
    else:
        base = xml_name.split('/')[-1].replace('.xml', '').replace('ic_', '').replace('menu_', '')
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
