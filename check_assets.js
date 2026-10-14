const fs = require('fs');
const path = require('path');

const app = fs.readFileSync('App.js', 'utf-8');
const reg = /require\(['"](\.\/assets\/[^'"]+)['"]\)/g;
let m;
const missing = [];
const found = [];
while ((m = reg.exec(app)) !== null) {
  const assetPath = m[1];
  const fullPath = path.resolve(__dirname, assetPath);
  if (!fs.existsSync(fullPath)) {
    missing.push(assetPath);
  } else {
    found.push(assetPath);
  }
}

console.log(`Found ${found.length} valid asset references.`);
if (missing.length > 0) {
  console.error("Missing assets:", missing);
  process.exit(1);
} else {
  console.log("All assets exist!");
}
