/* ==APP-START== Interfaz del dashboard: Resumen · Análisis · Migración a DMS */
(function () {
  "use strict";
  var M = MATRIZ, U = MATRIZ_UI;
  var n = U.n, pct = U.pct, corto = U.corto, fecha = U.fecha, $ = U.$, el = U.el, svgIcon = U.svgIcon, badge = U.badge, alerta = U.alerta, toast = U.toast, share = U.share, tabla = U.tabla;
  /* Copia del HTML original, antes de renderizar: se usa para "Descargar dashboard" */
  var HTML_ORIGEN = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;
  var LS_KEY = "andreani.matriz-envios.base.v1";

  /* ---------- Estado ---------- */
  var VISTAS = [{ id: "resumen", t: "Resumen" }, { id: "analisis", t: "Análisis" }, { id: "migracion", t: "Migración a DMS" }];
  var base, f, ui = { vista: "resumen", tab: "crec", sortKey: "jer", sortDir: 1, page: 0, pageSize: 25, verTodoTab: false, abiertos: {}, limites: {}, migAbiertos: {}, migLimites: {}, migVer: "todo", deshacer: null };
  function filtrosVacios() { return { segmentos: [], clientes: [], tipos: [], servicios: [], contratos: [], meses: [], texto: "" }; }
  f = filtrosVacios();
  try { var h = (window.location && window.location.hash || "").replace("#", ""); if (VISTAS.some(function (v) { return v.id === h; })) ui.vista = h; } catch (e) { /* sin location */ }

  function cargarBase() {
    var emb = null;
    try { emb = JSON.parse($("base-datos").textContent); } catch (e) { emb = null; }
    base = emb || M.demo();
    var guardada = null;
    try { guardada = JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch (e) { guardada = null; }
    if (guardada && guardada.registros && guardada.actualizado && guardada.fuente !== "demo" && (base.fuente === "demo" || guardada.actualizado > base.actualizado)) mostrarAlertaRespaldo(guardada);
  }
  /* En la prueba con datos sintéticos no se guarda nada, para no pisar una base real guardada */
  function guardarLocal() {
    if (base.fuente === "demo") return false;
    try { localStorage.setItem(LS_KEY, JSON.stringify(base)); return true; }
    catch (e) { toast("No se pudo guardar el respaldo en el navegador (espacio insuficiente). Descargá el dashboard para no perder la base."); return false; }
  }

  /* ---------- Alertas y encabezado ---------- */
  function renderAlertas() {
    var c = $("alertas");
    Array.prototype.slice.call(c.querySelectorAll("[data-auto]")).forEach(function (x) { x.remove(); });
    if (base.fuente === "demo") {
      var a = alerta("info", [el("strong", { text: "Datos sintéticos de prueba: " }), "clientes y contratos inventados. Cargá el Excel de Power BI para ver tus datos (se procesa en tu navegador, no se sube a GitHub)."],
        [el("button", { type: "button", "class": "btn btn--secondary btn--small", onclick: abrirModal }, [svgIcon("upload", 16), "Cargar mi Excel"])]);
      a.setAttribute("data-auto", ""); a.classList.add("alert--compacta"); c.insertBefore(a, c.firstChild);
    }
  }
  function mostrarAlertaRespaldo(g) {
    var a = alerta("warning", [el("strong", { text: "Hay una base guardada en este navegador" }),
      " (" + n(g.registros.length) + " registros, actualizada el " + fecha(g.actualizado) + "). ¿Querés usarla?"], [
      el("button", { type: "button", "class": "btn btn--secondary btn--small", onclick: function () { base = g; a.remove(); f = filtrosVacios(); renderTodo(); toast("Se cargó la base guardada en el navegador."); } }, ["Usar base guardada"]),
      el("button", { type: "button", "class": "btn btn--ghost btn--small", onclick: function () { if (confirm("¿Borrar la base guardada en este navegador? No se puede deshacer.")) { localStorage.removeItem(LS_KEY); a.remove(); } } }, ["Borrar respaldo"])
    ], "alerta-respaldo");
    $("alertas").appendChild(a);
  }
  function periodoTxt() { return M.mesTxt(base.meses[0]) + " a " + M.mesTxt(base.meses[base.meses.length - 1]) + (base.mesParcial ? " (" + M.mesTxt(base.mesParcial) + " parcial)" : ""); }
  function renderBase() {
    var total = M.totalBase(base);
    $("subtitulo").textContent = periodoTxt() + " · " + n(total) + " envíos · " + n(base.registros.length) + " registros · actualizada " + fecha(base.actualizado);
    var est = $("estado-base"); est.innerHTML = "";
    est.appendChild(base.fuente === "demo" ? badge("warning", "Prueba · datos sintéticos") : badge("ok", "Base real"));
    var ab = $("about-meta"); ab.innerHTML = "";
    [["Origen", base.fuente === "demo" ? "Datos sintéticos (prueba)" : "Matriz de Envíos · Power BI"], ["Período", periodoTxt()],
      ["Filtros del export", base.filtros || "—"], ["Clave de registro", "N° contrato + tipo de servicio + servicio"], ["Actualizada", fecha(base.actualizado)]
    ].forEach(function (x) { ab.appendChild(el("dt", { text: x[0] })); ab.appendChild(el("dd", { text: x[1] })); });
    var meta = $("base-meta"); meta.innerHTML = "";
    [["Origen", base.fuente === "demo" ? "Datos sintéticos (prueba)" : "Descarga de Power BI"], ["Registros", n(base.registros.length) + " (contrato + tipo + servicio)"],
      ["Período", periodoTxt()], ["Envíos", n(total)], ["Filtros del export", base.filtros || "—"], ["Actualizada", fecha(base.actualizado)]
    ].forEach(function (x) { meta.appendChild(el("dt", { text: x[0] })); meta.appendChild(el("dd", { text: x[1] })); });
    var hh = $("historial"); hh.innerHTML = "";
    (base.historial || []).slice().reverse().slice(0, 8).forEach(function (x) {
      hh.appendChild(el("li", null, [el("strong", { text: fecha(x.fecha) + " · " + (x.accion || "Actualización") }), el("br"),
        el("span", { text: (x.archivo ? x.archivo + " · " : "") + n(x.nuevos) + " registros nuevos · " + n(x.cambios) + " valores cambiados" + (x.mesesNuevos && x.mesesNuevos.length ? " · meses: " + x.mesesNuevos.map(M.mesTxt).join(", ") : "") + " · total " + n(x.total) })]));
    });
    $("footer-base").textContent = "Base actualizada: " + fecha(base.actualizado);
  }

  /* ---------- Pestañas principales ---------- */
  function renderVistas() {
    var bar = $("vistas"); bar.innerHTML = "";
    VISTAS.forEach(function (v, i) {
      var sel = ui.vista === v.id;
      bar.appendChild(el("button", { type: "button", role: "tab", "class": "tab tab--vista", id: "vtab-" + v.id, "aria-controls": "vista-" + v.id, "aria-selected": sel ? "true" : "false", tabindex: sel ? "0" : "-1",
        onclick: function () { irA(v.id, false); },
        onkeydown: function (ev) {
          var j = null; if (ev.key === "ArrowRight") j = (i + 1) % VISTAS.length; else if (ev.key === "ArrowLeft") j = (i - 1 + VISTAS.length) % VISTAS.length; else if (ev.key === "Home") j = 0; else if (ev.key === "End") j = VISTAS.length - 1;
          if (j != null) { ev.preventDefault(); irA(VISTAS[j].id, true); }
        } }, [v.t]));
      $("vista-" + v.id).hidden = !sel;
    });
  }
  function irA(id, foco) {
    ui.vista = id;
    try { if (window.history && history.replaceState) history.replaceState(null, "", "#" + id); } catch (e) { /* file:// */ }
    renderTodo();
    if (foco) $("vtab-" + id).focus();
  }

  /* ---------- Barra de filtros: select múltiple con búsqueda, en cascada (D-018, D-021) ---------- */
  function mesesSel() { return f.meses.length ? base.meses.filter(function (m) { return f.meses.indexOf(m) >= 0; }) : base.meses; }
  function toggle(arr, v) { var i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); }
  function renderBarra() {
    var c = $("barra"); c.innerHTML = "";
    M.NIVELES.forEach(function (N, i) {
      c.appendChild(U.multiSelect({ id: N.id, num: i + 1, etiqueta: N.nombre, seleccion: f[N.id], onCambio: cambio,
        opciones: function () { return M.opciones(base, f, i, mesesSel()); } }));
      if (i < M.NIVELES.length - 1) c.appendChild(el("span", { "class": "barra__sep", "aria-hidden": "true" }, ["›"]));
    });
    c.appendChild(U.multiSelect({ id: "meses", etiqueta: "Período", seleccion: f.meses, formato: M.mesTxt, onCambio: cambio,
      opciones: function () {
        var regs = M.filtrar(base, f);
        return base.meses.map(function (m) { var t = 0; regs.forEach(function (r) { t += r.v[m] || 0; }); return { valor: m, texto: M.mesTxt(m) + (m === base.mesParcial ? " (parcial)" : ""), envios: t }; });
      } }));
    var hay = M.NIVELES.some(function (N) { return f[N.id].length; }) || f.meses.length;
    c.appendChild(el("button", { type: "button", "class": "btn btn--ghost btn--small barra__limpiar", disabled: !hay, onclick: function () { f = filtrosVacios(); U.cerrarLista(false); cambio(); toast("Se limpiaron los filtros."); } }, [svgIcon("close", 16), "Limpiar"]));
    renderActivos();
  }
  function renderActivos() {
    var c = $("filtros-activos"); c.innerHTML = "";
    var tags = [];
    function tag(txt, quitar) { tags.push(el("span", { "class": "tag" }, [txt, el("button", { type: "button", "aria-label": "Quitar filtro " + txt, onclick: function () { quitar(); cambio(); } }, [svgIcon("close", 14)])])); }
    M.NIVELES.forEach(function (N) { f[N.id].forEach(function (v) { tag(N.nombre + ": " + v, function () { toggle(f[N.id], v); }); }); });
    f.meses.forEach(function (m) { tag("Período: " + M.mesTxt(m), function () { toggle(f.meses, m); }); });
    c.hidden = !tags.length;
    tags.forEach(function (t) { c.appendChild(t); });
  }
  /* Cada cambio poda selecciones inferiores incompatibles; la lista abierta sigue abierta */
  function cambio() {
    var act = document.activeElement, fid = act && act.getAttribute ? act.getAttribute("data-fid") : null;
    var quitadas = M.podar(base, f);
    ui.page = 0; renderTodo();
    if (quitadas) toast("Se quitaron " + quitadas + " selecciones de niveles inferiores que ya no corresponden a lo elegido arriba.");
    if (U.hayAbierto()) U.reabrir(); else U.enfocar(fid);
  }

  /* ---------- KPIs ---------- */
  function kpiCard(icono, titulo, valor, sub, extra) {
    return el("li", { "class": "kpi" }, [el("span", { "class": "kpi__label" }, [svgIcon(icono, 20), titulo]), el("span", { "class": "kpi__value" }, [valor]), extra || null, el("span", { "class": "kpi__sub" }, [sub])]);
  }
  function renderKpis(k) {
    var c = $("kpis"); c.innerHTML = "";
    var varEl = "—";
    if (k.variacion != null) { var up = k.variacion >= 0; varEl = el("span", { "class": "trend trend--" + (up ? "up" : "down") }, [svgIcon(up ? "up" : "down", 20), (up ? "Sube " : "Baja ") + pct(Math.abs(k.variacion))]); }
    [["box", "Envíos", n(k.envios), k.meses.length + (k.meses.length === 1 ? " mes" : " meses") + (base.mesParcial && k.meses.indexOf(base.mesParcial) >= 0 ? " · incluye " + M.mesTxt(base.mesParcial) + " parcial" : "")],
      ["user", "Clientes", n(k.clientes), "Razones sociales con envíos"],
      ["doc", "Contratos", n(k.contratos), k.mesUltimo ? n(k.contratosActivos) + " activos en " + M.mesTxt(k.mesUltimo) : ""],
      ["cal", "Promedio mensual", n(k.promedioMensual), n(k.enviosPorContrato) + " envíos por contrato"],
      ["trend", "Variación mensual", varEl, k.mesUltimo && k.mesPrevio ? M.mesTxt(k.mesUltimo) + " vs " + M.mesTxt(k.mesPrevio) + " (meses completos)" : "Se necesitan 2 meses completos"],
      ["pie", "Concentración top 10", pct(k.concentracionTop10), "Sin clientes internos"],
      ["star", "Clientes nuevos", n(k.clientesNuevos), "Primer envío después de " + M.mesTxt(base.meses[0])],
      ["grid", "Servicios", n(k.servicios), n(k.segmentos) + " segmentos"]
    ].forEach(function (it) { c.appendChild(kpiCard(it[0], it[1], it[2], it[3])); });
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
  function conTip(g, texto) {
    g.addEventListener("mousemove", function (ev) { var tip = $("tip"); tip.textContent = texto; tip.style.display = "block"; tip.style.left = Math.min(ev.clientX + 12, window.innerWidth - 290) + "px"; tip.style.top = (ev.clientY + 12) + "px"; });
    g.addEventListener("mouseleave", function () { $("tip").style.display = "none"; });
  }
  function serieTipo(t) { if (/paquet/i.test(t)) return "s1"; if (/sobre/i.test(t)) return "s2"; if (/inversa/i.test(t)) return "s3"; if (/sin servicio|no informado/i.test(t)) return "s4"; return "s5"; }
  function tiposOrdenados() { var u = {}; base.registros.forEach(function (r) { u[r.tipo] = 1; }); return Object.keys(u).sort(); }
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
      tipos.forEach(function (t) { if (!d[t]) return; var hh = (H - T - B) * d[t] / max; y0 -= hh; grp.appendChild(s("rect", { "class": serieTipo(t), x: x, y: y0, width: w, height: Math.max(hh, 0) })); });
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
    var R0 = 100, R1 = 62, cx = 110, cy = 110, a0 = -Math.PI / 2;
    var svg = s("svg", { "class": "chart", viewBox: "0 0 220 220", style: "max-width:240px", role: "img", "aria-label": "Participación por tipo: " + tipos.map(function (t) { return t + " " + pct(tot[t] / total); }).join("; ") });
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
    c.appendChild(el("ul", { "class": "legend", style: "flex-direction:column" }, tipos.map(function (t) { return el("li", null, [el("span", { "class": "sw " + serieTipo(t), "aria-hidden": "true" }), t + " · " + pct(tot[t] / total) + " · " + n(tot[t])]); })));
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
      var g = s("g", { "class": "clickable" + (sel ? " sel" : ""), tabindex: 0, role: "button", "aria-pressed": sel ? "true" : "false", "data-fid": contId + ":" + d.clave, "aria-label": d.clave + ": " + n(d.envios) + " envíos. " + (sel ? "Filtro activo, activá para quitarlo." : "Activá para filtrar.") });
      g.appendChild(s("rect", { "class": "bar-h-bg", x: L, y: y + 4, width: W - L - Rv, height: rowH - 10, rx: 4 }));
      g.appendChild(s("rect", { "class": "bar-h", x: L, y: y + 4, width: w, height: rowH - 10, rx: 4 }));
      g.appendChild(s("text", { x: L - 8, y: y + rowH / 2 + 3, "text-anchor": "end", "class": sel ? "bar-label" : null }, [(sel ? "✓ " : "") + etiqueta]));
      g.appendChild(s("text", { x: W - Rv + 8, y: y + rowH / 2 + 3, "class": "bar-label" }, [corto(d.envios)]));
      /* Anillo de foco: fill/stroke explícitos para que nunca se pinte negro (D-012) */
      g.appendChild(s("rect", { "class": "focus-ring", x: 1, y: y + 1, width: W - 2, height: rowH - 4, rx: 6, fill: "none", stroke: "none" }));
      conTip(g, d.clave + " · " + n(d.envios) + " envíos · " + n(d.clientes) + " clientes · " + n(d.contratos) + " contratos");
      g.addEventListener("click", function () { onPick(d.clave); });
      g.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); onPick(d.clave); } });
      svg.appendChild(g);
    });
    c.appendChild(svg);
  }

  /* ---------- Rankings ---------- */
  function linkCliente(nombre) {
    if (nombre === M.SIN_RS) return el("span", { text: nombre });
    return el("button", { type: "button", "class": "linkbtn", title: "Filtrar por este cliente", onclick: function () { if (f.clientes.indexOf(nombre) < 0) { f.clientes.push(nombre); cambio(); toast("Filtro: Razón social = " + nombre); } } }, [nombre]);
  }
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
      bar.appendChild(el("button", { type: "button", role: "tab", "class": "tab", id: "tab-" + tb.id, "aria-controls": "tab-panel", "aria-selected": ui.tab === tb.id ? "true" : "false", tabindex: ui.tab === tb.id ? "0" : "-1",
        onclick: function () { ui.tab = tb.id; ui.verTodoTab = false; renderTabs(regs, k); },
        onkeydown: function (ev) {
          var j = null; if (ev.key === "ArrowRight") j = (i + 1) % TABS.length; else if (ev.key === "ArrowLeft") j = (i - 1 + TABS.length) % TABS.length; else if (ev.key === "Home") j = 0; else if (ev.key === "End") j = TABS.length - 1;
          if (j != null) { ev.preventDefault(); ui.tab = TABS[j].id; ui.verTodoTab = false; renderTabs(regs, k); $("tab-" + TABS[j].id).focus(); }
        } }, [tb.t]));
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
      filas = M.agrupar(regs.filter(function (r) { return M.sumaMeses(r, k.meses) > 0; }), M.cliDe, k.meses).filter(function (r) { return r.servicios > 1; }).sort(function (a, b) { return b.servicios - a.servicios || b.envios - a.envios; });
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

  /* ---------- Árbol jerárquico (Resumen y Migración) ----------
     SEGMENTO > RAZÓN SOCIAL > TIPO > SERVICIO > N° CONTRATO (D-018). cfg.mig = true agrega casillas de migración (D-020). */
  var PASO = 25;
  function renderArbol(contId, regs, k, cfg) {
    var cont = $(contId); cont.innerHTML = "";
    var ref = k.mesUltimo, total = k.envios || 0, tbody = el("tbody");
    var abiertos = cfg.mig ? ui.migAbiertos : ui.abiertos, limites = cfg.mig ? ui.migLimites : ui.limites;
    var pref = cfg.mig ? "mig" : "arbol";
    var colsN = cfg.mig ? 6 : 6;
    function redibujar(fid) { if (cfg.mig) renderTodo(); else renderArbol(contId, regs, k, cfg); U.enfocar(fid); }
    function fila(g, nivel, ruta) {
      var N = M.NIVELES[nivel], hoja = nivel === M.NIVELES.length - 1, key = ruta.concat([g.clave]).join("\u0001");
      var abierto = !hoja && !!abiertos[key];
      var nombre = el("span", { "class": "arbol__nombre" }, [el("span", { "class": "sr-only", text: N.nombre + ": " }), g.clave]);
      var celda = hoja
        ? el("span", { "class": "arbol__hoja num" }, [el("span", { "class": "arbol__punto", "aria-hidden": "true" }), nombre])
        : el("button", { type: "button", "class": "arbol__toggle", "aria-expanded": abierto ? "true" : "false", "data-fid": pref + ":" + key,
            onclick: function () { if (abiertos[key]) delete abiertos[key]; else abiertos[key] = 1; redibujar(pref + ":" + key); } },
            [svgIcon(abierto ? "down" : "right", 18), nombre]);
      var primera = [];
      var rm = null;
      if (cfg.mig) {
        rm = M.resumenMigracion(base, g.regs, k.meses, ref);
        var chk = el("input", { type: "checkbox", "class": "mig-check", "data-fid": "migchk:" + key,
          "aria-label": "Marcar " + N.nombre.toLowerCase() + " " + g.clave + " como migrado a DMS (" + n(rm.registros) + " registros)" });
        chk.checked = rm.estado === "migrado"; chk.indeterminate = rm.estado === "parcial";
        if (rm.estado === "parcial") chk.setAttribute("aria-checked", "mixed");
        chk.addEventListener("change", function () { ui.migAviso = null; aplicarMarca(g.regs, rm.estado !== "migrado", N.nombre + " " + g.clave, "migchk:" + key); });
        primera.push(chk);
      }
      primera.push(celda, el("span", { "class": "badge badge--neutral arbol__nivel" }, [N.nombre]));
      var celdas = [el("td", { "class": "arbol__celda", style: "padding-left:calc(var(--c-spacing-4) + " + (nivel * 24) + "px)" }, primera),
        el("td", { "class": "n", text: n(g.envios) })];
      if (cfg.mig) {
        celdas.push(el("td", { "class": "n", text: nivel < 4 ? n(rm.contratos.completos) + " / " + n(rm.contratos.total) : "—" }));
        celdas.push(el("td", null, [estadoBadge(rm)]));
        celdas.push(el("td", { "class": "n" }, [U.progreso(rm.enviosMigrados, rm.envios, "Envíos migrados de " + g.clave)]));
        celdas.push(el("td", { "class": "n", text: rm.estado === "migrado" && hoja ? (M.migracion(base).marcas[M.clave(g.regs[0])] || "") : "" }));
      } else {
        celdas.push(el("td", { "class": "n" }, [share(g.envios, total)]));
        celdas.push(el("td", { "class": "n", text: nivel < 1 ? n(g.clientes) : "—" }));
        celdas.push(el("td", { "class": "n", text: nivel < 4 ? n(g.contratos) : "—" }));
        celdas.push(el("td", { "class": "n", text: ref ? n(g.ref) : "—" }));
      }
      tbody.appendChild(el("tr", { "class": "arbol__fila arbol__fila--n" + nivel + (rm && rm.estado === "migrado" ? " arbol__fila--migrado" : "") }, celdas));
      if (abierto) hijos(g.regs, nivel + 1, ruta.concat([g.clave]));
    }
    function hijos(rs, nivel, ruta) {
      var grupos = M.grupoNivel(rs, nivel, k.meses, ref).filter(function (g) { return g.envios > 0 || nivel > 0 || cfg.mig; });
      var lk = ruta.join("\u0001") || "__raiz", lim = limites[lk] || PASO;
      grupos.slice(0, lim).forEach(function (g) { fila(g, nivel, ruta); });
      if (grupos.length > lim) {
        tbody.appendChild(el("tr", null, [el("td", { colspan: colsN, style: "padding-left:calc(var(--c-spacing-4) + " + (nivel * 24) + "px)" }, [
          el("button", { type: "button", "class": "btn btn--ghost btn--small", "data-fid": pref + "mas:" + lk, onclick: function () { limites[lk] = lim + PASO; redibujar(pref + "mas:" + lk); } },
            ["Mostrar " + Math.min(PASO, grupos.length - lim) + " más (" + n(grupos.length - lim) + " restantes de " + M.NIVELES[nivel].nombre.toLowerCase() + ")"])])]));
      }
    }
    hijos(regs, 0, []);
    if (!regs.length) tbody.appendChild(el("tr", null, [el("td", { colspan: colsN, "class": "empty-row", text: cfg.vacio || "Sin resultados para los filtros elegidos." })]));
    var ths = cfg.mig
      ? ["Envíos", "Contratos migrados", "Estado", "Envíos migrados", "Fecha"]
      : ["Envíos", "% del universo", "Clientes", "Contratos", ref ? M.mesTxt(ref) + " (últ. mes completo)" : "Últ. mes completo"];
    var head = el("thead", null, [el("tr", null, [el("th", { scope: "col", text: M.NIVELES.map(function (x) { return x.nombre; }).join(" › ") })].concat(ths.map(function (t, i) { return el("th", { scope: "col", "class": cfg.mig && i === 2 ? null : "n", text: t }); })))]);
    cont.appendChild(el("div", { "class": "table-wrap" }, [el("table", { "class": "arbol" }, [el("caption", { "class": "sr-only", text: cfg.caption }), head, tbody])]));
  }

  /* ---------- Migración a DMS (D-020) ---------- */
  function estadoBadge(rm) {
    if (rm.estado === "migrado") return badge("ok", "Migrado", "ok");
    if (rm.estado === "parcial") return badge("warning", "Parcial · " + pct(rm.registrosMigrados / rm.registros), "half");
    return el("span", { "class": "badge badge--neutral" }, [svgIcon("clock", 14), "Pendiente"]);
  }
  function hoyISO() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function aplicarMarca(regs, valor, desc, fid) {
    var cambios = M.marcarMigrado(base, regs, valor, hoyISO(), desc);
    if (!cambios.length) { toast("No hay cambios: " + desc + (valor ? " ya estaba migrado." : " no tenía marcas.")); return; }
    ui.deshacer = { cambios: cambios, desc: (valor ? "marcar " : "desmarcar ") + desc };
    var guardo = guardarLocal();
    renderTodo(); U.enfocar(fid);
    toast((valor ? "Marcados como migrados: " : "Desmarcados: ") + n(cambios.length) + " registros (" + desc + ")." + (base.fuente === "demo" ? " En la prueba con datos sintéticos no se guarda." : guardo ? " Guardado en este navegador." : ""));
  }
  function regsMig(regs) {
    if (ui.migVer === "todo") return regs;
    var mk = M.migracion(base).marcas;
    return regs.filter(function (r) { var m = !!mk[M.clave(r)]; return ui.migVer === "mig" ? m : !m; });
  }
  function hayFiltros() { return M.NIVELES.some(function (N) { return f[N.id].length; }); }
  function renderMigracion(regs, k) {
    var rm = M.resumenMigracion(base, regs, k.meses, k.mesUltimo);
    var c = $("mig-kpis"); c.innerHTML = "";
    c.appendChild(kpiCard("box", "Envíos migrados", pct(rm.envios ? rm.enviosMigrados / rm.envios : 0), n(rm.enviosMigrados) + " de " + n(rm.envios) + " envíos del período", U.progreso(rm.enviosMigrados, rm.envios, "Envíos migrados")));
    c.appendChild(kpiCard("cal", k.mesUltimo ? "Volumen " + M.mesTxt(k.mesUltimo) : "Último mes completo", pct(rm.ref ? rm.refMigrado / rm.ref : 0), k.mesUltimo ? n(rm.refMigrado) + " de " + n(rm.ref) + " envíos del último mes completo" : "Sin meses completos", U.progreso(rm.refMigrado, rm.ref, "Volumen del último mes completo migrado")));
    c.appendChild(kpiCard("doc", "Contratos migrados", n(rm.contratos.completos) + " / " + n(rm.contratos.total), n(rm.contratos.parciales) + " con algunos servicios migrados", U.progreso(rm.contratos.completos, rm.contratos.total, "Contratos migrados")));
    c.appendChild(kpiCard("user", "Clientes migrados", n(rm.clientes.completos) + " / " + n(rm.clientes.total), n(rm.clientes.parciales) + " con migración parcial", U.progreso(rm.clientes.completos, rm.clientes.total, "Clientes migrados")));
    /* Aviso inicial */
    var av = $("mig-aviso"); av.innerHTML = "";
    if (ui.migAviso) av.appendChild(alerta(ui.migAviso.nivel, ui.migAviso.contenido, [el("button", { type: "button", "class": "btn btn--ghost btn--small", onclick: function () { ui.migAviso = null; renderTodo(); $("t-mig-arbol").focus(); } }, ["Cerrar aviso"])]));
    else if (!Object.keys(M.migracion(base).marcas).length) av.appendChild(alerta("info", [el("strong", { text: "Todavía no hay nada marcado como migrado. " }),
      "Marcá la casilla de un contrato, servicio, razón social o segmento completo en la tabla de abajo, usá «Marcar lo filtrado» con la barra de filtros (por ejemplo, un servicio en todos los clientes) o importá una lista de contratos."]));
    /* Avance por segmento */
    var segs = M.grupoNivel(regs, 0, k.meses, k.mesUltimo).filter(function (g) { return g.envios > 0; }).map(function (g) { var r = M.resumenMigracion(base, g.regs, k.meses, k.mesUltimo); r.clave = g.clave; return r; });
    var cs = $("mig-segmentos"); cs.innerHTML = "";
    cs.appendChild(el("div", { "class": "table-wrap" }, [tabla([
      { t: "Segmento", f: function (r) { return r.clave; } }, { t: "Envíos", n: 1, f: function (r) { return n(r.envios); } },
      { t: "Contratos migrados", n: 1, f: function (r) { return n(r.contratos.completos) + " / " + n(r.contratos.total); } },
      { t: "Estado", f: function (r) { return estadoBadge(r); } },
      { t: "Envíos migrados", n: 1, f: function (r) { return U.progreso(r.enviosMigrados, r.envios, "Envíos migrados de " + r.clave); } }
    ], segs, { caption: "Avance de la migración por segmento" })]));
    /* Últimos cambios */
    var hh = $("mig-hist"); hh.innerHTML = "";
    var hist = M.migracion(base).historial.slice().reverse().slice(0, 8);
    if (!hist.length) hh.appendChild(el("li", { text: "Sin cambios todavía." }));
    hist.forEach(function (x) { hh.appendChild(el("li", null, [el("strong", { text: fecha(x.fecha) + " · " + x.accion }), el("br"), el("span", { text: n(x.registros) + " registros · " + x.desc })])); });
    /* Barra de acciones */
    var filt = hayFiltros(), desc = filt ? "lo filtrado (" + n(regs.length) + " registros)" : "todo el universo (" + n(regs.length) + " registros)";
    $("mig-marcar").textContent = "Marcar " + desc;
    $("mig-desmarcar").textContent = "Desmarcar " + desc;
    $("mig-deshacer").disabled = !ui.deshacer;
    $("mig-deshacer-txt").textContent = ui.deshacer ? "Deshacer: " + ui.deshacer.desc : "Deshacer";
    $("mig-ver").value = ui.migVer;
    renderArbol("mig-arbol", regsMig(regs), k, { mig: true, caption: "Selección de lo migrado a DMS por segmento, razón social, tipo de servicio, servicio y contrato.", vacio: ui.migVer === "mig" ? "No hay nada migrado con estos filtros." : "Sin resultados para los filtros elegidos." });
  }
  function descFiltros() {
    var partes = [];
    M.NIVELES.forEach(function (N) { if (f[N.id].length) partes.push(N.nombre + ": " + (f[N.id].length === 1 ? f[N.id][0] : f[N.id].length + " valores")); });
    return partes.length ? partes.join(" · ") : "todo el universo";
  }
  function marcarFiltrado(valor) {
    var regs = M.filtrar(base, f);
    ui.migAviso = null;
    if (!hayFiltros() && valor && !confirm("No hay filtros: se va a marcar TODO el universo (" + n(regs.length) + " registros) como migrado. ¿Continuar?")) return;
    aplicarMarca(regs, valor, descFiltros(), valor ? "mig-marcar-btn" : "mig-desmarcar-btn");
  }
  function deshacer() {
    if (!ui.deshacer) return;
    M.deshacerMigrado(base, ui.deshacer.cambios, ui.deshacer.desc);
    toast("Se deshizo: " + ui.deshacer.desc + " (" + n(ui.deshacer.cambios.length) + " registros).");
    ui.deshacer = null; guardarLocal(); renderTodo(); $("mig-deshacer").focus();
  }
  function exportarMigracion() {
    var mk = M.migracion(base).marcas, regs = M.filtrar(base, f).slice().sort(M.compararJer);
    function q(v) { v = String(v == null ? "" : v); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
    var lines = [["Segmento", "Razón Social", "Tipo de Servicio", "Servicio", "N° Contrato", "Migrado a DMS", "Fecha de marca"].map(q).join(";")];
    regs.forEach(function (r) { var m = mk[M.clave(r)]; lines.push([r.segmento, r.cliente, r.tipo, r.servicio, r.contrato, m ? "SI" : "NO", m || ""].map(q).join(";")); });
    descargar("\uFEFF" + lines.join("\r\n"), "migracion-dms-estado-" + hoyISO() + ".csv", "text/csv;charset=utf-8");
    toast("Se exportó el estado de " + n(regs.length) + " registros.");
  }
  function importarContratos(file) {
    var esCSV = /\.(csv|txt)$/i.test(file.name);
    (esCSV ? file.text().then(M.parseCSV) : file.arrayBuffer().then(M.leerXLSX)).then(function (rows) {
      var lista = M.contratosDesdeFilas(rows);
      if (!lista.length) throw new Error("No encontré números de contrato (columna «Contrato» o números de 6 a 12 dígitos).");
      var set = {}; lista.forEach(function (c) { set[c] = 1; });
      var regs = base.registros.filter(function (r) { return set[r.contrato]; });
      var encontrados = {}; regs.forEach(function (r) { encontrados[r.contrato] = 1; });
      var faltan = lista.filter(function (c) { return !encontrados[c]; });
      ui.migAviso = { nivel: faltan.length ? "warning" : "ok", contenido: [el("strong", { text: file.name + ": " }), n(lista.length) + " contratos en el archivo, " + n(Object.keys(encontrados).length) + " encontrados en la base" + (faltan.length ? ", " + n(faltan.length) + " no están en la base (ej.: " + faltan.slice(0, 5).join(", ") + ")." : ".")] };
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
    function val(o) { if (key === "total") return o.total; if (key.indexOf("m:") === 0) return o.r.v[key.slice(2)] || 0; if (key === "cliente") return M.cliDe(o.r); if (key === "segmento") return M.segDe(o.r); return o.r[key]; }
    if (key === "jer") filas.sort(function (a, b) { return M.compararJer(a.r, b.r) * dir; });
    else filas.sort(function (a, b) { var x = val(a), y = val(b); return (typeof x === "number" ? x - y : String(x).localeCompare(String(y), "es")) * dir || M.compararJer(a.r, b.r); });
    var pages = Math.max(1, Math.ceil(filas.length / ui.pageSize)); if (ui.page >= pages) ui.page = pages - 1;
    var vis = filas.slice(ui.page * ui.pageSize, (ui.page + 1) * ui.pageSize);
    var cols = [{ t: "Segmento", key: "segmento", f: function (o) { return M.segDe(o.r); } }, { t: "Razón social", key: "cliente", f: function (o) { return linkCliente(M.cliDe(o.r)); } },
      { t: "Tipo de servicio", key: "tipo", f: function (o) { return o.r.tipo; } }, { t: "Servicio", key: "servicio", f: function (o) { return o.r.servicio; } }, { t: "N° contrato", key: "contrato", f: function (o) { return o.r.contrato; }, cls: "num" }]
      .concat(meses.map(function (m) { return { t: M.mesTxt(m) + (m === base.mesParcial ? "*" : ""), key: "m:" + m, n: 1, f: function (o) { return o.r.v[m] ? n(o.r.v[m]) : "—"; } }; }))
      .concat([{ t: "Total", key: "total", n: 1, f: function (o) { return n(o.total); } }]);
    var c = $("detalle"); c.innerHTML = "";
    c.appendChild(tabla(cols, vis, { caption: "Detalle por contrato y servicio", sort: { key: key, dir: dir }, onSort: function (kk) { if (ui.sortKey === kk) ui.sortDir = -ui.sortDir; else { ui.sortKey = kk; ui.sortDir = kk === "total" || kk.indexOf("m:") === 0 ? -1 : 1; } renderDetalle(regs, k); c.querySelector("th[aria-sort]:not([aria-sort='none']) button").focus(); } }));
    $("detalle-sub").textContent = n(filas.length) + " registros (contrato + tipo + servicio)" + (base.mesParcial && meses.indexOf(base.mesParcial) >= 0 ? " · * mes parcial" : "");
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
    var lines = [["Segmento", "Razón Social", "Tipo de Servicio", "Servicio", "N° Contrato"].concat(meses.map(M.mesTxt), ["Total", "Migrado a DMS"]).map(q).join(";")];
    ultimoDetalle.filas.forEach(function (o) { lines.push([o.r.segmento, o.r.cliente, o.r.tipo, o.r.servicio, o.r.contrato].concat(meses.map(function (m) { return o.r.v[m] || 0; }), [o.total, mk[M.clave(o.r)] ? "SI" : "NO"]).map(q).join(";")); });
    descargar("\uFEFF" + lines.join("\r\n"), "matriz-envios-filtrado-" + hoyISO() + ".csv", "text/csv;charset=utf-8");
    toast("Se exportaron " + n(ultimoDetalle.filas.length) + " registros a CSV.");
  }
  function descargar(contenido, nombre, tipo) {
    var blob = new Blob([contenido], { type: tipo }), url = URL.createObjectURL(blob);
    var a = el("a", { href: url, download: nombre }); document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
  }

  /* ---------- Descargar dashboard con la base actual (incluye las marcas de migración) ---------- */
  function htmlConBase() {
    var json = JSON.stringify(base).replace(/</g, "\\u003c");
    var hh = HTML_ORIGEN.replace(/(<script id="base-datos" type="application\/json">)[\s\S]*?(<\/script>)/, function (_, a, b) { return a + json + b; });
    var externos = [], re = /<link rel="stylesheet" href="([^"]+)">|<script src="([^"]+)"><\/script>/g, m;
    while ((m = re.exec(hh))) externos.push({ tag: m[0], url: m[1] || m[2], css: !!m[1] });
    return Promise.all(externos.map(function (x) {
      return fetch(x.url, { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error("No se pudo leer " + x.url); return r.text(); }).then(function (txt) { x.txt = txt; });
    })).then(function () {
      externos.forEach(function (x) {
        var inline = x.css ? "<style>\n" + x.txt + "\n</style>" : "<script>\n" + x.txt.replace(/<\/script/gi, "<\\/script") + "\n</" + "script>";
        hh = hh.split(x.tag).join(inline);
      });
      return hh;
    });
  }
  function descargarDashboard() {
    if (base.fuente === "demo" && !confirm("La base actual son datos sintéticos. ¿Descargar igual el dashboard de prueba?")) return;
    htmlConBase().then(function (hh) {
      descargar(hh, "matriz-envios-dashboard-" + hoyISO() + ".html", "text/html;charset=utf-8");
      toast(base.fuente === "demo" ? "Se descargó el dashboard de prueba." : "Se descargó el dashboard con " + n(base.registros.length) + " registros y el estado de migración. Guardalo en OneDrive (contiene datos de clientes).");
    }).catch(function (e) { toast("No se pudo generar el archivo: " + (e && e.message ? e.message : e)); });
  }

  /* ---------- Modal de actualización ---------- */
  var modalPrev = null, pendiente = null;
  function abrirModal() {
    U.cerrarLista(false);
    modalPrev = document.activeElement; pendiente = null;
    $("modal-resultado").innerHTML = ""; $("archivo").value = ""; $("archivo-nombre").textContent = "";
    $("modal-aplicar").disabled = true; $("modal-aplicar").textContent = base.fuente === "demo" ? "Usar como base" : "Agregar a la base";
    $("modal").setAttribute("data-open", "true");
    document.body.style.overflow = "hidden";
    setTimeout(function () { $("modal-cerrar").focus(); }, 0);
  }
  function cerrarModal() { $("modal").setAttribute("data-open", "false"); document.body.style.overflow = ""; if (modalPrev && modalPrev.focus) modalPrev.focus(); }
  function teclado(ev) {
    if ($("modal").getAttribute("data-open") !== "true") { if (ev.key === "Escape" && U.hayAbierto()) U.cerrarLista(true); return; }
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
    $("archivo-nombre").textContent = file.name + " · " + U.fmt1.format(file.size / 1024) + " KB";
    $("modal-aplicar").disabled = true; pendiente = null;
    res.appendChild(alerta("info", ["Leyendo el archivo…"]));
    var esCSV = /\.(csv|txt)$/i.test(file.name);
    (esCSV ? file.text().then(M.parseCSV) : file.arrayBuffer().then(M.leerXLSX)).then(function (rows) {
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
      var nMarcas = Object.keys(M.migracion(base).marcas).length;
      var grupo = el("fieldset", { "class": "choice", style: "border:0;padding:0;margin:0" }, [el("legend", { "class": "sr-only", text: "Cómo aplicar la descarga" }),
        el("label", null, [el("input", { type: "radio", name: "modo", value: "agregar", checked: !d.filtrosDistintos }), el("span", null, [el("strong", { text: "Agregar a la base" + (d.filtrosDistintos ? ". " : " (recomendado). ") }), "Suma lo nuevo, reemplaza los meses que ya estaban y conserva lo que no viene. Conserva las marcas de migración."])]),
        el("label", null, [el("input", { type: "radio", name: "modo", value: "reemplazar", checked: d.filtrosDistintos }), el("span", null, [el("strong", { text: "Reemplazar la base completa" + (d.filtrosDistintos ? " (recomendado: los filtros son distintos). " : ". ") }), "Descarta la base actual y usa solo esta descarga." + (nMarcas ? " Las " + n(nMarcas) + " marcas de migración se conservan para los registros que sigan existiendo." : "")])])]);
      grupo.addEventListener("change", function (ev) { pendiente.modo = ev.target.value; $("modal-aplicar").textContent = ev.target.value === "agregar" ? "Agregar a la base" : "Reemplazar base"; });
      res.appendChild(grupo);
      pendiente = { parsed: parsed, nombre: nombre, modo: d.filtrosDistintos ? "reemplazar" : "agregar" };
    }
    $("modal-aplicar").textContent = pendiente.modo === "agregar" ? "Agregar a la base" : (esDemo ? "Usar como base" : "Reemplazar base");
    $("modal-aplicar").disabled = false;
  }
  function aplicar() {
    if (!pendiente) return;
    var msg;
    if (pendiente.modo === "reemplazar") {
      var previas = base.fuente === "demo" ? null : M.migracion(base);
      base = M.nuevaBase(pendiente.parsed, "export", new Date(), pendiente.nombre);
      if (previas) { var claves = {}; base.registros.forEach(function (r) { claves[M.clave(r)] = 1; }); var mg = M.migracion(base); Object.keys(previas.marcas).forEach(function (kk) { if (claves[kk]) mg.marcas[kk] = previas.marcas[kk]; }); mg.historial = previas.historial; }
      msg = "Base cargada: " + n(base.registros.length) + " registros, " + n(M.totalBase(base)) + " envíos.";
    } else {
      var d = M.fusionar(base, pendiente.parsed, pendiente.nombre, new Date());
      msg = "Base actualizada: " + n(d.nuevos.length) + " registros nuevos, " + n(d.cambios.length) + " valores cambiados" + (d.mesesNuevos.length ? ", meses nuevos: " + d.mesesNuevos.map(M.mesTxt).join(", ") : "") + ".";
    }
    var guardo = guardarLocal();
    pendiente = null; ui.deshacer = null; cerrarModal();
    f = filtrosVacios(); ui.page = 0; ui.abiertos = {}; ui.limites = {}; ui.migAbiertos = {}; ui.migLimites = {};
    var r = $("alerta-respaldo"); if (r) r.remove();
    renderTodo();
    var a = alerta("success", [el("strong", { text: msg + " " }), guardo ? "Quedó un respaldo en este navegador. " : "", "Para guardarla en un archivo tocá ", el("strong", { text: "Descargar dashboard" }), " y guardalo en OneDrive (no lo subas a GitHub: tiene datos de clientes)."],
      [el("button", { type: "button", "class": "btn btn--secondary btn--small", onclick: descargarDashboard }, ["Descargar dashboard"])]);
    $("alertas").appendChild(a);
    toast(msg);
    $("contenido").focus();
  }

  /* ---------- Render general: solo la pestaña visible ---------- */
  function renderTodo() {
    renderAlertas(); renderBase(); renderBarra(); renderVistas();
    var regs = M.filtrar(base, f), k = M.kpis(base, regs, f.meses);
    if (ui.vista === "resumen") {
      renderKpis(k);
      renderArbol("arbol", regs, k, { caption: "Universo de envíos por segmento, razón social, tipo de servicio, servicio y contrato. Usá los botones para expandir cada nivel." });
      $("btn-contraer").disabled = !Object.keys(ui.abiertos).length;
      var seg = M.agrupar(regs, M.segDe, k.meses).filter(function (x) { return x.envios > 0; }).sort(function (a, b) { return b.envios - a.envios; }).slice(0, 12);
      chartBarras("ch-segmentos", seg, f.segmentos, function (v) { toggle(f.segmentos, v); cambio(); }, "Envíos por segmento");
      var sv = M.agrupar(regs, function (r) { return r.servicio; }, k.meses).filter(function (x) { return x.envios > 0; }).sort(function (a, b) { return b.envios - a.envios; }).slice(0, 12);
      chartBarras("ch-servicios", sv, f.servicios, function (v) { toggle(f.servicios, v); cambio(); }, "Servicios con más envíos");
      renderRankings(regs, k);
    } else if (ui.vista === "analisis") {
      chartEvolucion(regs, k); chartMix(regs, k); renderTabs(regs, k); renderCalidad(); renderDetalle(regs, k);
    } else {
      renderMigracion(regs, k);
    }
  }

  /* ---------- Eventos ---------- */
  $("btn-csv").addEventListener("click", exportarCSV);
  $("btn-contraer").addEventListener("click", function () { ui.abiertos = {}; ui.limites = {}; renderTodo(); $("t-arbol").focus(); });
  $("btn-descargar").addEventListener("click", descargarDashboard);
  $("btn-actualizar").addEventListener("click", abrirModal);
  $("modal-cerrar").addEventListener("click", cerrarModal);
  $("modal-cancelar").addEventListener("click", cerrarModal);
  $("modal-aplicar").addEventListener("click", aplicar);
  $("modal").addEventListener("click", function (ev) { if (ev.target === $("modal")) cerrarModal(); });
  document.addEventListener("keydown", teclado);
  $("archivo").addEventListener("change", function (ev) { if (ev.target.files[0]) leerArchivo(ev.target.files[0]); });
  var drop = $("drop");
  ["dragenter", "dragover"].forEach(function (t) { drop.addEventListener(t, function (ev) { ev.preventDefault(); drop.setAttribute("data-over", "true"); }); });
  ["dragleave", "drop"].forEach(function (t) { drop.addEventListener(t, function (ev) { ev.preventDefault(); drop.setAttribute("data-over", "false"); }); });
  drop.addEventListener("drop", function (ev) { var fl = ev.dataTransfer && ev.dataTransfer.files[0]; if (fl) leerArchivo(fl); });
  $("mig-marcar").addEventListener("click", function () { marcarFiltrado(true); });
  $("mig-desmarcar").addEventListener("click", function () { marcarFiltrado(false); });
  $("mig-deshacer").addEventListener("click", deshacer);
  $("mig-exportar").addEventListener("click", exportarMigracion);
  $("mig-archivo").addEventListener("change", function (ev) { if (ev.target.files[0]) importarContratos(ev.target.files[0]); ev.target.value = ""; });
  $("mig-ver").addEventListener("change", function (ev) { ui.migVer = ev.target.value; renderTodo(); $("mig-ver").focus(); });
  $("mig-contraer").addEventListener("click", function () { ui.migAbiertos = {}; ui.migLimites = {}; renderTodo(); $("t-mig-arbol").focus(); });

  try {
    cargarBase();
    renderTodo();
  } catch (e) {
    $("alertas").appendChild(alerta("error", [el("strong", { text: "Error al iniciar el dashboard: " }), e && e.message ? e.message : String(e)]));
    if (window.console) console.error(e);
  }
  window.__MATRIZ_APP__ = { base: function () { return base; }, filtros: function () { return f; }, ui: ui, irA: irA, htmlConBase: htmlConBase };
})();
/* ==APP-END== */
