#!/usr/bin/env python3
"""Erzeugt den Wortschatz der Sprache Sathuri und schreibt lex.json.

Silbenstruktur: nur (K)V. Konsonanten: k t s l r m n v z d h th sh. Vokale: a e i o u.
Wortklassen erkennt man am letzten Vokal: Nomen -a/-o, Verb -u, Adjektiv -i, Rest -e.
"""
import json, random, re, sys

ONSETS = ['k','t','s','l','r','m','n','v','z','d','h','th','sh']
OW = {'k':2,'t':2,'s':2,'l':3,'r':3,'m':2,'n':3,'v':2,'z':2,'d':2,'h':1,'th':3,'sh':2}
VOW = list('aeiou')
VW = {'a':3,'e':2,'i':3,'o':2,'u':2}
SYL_RE = re.compile(r'(?:th|sh|[ktslrmnvzdh])?[aeiou]')
WORD_RE = re.compile(r'^(?:(?:th|sh|[ktslrmnvzdh])?[aeiou])+$')

NOUN_SUF = ['ki','no','la','mi','su','tha','ze']          # Plural + 6 Faelle
VERB_SUF = ['ra','sha','vo','de']
GRAMMAR_WORDS = ['zo','ve','mo','ro']                      # nicht, Frage, mehr, am meisten

