import sys
sys.stdout.reconfigure(encoding="utf-8")
from render_authentic_icons import render_vector_xml, decode_axml, z

more_icons = [
    ("res/drawable/ic_delete_red.xml", "assets/icons/ic_delete.png", "#D32F2F"),
    ("res/drawable/ic_search.xml", "assets/icons/ic_search.png", "#757575"),
    ("res/drawable/ic_calendar.xml", "assets/icons/ic_calendar.png", "#757575"),
    ("res/drawable/ic_pdf.xml", "assets/icons/ic_pdf.png", "#D32F2F"),
    ("res/drawable/ic_add_customer_supplier.xml", "assets/icons/ic_add_customer_supplier.png", "#FFFFFF"),
    ("res/drawable/ic_eye_open_black.xml", "assets/icons/ic_eye_open.png", "#333333"),
    ("res/drawable/ic_eye_closed_black.xml", "assets/icons/ic_eye_closed.png", "#333333"),
    ("res/drawable/arrow_right.xml", "assets/icons/arrow_right.png", "#757575"),
    ("res/drawable/arrow_right_red.xml", "assets/icons/arrow_right_red.png", "#B81414"),
    ("res/drawable/ic_arrow_down.xml", "assets/icons/ic_arrow_down.png", "#757575"),
]

for xml_name, icon_path, col in more_icons:
    if xml_name in z.namelist():
        print(f"Rendering {xml_name} -> {icon_path}")
        raw = decode_axml(z.read(xml_name))
        render_vector_xml(raw, icon_path, override_color=col)
    else:
        print(f"Not found: {xml_name}")
