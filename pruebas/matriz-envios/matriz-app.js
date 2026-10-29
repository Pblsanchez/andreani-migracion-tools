/* ==APP-START== Interfaz del dashboard */
(function () {
  "use strict";
  var M = MATRIZ;
  /* Copia del HTML original, antes de renderizar: se usa para "Descargar dashboard" */
  var HTML_ORIGEN = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;
  var LS_KEY = "andreani.matriz-envios.base.v1";

  var fmt = new Intl.NumberFormat("es-AR");
  var fmt1 = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  function n(x) { return fmt.format(Math.round(x || 0)); }
  function pct(x, signo) { if (x == null || !isFinite(x)) return "—"; var s = fmt1.format(x * 100) + " %"; return signo && x > 0 ? "+" + s : s; }
  function corto(x) { x = Math.round(x); if (Math.abs(x) >= 1e6) return fmt1.format(x / 1e6) + " M"; if (Math.abs(x) >= 1e4) return fmt.format(Math.round(x / 1e3)) + " k"; return fmt.format(x); }
  function fecha(iso) { try { return new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }); } catch (e) { return iso; } }
  function $(id) { return document.getElementById(id); }
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (attrs[k] == null || attrs[k] === false) continue;
      if (k === "text") e.textContent = attrs[k];
      else if (k === "html") e.innerHTML = attrs[k];
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k] === true ? "" : attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }
  var ICON = {
    box: "M21 8 12 3 3 8v8l9 5 9-5V8Zm-9 10.7L5 15V9.3l7 3.9v5.5Zm1-7.2L6.1 7.7 12 4.4l6.9 3.3L13 11.5Z",
    user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.3 0-8 1.7-8 5v1h16v-1c0-3.3-4.7-5-8-5Z",
    doc: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm4 18H6V4h7v5h5v11Z",
    cal: "M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 16H5V10h14v10Z",
    trend: "m16 6 2.3 2.3-4.9 4.9-4-4L2 16.6 3.4 18l6-6 4 4 6.3-6.3L22 12V6h-6Z",
    pie: "M11 2v20a10 10 0 0 1 0-20Zm2 0v9h9a10 10 0 0 0-9-9Zm0 11v9a10 10 0 0 0 9-9h-9Z",
    star: "m12 17.3 6.2 3.7-1.6-7L22 9.2l-7.2-.6L12 2 9.2 8.6 2 9.2 7.4 14l-1.6 7L12 17.3Z",
    grid: "M3 3h8v8H3V3Zm10 0h8v8h-8V3ZM3 13h8v8H3v-8Zm10 0h8v8h-8v-8Z",
    up: "M7 14l5-5 5 5H7Z", down: "M7 10l5 5 5-5H7Z",
    check: "M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2Z",
    close: "M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4Z",
    info: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-6h2v6Zm0-8h-2V7h2v2Z",
    warn: "M1 21h22L12 2 1 21Zm12-3h-2v-2h2v2Zm0-4h-2v-4h2v4Z",
    error: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-2h2v2Zm0-4h-2V7h2v6Z",
    ok: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-2 15-5-5 1.4-1.4 3.6 3.6 7.6-7.6L19 8l-9 9Z",
    sort: "M12 5 8 9h8l-4-4Zm0 14 4-4H8l4 4Z", sortUp: "M12 5 7 11h10l-5-6Z", sortDown: "M12 19l5-6H7l5 6Z"
  };
  function svgIcon(name, size) {
    var s = size || 16;
    var w = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    w.setAttribute("width", s); w.setAttribute("height", s); w.setAttribute("viewBox", "0 0 24 24");
    w.setAttribute("aria-hidden", "true"); w.setAttribute("focusable", "false");
    var p = document.createElementNS("http://www.w3.org/2000/svg", "path"); p.setAttribute("fill", "currentColor"); p.setAttribute("d", ICON[name]);
    w.appendChild(p); return w;
  }
  var NIVEL = { info: { cls: "info", icon: "info", txt: "Info" }, warning: { cls: "warning", icon: "warn", txt: "Revisar" }, error: { cls: "error", icon: "error", txt: "Error" }, ok: { cls: "success", icon: "ok", txt: "OK" } };
  NIVEL.success = NIVEL.ok;
  function badge(nivel, texto) { var d = NIVEL[nivel]; return el("span", { "class": "badge badge--" + d.cls }, [svgIcon(d.icon, 14), texto || d.txt]); }

  /* ---------- Estado ---------- */
  var base, f, ui = { verTodosServ: false, tab: "crec", sortKey: "total", sortDir: -1, page: 0, pageSize: 25, verTodoTab: false };
  function filtrosVacios() { return { meses: [], tipos: [], segmentos: [], servicios: [], texto: "", cliente: "" }; }
  f = filtrosVacios();

  function cargarBase() {
    var emb = null;
    try { emb = JSON.parse($("base-datos").textContent); } catch (e) { emb = null; }
    base = emb || M.demo();
    var guardada = null;
    try { guardada = JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch (e) { guardada = null; }
    if (guardada && guardada.registros && guardada.actualizado && (base.fuente === "demo" || guardada.actualizado > base.actualizado)) {
      mostrarAlertaRespaldo(guardada);
    }
  }
  function guardarLocal() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(base)); return true; }
    catch (e) { toast("No se pudo guardar el respaldo en el navegador (espacio insuficiente). Descargá el dashboard para no perder la base."); return false; }
  }

  /* ---------- Alertas ---------- */
  function alerta(nivel, contenido, acciones, id) {
    var d = NIVEL[nivel];
    var cuerpo = el("div", { "class": "alert__body" }, contenido);
    if (acciones && acciones.length) cuerpo.appendChild(el("div", { "class": "alert__actions" }, acciones));
    var a = el("div", { "class": "alert alert--" + d.cls, role: nivel === "error" ? "alert" : "note", id: id || null }, [svgIcon(d.icon, 20), cuerpo]);
    return a;
  }
  function renderAlertas() {
    var c = $("alertas");
    Array.prototype.slice.call(c.querySelectorAll("[data-auto]")).forEach(function (x) { x.remove(); });
    if (base.fuente === "demo") {
      var a = alerta("info", [el("strong", { text: "Estás viendo datos sintéticos (prueba visual)." }), " Los clientes y contratos son inventados. Para ver tus datos reales tocá ",
        el("strong", { text: "Actualizar con nueva descarga" }), " y elegí el Excel de Power BI: se procesa en tu navegador y no se sube a GitHub."]);
      a.setAttribute("data-auto", ""); c.insertBefore(a, c.firstChild);
    }
  }
  function mostrarAlertaRespaldo(g) {
    var a = alerta("warning", [el("strong", { text: "Hay una base guardada en este navegador" }),
      " (" + n(g.registros.length) + " registros, actualizada el " + fecha(g.actualizado) + "). ¿Querés usarla?"], [
      el("button", { type: "button", "class": "btn btn--secondary btn--small", onclick: function () { base = g; a.remove(); f = filtrosVacios(); $("buscar").value = ""; renderTodo(); toast("Se cargó la base guardada en el navegador."); } }, ["Usar base guardada"]),
      el("button", { type: "button", "class": "btn btn--ghost btn--small", onclick: function () { if (confirm("¿Borrar la base guardada en este navegador? No se puede deshacer.")) { localStorage.removeItem(LS_KEY); a.remove(); } } }, ["Borrar respaldo"])
    ], "alerta-respaldo");
    $("alertas").appendChild(a);
  }
  var toastTimer;
  function toast(msg) { var t = $("toast"); t.textContent = msg; t.setAttribute("data-open", "true"); clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.setAttribute("data-open", "false"); }, 5000); }

  /* ---------- Series de tipos ---------- */
  function serieTipo(t) { if (/paquet/i.test(t)) return "s1"; if (/sobre/i.test(t)) return "s2"; if (/inversa/i.test(t)) return "s3"; if (/sin servicio|no informado/i.test(t)) return "s4"; return "s5"; }
  function tiposOrdenados() { var u = {}; base.registros.forEach(function (r) { u[r.tipo] = 1; }); return Object.keys(u).sort(); }

  /* ---------- Filtros ---------- */
  function conteos(dim) {
    var c = {}; var meses = mesesSel();
    base.registros.forEach(function (r) { var k = dim(r); c[k] = (c[k] || 0) + M.sumaMeses(r, meses); });
    return c;
  }
  function mesesSel() { return f.meses.length ? base.meses.filter(function (m) { return f.meses.indexOf(m) >= 0; }) : base.meses; }
  function toggle(arr, v) { var i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); }
  function chip(label, pressed, onClick, count, extraCls) {
    return el("button", { type: "button", "class": "chip" + (extraCls ? " " + extraCls : ""), "aria-pressed": pressed ? "true" : "false", onclick: onClick }, [
      el("span", { "class": "chip__check" }, [svgIcon("check", 14)]), label, count != null ? el("span", { "class": "chip__count num" }, [" · " + corto(count)]) : null
    ]);
  }
  function filaFiltro(titulo, id, chips) {
    var lab = el("div", { "class": "filter-row__label", id: id }, [titulo]);
    return el("div", { "class": "filter-row" }, [lab, el("div", { "class": "chips", role: "group", "aria-labelledby": id }, chips)]);
  }
  function renderFiltros() {
    var c = $("filtros"); c.innerHTML = "";
    c.appendChild(filaFiltro("Período", "fl-mes", base.meses.map(function (m) {
      return chip(M.mesTxt(m) + (m === base.mesParcial ? " (parcial)" : ""), f.meses.indexOf(m) >= 0, function () { toggle(f.meses, m); cambio(); });
    })));
    var ct = conteos(function (r) { return r.tipo; });
    c.appendChild(filaFiltro("Tipo de servicio", "fl-tipo", tiposOrdenados().map(function (t) {
      return chip(t, f.tipos.indexOf(t) >= 0, function () { toggle(f.tipos, t); cambio(); }, ct[t]);
    })));
    var cs = conteos(M.segDe);
    var segs = Object.keys(cs).sort(function (a, b) { return cs[b] - cs[a]; });
    c.appendChild(filaFiltro("Segmento", "fl-seg", segs.map(function (s) {
      return chip(s, f.segmentos.indexOf(s) >= 0, function () { toggle(f.segmentos, s); cambio(); }, cs[s]);
    })));
    var cv = conteos(function (r) { return r.servicio; });
    var servs = Object.keys(cv).sort(function (a, b) { return cv[b] - cv[a]; });
    var visibles = ui.verTodosServ ? servs : servs.slice(0, 12);
    f.servicios.forEach(function (s) { if (visibles.indexOf(s) < 0) visibles.push(s); });
    var chipsServ = visibles.map(function (s) { return chip(s, f.servicios.indexOf(s) >= 0, function () { toggle(f.servicios, s); cambio(); }, cv[s]); });
    if (servs.length > 12) chipsServ.push(el("button", { type: "button", "class": "chip chip--more", "aria-expanded": ui.verTodosServ ? "true" : "false", onclick: function () { ui.verTodosServ = !ui.verTodosServ; renderFiltros(); } }, [ui.verTodosServ ? "Ver menos" : "Ver los " + servs.length]));
    c.appendChild(filaFiltro("Servicio", "fl-serv", chipsServ));
  }
  function renderActivos() {
    var c = $("filtros-activos"); c.innerHTML = "";
    var tags = [];
    function tag(txt, quitar) { tags.push(el("span", { "class": "tag" }, [txt, el("button", { type: "button", "aria-label": "Quitar filtro " + txt, onclick: function () { quitar(); cambio(); } }, [svgIcon("close", 14)])])); }
    f.meses.forEach(function (m) { tag(M.mesTxt(m), function () { toggle(f.meses, m); }); });
    f.tipos.forEach(function (m) { tag(m, function () { toggle(f.tipos, m); }); });
    f.segmentos.forEach(function (m) { tag(m, function () { toggle(f.segmentos, m); }); });
    f.servicios.forEach(function (m) { tag(m, function () { toggle(f.servicios, m); }); });
    if (f.cliente) tag("Cliente: " + f.cliente, function () { f.cliente = ""; });
    if (f.texto) tag("Búsqueda: " + f.texto, function () { f.texto = ""; $("buscar").value = ""; });
    if (!tags.length) c.appendChild(el("span", { text: "Sin filtros: se muestra toda la base." }));
    else { c.appendChild(el("span", { text: "Filtros activos:" })); tags.forEach(function (t) { c.appendChild(t); }); }
    $("btn-limpiar").disabled = !tags.length;
  }
  function cambio() { ui.page = 0; renderTodo(); }

  /* ---------- KPIs ---------- */
  function renderKpis(k) {
    var c = $("kpis"); c.innerHTML = "";
    var varTxt = "—", varEl;
    if (k.variacion != null) {
      var up = k.variacion >= 0;
      varEl = el("span", { "class": "trend trend--" + (up ? "up" : "down") }, [svgIcon(up ? "up" : "down", 20), (up ? "Sube " : "Baja ") + pct(Math.abs(k.variacion))]);
    }
    var items = [
      ["box", "Envíos", n(k.envios), k.meses.length + (k.meses.length === 1 ? " mes" : " meses") + (base.mesParcial && k.meses.indexOf(base.mesParcial) >= 0 ? " · incluye " + M.mesTxt(base.mesParcial) + " parcial" : "")],
      ["user", "Clientes", n(k.clientes), "Razones sociales con envíos"],
      ["doc", "Contratos", n(k.contratos), k.mesUltimo ? n(k.contratosActivos) + " activos en " + M.mesTxt(k.mesUltimo) : ""],
      ["cal", "Promedio mensual", n(k.promedioMensual), n(k.enviosPorContrato) + " envíos por contrato"],
      ["trend", "Variación mensual", varEl || varTxt, k.mesUltimo && k.mesPrevio ? M.mesTxt(k.mesUltimo) + " vs " + M.mesTxt(k.mesPrevio) + " (meses completos)" : "Se necesitan 2 meses completos"],
      ["pie", "Concentración top 10", pct(k.concentracionTop10), "Envíos de los 10 principales clientes"],
      ["star", "Clientes nuevos", n(k.clientesNuevos), "Primer envío después de " + M.mesTxt(base.meses[0])],
      ["grid", "Servicios", n(k.servicios), n(k.segmentos) + " segmentos"]
    ];
    items.forEach(function (it) {
      var val = el("span", { "class": "kpi__value" }, [it[2]]);
      c.appendChild(el("li", { "class": "kpi" }, [el("span", { "class": "kpi__label" }, [svgIcon(it[0], 20), it[1]]), val, el("span", { "class": "kpi__sub" }, [it[3]])]));
    });
  }

  /* ---------- Gráficos SVG ---------- */
  var NS = "http://www.w3.org/2000/svg";
  function s(tag, attrs, kids) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs || {}) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    (kids || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }
  function escala(max) { if (max <= 0) return 1; var p = Math.pow(10, Math.floor(Math.log10(max))); var m = max / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; }
  var tip = null;
  function conTip(g, texto) {
    g.addEventListener("mousemove", function (ev) { tip = tip || $("tip"); tip.textContent = texto; tip.style.display = "block"; tip.style.left = Math.min(ev.clientX + 12, window.innerWidth - 290) + "px"; tip.style.top = (ev.clientY + 12) + "px"; });
    g.addEventListener("mouseleave", function () { (tip || $("tip")).style.display = "none"; });
  }
  function tablaDatos(titulo, cabeza, filas) {
    var t = el("table", null, [el("caption", { "class": "sr-only", text: titulo }), el("thead", null, [el("tr", null, cabeza.map(function (h, i) { return el("th", { scope: "col", "class": i ? "n" : null, text: h }); }))]),
      el("tbody", null, filas.map(function (fl) { return el("tr", null, fl.map(function (v, i) { return el(i ? "td" : "th", { scope: i ? null : "row", "class": i ? "n" : null, text: v }); })); }))]);
    return el("details", { "class": "details-data" }, [el("summary", { text: "Ver datos en tabla" }), el("div", { "class": "table-wrap", style: "margin-top:8px" }, [t])]);
  }

  function chartEvolucion(regs, k) {
    var c = $("ch-evolucion"); c.innerHTML = "";
    var meses = k.meses, tipos = tiposOrdenados();
    var data = meses.map(function (m) { var o = { mes: m, total: 0 }; tipos.forEach(function (t) { o[t] = 0; }); return o; });
    regs.forEach(function (r) { meses.forEach(function (m, i) { var x = r.v[m] || 0; if (x) { data[i][r.tipo] += x; data[i].total += x; } }); });
    var W = 760, H = 300, L = 56, R = 8, T = 16, B = 44;
    var max = escala(Math.max.apply(null, data.map(function (d) { return d.total; }).concat([1])));
    var bw = (W - L - R) / Math.max(meses.length, 1);
    var svg = s("svg", { "class": "chart", viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Envíos por mes y tipo de servicio. " + data.map(function (d) { return M.mesTxt(d.mes) + ": " + n(d.total); }).join("; ") });
    for (var g = 0; g <= 4; g++) {
      var y = T + (H - T - B) * (1 - g / 4);
      svg.appendChild(s("line", { "class": g ? "grid-line" : "axis-line", x1: L, x2: W - R, y1: y, y2: y }));
      svg.appendChild(s("text", { x: L - 8, y: y + 4, "text-anchor": "end" }, [corto(max * g / 4)]));
    }
    data.forEach(function (d, i) {
      var x = L + i * bw + bw * 0.18, w = bw * 0.64, y0 = H - B, parcial = d.mes === base.mesParcial;
      var grp = s("g", { opacity: parcial ? 0.55 : null });
      tipos.forEach(function (t) {
        if (!d[t]) return;
        var h = (H - T - B) * d[t] / max; y0 -= h;
        grp.appendChild(s("rect", { "class": serieTipo(t), x: x, y: y0, width: w, height: Math.max(h, 0) }));
      });
      svg.appendChild(grp);
      conTip(grp, M.mesTxt(d.mes) + (parcial ? " (parcial)" : "") + " · Total " + n(d.total) + " · " + tipos.filter(function (t) { return d[t]; }).map(function (t) { return t + ": " + n(d[t]); }).join(" · "));
      svg.appendChild(s("text", { x: x + w / 2, y: H - B + 16, "text-anchor": "middle" }, [M.mesTxt(d.mes)]));
      if (parcial) svg.appendChild(s("text", { "class": "partial-label", x: x + w / 2, y: H - B + 32, "text-anchor": "middle" }, ["parcial"]));
    });
    c.appendChild(svg);
    c.appendChild(el("ul", { "class": "legend", "aria-label": "Referencias" }, tipos.map(function (t) { return el("li", null, [el("span", { "class": "sw " + serieTipo(t), "aria-hidden": "true" }), t]); })));
    c.appendChild(tablaDatos("Envíos por mes y tipo", ["Mes"].concat(tipos, ["Total"]), data.map(function (d) { return [M.mesTxt(d.mes) + (d.mes === base.mesParcial ? " (parcial)" : "")].concat(tipos.map(function (t) { return n(d[t]); }), [n(d.total)]); })));
    $("evo-sub").textContent = base.mesParcial ? M.mesTxt(base.mesParcial) + " es parcial (mes en curso): se muestra atenuado y no cuenta para variaciones." : "Todos los meses completos";
  }

  function chartMix(regs, k) {
    var c = $("ch-mix"); c.innerHTML = "";
    var tot = {}, total = 0;
    regs.forEach(function (r) { var x = M.sumaMeses(r, k.meses); tot[r.tipo] = (tot[r.tipo] || 0) + x; total += x; });
    var tipos = tiposOrdenados().filter(function (t) { return tot[t] > 0; });
    var W = 220, R0 = 100, R1 = 62, cx = 110, cy = 110, a0 = -Math.PI / 2;
    var svg = s("svg", { "class": "chart", viewBox: "0 0 " + W + " 220", style: "max-width:240px", role: "img", "aria-label": "Participación por tipo: " + tipos.map(function (t) { return t + " " + pct(tot[t] / total); }).join("; ") });
    if (!total) svg.appendChild(s("circle", { cx: cx, cy: cy, r: (R0 + R1) / 2, fill: "none", stroke: "var(--c-color-border-subtle)", "stroke-width": R0 - R1 }));
    tipos.forEach(function (t) {
      var frac = tot[t] / total, a1 = a0 + frac * Math.PI * 2;
      if (frac >= 0.9999) a1 = a0 + Math.PI * 2 - 0.0001;
      var large = a1 - a0 > Math.PI ? 1 : 0;
      var p = ["M", cx + R0 * Math.cos(a0), cy + R0 * Math.sin(a0), "A", R0, R0, 0, large, 1, cx + R0 * Math.cos(a1), cy + R0 * Math.sin(a1),
        "L", cx + R1 * Math.cos(a1), cy + R1 * Math.sin(a1), "A", R1, R1, 0, large, 0, cx + R1 * Math.cos(a0), cy + R1 * Math.sin(a0), "Z"].join(" ");
      var path = s("path", { "class": serieTipo(t), d: p, stroke: "var(--c-color-surface)", "stroke-width": 2 });
      conTip(path, t + ": " + n(tot[t]) + " (" + pct(frac) + ")");
      svg.appendChild(path); a0 = a1;
    });
    svg.appendChild(s("text", { x: cx, y: cy - 2, "text-anchor": "middle", "class": "bar-label", style: "font-size:20px" }, [corto(total)]));
    svg.appendChild(s("text", { x: cx, y: cy + 18, "text-anchor": "middle" }, ["envíos"]));
    c.appendChild(el("div", { "class": "donut-wrap" }, [svg]));
    c.appendChild(el("ul", { "class": "legend", style: "flex-direction:column" }, tipos.map(function (t) {
      return el("li", null, [el("span", { "class": "sw " + serieTipo(t), "aria-hidden": "true" }), t + " · " + pct(tot[t] / total) + " · " + n(tot[t])]);
    })));
  }

  function chartBarras(contId, filas, seleccion, onPick, nombre) {
    var c = $(contId); c.innerHTML = "";
    if (!filas.length) { c.appendChild(el("p", { "class": "empty-row", text: "Sin datos para los filtros elegidos." })); return; }
    var W = 600, rowH = 30, L = 190, Rv = 80, H = filas.length * rowH + 4;
    var max = Math.max.apply(null, filas.map(function (d) { return d.envios; }).concat([1]));
    var svg = s("svg", { "class": "chart", viewBox: "0 0 " + W + " " + H, role: "group", "aria-label": nombre });
    filas.forEach(function (d, i) {
      var y = i * rowH + 2, w = Math.max((W - L - Rv) * d.envios / max, 2), sel = seleccion.indexOf(d.clave) >= 0;
      var etiqueta = d.clave.length > 26 ? d.clave.slice(0, 25) + "…" : d.clave;
      var g = s("g", { "class": "clickable" + (sel ? " sel" : ""), tabindex: 0, role: "button", "aria-pressed": sel ? "true" : "false", "aria-label": d.clave + ": " + n(d.envios) + " envíos. " + (sel ? "Filtro activo, activá para quitarlo." : "Activá para filtrar.") });
      g.appendChild(s("rect", { "class": "bar-h-bg", x: L, y: y + 4, width: W - L - Rv, height: rowH - 10, rx: 4 }));
      g.appendChild(s("rect", { "class": "bar-h", x: L, y: y + 4, width: w, height: rowH - 10, rx: 4 }));
      g.appendChild(s("text", { x: L - 8, y: y + rowH / 2 + 3, "text-anchor": "end", "class": sel ? "bar-label" : null }, [(sel ? "✓ " : "") + etiqueta]));
      g.appendChild(s("text", { x: W - Rv + 8, y: y + rowH / 2 + 3, "class": "bar-label" }, [corto(d.envios)]));
      /* Anillo de foco: fill/stroke explícitos como atributos además del CSS, para que nunca se pinte negro por defecto */
      g.appendChild(s("rect", { "class": "focus-ring", x: 1, y: y + 1, width: W - 2, height: rowH - 4, rx: 6, fill: "none", stroke: "none" }));
      conTip(g, d.clave + " · " + n(d.envios) + " envíos · " + n(d.clientes) + " clientes · " + n(d.contratos) + " contratos");
      g.addEventListener("click", function () { onPick(d.clave); });
      g.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); onPick(d.clave); } });
      svg.appendChild(g);
    });
    c.appendChild(svg);
  }

  /* ---------- Tablas ---------- */
  function tabla(cols, filas, opts) {
    opts = opts || {};
    var thead = el("thead", null, [el("tr", null, cols.map(function (c) {
      var th = el("th", { scope: "col", "class": c.n ? "n" : null });
      if (opts.sort && c.key) {
        var activo = opts.sort.key === c.key;
        th.setAttribute("aria-sort", activo ? (opts.sort.dir > 0 ? "ascending" : "descending") : "none");
        th.appendChild(el("button", { type: "button", "class": "th-sort", onclick: function () { opts.onSort(c.key); } }, [c.t, svgIcon(activo ? (opts.sort.dir > 0 ? "sortUp" : "sortDown") : "sort", 14)]));
      } else th.textContent = c.t;
      return th;
    }))]);
    var tbody = el("tbody");
    if (!filas.length) tbody.appendChild(el("tr", null, [el("td", { colspan: cols.length, "class": "empty-row", text: opts.vacio || "Sin resultados para los filtros elegidos." })]));
    filas.forEach(function (fl) { tbody.appendChild(el("tr", null, cols.map(function (c) { var v = c.f(fl); return el("td", { "class": c.n ? "n" : c.cls || null }, [v instanceof Node ? v : String(v)]); }))); });
    return el("table", null, [opts.caption ? el("caption", { "class": "sr-only", text: opts.caption }) : null, thead, tbody]);
  }
  function linkCliente(nombre) {
    if (nombre === M.SIN_RS) return el("span", { text: nombre });
    return el("button", { type: "button", "class": "linkbtn", title: "Filtrar por este cliente", onclick: function () { f.cliente = f.cliente === nombre ? "" : nombre; cambio(); document.getElementById("t-filtros").scrollIntoView({ behavior: "smooth", block: "start" }); } }, [nombre]);
  }
  function share(v, tot) { var p = tot ? v / tot : 0; return el("span", { "class": "share" }, [pct(p), el("span", { "class": "share__bar", "aria-hidden": "true" }, [el("span", { style: "width:" + Math.min(100, p * 100).toFixed(1) + "%" })])]); }

  /* Rankings y pestañas: sin clientes internos (D-016) ni filas sin contrato */
  function paraRanking(regs) { return regs.filter(function (r) { return r.cliente && !M.esInterno(r.cliente) && r.contrato !== M.SIN_CON; }); }
  function notaInternos() { return el("p", { "class": "tab-note", style: "margin:var(--c-spacing-3) 0 0" }, ["No incluye clientes internos (" + M.INTERNOS.join(", ") + ") ni registros sin razón social."]); }
  function renderRankings(regs, k) {
    regs = paraRanking(regs);
    var porCli = M.agrupar(regs.filter(function (r) { return M.sumaMeses(r, k.meses) > 0; }), M.cliDe, k.meses);
    var top = porCli.slice().sort(function (a, b) { return b.contratos - a.contratos || b.envios - a.envios; }).slice(0, 10);
    $("rk-contratos").innerHTML = "";
    $("rk-contratos").appendChild(el("div", { "class": "table-wrap" }, [tabla([
      { t: "#", f: function (r) { return top.indexOf(r) + 1; }, cls: "rank" }, { t: "Cliente", f: function (r) { return linkCliente(r.clave); } },
      { t: "Contratos", n: 1, f: function (r) { return n(r.contratos); } }, { t: "Servicios", n: 1, f: function (r) { return n(r.servicios); } }, { t: "Envíos", n: 1, f: function (r) { return n(r.envios); } }
    ], top, { caption: "Clientes con más contratos" })]));
    var top2 = porCli.slice().sort(function (a, b) { return b.envios - a.envios; }).slice(0, 10);
    $("rk-envios").innerHTML = "";
    $("rk-envios").appendChild(el("div", { "class": "table-wrap" }, [tabla([
      { t: "#", f: function (r) { return top2.indexOf(r) + 1; }, cls: "rank" }, { t: "Cliente", f: function (r) { return linkCliente(r.clave); } },
      { t: "Envíos", n: 1, f: function (r) { return n(r.envios); } }, { t: "Participación", n: 1, f: function (r) { return share(r.envios, k.envios); } }
    ], top2, { caption: "Clientes con más envíos" })]));
    $("rk-contratos").appendChild(notaInternos());
    $("rk-envios").appendChild(notaInternos());
  }

  var TABS = [
    { id: "crec", t: "Mayor crecimiento" }, { id: "caida", t: "Mayor caída" }, { id: "contratos", t: "Contratos con más envíos" },
    { id: "multi", t: "Clientes multiservicio" }, { id: "servcli", t: "Servicios con más clientes" }, { id: "inactivos", t: "Sin envíos recientes" }, { id: "nuevos", t: "Clientes nuevos" }
  ];
  function renderTabs(regs, k) {
    regs = paraRanking(regs);
    var bar = $("tabs"); bar.innerHTML = "";
    TABS.forEach(function (tb, i) {
      var b = el("button", { type: "button", role: "tab", "class": "tab", id: "tab-" + tb.id, "aria-controls": "tab-panel", "aria-selected": ui.tab === tb.id ? "true" : "false", tabindex: ui.tab === tb.id ? "0" : "-1",
        onclick: function () { ui.tab = tb.id; ui.verTodoTab = false; renderTabs(regs, k); },
        onkeydown: function (ev) {
          var j = null; if (ev.key === "ArrowRight") j = (i + 1) % TABS.length; else if (ev.key === "ArrowLeft") j = (i - 1 + TABS.length) % TABS.length; else if (ev.key === "Home") j = 0; else if (ev.key === "End") j = TABS.length - 1;
          if (j != null) { ev.preventDefault(); ui.tab = TABS[j].id; ui.verTodoTab = false; renderTabs(regs, k); $("tab-" + TABS[j].id).focus(); }
        } }, [tb.t]);
      bar.appendChild(b);
    });
    var p = $("tab-panel"); p.innerHTML = ""; p.setAttribute("aria-labelledby", "tab-" + ui.tab);
    var cols, filas, nota, LIM = ui.verTodoTab ? 500 : 15;
    if (ui.tab === "crec" || ui.tab === "caida") {
      var td = M.tendencia(base, regs);
      if (!td.ventana) { p.appendChild(el("p", { "class": "tab-note", text: "Se necesitan al menos 2 meses completos." })); return; }
      nota = "Compara " + td.ventana.reciente.map(M.mesTxt).join(", ") + " contra " + td.ventana.anterior.map(M.mesTxt).join(", ") + " (meses completos, sin el mes parcial). No depende del filtro de período.";
      filas = td.filas.filter(function (r) { return ui.tab === "crec" ? r.dif > 0 : r.dif < 0; }).sort(function (a, b) { return ui.tab === "crec" ? b.dif - a.dif : a.dif - b.dif; });
      cols = [{ t: "Cliente", f: function (r) { return linkCliente(r.clave); } }, { t: "Anterior", n: 1, f: function (r) { return n(r.anterior); } }, { t: "Reciente", n: 1, f: function (r) { return n(r.reciente); } },
        { t: "Diferencia", n: 1, f: function (r) { return el("span", { "class": "trend trend--" + (r.dif >= 0 ? "up" : "down") }, [svgIcon(r.dif >= 0 ? "up" : "down", 16), (r.dif > 0 ? "+" : "") + n(r.dif)]); } },
        { t: "Variación", n: 1, f: function (r) { return r.pct == null ? "Nuevo" : pct(r.pct, true); } }];
    } else if (ui.tab === "contratos") {
      nota = "Envíos del período filtrado por contrato.";
      var porC = {}; regs.forEach(function (r) { var g = porC[r.contrato] || (porC[r.contrato] = { contrato: r.contrato, cliente: M.cliDe(r), servicios: [], envios: 0 }); g.servicios.push(r.servicio); g.envios += M.sumaMeses(r, k.meses); });
      filas = Object.keys(porC).map(function (x) { return porC[x]; }).filter(function (r) { return r.envios > 0; }).sort(function (a, b) { return b.envios - a.envios; });
      cols = [{ t: "Contrato", f: function (r) { return r.contrato; }, cls: "num" }, { t: "Cliente", f: function (r) { return linkCliente(r.cliente); } }, { t: "Servicios", f: function (r) { return r.servicios.join(", "); } },
        { t: "Envíos", n: 1, f: function (r) { return n(r.envios); } }, { t: "Participación", n: 1, f: function (r) { return share(r.envios, k.envios); } }];
    } else if (ui.tab === "multi") {
      nota = "Clientes que usan más servicios distintos en el período.";
      filas = M.agrupar(regs.filter(function (r) { return r.cliente && M.sumaMeses(r, k.meses) > 0; }), M.cliDe, k.meses).filter(function (r) { return r.servicios > 1; }).sort(function (a, b) { return b.servicios - a.servicios || b.envios - a.envios; });
      cols = [{ t: "Cliente", f: function (r) { return linkCliente(r.clave); } }, { t: "Servicios", n: 1, f: function (r) { return n(r.servicios); } }, { t: "Contratos", n: 1, f: function (r) { return n(r.contratos); } }, { t: "Envíos", n: 1, f: function (r) { return n(r.envios); } }];
    } else if (ui.tab === "servcli") {
      nota = "Cantidad de clientes con envíos en cada servicio.";
      filas = M.agrupar(regs, function (r) { return r.servicio; }, k.meses).filter(function (r) { return r.envios > 0; }).sort(function (a, b) { return b.clientes - a.clientes || b.envios - a.envios; });
      cols = [{ t: "Servicio", f: function (r) { return r.clave; } }, { t: "Clientes", n: 1, f: function (r) { return n(r.clientes); } }, { t: "Contratos", n: 1, f: function (r) { return n(r.contratos); } }, { t: "Envíos", n: 1, f: function (r) { return n(r.envios); } }];
    } else if (ui.tab === "inactivos") {
      var sa = M.sinActividad(base, regs);
      if (!sa.meses.length) { p.appendChild(el("p", { "class": "tab-note", text: "Se necesitan al menos 4 meses completos." })); return; }
      nota = "Contratos con envíos antes y sin envíos en " + sa.meses.map(M.mesTxt).join(", ") + ". No depende del filtro de período.";
      filas = sa.filas;
      cols = [{ t: "Contrato", f: function (r) { return r.contrato; }, cls: "num" }, { t: "Cliente", f: function (r) { return linkCliente(r.cliente); } }, { t: "Servicios", f: function (r) { return r.servicios; } },
        { t: "Último mes con envíos", f: function (r) { return r.ultimo ? M.mesTxt(r.ultimo) : "—"; } }, { t: "Envíos previos", n: 1, f: function (r) { return n(r.envios); } }];
    } else {
      nota = "Clientes cuyo primer envío es posterior a " + M.mesTxt(base.meses[0]) + " (primer mes de la base).";
      filas = M.clientesNuevos(base, regs);
      cols = [{ t: "Cliente", f: function (r) { return linkCliente(r.clave); } }, { t: "Primer mes", f: function (r) { return M.mesTxt(r.mes); } }, { t: "Envíos desde entonces", n: 1, f: function (r) { return n(r.envios); } }];
    }
    p.appendChild(el("p", { "class": "tab-note" }, [nota + " " + n(filas.length) + " en total. No incluye clientes internos (" + M.INTERNOS.join(", ") + ") ni registros sin razón social."]));
    p.appendChild(el("div", { "class": "table-wrap" }, [tabla(cols, filas.slice(0, LIM), { caption: TABS.filter(function (x) { return x.id === ui.tab; })[0].t })]));
    if (filas.length > 15) p.appendChild(el("div", { "class": "pager" }, [el("span", { text: "Mostrando " + n(Math.min(LIM, filas.length)) + " de " + n(filas.length) }),
      el("button", { type: "button", "class": "btn btn--ghost btn--small", onclick: function () { ui.verTodoTab = !ui.verTodoTab; renderTabs(regs, k); } }, [ui.verTodoTab ? "Ver menos" : "Ver todos (hasta 500)"])]));
  }

  function renderCalidad() {
    var c = $("calidad"); c.innerHTML = "";
    M.calidad(base).forEach(function (q) {
      var nivel = q.cantidad === 0 ? "ok" : q.nivel;
      var kids = [el("div", { "class": "quality__top" }, [el("span", { "class": "quality__n num", text: n(q.cantidad) }), badge(nivel)]), el("span", { "class": "quality__t", text: q.titulo })];
      if (q.extra != null && q.cantidad) kids.push(el("span", { "class": "quality__x", text: n(q.extra) + " " + q.extraTxt }));
      if (q.ejemplos && q.ejemplos.length) kids.push(el("span", { "class": "quality__x", text: "Ej.: " + q.ejemplos.join(", ") }));
      if (q.nota && q.cantidad) kids.push(el("span", { "class": "quality__x", text: q.nota }));
      c.appendChild(el("li", null, kids));
    });
  }

  function renderBase() {
    var total = M.totalBase(base);
    var meta = $("base-meta"); meta.innerHTML = "";
    [["Origen", base.fuente === "demo" ? "Datos sintéticos (prueba)" : "Descarga de Power BI"], ["Registros", n(base.registros.length) + " (contrato + tipo + servicio)"],
      ["Período", M.mesTxt(base.meses[0]) + " a " + M.mesTxt(base.meses[base.meses.length - 1]) + (base.mesParcial ? " · " + M.mesTxt(base.mesParcial) + " parcial" : "")],
      ["Envíos", n(total)], ["Filtros del export", base.filtros || "—"], ["Actualizada", fecha(base.actualizado)]
    ].forEach(function (x) { meta.appendChild(el("dt", { text: x[0] })); meta.appendChild(el("dd", { text: x[1] })); });
    var h = $("historial"); h.innerHTML = "";
    (base.historial || []).slice().reverse().slice(0, 8).forEach(function (x) {
      h.appendChild(el("li", null, [el("strong", { text: fecha(x.fecha) + " · " + (x.accion || "Actualización") }), el("br"),
        el("span", { text: (x.archivo ? x.archivo + " · " : "") + n(x.nuevos) + " registros nuevos · " + n(x.cambios) + " valores cambiados" + (x.mesesNuevos && x.mesesNuevos.length ? " · meses: " + x.mesesNuevos.map(M.mesTxt).join(", ") : "") + " · total " + n(x.total) })]));
    });
    $("subtitulo").textContent = (base.fuente === "demo" ? "Datos sintéticos · " : "") + "Período " + M.mesTxt(base.meses[0]) + " a " + M.mesTxt(base.meses[base.meses.length - 1]) + (base.mesParcial ? " (" + M.mesTxt(base.mesParcial) + " parcial)" : "") + " · " + (base.filtros || "");
    var est = $("estado-base"); est.innerHTML = "";
    est.appendChild(base.fuente === "demo" ? badge("warning", "Prueba · datos sintéticos") : badge("ok", "Base real · " + n(base.registros.length) + " registros"));
    $("footer-base").textContent = "Base actualizada: " + fecha(base.actualizado);
  }

  /* ---------- Detalle ---------- */
  function filasDetalle(regs, meses) {
    return regs.map(function (r) { var o = { r: r, total: M.sumaMeses(r, meses) }; return o; });
  }
  function renderDetalle(regs, k) {
    var meses = k.meses, filas = filasDetalle(regs, meses);
    var key = ui.sortKey, dir = ui.sortDir;
    function val(o) { if (key === "total") return o.total; if (key.indexOf("m:") === 0) return o.r.v[key.slice(2)] || 0; if (key === "cliente") return M.cliDe(o.r); if (key === "segmento") return M.segDe(o.r); return o.r[key]; }
    filas.sort(function (a, b) { var x = val(a), y = val(b); return (typeof x === "number" ? x - y : String(x).localeCompare(String(y), "es")) * dir; });
    var pages = Math.max(1, Math.ceil(filas.length / ui.pageSize)); if (ui.page >= pages) ui.page = pages - 1;
    var vis = filas.slice(ui.page * ui.pageSize, (ui.page + 1) * ui.pageSize);
    var cols = [{ t: "Contrato", key: "contrato", f: function (o) { return o.r.contrato; }, cls: "num" }, { t: "Cliente", key: "cliente", f: function (o) { return linkCliente(M.cliDe(o.r)); } },
      { t: "Segmento", key: "segmento", f: function (o) { return M.segDe(o.r); } }, { t: "Tipo", key: "tipo", f: function (o) { return o.r.tipo; } }, { t: "Servicio", key: "servicio", f: function (o) { return o.r.servicio; } }]
      .concat(meses.map(function (m) { return { t: M.mesTxt(m) + (m === base.mesParcial ? "*" : ""), key: "m:" + m, n: 1, f: function (o) { return o.r.v[m] ? n(o.r.v[m]) : "—"; } }; }))
      .concat([{ t: "Total", key: "total", n: 1, f: function (o) { return n(o.total); } }]);
    var c = $("detalle"); c.innerHTML = "";
    c.appendChild(tabla(cols, vis, { caption: "Detalle por contrato y servicio", sort: { key: key, dir: dir }, onSort: function (kk) { if (ui.sortKey === kk) ui.sortDir = -ui.sortDir; else { ui.sortKey = kk; ui.sortDir = kk === "total" || kk.indexOf("m:") === 0 ? -1 : 1; } renderDetalle(regs, k); c.querySelector("th[aria-sort]:not([aria-sort='none']) button").focus(); } }));
    $("detalle-sub").textContent = n(filas.length) + " registros (contrato + tipo + servicio)" + (base.mesParcial && meses.indexOf(base.mesParcial) >= 0 ? " · * mes parcial" : "");
    var pg = $("pager"); pg.innerHTML = "";
    pg.appendChild(el("span", { text: filas.length ? "Registros " + n(ui.page * ui.pageSize + 1) + "–" + n(Math.min(filas.length, (ui.page + 1) * ui.pageSize)) + " de " + n(filas.length) + " · página " + (ui.page + 1) + " de " + pages : "" }));
    pg.appendChild(el("div", { "class": "pager__btns" }, [
      el("button", { type: "button", "class": "btn btn--ghost btn--small", disabled: ui.page === 0, onclick: function () { ui.page--; renderDetalle(regs, k); } }, ["Anterior"]),
      el("button", { type: "button", "class": "btn btn--ghost btn--small", disabled: ui.page >= pages - 1, onclick: function () { ui.page++; renderDetalle(regs, k); } }, ["Siguiente"])
    ]));
    ultimoDetalle = { filas: filas, meses: meses };
  }
  var ultimoDetalle = null;
  function exportarCSV() {
    if (!ultimoDetalle) return;
    var meses = ultimoDetalle.meses;
    function q(v) { v = String(v == null ? "" : v); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
    var lines = [["Contrato", "Razón Social", "Segmento", "Tipo de Servicio", "Servicio"].concat(meses.map(M.mesTxt), ["Total"]).map(q).join(";")];
    ultimoDetalle.filas.forEach(function (o) { lines.push([o.r.contrato, o.r.cliente, o.r.segmento, o.r.tipo, o.r.servicio].concat(meses.map(function (m) { return o.r.v[m] || 0; }), [o.total]).map(q).join(";")); });
    descargar("\uFEFF" + lines.join("\r\n"), "matriz-envios-filtrado-" + hoyISO() + ".csv", "text/csv;charset=utf-8");
    toast("Se exportaron " + n(ultimoDetalle.filas.length) + " registros a CSV.");
  }
  function hoyISO() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function descargar(contenido, nombre, tipo) {
    var blob = new Blob([contenido], { type: tipo }), url = URL.createObjectURL(blob);
    var a = el("a", { href: url, download: nombre }); document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
  }

  /* ---------- Descargar dashboard con la base actual ---------- */
  /* Genera un HTML autocontenido: si la página usa archivos .css/.js de la misma carpeta (versión publicada), los embebe. */
  function htmlConBase() {
    var json = JSON.stringify(base).replace(/</g, "\\u003c");
    var h = HTML_ORIGEN.replace(/(<script id="base-datos" type="application\/json">)[\s\S]*?(<\/script>)/, function (_, a, b) { return a + json + b; });
    var externos = [], re = /<link rel="stylesheet" href="([^"]+)">|<script src="([^"]+)"><\/script>/g, m;
    while ((m = re.exec(h))) externos.push({ tag: m[0], url: m[1] || m[2], css: !!m[1] });
    return Promise.all(externos.map(function (x) {
      return fetch(x.url, { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error("No se pudo leer " + x.url); return r.text(); }).then(function (txt) { x.txt = txt; });
    })).then(function () {
      externos.forEach(function (x) {
        var inline = x.css ? "<style>\n" + x.txt + "\n</style>" : "<script>\n" + x.txt.replace(/<\/script/gi, "<\\/script") + "\n</" + "script>";
        h = h.split(x.tag).join(inline);
      });
      return h;
    });
  }
  function descargarDashboard() {
    if (base.fuente === "demo" && !confirm("La base actual son datos sintéticos. ¿Descargar igual el dashboard de prueba?")) return;
    htmlConBase().then(function (h) {
      descargar(h, "matriz-envios-dashboard-" + hoyISO() + ".html", "text/html;charset=utf-8");
      toast(base.fuente === "demo" ? "Se descargó el dashboard de prueba." : "Se descargó el dashboard con " + n(base.registros.length) + " registros. Guardalo en OneDrive (contiene datos de clientes).");
    }).catch(function (e) { toast("No se pudo generar el archivo: " + (e && e.message ? e.message : e)); });
  }

  /* ---------- Modal de actualización ---------- */
  var modalPrev = null, pendiente = null;
  function abrirModal() {
    modalPrev = document.activeElement; pendiente = null;
    $("modal-resultado").innerHTML = ""; $("archivo").value = ""; $("archivo-nombre").textContent = "";
    $("modal-aplicar").disabled = true; $("modal-aplicar").textContent = base.fuente === "demo" ? "Usar como base" : "Agregar a la base";
    $("modal").setAttribute("data-open", "true");
    document.body.style.overflow = "hidden";
    setTimeout(function () { $("modal-cerrar").focus(); }, 0);
  }
  function cerrarModal() { $("modal").setAttribute("data-open", "false"); document.body.style.overflow = ""; if (modalPrev && modalPrev.focus) modalPrev.focus(); }
  function focoAtrapado(ev) {
    if ($("modal").getAttribute("data-open") !== "true") return;
    if (ev.key === "Escape") { ev.preventDefault(); cerrarModal(); return; }
    if (ev.key !== "Tab") return;
    var foc = Array.prototype.filter.call($("modal").querySelectorAll("button, [href], input, select, summary, [tabindex]:not([tabindex='-1'])"), function (x) { return !x.disabled && x.offsetParent !== null; });
    if (!foc.length) return;
    var first = foc[0], last = foc[foc.length - 1];
    if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
  }
  function leerArchivo(file) {
    var res = $("modal-resultado"); res.innerHTML = "";
    $("archivo-nombre").textContent = file.name + " · " + fmt1.format(file.size / 1024) + " KB";
    $("modal-aplicar").disabled = true; pendiente = null;
    res.appendChild(alerta("info", ["Leyendo el archivo…"]));
    var esCSV = /\.(csv|txt)$/i.test(file.name);
    var p = esCSV ? file.text().then(M.parseCSV) : file.arrayBuffer().then(M.leerXLSX);
    p.then(function (rows) {
      var parsed = M.desdeFilas(rows);
      if (!parsed.registros.length) throw new Error("El archivo no tiene filas de detalle.");
      mostrarResumen(parsed, file.name);
    }).catch(function (e) {
      res.innerHTML = "";
      res.appendChild(alerta("error", [el("strong", { text: "No pude leer el archivo. " }), e && e.message ? e.message : String(e)]));
    });
  }
  function mostrarResumen(parsed, nombre) {
    var res = $("modal-resultado"); res.innerHTML = "";
    var esDemo = base.fuente === "demo";
    var d = M.diferencias(base, parsed);
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
    if (d.filtrosDistintos) res.appendChild(alerta("warning", [el("strong", { text: "Los filtros de la descarga no coinciden con los de la base. " }), "Base: " + base.filtros + " · Descarga: " + parsed.filtros]));
    else if (parsed.filtros) res.appendChild(el("p", { "class": "panel__sub", text: "Filtros de la descarga: " + parsed.filtros }));
    if (d.duplicados) res.appendChild(alerta("warning", [n(d.duplicados) + " registros repetidos en la descarga (misma clave): se toma el primero."]));
    if (parsed.fillDown) res.appendChild(alerta("info", ["Las etiquetas venían en blanco en las filas repetidas: se completaron hacia abajo."]));
    if (parsed.sinTipo) res.appendChild(alerta("info", [el("strong", { text: "La descarga no trae la columna «Tipo de Servicio». " }),
      esDemo ? "Los registros quedan como «" + M.NO_INF + "». Si una descarga posterior la trae, se completa sola sin duplicar registros."
        : n(d.tiposDeducidos) + " de " + n(parsed.registros.length) + " registros toman el tipo de la base (mismo contrato y servicio); el resto queda como «" + M.NO_INF + "»."]));
    var sinCon = parsed.registros.filter(function (r) { return r.contrato === M.SIN_CON; });
    if (sinCon.length) res.appendChild(alerta("warning", [n(sinCon.length) + " filas tienen servicio y envíos pero no tienen segmento, razón social ni contrato (" + n(sinCon.reduce(function (a, r) { return a + r.valores.reduce(function (x, y) { return x + y; }, 0); }, 0)) + " envíos). Se incluyen como «" + M.SIN_CON + "» para que el total cuadre."]));
    if (!esDemo && d.cambios.length) {
      res.appendChild(el("details", { "class": "details-data" }, [el("summary", { text: "Ver valores que cambian (" + n(d.cambios.length) + ")" }),
        el("div", { "class": "table-wrap", style: "margin-top:8px;max-height:240px" }, [tabla([{ t: "Contrato", f: function (x) { return x.contrato; } }, { t: "Servicio", f: function (x) { return x.servicio; } }, { t: "Mes", f: function (x) { return M.mesTxt(x.mes); } }, { t: "Antes", n: 1, f: function (x) { return n(x.antes); } }, { t: "Después", n: 1, f: function (x) { return n(x.despues); } }], d.cambios.slice(0, 200))])]));
    }
    if (esDemo) {
      res.appendChild(alerta("info", ["La base actual son datos sintéticos: esta descarga la va a ", el("strong", { text: "reemplazar" }), ". Los datos quedan solo en tu navegador."]));
      pendiente = { parsed: parsed, nombre: nombre, modo: "reemplazar" };
    } else {
      var grupo = el("fieldset", { "class": "choice", style: "border:0;padding:0;margin:0" }, [el("legend", { "class": "sr-only", text: "Cómo aplicar la descarga" }),
        el("label", null, [el("input", { type: "radio", name: "modo", value: "agregar", checked: true }), el("span", null, [el("strong", { text: "Agregar a la base (recomendado). " }), "Suma lo nuevo, reemplaza los meses que ya estaban y conserva lo que no viene."])]),
        el("label", null, [el("input", { type: "radio", name: "modo", value: "reemplazar" }), el("span", null, [el("strong", { text: "Reemplazar la base completa. " }), "Descarta la base actual y usa solo esta descarga."])])]);
      grupo.addEventListener("change", function (ev) { pendiente.modo = ev.target.value; $("modal-aplicar").textContent = ev.target.value === "agregar" ? "Agregar a la base" : "Reemplazar base"; });
      res.appendChild(grupo);
      pendiente = { parsed: parsed, nombre: nombre, modo: "agregar" };
    }
    $("modal-aplicar").disabled = false;
  }
  function aplicar() {
    if (!pendiente) return;
    var msg;
    if (pendiente.modo === "reemplazar") {
      base = M.nuevaBase(pendiente.parsed, "export", new Date(), pendiente.nombre);
      msg = "Base cargada: " + n(base.registros.length) + " registros, " + n(M.totalBase(base)) + " envíos.";
    } else {
      var d = M.fusionar(base, pendiente.parsed, pendiente.nombre, new Date());
      msg = "Base actualizada: " + n(d.nuevos.length) + " registros nuevos, " + n(d.cambios.length) + " valores cambiados" + (d.mesesNuevos.length ? ", meses nuevos: " + d.mesesNuevos.map(M.mesTxt).join(", ") : "") + ".";
    }
    var guardo = guardarLocal();
    pendiente = null; cerrarModal();
    f = filtrosVacios(); $("buscar").value = ""; ui.page = 0;
    var r = $("alerta-respaldo"); if (r) r.remove();
    renderTodo();
    var a = alerta("success", [el("strong", { text: msg + " " }), guardo ? "Quedó un respaldo en este navegador. " : "", "Para guardarla en un archivo tocá ", el("strong", { text: "Descargar dashboard" }), " y guardalo en OneDrive (no lo subas a GitHub: tiene datos de clientes)."],
      [el("button", { type: "button", "class": "btn btn--secondary btn--small", onclick: descargarDashboard }, ["Descargar dashboard"])]);
    $("alertas").appendChild(a);
    toast(msg);
    $("contenido").focus();
  }

  /* ---------- Render general ---------- */
  function renderTodo() {
    renderAlertas(); renderBase(); renderFiltros(); renderActivos();
    var regs = M.filtrar(base, f), k = M.kpis(base, regs, f.meses);
    renderKpis(k);
    chartEvolucion(regs, k); chartMix(regs, k);
    var seg = M.agrupar(regs, M.segDe, k.meses).filter(function (x) { return x.envios > 0; }).sort(function (a, b) { return b.envios - a.envios; }).slice(0, 12);
    chartBarras("ch-segmentos", seg, f.segmentos, function (v) { toggle(f.segmentos, v); cambio(); }, "Envíos por segmento");
    var sv = M.agrupar(regs, function (r) { return r.servicio; }, k.meses).filter(function (x) { return x.envios > 0; }).sort(function (a, b) { return b.envios - a.envios; }).slice(0, 12);
    chartBarras("ch-servicios", sv, f.servicios, function (v) { toggle(f.servicios, v); cambio(); }, "Servicios con más envíos");
    renderRankings(regs, k); renderTabs(regs, k); renderCalidad(); renderDetalle(regs, k);
  }

  /* ---------- Eventos ---------- */
  var tBuscar;
  $("buscar").addEventListener("input", function (ev) { clearTimeout(tBuscar); tBuscar = setTimeout(function () { f.texto = ev.target.value.trim(); cambio(); }, 250); });
  $("btn-limpiar").addEventListener("click", function () { f = filtrosVacios(); $("buscar").value = ""; cambio(); toast("Se limpiaron los filtros."); });
  $("btn-csv").addEventListener("click", exportarCSV);
  $("btn-descargar").addEventListener("click", descargarDashboard);
  $("btn-actualizar").addEventListener("click", abrirModal);
  $("modal-cerrar").addEventListener("click", cerrarModal);
  $("modal-cancelar").addEventListener("click", cerrarModal);
  $("modal-aplicar").addEventListener("click", aplicar);
  $("modal").addEventListener("click", function (ev) { if (ev.target === $("modal")) cerrarModal(); });
  document.addEventListener("keydown", focoAtrapado);
  $("archivo").addEventListener("change", function (ev) { if (ev.target.files[0]) leerArchivo(ev.target.files[0]); });
  var drop = $("drop");
  ["dragenter", "dragover"].forEach(function (t) { drop.addEventListener(t, function (ev) { ev.preventDefault(); drop.setAttribute("data-over", "true"); }); });
  ["dragleave", "drop"].forEach(function (t) { drop.addEventListener(t, function (ev) { ev.preventDefault(); drop.setAttribute("data-over", "false"); }); });
  drop.addEventListener("drop", function (ev) { var fl = ev.dataTransfer && ev.dataTransfer.files[0]; if (fl) leerArchivo(fl); });

  try {
    cargarBase();
    renderTodo();
  } catch (e) {
    $("alertas").appendChild(alerta("error", [el("strong", { text: "Error al iniciar el dashboard: " }), e && e.message ? e.message : String(e)]));
    if (window.console) console.error(e);
  }
  window.__MATRIZ_APP__ = { base: function () { return base; }, filtros: function () { return f; }, htmlConBase: htmlConBase };
})();
/* ==APP-END== */
