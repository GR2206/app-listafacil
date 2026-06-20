# Release 1.6.6 — Lista Fácil

| Campo | Valor |
|-------|--------|
| Versión | **1.6.6** |
| versionCode Android | **19** |
| Perfil EAS | production (AAB) |
| SDK | Expo 54 |
| Package | com.listafacil.app |
| Cuenta Expo | g2206 |
| Firebase | scanner-gondola |

---

## Novedades principales

### Comparación de precios (Mi Lista)

- **Un solo escaneo** trae precios de todos los supers (Firestore → SQLite).
- Panel compacto: **un recuadro por super**, toque abre Maps.
- Ganador con **destello neón suave** (2 s).
- Al escanear: panel 6 s → producto solo (1.er ítem) o **producto 4 s + total 2 s** (2+ ítems).

### Admin — Revisión de productos

- Bloque **Datos propuestos**: producto, marca, precio.
- Lectura ampliada de campos Firestore + enriquecimiento desde catálogo.

### Admin — Dashboard comerciante

- Métricas de **todos los usuarios** (Firestore `Metricas_diarias`).
- Ya no solo actividad del dispositivo local.

### Crear Lista compras (menú nuevo)

- Lista **fondo blanco** estilo Mi Lista.
- Casilleros ✅, **Enter** = nuevo renglón.
- **A- / A+** tamaño de letra.
- **Compartir** → `listafacil://crear-lista?id=...`
- **Eliminar lista** (borra borrador y lista compartida en Firestore).

### Otros (sesiones anteriores incluidas en el tarball)

- Banners desde Gist, logo remoto, destello banner lista por super.
- Android 15 (compileSdk/targetSdk 35).
- Modal actualización app, fondo home remoto, etc.

---

## Firestore — colecciones nuevas / reglas

Ya publicadas manualmente en consola (junio 2026):

- `Metricas_diarias` (+ subcolecciones visitantes, productos_vistos)
- `Listas_compartidas`

Archivo fuente: `firestore.rules` en la raíz del proyecto.

---

## Texto para Play Store (notas de versión)

```
• Compará precios con un solo escaneo en todos los supers.
• Nueva lista de compras para armar y compartir con casilleros.
• Mejoras en panel comerciante y revisión de productos.
• Correcciones y mejoras de rendimiento.
```

---

## Post-publicación obligatorio

Gist `app-update.json`:

```json
"androidLatestVersionCode": 19
```

Gist del usuario: https://gist.github.com/GR2206/385d2f581dfeea93ee3c35ddcd1314ed

---

## Build anterior (referencia)

| Versión | versionCode | AAB |
|---------|-------------|-----|
| 1.6.5 | 18 | https://expo.dev/artifacts/eas/I_4UMTnn-zBy-GkLXJE8mjBVEGkSZ4ihSYmNqB_QzOU.aab |

La 1.6.6 **reemplaza** la 1.6.5 en Play Store cuando publiques.
