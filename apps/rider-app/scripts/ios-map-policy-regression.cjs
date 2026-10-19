const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/lib/captain-map-policy.ts'), 'utf8');
const exportsValue = {};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: exportsValue });
const allowed = exportsValue.captainTripMapAllowed;
const point = { latitude: 0, longitude: 0 };
assert(allowed('ios', []));
assert(allowed('ios', [{ coordinate: null, source: 'GOOGLE_DERIVED' }]));
assert(allowed('ios', Array(3).fill({ coordinate: point, source: 'USER_SUPPLIED' })));
for (const source of ['GOOGLE_DERIVED', 'LEGACY_UNKNOWN', undefined, null]) {
  for (let index = 0; index < 3; index++) {
    const points = Array.from({ length: 3 }, () => ({ coordinate: point, source: 'USER_SUPPLIED' }));
    points[index] = { coordinate: point, source };
    assert.equal(allowed('ios', points), false);
    assert.equal(allowed('android', points), true);
  }
}
console.log('PASS: iOS pickup/destination/stop provenance fail-closed; device-only and USER_SUPPLIED allowed; Android map policy unchanged');
