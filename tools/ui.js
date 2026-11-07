const {chromium}=require('/opt/npm-tools/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 const p=await b.newPage({viewport:{width:390,height:844}});
 const errs=[]; p.on('pageerror',e=>errs.push('PAGEERR '+e.message));
 await p.goto('file:///home/claude/sathuri/public/index.html#grammatik');
 await p.waitForTimeout(300);
 const ex=await p.$$eval('#p-grammatik .ex',els=>els.map(e=>[...e.children].map(c=>c.textContent).join('\n   ')));
 console.log(ex.join('\n'));
 // Übersetzer: Swap
 await p.goto('file:///home/claude/sathuri/public/index.html#uebersetzer');
 await p.click('#swap'); await p.waitForTimeout(300);
 console.log('SWAP IN :',await p.inputValue('#in'));
 console.log('SWAP OUT:',await p.$eval('#t1',e=>e.textContent));
 // Tastatur
 await p.fill('#in',''); await p.click('#kbd summary'); await p.click('button[data-syl="ona"]').catch(()=>{});
 await p.click('button[data-syl="o"]'); await p.click('button[data-syl="na"]'); await p.click('button[data-act="space"]');
 await p.click('button[data-syl="ve"]'); await p.click('button[data-syl="su"]');
 await p.waitForTimeout(300);
 console.log('KBD IN :',await p.inputValue('#in'),'→',await p.$eval('#t1',e=>e.textContent));
 // Wörterbuch
 await p.goto('file:///home/claude/sathuri/public/index.html#woerterbuch');
 await p.fill('#q','zauber'); await p.waitForTimeout(200);
 console.log('DICT:',await p.$eval('#count',e=>e.textContent),'|',await p.$$eval('#dict summary',s=>s.map(x=>x.textContent).join(' ; ')));
 await p.click('#dict summary'); await p.waitForTimeout(200);
 console.log('BODY:',(await p.$eval('#dict details[open] .body',e=>e.innerText)).replace(/\n/g,' | ').slice(0,260));
 console.log(errs.join('\n')||'keine JS-Fehler');
 await b.close();
})();
