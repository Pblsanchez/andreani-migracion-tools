# andreani-migracion-tools

Portal de soluciones del equipo de migración **Integra (B2C) → DMS (B2B+B2C)** de Andreani, publicado con GitHub Pages.

🌐 **Sitio:** https://pblsanchez.github.io/andreani-migracion-tools/

## Herramientas

| Herramienta | Link | Datos |
|---|---|---|
| Matriz de Envíos · universo B2C a migrar | https://pblsanchez.github.io/andreani-migracion-tools/matriz-envios/ | Rama `datos` → `matriz-envios/datos/` |

## Estructura

```
andreani-migracion-tools/
├── index.html          ← portada con el catálogo de herramientas
├── .nojekyll           ← publica los archivos tal cual (sin Jekyll)
├── matriz-envios/      ← dashboard de la Matriz de Envíos (código)
├── pruebas/            ← pruebas visuales con datos sintéticos
└── <herramienta>/
    └── index.html
```

Rama **`datos`** (no se publica en Pages): `matriz-envios/datos/base.json` (matriz de envíos) y `matriz-envios/datos/migracion.json` (avance de la migración a DMS). El dashboard la lee al abrirse y la escribe con «Enviar a GitHub».

## Reglas

- **Datos reales.** Por regla general no se suben al repo (es público) y las herramientas procesan los archivos en el navegador. **Excepción aprobada por Pablo Sánchez (29/10/2026):** la Matriz de Envíos guarda su base y el avance de la migración en la rama `datos`, para que cualquiera vea la información al día.
- **Sin dependencias externas.** CSS y JS propios, sin CDN.
- **Design System Cartesian de Andreani.** Tokens `--c-*`, tipografía Rubik/Roboto, WCAG 2.1 AA.

## Publicar una herramienta nueva

1. Crear la carpeta `<herramienta>/` con su `index.html`.
2. Agregarla al array `HERRAMIENTAS` en `index.html` (raíz):
   ```js
   { id: "<herramienta>", nombre: "Nombre visible", descripcion: "Qué hace", estado: "beta" }
   ```
   `estado`: `"estable"` o `"beta"`.
3. Commit directo a `main`. Pages publica en 1–2 minutos (ver pestaña **Actions**).
