// KI-Teil: Die KI liefert NUR deutsche Grammatikdaten (Wortart, Grundform, Plural, Verbformen ...).
// Alles, was sie liefert, wird hier streng geprüft und auf das Lexikonformat von engine.js gebracht.

export const DEFAULT_MODEL = '@cf/meta/llama-3.1-8b-instruct';

const SYSTEM = `You are a precise German grammar database. The user sends exactly ONE German word (it may be an inflected form). Answer with the dictionary data as JSON.

Rules:
- ok=false and a short German "reason" if the input is not a real, ordinary German word: gibberish, a person's or place name, an abbreviation, several words, a vulgar or insulting word, or a word that is not a noun, verb or adjective (adverbs, pronouns, prepositions ...). Otherwise ok=true.
- pos: "n" noun, "v" verb, "a" adjective.
- lemma: noun = nominative singular, capitalised (Hut); verb = infinitive (laufen); adjective = base form, lowercase (kalt).
- Noun: plural = nominative plural (if there is none, repeat the singular); gender "m", "f" or "n"; weak=true only for masculine nouns of the n-declension (Junge, Drache, Bär, Held); genitive = genitive singular only if it is unusual (Herzens, Namens), otherwise "".
- Verb: du = du-form of the present tense (gehst, siehst, fährst), er = er/sie/es-form (geht, sieht, fährt); preterite = 3rd person singular Präteritum (ging, hörte); participle = Partizip II (gegangen, gehört); sein=true if the Perfekt uses "sein"; dative_only=true if the verb takes only a dative object (helfen, danken); dative_accusative=true if it usually takes dative and accusative (geben, zeigen); separable=true for separable verbs (aufstehen, anrufen); reflexive=true for verbs used with "sich".
- Adjective: comparative (größer), superlative = the form after "am" (größten), attributive = masculine nominative form after "ein" (hoher, dunkler).
- Fields that do not apply: empty string or false. Never add comments.

Examples:
Hüte -> {"ok":true,"reason":"","pos":"n","lemma":"Hut","plural":"Hüte","gender":"m","weak":false,"genitive":"","du":"","er":"","preterite":"","participle":"","sein":false,"dative_only":false,"dative_accusative":false,"separable":false,"reflexive":false,"comparative":"","superlative":"","attributive":""}
fährt -> {"ok":true,"reason":"","pos":"v","lemma":"fahren","plural":"","gender":"","weak":false,"genitive":"","du":"fährst","er":"fährt","preterite":"fuhr","participle":"gefahren","sein":true,"dative_only":false,"dative_accusative":false,"separable":false,"reflexive":false,"comparative":"","superlative":"","attributive":""}
höher -> {"ok":true,"reason":"","pos":"a","lemma":"hoch","plural":"","gender":"","weak":false,"genitive":"","du":"","er":"","preterite":"","participle":"","sein":false,"dative_only":false,"dative_accusative":false,"separable":false,"reflexive":false,"comparative":"höher","superlative":"höchsten","attributive":"hoher"}
Xyqzt -> {"ok":false,"reason":"Das ist kein deutsches Wort.","pos":"n","lemma":"","plural":"","gender":"","weak":false,"genitive":"","du":"","er":"","preterite":"","participle":"","sein":false,"dative_only":false,"dative_accusative":false,"separable":false,"reflexive":false,"comparative":"","superlative":"","attributive":""}`;

const STR = { type: 'string' }, BOOL = { type: 'boolean' };
export const SCHEMA = {
  type: 'object',
  properties: {
    ok: BOOL, reason: STR, pos: { type: 'string', enum: ['n', 'v', 'a'] }, lemma: STR,
    plural: STR, gender: { type: 'string', enum: ['m', 'f', 'n', ''] }, weak: BOOL, genitive: STR,
    du: STR, er: STR, preterite: STR, participle: STR,
    sein: BOOL, dative_only: BOOL, dative_accusative: BOOL, separable: BOOL, reflexive: BOOL,
    comparative: STR, superlative: STR, attributive: STR,
  },
  required: ['ok', 'pos', 'lemma'],
};

export async function askAI(env, word) {
  const res = await env.AI.run(env.MODEL || DEFAULT_MODEL, {
    messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: word }],
    response_format: { type: 'json_schema', json_schema: SCHEMA },
    max_tokens: 400,
    temperature: 0,
  });
  let r = res && typeof res === 'object' && 'response' in res ? res.response : res;
  if (typeof r === 'string') {
    const m = r.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('KI-Antwort ohne JSON');
    r = JSON.parse(m[0]);
  }
  if (!r || typeof r !== 'object') throw new Error('KI-Antwort ungültig');
  return r;
}

/* ---------- Prüfung und Umwandlung ins Lexikonformat ---------- */

const LETTERS = /^[A-Za-zÄÖÜäöüß]+$/;
const clean = s => (typeof s === 'string' ? s.trim() : '');
const fail = error => ({ ok: false, error });

