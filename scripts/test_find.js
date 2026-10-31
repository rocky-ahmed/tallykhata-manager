const fs = require('fs');
const app = fs.readFileSync('App.js', 'utf8');

const checks = [
  { name: 'SCR-04 start', text: "{currentScreen === 'account_ledger' && selectedAccount ? (" },
  { name: 'SCR-04 bottom bar', text: "{/* Bottom Dual Entry Bar (দিলাম / পেলাম) */}" },
  { name: 'Customer list renderItem', text: "renderItem={({ item, index }) => {" },
  { name: 'modalAddTxn', text: '<Modal visible={modalAddTxn} animationType="slide" transparent onRequestClose={() => setModalAddTxn(false)}>' },
  { name: 'modalEditTxn', text: '<Modal visible={modalEditTxn} animationType="fade" transparent onRequestClose={() => setModalEditTxn(false)}>' },
  { name: 'modalVoucher', text: '<Modal visible={modalVoucher} animationType="slide" transparent onRequestClose={() => setModalVoucher(false)}>' },
  { name: 'modalEditAccount', text: '<Modal visible={modalEditAccount} animationType="slide" transparent onRequestClose={() => setModalEditAccount(false)}>' },
  { name: 'modalAddAccount', text: '<Modal visible={modalAddAccount} animationType="slide" transparent onRequestClose={() => setModalAddAccount(false)}>' }
];

checks.forEach(c => {
  const idx = app.indexOf(c.text);
  console.log(c.name + ':', idx !== -1 ? 'FOUND at ' + idx : 'NOT FOUND');
});
