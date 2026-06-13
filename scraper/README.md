# Scraper → Firebase

Robot Node.js que extrae productos de supermercados online y los guarda en **Firestore** con el **código de barras como ID del documento**.

## Configuración

1. Crear proyecto en [Firebase Console](https://console.firebase.google.com)
2. Activar **Firestore Database**
3. Descargar clave de cuenta de servicio → guardar como `scraper/serviceAccountKey.json`
4. Copiar `.env.example` a `.env` y completar variables

```bash
cd scraper
npm install
cp .env.example .env
```

## Ejecutar

```bash
# Todos los mercados configurados
npm run scrape

# Solo Carrefour
npm run scrape:carrefour
```

## Qué extrae por producto

| Campo | Fuente |
|-------|--------|
| `name` | HTML del listado / JSON-LD |
| `price` | Precio visible en la web |
| `imageUrl` | `<img>` o Schema.org `image` |
| `barcode` | JSON-LD `gtin13`, meta SEO, `data-ean`, APIs embebidas |

## Estructura Firestore

```
products/{barcode}
  ├── barcode: "7790310981234"
  ├── name: "Leche entera 1L"
  ├── price: 1250
  ├── imageUrl: "https://..."
  ├── supermarketId: "carrefour"
  ├── brand: "La Serenísima"
  └── updatedAt: timestamp
```

## Notas legales

- Respetar `robots.txt` y términos de uso de cada sitio
- Usar delays entre peticiones en producción
- Los selectores CSS pueden cambiar; actualizar `src/scrapers/*.js` según el HTML vigente
