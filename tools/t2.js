const {createEngine}=require('./engine.js');
const E=createEngine(require('./lex.json'));
const L=process.argv.slice(2);
for(const t of L){const r=E.translateCON(t);console.log('SAT:',t);console.log('DE :',r.text);console.log('GLS:',r.tokens.map(x=>x.w+'='+x.g).join(' '), r.notes.unknown.length?'UNK:'+r.notes.unknown:'');console.log('--');}
const d=E.dictionary(); console.log('dict',d.length, d.slice(0,3));
console.log(E.paradigm(d.find(x=>x.de==='Haus')));
