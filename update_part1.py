import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('part1_header_and_utils.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Update STORAGE_KEY
content = content.replace("const STORAGE_KEY = 'tallykhata_offline_store_v4';", "const STORAGE_KEY = 'tallykhata_offline_store_v5';")

helper_code = '''
const toBengaliNumber = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '০';
  const num = Math.round(Number(amount));
  const isNeg = num < 0;
  const absStr = Math.abs(num).toString();
  let formatted = '';
  if (absStr.length > 3) {
    const last3 = absStr.substring(absStr.length - 3);
    const rest = absStr.substring(0, absStr.length - 3);
    const withCommas = rest.replace(/\\B(?=(\\d{2})+(?!\\d))/g, ',');
    formatted = withCommas + ',' + last3;
  } else {
    formatted = absStr;
  }
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const bnStr = formatted.split('').map(c => (c >= '0' && c <= '9') ? bnDigits[parseInt(c, 10)] : c).join('');
  return isNeg ? '-' + bnStr : bnStr;
};

const toBengaliDecimal = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '০.০০';
  const num = Number(amount);
  const isNeg = num < 0;
  const absNum = Math.abs(num);
  const intPart = Math.floor(absNum);
  const decPart = Math.round((absNum - intPart) * 100).toString().padStart(2, '0');
  
  const absStr = intPart.toString();
  let formatted = '';
  if (absStr.length > 3) {
    const last3 = absStr.substring(absStr.length - 3);
    const rest = absStr.substring(0, absStr.length - 3);
    const withCommas = rest.replace(/\\B(?=(\\d{2})+(?!\\d))/g, ',');
    formatted = withCommas + ',' + last3;
  } else {
    formatted = absStr;
  }
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const bnInt = formatted.split('').map(c => (c >= '0' && c <= '9') ? bnDigits[parseInt(c, 10)] : c).join('');
  const bnDec = decPart.split('').map(c => (c >= '0' && c <= '9') ? bnDigits[parseInt(c, 10)] : c).join('');
  const res = bnInt + '.' + bnDec;
  return isNeg ? '-' + res : res;
};

const getAvatarInfo = (name, index) => {
  const colors = ['#DCFCE7', '#FEF08A', '#DBEAFE', '#FFE4E6', '#DCFCE7', '#FEF08A', '#DBEAFE', '#FFE4E6'];
  const bg = colors[index % colors.length];
  let text = 'ক';
  if (name) {
    const trimmed = name.trim();
    if (trimmed.includes('★')) {
      const firstWord = trimmed.split(/\\s+/)[0];
      text = (firstWord[0] || 'C').toUpperCase() + '★';
    } else {
      const words = trimmed.split(/\\s+/);
      if (words.length >= 2 && words[0][0] && words[1][0] && /[A-Za-z]/.test(words[0][0])) {
        text = (words[0][0] + words[1][0]).toUpperCase();
      } else if (words[0]) {
        text = words[0].slice(0, 2);
      }
    }
  }
  return { bg, text };
};
'''

if 'const toBengaliNumber' not in content:
    idx = content.find('const getTodayDate = () => {')
    content = content[:idx] + helper_code + '\n' + content[idx:]

# Replace INITIAL_ACCOUNTS
old_acc_start = content.find('const INITIAL_ACCOUNTS = [')
old_acc_end = content.find('];', old_acc_start) + 2

new_accounts = '''const INITIAL_ACCOUNTS = [
  { id: '1', name: 'Raihan ★ khoksha', phone: '01711223344', type: 1, balance: 7000, address: 'খোকসা বাজার', createDate: getTodayDate(), timeAgo: '৩ মাস' },
  { id: '2', name: 'Faysal ★★', phone: '01812345678', type: 1, balance: 10000, address: 'পশ্চিম পাড়া', createDate: getTodayDate(), timeAgo: '৩ মাস' },
  { id: '3', name: 'Abd. Samad ★ Jv', phone: '01911998877', type: 1, balance: 8000, address: 'জেভি মোড়', createDate: getTodayDate(), timeAgo: '৩ মাস' },
  { id: '4', name: 'Tanvir ★ Al Baraka', phone: '01622334455', type: 1, balance: 0, address: 'আল বারাকা মার্কেট', createDate: getTodayDate(), timeAgo: '৪ মাস' },
  { id: '5', name: 'Jwel Vai Gk', phone: '01733445566', type: 1, balance: 500, address: 'জিকে কলোনি', createDate: getTodayDate(), timeAgo: '৫ মাস' },
  { id: '6', name: 'Shamim Telecom', phone: '01744556677', type: 1, balance: 12000, address: 'স্টেশন রোড', createDate: getTodayDate(), timeAgo: '৬ মাস' },
  { id: '7', name: 'Kabir Hardware', phone: '01755667788', type: 1, balance: 15000, address: 'মেইন রোড', createDate: getTodayDate(), timeAgo: '২ মাস' },
  { id: '8', name: 'Babul Enterprise', phone: '01766778899', type: 1, balance: 18000, address: 'চকবাজার', createDate: getTodayDate(), timeAgo: '১ মাস' },
  { id: '9', name: 'Rubel Electronics', phone: '01777889900', type: 1, balance: 14000, address: 'নিউ মার্কেট', createDate: getTodayDate(), timeAgo: '৩ মাস' },
  { id: '10', name: 'Shuvo Mobile Store', phone: '01788990011', type: 1, balance: 9000, address: 'কলেজ গেট', createDate: getTodayDate(), timeAgo: '৪ মাস' },
  { id: '11', name: 'Ripon Telecom', phone: '01799001122', type: 1, balance: 7000, address: 'থানা মোড়', createDate: getTodayDate(), timeAgo: '৫ মাস' },
  { id: '12', name: 'Monir Store', phone: '01712341234', type: 1, balance: 8000, address: 'হাসপাতাল রোড', createDate: getTodayDate(), timeAgo: '২ মাস' },
];'''

content = content[:old_acc_start] + new_accounts + content[old_acc_end:]

with open('part1_header_and_utils.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('part1_header_and_utils.js updated successfully!')
