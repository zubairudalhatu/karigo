const { withBaseMod } = require('@expo/config-plugins');

// TaskManager's automatic plugin adds fetch, but Captain implements no fetch job.
module.exports = (config) => withBaseMod(config, {
  platform: 'ios',
  mod: 'infoPlist',
  async action(mod) {
    // Ordinary withInfoPlist actions run before previously registered actions.
    // Normalize after TaskManager's action, but before the provider writes plist.
    const result = await mod.modRequest.nextMod(mod);
    result.modResults.UIBackgroundModes = ['location'];
    delete result.modResults.NSLocationAlwaysUsageDescription;
    return result;
  }
});
