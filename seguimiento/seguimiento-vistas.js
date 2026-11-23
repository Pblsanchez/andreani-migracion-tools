/* ==SEG-VISTAS== Seguimiento de actividades (T-017, D-081) v1.5 — T-019 E2 (D-131): componentes del Portal.
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
    renderFranja(d); vigilarDatos();
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

  return { renderFiltros: renderFiltros, renderContadores: renderContadores, renderOk: renderOk, renderFrenadas: renderFrenadas, renderActividad: renderActividad, renderFranja: renderFranja, limpiarFranja: limpiarFranja };
}
if (typeof module !== "undefined" && module.exports) module.exports = SEG_VISTAS;
