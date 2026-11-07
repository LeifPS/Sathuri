/* Sathuri-Engine: Silben, Wörterbuch, Übersetzer Deutsch <-> Sathuri (regelbasiert). */
function createEngine(LEX) {
'use strict';

/* ================= Grundlagen ================= */
const CASES = ['nom','akk','gen','dat','loc','abl','ins'];
const SUF = {nom:'',akk:'no',gen:'la',dat:'mi',loc:'su',abl:'tha',ins:'ze'};
const CASE_NAME = {nom:'Nominativ',akk:'Akkusativ',gen:'Genitiv',dat:'Dativ',loc:'Lokativ',abl:'Ablativ',ins:'Instrumental'};
const CASE_TAG = {nom:'NOM',akk:'AKK',gen:'GEN',dat:'DAT',loc:'LOK',abl:'ABL',ins:'INS'};
const NEGW = 'zo', QW = 've', COMPW = 'mo', SUPW = 'ro';
const low = s => s.toLowerCase();
const capFirst = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const SYL_RE = /(?:th|sh|[ktslrmnvzdh])?[aeiou]/g;
const WORD_OK = /^(?:(?:th|sh|[ktslrmnvzdh])?[aeiou])+$/;
function syllabify(w) { return w.match(SYL_RE) || []; }
function isSathuri(w) { return WORD_OK.test(w); }
const stemOf = c => c;                       // Stämme stehen fertig im Lexikon
const inflN = (stem, pl, c) => stem + (pl ? 'ki' : '') + SUF[c];

/* ================= Deutsche Morphologie ================= */
const IRREG = {
  sein:  {pres:['bin','bist','ist','sind','seid','sind'], past:['war','warst','war','waren','wart','waren'], part:'gewesen', imp:['sei']},
  haben: {pres:['habe','hast','hat','haben','habt','haben'], past:['hatte','hattest','hatte','hatten','hattet','hatten'], part:'gehabt', imp:['hab','habe']},
  werden:{pres:['werde','wirst','wird','werden','werdet','werden'], past:['wurde','wurdest','wurde','wurden','wurdet','wurden'], part:'geworden', imp:['werde']},
  können:{pres:['kann','kannst','kann','können','könnt','können'], past:['konnte','konntest','konnte','konnten','konntet','konnten'], part:'gekonnt', imp:[]},
  müssen:{pres:['muss','musst','muss','müssen','müsst','müssen'], past:['musste','musstest','musste','mussten','musstet','mussten'], part:'gemusst', imp:[]},
  wollen:{pres:['will','willst','will','wollen','wollt','wollen'], past:['wollte','wolltest','wollte','wollten','wolltet','wollten'], part:'gewollt', imp:[], alt:['möchte','möchtest','möchten','möchtet']},
  dürfen:{pres:['darf','darfst','darf','dürfen','dürft','dürfen'], past:['durfte','durftest','durfte','durften','durftet','durften'], part:'gedurft', imp:[]},
  sollen:{pres:['soll','sollst','soll','sollen','sollt','sollen'], past:['sollte','solltest','sollte','sollten','solltet','sollten'], part:'gesollt', imp:[]},
  mögen: {pres:['mag','magst','mag','mögen','mögt','mögen'], past:['mochte','mochtest','mochte','mochten','mochtet','mochten'], part:'gemocht', imp:[]},
  wissen:{pres:['weiß','weißt','weiß','wissen','wisst','wissen'], past:['wusste','wusstest','wusste','wussten','wusstet','wussten'], part:'gewusst', imp:['wisse']},
};
function verbStem(inf) {
  if (/(ern|eln)$/.test(inf)) return inf.slice(0,-1);
  if (/en$/.test(inf)) return inf.slice(0,-2);
  return inf.slice(0,-1);
}
const needE = st => /(t|d|chn|gn|fn|tm|dm)$/.test(st);
const CONJ_CACHE = new Map();
function conj(v) {
  if (CONJ_CACHE.has(v)) return CONJ_CACHE.get(v);
  let r;
  if (IRREG[v.inf]) r = IRREG[v.inf];
  else {
    const st = verbStem(v.inf), e = needE(st), sib = /[sßxz]$/.test(st);
    const pres = [st + 'e',
      v.du || (sib ? st + 't' : st + (e ? 'est' : 'st')),
      v.er || (st + (e ? 'et' : 't')),
      v.inf,
      st + (e ? 'et' : 't'),
      v.inf];
    let past;
    const p = v.pret;
    if (/te$/.test(p)) past = [p, p + 'st', p, p + 'n', p + 't', p + 'n'];
    else {
      const dt = /[dt]$/.test(p), ss = /[sßxz]$/.test(p);
      past = [p, p + (dt ? 'est' : ss ? 't' : 'st'), p, p + 'en', p + (dt ? 'et' : 't'), p + 'en'];
    }
    let imp = [st];
    if (v.du && !/[äö]/.test(v.du)) {
      let b = v.du;
      if (/sst$/.test(b)) b = b.slice(0,-1);
      else if (/st$/.test(b)) { b = b.slice(0,-2); if (/[aeiouäöü]$/.test(b)) b += 's'; }
      else if (/t$/.test(b)) b = b.slice(0,-1);
      imp = [b];
    } else if (e || /[ln]$/.test(st) === false) imp = [st, st + 'e'];
    r = {pres, past, part: v.part, imp};
  }
  CONJ_CACHE.set(v, r);
  return r;
}
function genSg(s) {
  if (/nis$/.test(s)) return s + 'ses';
  if (/(s|ß|x|z|sch)$/.test(s)) return s + 'es';
  const syl = (s.match(/[aeiouäöüy]+/gi) || []).length;
  return syl <= 1 ? s + 'es' : s + 's';
}
function nounDE(n, pl, c) {
  if (pl) return (c === 'dat' && !/[ns]$/.test(n.p)) ? n.p + 'n' : n.p;
  if (c === 'gen') { if (n.g === 'f') return n.s; if (n.w) return n.gen || n.p; return n.gen || genSg(n.s); }
  if (n.w && (c === 'akk' || c === 'dat')) return n.p;
  return n.s;
}
function nounFormsDE(n) {
  const out = [{f:n.s, num:'sg'}];
  if (n.s === 'Haus') out.push({f:'Hause', num:'sg', hint:['dat']});
  if (n.w) { out.push({f:n.p, num:'wk'}); if (n.gen) out.push({f:n.gen, num:'sg', hint:['gen']}); }
  else {
    if (n.g !== 'f') {
      const g = nounDE(n,false,'gen');
      [g, n.s + 's', n.s + 'es'].forEach(f => out.push({f, num:'sg', hint:['gen']}));
    }
    out.push({f:n.p, num:'pl'});
    if (!/[ns]$/.test(n.p)) out.push({f:n.p + 'n', num:'pl', hint:['dat']});
  }
  return out;
}
function declAdj(stem, e, dst) {
  if (e === '') return stem;
  if (dst) stem = dst; else if (/el$/.test(stem)) stem = stem.slice(0,-2) + 'l';
  if (/e$/.test(stem) && e[0] === 'e') return stem + e.slice(1);
  return stem + e;
}
function adjStems(a) {
  const b = a.base;
  const comp = a.comp || (/e$/.test(b) ? b + 'r' : b + 'er');
  const sup = a.sup || (/e$/.test(b) ? b + 'st' : /(t|d|s|ß|z|x|sch)$/.test(b) ? b + 'est' : b + 'st');
  return {pos:b, comp, sup};
}
const ADJ_ENDS = ['','e','en','er','es','em'];
function adjFormsDE(a) {
  const st = adjStems(a), out = [];
  for (const deg of ['pos','comp','sup']) {
    for (const e of ADJ_ENDS) {
      if (deg === 'sup' && e === '') continue;
      out.push({f: declAdj(st[deg], e, deg === 'pos' ? a.dst : ''), deg, infl: e !== ''});
    }
  }
  return out;
}
// deutsche Artikel- und Adjektivendungen
const KEYOF = (g, pl) => pl ? 'pl' : g;
const DEFART = {nom:{m:'der',f:'die',n:'das',pl:'die'}, akk:{m:'den',f:'die',n:'das',pl:'die'},
                dat:{m:'dem',f:'der',n:'dem',pl:'den'}, gen:{m:'des',f:'der',n:'des',pl:'der'}};
const DIES = {nom:{m:'er',f:'e',n:'es',pl:'e'}, akk:{m:'en',f:'e',n:'es',pl:'e'}, dat:{m:'em',f:'er',n:'em',pl:'en'}, gen:{m:'es',f:'er',n:'es',pl:'er'}};
const EIN = {nom:{m:'',f:'e',n:'',pl:'e'}, akk:{m:'en',f:'e',n:'',pl:'e'}, dat:{m:'em',f:'er',n:'em',pl:'en'}, gen:{m:'es',f:'er',n:'es',pl:'er'}};
const AE = {
  weak:  {nom:{m:'e',f:'e',n:'e',pl:'en'}, akk:{m:'en',f:'e',n:'e',pl:'en'}, dat:{m:'en',f:'en',n:'en',pl:'en'}, gen:{m:'en',f:'en',n:'en',pl:'en'}},
  mixed: {nom:{m:'er',f:'e',n:'es',pl:'en'}, akk:{m:'en',f:'e',n:'es',pl:'en'}, dat:{m:'en',f:'en',n:'en',pl:'en'}, gen:{m:'en',f:'en',n:'en',pl:'en'}},
  strong:{nom:{m:'er',f:'e',n:'es',pl:'e'}, akk:{m:'en',f:'e',n:'es',pl:'e'}, dat:{m:'em',f:'er',n:'em',pl:'en'}, gen:{m:'en',f:'er',n:'en',pl:'er'}},
};
// Fall-Mengen je Endung (für Fall-Erkennung aus dem Artikel)
const DEFCASES = {der:{m:['nom'],f:['gen','dat'],n:[],pl:['gen']}, die:{m:[],f:['nom','akk'],n:[],pl:['nom','akk']},
  das:{m:[],f:[],n:['nom','akk'],pl:[]}, den:{m:['akk'],f:[],n:[],pl:['dat']}, dem:{m:['dat'],f:[],n:['dat'],pl:[]}, des:{m:['gen'],f:[],n:['gen'],pl:[]}};
const END_EIN = {'':{m:['nom'],f:[],n:['nom','akk'],pl:[]}, 'e':{m:[],f:['nom','akk'],n:[],pl:['nom','akk']},
  'en':{m:['akk'],f:[],n:[],pl:['dat']}, 'em':{m:['dat'],f:[],n:['dat'],pl:[]}, 'er':{m:[],f:['dat','gen'],n:[],pl:['gen']}, 'es':{m:['gen'],f:[],n:['gen'],pl:[]}};
const END_DIES = {'er':{m:['nom'],f:['dat','gen'],n:[],pl:['gen']}, 'e':{m:[],f:['nom','akk'],n:[],pl:['nom','akk']},
  'es':{m:['gen'],f:[],n:['nom','akk','gen'],pl:[]}, 'en':{m:['akk'],f:[],n:[],pl:['dat']}, 'em':{m:['dat'],f:[],n:['dat'],pl:[]}};
const END_PLQ = {'e':{m:[],f:[],n:[],pl:['nom','akk']}, 'en':{m:[],f:[],n:[],pl:['dat']}, 'er':{m:[],f:[],n:[],pl:['gen']}};

/* ================= Pronomen ================= */
const PRON = [
  {p:1,n:'sg',stem:'ona',nom:'ich',akk:'mich',dat:'mir',poss:'mein',pe:'mein'},
  {p:2,n:'sg',stem:'elo',nom:'du',akk:'dich',dat:'dir',poss:'dein',pe:'dein'},
  {p:3,n:'sg',stem:'ira',nom:'er',akk:'ihn',dat:'ihm',poss:'sein',pe:'sein'},
  {p:1,n:'pl',stem:'ona',nom:'wir',akk:'uns',dat:'uns',poss:'unser',pe:'unser'},
  {p:2,n:'pl',stem:'elo',nom:'ihr',akk:'euch',dat:'euch',poss:'euer',pe:'eur'},
  {p:3,n:'pl',stem:'ira',nom:'sie',akk:'sie',dat:'ihnen',poss:'ihr',pe:'ihr'},
];
const pronIdx = (p, n) => (n === 'pl' ? 3 : 0) + (p - 1);
function pronCon(p, n, c) { return inflN(PRON[pronIdx(p,n)].stem, n === 'pl', c); }
function pronDE(p, n, c) {
  const x = PRON[pronIdx(p,n)];
  if (c === 'nom') return x.nom;
  if (c === 'akk') return x.akk;
  return x.dat;
}
const PRON_DE = {
  ich:[{p:1,n:'sg',cases:['nom']}], mich:[{p:1,n:'sg',cases:['akk']}], mir:[{p:1,n:'sg',cases:['dat']}],
  du:[{p:2,n:'sg',cases:['nom']}], dich:[{p:2,n:'sg',cases:['akk']}], dir:[{p:2,n:'sg',cases:['dat']}],
  er:[{p:3,n:'sg',cases:['nom']}], ihn:[{p:3,n:'sg',cases:['akk']}], ihm:[{p:3,n:'sg',cases:['dat']}],
  es:[{p:3,n:'sg',cases:['nom','akk']}],
  sie:[{p:3,n:'sg',cases:['nom','akk']},{p:3,n:'pl',cases:['nom','akk']}],
  wir:[{p:1,n:'pl',cases:['nom']}], uns:[{p:1,n:'pl',cases:['akk','dat']}],
  ihr:[{p:2,n:'pl',cases:['nom']},{p:3,n:'sg',cases:['dat']}], euch:[{p:2,n:'pl',cases:['akk','dat']}],
  ihnen:[{p:3,n:'pl',cases:['dat']}],
};
const POSS_B = [{b:'mein',p:1,n:'sg',e:'mein'},{b:'dein',p:2,n:'sg',e:'dein'},{b:'sein',p:3,n:'sg',e:'sein'},
  {b:'unser',p:1,n:'pl',e:'unser'},{b:'euer',p:2,n:'pl',e:'eur'},{b:'ihr',p:3,n:'sg',e:'ihr'}];
function possWord(p, n, c, g, pl) {       // mein/dein/... dekliniert
  const x = PRON[pronIdx(p,n)];
  const end = EIN[c][KEYOF(g, pl)];
  return end === '' ? x.poss : x.pe + end;
}

/* ================= Deutsch-Index ================= */
const DE = Object.create(null);
const addDE = (k, c) => { (DE[low(k)] ||= []).push(c); };
function addVerbForms(v) {
  const c = conj(v), map = new Map();
  const add = (f, an) => { const k = low(f); if (!map.has(k)) map.set(k, []); map.get(k).push(an); };
  c.pres.forEach((f,i) => add(f, {kind:'fin', tense:'pres', person:i}));
  c.past.forEach((f,i) => add(f, {kind:'fin', tense:'past', person:i}));
  add(v.inf, {kind:'inf'});
  add(c.part, {kind:'part'});
  (c.imp || []).forEach(f => add(f, {kind:'imp'}));
  if (c.alt) c.alt.forEach((f,i) => add(f, {kind:'fin', tense:'pres', person:[0,1,3,4][i] === undefined ? 2 : [0,1,3,4][i]}));
  if (c.alt) add('möchte', {kind:'fin', tense:'pres', person:2});
  for (const [k, an] of map) addDE(k, {t:'verb', lex:v, an});
}
LEX.nouns.forEach(n => {
  const byForm = new Map();
  nounFormsDE(n).forEach(x => {
    const k = low(x.f);
    const e = byForm.get(k) || {t:'noun', lex:n, nums:new Set(), hint:null};
    e.nums.add(x.num);
    if (x.hint) e.hint = e.hint ? e.hint.concat(x.hint) : x.hint.slice();
    if (!x.hint) e.plain = true;
    byForm.set(k, e);
  });
  for (const [k, e] of byForm) { if (e.plain) e.hint = null; addDE(k, e); }
});
LEX.verbs.forEach(addVerbForms);
LEX.adjs.forEach(a => {
  const byForm = new Map();
  adjFormsDE(a).forEach(x => { const k = low(x.f); if (!byForm.has(k)) byForm.set(k, {t:'adj', lex:a, deg:x.deg, infl:x.infl}); });
  for (const [k, e] of byForm) addDE(k, e);
});
LEX.inv.forEach(e => {
  e.f.forEach(f => {
    if (e.t === 'post') addDE(f, {t:'prep', mode:'post', lex:e});
    else if (e.t === 'det') {
      const base = e.f[0].replace(/(er|e)$/, '');
      addDE(f, {t:'inv', sub:'det', lex:e, ending: f.slice(base.length), pl: e.o === 'pl', sg: e.o === 'sg', form: f});
    }
    else if (e.t === 'num') addDE(f, {t:'num', lex:e});
    else addDE(f, {t:'inv', sub:e.t, lex:e, key:e.o});
  });
});
// Pronomen, Possessiva, Artikel, Präpositionen
for (const k in PRON_DE) PRON_DE[k].forEach(o => addDE(k, {t:'pron', p:o.p, n:o.n, cases:o.cases}));
POSS_B.forEach(x => ['','e','en','em','er','es'].forEach(e =>
  addDE(e === '' ? x.b : x.e + e, {t:'poss', p:x.p, n:x.n, ending:e, kind:'poss', cases:END_EIN[e]})));
for (const f in DEFCASES) addDE(f, {t:'det', kind:'def', form:f, cases:DEFCASES[f]});
['','e','en','em','er','es'].forEach(e => {
  const cs = JSON.parse(JSON.stringify(END_EIN[e])); cs.pl = [];
  if (e !== 'e' || true) addDE('ein' + e, {t:'det', kind:'indef', form:'ein' + e, ending:e, cases:cs});
  addDE('kein' + e, {t:'det', kind:'neg', form:'kein' + e, ending:e, cases:END_EIN[e]});
});
const PREP = {mit:'ins', durch:'ins', aus:'abl', zu:'dat', nach:'dat', in:'dyn', an:'dyn', auf:'dyn', bei:'loc'};
for (const p in PREP) addDE(p, {t:'prep', mode:'case', case:PREP[p], form:p});
addDE('von', {t:'prep', mode:'von', form:'von'});
const CONTR = {im:['in','dem'], am:['an','dem'], zum:['zu','dem'], zur:['zu','der'], ins:['in','das'], vom:['von','dem'],
  beim:['bei','dem'], aufs:['auf','das'], ans:['an','das'], fürs:['für','das'], ums:['um','das'], übers:['über','das'], durchs:['durch','das']};
// Ziffern
const DIGITS = {0:'null',1:'eins',2:'zwei',3:'drei',4:'vier',5:'fünf',6:'sechs',7:'sieben',8:'acht',9:'neun',10:'zehn',12:'zwölf',20:'zwanzig',100:'hundert',1000:'tausend'};
const COP = new Set(['sein','werden','heißen','bleiben','scheinen']);

/* ================= Sathuri-Index ================= */
const CF = Object.create(null);
const addCF = (f, a) => { (CF[f] ||= []).push(a); };
LEX.nouns.forEach(n => [false,true].forEach(pl => CASES.forEach(c => addCF(inflN(n.c, pl, c), {pos:'n', lex:n, pl, case:c}))));
LEX.adjs.forEach(a => [false,true].forEach(pl => CASES.forEach(c => addCF(inflN(a.c, pl, c), {pos:'a', lex:a, pl, case:c}))));
LEX.verbs.forEach(v => {
  addCF(v.c, {pos:'v', lex:v, tense:'pres'});
  addCF(v.c + 'vo', {pos:'v', lex:v, tense:'pres', cont:true});
  addCF(v.c + 'ra', {pos:'v', lex:v, tense:'past'});
  addCF(v.c + 'sha', {pos:'v', lex:v, tense:'fut'});
  addCF(v.c + 'vora', {pos:'v', lex:v, tense:'past', cont:true});
  addCF(v.c + 'vosha', {pos:'v', lex:v, tense:'fut', cont:true});
  addCF(v.c + 'de', {pos:'v', lex:v, tense:'imp'});
});
LEX.inv.forEach(e => addCF(e.c, {pos:'i', lex:e}));
[1,2,3].forEach(p => ['sg','pl'].forEach(n => CASES.forEach(c => addCF(pronCon(p,n,c), {pos:'p', p, n, case:c}))));
addCF(QW, {pos:'q'});

/* ================= Glossen ================= */
function glossN(n, pl, c) { return n.s + (pl ? '.PL' : '') + (c !== 'nom' ? '.' + CASE_TAG[c] : ''); }

/* ================= Deutsch -> Sathuri ================= */
function tokenizeDE(text) {
  const out = [], re = /[A-Za-zÄÖÜäöüß]+|\d+|[.,!?;:]/g;
  let m, first = true;
  while ((m = re.exec(text))) {
    const w = m[0];
    if (/^[.,!?;:]$/.test(w)) { out.push({raw:w, punct:true}); if (/[.!?]/.test(w)) first = true; continue; }
    out.push({raw:w, low:low(w), cap:/^[A-ZÄÖÜ]/.test(w), first});
    first = false;
  }
  return out;
}
function expandContractions(words) {
  const out = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w.punct) { out.push(w); continue; }
    if (/^\d+$/.test(w.raw)) {
      const nm = DIGITS[parseInt(w.raw,10)];
      if (nm) { out.push(Object.assign({}, w, {raw:nm, low:nm, cap:false})); continue; }
    }
    if (w.low === 'am') {
      const nx = words[i+1];
      if (nx && !nx.punct && (DE[nx.low] || []).some(c => c.t === 'adj' && c.deg === 'sup')) continue;   // "am größten"
    }
    if (CONTR[w.low]) {
      const [a, b] = CONTR[w.low];
      out.push({raw:capFirst(a) === w.raw ? a : a, low:a, cap:w.cap, first:w.first});
      out.push({raw:b, low:b, cap:false, first:false});
      continue;
    }
    out.push(w);
  }
  return out;
}
function pickTag(w, i, words) {
  const cands = DE[w.low] || [];
  const mk = c => Object.assign({}, c, {raw:w.raw, idx:i});
  const next = (() => { for (let j = i+1; j < words.length; j++) { if (words[j].punct) return null; return words[j]; } return null; })();
  const prev = i > 0 && !words[i-1].punct ? words[i-1] : null;
  const nextTags = () => next ? (DE[next.low] || []) : [];
  const endsWith = words.length ? (() => { for (let j = words.length - 1; j >= 0; j--) if (words[j].punct) return words[j].raw; return ''; })() : '';
  if (w.low === 'als') return {t:'prep', mode:'case', case:'abl', form:'als', raw:w.raw, idx:i};
  if (!cands.length) {
    if (w.cap) return {t:'name', raw:w.raw, idx:i};
    return {t:'unk', raw:w.raw, idx:i};
  }
  if (cands.length === 1) return mk(cands[0]);
  // Wortartenwahl
  const by = t => cands.filter(c => c.t === t);
  if (w.low === 'sein') {
    // Possessivum, wenn ein Nomen (ggf. nach Adjektiven) folgt
    let j = i + 1, ok = false;
    while (j < words.length && !words[j].punct) {
      const cs = DE[words[j].low] || [];
      if (cs.some(c => c.t === 'noun')) { ok = true; break; }
      if (cs.some(c => c.t === 'adj' && c.infl)) { j++; continue; }
      break;
    }
    const pick = ok ? by('poss')[0] : by('verb')[0];
    return mk(pick || cands[0]);
  }
  if (w.low === 'ihr') {
    let j = i + 1, ok = false;
    while (j < words.length && !words[j].punct) {
      const cs = DE[words[j].low] || [];
      if (cs.some(c => c.t === 'noun')) { ok = true; break; }
      if (cs.some(c => c.t === 'adj' && c.infl)) { j++; continue; }
      break;
    }
    return mk(ok ? by('poss')[0] : by('pron')[0]);
  }
  if (w.low === 'weiß') {
    const pv = prev && (DE[prev.low] || []).some(c => c.t === 'pron');
    return mk(pv ? by('verb')[0] : by('adj')[0]);
  }
  const nouns = by('noun'), others = cands.filter(c => c.t !== 'noun');
  if (nouns.length && others.length) {
    if (!w.first) return mk(w.cap ? nouns[0] : others[0]);
    if (!w.cap) return mk(others[0]);
    if (endsWith === '!' && others.some(c => c.t === 'verb')) return mk(others.find(c => c.t === 'verb'));
    if (next && (DE[next.low] || []).some(c => c.t === 'pron') && others.some(c => c.t === 'verb')) return mk(others.find(c => c.t === 'verb'));
    return mk(nouns[0]);
  }
  // Rest: erste Kandidatenreihenfolge, Verb > Adjektiv > anderes
  const pref = ['prep','det','poss','num','inv','pron','verb','adj','noun'];
  cands.sort((a, b) => pref.indexOf(a.t) - pref.indexOf(b.t));
  return mk(cands[0]);
}
function tagSentence(words) {
  const ws = expandContractions(words);
  return ws.map((w, i) => w.punct ? {t:'punct', raw:w.raw, idx:i} : pickTag(w, i, ws));
}

