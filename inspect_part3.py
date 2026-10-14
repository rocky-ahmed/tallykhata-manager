with open("part3_views_and_tabs.js", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i, l in enumerate(lines):
    if "bottomNav" in l or "activeTab" in l or "setActiveTab" in l or "renderBottomNav" in l:
        print(f"{i+1}: {l.strip()[:100]}")
