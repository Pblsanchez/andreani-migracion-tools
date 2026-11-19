/* ABM Contratos DMS · v0.9 · Formulario Mobile Entrega (D-091, D-095, D-100) + póliza y contactos (D-087, D-093). Datos ficticios. */
(function (g) {
  "use strict";
  var D = g.ABM_DATOS;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /* ---------- lógica pura ---------- */
  function proto(cod) { for (var i = 0; i < D.FORMULARIOS.length; i++) if (D.FORMULARIOS[i].cod === cod) return D.FORMULARIOS[i]; return null; }
  function corto(f) { return f ? "Formulario " + f.cod : ""; }
  function nombreProto(f) { return f ? corto(f) + " · " + f.nombre : "—"; }
  function reqDe(cod) { var f = proto(cod); return f ? f.req : []; }
  function req(id) { for (var i = 0; i < D.REQUISITOS.length; i++) if (D.REQUISITOS[i].id === id) return D.REQUISITOS[i]; return { id: id, nombre: id, corto: id, grupo: "" }; }
  function textoProto(cod) {
    var r = reqDe(cod), p = r.filter(function (x) { return req(x).grupo === "pide"; }).map(function (x) { return req(x).nombre; }),
      t = r.filter(function (x) { return req(x).grupo === "retira"; }).map(function (x) { return req(x).nombre; });
    return (p.length ? "Pide: " + p.join(", ") : "") + (p.length && t.length ? " · " : "") + (t.length ? "Retira: " + t.join(", ") : "");
  }
  /* Formulario más parecido al actual que incluya «con» y no incluya «sin» (para los avisos con arreglo en un clic, D-075) */
  function cercano(cod, con, sin) {
    var base = reqDe(cod), mejor = null, dm = 1e9;
    D.FORMULARIOS.forEach(function (f) {
      if (f.cod === cod || (con && f.req.indexOf(con) < 0) || (sin && f.req.indexOf(sin) >= 0)) return;
      var d = f.req.filter(function (r) { return base.indexOf(r) < 0 && r !== con; }).length + base.filter(function (r) { return f.req.indexOf(r) < 0 && r !== sin; }).length;
      if (d < dm) { dm = d; mejor = f; }
    });
    return mejor;
  }
  function filtrar(filtro) { return D.FORMULARIOS.filter(function (f) { return filtro.every(function (r) { return f.req.indexOf(r) >= 0; }); }); }

  function tipoNombre(id) { for (var i = 0; i < D.CONTACTO.tipos.length; i++) if (D.CONTACTO.tipos[i].id === id) return D.CONTACTO.tipos[i].nombre; return id; }
  function validarContacto(c, lista) {
    var e = [], dato = String(c.dato || "").trim();
    if (!String(c.nombre || "").trim()) e.push("Completá «Nombre o área».");
    if (!dato) e.push(c.tipo === "mail" ? "Completá el mail." : "Completá el teléfono.");
    else if (c.tipo === "mail" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(dato)) e.push("El mail no tiene un formato válido (ejemplo: nombre@empresa.com).");
    else if (c.tipo === "tel" && (!/^[0-9+()\s-]+$/.test(dato) || dato.replace(/\D/g, "").length < 8 || dato.replace(/\D/g, "").length > 15)) e.push("El teléfono tiene que tener entre 8 y 15 números (se aceptan espacios, guiones, paréntesis y +).");
    if (!e.length && (lista || []).some(function (x) { return x.tipo === c.tipo && String(x.dato).trim().toLowerCase() === dato.toLowerCase(); })) e.push("Ese " + (c.tipo === "mail" ? "mail" : "teléfono") + " ya está cargado.");
    return e;
  }
  function textoContactos(lista) {
    if (!lista || !lista.length) return "Sin contactos";
    return lista.map(function (x) { return x.nombre + " (" + x.de + " · " + tipoNombre(x.tipo) + " " + x.dato + " · " + x.uso + ")"; }).join("; ");
  }

  var API = g.ABM_SERVICIO = { proto: proto, corto: corto, nombreProto: nombreProto, reqDe: reqDe, textoProto: textoProto, cercano: cercano, filtrar: filtrar,
    validarContacto: validarContacto, textoContactos: textoContactos, tipoNombre: tipoNombre };
  if (typeof document === "undefined") return;

  /* ---------- interfaz ---------- */
  var filtro = [], nc, msgCont = "", ultimoFoco = null;
  function reset() { filtro = []; msgCont = ""; nc = { nombre: "", de: "Cliente", tipo: "mail", dato: "", uso: "Notificaciones" }; }
  reset();
  function UI() { return g.ABM_UI; }
  var OK = '<svg viewBox="0 0 12 12" width="14" height="14" aria-hidden="true"><path d="M2 6.5 5 9l5-6" stroke="currentColor" stroke-width="2" fill="none"/></svg>';

  function chipsDe(r, grupo) {
    var xs = r.filter(function (x) { return req(x).grupo === grupo; });
    return xs.length ? xs.map(function (x) { return '<span class="chip chip-req">' + esc(req(x).nombre) + "</span>"; }).join("") : '<span class="small">Nada</span>';
  }
  function vProtocolo(b) {
    var f = proto(b.form);
    var h = '<div class="campo proto" style="gap:12px"><h3>Formulario Mobile Entrega</h3>' +
      '<p class="small">Qué tiene que hacer el repartidor al entregar: qué pide y qué retira. Sirve para los dos canales.</p>' +
      '<div class="proto-sel"><div class="campo"><label for="proto">Formulario Mobile Entrega</label><select id="proto" aria-describedby="proto-a"><option value="">Elegir…</option>' +
      D.FORMULARIOS.map(function (x) { return '<option value="' + x.cod + '"' + (b.form === x.cod ? " selected" : "") + ">" + esc(nombreProto(x)) + "</option>"; }).join("") +
      '</select><span class="ayuda" id="proto-a">¿No sabés cuál te sirve? Compará qué pide cada uno y elegilo desde ahí.</span></div>' +
      '<button type="button" class="btn btn-secondary" id="btnComparar" data-srv="comparar">Comparar formularios</button></div>';
    if (f) h += '<div class="proto-ficha" aria-live="polite"><h4>Qué pide el ' + esc(corto(f)) + '</h4><div class="proto-grupos">' +
      '<div><span class="lbl">Al entregar pide</span><div class="chips">' + chipsDe(f.req, "pide") + "</div></div>" +
      '<div><span class="lbl">Además retira</span><div class="chips">' + chipsDe(f.req, "retira") + "</div></div></div></div>";
    return h + "</div>";
  }

  function filasComparar(b) {
    var fs = filtrar(filtro);
    if (!fs.length) return '<tr><td colspan="' + (D.REQUISITOS.length + 2) + '">Ningún formulario pide todo eso junto. Sacá alguno de los filtros.</td></tr>';
    return fs.map(function (f) {
      var el = b.form === f.cod;
      return "<tr" + (el ? ' class="elegido"' : "") + '><th scope="row"><span class="strong">' + esc(corto(f)) + '</span><br><span class="caption">' + esc(f.nombre) + "</span></th>" +
        D.REQUISITOS.map(function (r) { var si = f.req.indexOf(r.id) >= 0; return '<td class="c">' + (si ? '<span class="si">' + OK + '<span class="sr-only">Sí</span></span>' : '<span aria-hidden="true">—</span><span class="sr-only">No</span>') + "</td>"; }).join("") +
        '<td class="acc">' + (el ? '<span class="chip chip-marca">Elegido</span>' : '<button type="button" class="btn btn-secondary btn-sm" data-srv="elegir" data-cod="' + f.cod + '" aria-label="Elegir ' + esc(corto(f)) + '">Elegir este</button>') + "</td></tr>";
    }).join("");
  }
  function abrirComparar() {
    var b = UI().S.b; ultimoFoco = document.getElementById("btnComparar");
    var m = document.createElement("div"); m.className = "modal-fondo"; m.id = "modal"; m.setAttribute("data-srv-modal", "1");
    m.innerHTML = '<div class="modal modal-ancho" role="dialog" aria-modal="true" aria-labelledby="t-comp"><div class="modal-head"><h3 id="t-comp">Comparar formularios Mobile de entrega</h3>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-srv="cerrar" id="cerrarComp">Cerrar</button></div>' +
      '<p class="small">Marcá lo que necesitás y quedan solo los formularios que lo piden. Con «Elegir este» volvés al contrato con ese formulario.</p>' +
      '<fieldset class="opciones filtro-req"><legend>Que pida o retire</legend>' + D.REQUISITOS.map(function (r) {
        return '<label class="chk"><input type="checkbox" data-filtro="' + r.id + '"' + (filtro.indexOf(r.id) >= 0 ? " checked" : "") + ">" + esc(r.nombre) + "</label>";
      }).join("") + "</fieldset>" +
      '<div class="tabla-wrap"><table class="tabla-comp"><caption class="sr-only">Qué pide y qué retira cada formulario Mobile de entrega</caption><thead><tr><th scope="col">Formulario</th>' +
      D.REQUISITOS.map(function (r) { return '<th scope="col" class="c" title="' + esc(r.nombre) + '">' + esc(r.corto) + (r.grupo === "retira" ? '<span class="caption">retira</span>' : "") + "</th>"; }).join("") +
      '<th scope="col"><span class="sr-only">Acción</span></th></tr></thead><tbody id="compBody">' + filasComparar(b) + "</tbody></table></div>" +
      '<p class="small" id="compCuenta" aria-live="polite">' + cuenta() + "</p></div>";
    document.body.appendChild(m);
    document.getElementById("cerrarComp").focus();
  }
  function cuenta() { var n = filtrar(filtro).length; return n + " formulario" + (n === 1 ? "" : "s") + (filtro.length ? " con lo marcado" : " en total"); }
  function cerrarComparar() {
    var m = document.getElementById("modal"); if (m && m.hasAttribute("data-srv-modal")) m.parentNode.removeChild(m);
    var bt = document.getElementById("btnComparar") || ultimoFoco; if (bt && bt.focus) bt.focus();
  }

  function vAdmin(b) {
    var cs = b.contactos || [];
    var h = '<div class="admin-extra"><div class="campo" style="max-width:340px"><label for="poliza">Número de póliza (opcional)</label>' +
      '<input type="text" id="poliza" value="' + esc(b.poliza) + '" autocomplete="off" aria-describedby="poliza-a"><span class="ayuda" id="poliza-a">El número de la póliza de seguro del contrato, si tiene.</span></div>';
    h += '<div class="contactos"><h4>Contactos (opcional)</h4><p class="small">Teléfonos y mails para notificaciones o acciones de comunicación. Suelen ser del cliente o del destinatario.</p>';
    if (cs.length) h += '<ul class="lista-cont" aria-label="Contactos cargados">' + cs.map(function (x) {
      return '<li><div><span class="strong">' + esc(x.nombre) + '</span> <span class="chip">' + esc(x.de) + '</span> <span class="chip">' + esc(x.uso) + '</span><br><span class="small">' + esc(tipoNombre(x.tipo)) + ": " + esc(x.dato) + "</span></div>" +
        '<button type="button" class="btn btn-ghost btn-sm" data-srv="quitarCont" data-id="' + esc(x.id) + '" aria-label="Quitar el contacto ' + esc(x.nombre) + '">Quitar</button></li>';
    }).join("") + "</ul>";
    else h += '<p class="small">Sin contactos cargados.</p>';
    var C = D.CONTACTO, sel = function (id, lbl, ops) {
      return '<div class="campo"><label for="' + id + '">' + lbl + '</label><select id="' + id + '">' + ops.map(function (o) {
        var v = o.id || o, t = o.nombre || o; return '<option value="' + esc(v) + '"' + (nc[id.slice(3)] === v ? " selected" : "") + ">" + esc(t) + "</option>";
      }).join("") + "</select></div>";
    };
    h += '<fieldset class="nuevo-cont"><legend>Agregar contacto</legend><div class="campos">' +
      '<div class="campo"><label for="ct-nombre">Nombre o área</label><input type="text" id="ct-nombre" value="' + esc(nc.nombre) + '" autocomplete="off"></div>' +
      sel("ct-de", "De", C.de) + sel("ct-tipo", "Tipo", C.tipos) +
      '<div class="campo"><label for="ct-dato">' + (nc.tipo === "mail" ? "Mail" : "Teléfono") + '</label><input type="' + (nc.tipo === "mail" ? "email" : "tel") + '" id="ct-dato" value="' + esc(nc.dato) + '" autocomplete="off" placeholder="' + (nc.tipo === "mail" ? "nombre@empresa.com" : "011 5555-0000") + '"></div>' +
      sel("ct-uso", "Uso", C.usos) + '</div><div><button type="button" class="btn btn-secondary" data-srv="agregarCont">Agregar contacto</button></div>' +
      '<div id="msgCont" aria-live="polite">' + msgCont + "</div></fieldset></div></div>";
    return h;
  }
  function alerta(tipo, txt) { return '<div class="alert alert-' + tipo + '"' + (tipo === "error" ? ' role="alert"' : "") + "><div>" + txt + "</div></div>"; }
  function agregarCont() {
    var b = UI().S.b; b.contactos = b.contactos || [];
    var e = validarContacto(nc, b.contactos);
    if (e.length) { msgCont = alerta("error", e.map(esc).join("<br>")); UI().render(!String(nc.nombre).trim() ? "ct-nombre" : "ct-dato"); return; }
    b.contactos.push({ id: "k" + Date.now().toString(36) + b.contactos.length, nombre: nc.nombre.trim(), de: nc.de, tipo: nc.tipo, dato: nc.dato.trim(), uso: nc.uso });
    var t = nc.tipo; reset(); nc.tipo = t; msgCont = alerta("success", "Contacto agregado.");
    UI().render("ct-nombre");
  }

  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("[data-srv]"); if (!t) return;
    var a = t.getAttribute("data-srv"), U = UI();
    if (a === "comparar") abrirComparar();
    else if (a === "cerrar") cerrarComparar();
    else if (a === "elegir") { U.S.b.form = t.getAttribute("data-cod"); var m = document.getElementById("modal"); if (m) m.parentNode.removeChild(m); U.render("proto"); U.toast("Elegiste el " + nombreProto(proto(U.S.b.form)) + "."); }
    else if (a === "agregarCont") agregarCont();
    else if (a === "quitarCont") { var id = t.getAttribute("data-id"); U.S.b.contactos = (U.S.b.contactos || []).filter(function (x) { return x.id !== id; }); msgCont = ""; U.render("ct-nombre"); }
  });
  document.addEventListener("change", function (e) {
    var t = e.target, U = UI(); if (!U) return;
    if (t.id === "proto") { U.S.b.form = t.value; U.render("proto"); }
    else if (t.hasAttribute && t.hasAttribute("data-filtro")) {
      var r = t.getAttribute("data-filtro"); filtro = filtro.filter(function (x) { return x !== r; }); if (t.checked) filtro.push(r);
      document.getElementById("compBody").innerHTML = filasComparar(U.S.b); document.getElementById("compCuenta").textContent = cuenta();
    }
    else if (t.id === "ct-tipo") { nc.tipo = t.value; msgCont = ""; U.render("ct-tipo"); }
    else if (t.id === "ct-de" || t.id === "ct-uso") nc[t.id.slice(3)] = t.value;
  });
  document.addEventListener("input", function (e) {
    var t = e.target, U = UI(); if (!U) return;
    if (t.id === "poliza") U.S.b.poliza = t.value;
    else if (t.id === "ct-nombre" || t.id === "ct-dato") nc[t.id.slice(3)] = t.value;
  });
  document.addEventListener("keydown", function (e) {
    var m = document.getElementById("modal");
    if (e.key === "Escape" && m && m.hasAttribute("data-srv-modal")) { e.stopImmediatePropagation(); cerrarComparar(); }
    else if (e.key === "Tab" && m && m.hasAttribute("data-srv-modal")) {
      var fs = m.querySelectorAll("button, input"), pri = fs[0], ult = fs[fs.length - 1];
      if (e.shiftKey && document.activeElement === pri) { e.preventDefault(); ult.focus(); }
      else if (!e.shiftKey && document.activeElement === ult) { e.preventDefault(); pri.focus(); }
    }
  }, true);

  API.vProtocolo = vProtocolo; API.vAdmin = vAdmin; API.reset = reset; API.abrirComparar = abrirComparar;
})(typeof window !== "undefined" ? window : globalThis);
