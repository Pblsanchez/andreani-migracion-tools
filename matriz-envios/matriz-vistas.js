/* ==VISTAS-START== Gráficos SVG, rankings y calidad de datos. Recibe el estado del dashboard (base, filtros, ui). */
var MATRIZ_VISTAS = function (ctx) {
  "use strict";
  var M = MATRIZ, U = MATRIZ_UI;
  var n = U.n, pct = U.pct, corto = U.corto, fecha = U.fecha, $ = U.$, el = U.el, svgIcon = U.svgIcon, badge = U.badge, alerta = U.alerta, toast = U.toast, share = U.share, tabla = U.tabla;
  var ui = ctx.ui, base = null, f = null;
  function cambio() { ctx.cambio(); }
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

  /* Cada llamada toma la base y los filtros actuales del dashboard */
  function con(fn) { return function () { base = ctx.base(); f = ctx.f(); return fn.apply(null, arguments); }; }
  return { chartEvolucion: con(chartEvolucion), chartMix: con(chartMix), chartBarras: con(chartBarras), renderRankings: con(renderRankings), renderTabs: con(renderTabs), renderCalidad: con(renderCalidad), linkCliente: con(linkCliente) };
};
/* ==VISTAS-END== */
