# Auditoría de rendimiento y feedback — Lista Fácil

**Fecha:** 11 de junio de 2026  
**Objetivo:** Eliminar tirones al arrancar, sincronizar sonido + vibración sin delay, y precargar recursos críticos al inicio.

---

## Resumen ejecutivo

Se revisó el arranque de la app, el sistema de audio/hápticos y la carga de banners/fuentes. Los cambios priorizan **precarga en el splash**, **reproducción instantánea de sonidos** y **feedback antes de navegar** para que el usuario no perciba cortes ni retrasos.

---

## 1. Arranque y precarga (`prepareAppResources`)

### Antes
- Sonidos, imágenes, SQLite, banners y fuentes se cargaban en gran parte **en serie**.
- Los banners se descargaban **después** de mostrar la home → parpadeos/skeletons.
- Las fuentes Bebas Neue se cargaban **por pantalla** con `useFonts` → layout vacío momentáneo.
- El catálogo mock se re-insertaba **en cada apertura** de la app.

### Después
- **Fase 1 (paralelo):** sonidos + imágenes de splash/fondo + fuentes.
- **Fase 2 (paralelo):** banners (manifest + prefetch), seed SQLite (solo 1ª vez), hydrate del carrito y auth comerciante.
- Verificación doble de que el pool de sonidos quedó listo antes de liberar la UI.

### Archivos
| Archivo | Cambio |
|---------|--------|
| `src/services/prepareAppResources.ts` | Reescrito con carga en 2 fases paralelas |
| `src/services/preloadAppFonts.ts` | **Nuevo** — precarga Bebas Neue al inicio |
| `src/db/seed.ts` | Flag `mock_catalog_seeded_v1` — seed solo la primera vez |

---

## 2. Audio — sin delay en el primer tap

### Antes
- Reproducción con cadena `stopAsync → setPositionAsync → playAsync` (3 awaits encadenados) → latencia audible.
- Pool de `beep` (escaneo) de solo 2 instancias → colisión en escaneos seguidos.
- Instancias del pool creadas **una por una** en secuencia.

### Después
- Reproducción con **`replayAsync()`** (fallback a position+play si falla).
- Pool de **`beep` ampliado a 4** instancias.
- Creación de instancias del pool **en paralelo** por tipo de sonido.
- Modo audio: `staysActiveInBackground: false` (menos conflictos con el SO).

### Archivos
| Archivo | Cambio |
|---------|--------|
| `src/services/playSound.ts` | `replayAsync`, pools paralelos, audio mode |
| `src/config/audio.ts` | `BEEP_SOUND_POOL_SIZE`: 2 → 4 |

---

## 3. Sincronización sonido + vibración

### Antes
- En navegación (`withNavFeedback`, `withTeclaSound`, etc.) la **acción se ejecutaba primero** y el feedback después → al cambiar de pantalla el sonido a veces se cortaba.
- Orden inconsistente entre componentes (algunos feedback primero, otros después).

### Después
- **`fireInstantFeedback`** dispara sonido y háptico en el **mismo tick** (sin await entre medias).
- Todos los wrappers de feedback ejecutan **feedback → acción**:
  - `withNavFeedback`
  - `withTeclaSound`
  - `withTeclaTaskFeedback` / `withTaskHaptic`

### Archivos
| Archivo | Cambio |
|---------|--------|
| `src/utils/fireInstantFeedback.ts` | Orden unificado, comentario de sincronía |
| `src/utils/withNavFeedback.ts` | Feedback antes del handler |
| `src/utils/withTeclaSound.ts` | Feedback antes del handler |
| `src/utils/withTaskFeedback.ts` | Feedback antes del handler |

### Sin cambios (ya correctos)
- `SupermarketGridButton` — feedback en `onPressIn` (antes del `onPress`).
- `CartTableRow` — feedback antes de modificar cantidad.
- `scanFeedback` — beep + háptico success al escanear.

---

## 4. Banners — sin tirón en la home

### Antes
- `BannerManagerProvider` arrancaba con `isLoading: true` siempre.
- Manifest e imágenes se pedían al montar la home → skeleton/flash.

