/* ==RESUMEN-START== «Resumen ejecutivo» de la Matriz de Envíos (T-012). Pantalla aparte, imprimible / descargable en PDF.
   Lee los datos ya cargados por el dashboard (window.__MATRIZ_APP__): no vuelve a pedir nada a GitHub ni cambia matriz-app.js.
   Universo: todo el negocio, todos los meses de la base, sin filtros. Canal por N° de contrato (D-032).
   Facturación = Ingreso de Rentabilidad por RSA (D-036). Como el ingreso no viene por canal (D-031), cada RSA se reparte
   entre B2C y B2B según sus envíos en los meses con montos: es una ESTIMACIÓN y así se rotula. Clientes internos fuera de rankings (D-016, D-034). */
var MATRIZ_RESUMEN = (function () {
  "use strict";
  var M = typeof MATRIZ !== "undefined" ? MATRIZ : null, R = typeof MATRIZ_RSA !== "undefined" ? MATRIZ_RSA : null;
  var CAN = ["B2C", "B2B"];

  /* ---------- Cálculo (sin DOM, testeable en Node) ---------- */
  function paraRanking(r) { return r.cliente && !M.esInternoReg(r) && r.contrato !== M.SIN_CON; }
  function top(regs, keyFn, meses, lim) {
    return M.agrupar(regs, keyFn, meses).filter(function (x) { return x.envios > 0; }).sort(function (a, b) { return b.envios - a.envios; }).slice(0, lim || 10);
  }
  function montos(fuentes) {
    if (!fuentes || !R) return null;
    var mm = {};
    Object.keys(fuentes).forEach(function (ruta) { var m = /\/rentabilidad\/(\d{4}-\d{2})\.csv$/.exec(ruta); if (m) mm[m[1]] = R.deCSV(fuentes[ruta]); });
    var ix = R.indexarMontos(mm);
    if (!ix.meses.length) return null;
    var cat = {}; (fuentes[R.RUTAS.rsa] ? R.deCSV(fuentes[R.RUTAS.rsa]) : []).forEach(function (c) { cat[c.ID_RSA] = c; });
    return { ix: ix, cat: cat };
  }
  function ingresos(base, regs, mo, vinculos) {
    var V = {}; ((vinculos && vinculos.vinculos) || []).forEach(function (v) { V[v.rs] = v; });
    var meses = mo.ix.meses, porRsa = {};
    var o = { meses: meses, total: 0, resultadoTotal: 0, canal: {}, sinAtribuir: 0, sinAtribuirRsa: 0, rsaConEnvios: 0, mixtos: 0, top: [] };
    CAN.forEach(function (c) { o.canal[c] = { ingreso: 0, resultado: 0, envios: 0 }; });
    regs.forEach(function (r) {
      var v = V[M.cliDe(r)]; if (!v || v.interno || !v.rsa || v.rsa.length !== 1) return;
      var id = v.rsa[0]; if (R.esInterno(id)) return;
      var e = M.sumaMeses(r, meses); if (!e) return;
      var p = porRsa[id] = porRsa[id] || { id: id, B2C: 0, B2B: 0, razones: {} };
      p[M.canalDe(r)] += e; p.razones[M.cliDe(r)] = 1;
    });
    Object.keys(mo.ix.rsa).forEach(function (id) {
      if (R.esInterno(id)) return;
      var s = R.sumaRsa(mo.ix, id, meses), p = porRsa[id];
      o.total += s.ingreso; o.resultadoTotal += s.resultado;
      var env = p ? p.B2C + p.B2B : 0;
      if (!env) { o.sinAtribuir += s.ingreso; if (s.ingreso) o.sinAtribuirRsa++; return; }
      o.rsaConEnvios++; if (p.B2C && p.B2B) o.mixtos++;
      CAN.forEach(function (c) { var q = p[c] / env; o.canal[c].ingreso += s.ingreso * q; o.canal[c].resultado += s.resultado * q; o.canal[c].envios += p[c]; });
      o.top.push({ id: id, nombre: mo.cat[id] ? mo.cat[id].CLIENTE : "(sin nombre)", ingreso: s.ingreso, resultado: s.resultado, rent: R.rentab(s.ingreso, s.resultado),
        envios: env, pB2C: p.B2C / env, razones: Object.keys(p.razones).length });
    });
    o.top.sort(function (a, b) { return b.ingreso - a.ingreso; }); o.top = o.top.slice(0, 10);
    CAN.forEach(function (c) { var x = o.canal[c]; x.rent = R.rentab(x.ingreso, x.resultado); x.porEnvio = x.envios ? x.ingreso / x.envios : null; });
    o.atribuido = o.canal.B2C.ingreso + o.canal.B2B.ingreso;
    return o;
  }
  function calcular(base, rsa) {
    var meses = base.meses.slice(), regs = base.registros, o = { meses: meses, mesParcial: base.mesParcial || null, actualizado: base.actualizado, canal: {}, total: null };
    o.total = M.kpis(base, regs, meses);
    CAN.forEach(function (c) {
      var rc = regs.filter(function (r) { return M.canalDe(r) === c; }), k = M.kpis(base, rc, meses);
      o.canal[c] = { regs: rc, k: k, top: top(rc.filter(paraRanking), M.cliDe, meses, 10) };
    });
    /* Envíos por segmento y por tipo de servicio, abiertos por canal */
    function cruce(keyFn, lim) {
      var g = {};
      regs.forEach(function (r) { var k = keyFn(r), x = g[k] = g[k] || { clave: k, B2C: 0, B2B: 0, total: 0 }, e = M.sumaMeses(r, meses); x[M.canalDe(r)] += e; x.total += e; });
      return Object.keys(g).map(function (k) { return g[k]; }).filter(function (x) { return x.total > 0; }).sort(function (a, b) { return b.total - a.total; }).slice(0, lim);
    }
    o.segmentos = cruce(M.segDe, 12);
    o.tipos = cruce(function (r) { return r.tipo || M.NO_INF; }, 8);
    o.porMes = meses.map(function (m) { var x = { mes: m, B2C: 0, B2B: 0 }; regs.forEach(function (r) { x[M.canalDe(r)] += r.v[m] || 0; }); x.total = x.B2C + x.B2B; return x; });
    var rb = o.canal.B2C;
    o.migracion = M.resumenMigracion(base, rb.regs, meses, rb.k.mesUltimo);
    var mo = rsa && rsa.fuentes ? montos(rsa.fuentes) : null;
    o.ingreso = mo && rsa.vinculos ? ingresos(base, regs, mo, rsa.vinculos) : null;
    o.motivoSinIngreso = !mo ? "Todavía no hay bases de ingreso cargadas (pestaña «Ingreso y resultado»)." : !rsa.vinculos ? "Faltan los vínculos razón social → RSA." : null;
    return o;
  }

  /* ---------- Vista ---------- */
  var U, $, el, n, pct, abierto = false, previo = null, tituloPrevio = "";
  var fmt0 = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
  function millones(x) { return (x < 0 ? "−" : "") + "$ " + fmt0.format(Math.abs(x || 0) / 1e6) + " M"; }
  function pesos(x) { return x == null ? "—" : "$ " + fmt0.format(x); }
  function mes(m) { return M.mesTxt(m); }
  function periodo(o) { return mes(o.meses[0]) + " a " + mes(o.meses[o.meses.length - 1]) + (o.mesParcial ? " (" + mes(o.mesParcial) + " parcial)" : ""); }
  function th(t, num) { return el("th", { scope: "col", "class": num ? "n" : null, text: t }); }
  function tablaSimple(caption, cab, filas, numDesde) {
    return el("div", { "class": "table-wrap" }, [el("table", null, [el("caption", { "class": "sr-only", text: caption }),
      el("thead", null, [el("tr", null, cab.map(function (t, i) { return th(t, i >= numDesde); }))]),
      el("tbody", null, filas.map(function (f) { return el("tr", { "class": f.cls || null }, f.c.map(function (v, i) { return el("td", { "class": i >= numDesde ? "n" : null }, [v instanceof Node ? v : String(v)]); })); }))])]);
  }
  function barra(pB2C) {
    return el("span", { "class": "rs-split", role: "img", "aria-label": "B2C " + pct(pB2C) + ", B2B " + pct(1 - pB2C) }, [
      el("span", { "class": "rs-split__b2c", style: "width:" + (pB2C * 100).toFixed(1) + "%" }), el("span", { "class": "rs-split__b2b", style: "width:" + ((1 - pB2C) * 100).toFixed(1) + "%" })]);
  }
  function tarjeta(titulo, total, b2c, b2b, fmt, nota) {
    var t = (b2c || 0) + (b2b || 0), p = t ? b2c / t : 0;
    return el("li", { "class": "rs-kpi" }, [el("span", { "class": "rs-kpi__t", text: titulo }), el("span", { "class": "rs-kpi__v num", text: fmt(total) }),
      barra(p),
      el("dl", { "class": "rs-kpi__can" }, [el("dt", null, [el("span", { "class": "rs-dot rs-dot--b2c", "aria-hidden": "true" }), "B2C"]), el("dd", { "class": "num", text: fmt(b2c) + " · " + pct(p) }),
        el("dt", null, [el("span", { "class": "rs-dot rs-dot--b2b", "aria-hidden": "true" }), "B2B"]), el("dd", { "class": "num", text: fmt(b2b) + " · " + pct(t ? b2b / t : 0) })]),
      nota ? el("span", { "class": "rs-kpi__n", text: nota }) : null]);
  }
  function seccion(id, titulo, sub, kids) {
    return el("section", { "class": "rs-sec", "aria-labelledby": id }, [el("h2", { id: id, text: titulo }), sub ? el("p", { "class": "rs-sub", text: sub }) : null].concat(kids));
  }
  function grafMeses(o) {
    var NS = "http://www.w3.org/2000/svg", W = 760, H = 220, L = 56, B = 30, T = 10, mx = 1;
    function s(t, a, k) { var e = document.createElementNS(NS, t); for (var x in a) if (a[x] != null) e.setAttribute(x, a[x]); (k || []).forEach(function (c) { e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); }); return e; }
    o.porMes.forEach(function (d) { mx = Math.max(mx, d.total); });
    var bw = (W - L - 8) / o.porMes.length, svg = s("svg", { "class": "chart rs-chart", viewBox: "0 0 " + W + " " + H, role: "img",
      "aria-label": "Envíos por mes y canal: " + o.porMes.map(function (d) { return mes(d.mes) + " B2C " + n(d.B2C) + ", B2B " + n(d.B2B); }).join("; ") });
    [0, 0.5, 1].forEach(function (p) { var y = T + (H - T - B) * (1 - p); svg.appendChild(s("line", { "class": p ? "grid-line" : "axis-line", x1: L, x2: W - 8, y1: y, y2: y })); svg.appendChild(s("text", { x: L - 6, y: y + 4, "text-anchor": "end" }, [U.corto(mx * p)])); });
    o.porMes.forEach(function (d, i) {
      var x = L + i * bw + bw * 0.2, w = bw * 0.6, h1 = (H - T - B) * d.B2C / mx, h2 = (H - T - B) * d.B2B / mx, y0 = H - B, par = d.mes === o.mesParcial;
      svg.appendChild(s("rect", { "class": "rs-b2c", x: x.toFixed(1), y: (y0 - h1).toFixed(1), width: w.toFixed(1), height: h1.toFixed(1), fill: "#d71920", opacity: par ? 0.55 : null }));
      svg.appendChild(s("rect", { "class": "rs-b2b", x: x.toFixed(1), y: (y0 - h1 - h2).toFixed(1), width: w.toFixed(1), height: h2.toFixed(1), fill: "#616a75", opacity: par ? 0.55 : null }));
      svg.appendChild(s("text", { x: (x + w / 2).toFixed(1), y: H - B + 16, "text-anchor": "middle" }, [mes(d.mes) + (par ? "*" : "")]));
    });
    return svg;
  }
  function render(o, usuario) {
    var c = $("rs-contenido"); c.innerHTML = "";
    var K = { B2C: o.canal.B2C.k, B2B: o.canal.B2B.k }, I = o.ingreso;
    $("rs-meta").textContent = "Período " + periodo(o) + " · Matriz actualizada " + U.fecha(o.actualizado) + " · Generado " + U.fecha(new Date().toISOString()) + (usuario ? " por " + usuario : "");
    /* 1. Números por canal */
    var kp = el("ul", { "class": "rs-kpis" }, [
      tarjeta("Clientes", o.total.clientes, K.B2C.clientes, K.B2B.clientes, n, "Razones sociales con envíos. Un cliente con contratos en los dos canales cuenta en ambos; el total no los repite."),
      tarjeta("Contratos", o.total.contratos, K.B2C.contratos, K.B2B.contratos, n, "Contratos con envíos en el período."),
      tarjeta("Envíos", o.total.envios, K.B2C.envios, K.B2B.envios, n, "Promedio mensual: " + n(o.total.promedioMensual) + " (meses completos).")]);
    if (I) kp.appendChild(tarjeta("Facturación (ingreso)", I.total, I.canal.B2C.ingreso, I.canal.B2B.ingreso, millones,
      mes(I.meses[0]) + " a " + mes(I.meses[I.meses.length - 1]) + ". Por canal es una estimación (ver nota). Sin atribuir a canal: " + millones(I.sinAtribuir) + "."));
    c.appendChild(seccion("rs-t-canal", "Números por canal", "B2C es el canal que se migra de Integra a DMS. B2B = contratos que empiezan con 350 o 351; el resto, B2C.", [kp]));
    /* 2. Tabla comparativa */
    var filas = [
      { c: ["Clientes", n(K.B2C.clientes), n(K.B2B.clientes), n(o.total.clientes)] },
      { c: ["Contratos", n(K.B2C.contratos), n(K.B2B.contratos), n(o.total.contratos)] },
      { c: ["Contratos activos en " + (o.total.mesUltimo ? mes(o.total.mesUltimo) : "el último mes"), n(K.B2C.contratosActivos), n(K.B2B.contratosActivos), n(o.total.contratosActivos)] },
      { c: ["Envíos del período", n(K.B2C.envios), n(K.B2B.envios), n(o.total.envios)] },
      { c: ["Envíos promedio por mes", n(K.B2C.promedioMensual), n(K.B2B.promedioMensual), n(o.total.promedioMensual)] },
      { c: ["Envíos por contrato", n(K.B2C.enviosPorContrato), n(K.B2B.enviosPorContrato), n(o.total.enviosPorContrato)] },
      { c: ["Concentración: top 10 clientes", pct(K.B2C.concentracionTop10), pct(K.B2B.concentracionTop10), pct(o.total.concentracionTop10)] }];
    if (I) filas.push({ c: ["Facturación estimada", millones(I.canal.B2C.ingreso), millones(I.canal.B2B.ingreso), millones(I.atribuido) + " (+ " + millones(I.sinAtribuir) + " sin atribuir)"] },
      { c: ["Rentabilidad estimada", pct(I.canal.B2C.rent), pct(I.canal.B2B.rent), pct(R.rentab(I.total, I.resultadoTotal))] },
      { c: ["Ingreso por envío", pesos(I.canal.B2C.porEnvio), pesos(I.canal.B2B.porEnvio), pesos(I.canal.B2C.envios + I.canal.B2B.envios ? I.atribuido / (I.canal.B2C.envios + I.canal.B2B.envios) : null)] });
    c.appendChild(seccion("rs-t-comp", "Comparativo B2C vs B2B", null, [tablaSimple("Comparativo por canal", ["Indicador", "B2C", "B2B", "Total"], filas, 1)]));
    /* 3. Avance de migración */
    var mg = o.migracion;
    c.appendChild(seccion("rs-t-mig", "Avance de la migración a DMS (B2C)", "Según lo marcado en la pestaña «Migración a DMS».", [tablaSimple("Avance de la migración", ["Indicador", "Migrado", "Total B2C", "%"], [
      { c: ["Envíos del período", n(mg.enviosMigrados), n(mg.envios), pct(mg.envios ? mg.enviosMigrados / mg.envios : 0)] },
      { c: ["Contratos completos", n(mg.contratos.completos), n(mg.contratos.total), pct(mg.contratos.total ? mg.contratos.completos / mg.contratos.total : 0)] },
      { c: ["Clientes completos", n(mg.clientes.completos), n(mg.clientes.total), pct(mg.clientes.total ? mg.clientes.completos / mg.clientes.total : 0)] }], 1)]));
    /* 4. Rankings */
    function rk(c2) {
      var tot = K[c2].envios;
      return tablaSimple("Top 10 clientes " + c2 + " por envíos", ["#", "Cliente", "Contratos", "Envíos", "% del canal"], o.canal[c2].top.map(function (x, i) {
        return { c: [i + 1, x.clave, n(x.contratos), n(x.envios), pct(tot ? x.envios / tot : 0)] }; }), 2);
    }
    c.appendChild(seccion("rs-t-rk", "Top 10 clientes por envíos", "Sin clientes internos (" + M.internosTxt() + ").", [
      el("div", { "class": "rs-grid" }, [el("div", null, [el("h3", { text: "B2C (migrable)" }), rk("B2C")]), el("div", null, [el("h3", { text: "B2B" }), rk("B2B")])])]));
    if (I) c.appendChild(seccion("rs-t-rsa", "Top 10 clientes por facturación (RSA)", "RSA = razón social agrupada. Monto del RSA completo; «% B2C» = parte de sus envíos que es B2C.", [
      tablaSimple("Top 10 RSA por ingreso", ["#", "RSA", "Ingreso", "Rentabilidad", "Envíos", "% B2C"], I.top.map(function (x, i) {
        return { c: [i + 1, x.id + " · " + x.nombre, millones(x.ingreso), pct(x.rent), n(x.envios), pct(x.pB2C)] }; }), 2)]));
    c.appendChild(seccion("rs-t-seg", "Envíos por segmento", "Los 12 segmentos con más envíos.", [tablaSimple("Envíos por segmento y canal", ["Segmento", "B2C", "B2B", "Total", "% del total"],
      o.segmentos.map(function (x) { return { c: [x.clave, n(x.B2C), n(x.B2B), n(x.total), pct(o.total.envios ? x.total / o.total.envios : 0)] }; }), 1)]));
    c.appendChild(seccion("rs-t-tipo", "Envíos por tipo de servicio", null, [tablaSimple("Envíos por tipo de servicio y canal", ["Tipo de servicio", "B2C", "B2B", "Total", "% del total"],
      o.tipos.map(function (x) { return { c: [x.clave, n(x.B2C), n(x.B2B), n(x.total), pct(o.total.envios ? x.total / o.total.envios : 0)] }; }), 1)]));
    c.appendChild(seccion("rs-t-mes", "Evolución mensual de envíos por canal", o.mesParcial ? "* " + mes(o.mesParcial) + " es parcial (mes en curso)." : null, [grafMeses(o),
      el("ul", { "class": "legend" }, [el("li", null, [el("span", { "class": "sw rs-dot--b2c", "aria-hidden": "true" }), "B2C"]), el("li", null, [el("span", { "class": "sw rs-dot--b2b", "aria-hidden": "true" }), "B2B"])])]));
    /* 5. Notas */
    var notas = [
      "Fuente de envíos: Matriz de Envíos (Power BI), filtros del export: " + (window.__MATRIZ_APP__ && window.__MATRIZ_APP__.base().filtros || "—") + ".",
      "Los clientes internos cuentan en los totales de volumen y no en los rankings ni en la concentración."];
    if (I) notas.push("Facturación = Ingreso de la base Rentabilidad clientes (Power BI), sin RSA internos (88881, 88882, 99999, 01648). Total " + millones(I.total) + ".",
      "Por canal es una estimación: el ingreso viene por RSA y no por canal, así que el de cada RSA se reparte entre B2C y B2B según sus envíos en los mismos meses. " + n(I.mixtos) + " de " + n(I.rsaConEnvios) + " RSA tienen envíos en los dos canales.",
      "Sin atribuir a canal: " + millones(I.sinAtribuir) + " (" + pct(I.total ? I.sinAtribuir / I.total : 0) + ") de " + n(I.sinAtribuirRsa) + " RSA sin vínculo único con la matriz (ambiguos, sin RSA o sin envíos).");
    else notas.push("Facturación no disponible: " + o.motivoSinIngreso);
    c.appendChild(seccion("rs-t-notas", "Notas", null, [el("ul", { "class": "rs-notas" }, notas.map(function (t) { return el("li", { text: t }); }))]));
  }
  function abrir() {
    var A = window.__MATRIZ_APP__, base = A && A.base();
    previo = document.activeElement; abierto = true;
    document.body.classList.add("modo-resumen"); $("resumen").hidden = false;
    $("rs-pdf").disabled = !base;
    if (!base) { $("rs-contenido").innerHTML = ""; $("rs-meta").textContent = ""; $("rs-contenido").appendChild(U.alerta("info", [el("strong", { text: "Todavía no hay datos cargados. " }), "Conectá GitHub en el dashboard y volvé a abrir el resumen."])); }
    else {
      try { render(calcular(base, A.rsa()), A.gh && A.gh.usuario); }
      catch (e) { $("rs-contenido").innerHTML = ""; $("rs-contenido").appendChild(U.alerta("error", [el("strong", { text: "No se pudo armar el resumen. " }), e && e.message ? e.message : String(e)])); }
    }
    window.scrollTo(0, 0); $("rs-titulo").focus();
  }
  function cerrar() {
    if (!abierto) return; abierto = false;
    document.body.classList.remove("modo-resumen"); $("resumen").hidden = true;
    var b = previo && document.body.contains(previo) ? previo : $("btn-resumen"); if (b && b.focus) b.focus();
  }
  function pdf() {
    tituloPrevio = document.title;
    var d = new Date(); document.title = "Resumen Matriz de Envios " + d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
    U.toast("En la ventana de impresión elegí «Guardar como PDF» como destino.");
    setTimeout(function () { window.print(); }, 50);
  }
  function iniciar() {
    if (typeof document === "undefined" || !document.getElementById("resumen")) return;
    U = MATRIZ_UI; $ = U.$; el = U.el; n = U.n; pct = U.pct;
    $("btn-resumen").addEventListener("click", abrir);
    $("rs-volver").addEventListener("click", cerrar);
    $("rs-pdf").addEventListener("click", pdf);
    window.addEventListener("afterprint", function () { if (tituloPrevio) { document.title = tituloPrevio; tituloPrevio = ""; } });
    document.addEventListener("keydown", function (ev) { if (abierto && ev.key === "Escape" && !document.querySelector(".modal-backdrop[data-open='true']")) cerrar(); });
  }
  iniciar();
  return { calcular: calcular, ingresos: ingresos, abrir: abrir, cerrar: cerrar };
})();
if (typeof module !== "undefined" && module.exports) module.exports = MATRIZ_RESUMEN;
/* ==RESUMEN-END== */
