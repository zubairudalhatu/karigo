const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(file, dependencies, globals = {}) {
  const js = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX
  } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(exports,require,module){${js}\n})(module.exports,require,module)`, {
    module, require: name => { assert.ok(name in dependencies, name); return dependencies[name]; }, ...globals
  }); return module.exports;
}
async function main() {
  let stored = null, lastFetch;
  const receipt = load('src/lib/deletion-receipt.ts', {
    'expo-secure-store': { getItemAsync: async () => stored, setItemAsync: async (_, value) => { stored = value; } },
    '../api/client': { API_BASE_URL: 'https://example.invalid/api/v1' }
  }, { AbortController, setTimeout, clearTimeout, fetch: async (url, options) => {
    lastFetch = { url, options }; return { ok: true, json: async () => ({ data: { status: 'COMPLETED' } }) };
  } });
  const saved = { userId: 'synthetic-user', receiptToken: 'A'.repeat(43) };
  await receipt.saveDeletionReceipt(saved);
  assert.equal((await receipt.readDeletionReceipt()).receiptToken, saved.receiptToken);
  assert.equal((await receipt.loadDeletionReceipt(saved)).status, 'COMPLETED');
  assert.equal(lastFetch.url, 'https://example.invalid/api/v1/account-deletion/receipt');
  assert.ok(!lastFetch.url.includes(saved.receiptToken));
  assert.equal(lastFetch.options.headers['x-deletion-receipt'], saved.receiptToken);
  stored = '{corrupt'; assert.equal(await receipt.readDeletionReceipt(), null);

  async function flow(failStorage = false) {
    const states = [], refs = [], events = []; let cursor = 0, refCursor = 0;
    const jsx = (type, props) => ({ type, props });
    const component = load('src/components/permanent-customer-deletion.tsx', {
      'react': { useState: initial => { const i = cursor++; if (states[i] === undefined) states[i] = initial; return [states[i], v => { states[i] = v; }]; },
        useRef: initial => { const i = refCursor++; return refs[i] ??= { current: initial }; } },
      'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native': { Text: 'Text' },
      'expo-router': { router: { replace: () => events.push('navigate'), push: () => {} } },
      '../contexts/auth-context': { useAuth: () => ({ user: { id: 'synthetic-user' }, logout: async () => events.push('logout') }) },
      '../lib/biometric-auth': { setBiometricSignInEnabled: async enabled => { assert.equal(enabled, false); events.push('disable-biometrics'); } },
      '../lib/deletion-receipt': { readDeletionReceipt: async () => null, saveDeletionReceipt: async record => {
        events.push(record.requestReference ? 'save-reference' : 'save-capability'); if (failStorage) throw Error('storage failure');
      } },
      '../api/account-deletion.api': { accountDeletionApi: {
        prepare: async () => { events.push('prepare'); return { receiptToken: saved.receiptToken }; },
        request: async body => { assert.equal(body.confirmation, 'DELETE'); assert.equal(body.receiptToken, saved.receiptToken);
          events.push('request'); return { requestReference: 'ADR-synthetic' }; }
      } },
      './ui': { Protected: 'Protected', Screen: 'Screen', Card: 'Card', Field: 'Field', Message: 'Message', Button: 'Button', ui: {} }
    }).PermanentCustomerDeletion;
    const render = () => { cursor = 0; refCursor = 0; return component().props.children.props.children; };
    let children = render(); const field = children.find(n => n.type === 'Field');
    assert.equal(children.find(n => n.type === 'Button').props.disabled, true);
    field.props.onChangeText('DELETE'); children = render(); const button = children.find(n => n.type === 'Button');
    assert.equal(button.props.disabled, false); button.props.onPress(); button.props.onPress();
    for (let i = 0; i < 20; i++) await Promise.resolve();
    return events;
  }
  assert.deepEqual(await flow(), ['prepare', 'save-capability', 'request', 'save-reference', 'disable-biometrics', 'logout', 'navigate']);
  assert.deepEqual(await flow(true), ['prepare', 'save-capability'], 'Failed receipt persistence must never disable/delete the account');
  const screen = fs.readFileSync(path.join(root, 'app/profile/delete-account.tsx'), 'utf8');
  assert.ok(screen.includes('Platform.OS === "ios" ? <PermanentCustomerDeletion /> : <DeleteAccountRequestScreen />'), 'Android keeps its current UI');
  assert.ok(!fs.readFileSync(path.join(root, 'app/account-deletion-status.tsx'), 'utf8').includes('<Protected>'), 'Receipt remains readable after sign-out');
  console.log('Deletion Customer regressions PASS: authenticated confirmation control, one submission, save-before-disable, secure recovery, sign-out and Android UI preservation.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
