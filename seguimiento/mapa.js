/* ==MAPA== Mapa de soluciones (T-030, D-149): dibuja mapa/mapa.json de la memoria privada.
   Se lee con la clave de GitHub de siempre (la del Seguimiento); sin clave no muestra nada.
   SVG propio, sin librerías. En celular, tarjetas por grupo. #n=<id> abre la ficha de una pieza, #r=<id> un recorrido.
   v0.3 (E2b): flechas tenues en reposo con halo blanco en los cruces; pasar el mouse por una pieza o una flecha
   la resalta; botones de recorrido (mapa/recorridos.json) muestran solo ese circuito. */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var RUTA = "/contents/mapa/mapa.json?ref=main", RUTA_REC = "/contents/mapa/recorridos.json?ref=main";
  var $ = function (id) { return document.getElementById(id); };
  var D = null, L = null, SEL = null, REC = null, NOD = {}, FL = [], NOMBRES = {}, RECS = [], CHIPS = {}, TARJ = {};

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
  function lienzo() { return $("mapa-lienzo").firstChild; }

  /* ---------- carga ---------- */
  function cargar() {
    if (window.MAPA_DEMO) { iniciar(window.MAPA_DEMO, window.MAPA_DEMO.recorridos || [], "Datos de prueba (sintéticos)"); return; }
    var clave = window.SEG_GH && SEG_GH.leerClave();
    if (!clave) { sinClave(); return; }
    var cli = new SEG_GH.Cliente(clave);
    $("mapa-estado").textContent = "Leyendo el mapa…";
    var pRec = cli.get(RUTA_REC, true).then(function (txt) {
      try { return JSON.parse(txt).recorridos || []; } catch (e) { return []; }
    }, function () { return []; });
    Promise.all([cli.get(RUTA, true), pRec]).then(function (r) {
      var d; try { d = JSON.parse(r[0]); } catch (e) { throw new Error("El archivo del mapa no es un JSON válido."); }
      iniciar(d, r[1], "Leído de la memoria");
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
  function iniciar(d, recs, origen) {
    D = d; L = MAPA_LIB.calcular(d);
    d.nodos.forEach(function (n) { NOMBRES[n.id] = n.nombre; });
    RECS = (recs || []).map(function (r) {
      var set = {}; (r.nodos || []).forEach(function (id) { if (NOMBRES[id]) set[id] = 1; });
      return { id: r.id, nombre: r.nombre, que: r.que || "", set: set, n: Object.keys(set).length };
    }).filter(function (r) { return r.id && r.nombre && r.n; });
    $("mapa-estado").hidden = true;
    $("mapa-cuerpo").hidden = false;
    $("mapa-leido").textContent = origen + " · versión " + (d.version || "—") + " · actualizado el " + fecha(d.actualizado);
    var ay = document.querySelector(".mapa-ayuda");
    if (ay) ay.textContent = "Pasá el mouse por una pieza o una flecha para resaltarla; tocá una pieza para ver su ficha (Esc la cierra)." +
      (RECS.length ? " Elegí un recorrido para ver solo ese circuito." : "");
    resumen(); leyenda(); dibujar(); lista(); botonesRec();
    leerHash();
    window.addEventListener("hashchange", leerHash);
  }
  function leerHash() {
    var r = /#r=([\w-]+)/.exec(location.hash), m = /#n=([\w-]+)/.exec(location.hash);
    if (r && recPorId(r[1]) && !(REC && REC.id === r[1])) recorrido(r[1], false);
    if (m && NOD[m[1]] && SEL !== m[1]) elegir(m[1], false);
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
    [["fl", "mapa-punta"], ["fl-act", "mapa-punta-act"], ["fl-rec", "mapa-punta-rec"]].forEach(function (m) {
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
      /* cada flecha: halo blanco (corta las líneas que pasan por debajo), línea y zona sensible ancha e invisible */
      var g = h("svg:g", { class: "fl-g" }, gF);
      h("svg:path", { d: d, class: "fl-halo" }, g);
      var p = h("svg:path", { d: d, class: "fl", "marker-end": "url(#mapa-punta)" }, g);
      var hit = h("svg:path", { d: d, class: "fl-hit" }, g);
      h("svg:title", {}, hit, NOMBRES[e.f.de] + " → " + NOMBRES[e.f.a] + ": " + e.f.rotulo);
      var x = { e: e, g: g, p: p };
      hit.addEventListener("mouseenter", function () { if (!SEL) previaFlecha(x); });
      hit.addEventListener("mouseleave", function () { if (!SEL) limpiar(); });
      return x;
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
      g.addEventListener("mouseenter", function () { if (!SEL) resaltar(o.id); });
      g.addEventListener("mouseleave", function () { if (!SEL) limpiar(); });
      NOD[o.id] = { o: o, g: g, sub: sub };
    });
    svg.addEventListener("click", function (ev) { if (ev.target === svg) cerrar(); });
  }

  function lista() {
    var cont = $("mapa-lista"); cont.textContent = ""; TARJ = {};
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
        TARJ[n.id] = li;
      });
    });
  }

  /* ---------- recorridos ---------- */
  function recPorId(id) { return RECS.filter(function (r) { return r.id === id; })[0]; }
  function botonesRec() {
    var cont = $("mapa-rec");
    if (!cont) {
      cont = h("div", { id: "mapa-rec", class: "mapa-rec" });
      $("mapa-cuerpo").insertBefore(cont, $("mapa-lienzo"));
    }
    cont.textContent = ""; CHIPS = {};
    if (!RECS.length) { cont.hidden = true; return; }
    cont.hidden = false;
    cont.setAttribute("role", "group");
    cont.setAttribute("aria-label", "Recorridos: mostrar solo un circuito");
    h("span", { class: "mapa-ley-tit" }, cont, "Recorridos");
    [{ id: "", nombre: "Todo el mapa", que: "Todas las piezas y conexiones" }].concat(RECS).forEach(function (r) {
      var b = h("button", { type: "button", class: "mapa-chip", "aria-pressed": r.id ? "false" : "true", title: r.que }, cont, r.nombre);
      if (r.id) h("span", { class: "mapa-chip-n" }, b, String(r.n));
      b.addEventListener("click", function () { recorrido(r.id, true); });
      CHIPS[r.id] = b;
    });
    var nota = h("p", { class: "mapa-rec-que", id: "mapa-rec-que", "aria-live": "polite" }, cont, "");
    nota.hidden = true;
  }
  function recorrido(id, conHash) {
    var r = id ? recPorId(id) : null;
    if (id && !r) return;
    if (REC && r && REC.id === r.id) r = null; /* tocar el mismo botón vuelve a todo el mapa */
    REC = r;
    Object.keys(CHIPS).forEach(function (k) { CHIPS[k].setAttribute("aria-pressed", String(r ? k === r.id : k === "")); });
    var nota = $("mapa-rec-que");
    if (nota) { nota.hidden = !r; nota.textContent = r ? r.que : ""; }
    var svg = lienzo();
    if (svg) svg.classList.toggle("rec", !!r);
    Object.keys(NOD).forEach(function (k) { NOD[k].g.classList.toggle("en-rec", !!(r && r.set[k])); });
    FL.forEach(function (f) {
      var en = !!(r && r.set[f.e.s.id] && r.set[f.e.t.id]);
      f.g.classList.toggle("en-rec", en);
      if (!f.g.classList.contains("activa")) f.p.setAttribute("marker-end", en ? "url(#mapa-punta-rec)" : "url(#mapa-punta)");
    });
    Object.keys(TARJ).forEach(function (k) { TARJ[k].hidden = !!(r && !r.set[k]); });
    if (conHash && history.replaceState) {
      var hs = (r ? "#r=" + r.id : "") + (SEL ? (r ? "&" : "#") + "n=" + SEL : "");
      history.replaceState(null, "", hs || location.pathname + location.search);
    }
  }

  /* ---------- resaltado (mouse) y selección (toque) ---------- */
  function marcaFlecha(f, on) {
    f.g.classList.toggle("activa", on);
    f.p.setAttribute("marker-end", on ? "url(#mapa-punta-act)" : (f.g.classList.contains("en-rec") ? "url(#mapa-punta-rec)" : "url(#mapa-punta)"));
    if (on) f.g.parentNode.appendChild(f.g);
  }
  function resaltar(id) {
    var vec = MAPA_LIB.vecinos(L, id), svg = lienzo();
    svg.classList.add("foco");
    Object.keys(NOD).forEach(function (k) {
      var x = NOD[k], n = x.o.n;
      x.g.classList.toggle("activo", k === id);
      x.g.classList.toggle("vecino", !!vec[k]);
      x.sub.textContent = vec[k] ? corto(vec[k].join(" · "), 26) : subtexto(n);
    });
    FL.forEach(function (f) { marcaFlecha(f, f.e.s.id === id || f.e.t.id === id); });
  }
  function previaFlecha(x) {
    var svg = lienzo(), s = x.e.s.id, t = x.e.t.id;
    svg.classList.add("foco");
    Object.keys(NOD).forEach(function (k) {
      var y = NOD[k];
      y.g.classList.remove("activo");
      y.g.classList.toggle("vecino", k === s || k === t);
      y.sub.textContent = k === s ? corto("→ " + x.e.f.rotulo, 26) : k === t ? corto("← " + x.e.f.rotulo, 26) : subtexto(y.o.n);
    });
    FL.forEach(function (f) { marcaFlecha(f, f === x); });
  }
  function limpiar() {
    var svg = lienzo(); if (svg) svg.classList.remove("foco");
    Object.keys(NOD).forEach(function (k) { var x = NOD[k]; x.g.classList.remove("activo", "vecino"); x.sub.textContent = subtexto(x.o.n); });
    FL.forEach(function (f) { marcaFlecha(f, false); });
  }
  function elegir(id, conHash) {
    if (SEL === id) { cerrar(); return; }
    SEL = id;
    resaltar(id);
    ficha(id);
    if (conHash && history.replaceState) history.replaceState(null, "", (REC ? "#r=" + REC.id + "&" : "#") + "n=" + id);
  }
  function cerrar() {
    SEL = null;
    limpiar();
    $("mapa-ficha").hidden = true;
    if (history.replaceState) history.replaceState(null, "", REC ? "#r=" + REC.id : location.pathname + location.search);
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
    var en = RECS.filter(function (r) { return r.set[id]; }).map(function (r) { return r.nombre; });
    if (en.length) h("p", { class: "mapa-tareas" }, c, "Recorridos: " + en.join(" · "));
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
