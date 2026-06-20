# Gist, Firebase y links útiles

## Gist del usuario (banners, home, actualización)

https://gist.github.com/GR2206/385d2f581dfeea93ee3c35ddcd1314ed

Archivos:

| Archivo | Uso |
|---------|-----|
| `app-update.json` | Modal "hay nueva versión" en la app |
| `banners-app.json` | Banners home y lista |
| `home-app.json` | Fondo home + logo app |

### Después de publicar 1.6.6 en Play Store

Editar `app-update.json` en el Gist:

```json
{
  "androidLatestVersionCode": 19
}
```

(Solo cuando la versión **19** ya esté disponible para usuarios en Play Store.)

---

## Firebase

| Campo | Valor |
|-------|--------|
| Proyecto | scanner-gondola |
| Reglas | Publicadas manualmente en consola (junio 2026) |
| Archivo local | `firestore.rules` (raíz del proyecto) |

Consola Firestore reglas:  
https://console.firebase.google.com/project/scanner-gondola/firestore/rules

---

## Expo / EAS

| Campo | Valor |
|-------|--------|
| Cuenta | g2206 |
| Proyecto | lista-compras-scanner |
| Builds | https://expo.dev/accounts/g2206/projects/lista-compras-scanner/builds |
| Billing | https://expo.dev/accounts/g2206/settings/billing |

---

## Comando de compilación

```powershell
cd E:\LISTAFACILAPP\lista-compras-scanner
npx eas-cli build --platform android --profile production --non-interactive
```

---

## Deep link lista compartida

Formato: `listafacil://crear-lista?id=LISTA_ID`

Colección Firestore: `Listas_compartidas`
