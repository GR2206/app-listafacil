const { withGradleProperties, withProjectBuildGradle } = require('expo/config-plugins');

/**
 * Fuerza NDK r28+ (alineación 16 KB exigida por Play para apps target API 35+).
 */
function withAndroidNdk16kb(config) {
  config = withGradleProperties(config, (cfg) => {
    const key = 'android.ndkVersion';
    const value = '28.0.12674087';
    const existing = cfg.modResults.find((item) => item.type === 'property' && item.key === key);
    if (existing) {
      existing.value = value;
    } else {
      cfg.modResults.push({ type: 'property', key, value });
    }
    return cfg;
  });

  config = withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      return cfg;
    }

    // Asegura ndkVersion en el bloque ext / buildscript si Expo lo define.
    if (!cfg.modResults.contents.includes("ndkVersion = '28.0.12674087'")) {
      cfg.modResults.contents = cfg.modResults.contents.replace(
        /ndkVersion\s*=\s*["'][^"']+["']/,
        "ndkVersion = '28.0.12674087'"
      );
    }

    return cfg;
  });

  return config;
}

module.exports = withAndroidNdk16kb;
