/* ==SEG-VISTAS== Seguimiento de actividades (T-017, D-081) v1.6 — T-019 E2 (D-131): componentes del Portal; v1.6 (D-132): pills de estado en la tabla; v1.7 (D-133): cerradas apagadas de entrada.
   Franja con 3 números (Esperan tu OK · En curso · Cerradas), filtros con etiquetas (chips) de estado y proceso,
   tarjetas del portal para «Esperan tu OK» y «Bloqueadas y en pausa», línea de tiempo para la actividad reciente.
   La tabla de tareas sigue en seguimiento.js. Recibe los helpers de la interfaz (ui) desde seguimiento.js. */
function SEG_VISTAS(ui) {
  "use strict";
  var L = SEG_LIB, el = ui.el, vaciar = ui.vaciar, rico = ui.rico, alerta = ui.alerta, etiquetaEstado = ui.etiquetaEstado, linkFicha = ui.linkFicha, $ = ui.$;
  var NUEVA = " (se abre en otra pestaña)";
  function ext(href, hijos, clase) { return el("a", { href: href, target: "_blank", rel: "noopener noreferrer", "class": clase || null }, hijos.concat([el("span", { "class": "sr-only", text: NUEVA })])); }
  function cabecera(id, titulo, cuenta, clase) {
    return el("div", { "class": "seccion__cab" + (clase ? " " + clase : "") }, [el("h2", { "class": "titulo-seccion", id: id, text: titulo }), cuenta != null ? el("span", { "class": "contador", text: cuenta }) : null]);
  }
  function nTareas(n) { return n === 1 ? "1 tarea" : n + " tareas"; }

  /* ---------- Franja: 3 números del índice completo (sin filtros). Sin clave no se muestra ---------- */
  function limpiarFranja() { var m = $("seg-hero-meta"); if (m) { vaciar(m); m.hidden = true; } }
  function renderFranja(d) {
    var m = $("seg-hero-meta"); if (!m) return;
    vaciar(m);
    var c = L.contar(d.tareas);
    [[L.esperanOk(d.tareas).length, "Esperan tu OK"], [c["En curso"], "En curso"], [c["Cerrada"], "Cerradas"]].forEach(function (x) {
      m.appendChild(el("div", { "class": "seg-dato" }, [el("strong", { text: String(x[0]) }), x[1]]));
    });
    m.hidden = false;
  }
  /* Si la pantalla de datos se oculta (desconectar, clave vencida, sin permiso), la franja vuelve a quedar vacía */
  var vigilando = false;
  function vigilarDatos() {
    if (vigilando) return; vigilando = true;
    var datos = $("seg-datos");
    if (!datos || typeof MutationObserver === "undefined") return;
    new MutationObserver(function () { if (datos.hidden) limpiarFranja(); }).observe(datos, { attributes: true, attributeFilter: ["hidden"] });
  }

  /* ---------- Filtros: dos filas de etiquetas (estado con cantidad · proceso con cantidad) ---------- */
  function chip(texto, n, activo, titulo, alClic, datos) {
    var at = { type: "button", "class": "chip", "aria-pressed": activo ? "true" : "false", title: titulo, onclick: alClic };
    Object.keys(datos || {}).forEach(function (k) { at[k] = datos[k]; });
    return el("button", at, [texto, n != null ? el("span", { "class": "n", text: String(n) }) : null]);
  }
  function fila(etiqueta, id, chips) {
    return el("div", { "class": "chips-fila", role: "group", "aria-labelledby": id }, [el("span", { "class": "chips-fila__label", id: id, text: etiqueta }), el("div", { "class": "chips" }, chips)]);
  }
  function renderFiltros(d, f, alCambiar) {
    var cont = vaciar($("seg-filtros"));
    var porProceso = L.filtrar(d.tareas, { proceso: f.proceso }), c = L.contar(porProceso);
    var estados = [chip("Todos", porProceso.length, !f.estado, "Ver todos los estados", function () { alCambiar({ proceso: f.proceso, estado: "" }); }, { "data-estado": "" })]
      .concat(L.ESTADOS.map(function (e) {
        var activo = f.estado === e;
        return chip(e, c[e], activo, activo ? "Quitar el filtro «" + e + "»" : "Ver solo «" + e + "»", function () { alCambiar({ proceso: f.proceso, estado: activo ? "" : e }); }, { "data-estado": e });
      }));
    var porEstado = L.filtrar(d.tareas, { estado: f.estado });
    var procs = L.procesos(d.tareas);
    if (f.proceso && procs.indexOf(f.proceso) < 0) procs.push(f.proceso);
    var procesos = [chip("Todos", porEstado.length, !f.proceso, "Ver todos los procesos", function () { alCambiar({ proceso: "", estado: f.estado }); }, { "data-proceso": "" })]
      .concat(procs.map(function (p) {
        var activo = f.proceso === p, n = L.filtrar(porEstado, { proceso: p }).length;
        return chip(p, n, activo, activo ? "Quitar el filtro «" + p + "»" : "Ver solo «" + p + "»", function () { alCambiar({ proceso: activo ? "" : p, estado: f.estado }); }, { "data-proceso": p });
      }));
    cont.appendChild(fila("Estado", "seg-f-estado", estados));
    cont.appendChild(fila("Proceso", "seg-f-proceso", procesos));
    if (f.proceso || f.estado) cont.appendChild(el("div", null, [el("button", { type: "button", "class": "btn btn-ghost btn--chico", id: "seg-f-limpiar", onclick: function () { alCambiar({ proceso: "", estado: "" }); } }, ["Limpiar filtros"])]));
    renderFranja(d); vigilarDatos(); vigilarTabla();
  }

  /* ---------- Tabla: interruptores de estado (T-019, D-132 + D-133) ----------
     Un pill por estado con el mismo diseño que la columna «Estado»: prendido = se ve en la tabla, apagado = se oculta.
     D-133: de entrada están prendidos todos menos «Cerrada» (las cerradas se prenden a mano). «Todas» prende todo.
     Filtran solo la tabla, sobre lo que ya dejan los filtros de arriba. La tabla la arma seguimiento.js:
     cuando se vuelve a pintar, se agregan los pills y se aplica la selección (MutationObserver). */
  var POR_DEFECTO = L.ESTADOS.filter(function (e) { return e !== "Cerrada"; });
  var verTabla = POR_DEFECTO.slice();
  function prepararTabla() {
    var cont = $("seg-lista"); if (!cont) return;
    var cuerpo = $("seg-lista-cuerpo");
    hijosConClase(cont, "pills-tabla").concat(hijosConClase(cont, "pills-vacio")).forEach(function (n) { cont.removeChild(n); });
    if (!cuerpo || !enArbol(cont, cuerpo)) return;
    var filas = cuerpo.children || [], c = {};
    L.ESTADOS.forEach(function (e) { c[e] = 0; });
    filas.forEach(function (tr) { var e = tr.getAttribute("data-estado"); if (c[e] != null) c[e]++; });
    function visible(tr) { var e = tr.getAttribute("data-estado"); return c[e] == null || verTabla.indexOf(e) >= 0; }
    var todasPrendidas = L.ESTADOS.every(function (e) { return !c[e] || verTabla.indexOf(e) >= 0; });
    var pills = el("div", { "class": "pills-tabla", role: "group", "aria-label": "Estados que se ven en la tabla" }, [
      el("span", { "class": "chips-fila__label", text: "Ver en la tabla" }),
      el("button", { type: "button", "class": "chip chip--todas", "aria-pressed": todasPrendidas ? "true" : "false", "data-estado": "",
        title: "Prender todos los estados, también las cerradas",
        onclick: function () { verTabla = L.ESTADOS.slice(); prepararTabla(); anunciarTabla(); } }, ["Todas", el("span", { "class": "n", text: String(filas.length) })])
    ].concat(L.ESTADOS.map(function (e) {
      var prendido = verTabla.indexOf(e) >= 0, n = c[e];
      return el("button", { type: "button", "class": "pill-estado", "aria-pressed": prendido ? "true" : "false", "data-estado": e, disabled: n === 0,
        title: n === 0 ? "No hay tareas «" + e + "» en la tabla" : (prendido ? "Ocultar «" + e + "» de la tabla" : "Mostrar «" + e + "» en la tabla"),
        onclick: function () { if (prendido) verTabla = verTabla.filter(function (x) { return x !== e; }); else verTabla = verTabla.concat([e]); prepararTabla(); anunciarTabla(); } },
        [etiquetaEstado({ estado: e }), el("span", { "class": "pill-n", text: String(n) })]);
    })));
    var cab = hijosConClase(cont, "seccion__cab")[0];
    if (cab) cont.insertBefore(pills, cab.nextSibling); else cont.appendChild(pills);
    var visibles = 0;
    filas.forEach(function (tr) { var ver = visible(tr); tr.hidden = !ver; if (ver) visibles++; });
    var tot = $("seg-lista-total");
    if (tot) {
      if (tot.getAttribute("data-base") == null) tot.setAttribute("data-base", tot.textContent);
      tot.textContent = visibles === filas.length ? tot.getAttribute("data-base") : visibles + " de " + filas.length + " en la tabla";
    }
    /* Si todo lo que hay quedó apagado (ej.: arriba se eligió «Cerrada»), se avisa y se ofrece prenderlo */
    if (filas.length && !visibles) {
      cont.appendChild(el("div", { "class": "vacio pills-vacio" }, [
        filas.length === 1 ? "La tarea de la tabla está en un estado apagado. " : "Las " + filas.length + " tareas de la tabla están en estados apagados. ",
        el("button", { type: "button", "class": "btn btn-secondary btn--chico", onclick: function () { verTabla = L.ESTADOS.slice(); prepararTabla(); anunciarTabla(); } }, ["Ver todas"])
      ]));
    }
  }
  function anunciarTabla() {
    var a = $("seg-anuncio"), tot = $("seg-lista-total");
    if (a && tot) { a.textContent = ""; a.textContent = "Tabla: " + tot.textContent + "."; }
  }
  function hijosConClase(n, cl) { return (n.children || []).filter(function (x) { return (" " + (x.getAttribute("class") || "") + " ").indexOf(" " + cl + " ") >= 0; }); }
  function enArbol(raiz, n) { while (n) { if (n === raiz) return true; n = n.parentNode; } return false; }
  var vigTabla = false, pintando = false;
  function vigilarTabla() {
    if (vigTabla) return; vigTabla = true;
    var cont = $("seg-lista");
    if (!cont || typeof MutationObserver === "undefined") return;
    new MutationObserver(function () {
      if (pintando) return;
      if (hijosConClase(cont, "pills-tabla").length && $("seg-lista-cuerpo") && $("seg-lista-total") && $("seg-lista-total").getAttribute("data-base") != null) return;
      pintando = true; try { prepararTabla(); } finally { pintando = false; }
    }).observe(cont, { childList: true });
  }

  /* ---------- Contadores: desde v1.5 los muestran las etiquetas de estado; la sección queda oculta ---------- */
  function renderContadores() {
    var cont = $("seg-contadores"); if (!cont) return;
    vaciar(cont); cont.hidden = true;
  }

  /* ---------- Tarjeta del portal ---------- */
  function tarjeta(t, gris, cuerpoTit, cuerpo, meta, acciones) {
    return el("li", { "data-id": t.id }, [el("article", { "class": "tarjeta" + (gris ? " gris" : "") }, [
      el("div", { "class": "t-top" }, [el("div", null, [
        t.proceso ? el("span", { "class": "t-proc", text: t.proceso }) : null,
        el("h3", { "class": "t-titulo" }, [rico(t.titulo || t.id)])
      ])]),
      el("div", { "class": "badges" }, [linkFicha(t), etiquetaEstado(t), t.version ? el("span", { "class": "badge b-repo", text: t.version }) : null]),
      el("p", { "class": "para" }, [el("b", { text: cuerpoTit }), cuerpo ? rico(cuerpo) : L.VACIO]),
      el("p", { "class": "t-meta", text: meta }),
      acciones ? el("div", { "class": "t-acc" }, [acciones]) : null
    ])]);
  }

  /* ---------- «Esperan tu OK» ---------- */
  function renderOk(tareas) {
    var cont = vaciar($("seg-ok")), lista = L.esperanOk(tareas);
    cont.appendChild(cabecera("seg-ok-titulo", "Esperan tu OK", nTareas(lista.length), "grupo-head"));
    if (!lista.length) { cont.appendChild(el("p", { "class": "vacio", text: "Nada espera tu OK con estos filtros." })); return; }
    cont.appendChild(el("ul", { "class": "grilla seg-grilla", id: "seg-ok-lista" }, lista.map(function (t) {
      return tarjeta(t, false, "Qué falta: ", t.falta, t.fecha ? "Actualizada " + t.fecha : "Sin fecha de actualización",
        t.herramienta ? ext(t.herramienta.url, ["Probar: " + t.herramienta.texto], "btn btn-secondary btn--chico") : el("span", { "class": "nota", text: "Sin link para probar" }));
    })));
  }

  /* ---------- Bloqueadas y en pausa ---------- */
  function renderFrenadas(tareas) {
    var cont = vaciar($("seg-frenadas")), lista = L.frenadas(tareas);
    cont.appendChild(cabecera("seg-frenadas-titulo", "Bloqueadas y en pausa", nTareas(lista.length)));
    if (!lista.length) { cont.appendChild(el("p", { "class": "vacio", text: "No hay tareas bloqueadas ni en pausa con estos filtros." })); return; }
    cont.appendChild(el("ul", { "class": "grilla seg-grilla", id: "seg-frenadas-lista" }, lista.map(function (t) {
      return tarjeta(t, true, "Motivo: ", t.falta, (t.quien ? "La tiene: " + t.quien : "Sin responsable") + (t.fecha ? " · actualizada " + t.fecha : ""), null);
    })));
  }

  /* ---------- Actividad reciente: línea de tiempo, últimos commits de la memoria, sin filtros ---------- */
  function renderActividad(commits, error, d) {
    var cont = vaciar($("seg-actividad"));
    cont.appendChild(cabecera("seg-actividad-titulo", "Actividad reciente", null));
    if (error) { cont.appendChild(alerta("warning", ["No pudimos leer los últimos cambios: " + error + " Probá con «Actualizar»."])); return; }
    if (!commits || !commits.length) { cont.appendChild(el("p", { "class": "vacio", text: "Todavía no hay cambios registrados." })); return; }
    var porId = {}; (d ? d.tareas : []).forEach(function (t) { porId[t.id.toUpperCase()] = t; });
    cont.appendChild(el("p", { "class": "nota", text: "Los últimos cambios guardados en la memoria, de todas las tareas (no les aplican los filtros)." }));
    cont.appendChild(el("div", { "class": "seg-tl" }, [el("ol", { "class": "timeline", id: "seg-actividad-lista" }, commits.map(function (c) {
      var m = L.leerCommit(c.mensaje), ids = L.idsTarea(m.tarea);
      var tareas = ids.length ? ids.map(function (id, i) {
        var t = porId[id], nodo = t && t.ficha ? ext(t.ficha, [id], "id") : el("span", { "class": "id", text: id });
        return i ? [", ", nodo] : [nodo];
      }).reduce(function (a, b) { return a.concat(b); }, []) : ["General"];
      var url = c.url && L.urlSegura(c.url) ? c.url : null;
      return el("li", null, [
        el("time", { "class": "actividad__fecha", datetime: c.fecha || null, text: L.fechaHora(c.fecha) || "—" }),
        el("b", { "class": "actividad__tarea" }, tareas),
        el("span", { "class": "actividad__que" }, [m.que || "(sin descripción)", url ? " " : null, url ? ext(url, ["ver cambio"], "actividad__link") : null])
      ]);
    }))]));
  }

  return { renderFiltros: renderFiltros, renderContadores: renderContadores, renderOk: renderOk, renderFrenadas: renderFrenadas, renderActividad: renderActividad, renderFranja: renderFranja, limpiarFranja: limpiarFranja, prepararTabla: prepararTabla };
}
if (typeof module !== "undefined" && module.exports) module.exports = SEG_VISTAS;
