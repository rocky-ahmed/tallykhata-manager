import zipfile, sys
sys.stdout.reconfigure(encoding="utf-8")
from decode_axml import decode_axml
from parse_arsc import ARSCParser
apk = r"D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk"
z = zipfile.ZipFile(apk)
parser = ARSCParser(z.read("resources.arsc"))
xml = decode_axml(z.read("res/menu/activity_main_drawer.xml"))
import re
for line in xml.splitlines():
    m_id = re.search(r"id=\"(\d+)\"", line)
    m_title = re.search(r"title=\"(\d+)\"", line)
    if m_id and m_title:
        id_entry = parser.res_map.get(int(m_id.group(1)))
        title_entry = parser.res_map.get(int(m_title.group(1)))
        if id_entry and title_entry:
            print(f"{id_entry[1]} -> {title_entry[2]}")