import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('part2_state_and_handlers.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Update default businessName to Mobile Xpress
content = content.replace("const [businessName, setBusinessName] = useState('আমার ব্যবসা প্রতিষ্ঠান');", "const [businessName, setBusinessName] = useState('Mobile Xpress');")

# Add modalTallyMessage if not present
if 'modalTallyMessage' not in content:
    target = 'const [modalTagada, setModalTagada] = useState(false);'
    addition = 'const [modalTagada, setModalTagada] = useState(false);\n  const [modalTallyMessage, setModalTallyMessage] = useState(false);\n  const [tallyMessageBalance, setTallyMessageBalance] = useState(50);'
    content = content.replace(target, addition)

with open('part2_state_and_handlers.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('part2_state_and_handlers.js updated successfully!')
