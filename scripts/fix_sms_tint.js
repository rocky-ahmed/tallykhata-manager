const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');
code = code.replace(
  '<AppIcon source={require(\'./assets/icons/ic_sms.png\')} variant="primary" shape="circle" size={20} containerSize={42} style={{ marginBottom: 6 }} />',
  '<AppIcon source={require(\'./assets/icons/ic_sms.png\')} variant="primary" shape="circle" size={20} containerSize={42} style={{ marginBottom: 6 }} tintColor={null} />'
);
fs.writeFileSync('App.js', code, 'utf8');
console.log('Updated ic_sms with tintColor={null} in App.js');
