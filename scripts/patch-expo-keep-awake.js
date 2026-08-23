/**
 * Aplica el fix de activateKeepAwake (uncaught promise en Expo Go / Android).
 * Se re-ejecuta en postinstall porque el paquete vive bajo expo/node_modules.
 */
const fs = require('fs');
const path = require('path');

const target = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo',
  'node_modules',
  'expo-keep-awake',
  'src',
  'index.ts'
);

if (!fs.existsSync(target)) {
  console.warn('[patch-expo-keep-awake] skip: file not found');
  process.exit(0);
}

const src = fs.readFileSync(target, 'utf8');
if (src.includes('.catch(() => {})') && src.includes('activateKeepAwakeAsync(tagOrDefault)')) {
  // Ya parcheado (o upstream arreglado).
  if (src.includes('Swallow so it never surfaces')) {
    process.exit(0);
  }
}

const needle = `  useEffect(() => {
    let isMounted = true;
    activateKeepAwakeAsync(tagOrDefault).then(() => {
      if (isMounted && ExpoKeepAwake.addListenerForTag && options?.listener) {
        addListener(tagOrDefault, options.listener);
      }
    });
    return () => {
      isMounted = false;
      if (options?.suppressDeactivateWarnings) {
        deactivateKeepAwake(tagOrDefault).catch(() => {});
      } else {
        deactivateKeepAwake(tagOrDefault);
      }
    };
  }, [tagOrDefault]);
}`;

const replacement = `  useEffect(() => {
    let isMounted = true;
    // Activation can reject on Android when the Activity is unavailable
    // (backgrounding / Expo Go). Swallow so it never surfaces as LogBox.
    activateKeepAwakeAsync(tagOrDefault)
      .then(() => {
        if (isMounted && ExpoKeepAwake.addListenerForTag && options?.listener) {
          addListener(tagOrDefault, options.listener);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
      if (options?.suppressDeactivateWarnings) {
        deactivateKeepAwake(tagOrDefault).catch(() => {});
      } else {
        deactivateKeepAwake(tagOrDefault).catch(() => {});
      }
    };
  }, [tagOrDefault]);
}`;

if (!src.includes(needle)) {
  if (src.includes('.catch(() => {})')) {
    process.exit(0);
  }
  console.warn('[patch-expo-keep-awake] skip: unexpected source shape');
  process.exit(0);
}

fs.writeFileSync(target, src.replace(needle, replacement), 'utf8');
console.log('[patch-expo-keep-awake] patched expo-keep-awake useKeepAwake');
