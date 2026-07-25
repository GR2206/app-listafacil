const fs = require('fs');
const path = require('path');
const {
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod,
} = require('expo/config-plugins');

const META_LARGE =
  'expo.modules.notifications.large_notification_icon';
const RESOURCE_NAME = 'notification_large_icon';
const DEFAULT_SRC = './assets/notification_large_icon.png';

/**
 * Copia el logo a color como large icon de Android (círculo a la izquierda/derecha
 * estilo Mercado Libre) y lo registra en el manifest.
 */
function withNotificationLargeIcon(config, props = {}) {
  const iconPath = props.icon || DEFAULT_SRC;

  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const src = path.resolve(projectRoot, iconPath);
      if (!fs.existsSync(src)) {
        console.warn(`[withNotificationLargeIcon] Missing ${iconPath}`);
        return cfg;
      }

      const drawableDir = path.resolve(
        projectRoot,
        'android/app/src/main/res/drawable'
      );
      fs.mkdirSync(drawableDir, { recursive: true });
      fs.copyFileSync(src, path.join(drawableDir, `${RESOURCE_NAME}.png`));
      return cfg;
    },
  ]);

  config = withAndroidManifest(config, (cfg) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(
      cfg.modResults
    );
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      mainApplication,
      META_LARGE,
      `@drawable/${RESOURCE_NAME}`,
      'resource'
    );
    return cfg;
  });

  return config;
}

module.exports = withNotificationLargeIcon;
