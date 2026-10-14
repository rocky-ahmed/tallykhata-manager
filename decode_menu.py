import zipfile, sys
sys.stdout.reconfigure(encoding="utf-8")
from decode_axml import decode_axml
from parse_arsc import ARSCParser
apk = r"D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk"
z = zipfile.ZipFile(apk)
parser = ARSCParser(z.read("resources.arsc"))
xml = decode_axml(z.read("res/menu/activity_main_drawer.xml"))
for line in xml.splitlines():
    import re
    m_id = re.search(r"id=\"(\d+)\"", line)
    m_title = re.search(r"title=\"(\d+)\"", line)
    m_icon = re.search(r"icon=\"(\d+)\"", line)
    id_str = parser.res_map.get(int(m_id.group(1)))[1] if m_id and parser.res_map.get(int(m_id.group(1))) else ""
    title_str = parser.res_map.get(int(m_title.group(1)))[2] if m_title and parser.res_map.get(int(m_title.group(1))) else ""
    icon_str = parser.res_map.get(int(m_icon.group(1)))[1] if m_icon and parser.res_map.get(int(m_icon.group(1))) else ""
    parts = []
    if id_str: parts.append(f"id={id_str}")
    if title_str: parts.append(f"title='{title_str}'")
    if icon_str: parts.append(f"icon={icon_str}")
    if parts: print(" ".join(parts))