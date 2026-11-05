// Expo config plugin: copies our Swift file into the generated iOS project and
// registers it as a source file, so it is compiled into the app. Needed because
// `expo prebuild` regenerates the ios/ folder from scratch each time.
const fs = require('fs');
const path = require('path');
const { withXcodeProject, IOSConfig } = require('expo/config-plugins');

module.exports = function withAppIntent(config) {
  return withXcodeProject(config, (cfg) => {
    const name = cfg.modRequest.projectName;
    const dest = path.join(cfg.modRequest.platformProjectRoot, name, 'IsAppBlockedIntent.swift');
    fs.copyFileSync(path.join(__dirname, 'IsAppBlockedIntent.swift'), dest);
    IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
      filepath: `${name}/IsAppBlockedIntent.swift`,
      groupName: name,
      project: cfg.modResults,
    });
    return cfg;
  });
};
