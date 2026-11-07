import test from 'node:test';
import assert from 'node:assert/strict';
import { BASE, createEngine, makeEnv, AI_BASE, post, get } from './helpers.js';
import { handle } from '../src/api.js';

const run = (req, env) => handle(req, env, BASE);
const TABLE = {
  Fahrrad: { ...AI_BASE, pos: 'n', lemma: 'Fahrrad', plural: 'Fahrräder', gender: 'n' },
  rennen: { ...AI_BASE, pos: 'v', lemma: 'rennen', du: 'rennst', er: 'rennt', preterite: 'rannte', participle: 'gerannt', sein: true },
  rund: { ...AI_BASE, pos: 'a', lemma: 'rund', comparative: 'runder', superlative: 'rundesten', attributive: 'runder' },
  Xyqzt: { ...AI_BASE, ok: false, reason: 'Das ist kein deutsches Wort.' },
  aufstehen: { ...AI_BASE, pos: 'v', lemma: 'aufstehen', preterite: 'stand', participle: 'aufgestanden', separable: true },
};

test('Anlegen, Lesen, erneutes Anlegen (Wort bleibt dauerhaft und gleich)', async () => {
  const env = makeEnv(TABLE);
  assert.deepEqual(await (await run(get(), env)).json(), { words: [] });
  const r = await run(post('Fahrrad'), env);
  assert.equal(r.status, 201);
  const j = await r.json();
  assert.equal(j.entry.pos, 'n'); assert.match(j.entry.c, /^(?:(?:th|sh|[ktslrmnvzdh])?[aeiou])+$/); assert.match(j.entry.c, /[ao]$/);
  assert.deepEqual({ s: j.entry.s, p: j.entry.p, g: j.entry.g }, { s: 'Fahrrad', p: 'Fahrräder', g: 'n' });
  const list = (await (await run(get(), env)).json()).words;
  assert.equal(list.length, 1); assert.equal(list[0].c, j.entry.c);
  const calls = env.AI.calls;
  const again = await (await run(post('Fahrrad'), env)).json();      // schon bekannt: keine KI nötig
  assert.equal(again.existing, true); assert.equal(again.entry.c, j.entry.c);
  const plural = await (await run(post('fahrräder'), env)).json();   // Mehrzahl gehört zum selben Wort
  assert.equal(plural.existing, true); assert.equal(plural.entry.c, j.entry.c);
  assert.equal(env.AI.calls, calls);
});

test('Wort aus dem Grundwortschatz wird nicht neu angelegt', async () => {
  const env = makeEnv({});
  const j = await (await run(post('Hut'), env)).json();
  assert.equal(j.existing, true); assert.equal(j.entry.c, 'huvo');
  assert.equal(env.AI.calls, 0);
});

test('Verb und Adjektiv', async () => {
  const env = makeEnv(TABLE);
  const v = await (await run(post('rennen'), env)).json();
  assert.equal(v.entry.pos, 'v'); assert.match(v.entry.c, /u$/); assert.equal(v.entry.fl, 'm');
  const a = await (await run(post('rund'), env)).json();
  assert.equal(a.entry.pos, 'a'); assert.match(a.entry.c, /i$/);
});

test('Fehlerfälle: ungültige Eingabe, kein Wort, trennbares Verb, KI-Ausfall', async () => {
  const env = makeEnv(TABLE);
  assert.equal((await run(post('zwei Wörter'), env)).status, 400);
  assert.equal((await run(post('a'), env)).status, 400);
  assert.equal((await run(post('x1'), env)).status, 400);
  const bad = await run(post('Xyqzt'), env);
  assert.equal(bad.status, 422); assert.match((await bad.json()).error, /kein deutsches Wort/);
  assert.equal((await run(post('aufstehen'), env)).status, 422);
  assert.equal((await run(post('Unbekanntwort'), env)).status, 502);    // KI wirft Fehler
  assert.deepEqual(await (await run(get(), env)).json(), { words: [] });  // nichts gespeichert
  assert.equal((await run(new Request('https://x.test/api/words', { method: 'DELETE' }), env)).status, 405);
  assert.equal((await run(new Request('https://x.test/api/nix'), env)).status, 404);
});

test('Tageslimits', async () => {
  const env = makeEnv(TABLE, { DAILY_PER_IP: '2', DAILY_GLOBAL: '100' });
  await run(post('Xyqzt'), env); await run(post('Xyqzt'), env);
  const r = await run(post('Fahrrad'), env);
  assert.equal(r.status, 429);
  const env2 = makeEnv(TABLE, { DAILY_GLOBAL: '1' });
  await run(post('Xyqzt'), env2);
  assert.equal((await run(post('Fahrrad'), env2)).status, 429);
});

test('Statische Dateien gehen an ASSETS', async () => {
  const env = makeEnv({});
  assert.equal(await (await run(new Request('https://x.test/'), env)).text(), 'asset');
});

test('Übersetzer nutzt neue Wörter samt Beugung (Hin- und Rückrichtung)', async () => {
  const env = makeEnv(TABLE);
  const { entry } = await (await run(post('Fahrrad'), env)).json();
  const { pos, ...rest } = entry;
  const LEX = JSON.parse(JSON.stringify(BASE)); LEX.nouns.push(rest);
  const E = createEngine(LEX);
  const out = E.translateDE('Ich habe ein Fahrrad.');
  assert.equal(out.text, `ona ${entry.c}no ramu.`);
  assert.deepEqual(out.notes.unknown, []); assert.deepEqual(out.notes.names, []);
  assert.match(E.translateCON(out.text).text, /Fahrrad/);
  assert.match(E.translateDE('Die Fahrräder sind alt.').text, new RegExp(entry.c + 'ki'));
});