function detCasesOf(tok) {
  if (tok.t === 'det' || tok.t === 'poss') return tok.cases;
  if (tok.t === 'inv' && tok.sub === 'det') return tok.pl ? END_PLQ[tok.ending] : END_DIES[tok.ending];
  return null;
}
function resolveNum(head, np) {
  if (head.t !== 'noun') return false;
  const nums = head.nums;
  if (nums.size === 1 && !nums.has('wk') && !nums.has('amb')) return nums.has('pl');
  const g = head.lex.g;
  const dc = np.detTok ? detCasesOf(np.detTok) : null;
  const numTok = np.num ? np.num.lex.f[0] : null;
  if (numTok) return numTok !== 'eins';
  if (np.demo && np.demo.pl) return true;
  if (nums.has('wk')) {
    if (np.detTok) {
      const e = np.detTok.ending || '', f = np.detTok.form;
      if (np.detTok.t === 'poss' || np.detTok.kind === 'neg' || np.detTok.kind === 'indef') return !['en','em','es'].includes(e) ? (e === 'e' ? true : false) : false;
      if (f === 'den' || f === 'dem' || f === 'des') return false;
      if (f === 'der') return false;
      return true;
    }
    if (np.demo) return !['en','em','es'].includes(np.demo.ending || '');
    return true;
  }
  // sg/pl mehrdeutig (z. B. "Zauberer")
  if (dc) { if ((dc[g] || []).length) return false; if ((dc.pl || []).length) return true; }
  return nums.has('pl') && !nums.has('sg');
}
function npCases(np) {
  const h = np.head;
  if (h.t === 'pron') return new Set(h.cases);
  if (h.t === 'name') return new Set(['nom','akk','dat','gen']);
  let s = new Set(['nom','akk','dat','gen']);
  if (h.hint) s = new Set(h.hint);
  const dt = np.detTok || (np.demo && np.demo.t ? np.demo : null);
  const dc = np.detTok ? detCasesOf(np.detTok) : (np.demo ? detCasesOf(np.demo) : null);
  if (dc) {
    const a = dc[np.pl ? 'pl' : h.lex.g] || [];
    if (a.length) { const inter = [...s].filter(x => a.includes(x)); s = new Set(inter.length ? inter : a); }
  }
  return s;
}
function parseNP(toks, i) {
  const np = {adjs:[], attrs:[], neg:false, poss:null, demo:null, num:null, detTok:null, head:null, pl:false};
  let j = i;
  for (;;) {
    const t = toks[j]; if (!t) break;
    if (t.t === 'det') { if (np.detTok) break; np.detTok = t; if (t.kind === 'neg') np.neg = true; j++; continue; }
    if (t.t === 'poss') { if (np.detTok) break; np.poss = t; np.detTok = t; j++; continue; }
    if (t.t === 'inv' && t.sub === 'det') { if (np.demo) break; np.demo = t; j++; continue; }
    if (t.t === 'num') { if (np.num) break; np.num = t; j++; continue; }
    if (t.t === 'adj') { np.adjs.push(t); j++; continue; }
    if (t.t === 'noun' || t.t === 'name' || t.t === 'pron') { np.head = t; j++; break; }
    break;
  }
  if (!np.head) {
    if (np.adjs.length && !np.detTok && !np.demo && !np.num) return {np:null, adjs:np.adjs, next:j};
    return {np:null, adjs:np.adjs, next:Math.max(j, i + 1)};
  }
  np.pl = resolveNum(np.head, np);
  if (np.head.t === 'pron') np.pl = np.head.n === 'pl';
  // Genitiv-Attribute
  for (;;) {
    const t = toks[j]; if (!t) break;
    if (t.t === 'prep' && t.mode === 'von') {
      const r = parseNP(toks, j + 1);
      if (r.np) { r.np.gen = true; np.attrs.push(r.np); j = r.next; continue; }
      break;
    }
    if (t.t === 'det' && (t.kind === 'def' || t.kind === 'indef')) {
      const r = parseNP(toks, j);
      if (r.np) {
        const cs = npCases(r.np);
        if (cs.has('gen') && !cs.has('akk') && !cs.has('nom')) { r.np.gen = true; np.attrs.push(r.np); j = r.next; continue; }
      }
    }
    break;
  }
  return {np, next:j};
}
function buildItems(toks) {
  const items = [];
  let i = 0, pend = null;
  while (i < toks.length) {
    const t = toks[i];
    if (t.t === 'prep') { pend = t; i++; continue; }
    if (['det','poss','num','adj','noun','pron','name'].includes(t.t) || (t.t === 'inv' && t.sub === 'det')) {
      const r = parseNP(toks, i);
      if (r.np) { if (pend) { r.np.pp = pend; pend = null; } items.push({k:'np', np:r.np}); }
      else r.adjs.forEach(a => items.push({k:'adj', tok:a}));
      i = Math.max(r.next, i + 1); continue;
    }
    if (t.t === 'verb') { items.push({k:'verb', tok:t}); i++; continue; }
    if (t.t === 'inv') { items.push({k:'inv', tok:t}); i++; continue; }
    if (t.t === 'unk') { items.push({k:'unk', tok:t}); i++; continue; }
    i++;
  }
  return items;
}

