/* ==SEG-APP== Seguimiento de actividades (T-017, D-081): interfaz.
   E1: conexión con la clave, lectura del índice y lista de tareas.
   Nada de la memoria se guarda en el navegador: se lee cada vez. Solo se guarda la clave (la misma de la Matriz). */
var SEG_APP = (function () {
  "use strict";
  var L = SEG_LIB, G = SEG_GH;
  var doc = typeof document !== "undefined" ? document : null;
  var est = { cli: null, usuario: null, datos: null, cargando: false, opciones: {} };

  function $(id) { return doc.getElementById(id); }
  function el(tag, at, hijos) {
    var n = doc.createElement(tag);
    Object.keys(at || {}).forEach(function (k) {
      var v = at[k];
      if (v == null || v === false) return;
      if (k === "text") n.textContent = v;
      else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? "" : v);
    });
    (hijos || []).forEach(function (h) { if (h == null) return; n.appendChild(typeof h === "string" ? doc.createTextNode(h) : h); });
    return n;
  }
  function vaciar(n) { while (n.firstChild) n.removeChild(n.firstChild); return n; }
  function icono(nombre) {
    var p = { ok: "M5 12.5l4.5 4.5L19 7.5", info: "M12 8v.5M12 11v6", alerta: "M12 7v6M12 16.5v.5", error: "M8 8l8 8M16 8l-8 8" }[nombre] || "";
    var s = doc.createElementNS ? doc.createElementNS("http://www.w3.org/2000/svg", "svg") : doc.createElement("svg");
    s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true"); s.setAttribute("focusable", "false"); s.setAttribute("class", "ico");
    var c = doc.createElementNS ? doc.createElementNS("http://www.w3.org/2000/svg", "path") : doc.createElement("path");
    c.setAttribute("d", p); c.setAttribute("fill", "none"); c.setAttribute("stroke", "currentColor"); c.setAttribute("stroke-width", "2.2"); c.setAttribute("stroke-linecap", "round");
    s.appendChild(c);
    return s;
  }
  /* Alerta del DS: siempre ícono + texto (R13) */
  function alerta(tipo, hijos) {
    var ico = { ok: "ok", info: "info", warning: "alerta", error: "error" }[tipo] || "info";
    return el("div", { "class": "alerta alerta--" + tipo, role: tipo === "error" ? "alert" : null }, [icono(ico), el("div", { "class": "alerta__txt" }, hijos)]);
  }
  /* Celda Markdown → nodos (texto, negrita, código, links https en pestaña nueva) */
  function rico(md) {
    var f = doc.createDocumentFragment ? doc.createDocumentFragment() : el("span");
    L.segmentos(md).forEach(function (s) {
      if (s.t === "link") f.appendChild(el("a", { href: s.url, target: "_blank", rel: "noopener noreferrer" }, [s.v, el("span", { "class": "sr-only", text: " (se abre en otra pestaña)" })]));
      else if (s.t === "code") f.appendChild(el("code", { text: s.v }));
      else if (s.t === "b") f.appendChild(el("strong", { text: s.v }));
      else f.appendChild(doc.createTextNode(s.v));
    });
    return f;
  }
  function anunciar(t) { var a = $("seg-anuncio"); if (a) { a.textContent = ""; a.textContent = t; } }

  /* Estado como etiqueta con ícono + texto (D-045: azul solo info, naranja warning, amarillo caution, verde success) */
  var CLASE_ESTADO = { "En curso": "curso", "En revisión": "revision", "Bloqueada": "bloqueada", "En pausa": "pausa", "Cerrada": "cerrada" };
  var ICONO_ESTADO = { "En curso": "info", "En revisión": "info", "Bloqueada": "alerta", "En pausa": "alerta", "Cerrada": "ok" };
  function etiquetaEstado(t) {
    if (!t.estado) return el("span", { "class": "estado estado--otro" }, [L.plano(t.estadoTxt) || L.VACIO]);
    return el("span", { "class": "estado estado--" + CLASE_ESTADO[t.estado] }, [icono(ICONO_ESTADO[t.estado]), t.estado]);
  }

  /* ---------- Vistas ---------- */
  function mostrar(vista) {
    ["seg-conexion", "seg-sin-acceso", "seg-datos"].forEach(function (id) { var n = $(id); if (n) n.hidden = id !== vista; });
    var bar = $("seg-sesion"); if (bar) bar.hidden = vista !== "seg-datos";
  }

  function renderConexion(msgError) {
    var b = vaciar($("seg-conexion"));
    b.appendChild(el("h2", { "class": "titulo-seccion", id: "seg-conexion-titulo", text: "Conectá tu clave de GitHub" }));
    b.appendChild(el("p", { text: "El seguimiento lee las tareas de un repositorio privado. Sin la clave no se muestra nada." }));
    b.appendChild(el("p", null, ["Si ya usás la Matriz de Envíos en este navegador, no tenés que hacer nada: el seguimiento usa la misma clave. Solo hace falta que esa clave tenga sumado el repositorio ",
      el("strong", { text: G.REPO_TXT }), "."]));
    b.appendChild(el("h3", { "class": "subtitulo", text: "Si todavía no la tenés en este navegador" }));
    b.appendChild(el("ol", { "class": "pasos" }, [
      el("li", null, ["Entrá a ", el("a", { href: "https://github.com/settings/personal-access-tokens", target: "_blank", rel: "noopener noreferrer" }, ["GitHub › Fine-grained tokens", el("span", { "class": "sr-only", text: " (se abre en otra pestaña)" })]), " y abrí la clave que usás en la Matriz (o generá una nueva)."]),
      el("li", null, ["En «Repository access», sumá ", el("strong", { text: G.REPO_TXT }), "."]),
      el("li", null, ["En «Repository permissions › Contents» alcanza con ", el("strong", { text: "Read-only" }), " (si ya tiene Read and write por la Matriz, dejala así)."]),
      el("li", null, ["Copiá la clave y pegala acá abajo."])
    ]));
    var inp = el("input", { "class": "input", type: "password", id: "seg-token", autocomplete: "off", spellcheck: "false", "aria-describedby": "seg-token-nota" });
    inp.addEventListener("keydown", function (ev) { if (ev.key === "Enter") { ev.preventDefault(); conectar(); } });
    b.appendChild(el("div", { "class": "campo" }, [el("label", { "for": "seg-token", text: "Clave de GitHub (token)" }), inp,
      el("span", { "class": "nota", id: "seg-token-nota", text: "No la compartas. Queda guardada solo en este navegador y también la usa la Matriz de Envíos." })]));
    b.appendChild(el("div", { id: "seg-conexion-res", "aria-live": "polite" }, msgError ? [alerta("error", [msgError])] : []));
    b.appendChild(el("button", { type: "button", "class": "btn btn--primario", id: "seg-conectar", onclick: conectar }, ["Conectar"]));
    mostrar("seg-conexion");
  }

  function renderSinAcceso(v) {
    var b = vaciar($("seg-sin-acceso"));
    b.appendChild(el("h2", { "class": "titulo-seccion", text: "Falta un permiso en tu clave" }));
    b.appendChild(alerta("warning", [el("strong", { text: "Conectado como " + v.usuario + ", pero la clave no puede leer las tareas. " }), v.error || ""]));
    b.appendChild(el("p", { text: "Para arreglarlo, en GitHub:" }));
    b.appendChild(el("ol", { "class": "pasos" }, [
      el("li", null, ["Abrí ", el("a", { href: "https://github.com/settings/personal-access-tokens", target: "_blank", rel: "noopener noreferrer" }, ["Settings › Developer settings › Fine-grained tokens", el("span", { "class": "sr-only", text: " (se abre en otra pestaña)" })]), " y elegí la clave que usás en la Matriz."]),
      el("li", null, ["En «Repository access», sumá ", el("strong", { text: G.REPO_TXT }), "."]),
      el("li", null, ["Revisá que «Contents» tenga al menos ", el("strong", { text: "Read-only" }), ". Guardá los cambios (la clave no cambia)."]),
      el("li", null, ["Volvé acá y tocá «Probar de nuevo»."])
    ]));
    b.appendChild(el("div", { "class": "acciones" }, [
      el("button", { type: "button", "class": "btn btn--primario", id: "seg-reintentar", onclick: function () { iniciar(); } }, ["Probar de nuevo"]),
      el("button", { type: "button", "class": "btn btn--secundario", id: "seg-otra-clave", onclick: function () { renderConexion(); var t = $("seg-token"); if (t) t.focus(); } }, ["Usar otra clave"])
    ]));
    mostrar("seg-sin-acceso");
  }

  function renderSesion() {
    var s = $("seg-usuario"); if (s) s.textContent = est.usuario ? "Conectado como " + est.usuario : "";
  }

  /* Lista de tareas (punto 3) */
  var COLS = [
    { c: "id", t: "ID" }, { c: "titulo", t: "Título" }, { c: "proceso", t: "Proceso" }, { c: "estado", t: "Estado" },
    { c: "version", t: "Versión" }, { c: "falta", t: "Qué falta" }, { c: "quien", t: "Quién la tiene" },
    { c: "fecha", t: "Última actualización" }, { c: "herramienta", t: "Herramienta" }
  ];
  function celdaTarea(t, c) {
    if (c === "id") return t.ficha ? el("a", { href: t.ficha, target: "_blank", rel: "noopener noreferrer", "class": "id" }, [t.id, el("span", { "class": "sr-only", text: " (ficha, se abre en otra pestaña)" })]) : el("span", { "class": "id", text: t.id });
    if (c === "titulo") return rico(t.titulo);
    if (c === "estado") return etiquetaEstado(t);
    if (c === "falta") return t.falta ? rico(t.falta) : doc.createTextNode(L.VACIO);
    if (c === "herramienta") return t.herramienta ? el("a", { href: t.herramienta.url, target: "_blank", rel: "noopener noreferrer" }, [t.herramienta.texto, el("span", { "class": "sr-only", text: " (se abre en otra pestaña)" })]) : doc.createTextNode(L.VACIO);
    if (c === "quien") return t.quien ? el("span", { "class": "quien" + (L.normal(t.quien) === "pablo" ? " quien--pablo" : "") , text: t.quien }) : doc.createTextNode(L.VACIO);
    return doc.createTextNode(t[c] || L.VACIO);
  }
  function renderLista(d) {
    var cont = vaciar($("seg-lista"));
    var cab = el("div", { "class": "seccion__cab" }, [
      el("h2", { "class": "titulo-seccion", id: "seg-lista-titulo", text: "Tareas" }),
      el("span", { "class": "contador", id: "seg-lista-total", text: d.tareas.length === 1 ? "1 tarea" : d.tareas.length + " tareas" })
    ]);
    cont.appendChild(cab);
    if (d.faltan.length) {
      var nombres = { id: "ID", titulo: "Título", proceso: "Proceso", estado: "Estado", version: "Versión", falta: "Qué falta", quien: "Quién la tiene", herramienta: "Herramienta", fecha: "Última actualización" };
      cont.appendChild(alerta("info", ["Al índice le faltan columnas (" + d.faltan.map(function (c) { return nombres[c]; }).join(", ") + "). Se muestran como «—» hasta que se agreguen."]));
    }
    if (!d.tareas.length) { cont.appendChild(alerta("info", ["El índice no tiene tareas cargadas."])); return; }
    var thead = el("thead", null, [el("tr", null, COLS.map(function (k) { return el("th", { scope: "col", text: k.t }); }))]);
    var tbody = el("tbody", { id: "seg-lista-cuerpo" }, d.tareas.map(function (t) {
      return el("tr", { "data-id": t.id, "data-estado": t.estado || "", "class": t.estado === "Cerrada" ? "fila--cerrada" : null },
        COLS.map(function (k, i) {
          var a = { "data-label": k.t, "class": "col-" + k.c };
          return i === 0 ? el("th", Object.assign({ scope: "row" }, a), [celdaTarea(t, k.c)]) : el("td", a, [celdaTarea(t, k.c)]);
        }));
    }));
    cont.appendChild(el("div", { "class": "tabla-marco" }, [el("table", { "class": "tabla", "aria-labelledby": "seg-lista-titulo" }, [thead, tbody])]));
  }

  function renderDatos() {
    renderSesion();
    var d = est.datos;
    var leido = $("seg-leido"); if (leido) leido.textContent = "Leído de GitHub a las " + horaLocal(new Date()) + ".";
    renderLista(d);
    mostrar("seg-datos");
  }
  function horaLocal(f) { function p(n) { return (n < 10 ? "0" : "") + n; } return p(f.getHours()) + ":" + p(f.getMinutes()); }

  /* ---------- Flujo ---------- */
  function cargar() {
    var btn = $("seg-actualizar");
    if (btn) btn.disabled = true;
    est.cargando = true;
    return est.cli.indice().then(function (md) {
      var d = L.leerIndice(md, G.URL_FICHAS);
      if (!d) throw new Error("No se encontró la tabla de tareas en el índice (necesita al menos las columnas ID y Estado).");
      est.datos = d; est.cargando = false;
      if (btn) btn.disabled = false;
      renderDatos();
      anunciar("Se cargaron " + d.tareas.length + " tareas.");
      return d;
    }).catch(function (e) {
      est.cargando = false; if (btn) btn.disabled = false;
      if (e.status === 401) { G.borrarClave(est.opciones.ls); est.datos = null; renderConexion(e.message); return null; }
      if (e.status === 404 || e.status === 403) { est.datos = null; renderSinAcceso({ usuario: est.usuario || "tu usuario", error: e.message }); return null; }
      var err = $("seg-error"); if (err) { vaciar(err).appendChild(alerta("error", [e.message || String(e)])); }
      if (!est.datos) { vaciar($("seg-lista")); mostrar("seg-datos"); }
      return null;
    });
  }

  function iniciar() {
    var token = G.leerClave(est.opciones.ls);
    est.datos = null; vaciar($("seg-lista"));
    var err = $("seg-error"); if (err) vaciar(err);
    if (!token) { renderConexion(); return Promise.resolve(null); }
    est.cli = new G.Cliente(token, est.opciones.fetch);
    mostrarCargando();
    return est.cli.verificar().then(function (v) {
      est.usuario = v.usuario;
      if (!v.puedeLeer) { renderSinAcceso(v); return null; }
      return cargar();
    }).catch(function (e) {
      if (e.status === 401) { G.borrarClave(est.opciones.ls); renderConexion(e.message); return null; }
      renderConexion(e.message || String(e)); return null;
    });
  }
  function mostrarCargando() {
    var b = vaciar($("seg-conexion"));
    b.appendChild(alerta("info", ["Leyendo las tareas desde GitHub…"]));
    mostrar("seg-conexion");
  }

  function conectar() {
    var inp = $("seg-token"), res = $("seg-conexion-res"), token = (inp && inp.value || "").trim();
    vaciar(res);
    if (!token) { res.appendChild(alerta("error", ["Pegá la clave de GitHub para conectar."])); if (inp) inp.focus(); return Promise.resolve(null); }
    var btn = $("seg-conectar"); if (btn) btn.disabled = true;
    res.appendChild(alerta("info", ["Verificando la clave…"]));
    var cli = new G.Cliente(token, est.opciones.fetch);
    return cli.verificar().then(function (v) {
      if (btn) btn.disabled = false;
      G.guardarClave(token, est.opciones.ls);
      est.cli = cli; est.usuario = v.usuario;
      if (!v.puedeLeer) { renderSinAcceso(v); return null; }
      return cargar();
    }).catch(function (e) {
      if (btn) btn.disabled = false; vaciar(res);
      res.appendChild(alerta("error", [e && e.message ? e.message : String(e)])); if (inp) inp.focus();
      return null;
    });
  }

  function desconectar() {
    var conf = est.opciones.confirmar || function (t) { return typeof confirm === "function" ? confirm(t) : true; };
    if (!conf("Se va a quitar la clave de este navegador. También deja de verse la Matriz de Envíos hasta que la conectes de nuevo. ¿Seguimos?")) return;
    G.borrarClave(est.opciones.ls);
    est.cli = null; est.usuario = null; est.datos = null;
    vaciar($("seg-lista"));
    renderConexion();
    anunciar("Se quitó la clave de este navegador.");
  }

  /* opciones (pruebas): { fetch, ls, confirmar } */
  function arrancar(opciones) {
    est.opciones = opciones || {};
    var a = $("seg-actualizar"); if (a) a.addEventListener("click", function () { var e = $("seg-error"); if (e) vaciar(e); cargar(); });
    var dsc = $("seg-desconectar"); if (dsc) dsc.addEventListener("click", desconectar);
    return iniciar();
  }

  return { arrancar: arrancar, iniciar: iniciar, conectar: conectar, desconectar: desconectar, cargar: cargar, _est: est };
})();
if (typeof module !== "undefined" && module.exports) module.exports = SEG_APP;
else if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { SEG_APP.arrancar(); });
  else SEG_APP.arrancar();
}
