"""Parche T-030 E2b v0.3: el link #r=<recorrido>&n=<pieza> abre las dos cosas (antes solo leía #n= al principio).
Idempotente, con SHA esperado antes y después. Probado con DOM simulado (32 controles + 2 de link combinado)."""
import hashlib, pathlib, sys

INFORME = pathlib.Path('.github/parches/resultado-mapa-v03-hash.md')
CAMBIOS = {
    'seguimiento/mapa.js': ('b54d7b1f07d5480b021181993e99bb295a7c705f', '22eaac718be64fce84b79c89f111f0e698536762', [
        ('var r = /#r=([\\w-]+)/.exec(location.hash), m = /#n=([\\w-]+)/.exec(location.hash);',
         'var r = /[#&]r=([\\w-]+)/.exec(location.hash), m = /[#&]n=([\\w-]+)/.exec(location.hash);'),
    ]),
}


def sha(b):
    return hashlib.sha1(b'blob %d\x00' % len(b) + b).hexdigest()


lineas, nuevos = [], {}
for ruta, (antes, despues, reps) in CAMBIOS.items():
    p = pathlib.Path(ruta)
    b = p.read_bytes()
    if sha(b) == despues:
        lineas.append(ruta + ': ya aplicado')
        continue
    if sha(b) != antes:
        INFORME.write_text('# Parche mapa v0.3 hash\n\n- Resultado: FALLO\n- ' + ruta + ': SHA inicial inesperado ' + sha(b) + '\n', encoding='utf-8')
        sys.exit(1)
    t = b.decode('utf-8')
    for a, c in reps:
        if t.count(a) != 1:
            INFORME.write_text('# Parche mapa v0.3 hash\n\n- Resultado: FALLO\n- ' + ruta + ': texto no encontrado: ' + a + '\n', encoding='utf-8')
            sys.exit(1)
        t = t.replace(a, c)
    nb = t.encode('utf-8')
    if sha(nb) != despues:
        INFORME.write_text('# Parche mapa v0.3 hash\n\n- Resultado: FALLO\n- ' + ruta + ': SHA final inesperado ' + sha(nb) + '\n', encoding='utf-8')
        sys.exit(1)
    nuevos[p] = nb
    lineas.append(ruta + ': ' + antes[:7] + ' -> ' + despues[:7])
for p, nb in nuevos.items():
    p.write_bytes(nb)
INFORME.write_text('# Parche mapa v0.3 hash\n\n- Resultado: OK\n' + ''.join('- ' + l + '\n' for l in lineas), encoding='utf-8')
