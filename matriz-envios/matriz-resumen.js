/* ==RESUMEN-START== «Resumen ejecutivo» v2 de la Matriz de Envíos (T-013, D-049): hoja soporte de la presentación de estrategia
   de migración B2C (Esteban Bocco). Reemplaza la v1.9 de T-012 (queda en el historial del repo). Se construye punto por punto:
   1. Criterios de migración: comerciales (D-052, D-056) · 2. Sistémicos y operativos (D-053, D-056) · 3. Plan por olas con su secuenciación (D-054, D-055, D-056) · 4. Servicios por ola.
   Lee los datos ya cargados por el dashboard (window.__MATRIZ_APP__): no pide nada a GitHub ni cambia matriz-app.js.
   Solo B2C (canal por N° de contrato, D-032). Período fijo enero a septiembre 2026 (D-052 a).
   Facturación y rentabilidad = mismo criterio que la pestaña «Ingreso y resultado» con Canal = B2C (D-052 b): suma el monto de cada RSA
   con vínculo único que tiene envíos B2C. Rentabilidad = resultado ÷ facturación (D-052 c). Relevancia estratégica = relato de Esteban Bocco (D-052 d, sin tarjeta desde D-056). */
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
  /* Punto 1: criterios comerciales B2C. Clientes = razones sociales B2C con envíos en el período (mismo criterio que el KPI «Clientes» del dashboard, D-056) */
  function comerciales(base, rsa) {
    var meses = enPeriodo(base.meses, base.mesParcial), regs = base.registros.filter(function (r) { return M.canalDe(r) === "B2C"; });
    var o = { meses: meses, envios: 0, promedioEnvios: 0, contratos: 0, clientes: 0, ingreso: null };
    var con = {}, cli = {};
    regs.forEach(function (r) { var e = M.sumaMeses(r, meses); o.envios += e; if (e > 0) { con[r.contrato] = 1; if (r.cliente) cli[r.cliente] = 1; } });
    o.contratos = Object.keys(con).length;
    o.clientes = Object.keys(cli).length;
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
  /* Tarjeta con dos renglones de cifras (D-056, punto 2.1): renglón 1 clientes, renglón 2 contratos */
  function tarjeta2(titulo, filas, nota) {
    return el("li", { "class": "rs-kpi" }, [el("span", { "class": "rs-kpi__t", text: titulo }),
      el("dl", { "class": "rs-kpi__dos" }, [].concat.apply([], filas.map(function (f) { return [el("dd", { "class": "num", text: f[1] }), el("dt", { text: f[0] })]; }))),
      nota ? el("span", { "class": "rs-kpi__n", text: nota }) : null]);
  }
  /* Punto 2: contenido fijo validado por Pablo (D-053). 2.1 = lámina «Criterios de secuenciación de las olas» (clientes = suma de las olas, D-056);
     2.2 = ciclos de vida (Integra, nov 2026; descripciones de Pablo, D-056); 2.3 = servicios por ola dictados por Pablo (2026-11-13 15:42). */
  var INTEGRACION = [["Integración estándar", "Encomienda Pyme · Encomienda Corporativa · HOP · Envío Nube · Global Pack", 5943, "+1.503"], ["Integración a medida", "MELI · Tarjeta Financiera", 383, "+31"],
    ["Etiqueta estándar", "Encomienda Pyme · Encomienda Corporativa · HOP · Envío Nube · Global Pack · Tarjeta Financiera", 6318, "+1.533"], ["Etiqueta custom", "MELI", 8, "1"]];
  /* Punto 3: línea de tiempo de las 9 olas (D-048, D-054) con los criterios de secuenciación dentro de cada caja (D-055, ex punto 4).
     Datos de la lámina «Criterios de secuenciación de las olas». Global Pack = «Temu» y Envío Nube = «Tienda Nube» de la lámina:
     clientes, contratos y ciclos vienen sumados para las dos (conj: true). Piloto sin información.
     v: [integración, etiqueta, desarrollo ad hoc, clientes, contratos, ciclos de vida, riesgo] */
  var RIESGO = { Bajo: ["bajo", "ok"], Medio: ["medio", "warn"], Alto: ["alto", "warn"], "Crítico": ["critico", "error"] };
  var TN = { v: ["Estándar", "Estándar", "No", "2", "27", "7", "Alto"], conj: true };
  var OLAS = [["Piloto", "Q4 2026", null], ["Encomienda Pyme", "2027", { v: ["Estándar", "Estándar", "No", "+1.000", "3.959", "47", "Bajo"] }],
    ["Encomienda Corporativa", "2027", { v: ["Estándar", "Estándar", "No", "+500", "1.930", "93", "Medio"], conf: true }],
    ["HOP", "2027", { v: ["Estándar", "Estándar", "Sí", "1", "27", "3", "Alto"] }], ["Envío Nube", "2027", TN], ["Global Pack", "2027", TN],
    ["MELI", "2027", { v: ["A medida", "Custom", "Sí", "1", "8", "4", "Crítico"] }], ["Tarjeta Financiera", "2027", { v: ["A medida", "Estándar", "Sí", "+30", "375", "66", "Crítico"] }],
    ["Productos postales", "2027", { v: ["—", "—", "Sí", "—", "—", "—", "—"] }]];
  var CICLOS = [["*B-3 , B-2 , CU-7-DES", "2 visitas más custodia de 7 días descentralizada", 2778], ["*CU-7-DES", "Custodia de 7 días descentralizada", 1514],
    ["**B-3 , B-2**", "2 visitas sin custodia", 1257], ["*B-1 , B-2 , CU-7-DES", "2 visitas más custodia de 7 días descentralizada", 179],
    ["¿B-3 , B-2 , CU-3-DES", "2 visitas más custodia de 3 días descentralizada", 118], ["B-1 , B-2", "2 visitas sin custodia", 66]];
  var CONDICION = "Mayor de 18 años, solicitando exhibición de documento que acredite identidad";
  var SERVICIOS = ["Entrega directa", "Entrega en sucursal", "Entrega en punto de retiro", "Drop off en punto de retiro", "Cambio", "Devolución", "Llega Hoy"];
  var SERV_OLA = [["Encomienda Pyme y Corporativa", [1, 1, 1, 1, 1, 1, 1]], ["HOP", [0, 0, 1, 1, 0, 0, 0]], ["Envío Nube y MELI", [1, 1, 1, 1, 1, 1, 1]], ["Global Pack", [1, 1, 1, 1, 0, 0, 0]]];
  var SERV_DEFINIR = ["Piloto", "Tarjeta Financiera", "Productos postales"];
  function tablaWrap(caption, cls, thead, filas) {
    return el("div", { "class": "table-wrap rs-tabla-wrap" }, [el("table", { "class": "rs-tabla " + cls }, [el("caption", { "class": "sr-only", text: caption }), thead, el("tbody", null, filas)])]);
  }
  function cab(cols) { return el("thead", null, [el("tr", null, cols.map(function (c) { return el("th", { scope: "col", "class": c[1] || null, text: c[0] }); }))]); }
  function tablaCiclos() {
    var tot = 0, max = 0; CICLOS.forEach(function (x) { tot += x[2]; max = Math.max(max, x[2]); });
    var filas = CICLOS.map(function (x) {
      return el("tr", null, [el("th", { scope: "row" }, [el("span", { "class": "rs-codigo", text: x[0] })]), el("td", { "class": "rs-desc", text: x[1] }),
        el("td", { "class": "n" }, [el("span", { "class": "rs-barra-dato" }, [el("span", { "class": "num", text: n(x[2]) }),
          el("span", { "class": "rs-barra-dato__bar", "aria-hidden": "true" }, [el("span", { style: "width:" + (max ? (x[2] / max * 100).toFixed(1) : 0) + "%" })])])])]);
    });
    filas.push(el("tr", { "class": "rs-total" }, [el("th", { scope: "row", text: "Total" }), el("td", { text: "6 ciclos de vida" }), el("td", { "class": "n" }, [el("span", { "class": "num", text: n(tot) })])]));
    return tablaWrap("Los 6 ciclos de vida con más contratos, con su descripción", "rs-ciclos", cab([["Ciclo de vida"], ["Descripción"], ["Contratos", "n"]]), filas);
  }
  function tablaServicios() {
    var filas = SERV_OLA.map(function (x) {
      return el("tr", null, [el("th", { scope: "row", text: x[0] })].concat(x[1].map(function (s, i) {
        return el("td", { "class": "rs-serv__c" }, s ? [el("span", { "class": "rs-si", title: "Incluye " + SERVICIOS[i] }, [U.svgIcon("check", 14), el("span", { "class": "sr-only", text: "Incluye" })])]
          : [el("span", { "class": "rs-no", "aria-hidden": "true", text: "—" }), el("span", { "class": "sr-only", text: "No incluye" })]);
      })));
    });
    SERV_DEFINIR.forEach(function (o) {
      filas.push(el("tr", { "class": "rs-serv__def" }, [el("th", { scope: "row", text: o }), el("td", { colspan: String(SERVICIOS.length) }, [el("span", { "class": "badge badge--neutral", text: "Servicios a definir" })])]));
    });
    return tablaWrap("Servicios a migrar por ola", "rs-serv", cab([["Ola"]].concat(SERVICIOS.map(function (s) { return [s, "rs-serv__h"]; }))), filas);
  }
  function sistemicos() {
    var totInt = INTEGRACION[0][2] + INTEGRACION[1][2];
    var b1 = el("div", { "class": "rs-bloque" }, [el("h3", { text: "2.1 Tipo de integración y etiqueta" }),
      el("ul", { "class": "rs-kpis" }, INTEGRACION.map(function (x) { return tarjeta2(x[0], [["clientes", x[3]], ["contratos", n(x[2])]], x[1] + " · " + pct(x[2] / totInt) + " de los contratos con ola."); })),
      el("p", { "class": "rs-sub", text: "Fuente: lámina «Criterios de secuenciación de las olas». Clientes: suma de las olas de cada grupo; «+» = más de." })]);
    var b2 = el("div", { "class": "rs-bloque" }, [el("h3", { text: "2.2 Ciclos de vida del envío" }),
      el("p", { "class": "rs-destacado" }, [el("strong", { text: "El 90 % de los contratos están configurados bajo 6 ciclos de vida." })]),
      tablaCiclos(),
      el("p", { "class": "rs-condicion" }, [U.svgIcon("info", 16), el("span", null, ["Todos estos ciclos tienen como condición de entrega: ", el("strong", { text: "«" + CONDICION + "»" }), "."])]),
      el("p", { "class": "rs-sub", text: "Fuente: Integra Nov 26 (ciclos de vida por contrato, contratos B2C con imposición 2026)." })]);
    var b3 = el("div", { "class": "rs-bloque" }, [el("h3", { text: "2.3 Servicios a migrar por ola" }), tablaServicios()]);
    return [b1, b2, b3];
  }
  function lineaOlas() {
    var grupos = [], g = null, hayConj = false, hayConf = false;
    OLAS.forEach(function (x) { if (!g || g.p !== x[1]) { g = { p: x[1], olas: [] }; grupos.push(g); } g.olas.push(x); });
    function fila(t, v, cls) { return el("div", { "class": "rs-ola__fila" + (cls ? " " + cls : "") }, [el("dt", { text: t }), el("dd", null, [v])]); }
    function riesgo(v) {
      var r = RIESGO[v];
      if (!r) return el("p", { "class": "rs-ola__riesgo rs-ola__riesgo--nd" }, [el("span", { "class": "rs-ola__riesgo-t", text: "Criticidad" }), el("span", { "class": "badge badge--neutral", text: "Sin dato" })]);
      return el("p", { "class": "rs-ola__riesgo" }, [el("span", { "class": "rs-ola__riesgo-t", text: "Criticidad" }), el("span", { "class": "rs-crit rs-crit--" + r[0] }, [U.svgIcon(r[1], 14), v])]);
    }
    function criterios(d) {
      if (!d) return [el("p", { "class": "rs-linea__sin", text: "Sin información." })];
      if (d.conj) hayConj = true; if (d.conf) hayConf = true;
      var ast = d.conj ? " *" : "";
      var tec = el("dl", { "class": "rs-ola__grupo" }, [
        fila("Integración", el("span", { "class": "rs-tag" + (d.v[0] === "A medida" ? " rs-tag--dest" : ""), text: d.v[0] })),
        fila("Etiqueta", el("span", { "class": "rs-tag" + (d.v[1] === "Custom" ? " rs-tag--dest" : ""), text: d.v[1] })),
        fila("Desarrollo ad hoc", el("span", { "class": "rs-tag" + (d.v[2] === "Sí" ? " rs-tag--dest" : ""), text: d.v[2] }))]);
      var vol = el("dl", { "class": "rs-ola__vol" }, [["Clientes", d.v[3] + ast], ["Contratos", d.v[4] + ast], ["Ciclos de vida", d.v[5] + ast + (d.conf ? " †" : "")]].map(function (x) {
        return el("div", { "class": "rs-ola__cifra" }, [el("dt", { text: x[0] }), el("dd", { "class": "num", text: x[1] })]); }));
      return [tec, vol, riesgo(d.v[6])];
    }
    function claseRiesgo(d) { var r = d && RIESGO[d.v[6]]; return r ? " rs-linea__ola--" + r[0] : ""; }
    var k = 0;
    var linea = el("ol", { "class": "rs-linea", "aria-label": "Línea de tiempo de las olas de migración" }, grupos.map(function (gr, i) {
      return el("li", { "class": "rs-linea__per" + (i === 0 ? " rs-linea__per--piloto" : "") }, [el("span", { "class": "rs-linea__fecha", text: gr.p }),
        el("ul", { "class": "rs-linea__olas" }, gr.olas.map(function (o) { k++;
          return el("li", { "class": "rs-linea__ola" + claseRiesgo(o[2]) }, [el("div", { "class": "rs-linea__cab" }, [el("span", { "class": "rs-linea__n", "aria-hidden": "true", text: k === 1 ? "P" : String(k - 1) }), el("strong", { text: o[0] })])].concat(criterios(o[2]))); }))]);
    }));
    var notas = [el("p", { "class": "rs-sub", text: "La secuencia prioriza integraciones estándar y riesgos bajos al inicio, avanzando hacia desarrollos específicos y operaciones de mayor criticidad. Fuente: lámina «Criterios de secuenciación de las olas»." })];
    if (hayConj) notas.push(el("p", { "class": "rs-sub", text: "* Envío Nube y Global Pack: clientes, contratos y ciclos de vida son el total conjunto de las dos olas (en la lámina, «Tienda Nube + Temu»)." }));
    if (hayConf) notas.push(el("p", { "class": "rs-sub", text: "† Encomienda Corporativa: cantidad de ciclos de vida a confirmar." }));
    return [linea].concat(notas);
  }
  function render(o) {
    var c = $("rs-contenido"); c.innerHTML = "";
    var A = o.c1, I = A.ingreso;
    $("rs-meta").textContent = "Hoja soporte · Estrategia de migración B2C a DMS · Período " + rango(A.meses) + " · Matriz actualizada " + U.fecha(o.actualizado);
    /* 1. Criterios de migración: comerciales (D-056: + Clientes, sin tarjeta «Relevancia estratégica») */
    var kp = el("ul", { "class": "rs-kpis" }, [
      tarjeta("Clientes B2C", n(A.clientes), "Razones sociales con envíos B2C en " + rango(A.meses) + "."),
      tarjeta("Envíos promedio por mes", n(Math.round(A.promedioEnvios)), n(A.envios) + " envíos B2C en " + A.meses.length + " meses (" + rango(A.meses) + ") · " + n(A.contratos) + " contratos con envíos."),
      tarjeta("Facturación B2C por mes", I ? millones(I.promedio) : "—", I ? "Promedio de " + rango(I.meses) + " · total " + millones(I.ingreso) + "." : A.motivo),
      tarjeta("Rentabilidad B2C", I && I.rent != null ? pct(I.rent) : "—", I ? "Resultado ÷ facturación, " + rango(I.meses) + "." : A.motivo)]);
    c.appendChild(seccion("rs-t-com", 1, "Criterios de migración: comerciales (B2C)", "Clientes, envíos, facturación y rentabilidad del canal B2C, que es el que se migra de Integra a DMS.", [kp]));
    c.appendChild(seccion("rs-t-sis", 2, "Criterios de migración: sistémicos y operativos", null, sistemicos()));
    c.appendChild(seccion("rs-t-olas", 3, "Plan de migración por olas", "Piloto y 8 olas, en orden de migración, con sus criterios de secuenciación.", lineaOlas()));
    var pend = [["4", "Servicios a migrar por ola"]];
    c.appendChild(el("section", { "class": "rs-sec", "aria-labelledby": "rs-t-pend" }, [el("h2", { id: "rs-t-pend", text: "En construcción" }),
      el("ul", { "class": "rs-notas" }, pend.map(function (p) { return el("li", { text: p[0] + ". " + p[1] }); }))]));
    /* Notas */
    var notas = ["Envíos y clientes: Matriz de Envíos (Power BI), canal B2C = contratos que no empiezan con 350 ni 351. Meses completos de " + rango(A.meses) + "."];
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
      try { render(calcular(base, A.rsa())); }
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