NOUNS = """
Magie|Magien|f
Zauber|Zauber|m
Zauberer|Zauberer|m
Zauberstab|Zauberstäbe|m
Geheimnis|Geheimnisse|n
Rätsel|Rätsel|n
Sanktum|Sankta|n
Heiligtum|Heiligtümer|n
Tempel|Tempel|m
Turm|Türme|m
Buch|Bücher|n
Schriftrolle|Schriftrollen|f
Kristall|Kristalle|m
Amulett|Amulette|n
Ring|Ringe|m
Schlüssel|Schlüssel|m
Tür|Türen|f
Tor|Tore|n
Siegel|Siegel|n
Rune|Runen|f
Zeichen|Zeichen|n
Schatten|Schatten|m
Licht|Lichter|n
Finsternis|Finsternisse|f
Nebel|Nebel|m
Traum|Träume|m
Geist|Geister|m
Seele|Seelen|f
Schicksal|Schicksale|n
Weisheit|Weisheiten|f
Wahrheit|Wahrheiten|f
Lüge|Lügen|f
Macht|Mächte|f
Kraft|Kräfte|f
Flamme|Flammen|f
Orakel|Orakel|n
Prophezeiung|Prophezeiungen|f
Fluch|Flüche|m
Segen|Segen|m
Wunder|Wunder|n
Hexe|Hexen|f
Drache|Drachen|m|w
Wächter|Wächter|m
Meister|Meister|m
Schüler|Schüler|m
Lehrer|Lehrer|m
Gast|Gäste|m
Freund|Freunde|m
Feind|Feinde|m
König|Könige|m
Königin|Königinnen|f
Mann|Männer|m
Frau|Frauen|f
Kind|Kinder|n
Mädchen|Mädchen|n
Junge|Jungen|m|w
Held|Helden|m|w
Mensch|Menschen|m|w
Gott|Götter|m
Göttin|Göttinnen|f
Wesen|Wesen|n
Gespenst|Gespenster|n
Tier|Tiere|n
Hund|Hunde|m
Katze|Katzen|f
Vogel|Vögel|m
Fisch|Fische|m
Pferd|Pferde|n
Wolf|Wölfe|m
Fuchs|Füchse|m
Bär|Bären|m|w
Schlange|Schlangen|f
Eule|Eulen|f
Rabe|Raben|m|w
Tonling|Tonlinge|m
Kopf|Köpfe|m
Auge|Augen|n
Ohr|Ohren|n
Mund|Münder|m
Hand|Hände|f
Herz|Herzen|n|g=Herzens
Fuß|Füße|m
Arm|Arme|m
Gesicht|Gesichter|n
Stimme|Stimmen|f
Name|Namen|m|g=Namens
Blut|Blut|n
Himmel|Himmel|m
Sonne|Sonnen|f
Mond|Monde|m
Stern|Sterne|m
Nacht|Nächte|f
Tag|Tage|m
Zeit|Zeiten|f
Stunde|Stunden|f
Jahr|Jahre|n
Welt|Welten|f
Reich|Reiche|n
Land|Länder|n
Berg|Berge|m
Tal|Täler|n
Wald|Wälder|m
Baum|Bäume|m
Blume|Blumen|f
Blatt|Blätter|n
Stein|Steine|m
Fluss|Flüsse|m
See|Seen|m
Meer|Meere|n
Insel|Inseln|f
Höhle|Höhlen|f
Weg|Wege|m
Pfad|Pfade|m
Brücke|Brücken|f
Stadt|Städte|f
Dorf|Dörfer|n
Haus|Häuser|n
Zimmer|Zimmer|n
Garten|Gärten|m
Feld|Felder|n
Straße|Straßen|f
Feuer|Feuer|n
Wasser|Wasser|n
Erde|Erden|f
Luft|Lüfte|f
Wind|Winde|m
Eis|Eis|n
Blitz|Blitze|m
Donner|Donner|m
Regen|Regen|m
Schnee|Schnee|m
Wolke|Wolken|f
Brot|Brote|n
Apfel|Äpfel|m
Milch|Milch|f
Essen|Essen|n
Tee|Tees|m
Salz|Salze|n
Gold|Gold|n
Silber|Silber|n
Eisen|Eisen|n
Schwert|Schwerter|n
Schild|Schilde|m
Pfeil|Pfeile|m
Bogen|Bögen|m
Waffe|Waffen|f
Feder|Federn|f
Papier|Papiere|n
Tinte|Tinten|f
Kerze|Kerzen|f
Lampe|Lampen|f
Spiegel|Spiegel|m
Glas|Gläser|n
Lied|Lieder|n
Musik|Musik|f
Klang|Klänge|m
Ton|Töne|m
Flöte|Flöten|f
Trommel|Trommeln|f
Harfe|Harfen|f
Glocke|Glocken|f
Spiel|Spiele|n
Geschenk|Geschenke|n
Geld|Gelder|n
Schatz|Schätze|m
Karte|Karten|f
Brief|Briefe|m
Wort|Wörter|n
Sprache|Sprachen|f
Nachricht|Nachrichten|f
Frage|Fragen|f
Antwort|Antworten|f
Idee|Ideen|f
Gedanke|Gedanken|m|w|g=Gedankens
Erinnerung|Erinnerungen|f
Hoffnung|Hoffnungen|f
Angst|Ängste|f
Liebe|Lieben|f
Freude|Freuden|f
Trauer|Trauer|f
Mut|Mut|m
Frieden|Frieden|m
Krieg|Kriege|m
Leben|Leben|n
Tod|Tode|m
Glück|Glück|n
Hilfe|Hilfen|f
Gefahr|Gefahren|f
Reise|Reisen|f
Ziel|Ziele|n
Anfang|Anfänge|m
Ende|Enden|n
Ort|Orte|m
Ding|Dinge|n
Teil|Teile|m
Mitte|Mitten|f
Grenze|Grenzen|f
Abend|Abende|m
Frühling|Frühlinge|m
Sommer|Sommer|m
Herbst|Herbste|m
Winter|Winter|m
Farbe|Farben|f
Hut|Hüte|m
Hobby|Hobbys|n
"""

