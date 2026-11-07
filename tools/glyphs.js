/* Sathuri-Schrift: 70 Silbenzeichen (13 Konsonanten x 5 Vokale + 5 reine Vokale).
   Wie bei einer Buchschrift: Alle Zeichen hängen an einer gemeinsamen Kopflinie, die sich durchs Wort zieht.
   Der Konsonant ist der Körper unter der Linie. Der Vokal steht als Zusatzzeichen:
   a = kein Zusatz, e = zwei Striche oben, i = Strich rechts, o = Ring oben, u = Schale unten. */
const GLYPH_CONS = ['k','t','s','l','r','m','n','v','z','d','h','th','sh'];
const GLYPH_VOW = ['a','e','i','o','u'];
const GLYPH_LIST = (() => {
  const l = [];
  GLYPH_CONS.forEach(c => GLYPH_VOW.forEach(v => l.push(c + v)));
  GLYPH_VOW.forEach(v => l.push(v));
  return l;
})();
const GLYPH_VIEW = '0 0 72 118';
const HEAD_Y = 34;

// Körper der Konsonanten (hängen von der Kopflinie bei y = 34 nach unten)
const BODIES = {
  k:  'M20 34 V90 M20 62 C34 62 46 54 50 38 M20 62 C34 62 46 72 52 90',
  t:  'M34 34 V88 Q34 94 46 92 M14 58 H54',
  s:  'M50 34 V42 C20 38 18 60 34 64 C52 68 50 90 16 88',
  l:  'M22 34 V86 Q22 92 32 92 H54 M22 62 H38',
  r:  'M20 34 V90 M20 48 H36 Q52 48 52 62 Q52 76 36 76 H20',
  m:  'M14 34 V90 M14 54 Q14 44 28 44 Q42 44 42 58 V90 M42 58 Q42 48 54 48 Q58 48 58 58 V90',
  n:  'M16 34 V90 M16 54 Q16 44 32 44 Q48 44 48 60 V90',
  v:  'M14 34 L34 86 L54 34 M34 86 V94',
  z:  'M34 34 V44 M14 44 H52 L14 86 H54',
  d:  'M16 34 Q16 62 34 62 Q52 62 52 34 M34 62 V90',
  h:  'M18 34 Q12 62 18 90 M50 34 Q56 62 50 90 M18 62 Q34 48 50 62',
  th: 'M34 34 V90 M18 60 Q34 40 50 60 M22 90 H46',
  sh: 'M16 34 V60 Q16 90 34 90 Q52 90 52 60 V34 M34 62 V78',
  '': 'M18 34 V78 Q18 92 34 92 Q50 92 50 78 V54',        // Träger für reine Vokale
};
const sw = n => `style="stroke-width:calc(var(--sw,1)*${n})"`;
function glyphParts(syl) {
  const m = /^(th|sh|[ktslrmnvzdh])?([aeiou])$/.exec(syl);
  if (!m) return '';
  const cons = m[1] || '', v = m[2];
  let g = `<path d="M0 ${HEAD_Y} H72" stroke-linecap="butt" ${sw(4.4)}/>`;
  g += `<path d="${BODIES[cons]}" ${sw(4.2)}/>`;
  if (v === 'e') g += `<path d="M24 12 H48 M24 23 H48" ${sw(3.6)}/>`;
  if (v === 'i') g += `<path d="M65 34 V92" ${sw(4)}/>`;
  if (v === 'o') g += `<circle cx="36" cy="17" r="8" ${sw(3.6)}/>`;
  if (v === 'u') g += `<path d="M20 100 Q20 114 36 114 Q52 114 52 100" ${sw(3.8)}/>`;
  return g;
}
function glyphSVG(syl, h, cls) {
  const H = h || 48;
  return `<svg class="${cls || 'gl'}" viewBox="${GLYPH_VIEW}" width="${(H * 72 / 118).toFixed(1)}" height="${H}" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-label="${syl}" role="img">${glyphParts(syl)}</svg>`;
}
if (typeof module !== 'undefined') module.exports = {glyphSVG, glyphParts, GLYPH_LIST, GLYPH_CONS, GLYPH_VOW, GLYPH_VIEW};
