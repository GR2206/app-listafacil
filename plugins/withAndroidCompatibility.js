const { withAndroidManifest } = require('expo/config-plugins');

const DEFAULT_CONFIG_CHANGES =
  'keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode|locale|layoutDirection|smallestScreenSize';

/**
 * Quita bloqueos de orientación y redimensionamiento en MainActivity
 * (requisito Play Console / pantallas grandes / Android 15+).
 */
function withAndroidCompatibility(config) {
  return withAndroidManifest(config, (cfg) => {
    const application = cfg.modResults.manifest.application?.[0];
    if (!application?.activity) {
      return cfg;
    }

    delete application.$['android:maxAspectRatio'];

    for (const activity of application.activity) {
      const name = activity.$['android:name'] ?? '';
      if (!name.endsWith('.MainActivity')) {
        continue;
      }

      delete activity.$['android:screenOrientation'];
      delete activity.$['android:maxAspectRatio'];
      activity.$['android:resizeableActivity'] = 'true';

      const current = activity.$['android:configChanges'] ?? '';
      if (!current.includes('smallestScreenSize')) {
        activity.$['android:configChanges'] = current
          ? `${current}|smallestScreenSize`
          : DEFAULT_CONFIG_CHANGES;
      }
    }

    return cfg;
  });
}

module.exports = withAndroidCompatibility;
