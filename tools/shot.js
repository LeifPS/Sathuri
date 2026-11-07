const {chromium}=require('/opt/npm-tools/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
 const errs=[]; p.on('pageerror',e=>errs.push('PAGEERR '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE '+m.text())});
 await p.goto('file:///home/claude/sathuri/public/index.html');
 await p.waitForTimeout(600);
 await p.screenshot({path:'s1.png',fullPage:false});
 await p.screenshot({path:'s1full.png',fullPage:true});
 for(const t of ['woerterbuch','grammatik','schrift']){ await p.goto('file:///home/claude/sathuri/public/index.html#'+t); await p.waitForTimeout(300); await p.screenshot({path:'s_'+t+'.png',fullPage:true}); }
 console.log(errs.join('\n')||'keine Fehler');
 await b.close();
})();
