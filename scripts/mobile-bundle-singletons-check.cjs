const fs = require('node:fs');
const assert = require('node:assert/strict');

function check(mapPath) {
  const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  const paths = map.sources.map(source => source.replaceAll('\\', '/'));
  const singletonSuffixes = [
    '/react/cjs/react.production.js',
    '/react-native/Libraries/ReactNative/RendererImplementation.js',
    '/react-native/Libraries/Renderer/shims/ReactNativeViewConfigRegistry.js',
    '/expo-router/build/ExpoRoot.js',
  ];
  const counts = Object.fromEntries(singletonSuffixes.map(suffix => [suffix, paths.filter(p => p.endsWith(suffix)).length]));
  for (const [name, count] of Object.entries(counts)) {
    assert.equal(count, 1, `Expected exactly one ${name}; found ${count}`);
  }
  return counts;
}

if (require.main === module) {
  for (const mapPath of process.argv.slice(2)) console.log(JSON.stringify(check(mapPath)));
  if (process.argv.length < 3) throw Error('Supply exported production source map(s).');
}
module.exports = { check };
