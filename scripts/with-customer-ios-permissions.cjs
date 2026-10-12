const { withInfoPlist } = require("@expo/config-plugins");

// Customer selects profile photos from the library and requests foreground
// location only. Keep this mod iOS-only so Android production is unchanged.
module.exports = function withCustomerIosPermissions(config) {
  return withInfoPlist(config, (modConfig) => {
    const plist = modConfig.modResults;
    delete plist.NSCameraUsageDescription;
    delete plist.NSLocationAlwaysUsageDescription;
    delete plist.NSLocationAlwaysAndWhenInUseUsageDescription;
    plist.NSFaceIDUsageDescription = "KariGO uses Face ID only when you enable biometric sign-in.";
    return modConfig;
  });
};
