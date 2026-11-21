/* Relevamiento migración Integra → DMS · v0.1 (T-024). Prototipo: cartera de ejemplo, borrador en el navegador, envío por Teams (D-124). */
(function (g) {
  "use strict";
  var CAT = g.REL_CAT;

  /* ---------- lógica pura ---------- */
  function contratos(cart) {
    var out = [];
    cart.clientes.forEach(function (k) { k.contratos.forEach(function (c) { out.push({ nro: c.nro, servicio: c.servicio, cli: k }); }); });
    return out;
  }
  function rc(r, nro) { return r.c[nro] || (r.c[nro] = {}); }
  function migrando(r, cart) { return contratos(cart).filter(function (c) { return (r.c[c.nro] || {}).m === "si"; }); }
  function clientesMig(r, cart) { return cart.clientes.filter(function (k) { return k.contratos.some(function (c) { return (r.c[c.nro] || {}).m === "si"; }); }); }
  function pendientes(r, cart) {
    var m = migrando(r, cart);
    return [
      contratos(cart).filter(function (c) { var x = r.c[c.nro] || {}; return !x.m || (x.m === "no" && !x.mot); }).length,
      m.filter(function (c) { return !r.c[c.nro].ciclo; }).length,
      m.filter(function (c) { return !r.c[c.nro].cond; }).length,
      clientesMig(r, cart).filter(function (k) { return !r.e[k.id]; }).length,
      m.filter(function (c) { return !r.c[c.nro].integ; }).length
    ];
  }
  function totales(r, cart) {
    var nm = migrando(r, cart).length, nk = clientesMig(r, cart).length, n = contratos(cart).length;
    var tot = n + nm * 3 + nk, pen = pendientes(r, cart).reduce(function (a, b) { return a + b; }, 0);
    return { tot: tot, hechas: tot - pen, pen: pen };
  }
  function payload(r, cart) {
    return { v: 1, id: cart.id, t: new Date().toISOString().slice(0, 16),
      c: contratos(cart).map(function (c) { var x = r.c[c.nro] || {}; return [c.nro, x.m || "", x.mot || "", x.ciclo || "", x.cond || "", x.integ || ""]; }),
      e: cart.clientes.map(function (k) { return [k.id, r.e[k.id] || ""]; }) };
  }
  function b64url(bytes) { var s = ""; for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
  function codificar(obj) {
    var txt = JSON.stringify(obj), raw = new TextEncoder().encode(txt);
    if (typeof CompressionStream === "undefined") return Promise.resolve("j|" + b64url(raw));
    var cs = new CompressionStream("deflate-raw"), w = cs.writable.getWriter(); w.write(raw); w.close();
    return new Response(cs.readable).arrayBuffer().then(function (b) { return "z|" + b64url(new Uint8Array(b)); });
  }
  var API = g.REL_LIB = { contratos: contratos, migrando: migrando, clientesMig: clientesMig, pendientes: pendientes, totales: totales, payload: payload, codificar: codificar };
  if (typeof document === "undefined") return;

  /* ---------- estado ---------- */
  var cart = g.REL_DEMO, CLAVE = "rel-dms." + cart.id, paso = 0, aviso = "";
  var r = (function () { try { return JSON.parse(localStorage.getItem(CLAVE)) || null; } catch (e) { return null; } })() || { c: {}, e: {}, enviado: "" };
  function guardar() { try { localStorage.setItem(CLAVE, JSON.stringify(r)); } catch (e) { /* sin almacenamiento: sigue en memoria */ } }
  var PASOS = [
    { t: "Contratos a migrar", d: "Marcá contrato por contrato si se migra a DMS. No hay «seleccionar todo»: queremos que revises cada servicio." },
    { t: "Ciclo de vida", d: "Para cada contrato que se migra, elegí cuál de los ciclos de vida estándar se ajusta a su servicio." },
    { t: "Condición de entrega", d: "Elegí la condición de entrega que tiene hoy cada contrato que se migra. Una por contrato." },
    { t: "Tipo de etiqueta", d: "Por cliente: ¿usa la etiqueta integrada de Andreani o un desarrollo propio?" },
    { t: "Integración", d: "Para cada contrato que se migra, indicá si está integrado y de qué forma." },
    { t: "Revisar y enviar", d: "Revisá el resumen y mandalo. Se abre Teams con el mensaje ya escrito: solo tenés que apretar Enter." }
  ];

  /* ---------- helpers de vista ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function nom(lista, id) { for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i].nombre; return ""; }
  function radios(name, k, ops, val, extra) {
    return '<div class="seg" role="radiogroup" aria-label="' + esc(extra.label) + '">' + ops.map(function (o) {
      var id = name + "-" + o.id;
      return '<input type="radio" class="sr" id="' + id + '" name="' + name + '" value="' + o.id + '" data-k="' + k + '" data-ref="' + extra.ref + '"' + (val === o.id ? " checked" : "") + '>' +
        '<label for="' + id + '" class="seg-op' + (o.id === "ns" ? " ns" : "") + '">' + esc(o.nombre) + "</label>";
    }).join("") + "</div>";
  }
  function cabCto(c, x) {
    return '<div class="cto-cab"><span class="cto-nro">' + esc(c.nro) + '</span><span class="cto-srv">' + esc(c.servicio) + "</span>" + (x ? '<span class="ok-tag" aria-label="Respondido">✓</span>' : "") + "</div>";
  }
  function porCliente(lista, fila) {
    var h = "", ult = null;
    lista.forEach(function (c) {
      if (c.cli !== ult) { if (ult) h += "</div></section>"; ult = c.cli; h += '<section class="cli"><h3 class="cli-t">' + esc(c.cli.razon) + ' <span class="cli-sap">SAP ' + esc(c.cli.sap) + '</span></h3><div class="cli-l">'; }
      h += fila(c);
    });
    return h + (ult ? "</div></section>" : "");
  }
  function sinMigrar() { return '<div class="alert alert-info"><div>Todavía no marcaste ningún contrato para migrar. Volvé a <button type="button" class="lnk" data-ir="0">Contratos a migrar</button>.</div></div>'; }
  function btnCopiar(k, nro, val) { return val ? '<button type="button" class="btn btn-ghost btn-sm" data-copiar="' + k + '" data-nro="' + nro + '">Copiar a otros contratos</button>' : ""; }

  /* ---------- pasos ---------- */
  function v0() {
    return porCliente(contratos(cart), function (c) {
      var x = r.c[c.nro] || {};
      return '<div class="cto">' + cabCto(c, x.m && (x.m !== "no" || x.mot)) + radios("m-" + c.nro, "m", CAT.migrar, x.m, { ref: c.nro, label: "¿Se migra el contrato " + c.nro + "?" }) +
        (x.m === "no" ? '<div class="sub"><span class="sub-t">Motivo</span>' + radios("mot-" + c.nro, "mot", CAT.motivos, x.mot, { ref: c.nro, label: "Motivo para no migrar " + c.nro }) + "</div>" : "") + "</div>";
    });
  }
  function v1() {
    var m = migrando(r, cart); if (!m.length) return sinMigrar();
    return porCliente(m, function (c) {
      var x = r.c[c.nro];
      return '<div class="cto">' + cabCto(c, x.ciclo) + '<div class="cards" role="radiogroup" aria-label="Ciclo de vida del contrato ' + c.nro + '">' +
        CAT.ciclos.concat([{ id: "ns", codigo: "", nombre: "No sé / lo consulto" }]).map(function (o) {
          var id = "ci-" + c.nro + "-" + o.id;
          return '<input type="radio" class="sr" id="' + id + '" name="ci-' + c.nro + '" value="' + o.id + '" data-k="ciclo" data-ref="' + c.nro + '"' + (x.ciclo === o.id ? " checked" : "") + '>' +
            '<label for="' + id + '" class="card-op' + (o.id === "ns" ? " ns" : "") + '"><span class="card-n">' + esc(o.nombre) + "</span>" +
            (o.codigo ? '<span class="card-c">' + esc(o.codigo) + "</span>" : "") + (o.nota ? '<span class="chip">' + esc(o.nota) + "</span>" : "") + "</label>";
        }).join("") + '</div><div class="acc">' + btnCopiar("ciclo", c.nro, x.ciclo) + "</div></div>";
    });
  }
  function v2() {
    var m = migrando(r, cart); if (!m.length) return sinMigrar();
    return porCliente(m, function (c) {
      var x = r.c[c.nro], id = "co-" + c.nro;
      return '<div class="cto">' + cabCto(c, x.cond) + '<div class="campo"><label for="' + id + '">Condición de entrega</label><select id="' + id + '" data-k="cond" data-ref="' + c.nro + '"><option value="">Elegir…</option>' +
        CAT.condiciones.map(function (o) { var t = o.id + " · " + o.nombre; return '<option value="' + o.id + '"' + (x.cond === o.id ? " selected" : "") + ' title="' + esc(o.nombre) + '">' + esc(t.length > 70 ? t.slice(0, 68) + "…" : t) + "</option>"; }).join("") +
        '<option value="ns"' + (x.cond === "ns" ? " selected" : "") + ">No sé / lo consulto</option></select>" +
        (x.cond && x.cond !== "ns" ? '<p class="cond-txt"><strong>' + esc(x.cond) + ".</strong> " + esc(nom(CAT.condiciones, x.cond)) + "</p>" : "") +
        '</div><div class="acc">' + btnCopiar("cond", c.nro, x.cond) + "</div></div>";
    });
  }
  function v3() {
    var ks = clientesMig(r, cart); if (!ks.length) return sinMigrar();
    return ks.map(function (k) {
      var n = k.contratos.filter(function (c) { return (r.c[c.nro] || {}).m === "si"; }).length;
      return '<section class="cli"><h3 class="cli-t">' + esc(k.razon) + ' <span class="cli-sap">SAP ' + esc(k.sap) + " · " + n + " contrato" + (n === 1 ? "" : "s") + " a migrar</span>" + (r.e[k.id] ? '<span class="ok-tag" aria-label="Respondido">✓</span>' : "") + "</h3>" +
        '<div class="cto">' + radios("et-" + k.id, "etiq", CAT.etiquetas, r.e[k.id], { ref: k.id, label: "Tipo de etiqueta de " + k.razon }) + "</div></section>";
    }).join("");
  }
  function v4() {
    var m = migrando(r, cart); if (!m.length) return sinMigrar();
    return porCliente(m, function (c) {
      var x = r.c[c.nro];
      return '<div class="cto">' + cabCto(c, x.integ) + radios("in-" + c.nro, "integ", CAT.integraciones, x.integ, { ref: c.nro, label: "Integración del contrato " + c.nro }) + "</div>";
    });
  }
  function v5() {
    var p = pendientes(r, cart), t = totales(r, cart), h = "";
    if (t.pen) h += '<div class="alert alert-warning" role="status"><div><strong>Te faltan ' + t.pen + " respuesta" + (t.pen === 1 ? "" : "s") + ".</strong> " +
      PASOS.slice(0, 5).map(function (s, i) { return p[i] ? '<button type="button" class="lnk" data-ir="' + i + '">' + esc(s.t) + " (" + p[i] + ")</button>" : ""; }).filter(Boolean).join(" · ") + "</div></div>";
    var filas = contratos(cart).map(function (c) {
      var x = r.c[c.nro] || {}, mg = x.m === "si";
      return "<tr><td>" + esc(c.cli.razon) + "</td><td>" + esc(c.nro) + "</td><td>" + esc(x.m ? nom(CAT.migrar, x.m) + (x.mot ? " · " + nom(CAT.motivos, x.mot) : "") : "—") + "</td>" +
        "<td>" + (mg ? esc(x.ciclo === "ns" ? "No sé" : (CAT.ciclos.filter(function (o) { return o.id === x.ciclo; })[0] || {}).codigo || "—") : "") + "</td>" +
        "<td>" + (mg ? esc(x.cond === "ns" ? "No sé" : x.cond || "—") : "") + "</td>" +
        "<td>" + (mg ? esc(nom(CAT.etiquetas, r.e[c.cli.id]) || "—") : "") + "</td>" +
        "<td>" + (mg ? esc(nom(CAT.integraciones, x.integ) || "—") : "") + "</td></tr>";
    }).join("");
    h += '<div class="tabla-wrap"><table><caption class="sr-only">Resumen de tus respuestas</caption><thead><tr><th scope="col">Cliente</th><th scope="col">Contrato</th><th scope="col">¿Migra?</th><th scope="col">Ciclo</th><th scope="col">Condición</th><th scope="col">Etiqueta</th><th scope="col">Integración</th></tr></thead><tbody>' + filas + "</tbody></table></div>";
    h += '<div class="envio"><button type="button" class="btn btn-primary" id="btnEnviar"' + (t.pen ? " disabled" : "") + ">Enviar a Pablo por Teams</button>" +
      '<button type="button" class="btn btn-secondary" id="btnCopiarCod"' + (t.pen ? " disabled" : "") + ">Copiar código</button></div>" +
      '<p class="small">Se abre un chat de Teams con Pablo Sánchez y el mensaje ya escrito. Solo apretá <strong>Enter</strong>. Si Teams no se abre, usá «Copiar código» y pegalo en ese chat.</p>' +
      (r.enviado ? '<div class="alert alert-success"><div>Abriste el envío el ' + esc(r.enviado) + ". Si cambiás algo, volvé a enviarlo: vale la última respuesta.</div></div>" : "") +
      '<div id="msgEnvio" aria-live="polite"></div>';
    return h;
  }
  var VISTAS = [v0, v1, v2, v3, v4, v5];

  /* ---------- render ---------- */
  function render(foco) {
    var p = pendientes(r, cart), t = totales(r, cart), pct = t.tot ? Math.round(t.hechas * 100 / t.tot) : 0, hayMig = migrando(r, cart).length > 0;
    document.getElementById("avanceTxt").textContent = t.hechas + " de " + t.tot + " respuestas";
    var bar = document.getElementById("avanceBar"); bar.style.width = pct + "%"; bar.parentNode.setAttribute("aria-valuenow", pct);
    document.getElementById("pasos").innerHTML = PASOS.map(function (s, i) {
      var espera = i > 0 && i < 5 && !hayMig;
      var est = espera ? "Sin contratos a migrar" : i < 5 ? (p[i] ? p[i] + " pendiente" + (p[i] === 1 ? "" : "s") : "Completo") : (t.pen ? "Falta completar" : "Listo para enviar");
      return '<li><button type="button" data-ir="' + i + '" class="paso' + (i === paso ? " activo" : "") + (i < 5 && !p[i] && !espera ? " ok" : "") + '"' + (i === paso ? ' aria-current="step"' : "") +
        '><span class="paso-n">' + (i + 1) + '</span><span class="paso-t">' + esc(s.t) + '<span class="paso-e">' + esc(est) + "</span></span></button></li>";
    }).join("");
    document.getElementById("pasoT").textContent = (paso + 1) + ". " + PASOS[paso].t;
    document.getElementById("pasoD").textContent = PASOS[paso].d;
    document.getElementById("cuerpo").innerHTML = (aviso ? '<div class="alert alert-success" role="status"><div>' + aviso + "</div></div>" : "") + VISTAS[paso]();
    aviso = "";
    document.getElementById("btnAnt").hidden = paso === 0;
    document.getElementById("btnSig").hidden = paso === 5;
    if (foco) { var el = document.getElementById(foco); if (el) el.focus(); }
  }
  function ir(i) { paso = i; render(); var h = document.getElementById("pasoT"); h.focus(); h.scrollIntoView({ block: "start" }); }

  /* ---------- copiar a otros contratos ---------- */
  var copia = null;
  function abrirCopia(k, nro) {
    var val = r.c[nro][k], otros = migrando(r, cart).filter(function (c) { return c.nro !== nro; });
    copia = { k: k, nro: nro, val: val };
    var txt = k === "ciclo" ? (val === "ns" ? "No sé" : (CAT.ciclos.filter(function (o) { return o.id === val; })[0] || {}).nombre) : (val === "ns" ? "No sé" : val + " · " + nom(CAT.condiciones, val));
    document.getElementById("copiaT").textContent = "Copiar " + (k === "ciclo" ? "ciclo de vida" : "condición de entrega");
    document.getElementById("copiaD").textContent = "«" + txt + "» del contrato " + nro + ". Ya vienen marcados los que todavía no tienen respuesta.";
    document.getElementById("copiaL").innerHTML = otros.length ? otros.map(function (c) {
      var x = r.c[c.nro][k];
      return '<label class="chk"><input type="checkbox" value="' + c.nro + '"' + (x ? "" : " checked") + "> " + esc(c.nro) + " · " + esc(c.servicio) + ' <span class="small">(' + esc(c.cli.razon) + (x ? " · ya tiene respuesta" : "") + ")</span></label>";
    }).join("") : '<p class="small">No hay otros contratos marcados para migrar.</p>';
    document.getElementById("dlgCopia").showModal();
  }
  function aplicarCopia() {
    var n = 0;
    Array.prototype.forEach.call(document.querySelectorAll("#copiaL input:checked"), function (i) { rc(r, i.value)[copia.k] = copia.val; n++; });
    document.getElementById("dlgCopia").close(); guardar();
    aviso = n ? "Copiado a " + n + " contrato" + (n === 1 ? "" : "s") + "." : "";
    render("cuerpo");
  }

  /* ---------- envío ---------- */
  function mensaje() {
    return codificar(payload(r, cart)).then(function (cod) { return "Relevamiento migración DMS · " + cart.ejecutivo + " · REL-DMS|1|" + cart.id + "|" + cod; });
  }
  function enviar() {
    mensaje().then(function (msg) {
      r.enviado = new Date().toLocaleString("es-AR"); guardar();
      var url = "https://teams.microsoft.com/l/chat/0/0?users=" + encodeURIComponent(CAT.destino) + "&message=" + encodeURIComponent(msg);
      window.open(url, "_blank", "noopener");
      render("btnEnviar");
      document.getElementById("msgEnvio").innerHTML = '<p class="small">Mensaje de ' + msg.length + " caracteres (link de " + url.length + ").</p>";
    });
  }
  function copiarCodigo() {
    mensaje().then(function (msg) {
      var ok = function () { document.getElementById("msgEnvio").innerHTML = '<div class="alert alert-success"><div>Código copiado. Pegalo en tu chat de Teams con Pablo Sánchez y envialo.</div></div>'; };
      if (navigator.clipboard) navigator.clipboard.writeText(msg).then(ok, function () { mostrarCodigo(msg); });
      else mostrarCodigo(msg);
    });
  }
  function mostrarCodigo(msg) {
    document.getElementById("msgEnvio").innerHTML = '<div class="campo"><label for="codTxt">Copiá este texto y pegalo en Teams</label><textarea id="codTxt" rows="4" readonly>' + esc(msg) + "</textarea></div>";
    document.getElementById("codTxt").select();
  }

  /* ---------- eventos ---------- */
  document.addEventListener("change", function (e) {
    var t = e.target, k = t.getAttribute && t.getAttribute("data-k"); if (!k) return;
    var ref = t.getAttribute("data-ref");
    if (k === "etiq") r.e[ref] = t.value;
    else { var x = rc(r, ref); x[k] = t.value; if (k === "m" && t.value !== "no") delete x.mot; }
    guardar(); render(t.id);
  });
  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("button") : null; if (!t) return;
    if (t.hasAttribute("data-ir")) ir(+t.getAttribute("data-ir"));
    else if (t.hasAttribute("data-copiar")) abrirCopia(t.getAttribute("data-copiar"), t.getAttribute("data-nro"));
    else if (t.id === "btnAnt") ir(paso - 1);
    else if (t.id === "btnSig") ir(paso + 1);
    else if (t.id === "copiaOk") aplicarCopia();
    else if (t.id === "copiaNo") document.getElementById("dlgCopia").close();
    else if (t.id === "btnEnviar") enviar();
    else if (t.id === "btnCopiarCod") copiarCodigo();
  });
  document.getElementById("quien").textContent = cart.ejecutivo;
  render();
})(typeof window !== "undefined" ? window : globalThis);
