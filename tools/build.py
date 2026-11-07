import os, shutil
here = os.path.dirname(os.path.abspath(__file__))
rd = lambda n: open(os.path.join(here, n), encoding='utf-8').read()
t = rd('template.html')
t = t.replace('/*@LEX@*/', 'const LEX = ' + rd('lex.json') + ';').replace('/*@ENGINE@*/', rd('engine.js')).replace('/*@GLYPHS@*/', rd('glyphs.js'))
out = os.path.join(here, '..', 'public', 'index.html')
open(out, 'w', encoding='utf-8').write(t)
shutil.copy(os.path.join(here, 'lex.json'), os.path.join(here, '..', 'src', 'lex.json'))
print(len(t) // 1024, 'KB ->', os.path.normpath(out))
