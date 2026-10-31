const fs = require('fs');
const filePath = 'src/components/Button3D.js';
let content = fs.readFileSync(filePath, 'utf8');

const target = `    case 'compact':
      bg = theme.surfaceVariant;
      textColor = theme.textPrimary;
      borderTopColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#FFFFFF';
      borderBottomColor = isDark ? '#1E293B' : '#CBD5E1';
      borderSideColor = isDark ? '#334155' : '#E2E8F0';
      borderBottomWidth = 2;
      break;`;

const addition = target + `
    case 'success':
      bg = isDark ? (theme.income || '#047857') : (theme.success || '#059669');
      textColor = '#FFFFFF';
      borderTopColor = isDark ? '#6EE7B7' : '#34D399';
      borderBottomColor = isDark ? '#064E3B' : '#047857';
      borderSideColor = isDark ? '#047857' : '#059669';
      break;
    case 'warning':
    case 'gold':
      bg = theme.warning || '#D97706';
      textColor = '#FFFFFF';
      borderTopColor = isDark ? '#FCD34D' : '#FBBF24';
      borderBottomColor = isDark ? '#78350F' : '#B45309';
      borderSideColor = isDark ? '#92400E' : '#D97706';
      break;
    case 'info':
    case 'blue':
      bg = isDark ? '#2563EB' : '#1D4ED8';
      textColor = '#FFFFFF';
      borderTopColor = isDark ? '#93C5FD' : '#60A5FA';
      borderBottomColor = isDark ? '#1E3A8A' : '#1E40AF';
      borderSideColor = isDark ? '#1D4ED8' : '#2563EB';
      break;`;

if (!content.includes("case 'success':")) {
  content = content.replace(target, addition);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Button3D.js updated successfully!');
} else {
  console.log('Button3D.js already contains success variant.');
}
