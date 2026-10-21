const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.join(__dirname, '..');
require('reflect-metadata');
const { plainToInstance } = require('class-transformer');
const { validateSync } = require('class-validator');
const dtoModule = { exports: {} };
const dtoCode = ts.transpileModule(fs.readFileSync(path.join(root, '../../services/backend-api/src/modules/riders/dto/update-captain-availability.dto.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, experimentalDecorators: true, emitDecoratorMetadata: true }
}).outputText;
new Function('require','module','exports',dtoCode)(require,dtoModule,dtoModule.exports);
function validatePayload(body) {
  return validateSync(plainToInstance(dtoModule.exports.UpdateCaptainAvailabilityDto, JSON.parse(JSON.stringify(body))));
}
function harness() {
  const cache = new Map(), storage = new Map(), uploads = [];
  let callback, running = false, options, failUpload = false, failAuth = false;
  let state = { activeWorkMode: 'RIDE', lockStage: 'ACCEPTED' };
  const native = { Accuracy: { Balanced: 3 }, ActivityType: { AutomotiveNavigation: 1 },
    getForegroundPermissionsAsync: async () => ({ granted: true }),
    requestBackgroundPermissionsAsync: async () => ({ granted: true }),
    hasStartedLocationUpdatesAsync: async () => running,
    startLocationUpdatesAsync: async (_name, opts) => { running = true; options = opts; },
    stopLocationUpdatesAsync: async () => { running = false; } };
  const mocks = {
    'react-native': { AppState: { currentState: 'active' }, Alert: { alert: (_t, _b, buttons) => buttons[1].onPress() } },
    'expo-location': native,
    'expo-task-manager': { defineTask: (name, cb) => { assert.equal(name, 'karigo-captain-active-work-location'); callback = cb; } },
    'expo-secure-store': { getItemAsync: async k => storage.get(k) ?? null,
      setItemAsync: async (k, v) => storage.set(k, v), deleteItemAsync: async k => storage.delete(k) },
    '../api/captain-access.api': { captainAccessApi: { workState: async () => { if (failAuth) throw Error('session unavailable'); return state; },
      updateAvailability: async body => {
        if (failUpload) throw Error('temporary upload failure');
        assert.equal(validatePayload(body).length, 0, 'actual backend DTO must accept the serialized upload');
        uploads.push(JSON.parse(JSON.stringify(body))); return state;
      } } }
  };
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    new Function('require','module','exports',code)(name => name in mocks ? mocks[name] : load(path.resolve(path.dirname(file), name + '.ts')), module, module.exports);
    return module.exports;
  }
  const bg = load(path.join(root, 'src/lib/background-location.ts'));
  return { bg, uploads, storage, native, setState: s => { state = s; }, failUpload: value => { failUpload = value; }, failAuth: value => { failAuth = value; }, callback: event => callback(event), options: () => options, running: () => running,
    trace: load(path.join(root, 'src/lib/ride-trace-buffer.ts')) };
}
const sample = (offset, speed = -1, heading = -1) => ({ timestamp: Date.now() + offset,
  coords: { latitude: 9.08 + offset / 10000000, longitude: 7.49, accuracy: 10, speed, heading } });
(async () => {
  assert(validatePayload({latitude:9.08,longitude:7.49,tracePoints:[{
    clientPointId:'synthetic-regression',latitude:9.08,longitude:7.49,recordedAt:new Date().toISOString(),speedMetersPerSecond:-1,headingDegrees:-1
  }]}).length > 0, 'shipped iOS unknown-value payload is rejected by actual backend DTO');
  const h = harness(); await h.bg.enableActiveWorkBackgroundLocation();
  assert(h.running()); assert.equal(h.options().distanceInterval, 50);
  assert.equal(h.options().deferredUpdatesDistance, 100); assert.equal(h.options().deferredUpdatesInterval, 60000);
  // Simulated delivered batch exceeds 100m and spans more than 60 seconds.
  await h.callback({ data: { locations: [sample(-70000), sample(0)] } });
  assert.equal(h.uploads.length, 1); assert.equal(h.uploads[0].tracePoints.length, 2); assert.equal(h.storage.size, 0);
  assert.equal(h.uploads[0].tracePoints[0].source, 'BACKGROUND');
  const fg = h.trace.foregroundRideTracePoint({ latitude: 9.08, longitude: 7.49, recordedAt: new Date().toISOString(), accuracyMeters: null, speedMetersPerSecond: null, headingDegrees: -1 });
  for (const key of ['accuracyMeters','speedMetersPerSecond','headingDegrees']) assert.equal(fg[key], undefined);
  const valid = h.trace.foregroundRideTracePoint({ latitude: 9.08, longitude: 7.49, recordedAt: new Date().toISOString(), accuracyMeters: 0, speedMetersPerSecond: 0, headingDegrees: 0 });
  assert.equal(valid.speedMetersPerSecond, 0); assert.equal(valid.headingDegrees, 0);
  const retry = harness(); await retry.bg.enableActiveWorkBackgroundLocation(); retry.failUpload(true);
  const event = {data:{locations:[sample(0)]}};
  await assert.rejects(retry.callback(event)); assert.equal(retry.storage.size, 1);
  retry.failUpload(false); await retry.callback(event);
  assert.equal(retry.uploads.length, 1); assert.equal(retry.uploads[0].tracePoints.length, 1); assert.equal(retry.storage.size, 0);
  retry.failAuth(true); await retry.callback(event);
  assert.equal(retry.running(), false); assert.equal(retry.uploads.length, 1); assert.equal(retry.storage.size, 0);
  h.setState({ activeWorkMode: null, lockStage: null });
  await h.callback({ data: { locations: [sample(0)] } });
  assert.equal(h.uploads.length, 1); assert.equal(h.running(), false); assert.equal(h.storage.size, 0);
  console.log('PASS: exact task callback, accepted-work batch, first upload, secure-buffer acknowledgement, unavailable telemetry, valid zero values, and terminal stop/no upload. Native iOS delivery is not simulated.');
})().catch(e => { console.error(e); process.exitCode = 1; });
