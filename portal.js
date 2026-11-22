/* Portal de soluciones (T-016, D-076, D-077) · catálogo y comportamiento. Separado de index.html en T-017 E3 (v2.2). Grupos colapsables: T-022 (v2.7). Sin destacado «Lo nuevo»: T-023 (v2.8). Relevamiento comercial: T-024 (v2.9). */
/*
 * Catálogo del portal (D-008, T-016). Para sumar una herramienta, agregar un objeto a HERRAMIENTAS.
 *   tipo: "uso" (en uso) | "proto" (prototipo / propuesta) | "archivo" (en pausa)
 *   proceso: id de PROCESOS (si aparece un proceso nuevo, sumarlo ahí)
 *   estado: "estable" | "beta" | "proto" | "repo" | "pausa"
 *   actualizado: "AAAA-MM-DD" (con 7 días o menos aparece «Nuevo»)
 *   acciones: [{ texto, href, estilo: "primary"|"secondary"|"ghost", externo }]
 * Al publicar algo nuevo, sumarlo también a NOVEDADES.
 */
var HERRAMIENTAS = [
  {
    id: "matriz", tipo: "uso", estado: "beta", icono: "matriz", proceso: "migracion",
    nombre: "Matriz de Envíos · universo B2C a migrar",
    descripcion: "Envíos por segmento, razón social, tipo de servicio, servicio y contrato, con el avance de la migración a DMS. Datos vivos: lo que se marca o se carga se guarda en GitHub y lo ve cualquiera.",
    para: "Analizar la información y seguir la migración de Integra a DMS: qué falta, cuánto pesa cada cliente y el resumen ejecutivo en PDF.",
    version: "v1.9", actualizado: "2026-11-16",
    acciones: [
      { texto: "Abrir", href: "./matriz-envios/", estilo: "primary" },
      { texto: "Guía de uso", href: "./matriz-envios/guia.html", estilo: "ghost" }
    ]
  },
  {
    id: "relevamiento", tipo: "uso", estado: "beta", icono: "relevamiento", proceso: "migracion",
    nombre: "Relevamiento comercial · migración a DMS",
    descripcion: "Cada ejecutivo elige su cartera (dirección, gerente comercial, gerente de cuenta y ejecutivo) y responde, contrato por contrato y con opciones cerradas, qué se migra a DMS y cómo: ciclo de vida, condición de entrega, etiqueta e integración. Al terminar lo manda por Teams en un clic.",
    para: "Tener la información de cada cliente B2C antes de migrarlo, confirmada por su dueño de cuenta. La primera vez se entra con el link que mandamos por Teams; después también desde acá.",
    version: "v0.2", actualizado: "2026-11-22",
    acciones: [
      { texto: "Abrir", href: "https://pblsanchez.github.io/relevamiento-migracion-dms/", estilo: "primary", externo: true },
      { texto: "Ver el ejemplo", href: "https://pblsanchez.github.io/relevamiento-migracion-dms/?demo", estilo: "ghost", externo: true }
    ]
  },
  {
    id: "alta-auto", tipo: "uso", estado: "beta", icono: "automatizacion", proceso: "contratos",
    nombre: "Alta automática de contratos DMS",
    descripcion: "El comercial manda el Excel de alta por Teams y el resto pasa solo: valida contra el CRM, corrige lo que tiene una única respuesta, le responde al comercial y entrega los archivos listos a configuración DMS en los cortes de las 11, 14 y 17 h.",
    para: "Sacar del medio el trabajo manual del proceso contingente de alta: nadie mira la bandeja, y si algo no se puede resolver, el comercial recibe el detalle para corregirlo. En producción desde el 24/11/2026.",
    version: "v1.0", actualizado: "2026-11-21",
    acciones: [
      { texto: "Cómo funciona", href: "./alta-contingente/", estilo: "primary" }
    ]
  },
  {
    id: "abm", tipo: "proto", estado: "proto", icono: "abm", proceso: "contratos",
    nombre: "ABM Contratos DMS · propuesta",
    descripcion: "Prototipo navegable de cómo nos gustaría dar de alta un contrato por pantalla en DMS: datos de SAP sin tipear, servicio en lenguaje comercial, domicilios una sola vez y vigencia al guardar.",
    para: "Dejar atrás el proceso contingente: dar de alta por pantalla los contratos B2B de hoy y los B2C cuando Integra migre a DMS. Datos de ejemplo, no guarda nada.",
    version: "v0.9", actualizado: "2026-11-19",
    acciones: [
      { texto: "Ver la presentación", href: "./pruebas/abm-contratos/", estilo: "primary" },
      { texto: "Ir a la demo", href: "./pruebas/abm-contratos/#demo", estilo: "ghost" }
    ]
  },
  {
    id: "normalizer", tipo: "uso", estado: "repo", icono: "normalizador", proceso: "contratos",
    nombre: "DMS Contract Normalizer",
    descripcion: "Normaliza archivos .xlsx de alta de contratos DMS: valida campos, convierte fórmulas a valores y limpia direcciones vacías.",
    para: "Es el proceso contingente de alta de contratos en DMS: lo usamos todos los días para los contratos B2B y hoy también para normalizar en masa los contratos de Cruz del Sur.",
    acciones: [
      { texto: "Abrir", href: "https://pblsanchez.github.io/dms-contract-normalizer/", estilo: "secondary", externo: true },
      { texto: "Ver repositorio", href: "https://github.com/Pblsanchez/dms-contract-normalizer", estilo: "ghost", externo: true }
    ]
  },
  {
    id: "seguimiento", tipo: "uso", estado: "beta", icono: "seguimiento", proceso: "transversal",
    nombre: "Seguimiento de actividades",
    descripcion: "En qué estamos, qué terminamos, qué está frenado y qué espera el OK de Pablo, en una sola pantalla. Lee el índice de tareas y los últimos cambios cada vez que entrás.",
    para: "Ver cómo vienen todas las tareas sin tener que preguntar. Se entra con la misma clave de GitHub de la Matriz; sin clave no muestra nada.",
    version: "v1.3", actualizado: "2026-11-18",
    acciones: [
      { texto: "Abrir", href: "./seguimiento/", estilo: "primary" },
      { texto: "Guía de uso", href: "./seguimiento/guia.html", estilo: "ghost" }
    ]
  },
  {
    id: "configurador", tipo: "archivo", estado: "pausa", icono: "configurador", proceso: "contratos",
    nombre: "Configurador de contratos DMS",
    descripcion: "Formulario web que valida en tiempo real y genera el Excel normalizado de contratos para DMS.",
    para: "Fue un intento de automatizar el proceso contingente de alta. Quedó de lado porque con el normalizador alcanzó; lo dejamos como referencia.",
    acciones: [
      { texto: "Abrir", href: "https://pblsanchez.github.io/configurador-contratos-dms/", estilo: "secondary", externo: true },
      { texto: "Ver repositorio", href: "https://github.com/Pblsanchez/configurador-contratos-dms", estilo: "ghost", externo: true }
    ]
  }
];

