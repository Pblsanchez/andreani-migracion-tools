/* ==RSA-VISTA-START== Pestaña «Ingreso y resultado» (T-005, D-031, D-036, D-037). Usa MATRIZ (matriz-lib), MATRIZ_UI y MATRIZ_RSA (matriz-rsa-lib).
   Datos: gh.rsa.fuentes = {ruta: CSV} (fuentes/…, D-037) y gh.rsa.vinculos (rsa/vinculos.json). Cambios por ctx.cambiarRSA → «Enviar a GitHub». */
function MATRIZ_RSA_VISTA(ctx) {
  "use strict";
  var M = MATRIZ, U = MATRIZ_UI, R = MATRIZ_RSA, $ = U.$, el = U.el, n = U.n, pct = U.pct, svgIcon = U.svgIcon, alerta = U.alerta, toast = U.toast;
  var NS = "http://www.w3.org/2000/svg", fmt1 = U.fmt1, fmt0 = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
  var ui = ctx.ui, gh = ctx.gh;
  ui.rsaSel = ui.rsaSel || ""; ui.rsaVerTodo = false; ui.rsaCarga = ui.rsaCarga || null; ui.rsaDudasTodas = false;

  /* ---------- Formatos ---------- */
  function ars(x) {
    var a = Math.abs(x || 0), s = x < 0 ? "−" : "";
    if (a >= 1e9) return s + "$ " + fmt0.format(a / 1e6) + " M";
    if (a >= 1e6) return s + "$ " + fmt1.format(a / 1e6) + " M";
    if (a >= 1e3) return s + "$ " + fmt0.format(a / 1e3) + " k";
    return s + "$ " + fmt0.format(a);
  }
  function porEnvio(ing, env) { return env ? "$ " + fmt0.format(ing / env) : "—"; }
  var NIV = { alta: ["success", "Alta"], media: ["warning", "Media"], negativa: ["error", "Negativa"], sin: ["neutral", "Sin ingreso"] };
  function rentBadge(r) { var v = NIV[R.nivel(r)]; return el("span", { "class": "badge badge--" + v[0] }, [v[1] + (r == null ? "" : " · " + pct(r))]); }
  function s(t, a, k) { var e = document.createElementNS(NS, t); for (var x in a || {}) if (a[x] != null) e.setAttribute(x, a[x]); (k || []).forEach(function (c) { e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); }); return e; }

  /* ---------- Datos parseados (se recalculan solo si cambian las fuentes) ---------- */
  var cache = { F: null };
  function datos() {
    var F = gh.rsa.fuentes;
    if (cache.F === F) return cache;
    cache = { F: F, ok: false };
    if (!F) return cache;
    var montos = {};
    Object.keys(F).forEach(function (r) { var m = /\/rentabilidad\/(\d{4}-\d{2})\.csv$/.exec(r); if (m) montos[m[1]] = R.deCSV(F[r]); });
    cache.catalogo = F[R.RUTAS.rsa] ? R.deCSV(F[R.RUTAS.rsa]) : [];
    cache.cat = {}; cache.catalogo.forEach(function (c) { cache.cat[c.ID_RSA] = c; });
    cache.ix = R.indexarMontos(montos);
    cache.puente = F[R.RUTAS.puente] ? R.deCSV(F[R.RUTAS.puente]) : null;
    cache.baseRsa = F[R.RUTAS.baseRsa] ? R.deCSV(F[R.RUTAS.baseRsa]) : null;
    cache.ok = cache.ix.meses.length > 0;
    return cache;
  }
  function nombreRsa(id) { var c = cache.cat && cache.cat[id]; return c ? c.CLIENTE : "(sin nombre)"; }
  /* Razones sociales de toda la matriz con sus envíos (para el vínculo y su calidad) */
  function razonesBase() {
    var o = {}, b = ctx.base(); if (!b) return [];
    b.registros.forEach(function (r) {
      var rs = M.cliDe(r), z = o[rs] = o[rs] || { rs: rs, b2c: 0, b2b: 0 }, t = M.sumaMeses(r, b.meses);
      if (M.canalDe(r) === "B2B") z.b2b += t; else z.b2c += t;
    });
    return Object.keys(o).map(function (k) { return o[k]; });
  }
  function mapaVinc() { var m = {}; ((gh.rsa.vinculos && gh.rsa.vinculos.vinculos) || []).forEach(function (v) { m[v.rs] = v; }); return m; }

  /* ---------- Cálculo de la vista ---------- */
  function mesesMontos() {
    var D = datos(), f = ctx.f();
    var sel = f.meses.length ? D.ix.meses.filter(function (m) { return f.meses.indexOf(m) >= 0; }) : D.ix.meses.slice();
    return sel;
  }
  function calcular(regs) {
    var D = datos(), V = mapaVinc(), meses = mesesMontos(), rsa = {}, sinVinc = 0, envSin = 0;
    regs.forEach(function (r) {
      var rs = M.cliDe(r), v = V[rs], e = 0;
      meses.forEach(function (m) { e += r.v[m] || 0; });
      if (!v || v.interno || v.rsa.length !== 1) { if (!v || !v.interno) { sinVinc++; envSin += e; } return; }
      var id = v.rsa[0]; if (R.esInterno(id)) return;
      var o = rsa[id] = rsa[id] || { id: id, envios: 0, razones: {} };
      o.envios += e; o.razones[rs] = 1;
    });
    var lista = Object.keys(rsa).filter(function (id) { return !ui.rsaSel || id === ui.rsaSel; }).map(function (id) {
      var o = rsa[id], m = R.sumaRsa(D.ix, id, meses);
      o.nombre = nombreRsa(id); o.ingreso = m.ingreso; o.costos = m.costos; o.resultado = m.resultado; o.rent = R.rentab(m.ingreso, m.resultado);
      o.tipo = D.cat[id] ? D.cat[id]["Tipo de cuenta"] : ""; o.razones = Object.keys(o.razones).sort();
      return o;
    }).sort(function (a, b) { return b.ingreso - a.ingreso; });
    var t = { ingreso: 0, costos: 0, resultado: 0, envios: 0 };
    lista.forEach(function (o) { t.ingreso += o.ingreso; t.costos += o.costos; t.resultado += o.resultado; t.envios += o.envios; });
    return { lista: lista, tot: t, meses: meses, sinVinc: sinVinc, envSin: envSin, todos: Object.keys(rsa) };
  }

  /* ---------- Render ---------- */
  function render(regs) {
    var D = datos(), cont = $("rsa-contenido"); cont.innerHTML = "";
    renderCarga();
    $("rsa-secciones").hidden = !D.ok;
    if (!D.ok && ctx.editor()) $("rsa-carga-panel").open = true;
    if (!D.ok) {
      $("ing-periodo").textContent = "";
      cont.appendChild(el("section", { "class": "panel vacio sec sec--first" }, [el("h2", { text: "Todavía no hay bases de ingreso cargadas" }),
        el("p", { text: ctx.editor() ? "Cargá las 3 bases (Envíos y facturación, Base RSA y Rentabilidad) con «Cargar bases de ingreso». Quedan guardadas en el repositorio privado al tocar «Enviar a GitHub»." : "Cuando el editor cargue las bases de ingreso y resultado las vas a ver acá." })]));
      return;
    }
    if (!gh.rsa.vinculos) cont.appendChild(alerta("warning", [el("strong", { text: "Faltan los vínculos razón social → RSA. " }), ctx.editor() ? "Tocá «Recalcular vínculos»." : "Los arma el editor."],
      ctx.editor() ? [botonRecalcular()] : null));
    var C = calcular(regs);
    var notaMes = C.meses.length ? R.mesTxt(C.meses[0]) + " a " + R.mesTxt(C.meses[C.meses.length - 1]) : "sin meses con montos";
    $("ing-periodo").textContent = "Montos: " + notaMes + " (" + C.meses.length + (C.meses.length === 1 ? " mes" : " meses") + "). Los envíos se toman de los mismos meses.";
    if (!C.meses.length) cont.appendChild(alerta("info", ["Los meses elegidos en Período no tienen montos de rentabilidad (hay de " + R.mesTxt(D.ix.meses[0]) + " a " + R.mesTxt(D.ix.meses[D.ix.meses.length - 1]) + ")."]));
    renderFiltroRsa(C);
    renderKpis(C);
    renderTabla(C);
    renderPrio(C);
    renderEvo(C);
    renderCalidad();
  }
  function renderFiltroRsa(C) {
    var c = $("rsa-filtro"); c.innerHTML = "";
    var opts = [el("option", { value: "", text: "Todos los RSA (" + n(C.todos.length) + ")" })];
    C.todos.map(function (id) { return { id: id, nm: nombreRsa(id) }; }).sort(function (a, b) { return a.nm < b.nm ? -1 : 1; })
      .forEach(function (o) { var op = el("option", { value: o.id, text: o.id + " · " + o.nm }); if (o.id === ui.rsaSel) op.selected = true; opts.push(op); });
    if (ui.rsaSel && C.todos.indexOf(ui.rsaSel) < 0) opts.push(el("option", { value: ui.rsaSel, text: ui.rsaSel + " · " + nombreRsa(ui.rsaSel) + " (sin envíos con estos filtros)", selected: "selected" }));
    var sel = el("select", { id: "rsa-sel", "class": "input input--select" }, opts);
    sel.value = ui.rsaSel;
    sel.addEventListener("change", function () { ui.rsaSel = sel.value; ctx.renderTodo(); $("rsa-sel").focus(); });
    c.appendChild(el("label", { "class": "toolbar__label", "for": "rsa-sel", text: "RSA" })); c.appendChild(sel);
  }
  function kpi(icono, t, v, sub, extra) { return el("li", { "class": "kpi kpi--fin" }, [el("span", { "class": "kpi__label" }, [svgIcon(icono, 16), t]), el("span", { "class": "kpi__value num" }, [v]), extra || null, el("span", { "class": "kpi__sub" }, [sub])]); }
  function renderKpis(C) {
    var c = $("rsa-kpis"), t = C.tot, r = R.rentab(t.ingreso, t.resultado); c.innerHTML = "";
    c.appendChild(kpi("trend", "Ingreso", ars(t.ingreso), n(C.lista.length) + " RSA con envíos y montos"));
    c.appendChild(kpi("pie", "Resultado", ars(t.resultado), "Costos " + ars(t.costos)));
    c.appendChild(kpi("star", "Rentabilidad", r == null ? "—" : pct(r), "Resultado ÷ ingreso (no es un promedio)", rentBadge(r)));
    c.appendChild(kpi("box", "Ingreso por envío", porEnvio(t.ingreso, t.envios), n(t.envios) + " envíos de esos RSA en el período"));
  }
  /* Orden de la tabla por RSA: clic en la cabecera. Texto: A→Z primero; números: mayor primero. Vacíos siempre al final */
  var ORDEN = {
    id: { t: "ID RSA", v: function (o) { return o.id; }, txt: 1 }, nombre: { t: "RSA", v: function (o) { return o.nombre; }, txt: 1 },
    razones: { t: "razones sociales", v: function (o) { return o.razones.length; } }, tipo: { t: "tipo de cuenta", v: function (o) { return o.tipo || null; }, txt: 1 },
    envios: { t: "envíos", v: function (o) { return o.envios; } }, ingreso: { t: "ingreso", v: function (o) { return o.ingreso; } },
    resultado: { t: "resultado", v: function (o) { return o.resultado; } }, rent: { t: "rentabilidad", v: function (o) { return o.rent; } },
    porEnvio: { t: "ingreso por envío", v: function (o) { return o.envios ? o.ingreso / o.envios : null; } }
  };
  ui.rsaSort = ui.rsaSort || { key: "ingreso", dir: -1 };
  function ordenar(lista, st) {
    var s = st || ui.rsaSort, d = ORDEN[s.key] || ORDEN.ingreso;
    return lista.slice().sort(function (a, b) {
      var x = d.v(a), y = d.v(b);
      if (x == null || x === "") return y == null || y === "" ? 0 : 1;
      if (y == null || y === "") return -1;
      var r = d.txt ? String(x).localeCompare(String(y), "es", { sensitivity: "base", numeric: true }) : x - y;
      return (r || (b.ingreso - a.ingreso)) * (r ? s.dir : 1);
    });
  }
  function cambiarOrden(key) {
    var s = ui.rsaSort;
    if (s.key === key) s.dir = -s.dir; else { s.key = key; s.dir = ORDEN[key].txt ? 1 : -1; }
    ctx.renderTodo();
    var b = $("rsa-tabla").querySelector("[data-fid='rsa-orden-" + key + "']"); if (b) b.focus();
  }
  function renderTabla(C) {
    var c = $("rsa-tabla"); c.innerHTML = "";
    var lista = ordenar(C.lista), lim = ui.rsaVerTodo ? lista.length : 25, filas = lista.slice(0, lim);
    var s = ui.rsaSort, desc = (ORDEN[s.key] || ORDEN.ingreso).t + (s.dir > 0 ? " (ascendente)" : " (descendente)");
    var tb = U.tabla([
      { t: "ID RSA", key: "id", f: function (o) { return o.id; } }, { t: "RSA", key: "nombre", f: function (o) { return o.nombre; } },
      { t: "Razones sociales de la matriz", key: "razones", f: function (o) { return o.razones.slice(0, 2).join(" · ") + (o.razones.length > 2 ? " y " + (o.razones.length - 2) + " más" : ""); } },
      { t: "Tipo de cuenta", key: "tipo", f: function (o) { return o.tipo || "—"; } },
      { t: "Envíos", key: "envios", n: 1, f: function (o) { return n(o.envios); } }, { t: "Ingreso", key: "ingreso", n: 1, f: function (o) { return ars(o.ingreso); } },
      { t: "Resultado", key: "resultado", n: 1, f: function (o) { return ars(o.resultado); } }, { t: "Rentabilidad", key: "rent", f: function (o) { return rentBadge(o.rent); } },
      { t: "Ingreso por envío", key: "porEnvio", n: 1, f: function (o) { return porEnvio(o.ingreso, o.envios); } }
    ], filas, { caption: "Ingreso y resultado por RSA, ordenado por " + desc + ". Usá los botones de la cabecera para cambiar el orden.", vacio: "No hay RSA con envíos y montos para los filtros elegidos.",
      sort: { key: s.key, dir: s.dir }, onSort: cambiarOrden });
    /* data-fid para devolver el foco al botón después de ordenar. El estado lo anuncia aria-sort del th */
    Array.prototype.forEach.call(tb.querySelectorAll(".th-sort"), function (b, i) {
      b.setAttribute("data-fid", "rsa-orden-" + ["id", "nombre", "razones", "tipo", "envios", "ingreso", "resultado", "rent", "porEnvio"][i]);
    });
    c.appendChild(el("div", { "class": "table-wrap" }, [tb]));
    C = { lista: lista };
    var pie = el("div", { "class": "pager" }, [el("span", { text: "Se muestran " + n(filas.length) + " de " + n(C.lista.length) + " RSA." })]);
    if (C.lista.length > 25) pie.appendChild(el("button", { type: "button", "class": "btn btn--ghost btn--small", id: "rsa-vertodo", onclick: function () { ui.rsaVerTodo = !ui.rsaVerTodo; ctx.renderTodo(); $("rsa-vertodo").focus(); } }, [ui.rsaVerTodo ? "Ver solo los 25 primeros" : "Ver todos"]));
    c.appendChild(pie);
    $("rsa-csv").onclick = function () { exportar(C); };
  }
  function exportar(C) {
    var cab = ["ID RSA", "RSA", "Tipo de cuenta", "Razones sociales", "Envíos", "Ingreso", "Costos", "Resultado", "Rentabilidad", "Ingreso por envío"];
    var rows = C.lista.map(function (o) { return [o.id, o.nombre, o.tipo, o.razones.join(" | "), o.envios, Math.round(o.ingreso), Math.round(o.costos), Math.round(o.resultado), o.rent == null ? "" : (o.rent * 100).toFixed(2).replace(".", ",") + " %", o.envios ? Math.round(o.ingreso / o.envios) : ""]; });
    var blob = new Blob(["\uFEFF" + R.aCSV(cab, rows)], { type: "text/csv;charset=utf-8" }), a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "ingreso-resultado-por-rsa.csv"; document.body.appendChild(a); a.click(); a.remove();
    toast("Se descargó el CSV con " + n(rows.length) + " RSA.");
  }
  /* Matriz de priorización (top 60 por ingreso) en dos vistas del mismo panel: Gráfico y Lista.
     Mucho/poco volumen = envíos por encima/debajo de la mediana de esos 60 RSA (línea punteada del gráfico). */
  ui.prioVista = ui.prioVista || "grafico"; ui.prioSort = ui.prioSort || { key: "ingreso", dir: -1 }; ui.prioSel = ui.prioSel || null;
  /* v1.8.3: la Lista se agrupa por ubicación en la matriz (pedido de Pablo: ver todos los candidatos a piloto juntos). */
  var GRUPOS = [["piloto", "info", "Candidatos a piloto", "Poco volumen: menos envíos que la mediana, con cualquier rentabilidad. Buenos para probar DMS con bajo riesgo."],
    ["cuidado", "success", "Migrar con cuidado", "Mucho volumen y rentabilidad alta (15 % o más). Mayor impacto: planificar bien su migración."],
    ["tarifas", "warning", "Revisar tarifas", "Mucho volumen y rentabilidad media (0 a 15 %) o negativa. Conviene revisar tarifas antes o durante la migración."]];
  function topPrio(C) {
    var l = C.lista.filter(function (o) { return o.envios > 0 && o.ingreso > 0; }).slice(0, 60);
    var e = l.map(function (o) { return o.envios; }).sort(function (a, b) { return a - b; }), k = e.length;
    var med = !k ? 0 : k % 2 ? e[(k - 1) / 2] : (e[k / 2 - 1] + e[k / 2]) / 2;
    l.forEach(function (o) {
      o.nivel = R.nivel(o.rent); o.mucho = o.envios >= med;
      o.cuad = !o.mucho ? "piloto" : o.nivel === "alta" ? "cuidado" : "tarifas";
      o.ubic = !o.mucho ? "Poco volumen: candidato a piloto" : o.nivel === "alta" ? "Mucho volumen y rentable: migrar con cuidado" : "Mucho volumen, rentabilidad baja o negativa: revisar tarifas";
    });
    return { l: l, med: med };
  }
  function renderPrio(C) {
    var c = $("rsa-prio"); c.innerHTML = "";
    var P = topPrio(C), l = P.l;
    if (!l.length) { c.appendChild(el("p", { "class": "panel__sub", text: "Sin RSA con envíos e ingreso para graficar." })); return; }
    var bar = el("div", { "class": "rsa-vistas", role: "group", "aria-label": "Ver la matriz como" });
    [["grafico", "Gráfico", "pie"], ["lista", "Lista", "grid"]].forEach(function (v) {
      bar.appendChild(el("button", { type: "button", "class": "btn btn--small rsa-vistas__btn", id: "prio-ver-" + v[0], "aria-pressed": ui.prioVista === v[0] ? "true" : "false",
        onclick: function () { ui.prioVista = v[0]; ui.prioSel = null; ctx.renderTodo(); $("prio-ver-" + v[0]).focus(); } }, [svgIcon(v[2], 16), v[1]]));
    });
    c.appendChild(bar);
    c.appendChild(el("p", { "class": "panel__sub rsa-vistas__nota", text: n(l.length) + " RSA · mucho volumen = " + n(Math.ceil(P.med)) + " envíos o más (mediana de estos RSA)." }));
    if (ui.prioVista === "lista") renderPrioLista(c, l); else renderPrioGrafico(c, l, P.med);
  }
  function irALista(id) {
    ui.prioVista = "lista"; ui.prioSel = id; ctx.renderTodo();
    var f = document.querySelector("[data-fid='prio-fila-" + id + "']"); if (f) { f.focus(); if (f.scrollIntoView) f.scrollIntoView({ block: "center" }); }
  }
  function renderPrioGrafico(c, l, med) {
    var W = 760, H = 380, L = 64, Rr = 24, T = 16, B = 44, maxE = 0, maxI = 0, yMin = -0.3, yMax = 0.6;
    l.forEach(function (o) { maxE = Math.max(maxE, o.envios); maxI = Math.max(maxI, o.ingreso); });
    function X(v) { return L + (W - L - Rr) * Math.sqrt(v / maxE); }
    function Y(v) { v = Math.max(yMin, Math.min(yMax, v)); return T + (H - T - B) * (yMax - v) / (yMax - yMin); }
    var svg = s("svg", { "class": "chart", viewBox: "0 0 " + W + " " + H, role: "group", "aria-label": "Matriz de priorización de los " + l.length + " RSA con más ingreso: envíos contra rentabilidad. Cada círculo abre su fila en la vista Lista." });
    [-0.2, 0, 0.15, 0.3, 0.45, 0.6].forEach(function (v) { svg.appendChild(s("line", { "class": v === 0 || v === 0.15 ? "axis-line" : "grid-line", x1: L, x2: W - Rr, y1: Y(v), y2: Y(v) })); svg.appendChild(s("text", { x: L - 6, y: Y(v) + 4, "text-anchor": "end" }, [pct(v)])); });
    [0, 0.25, 0.5, 1].forEach(function (p) { var v = maxE * p * p; svg.appendChild(s("text", { x: X(v), y: H - B + 18, "text-anchor": "middle" }, [U.corto(v)])); });
    svg.appendChild(s("line", { "class": "grid-line rsa-mediana", x1: X(med), x2: X(med), y1: T, y2: H - B }));
    svg.appendChild(s("text", { x: X(med) + 4, y: T + 12 }, ["Mediana de envíos"]));
    svg.appendChild(s("text", { x: (L + W - Rr) / 2, y: H - 6, "text-anchor": "middle" }, ["Envíos del período (escala raíz cuadrada)"]));
    l.slice().reverse().forEach(function (o) {
      var cls = { alta: "dot-ok", media: "dot-warn", negativa: "dot-err", sin: "dot-warn" }[o.nivel];
      var g = s("g", { tabindex: "0", role: "button", "class": "rsa-punto", "data-fid": "prio-punto-" + o.id, "aria-label": o.id + " " + o.nombre + ": " + n(o.envios) + " envíos, ingreso " + ars(o.ingreso) + ", rentabilidad " + pct(o.rent) + ". Ver en la lista" });
      g.appendChild(s("title", null, [o.id + " · " + o.nombre + " — " + n(o.envios) + " envíos · " + ars(o.ingreso) + " · " + pct(o.rent) + " (clic: ver en la lista)"]));
      g.appendChild(s("circle", { "class": "dot " + cls, cx: X(o.envios).toFixed(1), cy: Y(o.rent).toFixed(1), r: (4 + 18 * Math.sqrt(o.ingreso / maxI)).toFixed(1) }));
      g.addEventListener("click", function () { irALista(o.id); });
      g.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); irALista(o.id); } });
      svg.appendChild(g);
    });
    c.appendChild(svg);
    c.appendChild(el("ul", { "class": "legend", "aria-label": "Referencias" }, [["dot-ok", "Alta (≥ 15 %)"], ["dot-warn", "Media (0–15 %)"], ["dot-err", "Negativa (< 0)"]].map(function (x) {
      return el("li", null, [el("span", { "class": "sw sw--" + x[0], "aria-hidden": "true" }), x[1]]); })));
  }
  function renderPrioLista(c, l) {
    var tot = 0; l.forEach(function (o) { tot += o.ingreso; });
    c.appendChild(el("div", { "class": "rsa-lista__acc" }, [el("button", { type: "button", "class": "btn btn--secondary btn--small", id: "prio-csv", onclick: function () { exportarPrio(l); } }, [svgIcon("download", 16), "Exportar lista (CSV)"])]));
    GRUPOS.forEach(function (G) {
      var gl = ordenar(l.filter(function (o) { return o.cuad === G[0]; }), ui.prioSort);
      var t = { ing: 0, res: 0, raz: 0, niv: {} }; gl.forEach(function (o) { t.ing += o.ingreso; t.res += o.resultado; t.raz += o.razones.length; t.niv[o.nivel] = (t.niv[o.nivel] || 0) + 1; });
      var hid = "prio-grupo-" + G[0];
      var sec = el("section", { "class": "rsa-grupo", "aria-labelledby": hid });
      sec.appendChild(el("h3", { id: hid, "class": "rsa-grupo__titulo" }, [U.badge(G[1], G[2]), " " + n(gl.length) + " RSA · " + n(t.raz) + " razones sociales · " + ars(t.ing) + " (" + pct(tot ? t.ing / tot : 0) + " del ingreso de la lista)" + (gl.length ? " · Rentabilidad del grupo " + pct(R.rentab(t.ing, t.res)) : "")]));
      var mix = ["alta", "media", "negativa", "sin"].filter(function (k) { return t.niv[k]; }).map(function (k) { return NIV[k][1] + " " + n(t.niv[k]); }).join(" · ");
      sec.appendChild(el("p", { "class": "panel__sub", text: G[3] + (mix ? " Por rentabilidad: " + mix + "." : "") }));
      if (!gl.length) { sec.appendChild(el("p", { "class": "panel__sub", text: "Ningún RSA de la lista está en este grupo." })); c.appendChild(sec); return; }
      var tb = U.tabla([
        { t: "RSA", key: "nombre", f: function (o) { return o.id + " · " + o.nombre; } },
        { t: "Razones sociales", key: "razones", f: function (o) { return el("ul", { "class": "rsa-razones" }, o.razones.map(function (r) { return el("li", { text: r }); })); } },
        { t: "Tipo de cuenta", key: "tipo", f: function (o) { return o.tipo || "—"; } },
        { t: "Envíos", key: "envios", n: 1, f: function (o) { return n(o.envios); } }, { t: "Ingreso", key: "ingreso", n: 1, f: function (o) { return ars(o.ingreso); } },
        { t: "Resultado", key: "resultado", n: 1, f: function (o) { return ars(o.resultado); } },
        { t: "Rentabilidad", key: "rent", f: function (o) { return rentBadge(o.rent); } }
      ], gl, { caption: G[2] + " (matriz de priorización): " + gl.length + " RSA.", sort: ui.prioSort, onSort: function (k) { cambiarOrdenPrio(k, G[0]); } });
      var keys = ["nombre", "razones", "tipo", "envios", "ingreso", "resultado", "rent"];
      Array.prototype.forEach.call(tb.querySelectorAll(".th-sort"), function (b, i) { b.setAttribute("data-fid", "prio-orden-" + G[0] + "-" + keys[i]); });
      var tbody = tb.querySelectorAll("tbody")[0];
      Array.prototype.forEach.call(tbody ? tbody.children : [], function (tr, i) {
        var o = gl[i]; if (!o) return;
        tr.setAttribute("data-fid", "prio-fila-" + o.id); tr.setAttribute("tabindex", "-1");
        if (o.id === ui.prioSel) tr.classList.add("rsa-fila--sel");
      });
      sec.appendChild(el("div", { "class": "table-wrap" }, [tb]));
      c.appendChild(sec);
    });
  }
  function cambiarOrdenPrio(key, grupo) {
    var s = ui.prioSort;
    if (s.key === key) s.dir = -s.dir; else { s.key = key; s.dir = ORDEN[key].txt ? 1 : -1; }
    ctx.renderTodo();
    var b = document.querySelector("[data-fid='prio-orden-" + grupo + "-" + key + "']"); if (b) b.focus();
  }
  function exportarPrio(l) {
    var cab = ["Ubicación en la matriz", "ID RSA", "RSA", "Razones sociales", "Tipo de cuenta", "Envíos", "Ingreso", "Costos", "Resultado", "Rentabilidad", "Nivel de rentabilidad", "Volumen"], rows = [];
    GRUPOS.forEach(function (G) {
      ordenar(l.filter(function (o) { return o.cuad === G[0]; }), ui.prioSort).forEach(function (o) {
        rows.push([G[2], o.id, o.nombre, o.razones.join(" | "), o.tipo, o.envios, Math.round(o.ingreso), Math.round(o.costos), Math.round(o.resultado), (o.rent * 100).toFixed(2).replace(".", ",") + " %", (NIV[o.nivel] || NIV.sin)[1], o.mucho ? "Mucho" : "Poco"]);
      });
    });
    var blob = new Blob(["\uFEFF" + R.aCSV(cab, rows)], { type: "text/csv;charset=utf-8" }), a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "matriz-priorizacion-rsa.csv"; document.body.appendChild(a); a.click(); a.remove();
    toast("Se descargó la lista con " + n(rows.length) + " RSA.");
  }
  function renderEvo(C) {
    var c = $("rsa-evo"); c.innerHTML = "";
    var data = R.porMes(datos().ix, C.lista.map(function (o) { return o.id; }), C.meses);
    if (!data.length) return;
    var W = 760, H = 280, L = 72, Rr = 16, T = 16, B = 36, mx = 1, mn = 0;
    data.forEach(function (d) { mx = Math.max(mx, d.ingreso, d.resultado); mn = Math.min(mn, d.resultado); });
    var bw = (W - L - Rr) / data.length;
    function Y(v) { return T + (H - T - B) * (mx - v) / (mx - mn); }
    var svg = s("svg", { "class": "chart", viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Ingreso y resultado por mes: " + data.map(function (d) { return R.mesTxt(d.mes) + " ingreso " + ars(d.ingreso) + ", resultado " + ars(d.resultado); }).join("; ") });
    [0, 0.25, 0.5, 0.75, 1].forEach(function (p) { var v = mn + (mx - mn) * p; svg.appendChild(s("line", { "class": Math.abs(v) < 1 ? "axis-line" : "grid-line", x1: L, x2: W - Rr, y1: Y(v), y2: Y(v) })); svg.appendChild(s("text", { x: L - 6, y: Y(v) + 4, "text-anchor": "end" }, [ars(v)])); });
    svg.appendChild(s("line", { "class": "axis-line", x1: L, x2: W - Rr, y1: Y(0), y2: Y(0) }));
    data.forEach(function (d, i) {
      var x = L + i * bw, w = bw * 0.36;
      svg.appendChild(s("rect", { "class": "bar-ing", x: (x + bw * 0.12).toFixed(1), y: Y(Math.max(0, d.ingreso)).toFixed(1), width: w.toFixed(1), height: Math.abs(Y(0) - Y(d.ingreso)).toFixed(1) }));
      svg.appendChild(s("rect", { "class": d.resultado < 0 ? "bar-neg" : "bar-res", x: (x + bw * 0.52).toFixed(1), y: Y(Math.max(0, d.resultado)).toFixed(1), width: w.toFixed(1), height: Math.abs(Y(0) - Y(d.resultado)).toFixed(1) }));
      svg.appendChild(s("text", { x: (x + bw / 2).toFixed(1), y: H - B + 18, "text-anchor": "middle" }, [R.mesTxt(d.mes)]));
    });
    c.appendChild(svg);
    c.appendChild(el("ul", { "class": "legend", "aria-label": "Referencias" }, [["bar-ing", "Ingreso"], ["bar-res", "Resultado"], ["bar-neg", "Resultado negativo"]].map(function (x) { return el("li", null, [el("span", { "class": "sw sw--" + x[0], "aria-hidden": "true" }), x[1]]); })));
    c.appendChild(el("details", { "class": "details-data" }, [el("summary", { text: "Ver datos en tabla" }), el("div", { "class": "table-wrap" }, [U.tabla([
      { t: "Mes", f: function (d) { return R.mesTxt(d.mes); } }, { t: "Ingreso", n: 1, f: function (d) { return ars(d.ingreso); } },
      { t: "Costos", n: 1, f: function (d) { return ars(d.costos); } }, { t: "Resultado", n: 1, f: function (d) { return ars(d.resultado); } },
      { t: "Rentabilidad", f: function (d) { return rentBadge(R.rentab(d.ingreso, d.resultado)); } }], data, { caption: "Ingreso y resultado por mes" })])]));
  }

  /* ---------- Calidad del vínculo y «Resolver vínculos» ---------- */
  function botonRecalcular() {
    return el("button", { type: "button", "class": "btn btn--secondary btn--small", id: "rsa-recalcular", onclick: recalcular }, ["Recalcular vínculos"]);
  }
  function recalcular() {
    var D = datos();
    if (!D.puente || !D.baseRsa) { toast("Faltan la hoja de Envíos y facturación o la Base RSA para armar los vínculos."); return; }
    var V = R.vincular(razonesBase(), D.puente, D.baseRsa, gh.rsa.vinculos);
    ctx.cambiarRSA("vinculos", V);
    toast("Vínculos recalculados para " + n(V.vinculos.length) + " razones sociales (los manuales se conservan). Falta «Enviar a GitHub».");
  }
  function renderCalidad() {
    var c = $("rsa-calidad"), rv = $("rsa-resolver"); c.innerHTML = ""; rv.innerHTML = "";
    var V = gh.rsa.vinculos; if (!V) return;
    var raz = razonesBase(), D = datos(), Q = R.calidad(V, raz, D.ix.rsa), du = R.dudas(V, raz);
    var conMontos = {}; V.vinculos.forEach(function (v) { if (v.rsa.length === 1) conMontos[v.rsa[0]] = 1; });
    var sinEnv = D.catalogo.filter(function (r) { return !conMontos[r.ID_RSA] && !R.esInterno(r.ID_RSA); }), ingSinEnv = 0;
    sinEnv.forEach(function (r) { ingSinEnv += R.sumaRsa(D.ix, r.ID_RSA).ingreso; });
    [["success", "OK", pct(Q.pctConRsa), "Envíos con al menos un RSA", n(Q.razones) + " razones sociales de la matriz"],
      ["success", "OK", pct(Q.pctUnico), "Envíos con un RSA único (o internos)", "Solo estos suman montos en la pestaña"],
      [Q.ambiguas ? "warning" : "success", Q.ambiguas ? "Revisar" : "OK", n(Q.ambiguas), "Razones con más de un RSA posible", "Resolver abajo"],
      [Q.sin ? "warning" : "success", Q.sin ? "Revisar" : "OK", n(Q.sin), "Razones sin RSA", "Resolver abajo o marcar como internas"],
      ["info", "Info", n(Q.manuales), "Vínculos manuales", "Se conservan al recalcular"],
      ["info", "Info", n(sinEnv.length), "RSA con montos sin envíos en la matriz", "Ingreso " + ars(ingSinEnv) + " (no se muestra en la pestaña)"]
    ].forEach(function (x) { c.appendChild(el("li", null, [el("div", { "class": "quality__top" }, [el("span", { "class": "quality__n num", text: x[2] }), U.badge(x[0], x[1])]), el("span", { "class": "quality__t", text: x[3] }), el("span", { "class": "quality__x", text: x[4] })])); });
    var vias = Object.keys(Q.porVia).sort().map(function (k) { var v = Q.porVia[k]; return ({ 1: "Hoja de envíos, exacto", 2: "Hoja de envíos, normalizado", 3: "Base RSA, exacto", 4: "Base RSA, normalizado", 6: "Sin cruce", manual: "Manual" }[k] || k) + ": " + n(v.razones) + " (" + pct(Q.envios ? v.envios / Q.envios : 0) + " de los envíos)"; });
    $("rsa-vias").textContent = "Cómo se vinculó: " + vias.join(" · ") + ". Actualizado: " + U.fecha(V.actualizado) + ".";
    if (!ctx.editor()) {
      rv.appendChild(el("p", { "class": "panel__sub", text: n(du.length) + " razones sociales pendientes. Las resuelve el editor." + (du.length ? " Podés descargar el detalle en Excel." : "") }));
      if (du.length) rv.appendChild(el("div", { "class": "toolbar" }, [botonExcel(du)]));
      return;
    }
    rv.appendChild(el("div", { "class": "toolbar" }, du.length ? [botonRecalcular(), botonExcel(du)] : [botonRecalcular()]));
    if (!du.length) { rv.appendChild(el("p", { "class": "panel__sub", text: "No hay vínculos pendientes." })); return; }
    var lim = ui.rsaDudasTodas ? du.length : 15;
    var tb = el("tbody");
    du.slice(0, lim).forEach(function (d, i) { tb.appendChild(filaDuda(d, i)); });
    rv.appendChild(el("div", { "class": "table-wrap" }, [el("table", null, [el("caption", { "class": "sr-only", text: "Razones sociales a resolver, ordenadas por envíos" }),
      el("thead", null, [el("tr", null, ["Razón social", "Envíos", "Situación", "RSA a asignar", "Acción"].map(function (t, j) { return el("th", { scope: "col", "class": j === 1 ? "n" : null, text: t }); }))]), tb])]));
    if (du.length > 15) rv.appendChild(el("button", { type: "button", "class": "btn btn--ghost btn--small", id: "rsa-dudas-todas", onclick: function () { ui.rsaDudasTodas = !ui.rsaDudasTodas; ctx.renderTodo(); $("rsa-dudas-todas").focus(); } }, [ui.rsaDudasTodas ? "Ver solo las 15 primeras" : "Ver las " + n(du.length)]));
  }
  /* v1.8.4: «Descargar Excel» con todas las pendientes (editor y lectores, D-038). El .xlsx se arma en el navegador con matriz-xlsx.js,
     que se carga recién al tocar el botón. Los datos no salen del navegador (D-003, D-035) */
  function botonExcel(du) {
    return el("button", { type: "button", "class": "btn btn--secondary btn--small", id: "rsa-excel", onclick: function () { descargarExcel(du); } }, [svgIcon("download", 16), "Descargar Excel"]);
  }
  function conXlsx(cb) {
    if (typeof MATRIZ_XLSX !== "undefined" && typeof MATRIZ_RSA_XLSX !== "undefined") { cb(); return; }
    var sc = document.createElement("script"); sc.src = "matriz-xlsx.js?v=1.8.4";
    sc.onload = cb; sc.onerror = function () { toast("No pude cargar el generador de Excel. Recargá la página y probá de nuevo."); };
    document.head.appendChild(sc);
  }
  function descargarExcel(du) {
    conXlsx(function () {
      var D = datos(), r = MATRIZ_RSA_XLSX.hojaPendientes(du, D.catalogo || [], D.baseRsa || []);
      MATRIZ_XLSX.descargar(MATRIZ_RSA_XLSX.nombreArchivo(), [r.hoja]);
      toast("Se descargó el Excel con " + n(du.length) + " razones sociales pendientes (" + n(r.conSugeridos) + " con candidatos sugeridos).");
    });
  }
  function filaDuda(d, i) {
    var id = "rsa-duda-" + i, sel = el("select", { id: id, "class": "input input--select", "aria-label": "RSA para " + d.rs });
    function opciones(lista) {
      sel.innerHTML = "";
      sel.appendChild(el("option", { value: "", text: lista.length ? "Elegí un RSA…" : "Sin coincidencias" }));
      lista.forEach(function (x) { sel.appendChild(el("option", { value: x, text: x + " · " + nombreRsa(x) })); });
      sel.appendChild(el("option", { value: "__interno", text: "Es interno (excluir)" }));
    }
    opciones(d.rsa);
    var celda = [sel];
    if (!d.rsa.length) {
      var q = el("input", { type: "search", "class": "input input--select", placeholder: "Buscar código o nombre", "aria-label": "Buscar RSA para " + d.rs });
      q.addEventListener("input", function () { opciones(R.buscarRsa(datos().catalogo, q.value, 15).map(function (r) { return r.ID_RSA; })); });
      celda.unshift(q);
    }
    var btn = el("button", { type: "button", "class": "btn btn--secondary btn--small", "data-fid": "rsa-guardar-" + i, onclick: function () {
      if (!sel.value) { toast("Elegí un RSA o «Es interno»."); sel.focus(); return; }
      var V = JSON.parse(JSON.stringify(gh.rsa.vinculos));
      R.fijarManual(V, d.rs, sel.value === "__interno" ? [] : [sel.value], sel.value === "__interno", gh.usuario);
      ctx.cambiarRSA("vinculos", V);
      toast("Vínculo manual guardado: " + d.rs + " → " + (sel.value === "__interno" ? "interno" : sel.value + " " + nombreRsa(sel.value)) + ". Falta «Enviar a GitHub».");
      var sig = document.querySelector("[data-fid='rsa-guardar-" + i + "']") || $("rsa-recalcular"); if (sig) sig.focus();
    } }, ["Guardar vínculo"]);
    return el("tr", null, [el("td", { text: d.rs }), el("td", { "class": "n", text: n(d.envios) }), el("td", null, [U.badge(d.tipo === "Ambiguo" ? "warning" : "error", d.tipo === "Ambiguo" ? d.rsa.length + " RSA posibles" : "Sin RSA")]),
      el("td", null, [el("div", { "class": "rsa-asignar" }, celda)]), el("td", null, [btn])]);
  }

  /* ---------- «Cargar bases de ingreso» (editor) ---------- */
  var TIPOS = [
    { k: "puente", t: "Envíos y facturación", d: "Usa solo la hoja «Matriz_de_envios» (razón social → solicitante).", hoja: function (h) { return /matriz_de_envios/i.test(h); } },
    { k: "baseRsa", t: "Base RSA (solicitantes)", d: "Solicitante → ID RSA.", hoja: null },
    { k: "rent", t: "Rentabilidad por cliente", d: "Hoja «Base»: ID RSA × mes con ingreso, costos y resultado.", hoja: function (h) { return /^base$/i.test(h); } }
  ];
  function renderCarga() {
    var c = $("rsa-carga"); c.innerHTML = "";
    $("rsa-carga-panel").hidden = !ctx.editor();
    if (!ctx.editor()) return;
    var st = ui.rsaCarga = ui.rsaCarga || {};
    var lista = el("ul", { "class": "rsa-bases" });
    TIPOS.forEach(function (T) {
      var x = st[T.k], id = "rsa-arch-" + T.k;
      var inp = el("input", { type: "file", id: id, accept: ".xlsx", "class": "sr-only", "aria-label": "Elegir " + T.t + " (.xlsx)" });
      inp.addEventListener("change", function () { if (inp.files[0]) leer(T, inp.files[0]); inp.value = ""; });
      var est = !x ? U.badge("info", "Sin elegir", "doc") : x.cargando ? U.badge("info", "Leyendo…", "clock") : x.error ? U.badge("error", "Error") : U.badge("ok", x.resumen);
      lista.appendChild(el("li", null, [el("div", null, [el("strong", { text: T.t }), el("span", { "class": "panel__sub", text: " " + T.d + (x && x.nombre ? " Archivo: " + x.nombre + "." : "") })]),
        el("div", { "class": "rsa-bases__acc" }, [est, inp, el("label", { "class": "btn btn--ghost btn--small", "for": id }, [svgIcon("upload", 16), x ? "Cambiar" : "Elegir archivo"])]),
        x && x.error ? el("p", { "class": "rsa-bases__err", role: "alert", text: x.error }) : null]));
    });
    c.appendChild(lista);
    var listos = TIPOS.filter(function (T) { return st[T.k] && st[T.k].datos; });
    var D = datos(), faltan = TIPOS.filter(function (T) { return !st[T.k] || !st[T.k].datos; }).filter(function (T) { return !D.F || !tieneGuardada(T.k); });
    c.appendChild(el("p", { "class": "panel__sub", text: listos.length ? "Listas: " + listos.map(function (T) { return T.t; }).join(", ") + "." + (faltan.length ? " Falta: " + faltan.map(function (T) { return T.t; }).join(", ") + " (no hay una guardada)." : " Las que no cargues se mantienen como están guardadas.") : "Elegí una o más bases. Las que no cargues se mantienen como están guardadas." }));
    c.appendChild(el("button", { type: "button", "class": "btn btn--primary btn--small", id: "rsa-usar", disabled: !listos.length || faltan.length > 0, onclick: usar }, ["Usar estas bases"]));
  }
  function tieneGuardada(k) { var F = gh.rsa.fuentes || {}; return k === "puente" ? !!F[R.RUTAS.puente] : k === "baseRsa" ? !!F[R.RUTAS.baseRsa] : !!F[R.RUTAS.rsa]; }
  function leer(T, file) {
    ui.rsaCarga[T.k] = { nombre: file.name, cargando: true }; renderCarga();
    file.arrayBuffer().then(function (b) { return R.leerHoja(b, T.hoja); }).then(function (h) {
      var x = { nombre: file.name };
      if (T.k === "puente") { var p = R.puenteDesdeFilas(h.filas); x.datos = p.filas; x.resumen = n(p.filas.length) + " solicitantes"; }
      else if (T.k === "baseRsa") { x.datos = R.baseRsaDesdeFilas(h.filas); var ids = {}; x.datos.forEach(function (r) { ids[r.COD_RSA] = 1; }); x.resumen = n(x.datos.length) + " filas · " + n(Object.keys(ids).length) + " RSA"; }
      else { var r = R.rentabilidadDesdeFilas(h.filas); if (!r.montos.length) throw new Error("La hoja no tiene filas de RSA × mes."); x.datos = r; x.resumen = n(r.rsa.length) + " RSA · " + R.mesTxt(r.meses[0]) + " a " + R.mesTxt(r.meses[r.meses.length - 1]) + " · ingreso " + ars(r.totales.ingreso); }
      ui.rsaCarga[T.k] = x; renderCarga(); $("rsa-arch-" + T.k).focus();
    }).catch(function (e) { ui.rsaCarga[T.k] = { nombre: file.name, error: "No pude leer «" + file.name + "»: " + (e && e.message ? e.message : e) }; renderCarga(); });
  }
  function usar() {
    var st = ui.rsaCarga, nuevos = R.archivosFuentes({ puente: st.puente && st.puente.datos, baseRsa: st.baseRsa && st.baseRsa.datos, rent: st.rent && st.rent.datos });
    var F = {}; Object.keys(gh.rsa.fuentes || {}).forEach(function (r) { F[r] = gh.rsa.fuentes[r]; });
    if (st.rent && st.rent.datos) Object.keys(F).forEach(function (r) { if (r.indexOf(R.RUTAS.mesDir + "/") === 0) delete F[r]; }); /* la rentabilidad nueva reemplaza todos los meses */
    Object.keys(nuevos).forEach(function (r) { F[r] = nuevos[r]; });
    ui.rsaCarga = null;
    ctx.cambiarRSA("fuentes", F);
    var D = datos();
    if (D.puente && D.baseRsa) {
      var V = R.vincular(razonesBase(), D.puente, D.baseRsa, gh.rsa.vinculos), Q = R.calidad(V, razonesBase(), D.ix.rsa);
      ctx.cambiarRSA("vinculos", V);
      toast("Bases listas: " + pct(Q.pctConRsa) + " de los envíos con RSA y " + pct(Q.pctUnico) + " con RSA único. Tocá «Enviar a GitHub» para guardarlas en el repositorio privado.");
    }
    var b = $("btn-enviar"); if (b) b.focus();
  }
  return { render: render, datos: datos, recalcular: recalcular, calcular: calcular, razonesBase: razonesBase };
}
if (typeof module !== "undefined" && module.exports) module.exports = MATRIZ_RSA_VISTA;
/* ==RSA-VISTA-END== */
