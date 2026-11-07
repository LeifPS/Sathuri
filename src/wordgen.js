// Regelbasierter Wortgenerator für Sathuri (JS-Port von tools/gen.py).
// Das Sathuri-Wort wird nie von der KI erfunden, sondern hier nach festen Regeln erzeugt:
// nur (K)V-Silben, Endvokal nach Wortart, keine Kollision mit bestehenden Wörtern oder Beugungsformen.
// Gleiche deutsche Eingabe ergibt immer dasselbe Wort (Seed aus dem deutschen Stichwort).

const ONSETS = ['k', 't', 's', 'l', 'r', 'm', 'n', 'v', 'z', 'd', 'h', 'th', 'sh'];
const OW = { k: 2, t: 2, s: 2, l: 3, r: 3, m: 2, n: 3, v: 2, z: 2, d: 2, h: 1, th: 3, sh: 2 };
const VOW = ['a', 'e', 'i', 'o', 'u'];
const VW = { a: 3, e: 2, i: 3, o: 2, u: 2 };
const NOUN_SUF = ['ki', 'no', 'la', 'mi', 'su', 'tha', 'ze'];
const VERB_SUF = ['ra', 'sha', 'vo', 'de'];
const GRAMMAR_WORDS = ['zo', 've', 'mo', 'ro'];
const CLASS_VOWELS = { n: 'ao', v: 'u', a: 'i', i: 'e' };
const NSYL = { n: [2, 2, 2, 3, 3], v: [2, 2, 2, 3], a: [2, 2, 3] };

export const SYL_RE = /(?:th|sh|[ktslrmnvzdh])?[aeiou]/g;
export const WORD_RE = /^(?:(?:th|sh|[ktslrmnvzdh])?[aeiou])+$/;

export function formsOf(pos, w) {
  if (pos === 'n' || pos === 'a') {
    const out = [];
    for (const p of ['', 'ki']) for (const c of ['', ...NOUN_SUF.slice(1)]) out.push(w + p + c);
    return out;
  }
  if (pos === 'v') return [w, w + 'vo', w + 'ra', w + 'sha', w + 'vora', w + 'vosha', w + 'de'];
  return [w];
}

// Bereits vergebene Formen und Wortwurzeln aus dem Grundwortschatz und den Zusatzwörtern.
export function buildUsed(lex, extras = []) {
  const forms = new Set([...NOUN_SUF, ...VERB_SUF, ...GRAMMAR_WORDS, 'ona', 'elo', 'ira', 'onaki', 'eloki', 'iraki']);
  const roots = new Set(['on', 'el', 'ir']);
  for (const r of ['ona', 'elo', 'ira']) formsOf('n', r).forEach(f => forms.add(f));
  const add = (pos, w) => { formsOf(pos, w).forEach(f => forms.add(f)); roots.add(w.slice(0, -1)); };
  for (const e of lex.nouns) add('n', e.c);
  for (const e of lex.verbs) add('v', e.c);
  for (const e of lex.adjs) add('a', e.c);
  for (const e of lex.inv) add('i', e.c);
  for (const x of extras) add(x.pos, x.c);
  return { forms, roots, add };
}

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function wchoice(rng, items, weights) {
  const total = items.reduce((s, i) => s + weights[i], 0);
  let r = rng() * total;
  for (const i of items) { r -= weights[i]; if (r < 0) return i; }
  return items[items.length - 1];
}

function genWord(rng, nsyl, pos) {
  const cv = CLASS_VOWELS[pos];
  const sy = [];
  let prev = null;
  for (let i = 0; i < nsyl; i++) {
    const last = i === nsyl - 1;
    let on;
    if (i === 0 && nsyl >= 2 && rng() < 0.05) on = '';
    else { do { on = wchoice(rng, ONSETS, OW); } while (on === prev); }
    const v = last ? pick(rng, cv.split('')) : wchoice(rng, VOW, VW);
    sy.push(on + v);
    prev = on;
  }
  if (new Set(sy).size < sy.length) return null;
  return sy.join('');
}

export function acceptable(pos, w, used) {
  if (!WORD_RE.test(w)) return false;
  if (!CLASS_VOWELS[pos].includes(w[w.length - 1])) return false;
  if (formsOf(pos, w).some(f => used.forms.has(f))) return false;
  if (used.roots.has(w.slice(0, -1))) return false;
  return true;
}

// pos: 'n' | 'v' | 'a'; key: deutsches Stichwort (Seed). Gibt null zurück, wenn nichts gefunden wurde.
export function makeWord(pos, key, used) {
  const rng = mulberry32(fnv1a(pos + ':' + key));
  for (let i = 0; i < 5000; i++) {
    const w = genWord(rng, pick(rng, NSYL[pos]), pos);
    if (w && acceptable(pos, w, used)) return w;
  }
  return null;
}
