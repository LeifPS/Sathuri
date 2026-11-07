# Sathuri

Die Sprache der Mysteriösen aus dem Sanktum Magus (aus Tonlinge): Übersetzer Deutsch ⇄ Sathuri, Wörterbuch, Grammatik und eigene Schrift.

## Aufbau

| Ordner | Inhalt |
| --- | --- |
| `public/index.html` | Die fertige Seite (wird von `tools/build.py` gebaut, nicht von Hand ändern) |
| `tools/` | Quellen: `template.html`, `engine.js` (Übersetzer), `glyphs.js` (Schrift), `gen.py` (erzeugt den Grundwortschatz `lex.json`), `build.py` |
| `src/` | Cloudflare Worker: `api.js` (Wort-API), `ai.js` (KI und Prüfung), `wordgen.js` (Wortgenerator) |
| `test/` | Tests (`npm test`) |

## Neue Wörter für alle

Fehlt ein Wort, bietet der Übersetzer „Wort anlegen“ an. Dann passiert Folgendes:

1. `POST /api/words` bekommt das deutsche Wort.
2. Die KI (Workers AI) liefert **nur deutsche Grammatikdaten** als JSON: Wortart, Grundform, Plural, Verbformen usw.
3. `src/ai.js` prüft alles streng und bringt es ins Lexikonformat. Trennbare und reflexive Verben werden abgelehnt.
4. `src/wordgen.js` erzeugt das **Sathuri-Wort nach festen Regeln** (nur (K)V-Silben, Endvokal nach Wortart, keine Kollision mit bestehenden Formen). Gleiches Stichwort ergibt immer dasselbe Wort.
5. Das Wort wird in D1 gespeichert und steht ab sofort **dauerhaft für alle** im Übersetzer und Wörterbuch (`GET /api/words`). Gespeicherte Wörter ändern sich nie.

Begrenzungen (in `wrangler.jsonc`): `DAILY_GLOBAL` Wörter pro Tag insgesamt, `DAILY_PER_IP` pro Person. So bleibt die Nutzung unter dem kostenlosen Tageskontingent von Workers AI.

## Entwickeln

```sh
npm install
python3 tools/gen.py     # Grundwortschatz neu erzeugen (nur wenn tools/gen.py geändert wurde)
python3 tools/build.py   # public/index.html bauen
npm test
npx wrangler deploy      # oder: Push auf main (Cloudflare baut automatisch)
```

Wichtig: `tools/gen.py` nicht ohne Not neu laufen lassen, wenn schon gemeinsame Wörter in der Datenbank sind, denn sie würden sonst mit neuen Grundwörtern kollidieren können.
