import zipfile, re, sys
sys.stdout.reconfigure(encoding="utf-8")
from decode_axml import decode_axml
from parse_arsc import ARSCParser

z = zipfile.ZipFile(r"D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk")
parser = ARSCParser(z.read("resources.arsc"))

xml = decode_axml(z.read("res/layout/activity_tp_wallet_all_services.xml"))
for line in xml.splitlines():
    m_id = re.search(r'id="(\d+)"', line)
    m_text = re.search(r'text="(\d+)"', line)
    id_str = parser.res_map.get(int(m_id.group(1)))[1] if m_id and parser.res_map.get(int(m_id.group(1))) else ""
    text_str = parser.res_map.get(int(m_text.group(1)))[2] if m_text and parser.res_map.get(int(m_text.group(1))) else ""
    if id_str or text_str:
        print(f"id={id_str} text='{text_str}'")
