/**
 * Expo config plugin: injects Play Games APP_ID into AndroidManifest + strings.xml.
 *
 * Set via app.config.ts extra.playGamesAppId or env PLAY_GAMES_APP_ID
 * (from Play Console → Play Games Services → Configuration).
 */
const {
  withStringsXml,
  withAndroidManifest,
  AndroidConfig,
} = require('@expo/config-plugins');

function withPlayGamesAppId(config) {
  const appId = config.extra?.playGamesAppId;
  if (!appId || typeof appId !== 'string') {
    return config;
  }

  config = withStringsXml(config, (cfg) => {
    cfg.modResults = AndroidConfig.Strings.setStringItem(
      [
        {
          _: appId,
          $: { name: 'game_services_project_id', translatable: 'false' },
        },
      ],
      cfg.modResults,
    );
    return cfg;
  });

  config = withAndroidManifest(config, (cfg) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(
      cfg.modResults,
    );
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      application,
      'com.google.android.gms.games.APP_ID',
      '@string/game_services_project_id',
    );
    return cfg;
  });

  return config;
}

module.exports = withPlayGamesAppId;