var GRUPOS = [
  { id: "uso", nombre: "En uso", desc: "Lo que usamos todos los días." },
  { id: "proto", nombre: "Prototipos y propuestas", desc: "Ideas navegables para validar antes de pedir un desarrollo." },
  { id: "archivo", nombre: "En pausa", desc: "Quedaron de lado; las dejamos a mano como referencia." }
];

/* Procesos que acompañan las soluciones (segundo filtro) */
var PROCESOS = [
  { id: "migracion", nombre: "Migración Integra → DMS" },
  { id: "contratos", nombre: "Alta de contratos en DMS" },
  { id: "transversal", nombre: "Transversal", transversal: true } /* lo que sirve para todos los procesos (no suma al contador del hero) */
];

var NOVEDADES = [
  { fecha: "2026-11-22", titulo: "Relevamiento comercial · migración a DMS", texto: "El equipo comercial confirma, cliente por cliente, qué se migra a DMS y cómo. Cada ejecutivo filtra su cartera y responde con opciones cerradas." },
  { fecha: "2026-11-21", titulo: "Portal · catálogo por grupos", texto: "Los grupos del catálogo se abren y se cierran: de un vistazo ves qué hay en cada uno y abrís solo lo que te interesa. Si buscás, se abren solos." },
  { fecha: "2026-11-21", titulo: "Alta automática de contratos DMS", texto: "El alta contingente ahora se hace sola: del Excel que manda el comercial por Teams a la carpeta de configuración DMS. En producción desde el 24/11." },
  { fecha: "2026-11-19", titulo: "ABM Contratos DMS · v0.9", texto: "Devolución centralizada a una UO, «Formulario Mobile Entrega», «Contrato agrupador de rendición» y el menú ⋮ del listado siempre a la vista." },
  { fecha: "2026-11-19", titulo: "ABM Contratos DMS · v0.8", texto: "Cartera del comercial, formulario Mobile de entrega para comparar, domicilios sin repetir y vigencia con fecha de inicio y fin." },
  { fecha: "2026-11-18", titulo: "Seguimiento de actividades · v1.3", texto: "La actividad reciente muestra solo los cambios de las tareas, sin los guardados automáticos de capturas." },
  { fecha: "2026-11-18", titulo: "Seguimiento de actividades", texto: "En qué estamos, qué terminamos y qué espera tu OK, en una sola pantalla. Se entra con la clave de la Matriz." },
  { fecha: "2026-11-18", titulo: "ABM Contratos DMS · v0.7", texto: "Deshabilitar y volver a habilitar contratos desde la edición, y dos ciclos de vida nuevos." },
  { fecha: "2026-11-18", titulo: "Portal renovado", texto: "Ya no es solo de la migración: suma el alta de contratos en DMS, filtros por proceso y el ABM de Contratos." },
  { fecha: "2026-11-17", titulo: "ABM Contratos DMS · v0.6", texto: "Presentación animada, avisos que se arreglan en un clic y ciclo estándar B2B." },
  { fecha: "2026-11-16", titulo: "Matriz · Resumen ejecutivo simplificado", texto: "Una hoja A4 para presentar, aparte del resumen completo." },
  { fecha: "2026-11-13", titulo: "Matriz · v1.9", texto: "Resumen ejecutivo descargable en PDF." }
];

