/* ABM Contratos DMS · v0.8 parte 3 · Domicilios sin checks duplicados (D-094) y rendición heredada (D-089). Datos ficticios. */
(function (g) {
  "use strict";
  var D = g.ABM_DATOS;
  var REND = "DEVOLUCION_REMITOS";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function clase(id) { for (var i = 0; i < D.CLASES.length; i++) if (D.CLASES[i].id === id) return D.CLASES[i]; return { id: id, nombre: id }; }
  function domTexto(d) { return d.calle + " " + d.numero + ", " + d.localidad + ", " + d.provincia + " (CP " + d.cp + ")"; }
  /* Orden de las etiquetas: el de la lista de clases */
  function ordenar(cs) { var ids = D.CLASES.map(function (c) { return c.id; }); return cs.slice().sort(function (a, b) { return ids.indexOf(a) - ids.indexOf(b); }); }

  /* ---------- lógica pura ---------- */
  /* Deja al domicilio «id» con exactamente «clases». Una clase usa un solo domicilio: si otra la tenía, se la saca;
     los domicilios que quedan sin clases se quitan. Devuelve { error } o { doms, movidas: [{clase, de}], quitados: [texto] }. */
  function aplicarClases(doms, id, clases) {
    if (!clases || !clases.length) return { error: "Marcá al menos una clase. Si el domicilio ya no se usa, quitalo." };
    var movidas = [], quitados = [];
    var out = doms.map(function (d) {
      if (d.id === id) return { id: d.id, dom: d.dom, clases: ordenar(clases) };
      var quedan = d.clases.filter(function (c) {
        if (clases.indexOf(c) < 0) return true;
        movidas.push({ clase: c, de: domTexto(d.dom) }); return false;
      });
      return { id: d.id, dom: d.dom, clases: quedan };
    }).filter(function (d) { if (d.clases.length) return true; quitados.push(domTexto(d.dom)); return false; });
    return { doms: out, movidas: movidas, quitados: quitados };
  }
  /* Dónde está hoy cada clase (fuera del domicilio «id») */
  function enOtro(doms, id) { var m = {}; doms.forEach(function (d) { if (d.id !== id) d.clases.forEach(function (c) { m[c] = d; }); }); return m; }

  var API = g.ABM_DOMI = { aplicarClases: aplicarClases, enOtro: enOtro };
  if (typeof document === "undefined") return;

  /* ---------- interfaz ---------- */
  var edit = null, msg = "";
  function UI() { return g.ABM_UI; }
  function reset() { edit = null; msg = ""; }
  var CANDADO = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2" stroke="currentColor" stroke-width="1.6" fill="none"/><rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor"/></svg>';
  function alerta(tipo, txt) { return '<div class="alert alert-' + tipo + '"' + (tipo === "error" ? ' role="alert"' : "") + "><div>" + txt + "</div></div>"; }
  function etiquetas(cs) {
    return '<ul class="domi-tags" aria-label="Clases donde se usa">' + ordenar(cs).map(function (c) { return '<li class="chip chip-clase">' + esc(clase(c).nombre) + "</li>"; }).join("") + "</ul>";
  }

  /* Lista «Domicilios cargados»: clases como etiquetas de solo lectura + «Cambiar clases» (edita en el mismo lugar) */
  function vCargados(b, rendHeredada) {
    if (edit && (edit.b !== b || !b.domicilios.some(function (d) { return d.id === edit.id; }))) edit = null;
    var n = b.domicilios.length + (b.agrupador ? 1 : 0);
    var h = "<h3>Domicilios cargados (" + n + ")</h3>";
    if (!n) h += '<p class="small">Todavía no hay domicilios. Cargá uno y marcá todas las clases donde se usa.</p>';
    h += '<div class="domis">';
    if (b.agrupador) {
      h += '<div class="domi domi-heredado"><div class="domi-top"><span class="strong">' + (rendHeredada ? esc(domTexto(rendHeredada)) : "El contrato agrupador todavía no tiene domicilio de rendición") + "</span></div>" +
        '<ul class="domi-tags" aria-label="Clases donde se usa"><li class="chip chip-clase chip-lock">' + CANDADO + esc(clase(REND).nombre) + " · Heredada de " + esc(b.agrupador) + "</li></ul>" +
        '<span class="caption">Viene del contrato agrupador y se cambia allá: si cambia en ' + esc(b.agrupador) + ", cambia acá.</span></div>";
    }
    b.domicilios.forEach(function (d) {
      var txt = domTexto(d.dom);
      if (edit && edit.id === d.id) {
        var otro = enOtro(b.domicilios, d.id);
        h += '<div class="domi domi-edit"><div class="domi-top"><span class="strong">' + esc(txt) + "</span></div>" +
          '<fieldset class="opciones domi-chks"><legend class="caption">Cambiar las clases de este domicilio</legend>' + D.CLASES.map(function (c, i) {
            if (c.id === REND && b.agrupador) return "";
            var o = otro[c.id];
            return '<label class="chk"><input type="checkbox" id="de-' + esc(d.id) + "-" + i + '" data-dedit="' + c.id + '"' + (edit.clases.indexOf(c.id) >= 0 ? " checked" : "") + ">" + esc(c.nombre) +
              (o ? ' <span class="caption">(hoy en ' + esc(o.dom.calle + " " + o.dom.numero) + ": pasa a este)</span>" : "") + "</label>";
          }).join("") + "</fieldset>" +
          '<div class="domi-acc"><button type="button" class="btn btn-primary btn-sm" data-dom="listo">Listo</button><button type="button" class="btn btn-ghost btn-sm" data-dom="cancelar">Cancelar</button></div>' +
          (msg ? '<div aria-live="polite">' + msg + "</div>" : "") + "</div>";
        return;
      }
      h += '<div class="domi"><div class="domi-top"><span class="strong">' + esc(txt) + '</span><div class="der">' +
        '<button type="button" class="btn btn-secondary btn-sm" id="cd-' + esc(d.id) + '" data-dom="cambiar" data-id="' + esc(d.id) + '" aria-label="Cambiar las clases de ' + esc(txt) + '">Cambiar clases</button>' +
        '<button class="btn btn-ghost btn-sm" data-acc="quitarDom" data-id="' + esc(d.id) + '" aria-label="Quitar ' + esc(txt) + '">Quitar</button></div></div>' +
        etiquetas(d.clases) + "</div>";
    });
    h += "</div>";
    if (!edit && msg) h += '<div id="msgDomi" aria-live="polite">' + msg + "</div>";
    return h;
  }

  function editar(id) {
    var b = UI().S.b, d = null; b.domicilios.forEach(function (x) { if (x.id === id) d = x; });
    if (!d) return;
    edit = { b: b, id: id, clases: d.clases.slice() }; msg = "";
    UI().render(); var el = document.querySelector("[data-dedit]"); if (el) el.focus();
  }
  function listo() {
    var U = UI(), b = U.S.b, id = edit.id;
    var r = aplicarClases(b.domicilios, id, edit.clases);
    if (r.error) { msg = alerta("error", esc(r.error)); U.render(); var el = document.querySelector("[data-dedit]"); if (el) el.focus(); return; }
    b.domicilios = r.doms; edit = null;
    var t = "Clases actualizadas.";
    if (r.movidas.length) t += " " + r.movidas.map(function (m) { return "«" + esc(clase(m.clase).nombre) + "» dejó de usar " + esc(m.de); }).join("; ") + ".";
    if (r.quitados.length) t += " Se quitó " + r.quitados.map(esc).join(" y ") + " porque se quedó sin clases.";
    msg = alerta("success", t);
    U.render("cd-" + id);
  }

  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("[data-dom]"); if (!t || !UI()) return;
    var a = t.getAttribute("data-dom");
    if (a === "cambiar") editar(t.getAttribute("data-id"));
    else if (a === "listo" && edit) listo();
    else if (a === "cancelar") { var id = edit ? edit.id : ""; reset(); UI().render("cd-" + id); }
  });
  document.addEventListener("change", function (e) {
    var t = e.target; if (!edit || !t.hasAttribute || !t.hasAttribute("data-dedit")) return;
    var c = t.getAttribute("data-dedit"); edit.clases = edit.clases.filter(function (x) { return x !== c; }); if (t.checked) edit.clases.push(c);
  });

  API.vCargados = vCargados; API.reset = reset; API.editar = editar; API.listo = listo;
  API._estado = function () { return { edit: edit, msg: msg }; };
})(typeof window !== "undefined" ? window : globalThis);
