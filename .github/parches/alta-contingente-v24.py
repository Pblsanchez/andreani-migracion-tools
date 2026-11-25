"""Parche T-026 v2.4: «Cómo funciona» suma el script de preguntas nuevas (modelo limpio, mail, consulta de estado).
Idempotente: si index.html ya está en la versión esperada, no hace nada. Verifica SHA antes y después."""
import hashlib, pathlib, sys

RUTA = pathlib.Path('alta-contingente/index.html')
SHA_ANTES = '6c35f212c4eb12cc06428117c6195fae5122947d'
SHA_DESPUES = '108157137b7622fa55e554df4995bb5297c4acd0'
INFORME = pathlib.Path('.github/parches/resultado-alta-contingente-v24.md')


def sha(b):
    return hashlib.sha1(b'blob %d\x00' % len(b) + b).hexdigest()


def informe(ok, txt):
    INFORME.write_text('# Parche alta-contingente v2.4\n\n- Resultado: ' + ('OK' if ok else 'FALLO') + '\n- ' + txt + '\n', encoding='utf-8')


b = RUTA.read_bytes()
actual = sha(b)
if actual == SHA_DESPUES:
    informe(True, 'ya aplicado (SHA ' + actual + ')')
    sys.exit(0)
if actual != SHA_ANTES:
    informe(False, 'SHA inicial inesperado: ' + actual)
    sys.exit(1)

t = b.decode('utf-8')
REPS = [
    ('<p>Por Teams, en un mensaje, con el modelo de siempre.</p>',
     '<p>Por Teams, en un mensaje, con el modelo de alta. Si no lo tenés, pedilo en el chat.</p>'),
    ('<span>Versión 2.3 · <time', '<span>Versión 2.4 · <time'),
    ('</body>', '<script src="alta-faq.js?v=2.4"></script>\n</body>'),
]
for a, c in REPS:
    if t.count(a) != 1:
        informe(False, 'texto no encontrado una sola vez: ' + a)
        sys.exit(1)
    t = t.replace(a, c)

nb = t.encode('utf-8')
if sha(nb) != SHA_DESPUES:
    informe(False, 'SHA final inesperado: ' + sha(nb))
    sys.exit(1)
if not pathlib.Path('alta-contingente/alta-faq.js').exists():
    informe(False, 'falta alta-contingente/alta-faq.js')
    sys.exit(1)
RUTA.write_bytes(nb)
informe(True, 'aplicado: ' + SHA_ANTES[:7] + ' -> ' + SHA_DESPUES[:7] + ' (' + str(len(nb)) + ' bytes)')
