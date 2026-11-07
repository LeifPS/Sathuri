// Manueller End-to-End-Test (nicht Teil von npm test): echte Seite + echte API-Logik, aber Test-Datenbank und Test-KI.
// Aufruf: node test/e2e.mjs   (braucht Playwright und Chrome, siehe PLAYWRIGHT/CHROME unten)
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { handle } from '../src/api.js';
import { BASE, makeEnv, AI_BASE } from './helpers.js';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');
const page_html = readFileSync(new URL('../public/index.html', import.meta.url));
const env = makeEnv({
  Fahrrad: { ...AI_BASE, pos: 'n', lemma: 'Fahrrad', plural: 'Fahrräder', gender: 'n' },
  Xyqzt: { ...AI_BASE, ok: false, reason: 'Das ist kein deutsches Wort.' },
});
env.ASSETS = { fetch: async () => new Response(page_html, { headers: { 'content-type': 'text/html; charset=utf-8' } }) };

const server = http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const r = await handle(new Request('http://localhost:8799' + req.url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body }), env, BASE);
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer()));
}).listen(8799);

const fails = [];
const check = (ok, msg) => { console.log((ok ? 'OK    ' : 'FEHLER ') + msg); if (!ok) fails.push(msg); };
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/status of 422/.test(m.text())) errs.push(m.text()); });   // 422 = erwartete Ablehnung
try {
  await p.goto('http://localhost:8799/#uebersetzer');
  await p.fill('#in', 'Ich habe ein Fahrrad.');
  await p.waitForSelector('button[data-new="Fahrrad"]');
  check(true, 'unbekanntes Wort „Fahrrad“ bietet einen Anlege-Knopf an');
  await p.screenshot({ path: '/tmp/e2e0.png', fullPage: true });
  await p.fill('#in', 'Xyqzt');
  await p.waitForSelector('button[data-new="Xyqzt"]');
  await p.click('button[data-new="Xyqzt"]');
  await p.waitForFunction(() => /kein deutsches Wort/.test(document.querySelector('.wordmsg')?.textContent || ''));
  check(true, 'Ablehnung der KI wird als Meldung angezeigt');
  await p.fill('#in', 'Ich habe ein Fahrrad.');
  await p.click('button[data-new="Fahrrad"]');
  await p.waitForFunction(() => /Neues Wort für alle gespeichert/.test(document.querySelector('.wordmsg')?.textContent || ''), null, { timeout: 10000 });
  const out = (await p.textContent('#t1')).trim();
  const con = out.match(/ona (\w+)no ramu\./);
  check(!!con, 'Satz wird mit neuem Wort übersetzt: ' + out);
  check(!(await p.$('button[data-new="Fahrrad"]')), 'Anlege-Knopf verschwindet danach');
  await p.fill('#in', 'Die Fahrräder sind alt.');
  await p.waitForTimeout(400);
  check(/ki/.test(await p.textContent('#t1')), 'Mehrzahl funktioniert: ' + (await p.textContent('#t1')).trim());
  await p.goto('http://localhost:8799/#woerterbuch');
  await p.fill('#q', 'Fahrrad');
  await p.waitForTimeout(300);
  check((await p.textContent('#dict')).includes(con[1]), 'Wörterbuch zeigt das neue Wort');
  await p.reload();     // neuer Seitenaufruf: Wort kommt aus der Datenbank
  await p.goto('http://localhost:8799/#uebersetzer');
  await p.fill('#in', 'Ich habe ein Fahrrad.');
  await p.waitForFunction(() => /no ramu/.test(document.querySelector('#t1')?.textContent || '') && !document.querySelector('button[data-new]'), null, { timeout: 10000 });
  check(true, 'nach Neuladen ist das Wort für alle da (aus der Datenbank geladen)');
  await p.screenshot({ path: '/tmp/e2e.png' });
  check(errs.length === 0, 'keine JavaScript-Fehler' + (errs.length ? ': ' + errs.join(' | ') : ''));
} catch (e) { fails.push('Ausnahme: ' + e.message); console.log('FEHLER Ausnahme:', e.message); }
await b.close(); server.close();
process.exit(fails.length ? 1 : 0);
