import sys
sys.stdout.reconfigure(encoding='utf-8')

target = sys.argv[1] if len(sys.argv) > 1 else 'part3_views_and_tabs.js'
start = int(sys.argv[2]) if len(sys.argv) > 2 else 1
count = int(sys.argv[3]) if len(sys.argv) > 3 else 80

with open(target, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f'=== {target} (lines {start} to {start + count}) ===')
for i in range(start - 1, min(len(lines), start - 1 + count)):
    print(f'{i+1}: {lines[i]}', end='')
