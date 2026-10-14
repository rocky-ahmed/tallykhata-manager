import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open("App.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if "bottomNav" in l or "BottomNav" in l or "tabItem" in l or "tabBar" in l:
        print(f"{i+1}: {l.strip()[:100]}")
