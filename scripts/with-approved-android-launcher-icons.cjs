const fs = require("node:fs/promises");
const path = require("node:path");
const { withDangerousMod } = require("@expo/config-plugins");

const densities = ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"];

module.exports = function withApprovedAndroidLauncherIcons(config) {
  return withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const sourceRoot = path.join(modConfig.modRequest.projectRoot, "assets", "android-launcher");
      const resourceRoot = path.join(modConfig.modRequest.platformProjectRoot, "app", "src", "main", "res");

      for (const density of densities) {
        const source = path.join(sourceRoot, `mipmap-${density}-v4`);
        const target = path.join(resourceRoot, `mipmap-${density}-v4`);
        await fs.mkdir(target, { recursive: true });
        await Promise.all([
          fs.copyFile(path.join(source, "ic_launcher.webp"), path.join(target, "ic_launcher.webp")),
          fs.copyFile(path.join(source, "ic_launcher_round.webp"), path.join(target, "ic_launcher_round.webp"))
        ]);
      }

      return modConfig;
    }
  ]);
};