var ICONOS = {
  matriz: '<path fill="currentColor" d="M3 3h8v8H3V3Zm2 2v4h4V5H5Zm8-2h8v8h-8V3Zm2 2v4h4V5h-4ZM3 13h8v8H3v-8Zm2 2v4h4v-4H5Zm8-2h8v8h-8v-8Zm2 2v4h4v-4h-4Z"/>',
  abm: '<path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm4 18H6V4h7v5h5v11ZM8 12h8v2H8v-2Zm0 4h5v2H8v-2Z"/>',
  normalizador: '<path fill="currentColor" d="M3 5h18v2H3V5Zm3 6h12v2H6v-2Zm3 6h6v2H9v-2Z"/>',
  seguimiento: '<path fill="currentColor" d="M3 4h3v3H3V4Zm5 .5h13v2H8v-2ZM3 10.5h3v3H3v-3Zm5 .5h13v2H8v-2ZM3 17h3v3H3v-3Zm5 .5h13v2H8v-2Z"/>',
  automatizacion: '<path fill="currentColor" d="M7 2v11h3v9l7-12h-4l4-8H7Z"/>',
  relevamiento: '<path fill="currentColor" d="M9 2h6a1 1 0 0 1 1 1v1h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2V3a1 1 0 0 1 1-1Zm1 2v2h4V4h-4ZM6 6v14h12V6h-2v2H8V6H6Zm4.6 10.4-2.3-2.3 1.4-1.4.9.9 3.7-3.7 1.4 1.4-5.1 5.1Z"/>',
  configurador: '<path fill="currentColor" d="M3 17v4h4l11-11-4-4L3 17Zm17.7-10.3a1 1 0 0 0 0-1.4l-2-2a1 1 0 0 0-1.4 0L15.6 5l4 4 1.1-1.3Z"/>',
  externo: '<path fill="currentColor" d="M14 3v2h3.6l-9.8 9.8 1.4 1.4L19 6.4V10h2V3h-7ZM5 5h6v2H5v12h12v-6h2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/>',
  beta: '<path fill="currentColor" d="M1 21h22L12 2 1 21Zm12-3h-2v-2h2v2Zm0-4h-2v-4h2v4Z"/>',
  ok: '<path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2Z"/>',
  proto: '<path fill="currentColor" d="M7 2v2h1v6.3L3.3 19A2 2 0 0 0 5 22h14a2 2 0 0 0 1.7-3L16 10.3V4h1V2H7Zm3 2h4v6.8l2.3 4.2H7.7L10 10.8V4Z"/>',
  repo: '<path fill="currentColor" d="M4 4a2 2 0 0 1 2-2h12v16H6a1 1 0 0 0 0 2h12v2H6a3 3 0 0 1-3-3V4h1Zm4 1v2h8V5H8Z"/>',
  pausa: '<path fill="currentColor" d="M6 5h4v14H6V5Zm8 0h4v14h-4V5Z"/>',
  nuevo: '<path fill="currentColor" d="m12 2 2.4 7.4H22l-6.2 4.5 2.4 7.4-6.2-4.6-6.2 4.6 2.4-7.4L2 9.4h7.6L12 2Z"/>',
  vacio: '<path fill="currentColor" d="M15.5 14h-.8l-.3-.3A6.5 6.5 0 1 0 14 15.5l.3.3v.8l5 5 1.5-1.5-5-5Zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Z"/>'
};
var ESTADOS = {
  estable: { clase: "b-ok", texto: "Estable", icono: "ok" },
  beta: { clase: "b-beta", texto: "Beta", icono: "beta" },
  proto: { clase: "b-proto", texto: "Prototipo", icono: "proto" },
  repo: { clase: "b-repo", texto: "Otro repositorio", icono: "repo" },
  pausa: { clase: "b-repo", texto: "En pausa", icono: "pausa" }
};
function procNombre(id) { var p = PROCESOS.filter(function (x) { return x.id === id; })[0]; return p ? p.nombre : ""; }
var proc = "todos";
var HOY = new Date();
/* T-022: grupos colapsables. Sin filtro: uno abierto por vez (o ninguno). Con búsqueda o proceso: se abren los grupos con resultados. */
var abiertos = {};