function translateClauseDE(toks, ctx, notes) {
  // führendes Bindewort
  let conj = null;
  if (toks.length && toks[0].t === 'inv' && toks[0].sub === 'conj') { conj = toks[0]; toks = toks.slice(1); }
  const isSub = !!(conj && conj.lex.o === 'sub');
  const items = buildItems(toks);
  const verbToks = items.filter(it => it.k === 'verb').map(it => it.tok);
  // finites Verb bestimmen
  let finTok = null, finAn = null;
  if (verbToks.length) {
    finTok = isSub ? verbToks[verbToks.length - 1] : verbToks[0];
    const pr = finTok.an.find(a => a.kind === 'fin') || finTok.an.find(a => a.kind === 'imp') || finTok.an[0];
    finAn = pr;
  }
  const others = verbToks.filter(v => v !== finTok);
  let main = null, tense = 'pres', modal = null, imperative = false;
  if (finTok) {
    const L = finTok.lex.inf;
    const part = others.find(o => o.an.some(a => a.kind === 'part'));
    const inf = others.find(o => o.an.some(a => a.kind === 'inf'));
    tense = finAn.tense || 'pres';
    if (finAn.kind === 'imp') { imperative = true; main = finTok.lex; }
    else if ((L === 'haben' || L === 'sein') && part) { main = part.lex; tense = 'past'; }
    else if (L === 'werden' && inf) { main = inf.lex; tense = 'fut'; }
    else if (finTok.lex.fl.includes('x') && (inf || others[0])) { modal = finTok.lex; main = (inf || others[0]).lex; }
    else main = finTok.lex;
  }
  // Imperativ nur mit "!" und ohne Subjektpronomen
  const hasSubjPron = items.some(it => it.k === 'np' && it.np.head.t === 'pron' && it.np.head.cases.includes('nom') && !it.np.pp);
  const impOnly = finTok && finTok.an.every(a => a.kind === 'imp');
  if (!((ctx.end === '!' || impOnly) && items.length && items[0].k === 'verb' && !hasSubjPron && !isSub)) {
    if (imperative) { imperative = false; }
  } else if (finTok && !imperative && finTok.an.some(a => a.kind === 'imp' || a.kind === 'inf' || (a.kind === 'fin' && a.person === 4))) {
    imperative = true; main = finTok.lex; modal = null; tense = 'pres';
  }
  const verbFlags = (main ? main.fl : '') + (modal ? modal.fl : '');
  const motion = main && main.fl.includes('m');
  // Fälle der Nominalphrasen
  const coordOf = new Map();
  for (let k = 0; k + 2 < items.length; k++) {
    const A = items[k], C = items[k + 1], B = items[k + 2];
    if (A.k === 'np' && C.k === 'inv' && C.tok.sub === 'conj' && ['und','oder'].includes(C.tok.lex.f[0]) && B.k === 'np') coordOf.set(B.np, A.np);
  }
  const nps = items.filter(it => it.k === 'np' && !it.np.pp && !coordOf.has(it.np)).map(it => it.np);
  const copular = main && COP.has(main.inf);
  let subj = null;
  const carryFirst = !!(ctx.prevSubj && conj && !isSub && items.length && items[0].k === 'verb');
  const rest = [];
  nps.forEach(np => {
    const cs = npCases(np);
    if (!subj && cs.has('nom') && !imperative && !carryFirst) { subj = np; np.case = 'nom'; }
    else rest.push(np);
  });
  const datV = main && main.fl.includes('d');
  const ditr = main && main.fl.includes('t');
  const free = [];
  rest.forEach(np => {
    const cs = npCases(np);
    if (np.head.t === 'pron' && cs.size === 1) { np.case = [...cs][0]; return; }
    if (copular) { np.case = 'nom'; return; }
    if (cs.size === 1 && !np.head.t.startsWith('name')) { np.case = [...cs][0]; return; }
    free.push(np);
  });
  free.forEach(np => {
    const cs = npCases(np);
    const hasAkk = rest.some(o => o.case === 'akk');
    const hasDat = rest.some(o => o.case === 'dat');
    if (datV) np.case = (cs.has('dat') && !hasDat) ? 'dat' : 'akk';
    else if (ditr) np.case = !hasDat && cs.has('dat') ? (hasAkk || free.length > 1 ? 'dat' : 'dat') : 'akk';
    else np.case = cs.has('akk') ? 'akk' : cs.has('dat') ? 'dat' : 'akk';
    if (ditr && !hasDat && free.length > 1 && free.indexOf(np) === free.length - 1 && !rest.some(o => o.case === 'akk')) np.case = 'akk';
  });
  coordOf.forEach((a, b) => { b.case = a.case; if (!b.pp && a.pp) b.pp = Object.assign({}, a.pp, {noPost:true}); });
  if (!subj && !imperative && main && !isSub && ctx.prevSubj) {
    subj = ctx.prevSubj; subj.case = 'nom';
    items.unshift({k:'np', np:subj});
  }
  // "sie" Zahl bestimmen (Verb-Kongruenz)
  const fixSie = np => {
    if (np.head.t === 'pron' && np.head.raw && low(np.head.raw) === 'sie' && finAn && finAn.person !== undefined) {
      const sg = finAn.person === 2 && !finTok.an.some(a => a.person === 5 || a.person === 3);
      np.head = Object.assign({}, np.head, {n: sg ? 'sg' : 'pl'}); np.pl = !sg;
    }
  };
  if (subj) fixSie(subj);
  // Ausgabe sammeln
  const out = [];
  const T = (w, g, k) => out.push({w, g, k: k || 'w'});
  const renderNP = (np, c) => {
    // Genitivattribute zuerst (Besitzer vor Besitztum)
    np.attrs.forEach(a => renderNP(a, 'gen'));
    const h = np.head;
    if (h.t === 'pron') { T(pronCon(h.p, h.n, c), h.raw + (c !== 'nom' ? '.' + CASE_TAG[c] : '')); return; }
    if (h.t === 'name') { T(h.raw, h.raw + ' (Name)', 'name'); return; }
    if (np.poss) {
      const pp = np.poss;
      T(pronCon(pp.p, pp.n, 'gen'), PRON[pronIdx(pp.p, pp.n)].poss.toUpperCase().replace(/^(.)/, m => m) + '.GEN');
    }
    if (np.neg) T(NEGW, 'NEG');
    if (np.demo) T(np.demo.lex.c, np.demo.lex.f[0]);
    if (np.num) T(np.num.lex.c, np.num.lex.f[0]);
    const pl = np.pl && !np.num;
    T(inflN(h.lex.c, pl, c), glossN(h.lex, pl, c));
    np.adjs.forEach(a => {
      if (a.deg === 'comp') T(COMPW, 'mehr');
      if (a.deg === 'sup') T(SUPW, 'am meisten');
      T(inflN(a.lex.c, pl, c), a.lex.base + (pl ? '.PL' : '') + (c !== 'nom' ? '.' + CASE_TAG[c] : ''));
    });
  };
  const ppCase = pp => {
    if (pp.mode === 'post') return 'gen';
    if (pp.mode === 'von') return 'gen';
    if (pp.case === 'dyn') return motion ? 'dat' : 'loc';
    return pp.case;
  };
  let sentNeg = false;
  const body = [];
  for (let k = 0; k < items.length; k++) {
    const it = items[k];
    const sub = [];
    const push = (w, g, kk) => sub.push({w, g, k: kk || 'w'});
    if (it.k === 'np') {
      const np = it.np;
      const before = out.length;
      if (np.pp) {
        const c = ppCase(np.pp);
        renderNP(np, c);
        if (np.pp.mode === 'post' && !np.pp.noPost) T(np.pp.lex.c, np.pp.lex.f[0]);
      } else renderNP(np, np.case || 'akk');
      continue;
    }
    if (it.k === 'adj') {
      const a = it.tok;
      if (a.deg === 'comp') T(COMPW, 'mehr');
      if (a.deg === 'sup') T(SUPW, 'am meisten');
      T(a.lex.c, a.lex.base); continue;
    }
    if (it.k === 'inv') {
      const t = it.tok;
      if (t.lex.o === 'neg') {
        const nx = items[k + 1];
        if (nx && (nx.k === 'adj' || nx.k === 'np' || (nx.k === 'inv' && nx.tok.sub === 'adv'))) T(NEGW, 'NEG');
        else sentNeg = true;
        continue;
      }
      if (t.lex.t === 'q') { T(t.lex.c, t.lex.f[0]); continue; }
      T(t.lex.c, t.lex.f[0]); continue;
    }
    if (it.k === 'unk') { T(it.tok.raw, '⟦' + it.tok.raw + '⟧', 'unk'); notes.unknown.push(it.tok.raw); continue; }
    // Verben werden unten ausgegeben
  }
  // Namen/unbekannte Großgeschriebene markieren
  out.forEach(o => { if (o.k === 'name' && !notes.names.includes(o.w)) notes.names.push(o.w); });
  // gerade -> Dauerform
  let cont = false;
  for (let q = out.length - 1; q >= 0; q--) if (out[q].w === '__gerade__') { out.splice(q, 1); }
  // Verbkomplex
  const vo = [];
  const V = (w, g) => vo.push({w, g, k:'v'});
  if (main) {
    const stem = main.c;
    const contFlag = toks.some(t => t.t === 'unk' && low(t.raw) === 'gerade');
    if (contFlag) { const ix = out.findIndex(o => o.k === 'unk' && low(o.w) === 'gerade'); if (ix >= 0) { out.splice(ix, 1); const ni = notes.unknown.lastIndexOf('gerade'); if (ni >= 0) notes.unknown.splice(ni, 1); } }
    const cs = contFlag ? 'vo' : '';
    const cg = contFlag ? '.DAUER' : '';
    if (imperative) V(stem + cs + 'de', main.inf + '.BEFEHL');
    else if (modal) {
      V(stem, main.inf);
      V(modal.c + cs + (tense === 'past' ? 'ra' : tense === 'fut' ? 'sha' : ''), modal.inf + (tense === 'past' ? '.PRÄT' : '') + cg);
    } else {
      V(stem + cs + (tense === 'past' ? 'ra' : tense === 'fut' ? 'sha' : ''), main.inf + (tense === 'past' ? '.PRÄT' : tense === 'fut' ? '.FUT' : '') + cg);
    }
  }
  const neg = sentNeg ? [{w:NEGW, g:'NEG', k:'w'}] : [];
  const res = [];
  if (conj) res.push({w:conj.lex.c, g:conj.lex.f[0], k:'w'});
  res.push(...out, ...neg, ...vo);
  if (ctx.end === '?') res.push({w:QW, g:'FRAGE', k:'w'});
  res.subj = subj;
  return res;
}

