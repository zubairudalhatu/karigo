const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/lib/microphone-permission.ts'), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
async function scenario(os, current, requested, expected, expectedRequests) {
  let requests = 0;
  let loads = 0;
  const exports = {};
  vm.runInNewContext(js, { exports, require(name) {
    if (name === 'react-native') return { Platform: { OS: os }, PermissionsAndroid: {
      PERMISSIONS: { RECORD_AUDIO: 'audio' }, RESULTS: { GRANTED: 'granted', NEVER_ASK_AGAIN: 'blocked' },
      check: async () => current.granted,
      request: async () => { requests++; return requested; }
    } };
    assert.equal(name, 'expo-audio'); loads++;
    return { getRecordingPermissionsAsync: async () => current,
      requestRecordingPermissionsAsync: async () => { requests++; return requested; } };
  } });
  assert.equal(loads, 0, 'Loading the helper must not initialize native audio');
  assert.equal(requests, 0, 'No launch permission prompt');
  assert.equal(await exports.requestCallMicrophone(), expected);
  assert.equal(requests, expectedRequests);
  if (os !== 'ios') assert.equal(loads, 0, 'Existing Android runtime must not load ExpoAudio');
}
(async () => {
  await scenario('ios', { granted: true }, null, 'allowed', 0);
  await scenario('ios', { granted: false, canAskAgain: true }, { granted: true }, 'allowed', 1);
  await scenario('ios', { granted: false, canAskAgain: true }, { granted: false, canAskAgain: true }, 'denied', 1);
  await scenario('ios', { granted: false, canAskAgain: false }, null, 'blocked', 0);
  await scenario('ios', { granted: false, canAskAgain: true }, { granted: false, canAskAgain: false }, 'blocked', 1);
  await scenario('android', { granted: true }, null, 'allowed', 0);
  await scenario('android', { granted: false }, 'granted', 'allowed', 1);
  await scenario('android', { granted: false }, 'denied', 'denied', 1);
  await scenario('android', { granted: false }, 'blocked', 'blocked', 1);
  const call = fs.readFileSync(path.join(__dirname, '../app/ride-call/[tripId].tsx'), 'utf8');
  assert(call.includes('Open microphone settings'));
  assert(call.includes('engine.leaveChannel()') && call.includes('engine.release()'));
  const plugin = require('../plugins/with-captain-ios-background-modes.cjs');
  const config = plugin({ mods: { ios: { infoPlist: async mod => {
    mod.modResults.UIBackgroundModes.push('fetch'); return mod;
  } } } });
  const result = await config.mods.ios.infoPlist({ modRequest: {}, modResults: {
    UIBackgroundModes: ['location'], NSLocationAlwaysUsageDescription: 'obsolete'
  } });
  assert.deepEqual(result.modResults.UIBackgroundModes, ['location']);
  assert.equal(result.modResults.NSLocationAlwaysUsageDescription, undefined);
  console.log('PASS: 9 microphone permission scenarios, call recovery/teardown, final background-mode ordering');
})().catch(error => { console.error(error); process.exitCode = 1; });
