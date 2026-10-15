import zipfile, sys
sys.stdout.reconfigure(encoding='utf-8')

apk_path = r'D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk'
with zipfile.ZipFile(apk_path, 'r') as z:
    names = z.namelist()

drawables = [n for n in names if 'res/drawable' in n or 'res/mipmap' in n]
print(f'Total drawables in APK: {len(drawables)}')

search_keys = ['multi', 'stock', 'note', 'bulk', 'tagada', 'backup', 'qr', 'banner', 'promo', 'cashbox', 'message', 'inbox', 'support', 'transfer']
for k in search_keys:
    matches = [d for d in drawables if k in d.lower()]
    print(f'Matches for "{k}" ({len(matches)}): {matches[:6]}')
