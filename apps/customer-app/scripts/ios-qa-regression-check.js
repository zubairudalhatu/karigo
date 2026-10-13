const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
function load(file, deps = {}) {
  const js = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(exports,require,module){${js}\n})(module.exports,require,module)`, {
    module, process: { env: {} }, URL, require: name => {
      assert.ok(name in deps, `Unexpected dependency ${name}`); return deps[name];
    }
  });
  return module.exports;
}
async function main() {
  const location = load('src/lib/customer-location.ts');
  const abuja = { latitude: 9.0765, longitude: 7.3986 };
  for (const place of [{ city: 'Abuja' }, { district: 'Gwarinpa', region: 'FCT' },
    { city: 'Federal Capital Territory' }, {}]) {
    assert.equal(location.resolveHomeLocation(abuja, place).city, 'Abuja');
  }
  assert.equal(location.resolveHomeLocation({ latitude: 9.11, longitude: 7.36 }, { city: 'Gwarinpa' }).city, 'Abuja');
  assert.equal(location.resolveHomeLocation({ latitude: 12.0022, longitude: 8.592 }, { district: 'Nassarawa' }).city, 'Kano');
  assert.equal(location.resolveHomeLocation({ latitude: 10.5105, longitude: 7.4165 }, { city: 'Kaduna' }).outsideServiceArea, true);
  assert.throws(() => location.resolveHomeLocation({ latitude: NaN, longitude: 0 }));
  const place = { name: 'Place', street: 'Street', district: 'District', subregion: 'Area', region: 'State' };
  assert.equal(location.reverseGeocodeAddress(place), 'Place, Street, District, Area, State');
  assert.ok(read('app/taxi/request.tsx').includes('reverseGeocodeAddress(place)'), 'Ride uses identical address normalization');
  let gps = 0;
  const deps = { permission: async () => ({ granted: true }), position: async () => { gps++; return { coords: abuja }; }, geocode: async () => [place] };
  assert.equal((await location.detectHomeLocation({ ...deps, permission: async () => ({ granted: false }) })).status, 'denied');
  assert.equal(gps, 0);
  assert.equal((await location.detectHomeLocation({ ...deps, position: async () => { throw Error('GPS'); } })).status, 'unavailable');
  assert.equal((await location.detectHomeLocation({ ...deps, geocode: async () => { throw Error('Geocoder'); } })).city, 'Abuja');
  assert.equal((await location.detectHomeLocation(deps)).address, location.reverseGeocodeAddress(place));

  let permission = { status: 'undetermined', granted: false }, requests = 0, registrations = [], token = 'ExponentPushToken[qa-only]', fail = false;
  const notifications = {
    IosAuthorizationStatus: { PROVISIONAL: 3, EPHEMERAL: 4 },
    getPermissionsAsync: async () => permission,
    requestPermissionsAsync: async () => { requests++; return permission = { status: 'granted', granted: true }; },
    getExpoPushTokenAsync: async options => { assert.equal(options.projectId, '467aa2f6-22b1-4a81-a9d6-c38f3ebe191d'); return { data: token }; }
  };
  const push = load('src/lib/customer-ios-push.ts', {
    'expo-constants': { default: { expoConfig: { extra: { eas: { projectId: '467aa2f6-22b1-4a81-a9d6-c38f3ebe191d' } } } } },
    'expo-device': { isDevice: true }, 'expo-notifications': notifications,
    '../api/notifications.api': { notificationsApi: { registerDeviceToken: async dto => {
      if (fail) throw Error(`secret ${token}`); registrations.push(dto);
    } } }
  });
  assert.equal(await push.registerCustomerIosPush('user'), false);
  assert.equal(requests, 0, 'Automatic registration cannot request permission');
  assert.equal(await push.registerCustomerIosPush('user', true), true);
  assert.equal(requests, 1);
  await Promise.all([push.registerCustomerIosPush('user'), push.registerCustomerIosPush('user')]);
  assert.equal(registrations.length, 1);
  assert.equal(registrations[0].platform, 'IOS'); assert.equal(registrations[0].provider, 'EXPO');
  assert.equal(registrations[0].appSurface, 'CUSTOMER_APP');
  permission = { status: 'denied', granted: false };
  assert.equal(await push.registerCustomerIosPush('user', true), false);
  assert.equal(requests, 1, 'Denied permission is never prompted repeatedly');
  assert.equal(push.iosPushPermission({ granted: false, ios: { status: 3 } }), 'granted');
  permission = { status: 'granted', granted: true }; token = 'ExponentPushToken[refreshed]';
  await push.registerCustomerIosPush('user'); assert.equal(registrations.length, 2);
  fail = true; token = 'ExponentPushToken[failed-secret]';
  await assert.rejects(push.registerCustomerIosPush('user'), error => !error.message.includes(token));
  fail = false; await push.registerCustomerIosPush('user'); assert.equal(registrations.length, 3, 'Failed registration remains retryable');
  permission = { status: 'undetermined', granted: false };
  const automatic = push.registerCustomerIosPush('new-user');
  const explicit = push.registerCustomerIosPush('new-user', true);
  assert.equal(await automatic, false); assert.equal(await explicit, true);
  assert.equal(requests, 2, 'An explicit enable action is not lost behind automatic registration');
  const screen = read('src/components/ios-notification-settings.tsx');
  assert.ok(screen.includes('Open Settings') && screen.includes('Enable notifications') && screen.includes('addPushTokenListener'));
  assert.ok(read('app/notifications.tsx').includes('Platform.OS === "ios"'));
  for (const state of ['undetermined', 'denied', 'granted']) {
    let stateIndex = 0, settingsOpened = 0;
    const values = [state, false, true, ''];
    const jsx = (type, props) => ({ type, props });
    const rendered = load('src/components/ios-notification-settings.tsx', {
      'expo-notifications': notifications,
      'react': { useState: () => [values[stateIndex++], () => {}], useEffect: () => {} },
      'react/jsx-runtime': { jsx, jsxs: jsx },
      'react-native': { Text: 'Text', AppState: {}, Linking: { openSettings: async () => { settingsOpened++; } } },
      '../contexts/auth-context': { useAuth: () => ({ user: { id: 'user' } }) },
      '../lib/customer-ios-push': push,
      './ui': { Card: 'Card', Button: 'Button', Message: 'Message', ui: {} }
    }).IosNotificationSettings();
    const children = rendered.props.children.filter(Boolean);
    const buttons = children.filter(node => node.type === 'Button');
    assert.equal(buttons.length, state === 'granted' ? 0 : 1);
    if (state === 'denied') {
      assert.equal(buttons[0].props.title, 'Open Settings');
      buttons[0].props.onPress(); await Promise.resolve(); assert.equal(settingsOpened, 1);
    }
    if (state === 'undetermined') assert.equal(buttons[0].props.title, 'Enable notifications');
  }

  for (const platform of ['ios', 'android']) {
    const diagnostics = load('src/lib/customer-updates.ts', {
      'react-native': { Platform: { OS: platform } },
      'expo-constants': { default: { nativeBuildVersion: platform === 'ios' ? '2' : '19',
        expoConfig: { version: '1.1.1', android: { versionCode: 19 }, ios: { buildNumber: '2' }, extra: { appEnvironment: 'production' } } } },
      'expo-updates': { runtimeVersion: '1.1.1', channel: 'customer-production', isEmbeddedLaunch: false, updateId: 'qa-update' }
    }).getCustomerUpdateDiagnostics();
    assert.equal(diagnostics.platform, platform); assert.equal(diagnostics.runtimeVersion, '1.1.1');
    assert.equal(diagnostics.channel, 'customer-production');
    assert.equal(platform === 'ios' ? diagnostics.iosBuildNumber : diagnostics.androidVersionCode, platform === 'ios' ? '2' : '19');
  }
  // Execute actual StyleSheet definitions; full-width iOS identity text is not constrained
  // by the avatar/edit columns and remains scalable at narrow widths/large text.
  const profile = read('app/profile.tsx');
  const definition = profile.slice(profile.indexOf('const styles = StyleSheet.create('));
  const context = { StyleSheet: { create: value => value }, brand: { colors: {} } };
  vm.runInNewContext(`${definition}\nglobalThis.result = styles;`, context);
  for (const width of [320, 390, 430, 768]) for (const fontScale of [1, 1.5, 2]) {
    assert.equal(context.result.iosHero.flexDirection, 'column');
    assert.equal(context.result.iosContactRow.alignItems, 'stretch');
    assert.ok(width - context.result.hero.padding * 2 > 0);
    assert.equal(context.result.contactText.fontSize * fontScale, 13 * fontScale);
  }
  assert.ok(!profile.includes('allowFontScaling={false}') && !profile.includes('numberOfLines='));
  assert.ok(!profile.includes('launchCameraAsync') && !profile.includes('requestCameraPermissionsAsync'));
  console.log('iOS QA regressions PASS: location, permission lifecycle, token deduplication, diagnostics and scalable identity layout.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
