const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withNonModularIncludes(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, "Podfile");
      let contents = fs.readFileSync(podfilePath, "utf8");

      // Add or extend post_install block to allow non-modular includes
      if (contents.includes("CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES")) {
        return config;
      }

      const snippet = `
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |build_config|
      build_config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
    end
  end
`;

      if (contents.match(/post_install do \|installer\|/)) {
        // Inject into existing post_install
        contents = contents.replace(
          /post_install do \|installer\|\n/,
          (m) => m + snippet
        );
      } else {
        // Create a post_install block
        contents += `

post_install do |installer|
${snippet}
end
`;
      }

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};
