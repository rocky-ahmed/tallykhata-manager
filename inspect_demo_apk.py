import zipfile, re, sys
sys.stdout.reconfigure(encoding="utf-8")
from decode_axml import decode_axml

z = zipfile.ZipFile(r"D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk")
xml = decode_axml(z.read("AndroidManifest.xml"))
acts = re.findall(r'<activity[^>]+name="([^"]+)"', xml)
print(f"Total activities: {len(acts)}")
for a in sorted(acts):
    if "tallykhata" in a or not "." in a:
        print(" ", a)
