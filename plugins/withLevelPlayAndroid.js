/**
 * Expo config plugin: LevelPlay Android extras (GAID + AD_ID permission).
 * Extra network adapters are not added.
 */
const {
  AndroidConfig,
  withAppBuildGradle,
  withAndroidManifest,
} = require('@expo/config-plugins');

const PLAY_SERVICES_DEPS = [
  "    implementation 'com.google.android.gms:play-services-appset:16.0.2'",
  "    implementation 'com.google.android.gms:play-services-ads-identifier:18.0.1'",
  "    implementation 'com.google.android.gms:play-services-basement:18.3.0'",
];

function withLevelPlayAndroid(config) {
  config = AndroidConfig.Permissions.withPermissions(config, [
    'android.permission.INTERNET',
    'android.permission.ACCESS_NETWORK_STATE',
    'com.google.android.gms.permission.AD_ID',
  ]);

  config = withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      return cfg;
    }

    let contents = cfg.modResults.contents;
    if (!contents.includes('play-services-ads-identifier')) {
      // Insert into the app module dependencies, not the first `{` in the file.
      const marker = 'implementation("com.facebook.react:react-android")';
      if (contents.includes(marker)) {
        contents = contents.replace(
          marker,
          `${PLAY_SERVICES_DEPS.join('\n')}\n    ${marker}`,
        );
      } else {
        contents = contents.replace(
          /dependencies\s*\{/,
          (match) => `${match}\n${PLAY_SERVICES_DEPS.join('\n')}`,
        );
      }
    }
    cfg.modResults.contents = contents;
    return cfg;
  });

  config = withAndroidManifest(config, (cfg) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(
      cfg.modResults,
    );
    // Drop leftover Google ads APPLICATION_ID / flags if an older prebuild injected them.
    AndroidConfig.Manifest.removeMetaDataItemFromMainApplication(
      application,
      'com.google.android.gms.ads.APPLICATION_ID',
    );
    AndroidConfig.Manifest.removeMetaDataItemFromMainApplication(
      application,
      'com.google.android.gms.ads.flag.OPTIMIZE_AD_LOADING',
    );
    AndroidConfig.Manifest.removeMetaDataItemFromMainApplication(
      application,
      'com.google.android.gms.ads.flag.OPTIMIZE_INITIALIZATION',
    );
    return cfg;
  });

  return config;
}

module.exports = withLevelPlayAndroid;
