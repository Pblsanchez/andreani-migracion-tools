/* ==SEG-LIB== Seguimiento de actividades (T-017, D-081) v1.1: lógica pura, sin DOM ni red.
   Lee la tabla Markdown del índice de tareas y la convierte en una lista de tareas.
   Las columnas se reconocen por el nombre del encabezado: el orden no importa. */
var SEG_LIB = (function () {
  "use strict";

  /* Campos que entiende el dashboard y nombres de encabezado que acepta (sin tildes, en minúscula) */
  var CAMPOS = {
    id: ["id", "tarea"],
    titulo: ["titulo", "tarea titulo", "nombre"],
    proceso: ["proceso"],
    estado: ["estado"],
    version: ["version"],
    falta: ["que falta", "falta", "pendiente", "motivo"],
    quien: ["quien la tiene", "responsable", "a cargo"],
    herramienta: ["herramienta", "link", "enlace"],
    fecha: ["ultima actualizacion", "actualizacion", "fecha"]
  };
  var ESTADOS = ["En curso", "En revisión", "Bloqueada", "En pausa", "Cerrada"];
  var VACIO = "—";

  function normal(s) {
    return String(s == null ? "" : s).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[*_`]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  /* Parte una fila "| a | b \| c |" en celdas, respetando las barras escapadas */
  function celdas(linea) {
    var s = linea.trim();
    if (s.charAt(0) === "|") s = s.slice(1);
    if (s.charAt(s.length - 1) === "|" && s.charAt(s.length - 2) !== "\\") s = s.slice(0, -1);
    var out = [], act = "";
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      if (ch === "\\" && s.charAt(i + 1) === "|") { act += "|"; i++; continue; }
      if (ch === "|") { out.push(act.trim()); act = ""; continue; }
      act += ch;
    }
    out.push(act.trim());
    return out;
  }
  function esSeparador(linea) { return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(linea); }

  /* Todas las tablas del texto: [{enc: [...], filas: [[...]]}] */
  function tablas(md) {
    var lineas = String(md || "").replace(/\r\n?/g, "\n").split("\n"), res = [], i = 0;
    while (i < lineas.length - 1) {
      if (/^\s*\|/.test(lineas[i]) && esSeparador(lineas[i + 1])) {
        var t = { enc: celdas(lineas[i]), filas: [] };
        i += 2;
        while (i < lineas.length && /^\s*\|/.test(lineas[i])) { t.filas.push(celdas(lineas[i])); i++; }
        res.push(t);
      } else i++;
    }
    return res;
  }

  /* Encabezado → {campo: índice de columna} */
  function mapaColumnas(enc) {
    var m = {};
    enc.forEach(function (h, i) {
      var n = normal(h);
      Object.keys(CAMPOS).forEach(function (c) { if (m[c] == null && CAMPOS[c].indexOf(n) >= 0) m[c] = i; });
    });
    return m;
  }

  /* Texto plano de una celda Markdown (sin links, negritas ni código) */
  function plano(s) {
    return String(s || "").replace(/\[([^\]]*)\]\(([^)]*)\)/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/`([^`]*)`/g, "$1").replace(/~~([^~]+)~~/g, "$1").trim();
  }
  function vacio(s) { var p = plano(s); return !p || p === "—" || p === "-" || p === "–"; }

  /* Primer link [texto](url) de una celda */
  function primerLink(s) {
    var m = /\[([^\]]+)\]\(([^)\s]+)\)/.exec(String(s || ""));
    return m ? { texto: m[1].trim(), url: m[2].trim() } : null;
  }
  function urlSegura(u) { return /^https:\/\//i.test(String(u || "")); }

  /* Segmentos para pintar una celda: texto, negrita, código y links (solo https) */
  function segmentos(s) {
    var txt = String(s || ""), out = [], re = /\[([^\]]+)\]\(([^)\s]+)\)|`([^`]+)`|\*\*([^*]+)\*\*/g, ult = 0, m;
    while ((m = re.exec(txt))) {
      if (m.index > ult) out.push({ t: "txt", v: txt.slice(ult, m.index) });
      if (m[1] != null) out.push(urlSegura(m[2]) ? { t: "link", v: plano(m[1]), url: m[2] } : { t: "txt", v: plano(m[1]) });
      else if (m[3] != null) out.push({ t: "code", v: m[3] });
      else out.push({ t: "b", v: plano(m[4]) });
      ult = re.lastIndex;
    }
    if (ult < txt.length) out.push({ t: "txt", v: txt.slice(ult) });
    return out.filter(function (x) { return x.v !== ""; });
  }

  /* Estado canónico (uno de ESTADOS) a partir del texto de la celda; null si no se reconoce */
  function estadoDe(s) {
    var n = normal(plano(s));
    if (!n) return null;
    var orden = [["cerrada", "Cerrada"], ["cerrado", "Cerrada"], ["bloquead", "Bloqueada"], ["en pausa", "En pausa"],
      ["pausad", "En pausa"], ["en revision", "En revisión"], ["en curso", "En curso"]];
    for (var i = 0; i < orden.length; i++) if (n.indexOf(orden[i][0]) === 0) return orden[i][1];
    for (i = 0; i < orden.length; i++) if (n.indexOf(orden[i][0]) >= 0) return orden[i][1];
    return null;
  }

  /* ¿La tabla es la de tareas? Debe tener al menos ID y Estado */
  function esTablaTareas(t) { var m = mapaColumnas(t.enc); return m.id != null && m.estado != null; }

  /* Índice → { tareas: [...], columnas: {campo: true}, faltan: [campos] } (null si no hay tabla de tareas) */
  function leerIndice(md, urlBaseFichas) {
    var t = tablas(md).filter(esTablaTareas)[0];
    if (!t) return null;
    var m = mapaColumnas(t.enc), tareas = [];
    t.filas.forEach(function (f) {
      function celda(c) { return m[c] != null && f[m[c]] != null ? f[m[c]] : ""; }
      var idCel = celda("id"), link = primerLink(idCel), id = plano(idCel);
      if (!id) return;
      var ficha = null;
      if (link && urlBaseFichas) ficha = urlSegura(link.url) ? link.url : urlBaseFichas + link.url.replace(/^\.\//, "");
      var herr = primerLink(celda("herramienta"));
      tareas.push({
        id: id, ficha: ficha,
        titulo: celda("titulo"), proceso: vacio(celda("proceso")) ? "" : plano(celda("proceso")),
        estadoTxt: celda("estado"), estado: estadoDe(celda("estado")),
        version: vacio(celda("version")) ? "" : plano(celda("version")),
        falta: vacio(celda("falta")) ? "" : celda("falta"),
        quien: vacio(celda("quien")) ? "" : plano(celda("quien")),
        herramienta: herr && urlSegura(herr.url) ? { texto: herr.texto, url: herr.url } : null,
        fecha: vacio(celda("fecha")) ? "" : plano(celda("fecha"))
      });
    });
    var columnas = {}, faltan = [];
    Object.keys(CAMPOS).forEach(function (c) { if (m[c] != null) columnas[c] = true; else faltan.push(c); });
    return { tareas: tareas, columnas: columnas, faltan: faltan };
  }

  /* Mensaje de commit "memoria: T-XXX - qué cambió" → {tarea, que} (E2) */
  function leerCommit(msg) {
    var l = String(msg || "").split("\n")[0].trim();
    var m = /^memoria:\s*((?:T-\d{3,})(?:\s*[,\/y+]\s*T-\d{3,})*)\s*[-–—:]\s*(.+)$/i.exec(l);
    if (m) return { tarea: m[1].replace(/\s+/g, " ").toUpperCase(), que: m[2].trim() };
    var m2 = /^memoria:\s*(.+)$/i.exec(l);
    return { tarea: null, que: m2 ? m2[1].trim() : l };
  }

  /* ---------- E2: contadores, filtros y secciones ---------- */
  function esPablo(t) { return normal(t.quien) === "pablo"; }
  /* «Esperan tu OK» (D-081 punto 4, ajuste 2026-11-18): solo En curso o En revisión con Pablo en «Quién la tiene» */
  function esperanOk(tareas) { return tareas.filter(function (t) { return (t.estado === "En curso" || t.estado === "En revisión") && esPablo(t); }); }
  /* Bloqueadas y en pausa (el motivo es «Qué falta») */
  function frenadas(tareas) { return tareas.filter(function (t) { return t.estado === "Bloqueada" || t.estado === "En pausa"; }); }
  function contar(tareas) {
    var c = {}; ESTADOS.forEach(function (e) { c[e] = 0; });
    tareas.forEach(function (t) { if (t.estado) c[t.estado]++; });
    return c;
  }
  var SIN_PROCESO = "(sin proceso)";
  /* Procesos presentes en el índice, en orden de aparición */
  function procesos(tareas) {
    var out = []; tareas.forEach(function (t) { var p = t.proceso || SIN_PROCESO; if (out.indexOf(p) < 0) out.push(p); });
    return out;
  }
  /* f = {proceso: "", estado: ""}; vacío = todos */
  function filtrar(tareas, f) {
    f = f || {};
    return tareas.filter(function (t) {
      if (f.proceso && (t.proceso || SIN_PROCESO) !== f.proceso) return false;
      if (f.estado && t.estado !== f.estado) return false;
      return true;
    });
  }
  /* Filtros en el hash: #p=<proceso>&e=<estado> */
  function filtroDeHash(h) {
    var f = { proceso: "", estado: "" };
    String(h || "").replace(/^#/, "").split("&").forEach(function (par) {
      var i = par.indexOf("="); if (i < 0) return;
      var k = par.slice(0, i), v; try { v = decodeURIComponent(par.slice(i + 1)); } catch (e) { return; }
      if (k === "p") f.proceso = v;
      if (k === "e" && ESTADOS.indexOf(v) >= 0) f.estado = v;
    });
    return f;
  }
  function hashDeFiltro(f) {
    var p = [];
    if (f.proceso) p.push("p=" + encodeURIComponent(f.proceso));
    if (f.estado) p.push("e=" + encodeURIComponent(f.estado));
    return p.length ? "#" + p.join("&") : "";
  }
  /* Fecha ISO de un commit → "dd/mm/aaaa hh:mm" en la hora del navegador */
  function fechaHora(iso) {
    var d = new Date(iso); if (!iso || isNaN(d.getTime())) return "";
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear() + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }
  /* IDs de tarea de un texto "T-901, T-902" */
  function idsTarea(s) { return (String(s || "").match(/T-\d{3,}/gi) || []).map(function (x) { return x.toUpperCase(); }); }

  return { CAMPOS: CAMPOS, ESTADOS: ESTADOS, VACIO: VACIO, SIN_PROCESO: SIN_PROCESO, normal: normal, celdas: celdas, tablas: tablas, mapaColumnas: mapaColumnas,
    plano: plano, segmentos: segmentos, estadoDe: estadoDe, leerIndice: leerIndice, leerCommit: leerCommit, urlSegura: urlSegura,
    esPablo: esPablo, esperanOk: esperanOk, frenadas: frenadas, contar: contar, procesos: procesos, filtrar: filtrar,
    filtroDeHash: filtroDeHash, hashDeFiltro: hashDeFiltro, fechaHora: fechaHora, idsTarea: idsTarea };
})();
if (typeof module !== "undefined" && module.exports) module.exports = SEG_LIB;
