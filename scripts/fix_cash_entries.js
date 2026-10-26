const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');
code = code.replace(
  '<SectionHeader title="ক্যাশবক্সের হিসাব সমূহ" count={recentCashEntries.length} />',
  '<SectionHeader title="ক্যাশবক্সের হিসাব সমূহ" count={(cashEntries || []).length} />'
);
fs.writeFileSync('App.js', code, 'utf8');
console.log('Fixed recentCashEntries -> cashEntries!');
