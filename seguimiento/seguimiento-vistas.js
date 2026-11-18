/* ==SEG-VISTAS== Seguimiento de actividades (T-017, D-081) v1.1 — E2: filtros, contadores, «Esperan tu OK»,
   bloqueadas y en pausa, actividad reciente. Recibe los helpers de la interfaz (ui) desde seguimiento.js. */
function SEG_VISTAS(ui) {
  "use strict";
  var L = SEG_LIB, el = ui.el, vaciar = ui.vaciar, rico = ui.rico, alerta = ui.alerta, etiquetaEstado = ui.etiquetaEstado, linkFicha = ui.linkFicha, $ = ui.$;
  var NUEVA = " (se abre en otra pestaña)";
  function ext(href, hijos, clase) { return el("a", { href: href, target: "_blank", rel: "noopener noreferrer", "class": clase || null }, hijos.concat([el("span", { "class": "sr-only", text: NUEVA })])); }
  function cabecera(id, titulo, cuenta) {
    return el("div", { "class": "seccion__cab" }, [el("h2", { "class": "titulo-seccion", id: id, text: titulo }), cuenta != null ? el("span", { "class": "contador", text: cuenta }) : null]);
  }
  function nTareas(n) { return n === 1 ? "1 tarea" : n + " tareas"; }

  /* ---------- Filtros por proceso y estado (punto 6) ---------- */
  function renderFiltros(d, f, alCambiar) {
    var cont = vaciar($("seg-filtros"));
    var procs = L.procesos(d.tareas);
    if (f.proceso && procs.indexOf(f.proceso) < 0) procs.push(f.proceso);
    var sp = el("select", { "class": "select", id: "seg-f-proceso" }, [el("option", { value: "", text: "Todos los procesos" })].concat(procs.map(function (p) { return el("option", { value: p, text: p }); })));
    var se = el("select", { "class": "select", id: "seg-f-estado" }, [el("option", { value: "", text: "Todos los estados" })].concat(L.ESTADOS.map(function (e) { return el("option", { value: e, text: e }); })));
    sp.value = f.proceso; se.value = f.estado;
    sp.addEventListener("change", function () { alCambiar({ proceso: sp.value, estado: f.estado }); });
    se.addEventListener("change", function () { alCambiar({ proceso: f.proceso, estado: se.value }); });
    cont.appendChild(el("div", { "class": "campo campo--fila" }, [el("label", { "for": "seg-f-proceso", text: "Proceso" }), sp]));
    cont.appendChild(el("div", { "class": "campo campo--fila" }, [el("label", { "for": "seg-f-estado", text: "Estado" }), se]));
    if (f.proceso || f.estado) cont.appendChild(el("button", { type: "button", "class": "btn btn--fantasma btn--chico", id: "seg-f-limpiar", onclick: function () { alCambiar({ proceso: "", estado: "" }); } }, ["Limpiar filtros"]));
  }

  /* ---------- Contadores por estado (punto 1). Cuentan con el filtro de proceso; un clic filtra por ese estado ---------- */
  var CLASE = { "En curso": "curso", "En revisión": "revision", "Bloqueada": "bloqueada", "En pausa": "pausa", "Cerrada": "cerrada" };
  function renderContadores(d, f, alCambiar) {
    var cont = vaciar($("seg-contadores"));
    var c = L.contar(L.filtrar(d.tareas, { proceso: f.proceso }));
    cont.appendChild(el("h2", { "class": "sr-only", id: "seg-contadores-titulo", text: "Tareas por estado" }));
    cont.appendChild(el("ul", { "class": "contadores" }, L.ESTADOS.map(function (e) {
      var activo = f.estado === e;
      return el("li", null, [el("button", { type: "button", "class": "contador-estado contador-estado--" + CLASE[e] + (activo ? " es-activo" : ""), "aria-pressed": activo ? "true" : "false", "data-estado": e,
        title: activo ? "Quitar el filtro «" + e + "»" : "Ver solo «" + e + "»",
        onclick: function () { alCambiar({ proceso: f.proceso, estado: activo ? "" : e }); } }, [
        el("span", { "class": "contador-estado__n", text: String(c[e]) }),
        el("span", { "class": "contador-estado__txt" }, [etiquetaEstado({ estado: e })])
      ])]);
    })));
  }

  /* ---------- «Esperan tu OK» (punto 2) ---------- */
  function renderOk(tareas) {
    var cont = vaciar($("seg-ok")), lista = L.esperanOk(tareas);
    cont.appendChild(cabecera("seg-ok-titulo", "Esperan tu OK", nTareas(lista.length)));
    if (!lista.length) { cont.appendChild(el("p", { "class": "vacio", text: "Nada espera tu OK con estos filtros." })); return; }
    cont.appendChild(el("ul", { "class": "tarjetas", id: "seg-ok-lista" }, lista.map(function (t) {
      return el("li", { "class": "tarjeta", "data-id": t.id }, [
        el("div", { "class": "tarjeta__cab" }, [linkFicha(t), etiquetaEstado(t), t.version ? el("span", { "class": "version", text: t.version }) : null]),
        el("p", { "class": "tarjeta__titulo" }, [rico(t.titulo)]),
        el("p", { "class": "tarjeta__falta" }, [el("strong", { text: "Qué falta: " }), t.falta ? rico(t.falta) : L.VACIO]),
        el("div", { "class": "tarjeta__pie" }, [
          t.herramienta ? ext(t.herramienta.url, ["Probar: " + t.herramienta.texto], "btn btn--secundario btn--chico") : el("span", { "class": "nota", text: "Sin link para probar" }),
          t.fecha ? el("span", { "class": "nota", text: "Actualizada " + t.fecha }) : null
        ])
      ]);
    })));
  }

  /* ---------- Bloqueadas y en pausa (punto 4) ---------- */
  function renderFrenadas(tareas) {
    var cont = vaciar($("seg-frenadas")), lista = L.frenadas(tareas);
    cont.appendChild(cabecera("seg-frenadas-titulo", "Bloqueadas y en pausa", nTareas(lista.length)));
    if (!lista.length) { cont.appendChild(el("p", { "class": "vacio", text: "No hay tareas bloqueadas ni en pausa con estos filtros." })); return; }
    cont.appendChild(el("ul", { "class": "frenadas", id: "seg-frenadas-lista" }, lista.map(function (t) {
      return el("li", { "class": "frenada", "data-id": t.id }, [
        el("div", { "class": "frenada__cab" }, [linkFicha(t), etiquetaEstado(t), el("span", { "class": "frenada__titulo" }, [rico(t.titulo)])]),
        el("p", { "class": "frenada__motivo" }, [el("strong", { text: "Motivo: " }), t.falta ? rico(t.falta) : L.VACIO]),
        el("p", { "class": "nota" }, [(t.quien ? "La tiene: " + t.quien : "Sin responsable") + (t.fecha ? " · actualizada " + t.fecha : "")])
      ]);
    })));
  }

  /* ---------- Actividad reciente (punto 5): últimos commits de la memoria, sin filtros ---------- */
  function renderActividad(commits, error, d) {
    var cont = vaciar($("seg-actividad"));
    cont.appendChild(cabecera("seg-actividad-titulo", "Actividad reciente", null));
    if (error) { cont.appendChild(alerta("warning", ["No pudimos leer los últimos cambios: " + error + " Probá con «Actualizar»."])); return; }
    if (!commits || !commits.length) { cont.appendChild(el("p", { "class": "vacio", text: "Todavía no hay cambios registrados." })); return; }
    var porId = {}; (d ? d.tareas : []).forEach(function (t) { porId[t.id.toUpperCase()] = t; });
    cont.appendChild(el("p", { "class": "nota", text: "Los últimos cambios guardados en la memoria, de todas las tareas (no les aplican los filtros)." }));
    cont.appendChild(el("ol", { "class": "actividad", id: "seg-actividad-lista" }, commits.map(function (c) {
      var m = L.leerCommit(c.mensaje), ids = L.idsTarea(m.tarea);
      var tareas = ids.length ? ids.map(function (id, i) {
        var t = porId[id], nodo = t && t.ficha ? ext(t.ficha, [id], "id") : el("span", { "class": "id", text: id });
        return i ? [", ", nodo] : [nodo];
      }).reduce(function (a, b) { return a.concat(b); }, []) : [el("span", { "class": "nota", text: "General" })];
      return el("li", { "class": "actividad__item" }, [
        el("time", { "class": "actividad__fecha", datetime: c.fecha || null, text: L.fechaHora(c.fecha) || "—" }),
        el("span", { "class": "actividad__tarea" }, tareas),
        el("span", { "class": "actividad__que" }, [m.que || "(sin descripción)", c.url && L.urlSegura(c.url) ? " " : null, c.url && L.urlSegura(c.url) ? ext(c.url, ["ver cambio"], "actividad__link") : null])
      ]);
    })));
  }

  return { renderFiltros: renderFiltros, renderContadores: renderContadores, renderOk: renderOk, renderFrenadas: renderFrenadas, renderActividad: renderActividad };
}
if (typeof module !== "undefined" && module.exports) module.exports = SEG_VISTAS;
