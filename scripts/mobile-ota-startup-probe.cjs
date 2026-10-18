// A hermetic JS auth-bootstrap probe, not a native cold-launch certification.
// Source comes from the exported artifact; network, device APIs and persisted
// credentials are replaced with synthetic fixtures. No Production requests.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');

async function probe(mapPath, role) {
  const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  const reactSources = map.sources.map((p, i) => ({ p, i }))
    .filter(({ p }) => /\/react\/cjs\/react.production.js$/.test(p));
  const authIndex = map.sources.findIndex(p => p.endsWith('/src/contexts/auth-context.tsx'));
  assert.ok(authIndex >= 0, 'Auth bootstrap source missing');
  const authCode = ts.transpileModule(map.sourcesContent[authIndex], {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const results = [];
  for (const restored of [false, true]) {
    const copies = reactSources.map(({ i }) => {
      const context = { exports: {} };
      vm.runInNewContext(map.sourcesContent[i], context);
      return context.exports;
    });
    const rendererReact = copies[0];
    const appReact = copies.at(-1);
    const values = [], effects = [];
    rendererReact.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE.H = {
      useState(initial) {
        const i = values.length;
        values.push(initial);
        return [initial, next => { values[i] = next; }];
      },
      useEffect(effect) { effects.push(effect); },
    };
    const ErrorType = class extends Error {};
    const errors = new Proxy({}, { get: () => ErrorType });
    const client = {
      authSessionStore: { beginOperation: () => 1, isCurrent: () => true, readSession: async () => restored ? {} : null },
      onUnauthorized: () => () => {}, refreshTokenStore: {},
    };
    const mocks = {
      react: appReact,
      'react/jsx-runtime': { jsx: (type, props) => appReact.createElement(type, props) },
      '@karigo/config': errors, '@karigo/shared-types': errors,
      '../api/client': client,
      '../api/auth.api': { authApi: { me: async () => ({ id: 'synthetic-subject', role }) } },
      '../lib/biometric-auth': { getBiometricCapability: async () => ({ available: false }), getBiometricSignInEnabled: async () => false },
      '../lib/phone': {}, '../lib/captain-notifications': {}, '../lib/background-location': {},
    };
    const context = { exports: {}, require: name => {
      assert.ok(Object.hasOwn(mocks, name), `Unmocked dependency: ${name}`);
      return mocks[name];
    } };
    let failure = null;
    try {
      vm.runInNewContext(authCode, context);
      context.exports.AuthProvider({ children: null });
      for (const effect of effects) effect();
      for (let i = 0; i < 10; i++) await new Promise(resolve => setImmediate(resolve));
      assert.equal(values[1], false, 'Bootstrap loading must finish');
      assert.equal(values[0]?.id ?? null, restored ? 'synthetic-subject' : null);
    } catch (error) {
      failure = `${error.name}: ${error.message}`;
    }
    let rendererFailure = null;
    // An actual React 19 renderer independently corroborates the split-hook
    // failure. This is a JS-only SSR render, not an iOS/Android renderer test.
    try {
      const domPackage = require.resolve('react-dom/package.json', { paths: [path.dirname(path.resolve(mapPath))] });
      const domRoot = path.dirname(domPackage);
      assert.equal(JSON.parse(fs.readFileSync(domPackage)).version, rendererReact.version);
      const renderer = { exports: {}, require: name => {
        if (name === 'react') return rendererReact;
        if (name === 'react-dom') return require(domRoot);
        throw Error('Unexpected renderer dependency');
      } };
      vm.runInNewContext(fs.readFileSync(path.join(domRoot, 'cjs/react-dom-server-legacy.browser.production.js'), 'utf8'), renderer);
      renderer.exports.renderToString(rendererReact.createElement(context.exports.AuthProvider, { children: null }));
    } catch (error) {
      rendererFailure = `${error.name}: ${error.message}`;
    }
    results.push({ scenario: restored ? 'SYNTHETIC_SESSION_RESTORE' : 'COLD_NO_SESSION', passed: failure === null, failure,
      jsRendererPassed: rendererFailure === null, jsRendererFailure: rendererFailure });
  }
  return { reactCopies: reactSources.length, nativeLaunchTested: false, results };
}

if (require.main === module) {
  probe(process.argv[2], process.argv[3]).then(result => {
    console.log(JSON.stringify(result, null, 2));
    if (result.results.some(r => !r.passed)) process.exitCode = 1;
  }).catch(() => { console.error('STARTUP_PROBE_FAILED'); process.exitCode = 1; });
}
module.exports = { probe };
