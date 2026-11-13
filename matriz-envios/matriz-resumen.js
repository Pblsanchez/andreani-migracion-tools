/* ==RESUMEN-START== «Resumen ejecutivo» v2 de la Matriz de Envíos (T-013, D-049): hoja soporte de la presentación de estrategia
   de migración B2C (Esteban Bocco). Reemplaza la v1.9 de T-012 (queda en el historial del repo). Se construye punto por punto:
   1. Criterios de migración: comerciales (D-052) · 2. Sistémicos y operativos · 3. Plan por olas · 4. Secuenciación · 5. Servicios por ola.
   Lee los datos ya cargados por el dashboard (window.__MATRIZ_APP__): no pide nada a GitHub ni cambia matriz-app.js.
   Solo B2C (canal por N° de contrato, D-032). Período fijo enero a septiembre 2026 (D-052 a).
   Facturación y rentabilidad = mismo criterio que la pestaña «Ingreso y resultado» con Canal = B2C (D-052 b): suma el monto de cada RSA
   con vínculo único que tiene envíos B2C. Rentabilidad = resultado ÷ facturación (D-052 c). Relevancia estratégica = relato de Esteban Bocco (D-052 d). */
var MATRIZ_RESUMEN = (function () {
  "use strict";
  var M = typeof MATRIZ !== "undefined" ? MATRIZ : null, R = typeof MATRIZ_RSA !== "undefined" ? MATRIZ_RSA : null;
  var PERIODO = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"];

  /* ---------- Cálculo (sin DOM, testeable en Node) ---------- */
  function enPeriodo(lista, parcial) { return (lista || []).filter(function (m) { return PERIODO.indexOf(m) >= 0 && m !== parcial; }); }
  function montos(fuentes) {
    if (!fuentes || !R) return null;
    var mm = {};
    Object.keys(fuentes).forEach(function (ruta) { var m = /\/rentabilidad\/(\d{4}-\d{2})\.csv$/.exec(ruta); if (m) mm[m[1]] = R.deCSV(fuentes[ruta]); });
    var ix = R.indexarMontos(mm);
    return ix.meses.length ? ix : null;
  }
  /* Punto 1: criterios comerciales B2C */
  function comerciales(base, rsa) {
    var meses = enPeriodo(base.meses, base.mesParcial), regs = base.registros.filter(function (r) { return M.canalDe(r) === "B2C"; });
    var o = { meses: meses, envios: 0, promedioEnvios: 0, contratos: 0, ingreso: null };
    var con = {};
    regs.forEach(function (r) { var e = M.sumaMeses(r, meses); o.envios += e; if (e > 0) con[r.contrato] = 1; });
    o.contratos = Object.keys(con).length;
    o.promedioEnvios = meses.length ? o.envios / meses.length : 0;
    var ix = rsa && rsa.fuentes ? montos(rsa.fuentes) : null;
    if (!ix) { o.motivo = "Todavía no hay bases de ingreso cargadas (pestaña «Ingreso y resultado»)."; return o; }
    if (!rsa.vinculos) { o.motivo = "Faltan los vínculos razón social → RSA (pestaña «Ingreso y resultado»)."; return o; }
    var V = {}; (rsa.vinculos.vinculos || []).forEach(function (v) { V[v.rs] = v; });
    var mm = enPeriodo(ix.meses, null), ids = {}, b2b = {}, envSin = 0;
    regs.forEach(function (r) {
      var v = V[M.cliDe(r)];
      if (!v || v.interno || !v.rsa || v.rsa.length !== 1 || R.esInterno(v.rsa[0])) { if (!v || !v.interno) envSin += M.sumaMeses(r, meses); return; }
      ids[v.rsa[0]] = 1;
    });
    base.registros.forEach(function (r) {
      if (M.canalDe(r) !== "B2B") return;
      var v = V[M.cliDe(r)]; if (v && v.rsa && v.rsa.length === 1 && ids[v.rsa[0]] && M.sumaMeses(r, meses) > 0) b2b[v.rsa[0]] = 1;
    });
    var I = { meses: mm, ingreso: 0, resultado: 0, rsa: 0, mixtos: 0, ingresoMixtos: 0, envSin: envSin };
    Object.keys(ids).forEach(function (id) {
      var s = R.sumaRsa(ix, id, mm); I.ingreso += s.ingreso; I.resultado += s.resultado; I.rsa++;
      if (b2b[id]) { I.mixtos++; I.ingresoMixtos += s.ingreso; }
    });
    I.promedio = mm.length ? I.ingreso / mm.length : 0;
    I.rent = R.rentab(I.ingreso, I.resultado);
    o.ingreso = I;
    return o;
  }
  function calcular(base, rsa) {
    return { actualizado: base.actualizado, mesParcial: base.mesParcial || null, c1: comerciales(base, rsa) };
  }

  /* ---------- Vista ---------- */
  var U, $, el, n, pct, abierto = false, previo = null, tituloPrevio = "";
  var fmt0 = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
  function millones(x) { return (x < 0 ? "−" : "") + "$ " + fmt0.format(Math.abs(x || 0) / 1e6) + " M"; }
  function mes(m) { return M.mesTxt(m); }
  function rango(ms) { return ms.length ? mes(ms[0]) + " a " + mes(ms[ms.length - 1]) : "sin meses"; }
  function seccion(id, num, titulo, sub, kids) {
    return el("section", { "class": "rs-sec", "aria-labelledby": id }, [el("h2", { id: id }, [el("span", { "class": "rs-num", text: num + ". " }), titulo]), sub ? el("p", { "class": "rs-sub", text: sub }) : null].concat(kids));
  }
  function tarjeta(titulo, valor, nota, pend) {
    return el("li", { "class": "rs-kpi" }, [el("span", { "class": "rs-kpi__t", text: titulo }), el("span", { "class": "rs-kpi__v num", text: valor }),
      nota ? el("span", { "class": "rs-kpi__n", text: nota }) : null, pend ? el("span", { "class": "rs-kpi__n" }, [el("strong", { text: pend })]) : null]);
  }
  function render(o, usuario) {
    var c = $("rs-contenido"); c.innerHTML = "";
    var A = o.c1, I = A.ingreso;
    $("rs-meta").textContent = "Hoja soporte · Estrategia de migración B2C a DMS · Período " + rango(A.meses) + " · Matriz actualizada " + U.fecha(o.actualizado) +
      " · Generado " + U.fecha(new Date().toISOString()) + (usuario ? " por " + usuario : "");
    /* 1. Criterios de migración: comerciales */
    var kp = el("ul", { "class": "rs-kpis" }, [
      tarjeta("Envíos promedio por mes", n(Math.round(A.promedioEnvios)), n(A.envios) + " envíos B2C en " + A.meses.length + " meses (" + rango(A.meses) + ") · " + n(A.contratos) + " contratos con envíos."),
      tarjeta("Facturación B2C por mes", I ? millones(I.promedio) : "—", I ? "Promedio de " + rango(I.meses) + " · total " + millones(I.ingreso) + "." : A.motivo),
      tarjeta("Rentabilidad B2C", I && I.rent != null ? pct(I.rent) : "—", I ? "Resultado ÷ facturación, " + rango(I.meses) + "." : A.motivo),
      tarjeta("Relevancia estratégica", "Relato", "La desarrolla Esteban Bocco en la presentación.")]);
    c.appendChild(seccion("rs-t-com", 1, "Criterios de migración: comerciales (B2C)", "Envíos, facturación y rentabilidad del canal B2C, que es el que se migra de Integra a DMS.", [kp]));
    var pend = [["2", "Criterios de migración: sistémicos y operativos"], ["3", "Plan de migración por olas"], ["4", "Criterios de secuenciación de las olas"], ["5", "Servicios a migrar por ola"]];
    c.appendChild(el("section", { "class": "rs-sec", "aria-labelledby": "rs-t-pend" }, [el("h2", { id: "rs-t-pend", text: "En construcción" }),
      el("ul", { "class": "rs-notas" }, pend.map(function (p) { return el("li", { text: p[0] + ". " + p[1] }); }))]));
    /* Notas */
    var notas = ["Envíos: Matriz de Envíos (Power BI), canal B2C = contratos que no empiezan con 350 ni 351. Meses completos de " + rango(A.meses) + "."];
    if (I) notas.push("Facturación y rentabilidad: base Rentabilidad clientes (Power BI), mismo criterio que la pestaña «Ingreso y resultado» con Canal = B2C: se suma el monto de los " + n(I.rsa) +
      " RSA con vínculo único que tienen envíos B2C. Sin RSA internos (88881, 88882, 99999, 01648).",
      n(I.mixtos) + " de esos RSA también tienen envíos B2B; su monto entra completo (" + millones(I.ingresoMixtos) + " en el período).",
      "Envíos B2C sin vínculo único con un RSA (no suman monto): " + n(I.envSin) + " (" + pct(A.envios ? I.envSin / A.envios : 0) + " de los envíos B2C).");
    c.appendChild(seccion("rs-t-notas", "·", "Notas", null, [el("ul", { "class": "rs-notas" }, notas.map(function (t) { return el("li", { text: t }); }))]));
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
    var d = new Date(); document.title = "Hoja soporte estrategia migracion B2C " + d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
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
  return { calcular: calcular, comerciales: comerciales, PERIODO: PERIODO, abrir: abrir, cerrar: cerrar };
})();
if (typeof module !== "undefined" && module.exports) module.exports = MATRIZ_RESUMEN;
/* ==RESUMEN-END== */
