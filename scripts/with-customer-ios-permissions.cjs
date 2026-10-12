const { withInfoPlist } = require("@expo/config-plugins");

// Customer selects profile photos from the library and requests foreground
// location only. Keep this mod iOS-only so Android production is unchanged.
module.exports = function withCustomerIosPermissions(config) {
  return withInfoPlist(config, (modConfig) => {
    const plist = modConfig.modResults;
    // Apple requires a purpose string for camera APIs compiled into media SDKs.
    // This declaration does not request permission or add a camera feature.
    plist.NSCameraUsageDescription = "KariGO may request camera access when using communication or media features that require it.";
    delete plist.NSLocationAlwaysUsageDescription;
    delete plist.NSLocationAlwaysAndWhenInUseUsageDescription;
    plist.NSFaceIDUsageDescription = "KariGO uses Face ID only when you enable biometric sign-in.";
    return modConfig;
  });
};
