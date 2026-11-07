import test from 'node:test';
import assert from 'node:assert/strict';
import { BASE } from './helpers.js';
import { buildUsed, makeWord, formsOf, WORD_RE } from '../src/wordgen.js';

test('gleiches Stichwort ergibt immer dasselbe Wort', () => {
  const a = makeWord('n', 'fahrrad', buildUsed(BASE)), b = makeWord('n', 'fahrrad', buildUsed(BASE));
  assert.equal(a, b);
  assert.match(a, WORD_RE);
});

test('Endvokal passt zur Wortart', () => {
  const used = buildUsed(BASE);
  assert.match(makeWord('n', 'tisch', used), /[ao]$/);
  assert.match(makeWord('v', 'rennen', used), /u$/);
  assert.match(makeWord('a', 'rund', used), /i$/);
});

test('500 neue Wörter kollidieren weder untereinander noch mit dem Grundwortschatz', () => {
  const used = buildUsed(BASE);
  const seen = new Map();
  const pos = ['n', 'v', 'a'];
  for (const [id, e] of [...BASE.nouns.map(x => ['n', x]), ...BASE.verbs.map(x => ['v', x]), ...BASE.adjs.map(x => ['a', x]), ...BASE.inv.map(x => ['i', x])]) {
    for (const f of formsOf(id, e.c)) seen.set(f, 'basis');
  }
  let made = 0;
  for (let i = 0; i < 500; i++) {
    const p = pos[i % 3], w = makeWord(p, 'testwort' + i, used);
    assert.ok(w, 'Wort ' + i);
    assert.match(w, WORD_RE);
    for (const f of formsOf(p, w)) { assert.ok(!seen.has(f), `Kollision ${f} (${w}) mit ${seen.get(f)}`); seen.set(f, w); }
    used.add(p, w); made++;
  }
  assert.equal(made, 500);
});
