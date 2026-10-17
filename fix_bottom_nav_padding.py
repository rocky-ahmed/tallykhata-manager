with open("App.js", "r", encoding="utf-8") as f:
    code = f.read()

import re
code = re.sub(
    r"bottomTabBar:\s*\{\s*flexDirection:\s*'row',\s*height:\s*Platform\.OS === 'android' \? \d+ : \d+,\s*paddingBottom:\s*Platform\.OS === 'android' \? \d+ : \d+,",
    "bottomTabBar: {\n    flexDirection: 'row',\n    height: Platform.OS === 'android' ? 84 : 62,\n    paddingBottom: Platform.OS === 'android' ? 26 : 4,",
    code
)

with open("App.js", "w", encoding="utf-8") as f:
    f.write(code)

print("Updated bottomTabBar padding successfully!")
