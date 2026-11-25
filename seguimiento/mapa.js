/* ==MAPA== Mapa de soluciones (T-030, D-149): dibuja mapa/mapa.json de la memoria privada.
   Se lee con la clave de GitHub de siempre (la del Seguimiento); sin clave no muestra nada.
   SVG propio, sin librerías. En celular, tarjetas por grupo. #n=<id> abre la ficha de una pieza. */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var RUTA = "/contents/mapa/mapa.json?ref=main";
  var $ = function (id) { return document.getElementById(id); };
  var D = null, L = null, SEL = null, NOD = {}, FL = [], NOMBRES = {};

  function h(tag, attrs, padre, txt) {
    var e = tag.indexOf("svg:") === 0 ? document.createElementNS(NS, tag.slice(4)) : document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (txt != null) e.textContent = txt;
    if (padre) padre.appendChild(e);
    return e;
  }
  function fecha(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? m[3] + "/" + m[2] + "/" + m[1] : "sin fecha"; }
  function corto(t, n) { return t.length > n ? t.slice(0, n - 1) + "…" : t; }
  function nombreEstado(id) { var e = (D.estados || []).filter(function (x) { return x.id === id; })[0]; return e ? e.nombre : id; }
  function nombreTipo(id) { var e = (D.tipos || []).filter(function (x) { return x.id === id; })[0]; return e ? e.nombre : id; }
  function subtexto(n) {
    var s = nombreEstado(n.estado);
    if (n.externo) s = "Otro dominio";
    if (n.sinTarea) s += " · sin tarea";
    return s;
  }

  /* ---------- carga ---------- */
  function cargar() {
    if (window.MAPA_DEMO) { iniciar(window.MAPA_DEMO, "Datos de prueba (sintéticos)"); return; }
    var clave = window.SEG_GH && SEG_GH.leerClave();
    if (!clave) { sinClave(); return; }
    var cli = new SEG_GH.Cliente(clave);
    $("mapa-estado").textContent = "Leyendo el mapa…";
    cli.get(RUTA, true).then(function (txt) {
      var d; try { d = JSON.parse(txt); } catch (e) { throw new Error("El archivo del mapa no es un JSON válido."); }
      iniciar(d, "Leído de la memoria");
    }).catch(function (e) {
      if (e.status === 401 || e.sinClave) { sinClave(e.message); return; }
      $("mapa-estado").textContent = e.message || "No se pudo leer el mapa.";
      $("mapa-estado").className = "mapa-aviso mapa-aviso--error";
    });
  }
  function sinClave(msg) {
    var p = $("mapa-estado");
    p.className = "mapa-aviso";
    p.textContent = "";
    h("strong", {}, p, "El mapa es privado.");
    h("span", {}, p, " " + (msg || "Se ve con la misma clave de GitHub que usás en el Seguimiento de actividades.") + " ");
    h("a", { class: "btn btn-primary btn--chico", href: "./" }, p, "Conectar la clave en el Seguimiento");
  }

  /* ---------- armado ---------- */
  function iniciar(d, origen) {
    D = d; L = MAPA_LIB.calcular(d);
    d.nodos.forEach(function (n) { NOMBRES[n.id] = n.nombre; });
    $("mapa-estado").hidden = true;
    $("mapa-cuerpo").hidden = false;
    $("mapa-leido").textContent = origen + " · versión " + (d.version || "—") + " · actualizado el " + fecha(d.actualizado);
    resumen(); leyenda(); dibujar(); lista();
    var m = /#n=([\w-]+)/.exec(location.hash);
    if (m && NOD[m[1]]) elegir(m[1], false);
    window.addEventListener("hashchange", function () {
      var k = /#n=([\w-]+)/.exec(location.hash); if (k && NOD[k[1]]) elegir(k[1], false);
    });
  }

  function resumen() {
    var meta = $("mapa-hero-meta"), c = {};
    D.nodos.forEach(function (n) { c[n.estado] = (c[n.estado] || 0) + 1; });
    meta.textContent = "";
    [[D.nodos.length, "piezas"], [D.flujos.length, "conexiones"], [c.problema || 0, "con problema"]].forEach(function (x) {
      var s = h("span", {}, meta); h("strong", {}, s, String(x[0])); s.appendChild(document.createTextNode(x[1]));
    });
    meta.hidden = false;
  }

  function leyenda() {
    var lg = $("mapa-leyenda"), c = {};
    D.nodos.forEach(function (n) { c[n.estado] = (c[n.estado] || 0) + 1; });
    lg.textContent = "";
    h("span", { class: "mapa-ley-tit" }, lg, "Estado");
    D.estados.forEach(function (e) {
      var s = h("span", { class: "mapa-ley est-" + e.id }, lg);
      h("i", { "aria-hidden": "true" }, s);
      s.appendChild(document.createTextNode(e.nombre + " (" + (c[e.id] || 0) + ")"));
    });
    var s2 = h("span", { class: "mapa-ley mapa-ley--ext" }, lg);
    h("i", { "aria-hidden": "true" }, s2);
    s2.appendChild(document.createTextNode("Otro dominio"));
  }

  function dibujar() {
    var wrap = $("mapa-lienzo"); wrap.textContent = "";
    var svg = h("svg:svg", { viewBox: "0 0 " + Math.ceil(L.W) + " " + Math.ceil(L.H), width: Math.ceil(L.W), height: Math.ceil(L.H),
      role: "group", "aria-label": "Mapa de piezas y conexiones. Cada pieza abre su ficha." }, wrap);
    var defs = h("svg:defs", {}, svg);
    [["fl", "mapa-punta"], ["fl-act", "mapa-punta-act"]].forEach(function (m) {
      var mk = h("svg:marker", { id: m[1], viewBox: "0 0 8 8", refX: "7", refY: "4", markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse" }, defs);
      h("svg:path", { d: "M0,0 L8,4 L0,8 z", class: "punta " + m[0] }, mk);
    });
    L.cabeceras.forEach(function (c) {
      var t = h("svg:text", { x: c.x, y: 22, class: "mapa-cab" }, svg, c.nombre.toUpperCase());
      h("svg:tspan", { class: "mapa-cab-n" }, t, "  " + c.n);
    });
    var gF = h("svg:g", { class: "mapa-flechas" }, svg);
    FL = L.flechas.map(function (e) {
      var d = e.pts.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ");
      var p = h("svg:path", { d: d, class: "fl", "marker-end": "url(#mapa-punta)" }, gF);
      h("svg:title", {}, p, NOMBRES[e.f.de] + " → " + NOMBRES[e.f.a] + ": " + e.f.rotulo);
      return { e: e, p: p };
    });
    var gN = h("svg:g", { class: "mapa-nodos" }, svg);
    L.nodos.forEach(function (o) {
      var n = o.n;
      var g = h("svg:g", { class: "nodo est-" + n.estado + (n.externo ? " externo" : ""), transform: "translate(" + o.x + "," + o.y + ")",
        tabindex: "0", role: "button", "aria-label": n.nombre + ". " + nombreTipo(n.tipo) + ". " + subtexto(n) + ". Abrir ficha" }, gN);
      h("svg:rect", { class: "caja", width: o.w, height: o.h, rx: 8 }, g);
      h("svg:rect", { class: "franja", width: 5, height: o.h - 16, x: 0, y: 8, rx: 2 }, g);
      var t = h("svg:text", { x: 16, y: 22, class: "nom" }, g);
      o.lineas.forEach(function (l, i) { h("svg:tspan", { x: 16, dy: i ? 17 : 0 }, t, l); });
      var sub = h("svg:text", { x: 16, y: 22 + o.lineas.length * 17 + 4, class: "sub" }, g, subtexto(n));
      h("svg:circle", { class: "punto", cx: o.w - 14, cy: 16, r: 5 }, g);
      g.addEventListener("click", function () { elegir(o.id, true); });
      g.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); elegir(o.id, true); } });
      NOD[o.id] = { o: o, g: g, sub: sub };
    });
    svg.addEventListener("click", function (ev) { if (ev.target === svg) cerrar(); });
  }

  function lista() {
    var cont = $("mapa-lista"); cont.textContent = "";
    D.tipos.forEach(function (t) {
      var ns = D.nodos.filter(function (n) { return n.tipo === t.id; });
      if (!ns.length) return;
      var sec = h("section", { class: "mapa-grupo" }, cont);
      h("h3", {}, sec, t.nombre + " (" + ns.length + ")");
      var ul = h("ul", {}, sec);
      ns.forEach(function (n) {
        var li = h("li", {}, ul);
        var b = h("button", { type: "button", class: "mapa-tarj est-" + n.estado + (n.externo ? " externo" : "") }, li);
        h("strong", {}, b, n.nombre);
        h("span", { class: "sub" }, b, subtexto(n));
        h("span", { class: "que" }, b, n.que);
        b.addEventListener("click", function () { elegir(n.id, true); });
      });
    });
  }

  /* ---------- selección y ficha ---------- */
  function elegir(id, conHash) {
    if (SEL === id) { cerrar(); return; }
    SEL = id;
    var vec = MAPA_LIB.vecinos(L, id), svg = $("mapa-lienzo").firstChild;
    svg.classList.add("foco");
    Object.keys(NOD).forEach(function (k) {
      var x = NOD[k], n = x.o.n;
      x.g.classList.toggle("activo", k === id);
      x.g.classList.toggle("vecino", !!vec[k]);
      x.sub.textContent = vec[k] ? corto(vec[k].join(" · "), 26) : subtexto(n);
    });
    FL.forEach(function (f) {
      var a = f.e.s.id === id || f.e.t.id === id;
      f.p.classList.toggle("activa", a);
      f.p.setAttribute("marker-end", a ? "url(#mapa-punta-act)" : "url(#mapa-punta)");
      if (a) f.p.parentNode.appendChild(f.p);
    });
    ficha(id);
    if (conHash && history.replaceState) history.replaceState(null, "", "#n=" + id);
  }
  function cerrar() {
    SEL = null;
    var svg = $("mapa-lienzo").firstChild; if (svg) svg.classList.remove("foco");
    Object.keys(NOD).forEach(function (k) { var x = NOD[k]; x.g.classList.remove("activo", "vecino"); x.sub.textContent = subtexto(x.o.n); });
    FL.forEach(function (f) { f.p.classList.remove("activa"); f.p.setAttribute("marker-end", "url(#mapa-punta)"); });
    $("mapa-ficha").hidden = true;
    if (history.replaceState) history.replaceState(null, "", location.pathname + location.search);
  }
  function ficha(id) {
    var n = NOD[id].o.n, f = $("mapa-ficha"), c = $("mapa-ficha-cuerpo");
    c.textContent = "";
    h("span", { class: "eyebrow" }, c, nombreTipo(n.tipo));
    h("h2", { id: "mapa-ficha-tit" }, c, n.nombre);
    var est = h("p", { class: "mapa-est est-" + n.estado }, c);
    h("i", { "aria-hidden": "true" }, est);
    est.appendChild(document.createTextNode(nombreEstado(n.estado) + " · verificado el " + fecha(n.verificado)));
    if (n.externo) h("p", { class: "mapa-nota" }, c, "Pertenece a otro dominio: se muestra solo como referencia, sin detalle.");
    var dl = h("dl", {}, c);
    [["Qué es", n.que], ["Dónde vive", n.donde], ["Cuándo actúa", n.cuando]].forEach(function (x) { h("dt", {}, dl, x[0]); h("dd", {}, dl, x[1]); });
    if (n.detalle) h("p", { class: "mapa-det est-" + n.estado }, c, n.detalle);
    if (n.tareas && n.tareas.length) h("p", { class: "mapa-tareas" }, c, "Tareas: " + n.tareas.join(" · "));
    var sal = L.flechas.filter(function (e) { return e.s.id === id; }), lle = L.flechas.filter(function (e) { return e.t.id === id; });
    [["Sale hacia", sal, "t"], ["Llega desde", lle, "s"]].forEach(function (g) {
      if (!g[1].length) return;
      h("h3", {}, c, g[0] + " (" + g[1].length + ")");
      var ul = h("ul", { class: "mapa-con" }, c);
      g[1].forEach(function (e) {
        var li = h("li", {}, ul), otro = e[g[2]];
        var b = h("button", { type: "button", class: "mapa-link" }, li, otro.n.nombre);
        h("span", {}, li, e.f.rotulo);
        b.addEventListener("click", function () { elegir(otro.id, true); var x = NOD[otro.id]; if (x) x.g.focus(); });
      });
    });
    f.hidden = false;
  }

  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && SEL) cerrar(); });
  document.addEventListener("DOMContentLoaded", function () {
    $("mapa-ficha-cerrar").addEventListener("click", cerrar);
    cargar();
  });
})();
