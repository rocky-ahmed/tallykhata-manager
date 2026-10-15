import os, sys, zipfile
sys.stdout.reconfigure(encoding="utf-8")

apk_path = r"D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk"
z = zipfile.ZipFile(apk_path)

targets = [
    'ic_multi_business_new',
    'ic_stock_new',
    'ic_new_business_note',
    'ic_bulk_tagada_new',
    'ic_super_qr_new',
    'ic_circle_data_backup',
    'ic_data_backup',
    'ic_tally_message_new',
    'ic_cashbox_list_item'
]

for name in z.namelist():
    for t in targets:
        if t in name:
            print(f'Match {t}: {name}')