# inf;du;er;praet;part;flags   (m = Bewegung, d = nur Dativ, t = Dativ+Akkusativ, x = Modalverb)
VERBS = """
sein;;;;;
haben;;;;;
werden;;;;;
können;;;;;x
müssen;;;;;x
wollen;;;;;x
dürfen;;;;;x
sollen;;;;;x
mögen;;;;;x
wissen;;;;;
gehen;;;ging;gegangen;m
kommen;;;kam;gekommen;m
sehen;siehst;sieht;sah;gesehen;
hören;;;hörte;gehört;
sprechen;sprichst;spricht;sprach;gesprochen;
sagen;;;sagte;gesagt;
fragen;;;fragte;gefragt;
antworten;;;antwortete;geantwortet;d
kennen;;;kannte;gekannt;
denken;;;dachte;gedacht;
glauben;;;glaubte;geglaubt;
finden;;;fand;gefunden;
suchen;;;suchte;gesucht;
geben;gibst;gibt;gab;gegeben;t
nehmen;nimmst;nimmt;nahm;genommen;
machen;;;machte;gemacht;
tun;;;tat;getan;
bringen;;;brachte;gebracht;mt
halten;hältst;hält;hielt;gehalten;
stehen;;;stand;gestanden;
sitzen;;;saß;gesessen;
liegen;;;lag;gelegen;
laufen;läufst;läuft;lief;gelaufen;m
fliegen;;;flog;geflogen;m
schwimmen;;;schwamm;geschwommen;m
fahren;fährst;fährt;fuhr;gefahren;m
leben;;;lebte;gelebt;
wohnen;;;wohnte;gewohnt;
sterben;stirbst;stirbt;starb;gestorben;
lieben;;;liebte;geliebt;
hassen;;;hasste;gehasst;
helfen;hilfst;hilft;half;geholfen;d
rufen;;;rief;gerufen;
singen;;;sang;gesungen;
spielen;;;spielte;gespielt;
tanzen;;;tanzte;getanzt;
lachen;;;lachte;gelacht;
weinen;;;weinte;geweint;
schlafen;schläfst;schläft;schlief;geschlafen;
träumen;;;träumte;geträumt;
essen;isst;isst;aß;gegessen;
trinken;;;trank;getrunken;
öffnen;;;öffnete;geöffnet;
schließen;;;schloss;geschlossen;
bauen;;;baute;gebaut;
zerstören;;;zerstörte;zerstört;
beschützen;;;beschützte;beschützt;
kämpfen;;;kämpfte;gekämpft;
verlieren;;;verlor;verloren;
gewinnen;;;gewann;gewonnen;
lernen;;;lernte;gelernt;
lehren;;;lehrte;gelehrt;
lesen;liest;liest;las;gelesen;
schreiben;;;schrieb;geschrieben;
zeichnen;;;zeichnete;gezeichnet;
warten;;;wartete;gewartet;
bleiben;;;blieb;geblieben;
fallen;fällst;fällt;fiel;gefallen;
steigen;;;stieg;gestiegen;m
vergessen;vergisst;vergisst;vergaß;vergessen;
verstehen;;;verstand;verstanden;
zeigen;;;zeigte;gezeigt;t
verbergen;verbirgst;verbirgt;verbarg;verborgen;
leuchten;;;leuchtete;geleuchtet;
brennen;;;brannte;gebrannt;
fließen;;;floss;geflossen;
wachsen;wächst;wächst;wuchs;gewachsen;
scheinen;;;schien;geschienen;
heißen;;;hieß;geheißen;
brauchen;;;brauchte;gebraucht;
bitten;;;bat;gebeten;
danken;;;dankte;gedankt;d
fürchten;;;fürchtete;gefürchtet;
hoffen;;;hoffte;gehofft;
wählen;;;wählte;gewählt;
zaubern;;;zauberte;gezaubert;
folgen;;;folgte;gefolgt;dm
führen;;;führte;geführt;
tragen;trägst;trägt;trug;getragen;
werfen;wirfst;wirft;warf;geworfen;
fangen;fängst;fängt;fing;gefangen;
retten;;;rettete;gerettet;
heilen;;;heilte;geheilt;
beginnen;;;begann;begonnen;
enden;;;endete;geendet;
treffen;triffst;trifft;traf;getroffen;
schicken;;;schickte;geschickt;t
kaufen;;;kaufte;gekauft;
verkaufen;;;verkaufte;verkauft;
reisen;;;reiste;gereist;m
wandern;;;wanderte;gewandert;m
"""

