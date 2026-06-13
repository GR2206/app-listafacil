-- Esquema SQLite local (caché + lista activa)
-- Ejecutar en initDatabase()

-- Catálogo sincronizado desde backend/scraper
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY NOT NULL,
  barcode TEXT NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,
  image_url TEXT,
  price REAL NOT NULL,
  supermarket_id TEXT NOT NULL,
  updated_at TEXT,
  UNIQUE (barcode, supermarket_id)
);

CREATE INDEX IF NOT EXISTS idx_products_barcode
  ON products (barcode, supermarket_id);

-- Sesión de compra activa (una por dispositivo)
CREATE TABLE IF NOT EXISTS cart_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  supermarket_id TEXT NOT NULL,
  supermarket_name TEXT NOT NULL,
  started_at TEXT NOT NULL,
  is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS cart_items (
  id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL,
  product_id TEXT,
  barcode TEXT NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,
  image_url TEXT,
  unit_price REAL NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (session_id) REFERENCES cart_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cart_items_session
  ON cart_items (session_id);
