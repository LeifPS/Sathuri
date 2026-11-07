const {glyphParts,GLYPH_LIST,GLYPH_CONS}=require('./glyphs.js');
const cols=5, cw=84, ch=140, rows=Math.ceil(GLYPH_LIST.length/cols);
const W=cols*cw*2+40, cellsPerRow=10;
let out=`<svg xmlns="http://www.w3.org/2000/svg" width="${cellsPerRow*cw}" height="${Math.ceil(70/cellsPerRow)*(ch+20)}"><rect width="100%" height="100%" fill="#14122b"/>`;
GLYPH_LIST.forEach((s,i)=>{const x=(i%cellsPerRow)*cw+6, y=Math.floor(i/cellsPerRow)*(ch+20)+4;
 out+=`<g transform="translate(${x},${y})" fill="none" color="#f0b45a" stroke="#f0b45a" stroke-linecap="round" stroke-linejoin="round">${glyphParts(s)}</g><text x="${x+36}" y="${y+ch+6}" fill="#9a97c0" font-size="12" text-anchor="middle" font-family="sans-serif">${s}</text>`;});
// Beispielwort verbunden: sathuri
out+=`<g transform="translate(20,${Math.ceil(70/cellsPerRow)*(ch+20)-150})"></g>`;
out+='</svg>';
require('fs').writeFileSync('sheet.svg',out);
// Wortprobe
let w=`<svg xmlns="http://www.w3.org/2000/svg" width="700" height="150"><rect width="100%" height="100%" fill="#14122b"/>`;
const words=['sa','thu','ri','  ','ma','shi','ra','ke','  ','to','ne','la'];
let x=10; words.forEach(s=>{ if(s.trim()===''){x+=36;return;} w+=`<g transform="translate(${x},10)" fill="none" color="#f0b45a" stroke="#f0b45a" stroke-linecap="round" stroke-linejoin="round">${glyphParts(s)}</g>`; x+=72;});
w+='</svg>'; require('fs').writeFileSync('word.svg',w);
