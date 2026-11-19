/* ABM Contratos DMS · v0.8 parte 4 · Vigencia hasta y vencimiento (D-086). Datos ficticios. */
(function (g) {
  "use strict";
  var D = g.ABM_DATOS;
  function p2(n) { return (n < 10 ? "0" : "") + n; }
  function iso(d) { return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()); }
  function hoy() { return iso(new Date()); }
  function sumar(isoTxt, dias) { var p = isoTxt.split("-"), d = new Date(+p[0], +p[1] - 1, +p[2]); d.setDate(d.getDate() + dias); return iso(d); }
  function fmt(i) { if (!i) return "—"; var p = i.split("-"); return p[2] + "/" + p[1] + "/" + p[0]; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /* ---------- lógica pura ---------- */
  /* «Vigencia hasta» no aplica si el contrato queda deshabilitado */
  function aplica(b) { return !!b.estado && b.estado !== "deshabilitado"; }
  /* Fecha mínima: el día siguiente a hoy o a «Vigente desde» */
  function minimo(b, h) { h = h || hoy(); var base = b.estado === "programado" && b.vigencia && b.vigencia > h ? b.vigencia : h; return sumar(base, 1); }
  function faltantes(b, h) {
    if (!aplica(b) || !b.hasta) return [];
    h = h || hoy();
    if (b.hasta <= h) return ["La fecha «Vigencia hasta» tiene que ser posterior a hoy (o quitala para que no venza)"];
    if (b.estado === "programado" && b.vigencia && b.hasta <= b.vigencia) return ["La fecha «Vigencia hasta» tiene que ser posterior a «Vigente desde»"];
    return [];
  }
  function texto(b) { return b.estado === "deshabilitado" ? "No aplica (queda deshabilitado)" : b.hasta ? "Vence el " + fmt(b.hasta) : "Sin vencimiento"; }
  function vencido(c, h) { return !!c.hasta && c.hasta <= (h || hoy()); }
  /* Contratos con «Vigencia hasta» cumplida quedan deshabilitados, con registro en el historial. Devuelve los que cambió. */
  function vencer(contratos, h) {
    h = h || hoy(); var out = [];
    contratos.forEach(function (c) {
      if (!vencido(c, h) || c.estado === "deshabilitado") return;
      c.estado = "deshabilitado"; c.vigencia = "";
      c.historial.push({ fecha: c.hasta + " 00:00", usuario: "DMS (automático)", accion: "Deshabilitado por vencimiento",
        detalle: "Venció la vigencia el " + fmt(c.hasta) + ". Para volver a usarlo: «Volver a habilitar» o cambiar la fecha desde Editar." });
      out.push(c.nro);
    });
    return out;
  }
  /* Celda «Vigencia» del listado */
  function celda(c, h) {
    if (c.estado === "deshabilitado") return vencido(c, h) ? '<span class="chip chip-off">Venció el ' + fmt(c.hasta) + "</span>" : "—";
    var t = c.vigencia ? "Desde " + fmt(c.vigencia) : "—";
    if (c.hasta) {
      var dias = Math.round((Date.parse(c.hasta) - Date.parse(h || hoy())) / 864e5);
      t += '<br><span class="' + (dias <= 30 ? "chip chip-vence" : "caption") + '">Vence el ' + fmt(c.hasta) + (dias <= 30 ? " (en " + dias + " día" + (dias === 1 ? "" : "s") + ")" : "") + "</span>";
    }
    return t;
  }
  /* Al volver a habilitar (D-078): si la fecha ya pasó, se quita */
  function alHabilitar(c, h) { if (vencido(c, h)) { var f = c.hasta; c.hasta = ""; return f; } return ""; }

  /* Datos de ejemplo relativos a hoy (así la demo no envejece): uno que vence pronto y uno ya vencido */
  function sembrar(contratos, h) {
    h = h || hoy();
    contratos.forEach(function (c) {
      if (c.hasta === undefined) c.hasta = "";
      if (c.nro === "4000100231") c.hasta = sumar(h, 20);
      if (c.nro === "351000101") c.hasta = sumar(h, -1);
    });
  }

  var API = g.ABM_VIG = { aplica: aplica, minimo: minimo, faltantes: faltantes, texto: texto, vencido: vencido, vencer: vencer, celda: celda, alHabilitar: alHabilitar, sembrar: sembrar, sumar: sumar, fmt: fmt };
  if (D && D.CONTRATOS) sembrar(D.CONTRATOS);
  if (typeof document === "undefined") return;

  /* ---------- interfaz (último paso) ---------- */
  function vCampo(b) {
    if (!aplica(b)) return b.estado === "deshabilitado" ? '<p class="small">«Vigencia hasta» no aplica: el contrato queda deshabilitado.</p>' : "";
    return '<div class="vig-hasta"><div class="campo" style="max-width:260px"><label for="hasta">Vigencia hasta (opcional)</label>' +
      '<input type="date" id="hasta" min="' + minimo(b) + '" value="' + esc(b.hasta) + '" aria-describedby="hasta-a"></div>' +
      (b.hasta ? '<button type="button" class="btn btn-ghost btn-sm" data-vig="quitar">Quitar fecha</button>' : "") +
      '<span class="ayuda" id="hasta-a">' + (b.hasta ? "Desde el " + fmt(b.hasta) + " el contrato queda deshabilitado y lo ves en el historial. Para seguir usándolo, cambiá o quitá la fecha." : "Vacía: el contrato no vence.") + "</span></div>";
  }
  function UI() { return g.ABM_UI; }
  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("[data-vig]"); if (!t || !UI()) return;
    if (t.getAttribute("data-vig") === "quitar") { UI().S.b.hasta = ""; UI().render("hasta"); }
  });
  document.addEventListener("change", function (e) {
    var t = e.target; if (t.id !== "hasta" || !UI()) return;
    UI().S.b.hasta = t.value; UI().render("hasta");
  });

  API.vCampo = vCampo;
})(typeof window !== "undefined" ? window : globalThis);
