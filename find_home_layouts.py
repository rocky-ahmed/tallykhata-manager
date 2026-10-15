import zipfile, sys
sys.stdout.reconfigure(encoding='utf-8')

apk_path = r'D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk'
with zipfile.ZipFile(apk_path, 'r') as z:
    for name in z.namelist():
        if name.startswith('res/layout') and ('home' in name or 'dashboard' in name or 'main' in name):
            print(name)
