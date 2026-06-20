# Instructivo paso a paso — Lista Fácil 1.6.6

## PARTE A — Antes del 1 de julio (para NO perder nada)

Los cambios están en tu PC en:

`E:\LISTAFACILAPP\lista-compras-scanner`

**Todavía NO están en GitHub** (último commit viejo: v1.6.3). Si se rompe el disco o se borra la carpeta, se pierde todo.

### Opción 1 — Respaldo con Git (recomendado)

Abrí PowerShell en la carpeta del proyecto y ejecutá:

```powershell
cd E:\LISTAFACILAPP\lista-compras-scanner
git add -A
git status
```

Revisá que aparezcan todos los archivos. Luego:

```powershell
git commit -m "WIP 1.6.6: comparación multi-super, admin, crear lista, banners"
```

Eso guarda todo **en tu PC**. Opcional: `git push` si tenés remoto en GitHub.

### Opción 2 — Respaldo ZIP (si no querés Git)

1. Clic derecho en la carpeta `lista-compras-scanner`
2. Enviar a → Carpeta comprimida
3. Guardá el ZIP en Google Drive, OneDrive o un pendrive
4. Nombre sugerido: `lista-compras-scanner-respaldo-jun2026-1.6.6.zip`

### Opción 3 — Pedirle a Cursor

Abrí Cursor en el proyecto y escribí:

> Hacé un commit local de respaldo con todo el trabajo de la 1.6.6, sin push.

---

## PARTE B — El 1 de julio: compilar

### 1. Abrí Cursor en el proyecto

Carpeta: `E:\LISTAFACILAPP\lista-compras-scanner`

### 2. Pegá el mensaje de `MENSAJE-PARA-CURSOR.txt`

Copiá todo el texto de ese archivo y pegalo en el chat. Cursor va a entender que debe compilar la 1.6.6 con todo lo de esta carpeta.

### 3. Verificá la versión

En `app.json` debe decir:

```json
"version": "1.6.6"
```

### 4. Compilá en Expo (EAS)

En la terminal del proyecto:

```powershell
cd E:\LISTAFACILAPP\lista-compras-scanner
npx eas-cli build --platform android --profile production --non-interactive
```

Esperá a que termine (puede tardar 30–90 minutos en cola gratis).

Si falla por **cupo de builds**, esperá al día 1 o revisá https://expo.dev/accounts/g2206/settings/billing

### 5. Descargá el AAB

Al terminar, Expo muestra un link. Ejemplo de formato:

`https://expo.dev/artifacts/eas/....aab`

Guardá ese link en un archivo de texto.

### 6. Subí a Google Play Console

1. Entrá a Play Console → Lista Fácil
2. Producción (o prueba interna) → Crear versión
3. Subí el `.aab`
4. Notas de la versión: copiá de `RELEASE-1.6.6.md` (sección "Texto para Play Store")
5. Enviá a revisión

### 7. Actualizá el Gist (cuando esté publicada en Play)

Ver `GIST-Y-FIREBASE.md` — cambiar `androidLatestVersionCode` a **19**.

---

## PARTE C — Builds mensuales (control)

Plan **Free** de Expo (cuenta g2206):

| Qué | Cuánto |
|-----|--------|
| Builds por mes | **30** (Android + iOS juntos) |
| Máximo iOS | 15 de esos 30 |
| Se renueva | **Día 1 de cada mes** |

Ver cuántos usaste:

```powershell
npx eas-cli build:list --platform android --limit 15
```

Dashboard: https://expo.dev/accounts/g2206/projects/lista-compras-scanner/builds

**Consejo:** usá EAS solo para releases. Para probar, usá `npx expo start --tunnel`.

---

## Si algo sale mal

| Problema | Qué hacer |
|----------|-----------|
| Cursor "no recuerda" | Pegá de nuevo `MENSAJE-PARA-CURSOR.txt` y mencioná la carpeta `esto-para-compilar-siguiente-mes` |
| Build falla por cupo | Esperar al 1/jul o plan pago Expo |
| Firestore permisos | Reglas ya pegadas en consola; ver `GIST-Y-FIREBASE.md` |
| Perdiste archivos | Restaurar del commit o ZIP de la Parte A |

---

## Último build exitoso (referencia)

- **1.6.5** · versionCode **18**
- AAB: https://expo.dev/artifacts/eas/I_4UMTnn-zBy-GkLXJE8mjBVEGkSZ4ihSYmNqB_QzOU.aab

La **1.6.6** incluye todo lo de arriba **más** los cambios listados en `RELEASE-1.6.6.md`.
