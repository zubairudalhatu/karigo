const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

// Windows junctions can expose the same dependency through two absolute paths.
// Metro assigns module IDs by path; canonicalize before it builds the graph so
// the renderer and application share the same React/native-module instances.
function canonicalizeResolution(resolution) {
  // Expo represents generated polyfills as virtual paths, not filesystem files.
  if (resolution.type === 'sourceFile' && !resolution.filePath.includes('\0')) {
    return { ...resolution, filePath: fs.realpathSync.native(resolution.filePath) };
  }
  return resolution;
}

function createMobileMetroConfig(appRoot) {
  const appRequire = createRequire(path.join(appRoot, 'package.json'));
  const { getDefaultConfig } = appRequire('expo/metro-config');
  const config = getDefaultConfig(appRoot);
  const upstream = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, name, platform) =>
    canonicalizeResolution((upstream ?? context.resolveRequest)(context, name, platform));
  return config;
}

module.exports = { createMobileMetroConfig, canonicalizeResolution };
