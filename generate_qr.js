const fs = require('fs');
const path = require('path');
const QRCode = require('./node_modules/.pnpm/qrcode-terminal@0.11.0/node_modules/qrcode-terminal/vendor/QRCode');

const targetUrl = 'exp://192.168.10.232:8081';
const qr = new QRCode(4, 0);
qr.addData(targetUrl);
qr.make();

const count = qr.getModuleCount();
const scale = 10;
const margin = 4;
const size = (count + margin * 2) * scale;

let svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">\n';
svg += '<rect width="100%" height="100%" fill="#ffffff"/>\n';
for (let r = 0; r < count; r++) {
  for (let c = 0; c < count; c++) {
    if (qr.isDark(r, c)) {
      const x = (c + margin) * scale;
      const y = (r + margin) * scale;
      svg += '<rect x="' + x + '" y="' + y + '" width="' + scale + '" height="' + scale + '" fill="#000000"/>\n';
    }
  }
}
svg += '</svg>';

fs.writeFileSync('qrcode.svg', svg);

const html = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <title>টালি খাতা - Expo Go QR Code</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f4f6f9; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
    .card { background: white; border-radius: 16px; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); max-width: 480px; width: 100%; text-align: center; }
    h1 { color: #1e293b; font-size: 24px; margin-top: 0; margin-bottom: 8px; }
    .badge { display: inline-block; background: #e0f2fe; color: #0284c7; padding: 4px 12px; border-radius: 999px; font-size: 13px; font-weight: 600; margin-bottom: 20px; }
    .qr-box { background: white; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 16px; display: inline-block; margin-bottom: 20px; }
    .qr-box svg { display: block; max-width: 100%; height: auto; border-radius: 8px; }
    .url-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-family: monospace; font-size: 16px; color: #0f172a; font-weight: bold; margin-bottom: 20px; user-select: all; }
    ol { text-align: left; color: #475569; font-size: 14px; line-height: 1.6; padding-left: 20px; margin-bottom: 24px; }
    li { margin-bottom: 8px; }
    .note { font-size: 12px; color: #64748b; background: #fef3c7; color: #92400e; padding: 10px; border-radius: 6px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>টালি খাতা (TallyKhata)</h1>
    <span class="badge">React Native Expo - 100% Offline</span>
    <div class="qr-box">
      ${svg}
    </div>
    <div class="url-box">${targetUrl}</div>
    <ol>
      <li>আপনার ফোনে Google Play Store থেকে <b>Expo Go</b> অ্যাপ ইনস্টল করুন।</li>
      <li>ফোন এবং কম্পিউটার একই <b>Wi-Fi</b> নেটওয়ার্কে সংযুক্ত রাখুন।</li>
      <li>প্রজেক্ট ফোল্ডারে <code>start.bat</code> চালু করুন (মেট্রো সার্ভার)।</li>
      <li>Expo Go দিয়ে উপরের QR কোডটি স্ক্যান করুন অথবা সরাসরি URL-টি টাইপ করুন।</li>
    </ol>
    <div class="note">
      অ্যান্ড্রয়েড স্টুডিও প্রয়োজন নেই। লো-কনফিগারেশন কম্পিউটারেও সরাসরি ফোনে টেস্ট করতে পারবেন।
    </div>
  </div>
</body>
</html>`;

fs.writeFileSync('scan-qr.html', html);
console.log('Successfully generated qrcode.svg and scan-qr.html');
