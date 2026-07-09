-- Migration: 0002_fix_schema_mismatches.sql
-- Agrega tablas y columnas que el codigo del worker ya esperaba pero
-- que nunca se crearon en la migracion inicial.

-- Columna faltante en properties (usada en recibos y en cobranza)
ALTER TABLE properties ADD COLUMN address TEXT;

-- Columnas faltantes en services (estado del pago y excedente de luz)
ALTER TABLE services ADD COLUMN status TEXT NOT NULL DEFAULT 'pagado' CHECK (status IN ('pagado','pendiente'));
ALTER TABLE services ADD COLUMN excedente REAL NOT NULL DEFAULT 0;
ALTER TABLE services ADD COLUMN excedente_status TEXT DEFAULT 'cobrado' CHECK (excedente_status IN ('pendiente','cobrado'));

-- Tabla faltante: gastos
CREATE TABLE IF NOT EXISTS expenses (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  type         TEXT    NOT NULL,
  amount       REAL    NOT NULL DEFAULT 0,
  is_recurring INTEGER NOT NULL DEFAULT 0 CHECK (is_recurring IN (0,1)),
  month        INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year         INTEGER NOT NULL CHECK (year >= 2020),
  status       TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Tabla faltante: notas del calendario
CREATE TABLE IF NOT EXISTS notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  content    TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Tabla faltante: recordatorios del calendario
CREATE TABLE IF NOT EXISTS reminders (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT    NOT NULL,
  reminder_date TEXT    NOT NULL,
  type          TEXT    NOT NULL DEFAULT 'reminder',
  frequency     TEXT,
  status        TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done')),
  property_id   INTEGER REFERENCES properties(id) ON DELETE CASCADE,
  last_done_at  TEXT,
  next_date     TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_expenses_month_year ON expenses (year, month);
CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders (reminder_date);
