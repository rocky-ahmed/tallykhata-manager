import zipfile, sys
sys.stdout.reconfigure(encoding='utf-8')
z = zipfile.ZipFile(r"D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk")
drawables = [n for n in z.namelist() if "drawable" in n]
print("Total drawables:", len(drawables))

queries = ["nav_", "bottom_", "ic_arrow", "ic_crown", "ic_cloud", "ic_message", "ic_support", "ic_filter", "ic_download", "ic_search", "ic_empty", "ic_add", "ic_qr", "ic_exchange", "ic_calculator", "ic_eye", "solar_crown"]

for q in queries:
    matches = [d for d in drawables if q in d.lower()]
    print(f"Query {q}: {len(matches)} files")
    for m in matches[:5]:
        print("   ", m)
