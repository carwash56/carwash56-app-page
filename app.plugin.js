const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withIosPodfileFixes(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, "Podfile");
      let contents = fs.readFileSync(podfilePath, "utf8");

      // 1) Ensure use_modular_headers! is enabled globally (fixes GoogleUtilities modules)
      if (!contents.includes("use_modular_headers!")) {
        // Insert right after platform line if possible, otherwise prepend
        const platformRegex = /^platform :ios.*\n/m;
        if (platformRegex.test(contents)) {
          contents = contents.replace(platformRegex, (m) => m + "use_modular_headers!\n");
        } else {
          contents = "use_modular_headers!\n" + contents;
        }
      }

      // 2) Allow non-modular includes (helps avoid Werror breaks)
      if (!contents.includes("CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES")) {
        const snippet = `
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |build_config|
      build_config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
    end
  end
`;

        if (contents.match(/post_install do \|installer\|/)) {
          contents = contents.replace(/post_install do \|installer\|\n/, (m) => m + snippet);
        } else {
          contents += `

post_install do |installer|
${snippet}
end
`;
        }
      }

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};
