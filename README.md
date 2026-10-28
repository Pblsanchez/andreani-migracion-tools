# andreani-migracion-tools

Portal de soluciones del equipo de migración **Integra (B2C) → DMS (B2B+B2C)** de Andreani, publicado con GitHub Pages.

🌐 **Sitio:** https://pblsanchez.github.io/andreani-migracion-tools/

## Estructura

```
andreani-migracion-tools/
├── index.html          ← portada con el catálogo de herramientas
├── .nojekyll           ← publica los archivos tal cual (sin Jekyll)
└── <herramienta>/
    └── index.html      ← cada solución, autocontenida
```

Cada herramienta queda en `https://pblsanchez.github.io/andreani-migracion-tools/<herramienta>/`.

## Reglas

- **Sin datos reales en el repo.** Es público. Las herramientas procesan los archivos en el navegador del usuario.
- **HTML autocontenido.** CSS y JS embebidos, sin CDN.
- **Design System Cartesian de Andreani.** Tokens `--c-*`, tipografía Rubik/Roboto, WCAG 2.1 AA.

## Publicar una herramienta nueva

1. Crear la carpeta `<herramienta>/` con su `index.html`.
2. Agregarla al array `HERRAMIENTAS` en `index.html` (raíz):
   ```js
   { id: "<herramienta>", nombre: "Nombre visible", descripcion: "Qué hace", estado: "beta" }
   ```
   `estado`: `"estable"` o `"beta"`.
3. Commit directo a `main`. Pages publica en 1–2 minutos (ver pestaña **Actions**).
