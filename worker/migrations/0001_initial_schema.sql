-- Migration: 0001_initial_schema.sql
-- Arrendia — esquema inicial completo

-- ─── Propiedades ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS properties (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  type             TEXT    NOT NULL CHECK (type IN ('casa','departamento','bodega')),
  name             TEXT    NOT NULL,
  number           TEXT,
  tenant_name      TEXT,
  tenant_phone     TEXT,
  monthly_rent     REAL    NOT NULL DEFAULT 0,
  payment_day      INTEGER CHECK (payment_day BETWEEN 1 AND 31),
  requires_invoice INTEGER NOT NULL DEFAULT 0 CHECK (requires_invoice IN (0,1)),
  start_date       TEXT,
  active           INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─── Rentas ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rents (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id  INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  month        INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year         INTEGER NOT NULL CHECK (year >= 2020),
  amount       REAL    NOT NULL DEFAULT 0,
  status       TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  paid_at      TEXT,
  bank_account TEXT    CHECK (bank_account IN ('bbva','banorte')),
  comment      TEXT,
  receipt_url  TEXT,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  -- Evitar duplicados: una renta por propiedad por mes/año
  UNIQUE (property_id, month, year)
);

-- ─── Contratos ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contracts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id     INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenant_name     TEXT    NOT NULL,
  tenant_phone    TEXT,
  start_date      TEXT    NOT NULL,
  end_date        TEXT    NOT NULL,
  duration_months INTEGER NOT NULL DEFAULT 0,
  pdf_url         TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─── Servicios ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id  INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  service_type TEXT    NOT NULL CHECK (service_type IN ('luz','agua','internet','gas','otro')),
  paid_at      TEXT    NOT NULL,
  amount       REAL    NOT NULL DEFAULT 0,
  comment      TEXT,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─── Eventos de calendario (manuales) ────────────────────────
CREATE TABLE IF NOT EXISTS calendar_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  event_date TEXT    NOT NULL,
  title      TEXT    NOT NULL,
  event_type TEXT    NOT NULL CHECK (event_type IN ('rent','contract','service','invoice','other')),
  status     TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done')),
  ref_id     INTEGER,
  ref_type   TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─── Índices de rendimiento ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rents_property    ON rents (property_id);
CREATE INDEX IF NOT EXISTS idx_rents_month_year  ON rents (year, month);
CREATE INDEX IF NOT EXISTS idx_rents_status      ON rents (status);
CREATE INDEX IF NOT EXISTS idx_contracts_property ON contracts (property_id);
CREATE INDEX IF NOT EXISTS idx_contracts_end_date ON contracts (end_date);
CREATE INDEX IF NOT EXISTS idx_services_property  ON services (property_id);
CREATE INDEX IF NOT EXISTS idx_services_paid_at   ON services (paid_at);
CREATE INDEX IF NOT EXISTS idx_calendar_date      ON calendar_events (event_date);
