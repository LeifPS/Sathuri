import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

export const BASE = JSON.parse(readFileSync(new URL('../src/lex.json', import.meta.url), 'utf8'));
const require = createRequire(import.meta.url);
export const { createEngine } = require('../tools/engine.js');

// D1-Ersatz auf Basis von node:sqlite (gleiche Methoden wie die D1-Bindung)
export function fakeD1() {
  const db = new DatabaseSync(':memory:');
  const stmt = (sql, params = []) => ({
    bind: (...p) => stmt(sql, p),
    async run() { db.prepare(sql).run(...params); return { success: true }; },
    async first() { return db.prepare(sql).get(...params) ?? null; },
    async all() { return { results: db.prepare(sql).all(...params) }; },
  });
  return { prepare: sql => stmt(sql), async batch(list) { for (const s of list) await s.run(); return []; }, _db: db };
}

// KI-Ersatz: liefert vorbereitete Antworten je Eingabewort
export function fakeAI(table) {
  return { calls: 0, async run(model, input) {
    this.calls++;
    const word = input.messages[input.messages.length - 1].content;
    if (!(word in table)) throw new Error('KI nicht erreichbar');
    return { response: table[word] };
  } };
}

export const AI_BASE = { ok: true, reason: '', pos: 'n', lemma: '', plural: '', gender: '', weak: false, genitive: '', du: '', er: '', preterite: '', participle: '', sein: false, dative_only: false, dative_accusative: false, separable: false, reflexive: false, comparative: '', superlative: '', attributive: '' };

export function makeEnv(table, vars = {}) {
  return { DB: fakeD1(), AI: fakeAI(table), ASSETS: { fetch: async () => new Response('asset') }, ...vars };
}
export const post = (word) => new Request('https://x.test/api/words', { method: 'POST', body: JSON.stringify({ word }), headers: { 'CF-Connecting-IP': '1.2.3.4' } });
export const get = () => new Request('https://x.test/api/words');
