import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize } from '../src/ai.js';
import { AI_BASE } from './helpers.js';

const ai = o => ({ ...AI_BASE, ...o });

test('Nomen: Großschreibung, Plural, Geschlecht', () => {
  const r = normalize(ai({ pos: 'n', lemma: 'fahrrad', plural: 'fahrräder', gender: 'n' }));
  assert.deepEqual(r.fields, { s: 'Fahrrad', p: 'Fahrräder', g: 'n' });
});
test('Nomen: schwache Deklination und besondere Genitive', () => {
  assert.deepEqual(normalize(ai({ pos: 'n', lemma: 'Bär', plural: 'Bären', gender: 'm', weak: true })).fields, { s: 'Bär', p: 'Bären', g: 'm', w: 1 });
  assert.equal(normalize(ai({ pos: 'n', lemma: 'Name', plural: 'Namen', gender: 'm', genitive: 'Namens' })).fields.gen, 'Namens');
  assert.equal(normalize(ai({ pos: 'n', lemma: 'Tisch', plural: 'Tische', gender: 'm', genitive: 'Tisches' })).fields.gen, undefined);
});
test('Verb: regelmäßig ohne du/er, unregelmäßig mit', () => {
  assert.deepEqual(normalize(ai({ pos: 'v', lemma: 'rennen', du: 'rennst', er: 'rennt', preterite: 'rannte', participle: 'gerannt', sein: true })).fields,
    { inf: 'rennen', du: '', er: '', pret: 'rannte', part: 'gerannt', fl: 'm' });
  const f = normalize(ai({ pos: 'v', lemma: 'lesen', du: 'liest', er: 'liest', preterite: 'las', participle: 'gelesen' })).fields;
  assert.equal(f.du, 'liest'); assert.equal(f.er, 'liest');
  assert.equal(normalize(ai({ pos: 'v', lemma: 'arbeiten', du: 'arbeitest', er: 'arbeitet', preterite: 'arbeitete', participle: 'gearbeitet' })).fields.du, '');
  assert.equal(normalize(ai({ pos: 'v', lemma: 'danken', preterite: 'dankte', participle: 'gedankt', dative_only: true })).fields.fl, 'd');
  assert.equal(normalize(ai({ pos: 'v', lemma: 'zeigen', preterite: 'zeigte', participle: 'gezeigt', dative_accusative: true })).fields.fl, 't');
});
test('Verb: trennbar und reflexiv werden abgelehnt', () => {
  assert.equal(normalize(ai({ pos: 'v', lemma: 'aufstehen', preterite: 'stand', participle: 'aufgestanden', separable: true })).ok, false);
  assert.equal(normalize(ai({ pos: 'v', lemma: 'freuen', preterite: 'freute', participle: 'gefreut', reflexive: true })).ok, false);
});
test('Adjektiv: Steigerung und Stammänderung', () => {
  assert.deepEqual(normalize(ai({ pos: 'a', lemma: 'hoch', comparative: 'höher', superlative: 'höchsten', attributive: 'hoher' })).fields,
    { base: 'hoch', comp: 'höher', sup: 'höchst', dst: 'hoh' });
  assert.deepEqual(normalize(ai({ pos: 'a', lemma: 'rund', comparative: 'runder', superlative: 'rundesten', attributive: 'runder' })).fields,
    { base: 'rund', comp: '', sup: '', dst: '' });
  assert.equal(normalize(ai({ pos: 'a', lemma: 'dunkel', comparative: 'dunkler', superlative: 'dunkelsten', attributive: 'dunkler' })).fields.dst, '');
  assert.equal(normalize(ai({ pos: 'a', lemma: 'sauber', comparative: 'sauberer', superlative: 'saubersten', attributive: 'sauberer' })).fields.dst, '');
});
test('Ungültiges wird abgelehnt', () => {
  assert.equal(normalize(ai({ ok: false, reason: 'Das ist kein deutsches Wort.' })).error, 'Das ist kein deutsches Wort.');
  assert.equal(normalize(ai({ pos: 'n', lemma: 'a b', gender: 'm' })).ok, false);
  assert.equal(normalize(ai({ pos: 'n', lemma: 'Tisch', gender: '' })).ok, false);
  assert.equal(normalize(ai({ pos: 'x', lemma: 'Tisch' })).ok, false);
  assert.equal(normalize(null).ok, false);
});
