import sys, zipfile
sys.stdout.reconfigure(encoding="utf-8")
from decode_axml import decode_axml

apk_path = r"D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk"
z = zipfile.ZipFile(apk_path)

items = [
    'ic_multi_business_new.xml',
    'ic_stock_new.xml',
    'ic_new_business_note.xml',
    'ic_bulk_tagada_new.xml',
    'ic_super_qr_new.xml',
    'ic_circle_data_backup.xml',
    'ic_tally_message_new.xml',
    'ic_cashbox_list_item.xml'
]

for item in items:
    for n in z.namelist():
        if n.startswith('res/drawable') and n.endswith(item):
            raw = decode_axml(z.read(n))
            print(f'=== {item} ({len(raw)} chars) ===')
            # print path colors
            import re
            colors = re.findall(r'fillColor="([^"]+)"', raw)
            print('Colors found:', colors[:5])
            break
