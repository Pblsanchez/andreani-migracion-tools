/* ==UI-START== Componentes de interfaz reutilizables (Design System Cartesian). Sin dependencias. */
var MATRIZ_UI = (function () {
  "use strict";
  var fmt = new Intl.NumberFormat("es-AR");
  var fmt1 = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  function n(x) { return fmt.format(Math.round(x || 0)); }
  function pct(x, signo) { if (x == null || !isFinite(x)) return "—"; var s = fmt1.format(x * 100) + " %"; return signo && x > 0 ? "+" + s : s; }
  function corto(x) { x = Math.round(x); if (Math.abs(x) >= 1e6) return fmt1.format(x / 1e6) + " M"; if (Math.abs(x) >= 1e4) return fmt.format(Math.round(x / 1e3)) + " k"; return fmt.format(x); }
  function fecha(iso) { try { return new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }); } catch (e) { return iso; } }
  function sinAcentos(s) { return String(s == null ? "" : s).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
  function $(id) { return document.getElementById(id); }
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (attrs[k] == null || attrs[k] === false) continue;
      if (k === "text") e.textContent = attrs[k];
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
    up: "M7 14l5-5 5 5H7Z", down: "M7 10l5 5 5-5H7Z", right: "M10 7l5 5-5 5V7Z",
    check: "M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2Z",
    close: "M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4Z",
    info: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-6h2v6Zm0-8h-2V7h2v2Z",
    warn: "M1 21h22L12 2 1 21Zm12-3h-2v-2h2v2Zm0-4h-2v-4h2v4Z",
    error: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-2h2v2Zm0-4h-2V7h2v6Z",
    ok: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-2 15-5-5 1.4-1.4 3.6 3.6 7.6-7.6L19 8l-9 9Z",
    clock: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 11h-5v-2h3V6h2v7Z",
    half: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18V4a8 8 0 0 1 0 16Z",
    filter: "M3 5h18l-7 8v6l-4 2v-8L3 5Z",
    undo: "M12.5 8c-2.6 0-5 1-6.9 2.6L2 7v9h9l-3.6-3.6A8 8 0 0 1 20.2 16l2.4-.8A10.5 10.5 0 0 0 12.5 8Z",
    upload: "M5 20h14v-2H5v2Zm7-17-6 6 1.4 1.4L11 6.8V17h2V6.8l3.6 3.6L18 9l-6-6Z",
    download: "M5 20h14v-2H5v2Zm7-3 6-6-1.4-1.4-3.6 3.6V3h-2v10.2L7.4 9.6 6 11l6 6Z",
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
  function badge(nivel, texto, icono) { var d = NIVEL[nivel]; return el("span", { "class": "badge badge--" + d.cls }, [svgIcon(icono || d.icon, 14), texto || d.txt]); }
  function alerta(nivel, contenido, acciones, id) {
    var d = NIVEL[nivel];
    var cuerpo = el("div", { "class": "alert__body" }, contenido);
    if (acciones && acciones.length) cuerpo.appendChild(el("div", { "class": "alert__actions" }, acciones));
    return el("div", { "class": "alert alert--" + d.cls, role: nivel === "error" ? "alert" : "note", id: id || null }, [svgIcon(d.icon, 20), cuerpo]);
  }
  var toastTimer;
  function toast(msg) { var t = $("toast"); t.textContent = msg; t.setAttribute("data-open", "true"); clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.setAttribute("data-open", "false"); }, 5000); }
  function share(v, tot) { var p = tot ? v / tot : 0; return el("span", { "class": "share" }, [pct(p), el("span", { "class": "share__bar", "aria-hidden": "true" }, [el("span", { style: "width:" + Math.min(100, p * 100).toFixed(1) + "%" })])]); }
  /* Barra de avance: color + texto (nunca solo color) */
  function progreso(v, tot, etiqueta) {
    var p = tot ? v / tot : 0;
    return el("span", { "class": "progress-wrap" }, [
      el("span", { "class": "progress", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": (p * 100).toFixed(1), "aria-label": etiqueta || "Avance" }, [el("span", { style: "width:" + Math.min(100, p * 100).toFixed(1) + "%" })]),
      el("span", { "class": "progress__txt num" }, [pct(p)])
    ]);
  }
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
  /* Devuelve el foco a un control identificado con data-fid después de re-renderizar */
  function enfocar(fid) {
    if (!fid) return;
    var b = document.querySelector("[data-fid='" + String(fid).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "']");
    if (b && b.focus) b.focus();
  }

  /* ---------- Select múltiple con búsqueda (combobox + listbox, accesible) ----------
     o = { id, etiqueta, num?, seleccion: [] (se modifica), opciones: fn -> [{valor, texto?, envios}], formato?: fn, onCambio: fn }
     La lista se mantiene abierta mientras se eligen varias opciones, aunque el resto de la página se vuelva a dibujar. */
  var MAX_LISTA = 200, registro = {}, abierto = null;
  function resumenSel(o) {
    var s = o.seleccion;
    if (!s.length) return "Todos";
    if (s.length === 1) return o.formato ? o.formato(s[0]) : s[0];
    return s.length + " seleccionados";
  }
  function multiSelect(o) {
    var wrap = el("div", { "class": "ms", "data-ms": o.id });
    var res = resumenSel(o);
    var btn = el("button", { type: "button", "class": "ms__btn" + (o.seleccion.length ? " ms__btn--activo" : ""), id: "ms-" + o.id, "aria-haspopup": "listbox", "aria-expanded": "false",
      "aria-label": o.etiqueta + ": " + res + ". Abrir lista", title: o.etiqueta + ": " + (o.seleccion.length > 1 ? o.seleccion.map(function (v) { return o.formato ? o.formato(v) : v; }).join(", ") : res) }, [
      el("span", { "class": "ms__lab" }, [o.num ? el("span", { "class": "nivel-num", "aria-hidden": "true" }, [String(o.num)]) : null, o.etiqueta]),
      el("span", { "class": "ms__val" }, [res]), svgIcon("down", 18)]);
    btn.addEventListener("click", function () { if (abierto && abierto.id === o.id) cerrar(true); else abrir(o.id, "", 0); });
    btn.addEventListener("keydown", function (ev) { if (ev.key === "ArrowDown") { ev.preventDefault(); abrir(o.id, "", 0); } });
    wrap.appendChild(btn);
    registro[o.id] = { o: o, wrap: wrap, btn: btn };
    return wrap;
  }
  function filtradas(o, q) {
    var ops = o.opciones(), qq = sinAcentos(q);
    return qq ? ops.filter(function (x) { return sinAcentos(x.texto || x.valor).indexOf(qq) >= 0; }) : ops;
  }
  function abrir(id, q, activo) {
    if (abierto && abierto.id !== id) cerrar(false);
    var R = registro[id]; if (!R) { abierto = null; return; }
    var o = R.o, viejo = R.wrap.querySelector(".ms__pop"); if (viejo) viejo.remove();
    abierto = { id: id, q: q || "", activo: activo || 0 };
    var lid = "ms-" + id + "-lista";
    var input = el("input", { "class": "input ms__buscar", type: "search", role: "combobox", "aria-expanded": "true", "aria-controls": lid, "aria-autocomplete": "list",
      "aria-label": "Buscar en " + o.etiqueta, placeholder: "Buscar " + o.etiqueta.toLowerCase() + "…", autocomplete: "off" });
    input.value = abierto.q;
    var lista = el("ul", { "class": "ms__lista", id: lid, role: "listbox", "aria-multiselectable": "true", "aria-label": o.etiqueta });
    var nota = el("p", { "class": "ms__nota", "aria-live": "polite" });
    var acciones = el("div", { "class": "ms__acciones" }, [
      el("button", { type: "button", "class": "btn btn--ghost btn--small", onclick: function () { filtradas(o, abierto.q).slice(0, MAX_LISTA).forEach(function (x) { if (o.seleccion.indexOf(x.valor) < 0) o.seleccion.push(x.valor); }); o.onCambio(); } }, ["Elegir los visibles"]),
      el("button", { type: "button", "class": "btn btn--ghost btn--small", onclick: function () { o.seleccion.length = 0; o.onCambio(); } }, ["Quitar selección"])
    ]);
    var pop = el("div", { "class": "ms__pop", role: "dialog", "aria-label": "Elegir " + o.etiqueta }, [input, lista, nota, acciones]);
    R.wrap.appendChild(pop); R.btn.setAttribute("aria-expanded", "true");
    function pintar() {
      var ops = filtradas(o, abierto.q), vis = ops.slice(0, MAX_LISTA);
      if (abierto.activo >= vis.length) abierto.activo = Math.max(0, vis.length - 1);
      lista.innerHTML = "";
      vis.forEach(function (x, i) {
        var sel = o.seleccion.indexOf(x.valor) >= 0, oid = lid + "-" + i;
        var li = el("li", { id: oid, role: "option", "aria-selected": sel ? "true" : "false", "class": "ms__opt" + (i === abierto.activo ? " ms__opt--activo" : "") }, [
          el("span", { "class": "ms__check", "aria-hidden": "true" }, [sel ? svgIcon("check", 14) : null]),
          el("span", { "class": "ms__txt" }, [x.texto || x.valor]),
          x.envios != null ? el("span", { "class": "ms__n num" }, [corto(x.envios)]) : null]);
        li.addEventListener("mousedown", function (ev) { ev.preventDefault(); });
        li.addEventListener("click", function () { abierto.activo = i; alternar(o, x.valor); });
        lista.appendChild(li);
      });
      if (vis[abierto.activo]) input.setAttribute("aria-activedescendant", lid + "-" + abierto.activo); else input.removeAttribute("aria-activedescendant");
      nota.textContent = !ops.length ? "Sin coincidencias." : ops.length > MAX_LISTA ? "Se muestran " + MAX_LISTA + " de " + n(ops.length) + ". Escribí para acotar." : n(ops.length) + (ops.length === 1 ? " opción" : " opciones") + (o.seleccion.length ? " · " + o.seleccion.length + " elegidas" : "");
      var act = lista.querySelector(".ms__opt--activo"); if (act && act.scrollIntoView) act.scrollIntoView({ block: "nearest" });
    }
    input.addEventListener("input", function () { abierto.q = input.value; abierto.activo = 0; pintar(); });
    input.addEventListener("keydown", function (ev) {
      var tot = Math.min(filtradas(o, abierto.q).length, MAX_LISTA);
      if (ev.key === "ArrowDown") { ev.preventDefault(); abierto.activo = Math.min(tot - 1, abierto.activo + 1); pintar(); }
      else if (ev.key === "ArrowUp") { ev.preventDefault(); abierto.activo = Math.max(0, abierto.activo - 1); pintar(); }
      else if (ev.key === "Home" && !input.value) { ev.preventDefault(); abierto.activo = 0; pintar(); }
      else if (ev.key === "Enter") { ev.preventDefault(); var x = filtradas(o, abierto.q)[abierto.activo]; if (x) alternar(o, x.valor); }
      else if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); cerrar(true); }
      else if (ev.key === "Tab") { cerrar(false); }
    });
    pintar();
    input.focus();
  }
  function alternar(o, v) { var i = o.seleccion.indexOf(v); if (i >= 0) o.seleccion.splice(i, 1); else o.seleccion.push(v); o.onCambio(); }
  function cerrar(foco) {
    if (!abierto) return;
    var R = registro[abierto.id]; abierto = null;
    if (!R) return;
    var pop = R.wrap.querySelector(".ms__pop"); if (pop) pop.remove();
    R.btn.setAttribute("aria-expanded", "false");
    if (foco) R.btn.focus();
  }
  /* Después de re-renderizar la barra: vuelve a abrir la lista que estaba abierta, con la misma búsqueda */
  function reabrir() { if (abierto) abrir(abierto.id, abierto.q, abierto.activo); }
  function hayAbierto() { return !!abierto; }
  document.addEventListener("mousedown", function (ev) {
    if (!abierto) return;
    var R = registro[abierto.id];
    if (R && R.wrap.contains && !R.wrap.contains(ev.target)) cerrar(false);
  });

  return {
    n: n, pct: pct, corto: corto, fecha: fecha, $: $, el: el, svgIcon: svgIcon, badge: badge, alerta: alerta, toast: toast,
    share: share, progreso: progreso, tabla: tabla, enfocar: enfocar, NIVEL: NIVEL, fmt1: fmt1,
    multiSelect: multiSelect, reabrir: reabrir, cerrarLista: cerrar, hayAbierto: hayAbierto
  };
})();
/* ==UI-END== */
