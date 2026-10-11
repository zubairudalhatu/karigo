const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../app/utilities/gotv-acceptance.tsx'), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
function render(allowed, account, quote) {
  const states = [allowed, '1234567890', account, 'opaque-id', quote, false, '']; let next = 0;
  const node = (type, props) => ({ type, props });
  const exports = {};
  vm.runInNewContext(output, { exports, require(name) {
    if (name === 'react') return { useState: () => [states[next++], () => {}], useEffect: () => {}, useRef: value => ({ current: value }) };
    if (name === 'react/jsx-runtime') return { jsx: node, jsxs: node, Fragment: 'Fragment' };
    if (name === 'react-native') return { Text: 'Text' };
    if (name.includes('utilities.api')) return { utilitiesApi: {} };
    if (name.endsWith('/ui')) return { Button: 'Button', Card: 'Card', Field: 'Field', Loading: 'Loading', Message: 'Message', Protected: 'Protected', Screen: 'Screen', ui: {} };
    if (name.endsWith('/errors')) return { friendlyError: () => 'Safe error' };
    throw Error(`Unexpected test import ${name}`);
  } });
  return exports.default();
}
function nodes(tree) { return Array.isArray(tree) ? tree.flatMap(nodes) : tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : []; }
function text(tree) { return Array.isArray(tree) ? tree.map(text).join('') : tree && typeof tree === 'object' ? text(tree.props?.children) : String(tree ?? ''); }
const quote = { provider: 'GOtv', recipientName: 'Provider returned test name', recipient: '******7890', product: { name: 'Live bouquet' }, amountKobo: 190000, convenienceFeeKobo: 0, totalKobo: 190000, walletBeforeKobo: 250000, projectedWalletAfterKobo: 60000 };
const account = { recipientName: quote.recipientName, recipient: quote.recipient, products: [] };
const tree = render(true, account, quote);
const displayed = text(tree);
for (const expected of ['CABLE TV SUBSCRIPTION', 'GOtv', 'Provider returned test name', '******7890', 'Live bouquet', '1,900.00', '2,500.00', '600.00']) assert(displayed.includes(expected), `Missing confirmation information ${expected}`);
assert(!displayed.includes('1234567890'), 'Confirmation must mask the IUC');
const pay = nodes(tree).find(node => node.type === 'Button' && node.props.title === 'Pay — not enabled');
assert(pay?.props.disabled && !pay.props.onPress, 'Read-only confirmation must have no payment handler');
assert(!text(render(false, null, null)).includes('Account verified'), 'Unauthorized account must not receive confirmation');
assert(!text(render(true, null, null)).includes('Account verified'), 'Failed/unperformed validation must not show verified identity');
assert(text(render(true, { ...account, recipientName: null }, null)).includes('GOtv did not supply a customer name.'), 'Missing name must not be fabricated');
console.log('GOtv confirmation behavior checks passed: provider identity, live quote amounts, masked IUC, denied access, missing name, and payment disabled.');
