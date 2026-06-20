# Checklist — 1 de julio de 2026

Marcá cada ítem cuando lo completes.

## Antes (si no lo hiciste en junio)

- [ ] Respaldo hecho (commit local o ZIP del proyecto)
- [ ] Carpeta `esto-para-compilar-siguiente-mes` guardada (Drive / pendrive)

## Día de compilación

- [ ] Abrí Cursor en `E:\LISTAFACILAPP\lista-compras-scanner`
- [ ] Pegué el texto de `MENSAJE-PARA-CURSOR.txt` en el chat
- [ ] Confirmé `app.json` → `"version": "1.6.6"`
- [ ] Corrí: `npx eas-cli build --platform android --profile production --non-interactive`
- [ ] Build terminó OK (status: finished)
- [ ] Guardé URL del AAB

## Play Store

- [ ] Subí el AAB a Play Console
- [ ] Publiqué la versión (o prueba interna)
- [ ] Actualicé Gist `app-update.json` → `"androidLatestVersionCode": 19`

## Verificación rápida en celular (después de instalar)

- [ ] Escaneo compara precios en todos los supers (un solo escaneo)
- [ ] Panel comparación: recuadros por super + destello
- [ ] Menú → Crear Lista compras (blanco, A-/A+, compartir)
- [ ] Admin → Revisión productos (nombre, marca, precio)
- [ ] Admin → Dashboard (métricas de todos los usuarios)

---

**Versión objetivo:** 1.6.6 · versionCode **19**  
**Cuenta EAS:** g2206 · **Proyecto Firebase:** scanner-gondola
