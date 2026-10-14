import zipfile, sys, re, os, json

sys.stdout.reconfigure(encoding='utf-8')
apk_path = r"D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk"
z = zipfile.ZipFile(apk_path)

print("=== FAQ Questions in Help ===")
help_html = z.read("assets/help/index.html").decode("utf-8", errors="ignore")
questions = re.findall(r'<div class="col-10 faq-ques-text">\s*([^<]+)\s*</div>', help_html)
for i, q in enumerate(questions, 1):
    print(f"{i}. {q.strip()}")