function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function svg(n) { return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (ICONOS[n] || "") + "</svg>"; }
function fecha(iso) { var p = iso.split("-"); return p[2] + "/" + p[1] + "/" + p[0]; }
function esNuevo(iso) { if (!iso) return false; var d = (HOY - new Date(iso + "T12:00:00")) / 86400000; return d >= -1 && d <= 7; }
function badge(est) { var e = ESTADOS[est]; return '<span class="badge ' + e.clase + '">' + svg(e.icono) + e.texto + "</span>"; }
function badges(h) { return (esNuevo(h.actualizado) ? '<span class="badge b-nuevo">' + svg("nuevo") + "Nuevo</span>" : "") + badge(h.estado); }
function norm(s) { return String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
function consulta() { return norm(document.getElementById("buscar").value.trim()); }
function coincideTexto(h, q) { return !q || norm(h.nombre + " " + h.descripcion + " " + h.para + " " + procNombre(h.proceso)).indexOf(q) >= 0; }
function coincide(h, q) { return (proc === "todos" || h.proceso === proc) && coincideTexto(h, q); }
function filtrando() { return proc !== "todos" || !!consulta(); }
function corto(h) { return h.nombre.split(" · ")[0]; }

function tarjeta(h) {
  var acc = h.acciones.map(function (a) {
    var ext = a.externo ? ' target="_blank" rel="noopener noreferrer"' : "";
    var aria = a.texto + ": " + h.nombre + (a.externo ? " (se abre en una pestaña nueva)" : "");
    return '<a class="btn btn-' + (a.estilo || "secondary") + '" href="' + esc(a.href) + '"' + ext + ' aria-label="' + esc(aria) + '">' + (a.externo ? svg("externo") : "") + esc(a.texto) + "</a>";
  }).join("");
  var meta = [];
  if (h.version) meta.push("Versión " + esc(h.version));
  if (h.actualizado) meta.push('Actualizado el <time datetime="' + h.actualizado + '">' + fecha(h.actualizado) + "</time>");
  return '<li><article class="tarjeta' + (h.tipo === "archivo" ? " gris" : "") + '">' +
    '<div class="t-top"><span class="ic">' + svg(h.icono) + '</span><div><span class="t-proc">' + esc(procNombre(h.proceso)) + '</span><h4>' + esc(h.nombre) + '</h4><div class="badges">' + badges(h) + "</div></div></div>" +
    '<p class="desc">' + esc(h.descripcion) + "</p>" +
    '<p class="para"><b>Para qué sirve:</b> ' + esc(h.para) + "</p>" +
    '<p class="t-meta">' + meta.join(" · ") + "</p>" +
    '<div class="t-acc">' + acc + "</div></article></li>";
}

function renderChips() {
  var q = consulta();
  var pops = [{ id: "todos", nombre: "Todos los procesos" }].concat(PROCESOS);
  document.getElementById("procs").innerHTML = pops.map(function (o) {
    var n = HERRAMIENTAS.filter(function (h) { return (o.id === "todos" || h.proceso === o.id) && coincideTexto(h, q); }).length;
    return '<button type="button" class="chip" data-p="' + o.id + '" aria-pressed="' + (proc === o.id) + '">' + esc(o.nombre) + ' <span class="n">' + n + "</span></button>";
  }).join("");
}
function sincHash() {
  var p = [];
  if (proc !== "todos") p.push("p-" + proc);
  if (!filtrando()) { var g = Object.keys(abiertos)[0]; if (g) p.push("g-" + g); }
  history.replaceState(null, "", p.length ? "#" + p.join("&") : location.pathname + location.search);
}

function renderCatalogo() {
  var q = consulta(), html = "", total = 0, num = 0, filtro = filtrando();
  var conItems = {};
  GRUPOS.forEach(function (g) {
    var todos = HERRAMIENTAS.filter(function (h) { return h.tipo === g.id; });
    var items = todos.filter(function (h) { return coincide(h, q); });
    num++;
    if (!items.length) return;
    conItems[g.id] = true;
    total += items.length;
    var abierto = !!abiertos[g.id];
    var cuenta = filtro && items.length !== todos.length ? items.length + " de " + todos.length : String(items.length);
    var prev = items.map(function (h) { return "<span>" + svg(h.icono) + esc(corto(h)) + "</span>"; }).join("");
    html += '<div class="grupo acc' + (abierto ? " abierto" : "") + '" data-g="' + g.id + '">' +
      '<h3 class="acc-h"><button type="button" class="acc-btn" id="gb-' + g.id + '" aria-expanded="' + abierto + '" aria-controls="gp-' + g.id + '">' +
      '<span class="grupo-num" aria-hidden="true">' + num + "</span>" +
      '<span class="acc-tit"><span class="acc-nom">' + esc(g.nombre) + ' <span class="acc-n"><span class="sr">(</span>' + cuenta + '<span class="sr">)</span></span></span><span class="acc-desc">' + esc(g.desc) + "</span></span>" +
      '<span class="acc-prev" aria-hidden="true">' + prev + "</span>" +
      '<span class="acc-chev" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path fill="currentColor" d="M7.4 8.6 12 13.2l4.6-4.6L18 10l-6 6-6-6 1.4-1.4Z"/></svg></span>' +
      "</button></h3>" +
      '<div class="acc-panel" id="gp-' + g.id + '" role="region" aria-labelledby="gb-' + g.id + '"><div class="acc-in"><ul class="grilla">' + items.map(tarjeta).join("") + "</ul></div></div></div>";
  });
  Object.keys(abiertos).forEach(function (k) { if (!conItems[k]) delete abiertos[k]; });
  if (!total) html = '<div class="vacio">' + svg("vacio").replace("<svg", '<svg width="32" height="32"') + "<h3>No encontramos nada con esa búsqueda</h3><p>Probá con otra palabra o elegí «Todos los procesos».</p></div>";
  document.getElementById("catalogo").innerHTML = html;
  document.getElementById("estado-filtro").textContent = total + (total === 1 ? " resultado" : " resultados");
  renderChips();
  observar();
}

/* Abre o cierra sin volver a dibujar (así se ve la animación) */
function alternar(id) {
  var abrir = !abiertos[id];
  if (!filtrando()) abiertos = {};
  if (abrir) abiertos[id] = true; else delete abiertos[id];
  Array.prototype.forEach.call(document.querySelectorAll("#catalogo .acc"), function (el) {
    var on = !!abiertos[el.getAttribute("data-g")];
    el.classList.toggle("abierto", on);
    el.querySelector(".acc-btn").setAttribute("aria-expanded", String(on));
  });
  sincHash();
}
/* Al cambiar búsqueda o proceso: con filtro se abren los grupos con resultados; sin filtro, todo cerrado */
function aplicarFiltros() {
  abiertos = {};
  if (filtrando()) {
    var q = consulta();
    GRUPOS.forEach(function (g) { if (HERRAMIENTAS.some(function (h) { return h.tipo === g.id && coincide(h, q); })) abiertos[g.id] = true; });
  }
  renderCatalogo();
  sincHash();
}

function renderTimeline() {
  document.getElementById("timeline").innerHTML = NOVEDADES.map(function (n) {
    return '<li><time datetime="' + n.fecha + '">' + fecha(n.fecha) + "</time><b>" + esc(n.titulo) + "</b><span>" + esc(n.texto) + "</span></li>";
  }).join("");
}

function renderMeta() {
  var c = function (t) { return HERRAMIENTAS.filter(function (h) { return h.tipo === t; }).length; };
  var datos = [[c("uso"), c("uso") === 1 ? "herramienta en uso" : "herramientas en uso"], [c("proto"), c("proto") === 1 ? "prototipo para validar" : "prototipos para validar"], [PROCESOS.filter(function (p) { return !p.transversal; }).length, "procesos que acompañamos"]];
  document.getElementById("hero-meta").innerHTML = datos.map(function (d) { return '<span><strong data-n="' + d[0] + '">' + d[0] + "</strong>" + d[1] + "</span>"; }).join("");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce && window.requestAnimationFrame) {
    Array.prototype.forEach.call(document.querySelectorAll("#hero-meta strong"), function (el) {
      var fin = +el.getAttribute("data-n"), t0 = null;
      el.textContent = "0";
      function paso(t) { if (!t0) t0 = t; var p = Math.min(1, (t - t0) / 1200); el.textContent = Math.round(fin * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(paso); }
      setTimeout(function () { requestAnimationFrame(paso); }, 700);
    });
  }
  var d = HERRAMIENTAS.filter(function (h) { return h.destacado; })[0], db = document.getElementById("dest-badges");
  if (d && db) db.innerHTML = badges(d) + '<span class="badge b-repo">' + esc(d.version) + " · " + fecha(d.actualizado) + "</span>";
}

/* Aparición al hacer scroll */
var io = ("IntersectionObserver" in window) ? new IntersectionObserver(function (es) {
  es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("on"); io.unobserve(e.target); } });
}, { threshold: 0.1 }) : null;
function observar() {
  Array.prototype.forEach.call(document.querySelectorAll(".rev:not(.on), .vis:not(.on)"), function (el, i) {
    if (!io) { el.classList.add("on"); return; }
    if (el.tagName === "LI") el.style.animationDelay = (i % 3) * 0.12 + "s";
    io.observe(el);
  });
}

