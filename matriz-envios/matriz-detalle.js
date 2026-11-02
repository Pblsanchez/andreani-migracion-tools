/* ==DETALLE-START== Detalle, exportaciones CSV, importación de contratos y resumen de carga. Recibe el estado del dashboard (D-015: separado de matriz-app.js por tamaño). */
var MATRIZ_DETALLE = function (ctx) {
  "use strict";
  var M = MATRIZ, U = MATRIZ_UI;
  var n = U.n, pct = U.pct, fecha = U.fecha, $ = U.$, el = U.el, svgIcon = U.svgIcon, alerta = U.alerta, toast = U.toast, tabla = U.tabla;
  var ui = ctx.ui, base = null, f = null;
  function linkCliente(x) { return ctx.linkCliente(x); }
  function agrTxt(r) { return M.agrDe(r); }
  function hoyISO() { return ctx.hoyISO(); }
  function aplicarMarca(regs, valor, desc, fid) { return ctx.aplicarMarca(regs, valor, desc, fid); }
  function renderTodo() { return ctx.renderTodo(); }

  function exportarMigracion() {
    var mk = M.migracion(base).marcas, regs = M.filtrar(base, f).slice().sort(M.compararJer);
    function q(v) { v = String(v == null ? "" : v); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
    var lines = [["Canal", "Segmento", "Razón Social", "Tipo de Servicio", "Servicio Agrupado", "Servicio", "N° Contrato", "Migrado a DMS", "Fecha de marca"].map(q).join(";")];
    regs.forEach(function (r) { var m = mk[M.clave(r)]; lines.push([M.canalDe(r), r.segmento, r.cliente, r.tipo, r.agrupado || "", r.servicio, r.contrato, m ? "SI" : "NO", m || ""].map(q).join(";")); });
    descargar("\uFEFF" + lines.join("\r\n"), "migracion-dms-estado-" + hoyISO() + ".csv", "text/csv;charset=utf-8");
    toast("Se exportó el estado de " + n(regs.length) + " registros.");
  }
  function importarContratos(file) {
    var esCSV = /\.(csv|txt)$/i.test(file.name);
    (esCSV ? file.text().then(M.parseCSV) : file.arrayBuffer().then(M.leerXLSX)).then(function (rows) {
      var lista = M.contratosDesdeFilas(rows);
      if (!lista.length) throw new Error("No encontré números de contrato (columna «Contrato» o números de 6 a 12 dígitos).");
      var set = {}; lista.forEach(function (c) { set[c] = 1; });
      var regs = base.registros.filter(function (r) { return set[r.contrato] && M.canalDe(r) === "B2C"; });
      var encontrados = {}; regs.forEach(function (r) { encontrados[r.contrato] = 1; });
      var b2b = {}; base.registros.forEach(function (r) { if (set[r.contrato] && M.canalDe(r) === "B2B") b2b[r.contrato] = 1; });
      var faltan = lista.filter(function (c) { return !encontrados[c] && !b2b[c]; });
      var nb = Object.keys(b2b).length;
      ui.migAviso = { nivel: faltan.length || nb ? "warning" : "ok", contenido: [el("strong", { text: file.name + ": " }), n(lista.length) + " contratos en el archivo, " + n(Object.keys(encontrados).length) + " B2C encontrados en la base" + (nb ? ", " + n(nb) + " son B2B (no se migran, no se marcan)" : "") + (faltan.length ? ", " + n(faltan.length) + " no están en la base (ej.: " + faltan.slice(0, 5).join(", ") + ")." : ".")] };
      if (regs.length) aplicarMarca(regs, true, "importación " + file.name, "mig-importar-btn"); else renderTodo();
    }).catch(function (e) {
      ui.migAviso = { nivel: "error", contenido: [el("strong", { text: "No pude leer el archivo. " }), e && e.message ? e.message : String(e)] };
      renderTodo();
    });
  }

  /* ---------- Detalle ---------- */
  var ultimoDetalle = null;
  function renderDetalle(regs, k) {
    var meses = k.meses, filas = regs.map(function (r) { return { r: r, total: M.sumaMeses(r, meses) }; });
    var key = ui.sortKey, dir = ui.sortDir;
    function val(o) { if (key === "total") return o.total; if (key.indexOf("m:") === 0) return o.r.v[key.slice(2)] || 0; if (key === "cliente") return M.cliDe(o.r); if (key === "segmento") return M.segDe(o.r); if (key === "agrupado") return agrTxt(o.r); if (key === "canal") return M.canalDe(o.r); return o.r[key]; }
    if (key === "jer") filas.sort(function (a, b) { return M.compararJer(a.r, b.r) * dir; });
    else filas.sort(function (a, b) { var x = val(a), y = val(b); return (typeof x === "number" ? x - y : String(x).localeCompare(String(y), "es")) * dir || M.compararJer(a.r, b.r); });
    var pages = Math.max(1, Math.ceil(filas.length / ui.pageSize)); if (ui.page >= pages) ui.page = pages - 1;
    var vis = filas.slice(ui.page * ui.pageSize, (ui.page + 1) * ui.pageSize);
    var cols = [{ t: "Canal", key: "canal", f: function (o) { return M.canalDe(o.r); } }, { t: "Segmento", key: "segmento", f: function (o) { return M.segDe(o.r); } }, { t: "Razón social", key: "cliente", f: function (o) { return linkCliente(M.cliDe(o.r)); } },
      { t: "Tipo de servicio", key: "tipo", f: function (o) { return o.r.tipo; } }, { t: "Servicio agrupado", key: "agrupado", f: function (o) { return agrTxt(o.r); } }, { t: "Servicio", key: "servicio", f: function (o) { return o.r.servicio; } }, { t: "N° contrato", key: "contrato", f: function (o) { return o.r.contrato; }, cls: "num" }]
      .concat(meses.map(function (m) { return { t: M.mesTxt(m) + (m === base.mesParcial ? "*" : ""), key: "m:" + m, n: 1, f: function (o) { return o.r.v[m] ? n(o.r.v[m]) : "—"; } }; }))
      .concat([{ t: "Total", key: "total", n: 1, f: function (o) { return n(o.total); } }]);
    var c = $("detalle"); c.innerHTML = "";
    c.appendChild(tabla(cols, vis, { caption: "Detalle por contrato y servicio", sort: { key: key, dir: dir }, onSort: function (kk) { if (ui.sortKey === kk) ui.sortDir = -ui.sortDir; else { ui.sortKey = kk; ui.sortDir = kk === "total" || kk.indexOf("m:") === 0 ? -1 : 1; } renderDetalle(regs, k); c.querySelector("th[aria-sort]:not([aria-sort='none']) button").focus(); } }));
    $("detalle-sub").textContent = n(filas.length) + " registros (contrato + tipo + servicio; en B2B, también servicio agrupado)" + (base.mesParcial && meses.indexOf(base.mesParcial) >= 0 ? " · * mes parcial" : "");
    var pg = $("pager"); pg.innerHTML = "";
    pg.appendChild(el("span", { text: filas.length ? "Registros " + n(ui.page * ui.pageSize + 1) + "–" + n(Math.min(filas.length, (ui.page + 1) * ui.pageSize)) + " de " + n(filas.length) + " · página " + (ui.page + 1) + " de " + pages : "" }));
    pg.appendChild(el("div", { "class": "pager__btns" }, [
      ui.sortKey !== "jer" ? el("button", { type: "button", "class": "btn btn--ghost btn--small", onclick: function () { ui.sortKey = "jer"; ui.sortDir = 1; ui.page = 0; renderDetalle(regs, k); } }, ["Volver al orden jerárquico"]) : null,
      el("button", { type: "button", "class": "btn btn--ghost btn--small", disabled: ui.page === 0, onclick: function () { ui.page--; renderDetalle(regs, k); } }, ["Anterior"]),
      el("button", { type: "button", "class": "btn btn--ghost btn--small", disabled: ui.page >= pages - 1, onclick: function () { ui.page++; renderDetalle(regs, k); } }, ["Siguiente"])
    ]));
    ultimoDetalle = { filas: filas, meses: meses };
  }
  function exportarCSV() {
    if (!ultimoDetalle) return;
    var meses = ultimoDetalle.meses, mk = M.migracion(base).marcas;
    function q(v) { v = String(v == null ? "" : v); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
    var lines = [["Canal", "Segmento", "Razón Social", "Tipo de Servicio", "Servicio Agrupado", "Servicio", "N° Contrato"].concat(meses.map(M.mesTxt), ["Total", "Migrado a DMS"]).map(q).join(";")];
    ultimoDetalle.filas.forEach(function (o) { lines.push([M.canalDe(o.r), o.r.segmento, o.r.cliente, o.r.tipo, o.r.agrupado || "", o.r.servicio, o.r.contrato].concat(meses.map(function (m) { return o.r.v[m] || 0; }), [o.total, mk[M.clave(o.r)] ? "SI" : "NO"]).map(q).join(";")); });
    descargar("\uFEFF" + lines.join("\r\n"), "matriz-envios-filtrado-" + hoyISO() + ".csv", "text/csv;charset=utf-8");
    toast("Se exportaron " + n(ultimoDetalle.filas.length) + " registros a CSV.");
  }
  function descargar(contenido, nombre, tipo) {
    var blob = new Blob([contenido], { type: tipo }), url = URL.createObjectURL(blob);
    var a = el("a", { href: url, download: nombre }); document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
  }

  function mostrarResumen(parsed, nombre) {
    var res = $("modal-resultado"), pend; res.innerHTML = "";
    var esDemo = !base;
    var d = base ? M.diferencias(base, parsed) : { nuevos: [], cambios: [], mesesNuevos: [], ausentes: 0, duplicados: 0, filtrosDistintos: false, registrosDescarga: parsed.registros.length, tiposDeducidos: 0 };
    var suma = parsed.control.sumaDetalle;
    res.appendChild(el("h3", { text: "Resumen de la descarga" }));
    var items = esDemo
      ? [[parsed.registros.length, "registros en la descarga"], [parsed.meses.length, "meses (" + M.mesTxt(parsed.meses[0]) + " a " + M.mesTxt(parsed.meses[parsed.meses.length - 1]) + ")"], [suma, "envíos en total"]]
      : [[d.nuevos.length, "registros nuevos"], [d.mesesNuevos.length, "meses nuevos" + (d.mesesNuevos.length ? " (" + d.mesesNuevos.map(M.mesTxt).join(", ") + ")" : "")], [d.cambios.length, "valores que cambian"],
         [d.registrosDescarga, "registros en la descarga"], [d.ausentes, "registros de la base que no vienen (se conservan)"], [suma, "envíos en la descarga"]];
    res.appendChild(el("ul", { "class": "summary" }, items.map(function (x) { return el("li", null, [el("b", { text: n(x[0]) }), el("span", { text: x[1] })]); })));
    var c = parsed.control;
    if (c.cuadra === true) res.appendChild(alerta("ok", [el("strong", { text: "Los totales cuadran. " }), "La suma del detalle (" + n(c.sumaDetalle) + ") coincide con el total general del archivo."]));
    else if (c.cuadra === false) res.appendChild(alerta("error", [el("strong", { text: "Los totales no cuadran. " }), "Suma del detalle: " + n(c.sumaDetalle) + " · total general del archivo: " + n(c.totalGeneral) + ". Revisá la descarga antes de seguir."]));
    else res.appendChild(alerta("warning", ["No encontré la fila de total general para controlar la suma (" + n(c.sumaDetalle) + " envíos en el detalle)."]));
    var pcn = { B2B: 0, B2C: 0 }; parsed.registros.forEach(function (r) { pcn[M.canalDe(r)]++; });
    res.appendChild(el("p", { "class": "panel__sub", text: "Canal" + (parsed.conCanal ? " (columna «Canal»)" : " (por N° de contrato: 350/351 = B2B)") + ": " + n(pcn.B2C) + " registros B2C · " + n(pcn.B2B) + " registros B2B." }));
    if (d.filtrosDistintos) res.appendChild(alerta("warning", [el("strong", { text: "Los filtros de la descarga no coinciden con los de la base. " }), "Base: " + base.filtros + " · Descarga: " + parsed.filtros]));
    else if (parsed.filtros) res.appendChild(el("p", { "class": "panel__sub", text: "Filtros de la descarga: " + parsed.filtros }));
    if (d.duplicados) res.appendChild(alerta("warning", [n(d.duplicados) + " registros repetidos en la descarga (misma clave): se toma el primero."]));
    if (parsed.fillDown) res.appendChild(alerta("info", ["Las etiquetas venían en blanco en las filas repetidas: se completaron hacia abajo."]));
    if (parsed.sinTipo) res.appendChild(alerta("info", [el("strong", { text: "La descarga no trae la columna «Tipo de Servicio». " }),
      esDemo ? "Los registros quedan como «" + M.NO_INF + "». Si una descarga posterior la trae, se completa sola sin duplicar registros."
        : n(d.tiposDeducidos) + " de " + n(parsed.registros.length) + " registros toman el tipo de la base (mismo contrato y servicio); el resto queda como «" + M.NO_INF + "»."]));
    if (parsed.sinAgrupado) res.appendChild(alerta("info", [el("strong", { text: "La descarga no trae la columna «Servicio Agrupado». " }),
      esDemo ? "Los registros quedan como «(Agrupado no informado)». Si una descarga posterior la trae, se completa sola."
        : n(d.agrupadosDeducidos || 0) + " de " + n(parsed.registros.length) + " registros toman el servicio agrupado de la base (mismo tipo y servicio); el resto queda como «(Agrupado no informado)»."]));
    else if (!esDemo && d.agrupadosCompletados) res.appendChild(alerta("info", [el("strong", { text: "Servicio agrupado: " }), n(d.agrupadosCompletados) + " registros de la base que no lo tenían lo toman de esta descarga (por tipo y servicio). Las marcas de migración no cambian."]));
    var sinCon = parsed.registros.filter(function (r) { return r.contrato === M.SIN_CON; });
    if (sinCon.length) res.appendChild(alerta("warning", [n(sinCon.length) + " filas tienen servicio y envíos pero no tienen segmento, razón social ni contrato (" + n(sinCon.reduce(function (a, r) { return a + r.valores.reduce(function (x, y) { return x + y; }, 0); }, 0)) + " envíos). Se incluyen como «" + M.SIN_CON + "» para que el total cuadre."]));
    if (!esDemo && d.cambios.length) {
      res.appendChild(el("details", { "class": "details-data" }, [el("summary", { text: "Ver valores que cambian (" + n(d.cambios.length) + ")" }),
        el("div", { "class": "table-wrap", style: "margin-top:8px;max-height:240px" }, [tabla([{ t: "Contrato", f: function (x) { return x.contrato; } }, { t: "Servicio", f: function (x) { return x.servicio; } }, { t: "Mes", f: function (x) { return M.mesTxt(x.mes); } }, { t: "Antes", n: 1, f: function (x) { return n(x.antes); } }, { t: "Después", n: 1, f: function (x) { return n(x.despues); } }], d.cambios.slice(0, 200))])]));
    }
    if (esDemo) {
      res.appendChild(alerta("info", ["Todavía no hay matriz en GitHub: esta descarga va a ser la ", el("strong", { text: "base inicial" }), ". Después tocá «Enviar a GitHub» para que la vean todos."]));
      pend = { parsed: parsed, nombre: nombre, modo: "reemplazar" };
    } else {
      var nMarcas = Object.keys(M.migracion(base).marcas).length;
      var grupo = el("fieldset", { "class": "choice", style: "border:0;padding:0;margin:0" }, [el("legend", { "class": "sr-only", text: "Cómo aplicar la descarga" }),
        el("label", null, [el("input", { type: "radio", name: "modo", value: "agregar", checked: !d.filtrosDistintos }), el("span", null, [el("strong", { text: "Agregar a la base" + (d.filtrosDistintos ? ". " : " (recomendado). ") }), "Suma lo nuevo, reemplaza los meses que ya estaban y conserva lo que no viene. Conserva las marcas de migración."])]),
        el("label", null, [el("input", { type: "radio", name: "modo", value: "reemplazar", checked: d.filtrosDistintos }), el("span", null, [el("strong", { text: "Reemplazar la base completa" + (d.filtrosDistintos ? " (recomendado: los filtros son distintos). " : ". ") }), "Descarta la base actual y usa solo esta descarga." + (nMarcas ? " Las " + n(nMarcas) + " marcas de migración se conservan." : "")])])]);
      grupo.addEventListener("change", function (ev) { pend.modo = ev.target.value; $("modal-aplicar").textContent = ev.target.value === "agregar" ? "Agregar a la base" : "Reemplazar base"; });
      res.appendChild(grupo);
      pend = { parsed: parsed, nombre: nombre, modo: d.filtrosDistintos ? "reemplazar" : "agregar" };
    }
    $("modal-aplicar").textContent = pend.modo === "agregar" ? "Agregar a la base" : (esDemo ? "Usar como base" : "Reemplazar base");
    $("modal-aplicar").disabled = false;
    return pend;
  }

  /* Cada llamada toma la base y los filtros actuales del dashboard */
  function con(fn) { return function () { base = ctx.base(); f = ctx.f(); return fn.apply(null, arguments); }; }
  return { renderDetalle: con(renderDetalle), exportarCSV: con(exportarCSV), exportarMigracion: con(exportarMigracion), importarContratos: con(importarContratos), mostrarResumen: con(mostrarResumen) };
};
/* ==DETALLE-END== */