function genSg(s) {            // wie in engine.js
  if (/nis$/.test(s)) return s + 'ses';
  if (/(s|ß|x|z|sch)$/.test(s)) return s + 'es';
  const syl = (s.match(/[aeiouäöüy]+/gi) || []).length;
  return syl <= 1 ? s + 'es' : s + 's';
}
const verbStem = inf => (/(ern|eln)$/.test(inf) ? inf.slice(0, -1) : /en$/.test(inf) ? inf.slice(0, -2) : inf.slice(0, -1));
const needE = st => /(t|d|chn|gn|fn|tm|dm)$/.test(st);

// Gibt {ok:true, pos, lemma, fields} oder {ok:false, error} zurück. fields entspricht den Einträgen in lex.json (ohne "c").
export function normalize(ai) {
  if (!ai || ai.ok !== true) return fail(clean(ai && ai.reason) || 'Das ist kein Wort, das ich anlegen kann.');
  const pos = ai.pos;
  let lemma = clean(ai.lemma);
  if (!['n', 'v', 'a'].includes(pos)) return fail('Dieses Wort ist weder Nomen, Verb noch Adjektiv.');
  if (!LETTERS.test(lemma) || lemma.length < 2 || lemma.length > 30) return fail('Die Grundform des Wortes ist ungültig.');

  if (pos === 'n') {
    lemma = lemma[0].toUpperCase() + lemma.slice(1);
    const g = clean(ai.gender);
    if (!['m', 'f', 'n'].includes(g)) return fail('Das Geschlecht des Nomens ist unklar.');
    let p = clean(ai.plural) || lemma;
    if (!LETTERS.test(p) || p.length > 34) return fail('Die Mehrzahl ist ungültig.');
    p = p[0].toUpperCase() + p.slice(1);
    const weak = ai.weak === true && g === 'm';
    let gen = clean(ai.genitive);
    if (!LETTERS.test(gen)) gen = '';
    if (gen) gen = gen[0].toUpperCase() + gen.slice(1);
    if (weak) { if (gen === p) gen = ''; }
    else if (!/ens$/.test(gen) || gen === genSg(lemma)) gen = '';
    const f = { s: lemma, p, g };
    if (weak) f.w = 1;
    if (gen) f.gen = gen;
    return { ok: true, pos, lemma, fields: f };
  }

  lemma = lemma.toLowerCase();
  if (pos === 'v') {
    if (!/n$/.test(lemma) || lemma.length < 4) return fail('Die Grundform des Verbs (Infinitiv) ist ungültig.');
    if (ai.separable === true) return fail('Trennbare Verben (wie „aufstehen“) kann Sathuri noch nicht.');
    if (ai.reflexive === true) return fail('Reflexive Verben (mit „sich“) kann Sathuri noch nicht.');
    const pret = clean(ai.preterite).toLowerCase(), part = clean(ai.participle).toLowerCase();
    if (!LETTERS.test(pret) || !LETTERS.test(part)) return fail('Die Zeitformen des Verbs sind ungültig.');
    const st = verbStem(lemma), e = needE(st), sib = /[sßxz]$/.test(st);
    const defDu = sib ? st + 't' : st + (e ? 'est' : 'st'), defEr = st + (e ? 'et' : 't');
    let du = clean(ai.du).toLowerCase(), er = clean(ai.er).toLowerCase();
    if (!LETTERS.test(du) || du === defDu) du = '';
    if (!LETTERS.test(er) || er === defEr) er = '';
    if ((du && !er) || (!du && er)) { du = ''; er = ''; }       // Stammwechsel nur, wenn beide Formen da sind
    const fl = (ai.sein === true ? 'm' : '') + (ai.dative_accusative === true ? 't' : ai.dative_only === true ? 'd' : '');
    return { ok: true, pos, lemma, fields: { inf: lemma, du, er, pret, part, fl } };
  }

  // Adjektiv
  const defComp = /e$/.test(lemma) ? lemma + 'r' : lemma + 'er';
  const defSup = /e$/.test(lemma) ? lemma + 'st' : /(t|d|s|ß|z|x|sch)$/.test(lemma) ? lemma + 'est' : lemma + 'st';
  let comp = clean(ai.comparative).toLowerCase(), sup = clean(ai.superlative).toLowerCase().replace(/^am\s+/, '');
  sup = sup.replace(/en$/, '');
  if (!LETTERS.test(comp) || comp === defComp) comp = '';
  if (!LETTERS.test(sup) || sup === defSup) sup = '';
  let dst = '';
  const att = clean(ai.attributive).toLowerCase().replace(/er$/, '');
  if (LETTERS.test(att) && att !== lemma && !/e$/.test(lemma) && !(/el$/.test(lemma) && att === lemma.slice(0, -2) + 'l')) {
    // nur die bekannten Stammänderungen (hoch -> hoh, teuer -> teur): ein Zeichen kürzer, sonst gleicher Anfang
    let k = 0; while (k < att.length && att[k] === lemma[k]) k++;
    if (att.length === lemma.length - 1 && k >= att.length - 1) dst = att;
  }
  return { ok: true, pos, lemma, fields: { base: lemma, comp, sup, dst } };
}
