"""Parche T-030 E2 v0.2.1: el mapa entra en el ancho de la pantalla (escala) y separación de la lista en celular.
Idempotente, con SHA esperado antes y después de cada archivo."""
import hashlib, pathlib, sys

INFORME = pathlib.Path('.github/parches/resultado-mapa-v021.md')
CAMBIOS = {
    'seguimiento/mapa.css': ('00705862cab40456baf02977d69adb68e9d71679', '78ed212c9b9e470db8422012a8193890da1535d2', [
        ('.mapa-main > * { max-width: 1480px; width: 100%; margin: 0 auto; }',
         '.mapa-main { grid-template-columns: minmax(0, 1fr); }\n.mapa-main > * { max-width: 1480px; width: 100%; min-width: 0; margin: 0 auto; }'),
        ('.mapa-lienzo svg { display: block; margin: 0 auto; font-family: var(--c-font-family-body); }',
         '.mapa-lienzo svg { display: block; margin: 0 auto; font-family: var(--c-font-family-body); width: 100%; height: auto; min-width: 1100px; }'),
        ('  .mapa-lista { display: block; }', '  .mapa-lista { display: block; margin-top: var(--c-spacing-3); }'),
    ]),
    'seguimiento/mapa.html': ('83007b34d3a156a6fa528e8f9afdfd6a88875deb', '53a8da4e671bdee7da92ecf629a337a131a17362', [
        ('mapa.css?v=0.2"', 'mapa.css?v=0.2.1"'),
    ]),
    'pruebas/mapa/index.html': ('d41ac86253f4a779bbd10a8eb035aaf0d225be5d', '192915eb411e637f75041148afadde07b378772a', [
        ('mapa.css?v=0.2"', 'mapa.css?v=0.2.1"'),
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
        INFORME.write_text('# Parche mapa v0.2.1\n\n- Resultado: FALLO\n- ' + ruta + ': SHA inicial inesperado ' + sha(b) + '\n', encoding='utf-8')
        sys.exit(1)
    t = b.decode('utf-8')
    for a, c in reps:
        if t.count(a) != 1:
            INFORME.write_text('# Parche mapa v0.2.1\n\n- Resultado: FALLO\n- ' + ruta + ': texto no encontrado: ' + a + '\n', encoding='utf-8')
            sys.exit(1)
        t = t.replace(a, c)
    nb = t.encode('utf-8')
    if sha(nb) != despues:
        INFORME.write_text('# Parche mapa v0.2.1\n\n- Resultado: FALLO\n- ' + ruta + ': SHA final inesperado ' + sha(nb) + '\n', encoding='utf-8')
        sys.exit(1)
    nuevos[p] = nb
    lineas.append(ruta + ': ' + antes[:7] + ' -> ' + despues[:7])
for p, nb in nuevos.items():
    p.write_bytes(nb)
INFORME.write_text('# Parche mapa v0.2.1\n\n- Resultado: OK\n' + ''.join('- ' + l + '\n' for l in lineas), encoding='utf-8')
