import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open("App.js", "r", encoding="utf-8") as f:
    content = f.read()

print(f"File length: {len(content)} characters, {len(content.splitlines())} lines")

# Check tabs
tabs = re.findall(r"activeTab\s*===\s*'([^']+)'", content)
print("Active tab values used in code:", set(tabs))

# Check modal states
modals = re.findall(r"setModal([A-Za-z0-9_]+)\(true\)", content)
print("Modals opened:", set(modals))

# Check data structures
states = re.findall(r"const\s+\[([A-Za-z0-9_]+),\s*set[A-Za-z0-9_]+\]\s*=\s*useState", content)
print(f"Total state hooks: {len(states)}")
print("Sample states:", states[:20])