function splitClauses(tagged) {
  // Satz in Teilsätze zerlegen: Komma und Bindewörter (nur wenn danach ein Verb folgt)
  const clauses = [];
  let cur = [], hasVerb = false, comma = false;
  const flush = () => { if (cur.length) { cur.comma = comma; clauses.push(cur); comma = false; } cur = []; hasVerb = false; };
  for (let idx = 0; idx < tagged.length; idx++) {
    const t = tagged[idx];
    if (t.t === 'punct') { if (t.raw === ',') { flush(); comma = true; } continue; }
    if (t.t === 'inv' && t.sub === 'conj') {
      if (t.lex.o === 'sub') { flush(); cur.push(t); continue; }
      if (hasVerb) {
        let ahead = false;
        for (let j = idx + 1; j < tagged.length; j++) {
          const u = tagged[j];
          if (u.t === 'punct' && u.raw === ',') break;
          if (u.t === 'inv' && u.sub === 'conj') break;
          if (u.t === 'verb') { ahead = true; break; }
        }
        if (ahead) { flush(); cur.push(t); continue; }
      }
    }
    if (t.t === 'verb') hasVerb = true;
    cur.push(t);
  }
  flush();
  return clauses;
}
function translateDE(text) {
  const notes = {unknown:[], names:[]};
  const words = tokenizeDE(text);
  if (!words.length) return {text:'', tokens:[], notes};
  // Sätze trennen
  const sentences = []; let cur = [];
  for (const w of words) {
    cur.push(w);
    if (w.punct && /[.!?;:]/.test(w.raw)) { sentences.push(cur); cur = []; }
  }
  if (cur.length) sentences.push(cur);
  const tokens = [];
  let prevSubj = null;
  sentences.forEach(sw => {
    prevSubj = null;
    let end = '';
    const last = sw[sw.length - 1];
    if (last.punct && /[.!?;:]/.test(last.raw)) end = last.raw;
    const nw = sw.filter(w => !(w.punct && w.raw !== ','));
    const marked = tokenizeFirst(nw);
    const tagged = tagSentence(marked);
    const clauses = splitClauses(tagged);
    clauses.forEach((cl, ci) => {
      const isLast = ci === clauses.length - 1;
      const r = translateClauseDE(cl, {end: isLast ? end : '', prevSubj}, notes);
      prevSubj = r.subj || prevSubj;
      r.forEach(t => tokens.push(t));
      if (!isLast && clauses[ci + 1].comma) tokens.push({w:',', g:'', k:'p'});
    });
    if (end && end !== '?' ) tokens.push({w: end === ';' || end === ':' ? '.' : end, g:'', k:'p'});
    if (end === '?') tokens.push({w:'?', g:'', k:'p'});
  });
  const textOut = tokens.map((t, i) => (t.k === 'p' ? t.w : (i ? ' ' : '') + t.w)).join('').replace(/ ,/g, ',');
  return {text: textOut, tokens, notes};
}
function tokenizeFirst(ws) {
  // Satzanfang neu markieren
  let first = true;
  return ws.map(w => { if (w.punct) return w; const o = Object.assign({}, w, {first}); first = false; return o; });
}

