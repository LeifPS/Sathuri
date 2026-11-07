const {createEngine}=require('./engine.js');
const LEX=require('./lex.json');
const E=createEngine(LEX);
const tests=process.argv.slice(2).length?process.argv.slice(2):[
 'Ich sehe das Haus.',
 'Der Mann gibt der Frau das Buch.',
 'Die große Katze schläft in dem Haus.',
 'Wir können den Mond sehen.',
 'Siehst du die Sterne?',
 'Ich werde morgen in die Stadt gehen.',
 'Geh nach Hause!',
 'Das Haus des Zauberers ist dunkel.',
 'Ich habe das Geheimnis gesehen.',
 'Mein Freund liebt die Magie.',
 'Der Drache fliegt über dem Berg.',
 'Ich sehe das Haus nicht.',
 'Leif kommt aus dem Wald, weil er müde ist.',
 'Die alten Bücher sind heilig und mysteriös.',
];
for(const t of tests){
  const r=E.translateDE(t);
  console.log('DE :',t);
  console.log('SAT:',r.text);
  console.log('GLS:',r.tokens.map(x=>x.w+'='+x.g).join(' '));
  const b=E.translateCON(r.text);
  console.log('BAK:',b.text, b.notes.unknown.length?('  unk:'+b.notes.unknown):'');
  console.log('---');
}
