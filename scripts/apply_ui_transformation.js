const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const appPath = path.resolve('App.js');
let content = fs.readFileSync(appPath, 'utf8');

// 1. Add mmHideBalance and modalMMMonthPicker state declarations if not present
if (!content.includes('const [mmHideBalance, setMmHideBalance]')) {
  const target = `const [modalMMCustomDateRange, setModalMMCustomDateRange] = useState(false);`;
  const addition = `const [modalMMCustomDateRange, setModalMMCustomDateRange] = useState(false);\n  const [mmHideBalance, setMmHideBalance] = useState(false);\n  const [modalMMMonthPicker, setModalMMMonthPicker] = useState(false);`;
  content = content.replace(target, addition);
}

// 2. Add modalMMMonthPicker to BackHandler useEffect
if (!content.includes('if (modalMMMonthPicker)')) {
  const effectTarget = `if (modalMMCustomDateRange) { setModalMMCustomDateRange(false); return true; }`;
  const effectAddition = `if (modalMMMonthPicker) { setModalMMMonthPicker(false); return true; }\n      if (modalMMCustomDateRange) { setModalMMCustomDateRange(false); return true; }`;
  content = content.replace(effectTarget, effectAddition);

  // also update dependency and check
  content = content.replace(
    `!modalMMEditCategory && !modalMMCustomDateRange) return;`,
    `!modalMMEditCategory && !modalMMCustomDateRange && !modalMMMonthPicker) return;`
  );
  content = content.replace(
    `modalMMEditCategory, modalMMCustomDateRange]);`,
    `modalMMEditCategory, modalMMCustomDateRange, modalMMMonthPicker]);`
  );
}

fs.writeFileSync(appPath, content, 'utf8');
console.log('State and back handler updated.');

// Validate syntax
babel.parseSync(content, {
  filename: 'App.js',
  configFile: false,
  babelrc: false,
  parserOpts: { plugins: ['jsx', 'flow'] }
});
console.log('Babel syntax check 1 passed.');
