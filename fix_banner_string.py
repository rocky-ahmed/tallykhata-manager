import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('part3_views_and_tabs.js', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('promoBannerTextCol')
end_idx = text.find('</View>', idx)
banner_col = text[idx:end_idx+7]
print('Current block:\n', banner_col)

# Replace with clean JSX
clean_block = """promoBannerTextCol}>
                      <Text style={styles.promoBannerBold}>মানি ট্রান্সফার</Text>
                      <Text style={styles.promoBannerBold}>চার্জ ফ্রি!*</Text>
                      <Text style={styles.promoBannerSub}>*শর্ত প্রযোজ্য</Text>
                    </View>"""

text = text[:idx] + clean_block + text[end_idx+7:]

with open('part3_views_and_tabs.js', 'w', encoding='utf-8') as f:
    f.write(text)

print('Fixed promo banner text!')
