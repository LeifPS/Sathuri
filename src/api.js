// HTTP-Logik der Wort-API (ohne JSON-Import, damit sie auch in Node-Tests läuft).
//   GET  /api/words  -> alle gemeinsam angelegten Wörter
//   POST /api/words  -> {word} legt ein neues Wort an (KI liefert deutsche Formen, Code erzeugt das Sathuri-Wort)
import { buildUsed, makeWord } from './wordgen.js';
import { askAI, normalize } from './ai.js';

const SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS words (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     pos TEXT NOT NULL,
     con TEXT NOT NULL UNIQUE,
     key TEXT NOT NULL UNIQUE,
     data TEXT NOT NULL,
     created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE TABLE IF NOT EXISTS usage (
     day TEXT NOT NULL,
     k TEXT NOT NULL,
     n INTEGER NOT NULL DEFAULT 0,
     PRIMARY KEY (day, k)
   )`,
];
const schemaReady = new WeakMap();      // pro Datenbank-Verbindung nur einmal anlegen
function ensureSchema(env) {
  if (!schemaReady.has(env.DB)) {
    schemaReady.set(env.DB, env.DB.batch(SCHEMA_SQL.map(s => env.DB.prepare(s))).catch(e => { schemaReady.delete(env.DB); throw e; }));
  }
  return schemaReady.get(env.DB);
}

const json = (obj, status = 200, headers = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });

async function loadExtras(env) {
  const { results } = await env.DB.prepare('SELECT pos, data FROM words ORDER BY id').all();
  return (results || []).map(r => ({ pos: r.pos, ...JSON.parse(r.data) }));
}

// Kennt der Wortschatz (Grundwortschatz + Zusatzwörter) das Wort schon? Vergleicht ohne Groß-/Kleinschreibung.
export function findKnown(base, extras, raw) {
  const w = raw.toLowerCase();
  const all = [
    ...base.nouns.map(e => ({ pos: 'n', ...e })), ...base.verbs.map(e => ({ pos: 'v', ...e })), ...base.adjs.map(e => ({ pos: 'a', ...e })),
    ...extras,
  ];
  for (const e of all) {
    if (e.pos === 'n' && (e.s.toLowerCase() === w || e.p.toLowerCase() === w)) return e;
    if (e.pos === 'v' && e.inf.toLowerCase() === w) return e;
    if (e.pos === 'a' && e.base.toLowerCase() === w) return e;
  }
  for (const e of base.inv) if (e.f.some(f => f.toLowerCase() === w)) return { pos: 'i', ...e };
  return null;
}

async function sha(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function bump(env, day, k) {
  const r = await env.DB.prepare(
    'INSERT INTO usage (day, k, n) VALUES (?, ?, 1) ON CONFLICT(day, k) DO UPDATE SET n = n + 1 RETURNING n').bind(day, k).first();
  return r ? r.n : 1;
}

const num = (v, d) => { const n = parseInt(v, 10); return Number.isFinite(n) && n > 0 ? n : d; };

async function createWord(request, env, base) {
  let body = null;
  try { body = await request.json(); } catch (e) { /* ungültiger Body */ }
  const raw = String((body && body.word) || '').trim();
  if (!/^[A-Za-zÄÖÜäöüß]{2,30}$/.test(raw)) return json({ error: 'Bitte genau ein Wort aus Buchstaben (2 bis 30 Zeichen).' }, 400);

  await ensureSchema(env);
  let extras = await loadExtras(env);
  const known = findKnown(base, extras, raw);
  if (known) return json({ existing: true, entry: known });

  // Tageslimits (zählen jeden Versuch, auch fehlgeschlagene)
  const day = new Date().toISOString().slice(0, 10);
  env.DB.prepare('DELETE FROM usage WHERE day < ?').bind(day).run().catch(() => {});
  const ip = request.headers.get('CF-Connecting-IP') || 'unbekannt';
  const nGlobal = await bump(env, day, 'g');
  if (nGlobal > num(env.DAILY_GLOBAL, 200)) return json({ error: 'Heute wurden schon sehr viele neue Wörter angelegt. Versuche es morgen wieder.' }, 429);
  const nIp = await bump(env, day, 'i:' + await sha(ip));
  if (nIp > num(env.DAILY_PER_IP, 15)) return json({ error: 'Du hast heute schon viele Wörter angelegt. Versuche es morgen wieder.' }, 429);

  let ai;
  try { ai = await askAI(env, raw); }
  catch (e) {
    console.error('KI-Fehler:', e && e.message);
    return json({ error: 'Die KI ist gerade nicht erreichbar. Versuche es später noch einmal.', detail: String((e && e.message) || e).slice(0, 300) }, 502);
  }
  const norm = normalize(ai);
  if (!norm.ok) return json({ error: norm.error }, 422);

  const key = norm.pos + ':' + norm.lemma.toLowerCase();
  for (let attempt = 0; attempt < 3; attempt++) {
    const again = findKnown(base, extras, norm.lemma);
    if (again) return json({ existing: true, entry: again });
    const used = buildUsed(base, extras);
    const c = makeWord(norm.pos, norm.lemma.toLowerCase() + (attempt ? '#' + attempt : ''), used);
    if (!c) return json({ error: 'Es konnte kein freies Sathuri-Wort erzeugt werden.' }, 500);
    const entry = { c, ...norm.fields };
    try {
      await env.DB.prepare('INSERT INTO words (pos, con, key, data) VALUES (?, ?, ?, ?)').bind(norm.pos, c, key, JSON.stringify(entry)).run();
      return json({ entry: { pos: norm.pos, ...entry } }, 201);
    } catch (e) {
      extras = await loadExtras(env);          // jemand war schneller: neu laden, erneut versuchen
    }
  }
  return json({ error: 'Das Wort konnte gerade nicht gespeichert werden. Versuche es noch einmal.' }, 409);
}

export async function handle(request, env, base) {
  const url = new URL(request.url);
  if (url.pathname === '/api/words') {
    try {
      if (request.method === 'GET') {
        await ensureSchema(env);
        return json({ words: await loadExtras(env) }, 200, { 'cache-control': 'public, max-age=20' });
      }
      if (request.method === 'POST') return await createWord(request, env, base);
      return json({ error: 'Methode nicht erlaubt.' }, 405, { allow: 'GET, POST' });
    } catch (e) {
      return json({ error: 'Serverfehler.' }, 500);
    }
  }
  if (url.pathname.startsWith('/api/')) return json({ error: 'Nicht gefunden.' }, 404);
  return env.ASSETS.fetch(request);
}
