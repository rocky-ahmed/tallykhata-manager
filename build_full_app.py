import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('part1_header_and_utils.js', 'r', encoding='utf-8') as f:
    p1 = f.read()

with open('part2_state_and_handlers.js', 'r', encoding='utf-8') as f:
    p2 = f.read()

with open('part3_views_and_tabs.js', 'r', encoding='utf-8') as f:
    p3 = f.read()

with open('part4_modals_and_screens.js', 'r', encoding='utf-8') as f:
    p4 = f.read()

with open('part5_stylesheet.js', 'r', encoding='utf-8') as f:
    p5 = f.read()

split_token = '// Wrap root component with crash-proof ErrorBoundary'
if split_token in p4:
    p4_body, p4_footer = p4.split(split_token, 1)
    full_code = p1 + '\n\n' + p2 + '\n\n' + p3 + '\n\n' + p4_body + '\n\n' + p5 + '\n\n' + split_token + p4_footer
else:
    full_code = p1 + '\n\n' + p2 + '\n\n' + p3 + '\n\n' + p4 + '\n\n' + p5

with open('App.js', 'w', encoding='utf-8') as f:
    f.write(full_code)

print(f'Full App.js generated: {len(full_code)} characters, {len(full_code.splitlines())} lines.')
