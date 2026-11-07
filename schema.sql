-- Wird vom Worker beim ersten Aufruf automatisch angelegt (CREATE TABLE IF NOT EXISTS); hier zur Dokumentation.
CREATE TABLE IF NOT EXISTS words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pos TEXT NOT NULL,            -- n | v | a
  con TEXT NOT NULL UNIQUE,     -- Sathuri-Wort
  key TEXT NOT NULL UNIQUE,     -- Wortart:grundform, z. B. n:hut
  data TEXT NOT NULL,           -- Lexikoneintrag als JSON (Format wie tools/lex.json)
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS usage (
  day TEXT NOT NULL,
  k TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, k)
);
