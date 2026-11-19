/* ABM Contratos DMS · prototipo de propuesta v0.9 (T-007, D-063 a D-100). Datos ficticios. Deshabilitar/habilitar: abm-estado.js · formulario Mobile Entrega, póliza y contactos: abm-servicio.js · domicilios cargados: abm-domicilios.js · vigencia hasta: abm-vigencia.js */
(function (g) {
  "use strict";
  var D = g.ABM_DATOS, P = g.ABM_SERVICIO;

  /* ---------- utilidades ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function clon(o) { return JSON.parse(JSON.stringify(o)); }
  function hoyISO() { var d = new Date(); return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()); }
  function p2(n) { return (n < 10 ? "0" : "") + n; }
  function manianaISO() { var d = new Date(); d.setDate(d.getDate() + 1); return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()); }
  function fmtFecha(iso) { if (!iso) return "—"; var p = iso.split("-"); return p[2] + "/" + p[1] + "/" + p[0]; }
  function ahora() { var d = new Date(); return hoyISO() + " " + p2(d.getHours()) + ":" + p2(d.getMinutes()); }
  function sap(nro) { for (var i = 0; i < D.SAP.length; i++) if (D.SAP[i].nro === nro) return D.SAP[i]; return null; }
  function ciclo(id) { for (var i = 0; i < D.CICLOS.length; i++) if (D.CICLOS[i].id === id) return D.CICLOS[i]; return null; }
  function clase(id) { for (var i = 0; i < D.CLASES.length; i++) if (D.CLASES[i].id === id) return D.CLASES[i]; return null; }
  function condDef(id) { for (var i = 0; i < D.CONDICIONES.length; i++) if (D.CONDICIONES[i].id === id) return D.CONDICIONES[i]; return null; }
  function nivel(id) { for (var i = 0; i < D.NIVELES.length; i++) if (D.NIVELES[i].id === id) return D.NIVELES[i]; return null; }
  function opNivel(id, cod) { var n = nivel(id); if (!n) return null; for (var i = 0; i < n.opciones.length; i++) if (n.opciones[i].cod === cod) return n.opciones[i]; return null; }
  function esFrio(b) { var o = opNivel("continente", b.niveles.continente); return !!(o && o.frio); }
  function domTexto(d) { return d.calle + " " + d.numero + ", " + d.localidad + ", " + d.provincia + " (CP " + d.cp + ")"; }
  function domClave(d) { return [d.calle, d.numero, d.localidad, d.provincia, d.cp].join("|").toLowerCase().replace(/\s+/g, " ").trim(); }

  var ICO = {
    info: '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="none" stroke="currentColor" stroke-width="2"/><rect x="9" y="8.5" width="2" height="6" fill="currentColor"/><rect x="9" y="5" width="2" height="2" fill="currentColor"/></svg>',
    alerta: '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2 19 18H1Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><rect x="9" y="7.5" width="2" height="5" fill="currentColor"/><rect x="9" y="14" width="2" height="2" fill="currentColor"/></svg>',
    error: '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6.5 6.5l7 7M13.5 6.5l-7 7" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
    ok: '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6 10.5l2.7 2.7L14 7.8" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
    check: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6.5 5 9l5-6" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
    cruz: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3 3 9" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
    reloj: '<svg viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M6 3v3l2 1.5" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>',
    pausa: '<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="3" y="2.5" width="2" height="7" fill="currentColor"/><rect x="7" y="2.5" width="2" height="7" fill="currentColor"/></svg>',
    flecha: '<svg class="flecha" viewBox="0 0 20 20" aria-hidden="true"><path d="M7 4l6 6-6 6" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
    kebab: '<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><circle cx="10" cy="4" r="2" fill="currentColor"/><circle cx="10" cy="10" r="2" fill="currentColor"/><circle cx="10" cy="16" r="2" fill="currentColor"/></svg>'
  };
  function alerta(tipo, html, extra) {
    var ic = tipo === "info" ? ICO.info : tipo === "success" ? ICO.ok : tipo === "error" ? ICO.error : ICO.alerta;
    var rol = tipo === "error" ? ' role="alert"' : "";
    return '<div class="alert alert-' + tipo + '"' + rol + (extra || "") + ">" + ic + "<div>" + html + "</div></div>";
  }
  function chipEstado(c) {
    if (c.estado === "habilitado") return '<span class="chip chip-ok">' + ICO.check + "Habilitado</span>";
    if (c.estado === "programado") return '<span class="chip chip-prog">' + ICO.reloj + "Vigente desde " + fmtFecha(c.vigencia) + "</span>";
    return '<span class="chip chip-off">' + ICO.pausa + "Deshabilitado</span>";
  }

  /* ---------- lógica pura (testeable en Node) ---------- */
  function nuevoBorrador() {
    var cond = {};
    D.CONDICIONES.forEach(function (c) { cond[c.id] = c.tipo ? "" : false; });
    return { nro: "", niveles: { logistica: "", continente: "", sla: "" }, form: "", ciclo: "", cond: cond,
      agrupador: "", poliza: "", contactos: [],
      domicilios: [], estado: "", vigencia: "", hasta: "" };
  }
  function clasesCubiertas(b) {
    var m = {};
    b.domicilios.forEach(function (d) { d.clases.forEach(function (c) { m[c] = d.id; }); });
    if (b.agrupador) m.DEVOLUCION_REMITOS = "heredada";
    return m;
  }
  function faltantes(paso, b, ctx) {
    var f = [];
    if (paso === 1) {
      if (!b.nro) f.push("Elegir el contrato de SAP");
      else if (ctx && ctx.modo === "alta" && ctx.yaConfigurado(b.nro)) f.push("El contrato elegido ya está configurado: editalo desde el listado");
    }
    if (paso === 2) {
      D.NIVELES.forEach(function (n) { if (!b.niveles[n.id]) f.push("Elegir «" + n.nombre + "»"); });
      if (!b.form) f.push("Elegir el Formulario Mobile Entrega");
      if (!b.ciclo) f.push("Elegir el ciclo de vida");
      if (!b.cond.remito) f.push("Indicar cómo viaja el remito (Admisión)");
      if (b.cond.devCentral && !b.cond.uoDevCentral) f.push("Elegir la UO de devolución centralizada (Acciones sobre el envío)");
    }
    if (paso === 3) {
      var cub = clasesCubiertas(b);
      D.CLASES.forEach(function (c) { if (c.obligatoria && !cub[c.id]) f.push("Cargar domicilio de «" + c.nombre + "»"); });
    }
    if (paso === 4) {
      if (!b.estado) f.push("Elegir cómo queda el contrato al guardar");
      if (b.estado === "programado") {
        if (!b.vigencia) f.push("Indicar la fecha «Vigente desde»");
        else if (b.vigencia < manianaISO()) f.push("La fecha «Vigente desde» debe ser posterior a hoy");
      }
      if (g.ABM_VIG) f = f.concat(g.ABM_VIG.faltantes(b, hoyISO()));
    }
    return f;
  }
  function advertencias(b) {
    var a = [], alt;
    var oc = opNivel("continente", b.niveles.continente), ol = opNivel("logistica", b.niveles.logistica), req = P.reqDe(b.form), pn = b.form ? "Formulario " + b.form : "";
    if (req.indexOf("valores") >= 0 && !b.cond.cobranza) a.push({ tipo: "warning", txt: "El " + pn + " cobra valores al entregar. Activá «Gestión de cobranza».", btn: "Activar gestión de cobranza", fix: { cond: "cobranza", val: true } });
    if (b.cond.cobranza && b.form && req.indexOf("valores") < 0 && (alt = P.cercano(b.form, "valores", null))) a.push({ tipo: "warning", txt: "Hay gestión de cobranza, pero el " + pn + " no cobra valores. Usá un formulario que cobre.", btn: "Usar Formulario " + alt.cod + " (" + alt.nombre + ")", fix: { form: alt.cod } });
    if (b.cond.remito === "Sin remito" && req.indexOf("fotoRemito") >= 0) a.push({ tipo: "warning", txt: "El contrato es «Sin remito», pero el " + pn + " pide foto del remito. Si el remito viaja, indicá cómo.", btn: "Pasar a remito digital", fix: { cond: "remito", val: "Digital" } });
    if (req.indexOf("insumo") >= 0 && oc && !oc.frio && (alt = P.cercano(b.form, null, "insumo"))) a.push({ tipo: "caution", txt: "El " + pn + " retira insumo (conservadora retornable), pero el tipo de carga «" + oc.nombre + "» no es de frío. Elegí un tipo de carga de frío o un formulario sin insumo.", btn: "Usar Formulario " + alt.cod + " (sin insumo)", fix: { form: alt.cod } });
    if (ol && ol.cod === "7" && !b.cond.cambio) a.push({ tipo: "caution", txt: "El tipo de operación es «Cambio». Activá la condición «Cambio».", btn: "Activar cambio", fix: { cond: "cambio", val: true } });
    return a;
  }
  function aplicarFix(b, fx) {
    if (fx.cond) { b.cond[fx.cond] = fx.val; if (!fx.val) D.CONDICIONES.forEach(function (x) { if (x.depende === fx.cond) b.cond[x.id] = x.tipo ? "" : false; }); }
    if (fx.form) b.form = fx.form;
  }
  /* D-084: sin tipo de carga de frío no existen las opciones de frío; devuelve true si había alguna activa */
  function limpiarFrio(b) {
    if (esFrio(b)) return false;
    var hubo = false;
    D.CONDICIONES.forEach(function (c) { if (c.bloque === "frio") { if (b.cond[c.id]) hubo = true; b.cond[c.id] = false; } });
    return hubo;
  }
  function textoUO(cod) { var u = (D.UOS || []).filter(function (x) { return x.cod === cod; })[0]; return u ? "UO " + u.cod + " " + u.nombre : "—"; }
  function textoCond(c, v) { return c.tipo === "uo" ? (v ? textoUO(v) : "Sin elegir") : c.tipo === "opciones" ? (v || "—") : (v ? "Sí" : "No"); }
  function filasResumen(b) {
    var s = sap(b.nro) || {};
    var f = [];
    function add(sec, k, v) { f.push({ sec: sec, k: k, v: v }); }
    add("sap", "N° de contrato", b.nro); add("sap", "Descripción", s.desc); add("sap", "Razón social", s.razon); add("sap", "Solicitante", s.solicitante);
    add("sap", "Canal", C ? C.canal(b.nro) : "—");
    add("sap", "Contrato agrupador de rendición", b.agrupador ? b.agrupador + " (hereda el domicilio de rendición)" : "Sin agrupador");
    D.NIVELES.forEach(function (n) { var o = opNivel(n.id, b.niveles[n.id]); add("servicio", n.nombre, o ? o.nombre + " (DMS " + n.dmsNombre + " " + o.cod + ")" : "—"); });
    add("servicio", "Cadena de frío", esFrio(b) ? "Sí (la da el tipo de carga)" : "No");
    var fm = P.proto(b.form); add("servicio", "Formulario Mobile Entrega", fm ? P.nombreProto(fm) : "—");
    var cv = ciclo(b.ciclo); add("servicio", "Ciclo de vida", cv ? cv.codigo + " · " + cv.nombre : "—");
    D.CONDICIONES.forEach(function (c) {
      if (c.bloque === "frio" && !esFrio(b)) return;
      if (c.depende && !b.cond[c.depende]) add("cond-" + c.bloque, c.nombre, "No aplica (requiere " + condDef(c.depende).nombre + ")");
      else add("cond-" + c.bloque, c.nombre, textoCond(c, b.cond[c.id]));
    });
    add("cond-admin", "Número de póliza", b.poliza ? b.poliza : "Sin póliza");
    add("cond-admin", "Contactos", P.textoContactos(b.contactos));
    var cub = clasesCubiertas(b);
    D.CLASES.forEach(function (c) {
      var d = null; b.domicilios.forEach(function (x) { if (x.id === cub[c.id]) d = x; });
      if (c.id === "DEVOLUCION_REMITOS" && b.agrupador) { var hd = L.rendicion(b.agrupador); add("domicilios", c.nombre + " (obligatoria)", "Heredado de " + b.agrupador + (hd ? " · " + domTexto(hd) : "")); return; }
      add("domicilios", c.nombre + (c.obligatoria ? " (obligatoria)" : ""), d ? domTexto(d.dom) : "Sin domicilio");
    });
    if (g.ABM_VIG) add("vigencia", "Vigencia hasta", g.ABM_VIG.texto(b));
    return f;
  }
  function diferencias(orig, b) {
    if (!orig) return {};
    var a = {}, m = {};
    filasResumen(orig).forEach(function (f) { a[f.sec + "|" + f.k] = f.v; });
    filasResumen(b).forEach(function (f) { var k = f.sec + "|" + f.k; if (!a.hasOwnProperty(k)) m[k] = "No existía"; else if (a[k] !== f.v) m[k] = a[k]; });
    return m;
  }
  var C = g.ABM_CARTERA;
  var L = g.ABM_LOGICA = { rendicion: function () { return null; }, aplicarFix: aplicarFix, limpiarFrio: limpiarFrio, esFrio: esFrio, nuevoBorrador: nuevoBorrador, faltantes: faltantes, advertencias: advertencias, clasesCubiertas: clasesCubiertas, filasResumen: filasResumen, diferencias: diferencias, domClave: domClave };
  if (typeof document === "undefined") return;

  /* ---------- estado de la interfaz ---------- */
  var S = { contratos: clon(D.CONTRATOS), vista: "lista", modo: "alta", paso: 1, b: null, orig: null, busqSap: "", busq: "", filtro: "", errores: false, nuevoDom: { calle: "", numero: "", localidad: "", provincia: "", cp: "" }, nuevoClases: [], idSeq: 100 };
  var raiz = document.getElementById("app");
  L.rendicion = function (n) { return C.rendicionDe(n, S.contratos); };

  function contrato(nro) { for (var i = 0; i < S.contratos.length; i++) if (S.contratos[i].nro === nro) return S.contratos[i]; return null; }
  var ctx = { get modo() { return S.modo; }, yaConfigurado: function (n) { return !!contrato(n); } };

  function render(foco) {
    if (g.ABM_VIG) g.ABM_VIG.vencer(S.contratos, hoyISO());
    raiz.innerHTML = S.vista === "lista" ? vLista() : vWizard();
    if (foco) { var el = document.getElementById(foco); if (el) el.focus(); }
  }

  /* ---------- listado ---------- */
  function vLista() {
    var q = S.busq.toLowerCase();
    var filas = S.contratos.filter(function (c) {
      var s = sap(c.nro) || {}; if (!C.enCartera(c.nro)) return false;
      var txt = [c.nro, s.razon, s.desc, s.solicitante].join(" ").toLowerCase();
      return (!q || txt.indexOf(q) >= 0) && (!S.filtro || c.estado === S.filtro);
    });
    var sinConf = D.SAP.filter(function (s) { return !contrato(s.nro) && C.enCartera(s.nro); }).length, nCli = C.clientesCartera();
    var h = alerta("info", "<strong>Prototipo de propuesta.</strong> Datos ficticios; no se conecta con DMS ni con SAP. Usuario de ejemplo: comercial.");
    h += '<section class="card" aria-labelledby="t-lista"><div class="card-head"><h2 id="t-lista">Contratos</h2><div class="acciones">' +
      '<button class="btn btn-primary" data-acc="nuevo">+ Configurar contrato</button></div></div>';
    h += '<p class="small"><span class="strong">Contratos de tu cartera</span> (' + nCli + " cliente" + (nCli === 1 ? "" : "s") + "): ves y configurás solo los tuyos. " + sinConf + " contrato" + (sinConf === 1 ? "" : "s") + " de SAP todavía sin configurar en DMS.</p>";
    h += '<div class="campos"><div class="campo buscador"><label for="busq">Buscar</label><input type="search" id="busq" value="' + esc(S.busq) + '" placeholder="Contrato, razón social o solicitante"></div>' +
      '<div class="campo"><label for="filtro">Estado</label><select id="filtro"><option value="">Todos</option>' +
      [["habilitado", "Habilitado"], ["programado", "Vigente desde (programado)"], ["deshabilitado", "Deshabilitado"]].map(function (o) { return '<option value="' + o[0] + '"' + (S.filtro === o[0] ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + "</select></div></div>";
    h += '<div class="tabla-wrap"><table><caption class="sr-only">Contratos configurados</caption><thead><tr><th scope="col">Razón social</th><th scope="col">Contrato SAP</th><th scope="col">Solicitante</th><th scope="col">Niveles de esfuerzo</th><th scope="col">Ciclo de vida</th><th scope="col">Vigencia</th><th scope="col">Estado</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead><tbody>';
    if (!filas.length) h += '<tr><td colspan="8">No hay contratos con esos filtros.</td></tr>';
    filas.forEach(function (c) {
      var s = sap(c.nro) || {}; var cv = ciclo(c.ciclo);
      h += "<tr><td>" + esc(s.razon) + "</td><td><span class=\"strong\">" + esc(c.nro) + "</span> " + C.chipCanal(c.nro) + (c.agrupador ? ' <span class="chip" title="Contrato agrupador de rendición: hereda la rendición de ' + esc(c.agrupador) + '">Agrupador ' + esc(c.agrupador) + "</span>" : "") + '<br><span class="caption">' + esc(s.desc) + "</span></td><td>" + esc(s.solicitante) + "</td>" +
        '<td><div class="chips">' + D.NIVELES.map(function (n) { var o = opNivel(n.id, c.niveles[n.id]); return '<span class="chip" title="' + esc(n.nombre) + (o ? " · DMS " + n.dmsNombre + " " + o.cod : "") + '">' + esc(o ? o.nombre : "—") + "</span>"; }).join("") +
        (function () { var fm = P.proto(c.form); return fm ? '<span class="chip" title="' + esc(P.nombreProto(fm) + " · " + P.textoProto(fm.cod)) + '">Formulario ' + esc(fm.cod) + "</span>" : ""; })() + "</div></td>" +
        "<td>" + (cv ? esc(cv.nombre) + '<br><span class="caption">' + esc(cv.codigo) + "</span>" : "—") + "</td>" +
        "<td>" + (g.ABM_VIG ? g.ABM_VIG.celda(c, hoyISO()) : c.vigencia ? "Desde " + fmtFecha(c.vigencia) : "—") + "</td><td>" + chipEstado(c) + "</td>" +
        '<td class="acc"><div class="kebab"><button class="btn btn-ghost btn-icon btn-sm" aria-haspopup="true" aria-expanded="false" data-acc="kebab" data-nro="' + c.nro + '" aria-label="Acciones del contrato ' + c.nro + '">' + ICO.kebab + "</button>" +
        '<div class="menu" role="menu" hidden><button role="menuitem" data-acc="editar" data-nro="' + c.nro + '">Editar</button>' + (g.ABM_ESTADO ? g.ABM_ESTADO.itemMenu(c) : "") + '<button role="menuitem" data-acc="historial" data-nro="' + c.nro + '">Ver historial (auditoría)</button></div></div></td></tr>';
    });
    h += "</tbody></table></div></section>";
    return h;
  }
  /* ---------- wizard ---------- */
  var PASOS = [["Contrato SAP", "Buscar y confirmar"], ["Servicio", "Niveles, ciclo y condiciones"], ["Domicilios", "Clases y direcciones"], ["Resumen", "Revisar y guardar"]];
  function vWizard() {
    var s = sap(S.b.nro);
    var tit = S.modo === "alta" ? "Configurar contrato" : "Editar contrato " + S.b.nro;
    var h = '<section class="card" aria-labelledby="t-wiz"><div class="card-head"><h2 id="t-wiz">' + esc(tit) + "</h2>" + (s ? '<span class="chip chip-marca">' + esc(s.razon) + "</span>" : "") + "</div>";
    if (S.modo === "edicion" && g.ABM_ESTADO) h += g.ABM_ESTADO.barra(S.b.nro);
    h += '<ol class="stepper">' + PASOS.map(function (p, i) {
      var n = i + 1, act = n === S.paso, hecho = n < S.paso;
      return '<li' + (act ? ' aria-current="step"' : "") + (hecho ? ' class="hecho"' : "") + '><span class="num">' + n + '</span><span>' + p[0] + '<span class="sub">' + (hecho ? "Completo · " : "") + p[1] + "</span></span></li>";
    }).join("") + "</ol>";
    var f = faltantes(S.paso, S.b, ctx);
    if (S.errores && f.length) h += alerta("error", "<strong>Para continuar falta:</strong><ul>" + f.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>", ' id="err" tabindex="-1"');
    h += S.paso === 1 ? vPaso1() : S.paso === 2 ? vPaso2() : S.paso === 3 ? vPaso3() : vPaso4();
    var ult = S.paso === 4;
    h += '<div class="pie-wizard"><button class="btn btn-ghost" data-acc="cancelar">Cancelar</button>' +
      '<span class="small" aria-live="polite">' + (f.length ? "Falta" + (f.length === 1 ? " 1 dato" : "n " + f.length + " datos") + " para continuar" : "Paso completo") + "</span>" +
      '<div class="der">' + (S.paso > 1 ? '<button class="btn btn-secondary" data-acc="anterior">Anterior</button>' : "") +
      '<button class="btn btn-primary" data-acc="' + (ult ? "guardar" : "siguiente") + '">' + (ult ? (S.modo === "alta" ? "Crear contrato" : "Guardar cambios") : "Siguiente") + "</button></div></div>";
    return h + "</section>";
  }

  function vFicha(s) {
    return '<dl class="ficha"><div><dt>N° de contrato</dt><dd>' + esc(s.nro) + "</dd></div><div><dt>Descripción</dt><dd>" + esc(s.desc) + "</dd></div><div><dt>Razón social</dt><dd>" + esc(s.razon) + "</dd></div><div><dt>Solicitante</dt><dd>" + esc(s.solicitante) + "</dd></div><div><dt>Alta en SAP</dt><dd>" + fmtFecha(s.alta) + "</dd></div></dl>";
  }
  function vPaso1() {
    var h = "";
    if (S.modo === "alta") {
      var q = S.busqSap.toLowerCase();
      /* D-096: solo contratos de SAP que todavía no están en DMS; los configurados se gestionan desde el listado */
      var coinc = D.SAP.filter(function (s) { return C.enCartera(s.nro) && (!q || [s.nro, s.razon, s.desc, s.solicitante].join(" ").toLowerCase().indexOf(q) >= 0); });
      var res = coinc.filter(function (s) { return !contrato(s.nro); }), yaEn = q ? coinc.filter(function (s) { return !!contrato(s.nro); }) : [];
      h += '<div class="campo buscador"><label for="busqSap">Buscar contrato en SAP (tu cartera)</label><input type="search" id="busqSap" value="' + esc(S.busqSap) + '" placeholder="N° de contrato, razón social o solicitante" aria-describedby="busqSap-a"><span class="ayuda" id="busqSap-a">El contrato tiene que estar dado de alta en SAP. No se tipean datos.</span></div>';
      h += '<ul class="resultados" aria-label="Contratos de SAP">' + (res.length ? res.map(function (s) {
        var ya = !!contrato(s.nro);
        return '<li><button data-acc="elegirSap" data-nro="' + s.nro + '" aria-pressed="' + (S.b.nro === s.nro) + '"' + (ya ? ' disabled aria-disabled="true"' : "") + '><span class="strong">' + esc(s.nro) + " · " + esc(s.desc) + " " + C.chipCanal(s.nro) + '</span><span class="small">' + esc(s.razon) + " · Solicitante " + esc(s.solicitante) + (ya ? " · Ya configurado en DMS (editalo desde el listado)" : "") + "</span></button></li>";
      }).join("") : '<li class="small" style="padding:12px 16px">' + (q ? "No hay contratos para configurar con esa búsqueda." : "Todos los contratos de tu cartera ya están configurados en DMS.") + "</li>") + "</ul>";
      h += '<p class="aviso-sap">' + (yaEn.length ? "Ya están en DMS: " + yaEn.map(function (s) { return esc(s.nro); }).join(", ") + ". Los editás, habilitás o deshabilitás desde el listado de contratos." : "Solo aparecen los contratos de SAP que todavía no están en DMS; los que ya están los gestionás desde el listado.") + "</p>";
    }
    var s = sap(S.b.nro);
    if (s) h += '<h3>Datos del contrato en SAP</h3><p class="small">Solo lectura: si algo está mal, se corrige en SAP.</p>' + vFicha(s);
    if (s) h += vAgrupador();
    return h;
  }
  /* Contrato agrupador (D-089): opcional; hereda la rendición, que deja de configurarse acá */
  function vAgrupador() {
    var ops = C.agrupadores(S.b.nro, S.contratos), ag = S.b.agrupador, hd = ag ? L.rendicion(ag) : null;
    var h = '<h3>Contrato agrupador de rendición</h3><div class="campo" style="max-width:520px"><label for="agrupador">Contrato agrupador de rendición (opcional)</label>';
    if (!ops.length && !ag) return h + '<p class="small" id="agrupador">Este solicitante todavía no tiene otro contrato configurado: no hay de dónde heredar.</p></div>';
    h += '<select id="agrupador" aria-describedby="agrupador-a"><option value="">Sin agrupador</option>' + ops.map(function (c) { var sc = sap(c.nro) || {}; return '<option value="' + c.nro + '"' + (ag === c.nro ? " selected" : "") + ">" + esc(c.nro + " · " + sc.desc + " (" + C.canal(c.nro) + ")") + "</option>"; }).join("") + "</select>";
    h += '<span class="ayuda" id="agrupador-a">Solo contratos ya configurados del mismo solicitante. El contrato toma del agrupador el domicilio de rendición: si cambia allá, cambia acá.</span></div>';
    if (ag) h += alerta("info", "La rendición se hereda de <strong>" + esc(ag) + "</strong>" + (hd ? ": " + esc(domTexto(hd)) : "") + ". En «Domicilios» no hace falta cargarla.");
    return h;
  }

  function vPaso2() {
    var b = S.b;
    var h = '<div class="grid-2"><div class="campo" style="gap:16px"><h3>Niveles de esfuerzo</h3><div class="campos" style="grid-template-columns:1fr">' + D.NIVELES.map(function (n) {
      var sel = opNivel(n.id, b.niveles[n.id]);
      return '<div class="campo"><label for="niv-' + n.id + '">' + n.nombre + ' <span class="caption">(DMS: ' + esc(n.dmsNombre) + ')</span></label><select id="niv-' + n.id + '" aria-describedby="niv-' + n.id + '-a"><option value="">Elegir…</option>' + n.opciones.map(function (o) {
        return '<option value="' + o.cod + '"' + (b.niveles[n.id] === o.cod ? " selected" : "") + ">" + esc(o.nombre) + " — DMS " + o.cod + ": " + esc(o.dms) + "</option>";
      }).join("") + '</select><span class="ayuda" id="niv-' + n.id + '-a">' + (sel ? esc(sel.ayuda) : "&nbsp;") + "</span></div>";
    }).join("") + '</div><p class="caption">Nombre comercial con el valor real de DMS al lado. Hoy DMS concatena los niveles como «Nombre contrato DMS»; proponemos mostrarlos en el listado.</p></div>';
    h += '<div class="campo" style="gap:16px"><h3>Ciclo de vida</h3><fieldset class="opciones"><legend>Elegí el ciclo por nombre</legend>' + D.CICLOS.map(function (c) {
      return '<label class="opcion grande"><input type="radio" name="ciclo" value="' + c.id + '"' + (b.ciclo === c.id ? " checked" : "") + '><span><span class="strong">' + esc(c.nombre) + (c.estandar ? ' <span class="chip">Estándar B2B · hoy en DMS</span>' : "") + '</span><span class="det">' + esc(c.codigo) + "</span></span></label>";
    }).join("") + '</fieldset><p class="caption">La lista sale del maestro de ciclos con nombre (propuesta, fuera de este prototipo). Hoy todos los contratos usan un único ciclo y no se puede elegir.</p></div></div>';
    h += P.vProtocolo(b);
    advertencias(b).forEach(function (a, i) { h += alerta(a.tipo, esc(a.txt) + (a.btn ? ' <button class="btn btn-secondary btn-sm" style="margin-left:8px" data-acc="fix" data-i="' + i + '">' + esc(a.btn) + "</button>" : "")); });
    h += "<h3>Condiciones del servicio</h3><p class=\"small\">Las condiciones de hoy, agrupadas y explicadas. Debajo de cada una figura su nombre actual en DMS. Textos de ayuda de ejemplo, a validar con DMS.</p>";
    if (S.msgFrio) h += S.msgFrio;
    var oc = opNivel("continente", b.niveles.continente);
    D.BLOQUES.forEach(function (bl, i) {
      if (bl.soloFrio && !esFrio(b)) return;
      var cs = D.CONDICIONES.filter(function (c) { return c.bloque === bl.id; });
      var act = cs.filter(function (c) { return c.tipo ? false : !!b.cond[c.id] && (!c.depende || b.cond[c.depende]); }).length;
      var bin = cs.filter(function (c) { return !c.tipo; }).length;
      h += '<details class="bloque" data-bloque="' + bl.id + '"' + (S.abiertos[bl.id] ? " open" : "") + '><summary>' + ICO.flecha + '<span><span class="strong">' + bl.nombre + '</span><br><span class="caption">' + (bl.soloFrio ? "El tipo de carga «" + esc(oc.nombre) + "» viaja con cadena de frío: estas opciones solo existen en contratos de frío." : bl.desc) + '</span></span><span class="chip resumen-b">' + act + " de " + bin + " activas</span></summary><div class=\"condiciones\">";
      cs.forEach(function (c) { h += vCond(c, b); });
      h += "</div>" + (bl.id === "admin" ? P.vAdmin(b) : "") + "</details>";
    });
    return h;
  }
  function vCond(c, b) {
    var idA = "ay-" + c.id;
    var cab = '<div><span class="strong">' + c.nombre + '</span><br><span class="caption">En DMS hoy: ' + c.dms.map(function (x) { return "«" + esc(x) + "»"; }).join(" + ") + "</span></div>";
    if (c.tipo === "uo") {
      if (c.depende && !b.cond[c.depende]) return "";
      var sinUO = !b.cond[c.id];
      return '<div class="cond dependiente"><div class="campo" style="grid-column:1/-1;max-width:420px"><label for="uo-' + c.id + '">' + esc(c.nombre) + ' <span class="caption">(obligatoria)</span></label><select id="uo-' + c.id + '" data-uo="' + c.id + '" aria-describedby="' + idA + '"' + (sinUO ? ' aria-invalid="true"' : "") + '><option value="">Elegir…</option>' +
        (D.UOS || []).map(function (u) { return '<option value="' + esc(u.cod) + '"' + (b.cond[c.id] === u.cod ? " selected" : "") + ">UO " + esc(u.cod) + " " + esc(u.nombre) + "</option>"; }).join("") +
        '</select><span class="ayuda" id="' + idA + '">' + esc(c.ayuda) + (sinUO ? ' <span class="bloqueo">Elegí la UO: sin ella no se puede seguir.</span>' : "") + "</span></div></div>";
    }
    if (c.tipo === "opciones") {
      return '<div class="cond">' + cab + "<span></span>" + '<fieldset class="opciones" aria-describedby="' + idA + '" style="grid-column:1/-1"><legend class="sr-only">' + c.nombre + "</legend>" + c.opciones.map(function (o) {
        return '<label class="opcion"><input type="radio" name="cond-' + c.id + '" value="' + esc(o) + '"' + (b.cond[c.id] === o ? " checked" : "") + ">" + esc(o) + "</label>";
      }).join("") + '</fieldset><span class="ayuda" id="' + idA + '">' + esc(c.ayuda) + "</span></div>";
    }
    var bloq = c.depende && !b.cond[c.depende];
    var on = !!b.cond[c.id] && !bloq;
    return '<div class="cond' + (c.depende ? " dependiente" : "") + '">' + cab +
      '<label class="switch"><input type="checkbox" role="switch" id="sw-' + c.id + '" data-cond="' + c.id + '"' + (on ? " checked" : "") + (bloq ? " disabled" : "") + ' aria-describedby="' + idA + '" aria-label="' + esc(c.nombre) + '"><span class="pista" aria-hidden="true"></span><span class="txt" aria-hidden="true">' + (on ? "Sí" : "No") + "</span></label>" +
      '<span class="ayuda" id="' + idA + '">' + esc(c.ayuda) + (bloq ? ' <span class="bloqueo">Activá «' + condDef(c.depende).nombre + "» para habilitarla.</span>" : "") + "</span></div>";
  }

  function vPaso3() {
    var b = S.b, cub = clasesCubiertas(b);
    var h = alerta("info", "Clases y obligatorias según la lista actual. Hay más clases y la correspondencia con los «Tipo N» de hoy queda <strong>a validar con el equipo de DMS</strong>.");
    h += '<h3>Clases de domicilio</h3><div class="clases" role="list">' + D.CLASES.map(function (c) {
      var ok = !!cub[c.id];
      if (c.id === "DEVOLUCION_REMITOS" && b.agrupador) return '<div role="listitem" class="clase ok"><span>' + esc(c.nombre) + ' <span class="caption">(heredada de ' + esc(b.agrupador) + ")</span></span>" + '<span class="chip chip-ok estado">' + ICO.check + "Heredada</span></div>";
      var est = ok ? '<span class="chip chip-ok estado">' + ICO.check + "Cargada</span>" : c.obligatoria ? '<span class="chip chip-falta estado">' + ICO.cruz + "Falta</span>" : '<span class="chip estado">Opcional</span>';
      return '<div role="listitem" class="clase' + (ok ? " ok" : c.obligatoria ? " falta" : "") + '"><span>' + esc(c.nombre) + (c.obligatoria ? ' <span class="caption">(obligatoria)</span>' : "") + "</span>" + est + "</div>";
    }).join("") + "</div>";
    h += '<div class="grid-2"><div class="campo" style="gap:12px"><h3>Agregar domicilio</h3>';
    var reus = domiciliosReusables();
    if (reus.length) h += '<div class="campo"><label for="reusar">Reusar un domicilio del cliente</label><select id="reusar"><option value="">Elegir…</option>' + reus.map(function (d, i) { return '<option value="' + i + '">' + esc(domTexto(d)) + "</option>"; }).join("") + "</select></div>";
    var n = S.nuevoDom;
    h += '<div class="campos">' + [["calle", "Calle"], ["numero", "Número"], ["localidad", "Localidad"], ["provincia", "Provincia"], ["cp", "Código postal"]].map(function (x) {
      return '<div class="campo"><label for="nd-' + x[0] + '">' + x[1] + '</label><input type="text" id="nd-' + x[0] + '" value="' + esc(n[x[0]]) + '"></div>';
    }).join("") + "</div>";
    h += '<fieldset class="opciones" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:0 12px"><legend>Usar este domicilio para</legend>' + D.CLASES.map(function (c) {
      if (c.id === "DEVOLUCION_REMITOS" && b.agrupador) return "";
      return '<label class="chk"><input type="checkbox" data-nclase="' + c.id + '"' + (S.nuevoClases.indexOf(c.id) >= 0 ? " checked" : "") + ">" + esc(c.nombre) + (cub[c.id] ? ' <span class="caption">(hoy en otro domicilio: pasa a este)</span>' : "") + "</label>";
    }).join("") + "</fieldset>";
    h += '<div><button class="btn btn-secondary" data-acc="agregarDom">Agregar domicilio</button></div><div id="msgDom" aria-live="polite">' + (S.msgDom || "") + "</div></div>";
    h += '<div class="campo" style="gap:12px">' + g.ABM_DOMI.vCargados(b, b.agrupador ? L.rendicion(b.agrupador) : null) + "</div></div>";
    return h;
  }
  function domiciliosReusables() {
    var s = sap(S.b.nro); if (!s) return [];
    var vistos = {}, out = [];
    S.b.domicilios.forEach(function (d) { vistos[domClave(d.dom)] = 1; });
    S.contratos.forEach(function (c) {
      var sc = sap(c.nro); if (!sc || sc.solicitante !== s.solicitante) return;
      c.domicilios.forEach(function (d) { var k = domClave(d.dom); if (!vistos[k]) { vistos[k] = 1; out.push(d.dom); } });
    });
    return out;
  }

  function vPaso4() {
    var b = S.b, filas = filasResumen(b), dif = diferencias(S.orig, b), nDif = Object.keys(dif).length;
    var h = "";
    if (S.modo === "edicion") h += alerta(nDif ? "caution" : "info", nDif ? "<strong>" + nDif + " cambio" + (nDif === 1 ? "" : "s") + "</strong> respecto de la versión vigente (resaltados, con el valor anterior tachado)." : "No hay cambios respecto de la versión vigente.");
    var secs = [["sap", "Contrato", 1], ["servicio", "Niveles de esfuerzo y ciclo de vida", 2]];
    D.BLOQUES.forEach(function (bl) { secs.push(["cond-" + bl.id, "Condiciones · " + bl.nombre, 2]); });
    secs.push(["domicilios", "Domicilios por clase", 3]); secs.push(["vigencia", "Vigencia", 4]);
    h += '<div class="resumen">' + secs.map(function (sc) {
      var fs = filas.filter(function (f) { return f.sec === sc[0]; });
      if (!fs.length) return "";
      var nc = fs.filter(function (f) { return dif.hasOwnProperty(f.sec + "|" + f.k); }).length;
      return '<div class="res-sec"><h4>' + sc[1] + (nc ? ' <span class="chip chip-cambio">' + nc + " cambio" + (nc === 1 ? "" : "s") + "</span>" : "") + ('<button class="btn btn-ghost btn-sm" data-acc="irPaso" data-paso="' + sc[2] + '">Editar</button>') + "</h4>" +
        fs.map(function (f) {
          var k = f.sec + "|" + f.k, ch = dif.hasOwnProperty(k);
          return '<div class="res-fila' + (ch ? " cambio" : "") + '"><span class="k">' + esc(f.k) + '</span><span class="v">' + (ch ? '<span class="chip chip-cambio">Cambió</span> ' : "") + esc(f.v) + (ch ? '<span class="antes"><span class="sr-only">Antes: </span>' + esc(dif[k]) + "</span>" : "") + "</span></div>";
        }).join("") + "</div>";
    }).join("") + "</div>";
    var ed = S.modo === "edicion";
    h += '<fieldset class="opciones"><legend>' + (ed ? "¿Desde cuándo rigen los cambios?" : "¿Cómo queda el contrato al guardar?") + "</legend>" +
      opEstado("habilitado", ed ? "Habilitado desde hoy" : "Habilitado", ed ? "Los cambios rigen para los envíos que se admitan desde hoy." : "Se puede usar desde hoy.") +
      opEstado("programado", "Vigente desde una fecha", ed ? "Los cambios rigen desde la fecha elegida; hasta entonces sigue la versión actual." : "Queda listo y empieza a regir en la fecha elegida.") +
      opEstado("deshabilitado", "Deshabilitado", "Queda guardado pero no se puede usar hasta habilitarlo.") + "</fieldset>";
    if (b.estado === "programado") h += '<div class="campo" style="max-width:260px"><label for="vigencia">Vigente desde</label><input type="date" id="vigencia" min="' + manianaISO() + '" value="' + esc(b.vigencia) + '"></div>';
    if (g.ABM_VIG) h += g.ABM_VIG.vCampo(b);
    h += alerta("info", "Los cambios rigen hacia adelante: los envíos ya admitidos siguen con la configuración con la que entraron. Queda registro en la auditoría de DMS (usuario, fecha y detalle).");
    return h;
  }
  function opEstado(v, t, d) { return '<label class="opcion grande"><input type="radio" name="estado" value="' + v + '"' + (S.b.estado === v ? " checked" : "") + '><span><span class="strong">' + t + '</span><span class="det">' + d + "</span></span></label>"; }

  /* ---------- modal historial ---------- */
  var ultimoFoco = null;
  function abrirHistorial(nro) {
    var c = contrato(nro); ultimoFoco = document.activeElement;
    var m = document.createElement("div"); m.className = "modal-fondo"; m.id = "modal";
    m.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="t-hist"><div class="modal-head"><h3 id="t-hist">Historial del contrato ' + esc(nro) + '</h3><button class="btn btn-ghost btn-sm" data-acc="cerrarModal" id="cerrarModal">Cerrar</button></div>' +
      '<p class="small">Auditoría de DMS: cada alta y cada cambio quedan registrados con usuario, fecha y detalle.</p><div class="tabla-wrap"><table><thead><tr><th scope="col">Fecha</th><th scope="col">Usuario</th><th scope="col">Acción</th><th scope="col">Detalle</th></tr></thead><tbody>' +
      c.historial.slice().reverse().map(function (h) { return "<tr><td>" + esc(h.fecha) + "</td><td>" + esc(h.usuario) + "</td><td>" + esc(h.accion) + "</td><td>" + esc(h.detalle) + "</td></tr>"; }).join("") + "</tbody></table></div></div>";
    document.body.appendChild(m);
    document.getElementById("cerrarModal").focus();
  }
  function cerrarModal() { var m = document.getElementById("modal"); if (m) m.parentNode.removeChild(m); if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus(); }
  function toast(txt) {
    var t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.innerHTML = ICO.ok + "<span>" + esc(txt) + "</span>";
    document.body.appendChild(t); setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 4000);
  }

  /* ---------- acciones ---------- */
  function iniciar(modo, nro) {
    S.modo = modo; S.vista = "wizard"; S.paso = 1; S.errores = false; S.busqSap = ""; S.msgDom = ""; g.ABM_DOMI.reset();
    S.nuevoDom = { calle: "", numero: "", localidad: "", provincia: "", cp: "" }; S.nuevoClases = [];
    S.abiertos = { admision: true, frio: true, acciones: false, admin: false }; S.msgFrio = ""; if (P.reset) P.reset();
    if (modo === "alta") { S.b = nuevoBorrador(); S.orig = null; }
    else {
      var c = contrato(nro);
      S.b = { nro: c.nro, niveles: clon(c.niveles), form: c.form || "", ciclo: c.ciclo, cond: clon(c.cond), agrupador: c.agrupador || "", poliza: c.poliza || "", contactos: clon(c.contactos || []), domicilios: clon(c.domicilios), estado: "", vigencia: "", hasta: c.hasta || "" };
      S.orig = clon(S.b);
    }
    render("t-wiz"); window.scrollTo(0, 0);
  }
  function irPaso(n) { S.paso = n; S.errores = false; S.msgDom = ""; S.msgFrio = ""; g.ABM_DOMI.reset(); render("t-wiz"); window.scrollTo(0, 0); }
  function siguiente() {
    var f = faltantes(S.paso, S.b, ctx);
    if (f.length) { S.errores = true; render("err"); return; }
    irPaso(S.paso + 1);
  }
  function guardar() {
    var f = faltantes(4, S.b, ctx);
    if (f.length) { S.errores = true; render("err"); return; }
    var b = S.b, vig = b.estado === "habilitado" ? hoyISO() : b.estado === "programado" ? b.vigencia : "";
    var detEstado = b.estado === "habilitado" ? "Habilitado desde " + fmtFecha(vig) : b.estado === "programado" ? "Vigente desde " + fmtFecha(vig) : "Deshabilitado";
    if (b.estado === "deshabilitado") b.hasta = ""; else if (b.hasta) detEstado += " · vence el " + fmtFecha(b.hasta);
    if (S.modo === "alta") {
      S.contratos.unshift({ nro: b.nro, niveles: b.niveles, form: b.form, ciclo: b.ciclo, cond: b.cond, agrupador: b.agrupador, poliza: b.poliza, contactos: b.contactos, domicilios: b.domicilios, estado: b.estado, vigencia: vig, hasta: b.hasta || "",
        historial: [{ fecha: ahora(), usuario: "comercial.ejemplo", accion: "Alta", detalle: "Contrato creado · " + detEstado }] });
      toast("Contrato " + b.nro + " creado · " + detEstado);
    } else {
      var c = contrato(b.nro), dif = diferencias(S.orig, b), ks = Object.keys(dif);
      c.niveles = b.niveles; c.form = b.form; c.ciclo = b.ciclo; c.cond = b.cond; c.agrupador = b.agrupador; c.poliza = b.poliza; c.contactos = b.contactos; c.domicilios = b.domicilios; c.estado = b.estado; c.vigencia = vig; c.hasta = b.hasta || "";
      c.historial.push({ fecha: ahora(), usuario: "comercial.ejemplo", accion: "Modificación (versión " + (c.historial.length + 1) + ")",
        detalle: (ks.length ? ks.map(function (k) { return k.split("|")[1]; }).join(", ") : "Sin cambios de configuración") + " · " + detEstado });
      toast("Cambios guardados · " + detEstado);
    }
    S.vista = "lista"; render("t-lista");
  }
  function agregarDom() {
    var n = S.nuevoDom, faltan = []; g.ABM_DOMI.reset();
    [["calle", "Calle"], ["numero", "Número"], ["localidad", "Localidad"], ["provincia", "Provincia"], ["cp", "Código postal"]].forEach(function (x) { if (!String(n[x[0]]).trim()) faltan.push(x[1]); });
    if (faltan.length) { S.msgDom = alerta("error", "Completá: " + esc(faltan.join(", ")) + "."); render("nd-calle"); return; }
    if (!S.nuevoClases.length) { S.msgDom = alerta("error", "Marcá al menos una clase donde se usa el domicilio."); render(); return; }
    var dom = { calle: n.calle.trim(), numero: n.numero.trim(), localidad: n.localidad.trim(), provincia: n.provincia.trim(), cp: n.cp.trim() };
    var k = domClave(dom), existe = null;
    S.b.domicilios.forEach(function (d) { if (domClave(d.dom) === k) existe = d; });
    S.b.domicilios.forEach(function (d) { d.clases = d.clases.filter(function (c) { return S.nuevoClases.indexOf(c) < 0; }); });
    if (existe) S.nuevoClases.forEach(function (c) { if (existe.clases.indexOf(c) < 0) existe.clases.push(c); });
    else S.b.domicilios.push({ id: "n" + (S.idSeq++), dom: dom, clases: S.nuevoClases.slice() });
    S.b.domicilios = S.b.domicilios.filter(function (d) { return d.clases.length; });
    S.msgDom = alerta("success", existe ? "El domicilio ya estaba cargado: se le sumaron las clases (sin duplicarlo)." : "Domicilio agregado a " + S.nuevoClases.length + " clase" + (S.nuevoClases.length === 1 ? "" : "s") + ".");
    S.nuevoDom = { calle: "", numero: "", localidad: "", provincia: "", cp: "" }; S.nuevoClases = [];
    render();
  }

  raiz.addEventListener("click", function (e) {
    var t = e.target.closest("[data-acc]"); if (!t) { cerrarMenus(); return; }
    var a = t.getAttribute("data-acc"), nro = t.getAttribute("data-nro");
    if (a === "kebab") { var m = t.nextElementSibling, ab = m.hidden; cerrarMenus(); m.hidden = !ab; t.setAttribute("aria-expanded", String(ab));
      if (ab) { var r = t.getBoundingClientRect(); m.style.position = "fixed"; m.style.top = (r.bottom + 4) + "px"; m.style.left = Math.max(8, r.right - 200) + "px"; m.style.right = "auto"; m.querySelector("button").focus(); }
      return; }
    cerrarMenus();
    if (a === "nuevo") iniciar("alta");
    else if (a === "editar") iniciar("edicion", nro);
    else if (a === "historial") abrirHistorial(nro);
    else if (a === "estadoContrato" && g.ABM_ESTADO) g.ABM_ESTADO.abrir(nro);
    else if (a === "cancelar") { S.vista = "lista"; render("t-lista"); }
    else if (a === "anterior") irPaso(S.paso - 1);
    else if (a === "siguiente") siguiente();
    else if (a === "guardar") guardar();
    else if (a === "irPaso") irPaso(+t.getAttribute("data-paso"));
    else if (a === "elegirSap") { S.b.nro = nro; S.b.domicilios = []; S.b.agrupador = ""; S.errores = false; render("busqSap"); }
    else if (a === "agregarDom") agregarDom();
    else if (a === "fix") { var adv = advertencias(S.b)[+t.getAttribute("data-i")]; if (adv) { aplicarFix(S.b, adv.fix); toast("Listo: " + adv.btn.toLowerCase() + "."); render("t-wiz"); } }
    else if (a === "quitarDom") { var id = t.getAttribute("data-id"); S.b.domicilios = S.b.domicilios.filter(function (d) { return d.id !== id; }); S.msgDom = ""; g.ABM_DOMI.reset(); render(); }
  });
  function cerrarMenus() { var ms = raiz.querySelectorAll(".menu"); for (var i = 0; i < ms.length; i++) { ms[i].hidden = true; var b = ms[i].previousElementSibling; if (b) b.setAttribute("aria-expanded", "false"); } }
  document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("[data-acc='cerrarModal']")) cerrarModal(); else if (e.target.id === "modal") cerrarModal(); });
  window.addEventListener("scroll", cerrarMenus, true);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { if (document.getElementById("modal")) cerrarModal(); else cerrarMenus(); } });

  raiz.addEventListener("input", function (e) {
    var t = e.target, id = t.id;
    if (id === "busq") { S.busq = t.value; render("busq"); posFin(t.id); }
    else if (id === "busqSap") { S.busqSap = t.value; render("busqSap"); posFin(t.id); }
    else if (id.indexOf("nd-") === 0) S.nuevoDom[id.slice(3)] = t.value;
  });
  function posFin(id) { var el = document.getElementById(id); if (el && el.setSelectionRange) { var n = el.value.length; try { el.setSelectionRange(n, n); } catch (x) { } } }
  raiz.addEventListener("change", function (e) {
    var t = e.target, id = t.id || "";
    if (id === "filtro") { S.filtro = t.value; render("filtro"); }
    else if (id === "agrupador") { C.aplicarAgrupador(S.b, t.value); render("agrupador"); }
    else if (id.indexOf("niv-") === 0) {
      S.b.niveles[id.slice(4)] = t.value;
      if (id === "niv-continente") { S.msgFrio = limpiarFrio(S.b) ? alerta("info", "Sacamos las opciones de cadena de frío: el tipo de carga elegido no es de frío.") : ""; if (esFrio(S.b)) S.abiertos.frio = true; }
      render(id);
    }
    else if (t.name === "ciclo") { S.b.ciclo = t.value; render(); }
    else if (t.hasAttribute("data-uo")) { S.b.cond[t.getAttribute("data-uo")] = t.value; render(t.id); }
    else if (t.hasAttribute("data-cond")) {
      var c = t.getAttribute("data-cond"); S.b.cond[c] = t.checked;
      D.CONDICIONES.forEach(function (x) { if (x.depende === c && !t.checked) S.b.cond[x.id] = x.tipo ? "" : false; });
      render(t.id);
    }
    else if (t.name && t.name.indexOf("cond-") === 0) { S.b.cond[t.name.slice(5)] = t.value; render(); }
    else if (t.hasAttribute("data-nclase")) { var k = t.getAttribute("data-nclase"); S.nuevoClases = S.nuevoClases.filter(function (x) { return x !== k; }); if (t.checked) S.nuevoClases.push(k); }
    else if (id === "reusar" && t.value !== "") { var d = domiciliosReusables()[+t.value]; S.nuevoDom = clon(d); render("nd-calle"); }
    else if (t.name === "estado") { S.b.estado = t.value; if (t.value === "programado" && !S.b.vigencia) S.b.vigencia = manianaISO(); render(t.value === "programado" ? "vigencia" : null); }
    else if (id === "vigencia") S.b.vigencia = t.value;
  });
  raiz.addEventListener("toggle", function (e) { var d = e.target; if (d.matches && d.matches("details.bloque")) S.abiertos[d.getAttribute("data-bloque")] = d.open; }, true);

  g.ABM_UI = { S: S, iniciar: iniciar, irPaso: irPaso, siguiente: siguiente, guardar: guardar, agregarDom: agregarDom, render: render,
    contrato: contrato, chipEstado: chipEstado, toast: toast, esc: esc, ahora: ahora, hoyISO: hoyISO, fmtFecha: fmtFecha };
  render();
})(typeof window !== "undefined" ? window : globalThis);