# base[:Komparativ[:Superlativ[:Deklinationsstamm]]]
ADJS = """
groß:größer:größt
klein
alt:älter:ältest
jung:jünger:jüngst
neu
gut:besser:best
schlecht
schön
hässlich
stark:stärker:stärkst
schwach:schwächer:schwächst
schnell
langsam
hell
dunkel:dunkler:dunkelst
heiß
kalt:kälter:kältest
warm:wärmer:wärmst
kühl
laut
leise
lang:länger:längst
kurz:kürzer:kürzest
hoch:höher:höchst:hoh
tief
weit
nah:näher:nächst
fern
voll
leer
reich
arm:ärmer:ärmst
glücklich
traurig
mutig
ängstlich
weise
dumm:dümmer:dümmst
klug:klüger:klügst
still
wild
sanft
hart:härter:härtest
weich
scharf:schärfer:schärfst
offen
verborgen
heilig
mysteriös
magisch
ewig
fremd
bekannt
wahr
falsch
frei
tot
lebendig
müde
wach
rot
blau
grün
gelb
weiß
schwarz
golden
süß
bitter
erst
letzt
ganz
richtig
einfach
schwer
leicht
nass
trocken
rund
sicher
gefährlich
wichtig
verloren
gleich
ander
"""

# Typ|Formen|[con]|[Optionen]
# Typen: adv conj q part num det post int
INV = """
adv|hier
adv|dort,da
adv|jetzt,nun
adv|heute
adv|morgen
adv|gestern
adv|immer
adv|nie,niemals
adv|oft
adv|manchmal
adv|sehr
adv|nur
adv|auch
adv|noch
adv|schon
adv|vielleicht
adv|zusammen
adv|allein
adv|wieder
adv|bald
adv|gern,gerne
adv|fast
adv|oben
adv|unten
adv|drinnen
adv|draußen
adv|links
adv|rechts
adv|überall
adv|nirgends
adv|dann
adv|später
adv|früher
adv|so
adv|genau
adv|zuerst
adv|zuletzt
adv|viel
adv|wenig
adv|plötzlich
adv|leider
adv|wirklich
adv|hoffentlich
adv|vorwärts
adv|zurück
conj|und|ke
conj|oder|se
conj|aber,doch|the
conj|weil|-|sub
conj|dass|ru|sub
conj|wenn|-|sub
conj|ob|-|sub
conj|denn|-|sub
q|wer
q|was
q|wo
q|wohin
q|woher
q|wann
q|warum,wieso,weshalb
q|wie
part|nicht|zo|neg
part|mehr|mo|comp
part|meist,meisten|ro|sup
part|ja|ha
part|nein|ne
int|hallo
int|tschüss
int|willkommen
int|bitte
int|danke
int|entschuldigung
num|null
num|eins
num|zwei
num|drei
num|vier
num|fünf
num|sechs
num|sieben
num|acht
num|neun
num|zehn
num|zwölf
num|zwanzig
num|hundert
num|tausend
det|dieser,diese,dieses,diesen,diesem,dieser
det|jener,jene,jenes,jenen,jenem
det|alle,allen,aller,alles|-|pl
det|viele,vielen,vieler|-|pl
det|einige,einigen,einiger|-|pl
det|wenige,wenigen,weniger|-|pl
det|manche,manchen,mancher|-|pl
det|jeder,jede,jedes,jeden,jedem|-|sg
det|welcher,welche,welches,welchen,welchem
post|über
post|unter
post|vor
post|hinter
post|neben
post|zwischen
post|ohne
post|gegen
post|um
post|wegen
post|während
post|bis
post|für
"""