/* ================= Sathuri -> Deutsch ================= */
function tokenizeCON(text) {
  const out = [], re = /[A-Za-zÄÖÜäöüß'’\-]+|[.,!?;:]/g;
  let m;
  while ((m = re.exec(text))) {
    const raw = m[0];
    if (/^[.,!?;:]$/.test(raw)) out.push({raw, punct:true});
    else out.push({raw, low:low(raw).replace(/[-'’]/g, '')});
  }
  return out;
}
function analyzeCON(w) { return CF[w] || null; }
function glossCON(a) {
  if (!a) return '?';
  if (a.pos === 'n') return a.lex.s + (a.pl ? '.PL' : '') + (a.case !== 'nom' ? '.' + CASE_TAG[a.case] : '');
  if (a.pos === 'a') return a.lex.base + (a.pl ? '.PL' : '') + (a.case !== 'nom' ? '.' + CASE_TAG[a.case] : '');
  if (a.pos === 'v') return a.lex.inf + (a.tense === 'past' ? '.PRÄT' : a.tense === 'fut' ? '.FUT' : a.tense === 'imp' ? '.BEFEHL' : '') + (a.cont ? '.DAUER' : '');
  if (a.pos === 'p') {
    if (a.p === 3 && a.n === 'sg') return ({nom:'er/sie/es', akk:'ihn/sie/es', dat:'ihm/ihr'})[a.case] || ('er/sie/es.' + CASE_TAG[a.case]);
    return PRON[pronIdx(a.p, a.n)].nom + (a.case !== 'nom' ? '.' + CASE_TAG[a.case] : '');
  }
  if (a.pos === 'q') return 'FRAGE';
  if (a.pos === 'i') return a.lex.o === 'neg' ? 'NEG' : a.lex.o === 'comp' ? 'mehr' : a.lex.o === 'sup' ? 'am meisten' : a.lex.f[0];
  return '?';
}
function deAdj(a, deg, e) {          // e: Endung oder '' (Prädikat)
  const st = adjStems(a.lex)[deg];
  return declAdj(st, e, deg === 'pos' ? a.lex.dst : '');
}
const POST_CASE = {über:'dat', unter:'dat', vor:'dat', hinter:'dat', neben:'dat', zwischen:'dat', ohne:'akk', gegen:'akk', um:'akk', für:'akk', bis:'akk', wegen:'gen', während:'gen'};
function deNP(np, c) {
  const h = np.head;
  if (h.pos === 'p') return [pronDE(h.p, h.n, c === 'gen' ? 'dat' : c)];
  if (h.pos === 'u') return [h.raw];
  const n = h.lex, pl = np.pl, g = n.g, key = KEYOF(g, pl);
  let det = null, mode = 'weak';
  if (np.poss) { det = possWord(np.poss.p, np.poss.n, c, g, pl); mode = 'mixed'; }
  else if (np.neg) { const e = EIN[c][key]; det = 'kein' + e; mode = 'mixed'; }
  else if (np.demo) {
    const L = np.demo.lex, base = L.f[0].replace(/(er|e)$/, '');
    if (L.o === 'pl') {
      const e = c === 'dat' ? 'en' : c === 'gen' ? 'er' : 'e';
      det = base + e; mode = (base === 'all') ? 'weak' : 'strong';
    } else { det = base + DIES[c][key]; mode = 'weak'; }
  } else if (np.num) {
    const w = np.num.lex.f[0];
    if (w === 'eins') { det = 'ein' + EIN[c][key]; mode = 'mixed'; }
    else { det = w; mode = 'strong'; }
  } else { det = DEFART[c][key]; }
  const words = [];
  if (det) words.push(det);
  np.adjs.forEach(a => {
    const m = np.num && np.num.lex.f[0] !== 'eins' ? 'strong' : mode;
    const e = AE[m][c][key];
    words.push(deAdj(a, a.deg, e));
  });
  words.push(nounDE(n, pl, c));
  np.attrs.forEach(a => words.push(...deNP(a, 'gen')));
  return words;
}
function conjDE(lex, person, tense) {
  const c = conj(lex);
  return tense === 'past' ? c.past[person] : c.pres[person];
}
function translateCON(text) {
  const words = tokenizeCON(text);
  const notes = {unknown:[]};
  const tokens = [], de = [];
  const state = {prev:null};
  // Sätze
  let sent = [];
  const sentences = [];
  words.forEach(w => { sent.push(w); if (w.punct && /[.!?]/.test(w.raw)) { sentences.push(sent); sent = []; } });
  if (sent.length) sentences.push(sent);
  sentences.forEach(sw => {
    const lastP = sw[sw.length - 1];
    let end = lastP && lastP.punct && /[.!?]/.test(lastP.raw) ? lastP.raw : '';
    // Teilsätze nach Komma
    const clausesRaw = []; let cur = [];
    sw.forEach(w => { if (w.punct && w.raw === ',') { clausesRaw.push(cur); cur = []; } else if (!(w.punct)) cur.push(w); });
    clausesRaw.push(cur);
    const outClauses = [];
    // zusätzlich an Bindewörtern trennen
    const clauses = [];
    clausesRaw.forEach((cl, ri) => {
      let part = [], hasV = false, firstPart = true;
      const pushPart = () => { if (firstPart && ri > 0) part.commaBefore = true; firstPart = false; clauses.push(part); };
      cl.forEach((w, wi) => {
        const an = analyzeCON(w.low);
        if (an) w.an = an[0];
        const isConj = an && an[0].pos === 'i' && an[0].lex.t === 'conj';
        let verbAfter = false;
        if (isConj) for (let j = wi + 1; j < cl.length; j++) {
          const a2 = analyzeCON(cl[j].low);
          if (a2 && a2[0].pos === 'i' && a2[0].lex.t === 'conj') break;
          if (a2 && a2[0].pos === 'v') { verbAfter = true; break; }
        }
        if (isConj && (an[0].lex.o === 'sub' || (hasV && verbAfter)) && part.length) { pushPart(); part = []; hasV = false; }
        if (an && an[0].pos === 'v') hasV = true;
        part.push(w);
      });
      if (part.length) pushPart();
    });
    clauses.forEach((cl, ci) => {
      cl.forEach(w => {
        const an = analyzeCON(w.low);
        const a = an ? an[0] : null;
        tokens.push({w:w.raw, g: a ? glossCON(a) : '⟦' + w.raw + '⟧', k: a ? 'w' : 'unk'});
        if (a && a.pos === 'p' && a.p === 3 && a.n === 'sg') notes.ira = true;
        if (!a) notes.unknown.push(w.raw);
      });
      const isLast = ci === clauses.length - 1;
      const s = deClause(cl, notes, isLast ? end : '', state);
      const st = cl[0] && analyzeCON(cl[0].low);
      const noComma = ci && st && st[0].pos === 'i' && st[0].lex.t === 'conj' && ['und','oder'].includes(st[0].lex.f[0]);
      de.push((ci ? (noComma ? ' ' : ', ') : '') + s);
      if (!isLast && clauses[ci + 1].commaBefore) tokens.push({w:',', g:'', k:'p'});
    });
    if (end) tokens.push({w:end, g:'', k:'p'});
    de.push(end === '?' ? '?' : end === '!' ? '!' : '.');
  });
  let textOut = '';
  let cap = true;
  const joined = de.join('').replace(/\s+,/g, ',').replace(/ +([.!?])/g, '$1').replace(/([.!?])(?=\S)/g, '$1 ');
  textOut = joined.replace(/(^|[.!?]\s+)([a-zäöü])/g, (m, a, b) => a + b.toUpperCase()).trim();
  return {text: textOut, tokens, notes};
}
function deClause(cl, notes, end, state) {
  const items = [];
  const an = cl.map(w => { const a = analyzeCON(w.low); return {w, a: a ? a[0] : null}; });
  // Nominalphrasen gruppieren
  let i = 0, pendingAttr = [], cj = null, q = end === '?';
  const verbs = [];
  const nps = [];
  const seq = [];   // Reihenfolge der Elemente (np/adv/adj/...)
  let sentNeg = false;
  const get = k => an[k] ? an[k].a : null;
  while (i < an.length) {
    const a = get(i), raw = an[i].w.raw;
    if (!a) { seq.push({k:'np', np:{head:{pos:'u', raw}, adjs:[], attrs:[], pl:false}, c:null, i}); i++; continue; }
    if (a.pos === 'q') { q = true; i++; continue; }
    if (a.pos === 'v') { verbs.push(a); i++; continue; }
    if (a.pos === 'i') {
      const L = a.lex;
      if (L.t === 'conj' && i === 0) { cj = L; i++; continue; }
      if (L.o === 'neg') {
        const nx = get(i + 1);
        if (nx && (nx.pos === 'n' || nx.pos === 'p')) { pendingAttr.push({neg:true}); }
        else if (nx && nx.pos === 'a' && !nx.case) { seq.push({k:'negadj'}); }
        else if (nx && nx.pos === 'a') { seq.push({k:'negadj'}); }
        else sentNeg = true;
        i++; continue;
      }
      if (L.o === 'comp' || L.o === 'sup') { pendingAttr.push({deg: L.o === 'comp' ? 'comp' : 'sup'}); i++; continue; }
      if (L.t === 'det' || L.t === 'num') { pendingAttr.push({mod:L}); i++; continue; }
      if (L.t === 'post') { seq.push({k:'post', lex:L}); i++; continue; }
      seq.push({k:'inv', lex:L, i}); i++; continue;
    }
    if (a.pos === 'a') {
      // alleinstehendes Adjektiv (Prädikat)
      const deg = pendingAttr.find(p => p.deg); pendingAttr = pendingAttr.filter(p => !p.deg);
      const ng = seq.length && seq[seq.length - 1].k === 'negadj';
      if (ng) seq.pop();
      seq.push({k:'adj', a, deg: deg ? deg.deg : 'pos', neg: ng});
      i++; continue;
    }
    if (a.pos === 'n' || a.pos === 'p') {
      const np = {head: a.pos === 'p' ? {pos:'p', p:a.p, n:a.n} : {pos:'n', lex:a.lex}, adjs:[], attrs:[], pl: a.pos === 'p' ? a.n === 'pl' : a.pl, c:a.case, poss:null, neg:false, demo:null, num:null};
      pendingAttr.forEach(p => {
        if (p.neg) np.neg = true;
        else if (p.mod) { if (p.mod.t === 'num') np.num = {lex:p.mod}; else np.demo = {lex:p.mod}; }
        else if (p.attrNP) np.attrs.push(p.attrNP);
        else if (p.possP) np.poss = p.possP;
      });
      pendingAttr = pendingAttr.filter(p => p.deg);
      if (np.demo && np.demo.lex.o === 'pl') np.pl = np.pl || true;
      if (np.num) np.pl = np.num.lex.f[0] !== 'eins';
      i++;
      // Adjektive hinter dem Nomen, gleiche Endung
      let pendDeg = null;
      for (;;) {
        const n1 = get(i), n2 = get(i + 1);
        if (n1 && n1.pos === 'i' && (n1.lex.o === 'comp' || n1.lex.o === 'sup') && n2 && n2.pos === 'a' && n2.case === a.case && n2.pl === a.pl) { pendDeg = n1.lex.o; i++; continue; }
        if (n1 && n1.pos === 'a' && a.pos === 'n' && n1.case === a.case && n1.pl === a.pl) {
          const aft = get(i + 1);
          if (aft && aft.pos === 'v' && COP.has(aft.lex.inf)) { if (pendDeg) pendingAttr.push({deg: pendDeg}); break; }
          np.adjs.push({lex:n1.lex, deg: pendDeg === 'comp' ? 'comp' : pendDeg === 'sup' ? 'sup' : 'pos'}); pendDeg = null; i++; continue; }
        break;
      }
      // Genitiv: Besitzer (vor Nomen) oder Postposition
      if (np.c === 'gen') {
        const nx = get(i);
        if (nx && nx.pos === 'i' && nx.lex.t === 'post') { seq.push({k:'pp', np, post:nx.lex}); i++; continue; }
        const nx2 = get(i);
        if (nx2 && (nx2.pos === 'n' || (nx2.pos === 'a' && false))) {
          if (a.pos === 'p' && !(np.adjs.length)) pendingAttr.push({possP:{p:a.p, n:a.n}});
          else pendingAttr.push({attrNP: np});
          continue;
        }
        // adj-Folge zwischen Besitzer und Besitztum: Besitzer ohne Adjektive bevorzugt
      }
      seq.push({k:'np', np, c:np.c, i});
      continue;
    }
    i++;
  }
  // Koordination: NP und/oder NP im gleichen Fall zusammenfassen
  for (let k = 0; k + 2 < seq.length; k++) {
    const A = seq[k], C = seq[k + 1], B = seq[k + 2];
    if (A.k === 'np' && C.k === 'inv' && C.lex.t === 'conj' && ['und','oder'].includes(C.lex.f[0]) && B.k === 'np' && B.c === A.c && A.np.head.pos !== 'u') {
      (A.coord ||= []).push({word: C.lex.f[0], np: B.np});
      seq.splice(k + 1, 2); k--;
    }
  }
  // Subjekt, Verben
  let tense = 'pres', main = null, modal = null, imperative = false, cont = false;
  const modals = verbs.filter(v => v.lex.fl.includes('x'));
  const fin = modals.length && verbs.length > 1 ? modals[0] : verbs[0];
  if (fin) {
    tense = fin.tense; cont = !!fin.cont || verbs.some(v => v.cont);
    if (fin.tense === 'imp') imperative = true;
    if (modals.length && verbs.length > 1) { modal = fin.lex; main = verbs.find(v => v !== fin).lex; }
    else main = fin.lex;
  }
  const copular = main && COP.has(main.inf);
  const motion = main && main.fl.includes('m');
  const dativeVerb = main && (main.fl.includes('d') || main.fl.includes('t'));
  // Subjekt
  const nomNPs = seq.filter(s => s.k === 'np' && s.c === 'nom');
  let subj = nomNPs.length ? nomNPs[0].np : null;
  if (!subj) { const u = seq.find(s => s.k === 'np' && s.np.head.pos === 'u'); if (u) { subj = u.np; u.c = 'nom'; nomNPs.push(u); } }
  const first = seq[0];
  const hasComp = seq.some(s => (s.k === 'adj' && s.deg === 'comp') || (s.k === 'np' && s.np.adjs && s.np.adjs.some(a => a.deg === 'comp')));
  // Wörter erzeugen
  const join = (it, c) => {
    let w = deNP(it.np, c);
    (it.coord || []).forEach(x => { w = w.concat([x.word], deNP(x.np, c)); });
    return w;
  };
  const place = it => {
    if (it.k === 'pp') {
      const c = POST_CASE[it.post.f[0]] || 'dat';
      return [it.post.f[0], ...join(it, c)];
    }
    switch (it.c) {
      case 'nom': return join(it, 'nom');
      case 'akk': return join(it, 'akk');
      case 'dat': return dativeVerb ? join(it, 'dat') : ['zu', ...join(it, 'dat')];
      case 'loc': return ['in', ...join(it, 'dat')];
      case 'abl': return hasComp ? ['als', ...join(it, 'nom')] : ['aus', ...join(it, 'dat')];
      case 'ins': return ['mit', ...join(it, 'dat')];
      case 'gen': return ['von', ...join(it, 'dat')];
      default: return join(it, 'akk');
    }
  };
  const wordsOf = it => {
    if (it.k === 'np' || it.k === 'pp') return place(it);
    if (it.k === 'inv') return [it.lex.f[0]];
    if (it.k === 'adj') {
      const st = adjStems(it.a.lex);
      const deg = it.deg;
      const w = deg === 'sup' ? 'am ' + declAdj(st.sup, 'en', '') : deAdj({lex:it.a.lex}, deg, '');
      return (it.neg ? ['nicht'] : []).concat([w]);
    }
    return [];
  };
  // Verbformen
  const subjItem = subj ? seq.find(s => s.k === 'np' && s.np === subj) : null;
  const personOf = np => np.head.pos === 'p' ? pronIdx(np.head.p, np.head.n) : (np.pl ? 5 : 2);
  let subjPerson = 2;
  let carried = false;
  if (subj && subjItem) {
    subjPerson = personOf(subj);
    if (subjItem.coord && subjItem.coord.some(x => x.word === 'und')) {
      const ps = [subj, ...subjItem.coord.map(x => x.np)].map(personOf);
      subjPerson = ps.some(p => p === 0 || p === 3) ? 3 : ps.some(p => p === 1 || p === 4) ? 4 : 5;
    }
    state.prev = {person: subjPerson};
  } else if (!imperative && state.prev && main) { subjPerson = state.prev.person; carried = true; }
  const subjWords = subjItem ? join(subjItem, 'nom') : [];
  const restSeq = seq.filter(s => s !== subjItem);
  // Satzbau
  const parts = {pre:[], post:[]};
  let finite = '', infinite = '';
  if (main) {
    if (imperative) {
      const c = conj(main); finite = (c.imp && c.imp[0]) || main.inf;
    } else if (modal) {
      finite = conjDE(modal, subjPerson, tense === 'past' ? 'past' : 'pres');
      infinite = main.inf;
      if (tense === 'fut') { infinite = main.inf; }
    } else if (tense === 'fut') {
      finite = conjDE(IRREGLEX('werden'), subjPerson, 'pres'); infinite = main.inf;
    } else finite = conjDE(main, subjPerson, tense === 'past' ? 'past' : 'pres');
  }
  const negW = sentNeg ? ['nicht'] : [];
  const contW = cont ? ['gerade'] : [];
  const isSub = cj && cj.o === 'sub';
  let wordsOut = [];
  const restWords = restSeq.flatMap(wordsOf);
  // Vorfeld: Adverb am Satzanfang
  let front = [], restWords2 = restWords;
  if (!isSub && !imperative && !q && first && first.k === 'inv' && first.lex.t === 'adv' && restSeq[0] === first) {
    front = [first.lex.f[0]];
    restWords2 = restSeq.slice(1).flatMap(wordsOf);
  }
  if (!main) {
    // Satz ohne Verb
    wordsOut = [...(cj ? [cj.f[0]] : []), ...subjWords, ...restWords];
  } else if (isSub) {
    // Nebensatz: Verb am Ende
    const verbEnd = infinite ? [infinite, finite] : [finite];
    wordsOut = [cj.f[0], ...subjWords, ...contW, ...restWords, ...negW, ...verbEnd];
  } else if (imperative) {
    wordsOut = [finite, ...negW, ...contW, ...restWords];
  } else if (q) {
    const wh = restSeq.filter(s => s.k === 'inv' && s.lex.t === 'q');
    const whW = wh.flatMap(wordsOf);
    const restNoWh = restSeq.filter(s => !wh.includes(s)).flatMap(wordsOf);
    wordsOut = [...(cj ? [cj.f[0]] : []), ...whW, finite, ...subjWords, ...contW, ...restNoWh, ...negW, ...(infinite ? [infinite] : [])];
  } else {
    wordsOut = [...(cj ? [cj.f[0]] : []), ...front, ...(front.length ? [finite, ...subjWords] : [...subjWords, finite]), ...contW, ...restWords2, ...negW, ...(infinite ? [infinite] : [])];
  }
  return wordsOut.filter(Boolean).join(' ');
}
function IRREGLEX(inf) { return LEX.verbs.find(v => v.inf === inf); }

/* ================= Wörterbuch ================= */
function dictionary() {
  const rows = [];
  LEX.nouns.forEach(n => rows.push({c:n.c, de:n.s, pos:'Nomen', info:`${n.g === 'm' ? 'der' : n.g === 'f' ? 'die' : 'das'} ${n.s}, Mz. ${n.p}`, sort:n.s}));
  LEX.verbs.forEach(v => rows.push({c:v.c, de:v.inf, pos:'Verb', info:conj(v).pres.slice(0,3).join(', ') + ' · ' + conj(v).past[0] + ' · ' + conj(v).part, sort:v.inf}));
  LEX.adjs.forEach(a => rows.push({c:a.c, de:a.base, pos:'Adjektiv', info:(() => { const s = adjStems(a); return `${s.pos}, ${s.comp}, am ${s.sup}en`; })(), sort:a.base}));
  const tn = {adv:'Adverb', conj:'Bindewort', q:'Fragewort', part:'Partikel', int:'Ausruf', num:'Zahl', det:'Begleiter', post:'Nachwort'};
  LEX.inv.forEach(e => rows.push({c:e.c, de:e.f[0], pos:tn[e.t] || e.t, info:e.f.length > 1 ? e.f.join(', ') : '', sort:e.f[0]}));
  [[1,'sg'],[2,'sg'],[3,'sg'],[1,'pl'],[2,'pl'],[3,'pl']].forEach(([p, n]) => rows.push({c:inflN(PRON[pronIdx(p,n)].stem, n === 'pl', 'nom'), de:PRON[pronIdx(p,n)].nom + (p === 3 && n === 'sg' ? ' / sie / es' : ''), pos:'Pronomen', info:'', sort:PRON[pronIdx(p,n)].nom}));
  rows.push({c:QW, de:'(Fragezeichen-Partikel)', pos:'Partikel', info:'steht am Satzende', sort:'zzzz'});
  return rows.sort((a, b) => a.sort.localeCompare(b.sort, 'de'));
}
function paradigm(row) {
  // Formen für die Wörterbuchkarte
  const stem = row.c;
  if (row.pos === 'Nomen' || row.pos === 'Adjektiv') {
    return CASES.map(c => [CASE_NAME[c], stem + SUF[c], stem + 'ki' + SUF[c]]);
  }
  if (row.pos === 'Verb') return [['Gegenwart', stem], ['Vergangenheit', stem + 'ra'], ['Zukunft', stem + 'sha'], ['Gerade dabei', stem + 'vo'], ['Befehl', stem + 'de']];
  return null;
}

return {syllabify, isSathuri, translateDE, translateCON, dictionary, paradigm, SUF, CASE_NAME, CASES, LEX, conj, inflN, pronCon};
}
if (typeof module !== 'undefined') module.exports = {createEngine};