### Después
- Banners precargados durante `prepareAppResources`.
- Si ya hay cache de startup, el provider inicia **`isReady: true`** sin spinner.
- Re-fetch en background solo si no había cache.

### Archivos
| Archivo | Cambio |
|---------|--------|
| `src/services/bannerManager.ts` | Export `getStartupBannerManifest`, `wasRemoteBannerManifestUsed` |
| `src/context/BannerManagerContext.tsx` | Estado inicial desde cache de startup |

---

## 5. Tipografías — sin parpadeo en home

### Antes
- `HomeHeroHeading` y `HomeCyberTopBanner` usaban `useFonts` → placeholder vacío hasta cargar.

### Después
- Fuente precargada en el splash.
- Componentes usan `APP_FONT_FAMILY` directamente, sin placeholder intermedio.

### Archivos
| Archivo | Cambio |
|---------|--------|
| `src/components/home/HomeHeroHeading.tsx` | Sin `useFonts`, fuente precargada |
| `src/components/home/HomeCyberTopBanner.tsx` | Sin `useFonts` / `fontPlaceholder` |

---

## 6. Qué no se tocó (ya estaba bien)

| Área | Estado |
|------|--------|
| Permisos cámara/GPS | Revisados en sesión anterior — flujos seguros |
| `triggerHaptic` | Try/catch — no bloquea UI |
| `playSound` cuando no precargado | Fallback async sin crash |
| Animaciones de orbes (home) | `useNativeDriver: true` — OK |
| SQLite / carrito | Sin cambios de lógica, solo seed optimizado |

---

## 7. Cómo probar

1. **Cerrar la app por completo** y volver a abrir.
2. En la bienvenida (~2,5 s) deberían precargarse sonidos, fuentes, banners e imágenes.
3. **Primer tap** en un supermercado: click + vibración instantáneos.
4. **Escáner:** beep + vibración al leer código (incluso escaneos seguidos).
5. **Carrito +/-:** tecla + vibración ligera sin retraso.
6. **Menú lateral:** click audible antes de navegar (no se corta al cambiar pantalla).
7. **Home:** título y banner superior visibles de inmediato, sin flash de fuente.

---

## 8. Rebuild nativo

Los cambios de audio/fuentes aplican en **Expo Go** al recargar. Para build de producción:

```powershell
npx expo prebuild --clean
npx expo run:android
```

---

## 9. Hotfix post-lanzamiento (SQLite / Android)

### Síntoma
Errores en cascada al arrancar:
`NativeDatabase.execAsync` / `prepareAsync` → `java.lang.NullPointerException`

### Causa
En la optimización de arranque, `seedMockCatalog()`, `hydrate()` y `hydrateMerchantAuth()` corrían **en paralelo**. En Android, varias llamadas simultáneas a `getDatabase()` abrían la base más de una vez antes de que terminara la migración.

### Corrección
| Archivo | Fix |
|---------|-----|
| `src/db/database.ts` | Mutex con `dbInitPromise`: una sola apertura/migración aunque haya llamadas concurrentes |
| `src/services/prepareAppResources.ts` | Operaciones SQLite en **cadena secuencial**; banners siguen en paralelo con esa cadena |

### Si la app sigue fallando tras recargar
1. Cerrar Expo Go por completo (no solo recargar).
2. Volver a abrir la app.
3. Si persiste: Ajustes → Apps → Expo Go → **Borrar datos** (o desinstalar/reinstalar Expo Go) para resetear la base local corrupta.

---

## Archivos modificados (lista completa)

- `src/config/audio.ts`
- `src/db/seed.ts`
- `src/services/playSound.ts`
- `src/db/database.ts`
- `src/services/prepareAppResources.ts`
- `src/services/preloadAppFonts.ts` *(nuevo)*
- `src/services/bannerManager.ts`
- `src/context/BannerManagerContext.tsx`
- `src/utils/fireInstantFeedback.ts`
- `src/utils/withNavFeedback.ts`
- `src/utils/withTeclaSound.ts`
- `src/utils/withTaskFeedback.ts`
- `src/components/home/HomeHeroHeading.tsx`
- `src/components/home/HomeCyberTopBanner.tsx`
- `AUDITORIA-RENDIMIENTO.md` *(este reporte)*
