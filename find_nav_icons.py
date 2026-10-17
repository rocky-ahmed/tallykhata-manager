import zipfile, re, sys
sys.stdout.reconfigure(encoding="utf-8")

z = zipfile.ZipFile(r"D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk")
for name in z.namelist():
    if "nav_" in name or "tab_" in name or "bottom_" in name:
        if name.endswith(".png") or name.endswith(".xml"):
            print(name)