document.getElementById("catalogo").addEventListener("click", function (e) {
  var b = e.target.closest(".acc-btn"); if (!b) return;
  alternar(b.closest(".acc").getAttribute("data-g"));
});
document.getElementById("procs").addEventListener("click", function (e) {
  var b = e.target.closest("[data-p]"); if (!b) return;
  proc = b.getAttribute("data-p");
  aplicarFiltros();
  var nb = document.querySelector('[data-p="' + proc + '"]'); if (nb) nb.focus();
});
document.getElementById("buscar").addEventListener("input", aplicarFiltros);
document.addEventListener("keydown", function (e) {
  var t = e.target.tagName;
  if (e.key === "/" && t !== "INPUT" && t !== "TEXTAREA") { e.preventDefault(); var i = document.getElementById("buscar"); i.focus(); i.scrollIntoView({ block: "center" }); }
  if (e.key === "Escape" && e.target.id === "buscar") { e.target.value = ""; aplicarFiltros(); }
});

var hp = location.hash.match(/p-(migracion|contratos|transversal)/), hg = location.hash.match(/g-(uso|proto|archivo)/);
if (hp) proc = hp[1];
renderMeta();
renderTimeline();
if (filtrando()) aplicarFiltros();
else { if (hg) abiertos[hg[1]] = true; renderCatalogo(); }
/* Un link con grupo o proceso (#g-uso, #p-contratos) lleva directo al catálogo */
if (hg || hp) { var secH = document.getElementById("herramientas"); if (secH && secH.scrollIntoView) setTimeout(function () { secH.scrollIntoView(); }, 0); }
