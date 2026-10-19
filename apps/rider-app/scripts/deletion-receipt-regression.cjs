const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const code = fs.readFileSync(path.join(__dirname, '../src/lib/deletion-receipt.ts'), 'utf8');
const js = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
let saved = null;
const requests = [];
const exportsValue = {};
vm.runInNewContext(js, { exports: exportsValue, AbortController, setTimeout, clearTimeout,
  fetch: async (url, options) => { requests.push({ url, options }); return { ok: true, json: async () => ({ data: { status: 'COMPLETED' } }) }; },
  require(name) {
    if (name === 'expo-secure-store') return { setItemAsync: async (_key, value) => { saved = value; }, getItemAsync: async () => saved };
    assert.equal(name, '../api/client'); return { API_BASE_URL: 'https://api.example.invalid/api/v1' };
  }
});
(async () => {
  assert.equal(await exportsValue.readDeletionReceipt(), null);
  const receipt = { userId: 'synthetic-user', receiptToken: 'A'.repeat(43) };
  await exportsValue.saveDeletionReceipt(receipt);
  assert.equal((await exportsValue.readDeletionReceipt()).receiptToken, receipt.receiptToken);
  assert.equal((await exportsValue.loadDeletionReceipt(receipt)).status, 'COMPLETED');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'https://api.example.invalid/api/v1/account-deletion/captain-receipt');
  assert(!requests[0].url.includes(receipt.receiptToken));
  assert.equal(requests[0].options.headers['x-deletion-receipt'], receipt.receiptToken);
  assert(!requests[0].options.headers.Authorization);
  saved = '{invalid'; assert.equal(await exportsValue.readDeletionReceipt(), null);
  saved = JSON.stringify({ userId: 'synthetic', receiptToken: 'invalid' }); assert.equal(await exportsValue.readDeletionReceipt(), null);
  const screen = fs.readFileSync(path.join(__dirname, '../app/account-deletion.tsx'), 'utf8');
  assert(screen.indexOf('await saveDeletionReceipt(receipt)') < screen.indexOf('await accountDeletionApi.requestPermanentCaptainDeletion'));
  assert(screen.includes('await logout()'));
  const status = fs.readFileSync(path.join(__dirname, '../app/account-deletion-status.tsx'), 'utf8');
  assert(!status.includes('<Protected>'));
  assert(!status.includes('{receipt.receiptToken}'));
  console.log('PASS: secure receipt persistence/recovery, header-only bounded status request, corruption handling, pre-submit persistence and post-logout access');
})().catch(error => { console.error(error); process.exitCode = 1; });
