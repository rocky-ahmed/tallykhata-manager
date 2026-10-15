import zipfile, sys
sys.stdout.reconfigure(encoding='utf-8')

apk_path = r'D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk'
with zipfile.ZipFile(apk_path, 'r') as z:
    data = z.read('res/layout/fragment_home.xml')

# extract all readable strings from binary XML
import re
strings = re.findall(rb'[\x20-\x7e]{3,}', data)
decoded = [s.decode('latin1', errors='ignore') for s in strings]
for s in decoded:
    if any(k in s.lower() for k in ['layout', 'id', 'text', 'ic_', 'btn', 'card', 'view', 'grid', 'banner', 'recycler']):
        print(s)