OVERRIDES = {
    # Nomen
    ('n','Magie'):'mashora', ('n','Zauber'):'zavuro', ('n','Geheimnis'):'mithara',
    ('n','Sanktum'):'sathuma', ('n','Tonling'):'tonela', ('n','Licht'):'shira',
    ('n','Schatten'):'dunara', ('n','Traum'):'morela', ('n','Seele'):'elara',
    ('n','Stern'):'ethara', ('n','Mond'):'velitho', ('n','Nacht'):'nuvo',
    ('n','Weisheit'):'thalima', ('n','Wahrheit'):'vehira', ('n','Rune'):'ruzana',
    ('n','Orakel'):'orasho', ('n','Drache'):'dashuro', ('n','Schicksal'):'nethira',
    ('n','Geist'):'aruna', ('n','Klang'):'tonaro', ('n','Ton'):'tona',
    ('n','Zauberer'):'zavurosha', ('n','Zeichen'):'ruzano',
    ('n','Hut'):'huvo', ('n','Hobby'):'tanisa',
    # Verben
    ('v','sein'):'esu', ('v','zaubern'):'zavuru', ('v','träumen'):'morelu',
    ('v','leuchten'):'shiru', ('v','gehen'):'kelu', ('v','sehen'):'vesu',
    # Adjektive
    ('a','mysteriös'):'mithari', ('a','magisch'):'mashori', ('a','heilig'):'sathuri',
    ('a','dunkel'):'dunari', ('a','hell'):'shiri',
}
RELATED = {'mithara','mithari','mashora','mashori','sathuma','sathuri','dunara','dunari','shira','shiri',
           'zavuro','zavuru','morela','morelu','shira','shiru','ruzana','ruzano','tona','tonaro','zavurosha','tonela'}

CLASS_VOWELS = {'n':'ao','v':'u','a':'i','i':'e'}

def die(msg):
    print('FEHLER:', msg); sys.exit(1)

def syllables(w):
    return SYL_RE.findall(w)

def forms_of(pos, w):
    if pos in ('n','a'):
        return [w+p+c for p in ('','ki') for c in ['']+NOUN_SUF[1:]]
    if pos == 'v':
        return [w, w+'vo', w+'ra', w+'sha', w+'vora', w+'vosha', w+'de']
    return [w]

def wchoice(rng, items, weights):
    return rng.choices(items, [weights[i] for i in items])[0]

def gen_word(rng, nsyl, pos, allow_vowel_start=True):
    cv = CLASS_VOWELS[pos]
    sy = []
    prev_on = None
    for i in range(nsyl):
        last = (i == nsyl-1)
        if i == 0 and allow_vowel_start and nsyl >= 2 and rng.random() < 0.05:
            on = ''
        else:
            while True:
                on = wchoice(rng, ONSETS, OW)
                if on != prev_on: break
        v = rng.choice(list(cv)) if last else wchoice(rng, VOW, VW)
        sy.append(on+v)
        prev_on = on
    if len(set(sy)) < len(sy): return None
    return ''.join(sy)

def main():
    rng = random.Random(20261107)
    lex = {'nouns':[], 'verbs':[], 'adjs':[], 'inv':[]}
    used_forms = {}
    used_roots = set()

    # reservierte Woerter
    reserved = set(NOUN_SUF+VERB_SUF+GRAMMAR_WORDS+['ona','elo','ira','onaki','eloki','iraki'])
    for r in ['ona','elo','ira']:
        for f in forms_of('n', r): used_forms[f] = 'pron'
    for s in reserved: used_forms.setdefault(s, 'gramm')
    for r in ('on','el','ir'): used_roots.add(r)

    def accept(pos, w, name, manual):
        if not WORD_RE.match(w): die(f'{name}: {w} verletzt die Silbenregel')
        if w[-1] not in CLASS_VOWELS[pos if pos in CLASS_VOWELS else 'i']:
            if pos in CLASS_VOWELS: die(f'{name}: {w} hat falschen Endvokal')
        fs = forms_of(pos, w)
        for f in fs:
            if f in used_forms: return False
        root = w[:-1]
        if not manual or w not in RELATED:
            if root in used_roots: return False
        for f in fs: used_forms[f] = name
        used_roots.add(root)
        return True

    pre = {}
    for (opos, okey), ow in OVERRIDES.items():
        if not accept(opos, ow, okey, True): die(f'Override-Kollision: {okey} {ow}')
        pre[(opos, okey)] = ow

    def make(pos, name, key, nsyl_choices):
        if (pos, key) in pre: return pre[(pos, key)]
        for _ in range(5000):
            n = rng.choice(nsyl_choices)
            w = gen_word(rng, n, pos)
            if w and accept(pos, w, name, False): return w
        die('kein Wort gefunden für '+name)

    # Funktionswörter zuerst (kurz), dann Rest
    # --- Invarianten ---
    for line in INV.strip().splitlines():
        parts = line.split('|')
        t, forms = parts[0], parts[1].split(',')
        con = parts[2] if len(parts) > 2 and parts[2] != '-' else None
        opt = parts[3] if len(parts) > 3 else ''
        if con:
            if not WORD_RE.match(con): die('inv con '+con)
            if con in used_forms and used_forms[con] not in ('gramm',): die('inv kollision '+con)
            used_forms[con] = forms[0]; used_roots.add(con[:-1])
        else:
            if t == 'num': ns = [2,2,3]
            elif t == 'post': ns = [2,2]
            elif t in ('conj','q','part','int'): ns = [2,2,3]
            else: ns = [2,2,3]
            con = make('i', forms[0], forms[0], ns)
        lex['inv'].append({'c':con,'t':t,'f':forms,'o':opt})

    for line in NOUNS.strip().splitlines():
        p = line.split('|')
        sg, pl, g = p[0], p[1], p[2]
        opts = p[3:]
        weak = 'w' in opts
        gen = ''
        for o in opts:
            if o.startswith('g='): gen = o[2:]
        con = make('n', sg, sg, [2,2,2,3,3])
        e = {'c':con,'s':sg,'p':pl,'g':g}
        if weak: e['w'] = 1
        if gen: e['gen'] = gen
        lex['nouns'].append(e)

    for line in VERBS.strip().splitlines():
        p = line.split(';')
        inf = p[0]
        con = make('v', inf, inf, [2,2,2,3])
        e = {'c':con,'inf':inf,'du':p[1],'er':p[2],'pret':p[3],'part':p[4],'fl':p[5]}
        lex['verbs'].append(e)

    for line in ADJS.strip().splitlines():
        p = line.split(':')
        base = p[0]
        con = make('a', base, base, [2,2,3])
        e = {'c':con,'base':base,'comp':p[1] if len(p)>1 else '','sup':p[2] if len(p)>2 else '','dst':p[3] if len(p)>3 else ''}
        lex['adjs'].append(e)

    lex['stats'] = {k: len(v) for k,v in lex.items() if isinstance(v, list)}
    total = sum(lex['stats'].values()) + 3
    lex['stats']['total'] = total
    import os
    here = os.path.dirname(os.path.abspath(__file__))
    for target in (os.path.join(here, 'lex.json'), os.path.join(here, '..', 'src', 'lex.json')):
        with open(target,'w',encoding='utf-8') as f:
            json.dump(lex, f, ensure_ascii=False, separators=(',',':'))
    print('OK', lex['stats'])
    # Silben-Statistik
    syl = set()
    for k in ('nouns','verbs','adjs','inv'):
        for e in lex[k]:
            for s in syllables(e['c']): syl.add(s)
    print('benutzte Silben:', len(syl), 'von 70')

if __name__ == '__main__':
    main()
